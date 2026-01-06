import express from "express";
import pkg from "pg";
const { Pool } = pkg;
import cors from "cors";
import helmet from "helmet";
import { spawn } from "child_process";
import os from "os";
import path from "path";
import fs from "fs";
import multer from "multer";
import crypto from "crypto";

// Load configuration from shared config file
function loadConfig() {
  try {
    const configPath = path.join(process.cwd(), "config", "config.json");
    const configData = fs.readFileSync(configPath, "utf8");
    const config = JSON.parse(configData);

    console.log("Configuration loaded from:", configPath);
    return config;
  } catch (error) {
    console.error("Error loading config file:", error.message);
    console.log("Using default configuration");

    // Default configuration fallback - use environment variables if available
    return {
      database: {
        postgres: {
          host: process.env.POSTGRES_HOST || "localhost",
          port: parseInt(process.env.POSTGRES_PORT || "5432", 10),
          database: process.env.POSTGRES_DATABASE || "DataLake",
          user: process.env.POSTGRES_USER || "postgres",
          password: process.env.POSTGRES_PASSWORD || "",
        },
      },
    };
  }
}

const config = loadConfig();

const app = express();

const isProduction = process.env.NODE_ENV === "production";

if (isProduction) {
  app.use((req, res, next) => {
    if (req.header("x-forwarded-proto") !== "https") {
      res.redirect(`https://${req.header("host")}${req.url}`);
    } else {
      next();
    }
  });
}

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    xFrameOptions: { action: "deny" },
    xContentTypeOptions: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  })
);

const corsOptions = {
  origin: isProduction
    ? process.env.ALLOWED_ORIGINS?.split(",") || false
    : true,
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(express.json());

// Middleware: normalize schema/table identifiers to lowercase in body and query
app.use((req, _res, next) => {
  try {
    if (req.body) {
      if (typeof req.body.schema_name === "string") {
        req.body.schema_name = req.body.schema_name.toLowerCase();
      }
      if (typeof req.body.table_name === "string") {
        req.body.table_name = req.body.table_name.toLowerCase();
      }
    }
    if (req.query) {
      if (typeof req.query.schema_name === "string") {
        req.query.schema_name = req.query.schema_name.toLowerCase();
      }
      if (typeof req.query.table_name === "string") {
        req.query.table_name = req.query.table_name.toLowerCase();
      }
    }
  } catch {}
  next();
});

const pool = new Pool({
  host: config.database.postgres.host,
  port: config.database.postgres.port,
  database: config.database.postgres.database,
  user: config.database.postgres.user,
  password: config.database.postgres.password,
});

// Test connection
pool.connect((err, client, done) => {
  if (err) {
    console.error("Error connecting to the database:", err);
  } else {
    console.log("Successfully connected to PostgreSQL");
    done();
  }
});

// Configurar multer para uploads de CSV
const uploadDir = "uploads/csv";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const originalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
    const baseName = path.parse(originalName).name;
    const ext = path.parse(originalName).ext || ".csv";
    cb(null, `${baseName}_${timestamp}${ext}`);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    // Sin límite de tamaño
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (
      ext === ".csv" ||
      file.mimetype === "text/csv" ||
      file.mimetype === "application/vnd.ms-excel" ||
      file.mimetype === "text/plain"
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are allowed"));
    }
  },
});

import {
  sanitizeSearch,
  validatePage,
  validateLimit,
  validateBoolean,
  validateIdentifier,
  validateEnum,
} from "./server-utils/validation.js";
import { sanitizeError } from "./server-utils/errorHandler.js";
import {
  initializeUsersTable,
  authenticateUser,
  requireAuth,
  requireRole,
  createUser,
  changePassword,
} from "./server-utils/auth.js";
import bcrypt from "bcryptjs";
import { generalLimiter, authLimiter } from "./server-utils/rateLimiter.js";

initializeUsersTable().catch((err) => {
  console.error("Failed to initialize users table:", err);
});

app.use(generalLimiter);

const publicPaths = ["/api/auth/login", "/api/health"];
app.use((req, res, next) => {
  if (req.path && req.path.startsWith("/api/catalog/")) {
    console.log("🌐 [GLOBAL AUTH MIDDLEWARE] Intercepting:", req.method, req.path);
  }
  if (!req.path.startsWith("/api")) {
    return next();
  }
  const requestPath = req.path || (req.url ? req.url.split("?")[0] : "");
  if (publicPaths.includes(requestPath)) {
    if (req.path && req.path.startsWith("/api/catalog/")) {
      console.log("✅ [GLOBAL AUTH MIDDLEWARE] Public path, skipping auth");
    }
    return next();
  }
  if (req.path && req.path.startsWith("/api/catalog/")) {
    console.log("🔐 [GLOBAL AUTH MIDDLEWARE] Calling requireAuth for:", req.method, req.path);
  }
  requireAuth(req, res, next);
});

app.use((req, res, next) => {
  if (req.path && req.path.startsWith("/api/catalog/")) {
    console.log(`[ROUTE DEBUG] ${req.method} ${req.path} - Query:`, req.query, "Body:", req.body);
  }
  next();
});

app.post("/api/auth/login", authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        error: "Username and password are required",
      });
    }

    const result = await authenticateUser(username, password);

    if (!result.success) {
      return res.status(401).json({ error: result.error });
    }

    res.json({
      user: result.user,
      token: result.token,
    });
  } catch (err) {
    console.error("Login error:", err);
    const safeError = sanitizeError(
      err,
      "Login failed",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.post("/api/auth/logout", requireAuth, async (req, res) => {
  res.json({ message: "Logged out successfully" });
});

app.get("/api/auth/me", requireAuth, async (req, res) => {
  res.json({ user: req.user });
});

app.post("/api/auth/change-password", requireAuth, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        error: "Old password and new password are required",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        error: "New password must be at least 8 characters long",
      });
    }

    const result = await changePassword(
      req.user.userId,
      oldPassword,
      newPassword
    );

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    console.error("Change password error:", err);
    const safeError = sanitizeError(
      err,
      "Failed to change password",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.get(
  "/api/auth/users",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const page = validatePage(req.query.page);
      const limit = validateLimit(req.query.limit, 1, 100);
      const roleFilter = req.query.role || "";
      const activeFilter = req.query.active;
      const search = sanitizeSearch(req.query.search, 100) || "";
      const offset = (page - 1) * limit;

      let whereClause = "WHERE 1=1";
      const countParams = [];
      let paramCount = 0;

      if (roleFilter) {
        paramCount++;
        whereClause += ` AND role = $${paramCount}`;
        countParams.push(roleFilter);
      }

      if (activeFilter !== undefined) {
        paramCount++;
        whereClause += ` AND active = $${paramCount}`;
        countParams.push(activeFilter === "true");
      }

      if (search) {
        paramCount++;
        whereClause += ` AND (username ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
        countParams.push(`%${search}%`);
      }

      const countQuery = `SELECT COUNT(*) as total FROM metadata.users ${whereClause}`;
      const countResult = await pool.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0]?.total || 0);

      const dataParams = [...countParams];
      let query = `SELECT id, username, email, role, active, created_at, updated_at, last_login FROM metadata.users ${whereClause} ORDER BY created_at DESC`;

      paramCount++;
      query += ` LIMIT $${paramCount}`;
      dataParams.push(limit);
      paramCount++;
      query += ` OFFSET $${paramCount}`;
      dataParams.push(offset);

      const result = await pool.query(query, dataParams);

      res.json({
        data: result.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      console.error("List users error:", err);
      const safeError = sanitizeError(
        err,
        "Failed to list users",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.post(
  "/api/auth/users",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { username, email, password, role } = req.body;

      if (!username || !email || !password) {
        return res.status(400).json({
          error: "Username, email, and password are required",
        });
      }

      if (password.length < 8) {
        return res.status(400).json({
          error: "Password must be at least 8 characters long",
        });
      }

      const result = await createUser(
        username,
        email,
        password,
        role || "user"
      );

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.status(201).json({ user: result.user });
    } catch (err) {
      console.error("Create user error:", err);
      const safeError = sanitizeError(
        err,
        "Failed to create user",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.patch(
  "/api/auth/users/:id",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { username, email, role, active } = req.body;

      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      const updates = [];
      const params = [];
      let paramCount = 0;

      if (username !== undefined) {
        paramCount++;
        updates.push(`username = $${paramCount}`);
        params.push(username);
      }

      if (email !== undefined) {
        paramCount++;
        updates.push(`email = $${paramCount}`);
        params.push(email);
      }

      if (role !== undefined) {
        if (!["admin", "user", "viewer"].includes(role)) {
          return res.status(400).json({ error: "Invalid role" });
        }
        paramCount++;
        updates.push(`role = $${paramCount}`);
        params.push(role);
      }

      if (active !== undefined) {
        paramCount++;
        updates.push(`active = $${paramCount}`);
        params.push(validateBoolean(active, true));
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: "No fields to update" });
      }

      paramCount++;
      updates.push(`updated_at = NOW()`);
      paramCount++;
      params.push(userId);

      const query = `UPDATE metadata.users SET ${updates.join(
        ", "
      )} WHERE id = $${paramCount} RETURNING id, username, email, role, active, created_at, updated_at, last_login`;

      const result = await pool.query(query, params);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({ user: result.rows[0] });
    } catch (err) {
      console.error("Update user error:", err);
      const safeError = sanitizeError(
        err,
        "Failed to update user",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.delete(
  "/api/auth/users/:id",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const userId = parseInt(req.params.id);

      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      const userCheck = await pool.query(
        "SELECT id, username FROM metadata.users WHERE id = $1",
        [userId]
      );

      if (userCheck.rows.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      if (userCheck.rows[0].username === req.user.username) {
        return res
          .status(400)
          .json({ error: "Cannot delete your own account" });
      }

      await pool.query("DELETE FROM metadata.users WHERE id = $1", [userId]);

      res.json({ message: "User deleted successfully" });
    } catch (err) {
      console.error("Delete user error:", err);
      const safeError = sanitizeError(
        err,
        "Failed to delete user",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.post(
  "/api/auth/users/:id/reset-password",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { newPassword } = req.body;

      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({
          error: "Password must be at least 8 characters long",
        });
      }

      const userCheck = await pool.query(
        "SELECT id FROM metadata.users WHERE id = $1",
        [userId]
      );

      if (userCheck.rows.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);

      await pool.query(
        "UPDATE metadata.users SET password_hash = $1, updated_at = NOW() WHERE id = $2",
        [passwordHash, userId]
      );

      res.json({ message: "Password reset successfully" });
    } catch (err) {
      console.error("Reset password error:", err);
      const safeError = sanitizeError(
        err,
        "Failed to reset password",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Resetear CDC (last_change_id a 0) - DEBE IR ANTES DE /api/catalog
console.log("🔵 [ROUTE REGISTRATION] Registering POST /api/catalog/reset-cdc");
app.post(
  "/api/catalog/reset-cdc",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    console.log("🟢 [RESET-CDC HANDLER] Request received:", {
      method: req.method,
      path: req.path,
      body: req.body,
      user: req.user ? { role: req.user.role } : null
    });
    const schema_name = validateIdentifier(req.body.schema_name);
    const table_name = validateIdentifier(req.body.table_name);
    const db_engine = validateEnum(
      req.body.db_engine,
      ["PostgreSQL", "MariaDB", "MSSQL", "MongoDB", "Oracle"],
      null
    );

    console.log("🔍 [RESET-CDC] Validated parameters:", { schema_name, table_name, db_engine });

    if (!schema_name || !table_name || !db_engine) {
      console.log("❌ [RESET-CDC] Missing required parameters");
      return res.status(400).json({
        error: "schema_name, table_name, and db_engine are required",
      });
    }

    try {
      console.log("🔍 [RESET-CDC] Executing UPDATE query...");
      const result = await pool.query(
        `UPDATE metadata.catalog 
         SET sync_metadata = COALESCE(sync_metadata, '{}'::jsonb) || 
             jsonb_build_object('last_change_id', '0')
         WHERE LOWER(schema_name) = LOWER($1) AND LOWER(table_name) = LOWER($2) AND db_engine = $3
         RETURNING schema_name, table_name, db_engine, sync_metadata`,
        [schema_name, table_name, db_engine]
      );

      console.log("🔍 [RESET-CDC] UPDATE query result:", result.rows.length, "rows affected");

      if (result.rows.length === 0) {
        console.log("❌ [RESET-CDC] Catalog entry not found, returning 404");
        return res.status(404).json({
          error: "Catalog entry not found",
        });
      }

      console.log("✅ [RESET-CDC] Successfully reset CDC, sending response...");
      res.json({
        success: true,
        message: `CDC reset for ${schema_name}.${table_name} (${db_engine})`,
        entry: result.rows[0],
      });
      console.log("✅ [RESET-CDC] Response sent successfully");
    } catch (err) {
      console.error("❌ [RESET-CDC] Database error:", err);
      console.error("❌ [RESET-CDC] Error stack:", err.stack);
      const safeError = sanitizeError(
        err,
        "Error resetting CDC",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);
console.log("✅ [ROUTE REGISTRATION] POST /api/catalog/reset-cdc registered successfully");

// Obtener historial de ejecuciones de una tabla del catalog - DEBE IR ANTES DE /api/catalog
console.log("🔵 [ROUTE REGISTRATION] Registering GET /api/catalog/execution-history");
app.get("/api/catalog/execution-history", requireAuth, async (req, res) => {
  console.log("🟢 [EXECUTION-HISTORY HANDLER] Request received:", {
    method: req.method,
    path: req.path,
    query: req.query
  });
  try {
    const schema_name = req.query.schema_name;
    const table_name = req.query.table_name;
    const db_engine = req.query.db_engine;
    const limit = validateLimit(req.query.limit, 1, 100, 50);

    console.log("🔍 [EXECUTION-HISTORY] Validating parameters:", { schema_name, table_name, db_engine, limit });

    if (!schema_name || !table_name || !db_engine) {
      console.log("❌ [EXECUTION-HISTORY] Missing required parameters");
      return res.status(400).json({
        error: "schema_name, table_name, and db_engine are required",
      });
    }

    const processNamePattern = `${schema_name}.${table_name}`;
    const processNamePatternLower = `${schema_name.toLowerCase()}.${table_name.toLowerCase()}`;
    const tableNameLower = table_name.toLowerCase();
    const schemaNameLower = schema_name.toLowerCase();

    console.log("🔍 [EXECUTION-HISTORY] Searching with patterns:", {
      processNamePattern,
      processNamePatternLower,
      patternLike: `%${schema_name}.${table_name}%`,
      schema_name,
      table_name,
      db_engine
    });

    const result = await pool.query(
      `SELECT 
        id,
        process_type,
        process_name,
        status,
        start_time,
        end_time,
        COALESCE(duration_seconds, EXTRACT(EPOCH FROM (end_time - start_time))::integer) as duration_seconds,
        total_rows_processed,
        error_message,
        metadata,
        created_at
       FROM metadata.process_log 
       WHERE (
         (LOWER(schema_name) = LOWER($1) AND LOWER(table_name) = LOWER($2) AND LOWER(db_engine) = LOWER($3))
         OR (LOWER(process_name) = LOWER($4))
         OR (LOWER(process_name) = LOWER($5))
         OR (LOWER(process_name) LIKE LOWER($6))
         OR (LOWER(process_name) LIKE LOWER($7))
         OR (LOWER(source_schema) = LOWER($1) AND LOWER(target_schema) = LOWER($1))
         OR (LOWER(metadata->>'schema_name') = LOWER($1) AND LOWER(metadata->>'table_name') = LOWER($2))
         OR (LOWER(metadata->>'db_engine') = LOWER($3) AND LOWER(metadata->>'schema_name') = LOWER($1) AND LOWER(metadata->>'table_name') = LOWER($2))
       )
       ORDER BY created_at DESC 
       LIMIT $8`,
      [
        schema_name,
        table_name,
        db_engine,
        processNamePattern,
        processNamePatternLower,
        `%${schema_name}.${table_name}%`,
        `%${table_name}%`,
        limit,
      ]
    );

    console.log("🔍 [EXECUTION-HISTORY] Query result:", result.rows.length, "rows found");
    if (result.rows.length > 0) {
      console.log("🔍 [EXECUTION-HISTORY] Sample row:", {
        id: result.rows[0].id,
        process_name: result.rows[0].process_name,
        status: result.rows[0].status,
        metadata: result.rows[0].metadata
      });
    } else {
      console.log("⚠️ [EXECUTION-HISTORY] No rows found. Checking if table exists...");
      const tableCheck = await pool.query(
        `SELECT COUNT(*) as count FROM metadata.process_log`
      );
      console.log("🔍 [EXECUTION-HISTORY] Total rows in process_log:", tableCheck.rows[0].count);
      
      const sampleRows = await pool.query(
        `SELECT process_name, metadata->>'schema_name' as schema_name, metadata->>'table_name' as table_name, metadata->>'db_engine' as db_engine 
         FROM metadata.process_log 
         ORDER BY created_at DESC 
         LIMIT 5`
      );
      console.log("🔍 [EXECUTION-HISTORY] Sample process_log entries:", sampleRows.rows);
    }

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching execution history:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener historial de ejecuciones",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});
console.log("✅ [ROUTE REGISTRATION] GET /api/catalog/execution-history registered successfully");

// Obtener estructura de tabla (source y target) - DEBE IR ANTES DE /api/catalog
console.log("🔵 [ROUTE REGISTRATION] Registering GET /api/catalog/table-structure");
app.get("/api/catalog/table-structure", requireAuth, async (req, res) => {
  console.log("🟢 [TABLE-STRUCTURE HANDLER] Request received:", {
    method: req.method,
    path: req.path,
    query: req.query
  });
  try {
    const schema_name = req.query.schema_name;
    const table_name = req.query.table_name;
    const db_engine = req.query.db_engine;

    console.log("🔍 [TABLE-STRUCTURE] Validating parameters:", { schema_name, table_name, db_engine });

    if (!schema_name || !table_name || !db_engine) {
      console.log("❌ [TABLE-STRUCTURE] Missing required parameters");
      return res.status(400).json({
        error: "schema_name, table_name, and db_engine are required",
      });
    }

    console.log("🔍 [TABLE-STRUCTURE] Querying catalog for:", { schema_name, table_name, db_engine });

    const catalogResult = await pool.query(
      `SELECT connection_string, schema_name, table_name, db_engine
       FROM metadata.catalog 
       WHERE LOWER(schema_name) = LOWER($1) AND LOWER(table_name) = LOWER($2) AND db_engine = $3`,
      [schema_name, table_name, db_engine]
    );

    console.log("🔍 [TABLE-STRUCTURE] Catalog query result:", catalogResult.rows.length, "rows found");

    if (catalogResult.rows.length === 0) {
      console.log("❌ [TABLE-STRUCTURE] Table not found in catalog, returning 404");
      return res.status(404).json({ error: "Table not found in catalog" });
    }

    const catalogEntry = catalogResult.rows[0];
    const sourceConnectionString = catalogEntry.connection_string;
    const targetSchema = schema_name.toLowerCase();
    const targetTable = table_name.toLowerCase();

    let sourceColumns = [];
    let targetColumns = [];

    switch (db_engine) {
      case "MariaDB": {
        const mysql = (await import("mysql2/promise")).default;
        const connection = await mysql.createConnection(sourceConnectionString);
        const [rows] = await connection.execute(
          `
          SELECT 
            COLUMN_NAME,
            DATA_TYPE,
            CHARACTER_MAXIMUM_LENGTH,
            IS_NULLABLE,
            COLUMN_DEFAULT
          FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
          ORDER BY ORDINAL_POSITION
        `,
          [schema_name, table_name]
        );
        sourceColumns = rows.map((row) => ({
          name: row.COLUMN_NAME,
          type:
            row.DATA_TYPE +
            (row.CHARACTER_MAXIMUM_LENGTH
              ? `(${row.CHARACTER_MAXIMUM_LENGTH})`
              : ""),
          nullable: row.IS_NULLABLE === "YES",
          default: row.COLUMN_DEFAULT,
        }));
        await connection.end();
        break;
      }
      case "MSSQL": {
        const sql = (await import("mssql")).default;
        let config;
        
        if (typeof sourceConnectionString === 'string') {
          const parts = sourceConnectionString.split(';').reduce((acc, part) => {
            const [key, value] = part.split('=').map(s => s.trim());
            if (key && value) {
              const keyLower = key.toLowerCase();
              if (keyLower === 'server' || keyLower === 'data source') {
                if (value.includes(',')) {
                  const [host, port] = value.split(',').map(s => s.trim());
                  acc.server = host;
                  acc.port = parseInt(port) || 1433;
                } else if (value.includes(':')) {
                  const [host, port] = value.split(':').map(s => s.trim());
                  acc.server = host;
                  acc.port = parseInt(port) || 1433;
                } else {
                  acc.server = value;
                }
              }
              else if (keyLower === 'database' || keyLower === 'initial catalog') acc.database = value;
              else if (keyLower === 'user id' || keyLower === 'uid') acc.user = value;
              else if (keyLower === 'password' || keyLower === 'pwd') acc.password = value;
              else if (keyLower === 'port') acc.port = parseInt(value);
            }
            return acc;
          }, {});
          
          config = {
            ...parts,
            options: {
              encrypt: true,
              trustServerCertificate: true
            }
          };
        } else {
          config = {
            ...sourceConnectionString,
            options: {
              ...sourceConnectionString.options,
              encrypt: true,
              trustServerCertificate: true
            }
          };
        }
        
        const pool = new sql.ConnectionPool(config);
        await pool.connect();
        const result = await pool
          .request()
          .input("schema", sql.VarChar, schema_name)
          .input("table", sql.VarChar, table_name).query(`
            SELECT 
              COLUMN_NAME,
              DATA_TYPE,
              CHARACTER_MAXIMUM_LENGTH,
              IS_NULLABLE,
              COLUMN_DEFAULT
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = @schema AND TABLE_NAME = @table
            ORDER BY ORDINAL_POSITION
          `);
        sourceColumns = result.recordset.map((row) => ({
          name: row.COLUMN_NAME,
          type:
            row.DATA_TYPE +
            (row.CHARACTER_MAXIMUM_LENGTH
              ? `(${row.CHARACTER_MAXIMUM_LENGTH})`
              : ""),
          nullable: row.IS_NULLABLE === "YES",
          default: row.COLUMN_DEFAULT,
        }));
        await pool.close();
        break;
      }
      case "Oracle": {
        const oracledb = (await import("oracledb")).default;
        const connection = await oracledb.getConnection(sourceConnectionString);
        const result = await connection.execute(
          `
          SELECT 
            COLUMN_NAME,
            DATA_TYPE,
            DATA_LENGTH,
            NULLABLE,
            DATA_DEFAULT
          FROM ALL_TAB_COLUMNS
          WHERE OWNER = :owner AND TABLE_NAME = :table
          ORDER BY COLUMN_ID
        `,
          {
            owner: schema_name.toUpperCase(),
            table: table_name.toUpperCase(),
          }
        );
        sourceColumns = result.rows.map((row) => ({
          name: row[0],
          type: row[1] + (row[2] ? `(${row[2]})` : ""),
          nullable: row[3] === "Y",
          default: row[4],
        }));
        await connection.close();
        break;
      }
      case "MongoDB": {
        const { MongoClient } = await import("mongodb");
        const client = new MongoClient(sourceConnectionString);
        await client.connect();
        const db = client.db();
        const collection = db.collection(table_name);
        const sample = await collection.findOne({});
        if (sample) {
          sourceColumns = Object.keys(sample).map((key) => ({
            name: key,
            type:
              typeof sample[key] === "object" ? "object" : typeof sample[key],
            nullable: true,
            default: null,
          }));
        }
        await client.close();
        break;
      }
      default: {
        const { Client } = await import("pg");
        const client = new Client(sourceConnectionString);
        await client.connect();
        const result = await client.query(
          `
          SELECT 
            column_name,
            data_type,
            character_maximum_length,
            is_nullable,
            column_default
          FROM information_schema.columns
          WHERE table_schema = $1 AND table_name = $2
          ORDER BY ordinal_position
        `,
          [schema_name, table_name]
        );
        sourceColumns = result.rows.map((row) => ({
          name: row.column_name,
          type:
            row.data_type +
            (row.character_maximum_length
              ? `(${row.character_maximum_length})`
              : ""),
          nullable: row.is_nullable === "YES",
          default: row.column_default,
        }));
        await client.end();
        break;
      }
    }

    const { Client } = await import("pg");
    const targetClient = new Client({
      host: config.database.postgres.host,
      port: config.database.postgres.port,
      database: config.database.postgres.database,
      user: config.database.postgres.user,
      password: config.database.postgres.password,
    });
    await targetClient.connect();
    const targetResult = await targetClient.query(
      `
      SELECT 
        column_name,
        data_type,
        character_maximum_length,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = $1 AND table_name = $2
      ORDER BY ordinal_position
    `,
      [targetSchema, targetTable]
    );
    targetColumns = targetResult.rows.map((row) => ({
      name: row.column_name,
      type:
        row.data_type +
        (row.character_maximum_length
          ? `(${row.character_maximum_length})`
          : ""),
      nullable: row.is_nullable === "YES",
      default: row.column_default,
    }));
    await targetClient.end();

    console.log("✅ [TABLE-STRUCTURE] Successfully fetched columns. Source:", sourceColumns.length, "Target:", targetColumns.length);
    console.log("📤 [TABLE-STRUCTURE] Sending response...");
    res.json({
      source: {
        columns: sourceColumns,
        schema: schema_name,
        table: table_name
      },
      target: {
        columns: targetColumns,
        schema: targetSchema,
        table: targetTable
      },
    });
    console.log("✅ [TABLE-STRUCTURE] Response sent successfully");
  } catch (err) {
    console.error("❌ [TABLE-STRUCTURE] Error fetching table structure:", err);
    console.error("❌ [TABLE-STRUCTURE] Error stack:", err.stack);
    const safeError = sanitizeError(
      err,
      "Error al obtener estructura de tabla",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});
console.log("✅ [ROUTE REGISTRATION] GET /api/catalog/table-structure registered successfully");

// Obtener catálogo con paginación, filtros y búsqueda
console.log("🔵 [ROUTE REGISTRATION] Registering GET /api/catalog (general route)");
app.get("/api/catalog", requireAuth, async (req, res) => {
  console.log("🟢 [CATALOG HANDLER] Request received:", {
    method: req.method,
    path: req.path,
    query: req.query
  });
  try {
    const page = validatePage(req.query.page, 1);
    const limit = validateLimit(req.query.limit, 1, 100);
    const engine = validateEnum(
      req.query.engine,
      ["PostgreSQL", "MariaDB", "MSSQL", "MongoDB", "Oracle", ""],
      ""
    );
    const status = validateEnum(
      req.query.status,
      [
        "LISTENING_CHANGES",
        "FULL_LOAD",
        "ERROR",
        "NO_DATA",
        "SKIP",
        "IN_PROGRESS",
        "",
      ],
      ""
    );
    const activeParam = req.query.active;
    const active =
      activeParam !== undefined && activeParam !== ""
        ? validateBoolean(activeParam)
        : null;
    const search = sanitizeSearch(req.query.search, 100);
    const offset = (page - 1) * limit;

    let whereConditions = [];
    let queryParams = [];
    let paramCount = 0;

    if (engine) {
      paramCount++;
      whereConditions.push(`db_engine = $${paramCount}`);
      queryParams.push(engine);
    }

    if (status) {
      paramCount++;
      whereConditions.push(`status = $${paramCount}`);
      queryParams.push(status);
    }

    if (active !== null && active !== undefined) {
      paramCount++;
      whereConditions.push(`active = $${paramCount}`);
      queryParams.push(active === true || active === "true");
    }

    if (search) {
      paramCount++;
      whereConditions.push(
        `(schema_name ILIKE $${paramCount} OR table_name ILIKE $${paramCount} OR cluster_name ILIKE $${paramCount})`
      );
      queryParams.push(`%${search}%`);
    }
    if (req.query.strategy && req.query.strategy !== "") {
      paramCount++;
      whereConditions.push(`pk_strategy = $${paramCount}`);
      queryParams.push(req.query.strategy);
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    const totalCheckQuery = `SELECT COUNT(*) as total FROM metadata.catalog`;
    let totalCheckResult;
    try {
      totalCheckResult = await pool.query(totalCheckQuery);
      const totalInTable = parseInt(totalCheckResult.rows[0].total);
    } catch (checkErr) {
      console.error("❌ Error checking total records:", checkErr);
    }

    const countQuery = `SELECT COUNT(*) FROM metadata.catalog ${whereClause}`;

    let countResult;
    try {
      countResult = await pool.query(countQuery, queryParams);
    } catch (countErr) {
      console.error("❌ Error in count query:", countErr);
      throw countErr;
    }

    const total = parseInt(countResult.rows[0].count);

    const sortField = String(req.query.sort_field || "").toLowerCase();
    const sortDirection = String(
      req.query.sort_direction || "desc"
    ).toUpperCase();
    const allowedSortFields = new Set([
      "schema_name",
      "table_name",
      "db_engine",
      "status",
      "active",
      "pk_strategy",
      "cluster_name",
    ]);

    let orderClause = "";
    if (sortField && allowedSortFields.has(sortField)) {
      orderClause = `ORDER BY ${sortField} ${
        sortDirection === "ASC" ? "ASC" : "DESC"
      }`;
    } else {
      orderClause = `ORDER BY 
        CASE status
          WHEN 'LISTENING_CHANGES' THEN 1
          WHEN 'FULL_LOAD' THEN 2
          WHEN 'ERROR' THEN 3
          WHEN 'NO_DATA' THEN 4
          WHEN 'SKIP' THEN 5
          ELSE 6
        END,
        active DESC,
        schema_name,
        table_name`;
    }

    paramCount++;
    const limitParam = paramCount;
    const offsetParam = paramCount + 1;

    const dataQuery = `SELECT * FROM metadata.catalog ${whereClause}
      ${orderClause}
      LIMIT $${limitParam} OFFSET $${offsetParam}`;

    queryParams.push(limit, offset);

    let result;
    try {
      result = await pool.query(dataQuery, queryParams);
    } catch (queryErr) {
      console.error("Error executing data query:", queryErr);
      console.error("Query was:", dataQuery);
      console.error("Params were:", queryParams);
      throw queryErr;
    }

    const totalPages = Math.ceil(total / limit);

    res.json({
      data: result.rows,
      pagination: {
        total,
        totalPages,
        currentPage: parseInt(page),
        limit: parseInt(limit),
      },
    });
  } catch (err) {
    console.error("Database error in catalog endpoint:", err);
    const safeError = sanitizeError(
      err,
      "Error fetching catalog data",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

// Actualizar estado
app.patch(
  "/api/catalog/status",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    const schema_name = validateIdentifier(req.body.schema_name);
    const table_name = validateIdentifier(req.body.table_name);
    const db_engine = validateEnum(
      req.body.db_engine,
      ["PostgreSQL", "MariaDB", "MSSQL", "MongoDB", "Oracle"],
      null
    );
    const active = validateBoolean(req.body.active);

    if (!schema_name || !table_name || !db_engine) {
      return res
        .status(400)
        .json({ error: "Invalid schema_name, table_name, or db_engine" });
    }

    try {
      const result = await pool.query(
        `UPDATE metadata.catalog 
       SET active = $1
       WHERE schema_name = $2 AND table_name = $3 AND db_engine = $4
       RETURNING *`,
        [active, schema_name, table_name, db_engine]
      );
      res.json(result.rows[0]);
    } catch (err) {
      console.error("Database error:", err);
      const safeError = sanitizeError(
        err,
        "Error fetching catalog data",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

// Forzar sincronización
app.post(
  "/api/catalog/sync",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    const schema_name = validateIdentifier(req.body.schema_name);
    const table_name = validateIdentifier(req.body.table_name);
    const db_engine = validateEnum(
      req.body.db_engine,
      ["PostgreSQL", "MariaDB", "MSSQL", "MongoDB", "Oracle"],
      null
    );

    if (!schema_name || !table_name || !db_engine) {
      return res
        .status(400)
        .json({ error: "Invalid schema_name, table_name, or db_engine" });
    }

    try {
      const result = await pool.query(
        `UPDATE metadata.catalog 
       SET status = 'full_load'
       WHERE schema_name = $1 AND table_name = $2 AND db_engine = $3
       RETURNING *`,
        [schema_name, table_name, db_engine]
      );
      res.json(result.rows[0]);
    } catch (err) {
      console.error("Database error:", err);
      const safeError = sanitizeError(
        err,
        "Error fetching catalog data",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

// Crear nueva entrada en el catálogo
app.post(
  "/api/catalog",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    const schema_name = validateIdentifier(req.body.schema_name);
    const table_name = validateIdentifier(req.body.table_name);
    const db_engine = validateEnum(
      req.body.db_engine,
      ["PostgreSQL", "MariaDB", "MSSQL", "MongoDB", "Oracle"],
      null
    );
    const connection_string = req.body.connection_string;
    const status = validateEnum(
      req.body.status,
      [
        "FULL_LOAD",
        "PENDING",
        "IN_PROGRESS",
        "LISTENING_CHANGES",
        "NO_DATA",
        "ERROR",
        "SKIP",
      ],
      "FULL_LOAD"
    );
    const active = validateBoolean(req.body.active, true);
    const cluster_name = req.body.cluster_name || "";
    const pk_strategy = validateEnum(
      req.body.pk_strategy,
      ["CDC", "PK", "OFFSET"],
      "CDC"
    );
    if (!schema_name || !table_name || !db_engine || !connection_string) {
      return res.status(400).json({
        error:
          "schema_name, table_name, db_engine, and connection_string are required",
      });
    }

    try {
      const checkResult = await pool.query(
        `SELECT schema_name, table_name, db_engine FROM metadata.catalog 
       WHERE schema_name = $1 AND table_name = $2 AND db_engine = $3`,
        [schema_name, table_name, db_engine]
      );

      if (checkResult.rows.length > 0) {
        return res.status(409).json({
          error:
            "Entry already exists with this schema_name, table_name, and db_engine",
        });
      }

      const result = await pool.query(
        `INSERT INTO metadata.catalog 
       (schema_name, table_name, db_engine, connection_string, status, active, 
        cluster_name, pk_strategy)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
        [
          schema_name,
          table_name,
          db_engine,
          connection_string,
          status,
          active,
          cluster_name,
          pk_strategy,
        ]
      );

      res.json(result.rows[0]);
    } catch (err) {
      console.error("Database error:", err);
      const safeError = sanitizeError(
        err,
        "Error creating catalog entry",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

// Obtener todos los schemas únicos
app.get("/api/catalog/schemas", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT schema_name FROM metadata.catalog ORDER BY schema_name`
    );
    res.json(result.rows.map((row) => row.schema_name));
  } catch (err) {
    console.error("Database error:", err);
    const safeError = sanitizeError(
      err,
      "Error fetching catalog data",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

// Obtener todos los engines únicos
app.get("/api/catalog/engines", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT db_engine FROM metadata.catalog WHERE db_engine IS NOT NULL ORDER BY db_engine`
    );
    res.json(result.rows.map((row) => row.db_engine));
  } catch (err) {
    console.error("Database error:", err);
    const safeError = sanitizeError(
      err,
      "Error fetching engines",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

// Obtener todos los status únicos
app.get("/api/catalog/statuses", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT status FROM metadata.catalog WHERE status IS NOT NULL ORDER BY status`
    );
    res.json(result.rows.map((row) => row.status));
  } catch (err) {
    console.error("Database error:", err);
    const safeError = sanitizeError(
      err,
      "Error fetching statuses",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

// Obtener todas las strategies únicas
app.get("/api/catalog/strategies", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT pk_strategy FROM metadata.catalog WHERE pk_strategy IS NOT NULL ORDER BY pk_strategy`
    );
    res.json(result.rows.map((row) => row.pk_strategy));
  } catch (err) {
    console.error("Database error:", err);
    const safeError = sanitizeError(
      err,
      "Error fetching strategies",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

// Marcar tabla como SKIP
app.patch(
  "/api/catalog/skip-table",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    const schema_name = validateIdentifier(req.body.schema_name);
    const table_name = validateIdentifier(req.body.table_name);
    const db_engine = validateEnum(
      req.body.db_engine,
      ["PostgreSQL", "MariaDB", "MSSQL", "MongoDB", "Oracle"],
      null
    );

    if (!schema_name || !table_name || !db_engine) {
      return res.status(400).json({
        error: "Invalid schema_name, table_name, or db_engine",
      });
    }

    try {
      const result = await pool.query(
        `UPDATE metadata.catalog 
       SET status = 'SKIP', active = false
       WHERE schema_name = $1 AND table_name = $2 AND db_engine = $3
       RETURNING *`,
        [schema_name, table_name, db_engine]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Table not found" });
      }

      res.json({
        message: `Table ${schema_name}.${table_name} marked as SKIP`,
        affectedRows: result.rows.length,
        entry: result.rows[0],
      });
    } catch (err) {
      console.error("Database error:", err);
      const safeError = sanitizeError(
        err,
        "Error fetching catalog data",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

// Desactivar schema completo
app.patch(
  "/api/catalog/deactivate-schema",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    const schema_name = validateIdentifier(req.body.schema_name);

    if (!schema_name) {
      return res.status(400).json({ error: "Invalid schema_name" });
    }

    try {
      const result = await pool.query(
        `UPDATE metadata.catalog 
       SET status = 'SKIPPED'
       WHERE schema_name = $1
       RETURNING *`,
        [schema_name]
      );
      res.json({
        message: `Schema ${schema_name} deactivated successfully`,
        affectedRows: result.rows.length,
        rows: result.rows,
      });
    } catch (err) {
      console.error("Database error:", err);
      const safeError = sanitizeError(
        err,
        "Error fetching catalog data",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

// Rutas movidas arriba antes de /api/catalog para evitar conflictos

const PORT = process.env.PORT || 8765;
// Obtener estadísticas del dashboard
app.get("/api/dashboard/stats", async (req, res) => {
  try {

    const syncStatus = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE active = true AND status = 'LISTENING_CHANGES') as listening_changes,
        COUNT(*) FILTER (WHERE active = true) as full_load_active,
        COUNT(*) FILTER (WHERE active = false) as full_load_inactive,
        COUNT(*) FILTER (WHERE active = false AND status = 'NO_DATA') as no_data,
        COUNT(*) FILTER (WHERE status = 'SKIP') as skip,
        COUNT(*) FILTER (WHERE active = true AND status = 'ERROR') as errors,
        COUNT(*) FILTER (WHERE status = 'IN_PROGRESS') as in_progress,
        '' as current_process
      FROM metadata.catalog
    `);

    // 2. DATA PROGRESS METRICS - total_data
    const dataProgress = await pool.query(`
      SELECT 
        COALESCE(SUM(table_size), 0) as total_data
      FROM metadata.catalog
      WHERE active = true AND status IN ('LISTENING_CHANGES', 'FULL_LOAD')
    `);

    // Get currently processing table
    const currentProcessingTable = await pool.query(`
      SELECT t.*
      FROM metadata.catalog t
      WHERE status = 'FULL_LOAD'
      LIMIT 1
    `);

    const currentProcessText =
      currentProcessingTable.rows.length > 0
        ? `${String(
            currentProcessingTable.rows[0].schema_name
          ).toLowerCase()}.${String(
            currentProcessingTable.rows[0].table_name
          ).toLowerCase()} [${
            currentProcessingTable.rows[0].db_engine
          }] - Status: ${currentProcessingTable.rows[0].status}`
        : "No active transfers";

    // 2. TRANSFER PERFORMANCE BY ENGINE
    const transferPerformance = await pool.query(`
      SELECT 
        db_engine,
        COUNT(*) FILTER (WHERE status = 'PROCESSING' AND completed_at IS NULL) as active_transfers,
        ROUND(AVG(memory_used_mb)::numeric, 2) as avg_memory_used,
        ROUND(AVG(io_operations_per_second)::numeric, 2) as avg_iops,
        SUM(bytes_transferred) as total_bytes
      FROM metadata.transfer_metrics
      WHERE created_at > NOW() - INTERVAL '5 minutes'
      GROUP BY db_engine
    `);

    // 3. SYSTEM RESOURCES (from OS)
    // CPU
    const cpus = os.cpus();
    const cpuCount = cpus.length;
    const loadAvg = os.loadavg()[0];
    const cpuUsagePercent =
      cpuCount > 0 ? ((loadAvg * 100) / cpuCount).toFixed(1) : "0.0";

    // Memory
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsedGB = (usedMemory / (1024 * 1024 * 1024)).toFixed(2);
    const memoryTotalGB = (totalMemory / (1024 * 1024 * 1024)).toFixed(2);
    const memoryPercentage = ((usedMemory / totalMemory) * 100).toFixed(1);

    // Process Memory
    const processMemory = process.memoryUsage();
    const rssGB = (processMemory.rss / (1024 * 1024 * 1024)).toFixed(2);
    const virtualGB = (processMemory.heapTotal / (1024 * 1024 * 1024)).toFixed(
      2
    );

    const systemResources = {
      rows: [
        {
          cpu_usage: cpuUsagePercent,
          cpu_cores: cpuCount,
          memory_used: memoryUsedGB,
          memory_total: memoryTotalGB,
          memory_percentage: memoryPercentage,
          memory_rss: rssGB,
          memory_virtual: virtualGB,
        },
      ],
    };

    // 4. DATABASE HEALTH
    const dbHealth = await pool.query(`
      SELECT 
        (SELECT count(*) FROM pg_stat_activity) as active_connections,
        (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max_connections,
        EXTRACT(EPOCH FROM (now() - pg_postmaster_start_time())) as uptime_seconds,
        (
          SELECT json_build_object(
            'buffer_hit_ratio', ROUND(COALESCE((sum(heap_blks_hit) * 100.0 / NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0)), 100)::numeric, 1),
            'cache_hit_ratio', ROUND(COALESCE((sum(idx_blks_hit) * 100.0 / NULLIF(sum(idx_blks_hit) + sum(idx_blks_read), 0)), 100)::numeric, 1)
          )
          FROM pg_statio_user_tables
        ) as cache_stats,
        (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as active_queries,
        (SELECT count(*) FROM pg_stat_activity WHERE wait_event_type IS NOT NULL) as waiting_queries,
        (SELECT ROUND(AVG(EXTRACT(EPOCH FROM (now() - query_start)))::numeric, 2) FROM pg_stat_activity WHERE state = 'active' AND query_start IS NOT NULL) as avg_query_duration,
        (SELECT pg_database_size(current_database())) as database_size_bytes
    `);

    const queryPerformanceMetrics = await pool.query(`
      SELECT 
        ROUND(AVG(query_efficiency_score)::numeric, 2) as avg_efficiency_score,
        COUNT(*) FILTER (WHERE is_long_running = true) as long_running_count,
        COUNT(*) FILTER (WHERE is_blocking = true) as blocking_count,
        COUNT(*) as total_queries_24h
      FROM metadata.query_performance
      WHERE captured_at > NOW() - INTERVAL '24 hours'
    `);

    // Connection pooling removed - using direct connections now

    // 6. RECENT ACTIVITY
    const recentActivity = await pool.query(`
      SELECT 
        COUNT(*) as transfers_last_hour,
        COUNT(*) FILTER (WHERE status = 'FAILED') as errors_last_hour,
        MIN(created_at) as first_transfer,
        MAX(created_at) as last_transfer,
        SUM(records_transferred) as total_records,
        SUM(bytes_transferred) as total_bytes
      FROM metadata.transfer_metrics
      WHERE created_at > NOW() - INTERVAL '1 hour'
    `);

    // Total tables count
    const totalTablesResult = await pool.query(
      `SELECT COUNT(*) as total FROM metadata.catalog`
    );

    // Construir el objeto de respuesta
    const listeningChanges = parseInt(
      syncStatus.rows[0]?.listening_changes || 0
    );
    const fullLoadActive = parseInt(syncStatus.rows[0]?.full_load_active || 0);
    const pending = Math.max(0, fullLoadActive - listeningChanges);

    const stats = {
      syncStatus: {
        progress: 0,
        listeningChanges: listeningChanges,
        pending: pending,
        fullLoadActive: fullLoadActive,
        fullLoadInactive: parseInt(syncStatus.rows[0]?.full_load_inactive || 0),
        noData: parseInt(syncStatus.rows[0]?.no_data || 0),
        skip: parseInt(syncStatus.rows[0]?.skip || 0),
        errors: parseInt(syncStatus.rows[0]?.errors || 0),
        inProgress: parseInt(syncStatus.rows[0]?.in_progress || 0),
        currentProcess: currentProcessText,
        totalData: parseInt(dataProgress.rows[0]?.total_data || 0),
        totalTables: parseInt(totalTablesResult.rows[0]?.total || 0),
      },
      systemResources: {
        cpuUsage: systemResources.rows[0].cpu_usage,
        cpuCores: systemResources.rows[0].cpu_cores.toString(),
        memoryUsed: systemResources.rows[0].memory_used,
        memoryTotal: systemResources.rows[0].memory_total,
        memoryPercentage: systemResources.rows[0].memory_percentage,
        rss: systemResources.rows[0].memory_rss,
        virtual: systemResources.rows[0].memory_virtual,
      },
      dbHealth: {
        activeConnections: dbHealth.rows[0]
          ? dbHealth.rows[0].active_connections +
            "/" +
            dbHealth.rows[0].max_connections
          : "0/0",
        connectionPercentage:
          dbHealth.rows[0] && dbHealth.rows[0].max_connections > 0
            ? (
                (dbHealth.rows[0].active_connections /
                  dbHealth.rows[0].max_connections) *
                100
              ).toFixed(1)
            : "0.0",
        responseTime: "< 1ms",
        bufferHitRate: (
          dbHealth.rows[0]?.cache_stats?.buffer_hit_ratio || 0
        ).toFixed(1),
        cacheHitRate: (
          dbHealth.rows[0]?.cache_stats?.cache_hit_ratio || 0
        ).toFixed(1),
        status: dbHealth.rows[0] ? "Healthy" : "Unknown",
        uptimeSeconds: parseFloat(dbHealth.rows[0]?.uptime_seconds || 0) || 0,
        activeQueries: parseInt(dbHealth.rows[0]?.active_queries || 0) || 0,
        waitingQueries: parseInt(dbHealth.rows[0]?.waiting_queries || 0) || 0,
        avgQueryDuration:
          parseFloat(dbHealth.rows[0]?.avg_query_duration || 0) || 0,
        databaseSizeBytes:
          parseInt(dbHealth.rows[0]?.database_size_bytes || 0) || 0,
        queryEfficiencyScore:
          parseFloat(
            queryPerformanceMetrics.rows[0]?.avg_efficiency_score || 0
          ) || 0,
        longRunningQueries: parseInt(
          queryPerformanceMetrics.rows[0]?.long_running_count || 0
        ),
        blockingQueries: parseInt(
          queryPerformanceMetrics.rows[0]?.blocking_count || 0
        ),
        totalQueries24h: parseInt(
          queryPerformanceMetrics.rows[0]?.total_queries_24h || 0
        ),
      },
      // Connection pooling removed - using direct connections now
    };

    // Calcular progreso total - solo contar registros activos
    const totalActive =
      stats.syncStatus.listeningChanges +
      stats.syncStatus.fullLoadActive +
      stats.syncStatus.errors;
    const total =
      totalActive + stats.syncStatus.fullLoadInactive + stats.syncStatus.noData;

    // El progreso se calcula como: Listening Changes / Total Active * 100
    // Representa qué porcentaje de tablas activas han llegado a LISTENING_CHANGES
    stats.syncStatus.progress =
      totalActive > 0
        ? Math.round((stats.syncStatus.listeningChanges / totalActive) * 100)
        : 0;

    // Agregar métricas por motor
    stats.engineMetrics = {};
    transferPerformance.rows.forEach((metric) => {
      stats.engineMetrics[metric.db_engine] = {
        recordsPerSecond: 0,
        bytesTransferred: parseFloat(metric.total_bytes),
        cpuUsage: 0,
        memoryUsed: parseFloat(metric.avg_memory_used),
        iops: parseFloat(metric.avg_iops),
        activeTransfers: parseInt(metric.active_transfers),
      };
    });

    // Agregar actividad reciente
    stats.recentActivity = {
      transfersLastHour: parseInt(
        recentActivity.rows[0]?.transfers_last_hour || 0
      ),
      errorsLastHour: parseInt(recentActivity.rows[0]?.errors_last_hour || 0),
      totalRecords: parseInt(recentActivity.rows[0]?.total_records || 0),
      totalBytes: parseInt(recentActivity.rows[0]?.total_bytes || 0),
      firstTransfer: recentActivity.rows[0]?.first_transfer || null,
      lastTransfer: recentActivity.rows[0]?.last_transfer || null,
      uptime: formatUptime(dbHealth.rows[0]?.uptime_seconds || 0),
    };

    // MÉTRICAS PARA CARDS INFORMATIVAS

    // 1. Top 10 Tablas por Throughput (Records/Segundo)
    const topTablesThroughput = await pool.query(`
      SELECT 
        tm.schema_name,
        tm.table_name,
        tm.db_engine,
        ROUND(tm.records_transferred::numeric / NULLIF(EXTRACT(EPOCH FROM (tm.completed_at - tm.created_at)), 0), 2) as throughput_rps,
        tm.records_transferred
      FROM metadata.transfer_metrics tm
      WHERE tm.created_at > NOW() - INTERVAL '24 hours'
        AND tm.completed_at IS NOT NULL
        AND tm.records_transferred > 0
      ORDER BY throughput_rps DESC
      LIMIT 10
    `);

    // 2. IO Operations promedio actual
    const currentIops = await pool.query(`
      SELECT ROUND(AVG(io_operations_per_second)::numeric, 2) as avg_iops
      FROM metadata.transfer_metrics
      WHERE created_at > NOW() - INTERVAL '1 hour'
        AND io_operations_per_second > 0
    `);

    // 3. Volumen de datos por tabla (últimos 7 días)
    const dataVolumeByTable = await pool.query(`
      SELECT 
        tm.schema_name,
        tm.table_name,
        tm.db_engine,
        SUM(tm.bytes_transferred) as total_bytes,
        COUNT(tm.id) as transfer_count
      FROM metadata.transfer_metrics tm
      WHERE tm.created_at > NOW() - INTERVAL '7 days'
        AND tm.bytes_transferred > 0
      GROUP BY tm.schema_name, tm.table_name, tm.db_engine
      ORDER BY total_bytes DESC
      LIMIT 10
    `);

    // 4. Throughput actual (última hora)
    const currentThroughput = await pool.query(`
      SELECT 
        ROUND(AVG(records_transferred::numeric / NULLIF(EXTRACT(EPOCH FROM (completed_at - created_at)), 0))::numeric, 2) as avg_throughput_rps,
        SUM(records_transferred) as total_records,
        COUNT(*) as transfer_count
      FROM metadata.transfer_metrics
      WHERE created_at > NOW() - INTERVAL '1 hour'
        AND completed_at IS NOT NULL
        AND records_transferred > 0
    `);

    // Agregar las métricas al response
    stats.metricsCards = {
      topTablesThroughput: topTablesThroughput.rows.map((row) => ({
        tableName: `${row.schema_name}.${row.table_name}`,
        dbEngine: row.db_engine,
        throughputRps: parseFloat(row.throughput_rps || 0),
        recordsTransferred: parseInt(row.records_transferred || 0),
      })),
      currentIops: parseFloat(currentIops.rows[0]?.avg_iops || 0),
      dataVolumeByTable: dataVolumeByTable.rows.map((row) => ({
        tableName: `${row.schema_name}.${row.table_name}`,
        dbEngine: row.db_engine,
        totalBytes: parseInt(row.total_bytes || 0),
        transferCount: parseInt(row.transfer_count || 0),
      })),
      currentThroughput: {
        avgRps: parseFloat(currentThroughput.rows[0]?.avg_throughput_rps || 0),
        totalRecords: parseInt(currentThroughput.rows[0]?.total_records || 0),
        transferCount: parseInt(currentThroughput.rows[0]?.transfer_count || 0),
      },
    };

    const networkIops = stats.metricsCards.currentIops || 0;
    const throughputRps = stats.metricsCards.currentThroughput.avgRps || 0;

    try {
      await pool.query(
        `INSERT INTO metadata.system_logs (
          cpu_usage, cpu_cores, memory_used_gb, memory_total_gb, 
          memory_percentage, memory_rss_gb, memory_virtual_gb,
          network_iops, throughput_rps
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          parseFloat(cpuUsagePercent),
          cpuCount,
          parseFloat(memoryUsedGB),
          parseFloat(memoryTotalGB),
          parseFloat(memoryPercentage),
          parseFloat(rssGB),
          parseFloat(virtualGB),
          networkIops,
          throughputRps,
        ]
      );
    } catch (err) {
      console.error("Error saving system logs:", err);
    }

    res.json(stats);
  } catch (err) {
    console.error("Error getting dashboard stats:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener estadísticas",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/dashboard/system-logs", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 60;

    const result = await pool.query(
      `SELECT 
        timestamp,
        cpu_usage,
        memory_percentage,
        COALESCE(network_iops, 0) as network_iops,
        COALESCE(throughput_rps, 0) as throughput_rps
      FROM metadata.system_logs
      ORDER BY timestamp DESC
      LIMIT $1`,
      [limit]
    );

    const logs = result.rows.reverse().map((row) => {
      const date = new Date(row.timestamp);
      const timeLabel = `${date.getHours().toString().padStart(2, "0")}:${date
        .getMinutes()
        .toString()
        .padStart(2, "0")}:${date.getSeconds().toString().padStart(2, "0")}`;

      return {
        timestamp: timeLabel,
        cpuUsage: parseFloat(row.cpu_usage) || 0,
        memoryPercentage: parseFloat(row.memory_percentage) || 0,
        network: parseFloat(row.network_iops) || 0,
        throughput: parseFloat(row.throughput_rps) || 0,
      };
    });

    res.json({ logs });
  } catch (err) {
    console.error("Error getting system logs:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener logs del sistema",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

// Función para formatear el tiempo de uptime
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours.toString().padStart(2, "0")}h ${minutes
      .toString()
      .padStart(2, "0")}m`;
  } else if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}h ${minutes
      .toString()
      .padStart(2, "0")}m`;
  } else {
    return `${minutes.toString().padStart(2, "0")}m`;
  }
}
// Obtener queries activas
app.get("/api/monitor/queries", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        pid,                    -- ID del proceso
        usename,               -- Usuario que ejecuta la query
        datname,               -- Base de datos
        client_addr,           -- Dirección IP del cliente
        application_name,      -- Nombre de la aplicación
        backend_start,         -- Cuándo inició el proceso
        xact_start,           -- Cuándo inició la transacción
        query_start,          -- Cuándo inició la query
        state_change,         -- Último cambio de estado
        wait_event_type,      -- Tipo de evento que espera
        wait_event,           -- Evento específico que espera
        state,                -- Estado actual (active, idle, etc)
        query,                -- Texto de la query
        EXTRACT(EPOCH FROM (now() - query_start))::integer as duration_seconds  -- Duración en segundos
      FROM pg_stat_activity
      WHERE state IN ('active', 'idle in transaction', 'idle in transaction (aborted)')
      ORDER BY usename DESC
    `);

    const queries = result.rows.map((row) => ({
      ...row,
      duration: formatUptime(row.duration_seconds || 0),
      query: row.query?.trim(),
      state: row.state?.toUpperCase(),
    }));

    res.json(queries);
  } catch (err) {
    console.error("Error getting active queries:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener queries activas",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.post("/api/monitor/queries/:pid/kill", requireAuth, async (req, res) => {
  try {
    const pid = parseInt(req.params.pid);
    if (isNaN(pid)) {
      return res.status(400).json({ error: "Invalid PID" });
    }

    const result = await pool.query(
      "SELECT pg_terminate_backend($1) as terminated",
      [pid]
    );

    if (result.rows[0].terminated) {
      res.json({
        success: true,
        message: `Query with PID ${pid} has been terminated`,
      });
    } else {
      res.status(404).json({
        error: `Query with PID ${pid} not found or could not be terminated`,
      });
    }
  } catch (err) {
    console.error("Error killing query:", err);
    const safeError = sanitizeError(
      err,
      "Error al terminar la query",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

// Obtener métricas de calidad
app.get("/api/quality/metrics", async (req, res) => {
  try {
    const page = validatePage(req.query.page, 1);
    const limit = validateLimit(req.query.limit, 1, 100);
    const offset = (page - 1) * limit;
    const engine = validateEnum(
      req.query.engine,
      ["PostgreSQL", "MariaDB", "MSSQL", "MongoDB", "Oracle", ""],
      ""
    );
    const status = validateEnum(
      req.query.status,
      ["PASSED", "FAILED", "WARNING", ""],
      ""
    );

    // Construir WHERE clause dinámicamente
    const whereConditions = [];
    const params = [];
    let paramCount = 1;

    if (engine) {
      whereConditions.push(`source_db_engine = $${paramCount}`);
      params.push(engine);
      paramCount++;
    }

    if (status) {
      whereConditions.push(`validation_status = $${paramCount}`);
      params.push(status);
      paramCount++;
    }

    // Agregar paginación
    params.push(limit, offset);

    const whereClause =
      whereConditions.length > 0
        ? "WHERE " + whereConditions.join(" AND ")
        : "";

    // Query principal
    const result = await pool.query(
      `
      WITH latest_checks AS (
        SELECT DISTINCT ON (schema_name, table_name, source_db_engine)
          id,
          schema_name,
          table_name,
          source_db_engine,
          check_timestamp,
          total_rows,
          null_count,
          duplicate_count,
          invalid_type_count,
          type_mismatch_details,
          out_of_range_count,
          referential_integrity_errors,
          constraint_violation_count,
          integrity_check_details,
          validation_status,
          error_details,
          quality_score,
          check_duration_ms,
          updated_at
        FROM metadata.data_quality
        ORDER BY schema_name, table_name, source_db_engine, updated_at DESC
      )
      SELECT *
      FROM latest_checks
      ${whereClause}
      ORDER BY check_timestamp DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `,
      params
    );

    // Query para el total
    const totalResult = await pool.query(
      `
      WITH latest_checks AS (
        SELECT DISTINCT ON (schema_name, table_name, source_db_engine)
          id,
          schema_name,
          table_name,
          source_db_engine,
          check_timestamp,
          total_rows,
          null_count,
          duplicate_count,
          invalid_type_count,
          type_mismatch_details,
          out_of_range_count,
          referential_integrity_errors,
          constraint_violation_count,
          integrity_check_details,
          validation_status,
          error_details,
          quality_score,
          check_duration_ms,
          updated_at
        FROM metadata.data_quality
        ORDER BY schema_name, table_name, source_db_engine, updated_at DESC
      )
      SELECT COUNT(*) as total
      FROM latest_checks
      ${whereClause}
    `,
      params.slice(0, -2)
    );

    const total = parseInt(totalResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    res.json({
      data: result.rows,
      pagination: {
        total,
        totalPages,
        currentPage: page,
        limit,
      },
    });
  } catch (err) {
    console.error("Error getting quality metrics:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener métricas de calidad",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

// Obtener datos de governance
app.get("/api/governance/data", async (req, res) => {
  try {
    const page = validatePage(req.query.page, 1);
    const limit = validateLimit(req.query.limit, 1, 100);
    const offset = (page - 1) * limit;
    const engine = validateEnum(
      req.query.engine,
      ["PostgreSQL", "MariaDB", "MSSQL", "MongoDB", "Oracle", ""],
      ""
    );
    const category = sanitizeSearch(req.query.category, 50);
    const health = validateEnum(
      req.query.health,
      ["EXCELLENT", "HEALTHY", "WARNING", "CRITICAL", ""],
      ""
    );
    const domain = sanitizeSearch(req.query.domain, 50);
    const sensitivity = validateEnum(
      req.query.sensitivity,
      ["PUBLIC", "INTERNAL", "CONFIDENTIAL", "RESTRICTED", ""],
      ""
    );

    // Construir WHERE clause dinámicamente
    const whereConditions = [];
    const params = [];
    let paramCount = 1;

    if (engine) {
      whereConditions.push(`inferred_source_engine = $${paramCount}`);
      params.push(engine);
      paramCount++;
    }

    if (category) {
      whereConditions.push(`data_category = $${paramCount}`);
      params.push(category);
      paramCount++;
    }

    if (health) {
      whereConditions.push(`health_status = $${paramCount}`);
      params.push(health);
      paramCount++;
    }

    if (domain) {
      whereConditions.push(`business_domain = $${paramCount}`);
      params.push(domain);
      paramCount++;
    }

    if (sensitivity) {
      whereConditions.push(`sensitivity_level = $${paramCount}`);
      params.push(sensitivity);
      paramCount++;
    }

    // Agregar paginación
    params.push(limit, offset);

    const whereClause =
      whereConditions.length > 0
        ? "WHERE " + whereConditions.join(" AND ")
        : "";

    // Sorting
    const allowedSortFields = new Set([
      "table_name",
      "schema_name",
      "inferred_source_engine",
      "data_category",
      "business_domain",
      "health_status",
      "sensitivity_level",
      "data_quality_score",
      "table_size_mb",
      "total_rows",
      "access_frequency",
      "last_analyzed",
    ]);
    const sortField = String(req.query.sort_field || "");
    const sortDir =
      String(req.query.sort_direction || "desc").toLowerCase() === "asc"
        ? "ASC"
        : "DESC";
    let orderClause =
      "ORDER BY CASE health_status WHEN 'HEALTHY' THEN 1 WHEN 'WARNING' THEN 2 WHEN 'CRITICAL' THEN 3 ELSE 4 END";
    if (allowedSortFields.has(sortField)) {
      orderClause = `ORDER BY ${sortField} ${sortDir}`;
    }

    // Query principal
    const result = await pool.query(
      `
      SELECT *
      FROM metadata.data_governance_catalog
      ${whereClause}
      ${orderClause}
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `,
      params
    );

    // Query para el total
    const totalResult = await pool.query(
      `
      SELECT COUNT(*) as total
      FROM metadata.data_governance_catalog
      ${whereClause}
    `,
      params.slice(0, -2)
    );

    const total = parseInt(totalResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    res.json({
      data: result.rows,
      pagination: {
        total,
        totalPages,
        currentPage: page,
        limit,
      },
    });
  } catch (err) {
    console.error("Error getting governance data:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener datos de governance",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/governance/metrics", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(DISTINCT schema_name || '.' || table_name) as total_tables,
        SUM(COALESCE(table_size_mb, 0)) as total_size_mb,
        SUM(COALESCE(total_rows, 0)) as total_rows,
        COUNT(*) FILTER (WHERE health_status IN ('EXCELLENT', 'HEALTHY')) as healthy_count,
        COUNT(*) FILTER (WHERE health_status = 'WARNING') as warning_count,
        COUNT(*) FILTER (WHERE health_status = 'CRITICAL') as critical_count,
        COUNT(DISTINCT inferred_source_engine) as unique_engines
      FROM metadata.data_governance_catalog
    `);

    res.json(result.rows[0] || {});
  } catch (err) {
    console.error("Error getting governance metrics:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener métricas de governance",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

// Endpoints para la configuración del sistema
app.get("/api/config", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT key, value, description, updated_at FROM metadata.config ORDER BY key"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error getting configurations:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener configuraciones",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.post("/api/config", requireAuth, requireRole("admin"), async (req, res) => {
  const { key, value, description } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO metadata.config (key, value, description) VALUES ($1, $2, $3) RETURNING *",
      [key, value, description]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error creating configuration:", err);
    const safeError = sanitizeError(
      err,
      "Error al crear configuración",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.put(
  "/api/config/:key",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    const key = sanitizeSearch(req.params.key, 100);
    const value = sanitizeSearch(req.body.value, 500);
    const description = sanitizeSearch(req.body.description, 500);

    if (!key || key.trim() === "") {
      return res.status(400).json({ error: "Invalid key" });
    }

    try {
      const result = await pool.query(
        "UPDATE metadata.config SET value = $1, description = $2, updated_at = NOW() WHERE key = $3 RETURNING *",
        [value || "", description || "", key]
      );
      if (result.rows.length === 0) {
        res.status(404).json({ error: "Configuración no encontrada" });
        return;
      }
      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error updating configuration:", err);
      const safeError = sanitizeError(
        err,
        "Error al actualizar configuración",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.delete(
  "/api/config/:key",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    const key = sanitizeSearch(req.params.key, 100);

    if (!key || key.trim() === "") {
      return res.status(400).json({ error: "Invalid key" });
    }

    try {
      const result = await pool.query(
        "DELETE FROM metadata.config WHERE key = $1 RETURNING *",
        [key]
      );
      if (result.rows.length === 0) {
        res.status(404).json({ error: "Configuración no encontrada" });
        return;
      }
      res.json({ message: "Configuración eliminada correctamente" });
    } catch (err) {
      console.error("Error deleting configuration:", err);
      const safeError = sanitizeError(
        err,
        "Error al eliminar configuración",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

// Obtener conexión del DataLake desde config.json
app.get("/api/datalake-connection", requireAuth, async (req, res) => {
  try {
    const pgConfig = config.database.postgres;
    // Construir connection string en formato PostgreSQL URI
    const connectionString = `postgresql://${encodeURIComponent(
      pgConfig.user
    )}:${encodeURIComponent(pgConfig.password)}@${pgConfig.host}:${
      pgConfig.port
    }/${pgConfig.database}`;

    res.json({
      success: true,
      connection_string: connectionString,
      db_engine: "PostgreSQL",
      host: pgConfig.host,
      port: pgConfig.port,
      database: pgConfig.database,
      user: pgConfig.user,
    });
  } catch (err) {
    console.error("Error getting DataLake connection:", err);
    res.status(500).json({
      success: false,
      error: sanitizeError(
        err,
        "Error al obtener conexión del DataLake",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});

// Obtener configuración de batch size específicamente
app.get("/api/config/batch", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT t.* FROM metadata.config t WHERE key = 'chunk_size'"
    );
    if (result.rows.length === 0) {
      res.json({
        key: "chunk_size",
        value: "25000",
        description: "Tamaño de lote para procesamiento de datos",
        updated_at: new Date().toISOString(),
      });
    } else {
      res.json(result.rows[0]);
    }
  } catch (err) {
    console.error("Error getting batch configuration:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener configuración de batch",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

// Endpoint para leer logs desde DB (metadata.logs)
app.get("/api/logs", async (req, res) => {
  try {
    const lines = validateLimit(req.query.lines, 1, 1000);
    const level = validateEnum(
      req.query.level,
      ["ALL", "DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"],
      "ALL"
    );
    const category = validateEnum(
      req.query.category,
      [
        "ALL",
        "SYSTEM",
        "DATABASE",
        "TRANSFER",
        "CUSTOM_JOB",
        "API",
        "QUALITY",
        "GOVERNANCE",
      ],
      "ALL"
    );
    const func = sanitizeSearch(req.query.function, 100) || "ALL";
    const search = sanitizeSearch(req.query.search, 200);
    const startDate = sanitizeSearch(req.query.startDate, 50);
    const endDate = sanitizeSearch(req.query.endDate, 50);

    const params = [];
    let where = [];

    if (level && level !== "ALL") {
      params.push(level);
      where.push(`level = $${params.length}`);
    }
    if (category && category !== "ALL") {
      params.push(category);
      where.push(`category = $${params.length}`);
    }
    if (func && func !== "ALL") {
      params.push(func);
      where.push(`function = $${params.length}`);
    }
    if (search && search.trim() !== "") {
      params.push(`%${search}%`);
      params.push(`%${search}%`);
      where.push(
        `(message ILIKE $${params.length - 1} OR function ILIKE $${
          params.length
        })`
      );
    }
    if (startDate) {
      params.push(startDate);
      where.push(`ts >= $${params.length}`);
    }
    if (endDate) {
      params.push(endDate);
      where.push(`ts <= $${params.length}`);
    }

    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const limit = lines;

    const query = `
      SELECT ts, level, category, function, message
      FROM metadata.logs
      ${whereClause}
      ORDER BY ts DESC
      LIMIT $${params.length + 1}
    `;
    const result = await pool.query(query, [...params, limit]);

    const logs = result.rows.map((r) => {
      const tsIso = r.ts ? new Date(r.ts).toISOString() : null;
      const lvl = (r.level || "").toUpperCase();
      const cat = (r.category || "").toUpperCase();
      return {
        timestamp: tsIso,
        level: lvl,
        category: cat,
        function: r.function || "",
        message: r.message || "",
        raw: `[${tsIso ?? ""}] [${lvl}] [${cat}] [${r.function || ""}] ${
          r.message || ""
        }`,
        parsed: true,
      };
    });

    res.json({
      logs,
      totalLines: logs.length,
      filePath: "metadata.logs",
      lastModified: new Date().toISOString(),
      filters: { level, category, function: func, search, startDate, endDate },
    });
  } catch (err) {
    console.error("Error reading logs from DB:", err);
    const safeError = sanitizeError(
      err,
      "Error al leer logs",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

// Endpoint para obtener logs de errores desde DB (niveles WARNING/ERROR/CRITICAL)
app.get("/api/logs/errors", async (req, res) => {
  try {
    const lines = validateLimit(req.query.lines, 1, 1000);
    const category = validateEnum(
      req.query.category,
      [
        "ALL",
        "SYSTEM",
        "DATABASE",
        "TRANSFER",
        "CUSTOM_JOB",
        "API",
        "QUALITY",
        "GOVERNANCE",
      ],
      "ALL"
    );
    const search = sanitizeSearch(req.query.search, 200);
    const startDate = sanitizeSearch(req.query.startDate, 50);
    const endDate = sanitizeSearch(req.query.endDate, 50);
    const params = [];
    let where = ["level IN ('WARNING','ERROR','CRITICAL')"];
    if (category && category !== "ALL") {
      params.push(category);
      where.push(`category = $${params.length}`);
    }
    if (search && search.trim() !== "") {
      params.push(`%${search}%`);
      params.push(`%${search}%`);
      where.push(
        `(message ILIKE $${params.length - 1} OR function ILIKE $${
          params.length
        })`
      );
    }
    if (startDate) {
      params.push(startDate);
      where.push(`ts >= $${params.length}`);
    }
    if (endDate) {
      params.push(endDate);
      where.push(`ts <= $${params.length}`);
    }
    const whereClause = `WHERE ${where.join(" AND ")}`;
    const limit = lines;
    const q = `SELECT ts, level, category, function, message FROM metadata.logs ${whereClause} ORDER BY ts DESC LIMIT $${
      params.length + 1
    }`;
    const result = await pool.query(q, [...params, limit]);
    const logs = result.rows.map((r) => ({
      timestamp: r.ts,
      level: r.level,
      category: r.category,
      function: r.function,
      message: r.message,
      raw: `[${r.ts}] [${r.level}] [${r.category}] [${r.function}] ${r.message}`,
      parsed: true,
    }));
    res.json({
      logs,
      totalLines: logs.length,
      filePath: "metadata.logs",
      lastModified: new Date().toISOString(),
      filters: { category, search, startDate, endDate },
    });
  } catch (err) {
    console.error("Error reading error logs from DB:", err);
    res.status(500).json({
      error: sanitizeError(
        err,
        "Error al leer logs de errores",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});

// Información de logs desde DB
app.get("/api/logs/info", async (req, res) => {
  try {
    const countRes = await pool.query(
      "SELECT COUNT(*) AS total FROM metadata.logs"
    );
    const lastRes = await pool.query(
      "SELECT MAX(ts) AS last_modified FROM metadata.logs"
    );
    res.json({
      exists: true,
      filePath: "metadata.logs",
      size: null,
      totalLines: parseInt(countRes.rows[0]?.total || 0),
      lastModified: lastRes.rows[0]?.last_modified || null,
      created: null,
    });
  } catch (err) {
    console.error("Error getting DB log info:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener información de logs",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/logs/errors/info", async (req, res) => {
  try {
    const countRes = await pool.query(
      "SELECT COUNT(*) AS total FROM metadata.logs WHERE level IN ('WARNING','ERROR','CRITICAL')"
    );
    const lastRes = await pool.query(
      "SELECT MAX(ts) AS last_modified FROM metadata.logs WHERE level IN ('WARNING','ERROR','CRITICAL')"
    );
    res.json({
      exists: true,
      filePath: "metadata.logs",
      size: null,
      totalLines: parseInt(countRes.rows[0]?.total || 0),
      lastModified: lastRes.rows[0]?.last_modified || null,
      created: null,
    });
  } catch (err) {
    console.error("Error getting DB error log info:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener información de logs de errores",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

// Endpoints de filtros para logs desde DB
app.get("/api/logs/levels", async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT DISTINCT level FROM metadata.logs ORDER BY level"
    );
    res.json(result.rows.map((r) => r.level));
  } catch (err) {
    res.status(500).json({
      error: sanitizeError(
        err,
        "Error al obtener niveles",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});

app.get("/api/logs/categories", async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT DISTINCT category FROM metadata.logs ORDER BY category"
    );
    res.json(result.rows.map((r) => r.category));
  } catch (err) {
    res.status(500).json({
      error: sanitizeError(
        err,
        "Error al obtener categorías",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});

app.get("/api/logs/functions", async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT DISTINCT function FROM metadata.logs ORDER BY function"
    );
    res.json(result.rows.map((r) => r.function));
  } catch (err) {
    res.status(500).json({
      error: sanitizeError(
        err,
        "Error al obtener funciones",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});

// Endpoint para obtener estadísticas de logs
app.get("/api/logs/stats", async (req, res) => {
  try {
    const logFilePath1 = path.join(process.cwd(), "..", "..", "DataSync.log");
    const logFilePath2 = path.join(process.cwd(), "..", "DataSync.log");
    const logFilePath = fs.existsSync(logFilePath1)
      ? logFilePath1
      : logFilePath2;

    if (!fs.existsSync(logFilePath)) {
      return res.json({
        stats: {},
        message: "Log file not found",
      });
    }

    const logContent = fs.readFileSync(logFilePath, "utf8");
    const allLines = logContent
      .split("\n")
      .filter((line) => line.trim() !== "");

    // Parsear logs para estadísticas
    const parsedLogs = allLines.map((line) => {
      const newMatch = line.match(
        /^\[([^\]]+)\] \[([^\]]+)\] \[([^\]]+)\] \[([^\]]+)\] (.+)$/
      );
      if (newMatch) {
        return {
          level: newMatch[2],
          category: newMatch[3],
          function: newMatch[4],
          timestamp: newMatch[1],
        };
      }
      const oldMatch = line.match(
        /^\[([^\]]+)\] \[([^\]]+)\](?: \[([^\]]+)\])? (.+)$/
      );
      if (oldMatch) {
        return {
          level: oldMatch[2],
          category: "SYSTEM",
          function: oldMatch[3] || "",
          timestamp: oldMatch[1],
        };
      }
      return {
        level: "UNKNOWN",
        category: "UNKNOWN",
        function: "",
        timestamp: "",
      };
    });

    // Calcular estadísticas
    const stats = {
      total: parsedLogs.length,
      byLevel: {},
      byCategory: {},
      byFunction: {},
      recent: parsedLogs.slice(-10).map((log) => ({
        timestamp: log.timestamp,
        level: log.level,
        category: log.category,
        function: log.function,
      })),
    };

    // Contar por nivel
    parsedLogs.forEach((log) => {
      stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;
    });

    // Contar por categoría
    parsedLogs.forEach((log) => {
      stats.byCategory[log.category] =
        (stats.byCategory[log.category] || 0) + 1;
    });

    // Contar por función (top 10)
    parsedLogs.forEach((log) => {
      if (log.function) {
        stats.byFunction[log.function] =
          (stats.byFunction[log.function] || 0) + 1;
      }
    });

    // Convertir a array y ordenar
    stats.byFunction = Object.entries(stats.byFunction)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .reduce((obj, [key, value]) => {
        obj[key] = value;
        return obj;
      }, {});

    res.json({
      stats,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Error getting log stats:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener estadísticas de logs",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

// Endpoint para limpiar logs
app.delete("/api/logs", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    await pool.query("TRUNCATE TABLE metadata.logs");
    res.json({
      success: true,
      message: "Logs table truncated",
      clearedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Error truncating logs:", err);
    const safeError = sanitizeError(
      err,
      "Error al truncar logs",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

// Endpoint para obtener tabla actualmente procesándose
app.get("/api/dashboard/currently-processing", async (req, res) => {
  try {
    const page = validatePage(req.query.page, 1);

    const maxWorkersResult = await pool.query(
      "SELECT value FROM metadata.config WHERE key = 'max_workers'"
    );
    const maxWorkers = maxWorkersResult.rows[0]
      ? parseInt(maxWorkersResult.rows[0].value) || 8
      : 8;
    const limit = validateLimit(req.query.limit, 1, Math.max(maxWorkers, 100));
    const pageSize = limit;
    const offset = (page - 1) * pageSize;

    const currentlyProcessingResult = await pool.query(`
      SELECT DISTINCT ON (pl.schema_name, pl.table_name, pl.db_engine)
        pl.schema_name,
        pl.table_name,
        pl.db_engine,
        pl.status,
        pl.processed_at,
        pl.new_pk,
        pl.record_count
      FROM metadata.processing_log pl
      WHERE pl.status = 'IN_PROGRESS'
      ORDER BY pl.schema_name, pl.table_name, pl.db_engine, pl.processed_at DESC
    `);

    const recentHistoryResult = await pool.query(`
      SELECT DISTINCT ON (pl.schema_name, pl.table_name, pl.db_engine)
        pl.schema_name,
        pl.table_name,
        pl.db_engine,
        pl.status,
        pl.processed_at,
        pl.new_pk,
        pl.record_count
      FROM metadata.processing_log pl
      WHERE pl.status != 'IN_PROGRESS'
        AND pl.processed_at > NOW() - INTERVAL '15 minutes'
      ORDER BY pl.schema_name, pl.table_name, pl.db_engine, pl.processed_at DESC
      LIMIT 10
    `);

    const allResults = [
      ...currentlyProcessingResult.rows,
      ...recentHistoryResult.rows,
    ];

    const results = [];

    for (const row of allResults) {
      let countResult;
      try {
        const providedSchema = String(row.schema_name);
        const providedTable = String(row.table_name);

        const resolved = await pool.query(
          `
          SELECT n.nspname AS schema_name, c.relname AS table_name
          FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE lower(n.nspname) = lower($1)
            AND lower(c.relname) = lower($2)
            AND c.relkind = 'r'
          LIMIT 1
          `,
          [providedSchema, providedTable]
        );

        if (resolved.rows.length > 0) {
          const schema = String(resolved.rows[0].schema_name).replace(
            /"/g,
            '""'
          );
          const table = String(resolved.rows[0].table_name).replace(/"/g, '""');
          const countSql = `SELECT COUNT(*) as total_records FROM "${schema}"."${table}"`;
          countResult = await pool.query(countSql);
        } else {
          countResult = { rows: [{ total_records: row.record_count || 0 }] };
        }
      } catch (countError) {
        countResult = { rows: [{ total_records: row.record_count || 0 }] };
      }

      results.push({
        schema_name: String(row.schema_name).toLowerCase(),
        table_name: String(row.table_name).toLowerCase(),
        db_engine: String(row.db_engine),
        new_pk: row.new_pk || null,
        status: String(row.status),
        processed_at: row.processed_at,
        total_records: parseInt(
          countResult.rows[0]?.total_records || row.record_count || 0
        ),
      });
    }

    const inProgressResults = results.filter((r) => r.status === "IN_PROGRESS");
    const historyResults = results.filter((r) => r.status !== "IN_PROGRESS");

    const sortedResults = [
      ...inProgressResults.sort(
        (a, b) =>
          new Date(b.processed_at).getTime() -
          new Date(a.processed_at).getTime()
      ),
      ...historyResults.sort(
        (a, b) =>
          new Date(b.processed_at).getTime() -
          new Date(a.processed_at).getTime()
      ),
    ];

    const total = sortedResults.length;
    const totalPages = Math.ceil(total / pageSize);
    const paginatedResults = sortedResults.slice(offset, offset + pageSize);

    res.json({
      data: paginatedResults,
      pagination: {
        page,
        limit: pageSize,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (err) {
    console.error("Error getting currently processing tables:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener tablas en procesamiento",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

// Endpoint para obtener datos de seguridad
app.get("/api/security/data", async (req, res) => {
  try {

    // 1. USER MANAGEMENT
    const users = await pool.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE rolcanlogin = true) as users_with_login,
        COUNT(*) FILTER (WHERE rolsuper = true) as superusers
      FROM pg_roles
    `);

    const activeUsersCount = await pool.query(`
      SELECT COUNT(DISTINCT usename) as active_users
      FROM pg_stat_activity
      WHERE usename IS NOT NULL
    `);

    // 2. CONNECTION STATUS
    const connections = await pool.query(`
      SELECT 
        COUNT(*) as current_connections,
        (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max_connections,
        COUNT(*) FILTER (WHERE state = 'idle') as idle_connections,
        COUNT(*) FILTER (WHERE state = 'active') as active_connections
      FROM pg_stat_activity
    `);

    // 3. ACTIVE USERS
    const activeUsers = await pool.query(`
      SELECT 
        usename as username,
        CASE 
          WHEN r.rolsuper THEN 'SUPERUSER'
          WHEN r.rolcreatedb THEN 'CREATEDB'
          WHEN r.rolcreaterole THEN 'CREATEROLE'
          WHEN r.rolcanlogin THEN 'LOGIN'
          ELSE 'OTHER'
        END as role_type,
        CASE 
          WHEN sa.state = 'active' THEN 'ACTIVE'
          WHEN sa.state = 'idle' THEN 'IDLE'
          ELSE 'INACTIVE'
        END as status,
        COALESCE(sa.query_start, sa.backend_start) as last_activity,
        sa.client_addr,
        sa.application_name
      FROM pg_stat_activity sa
      JOIN pg_roles r ON sa.usename = r.rolname
      WHERE sa.usename IS NOT NULL
      ORDER BY last_activity DESC
      LIMIT 20
    `);

    // 4. PERMISSIONS OVERVIEW
    const permissionsOverview = await pool.query(`
      SELECT 
        COUNT(*) as total_grants,
        COUNT(DISTINCT table_schema) as schemas_with_access,
        COUNT(DISTINCT table_name) as tables_with_access
      FROM information_schema.table_privileges
      WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
    `);

    const securityData = {
      summary: {
        users: {
          total: parseInt(users.rows[0]?.total_users || 0),
          active: parseInt(activeUsersCount.rows[0]?.active_users || 0),
          superusers: parseInt(users.rows[0]?.superusers || 0),
          withLogin: parseInt(users.rows[0]?.users_with_login || 0),
        },
        connections: {
          current: parseInt(connections.rows[0]?.current_connections || 0),
          max: parseInt(connections.rows[0]?.max_connections || 0),
          idle: parseInt(connections.rows[0]?.idle_connections || 0),
          active: parseInt(connections.rows[0]?.active_connections || 0),
        },
        permissions: {
          totalGrants: parseInt(permissionsOverview.rows[0]?.total_grants || 0),
          schemasWithAccess: parseInt(
            permissionsOverview.rows[0]?.schemas_with_access || 0
          ),
          tablesWithAccess: parseInt(
            permissionsOverview.rows[0]?.tables_with_access || 0
          ),
        },
      },
      activeUsers: activeUsers.rows,
    };

    res.json(securityData);
  } catch (err) {
    console.error("Error getting security data:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener datos de seguridad",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/monitor/processing-logs", async (req, res) => {
  try {
    const page = validatePage(req.query.page, 1);
    const limit = validateLimit(req.query.limit, 1, 100);
    const offset = (page - 1) * limit;
    const strategy = validateEnum(
      req.query.strategy,
      ["AUTO_INCREMENT", "TIMESTAMP", "UUID", ""],
      ""
    );

    const params = [];
    let paramCount = 1;
    const whereConditions = [];

    if (strategy) {
      whereConditions.push(`c.pk_strategy = $${paramCount}`);
      params.push(strategy);
      paramCount++;
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    const latestStatusSubquery = `
      SELECT DISTINCT ON (pl2.schema_name, pl2.table_name, pl2.db_engine)
        pl2.schema_name,
        pl2.table_name,
        pl2.db_engine,
        pl2.status,
        pl2.processed_at
      FROM metadata.processing_log pl2
      ORDER BY pl2.schema_name, pl2.table_name, pl2.db_engine, pl2.processed_at DESC
    `;

    const countResult = await pool.query(
      `
      SELECT COUNT(DISTINCT ls.schema_name || '.' || ls.table_name || '.' || ls.db_engine) as total
      FROM (${latestStatusSubquery}) ls
      LEFT JOIN metadata.catalog c 
        ON c.schema_name = ls.schema_name 
        AND c.table_name = ls.table_name 
        AND c.db_engine = ls.db_engine
      ${whereClause}
    `,
      params
    );

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    params.push(limit, offset);
    const result = await pool.query(
      `
      SELECT 
        latest.id,
        latest.schema_name,
        latest.table_name,
        latest.db_engine,
        latest.pk_strategy,
        latest.status,
        latest.processed_at,
        latest.new_pk,
        latest.record_count
      FROM (
        SELECT DISTINCT ON (pl.schema_name, pl.table_name, pl.db_engine)
          pl.id,
          pl.schema_name,
          pl.table_name,
          pl.db_engine,
          COALESCE(c.pk_strategy, 'N/A') as pk_strategy,
          pl.status,
          pl.processed_at,
          pl.new_pk,
          pl.record_count
        FROM metadata.processing_log pl
        LEFT JOIN metadata.catalog c 
          ON c.schema_name = pl.schema_name 
          AND c.table_name = pl.table_name 
          AND c.db_engine = pl.db_engine
        ${whereClause}
        ORDER BY pl.schema_name, pl.table_name, pl.db_engine, pl.processed_at DESC
      ) latest
      ORDER BY latest.processed_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `,
      params
    );

    res.json({
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (err) {
    console.error("Error getting processing logs:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener logs de procesamiento",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/monitor/processing-logs/stats", async (req, res) => {
  try {
    const latestStatusQuery = `
      SELECT DISTINCT ON (pl.schema_name, pl.table_name, pl.db_engine)
        pl.schema_name,
        pl.table_name,
        pl.db_engine,
        pl.status,
        pl.processed_at
      FROM metadata.processing_log pl
      ORDER BY pl.schema_name, pl.table_name, pl.db_engine, pl.processed_at DESC
    `;

    const result = await pool.query(`
      WITH latest_status AS (${latestStatusQuery})
      SELECT 
        COUNT(DISTINCT ls.schema_name || '.' || ls.table_name || '.' || ls.db_engine) FILTER (
          WHERE ls.status = 'IN_PROGRESS' 
          AND ls.processed_at > NOW() - INTERVAL '5 minutes'
        ) as total,
        (SELECT COUNT(*) FROM metadata.processing_log WHERE processed_at > NOW() - INTERVAL '24 hours') as last24h,
        COUNT(DISTINCT ls.schema_name || '.' || ls.table_name || '.' || ls.db_engine) FILTER (
          WHERE ls.status = 'LISTENING_CHANGES'
        ) as listeningChanges,
        COUNT(DISTINCT ls.schema_name || '.' || ls.table_name || '.' || ls.db_engine) FILTER (
          WHERE ls.status = 'FULL_LOAD'
        ) as fullLoad,
        COUNT(DISTINCT ls.schema_name || '.' || ls.table_name || '.' || ls.db_engine) FILTER (
          WHERE ls.status = 'ERROR'
        ) as errors
      FROM latest_status ls
    `);

    res.json({
      total: parseInt(result.rows[0]?.total || 0),
      last24h: parseInt(result.rows[0]?.last24h || 0),
      listeningChanges: parseInt(result.rows[0]?.listeningChanges || 0),
      fullLoad: parseInt(result.rows[0]?.fullLoad || 0),
      errors: parseInt(result.rows[0]?.errors || 0),
    });
  } catch (err) {
    console.error("Error getting processing stats:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener estadísticas de procesamiento",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.post(
  "/api/monitor/processing-logs/cleanup",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const result = await pool.query(`
      DELETE FROM metadata.processing_log 
      WHERE processed_at < NOW() - INTERVAL '24 hours'
    `);

      res.json({
        success: true,
        message: `Cleaned up ${result.rowCount} old processing log entries`,
        deletedCount: result.rowCount,
        cleanedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Error cleaning up processing logs:", err);
      const safeError = sanitizeError(
        err,
        "Error al limpiar logs antiguos",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.get("/api/monitor/transfer-metrics", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const offset = (page - 1) * limit;
    const schemaName = req.query.schema_name;
    const tableName = req.query.table_name;
    const dbEngine = req.query.db_engine;
    const status = req.query.status;
    const transferType = req.query.transfer_type;
    const days = parseInt(req.query.days) || 7;

    let whereConditions = [`created_at > NOW() - INTERVAL '${days} days'`];
    let queryParams = [];
    let paramIndex = 1;

    if (schemaName) {
      whereConditions.push(`LOWER(schema_name) = LOWER($${paramIndex})`);
      queryParams.push(schemaName);
      paramIndex++;
    }

    if (tableName) {
      whereConditions.push(`LOWER(table_name) = LOWER($${paramIndex})`);
      queryParams.push(tableName);
      paramIndex++;
    }

    if (dbEngine) {
      whereConditions.push(`db_engine = $${paramIndex}`);
      queryParams.push(dbEngine);
      paramIndex++;
    }

    if (status) {
      whereConditions.push(`status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }

    if (transferType) {
      whereConditions.push(`transfer_type = $${paramIndex}`);
      queryParams.push(transferType);
      paramIndex++;
    }

    const whereClause = whereConditions.join(" AND ");

    const countQuery = `SELECT COUNT(*) as total FROM metadata.transfer_metrics WHERE ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0]?.total || 0);

    const dataQuery = `
      SELECT 
        id,
        schema_name,
        table_name,
        db_engine,
        records_transferred,
        bytes_transferred,
        memory_used_mb,
        io_operations_per_second,
        transfer_type,
        status,
        error_message,
        started_at,
        completed_at,
        created_at,
        created_date
      FROM metadata.transfer_metrics
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);
    const dataResult = await pool.query(dataQuery, queryParams);

    const totalPages = Math.ceil(total / limit);

    res.json({
      data: dataResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (err) {
    console.error("Error getting transfer metrics:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener métricas de transferencia",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/monitor/transfer-metrics/stats", async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;

    const statsQuery = `
      SELECT 
        COUNT(*) as total_transfers,
        COUNT(*) FILTER (WHERE status = 'SUCCESS') as successful,
        COUNT(*) FILTER (WHERE status = 'FAILED') as failed,
        COUNT(*) FILTER (WHERE status = 'PENDING') as pending,
        SUM(records_transferred) as total_records,
        SUM(bytes_transferred) as total_bytes,
        AVG(memory_used_mb) as avg_memory_mb,
        AVG(io_operations_per_second) as avg_iops,
        COUNT(*) FILTER (WHERE transfer_type = 'FULL_LOAD') as full_load_count,
        COUNT(*) FILTER (WHERE transfer_type = 'INCREMENTAL') as incremental_count,
        COUNT(*) FILTER (WHERE transfer_type = 'SYNC') as sync_count
      FROM metadata.transfer_metrics
      WHERE created_at > NOW() - INTERVAL '${days} days'
    `;

    const result = await pool.query(statsQuery);

    res.json({
      total_transfers: parseInt(result.rows[0]?.total_transfers || 0),
      successful: parseInt(result.rows[0]?.successful || 0),
      failed: parseInt(result.rows[0]?.failed || 0),
      pending: parseInt(result.rows[0]?.pending || 0),
      total_records: parseInt(result.rows[0]?.total_records || 0),
      total_bytes: parseInt(result.rows[0]?.total_bytes || 0),
      avg_memory_mb: parseFloat(result.rows[0]?.avg_memory_mb || 0),
      avg_iops: parseFloat(result.rows[0]?.avg_iops || 0),
      full_load_count: parseInt(result.rows[0]?.full_load_count || 0),
      incremental_count: parseInt(result.rows[0]?.incremental_count || 0),
      sync_count: parseInt(result.rows[0]?.sync_count || 0),
    });
  } catch (err) {
    console.error("Error getting transfer metrics stats:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener estadísticas de métricas de transferencia",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/query-performance/queries", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const performance_tier = req.query.performance_tier || "";
    const operation_type = req.query.operation_type || "";
    const source_type = req.query.source_type || "";
    const search = req.query.search || "";

    const whereConditions = [];
    const params = [];
    let paramCount = 1;

    if (performance_tier) {
      whereConditions.push(`performance_tier = $${paramCount}`);
      params.push(performance_tier);
      paramCount++;
    }

    if (operation_type) {
      whereConditions.push(`operation_type = $${paramCount}`);
      params.push(operation_type);
      paramCount++;
    }

    if (source_type) {
      whereConditions.push(`source_type = $${paramCount}`);
      params.push(source_type);
      paramCount++;
    }

    if (search) {
      whereConditions.push(`query_text ILIKE $${paramCount}`);
      params.push(`%${search}%`);
      paramCount++;
    }

    const whereClause =
      whereConditions.length > 0
        ? "WHERE " + whereConditions.join(" AND ")
        : "";

    const countQuery = `SELECT COUNT(*) FROM metadata.query_performance ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(limit, offset);
    const dataQuery = `
      SELECT *
      FROM metadata.query_performance
      ${whereClause}
      ORDER BY captured_at DESC, query_efficiency_score DESC NULLS LAST
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    const result = await pool.query(dataQuery, params);

    const totalPages = Math.ceil(total / limit);

    res.json({
      data: result.rows,
      pagination: {
        total,
        totalPages,
        currentPage: page,
        limit,
      },
    });
  } catch (err) {
    console.error("Error getting query performance data:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener datos de rendimiento de queries",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/query-performance/metrics", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_queries,
        COUNT(*) FILTER (WHERE performance_tier = 'EXCELLENT') as excellent_count,
        COUNT(*) FILTER (WHERE performance_tier = 'GOOD') as good_count,
        COUNT(*) FILTER (WHERE performance_tier = 'FAIR') as fair_count,
        COUNT(*) FILTER (WHERE performance_tier = 'POOR') as poor_count,
        COUNT(*) FILTER (WHERE is_long_running = true) as long_running_count,
        COUNT(*) FILTER (WHERE is_blocking = true) as blocking_count,
        ROUND(AVG(query_efficiency_score)::numeric, 2) as avg_efficiency
      FROM metadata.query_performance
      WHERE captured_at > NOW() - INTERVAL '24 hours'
    `);

    res.json(result.rows[0] || {});
  } catch (err) {
    console.error("Error getting query performance metrics:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener métricas de rendimiento de queries",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/maintenance/items", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const maintenance_type = req.query.maintenance_type || "";
    const status = req.query.status || "";
    const db_engine = req.query.db_engine || "";

    const whereConditions = [];
    const params = [];
    let paramCount = 1;

    if (maintenance_type) {
      whereConditions.push(`maintenance_type = $${paramCount}`);
      params.push(maintenance_type);
      paramCount++;
    }

    if (status) {
      whereConditions.push(`status = $${paramCount}`);
      params.push(status);
      paramCount++;
    }

    if (db_engine) {
      whereConditions.push(`db_engine = $${paramCount}`);
      params.push(db_engine);
      paramCount++;
    }

    const whereClause =
      whereConditions.length > 0
        ? "WHERE " + whereConditions.join(" AND ")
        : "";

    const countQuery = `SELECT COUNT(*) FROM metadata.maintenance_control ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(limit, offset);
    const dataQuery = `
      SELECT *
      FROM metadata.maintenance_control
      ${whereClause}
      ORDER BY 
        CASE status
          WHEN 'PENDING' THEN 1
          WHEN 'RUNNING' THEN 2
          WHEN 'COMPLETED' THEN 3
          WHEN 'FAILED' THEN 4
          ELSE 5
        END,
        priority DESC NULLS LAST,
        impact_score DESC NULLS LAST,
        next_maintenance_date ASC NULLS LAST
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    const result = await pool.query(dataQuery, params);

    const totalPages = Math.ceil(total / limit);

    res.json({
      data: result.rows,
      pagination: {
        total,
        totalPages,
        currentPage: page,
        limit,
      },
    });
  } catch (err) {
    console.error("Error getting maintenance items:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener items de mantenimiento",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/maintenance/metrics", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'PENDING') as total_pending,
        COUNT(*) FILTER (WHERE status = 'COMPLETED') as total_completed,
        COUNT(*) FILTER (WHERE status = 'FAILED') as total_failed,
        COUNT(*) FILTER (WHERE status = 'RUNNING') as total_running,
        SUM(space_reclaimed_mb) as total_space_reclaimed_mb,
        ROUND(AVG(impact_score)::numeric, 2) as avg_impact_score,
        COUNT(*) FILTER (WHERE status = 'COMPLETED' AND (space_reclaimed_mb > 0 OR performance_improvement_pct > 0)) as objects_improved
      FROM metadata.maintenance_control
    `);

    res.json(result.rows[0] || {});
  } catch (err) {
    console.error("Error getting maintenance metrics:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener métricas de mantenimiento",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/column-catalog/columns", async (req, res) => {
  try {
    const page = validatePage(req.query.page, 1);
    const limit = validateLimit(req.query.limit, 1, 100);
    const offset = (page - 1) * limit;
    const schema_name = validateIdentifier(req.query.schema_name) || "";
    const table_name = validateIdentifier(req.query.table_name) || "";
    const db_engine = validateEnum(
      req.query.db_engine,
      ["PostgreSQL", "MariaDB", "MSSQL", "MongoDB", "Oracle", ""],
      ""
    );
    const data_type = sanitizeSearch(req.query.data_type, 50);
    const sensitivity_level = validateEnum(
      req.query.sensitivity_level,
      ["LOW", "MEDIUM", "HIGH", "CRITICAL", ""],
      ""
    );
    const contains_pii =
      req.query.contains_pii !== undefined
        ? validateBoolean(req.query.contains_pii)
        : "";
    const contains_phi =
      req.query.contains_phi !== undefined
        ? validateBoolean(req.query.contains_phi)
        : "";
    const search = sanitizeSearch(req.query.search, 100);

    const whereConditions = [];
    const params = [];
    let paramCount = 1;

    if (schema_name) {
      whereConditions.push(`schema_name = $${paramCount}`);
      params.push(schema_name);
      paramCount++;
    }

    if (table_name) {
      whereConditions.push(`table_name = $${paramCount}`);
      params.push(table_name);
      paramCount++;
    }

    if (db_engine) {
      whereConditions.push(`db_engine = $${paramCount}`);
      params.push(db_engine);
      paramCount++;
    }

    if (data_type) {
      whereConditions.push(`data_type ILIKE $${paramCount}`);
      params.push(`%${data_type}%`);
      paramCount++;
    }

    if (sensitivity_level) {
      whereConditions.push(`sensitivity_level = $${paramCount}`);
      params.push(sensitivity_level);
      paramCount++;
    }

    if (contains_pii !== "") {
      whereConditions.push(`contains_pii = $${paramCount}`);
      params.push(contains_pii === "true");
      paramCount++;
    }

    if (contains_phi !== "") {
      whereConditions.push(`contains_phi = $${paramCount}`);
      params.push(contains_phi === "true");
      paramCount++;
    }

    if (search) {
      whereConditions.push(`column_name ILIKE $${paramCount}`);
      params.push(`%${search}%`);
      paramCount++;
    }

    const whereClause =
      whereConditions.length > 0
        ? "WHERE " + whereConditions.join(" AND ")
        : "";

    const countQuery = `SELECT COUNT(*) FROM metadata.column_catalog ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(limit, offset);
    const dataQuery = `
      SELECT *
      FROM metadata.column_catalog
      ${whereClause}
      ORDER BY schema_name, table_name, ordinal_position
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    const result = await pool.query(dataQuery, params);

    const totalPages = Math.ceil(total / limit);

    res.json({
      data: result.rows,
      pagination: {
        total,
        totalPages,
        currentPage: page,
        limit,
      },
    });
  } catch (err) {
    console.error("Error getting column catalog data:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener datos del catálogo de columnas",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/column-catalog/metrics", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_columns,
        COUNT(*) FILTER (WHERE contains_pii = true) as pii_columns,
        COUNT(*) FILTER (WHERE contains_phi = true) as phi_columns,
        COUNT(*) FILTER (WHERE sensitivity_level = 'HIGH') as high_sensitivity,
        COUNT(*) FILTER (WHERE is_primary_key = true) as primary_keys,
        COUNT(*) FILTER (WHERE is_indexed = true) as indexed_columns
      FROM metadata.column_catalog
    `);

    res.json(result.rows[0] || {});
  } catch (err) {
    console.error("Error getting column catalog metrics:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener métricas del catálogo de columnas",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/column-catalog/schemas", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT schema_name
      FROM metadata.column_catalog
      ORDER BY schema_name
    `);

    res.json(result.rows.map((row) => row.schema_name));
  } catch (err) {
    console.error("Error getting schemas:", err);
    res.status(500).json({
      error: "Error al obtener schemas",
      error: sanitizeError(
        err,
        "Error en el servidor",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});

app.get("/api/column-catalog/tables/:schemaName", async (req, res) => {
  try {
    const schemaName = validateIdentifier(req.params.schemaName);
    if (!schemaName) {
      return res.status(400).json({ error: "Invalid schemaName" });
    }
    const result = await pool.query(
      `
        SELECT DISTINCT table_name
        FROM metadata.column_catalog
        WHERE schema_name = $1
        ORDER BY table_name
      `,
      [schemaName]
    );

    res.json(result.rows.map((row) => row.table_name));
  } catch (err) {
    console.error("Error getting tables:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener tablas",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/catalog-locks/locks", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        lock_name,
        acquired_at,
        acquired_by,
        expires_at,
        session_id
      FROM metadata.catalog_locks
      ORDER BY acquired_at DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("Error getting catalog locks:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener locks del catálogo",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/catalog-locks/metrics", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_locks,
        COUNT(*) FILTER (WHERE expires_at > NOW()) as active_locks,
        COUNT(*) FILTER (WHERE expires_at <= NOW()) as expired_locks,
        COUNT(DISTINCT acquired_by) as unique_hosts
      FROM metadata.catalog_locks
    `);

    res.json(result.rows[0] || {});
  } catch (err) {
    console.error("Error getting catalog locks metrics:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener métricas de locks",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.delete(
  "/api/catalog-locks/locks/:lockName",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    const lockName = validateIdentifier(req.params.lockName);

    if (!lockName) {
      return res.status(400).json({ error: "Invalid lockName" });
    }

    try {
      const result = await pool.query(
        `DELETE FROM metadata.catalog_locks WHERE lock_name = $1 RETURNING lock_name`,
        [lockName]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          error: "Lock not found",
          details: `Lock "${lockName}" does not exist`,
        });
      }

      res.json({
        success: true,
        message: `Lock "${lockName}" has been released`,
        lock_name: result.rows[0].lock_name,
      });
    } catch (err) {
      console.error("Error unlocking lock:", err);
      const safeError = sanitizeError(
        err,
        "Error al liberar lock",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.post(
  "/api/catalog-locks/clean-expired",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const result = await pool.query(
        `DELETE FROM metadata.catalog_locks WHERE expires_at <= NOW() RETURNING lock_name`
      );

      res.json({
        success: true,
        message: `Cleaned ${result.rowCount} expired lock(s)`,
        cleaned_count: result.rowCount,
      });
    } catch (err) {
      console.error("Error cleaning expired locks:", err);
      const safeError = sanitizeError(
        err,
        "Error al limpiar locks expirados",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.get("/api/data-lineage/mariadb", async (req, res) => {
  try {
    const page = validatePage(req.query.page, 1);
    const limit = validateLimit(req.query.limit, 1, 100);
    const offset = (page - 1) * limit;
    const server_name = sanitizeSearch(req.query.server_name, 100);
    const database_name = sanitizeSearch(req.query.database_name, 100);
    const object_type = validateEnum(
      req.query.object_type,
      ["TABLE", "VIEW", "PROCEDURE", "FUNCTION", ""],
      ""
    );
    const relationship_type = validateEnum(
      req.query.relationship_type,
      ["FOREIGN_KEY", "VIEW_DEPENDENCY", "PROCEDURE_DEPENDENCY", ""],
      ""
    );
    const search = sanitizeSearch(req.query.search, 100);

    const whereConditions = [];
    const params = [];
    let paramCount = 1;

    if (server_name) {
      whereConditions.push(`server_name = $${paramCount}`);
      params.push(server_name);
      paramCount++;
    }

    if (database_name) {
      whereConditions.push(`database_name = $${paramCount}`);
      params.push(database_name);
      paramCount++;
    }

    if (object_type) {
      whereConditions.push(`object_type = $${paramCount}`);
      params.push(object_type);
      paramCount++;
    }

    if (relationship_type) {
      whereConditions.push(`relationship_type = $${paramCount}`);
      params.push(relationship_type);
      paramCount++;
    }

    if (search) {
      whereConditions.push(
        `(object_name ILIKE $${paramCount} OR target_object_name ILIKE $${paramCount})`
      );
      params.push(`%${search}%`);
      paramCount++;
    }

    const whereClause =
      whereConditions.length > 0
        ? "WHERE " + whereConditions.join(" AND ")
        : "";

    const countQuery = `SELECT COUNT(*) FROM metadata.mdb_lineage ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(limit, offset);
    const dataQuery = `
      SELECT *
      FROM metadata.mdb_lineage
      ${whereClause}
      ORDER BY confidence_score DESC, last_seen_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    const result = await pool.query(dataQuery, params);

    const totalPages = Math.ceil(total / limit);

    res.json({
      data: result.rows,
      pagination: {
        total,
        totalPages,
        currentPage: page,
        limit,
      },
    });
  } catch (err) {
    console.error("Error getting MariaDB lineage data:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener datos de lineage de MariaDB",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/data-lineage/mariadb/metrics", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*)::bigint as total_relationships,
        COUNT(DISTINCT object_name)::bigint as unique_objects,
        COUNT(DISTINCT server_name)::bigint as unique_servers,
        COUNT(DISTINCT database_name) FILTER (WHERE database_name IS NOT NULL)::bigint as unique_databases,
        COUNT(DISTINCT schema_name) FILTER (WHERE schema_name IS NOT NULL)::bigint as unique_schemas,
        COUNT(DISTINCT relationship_type)::bigint as unique_relationship_types,
        COUNT(*) FILTER (WHERE confidence_score >= 0.8)::bigint as high_confidence,
        COUNT(*) FILTER (WHERE confidence_score < 0.5)::bigint as low_confidence,
        ROUND(AVG(confidence_score)::numeric, 4) as avg_confidence,
        ROUND(AVG(dependency_level)::numeric, 2) as avg_dependency_level,
        MAX(dependency_level)::bigint as max_dependency_level,
        COUNT(*) FILTER (WHERE first_seen_at >= NOW() - INTERVAL '24 hours')::bigint as discovered_last_24h,
        COUNT(*) FILTER (WHERE first_seen_at >= NOW() - INTERVAL '7 days')::bigint as discovered_last_7d,
        COUNT(DISTINCT discovery_method)::bigint as unique_discovery_methods,
        COUNT(*) FILTER (WHERE consumer_type IS NOT NULL)::bigint as relationships_with_consumers
      FROM metadata.mdb_lineage
    `);

    res.json(result.rows[0] || {});
  } catch (err) {
    console.error("Error getting MariaDB lineage metrics:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener métricas de lineage de MariaDB",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/data-lineage/mariadb/servers", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT server_name
      FROM metadata.mdb_lineage
      WHERE server_name IS NOT NULL
      ORDER BY server_name
    `);

    res.json(result.rows.map((row) => row.server_name));
  } catch (err) {
    console.error("Error getting MariaDB servers:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener servidores",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/data-lineage/mariadb/databases/:serverName", async (req, res) => {
  try {
    const serverName = req.params.serverName;
    const result = await pool.query(
      `
        SELECT DISTINCT database_name
        FROM metadata.mdb_lineage
        WHERE server_name = $1 AND database_name IS NOT NULL
        ORDER BY database_name
      `,
      [serverName]
    );

    res.json(result.rows.map((row) => row.database_name));
  } catch (err) {
    console.error("Error getting MariaDB databases:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener bases de datos",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/data-lineage/mssql", async (req, res) => {
  try {
    const page = validatePage(req.query.page, 1);
    const limit = validateLimit(req.query.limit, 1, 100);
    const offset = (page - 1) * limit;
    const server_name = sanitizeSearch(req.query.server_name, 100);
    const instance_name = sanitizeSearch(req.query.instance_name, 100);
    const database_name = sanitizeSearch(req.query.database_name, 100);
    const object_type = validateEnum(
      req.query.object_type,
      ["TABLE", "VIEW", "PROCEDURE", "FUNCTION", ""],
      ""
    );
    const relationship_type = validateEnum(
      req.query.relationship_type,
      ["FOREIGN_KEY", "VIEW_DEPENDENCY", "PROCEDURE_DEPENDENCY", ""],
      ""
    );
    const search = sanitizeSearch(req.query.search, 100);

    const whereConditions = [];
    const params = [];
    let paramCount = 1;

    if (server_name) {
      whereConditions.push(`server_name = $${paramCount}`);
      params.push(server_name);
      paramCount++;
    }

    if (instance_name) {
      whereConditions.push(`instance_name = $${paramCount}`);
      params.push(instance_name);
      paramCount++;
    }

    if (database_name) {
      whereConditions.push(`database_name = $${paramCount}`);
      params.push(database_name);
      paramCount++;
    }

    if (object_type) {
      whereConditions.push(`object_type = $${paramCount}`);
      params.push(object_type);
      paramCount++;
    }

    if (relationship_type) {
      whereConditions.push(`relationship_type = $${paramCount}`);
      params.push(relationship_type);
      paramCount++;
    }

    if (search) {
      whereConditions.push(
        `(object_name ILIKE $${paramCount} OR target_object_name ILIKE $${paramCount})`
      );
      params.push(`%${search}%`);
      paramCount++;
    }

    const whereClause =
      whereConditions.length > 0
        ? "WHERE " + whereConditions.join(" AND ")
        : "";

    const countQuery = `SELECT COUNT(*) FROM metadata.mssql_lineage ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(limit, offset);
    const dataQuery = `
      SELECT *
      FROM metadata.mssql_lineage
      ${whereClause}
      ORDER BY confidence_score DESC, last_seen_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    const result = await pool.query(dataQuery, params);

    const totalPages = Math.ceil(total / limit);

    res.json({
      data: result.rows,
      pagination: {
        total,
        totalPages,
        currentPage: page,
        limit,
      },
    });
  } catch (err) {
    console.error("Error getting MSSQL lineage data:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener datos de lineage de MSSQL",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/data-lineage/mssql/metrics", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*)::bigint as total_relationships,
        COUNT(DISTINCT object_name)::bigint as unique_objects,
        COUNT(DISTINCT server_name)::bigint as unique_servers,
        COUNT(DISTINCT instance_name) FILTER (WHERE instance_name IS NOT NULL)::bigint as unique_instances,
        COUNT(DISTINCT database_name) FILTER (WHERE database_name IS NOT NULL)::bigint as unique_databases,
        COUNT(DISTINCT schema_name) FILTER (WHERE schema_name IS NOT NULL)::bigint as unique_schemas,
        COUNT(DISTINCT relationship_type)::bigint as unique_relationship_types,
        COUNT(*) FILTER (WHERE confidence_score >= 0.8)::bigint as high_confidence,
        COUNT(*) FILTER (WHERE confidence_score < 0.5)::bigint as low_confidence,
        ROUND(AVG(confidence_score)::numeric, 4) as avg_confidence,
        ROUND(AVG(dependency_level) FILTER (WHERE dependency_level IS NOT NULL)::numeric, 2) as avg_dependency_level,
        MAX(dependency_level)::bigint as max_dependency_level,
        SUM(COALESCE(execution_count, 0))::bigint as total_executions,
        ROUND(AVG(avg_duration_ms) FILTER (WHERE avg_duration_ms IS NOT NULL)::numeric, 2) as avg_duration_ms,
        ROUND(AVG(avg_cpu_ms) FILTER (WHERE avg_cpu_ms IS NOT NULL)::numeric, 2) as avg_cpu_ms,
        COUNT(*) FILTER (WHERE first_seen_at >= NOW() - INTERVAL '24 hours')::bigint as discovered_last_24h,
        COUNT(*) FILTER (WHERE first_seen_at >= NOW() - INTERVAL '7 days')::bigint as discovered_last_7d,
        COUNT(DISTINCT discovery_method)::bigint as unique_discovery_methods,
        COUNT(*) FILTER (WHERE consumer_type IS NOT NULL)::bigint as relationships_with_consumers
      FROM metadata.mssql_lineage
    `);

    res.json(result.rows[0] || {});
  } catch (err) {
    console.error("Error getting MSSQL lineage metrics:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener métricas de lineage de MSSQL",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/data-lineage/mssql/servers", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT server_name
      FROM metadata.mssql_lineage
      WHERE server_name IS NOT NULL
      ORDER BY server_name
    `);

    res.json(result.rows.map((row) => row.server_name));
  } catch (err) {
    console.error("Error getting MSSQL servers:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener servidores",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/data-lineage/mssql/instances/:serverName", async (req, res) => {
  try {
    const serverName = sanitizeSearch(req.params.serverName, 100);
    if (!serverName) {
      return res.status(400).json({ error: "Invalid serverName" });
    }
    const result = await pool.query(
      `
        SELECT DISTINCT instance_name
        FROM metadata.mssql_lineage
        WHERE server_name = $1 AND instance_name IS NOT NULL
        ORDER BY instance_name
      `,
      [serverName]
    );

    res.json(result.rows.map((row) => row.instance_name));
  } catch (err) {
    console.error("Error getting MSSQL instances:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener instancias",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.get(
  "/api/data-lineage/mssql/databases/:serverName/:instanceName",
  async (req, res) => {
    try {
      const serverName = req.params.serverName;
      const instanceName = req.params.instanceName;
      const result = await pool.query(
        `
        SELECT DISTINCT database_name
        FROM metadata.mssql_lineage
        WHERE server_name = $1 AND instance_name = $2 AND database_name IS NOT NULL
        ORDER BY database_name
      `,
        [serverName, instanceName]
      );

      res.json(result.rows.map((row) => row.database_name));
    } catch (err) {
      console.error("Error getting MSSQL databases:", err);
      res.status(500).json({
        error: "Error al obtener bases de datos",
        error: sanitizeError(
          err,
          "Error en el servidor",
          process.env.NODE_ENV === "production"
        ),
      });
    }
  }
);

app.get("/api/governance-catalog/mariadb", async (req, res) => {
  try {
    const page = validatePage(req.query.page, 1);
    const limit = validateLimit(req.query.limit, 1, 100);
    const offset = (page - 1) * limit;
    const server_name = sanitizeSearch(req.query.server_name, 100);
    const database_name = sanitizeSearch(req.query.database_name, 100);
    const health_status = validateEnum(
      req.query.health_status,
      ["HEALTHY", "WARNING", "CRITICAL", ""],
      ""
    );
    const access_frequency = validateEnum(
      req.query.access_frequency,
      ["HIGH", "MEDIUM", "LOW", ""],
      ""
    );
    const search = sanitizeSearch(req.query.search, 100);

    const whereConditions = [];
    const params = [];
    let paramCount = 1;

    if (server_name) {
      whereConditions.push(`server_name = $${paramCount}`);
      params.push(server_name);
      paramCount++;
    }

    if (database_name) {
      whereConditions.push(`database_name = $${paramCount}`);
      params.push(database_name);
      paramCount++;
    }

    if (health_status) {
      whereConditions.push(`health_status = $${paramCount}`);
      params.push(health_status);
      paramCount++;
    }

    if (access_frequency) {
      whereConditions.push(`access_frequency = $${paramCount}`);
      params.push(access_frequency);
      paramCount++;
    }

    if (search) {
      whereConditions.push(`table_name ILIKE $${paramCount}`);
      params.push(`%${search}%`);
      paramCount++;
    }

    const whereClause =
      whereConditions.length > 0
        ? "WHERE " + whereConditions.join(" AND ")
        : "";

    const countQuery = `SELECT COUNT(*) FROM metadata.data_governance_catalog_mariadb ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(limit, offset);
    const dataQuery = `
      SELECT *
      FROM metadata.data_governance_catalog_mariadb
      ${whereClause}
      ORDER BY server_name, database_name, schema_name, table_name
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    const result = await pool.query(dataQuery, params);

    const totalPages = Math.ceil(total / limit);

    res.json({
      data: result.rows,
      pagination: {
        total,
        totalPages,
        currentPage: page,
        limit,
      },
    });
  } catch (err) {
    console.error("Error getting MariaDB governance catalog:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener catálogo de governance de MariaDB",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/governance-catalog/mariadb/metrics", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_tables,
        SUM(COALESCE(total_size_mb, 0)) as total_size_mb,
        COUNT(*) FILTER (WHERE health_status IN ('EXCELLENT', 'HEALTHY')) as healthy_count,
        COUNT(*) FILTER (WHERE health_status = 'WARNING') as warning_count,
        COUNT(*) FILTER (WHERE health_status = 'CRITICAL') as critical_count,
        COUNT(DISTINCT server_name) as unique_servers
      FROM metadata.data_governance_catalog_mariadb
    `);

    res.json(result.rows[0] || {});
  } catch (err) {
    console.error("Error getting MariaDB governance metrics:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener métricas de governance de MariaDB",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/governance-catalog/mariadb/servers", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT server_name
      FROM metadata.data_governance_catalog_mariadb
      WHERE server_name IS NOT NULL
      ORDER BY server_name
    `);

    res.json(result.rows.map((row) => row.server_name));
  } catch (err) {
    console.error("Error getting MariaDB servers:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener servidores",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.get(
  "/api/governance-catalog/mariadb/databases/:serverName",
  async (req, res) => {
    try {
      const serverName = req.params.serverName;
      const result = await pool.query(
        `
        SELECT DISTINCT database_name
        FROM metadata.data_governance_catalog_mariadb
        WHERE server_name = $1 AND database_name IS NOT NULL
        ORDER BY database_name
      `,
        [serverName]
      );

      res.json(result.rows.map((row) => row.database_name));
    } catch (err) {
      console.error("Error getting MariaDB databases:", err);
      res.status(500).json({
        error: "Error al obtener bases de datos",
        error: sanitizeError(
          err,
          "Error en el servidor",
          process.env.NODE_ENV === "production"
        ),
      });
    }
  }
);

app.get("/api/governance-catalog/mssql", async (req, res) => {
  try {
    const page = validatePage(req.query.page, 1);
    const limit = validateLimit(req.query.limit, 1, 100);
    const offset = (page - 1) * limit;
    const server_name = sanitizeSearch(req.query.server_name, 100);
    const database_name = sanitizeSearch(req.query.database_name, 100);
    const object_type = validateEnum(
      req.query.object_type,
      ["TABLE", "VIEW", "PROCEDURE", "FUNCTION", ""],
      ""
    );
    const health_status = validateEnum(
      req.query.health_status,
      ["HEALTHY", "WARNING", "CRITICAL", ""],
      ""
    );
    const access_frequency = validateEnum(
      req.query.access_frequency,
      ["HIGH", "MEDIUM", "LOW", ""],
      ""
    );
    const search = sanitizeSearch(req.query.search, 100);

    const whereConditions = [];
    const params = [];
    let paramCount = 1;

    if (server_name) {
      whereConditions.push(`server_name = $${paramCount}`);
      params.push(server_name);
      paramCount++;
    }

    if (database_name) {
      whereConditions.push(`database_name = $${paramCount}`);
      params.push(database_name);
      paramCount++;
    }

    if (object_type) {
      whereConditions.push(`object_type = $${paramCount}`);
      params.push(object_type);
      paramCount++;
    }

    if (health_status) {
      whereConditions.push(`health_status = $${paramCount}`);
      params.push(health_status);
      paramCount++;
    }

    if (access_frequency) {
      whereConditions.push(`access_frequency = $${paramCount}`);
      params.push(access_frequency);
      paramCount++;
    }

    if (search) {
      whereConditions.push(
        `(object_name ILIKE $${paramCount} OR table_name ILIKE $${paramCount})`
      );
      params.push(`%${search}%`);
      paramCount++;
    }

    const whereClause =
      whereConditions.length > 0
        ? "WHERE " + whereConditions.join(" AND ")
        : "";

    const countQuery = `SELECT COUNT(*) FROM metadata.data_governance_catalog_mssql ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(limit, offset);
    const dataQuery = `
      SELECT *
      FROM metadata.data_governance_catalog_mssql
      ${whereClause}
      ORDER BY server_name, database_name, schema_name, object_name
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    const result = await pool.query(dataQuery, params);

    const totalPages = Math.ceil(total / limit);

    res.json({
      data: result.rows,
      pagination: {
        total,
        totalPages,
        currentPage: page,
        limit,
      },
    });
  } catch (err) {
    console.error("Error getting MSSQL governance catalog:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener catálogo de governance de MSSQL",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/governance-catalog/mssql/metrics", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_objects,
        SUM(COALESCE(table_size_mb, 0)) as total_size_mb,
        COUNT(*) FILTER (WHERE health_status IN ('EXCELLENT', 'HEALTHY')) as healthy_count,
        COUNT(*) FILTER (WHERE health_status = 'WARNING') as warning_count,
        COUNT(*) FILTER (WHERE health_status = 'CRITICAL') as critical_count,
        COUNT(DISTINCT server_name) as unique_servers
      FROM metadata.data_governance_catalog_mssql
    `);

    res.json(result.rows[0] || {});
  } catch (err) {
    console.error("Error getting MSSQL governance metrics:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener métricas de governance de MSSQL",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/governance-catalog/mssql/servers", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT server_name
      FROM metadata.data_governance_catalog_mssql
      WHERE server_name IS NOT NULL
      ORDER BY server_name
    `);

    res.json(result.rows.map((row) => row.server_name));
  } catch (err) {
    console.error("Error getting MSSQL servers:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener servidores",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.get(
  "/api/governance-catalog/mssql/databases/:serverName",
  async (req, res) => {
    try {
      const serverName = req.params.serverName;
      const result = await pool.query(
        `
        SELECT DISTINCT database_name
        FROM metadata.data_governance_catalog_mssql
        WHERE server_name = $1 AND database_name IS NOT NULL
        ORDER BY database_name
      `,
        [serverName]
      );

      res.json(result.rows.map((row) => row.database_name));
    } catch (err) {
      console.error("Error getting MSSQL databases:", err);
      res.status(500).json({
        error: "Error al obtener bases de datos",
        error: sanitizeError(
          err,
          "Error en el servidor",
          process.env.NODE_ENV === "production"
        ),
      });
    }
  }
);

// MongoDB Lineage endpoints
app.get("/api/data-lineage/mongodb", async (req, res) => {
  try {
    const page = validatePage(req.query.page, 1);
    const limit = validateLimit(req.query.limit, 1, 100);
    const offset = (page - 1) * limit;
    const server_name = sanitizeSearch(req.query.server_name, 100);
    const database_name = sanitizeSearch(req.query.database_name, 100);
    const relationship_type = validateEnum(
      req.query.relationship_type,
      ["VIEW_DEPENDENCY", "COLLECTION_REFERENCE", ""],
      ""
    );
    const search = sanitizeSearch(req.query.search, 100);

    const whereConditions = [];
    const params = [];
    let paramCount = 1;

    if (server_name) {
      whereConditions.push(`server_name = $${paramCount}`);
      params.push(server_name);
      paramCount++;
    }

    if (database_name) {
      whereConditions.push(`database_name = $${paramCount}`);
      params.push(database_name);
      paramCount++;
    }

    if (relationship_type) {
      whereConditions.push(`relationship_type = $${paramCount}`);
      params.push(relationship_type);
      paramCount++;
    }

    if (search) {
      whereConditions.push(
        `(source_collection ILIKE $${paramCount} OR target_collection ILIKE $${paramCount})`
      );
      params.push(`%${search}%`);
      paramCount++;
    }

    const whereClause =
      whereConditions.length > 0
        ? "WHERE " + whereConditions.join(" AND ")
        : "";

    const countQuery = `SELECT COUNT(*) FROM metadata.mongo_lineage ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(limit, offset);
    const dataQuery = `
      SELECT *
      FROM metadata.mongo_lineage
      ${whereClause}
      ORDER BY dependency_level, confidence_score DESC, snapshot_date DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    const result = await pool.query(dataQuery, params);

    const totalPages = Math.ceil(total / limit);

    res.json({
      data: result.rows,
      pagination: {
        total,
        totalPages,
        currentPage: page,
        limit,
      },
    });
  } catch (err) {
    console.error("Error getting MongoDB lineage data:", err);
    res.status(500).json({
      error: "Error al obtener datos de lineage de MongoDB",
      error: sanitizeError(
        err,
        "Error en el servidor",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});

app.get("/api/data-lineage/mongodb/metrics", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*)::bigint as total_relationships,
        (SELECT COUNT(DISTINCT col) FROM (
          SELECT source_collection as col FROM metadata.mongo_lineage WHERE source_collection IS NOT NULL
          UNION
          SELECT target_collection as col FROM metadata.mongo_lineage WHERE target_collection IS NOT NULL
        ) t)::bigint as unique_collections,
        COUNT(DISTINCT server_name)::bigint as unique_servers,
        COUNT(DISTINCT database_name) FILTER (WHERE database_name IS NOT NULL)::bigint as unique_databases,
        COUNT(DISTINCT schema_name) FILTER (WHERE schema_name IS NOT NULL)::bigint as unique_schemas,
        COUNT(DISTINCT relationship_type)::bigint as unique_relationship_types,
        COUNT(*) FILTER (WHERE confidence_score >= 0.8)::bigint as high_confidence,
        COUNT(*) FILTER (WHERE confidence_score < 0.5)::bigint as low_confidence,
        ROUND(AVG(confidence_score)::numeric, 4) as avg_confidence,
        ROUND(AVG(dependency_level) FILTER (WHERE dependency_level IS NOT NULL)::numeric, 2) as avg_dependency_level,
        MAX(dependency_level)::bigint as max_dependency_level,
        COUNT(*) FILTER (WHERE first_seen_at >= NOW() - INTERVAL '24 hours')::bigint as discovered_last_24h,
        COUNT(*) FILTER (WHERE first_seen_at >= NOW() - INTERVAL '7 days')::bigint as discovered_last_7d,
        COUNT(DISTINCT discovery_method)::bigint as unique_discovery_methods,
        COUNT(*) FILTER (WHERE consumer_type IS NOT NULL)::bigint as relationships_with_consumers
      FROM metadata.mongo_lineage
    `);

    res.json(result.rows[0] || {});
  } catch (err) {
    console.error("Error getting MongoDB lineage metrics:", err);
    res.status(500).json({
      error: "Error al obtener métricas de lineage de MongoDB",
      error: sanitizeError(
        err,
        "Error en el servidor",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});

app.get("/api/data-lineage/mongodb/servers", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT server_name
      FROM metadata.mongo_lineage
      WHERE server_name IS NOT NULL
      ORDER BY server_name
    `);

    res.json(result.rows.map((row) => row.server_name));
  } catch (err) {
    console.error("Error getting MongoDB servers:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener servidores",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/data-lineage/mongodb/databases/:serverName", async (req, res) => {
  try {
    const serverName = sanitizeSearch(req.params.serverName, 100);
    if (!serverName) {
      return res.status(400).json({ error: "Invalid serverName" });
    }
    const result = await pool.query(
      `
        SELECT DISTINCT database_name
        FROM metadata.mongo_lineage
        WHERE server_name = $1 AND database_name IS NOT NULL
        ORDER BY database_name
      `,
      [serverName]
    );

    res.json(result.rows.map((row) => row.database_name));
  } catch (err) {
    console.error("Error getting MongoDB databases:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener bases de datos",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

// MongoDB Governance Catalog endpoints
app.get("/api/governance-catalog/mongodb", async (req, res) => {
  try {
    const page = validatePage(req.query.page, 1);
    const limit = validateLimit(req.query.limit, 1, 100);
    const offset = (page - 1) * limit;
    const server_name = sanitizeSearch(req.query.server_name, 100);
    const database_name = sanitizeSearch(req.query.database_name, 100);
    const health_status = validateEnum(
      req.query.health_status,
      ["HEALTHY", "WARNING", "CRITICAL", ""],
      ""
    );
    const access_frequency = validateEnum(
      req.query.access_frequency,
      ["HIGH", "MEDIUM", "LOW", ""],
      ""
    );
    const search = sanitizeSearch(req.query.search, 100);

    const whereConditions = [];
    const params = [];
    let paramCount = 1;

    if (server_name) {
      whereConditions.push(`server_name = $${paramCount}`);
      params.push(server_name);
      paramCount++;
    }

    if (database_name) {
      whereConditions.push(`database_name = $${paramCount}`);
      params.push(database_name);
      paramCount++;
    }

    if (health_status) {
      whereConditions.push(`health_status = $${paramCount}`);
      params.push(health_status);
      paramCount++;
    }

    if (access_frequency) {
      whereConditions.push(`access_frequency = $${paramCount}`);
      params.push(access_frequency);
      paramCount++;
    }

    if (search) {
      whereConditions.push(`collection_name ILIKE $${paramCount}`);
      params.push(`%${search}%`);
      paramCount++;
    }

    const whereClause =
      whereConditions.length > 0
        ? "WHERE " + whereConditions.join(" AND ")
        : "";

    const countQuery = `SELECT COUNT(*) FROM metadata.data_governance_catalog_mongodb ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(limit, offset);
    const dataQuery = `
      SELECT *
      FROM metadata.data_governance_catalog_mongodb
      ${whereClause}
      ORDER BY server_name, database_name, collection_name, index_name
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    const result = await pool.query(dataQuery, params);

    const totalPages = Math.ceil(total / limit);

    res.json({
      data: result.rows,
      pagination: {
        total,
        totalPages,
        currentPage: page,
        limit,
      },
    });
  } catch (err) {
    console.error("Error getting MongoDB governance catalog:", err);
    res.status(500).json({
      error: "Error al obtener catálogo de governance de MongoDB",
      error: sanitizeError(
        err,
        "Error en el servidor",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});

app.get("/api/governance-catalog/mongodb/metrics", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(DISTINCT collection_name) as total_collections,
        SUM(COALESCE(total_size_mb, 0)) as total_size_mb,
        SUM(COALESCE(document_count, 0)) as total_documents,
        COUNT(*) FILTER (WHERE health_status IN ('EXCELLENT', 'HEALTHY')) as healthy_count,
        COUNT(*) FILTER (WHERE health_status = 'WARNING') as warning_count,
        COUNT(*) FILTER (WHERE health_status = 'CRITICAL') as critical_count,
        COUNT(DISTINCT server_name) as unique_servers
      FROM metadata.data_governance_catalog_mongodb
    `);

    res.json(result.rows[0] || {});
  } catch (err) {
    console.error("Error getting MongoDB governance metrics:", err);
    res.status(500).json({
      error: "Error al obtener métricas de governance de MongoDB",
      error: sanitizeError(
        err,
        "Error en el servidor",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});

app.get("/api/governance-catalog/mongodb/servers", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT server_name
      FROM metadata.data_governance_catalog_mongodb
      WHERE server_name IS NOT NULL
      ORDER BY server_name
    `);

    res.json(result.rows.map((row) => row.server_name));
  } catch (err) {
    console.error("Error getting MongoDB servers:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener servidores",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.get(
  "/api/governance-catalog/mongodb/databases/:serverName",
  async (req, res) => {
    try {
      const serverName = req.params.serverName;
      const result = await pool.query(
        `
        SELECT DISTINCT database_name
        FROM metadata.data_governance_catalog_mongodb
        WHERE server_name = $1 AND database_name IS NOT NULL
        ORDER BY database_name
      `,
        [serverName]
      );

      res.json(result.rows.map((row) => row.database_name));
    } catch (err) {
      console.error("Error getting MongoDB databases:", err);
      res.status(500).json({
        error: "Error al obtener bases de datos",
        error: sanitizeError(
          err,
          "Error en el servidor",
          process.env.NODE_ENV === "production"
        ),
      });
    }
  }
);

// Oracle Lineage endpoints
app.get("/api/data-lineage/oracle", async (req, res) => {
  try {
    const page = validatePage(req.query.page, 1);
    const limit = validateLimit(req.query.limit, 1, 100);
    const offset = (page - 1) * limit;
    const server_name = sanitizeSearch(req.query.server_name, 100);
    const schema_name = validateIdentifier(req.query.schema_name) || "";
    const relationship_type = validateEnum(
      req.query.relationship_type,
      ["FOREIGN_KEY", "VIEW_DEPENDENCY", "TRIGGER_DEPENDENCY", ""],
      ""
    );
    const search = sanitizeSearch(req.query.search, 100);

    const whereConditions = [];
    const params = [];
    let paramCount = 1;

    if (server_name) {
      whereConditions.push(`server_name = $${paramCount}`);
      params.push(server_name);
      paramCount++;
    }

    if (schema_name) {
      whereConditions.push(`schema_name = $${paramCount}`);
      params.push(schema_name);
      paramCount++;
    }

    if (relationship_type) {
      whereConditions.push(`relationship_type = $${paramCount}`);
      params.push(relationship_type);
      paramCount++;
    }

    if (search) {
      whereConditions.push(
        `(object_name ILIKE $${paramCount} OR target_object_name ILIKE $${paramCount})`
      );
      params.push(`%${search}%`);
      paramCount++;
    }

    const whereClause =
      whereConditions.length > 0
        ? "WHERE " + whereConditions.join(" AND ")
        : "";

    const countQuery = `SELECT COUNT(*) FROM metadata.oracle_lineage ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(limit, offset);
    const dataQuery = `
      SELECT *
      FROM metadata.oracle_lineage
      ${whereClause}
      ORDER BY confidence_score DESC, last_seen_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    const result = await pool.query(dataQuery, params);

    const totalPages = Math.ceil(total / limit);

    res.json({
      data: result.rows,
      pagination: {
        total,
        totalPages,
        currentPage: page,
        limit,
      },
    });
  } catch (err) {
    console.error("Error getting Oracle lineage data:", err);
    res.status(500).json({
      error: "Error al obtener datos de lineage de Oracle",
      error: sanitizeError(
        err,
        "Error en el servidor",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});

app.get("/api/data-lineage/oracle/metrics", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*)::bigint as total_relationships,
        (SELECT COUNT(DISTINCT col) FROM (
          SELECT object_name as col FROM metadata.oracle_lineage WHERE object_name IS NOT NULL
          UNION
          SELECT target_object_name as col FROM metadata.oracle_lineage WHERE target_object_name IS NOT NULL
        ) t)::bigint as unique_objects,
        COUNT(DISTINCT server_name)::bigint as unique_servers,
        COUNT(DISTINCT schema_name) FILTER (WHERE schema_name IS NOT NULL)::bigint as unique_schemas,
        COUNT(DISTINCT relationship_type)::bigint as unique_relationship_types,
        COUNT(*) FILTER (WHERE confidence_score >= 0.8)::bigint as high_confidence,
        COUNT(*) FILTER (WHERE confidence_score < 0.5)::bigint as low_confidence,
        ROUND(AVG(confidence_score)::numeric, 4) as avg_confidence,
        ROUND(AVG(dependency_level) FILTER (WHERE dependency_level IS NOT NULL)::numeric, 2) as avg_dependency_level,
        MAX(dependency_level)::bigint as max_dependency_level,
        COUNT(*) FILTER (WHERE first_seen_at >= NOW() - INTERVAL '24 hours')::bigint as discovered_last_24h,
        COUNT(*) FILTER (WHERE first_seen_at >= NOW() - INTERVAL '7 days')::bigint as discovered_last_7d,
        COUNT(DISTINCT discovery_method) FILTER (WHERE discovery_method IS NOT NULL)::bigint as unique_discovery_methods
      FROM metadata.oracle_lineage
    `);

    res.json(result.rows[0] || {});
  } catch (err) {
    console.error("Error getting Oracle lineage metrics:", err);
    res.status(500).json({
      error: "Error al obtener métricas de lineage de Oracle",
      error: sanitizeError(
        err,
        "Error en el servidor",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});

app.get("/api/data-lineage/oracle/servers", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT server_name
      FROM metadata.oracle_lineage
      WHERE server_name IS NOT NULL
      ORDER BY server_name
    `);

    res.json(result.rows.map((row) => row.server_name));
  } catch (err) {
    console.error("Error getting Oracle servers:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener servidores",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/data-lineage/oracle/schemas/:serverName", async (req, res) => {
  try {
    const serverName = sanitizeSearch(req.params.serverName, 100);
    if (!serverName) {
      return res.status(400).json({ error: "Invalid serverName" });
    }
    const result = await pool.query(
      `
        SELECT DISTINCT schema_name
        FROM metadata.oracle_lineage
        WHERE server_name = $1 AND schema_name IS NOT NULL
        ORDER BY schema_name
      `,
      [serverName]
    );

    res.json(result.rows.map((row) => row.schema_name));
  } catch (err) {
    console.error("Error getting Oracle schemas:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener schemas de Oracle",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

// Oracle Governance Catalog endpoints
app.get("/api/governance-catalog/oracle", async (req, res) => {
  try {
    const page = validatePage(req.query.page, 1);
    const limit = validateLimit(req.query.limit, 1, 100);
    const offset = (page - 1) * limit;
    const server_name = sanitizeSearch(req.query.server_name, 100);
    const schema_name = validateIdentifier(req.query.schema_name) || "";
    const health_status = validateEnum(
      req.query.health_status,
      ["HEALTHY", "WARNING", "CRITICAL", "EXCELLENT", ""],
      ""
    );
    const access_frequency = validateEnum(
      req.query.access_frequency,
      ["HIGH", "MEDIUM", "LOW", ""],
      ""
    );
    const search = sanitizeSearch(req.query.search, 100);

    const whereConditions = [];
    const params = [];
    let paramCount = 1;

    if (server_name) {
      whereConditions.push(`server_name = $${paramCount}`);
      params.push(server_name);
      paramCount++;
    }

    if (schema_name) {
      whereConditions.push(`schema_name = $${paramCount}`);
      params.push(schema_name);
      paramCount++;
    }

    if (health_status) {
      whereConditions.push(`health_status = $${paramCount}`);
      params.push(health_status);
      paramCount++;
    }

    if (access_frequency) {
      whereConditions.push(`access_frequency = $${paramCount}`);
      params.push(access_frequency);
      paramCount++;
    }

    if (search) {
      whereConditions.push(
        `(table_name ILIKE $${paramCount} OR schema_name ILIKE $${paramCount})`
      );
      params.push(`%${search}%`);
      paramCount++;
    }

    const whereClause =
      whereConditions.length > 0
        ? "WHERE " + whereConditions.join(" AND ")
        : "";

    const countQuery = `SELECT COUNT(*) FROM metadata.data_governance_catalog_oracle ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(limit, offset);
    const dataQuery = `
      SELECT *
      FROM metadata.data_governance_catalog_oracle
      ${whereClause}
      ORDER BY health_score DESC NULLS LAST, table_name
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    const result = await pool.query(dataQuery, params);

    const totalPages = Math.ceil(total / limit);

    res.json({
      data: result.rows,
      pagination: {
        total,
        totalPages,
        currentPage: page,
        limit,
      },
    });
  } catch (err) {
    console.error("Error getting Oracle governance catalog:", err);
    res.status(500).json({
      error: "Error al obtener datos de governance de Oracle",
      error: sanitizeError(
        err,
        "Error en el servidor",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});

app.get("/api/governance-catalog/oracle/metrics", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(DISTINCT CASE WHEN index_name IS NULL THEN table_name END) as total_tables,
        SUM(COALESCE(total_size_mb, 0)) as total_size_mb,
        SUM(COALESCE(row_count, 0)) as total_rows,
        COUNT(*) FILTER (WHERE health_status IN ('EXCELLENT', 'HEALTHY')) as healthy_count,
        COUNT(*) FILTER (WHERE health_status = 'WARNING') as warning_count,
        COUNT(*) FILTER (WHERE health_status = 'CRITICAL') as critical_count,
        COUNT(DISTINCT server_name) as unique_servers
      FROM metadata.data_governance_catalog_oracle
    `);

    res.json(result.rows[0] || {});
  } catch (err) {
    console.error("Error getting Oracle governance metrics:", err);
    res.status(500).json({
      error: "Error al obtener métricas de governance de Oracle",
      error: sanitizeError(
        err,
        "Error en el servidor",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});

app.get("/api/governance-catalog/oracle/servers", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT server_name
      FROM metadata.data_governance_catalog_oracle
      WHERE server_name IS NOT NULL
      ORDER BY server_name
    `);

    res.json(result.rows.map((row) => row.server_name));
  } catch (err) {
    console.error("Error getting Oracle servers:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener servidores",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.get(
  "/api/governance-catalog/oracle/schemas/:serverName",
  async (req, res) => {
    try {
      const serverName = req.params.serverName;
      const result = await pool.query(
        `
        SELECT DISTINCT schema_name
        FROM metadata.data_governance_catalog_oracle
        WHERE server_name = $1 AND schema_name IS NOT NULL
        ORDER BY schema_name
      `,
        [serverName]
      );

      res.json(result.rows.map((row) => row.schema_name));
    } catch (err) {
      console.error("Error getting Oracle schemas:", err);
      res.status(500).json({
        error: "Error al obtener schemas",
        error: sanitizeError(
          err,
          "Error en el servidor",
          process.env.NODE_ENV === "production"
        ),
      });
    }
  }
);

app.get("/api/api-catalog", async (req, res) => {
  try {
    const page = validatePage(req.query.page, 1);
    const limit = validateLimit(req.query.limit, 1, 100);
    const offset = (page - 1) * limit;
    const api_type = validateEnum(
      req.query.api_type,
      ["REST", "GraphQL", "SOAP", ""],
      ""
    );
    const target_db_engine = validateEnum(
      req.query.target_db_engine,
      ["PostgreSQL", "MariaDB", "MSSQL", "MongoDB", "Oracle", ""],
      ""
    );
    const status = validateEnum(
      req.query.status,
      ["SUCCESS", "ERROR", "IN_PROGRESS", "PENDING", ""],
      ""
    );
    const active =
      req.query.active !== undefined ? validateBoolean(req.query.active) : "";
    const search = sanitizeSearch(req.query.search, 100);

    let whereConditions = [];
    let queryParams = [];
    let paramCount = 0;

    if (api_type) {
      paramCount++;
      whereConditions.push(`api_type = $${paramCount}`);
      queryParams.push(api_type);
    }

    if (target_db_engine) {
      paramCount++;
      whereConditions.push(`target_db_engine = $${paramCount}`);
      queryParams.push(target_db_engine);
    }

    if (status) {
      paramCount++;
      whereConditions.push(`status = $${paramCount}`);
      queryParams.push(status);
    }

    if (active !== "") {
      paramCount++;
      whereConditions.push(`active = $${paramCount}`);
      queryParams.push(active === "true");
    }

    if (search) {
      paramCount++;
      whereConditions.push(
        `(api_name ILIKE $${paramCount} OR endpoint ILIKE $${paramCount} OR target_schema ILIKE $${paramCount} OR target_table ILIKE $${paramCount})`
      );
      queryParams.push(`%${search}%`);
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    const countQuery = `SELECT COUNT(*) FROM metadata.api_catalog ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    paramCount++;
    const dataQuery = `SELECT * FROM metadata.api_catalog ${whereClause}
      ORDER BY 
        CASE status
          WHEN 'SUCCESS' THEN 1
          WHEN 'IN_PROGRESS' THEN 2
          WHEN 'ERROR' THEN 3
          WHEN 'PENDING' THEN 4
          ELSE 5
        END,
        active DESC,
        api_name
      LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    queryParams.push(limit, offset);

    const result = await pool.query(dataQuery, queryParams);

    const totalPages = Math.ceil(total / limit);

    res.json({
      data: result.rows,
      pagination: {
        total,
        totalPages,
        currentPage: parseInt(page),
        limit: parseInt(limit),
      },
    });
  } catch (err) {
    console.error("Error getting API catalog:", err);
    res.status(500).json({
      error: "Error al obtener catálogo de APIs",
      error: sanitizeError(
        err,
        "Error en el servidor",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});

app.patch("/api/api-catalog/active", async (req, res) => {
  const { api_name, active } = req.body;
  try {
    const result = await pool.query(
      `UPDATE metadata.api_catalog 
       SET active = $1, updated_at = NOW()
       WHERE api_name = $2
       RETURNING *`,
      [active, api_name]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "API not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating API active status:", err);
    res.status(500).json({
      error: "Error al actualizar estado de API",
      error: sanitizeError(
        err,
        "Error en el servidor",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});

app.post(
  "/api/api-catalog",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    const {
      api_name,
      api_type,
      base_url,
      endpoint,
      http_method,
      auth_type,
      auth_config,
      target_db_engine,
      target_connection_string,
      target_schema,
      target_table,
      request_body,
      request_headers,
      query_params,
      sync_interval,
      status,
      active,
    } = req.body;

    if (
      !api_name ||
      !api_type ||
      !base_url ||
      !endpoint ||
      !http_method ||
      !auth_type ||
      !target_db_engine ||
      !target_connection_string ||
      !target_schema ||
      !target_table
    ) {
      return res.status(400).json({
        error:
          "Missing required fields: api_name, api_type, base_url, endpoint, http_method, auth_type, target_db_engine, target_connection_string, target_schema, target_table",
      });
    }

    const validApiType = validateEnum(
      api_type,
      ["REST", "GraphQL", "SOAP"],
      null
    );
    if (!validApiType) {
      return res.status(400).json({ error: "Invalid api_type" });
    }

    const validHttpMethod = validateEnum(
      http_method,
      ["GET", "POST", "PUT", "PATCH", "DELETE"],
      null
    );
    if (!validHttpMethod) {
      return res.status(400).json({ error: "Invalid http_method" });
    }

    const validAuthType = validateEnum(
      auth_type,
      ["NONE", "BASIC", "BEARER", "API_KEY", "OAUTH2"],
      null
    );
    if (!validAuthType) {
      return res.status(400).json({ error: "Invalid auth_type" });
    }

    const validTargetEngine = validateEnum(
      target_db_engine,
      ["PostgreSQL", "MariaDB", "MSSQL", "MongoDB", "Oracle"],
      null
    );
    if (!validTargetEngine) {
      return res.status(400).json({ error: "Invalid target_db_engine" });
    }

    const validStatus = validateEnum(
      status || "PENDING",
      ["SUCCESS", "ERROR", "IN_PROGRESS", "PENDING"],
      "PENDING"
    );

    const interval =
      sync_interval && sync_interval > 0 ? parseInt(sync_interval) : 3600;
    const isActive =
      active !== undefined ? validateBoolean(active, true) : true;

    try {
      const checkResult = await pool.query(
        `SELECT api_name FROM metadata.api_catalog WHERE api_name = $1`,
        [api_name]
      );

      if (checkResult.rows.length > 0) {
        return res.status(409).json({
          error: "API with this name already exists",
        });
      }

      const result = await pool.query(
        `INSERT INTO metadata.api_catalog 
       (api_name, api_type, base_url, endpoint, http_method, auth_type, auth_config,
        target_db_engine, target_connection_string, target_schema, target_table,
        request_body, request_headers, query_params, status, active, sync_interval)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11, $12, $13::jsonb, $14::jsonb, $15, $16, $17)
       RETURNING *`,
        [
          api_name,
          api_type,
          base_url,
          endpoint,
          http_method,
          auth_type,
          JSON.stringify(auth_config || {}),
          target_db_engine,
          target_connection_string,
          target_schema.toLowerCase(),
          target_table.toLowerCase(),
          request_body || null,
          JSON.stringify(request_headers || {}),
          JSON.stringify(query_params || {}),
          validStatus,
          isActive,
          interval,
        ]
      );

      res.json(result.rows[0]);
    } catch (err) {
      console.error("Database error:", err);
      const safeError = sanitizeError(
        err,
        "Error creating API entry",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.get("/api/api-catalog/metrics", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_apis,
        COUNT(*) FILTER (WHERE active = true) as active_apis,
        COUNT(*) FILTER (WHERE status = 'SUCCESS') as success_apis,
        COUNT(*) FILTER (WHERE status = 'ERROR') as error_apis,
        COUNT(*) FILTER (WHERE status = 'IN_PROGRESS') as in_progress_apis,
        COUNT(*) FILTER (WHERE status = 'PENDING') as pending_apis,
        COUNT(DISTINCT api_type) as api_types_count,
        COUNT(DISTINCT target_db_engine) as target_engines_count
      FROM metadata.api_catalog
    `);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error getting API catalog metrics:", err);
    res.status(500).json({
      error: sanitizeError(
        err,
        "Error en el servidor",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});

app.get("/api/api-catalog/:apiName/history", async (req, res) => {
  try {
    const apiName = validateIdentifier(req.params.apiName);
    if (!apiName) {
      return res.status(400).json({ error: "Invalid apiName" });
    }
    const limit = validateLimit(req.query.limit, 1, 100, 50);

    const result = await pool.query(
      `SELECT 
        id,
        process_type,
        process_name,
        status,
        start_time,
        end_time,
        COALESCE(duration_seconds, EXTRACT(EPOCH FROM (end_time - start_time))::integer) as duration_seconds,
        total_rows_processed,
        error_message,
        metadata,
        created_at
       FROM metadata.process_log 
       WHERE process_type = 'API_SYNC' AND process_name = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [apiName, limit]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching API history:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener historial de la API",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/api-catalog/:apiName/table-structure", async (req, res) => {
  try {
    const apiName = validateIdentifier(req.params.apiName);
    if (!apiName) {
      return res.status(400).json({ error: "Invalid apiName" });
    }

    const apiResult = await pool.query(
      `SELECT target_db_engine, target_connection_string, target_schema, target_table 
       FROM metadata.api_catalog 
       WHERE api_name = $1`,
      [apiName]
    );

    if (apiResult.rows.length === 0) {
      return res.status(404).json({ error: "API not found" });
    }

    const api = apiResult.rows[0];
    const {
      target_db_engine,
      target_connection_string,
      target_schema,
      target_table,
    } = api;

    if (
      !target_db_engine ||
      !target_connection_string ||
      !target_schema ||
      !target_table
    ) {
      return res.status(400).json({
        error:
          "API configuration incomplete. Missing target database information.",
      });
    }

    let columns = [];

    switch (target_db_engine) {
      case "PostgreSQL": {
        const { Pool } = pkg;
        let config;

        if (
          target_connection_string.includes("postgresql://") ||
          target_connection_string.includes("postgres://")
        ) {
          config = {
            connectionString: target_connection_string,
            connectionTimeoutMillis: 10000,
          };
        } else {
          const params = {};
          const parts = target_connection_string.split(";");
          for (const part of parts) {
            const [key, value] = part.split("=").map((s) => s.trim());
            if (key && value) {
              switch (key.toLowerCase()) {
                case "host":
                case "hostname":
                  params.host = value;
                  break;
                case "user":
                case "username":
                  params.user = value;
                  break;
                case "password":
                  params.password = value;
                  break;
                case "db":
                case "database":
                  params.database = value;
                  break;
                case "port":
                  params.port = parseInt(value, 10);
                  break;
              }
            }
          }
          config = {
            ...params,
            connectionTimeoutMillis: 10000,
          };
        }

        const tempPool = new Pool(config);
        let client;
        try {
          client = await tempPool.connect();
          console.log(
            `Querying table structure for ${target_schema}.${target_table}`
          );
          const result = await client.query(
            `
            SELECT 
              column_name,
              data_type,
              character_maximum_length,
              is_nullable,
              column_default
            FROM information_schema.columns
            WHERE table_schema = $1 AND table_name = $2
            ORDER BY ordinal_position
          `,
            [target_schema, target_table]
          );
          console.log(`Found ${result.rows.length} columns`);
          columns = result.rows.map((row) => ({
            name: row.column_name,
            type:
              row.data_type +
              (row.character_maximum_length
                ? `(${row.character_maximum_length})`
                : ""),
            nullable: row.is_nullable === "YES",
            default: row.column_default,
          }));
        } catch (pgErr) {
          console.error("PostgreSQL query error:", pgErr);
          console.error("Error details:", {
            message: pgErr.message,
            code: pgErr.code,
            schema: target_schema,
            table: target_table,
          });
          throw new Error(`Failed to query table structure: ${pgErr.message}`);
        } finally {
          if (client) {
            client.release();
          }
          await tempPool.end();
        }
        break;
      }
      case "MariaDB": {
        const mysql = (await import("mysql2/promise")).default;
        const connection = await mysql.createConnection(
          target_connection_string
        );
        const [rows] = await connection.execute(
          `
          SELECT 
            COLUMN_NAME,
            DATA_TYPE,
            CHARACTER_MAXIMUM_LENGTH,
            IS_NULLABLE,
            COLUMN_DEFAULT
          FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
          ORDER BY ORDINAL_POSITION
        `,
          [target_schema, target_table]
        );
        columns = rows.map((row) => ({
          name: row.COLUMN_NAME,
          type:
            row.DATA_TYPE +
            (row.CHARACTER_MAXIMUM_LENGTH
              ? `(${row.CHARACTER_MAXIMUM_LENGTH})`
              : ""),
          nullable: row.IS_NULLABLE === "YES",
          default: row.COLUMN_DEFAULT,
        }));
        await connection.end();
        break;
      }
      case "MSSQL": {
        const sql = (await import("mssql")).default;
        const pool = await sql.connect(target_connection_string);
        const result = await pool
          .request()
          .input("schema", sql.VarChar, target_schema)
          .input("table", sql.VarChar, target_table).query(`
            SELECT 
              COLUMN_NAME,
              DATA_TYPE,
              CHARACTER_MAXIMUM_LENGTH,
              IS_NULLABLE,
              COLUMN_DEFAULT
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = @schema AND TABLE_NAME = @table
            ORDER BY ORDINAL_POSITION
          `);
        columns = result.recordset.map((row) => ({
          name: row.COLUMN_NAME,
          type:
            row.DATA_TYPE +
            (row.CHARACTER_MAXIMUM_LENGTH
              ? `(${row.CHARACTER_MAXIMUM_LENGTH})`
              : ""),
          nullable: row.IS_NULLABLE === "YES",
          default: row.COLUMN_DEFAULT,
        }));
        await pool.close();
        break;
      }
      case "Oracle": {
        const oracledb = (await import("oracledb")).default;
        const connection = await oracledb.getConnection(
          target_connection_string
        );
        const result = await connection.execute(
          `
          SELECT 
            COLUMN_NAME,
            DATA_TYPE,
            DATA_LENGTH,
            NULLABLE,
            DATA_DEFAULT
          FROM ALL_TAB_COLUMNS
          WHERE OWNER = :owner AND TABLE_NAME = :table
          ORDER BY COLUMN_ID
        `,
          {
            owner: target_schema.toUpperCase(),
            table: target_table.toUpperCase(),
          }
        );
        columns = result.rows.map((row) => ({
          name: row[0],
          type: row[1] + (row[2] ? `(${row[2]})` : ""),
          nullable: row[3] === "Y",
          default: row[4],
        }));
        await connection.close();
        break;
      }
      case "MongoDB": {
        const { MongoClient } = await import("mongodb");
        const client = new MongoClient(target_connection_string);
        await client.connect();
        const db = client.db();
        const collection = db.collection(target_table);
        const sample = await collection.findOne({});
        if (sample) {
          columns = Object.keys(sample).map((key) => ({
            name: key,
            type:
              typeof sample[key] === "object" ? "object" : typeof sample[key],
            nullable: true,
            default: null,
          }));
        }
        await client.close();
        break;
      }
      default:
        return res
          .status(400)
          .json({ error: `Unsupported database engine: ${target_db_engine}` });
    }

    res.json({
      db_engine: target_db_engine,
      schema: target_schema,
      table: target_table,
      columns: columns,
    });
  } catch (err) {
    console.error("Error fetching table structure:", err);
    console.error("Error stack:", err.stack);
    console.error("Error details:", {
      message: err.message,
      apiName: req.params.apiName,
    });
    const safeError = sanitizeError(
      err,
      `Error al obtener estructura de la tabla: ${err.message}`,
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({
      error: safeError,
      details: process.env.NODE_ENV !== "production" ? err.message : undefined,
    });
  }
});

app.post("/api/api-catalog/preview", async (req, res) => {
  try {
    const {
      base_url,
      endpoint,
      http_method,
      auth_type,
      auth_config,
      request_headers,
      query_params,
    } = req.body;

    if (!base_url || !endpoint) {
      return res
        .status(400)
        .json({ error: "base_url and endpoint are required" });
    }

    const url = new URL(endpoint, base_url);

    if (query_params) {
      try {
        const params =
          typeof query_params === "string"
            ? JSON.parse(query_params)
            : query_params;
        Object.keys(params).forEach((key) => {
          url.searchParams.append(key, params[key]);
        });
      } catch (err) {
        console.error("Error parsing query_params:", err);
      }
    }

    const headers = {
      Accept: "application/json, */*",
    };

    if (request_headers) {
      try {
        const parsedHeaders =
          typeof request_headers === "string"
            ? JSON.parse(request_headers)
            : request_headers;
        Object.assign(headers, parsedHeaders);
      } catch (err) {
        console.error("Error parsing request_headers:", err);
      }
    }

    if (auth_type === "BEARER" && auth_config) {
      try {
        const auth =
          typeof auth_config === "string"
            ? JSON.parse(auth_config)
            : auth_config;
        if (auth.bearer_token || auth.token) {
          headers["Authorization"] = `Bearer ${
            auth.bearer_token || auth.token
          }`;
        }
      } catch (err) {
        console.error("Error parsing auth_config:", err);
      }
    } else if (auth_type === "BASIC" && auth_config) {
      try {
        const auth =
          typeof auth_config === "string"
            ? JSON.parse(auth_config)
            : auth_config;
        if (auth.username && auth.password) {
          const credentials = Buffer.from(
            `${auth.username}:${auth.password}`
          ).toString("base64");
          headers["Authorization"] = `Basic ${credentials}`;
        }
      } catch (err) {
        console.error("Error parsing auth_config:", err);
      }
    } else if (auth_type === "API_KEY" && auth_config) {
      try {
        const auth =
          typeof auth_config === "string"
            ? JSON.parse(auth_config)
            : auth_config;
        if (auth.api_key && auth.api_key_header) {
          headers[auth.api_key_header] = auth.api_key;
        } else if (auth.api_key) {
          headers["X-API-Key"] = auth.api_key;
        }
      } catch (err) {
        console.error("Error parsing auth_config:", err);
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url.toString(), {
        method: http_method || "GET",
        headers: headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return res.status(response.status).json({
          error: `API request failed with status ${response.status}`,
          status: response.status,
        });
      }

      const contentType = response.headers.get("content-type") || "";
      let data;
      let sampleData = [];

      if (contentType.includes("application/json")) {
        data = await response.json();

        if (Array.isArray(data)) {
          sampleData = data.slice(0, 10);
        } else if (typeof data === "object" && data !== null) {
          if (data.data && Array.isArray(data.data)) {
            sampleData = data.data.slice(0, 10);
          } else if (data.results && Array.isArray(data.results)) {
            sampleData = data.results.slice(0, 10);
          } else {
            sampleData = [data];
          }
        }
      } else {
        const text = await response.text();
        data = text;
        sampleData = [{ raw_response: text.substring(0, 500) }];
      }

      res.json({
        success: true,
        status: response.status,
        contentType: contentType,
        sampleData: sampleData,
        totalItems: Array.isArray(data)
          ? data.length
          : data.data?.length || data.results?.length || 1,
        fullData: data,
      });
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") {
        return res.status(408).json({ error: "Request timeout" });
      }
      throw err;
    }
  } catch (err) {
    console.error("Error previewing API:", err);
    res.status(500).json({
      error: sanitizeError(
        err,
        "Error previewing API",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});

const extractClusterName = (connectionString, dbEngine) => {
  if (dbEngine === "MongoDB") {
    const srvMatch = connectionString.match(/mongodb\+srv:\/\/[^@]+@([^.]+)/);
    if (srvMatch) {
      return srvMatch[1];
    }
    const standardMatchWithAuth = connectionString.match(
      /mongodb:\/\/[^@]+@([^:]+)/
    );
    if (standardMatchWithAuth) {
      return standardMatchWithAuth[1];
    }
    const standardMatchWithoutAuth =
      connectionString.match(/mongodb:\/\/([^:/]+)/);
    if (standardMatchWithoutAuth) {
      return standardMatchWithoutAuth[1];
    }
  } else {
    const parts = connectionString.split(";");
    for (const part of parts) {
      const [key, value] = part.split("=").map((s) => s.trim());
      if (key && value) {
        const keyLower = key.toLowerCase();
        if (
          keyLower === "host" ||
          keyLower === "hostname" ||
          keyLower === "server"
        ) {
          if (dbEngine === "MSSQL" && value.includes(",")) {
            return value.split(",")[0].trim();
          }
          return value;
        }
      }
    }
    if (
      dbEngine === "PostgreSQL" &&
      (connectionString.includes("postgresql://") ||
        connectionString.includes("postgres://"))
    ) {
      const urlMatch = connectionString.match(/:\/\/(?:[^@]+@)?([^:]+)/);
      if (urlMatch) {
        return urlMatch[1];
      }
    }
  }
  return null;
};

app.post("/api/test-connection", requireAuth, async (req, res) => {
  const { db_engine, connection_string } = req.body;

  if (!db_engine || !connection_string) {
    return res.status(400).json({
      success: false,
      error: "Missing required fields: db_engine and connection_string",
    });
  }

  const validEngine = validateEnum(
    db_engine,
    ["PostgreSQL", "MariaDB", "MSSQL", "MongoDB", "Oracle"],
    null
  );

  if (!validEngine) {
    return res.status(400).json({
      success: false,
      error:
        "Invalid db_engine. Must be one of: PostgreSQL, MariaDB, MSSQL, MongoDB, Oracle, DB2",
    });
  }

  try {
    let testResult = false;
    let message = "";
    let clusterName = null;

    switch (db_engine) {
      case "PostgreSQL": {
        try {
          let config;

          if (
            connection_string.includes("postgresql://") ||
            connection_string.includes("postgres://")
          ) {
            config = {
              connectionString: connection_string,
              connectionTimeoutMillis: 5000,
            };
          } else {
            const params = {};
            const parts = connection_string.split(";");

            for (const part of parts) {
              const [key, value] = part.split("=").map((s) => s.trim());
              if (key && value) {
                switch (key.toLowerCase()) {
                  case "host":
                  case "hostname":
                    params.host = value;
                    break;
                  case "user":
                  case "username":
                    params.user = value;
                    break;
                  case "password":
                    params.password = value;
                    break;
                  case "db":
                  case "database":
                    params.database = value;
                    break;
                  case "port":
                    params.port = parseInt(value, 10);
                    break;
                }
              }
            }

            config = {
              ...params,
              connectionTimeoutMillis: 5000,
            };
          }

          console.log("Testing PostgreSQL connection with config:", {
            host: config.host || "from connectionString",
            user: config.user || "from connectionString",
            database: config.database || "from connectionString",
            port: config.port || "from connectionString",
          });

          const testPool = new Pool(config);
          const client = await testPool.connect();
          await client.query("SELECT 1");
          client.release();
          await testPool.end();
          testResult = true;
          message = "PostgreSQL connection successful!";
        } catch (err) {
          console.error("PostgreSQL connection error:", err);
          message = `PostgreSQL connection failed: ${err.message}`;
        }
        break;
      }

      case "MariaDB": {
        try {
          const mysql = await import("mysql2/promise").catch(() => null);
          if (!mysql) {
            message =
              "MariaDB driver (mysql2) is not installed. Please install it with: npm install mysql2";
            break;
          }

          const connStr = connection_string;
          const params = {};
          connStr.split(";").forEach((param) => {
            const [key, value] = param.split("=");
            if (key && value) {
              params[key.trim().toLowerCase()] = value.trim();
            }
          });

          const connection = await mysql.createConnection({
            host: params.host || "localhost",
            port: params.port ? parseInt(params.port) : 3306,
            user: params.user || "root",
            password: params.password || "",
            database: params.db || params.database || "",
            connectTimeout: 5000,
          });

          await connection.query("SELECT 1");
          await connection.end();
          testResult = true;
          message = "MariaDB connection successful!";
        } catch (err) {
          message = `MariaDB connection failed: ${err.message}`;
        }
        break;
      }

      case "MSSQL": {
        try {
          const mssqlModule = await import("mssql").catch(() => null);
          if (!mssqlModule) {
            message =
              "MSSQL driver (mssql) is not installed. Please install it with: npm install mssql";
            break;
          }

          const sql = mssqlModule.default || mssqlModule;
          const ConnectionPool = sql.ConnectionPool || sql;

          const connStr = connection_string;
          const config = {
            options: {
              encrypt: false,
              trustServerCertificate: true,
              connectTimeout: 5000,
            },
          };

          const parts = connStr.split(";");
          parts.forEach((part) => {
            const [key, value] = part.split("=");
            if (key && value) {
              const k = key.trim().toUpperCase();
              if (k === "SERVER") {
                const [host, port] = value.split(",");
                config.server = host.trim();
                if (port) config.port = parseInt(port.trim());
              } else if (k === "DATABASE") {
                config.database = value.trim();
              } else if (k === "UID") {
                config.user = value.trim();
              } else if (k === "PWD") {
                config.password = value.trim();
              }
            }
          });

          const pool = new ConnectionPool(config);
          await pool.connect();
          await pool.request().query("SELECT 1");
          await pool.close();
          testResult = true;
          message = "MSSQL connection successful!";
        } catch (err) {
          message = `MSSQL connection failed: ${err.message}`;
        }
        break;
      }

      case "MongoDB": {
        try {
          const { MongoClient } = await import("mongodb").catch(() => ({
            MongoClient: null,
          }));
          if (!MongoClient) {
            message =
              "MongoDB driver (mongodb) is not installed. Please install it with: npm install mongodb";
            break;
          }

          const client = new MongoClient(connection_string, {
            serverSelectionTimeoutMS: 5000,
          });
          await client.connect();
          await client.db().admin().ping();
          await client.close();
          testResult = true;
          message = "MongoDB connection successful!";
        } catch (err) {
          message = `MongoDB connection failed: ${err.message}`;
        }
        break;
      }

      case "Oracle": {
        try {
          const oracledb = await import("oracledb").catch(() => null);
          if (!oracledb) {
            message =
              "Oracle driver (oracledb) is not installed. Please install it with: npm install oracledb";
            break;
          }

          const connStr = connection_string;
          const params = {};
          connStr.split(";").forEach((param) => {
            const [key, value] = param.split("=");
            if (key && value) {
              params[key.trim().toLowerCase()] = value.trim();
            }
          });

          const connection = await oracledb.getConnection({
            user: params.user || "",
            password: params.password || "",
            connectString: `${params.host || "localhost"}:${
              params.port || 1521
            }/${params.db || params.database || ""}`,
            connectionTimeout: 5000,
          });

          await connection.execute("SELECT 1 FROM DUAL");
          await connection.close();
          testResult = true;
          message = "Oracle connection successful!";
        } catch (err) {
          message = `Oracle connection failed: ${err.message}`;
        }
        break;
      }

      case "Redshift": {
        try {
          let config;

          if (
            connection_string.includes("postgresql://") ||
            connection_string.includes("postgres://")
          ) {
            config = {
              connectionString: connection_string,
              connectionTimeoutMillis: 5000,
            };
          } else {
            const params = {};
            const parts = connection_string.split(";");

            for (const part of parts) {
              const [key, value] = part.split("=").map((s) => s.trim());
              if (key && value) {
                switch (key.toLowerCase()) {
                  case "host":
                  case "hostname":
                    params.host = value;
                    break;
                  case "user":
                  case "username":
                    params.user = value;
                    break;
                  case "password":
                    params.password = value;
                    break;
                  case "db":
                  case "database":
                    params.database = value;
                    break;
                  case "port":
                    params.port = parseInt(value, 10);
                    break;
                }
              }
            }

            config = {
              ...params,
              connectionTimeoutMillis: 5000,
            };
          }

          const testPool = new Pool(config);
          const client = await testPool.connect();
          await client.query("SELECT 1");
          client.release();
          await testPool.end();
          testResult = true;
          message = "Redshift connection successful!";
        } catch (err) {
          console.error("Redshift connection error:", err);
          message = `Redshift connection failed: ${err.message}`;
        }
        break;
      }

      case "Snowflake": {
        try {
          const connStr = connection_string;
          const params = {};
          connStr.split(";").forEach((param) => {
            const [key, value] = param.split("=");
            if (key && value) {
              const k = key.trim().toUpperCase();
              params[k] = value.trim();
            }
          });

          if (!params.SERVER || !params.UID || !params.PWD) {
            message =
              "Snowflake connection string must include SERVER, UID, and PWD";
            break;
          }

          const odbc = await import("odbc").catch(() => null);
          if (!odbc) {
            message =
              "ODBC driver is not available. Snowflake requires ODBC driver installed on the server.";
            break;
          }

          const connectionString = `DRIVER={Snowflake Driver};${connStr}`;
          const connection = await odbc.connect(connectionString);
          await connection.query("SELECT 1");
          await connection.close();
          testResult = true;
          message = "Snowflake connection successful!";
        } catch (err) {
          console.error("Snowflake connection error:", err);
          message = `Snowflake connection failed: ${err.message}. Make sure Snowflake ODBC driver is installed.`;
        }
        break;
      }

      case "BigQuery": {
        try {
          let config;
          try {
            config = JSON.parse(connection_string);
          } catch (parseErr) {
            message =
              'BigQuery connection string must be valid JSON. Example: {"project_id": "...", "dataset_id": "...", "access_token": "..."}';
            break;
          }

          if (!config.project_id) {
            message = "BigQuery connection string must include project_id";
            break;
          }

          if (!config.access_token && !config.credentials_json) {
            message =
              "BigQuery connection string must include either access_token or credentials_json";
            break;
          }

          const https = await import("https");
          const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${config.project_id}/datasets`;

          const options = {
            method: "GET",
            headers: {
              Authorization: `Bearer ${config.access_token || "test"}`,
              "Content-Type": "application/json",
            },
            timeout: 5000,
          };

          const response = await new Promise((resolve, reject) => {
            const req = https.request(url, options, (res) => {
              let data = "";
              res.on("data", (chunk) => {
                data += chunk;
              });
              res.on("end", () => {
                resolve({ statusCode: res.statusCode, data });
              });
            });

            req.on("error", reject);
            req.on("timeout", () => {
              req.destroy();
              reject(new Error("Request timeout"));
            });

            req.end();
          });

          if (response.statusCode === 200 || response.statusCode === 401) {
            if (response.statusCode === 401) {
              message =
                "BigQuery authentication failed. Please check your access_token or credentials_json";
            } else {
              testResult = true;
              message = "BigQuery connection successful!";
            }
          } else {
            message = `BigQuery connection failed with status ${response.statusCode}`;
          }
        } catch (err) {
          console.error("BigQuery connection error:", err);
          message = `BigQuery connection failed: ${err.message}`;
        }
        break;
      }

      default:
        return res.status(400).json({
          success: false,
          error: `Unsupported database engine: ${db_engine}`,
        });
    }

    if (testResult) {
      clusterName = extractClusterName(connection_string, db_engine);
      res.json({
        success: true,
        message: message,
        ...(clusterName && { cluster_name: clusterName }),
      });
    } else {
      res.status(400).json({
        success: false,
        error: message,
      });
    }
  } catch (err) {
    console.error("Error testing connection:", err);
    res.status(500).json({
      success: false,
      error: sanitizeError(
        err,
        "Error testing connection",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});

app.post("/api/discover-schemas", requireAuth, async (req, res) => {
  const { db_engine, connection_string } = req.body;

  if (!db_engine || !connection_string) {
    return res.status(400).json({
      success: false,
      error: "Missing required fields: db_engine and connection_string",
    });
  }

  const validEngine = validateEnum(
    db_engine,
    ["PostgreSQL", "MariaDB", "MSSQL", "MongoDB", "Oracle"],
    null
  );

  if (!validEngine) {
    return res.status(400).json({
      success: false,
      error:
        "Invalid db_engine. Must be one of: PostgreSQL, MariaDB, MSSQL, MongoDB, Oracle, DB2",
    });
  }

  try {
    let schemas = [];

    switch (db_engine) {
      case "PostgreSQL": {
        try {
          let config;
          if (
            connection_string.includes("postgresql://") ||
            connection_string.includes("postgres://")
          ) {
            config = {
              connectionString: connection_string,
              connectionTimeoutMillis: 5000,
            };
          } else {
            const params = {};
            const parts = connection_string.split(";");
            for (const part of parts) {
              const [key, value] = part.split("=").map((s) => s.trim());
              if (key && value) {
                switch (key.toLowerCase()) {
                  case "host":
                  case "hostname":
                    params.host = value;
                    break;
                  case "user":
                  case "username":
                    params.user = value;
                    break;
                  case "password":
                    params.password = value;
                    break;
                  case "db":
                  case "database":
                    params.database = value;
                    break;
                  case "port":
                    params.port = parseInt(value, 10);
                    break;
                }
              }
            }
            config = {
              ...params,
              connectionTimeoutMillis: 5000,
            };
          }

          const testPool = new Pool(config);
          const result = await testPool.query(
            "SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast') ORDER BY schema_name"
          );
          schemas = result.rows.map((row) => row.schema_name);
          await testPool.end();
        } catch (err) {
          return res.status(400).json({
            success: false,
            error: `Failed to discover schemas: ${err.message}`,
          });
        }
        break;
      }

      case "MariaDB": {
        try {
          const mysql = await import("mysql2/promise").catch(() => null);
          if (!mysql) {
            return res.status(400).json({
              success: false,
              error:
                "MariaDB driver (mysql2) is not installed. Please install it with: npm install mysql2",
            });
          }

          const connStr = connection_string;
          const params = {};
          connStr.split(";").forEach((param) => {
            const [key, value] = param.split("=");
            if (key && value) {
              params[key.trim().toLowerCase()] = value.trim();
            }
          });

          const connection = await mysql.createConnection({
            host: params.host || "localhost",
            port: params.port ? parseInt(params.port) : 3306,
            user: params.user || "root",
            password: params.password || "",
            database: params.db || params.database || "",
            connectTimeout: 5000,
          });

          const [rows] = await connection.query("SHOW DATABASES");
          schemas = rows
            .map((row) => Object.values(row)[0])
            .filter(
              (db) =>
                ![
                  "information_schema",
                  "performance_schema",
                  "mysql",
                  "sys",
                ].includes(db)
            )
            .sort();
          await connection.end();
        } catch (err) {
          return res.status(400).json({
            success: false,
            error: `Failed to discover schemas: ${err.message}`,
          });
        }
        break;
      }

      case "MSSQL": {
        try {
          const mssqlModule = await import("mssql").catch(() => null);
          if (!mssqlModule) {
            return res.status(400).json({
              success: false,
              error:
                "MSSQL driver (mssql) is not installed. Please install it with: npm install mssql",
            });
          }

          const sql = mssqlModule.default || mssqlModule;
          const ConnectionPool = sql.ConnectionPool || sql;

          const connStr = connection_string;
          const config = {
            options: {
              encrypt: false,
              trustServerCertificate: true,
              connectTimeout: 5000,
            },
          };

          const parts = connStr.split(";");
          parts.forEach((part) => {
            const [key, value] = part.split("=");
            if (key && value) {
              const k = key.trim().toUpperCase();
              if (k === "SERVER") {
                const [host, port] = value.split(",");
                config.server = host.trim();
                if (port) config.port = parseInt(port.trim());
              } else if (k === "DATABASE") {
                config.database = value.trim();
              } else if (k === "UID") {
                config.user = value.trim();
              } else if (k === "PWD") {
                config.password = value.trim();
              }
            }
          });

          if (!config.database) {
            return res.status(400).json({
              success: false,
              error: "Database name is required in connection string for MSSQL",
            });
          }

          const pool = new ConnectionPool(config);
          await pool.connect();
          
          const systemSchemas = [
            "INFORMATION_SCHEMA",
            "sys",
            "guest",
            "db_owner",
            "db_accessadmin",
            "db_securityadmin",
            "db_ddladmin",
            "db_backupoperator",
            "db_datareader",
            "db_datawriter",
            "db_denydatareader",
            "db_denydatawriter",
          ];
          const systemSchemasList = systemSchemas.map((s) => `'${s}'`).join(", ");
          
          const result = await pool
            .request()
            .query(
              `SELECT name FROM sys.schemas WHERE name NOT IN (${systemSchemasList}) ORDER BY name`
            );
          schemas = result.recordset.map((row) => row.name);
          await pool.close();
        } catch (err) {
          return res.status(400).json({
            success: false,
            error: `Failed to discover schemas: ${err.message}`,
          });
        }
        break;
      }

      case "MongoDB": {
        try {
          const { MongoClient } = await import("mongodb").catch(() => ({
            MongoClient: null,
          }));
          if (!MongoClient) {
            return res.status(400).json({
              success: false,
              error:
                "MongoDB driver (mongodb) is not installed. Please install it with: npm install mongodb",
            });
          }

          const client = new MongoClient(connection_string, {
            serverSelectionTimeoutMS: 5000,
          });
          await client.connect();
          const adminDb = client.db().admin();
          const databases = await adminDb.listDatabases();
          schemas = databases.databases
            .map((db) => db.name)
            .filter((name) => !["admin", "local", "config"].includes(name))
            .sort();
          await client.close();
        } catch (err) {
          return res.status(400).json({
            success: false,
            error: `Failed to discover schemas: ${err.message}`,
          });
        }
        break;
      }

      case "Oracle": {
        try {
          const oracledb = await import("oracledb").catch(() => null);
          if (!oracledb) {
            return res.status(400).json({
              success: false,
              error:
                "Oracle driver (oracledb) is not installed. Please install it with: npm install oracledb",
            });
          }

          const connStr = connection_string;
          const params = {};
          connStr.split(";").forEach((param) => {
            const [key, value] = param.split("=");
            if (key && value) {
              params[key.trim().toLowerCase()] = value.trim();
            }
          });

          const connection = await oracledb.getConnection({
            user: params.user || "",
            password: params.password || "",
            connectString: `${params.host || "localhost"}:${
              params.port || 1521
            }/${params.db || params.database || ""}`,
            connectionTimeout: 5000,
          });

          const result = await connection.execute(
            "SELECT username FROM all_users WHERE username NOT IN ('SYS', 'SYSTEM', 'SYSAUX') ORDER BY username"
          );
          schemas = result.rows.map((row) => row[0]);
          await connection.close();
        } catch (err) {
          return res.status(400).json({
            success: false,
            error: `Failed to discover schemas: ${err.message}`,
          });
        }
        break;
      }

      default:
        return res.status(400).json({
          success: false,
          error: `Unsupported database engine: ${db_engine}`,
        });
    }

    res.json({
      success: true,
      schemas: schemas,
    });
  } catch (err) {
    console.error("Error discovering schemas:", err);
    res.status(500).json({
      success: false,
      error: sanitizeError(
        err,
        "Error discovering schemas",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});

app.post("/api/discover-tables", requireAuth, async (req, res) => {
  const { db_engine, connection_string, schema_name } = req.body;

  if (!db_engine || !connection_string || !schema_name) {
    return res.status(400).json({
      success: false,
      error:
        "Missing required fields: db_engine, connection_string, and schema_name",
    });
  }

  const validEngine = validateEnum(
    db_engine,
    ["PostgreSQL", "MariaDB", "MSSQL", "MongoDB", "Oracle"],
    null
  );

  if (!validEngine) {
    return res.status(400).json({
      success: false,
      error:
        "Invalid db_engine. Must be one of: PostgreSQL, MariaDB, MSSQL, MongoDB, Oracle, DB2",
    });
  }

  try {
    let tables = [];

    switch (db_engine) {
      case "PostgreSQL": {
        try {
          let config;
          if (
            connection_string.includes("postgresql://") ||
            connection_string.includes("postgres://")
          ) {
            config = {
              connectionString: connection_string,
              connectionTimeoutMillis: 5000,
            };
          } else {
            const params = {};
            const parts = connection_string.split(";");
            for (const part of parts) {
              const [key, value] = part.split("=").map((s) => s.trim());
              if (key && value) {
                switch (key.toLowerCase()) {
                  case "host":
                  case "hostname":
                    params.host = value;
                    break;
                  case "user":
                  case "username":
                    params.user = value;
                    break;
                  case "password":
                    params.password = value;
                    break;
                  case "db":
                  case "database":
                    params.database = value;
                    break;
                  case "port":
                    params.port = parseInt(value, 10);
                    break;
                }
              }
            }
            config = {
              ...params,
              connectionTimeoutMillis: 5000,
            };
          }

          const testPool = new Pool(config);
          // Excluir schemas del sistema de PostgreSQL
          const systemSchemas = [
            "information_schema",
            "pg_catalog",
            "pg_toast",
            "pg_temp_1",
            "pg_toast_temp_1",
          ];
          const schemaLower = schema_name.toLowerCase();

          if (systemSchemas.includes(schemaLower)) {
            tables = [];
          } else {
            // Filtrar tablas del sistema: excluir tablas que empiecen con pg_ y schemas del sistema
            const systemSchemasList = systemSchemas
              .map((s) => `'${s}'`)
              .join(", ");
            const result = await testPool.query(
              `SELECT table_name 
               FROM information_schema.tables 
               WHERE table_schema = $1 
               AND table_type = 'BASE TABLE'
               AND table_schema NOT IN (${systemSchemasList})
               AND table_name NOT LIKE 'pg_%'
               AND table_name NOT LIKE 'pg_toast%'
               AND table_name NOT LIKE 'pg_temp%'
               ORDER BY table_name`,
              [schema_name]
            );
            tables = result.rows.map((row) => row.table_name);
          }
          await testPool.end();
        } catch (err) {
          return res.status(400).json({
            success: false,
            error: `Failed to discover tables: ${err.message}`,
          });
        }
        break;
      }

      case "MariaDB": {
        try {
          const mysql = await import("mysql2/promise").catch(() => null);
          if (!mysql) {
            return res.status(400).json({
              success: false,
              error:
                "MariaDB driver (mysql2) is not installed. Please install it with: npm install mysql2",
            });
          }

          const connStr = connection_string;
          const params = {};
          connStr.split(";").forEach((param) => {
            const [key, value] = param.split("=");
            if (key && value) {
              params[key.trim().toLowerCase()] = value.trim();
            }
          });

          const connection = await mysql.createConnection({
            host: params.host || "localhost",
            port: params.port ? parseInt(params.port) : 3306,
            user: params.user || "root",
            password: params.password || "",
            database: schema_name,
            connectTimeout: 5000,
          });

          // Excluir tablas del sistema de MariaDB/MySQL
          const systemTables = [
            "information_schema",
            "mysql",
            "performance_schema",
            "sys",
          ];
          const [rows] = await connection.query(
            `SELECT TABLE_NAME FROM information_schema.TABLES 
             WHERE TABLE_SCHEMA = ? 
             AND TABLE_TYPE = 'BASE TABLE'
             AND TABLE_SCHEMA NOT IN (${systemTables.map(() => "?").join(", ")})
             ORDER BY TABLE_NAME`,
            [schema_name, ...systemTables]
          );
          tables = rows.map((row) => row.TABLE_NAME).sort();
          await connection.end();
        } catch (err) {
          return res.status(400).json({
            success: false,
            error: `Failed to discover tables: ${err.message}`,
          });
        }
        break;
      }

      case "MSSQL": {
        try {
          const mssqlModule = await import("mssql").catch(() => null);
          if (!mssqlModule) {
            return res.status(400).json({
              success: false,
              error:
                "MSSQL driver (mssql) is not installed. Please install it with: npm install mssql",
            });
          }

          const sql = mssqlModule.default || mssqlModule;
          const ConnectionPool = sql.ConnectionPool || sql;

          const connStr = connection_string;
          const config = {
            options: {
              encrypt: false,
              trustServerCertificate: true,
              connectTimeout: 5000,
            },
          };

          const parts = connStr.split(";");
          parts.forEach((part) => {
            const [key, value] = part.split("=");
            if (key && value) {
              const k = key.trim().toUpperCase();
              if (k === "SERVER") {
                const [host, port] = value.split(",");
                config.server = host.trim();
                if (port) config.port = parseInt(port.trim());
              } else if (k === "DATABASE") {
                config.database = value.trim();
              } else if (k === "UID") {
                config.user = value.trim();
              } else if (k === "PWD") {
                config.password = value.trim();
              }
            }
          });

          if (!config.database) {
            return res.status(400).json({
              success: false,
              error: "Database name is required in connection string for MSSQL",
            });
          }

          const pool = new ConnectionPool(config);
          await pool.connect();
          
          const systemSchemas = [
            "INFORMATION_SCHEMA",
            "sys",
            "guest",
            "db_owner",
            "db_accessadmin",
            "db_securityadmin",
            "db_ddladmin",
            "db_backupoperator",
            "db_datareader",
            "db_datawriter",
            "db_denydatareader",
            "db_denydatawriter",
          ];
          const schemaFilter = systemSchemas.map((s) => `'${s}'`).join(", ");
          const escapedSchemaName = schema_name.replace(/'/g, "''");
          const result = await pool.request().query(
            `SELECT t.name AS TABLE_NAME 
               FROM sys.tables t 
               INNER JOIN sys.schemas s ON t.schema_id = s.schema_id 
               WHERE s.name = '${escapedSchemaName}' 
               AND s.name NOT IN (${schemaFilter}) 
               AND t.type = 'U' 
               ORDER BY t.name`
          );
          tables = result.recordset.map((row) => row.TABLE_NAME);
          await pool.close();
        } catch (err) {
          return res.status(400).json({
            success: false,
            error: `Failed to discover tables: ${err.message}`,
          });
        }
        break;
      }

      case "MongoDB": {
        try {
          const { MongoClient } = await import("mongodb").catch(() => ({
            MongoClient: null,
          }));
          if (!MongoClient) {
            return res.status(400).json({
              success: false,
              error:
                "MongoDB driver (mongodb) is not installed. Please install it with: npm install mongodb",
            });
          }

          const client = new MongoClient(connection_string, {
            serverSelectionTimeoutMS: 5000,
          });
          await client.connect();
          const db = client.db(schema_name);
          const collections = await db.listCollections().toArray();
          tables = collections.map((col) => col.name).sort();
          await client.close();
        } catch (err) {
          return res.status(400).json({
            success: false,
            error: `Failed to discover tables: ${err.message}`,
          });
        }
        break;
      }

      case "Oracle": {
        try {
          const oracledb = await import("oracledb").catch(() => null);
          if (!oracledb) {
            return res.status(400).json({
              success: false,
              error:
                "Oracle driver (oracledb) is not installed. Please install it with: npm install oracledb",
            });
          }

          const connStr = connection_string;
          const params = {};
          connStr.split(";").forEach((param) => {
            const [key, value] = param.split("=");
            if (key && value) {
              params[key.trim().toLowerCase()] = value.trim();
            }
          });

          const connection = await oracledb.getConnection({
            user: params.user || "",
            password: params.password || "",
            connectString: `${params.host || "localhost"}:${
              params.port || 1521
            }/${params.db || params.database || ""}`,
            connectionTimeout: 5000,
          });

          // Excluir schemas del sistema de Oracle
          const systemSchemas = [
            "SYS",
            "SYSTEM",
            "SYSAUX",
            "OUTLN",
            "DBSNMP",
            "CTXSYS",
            "XDB",
            "WMSYS",
            "MDSYS",
            "OLAPSYS",
            "ORDSYS",
            "ORDPLUGINS",
            "SI_INFORMTN_SCHEMA",
            "FLOWS_FILES",
            "APEX_030200",
            "APEX_PUBLIC_USER",
          ];
          const schemaUpper = schema_name.toUpperCase();

          if (systemSchemas.includes(schemaUpper)) {
            tables = [];
          } else {
            const schemaList = systemSchemas.map((s) => `'${s}'`).join(", ");
            const result = await connection.execute(
              `SELECT table_name FROM all_tables 
               WHERE owner = :owner 
               AND owner NOT IN (${schemaList})
               ORDER BY table_name`,
              { owner: schemaUpper }
            );
            tables = result.rows.map((row) => row[0]);
          }
          await connection.close();
        } catch (err) {
          return res.status(400).json({
            success: false,
            error: `Failed to discover tables: ${err.message}`,
          });
        }
        break;
      }

      default:
        return res.status(400).json({
          success: false,
          error: `Unsupported database engine: ${db_engine}`,
        });
    }

    res.json({
      success: true,
      tables: tables,
    });
  } catch (err) {
    console.error("Error discovering tables:", err);
    res.status(500).json({
      success: false,
      error: sanitizeError(
        err,
        "Error discovering tables",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});

app.post("/api/discover-columns", requireAuth, async (req, res) => {
  const { db_engine, connection_string, schema_name, table_name } = req.body;

  if (!db_engine || !connection_string || !schema_name || !table_name) {
    return res.status(400).json({
      success: false,
      error:
        "Missing required fields: db_engine, connection_string, schema_name, and table_name",
    });
  }

  const validEngine = validateEnum(
    db_engine,
    ["PostgreSQL", "MariaDB", "MSSQL", "MongoDB", "Oracle"],
    null
  );

  if (!validEngine) {
    return res.status(400).json({
      success: false,
      error:
        "Invalid db_engine. Must be one of: PostgreSQL, MariaDB, MSSQL, MongoDB, Oracle, DB2",
    });
  }

  try {
    let columns = [];

    switch (db_engine) {
      case "PostgreSQL": {
        try {
          let config;
          if (
            connection_string.includes("postgresql://") ||
            connection_string.includes("postgres://")
          ) {
            config = {
              connectionString: connection_string,
              connectionTimeoutMillis: 5000,
            };
          } else {
            const params = {};
            const parts = connection_string.split(";");
            for (const part of parts) {
              const [key, value] = part.split("=").map((s) => s.trim());
              if (key && value) {
                switch (key.toLowerCase()) {
                  case "host":
                  case "hostname":
                    params.host = value;
                    break;
                  case "user":
                  case "username":
                    params.user = value;
                    break;
                  case "password":
                    params.password = value;
                    break;
                  case "db":
                  case "database":
                    params.database = value;
                    break;
                  case "port":
                    params.port = parseInt(value, 10);
                    break;
                }
              }
            }
            config = {
              ...params,
              connectionTimeoutMillis: 5000,
            };
          }

          const { Pool } = pkg;
          const testPool = new Pool(config);
          const result = await testPool.query(
            `SELECT 
              column_name,
              data_type,
              character_maximum_length,
              is_nullable,
              column_default,
              ordinal_position
            FROM information_schema.columns
            WHERE table_schema = $1 AND table_name = $2
            ORDER BY ordinal_position`,
            [schema_name, table_name]
          );
          columns = result.rows.map((row) => ({
            name: row.column_name,
            type:
              row.data_type +
              (row.character_maximum_length
                ? `(${row.character_maximum_length})`
                : ""),
            nullable: row.is_nullable === "YES",
            default: row.column_default,
            position: row.ordinal_position,
          }));
          await testPool.end();
        } catch (err) {
          return res.status(400).json({
            success: false,
            error: `Failed to discover columns: ${err.message}`,
          });
        }
        break;
      }

      case "MariaDB": {
        try {
          const mysql = await import("mysql2/promise").catch(() => null);
          if (!mysql) {
            return res.status(400).json({
              success: false,
              error:
                "MariaDB driver (mysql2) is not installed. Please install it with: npm install mysql2",
            });
          }

          const params = {};
          const parts = connection_string.split(";");
          for (const part of parts) {
            const [key, value] = part.split("=").map((s) => s.trim());
            if (key && value) {
              switch (key.toLowerCase()) {
                case "host":
                case "hostname":
                  params.host = value;
                  break;
                case "user":
                case "username":
                  params.user = value;
                  break;
                case "password":
                  params.password = value;
                  break;
                case "db":
                case "database":
                  params.database = value;
                  break;
                case "port":
                  params.port = parseInt(value, 10);
                  break;
              }
            }
          }

          const connection = await mysql.createConnection({
            host: params.host || "localhost",
            port: params.port || 3306,
            user: params.user || "",
            password: params.password || "",
            database: params.database || "",
            connectTimeout: 5000,
          });

          const [rows] = await connection.execute(
            `SELECT 
              COLUMN_NAME,
              DATA_TYPE,
              CHARACTER_MAXIMUM_LENGTH,
              IS_NULLABLE,
              COLUMN_DEFAULT,
              ORDINAL_POSITION
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
            ORDER BY ORDINAL_POSITION`,
            [schema_name, table_name]
          );

          columns = rows.map((row) => ({
            name: row.COLUMN_NAME,
            type:
              row.DATA_TYPE +
              (row.CHARACTER_MAXIMUM_LENGTH
                ? `(${row.CHARACTER_MAXIMUM_LENGTH})`
                : ""),
            nullable: row.IS_NULLABLE === "YES",
            default: row.COLUMN_DEFAULT,
            position: row.ORDINAL_POSITION,
          }));

          await connection.end();
        } catch (err) {
          return res.status(400).json({
            success: false,
            error: `Failed to discover columns: ${err.message}`,
          });
        }
        break;
      }

      case "MSSQL": {
        try {
          const sql = await import("mssql").catch(() => null);
          if (!sql) {
            return res.status(400).json({
              success: false,
              error:
                "MSSQL driver (mssql) is not installed. Please install it with: npm install mssql",
            });
          }

          const pool = await sql.connect(connection_string);
          const result = await pool
            .request()
            .input("schema", sql.NVarChar, schema_name)
            .input("table", sql.NVarChar, table_name).query(`
              SELECT 
                COLUMN_NAME,
                DATA_TYPE,
                CHARACTER_MAXIMUM_LENGTH,
                IS_NULLABLE,
                COLUMN_DEFAULT,
                ORDINAL_POSITION
              FROM INFORMATION_SCHEMA.COLUMNS
              WHERE TABLE_SCHEMA = @schema AND TABLE_NAME = @table
              ORDER BY ORDINAL_POSITION
            `);

          columns = result.recordset.map((row) => ({
            name: row.COLUMN_NAME,
            type:
              row.DATA_TYPE +
              (row.CHARACTER_MAXIMUM_LENGTH
                ? `(${row.CHARACTER_MAXIMUM_LENGTH})`
                : ""),
            nullable: row.IS_NULLABLE === "YES",
            default: row.COLUMN_DEFAULT,
            position: row.ORDINAL_POSITION,
          }));

          await pool.close();
        } catch (err) {
          return res.status(400).json({
            success: false,
            error: `Failed to discover columns: ${err.message}`,
          });
        }
        break;
      }

      case "Oracle": {
        try {
          const oracledb = await import("oracledb").catch(() => null);
          if (!oracledb) {
            return res.status(400).json({
              success: false,
              error:
                "Oracle driver (oracledb) is not installed. Please install it with: npm install oracledb",
            });
          }

          const connStr = connection_string;
          const params = {};
          connStr.split(";").forEach((param) => {
            const [key, value] = param.split("=");
            if (key && value) {
              params[key.trim().toLowerCase()] = value.trim();
            }
          });

          const connection = await oracledb.getConnection({
            user: params.user || "",
            password: params.password || "",
            connectString: `${params.host || "localhost"}:${
              params.port || 1521
            }/${params.db || params.database || ""}`,
            connectionTimeout: 5000,
          });

          const result = await connection.execute(
            `SELECT 
              COLUMN_NAME,
              DATA_TYPE,
              DATA_LENGTH,
              NULLABLE,
              DATA_DEFAULT,
              COLUMN_ID
            FROM ALL_TAB_COLUMNS
            WHERE OWNER = :owner AND TABLE_NAME = :table
            ORDER BY COLUMN_ID`,
            {
              owner: schema_name.toUpperCase(),
              table: table_name.toUpperCase(),
            }
          );

          columns = result.rows.map((row) => ({
            name: row[0],
            type: row[1] + (row[2] ? `(${row[2]})` : ""),
            nullable: row[3] === "Y",
            default: row[4],
            position: row[5],
          }));

          await connection.close();
        } catch (err) {
          return res.status(400).json({
            success: false,
            error: `Failed to discover columns: ${err.message}`,
          });
        }
        break;
      }

      case "MongoDB": {
        try {
          const { MongoClient } = await import("mongodb");
          const client = new MongoClient(connection_string, {
            serverSelectionTimeoutMS: 5000,
          });
          await client.connect();
          const db = client.db(schema_name);
          const collection = db.collection(table_name);
          const sample = await collection.findOne({});
          if (sample) {
            columns = Object.keys(sample).map((key, index) => ({
              name: key,
              type:
                typeof sample[key] === "object" ? "object" : typeof sample[key],
              nullable: true,
              default: null,
              position: index + 1,
            }));
          }
          await client.close();
        } catch (err) {
          return res.status(400).json({
            success: false,
            error: `Failed to discover columns: ${err.message}`,
          });
        }
        break;
      }

      default:
        return res.status(400).json({
          success: false,
          error: `Unsupported database engine: ${db_engine}`,
        });
    }

    res.json({
      success: true,
      columns: columns,
    });
  } catch (err) {
    console.error("Error discovering columns:", err);
    res.status(500).json({
      success: false,
      error: sanitizeError(
        err,
        "Error discovering columns",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});

app.get("/api/custom-jobs/scripts", async (req, res) => {
  try {
    const scriptsPath1 = path.join(process.cwd(), "..", "..", "scripts");
    const scriptsPath2 = path.join(process.cwd(), "..", "scripts");
    const scriptsPath = fs.existsSync(scriptsPath1)
      ? scriptsPath1
      : scriptsPath2;
    if (!fs.existsSync(scriptsPath)) {
      return res.json([]);
    }
    const files = fs.readdirSync(scriptsPath);
    const scripts = files
      .filter((file) => file.endsWith(".py"))
      .map((file) => {
        const filePath = path.join(scriptsPath, file);
        const content = fs.readFileSync(filePath, "utf8");
        return {
          name: file,
          content: content,
        };
      });
    res.json(scripts);
  } catch (err) {
    console.error("Error reading Python scripts:", err);
    const safeError = sanitizeError(
      err,
      "Error al leer scripts de Python",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.post("/api/custom-jobs/preview-query", requireAuth, async (req, res) => {
  try {
    const { db_engine, connection_string, query_sql, limit = 100 } = req.body;

    if (!db_engine || !connection_string || !query_sql) {
      return res.status(400).json({
        success: false,
        error: "db_engine, connection_string, and query_sql are required",
      });
    }

    let rows = [];
    let columns = [];
    let rowCount = 0;

    switch (db_engine) {
      case "PostgreSQL": {
        const { Pool } = pkg;
        let config;

        if (
          connection_string.includes("postgresql://") ||
          connection_string.includes("postgres://")
        ) {
          config = {
            connectionString: connection_string,
            connectionTimeoutMillis: 10000,
          };
        } else {
          const params = {};
          const parts = connection_string.split(";");
          for (const part of parts) {
            const [key, value] = part.split("=").map((s) => s.trim());
            if (key && value) {
              switch (key.toLowerCase()) {
                case "host":
                case "hostname":
                  params.host = value;
                  break;
                case "user":
                case "username":
                  params.user = value;
                  break;
                case "password":
                  params.password = value;
                  break;
                case "db":
                case "database":
                  params.database = value;
                  break;
                case "port":
                  params.port = parseInt(value, 10);
                  break;
              }
            }
          }
          config = {
            ...params,
            connectionTimeoutMillis: 10000,
          };
        }

        const tempPool = new Pool(config);
        let client;
        try {
          client = await tempPool.connect();
          const limitedQuery = query_sql.trim().endsWith(";")
            ? query_sql.trim().slice(0, -1)
            : query_sql.trim();
          const previewQuery = `SELECT * FROM (${limitedQuery}) AS preview_query LIMIT ${Math.min(
            parseInt(limit, 10) || 100,
            1000
          )}`;
          const result = await client.query(previewQuery);
          rows = result.rows;
          columns =
            result.fields?.map((field) => field.name) ||
            Object.keys(result.rows[0] || {});
          rowCount = result.rowCount || 0;
        } catch (pgErr) {
          console.error("PostgreSQL query error:", pgErr);
          throw new Error(`Query execution failed: ${pgErr.message}`);
        } finally {
          if (client) {
            client.release();
          }
          await tempPool.end();
        }
        break;
      }
      case "MariaDB": {
        const mysql = await import("mysql2/promise").catch(() => null);
        if (!mysql) {
          throw new Error("mysql2 package not available");
        }

        let config;
        if (
          connection_string.includes("mysql://") ||
          connection_string.includes("mariadb://")
        ) {
          const url = new URL(connection_string);
          config = {
            host: url.hostname,
            port: parseInt(url.port) || 3306,
            user: url.username,
            password: url.password,
            database: url.pathname.slice(1),
          };
        } else {
          config = {};
          const parts = connection_string.split(";");
          for (const part of parts) {
            const [key, value] = part.split("=").map((s) => s.trim());
            if (key && value) {
              switch (key.toLowerCase()) {
                case "host":
                case "hostname":
                  config.host = value;
                  break;
                case "user":
                case "username":
                  config.user = value;
                  break;
                case "password":
                  config.password = value;
                  break;
                case "db":
                case "database":
                  config.database = value;
                  break;
                case "port":
                  config.port = parseInt(value, 10);
                  break;
              }
            }
          }
        }

        const connection = await mysql.createConnection(config);
        try {
          const limitedQuery = query_sql.trim().endsWith(";")
            ? query_sql.trim().slice(0, -1)
            : query_sql.trim();
          const previewQuery = `SELECT * FROM (${limitedQuery}) AS preview_query LIMIT ${Math.min(
            parseInt(limit, 10) || 100,
            1000
          )}`;
          const [rowsData] = await connection.execute(previewQuery);
          rows = rowsData;
          if (rows.length > 0) {
            columns = Object.keys(rows[0]);
          }
          rowCount = rows.length;
        } finally {
          await connection.end();
        }
        break;
      }
      case "MSSQL": {
        const sql = await import("mssql").catch(() => null);
        if (!sql) {
          throw new Error("mssql package not available");
        }

        const config = {};
        const parts = connection_string.split(";");
        for (const part of parts) {
          const [key, value] = part.split("=").map((s) => s.trim());
          if (key && value) {
            switch (key.toLowerCase()) {
              case "server":
              case "host":
              case "hostname":
                config.server = value;
                break;
              case "port":
                config.port = parseInt(value, 10);
                break;
              case "database":
              case "db":
                config.database = value;
                break;
              case "user":
              case "username":
                config.user = value;
                break;
              case "password":
                config.password = value;
                break;
            }
          }
        }

        const pool = await sql.connect(config);
        try {
          const limitedQuery = query_sql.trim().endsWith(";")
            ? query_sql.trim().slice(0, -1)
            : query_sql.trim();
          const previewQuery = `SELECT TOP ${Math.min(
            parseInt(limit, 10) || 100,
            1000
          )} * FROM (${limitedQuery}) AS preview_query`;
          const result = await pool.request().query(previewQuery);
          rows = result.recordset;
          if (rows.length > 0) {
            columns = Object.keys(rows[0]);
          }
          rowCount = rows.length;
        } finally {
          await pool.close();
        }
        break;
      }
      case "Oracle": {
        const oracledb = await import("oracledb").catch(() => null);
        if (!oracledb) {
          throw new Error("oracledb package not available");
        }

        const config = {};
        const parts = connection_string.split(";");
        for (const part of parts) {
          const [key, value] = part.split("=").map((s) => s.trim());
          if (key && value) {
            switch (key.toLowerCase()) {
              case "host":
              case "hostname":
                config.host = value;
                break;
              case "port":
                config.port = parseInt(value, 10) || 1521;
                break;
              case "user":
              case "username":
                config.user = value;
                break;
              case "password":
                config.password = value;
                break;
              case "database":
              case "db":
              case "service":
                config.connectString = value;
                break;
            }
          }
        }

        const connection = await oracledb.getConnection(config);
        try {
          const limitedQuery = query_sql.trim().endsWith(";")
            ? query_sql.trim().slice(0, -1)
            : query_sql.trim();
          const previewQuery = `SELECT * FROM (${limitedQuery}) WHERE ROWNUM <= ${Math.min(
            parseInt(limit, 10) || 100,
            1000
          )}`;
          const result = await connection.execute(previewQuery);
          rows = result.rows.map((row) => {
            const obj = {};
            result.metaData.forEach((meta, index) => {
              obj[meta.name] = row[index];
            });
            return obj;
          });
          if (result.metaData) {
            columns = result.metaData.map((meta) => meta.name);
          }
          rowCount = rows.length;
        } finally {
          await connection.close();
        }
        break;
      }
      default:
        return res.status(400).json({
          success: false,
          error: `Unsupported database engine: ${db_engine}`,
        });
    }

    res.json({
      success: true,
      columns: columns,
      rows: rows,
      rowCount: rowCount,
      limit: Math.min(parseInt(limit, 10) || 100, 1000),
    });
  } catch (err) {
    console.error("Error previewing query:", err);
    res.status(500).json({
      success: false,
      error: sanitizeError(
        err,
        "Error al ejecutar preview de query",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});

app.post(
  "/api/custom-jobs",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const job_name = validateIdentifier(req.body.job_name);
      const description = sanitizeSearch(req.body.description, 500);
      const source_db_engine = validateEnum(
        req.body.source_db_engine,
        ["PostgreSQL", "MariaDB", "MSSQL", "MongoDB", "Oracle"],
        null
      );
      const source_connection_string = sanitizeSearch(
        req.body.source_connection_string,
        500
      );
      const query_sql = sanitizeSearch(req.body.query_sql, 10000);
      const target_db_engine = validateEnum(
        req.body.target_db_engine,
        ["PostgreSQL", "MariaDB", "MSSQL", "MongoDB", "Oracle"],
        null
      );
      const target_connection_string = sanitizeSearch(
        req.body.target_connection_string,
        500
      );
      const target_schema = validateIdentifier(req.body.target_schema);
      const target_table = validateIdentifier(req.body.target_table);
      const schedule_cron = sanitizeSearch(req.body.schedule_cron, 100);
      const active = validateBoolean(req.body.active, true);
      const enabled = validateBoolean(req.body.enabled, true);
      const transform_config = req.body.transform_config || {};
      const metadata = req.body.metadata || {};

      if (!job_name) {
        return res.status(400).json({ error: "job_name is required" });
      }
      if (!source_db_engine) {
        return res.status(400).json({ error: "Invalid source_db_engine" });
      }
      if (!target_db_engine) {
        return res.status(400).json({ error: "Invalid target_db_engine" });
      }
      if (!target_schema || !target_table) {
        return res
          .status(400)
          .json({ error: "target_schema and target_table are required" });
      }

      const result = await pool.query(
        `INSERT INTO metadata.custom_jobs 
       (job_name, description, source_db_engine, source_connection_string, 
        query_sql, target_db_engine, target_connection_string, target_schema, 
        target_table, schedule_cron, active, enabled, transform_config, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14::jsonb)
       ON CONFLICT (job_name) 
       DO UPDATE SET 
         description = EXCLUDED.description,
         source_db_engine = EXCLUDED.source_db_engine,
         source_connection_string = EXCLUDED.source_connection_string,
         query_sql = EXCLUDED.query_sql,
         target_db_engine = EXCLUDED.target_db_engine,
         target_connection_string = EXCLUDED.target_connection_string,
         target_schema = EXCLUDED.target_schema,
         target_table = EXCLUDED.target_table,
         schedule_cron = EXCLUDED.schedule_cron,
         active = EXCLUDED.active,
         enabled = EXCLUDED.enabled,
         transform_config = EXCLUDED.transform_config,
         metadata = EXCLUDED.metadata,
         updated_at = NOW()
       RETURNING *`,
        [
          job_name,
          description || null,
          source_db_engine,
          source_connection_string,
          query_sql,
          target_db_engine,
          target_connection_string,
          target_schema,
          target_table,
          schedule_cron || null,
          active !== undefined ? active : true,
          enabled !== undefined ? enabled : true,
          JSON.stringify(transform_config || {}),
          JSON.stringify(metadata || {}),
        ]
      );
      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error creating/updating custom job:", err);
      res.status(500).json({
        error: "Error al crear/actualizar job personalizado",
        error: sanitizeError(
          err,
          "Error en el servidor",
          process.env.NODE_ENV === "production"
        ),
      });
    }
  }
);

app.put(
  "/api/custom-jobs/:jobName",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const jobName = validateIdentifier(req.params.jobName);
      if (!jobName) {
        return res.status(400).json({ error: "Invalid jobName" });
      }

      const jobCheck = await pool.query(
        "SELECT job_name FROM metadata.custom_jobs WHERE job_name = $1",
        [jobName]
      );

      if (jobCheck.rows.length === 0) {
        return res.status(404).json({
          error: "Job not found",
          job_name: jobName,
        });
      }

      const description = sanitizeSearch(req.body.description, 500);
      const source_db_engine = validateEnum(
        req.body.source_db_engine,
        ["PostgreSQL", "MariaDB", "MSSQL", "MongoDB", "Oracle", "Python"],
        null
      );
      const source_connection_string = sanitizeSearch(
        req.body.source_connection_string,
        500
      );
      const query_sql = sanitizeSearch(req.body.query_sql, 10000);
      const target_db_engine = validateEnum(
        req.body.target_db_engine,
        ["PostgreSQL", "MariaDB", "MSSQL", "MongoDB", "Oracle"],
        null
      );
      const target_connection_string = sanitizeSearch(
        req.body.target_connection_string,
        500
      );
      const target_schema = validateIdentifier(req.body.target_schema);
      const target_table = validateIdentifier(req.body.target_table);
      const schedule_cron = sanitizeSearch(req.body.schedule_cron, 100);
      const active = validateBoolean(req.body.active, true);
      const enabled = validateBoolean(req.body.enabled, true);
      const transform_config = req.body.transform_config || {};
      const metadata = req.body.metadata || {};

      if (!source_db_engine) {
        return res.status(400).json({ error: "Invalid source_db_engine" });
      }
      if (!target_db_engine) {
        return res.status(400).json({ error: "Invalid target_db_engine" });
      }
      if (!target_schema || !target_table) {
        return res
          .status(400)
          .json({ error: "target_schema and target_table are required" });
      }

      const result = await pool.query(
        `UPDATE metadata.custom_jobs 
       SET 
         description = $1,
         source_db_engine = $2,
         source_connection_string = $3,
         query_sql = $4,
         target_db_engine = $5,
         target_connection_string = $6,
         target_schema = $7,
         target_table = $8,
         schedule_cron = $9,
         active = $10,
         enabled = $11,
         transform_config = $12::jsonb,
         metadata = $13::jsonb,
         updated_at = NOW()
       WHERE job_name = $14
       RETURNING *`,
        [
          description || null,
          source_db_engine,
          source_connection_string,
          query_sql,
          target_db_engine,
          target_connection_string,
          target_schema,
          target_table,
          schedule_cron || null,
          active !== undefined ? active : true,
          enabled !== undefined ? enabled : true,
          JSON.stringify(transform_config || {}),
          JSON.stringify(metadata || {}),
          jobName,
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: "Job not found",
          job_name: jobName,
        });
      }

      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error updating custom job:", err);
      res.status(500).json({
        error: "Error al actualizar job personalizado",
        details: sanitizeError(
          err,
          "Error en el servidor",
          process.env.NODE_ENV === "production"
        ),
      });
    }
  }
);

app.get("/api/custom-jobs", async (req, res) => {
  try {
    const page = validatePage(req.query.page, 1);
    const limit = validateLimit(req.query.limit, 1, 100);
    const offset = (page - 1) * limit;
    const source_db_engine = validateEnum(
      req.query.source_db_engine,
      ["PostgreSQL", "MariaDB", "MSSQL", "MongoDB", "Oracle", "Python", ""],
      ""
    );
    const target_db_engine = validateEnum(
      req.query.target_db_engine,
      ["PostgreSQL", "MariaDB", "MSSQL", "MongoDB", "Oracle", "Python", ""],
      ""
    );
    const active =
      req.query.active !== undefined ? validateBoolean(req.query.active) : "";
    const enabled =
      req.query.enabled !== undefined ? validateBoolean(req.query.enabled) : "";
    const search = sanitizeSearch(req.query.search, 100);

    let whereConditions = [];
    let queryParams = [];
    let paramCount = 1;

    if (source_db_engine) {
      whereConditions.push(`source_db_engine = $${paramCount}`);
      queryParams.push(source_db_engine);
      paramCount++;
    }
    if (target_db_engine) {
      whereConditions.push(`target_db_engine = $${paramCount}`);
      queryParams.push(target_db_engine);
      paramCount++;
    }
    if (active !== "") {
      whereConditions.push(`active = $${paramCount}`);
      queryParams.push(active === "true");
      paramCount++;
    }
    if (enabled !== "") {
      whereConditions.push(`enabled = $${paramCount}`);
      queryParams.push(enabled === "true");
      paramCount++;
    }
    if (search) {
      whereConditions.push(
        `(job_name ILIKE $${paramCount} OR description ILIKE $${paramCount} OR target_schema ILIKE $${paramCount} OR target_table ILIKE $${paramCount})`
      );
      queryParams.push(`%${search}%`);
      paramCount++;
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    const countQuery = `SELECT COUNT(*) FROM metadata.custom_jobs ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    const dataQuery = `
      SELECT *
      FROM metadata.custom_jobs
      ${whereClause}
      ORDER BY job_name
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    queryParams.push(limit, offset);

    const result = await pool.query(dataQuery, queryParams);

    const totalPages = Math.ceil(total / limit);

    res.json({
      data: result.rows,
      pagination: {
        total,
        totalPages,
        currentPage: parseInt(page),
        limit: parseInt(limit),
      },
    });
  } catch (err) {
    console.error("Error fetching custom jobs:", err);
    res.status(500).json({
      error: "Error al obtener jobs personalizados",
      error: sanitizeError(
        err,
        "Error en el servidor",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});

app.post("/api/custom-jobs/:jobName/execute", async (req, res) => {
  try {
    const jobName = validateIdentifier(req.params.jobName);
    if (!jobName) {
      return res.status(400).json({ error: "Invalid jobName" });
    }

    const jobCheck = await pool.query(
      "SELECT job_name, active, enabled FROM metadata.custom_jobs WHERE job_name = $1",
      [jobName]
    );

    if (jobCheck.rows.length === 0) {
      return res.status(404).json({
        error: "Job not found",
        job_name: jobName,
      });
    }

    const job = jobCheck.rows[0];
    if (!job.active || !job.enabled) {
      return res.status(400).json({
        error: "Job is not active or enabled",
        job_name: jobName,
        active: job.active,
        enabled: job.enabled,
      });
    }

    const executeMetadata = {
      execute_now: true,
      execute_timestamp: new Date().toISOString(),
    };

    await pool.query(
      `UPDATE metadata.custom_jobs 
       SET metadata = COALESCE(metadata, '{}'::jsonb) || $1::jsonb
       WHERE job_name = $2`,
      [JSON.stringify(executeMetadata), jobName]
    );

    const processLogId = await pool.query(
      `INSERT INTO metadata.process_log 
       (process_type, process_name, status, start_time, end_time, total_rows_processed, error_message, metadata)
       VALUES ($1, $2, $3, NOW(), NOW(), 0, '', $4::jsonb)
       RETURNING id`,
      [
        "CUSTOM_JOB",
        jobName,
        "PENDING",
        JSON.stringify({ triggered_by: "api", job_name: jobName }),
      ]
    );

    res.json({
      message: "Job execution queued. DataSync will execute it shortly.",
      job_name: jobName,
      process_log_id: processLogId.rows[0].id,
    });
  } catch (err) {
    console.error("Error executing custom job:", err);
    const safeError = sanitizeError(
      err,
      "Error al ejecutar job personalizado",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/custom-jobs/:jobName/results", async (req, res) => {
  try {
    const jobName = validateIdentifier(req.params.jobName);
    if (!jobName) {
      return res.status(400).json({ error: "Invalid jobName" });
    }
    const result = await pool.query(
      `SELECT * FROM metadata.job_results 
       WHERE job_name = $1 
       ORDER BY created_at DESC 
       LIMIT 10`,
      [jobName]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching job results:", err);
    res.status(500).json({
      error: "Error al obtener resultados del job",
      error: sanitizeError(
        err,
        "Error en el servidor",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});

app.get("/api/custom-jobs/:jobName/history", async (req, res) => {
  try {
    const jobName = validateIdentifier(req.params.jobName);
    if (!jobName) {
      return res.status(400).json({ error: "Invalid jobName" });
    }
    const limit = validateLimit(req.query.limit, 1, 100, 50);
    const result = await pool.query(
      `SELECT 
        id, process_type, process_name, status, start_time, end_time,
        COALESCE(duration_seconds, EXTRACT(EPOCH FROM (end_time - start_time))::integer) as duration_seconds,
        total_rows_processed, error_message, metadata, created_at
       FROM metadata.process_log 
       WHERE process_type = 'CUSTOM_JOB' AND process_name = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [jobName, limit]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching job history:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener historial del job",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/custom-jobs/:jobName/table-structure", async (req, res) => {
  try {
    const jobName = validateIdentifier(req.params.jobName);
    if (!jobName) {
      return res.status(400).json({ error: "Invalid jobName" });
    }

    const jobResult = await pool.query(
      `SELECT target_db_engine, target_connection_string, target_schema, target_table 
       FROM metadata.custom_jobs 
       WHERE job_name = $1`,
      [jobName]
    );

    if (jobResult.rows.length === 0) {
      return res.status(404).json({ error: "Job not found" });
    }

    const {
      target_db_engine,
      target_connection_string,
      target_schema,
      target_table,
    } = jobResult.rows[0];

    if (
      !target_db_engine ||
      !target_connection_string ||
      !target_schema ||
      !target_table
    ) {
      return res.status(400).json({
        error:
          "Job configuration incomplete. Missing target database information.",
      });
    }

    let columns = [];

    switch (target_db_engine) {
      case "PostgreSQL": {
        const { Pool } = pkg;
        let config;

        if (
          target_connection_string.includes("postgresql://") ||
          target_connection_string.includes("postgres://")
        ) {
          config = {
            connectionString: target_connection_string,
            connectionTimeoutMillis: 10000,
          };
        } else {
          const params = {};
          const parts = target_connection_string.split(";");
          for (const part of parts) {
            const [key, value] = part.split("=").map((s) => s.trim());
            if (key && value) {
              switch (key.toLowerCase()) {
                case "host":
                case "hostname":
                  params.host = value;
                  break;
                case "user":
                case "username":
                  params.user = value;
                  break;
                case "password":
                  params.password = value;
                  break;
                case "db":
                case "database":
                  params.database = value;
                  break;
                case "port":
                  params.port = parseInt(value, 10);
                  break;
              }
            }
          }
          config = {
            ...params,
            connectionTimeoutMillis: 10000,
          };
        }

        const tempPool = new Pool(config);
        let client;
        try {
          client = await tempPool.connect();
          const result = await client.query(
            `
                   SELECT 
                     column_name,
                     data_type,
                     character_maximum_length,
                     is_nullable,
                     column_default
                   FROM information_schema.columns
                   WHERE table_schema = $1 AND table_name = $2
                   ORDER BY ordinal_position
                 `,
            [target_schema, target_table]
          );
          columns = result.rows.map((row) => ({
            name: row.column_name,
            type:
              row.data_type +
              (row.character_maximum_length
                ? `(${row.character_maximum_length})`
                : ""),
            nullable: row.is_nullable === "YES",
            default: row.column_default,
          }));
        } catch (pgErr) {
          console.error("PostgreSQL query error:", pgErr);
          throw new Error(`Failed to query table structure: ${pgErr.message}`);
        } finally {
          if (client) {
            client.release();
          }
          await tempPool.end();
        }
        break;
      }
      case "MariaDB": {
        const mysql = await import("mysql2/promise").catch(() => null);
        if (!mysql) {
          throw new Error("mysql2 package not available");
        }

        let config;
        if (
          target_connection_string.includes("mysql://") ||
          target_connection_string.includes("mariadb://")
        ) {
          const url = new URL(target_connection_string);
          config = {
            host: url.hostname,
            port: parseInt(url.port) || 3306,
            user: url.username,
            password: url.password,
            database: url.pathname.slice(1),
          };
        } else {
          config = {};
          const parts = target_connection_string.split(";");
          for (const part of parts) {
            const [key, value] = part.split("=").map((s) => s.trim());
            if (key && value) {
              switch (key.toLowerCase()) {
                case "host":
                case "hostname":
                  config.host = value;
                  break;
                case "user":
                case "username":
                  config.user = value;
                  break;
                case "password":
                  config.password = value;
                  break;
                case "db":
                case "database":
                  config.database = value;
                  break;
                case "port":
                  config.port = parseInt(value, 10);
                  break;
              }
            }
          }
        }

        const connection = await mysql.createConnection(config);
        try {
          const [rows] = await connection.execute(
            `SELECT 
                   COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE, COLUMN_DEFAULT, ORDINAL_POSITION
                 FROM INFORMATION_SCHEMA.COLUMNS
                 WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
                 ORDER BY ORDINAL_POSITION`,
            [target_schema, target_table]
          );
          columns = rows.map((row) => ({
            name: row.COLUMN_NAME,
            type:
              row.DATA_TYPE +
              (row.CHARACTER_MAXIMUM_LENGTH
                ? `(${row.CHARACTER_MAXIMUM_LENGTH})`
                : ""),
            nullable: row.IS_NULLABLE === "YES",
            default: row.COLUMN_DEFAULT,
          }));
        } finally {
          await connection.end();
        }
        break;
      }
      case "MSSQL": {
        const sql = await import("mssql").catch(() => null);
        if (!sql) {
          throw new Error("mssql package not available");
        }

        const config = {};
        const parts = target_connection_string.split(";");
        for (const part of parts) {
          const [key, value] = part.split("=").map((s) => s.trim());
          if (key && value) {
            switch (key.toLowerCase()) {
              case "server":
              case "host":
              case "hostname":
                config.server = value;
                break;
              case "port":
                config.port = parseInt(value, 10);
                break;
              case "database":
              case "db":
                config.database = value;
                break;
              case "user":
              case "username":
                config.user = value;
                break;
              case "password":
                config.password = value;
                break;
            }
          }
        }

        const pool = await sql.connect(config);
        try {
          const result = await pool
            .request()
            .input("schema", sql.NVarChar, target_schema)
            .input("table", sql.NVarChar, target_table).query(`
                   SELECT 
                     COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE, COLUMN_DEFAULT, ORDINAL_POSITION
                   FROM INFORMATION_SCHEMA.COLUMNS
                   WHERE TABLE_SCHEMA = @schema AND TABLE_NAME = @table
                   ORDER BY ORDINAL_POSITION
                 `);
          columns = result.recordset.map((row) => ({
            name: row.COLUMN_NAME,
            type:
              row.DATA_TYPE +
              (row.CHARACTER_MAXIMUM_LENGTH
                ? `(${row.CHARACTER_MAXIMUM_LENGTH})`
                : ""),
            nullable: row.IS_NULLABLE === "YES",
            default: row.COLUMN_DEFAULT,
          }));
        } finally {
          await pool.close();
        }
        break;
      }
      case "Oracle": {
        const oracledb = await import("oracledb").catch(() => null);
        if (!oracledb) {
          throw new Error("oracledb package not available");
        }

        const config = {};
        const parts = target_connection_string.split(";");
        for (const part of parts) {
          const [key, value] = part.split("=").map((s) => s.trim());
          if (key && value) {
            switch (key.toLowerCase()) {
              case "host":
              case "hostname":
                config.host = value;
                break;
              case "port":
                config.port = parseInt(value, 10) || 1521;
                break;
              case "user":
              case "username":
                config.user = value;
                break;
              case "password":
                config.password = value;
                break;
              case "database":
              case "db":
              case "service":
                config.connectString = value;
                break;
            }
          }
        }

        const connection = await oracledb.getConnection(config);
        try {
          const result = await connection.execute(
            `SELECT 
                   COLUMN_NAME, DATA_TYPE, DATA_LENGTH, NULLABLE, DATA_DEFAULT, COLUMN_ID
                 FROM ALL_TAB_COLUMNS
                 WHERE OWNER = :owner AND TABLE_NAME = :table
                 ORDER BY COLUMN_ID`,
            {
              owner: target_schema.toUpperCase(),
              table: target_table.toUpperCase(),
            }
          );
          columns = result.rows.map((row) => ({
            name: row[0],
            type: row[1] + (row[2] ? `(${row[2]})` : ""),
            nullable: row[3] === "Y",
            default: row[4],
          }));
        } finally {
          await connection.close();
        }
        break;
      }
      default:
        return res.status(400).json({
          error: `Unsupported database engine: ${target_db_engine}`,
        });
    }

    res.json({
      db_engine: target_db_engine,
      schema: target_schema,
      table: target_table,
      columns: columns,
    });
  } catch (err) {
    console.error("Error fetching table structure:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener estructura de la tabla",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({
      error: safeError,
      details: process.env.NODE_ENV !== "production" ? err.message : undefined,
    });
  }
});

app.patch(
  "/api/custom-jobs/:jobName/active",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const jobName = validateIdentifier(req.params.jobName);
      if (!jobName) {
        return res.status(400).json({ error: "Invalid jobName" });
      }
      const active = validateBoolean(req.body.active);
      const result = await pool.query(
        `UPDATE metadata.custom_jobs 
       SET active = $1, updated_at = NOW()
       WHERE job_name = $2
       RETURNING *`,
        [active, jobName]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Job not found" });
      }
      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error updating job active status:", err);
      res.status(500).json({
        error: "Error al actualizar estado del job",
        error: sanitizeError(
          err,
          "Error en el servidor",
          process.env.NODE_ENV === "production"
        ),
      });
    }
  }
);

app.delete(
  "/api/custom-jobs/:jobName",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const jobName = validateIdentifier(req.params.jobName);
      if (!jobName) {
        return res.status(400).json({ error: "Invalid jobName" });
      }
      const result = await pool.query(
        `DELETE FROM metadata.custom_jobs 
       WHERE job_name = $1
       RETURNING *`,
        [jobName]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Job not found" });
      }
      res.json({ message: "Job deleted successfully", job: result.rows[0] });
    } catch (err) {
      console.error("Error deleting custom job:", err);
      res.status(500).json({
        error: "Error al eliminar job personalizado",
        error: sanitizeError(
          err,
          "Error en el servidor",
          process.env.NODE_ENV === "production"
        ),
      });
    }
  }
);

app.post(
  "/api/custom-jobs/:jobName/reboot-table",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const jobName = validateIdentifier(req.params.jobName);
      if (!jobName) {
        return res.status(400).json({ error: "Invalid jobName" });
      }

      // Obtener el job para obtener target_schema y target_table
      const jobResult = await pool.query(
        `SELECT target_schema, target_table, target_connection_string, target_db_engine
         FROM metadata.custom_jobs 
         WHERE job_name = $1`,
        [jobName]
      );

      if (jobResult.rows.length === 0) {
        return res.status(404).json({ error: "Job not found" });
      }

      const job = jobResult.rows[0];
      const {
        target_schema,
        target_table,
        target_connection_string,
        target_db_engine,
      } = job;

      if (!target_schema || !target_table || !target_connection_string) {
        return res.status(400).json({
          error:
            "Job missing target configuration (schema, table, or connection)",
        });
      }

      console.log(`Rebooting table for job: ${jobName}`);
      console.log(`Target: ${target_schema}.${target_table}`);
      console.log(`DB Engine: ${target_db_engine}`);

      // Conectar a la base de datos destino
      const targetPool = new Pool({
        connectionString: target_connection_string,
        max: 1,
      });

      try {
        // Hacer DROP TABLE
        // Escapar identificadores con comillas dobles para PostgreSQL
        const schemaName = target_schema.toLowerCase().replace(/"/g, '""');
        const tableName = target_table.toLowerCase().replace(/"/g, '""');
        const quotedSchema = `"${schemaName}"`;
        const quotedTable = `"${tableName}"`;

        const dropQuery = `DROP TABLE IF EXISTS ${quotedSchema}.${quotedTable} CASCADE`;
        console.log(`Executing: ${dropQuery}`);

        await targetPool.query(dropQuery);

        await targetPool.end();

        res.json({
          message: `Table ${quotedSchema}.${quotedTable} dropped successfully. It will be recreated on next job execution.`,
          schema: schemaName,
          table: tableName,
        });
      } catch (dbError) {
        console.error("Database error during table drop:", dbError);
        try {
          await targetPool.end();
        } catch (endError) {
          console.error("Error closing connection pool:", endError);
        }
        throw dbError;
      }
    } catch (err) {
      console.error("Error rebooting table for custom job:", err);
      console.error("Error stack:", err.stack);
      res.status(500).json({
        error: "Error al hacer reboot de la tabla",
        details: sanitizeError(
          err,
          "Error en el servidor",
          process.env.NODE_ENV === "production"
        ),
      });
    }
  }
);

app.get("/api/data-warehouse", async (req, res) => {
  try {
    const page = validatePage(req.query.page, 1);
    const limit = validateLimit(req.query.limit, 1, 100);
    const offset = (page - 1) * limit;
    const schema_type = validateEnum(
      req.query.schema_type,
      ["STAR_SCHEMA", "SNOWFLAKE_SCHEMA", ""],
      ""
    );
    const source_db_engine = validateEnum(
      req.query.source_db_engine,
      ["PostgreSQL", "MariaDB", "MSSQL", "MongoDB", "Oracle", ""],
      ""
    );
    const target_db_engine = validateEnum(
      req.query.target_db_engine,
      ["PostgreSQL", "Snowflake", "BigQuery", "Redshift", ""],
      ""
    );
    const active =
      req.query.active !== undefined ? validateBoolean(req.query.active) : "";
    const enabled =
      req.query.enabled !== undefined ? validateBoolean(req.query.enabled) : "";
    const search = sanitizeSearch(req.query.search, 100);

    let whereConditions = [];
    let queryParams = [];
    let paramCount = 1;

    if (schema_type) {
      whereConditions.push(`schema_type = $${paramCount}`);
      queryParams.push(schema_type);
      paramCount++;
    }
    if (source_db_engine) {
      whereConditions.push(`source_db_engine = $${paramCount}`);
      queryParams.push(source_db_engine);
      paramCount++;
    }
    if (target_db_engine) {
      whereConditions.push(`target_db_engine = $${paramCount}`);
      queryParams.push(target_db_engine);
      paramCount++;
    }
    if (active !== "") {
      whereConditions.push(`active = $${paramCount}`);
      queryParams.push(active === "true");
      paramCount++;
    }
    if (enabled !== "") {
      whereConditions.push(`enabled = $${paramCount}`);
      queryParams.push(enabled === "true");
      paramCount++;
    }
    if (search) {
      whereConditions.push(
        `(warehouse_name ILIKE $${paramCount} OR description ILIKE $${paramCount} OR target_schema ILIKE $${paramCount})`
      );
      queryParams.push(`%${search}%`);
      paramCount++;
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    const countQuery = `SELECT COUNT(*) FROM metadata.data_warehouse_catalog ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    const dataQuery = `
      SELECT *
      FROM metadata.data_warehouse_catalog
      ${whereClause}
      ORDER BY warehouse_name
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    queryParams.push(limit, offset);

    const result = await pool.query(dataQuery, queryParams);

    const warehouses = result.rows.map((row) => ({
      ...row,
      dimensions: row.dimensions || [],
      facts: row.facts || [],
    }));

    const totalPages = Math.ceil(total / limit);

    res.json({
      warehouses,
      pagination: {
        total,
        totalPages,
        currentPage: parseInt(page),
        limit: parseInt(limit),
      },
    });
  } catch (err) {
    console.error("Error fetching data warehouses:", err);
    res.status(500).json({
      error: sanitizeError(
        err,
        "Error fetching data warehouses",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});

app.get("/api/data-warehouse/:warehouseName", async (req, res) => {
  try {
    const warehouseName = validateIdentifier(req.params.warehouseName);
    if (!warehouseName) {
      return res.status(400).json({ error: "Invalid warehouse name" });
    }

    const result = await pool.query(
      "SELECT * FROM metadata.data_warehouse_catalog WHERE warehouse_name = $1",
      [warehouseName]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Warehouse not found" });
    }

    const warehouse = result.rows[0];
    warehouse.dimensions = warehouse.dimensions || [];
    warehouse.facts = warehouse.facts || [];

    res.json(warehouse);
  } catch (err) {
    console.error("Error fetching data warehouse:", err);
    res.status(500).json({
      error: sanitizeError(
        err,
        "Error fetching data warehouse",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});

app.post(
  "/api/data-warehouse",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const warehouse_name = validateIdentifier(req.body.warehouse_name);
      const description = sanitizeSearch(req.body.description, 500);
      const schema_type = validateEnum(
        req.body.schema_type,
        ["STAR_SCHEMA", "SNOWFLAKE_SCHEMA"],
        null
      );
      const source_db_engine = validateEnum(
        req.body.source_db_engine,
        ["PostgreSQL", "MariaDB", "MSSQL", "MongoDB", "Oracle"],
        null
      );
      const source_connection_string = sanitizeSearch(
        req.body.source_connection_string,
        500
      );
      const target_db_engine = validateEnum(
        req.body.target_db_engine,
        ["PostgreSQL", "Snowflake", "BigQuery", "Redshift"],
        null
      );
      const target_connection_string = sanitizeSearch(
        req.body.target_connection_string,
        500
      );
      const target_schema = validateIdentifier(req.body.target_schema);
      const schedule_cron = sanitizeSearch(req.body.schedule_cron, 100);
      const active = validateBoolean(req.body.active, true);
      const enabled = validateBoolean(req.body.enabled, true);
      const dimensions = req.body.dimensions || [];
      const facts = req.body.facts || [];
      const metadata = req.body.metadata || {};

      if (!warehouse_name) {
        return res.status(400).json({ error: "warehouse_name is required" });
      }
      if (!schema_type) {
        return res.status(400).json({ error: "Invalid schema_type" });
      }
      if (!source_db_engine) {
        return res.status(400).json({ error: "Invalid source_db_engine" });
      }
      if (!target_db_engine) {
        return res.status(400).json({ error: "Invalid target_db_engine" });
      }
      if (!target_schema) {
        return res.status(400).json({ error: "target_schema is required" });
      }

      const checkResult = await pool.query(
        `SELECT warehouse_name FROM metadata.data_warehouse_catalog WHERE warehouse_name = $1`,
        [warehouse_name]
      );

      if (checkResult.rows.length > 0) {
        return res.status(409).json({
          error: "Warehouse with this name already exists",
        });
      }

      const result = await pool.query(
        `INSERT INTO metadata.data_warehouse_catalog 
       (warehouse_name, description, schema_type, source_db_engine, source_connection_string,
        target_db_engine, target_connection_string, target_schema, dimensions, facts,
        schedule_cron, active, enabled, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, $11, $12, $13, $14::jsonb)
       RETURNING *`,
        [
          warehouse_name,
          description || null,
          schema_type,
          source_db_engine,
          source_connection_string,
          target_db_engine,
          target_connection_string,
          target_schema.toLowerCase(),
          JSON.stringify(dimensions),
          JSON.stringify(facts),
          schedule_cron || null,
          active,
          enabled,
          JSON.stringify(metadata),
        ]
      );

      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error creating data warehouse:", err);
      res.status(500).json({
        error: sanitizeError(
          err,
          "Error creating data warehouse",
          process.env.NODE_ENV === "production"
        ),
      });
    }
  }
);

app.put(
  "/api/data-warehouse/:warehouseName",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const warehouseName = validateIdentifier(req.params.warehouseName);
      if (!warehouseName) {
        return res.status(400).json({ error: "Invalid warehouse name" });
      }

      const description = sanitizeSearch(req.body.description, 500);
      const schema_type = validateEnum(
        req.body.schema_type,
        ["STAR_SCHEMA", "SNOWFLAKE_SCHEMA"],
        null
      );
      const source_db_engine = validateEnum(
        req.body.source_db_engine,
        ["PostgreSQL", "MariaDB", "MSSQL", "MongoDB", "Oracle"],
        null
      );
      const source_connection_string = sanitizeSearch(
        req.body.source_connection_string,
        500
      );
      const target_db_engine = validateEnum(
        req.body.target_db_engine,
        ["PostgreSQL", "Snowflake", "BigQuery", "Redshift"],
        null
      );
      const target_connection_string = sanitizeSearch(
        req.body.target_connection_string,
        500
      );
      const target_schema = validateIdentifier(req.body.target_schema);
      const schedule_cron = sanitizeSearch(req.body.schedule_cron, 100);
      const active = validateBoolean(req.body.active, true);
      const enabled = validateBoolean(req.body.enabled, true);
      const dimensions = req.body.dimensions || [];
      const facts = req.body.facts || [];
      const metadata = req.body.metadata || {};

      if (!schema_type) {
        return res.status(400).json({ error: "Invalid schema_type" });
      }
      if (!source_db_engine) {
        return res.status(400).json({ error: "Invalid source_db_engine" });
      }
      if (!target_db_engine) {
        return res.status(400).json({ error: "Invalid target_db_engine" });
      }
      if (!target_schema) {
        return res.status(400).json({ error: "target_schema is required" });
      }

      const result = await pool.query(
        `UPDATE metadata.data_warehouse_catalog 
       SET description = $1, schema_type = $2, source_db_engine = $3, source_connection_string = $4,
           target_db_engine = $5, target_connection_string = $6, target_schema = $7,
           dimensions = $8::jsonb, facts = $9::jsonb, schedule_cron = $10, active = $11,
           enabled = $12, metadata = $13::jsonb, updated_at = NOW()
       WHERE warehouse_name = $14
       RETURNING *`,
        [
          description || null,
          schema_type,
          source_db_engine,
          source_connection_string,
          target_db_engine,
          target_connection_string,
          target_schema.toLowerCase(),
          JSON.stringify(dimensions),
          JSON.stringify(facts),
          schedule_cron || null,
          active,
          enabled,
          JSON.stringify(metadata),
          warehouseName,
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Warehouse not found" });
      }

      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error updating data warehouse:", err);
      res.status(500).json({
        error: sanitizeError(
          err,
          "Error updating data warehouse",
          process.env.NODE_ENV === "production"
        ),
      });
    }
  }
);

app.delete(
  "/api/data-warehouse/:warehouseName",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const warehouseName = validateIdentifier(req.params.warehouseName);
      if (!warehouseName) {
        return res.status(400).json({ error: "Invalid warehouse name" });
      }

      const result = await pool.query(
        `DELETE FROM metadata.data_warehouse_catalog 
       WHERE warehouse_name = $1
       RETURNING *`,
        [warehouseName]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Warehouse not found" });
      }

      res.json({
        message: "Warehouse deleted successfully",
        warehouse: result.rows[0],
      });
    } catch (err) {
      console.error("Error deleting data warehouse:", err);
      res.status(500).json({
        error: sanitizeError(
          err,
          "Error deleting data warehouse",
          process.env.NODE_ENV === "production"
        ),
      });
    }
  }
);

app.patch(
  "/api/data-warehouse/:warehouseName/active",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const warehouseName = validateIdentifier(req.params.warehouseName);
      if (!warehouseName) {
        return res.status(400).json({ error: "Invalid warehouse name" });
      }

      const active = validateBoolean(req.body.active, true);

      const result = await pool.query(
        `UPDATE metadata.data_warehouse_catalog 
       SET active = $1, updated_at = NOW()
       WHERE warehouse_name = $2
       RETURNING *`,
        [active, warehouseName]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Warehouse not found" });
      }

      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error updating warehouse active status:", err);
      res.status(500).json({
        error: sanitizeError(
          err,
          "Error updating warehouse active status",
          process.env.NODE_ENV === "production"
        ),
      });
    }
  }
);

app.post(
  "/api/data-warehouse/:warehouseName/build",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const warehouseName = validateIdentifier(req.params.warehouseName);
      if (!warehouseName) {
        return res.status(400).json({ error: "Invalid warehouse name" });
      }

      const warehouseCheck = await pool.query(
        "SELECT warehouse_name, active, enabled FROM metadata.data_warehouse_catalog WHERE warehouse_name = $1",
        [warehouseName]
      );

      if (warehouseCheck.rows.length === 0) {
        return res.status(404).json({
          error: "Warehouse not found",
          warehouse_name: warehouseName,
        });
      }

      const warehouse = warehouseCheck.rows[0];
      if (!warehouse.active || !warehouse.enabled) {
        return res.status(400).json({
          error: "Warehouse is not active or enabled",
          warehouse_name: warehouseName,
          active: warehouse.active,
          enabled: warehouse.enabled,
        });
      }

      const buildMetadata = {
        build_now: true,
        build_timestamp: new Date().toISOString(),
      };

      await pool.query(
        `UPDATE metadata.data_warehouse_catalog 
       SET metadata = COALESCE(metadata, '{}'::jsonb) || $1::jsonb
       WHERE warehouse_name = $2`,
        [JSON.stringify(buildMetadata), warehouseName]
      );

      const processLogId = await pool.query(
        `INSERT INTO metadata.process_log 
       (process_type, process_name, status, start_time, end_time, total_rows_processed, error_message, metadata)
       VALUES ($1, $2, $3, NOW(), NOW(), 0, '', $4::jsonb)
       RETURNING id`,
        [
          "DATA_WAREHOUSE",
          warehouseName,
          "PENDING",
          JSON.stringify({
            triggered_by: "api",
            warehouse_name: warehouseName,
          }),
        ]
      );

      res.json({
        message: "Warehouse build triggered",
        warehouse_name: warehouseName,
        log_id: processLogId.rows[0].id,
      });
    } catch (err) {
      console.error("Error triggering warehouse build:", err);
      res.status(500).json({
        error: sanitizeError(
          err,
          "Error triggering warehouse build",
          process.env.NODE_ENV === "production"
        ),
      });
    }
  }
);

app.get("/api/data-warehouse/:warehouseName/history", async (req, res) => {
  try {
    const warehouseName = validateIdentifier(req.params.warehouseName);
    if (!warehouseName) {
      return res.status(400).json({ error: "Invalid warehouse name" });
    }

    const limit = validateLimit(req.query.limit, 1, 100, 50);

    const result = await pool.query(
      `SELECT * FROM metadata.process_log
       WHERE process_type = 'DATA_WAREHOUSE' AND process_name = $1
       ORDER BY start_time DESC
       LIMIT $2`,
      [warehouseName, limit]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching warehouse build history:", err);
    res.status(500).json({
      error: sanitizeError(
        err,
        "Error fetching warehouse build history",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});

app.get("/api/csv-catalog", async (req, res) => {
  try {
    const page = validatePage(req.query.page, 1);
    const limit = validateLimit(req.query.limit, 1, 100);
    const offset = (page - 1) * limit;
    const source_type = validateEnum(
      req.query.source_type,
      ["FILEPATH", "URL", "ENDPOINT", "UPLOADED_FILE", ""],
      ""
    );
    const target_db_engine = validateEnum(
      req.query.target_db_engine,
      ["PostgreSQL", "MariaDB", "MSSQL", "MongoDB", "Oracle", ""],
      ""
    );
    const status = validateEnum(
      req.query.status,
      ["SUCCESS", "ERROR", "IN_PROGRESS", "PENDING", ""],
      ""
    );
    const active =
      req.query.active !== undefined ? validateBoolean(req.query.active) : "";
    const search = sanitizeSearch(req.query.search, 100);

    let whereConditions = [];
    let queryParams = [];
    let paramCount = 0;

    if (source_type) {
      paramCount++;
      whereConditions.push(`source_type = $${paramCount}`);
      queryParams.push(source_type);
    }

    if (target_db_engine) {
      paramCount++;
      whereConditions.push(`target_db_engine = $${paramCount}`);
      queryParams.push(target_db_engine);
    }

    if (status) {
      paramCount++;
      whereConditions.push(`status = $${paramCount}`);
      queryParams.push(status);
    }

    if (active !== "") {
      paramCount++;
      whereConditions.push(`active = $${paramCount}`);
      queryParams.push(active === "true");
    }

    if (search) {
      paramCount++;
      whereConditions.push(
        `(csv_name ILIKE $${paramCount} OR source_path ILIKE $${paramCount} OR target_schema ILIKE $${paramCount} OR target_table ILIKE $${paramCount})`
      );
      queryParams.push(`%${search}%`);
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    const countQuery = `SELECT COUNT(*) FROM metadata.csv_catalog ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    paramCount++;
    const dataQuery = `SELECT * FROM metadata.csv_catalog ${whereClause}
      ORDER BY 
        CASE status
          WHEN 'SUCCESS' THEN 1
          WHEN 'IN_PROGRESS' THEN 2
          WHEN 'ERROR' THEN 3
          WHEN 'PENDING' THEN 4
          ELSE 5
        END,
        active DESC,
        csv_name
      LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    queryParams.push(limit, offset);

    const result = await pool.query(dataQuery, queryParams);

    const totalPages = Math.ceil(total / limit);

    res.json({
      data: result.rows,
      pagination: {
        total,
        totalPages,
        currentPage: parseInt(page),
        limit: parseInt(limit),
      },
    });
  } catch (err) {
    console.error("Error getting CSV catalog:", err);
    res.status(500).json({
      error: sanitizeError(
        err,
        "Error al obtener catálogo de CSV",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});

// Endpoint para subir archivos CSV
app.post(
  "/api/csv-catalog/upload",
  requireAuth,
  requireRole("admin", "user"),
  upload.single("csvFile"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Retornar la ruta relativa que el C++ puede usar
      const filePath = req.file.path;

      res.json({
        filePath: filePath,
        fileName: req.file.originalname,
        size: req.file.size,
        message: "File uploaded successfully",
      });
    } catch (err) {
      console.error("Error uploading CSV file:", err);
      const safeError = sanitizeError(
        err,
        "Error uploading CSV file",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

// Endpoint para analizar CSV (delimitador, skip rows, etc.)
app.post(
  "/api/csv-catalog/analyze",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const { source_path, source_type } = req.body;

      if (!source_path || !source_type) {
        return res.status(400).json({
          error: "Missing required fields: source_path and source_type",
        });
      }

      // Leer las primeras 10 líneas del archivo
      let lines = [];
      let filePath = source_path;

      if (source_type === "UPLOADED_FILE" || source_type === "FILEPATH") {
        if (!fs.existsSync(filePath)) {
          return res.status(404).json({ error: "File not found" });
        }

        const fileContent = fs.readFileSync(filePath, "utf8");
        lines = fileContent
          .split("\n")
          .slice(0, 10)
          .filter((line) => line.trim());
      } else if (source_type === "URL") {
        // Para URLs, necesitaríamos hacer fetch, pero por ahora solo soportamos archivos locales
        return res.status(400).json({
          error:
            "URL analysis not yet supported. Please use file path or upload.",
        });
      }

      if (lines.length === 0) {
        return res.status(400).json({ error: "File appears to be empty" });
      }

      // Detectar delimitador común
      const delimiters = [",", ";", "\t", "|"];
      let detectedDelimiter = ",";
      let maxFields = 0;

      // Analizar múltiples líneas para mejor detección
      for (const delim of delimiters) {
        let totalFields = 0;
        let consistentCount = 0;
        for (const line of lines.slice(0, 5)) {
          if (line.trim()) {
            const fieldCount = line.split(delim).length;
            totalFields += fieldCount;
            if (fieldCount > 1) {
              consistentCount++;
            }
          }
        }
        const avgFields = totalFields / Math.max(consistentCount, 1);
        if (avgFields > maxFields && consistentCount >= 2) {
          maxFields = avgFields;
          detectedDelimiter = delim;
        }
      }

      // Detectar skip rows (filas vacías o con headers)
      let skipRows = 0;
      let hasHeader = false;

      // Verificar si la primera línea parece ser un header (contiene texto, no solo números)
      const firstLine = lines[0];
      const firstLineFields = firstLine.split(detectedDelimiter);
      const hasTextFields = firstLineFields.some((field) => {
        const trimmed = field.trim();
        return trimmed && isNaN(trimmed) && trimmed !== "";
      });

      if (hasTextFields) {
        hasHeader = true;
        // Verificar si hay filas vacías antes del header
        // (esto requeriría leer el archivo completo, por ahora asumimos 0)
      }

      // Contar filas vacías al inicio (si las hay)
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() === "") {
          skipRows++;
        } else {
          break;
        }
      }

      res.json({
        success: true,
        delimiter: detectedDelimiter,
        has_header: hasHeader,
        skip_rows: skipRows,
        sample_lines: lines.slice(0, 3), // Devolver primeras 3 líneas como muestra
        field_count: maxFields,
      });
    } catch (err) {
      console.error("Error analyzing CSV:", err);
      const safeError = sanitizeError(
        err,
        "Error analyzing CSV file",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

// Endpoint para validar schema (solo preview, no crea nada - el C++ lo hará)
app.post(
  "/api/csv-catalog/create-schema",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const { db_engine, connection_string, schema_name } = req.body;

      if (!db_engine || !connection_string || !schema_name) {
        return res.status(400).json({
          error:
            "Missing required fields: db_engine, connection_string, schema_name",
        });
      }

      res.json({
        success: true,
        message: `Schema '${schema_name}' will be created automatically by the C++ sync process when data is processed. This is just a preview validation.`,
        schema_name: schema_name,
        note: "The actual schema creation is handled by the C++ sync process during data transfer.",
      });
    } catch (err) {
      console.error("Error validating schema:", err);
      const safeError = sanitizeError(
        err,
        "Error validating schema",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

// Endpoint para preview de tabla (solo muestra qué columnas se detectarían, no crea nada - el C++ lo hará)
app.post(
  "/api/csv-catalog/create-table",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const {
        db_engine,
        connection_string,
        schema_name,
        table_name,
        columns,
        source_path,
        has_header,
        delimiter,
        skip_rows,
      } = req.body;

      if (!db_engine || !connection_string || !schema_name || !table_name) {
        return res.status(400).json({
          error:
            "Missing required fields: db_engine, connection_string, schema_name, table_name",
        });
      }

      let detectedColumns = [];
      let columnTypes = [];

      if (columns && Array.isArray(columns) && columns.length > 0) {
        detectedColumns = columns.map((col) => col.name || col);
        columnTypes = columns.map((col) => col.type || "TEXT");
      } else if (source_path) {
        try {
          const fileContent = fs.readFileSync(source_path, "utf8");
          const lines = fileContent.split("\n").filter((line) => line.trim());
          const startLine = (skip_rows || 0) + (has_header ? 1 : 0);
          const dataLines = lines.slice(startLine, startLine + 10);

          if (dataLines.length > 0) {
            const firstDataLine = dataLines[0];
            const fields = firstDataLine.split(delimiter || ",");

            if (has_header && lines.length > skip_rows) {
              const headerLine = lines[skip_rows || 0];
              detectedColumns = headerLine
                .split(delimiter || ",")
                .map((c) => c.trim().replace(/[^a-zA-Z0-9_]/g, "_"));
            } else {
              detectedColumns = fields.map((_, i) => `column_${i + 1}`);
            }

            columnTypes = fields.map((field) => {
              const trimmed = String(field || "").trim();
              if (!trimmed || trimmed === "") return "TEXT";
              if (!isNaN(trimmed) && trimmed !== "") {
                if (trimmed.includes(".")) return "NUMERIC";
                return "BIGINT";
              }
              if (
                trimmed.toLowerCase() === "true" ||
                trimmed.toLowerCase() === "false"
              )
                return "BOOLEAN";
              return "TEXT";
            });
          }
        } catch (fileErr) {
          console.error("Error reading source file:", fileErr);
        }
      }

      if (detectedColumns.length === 0) {
        return res.status(400).json({
          error:
            "Could not detect columns. Please provide columns array or valid source_path for analysis.",
        });
      }

      res.json({
        success: true,
        message: `Table '${schema_name}.${table_name}' will be created automatically by the C++ sync process when data is processed. This is just a preview of detected columns.`,
        schema_name: schema_name,
        table_name: table_name,
        preview_columns: detectedColumns.map((col, i) => ({
          name: col,
          type: columnTypes[i] || "TEXT",
        })),
        note: "The actual table creation with these columns is handled by the C++ sync process during data transfer.",
      });
    } catch (err) {
      console.error("Error previewing table:", err);
      const safeError = sanitizeError(
        err,
        "Error previewing table",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.post(
  "/api/csv-catalog",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    const {
      csv_name,
      source_type,
      source_path,
      has_header,
      delimiter,
      skip_rows,
      skip_empty_rows,
      target_db_engine,
      target_connection_string,
      target_schema,
      target_table,
      sync_interval,
      status,
      active,
    } = req.body;

    if (
      !csv_name ||
      !source_type ||
      !source_path ||
      !target_db_engine ||
      !target_connection_string ||
      !target_schema ||
      !target_table
    ) {
      return res.status(400).json({
        error:
          "Missing required fields: csv_name, source_type, source_path, target_db_engine, target_connection_string, target_schema, target_table",
      });
    }

    const validSourceType = validateEnum(
      source_type,
      ["FILEPATH", "URL", "ENDPOINT", "UPLOADED_FILE"],
      null
    );
    if (!validSourceType) {
      return res.status(400).json({ error: "Invalid source_type" });
    }

    const validTargetEngine = validateEnum(
      target_db_engine,
      ["PostgreSQL", "MariaDB", "MSSQL", "MongoDB", "Oracle"],
      null
    );
    if (!validTargetEngine) {
      return res.status(400).json({ error: "Invalid target_db_engine" });
    }

    const validStatus = validateEnum(
      status || "PENDING",
      ["SUCCESS", "ERROR", "IN_PROGRESS", "PENDING"],
      "PENDING"
    );

    const interval =
      sync_interval && sync_interval > 0 ? parseInt(sync_interval) : 3600;
    const isActive =
      active !== undefined ? validateBoolean(active, true) : true;
    const hasHeader =
      has_header !== undefined ? validateBoolean(has_header, true) : true;
    const skipEmptyRows =
      skip_empty_rows !== undefined
        ? validateBoolean(skip_empty_rows, true)
        : true;
    const skipRows = skip_rows ? parseInt(skip_rows) : 0;
    const csvDelimiter = delimiter || ",";

    try {
      const checkResult = await pool.query(
        `SELECT csv_name FROM metadata.csv_catalog WHERE csv_name = $1`,
        [csv_name]
      );

      if (checkResult.rows.length > 0) {
        return res.status(409).json({
          error: "CSV with this name already exists",
        });
      }

      const result = await pool.query(
        `INSERT INTO metadata.csv_catalog 
       (csv_name, source_type, source_path, has_header, delimiter, skip_rows, skip_empty_rows,
        target_db_engine, target_connection_string, target_schema, target_table,
        status, active, sync_interval)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
        [
          csv_name,
          source_type,
          source_path,
          hasHeader,
          csvDelimiter,
          skipRows,
          skipEmptyRows,
          target_db_engine,
          target_connection_string,
          target_schema.toLowerCase(),
          target_table.toLowerCase(),
          validStatus,
          isActive,
          interval,
        ]
      );

      res.json(result.rows[0]);
    } catch (err) {
      console.error("Database error:", err);
      const safeError = sanitizeError(
        err,
        "Error creating CSV entry",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.patch("/api/csv-catalog/active", async (req, res) => {
  const { csv_name, active } = req.body;
  try {
    const result = await pool.query(
      `UPDATE metadata.csv_catalog 
       SET active = $1, updated_at = NOW()
       WHERE csv_name = $2
       RETURNING *`,
      [active, csv_name]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "CSV not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating CSV active status:", err);
    res.status(500).json({
      error: sanitizeError(
        err,
        "Error al actualizar estado de CSV",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});

app.get("/api/csv-catalog/:csvName/history", async (req, res) => {
  try {
    const csvName = validateIdentifier(req.params.csvName);
    if (!csvName) {
      return res.status(400).json({ error: "Invalid csvName" });
    }
    const limit = validateLimit(req.query.limit, 1, 100, 50);

    const result = await pool.query(
      `SELECT 
        id,
        process_type,
        process_name,
        status,
        start_time,
        end_time,
        COALESCE(duration_seconds, EXTRACT(EPOCH FROM (end_time - start_time))::integer) as duration_seconds,
        total_rows_processed,
        error_message,
        metadata,
        created_at
       FROM metadata.process_log 
       WHERE process_type = 'CSV_SYNC' AND LOWER(process_name) = LOWER($1) 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [csvName, limit]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching CSV history:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener historial del CSV",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/csv-catalog/:csvName/table-structure", async (req, res) => {
  try {
    const csvName = validateIdentifier(req.params.csvName);
    if (!csvName) {
      return res.status(400).json({ error: "Invalid csvName" });
    }

    const apiResult = await pool.query(
      `SELECT target_db_engine, target_connection_string, target_schema, target_table 
       FROM metadata.csv_catalog 
       WHERE LOWER(csv_name) = LOWER($1)`,
      [csvName]
    );

    if (apiResult.rows.length === 0) {
      return res.status(404).json({ error: "CSV not found" });
    }

    const csv = apiResult.rows[0];
    const {
      target_db_engine,
      target_connection_string,
      target_schema,
      target_table,
    } = csv;

    if (
      !target_db_engine ||
      !target_connection_string ||
      !target_schema ||
      !target_table
    ) {
      return res.status(400).json({
        error:
          "CSV configuration incomplete. Missing target database information.",
      });
    }

    let columns = [];

    switch (target_db_engine) {
      case "PostgreSQL": {
        const { Pool } = pkg;
        let config;

        if (
          target_connection_string.includes("postgresql://") ||
          target_connection_string.includes("postgres://")
        ) {
          config = {
            connectionString: target_connection_string,
            connectionTimeoutMillis: 10000,
          };
        } else {
          const params = {};
          const parts = target_connection_string.split(";");
          for (const part of parts) {
            const [key, value] = part.split("=").map((s) => s.trim());
            if (key && value) {
              switch (key.toLowerCase()) {
                case "host":
                case "hostname":
                  params.host = value;
                  break;
                case "user":
                case "username":
                  params.user = value;
                  break;
                case "password":
                  params.password = value;
                  break;
                case "db":
                case "database":
                  params.database = value;
                  break;
                case "port":
                  params.port = parseInt(value, 10);
                  break;
              }
            }
          }
          config = {
            ...params,
            connectionTimeoutMillis: 10000,
          };
        }

        const tempPool = new Pool(config);
        let client;
        try {
          client = await tempPool.connect();
          console.log(
            `Querying table structure for ${target_schema}.${target_table}`
          );
          const result = await client.query(
            `
            SELECT 
              column_name,
              data_type,
              character_maximum_length,
              is_nullable,
              column_default
            FROM information_schema.columns
            WHERE table_schema = $1 AND table_name = $2
            ORDER BY ordinal_position
          `,
            [target_schema, target_table]
          );
          console.log(`Found ${result.rows.length} columns`);
          columns = result.rows.map((row) => ({
            name: row.column_name,
            type:
              row.data_type +
              (row.character_maximum_length
                ? `(${row.character_maximum_length})`
                : ""),
            nullable: row.is_nullable === "YES",
            default: row.column_default,
          }));
        } catch (pgErr) {
          console.error("PostgreSQL query error:", pgErr);
          console.error("Error details:", {
            message: pgErr.message,
            code: pgErr.code,
            schema: target_schema,
            table: target_table,
          });
          throw new Error(`Failed to query table structure: ${pgErr.message}`);
        } finally {
          if (client) {
            client.release();
          }
          await tempPool.end();
        }
        break;
      }
      case "MariaDB": {
        const mysql = (await import("mysql2/promise")).default;
        const connection = await mysql.createConnection(
          target_connection_string
        );
        const [rows] = await connection.execute(
          `
          SELECT 
            COLUMN_NAME,
            DATA_TYPE,
            CHARACTER_MAXIMUM_LENGTH,
            IS_NULLABLE,
            COLUMN_DEFAULT
          FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
          ORDER BY ORDINAL_POSITION
        `,
          [target_schema, target_table]
        );
        columns = rows.map((row) => ({
          name: row.COLUMN_NAME,
          type:
            row.DATA_TYPE +
            (row.CHARACTER_MAXIMUM_LENGTH
              ? `(${row.CHARACTER_MAXIMUM_LENGTH})`
              : ""),
          nullable: row.IS_NULLABLE === "YES",
          default: row.COLUMN_DEFAULT,
        }));
        await connection.end();
        break;
      }
      case "MSSQL": {
        const sql = (await import("mssql")).default;
        const pool = await sql.connect(target_connection_string);
        const result = await pool
          .request()
          .input("schema", sql.VarChar, target_schema)
          .input("table", sql.VarChar, target_table).query(`
            SELECT 
              COLUMN_NAME,
              DATA_TYPE,
              CHARACTER_MAXIMUM_LENGTH,
              IS_NULLABLE,
              COLUMN_DEFAULT
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = @schema AND TABLE_NAME = @table
            ORDER BY ORDINAL_POSITION
          `);
        columns = result.recordset.map((row) => ({
          name: row.COLUMN_NAME,
          type:
            row.DATA_TYPE +
            (row.CHARACTER_MAXIMUM_LENGTH
              ? `(${row.CHARACTER_MAXIMUM_LENGTH})`
              : ""),
          nullable: row.IS_NULLABLE === "YES",
          default: row.COLUMN_DEFAULT,
        }));
        await pool.close();
        break;
      }
      case "Oracle": {
        const oracledb = (await import("oracledb")).default;
        const connection = await oracledb.getConnection(
          target_connection_string
        );
        const result = await connection.execute(
          `
          SELECT 
            COLUMN_NAME,
            DATA_TYPE,
            DATA_LENGTH,
            NULLABLE,
            DATA_DEFAULT
          FROM ALL_TAB_COLUMNS
          WHERE OWNER = :owner AND TABLE_NAME = :table
          ORDER BY COLUMN_ID
        `,
          {
            owner: target_schema.toUpperCase(),
            table: target_table.toUpperCase(),
          }
        );
        columns = result.rows.map((row) => ({
          name: row[0],
          type: row[1] + (row[2] ? `(${row[2]})` : ""),
          nullable: row[3] === "Y",
          default: row[4],
        }));
        await connection.close();
        break;
      }
      case "MongoDB": {
        const { MongoClient } = await import("mongodb");
        const client = new MongoClient(target_connection_string);
        await client.connect();
        const db = client.db();
        const collection = db.collection(target_table);
        const sample = await collection.findOne({});
        if (sample) {
          columns = Object.keys(sample).map((key) => ({
            name: key,
            type:
              typeof sample[key] === "object" ? "object" : typeof sample[key],
            nullable: true,
            default: null,
          }));
        }
        await client.close();
        break;
      }
      default:
        return res
          .status(400)
          .json({ error: `Unsupported database engine: ${target_db_engine}` });
    }

    res.json({
      db_engine: target_db_engine,
      schema: target_schema,
      table: target_table,
      columns: columns,
    });
  } catch (err) {
    console.error("Error fetching table structure:", err);
    console.error("Error stack:", err.stack);
    console.error("Error details:", {
      message: err.message,
      csvName: req.params.csvName,
    });
    const safeError = sanitizeError(
      err,
      `Error al obtener estructura de la tabla: ${err.message}`,
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({
      error: safeError,
      details: process.env.NODE_ENV !== "production" ? err.message : undefined,
    });
  }
});

app.get("/api/csv-catalog/metrics", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_csvs,
        COUNT(*) FILTER (WHERE active = true) as active_csvs,
        COUNT(*) FILTER (WHERE status = 'SUCCESS') as success_csvs,
        COUNT(*) FILTER (WHERE status = 'ERROR') as error_csvs,
        COUNT(*) FILTER (WHERE status = 'IN_PROGRESS') as in_progress_csvs,
        COUNT(*) FILTER (WHERE status = 'PENDING') as pending_csvs,
        COUNT(DISTINCT source_type) as source_types_count,
        COUNT(DISTINCT target_db_engine) as target_engines_count
      FROM metadata.csv_catalog
    `);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error getting CSV catalog metrics:", err);
    res.status(500).json({
      error: sanitizeError(
        err,
        "Error en el servidor",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});

app.get("/api/google-sheets-catalog", async (req, res) => {
  try {
    const page = validatePage(req.query.page, 1);
    const limit = validateLimit(req.query.limit, 1, 100);
    const offset = (page - 1) * limit;
    const target_db_engine = validateEnum(
      req.query.target_db_engine,
      ["PostgreSQL", "MariaDB", "MSSQL", "MongoDB", "Oracle", ""],
      ""
    );
    const status = validateEnum(
      req.query.status,
      ["SUCCESS", "ERROR", "IN_PROGRESS", "PENDING", ""],
      ""
    );
    const active =
      req.query.active !== undefined ? validateBoolean(req.query.active) : "";
    const search = sanitizeSearch(req.query.search, 100);

    let whereConditions = [];
    let queryParams = [];
    let paramCount = 0;

    if (target_db_engine) {
      paramCount++;
      whereConditions.push(`target_db_engine = $${paramCount}`);
      queryParams.push(target_db_engine);
    }

    if (status) {
      paramCount++;
      whereConditions.push(`status = $${paramCount}`);
      queryParams.push(status);
    }

    if (active !== "") {
      paramCount++;
      whereConditions.push(`active = $${paramCount}`);
      queryParams.push(active === "true");
    }

    if (search) {
      paramCount++;
      whereConditions.push(
        `(sheet_name ILIKE $${paramCount} OR spreadsheet_id ILIKE $${paramCount} OR target_schema ILIKE $${paramCount} OR target_table ILIKE $${paramCount})`
      );
      queryParams.push(`%${search}%`);
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    const countQuery = `SELECT COUNT(*) FROM metadata.google_sheets_catalog ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    paramCount++;
    const dataQuery = `SELECT * FROM metadata.google_sheets_catalog ${whereClause}
      ORDER BY 
        CASE status
          WHEN 'SUCCESS' THEN 1
          WHEN 'IN_PROGRESS' THEN 2
          WHEN 'ERROR' THEN 3
          WHEN 'PENDING' THEN 4
          ELSE 5
        END,
        active DESC,
        sheet_name
      LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    queryParams.push(limit, offset);

    const result = await pool.query(dataQuery, queryParams);

    const totalPages = Math.ceil(total / limit);

    res.json({
      data: result.rows,
      pagination: {
        total,
        totalPages,
        currentPage: parseInt(page),
        limit: parseInt(limit),
      },
    });
  } catch (err) {
    console.error("Error getting Google Sheets catalog:", err);
    res.status(500).json({
      error: sanitizeError(
        err,
        "Error al obtener catálogo de Google Sheets",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});

app.post(
  "/api/google-sheets-catalog",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    const {
      sheet_name,
      spreadsheet_id,
      api_key,
      access_token,
      range,
      target_db_engine,
      target_connection_string,
      target_schema,
      target_table,
      sync_interval,
      status,
      active,
    } = req.body;

    if (
      !sheet_name ||
      !spreadsheet_id ||
      !target_db_engine ||
      !target_connection_string ||
      !target_schema ||
      !target_table
    ) {
      return res.status(400).json({
        error:
          "Missing required fields: sheet_name, spreadsheet_id, target_db_engine, target_connection_string, target_schema, target_table",
      });
    }

    if (!api_key && !access_token) {
      return res.status(400).json({
        error: "Either api_key or access_token must be provided",
      });
    }

    const validTargetEngine = validateEnum(
      target_db_engine,
      ["PostgreSQL", "MariaDB", "MSSQL", "MongoDB", "Oracle"],
      null
    );
    if (!validTargetEngine) {
      return res.status(400).json({ error: "Invalid target_db_engine" });
    }

    const validStatus = validateEnum(
      status || "PENDING",
      ["SUCCESS", "ERROR", "IN_PROGRESS", "PENDING"],
      "PENDING"
    );

    const interval =
      sync_interval && sync_interval > 0 ? parseInt(sync_interval) : 3600;
    const isActive =
      active !== undefined ? validateBoolean(active, true) : true;

    try {
      const checkResult = await pool.query(
        `SELECT sheet_name FROM metadata.google_sheets_catalog WHERE sheet_name = $1`,
        [sheet_name]
      );

      if (checkResult.rows.length > 0) {
        return res.status(409).json({
          error: "Google Sheet with this name already exists",
        });
      }

      const result = await pool.query(
        `INSERT INTO metadata.google_sheets_catalog 
       (sheet_name, spreadsheet_id, api_key, access_token, range,
        target_db_engine, target_connection_string, target_schema, target_table,
        status, active, sync_interval)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
        [
          sheet_name,
          spreadsheet_id,
          api_key || null,
          access_token || null,
          range || null,
          target_db_engine,
          target_connection_string,
          target_schema.toLowerCase(),
          target_table.toLowerCase(),
          validStatus,
          isActive,
          interval,
        ]
      );

      res.json(result.rows[0]);
    } catch (err) {
      console.error("Database error:", err);
      const safeError = sanitizeError(
        err,
        "Error creating Google Sheets entry",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

// Endpoint para obtener hojas disponibles de un Google Sheet
app.post(
  "/api/google-sheets-catalog/get-sheets",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const { spreadsheet_id, api_key, access_token } = req.body;

      if (!spreadsheet_id) {
        return res.status(400).json({
          error: "Missing required field: spreadsheet_id",
        });
      }

      // Construir URL de Google Sheets API para obtener metadata
      let url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheet_id}`;

      // Agregar API key o access token
      if (api_key) {
        url += `?key=${api_key}`;
      } else if (access_token) {
        url += `?access_token=${access_token}`;
      } else {
        return res.status(400).json({
          error: "Either api_key or access_token is required",
        });
      }

      // Hacer fetch a Google Sheets API
      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return res.status(response.status).json({
          error:
            errorData.error?.message || "Failed to fetch Google Sheet metadata",
        });
      }

      const data = await response.json();
      const sheets = data.sheets || [];

      // Extraer información de cada hoja
      const sheetsList = sheets.map((sheet) => ({
        title: sheet.properties?.title || "Untitled",
        sheetId: sheet.properties?.sheetId || null,
        index: sheet.properties?.index || 0,
      }));

      res.json({
        success: true,
        sheets: sheetsList,
      });
    } catch (err) {
      console.error("Error getting Google Sheets list:", err);
      const safeError = sanitizeError(
        err,
        "Error getting Google Sheets list",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

// Endpoint para analizar Google Sheets (detectar headers, estructura, etc.)
app.post(
  "/api/google-sheets-catalog/analyze",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const { spreadsheet_id, api_key, access_token, range } = req.body;

      if (!spreadsheet_id) {
        return res.status(400).json({
          error: "Missing required field: spreadsheet_id",
        });
      }

      // Construir URL de Google Sheets API
      let url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheet_id}/values/`;
      if (range) {
        url += range;
      } else {
        url += "A1:Z10"; // Rango por defecto para análisis
      }

      // Agregar API key o access token
      if (api_key) {
        url += `?key=${api_key}`;
      } else if (access_token) {
        url += `?access_token=${access_token}`;
      } else {
        return res.status(400).json({
          error: "Either api_key or access_token is required",
        });
      }

      // Hacer fetch a Google Sheets API
      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return res.status(response.status).json({
          error: errorData.error?.message || "Failed to fetch Google Sheet",
        });
      }

      const data = await response.json();
      const values = data.values || [];

      if (values.length === 0) {
        return res.status(400).json({ error: "Sheet appears to be empty" });
      }

      // Analizar estructura
      let hasHeader = false;
      let skipRows = 0;

      // Verificar si la primera fila parece ser un header
      if (values[0] && values[0].length > 0) {
        const firstRow = values[0];
        const hasTextFields = firstRow.some((cell) => {
          const trimmed = String(cell || "").trim();
          return trimmed && isNaN(trimmed) && trimmed !== "";
        });

        if (hasTextFields) {
          hasHeader = true;
        }
      }

      // Contar filas vacías al inicio
      for (let i = 0; i < values.length; i++) {
        if (
          !values[i] ||
          values[i].length === 0 ||
          values[i].every((cell) => !cell || String(cell).trim() === "")
        ) {
          skipRows++;
        } else {
          break;
        }
      }

      // Obtener número de columnas
      const maxColumns = Math.max(
        ...values.map((row) => (row ? row.length : 0))
      );

      res.json({
        success: true,
        has_header: hasHeader,
        skip_rows: skipRows,
        column_count: maxColumns,
        row_count: values.length,
        sample_rows: values.slice(0, 3), // Primeras 3 filas como muestra
      });
    } catch (err) {
      console.error("Error analyzing Google Sheet:", err);
      const safeError = sanitizeError(
        err,
        "Error analyzing Google Sheet",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

// Endpoint para crear schema si no existe (Google Sheets)
app.post(
  "/api/google-sheets-catalog/create-schema",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const { db_engine, connection_string, schema_name } = req.body;

      if (!db_engine || !connection_string || !schema_name) {
        return res.status(400).json({
          error:
            "Missing required fields: db_engine, connection_string, schema_name",
        });
      }

      res.json({
        success: true,
        message: `Schema '${schema_name}' will be created automatically by the C++ sync process when data is processed. This is just a preview validation.`,
        schema_name: schema_name,
        note: "The actual schema creation is handled by the C++ sync process during data transfer.",
      });
    } catch (err) {
      console.error("Error validating schema:", err);
      const safeError = sanitizeError(
        err,
        "Error validating schema",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

// Endpoint para preview de tabla (solo muestra qué columnas se detectarían, no crea nada - el C++ lo hará)
app.post(
  "/api/google-sheets-catalog/create-table",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const {
        db_engine,
        connection_string,
        schema_name,
        table_name,
        columns,
        spreadsheet_id,
        api_key,
        access_token,
        range,
        has_header,
        skip_rows,
      } = req.body;

      if (!db_engine || !connection_string || !schema_name || !table_name) {
        return res.status(400).json({
          error:
            "Missing required fields: db_engine, connection_string, schema_name, table_name",
        });
      }

      let detectedColumns = [];
      let columnTypes = [];

      if (columns && Array.isArray(columns) && columns.length > 0) {
        detectedColumns = columns.map((col) => col.name || col);
        columnTypes = columns.map((col) => col.type || "TEXT");
      } else if (spreadsheet_id && (api_key || access_token)) {
        try {
          let url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheet_id}/values/`;
          if (range) {
            url += range;
          } else {
            url += "A1:Z10";
          }

          if (api_key) {
            url += `?key=${api_key}`;
          } else if (access_token) {
            url += `?access_token=${access_token}`;
          }

          const response = await fetch(url);
          if (response.ok) {
            const data = await response.json();
            const values = data.values || [];

            if (values.length > 0) {
              const startRow = skip_rows || 0;
              const headerRow =
                has_header && values.length > startRow
                  ? values[startRow]
                  : null;
              const firstDataRow =
                values.length > startRow + (has_header ? 1 : 0)
                  ? values[startRow + (has_header ? 1 : 0)]
                  : values[startRow] || [];

              if (headerRow && has_header) {
                detectedColumns = headerRow.map(
                  (cell) =>
                    String(cell || "")
                      .trim()
                      .replace(/[^a-zA-Z0-9_]/g, "_") || "column_1"
                );
              } else {
                detectedColumns = firstDataRow.map((_, i) => `column_${i + 1}`);
              }

              columnTypes = firstDataRow.map((cell) => {
                const trimmed = String(cell || "").trim();
                if (!trimmed || trimmed === "") return "TEXT";
                if (!isNaN(trimmed) && trimmed !== "") {
                  if (trimmed.includes(".")) return "NUMERIC";
                  return "BIGINT";
                }
                if (
                  trimmed.toLowerCase() === "true" ||
                  trimmed.toLowerCase() === "false"
                )
                  return "BOOLEAN";
                return "TEXT";
              });
            }
          }
        } catch (fetchErr) {
          console.error("Error fetching Google Sheet for analysis:", fetchErr);
        }
      }

      if (detectedColumns.length === 0) {
        return res.status(400).json({
          error:
            "Could not detect columns. Please provide columns array or valid spreadsheet_id with authentication for analysis.",
        });
      }

      res.json({
        success: true,
        message: `Table '${schema_name}.${table_name}' will be created automatically by the C++ sync process when data is processed. This is just a preview of detected columns.`,
        schema_name: schema_name,
        table_name: table_name,
        preview_columns: detectedColumns.map((col, i) => ({
          name: col,
          type: columnTypes[i] || "TEXT",
        })),
        note: "The actual table creation with these columns is handled by the C++ sync process during data transfer.",
      });
    } catch (err) {
      console.error("Error previewing table:", err);
      const safeError = sanitizeError(
        err,
        "Error previewing table",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.patch("/api/google-sheets-catalog/active", async (req, res) => {
  const { sheet_name, active } = req.body;
  try {
    const result = await pool.query(
      `UPDATE metadata.google_sheets_catalog 
       SET active = $1, updated_at = NOW()
       WHERE sheet_name = $2
       RETURNING *`,
      [active, sheet_name]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Google Sheet not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating Google Sheets active status:", err);
    res.status(500).json({
      error: sanitizeError(
        err,
        "Error al actualizar estado de Google Sheets",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});

app.get("/api/google-sheets-catalog/:sheetName/history", async (req, res) => {
  try {
    const sheetName = validateIdentifier(req.params.sheetName);
    if (!sheetName) {
      return res.status(400).json({ error: "Invalid sheetName" });
    }
    const limit = validateLimit(req.query.limit, 1, 100, 50);

    const result = await pool.query(
      `SELECT 
        id,
        process_type,
        process_name,
        status,
        start_time,
        end_time,
        COALESCE(duration_seconds, EXTRACT(EPOCH FROM (end_time - start_time))::integer) as duration_seconds,
        total_rows_processed,
        error_message,
        metadata,
        created_at
       FROM metadata.process_log 
       WHERE process_type = 'GOOGLE_SHEETS_SYNC' AND LOWER(process_name) = LOWER($1) 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [sheetName, limit]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching Google Sheets history:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener historial de Google Sheets",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.get(
  "/api/google-sheets-catalog/:sheetName/table-structure",
  async (req, res) => {
    try {
      const sheetName = validateIdentifier(req.params.sheetName);
      if (!sheetName) {
        return res.status(400).json({ error: "Invalid sheetName" });
      }

      const apiResult = await pool.query(
        `SELECT target_db_engine, target_connection_string, target_schema, target_table 
       FROM metadata.google_sheets_catalog 
       WHERE LOWER(sheet_name) = LOWER($1)`,
        [sheetName]
      );

      if (apiResult.rows.length === 0) {
        return res.status(404).json({ error: "Google Sheet not found" });
      }

      const sheet = apiResult.rows[0];
      const {
        target_db_engine,
        target_connection_string,
        target_schema,
        target_table,
      } = sheet;

      if (
        !target_db_engine ||
        !target_connection_string ||
        !target_schema ||
        !target_table
      ) {
        return res.status(400).json({
          error:
            "Google Sheet configuration incomplete. Missing target database information.",
        });
      }

      let columns = [];

      switch (target_db_engine) {
        case "PostgreSQL": {
          const { Pool } = pkg;
          let config;

          if (
            target_connection_string.includes("postgresql://") ||
            target_connection_string.includes("postgres://")
          ) {
            config = {
              connectionString: target_connection_string,
              connectionTimeoutMillis: 10000,
            };
          } else {
            const params = {};
            const parts = target_connection_string.split(";");
            for (const part of parts) {
              const [key, value] = part.split("=").map((s) => s.trim());
              if (key && value) {
                switch (key.toLowerCase()) {
                  case "host":
                  case "hostname":
                    params.host = value;
                    break;
                  case "user":
                  case "username":
                    params.user = value;
                    break;
                  case "password":
                    params.password = value;
                    break;
                  case "db":
                  case "database":
                    params.database = value;
                    break;
                  case "port":
                    params.port = parseInt(value, 10);
                    break;
                }
              }
            }
            config = {
              ...params,
              connectionTimeoutMillis: 10000,
            };
          }

          const tempPool = new Pool(config);
          let client;
          try {
            client = await tempPool.connect();
            console.log(
              `Querying table structure for ${target_schema}.${target_table}`
            );
            const result = await client.query(
              `
            SELECT 
              column_name,
              data_type,
              character_maximum_length,
              is_nullable,
              column_default
            FROM information_schema.columns
            WHERE table_schema = $1 AND table_name = $2
            ORDER BY ordinal_position
          `,
              [target_schema, target_table]
            );
            console.log(`Found ${result.rows.length} columns`);
            columns = result.rows.map((row) => ({
              name: row.column_name,
              type:
                row.data_type +
                (row.character_maximum_length
                  ? `(${row.character_maximum_length})`
                  : ""),
              nullable: row.is_nullable === "YES",
              default: row.column_default,
            }));
          } catch (pgErr) {
            console.error("PostgreSQL query error:", pgErr);
            console.error("Error details:", {
              message: pgErr.message,
              code: pgErr.code,
              schema: target_schema,
              table: target_table,
            });
            throw new Error(
              `Failed to query table structure: ${pgErr.message}`
            );
          } finally {
            if (client) {
              client.release();
            }
            await tempPool.end();
          }
          break;
        }
        case "MariaDB": {
          const mysql = (await import("mysql2/promise")).default;
          const connection = await mysql.createConnection(
            target_connection_string
          );
          const [rows] = await connection.execute(
            `
          SELECT 
            COLUMN_NAME,
            DATA_TYPE,
            CHARACTER_MAXIMUM_LENGTH,
            IS_NULLABLE,
            COLUMN_DEFAULT
          FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
          ORDER BY ORDINAL_POSITION
        `,
            [target_schema, target_table]
          );
          columns = rows.map((row) => ({
            name: row.COLUMN_NAME,
            type:
              row.DATA_TYPE +
              (row.CHARACTER_MAXIMUM_LENGTH
                ? `(${row.CHARACTER_MAXIMUM_LENGTH})`
                : ""),
            nullable: row.IS_NULLABLE === "YES",
            default: row.COLUMN_DEFAULT,
          }));
          await connection.end();
          break;
        }
        case "MSSQL": {
          const sql = (await import("mssql")).default;
          const pool = await sql.connect(target_connection_string);
          const result = await pool
            .request()
            .input("schema", sql.VarChar, target_schema)
            .input("table", sql.VarChar, target_table).query(`
            SELECT 
              COLUMN_NAME,
              DATA_TYPE,
              CHARACTER_MAXIMUM_LENGTH,
              IS_NULLABLE,
              COLUMN_DEFAULT
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = @schema AND TABLE_NAME = @table
            ORDER BY ORDINAL_POSITION
          `);
          columns = result.recordset.map((row) => ({
            name: row.COLUMN_NAME,
            type:
              row.DATA_TYPE +
              (row.CHARACTER_MAXIMUM_LENGTH
                ? `(${row.CHARACTER_MAXIMUM_LENGTH})`
                : ""),
            nullable: row.IS_NULLABLE === "YES",
            default: row.COLUMN_DEFAULT,
          }));
          await pool.close();
          break;
        }
        case "Oracle": {
          const oracledb = (await import("oracledb")).default;
          const connection = await oracledb.getConnection(
            target_connection_string
          );
          const result = await connection.execute(
            `
          SELECT 
            COLUMN_NAME,
            DATA_TYPE,
            DATA_LENGTH,
            NULLABLE,
            DATA_DEFAULT
          FROM ALL_TAB_COLUMNS
          WHERE OWNER = :owner AND TABLE_NAME = :table
          ORDER BY COLUMN_ID
        `,
            {
              owner: target_schema.toUpperCase(),
              table: target_table.toUpperCase(),
            }
          );
          columns = result.rows.map((row) => ({
            name: row[0],
            type: row[1] + (row[2] ? `(${row[2]})` : ""),
            nullable: row[3] === "Y",
            default: row[4],
          }));
          await connection.close();
          break;
        }
        case "MongoDB": {
          const { MongoClient } = await import("mongodb");
          const client = new MongoClient(target_connection_string);
          await client.connect();
          const db = client.db();
          const collection = db.collection(target_table);
          const sample = await collection.findOne({});
          if (sample) {
            columns = Object.keys(sample).map((key) => ({
              name: key,
              type:
                typeof sample[key] === "object" ? "object" : typeof sample[key],
              nullable: true,
              default: null,
            }));
          }
          await client.close();
          break;
        }
        default:
          return res.status(400).json({
            error: `Unsupported database engine: ${target_db_engine}`,
          });
      }

      res.json({
        db_engine: target_db_engine,
        schema: target_schema,
        table: target_table,
        columns: columns,
      });
    } catch (err) {
      console.error("Error fetching table structure:", err);
      console.error("Error stack:", err.stack);
      console.error("Error details:", {
        message: err.message,
        sheetName: req.params.sheetName,
      });
      const safeError = sanitizeError(
        err,
        `Error al obtener estructura de la tabla: ${err.message}`,
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({
        error: safeError,
        details:
          process.env.NODE_ENV !== "production" ? err.message : undefined,
      });
    }
  }
);

app.get("/api/google-sheets-catalog/metrics", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_sheets,
        COUNT(*) FILTER (WHERE active = true) as active_sheets,
        COUNT(*) FILTER (WHERE status = 'SUCCESS') as success_sheets,
        COUNT(*) FILTER (WHERE status = 'ERROR') as error_sheets,
        COUNT(*) FILTER (WHERE status = 'IN_PROGRESS') as in_progress_sheets,
        COUNT(*) FILTER (WHERE status = 'PENDING') as pending_sheets,
        COUNT(DISTINCT target_db_engine) as target_engines_count
      FROM metadata.google_sheets_catalog
    `);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error getting Google Sheets catalog metrics:", err);
    res.status(500).json({
      error: sanitizeError(
        err,
        "Error en el servidor",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});

app.get("/api/webhooks", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, webhook_type, url, api_key, bot_token, chat_id, 
             email_address, 
             COALESCE(log_levels, '[]'::jsonb) as log_levels,
             COALESCE(log_categories, '[]'::jsonb) as log_categories,
             enabled, created_at, updated_at
      FROM metadata.webhooks
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Error getting webhooks:", err);
    const safeError = sanitizeError(
      err,
      "Error getting webhooks",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.post(
  "/api/webhooks",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const {
        name,
        webhook_type,
        url,
        api_key,
        bot_token,
        chat_id,
        email_address,
        event_types,
        severities,
        enabled,
      } = req.body;

      if (!name || !webhook_type) {
        return res.status(400).json({
          error: "Missing required fields: name, webhook_type",
        });
      }

      const validWebhookType = validateEnum(
        webhook_type,
        ["HTTP", "SLACK", "TEAMS", "TELEGRAM", "EMAIL"],
        null
      );
      if (!validWebhookType) {
        return res.status(400).json({ error: "Invalid webhook_type" });
      }

      if (webhook_type === "TELEGRAM" && (!bot_token || !chat_id)) {
        return res.status(400).json({
          error: "bot_token and chat_id are required for TELEGRAM webhooks",
        });
      }

      if (webhook_type === "EMAIL" && !email_address) {
        return res.status(400).json({
          error: "email_address is required for EMAIL webhooks",
        });
      }

      if (
        (webhook_type === "HTTP" ||
          webhook_type === "SLACK" ||
          webhook_type === "TEAMS") &&
        !url
      ) {
        return res.status(400).json({
          error: "url is required for " + webhook_type + " webhooks",
        });
      }

      const result = await pool.query(
        `INSERT INTO metadata.webhooks 
        (name, webhook_type, url, api_key, bot_token, chat_id, email_address, 
         log_levels, log_categories, enabled)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10)
        RETURNING *`,
        [
          name,
          webhook_type,
          url || null,
          api_key || null,
          bot_token || null,
          chat_id || null,
          email_address || null,
          JSON.stringify(log_levels || []),
          JSON.stringify(log_categories || []),
          enabled !== undefined ? enabled : true,
        ]
      );

      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error creating webhook:", err);
      const safeError = sanitizeError(
        err,
        "Error creating webhook",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.put(
  "/api/webhooks/:id",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const webhookId = parseInt(req.params.id);
      if (isNaN(webhookId)) {
        return res.status(400).json({ error: "Invalid webhook ID" });
      }

      const {
        name,
        webhook_type,
        url,
        api_key,
        bot_token,
        chat_id,
        email_address,
        log_levels,
        log_categories,
        enabled,
      } = req.body;

      if (!name || !webhook_type) {
        return res.status(400).json({
          error: "Missing required fields: name, webhook_type",
        });
      }

      const validWebhookType = validateEnum(
        webhook_type,
        ["HTTP", "SLACK", "TEAMS", "TELEGRAM", "EMAIL"],
        null
      );
      if (!validWebhookType) {
        return res.status(400).json({ error: "Invalid webhook_type" });
      }

      const result = await pool.query(
        `UPDATE metadata.webhooks 
       SET name = $1, webhook_type = $2, url = $3, api_key = $4, 
           bot_token = $5, chat_id = $6, email_address = $7,
           log_levels = $8::jsonb, log_categories = $9::jsonb, enabled = $10,
           updated_at = NOW()
       WHERE id = $11
       RETURNING *`,
        [
          name,
          webhook_type,
          url || null,
          api_key || null,
          bot_token || null,
          chat_id || null,
          email_address || null,
          JSON.stringify(log_levels || []),
          JSON.stringify(log_categories || []),
          enabled !== undefined ? enabled : true,
          webhookId,
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Webhook not found" });
      }

      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error updating webhook:", err);
      const safeError = sanitizeError(
        err,
        "Error updating webhook",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.delete(
  "/api/webhooks/:id",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const webhookId = parseInt(req.params.id);
      if (isNaN(webhookId)) {
        return res.status(400).json({ error: "Invalid webhook ID" });
      }

      const result = await pool.query(
        `DELETE FROM metadata.webhooks WHERE id = $1 RETURNING id`,
        [webhookId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Webhook not found" });
      }

      res.json({ message: "Webhook deleted successfully" });
    } catch (err) {
      console.error("Error deleting webhook:", err);
      const safeError = sanitizeError(
        err,
        "Error deleting webhook",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.patch(
  "/api/webhooks/:id/enable",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const webhookId = parseInt(req.params.id);
      if (isNaN(webhookId)) {
        return res.status(400).json({ error: "Invalid webhook ID" });
      }

      const enabled = validateBoolean(req.body.enabled, true);

      const result = await pool.query(
        `UPDATE metadata.webhooks 
       SET enabled = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
        [enabled, webhookId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Webhook not found" });
      }

      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error updating webhook status:", err);
      const safeError = sanitizeError(
        err,
        "Error updating webhook status",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.get("/api/schema-migrations", requireAuth, async (req, res) => {
  try {
    const page = validatePage(req.query.page, 1);
    const limit = validateLimit(req.query.limit, 20);
    const offset = (page - 1) * limit;
    const search = req.query.search || "";
    const status = req.query.status || "";
    const environment = req.query.environment || "";
    const db_engine = req.query.db_engine || "";

    const whereConditions = [];
    const params = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      whereConditions.push(
        `(migration_name ILIKE $${paramCount} OR version ILIKE $${paramCount} OR description ILIKE $${paramCount})`
      );
      params.push(`%${search}%`);
    }

    if (status) {
      paramCount++;
      whereConditions.push(`status = $${paramCount}`);
      params.push(status);
    }

    if (db_engine) {
      paramCount++;
      whereConditions.push(`db_engine = $${paramCount}`);
      params.push(db_engine);
    }

    const whereClause =
      whereConditions.length > 0
        ? "WHERE " + whereConditions.join(" AND ")
        : "";

    const countQuery = `SELECT COUNT(*) FROM metadata.schema_migrations ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    paramCount++;
    const limitParam = paramCount;
    paramCount++;
    const offsetParam = paramCount;

    params.push(limit, offset);

    const dataQuery = `
      SELECT * FROM metadata.schema_migrations
      ${whereClause}
      ORDER BY version DESC, created_at DESC
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `;

    const result = await pool.query(dataQuery, params);

    const totalPages = Math.ceil(total / limit);

    res.json({
      migrations: result.rows,
      pagination: {
        total,
        totalPages,
        currentPage: page,
        limit,
      },
    });
  } catch (err) {
    console.error("Error fetching schema migrations:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener migraciones",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.get(
  "/api/schema-migrations/:migrationName",
  requireAuth,
  async (req, res) => {
    try {
      const migrationName = validateIdentifier(req.params.migrationName);
      if (!migrationName) {
        return res.status(400).json({ error: "Invalid migration name" });
      }

      const result = await pool.query(
        `SELECT * FROM metadata.schema_migrations WHERE migration_name = $1`,
        [migrationName]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Migration not found" });
      }

      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error fetching migration:", err);
      const safeError = sanitizeError(
        err,
        "Error al obtener migración",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.post(
  "/api/schema-migrations",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const {
        migration_name,
        version,
        description,
        db_engine,
        forward_sql,
        rollback_sql,
        connection_string,
      } = req.body;

      if (!migration_name || !version || !forward_sql) {
        return res.status(400).json({
          error: "Migration name, version, and forward_sql are required",
        });
      }

      if (!rollback_sql || rollback_sql.trim() === "") {
        return res.status(400).json({
          error:
            "Rollback SQL is MANDATORY. Every migration must have a rollback strategy.",
        });
      }

      const currentHash = crypto
        .createHash("sha256")
        .update(forward_sql + rollback_sql)
        .digest("hex");

      const lastMigrationResult = await pool.query(
        `SELECT current_hash, chain_position 
         FROM metadata.schema_migration_chain 
         ORDER BY chain_position DESC 
         LIMIT 1`
      );

      const isGenesis = lastMigrationResult.rows.length === 0;
      const prevHash = isGenesis
        ? null
        : lastMigrationResult.rows[0].current_hash;
      const chainPosition = isGenesis
        ? 0
        : lastMigrationResult.rows[0].chain_position + 1;

      const result = await pool.query(
        `INSERT INTO metadata.schema_migrations 
        (migration_name, version, description, db_engine, forward_sql, rollback_sql, checksum, status, prev_hash, chain_position, is_genesis, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING', $8, $9, $10, NOW())
        RETURNING *`,
        [
          migration_name,
          version,
          description || null,
          db_engine || "PostgreSQL",
          forward_sql,
          rollback_sql,
          currentHash,
          prevHash,
          chainPosition,
          isGenesis,
        ]
      );

      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error("Error creating migration:", err);
      if (err.code === "23505") {
        return res.status(409).json({ error: "Migration name already exists" });
      }
      const safeError = sanitizeError(
        err,
        "Error al crear migración",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.post(
  "/api/schema-migrations/:migrationName/apply",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const migrationName = validateIdentifier(req.params.migrationName);
      if (!migrationName) {
        return res.status(400).json({ error: "Invalid migration name" });
      }

      const { environment } = req.body;
      if (!environment) {
        return res.status(400).json({ error: "Environment is required" });
      }

      const migrationResult = await pool.query(
        `SELECT * FROM metadata.schema_migrations WHERE migration_name = $1`,
        [migrationName]
      );

      if (migrationResult.rows.length === 0) {
        return res.status(404).json({ error: "Migration not found" });
      }

      const migration = migrationResult.rows[0];

      const historyCheck = await pool.query(
        `SELECT * FROM metadata.schema_migration_history 
         WHERE migration_name = $1 AND environment = $2 AND status = 'APPLIED'
         ORDER BY executed_at DESC LIMIT 1`,
        [migrationName, environment]
      );

      if (historyCheck.rows.length > 0) {
        return res.status(409).json({
          error: `Migration ${migrationName} is already applied to ${environment}`,
        });
      }

      const startTime = Date.now();
      let executionError = null;

      try {
        if (migration.connection_string) {
          const targetPool = new Pool({
            connectionString: migration.connection_string,
            max: 1,
          });

          try {
            await targetPool.query(migration.forward_sql);
            await targetPool.end();
          } catch (dbError) {
            executionError = dbError.message;
            try {
              await targetPool.end();
            } catch (endError) {
              console.error("Error closing connection pool:", endError);
            }
            throw dbError;
          }
        } else {
          await pool.query(migration.forward_sql);
        }

        const executionTime = Date.now() - startTime;
        const currentUser = req.user?.username || "system";

        await pool.query(
          `INSERT INTO metadata.schema_migration_history 
           (migration_name, environment, status, executed_at, executed_by, execution_time_ms, error_message)
           VALUES ($1, $2, 'APPLIED', NOW(), $3, $4, NULL)`,
          [migrationName, environment, currentUser, executionTime]
        );

        const currentHash = crypto
          .createHash("sha256")
          .update(migration.forward_sql + migration.rollback_sql)
          .digest("hex");

        const lastChainResult = await pool.query(
          `SELECT chain_position, current_hash
           FROM metadata.schema_migration_chain
           WHERE environment = $1
           ORDER BY chain_position DESC
           LIMIT 1`,
          [environment]
        );

        const isGenesis = lastChainResult.rows.length === 0;
        const prevHash = isGenesis
          ? null
          : lastChainResult.rows[0].current_hash;
        const chainPosition = isGenesis
          ? 0
          : lastChainResult.rows[0].chain_position + 1;

        if (!isGenesis && migration.prev_hash !== prevHash) {
          return res.status(400).json({
            error: `Chain validation failed. Expected prev_hash: ${prevHash}, got: ${migration.prev_hash}. Migration chain is broken.`,
          });
        }

        await pool.query(
          `INSERT INTO metadata.schema_migration_chain
           (migration_name, prev_hash, current_hash, chain_position, environment)
           VALUES ($1, $2, $3, $4, $5)`,
          [migrationName, prevHash, currentHash, chainPosition, environment]
        );

        await pool.query(
          `UPDATE metadata.schema_migrations 
           SET status = 'APPLIED', last_applied_at = NOW(), applied_by = $1
           WHERE migration_name = $2`,
          [currentUser, migrationName]
        );

        res.json({
          message: `Migration ${migrationName} applied successfully to ${environment}`,
          execution_time_ms: executionTime,
        });
      } catch (dbError) {
        const executionTime = Date.now() - startTime;
        const currentUser = req.user?.username || "system";
        executionError = dbError.message;

        await pool.query(
          `INSERT INTO metadata.schema_migration_history 
           (migration_name, environment, status, executed_at, executed_by, execution_time_ms, error_message)
           VALUES ($1, $2, 'FAILED', NOW(), $3, $4, $5)`,
          [
            migrationName,
            environment,
            currentUser,
            executionTime,
            executionError,
          ]
        );

        await pool.query(
          `UPDATE metadata.schema_migrations 
           SET status = 'FAILED'
           WHERE migration_name = $1`,
          [migrationName]
        );

        throw dbError;
      }
    } catch (err) {
      console.error("Error applying migration:", err);
      const safeError = sanitizeError(
        err,
        "Error al aplicar migración",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.post(
  "/api/schema-migrations/:migrationName/rollback",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const migrationName = validateIdentifier(req.params.migrationName);
      if (!migrationName) {
        return res.status(400).json({ error: "Invalid migration name" });
      }

      const { environment } = req.body;
      if (!environment) {
        return res.status(400).json({ error: "Environment is required" });
      }

      const migrationResult = await pool.query(
        `SELECT * FROM metadata.schema_migrations WHERE migration_name = $1`,
        [migrationName]
      );

      if (migrationResult.rows.length === 0) {
        return res.status(404).json({ error: "Migration not found" });
      }

      const migration = migrationResult.rows[0];

      if (!migration.rollback_sql) {
        return res.status(400).json({
          error: "Migration does not have rollback SQL defined",
        });
      }

      const historyCheck = await pool.query(
        `SELECT * FROM metadata.schema_migration_history 
         WHERE migration_name = $1 AND environment = $2 AND status = 'APPLIED'
         ORDER BY executed_at DESC LIMIT 1`,
        [migrationName, environment]
      );

      if (historyCheck.rows.length === 0) {
        return res.status(404).json({
          error: `Migration ${migrationName} is not applied to ${environment}`,
        });
      }

      const startTime = Date.now();
      let executionError = null;

      try {
        if (migration.connection_string) {
          const targetPool = new Pool({
            connectionString: migration.connection_string,
            max: 1,
          });

          try {
            await targetPool.query(migration.rollback_sql);
            await targetPool.end();
          } catch (dbError) {
            executionError = dbError.message;
            try {
              await targetPool.end();
            } catch (endError) {
              console.error("Error closing connection pool:", endError);
            }
            throw dbError;
          }
        } else {
          await pool.query(migration.rollback_sql);
        }

        const executionTime = Date.now() - startTime;
        const currentUser = req.user?.username || "system";

        await pool.query(
          `INSERT INTO metadata.schema_migration_history 
           (migration_name, environment, status, executed_at, executed_by, execution_time_ms, error_message)
           VALUES ($1, $2, 'ROLLED_BACK', NOW(), $3, $4, NULL)`,
          [migrationName, environment, currentUser, executionTime]
        );

        await pool.query(
          `UPDATE metadata.schema_migrations 
           SET status = 'ROLLED_BACK'
           WHERE migration_name = $1`,
          [migrationName]
        );

        res.json({
          message: `Migration ${migrationName} rolled back successfully from ${environment}`,
          execution_time_ms: executionTime,
        });
      } catch (dbError) {
        const executionTime = Date.now() - startTime;
        const currentUser = req.user?.username || "system";
        executionError = dbError.message;

        await pool.query(
          `INSERT INTO metadata.schema_migration_history 
           (migration_name, environment, status, executed_at, executed_by, execution_time_ms, error_message)
           VALUES ($1, $2, 'FAILED', NOW(), $3, $4, $5)`,
          [
            migrationName,
            environment,
            currentUser,
            executionTime,
            executionError,
          ]
        );

        throw dbError;
      }
    } catch (err) {
      console.error("Error rolling back migration:", err);
      const safeError = sanitizeError(
        err,
        "Error al hacer rollback de migración",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.get(
  "/api/schema-migrations/:migrationName/history",
  requireAuth,
  async (req, res) => {
    try {
      const migrationName = validateIdentifier(req.params.migrationName);
      if (!migrationName) {
        return res.status(400).json({ error: "Invalid migration name" });
      }

      const result = await pool.query(
        `SELECT * FROM metadata.schema_migration_history 
       WHERE migration_name = $1 
       ORDER BY executed_at DESC 
       LIMIT 100`,
        [migrationName]
      );

      res.json({ history: result.rows });
    } catch (err) {
      console.error("Error fetching migration history:", err);
      const safeError = sanitizeError(
        err,
        "Error al obtener historial de migración",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.delete(
  "/api/schema-migrations/:migrationName",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const migrationName = validateIdentifier(req.params.migrationName);
      if (!migrationName) {
        return res.status(400).json({ error: "Invalid migration name" });
      }

      const result = await pool.query(
        `DELETE FROM metadata.schema_migrations WHERE migration_name = $1 RETURNING *`,
        [migrationName]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Migration not found" });
      }

      res.json({ message: `Migration ${migrationName} deleted successfully` });
    } catch (err) {
      console.error("Error deleting migration:", err);
      const safeError = sanitizeError(
        err,
        "Error al eliminar migración",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.get(
  "/api/schema-migrations/chain/:environment",
  requireAuth,
  async (req, res) => {
    try {
      const environment = req.params.environment;
      if (!["dev", "staging", "production"].includes(environment)) {
        return res.status(400).json({ error: "Invalid environment" });
      }

      const chainResult = await pool.query(
        `SELECT 
          sm.migration_name,
          sm.version,
          sm.prev_hash,
          sm.chain_position,
          sm.status,
          sm.is_genesis,
          smc.current_hash
        FROM metadata.schema_migration_chain smc
        JOIN metadata.schema_migrations sm ON smc.migration_name = sm.migration_name
        WHERE smc.environment = $1
        ORDER BY smc.chain_position ASC`,
        [environment]
      );

      const statusResult = await pool.query(
        `SELECT 
          COUNT(*) as total_links,
          COUNT(CASE WHEN sm.status = 'APPLIED' THEN 1 END) as applied_count
        FROM metadata.schema_migration_chain smc
        JOIN metadata.schema_migrations sm ON smc.migration_name = sm.migration_name
        WHERE smc.environment = $1`,
        [environment]
      );

      res.json({
        chain: chainResult.rows,
        status: {
          total_links: parseInt(statusResult.rows[0].total_links),
          applied_count: parseInt(statusResult.rows[0].applied_count),
          environment,
        },
      });
    } catch (err) {
      console.error("Error fetching migration chain:", err);
      const safeError = sanitizeError(
        err,
        "Error al obtener cadena de migraciones",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.post(
  "/api/schema-migrations/chain/validate",
  requireAuth,
  async (req, res) => {
    try {
      const { environment } = req.body;
      if (!["dev", "staging", "production"].includes(environment)) {
        return res.status(400).json({ error: "Invalid environment" });
      }

      const chainResult = await pool.query(
        `SELECT 
          sm.migration_name,
          sm.prev_hash,
          smc.current_hash,
          smc.chain_position
        FROM metadata.schema_migration_chain smc
        JOIN metadata.schema_migrations sm ON smc.migration_name = sm.migration_name
        WHERE smc.environment = $1
        ORDER BY smc.chain_position ASC`,
        [environment]
      );

      if (chainResult.rows.length === 0) {
        return res.json({
          valid: true,
          total_links: 0,
          environment,
          missing: [],
        });
      }

      let brokenAt = null;
      const missing = [];

      for (let i = 0; i < chainResult.rows.length; i++) {
        const current = chainResult.rows[i];
        if (i === 0) {
          if (!current.prev_hash && !current.is_genesis) {
            brokenAt = current.migration_name;
            break;
          }
        } else {
          const prev = chainResult.rows[i - 1];
          if (current.prev_hash !== prev.current_hash) {
            brokenAt = current.migration_name;
            missing.push(prev.migration_name);
            break;
          }
        }
      }

      res.json({
        valid: !brokenAt,
        broken_at: brokenAt,
        missing,
        total_links: chainResult.rows.length,
        environment,
      });
    } catch (err) {
      console.error("Error validating chain:", err);
      const safeError = sanitizeError(
        err,
        "Error al validar cadena",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.post(
  "/api/schema-migrations/detect-unregistered",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const { environment, connection_string } = req.body;

      const targetPool = connection_string
        ? new Pool({ connectionString: connection_string, max: 1 })
        : pool;

      try {
        const tablesResult = await targetPool.query(`
          SELECT schemaname, tablename
          FROM pg_tables
          WHERE schemaname NOT IN ('pg_catalog', 'information_schema', 'metadata')
          ORDER BY schemaname, tablename
        `);

        const columnsResult = await targetPool.query(`
          SELECT 
            table_schema,
            table_name,
            column_name,
            data_type
          FROM information_schema.columns
          WHERE table_schema NOT IN ('pg_catalog', 'information_schema', 'metadata')
          ORDER BY table_schema, table_name, column_name
        `);

        const indexesResult = await targetPool.query(`
          SELECT 
            schemaname,
            tablename,
            indexname
          FROM pg_indexes
          WHERE schemaname NOT IN ('pg_catalog', 'information_schema', 'metadata')
          ORDER BY schemaname, tablename, indexname
        `);

        const constraintsResult = await targetPool.query(`
          SELECT 
            tc.table_schema,
            tc.table_name,
            tc.constraint_name,
            tc.constraint_type
          FROM information_schema.table_constraints tc
          WHERE tc.table_schema NOT IN ('pg_catalog', 'information_schema', 'metadata')
          ORDER BY tc.table_schema, tc.table_name, tc.constraint_name
        `);

        const registeredTables = await pool.query(`
          SELECT DISTINCT 
            LOWER(REGEXP_REPLACE(forward_sql, '.*CREATE TABLE[\\s]+(?:IF NOT EXISTS[\\s]+)?(?:["\']?([\\w\\.]+)["\']?|([\\w\\.]+)).*', '\\1\\2', 'i')) as table_name
          FROM metadata.schema_migrations
          WHERE forward_sql ILIKE '%CREATE TABLE%'
        `);

        const registeredTableNames = new Set(
          registeredTables.rows
            .map((r) => r.table_name?.toLowerCase())
            .filter(Boolean)
        );

        const unregisteredTables = tablesResult.rows
          .filter(
            (t) =>
              !registeredTableNames.has(
                `${t.schemaname}.${t.tablename}`.toLowerCase()
              )
          )
          .map((t) => ({
            type: "table",
            name: t.tablename,
            schema: t.schemaname,
          }));

        res.json({
          unregistered_tables: unregisteredTables,
          unregistered_columns: [],
          unregistered_indexes: indexesResult.rows.map((idx) => ({
            type: "index",
            name: idx.indexname,
            schema: idx.schemaname,
            table: idx.tablename,
          })),
          unregistered_constraints: constraintsResult.rows.map((c) => ({
            type: "constraint",
            name: c.constraint_name,
            schema: c.table_schema,
            table: c.table_name,
            details: { constraint_type: c.constraint_type },
          })),
        });
      } finally {
        if (connection_string && targetPool !== pool) {
          await targetPool.end();
        }
      }
    } catch (err) {
      console.error("Error detecting unregistered changes:", err);
      const safeError = sanitizeError(
        err,
        "Error al detectar cambios no registrados",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.post(
  "/api/schema-migrations/generate-from-diff",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const { environment, connection_string, changes } = req.body;

      if (!changes || Object.keys(changes).length === 0) {
        return res.status(400).json({ error: "No changes provided" });
      }

      const migrationName = `auto_generated_${Date.now()}`;
      const version = "1.0.0";
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

      let forwardSql = `-- Auto-generated migration from unregistered changes\n-- Generated at: ${new Date().toISOString()}\n\n`;
      let rollbackSql = `-- Rollback for auto-generated migration\n-- Generated at: ${new Date().toISOString()}\n\n`;

      if (
        changes.unregistered_tables &&
        changes.unregistered_tables.length > 0
      ) {
        forwardSql += `-- Unregistered tables detected but not automatically migrated\n-- Manual review required for: ${changes.unregistered_tables
          .map((t) => t.name)
          .join(", ")}\n\n`;
      }

      if (
        changes.unregistered_indexes &&
        changes.unregistered_indexes.length > 0
      ) {
        forwardSql += `-- Unregistered indexes (manual review recommended)\n`;
        changes.unregistered_indexes.forEach((idx) => {
          forwardSql += `-- CREATE INDEX ${idx.name} ON ${idx.schema}.${idx.table};\n`;
        });
        forwardSql += "\n";
      }

      if (
        changes.unregistered_constraints &&
        changes.unregistered_constraints.length > 0
      ) {
        forwardSql += `-- Unregistered constraints (manual review recommended)\n`;
        changes.unregistered_constraints.forEach((c) => {
          forwardSql += `-- ALTER TABLE ${c.schema}.${c.table} ADD CONSTRAINT ${c.name} ...;\n`;
        });
        forwardSql += "\n";
      }

      rollbackSql += `-- Rollback operations\n-- Manual review required\n`;

      const checksum = crypto
        .createHash("sha256")
        .update(forwardSql)
        .digest("hex");

      const result = await pool.query(
        `INSERT INTO metadata.schema_migrations 
         (migration_name, version, description, db_engine, forward_sql, rollback_sql, checksum, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING', NOW())
         RETURNING *`,
        [
          migrationName,
          version,
          "Auto-generated from unregistered changes",
          "PostgreSQL",
          forwardSql,
          rollbackSql,
          checksum,
        ]
      );

      res.json({
        migration_name: migrationName,
        migration: result.rows[0],
        message:
          "Migration generated successfully. Please review and edit before applying.",
      });
    } catch (err) {
      console.error("Error generating migration from diff:", err);
      const safeError = sanitizeError(
        err,
        "Error al generar migración desde diferencias",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.post(
  "/api/schema-migrations/:migrationName/test",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const migrationName = validateIdentifier(req.params.migrationName);
      if (!migrationName) {
        return res.status(400).json({ error: "Invalid migration name" });
      }

      const { environment, test_schema_prefix = "_migration_test_" } = req.body;

      const migrationResult = await pool.query(
        `SELECT * FROM metadata.schema_migrations WHERE migration_name = $1`,
        [migrationName]
      );

      if (migrationResult.rows.length === 0) {
        return res.status(404).json({ error: "Migration not found" });
      }

      const migration = migrationResult.rows[0];

      if (!migration.rollback_sql) {
        return res.status(400).json({
          error: "Migration must have rollback SQL to be tested",
        });
      }

      const testSchema = `${test_schema_prefix}${Date.now()}`;
      const startTime = Date.now();
      const errors = [];

      const targetPool = migration.connection_string
        ? new Pool({ connectionString: migration.connection_string, max: 1 })
        : pool;

      try {
        await targetPool.query(`CREATE SCHEMA IF NOT EXISTS ${testSchema}`);

        const forwardSqlWithSchema = migration.forward_sql.replace(
          /CREATE TABLE\s+(?:IF NOT EXISTS\s+)?["']?(\w+)["']?/gi,
          `CREATE TABLE ${testSchema}.$1`
        );

        try {
          await targetPool.query(forwardSqlWithSchema);
        } catch (forwardErr) {
          errors.push(`Forward SQL failed: ${forwardErr.message}`);
        }

        if (errors.length === 0) {
          const rollbackSqlWithSchema = migration.rollback_sql.replace(
            /DROP TABLE\s+(?:IF EXISTS\s+)?["']?(\w+)["']?/gi,
            `DROP TABLE IF EXISTS ${testSchema}.$1`
          );

          try {
            await targetPool.query(rollbackSqlWithSchema);
          } catch (rollbackErr) {
            errors.push(`Rollback SQL failed: ${rollbackErr.message}`);
          }
        }

        await targetPool.query(`DROP SCHEMA IF EXISTS ${testSchema} CASCADE`);
      } catch (testErr) {
        errors.push(`Test execution failed: ${testErr.message}`);
        try {
          await targetPool.query(`DROP SCHEMA IF EXISTS ${testSchema} CASCADE`);
        } catch (cleanupErr) {
          console.error("Error cleaning up test schema:", cleanupErr);
        }
      } finally {
        if (migration.connection_string && targetPool !== pool) {
          await targetPool.end();
        }
      }

      const executionTime = Date.now() - startTime;

      res.json({
        success: errors.length === 0,
        test_schema: testSchema,
        execution_time_ms: executionTime,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (err) {
      console.error("Error testing migration:", err);
      const safeError = sanitizeError(
        err,
        "Error al probar migración",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.delete(
  "/api/schema-migrations/test/:testSchema",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const testSchema = validateIdentifier(req.params.testSchema);
      if (!testSchema || !testSchema.startsWith("_migration_test_")) {
        return res.status(400).json({ error: "Invalid test schema name" });
      }

      await pool.query(`DROP SCHEMA IF EXISTS ${testSchema} CASCADE`);

      res.json({
        message: `Test schema ${testSchema} cleaned up successfully`,
      });
    } catch (err) {
      console.error("Error cleaning up test schema:", err);
      const safeError = sanitizeError(
        err,
        "Error al limpiar schema de test",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.get(
  "/api/schema-migrations/integrity-check",
  requireAuth,
  async (req, res) => {
    try {
      const chainValidation = await pool.query(`
        SELECT environment, COUNT(*) as chain_length
        FROM metadata.schema_migration_chain
        GROUP BY environment
      `);

      const unregisteredCheck = await pool.query(`
        SELECT COUNT(*) as unregistered_count
        FROM (
          SELECT tablename, schemaname
          FROM pg_tables
          WHERE schemaname NOT IN ('pg_catalog', 'information_schema', 'metadata')
          EXCEPT
          SELECT DISTINCT 
            LOWER(REGEXP_REPLACE(forward_sql, '.*CREATE TABLE[\\s]+(?:IF NOT EXISTS[\\s]+)?(?:["\']?([\\w\\.]+)["\']?|([\\w\\.]+)).*', '\\1\\2', 'i')) as table_name,
            'public' as schemaname
          FROM metadata.schema_migrations
          WHERE forward_sql ILIKE '%CREATE TABLE%'
        ) AS unregistered
      `);

      const missingRollback = await pool.query(`
        SELECT COUNT(*) as count
        FROM metadata.schema_migrations
        WHERE rollback_sql IS NULL OR rollback_sql = ''
      `);

      const lastApplied = await pool.query(`
        SELECT migration_name, MAX(executed_at) as last_executed
        FROM metadata.schema_migration_history
        WHERE status = 'APPLIED'
        GROUP BY migration_name
        ORDER BY last_executed DESC
        LIMIT 1
      `);

      const mostUpdatedEnv = await pool.query(`
        SELECT environment, COUNT(*) as applied_count
        FROM metadata.schema_migration_history
        WHERE status = 'APPLIED'
        GROUP BY environment
        ORDER BY applied_count DESC
        LIMIT 1
      `);

      const totalMigrations = await pool.query(`
        SELECT COUNT(*) as count FROM metadata.schema_migrations
      `);

      const pendingTests = await pool.query(`
        SELECT COUNT(*) as count
        FROM metadata.schema_migrations
        WHERE status = 'PENDING'
      `);

      const chainValid = chainValidation.rows.length > 0;

      res.json({
        chain_valid: chainValid,
        unregistered_changes: parseInt(
          unregisteredCheck.rows[0]?.unregistered_count || "0"
        ),
        migrations_without_rollback: parseInt(
          missingRollback.rows[0]?.count || "0"
        ),
        last_migration_applied: lastApplied.rows[0]?.migration_name || null,
        most_updated_environment: mostUpdatedEnv.rows[0]?.environment || "N/A",
        total_migrations: parseInt(totalMigrations.rows[0]?.count || "0"),
        pending_tests: parseInt(pendingTests.rows[0]?.count || "0"),
      });
    } catch (err) {
      console.error("Error checking integrity:", err);
      const safeError = sanitizeError(
        err,
        "Error al verificar integridad",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

const backupsDir = path.join(process.cwd(), "backups");
if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
}

function matchesCronField(field, currentValue) {
  if (field === "*") {
    return true;
  }

  const dashPos = field.indexOf("-");
  const commaPos = field.indexOf(",");
  const slashPos = field.indexOf("/");

  if (dashPos !== -1) {
    try {
      const start = parseInt(field.substring(0, dashPos));
      const end = parseInt(field.substring(dashPos + 1));
      return currentValue >= start && currentValue <= end;
    } catch {
      return false;
    }
  }

  if (commaPos !== -1) {
    const items = field.split(",");
    for (const item of items) {
      try {
        if (parseInt(item.trim()) === currentValue) {
          return true;
        }
      } catch {
        continue;
      }
    }
    return false;
  }

  if (slashPos !== -1) {
    try {
      const base = field.substring(0, slashPos);
      const step = parseInt(field.substring(slashPos + 1));
      if (base === "*") {
        return currentValue % step === 0;
      } else {
        const start = parseInt(base);
        return (currentValue - start) % step === 0 && currentValue >= start;
      }
    } catch {
      return false;
    }
  }

  try {
    return parseInt(field) === currentValue;
  } catch {
    return false;
  }
}

function shouldRunCron(cronSchedule) {
  const now = new Date();
  const parts = cronSchedule.trim().split(/\s+/);
  if (parts.length !== 5) {
    return false;
  }

  const [minute, hour, day, month, dow] = parts;
  const currentMinute = now.getUTCMinutes();
  const currentHour = now.getUTCHours();
  const currentDay = now.getUTCDate();
  const currentMonth = now.getUTCMonth() + 1;
  const currentDow = now.getUTCDay();

  return (
    matchesCronField(minute, currentMinute) &&
    matchesCronField(hour, currentHour) &&
    matchesCronField(day, currentDay) &&
    matchesCronField(month, currentMonth) &&
    matchesCronField(dow, currentDow)
  );
}

function calculateNextRunTime(cronSchedule) {
  const now = new Date();
  let nextRun = new Date(now);
  nextRun.setUTCSeconds(0);
  nextRun.setUTCMilliseconds(0);
  nextRun.setUTCMinutes(nextRun.getUTCMinutes() + 1);

  const parts = cronSchedule.trim().split(/\s+/);
  if (parts.length !== 5) {
    return null;
  }

  const [minute, hour, day, month, dow] = parts;
  let maxIterations = 366 * 24 * 60;
  let iterations = 0;

  while (iterations < maxIterations) {
    iterations++;
    const currentMinute = nextRun.getUTCMinutes();
    const currentHour = nextRun.getUTCHours();
    const currentDay = nextRun.getUTCDate();
    const currentMonth = nextRun.getUTCMonth() + 1;
    const currentDow = nextRun.getUTCDay();

    if (
      matchesCronField(minute, currentMinute) &&
      matchesCronField(hour, currentHour) &&
      matchesCronField(day, currentDay) &&
      matchesCronField(month, currentMonth) &&
      matchesCronField(dow, currentDow)
    ) {
      if (nextRun > now) {
        return nextRun;
      }
    }

    nextRun.setUTCMinutes(nextRun.getUTCMinutes() + 1);
  }

  return null;
}

async function executeScheduledBackup(backup) {
  try {
    const historyRecord = await pool.query(
      `INSERT INTO metadata.backup_history 
       (backup_id, backup_name, status, started_at, triggered_by)
       VALUES ($1, $2, $3, NOW(), $4)
       RETURNING id`,
      [backup.backup_id, backup.backup_name, "in_progress", "scheduled"]
    );

    const historyId = historyRecord.rows[0].id;

    await pool.query(
      `UPDATE metadata.backups 
       SET last_run_at = NOW(), run_count = run_count + 1
       WHERE backup_id = $1`,
      [backup.backup_id]
    );

    const connInfo = parseConnectionString(
      backup.connection_string,
      backup.db_engine
    );
    if (!connInfo) {
      throw new Error("Failed to parse connection string");
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileExtension =
      backup.db_engine === "PostgreSQL"
        ? "dump"
        : backup.db_engine === "MariaDB"
        ? "sql"
        : backup.db_engine === "MongoDB"
        ? "gz"
        : "dmp";
    const fileName = `${backup.backup_name}_${timestamp}.${fileExtension}`;
    const filePath = path.join(backupsDir, fileName);

    let resultPath;
    if (backup.db_engine === "PostgreSQL") {
      resultPath = await createPostgreSQLBackup(
        connInfo,
        backup.database_name,
        backup.backup_type,
        filePath
      );
    } else if (backup.db_engine === "MariaDB") {
      resultPath = await createMariaDBBackup(
        connInfo,
        backup.database_name,
        backup.backup_type,
        filePath
      );
    } else if (backup.db_engine === "MongoDB") {
      resultPath = await createMongoDBBackup(
        connInfo,
        backup.database_name,
        backup.backup_type,
        filePath
      );
    } else if (backup.db_engine === "Oracle") {
      resultPath = await createOracleBackup(
        connInfo,
        backup.database_name,
        backup.backup_type,
        filePath
      );
    }

    const stats = await fs.promises.stat(resultPath);
    const fileSize = stats.size;
    const completedAt = new Date();
    const startedAt = new Date(historyRecord.rows[0].started_at);
    const durationSeconds = Math.floor((completedAt - startedAt) / 1000);

    await pool.query(
      `UPDATE metadata.backup_history 
       SET status = 'completed', completed_at = NOW(), 
           duration_seconds = $1, file_path = $2, file_size = $3
       WHERE id = $4`,
      [durationSeconds, resultPath, fileSize, historyId]
    );

    const nextRun = calculateNextRunTime(backup.cron_schedule);
    if (nextRun) {
      await pool.query(
        `UPDATE metadata.backups 
         SET next_run_at = $1
         WHERE backup_id = $2`,
        [nextRun, backup.backup_id]
      );
    }

    console.log(
      `Scheduled backup ${backup.backup_name} completed successfully`
    );
  } catch (err) {
    console.error(
      `Error executing scheduled backup ${backup.backup_name}:`,
      err
    );
    await pool.query(
      `UPDATE metadata.backup_history 
       SET status = 'failed', completed_at = NOW(), error_message = $1
       WHERE backup_id = $2 AND status = 'in_progress'
       ORDER BY started_at DESC LIMIT 1`,
      [err.message, backup.backup_id]
    );
  }
}

if (process.env.NODE_ENV !== "test") {
  setInterval(async () => {
    try {
      const scheduledBackups = await pool.query(
        `SELECT * FROM metadata.backups 
         WHERE is_scheduled = true 
         AND cron_schedule IS NOT NULL 
         AND cron_schedule != ''
         AND (next_run_at IS NULL OR next_run_at <= NOW())`
      );

      for (const backup of scheduledBackups.rows) {
        if (shouldRunCron(backup.cron_schedule)) {
          console.log(`Executing scheduled backup: ${backup.backup_name}`);
          executeScheduledBackup(backup).catch((err) => {
            console.error(
              `Error in scheduled backup execution: ${backup.backup_name}`,
              err
            );
          });
        } else {
          const nextRun = calculateNextRunTime(backup.cron_schedule);
          if (nextRun) {
            await pool.query(
              `UPDATE metadata.backups 
               SET next_run_at = $1
               WHERE backup_id = $2`,
              [nextRun, backup.backup_id]
            );
          }
        }
      }
    } catch (err) {
      console.error("Error in backup scheduler:", err);
    }
  }, 60000);
}

function parseConnectionString(connectionString, dbEngine) {
  if (dbEngine === "PostgreSQL") {
    const url = new URL(
      connectionString.replace(/^postgresql:\/\//, "http://")
    );
    return {
      host: url.hostname,
      port: url.port || 5432,
      database: url.pathname.slice(1),
      user: url.username,
      password: url.password,
    };
  } else if (dbEngine === "MariaDB") {
    const params = {};
    connectionString.split(";").forEach((param) => {
      const [key, value] = param.split("=");
      if (key && value) params[key.trim().toLowerCase()] = value.trim();
    });
    return {
      host: params.host || params.server || "localhost",
      port: params.port || 3306,
      database: params.database || params.database || "",
      user: params.user || params.uid || "",
      password: params.password || params.pwd || "",
    };
  } else if (dbEngine === "MongoDB") {
    const url = new URL(connectionString);
    return {
      host: url.hostname,
      port: url.port || 27017,
      database: url.pathname.slice(1),
      user: url.username,
      password: url.password,
    };
  } else if (dbEngine === "Oracle") {
    const params = {};
    connectionString.split(";").forEach((param) => {
      const [key, value] = param.split("=");
      if (key && value) params[key.trim().toLowerCase()] = value.trim();
    });
    return {
      host: params.host || "localhost",
      port: params.port || 1521,
      database: params.servicename || params.sid || "",
      user: params.user || "",
      password: params.password || "",
    };
  }
  return null;
}

async function createPostgreSQLBackup(
  connInfo,
  databaseName,
  backupType,
  outputPath
) {
  return new Promise((resolve, reject) => {
    const args = [];
    if (backupType === "structure") {
      args.push("--schema-only");
    } else if (backupType === "data") {
      args.push("--data-only");
    }
    args.push("-h", connInfo.host);
    args.push("-p", connInfo.port.toString());
    args.push("-U", connInfo.user);
    args.push("-d", databaseName);
    args.push("-f", outputPath);
    args.push("-F", "c");

    const env = { ...process.env, PGPASSWORD: connInfo.password };
    const pgDump = spawn("pg_dump", args, { env });

    let errorOutput = "";
    pgDump.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    pgDump.on("close", (code) => {
      if (code === 0) {
        resolve(outputPath);
      } else {
        reject(new Error(`pg_dump failed: ${errorOutput}`));
      }
    });

    pgDump.on("error", (err) => {
      reject(new Error(`Failed to start pg_dump: ${err.message}`));
    });
  });
}

async function createMariaDBBackup(
  connInfo,
  databaseName,
  backupType,
  outputPath
) {
  return new Promise((resolve, reject) => {
    const args = [];
    if (backupType === "structure") {
      args.push("--no-data");
    } else if (backupType === "data") {
      args.push("--no-create-info");
    }
    args.push("-h", connInfo.host);
    args.push("-P", connInfo.port.toString());
    args.push("-u", connInfo.user);
    if (connInfo.password) {
      args.push(`-p${connInfo.password}`);
    }
    args.push(databaseName);

    const mysqldump = spawn("mysqldump", args);

    const writeStream = fs.createWriteStream(outputPath);
    mysqldump.stdout.pipe(writeStream);

    let errorOutput = "";
    mysqldump.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    mysqldump.on("close", (code) => {
      writeStream.end();
      if (code === 0) {
        resolve(outputPath);
      } else {
        reject(new Error(`mysqldump failed: ${errorOutput}`));
      }
    });

    mysqldump.on("error", (err) => {
      reject(new Error(`Failed to start mysqldump: ${err.message}`));
    });
  });
}

async function createMongoDBBackup(
  connInfo,
  databaseName,
  backupType,
  outputPath
) {
  return new Promise((resolve, reject) => {
    const args = [];
    if (backupType === "structure") {
      args.push("--gzip");
    }
    args.push("--host", `${connInfo.host}:${connInfo.port}`);
    if (connInfo.user) {
      args.push("--username", connInfo.user);
    }
    if (connInfo.password) {
      args.push("--password", connInfo.password);
    }
    args.push("--db", databaseName);
    args.push("--out", path.dirname(outputPath));

    const mongodump = spawn("mongodump", args);

    let errorOutput = "";
    mongodump.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    mongodump.on("close", (code) => {
      if (code === 0) {
        const finalPath = path.join(path.dirname(outputPath), databaseName);
        if (fs.existsSync(finalPath)) {
          if (backupType === "structure") {
            resolve(finalPath);
          } else {
            resolve(finalPath);
          }
        } else {
          resolve(finalPath);
        }
      } else {
        reject(new Error(`mongodump failed: ${errorOutput}`));
      }
    });

    mongodump.on("error", (err) => {
      reject(new Error(`Failed to start mongodump: ${err.message}`));
    });
  });
}

async function createOracleBackup(
  connInfo,
  databaseName,
  backupType,
  outputPath
) {
  return new Promise((resolve, reject) => {
    const args = [];
    if (backupType === "structure") {
      args.push("SCHEMAS=" + connInfo.user);
      args.push("CONTENT=METADATA_ONLY");
    } else if (backupType === "data") {
      args.push("SCHEMAS=" + connInfo.user);
      args.push("CONTENT=DATA_ONLY");
    } else {
      args.push("SCHEMAS=" + connInfo.user);
    }
    args.push("DIRECTORY=DATA_PUMP_DIR");
    args.push("DUMPFILE=" + path.basename(outputPath));
    args.push("LOGFILE=" + path.basename(outputPath).replace(".dmp", ".log"));

    const expdpCommand = `expdp ${connInfo.user}/${connInfo.password}@${
      connInfo.host
    }:${connInfo.port}/${databaseName} ${args.join(" ")}`;

    const expdp = spawn("bash", ["-c", expdpCommand]);

    let errorOutput = "";
    expdp.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    expdp.on("close", (code) => {
      if (code === 0) {
        resolve(outputPath);
      } else {
        reject(new Error(`expdp failed: ${errorOutput}`));
      }
    });

    expdp.on("error", (err) => {
      reject(new Error(`Failed to start expdp: ${err.message}`));
    });
  });
}

app.post(
  "/api/backups/create",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const {
        backup_name,
        db_engine,
        connection_string,
        database_name,
        backup_type,
      } = req.body;

      if (
        !backup_name ||
        !db_engine ||
        !connection_string ||
        !database_name ||
        !backup_type
      ) {
        return res.status(400).json({
          error:
            "Missing required fields: backup_name, db_engine, connection_string, database_name, backup_type",
        });
      }

      if (!["PostgreSQL", "MariaDB", "MongoDB", "Oracle"].includes(db_engine)) {
        return res.status(400).json({
          error:
            "Unsupported database engine. Supported: PostgreSQL, MariaDB, MongoDB, Oracle",
        });
      }

      if (!["structure", "data", "full", "config"].includes(backup_type)) {
        return res.status(400).json({
          error:
            "Invalid backup_type. Must be: structure, data, full, or config",
        });
      }

      const currentUser = req.user?.username || "system";
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const fileExtension =
        db_engine === "PostgreSQL"
          ? "dump"
          : db_engine === "MariaDB"
          ? "sql"
          : db_engine === "MongoDB"
          ? "gz"
          : "dmp";
      const fileName = `${backup_name}_${timestamp}.${fileExtension}`;
      const filePath = path.join(backupsDir, fileName);

      const cronSchedule = req.body.cron_schedule || null;
      const isScheduled = cronSchedule ? true : false;
      const nextRunAt = cronSchedule
        ? calculateNextRunTime(cronSchedule)
        : null;

      const backupRecord = await pool.query(
        `INSERT INTO metadata.backups 
         (backup_name, db_engine, connection_string, database_name, backup_type, file_path, status, created_by, cron_schedule, is_scheduled, next_run_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING backup_id`,
        [
          backup_name,
          db_engine,
          connection_string,
          database_name,
          backup_type,
          filePath,
          "in_progress",
          currentUser,
          cronSchedule,
          isScheduled,
          nextRunAt,
        ]
      );

      const backupId = backupRecord.rows[0].backup_id;

      (async () => {
        try {
          const historyRecord = await pool.query(
            `INSERT INTO metadata.backup_history 
             (backup_id, backup_name, status, started_at, triggered_by)
             VALUES ($1, $2, $3, NOW(), $4)
             RETURNING id`,
            [backupId, backup_name, "in_progress", "manual"]
          );

          const connInfo = parseConnectionString(connection_string, db_engine);
          if (!connInfo) {
            throw new Error("Failed to parse connection string");
          }

          let resultPath;
          if (db_engine === "PostgreSQL") {
            resultPath = await createPostgreSQLBackup(
              connInfo,
              database_name,
              backup_type,
              filePath
            );
          } else if (db_engine === "MariaDB") {
            resultPath = await createMariaDBBackup(
              connInfo,
              database_name,
              backup_type,
              filePath
            );
          } else if (db_engine === "MongoDB") {
            resultPath = await createMongoDBBackup(
              connInfo,
              database_name,
              backup_type,
              filePath
            );
          } else if (db_engine === "Oracle") {
            resultPath = await createOracleBackup(
              connInfo,
              database_name,
              backup_type,
              filePath
            );
          }

          const stats = await fs.promises.stat(resultPath);
          const fileSize = stats.size;
          const completedAt = new Date();
          const startedAt = new Date(historyRecord.rows[0].started_at);
          const durationSeconds = Math.floor((completedAt - startedAt) / 1000);

          await pool.query(
            `UPDATE metadata.backups 
             SET status = 'completed', file_size = $1, completed_at = NOW()
             WHERE backup_id = $2`,
            [fileSize, backupId]
          );

          await pool.query(
            `UPDATE metadata.backup_history 
             SET status = 'completed', completed_at = NOW(), 
                 duration_seconds = $1, file_path = $2, file_size = $3
             WHERE id = $4`,
            [durationSeconds, resultPath, fileSize, historyRecord.rows[0].id]
          );
        } catch (err) {
          console.error("Error creating backup:", err);
          await pool.query(
            `UPDATE metadata.backups 
             SET status = 'failed', error_message = $1, completed_at = NOW()
             WHERE backup_id = $2`,
            [err.message, backupId]
          );

          await pool.query(
            `UPDATE metadata.backup_history 
             SET status = 'failed', completed_at = NOW(), error_message = $1
             WHERE backup_id = $2 AND status = 'in_progress'
             ORDER BY started_at DESC LIMIT 1`,
            [err.message, backupId]
          );
        }
      })();

      res.json({
        message: "Backup creation started",
        backup_id: backupId,
        status: "in_progress",
      });
    } catch (err) {
      console.error("Error creating backup:", err);
      res.status(500).json({
        error: "Error al crear backup",
        details: sanitizeError(
          err,
          "Error en el servidor",
          process.env.NODE_ENV === "production"
        ),
      });
    }
  }
);

app.get(
  "/api/backups",
  requireAuth,
  requireRole("admin", "user", "viewer"),
  async (req, res) => {
    try {
      const { db_engine, status, page = 1, limit = 50 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      let query = "SELECT * FROM metadata.backups WHERE 1=1";
      const params = [];
      let paramCount = 0;

      if (db_engine) {
        paramCount++;
        query += ` AND db_engine = $${paramCount}`;
        params.push(db_engine);
      }

      if (status) {
        paramCount++;
        query += ` AND status = $${paramCount}`;
        params.push(status);
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${
        paramCount + 2
      }`;
      params.push(parseInt(limit), offset);

      const result = await pool.query(query, params);
      const countResult = await pool.query(
        "SELECT COUNT(*) as total FROM metadata.backups WHERE 1=1" +
          (db_engine ? ` AND db_engine = '${db_engine}'` : "") +
          (status ? ` AND status = '${status}'` : "")
      );

      res.json({
        backups: result.rows,
        total: parseInt(countResult.rows[0].total),
        page: parseInt(page),
        limit: parseInt(limit),
      });
    } catch (err) {
      console.error("Error fetching backups:", err);
      res.status(500).json({
        error: "Error al obtener backups",
        details: sanitizeError(
          err,
          "Error en el servidor",
          process.env.NODE_ENV === "production"
        ),
      });
    }
  }
);

app.get(
  "/api/backups/:id",
  requireAuth,
  requireRole("admin", "user", "viewer"),
  async (req, res) => {
    try {
      const backupId = parseInt(req.params.id);
      const result = await pool.query(
        "SELECT * FROM metadata.backups WHERE backup_id = $1",
        [backupId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Backup not found" });
      }

      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error fetching backup:", err);
      res.status(500).json({
        error: "Error al obtener backup",
        details: sanitizeError(
          err,
          "Error en el servidor",
          process.env.NODE_ENV === "production"
        ),
      });
    }
  }
);

app.post(
  "/api/backups/:id/restore",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const backupId = parseInt(req.params.id);
      const { target_connection_string, target_database_name } = req.body;

      const backupResult = await pool.query(
        "SELECT * FROM metadata.backups WHERE backup_id = $1",
        [backupId]
      );

      if (backupResult.rows.length === 0) {
        return res.status(404).json({ error: "Backup not found" });
      }

      const backup = backupResult.rows[0];

      if (backup.status !== "completed") {
        return res.status(400).json({
          error: "Backup is not completed. Cannot restore.",
        });
      }

      if (!fs.existsSync(backup.file_path)) {
        return res.status(404).json({ error: "Backup file not found on disk" });
      }

      const targetConnString =
        target_connection_string || backup.connection_string;
      const targetDbName = target_database_name || backup.database_name;

      res.json({
        message:
          "Restore operation started. This is a placeholder - restore functionality needs to be implemented.",
        backup_id: backupId,
        target_connection_string: targetConnString,
        target_database_name: targetDbName,
      });
    } catch (err) {
      console.error("Error restoring backup:", err);
      res.status(500).json({
        error: "Error al restaurar backup",
        details: sanitizeError(
          err,
          "Error en el servidor",
          process.env.NODE_ENV === "production"
        ),
      });
    }
  }
);

app.delete(
  "/api/backups/:id",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const backupId = parseInt(req.params.id);
      const backupResult = await pool.query(
        "SELECT * FROM metadata.backups WHERE backup_id = $1",
        [backupId]
      );

      if (backupResult.rows.length === 0) {
        return res.status(404).json({ error: "Backup not found" });
      }

      const backup = backupResult.rows[0];

      if (fs.existsSync(backup.file_path)) {
        await fs.promises.unlink(backup.file_path);
      }

      await pool.query("DELETE FROM metadata.backups WHERE backup_id = $1", [
        backupId,
      ]);

      res.json({ message: "Backup deleted successfully" });
    } catch (err) {
      console.error("Error deleting backup:", err);
      res.status(500).json({
        error: "Error al eliminar backup",
        details: sanitizeError(
          err,
          "Error en el servidor",
          process.env.NODE_ENV === "production"
        ),
      });
    }
  }
);

app.get(
  "/api/backups/mssql/:connectionId",
  requireAuth,
  requireRole("admin", "user", "viewer"),
  async (req, res) => {
    try {
      const connectionId = req.params.connectionId;

      const connectionResult = await pool.query(
        `SELECT connection_string, db_engine 
         FROM metadata.database_config 
         WHERE id = $1 AND db_engine = 'MSSQL'`,
        [connectionId]
      );

      if (connectionResult.rows.length === 0) {
        return res.status(404).json({ error: "MSSQL connection not found" });
      }

      const connection = connectionResult.rows[0];
      const sql = (await import("mssql")).default;

      const config = {
        connectionString: connection.connection_string,
        options: {
          enableArithAbort: true,
          trustServerCertificate: true,
        },
      };

      const pool_sql = await sql.connect(config);
      const databaseName = new URL(
        connection.connection_string.replace(/^mssql:\/\//, "http://")
      ).pathname.slice(1);

      const request = pool_sql.request();
      request.input("databaseName", sql.VarChar, databaseName);
      const result = await request.query(`
        SELECT 
          backup_set_id,
          database_name,
          backup_start_date,
          backup_finish_date,
          type,
          CASE type
            WHEN 'D' THEN 'Full'
            WHEN 'I' THEN 'Differential'
            WHEN 'L' THEN 'Log'
          END as backup_type_name,
          backup_size,
          compressed_backup_size,
          recovery_model,
          user_name as backup_user
        FROM msdb.dbo.backupset
        WHERE database_name = @databaseName
        ORDER BY backup_finish_date DESC
      `);

      await pool_sql.close();

      res.json({
        backups: result.recordset,
        connection_id: connectionId,
        database_name: databaseName,
      });
    } catch (err) {
      console.error("Error fetching MSSQL backups:", err);
      res.status(500).json({
        error: "Error al obtener backups de MSSQL",
        details: sanitizeError(
          err,
          "Error en el servidor",
          process.env.NODE_ENV === "production"
        ),
      });
    }
  }
);

app.get(
  "/api/backups/:id/history",
  requireAuth,
  requireRole("admin", "user", "viewer"),
  async (req, res) => {
    try {
      const backupId = parseInt(req.params.id);
      const limit = parseInt(req.query.limit) || 50;

      const result = await pool.query(
        `SELECT * FROM metadata.backup_history 
         WHERE backup_id = $1 
         ORDER BY started_at DESC 
         LIMIT $2`,
        [backupId, limit]
      );

      res.json({ history: result.rows });
    } catch (err) {
      console.error("Error fetching backup history:", err);
      res.status(500).json({
        error: "Error al obtener historial de backup",
        details: sanitizeError(
          err,
          "Error en el servidor",
          process.env.NODE_ENV === "production"
        ),
      });
    }
  }
);

app.put(
  "/api/backups/:id/schedule",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const backupId = parseInt(req.params.id);
      const { cron_schedule, is_scheduled } = req.body;

      if (is_scheduled && (!cron_schedule || cron_schedule.trim() === "")) {
        return res.status(400).json({
          error: "cron_schedule is required when is_scheduled is true",
        });
      }

      const parts = cron_schedule ? cron_schedule.trim().split(/\s+/) : [];
      if (is_scheduled && parts.length !== 5) {
        return res.status(400).json({
          error:
            "Invalid cron_schedule format. Expected: minute hour day month dow",
        });
      }

      const nextRunAt =
        is_scheduled && cron_schedule
          ? calculateNextRunTime(cron_schedule)
          : null;

      await pool.query(
        `UPDATE metadata.backups 
         SET cron_schedule = $1, is_scheduled = $2, next_run_at = $3
         WHERE backup_id = $4`,
        [cron_schedule || null, is_scheduled || false, nextRunAt, backupId]
      );

      res.json({
        message: "Backup schedule updated successfully",
        next_run_at: nextRunAt,
      });
    } catch (err) {
      console.error("Error updating backup schedule:", err);
      res.status(500).json({
        error: "Error al actualizar programación de backup",
        details: sanitizeError(
          err,
          "Error en el servidor",
          process.env.NODE_ENV === "production"
        ),
      });
    }
  }
);

app.post(
  "/api/backups/:id/enable-schedule",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const backupId = parseInt(req.params.id);
      const backupResult = await pool.query(
        "SELECT cron_schedule FROM metadata.backups WHERE backup_id = $1",
        [backupId]
      );

      if (backupResult.rows.length === 0) {
        return res.status(404).json({ error: "Backup not found" });
      }

      const cronSchedule = backupResult.rows[0].cron_schedule;
      if (!cronSchedule) {
        return res.status(400).json({
          error: "Backup does not have a cron_schedule. Set it first.",
        });
      }

      const nextRunAt = calculateNextRunTime(cronSchedule);

      await pool.query(
        `UPDATE metadata.backups 
         SET is_scheduled = true, next_run_at = $1
         WHERE backup_id = $2`,
        [nextRunAt, backupId]
      );

      res.json({
        message: "Backup schedule enabled",
        next_run_at: nextRunAt,
      });
    } catch (err) {
      console.error("Error enabling backup schedule:", err);
      res.status(500).json({
        error: "Error al habilitar programación de backup",
        details: sanitizeError(
          err,
          "Error en el servidor",
          process.env.NODE_ENV === "production"
        ),
      });
    }
  }
);

app.post(
  "/api/backups/:id/disable-schedule",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const backupId = parseInt(req.params.id);

      await pool.query(
        `UPDATE metadata.backups 
         SET is_scheduled = false, next_run_at = NULL
         WHERE backup_id = $1`,
        [backupId]
      );

      res.json({ message: "Backup schedule disabled" });
    } catch (err) {
      console.error("Error disabling backup schedule:", err);
      res.status(500).json({
        error: "Error al deshabilitar programación de backup",
        details: sanitizeError(
          err,
          "Error en el servidor",
          process.env.NODE_ENV === "production"
        ),
      });
    }
  }
);

// Export app for testing
export default app;

// Only start server if not in test environment
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log("📋 [SERVER STARTUP] Catalog routes should be registered:");
    console.log("   - POST /api/catalog/reset-cdc");
    console.log("   - GET /api/catalog/execution-history");
    console.log("   - GET /api/catalog/table-structure");
    console.log("   - GET /api/catalog (general route)");
  });
}
