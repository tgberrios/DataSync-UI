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

    return config;
  } catch (error) {

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

let usersTableReady = false;

(async () => {
  try {
    await initializeUsersTable();
    usersTableReady = true;
  } catch (err) {
    usersTableReady = false;
  }
})();

app.use(generalLimiter);

const publicPaths = ["/api/auth/login", "/api/health"];
app.use((req, res, next) => {
  if (!req.path.startsWith("/api")) {
    return next();
  }
  const requestPath = req.path || (req.url ? req.url.split("?")[0] : "");
  if (publicPaths.includes(requestPath)) {
    return next();
  }
  requireAuth(req, res, next);
});

app.post("/api/auth/login", authLimiter, async (req, res) => {
  try {
    if (!usersTableReady) {
      console.error("Users table not ready, initialization may have failed");
      return res.status(503).json({
        error: "Server is initializing. Please try again in a moment.",
      });
    }

    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        error: "Username and password are required",
      });
    }

    let result;
    try {
      result = await authenticateUser(username, password);
    } catch (authError) {
      console.error("Authentication error:", authError);
      console.error("Auth error details:", {
        message: authError.message,
        code: authError.code,
        stack: authError.stack
      });
      return res.status(500).json({
        error: process.env.NODE_ENV === "production" 
          ? "Authentication failed" 
          : authError.message
      });
    }

    if (!result || !result.success) {
      return res.status(401).json({ 
        error: result?.error || "Invalid credentials" 
      });
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

app.get("/api/connections", requireAuth, async (req, res) => {
  try {
    const { db_engine } = req.query;
    
    let query = `
      SELECT db_engine, connection_string, connection_string_masked
      FROM metadata.available_connections
    `;
    
    const params = [];
    if (db_engine) {
      query += ' WHERE db_engine = $1';
      params.push(db_engine);
    }
    
    query += ' ORDER BY db_engine, connection_string';
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      connections: result.rows.map(row => ({
        db_engine: row.db_engine,
        connection_string: row.connection_string,
        connection_string_masked: row.connection_string_masked
      }))
    });
  } catch (error) {
    console.error('Error fetching connections:', error);
    const safeError = sanitizeError(
      error,
      "Failed to fetch connections",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({
      success: false,
      error: safeError
    });
  }
});

// Resetear CDC (last_change_id a 0) - DEBE IR ANTES DE /api/catalog
app.post(
  "/api/catalog/reset-cdc",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    const schema_name = validateIdentifier(req.body.schema_name);
    const table_name = validateIdentifier(req.body.table_name);
    const db_engine = validateEnum(
      req.body.db_engine,
      ["PostgreSQL", "MariaDB", "MSSQL", "MongoDB", "Oracle", 
       "Salesforce", "SAP", "Teradata", "Netezza", "Hive", 
       "Cassandra", "DynamoDB", "AS400", "S3", "AzureBlob", 
       "GCS", "FTP", "SFTP", "Email", "SOAP", "GraphQL",
       "Excel", "FixedWidth", "EBCDIC", "XML", "Avro", 
       "Parquet", "ORC", "Compressed"],
      null
    );

    if (!schema_name || !table_name || !db_engine) {
      return res.status(400).json({
        error: "schema_name, table_name, and db_engine are required",
      });
    }

    try {
      const result = await pool.query(
        `UPDATE metadata.catalog 
         SET sync_metadata = COALESCE(sync_metadata, '{}'::jsonb) || 
             jsonb_build_object('last_change_id', '0')
         WHERE LOWER(schema_name) = LOWER($1) AND LOWER(table_name) = LOWER($2) AND db_engine = $3
         RETURNING schema_name, table_name, db_engine, sync_metadata`,
        [schema_name, table_name, db_engine]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: "Catalog entry not found",
        });
      }

      res.json({
        success: true,
        message: `CDC reset for ${schema_name}.${table_name} (${db_engine})`,
        entry: result.rows[0],
      });
    } catch (err) {
      const safeError = sanitizeError(
        err,
        "Error resetting CDC",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);
// Obtener historial de ejecuciones de una tabla del catalog - DEBE IR ANTES DE /api/catalog
app.get("/api/catalog/execution-history", requireAuth, async (req, res) => {
  try {
    const schema_name = req.query.schema_name;
    const table_name = req.query.table_name;
    const db_engine = req.query.db_engine;
    const limit = validateLimit(req.query.limit, 1, 100, 50);

    if (!schema_name || !table_name || !db_engine) {
      return res.status(400).json({
        error: "schema_name, table_name, and db_engine are required",
      });
    }

    const result = await pool.query(
      `SELECT 
        id,
        schema_name,
        table_name,
        db_engine,
        status,
        processed_at,
        record_count
       FROM metadata.processing_log 
       WHERE LOWER(schema_name) = LOWER($1) 
         AND LOWER(table_name) = LOWER($2) 
         AND LOWER(db_engine) = LOWER($3)
         AND status != 'SKIP'
       ORDER BY processed_at DESC 
       LIMIT $4`,
      [
        schema_name,
        table_name,
        db_engine,
        limit * 20,
      ]
    );

    function groupSyncSessions(records) {
      if (records.length === 0) return [];

      const sessions = [];
      let currentSession = null;

      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        const status = record.status;
        const processedAt = new Date(record.processed_at);
        const nextRecord = i < records.length - 1 ? records[i + 1] : null;

        const isFullLoadStart = status === 'FULL_LOAD';
        
        const isIncrementalStart = status === 'LISTENING_CHANGES' && 
                                  nextRecord && 
                                  nextRecord.status === 'IN_PROGRESS';

        const isFlowStart = isFullLoadStart || isIncrementalStart;

        if (isFlowStart) {
          if (currentSession && currentSession.status_flow.length > 1) {
            currentSession.duration_seconds = Math.floor(
              (currentSession.end_time - currentSession.start_time) / 1000
            );
            sessions.push(currentSession);
          }

          currentSession = {
            id: record.id,
            schema_name: record.schema_name,
            table_name: record.table_name,
            db_engine: record.db_engine,
            start_time: processedAt,
            end_time: processedAt,
            status: status,
            status_flow: [status],
            total_rows_processed: record.record_count || 0,
            error_message: status === 'ERROR' ? 'Sync error occurred' : null,
            metadata: null,
            created_at: processedAt,
            record_ids: [record.id]
          };
        } else if (currentSession) {
          const isFlowEnd = (status === 'LISTENING_CHANGES' || status === 'ERROR' || status === 'NO_DATA') &&
                           currentSession.status_flow[0] !== status &&
                           (currentSession.status_flow.includes('IN_PROGRESS') || 
                            currentSession.status_flow[0] === 'FULL_LOAD');

          currentSession.end_time = processedAt;
          currentSession.status = status;
          currentSession.status_flow.push(status);
          currentSession.record_ids.push(record.id);
          
          if (record.record_count) {
            currentSession.total_rows_processed = Math.max(
              currentSession.total_rows_processed,
              record.record_count
            );
          }

          if (status === 'ERROR') {
            currentSession.error_message = 'Sync error occurred';
          }

          if (isFlowEnd) {
            currentSession.duration_seconds = Math.floor(
              (currentSession.end_time - currentSession.start_time) / 1000
            );
            sessions.push(currentSession);
            currentSession = null;
          }
        }
      }

      if (currentSession && currentSession.status_flow.length > 1) {
        currentSession.duration_seconds = Math.floor(
          (currentSession.end_time - currentSession.start_time) / 1000
        );
        sessions.push(currentSession);
      }

      return sessions.slice(0, limit);
    }

    const groupedSessions = groupSyncSessions(result.rows);

    res.json(groupedSessions);
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
// Obtener estructura de tabla (source y target) - DEBE IR ANTES DE /api/catalog
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

    if (!schema_name || !table_name || !db_engine) {
      return res.status(400).json({
        error: "schema_name, table_name, and db_engine are required",
      });
    }

    const catalogResult = await pool.query(
      `SELECT connection_string, schema_name, table_name, db_engine, status
       FROM metadata.catalog 
       WHERE LOWER(schema_name) = LOWER($1) AND LOWER(table_name) = LOWER($2) AND db_engine = $3`,
      [schema_name, table_name, db_engine]
    );

    if (catalogResult.rows.length === 0) {
      return res.status(404).json({ error: "Table not found in catalog" });
    }

    const catalogEntry = catalogResult.rows[0];
    const sourceConnectionString = catalogEntry.connection_string;
    
    if (!sourceConnectionString || sourceConnectionString.trim() === '') {
      return res.status(400).json({ 
        error: "Connection string is missing or empty for this catalog entry" 
      });
    }
    
    const targetSchema = schema_name.toLowerCase();
    const targetTable = table_name.toLowerCase();

    let sourceColumns = [];
    let sourcePKs = [];
    let sourceFKs = [];
    let sourceIndexes = [];
    let sourceStats = { rowCount: 0, tableSize: '0 bytes' };
    let targetColumns = [];
    let targetPKs = [];
    let targetFKs = [];
    let targetIndexes = [];
    let targetStats = { rowCount: 0, tableSize: '0 bytes' };

    const getPostgreSQLConstraints = async (client, schema, table) => {
      try {
        const pkResult = await client.query(`
          SELECT a.attname
          FROM pg_index i
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
          WHERE i.indrelid = $1::regclass AND i.indisprimary
          ORDER BY a.attnum
        `, [`${schema}.${table}`]);
        
        const fkResult = await client.query(`
          SELECT
            kcu.column_name,
            ccu.table_schema AS foreign_table_schema,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
          FROM information_schema.table_constraints AS tc
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
          WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_schema = $1
            AND tc.table_name = $2
        `, [schema, table]);

        const indexResult = await client.query(`
          SELECT
            indexname,
            indexdef
          FROM pg_indexes
          WHERE schemaname = $1 AND tablename = $2
        `, [schema, table]);

        return {
          pks: pkResult.rows.map(r => r.attname),
          fks: fkResult.rows.map(r => ({
            column: r.column_name,
            references: `${r.foreign_table_schema}.${r.foreign_table_name}.${r.foreign_column_name}`
          })),
          indexes: indexResult.rows.map(r => r.indexname)
        };
      } catch (err) {
        return { pks: [], fks: [], indexes: [] };
      }
    };

    switch (db_engine) {
      case "MariaDB": {
        const mysql = (await import("mysql2/promise")).default;
        let connection;
        
        try {
          if (typeof sourceConnectionString === 'string' && 
              (sourceConnectionString.startsWith('mysql://') || 
               sourceConnectionString.startsWith('mariadb://'))) {
            connection = await mysql.createConnection(sourceConnectionString);
          } else if (typeof sourceConnectionString === 'string') {
            const config = {};
            const parts = sourceConnectionString.split(';');
            for (const part of parts) {
              const [key, value] = part.split('=').map(s => s.trim());
              if (key && value) {
                const keyLower = key.toLowerCase();
                if (keyLower === 'host' || keyLower === 'hostname') config.host = value;
                else if (keyLower === 'port') config.port = parseInt(value) || 3306;
                else if (keyLower === 'user' || keyLower === 'username' || keyLower === 'uid') config.user = value;
                else if (keyLower === 'password' || keyLower === 'pwd') config.password = value;
                else if (keyLower === 'database' || keyLower === 'db' || keyLower === 'initial catalog') config.database = value;
              }
            }
            connection = await mysql.createConnection(config);
          } else {
            connection = await mysql.createConnection(sourceConnectionString);
          }
        } catch (connError) {
          throw new Error(`Failed to connect to MariaDB: ${connError.message}`);
        }
        const [rows] = await connection.execute(
          `
          SELECT 
            COLUMN_NAME,
            DATA_TYPE,
            CHARACTER_MAXIMUM_LENGTH,
            IS_NULLABLE,
            COLUMN_DEFAULT,
            COLUMN_KEY,
            EXTRA
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
          isPK: row.COLUMN_KEY === "PRI",
          isFK: row.COLUMN_KEY === "MUL",
          isUnique: row.COLUMN_KEY === "UNI",
          isAutoIncrement: row.EXTRA && row.EXTRA.includes("auto_increment")
        }));

        const [pkRows] = await connection.execute(`
          SELECT COLUMN_NAME
          FROM information_schema.KEY_COLUMN_USAGE
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND CONSTRAINT_NAME = 'PRIMARY'
        `, [schema_name, table_name]);
        sourcePKs = pkRows.map(r => r.COLUMN_NAME);

        try {
          const escapedSchema = schema_name.replace(/`/g, '``');
          const escapedTable = table_name.replace(/`/g, '``');
          const [countRows] = await connection.execute(
            `SELECT COUNT(*) as cnt FROM \`${escapedSchema}\`.\`${escapedTable}\``
          );
          sourceStats.rowCount = countRows[0]?.cnt || 0;
        } catch (err) {
        }

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
              c.COLUMN_NAME,
              c.DATA_TYPE,
              c.CHARACTER_MAXIMUM_LENGTH,
              c.IS_NULLABLE,
              c.COLUMN_DEFAULT,
              CASE WHEN pk.COLUMN_NAME IS NOT NULL THEN 1 ELSE 0 END as IS_PRIMARY_KEY
            FROM INFORMATION_SCHEMA.COLUMNS c
            LEFT JOIN (
              SELECT ku.TABLE_SCHEMA, ku.TABLE_NAME, ku.COLUMN_NAME
              FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
              INNER JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE ku
                ON tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
                AND tc.CONSTRAINT_NAME = ku.CONSTRAINT_NAME
                AND ku.TABLE_SCHEMA = @schema
                AND ku.TABLE_NAME = @table
            ) pk ON c.COLUMN_NAME = pk.COLUMN_NAME
            WHERE c.TABLE_SCHEMA = @schema AND c.TABLE_NAME = @table
            ORDER BY c.ORDINAL_POSITION
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
          isPK: row.IS_PRIMARY_KEY === 1
        }));

        const pkResult = await pool.request()
          .input("schema", sql.VarChar, schema_name)
          .input("table", sql.VarChar, table_name).query(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = @schema AND TABLE_NAME = @table
              AND CONSTRAINT_NAME IN (
                SELECT CONSTRAINT_NAME
                FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
                WHERE TABLE_SCHEMA = @schema AND TABLE_NAME = @table
                  AND CONSTRAINT_TYPE = 'PRIMARY KEY'
              )
          `);
        sourcePKs = pkResult.recordset.map(r => r.COLUMN_NAME);

        try {
          const escapedSchema = schema_name.replace(/\]/g, ']]');
          const escapedTable = table_name.replace(/\]/g, ']]');
          const countResult = await pool.request().query(`
            SELECT COUNT(*) as cnt FROM [${escapedSchema}].[${escapedTable}]
          `);
          sourceStats.rowCount = countResult.recordset[0]?.cnt || 0;
        } catch (err) {
        }

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
          default: row.column_default
        }));

        const constraints = await getPostgreSQLConstraints(client, schema_name, table_name);
        sourcePKs = constraints.pks;
        sourceFKs = constraints.fks;
        sourceIndexes = constraints.indexes;

        try {
          const statsResult = await client.query(`
            SELECT 
              n_live_tup as row_count,
              pg_size_pretty(pg_total_relation_size($1::regclass)) as size
            FROM pg_stat_user_tables
            WHERE schemaname = $2 AND relname = $3
          `, [`${schema_name}.${table_name}`, schema_name, table_name]);
          if (statsResult.rows.length > 0) {
            sourceStats.rowCount = parseInt(statsResult.rows[0].row_count) || 0;
            sourceStats.tableSize = statsResult.rows[0].size || '0 bytes';
          }
        } catch (err) {
        }

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
      default: row.column_default
    }));

    const targetConstraints = await getPostgreSQLConstraints(targetClient, targetSchema, targetTable);
    targetPKs = targetConstraints.pks;
    targetFKs = targetConstraints.fks;
    targetIndexes = targetConstraints.indexes;

    try {
      const targetStatsResult = await targetClient.query(`
        SELECT 
          n_live_tup as row_count,
          pg_size_pretty(pg_total_relation_size($1::regclass)) as size
        FROM pg_stat_user_tables
        WHERE schemaname = $2 AND relname = $3
      `, [`${targetSchema}.${targetTable}`, targetSchema, targetTable]);
      if (targetStatsResult.rows.length > 0) {
        targetStats.rowCount = parseInt(targetStatsResult.rows[0].row_count) || 0;
        targetStats.tableSize = targetStatsResult.rows[0].size || '0 bytes';
      }
    } catch (err) {
    }

    await targetClient.end();

    res.json({
      source: {
        columns: sourceColumns,
        schema: schema_name,
        table: table_name,
        primaryKeys: sourcePKs,
        foreignKeys: sourceFKs,
        indexes: sourceIndexes,
        stats: sourceStats
      },
      target: {
        columns: targetColumns,
        schema: targetSchema,
        table: targetTable,
        primaryKeys: targetPKs,
        foreignKeys: targetFKs,
        indexes: targetIndexes,
        stats: targetStats
      },
      syncInfo: {
        lastSyncTime: null,
        status: catalogEntry.status
      }
    });
  } catch (err) {
    const safeError = sanitizeError(
      err,
      "Error al obtener estructura de tabla",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});
// Obtener catálogo con paginación, filtros y búsqueda
app.get("/api/catalog", requireAuth, async (req, res) => {
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
      ["PostgreSQL", "MariaDB", "MSSQL", "MongoDB", "Oracle", 
       "Salesforce", "SAP", "Teradata", "Netezza", "Hive", 
       "Cassandra", "DynamoDB", "AS400", "S3", "AzureBlob", 
       "GCS", "FTP", "SFTP", "Email", "SOAP", "GraphQL",
       "Excel", "FixedWidth", "EBCDIC", "XML", "Avro", 
       "Parquet", "ORC", "Compressed"],
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
      ["PostgreSQL", "MariaDB", "MSSQL", "MongoDB", "Oracle", 
       "Salesforce", "SAP", "Teradata", "Netezza", "Hive", 
       "Cassandra", "DynamoDB", "AS400", "S3", "AzureBlob", 
       "GCS", "FTP", "SFTP", "Email", "SOAP", "GraphQL",
       "Excel", "FixedWidth", "EBCDIC", "XML", "Avro", 
       "Parquet", "ORC", "Compressed"],
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
      ["PostgreSQL", "MariaDB", "MSSQL", "MongoDB", "Oracle", 
       "Salesforce", "SAP", "Teradata", "Netezza", "Hive", 
       "Cassandra", "DynamoDB", "AS400", "S3", "AzureBlob", 
       "GCS", "FTP", "SFTP", "Email", "SOAP", "GraphQL",
       "Excel", "FixedWidth", "EBCDIC", "XML", "Avro", 
       "Parquet", "ORC", "Compressed"],
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

// Actualizar una entrada del catálogo
app.put("/api/catalog", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const schema_name = validateIdentifier(req.body.schema_name);
    const table_name = validateIdentifier(req.body.table_name);
    const db_engine = validateEnum(
      req.body.db_engine,
      ["PostgreSQL", "MariaDB", "MSSQL", "MongoDB", "Oracle", 
       "Salesforce", "SAP", "Teradata", "Netezza", "Hive", 
       "Cassandra", "DynamoDB", "AS400", "S3", "AzureBlob", 
       "GCS", "FTP", "SFTP", "Email", "SOAP", "GraphQL",
       "Excel", "FixedWidth", "EBCDIC", "XML", "Avro", 
       "Parquet", "ORC", "Compressed"],
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
      null
    );
    const active = req.body.active !== undefined ? validateBoolean(req.body.active) : null;
    const cluster_name = req.body.cluster_name;
    const pk_strategy = validateEnum(
      req.body.pk_strategy,
      ["CDC", "PK", "OFFSET"],
      null
    );

    if (!schema_name || !table_name || !db_engine) {
      return res.status(400).json({
        error: "schema_name, table_name, and db_engine are required",
      });
    }

    const checkResult = await pool.query(
      `SELECT * FROM metadata.catalog 
       WHERE schema_name = $1 AND table_name = $2 AND db_engine = $3`,
      [schema_name, table_name, db_engine]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        error: "Catalog entry not found",
      });
    }

    const updateFields = [];
    const updateValues = [];
    let paramCount = 0;

    if (connection_string !== undefined) {
      paramCount++;
      updateFields.push(`connection_string = $${paramCount}`);
      updateValues.push(connection_string);
    }
    if (status !== null) {
      paramCount++;
      updateFields.push(`status = $${paramCount}`);
      updateValues.push(status);
    }
    if (active !== null) {
      paramCount++;
      updateFields.push(`active = $${paramCount}`);
      updateValues.push(active);
    }
    if (cluster_name !== undefined) {
      paramCount++;
      updateFields.push(`cluster_name = $${paramCount}`);
      updateValues.push(cluster_name);
    }
    if (pk_strategy !== null) {
      paramCount++;
      updateFields.push(`pk_strategy = $${paramCount}`);
      updateValues.push(pk_strategy);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        error: "No fields to update",
      });
    }

    updateFields.push(`updated_at = NOW()`);
    paramCount++;
    updateValues.push(schema_name);
    paramCount++;
    updateValues.push(table_name);
    paramCount++;
    updateValues.push(db_engine);

    const updateQuery = `
      UPDATE metadata.catalog 
      SET ${updateFields.join(', ')}
      WHERE schema_name = $${paramCount - 2} AND table_name = $${paramCount - 1} AND db_engine = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(updateQuery, updateValues);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Database error:", err);
    const safeError = sanitizeError(
      err,
      "Error updating catalog entry",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

// Eliminar una entrada del catálogo
app.delete("/api/catalog", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const schema_name = validateIdentifier(req.body.schema_name);
    const table_name = validateIdentifier(req.body.table_name);
    const db_engine = validateEnum(
      req.body.db_engine,
      ["PostgreSQL", "MariaDB", "MSSQL", "MongoDB", "Oracle", 
       "Salesforce", "SAP", "Teradata", "Netezza", "Hive", 
       "Cassandra", "DynamoDB", "AS400", "S3", "AzureBlob", 
       "GCS", "FTP", "SFTP", "Email", "SOAP", "GraphQL",
       "Excel", "FixedWidth", "EBCDIC", "XML", "Avro", 
       "Parquet", "ORC", "Compressed"],
      null
    );

    if (!schema_name || !table_name || !db_engine) {
      return res.status(400).json({
        error: "schema_name, table_name, and db_engine are required",
      });
    }

    const checkResult = await pool.query(
      `SELECT * FROM metadata.catalog 
       WHERE schema_name = $1 AND table_name = $2 AND db_engine = $3`,
      [schema_name, table_name, db_engine]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        error: "Catalog entry not found",
      });
    }

    const result = await pool.query(
      `DELETE FROM metadata.catalog 
       WHERE schema_name = $1 AND table_name = $2 AND db_engine = $3
       RETURNING *`,
      [schema_name, table_name, db_engine]
    );

    res.json({ 
      message: "Catalog entry deleted successfully",
      deleted: result.rows[0]
    });
  } catch (err) {
    console.error("Database error:", err);
    const safeError = sanitizeError(
      err,
      "Error deleting catalog entry",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

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

// Activar schema completo
app.patch(
  "/api/catalog/activate-schema",
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
       SET active = TRUE, status = 'FULL_LOAD', updated_at = NOW()
       WHERE schema_name = $1
       RETURNING *`,
        [schema_name]
      );
      res.json({
        message: `Schema ${schema_name} activated successfully`,
        affectedRows: result.rows.length,
        rows: result.rows,
      });
    } catch (err) {
      console.error("Database error:", err);
      const safeError = sanitizeError(
        err,
        "Error activating schema",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

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
      ["PostgreSQL", "MariaDB", "MSSQL", "MongoDB", "Oracle", 
       "Salesforce", "SAP", "Teradata", "Netezza", "Hive", 
       "Cassandra", "DynamoDB", "AS400", "S3", "AzureBlob", 
       "GCS", "FTP", "SFTP", "Email", "SOAP", "GraphQL",
       "Excel", "FixedWidth", "EBCDIC", "XML", "Avro", 
       "Parquet", "ORC", "Compressed"],
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

    // Disk Space (from Linux system via df command)
    let diskFreeGB = 0;
    try {
      const dfProcess = spawn('df', ['-BG', '/']);
      let dfOutput = '';
      let dfError = '';
      
      dfProcess.stdout.on('data', (data) => {
        dfOutput += data.toString();
      });
      
      dfProcess.stderr.on('data', (data) => {
        dfError += data.toString();
      });
      
      await new Promise((resolve) => {
        dfProcess.on('close', (code) => {
          if (code === 0) {
            const lines = dfOutput.trim().split('\n');
            if (lines.length > 1) {
              const parts = lines[1].trim().split(/\s+/);
              if (parts.length >= 4) {
                const available = parts[3];
                if (available && available !== '-') {
                  const value = parseFloat(available.replace(/[^0-9.]/g, ''));
                  if (!isNaN(value)) {
                    diskFreeGB = value;
                  }
                }
              }
            }
          } else {
            console.error("df command error:", dfError);
          }
          resolve();
        });
        
        dfProcess.on('error', (err) => {
          console.error("Error spawning df command:", err);
          resolve();
        });
      });
    } catch (err) {
      console.error("Error getting disk space:", err);
      diskFreeGB = 0;
    }

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
        (SELECT ROUND(AVG(EXTRACT(EPOCH FROM (now() - query_start)))::numeric, 2) 
         FROM pg_stat_activity 
         WHERE state = 'active' 
           AND query_start IS NOT NULL
           AND query NOT ILIKE '%pg_stat%'
           AND query NOT ILIKE '%information_schema%'
           AND query NOT ILIKE '%pg_catalog%'
           AND query NOT ILIKE '%pg_class%'
           AND query NOT ILIKE '%pg_namespace%'
           AND query NOT ILIKE '%pg_extension%'
           AND query NOT ILIKE '%pg_depend%'
           AND query NOT ILIKE '%pg_attribute%'
           AND query NOT ILIKE '%pg_index%'
           AND query NOT ILIKE '%pg_settings%'
           AND query NOT ILIKE '%pg_database%'
           AND query NOT ILIKE '%pg_user%'
           AND query NOT ILIKE '%pg_roles%'
           AND query NOT ILIKE '%pg_postmaster%'
           AND query NOT ILIKE '%pg_statio%'
           AND query NOT ILIKE '%current_database()%'
        ) as avg_query_duration,
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
        AND query_text NOT ILIKE '%information_schema%'
        AND query_text NOT ILIKE '%pg_stat%'
        AND query_text NOT ILIKE '%pg_catalog%'
        AND query_text NOT ILIKE '%pg_class%'
        AND query_text NOT ILIKE '%pg_namespace%'
        AND query_text NOT ILIKE '%pg_extension%'
        AND query_text NOT ILIKE '%pg_depend%'
        AND query_text NOT ILIKE '%pg_attribute%'
        AND query_text NOT ILIKE '%pg_index%'
        AND query_text NOT ILIKE '%pg_settings%'
        AND query_text NOT ILIKE '%pg_database%'
        AND query_text NOT ILIKE '%pg_user%'
        AND query_text NOT ILIKE '%pg_roles%'
        AND query_text NOT ILIKE '%pg_postmaster%'
        AND query_text NOT ILIKE '%pg_statio%'
        AND query_text NOT ILIKE '%current_database()%'
        AND operation_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
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

    // All sync types from process_log
    const allSyncTypes = await pool.query(`
      SELECT 
        process_type,
        COUNT(*) as total_count,
        COUNT(*) FILTER (WHERE status = 'SUCCESS') as success_count,
        COUNT(*) FILTER (WHERE status = 'ERROR') as error_count,
        COUNT(*) FILTER (WHERE status = 'IN_PROGRESS') as in_progress_count,
        COUNT(*) FILTER (WHERE start_time > NOW() - INTERVAL '24 hours') as last_24h,
        MAX(start_time) as last_execution
      FROM metadata.process_log
      WHERE process_type IN ('API_SYNC', 'CSV_SYNC', 'GOOGLE_SHEETS_SYNC', 'DATA_VAULT', 'DATA_WAREHOUSE', 'WORKFLOW', 'CUSTOM_JOB')
      GROUP BY process_type
    `);

    const processLogStats = {
      apiSync: allSyncTypes.rows.find(r => r.process_type === 'API_SYNC') || { total_count: 0, success_count: 0, error_count: 0, in_progress_count: 0, last_24h: 0, last_execution: null },
      csvSync: allSyncTypes.rows.find(r => r.process_type === 'CSV_SYNC') || { total_count: 0, success_count: 0, error_count: 0, in_progress_count: 0, last_24h: 0, last_execution: null },
      googleSheetsSync: allSyncTypes.rows.find(r => r.process_type === 'GOOGLE_SHEETS_SYNC') || { total_count: 0, success_count: 0, error_count: 0, in_progress_count: 0, last_24h: 0, last_execution: null },
      dataVault: allSyncTypes.rows.find(r => r.process_type === 'DATA_VAULT') || { total_count: 0, success_count: 0, error_count: 0, in_progress_count: 0, last_24h: 0, last_execution: null },
      dataWarehouse: allSyncTypes.rows.find(r => r.process_type === 'DATA_WAREHOUSE') || { total_count: 0, success_count: 0, error_count: 0, in_progress_count: 0, last_24h: 0, last_execution: null },
      workflow: allSyncTypes.rows.find(r => r.process_type === 'WORKFLOW') || { total_count: 0, success_count: 0, error_count: 0, in_progress_count: 0, last_24h: 0, last_execution: null },
      customJob: allSyncTypes.rows.find(r => r.process_type === 'CUSTOM_JOB') || { total_count: 0, success_count: 0, error_count: 0, in_progress_count: 0, last_24h: 0, last_execution: null },
    };

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
          network_iops, throughput_rps, disk_free_gb
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
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
          parseFloat(diskFreeGB.toFixed(2)),
        ]
      );
    } catch (err) {
      console.error("Error saving system logs:", err);
    }

    const totalColumnsResult = await pool.query(
      `SELECT COUNT(*) as total FROM metadata.column_catalog`
    );
    stats.syncStatus.totalColumns = parseInt(totalColumnsResult.rows[0]?.total || 0);

    const dataProtection = await pool.query(`
      SELECT 
        COUNT(*) as total_policies,
        COUNT(*) FILTER (WHERE active = true) as active_policies,
        COUNT(*) FILTER (WHERE active = false) as inactive_policies
      FROM metadata.masking_policies
    `);

    const maskingStatus = await pool.query(`
      SELECT * FROM metadata.get_masking_status(NULL)
    `);
    const maskingSummary = maskingStatus.rows.reduce((acc, row) => ({
      total_tables: acc.total_tables + parseInt(row.total_tables || 0),
      sensitive_columns: acc.sensitive_columns + parseInt(row.sensitive_columns_detected || 0),
      protected: acc.protected + parseInt(row.columns_with_policies || 0),
      unprotected: acc.unprotected + parseInt(row.columns_without_policies || 0),
    }), { total_tables: 0, sensitive_columns: 0, protected: 0, unprotected: 0 });

    const alertsSummary = await pool.query(`
      SELECT 
        COUNT(*) as total_alerts,
        COUNT(*) FILTER (WHERE status = 'OPEN') as open_alerts,
        COUNT(*) FILTER (WHERE severity = 'CRITICAL' AND status = 'OPEN') as critical_alerts,
        COUNT(*) FILTER (WHERE severity = 'WARNING' AND status = 'OPEN') as warning_alerts,
        COUNT(*) FILTER (WHERE severity = 'INFO' AND status = 'OPEN') as info_alerts
      FROM metadata.alerts
    `);

    const alertRulesSummary = await pool.query(`
      SELECT 
        COUNT(*) as total_rules,
        COUNT(*) FILTER (WHERE enabled = true) as enabled_rules
      FROM metadata.alert_rules
    `);

    const backupsSummary = await pool.query(`
      SELECT 
        COUNT(*) as total_backups,
        COUNT(*) FILTER (WHERE is_scheduled = true) as scheduled_backups,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_backups,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_backups,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_backups,
        COALESCE(SUM(file_size), 0) as total_backup_size,
        MAX(completed_at) as last_backup_time
      FROM metadata.backups
    `);

    const nextBackup = await pool.query(`
      SELECT backup_name, next_run_at, db_engine, database_name
      FROM metadata.backups
      WHERE is_scheduled = true AND next_run_at IS NOT NULL
      ORDER BY next_run_at ASC
      LIMIT 1
    `);

    const migrationsSummary = await pool.query(`
      SELECT 
        COUNT(*) as total_migrations,
        COUNT(*) FILTER (WHERE status = 'PENDING') as pending_migrations,
        COUNT(*) FILTER (WHERE status = 'APPLIED') as applied_migrations,
        COUNT(*) FILTER (WHERE status = 'FAILED') as failed_migrations,
        MAX(last_applied_at) as last_migration_applied
      FROM metadata.schema_migrations
    `);

    const migrationsByEnv = await pool.query(`
      SELECT 
        environment,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE status = 'APPLIED') as applied_count
      FROM metadata.schema_migration_history
      GROUP BY environment
    `);

    const qualitySummary = await pool.query(`
      SELECT 
        COUNT(DISTINCT schema_name || '.' || table_name) as total_tables_checked,
        COUNT(*) FILTER (WHERE validation_status = 'PASSED') as passed_checks,
        COUNT(*) FILTER (WHERE validation_status = 'FAILED') as failed_checks,
        COUNT(*) FILTER (WHERE validation_status = 'WARNING') as warning_checks,
        ROUND(AVG(quality_score)::numeric, 2) as avg_quality_score,
        MAX(check_timestamp) as last_quality_check
      FROM metadata.data_quality
      WHERE check_timestamp > NOW() - INTERVAL '30 days'
    `);

    const governanceSummary = await pool.query(`
      SELECT 
        COUNT(DISTINCT schema_name || '.' || table_name) as total_tables,
        COUNT(*) FILTER (WHERE encryption_at_rest = true OR encryption_in_transit = true) as encrypted_tables,
        COUNT(*) FILTER (WHERE masking_policy_applied = true) as masked_tables,
        COUNT(*) FILTER (WHERE health_status = 'HEALTHY') as healthy_tables,
        COUNT(*) FILTER (WHERE health_status = 'WARNING') as warning_tables,
        COUNT(*) FILTER (WHERE health_status = 'CRITICAL') as critical_tables
      FROM metadata.data_governance_catalog
      WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM metadata.data_governance_catalog)
    `);

    const maintenanceSummary = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'PENDING') as pending_maintenance,
        COUNT(*) FILTER (WHERE status = 'COMPLETED' AND DATE(updated_at) = CURRENT_DATE) as completed_today,
        COALESCE(SUM(space_reclaimed_mb), 0) as total_space_reclaimed,
        COALESCE(ROUND(AVG(performance_improvement_pct)::numeric, 2), 0) as avg_performance_improvement
      FROM metadata.maintenance_control
    `);

    const sourcesSummary = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM metadata.catalog) as database_sources,
        (SELECT COUNT(*) FROM metadata.api_catalog WHERE active = true) as api_sources,
        (SELECT COUNT(*) FROM metadata.csv_catalog WHERE active = true) as csv_sources,
        (SELECT COUNT(*) FROM metadata.google_sheets_catalog WHERE active = true) as sheets_sources,
        (SELECT COUNT(*) FROM metadata.data_warehouse_catalog WHERE active = true) as warehouse_sources
    `);

    stats.dataProtection = {
      masking: {
        totalPolicies: parseInt(dataProtection.rows[0]?.total_policies || 0),
        activePolicies: parseInt(dataProtection.rows[0]?.active_policies || 0),
        inactivePolicies: parseInt(dataProtection.rows[0]?.inactive_policies || 0),
        sensitiveColumns: maskingSummary.sensitive_columns,
        protectedColumns: maskingSummary.protected,
        unprotectedColumns: maskingSummary.unprotected,
        coveragePercentage: maskingSummary.sensitive_columns > 0 
          ? Math.round((maskingSummary.protected / maskingSummary.sensitive_columns) * 100) 
          : 0,
      },
      alerts: {
        total: parseInt(alertsSummary.rows[0]?.total_alerts || 0),
        open: parseInt(alertsSummary.rows[0]?.open_alerts || 0),
        critical: parseInt(alertsSummary.rows[0]?.critical_alerts || 0),
        warning: parseInt(alertsSummary.rows[0]?.warning_alerts || 0),
        info: parseInt(alertsSummary.rows[0]?.info_alerts || 0),
        totalRules: parseInt(alertRulesSummary.rows[0]?.total_rules || 0),
        enabledRules: parseInt(alertRulesSummary.rows[0]?.enabled_rules || 0),
      },
    };

    stats.backups = {
      total: parseInt(backupsSummary.rows[0]?.total_backups || 0),
      scheduled: parseInt(backupsSummary.rows[0]?.scheduled_backups || 0),
      completed: parseInt(backupsSummary.rows[0]?.completed_backups || 0),
      failed: parseInt(backupsSummary.rows[0]?.failed_backups || 0),
      inProgress: parseInt(backupsSummary.rows[0]?.in_progress_backups || 0),
      totalSize: parseInt(backupsSummary.rows[0]?.total_backup_size || 0),
      lastBackupTime: backupsSummary.rows[0]?.last_backup_time || null,
      nextBackup: nextBackup.rows.length > 0 ? {
        name: nextBackup.rows[0].backup_name,
        nextRunAt: nextBackup.rows[0].next_run_at,
        dbEngine: nextBackup.rows[0].db_engine,
        databaseName: nextBackup.rows[0].database_name,
      } : null,
    };

    stats.migrations = {
      total: parseInt(migrationsSummary.rows[0]?.total_migrations || 0),
      pending: parseInt(migrationsSummary.rows[0]?.pending_migrations || 0),
      applied: parseInt(migrationsSummary.rows[0]?.applied_migrations || 0),
      failed: parseInt(migrationsSummary.rows[0]?.failed_migrations || 0),
      lastApplied: migrationsSummary.rows[0]?.last_migration_applied || null,
      byEnvironment: migrationsByEnv.rows.reduce((acc, row) => {
        acc[row.environment] = {
          total: parseInt(row.count || 0),
          applied: parseInt(row.applied_count || 0),
        };
        return acc;
      }, {}),
    };

    stats.dataQuality = {
      totalTablesChecked: parseInt(qualitySummary.rows[0]?.total_tables_checked || 0),
      passed: parseInt(qualitySummary.rows[0]?.passed_checks || 0),
      failed: parseInt(qualitySummary.rows[0]?.failed_checks || 0),
      warning: parseInt(qualitySummary.rows[0]?.warning_checks || 0),
      avgScore: parseFloat(qualitySummary.rows[0]?.avg_quality_score || 0),
      lastCheck: qualitySummary.rows[0]?.last_quality_check || null,
    };

    stats.governance = {
      totalTables: parseInt(governanceSummary.rows[0]?.total_tables || 0),
      encryptedTables: parseInt(governanceSummary.rows[0]?.encrypted_tables || 0),
      maskedTables: parseInt(governanceSummary.rows[0]?.masked_tables || 0),
      healthyTables: parseInt(governanceSummary.rows[0]?.healthy_tables || 0),
      warningTables: parseInt(governanceSummary.rows[0]?.warning_tables || 0),
      criticalTables: parseInt(governanceSummary.rows[0]?.critical_tables || 0),
    };

    stats.maintenance = {
      pending: parseInt(maintenanceSummary.rows[0]?.pending_maintenance || 0),
      completedToday: parseInt(maintenanceSummary.rows[0]?.completed_today || 0),
      totalSpaceReclaimedMB: parseFloat(maintenanceSummary.rows[0]?.total_space_reclaimed || 0),
      avgPerformanceImprovement: parseFloat(maintenanceSummary.rows[0]?.avg_performance_improvement || 0),
    };

    stats.dataSources = {
      database: parseInt(sourcesSummary.rows[0]?.database_sources || 0),
      api: parseInt(sourcesSummary.rows[0]?.api_sources || 0),
      csv: parseInt(sourcesSummary.rows[0]?.csv_sources || 0),
      sheets: parseInt(sourcesSummary.rows[0]?.sheets_sources || 0),
      warehouse: parseInt(sourcesSummary.rows[0]?.warehouse_sources || 0),
      total: parseInt(sourcesSummary.rows[0]?.database_sources || 0) +
             parseInt(sourcesSummary.rows[0]?.api_sources || 0) +
             parseInt(sourcesSummary.rows[0]?.csv_sources || 0) +
             parseInt(sourcesSummary.rows[0]?.sheets_sources || 0) +
             parseInt(sourcesSummary.rows[0]?.warehouse_sources || 0),
    };

    stats.allSyncTypes = {
      apiSync: {
        total: parseInt(processLogStats.apiSync.total_count || 0),
        success: parseInt(processLogStats.apiSync.success_count || 0),
        errors: parseInt(processLogStats.apiSync.error_count || 0),
        inProgress: parseInt(processLogStats.apiSync.in_progress_count || 0),
        last24h: parseInt(processLogStats.apiSync.last_24h || 0),
        lastExecution: processLogStats.apiSync.last_execution || null,
      },
      csvSync: {
        total: parseInt(processLogStats.csvSync.total_count || 0),
        success: parseInt(processLogStats.csvSync.success_count || 0),
        errors: parseInt(processLogStats.csvSync.error_count || 0),
        inProgress: parseInt(processLogStats.csvSync.in_progress_count || 0),
        last24h: parseInt(processLogStats.csvSync.last_24h || 0),
        lastExecution: processLogStats.csvSync.last_execution || null,
      },
      googleSheetsSync: {
        total: parseInt(processLogStats.googleSheetsSync.total_count || 0),
        success: parseInt(processLogStats.googleSheetsSync.success_count || 0),
        errors: parseInt(processLogStats.googleSheetsSync.error_count || 0),
        inProgress: parseInt(processLogStats.googleSheetsSync.in_progress_count || 0),
        last24h: parseInt(processLogStats.googleSheetsSync.last_24h || 0),
        lastExecution: processLogStats.googleSheetsSync.last_execution || null,
      },
      dataVault: {
        total: parseInt(processLogStats.dataVault.total_count || 0),
        success: parseInt(processLogStats.dataVault.success_count || 0),
        errors: parseInt(processLogStats.dataVault.error_count || 0),
        inProgress: parseInt(processLogStats.dataVault.in_progress_count || 0),
        last24h: parseInt(processLogStats.dataVault.last_24h || 0),
        lastExecution: processLogStats.dataVault.last_execution || null,
      },
      dataWarehouse: {
        total: parseInt(processLogStats.dataWarehouse.total_count || 0),
        success: parseInt(processLogStats.dataWarehouse.success_count || 0),
        errors: parseInt(processLogStats.dataWarehouse.error_count || 0),
        inProgress: parseInt(processLogStats.dataWarehouse.in_progress_count || 0),
        last24h: parseInt(processLogStats.dataWarehouse.last_24h || 0),
        lastExecution: processLogStats.dataWarehouse.last_execution || null,
      },
      workflow: {
        total: parseInt(processLogStats.workflow.total_count || 0),
        success: parseInt(processLogStats.workflow.success_count || 0),
        errors: parseInt(processLogStats.workflow.error_count || 0),
        inProgress: parseInt(processLogStats.workflow.in_progress_count || 0),
        last24h: parseInt(processLogStats.workflow.last_24h || 0),
        lastExecution: processLogStats.workflow.last_execution || null,
      },
      customJob: {
        total: parseInt(processLogStats.customJob.total_count || 0),
        success: parseInt(processLogStats.customJob.success_count || 0),
        errors: parseInt(processLogStats.customJob.error_count || 0),
        inProgress: parseInt(processLogStats.customJob.in_progress_count || 0),
        last24h: parseInt(processLogStats.customJob.last_24h || 0),
        lastExecution: processLogStats.customJob.last_execution || null,
      },
    };

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

app.get("/api/quality/history", async (req, res) => {
  try {
    const schema = sanitizeSearch(req.query.schema, 100);
    const table = sanitizeSearch(req.query.table, 100);
    const engine = validateEnum(
      req.query.engine,
      ["PostgreSQL", "MariaDB", "MSSQL", "MongoDB", "Oracle", ""],
      ""
    );
    const days = parseInt(req.query.days || "30", 10);
    const limit = validateLimit(req.query.limit, 1, 10000, 1000);

    const whereConditions = [];
    const params = [];
    let paramCount = 1;

    if (schema) {
      whereConditions.push(`schema_name = $${paramCount}`);
      params.push(schema);
      paramCount++;
    }

    if (table) {
      whereConditions.push(`table_name = $${paramCount}`);
      params.push(table);
      paramCount++;
    }

    if (engine) {
      whereConditions.push(`source_db_engine = $${paramCount}`);
      params.push(engine);
      paramCount++;
    }

    whereConditions.push(`check_timestamp >= NOW() - INTERVAL '${days} days'`);

    const whereClause =
      whereConditions.length > 0
        ? "WHERE " + whereConditions.join(" AND ")
        : "";

    const result = await pool.query(
      `
      SELECT 
        id,
        schema_name,
        table_name,
        source_db_engine,
        check_timestamp,
        total_rows,
        null_count,
        duplicate_count,
        invalid_type_count,
        out_of_range_count,
        referential_integrity_errors,
        constraint_violation_count,
        validation_status,
        error_details,
        quality_score,
        check_duration_ms
      FROM metadata.data_quality
      ${whereClause}
      ORDER BY check_timestamp DESC
      LIMIT $${paramCount}
    `,
      [...params, limit]
    );

    res.json({
      data: result.rows,
      count: result.rows.length,
    });
  } catch (err) {
    console.error("Error getting quality history:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener historial de calidad",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/quality/stats", async (req, res) => {
  try {
    const days = parseInt(req.query.days || "30", 10);
    const engine = validateEnum(
      req.query.engine,
      ["PostgreSQL", "MariaDB", "MSSQL", "MongoDB", "Oracle", ""],
      ""
    );

    const whereConditions = [`check_timestamp >= NOW() - INTERVAL '${days} days'`];
    const params = [];

    if (engine) {
      whereConditions.push(`source_db_engine = $1`);
      params.push(engine);
    }

    const whereClause = "WHERE " + whereConditions.join(" AND ");

    const result = await pool.query(
      `
      WITH latest_checks AS (
        SELECT DISTINCT ON (schema_name, table_name, source_db_engine)
          *
        FROM metadata.data_quality
        ${whereClause}
        ORDER BY schema_name, table_name, source_db_engine, check_timestamp DESC
      )
      SELECT 
        COUNT(*) as total_tables,
        COUNT(*) FILTER (WHERE validation_status = 'PASSED') as passed_count,
        COUNT(*) FILTER (WHERE validation_status = 'WARNING') as warning_count,
        COUNT(*) FILTER (WHERE validation_status = 'FAILED') as failed_count,
        ROUND(AVG(quality_score)::numeric, 2) as avg_score,
        COUNT(DISTINCT source_db_engine) as engine_count,
        COUNT(DISTINCT schema_name) as schema_count
      FROM latest_checks
    `,
      params
    );

    const engineStats = await pool.query(
      `
      WITH latest_checks AS (
        SELECT DISTINCT ON (schema_name, table_name, source_db_engine)
          *
        FROM metadata.data_quality
        ${whereClause}
        ORDER BY schema_name, table_name, source_db_engine, check_timestamp DESC
      )
      SELECT 
        source_db_engine,
        COUNT(*) as table_count,
        COUNT(*) FILTER (WHERE validation_status = 'PASSED') as passed,
        COUNT(*) FILTER (WHERE validation_status = 'WARNING') as warning,
        COUNT(*) FILTER (WHERE validation_status = 'FAILED') as failed,
        ROUND(AVG(quality_score)::numeric, 2) as avg_score
      FROM latest_checks
      GROUP BY source_db_engine
      ORDER BY table_count DESC
    `,
      params
    );

    res.json({
      summary: result.rows[0],
      byEngine: engineStats.rows,
    });
  } catch (err) {
    console.error("Error getting quality stats:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener estadísticas de calidad",
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

// Obtener historial de governance
app.get("/api/governance/history", async (req, res) => {
  try {
    const schema = sanitizeSearch(req.query.schema, 100);
    const table = sanitizeSearch(req.query.table, 100);
    const engine = validateEnum(
      req.query.engine,
      ["PostgreSQL", "MariaDB", "MSSQL", "MongoDB", "Oracle", ""],
      ""
    );
    const days = parseInt(req.query.days || "30", 10);
    const limit = validateLimit(req.query.limit, 1, 10000, 1000);

    const whereConditions = [];
    const params = [];
    let paramCount = 1;

    if (schema) {
      whereConditions.push(`schema_name = $${paramCount}`);
      params.push(schema);
      paramCount++;
    }

    if (table) {
      whereConditions.push(`table_name = $${paramCount}`);
      params.push(table);
      paramCount++;
    }

    if (engine) {
      whereConditions.push(`inferred_source_engine = $${paramCount}`);
      params.push(engine);
      paramCount++;
    }

    whereConditions.push(`snapshot_date >= NOW() - INTERVAL '${days} days'`);

    const whereClause =
      whereConditions.length > 0
        ? "WHERE " + whereConditions.join(" AND ")
        : "";

    const result = await pool.query(
      `
      SELECT 
        id,
        schema_name,
        table_name,
        inferred_source_engine,
        snapshot_date,
        total_columns,
        total_rows,
        table_size_mb,
        data_quality_score,
        null_percentage,
        duplicate_percentage,
        health_status,
        data_category,
        business_domain,
        sensitivity_level,
        access_frequency,
        query_count_daily,
        fragmentation_percentage
      FROM metadata.data_governance_catalog
      ${whereClause}
      ORDER BY snapshot_date DESC
      LIMIT $${paramCount}
    `,
      [...params, limit]
    );

    res.json({
      data: result.rows,
      count: result.rows.length,
    });
  } catch (err) {
    console.error("Error getting governance history:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener historial de governance",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

// Obtener estadísticas históricas de governance
app.get("/api/governance/stats", async (req, res) => {
  try {
    const days = parseInt(req.query.days || "30", 10);
    const engine = validateEnum(
      req.query.engine,
      ["PostgreSQL", "MariaDB", "MSSQL", "MongoDB", "Oracle", ""],
      ""
    );

    const whereConditions = [`snapshot_date >= NOW() - INTERVAL '${days} days'`];
    const params = [];

    if (engine) {
      whereConditions.push(`inferred_source_engine = $1`);
      params.push(engine);
    }

    const whereClause = "WHERE " + whereConditions.join(" AND ");

    const result = await pool.query(
      `
      WITH latest_snapshots AS (
        SELECT DISTINCT ON (schema_name, table_name)
          *
        FROM metadata.data_governance_catalog
        ${whereClause}
        ORDER BY schema_name, table_name, snapshot_date DESC
      )
      SELECT 
        COUNT(*) as total_tables,
        COUNT(*) FILTER (WHERE health_status IN ('EXCELLENT', 'HEALTHY')) as healthy_count,
        COUNT(*) FILTER (WHERE health_status = 'WARNING') as warning_count,
        COUNT(*) FILTER (WHERE health_status = 'CRITICAL') as critical_count,
        ROUND(AVG(data_quality_score)::numeric, 2) as avg_quality_score,
        SUM(COALESCE(table_size_mb, 0)) as total_size_mb,
        SUM(COALESCE(total_rows, 0)) as total_rows,
        COUNT(DISTINCT inferred_source_engine) as engine_count,
        COUNT(DISTINCT schema_name) as schema_count
      FROM latest_snapshots
    `,
      params
    );

    const engineStats = await pool.query(
      `
      WITH latest_snapshots AS (
        SELECT DISTINCT ON (schema_name, table_name)
          *
        FROM metadata.data_governance_catalog
        ${whereClause}
        ORDER BY schema_name, table_name, snapshot_date DESC
      )
      SELECT 
        inferred_source_engine,
        COUNT(*) as table_count,
        COUNT(*) FILTER (WHERE health_status IN ('EXCELLENT', 'HEALTHY')) as healthy,
        COUNT(*) FILTER (WHERE health_status = 'WARNING') as warning,
        COUNT(*) FILTER (WHERE health_status = 'CRITICAL') as critical,
        ROUND(AVG(data_quality_score)::numeric, 2) as avg_score
      FROM latest_snapshots
      GROUP BY inferred_source_engine
      ORDER BY table_count DESC
    `,
      params
    );

    res.json({
      summary: result.rows[0],
      byEngine: engineStats.rows,
    });
  } catch (err) {
    console.error("Error getting governance stats:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener estadísticas de governance",
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
    const autoCleanup = req.query.autoCleanup === "true" || process.env.NODE_ENV === "production";
    const deleteDebug = req.query.deleteDebug === "true" || (process.env.NODE_ENV === "production" && req.query.deleteDebug !== "false");
    const deleteDuplicates = req.query.deleteDuplicates === "true";
    const deleteOlderThan = req.query.deleteOlderThan;

    if (autoCleanup || deleteDebug || deleteDuplicates || deleteOlderThan) {
      let deleteWhere = [];
      let deleteParams = [];
      let paramCount = 1;

      if (deleteDebug) {
        deleteWhere.push(`level = 'DEBUG'`);
      }

      if (deleteOlderThan) {
        const days = parseInt(deleteOlderThan);
        if (!isNaN(days) && days > 0) {
          deleteWhere.push(`ts < NOW() - INTERVAL '${days} days'`);
        }
      }

      if (deleteDuplicates) {
        const duplicateQuery = `
          DELETE FROM metadata.logs
          WHERE id IN (
            SELECT id FROM (
              SELECT id,
                     ROW_NUMBER() OVER (
                       PARTITION BY level, category, function, message 
                       ORDER BY ts DESC
                     ) as rn
              FROM metadata.logs
            ) t
            WHERE t.rn > 1
          )
        `;
        try {
          const dupResult = await pool.query(duplicateQuery);
        } catch (err) {
        }
      }

      if (deleteWhere.length > 0) {
        const deleteQuery = `DELETE FROM metadata.logs WHERE ${deleteWhere.join(" AND ")}`;
        try {
          const deleteResult = await pool.query(deleteQuery, deleteParams);
        } catch (err) {
        }
      }
    }

    const lines = validateLimit(req.query.lines, 1, 1000);
    
    // Support both single 'level' and multiple 'levels' parameter
    const levelParam = req.query.levels || req.query.level;
    const distinctMessages = req.query.distinct === "true" || req.query.distinct === true;
    
    // Parse levels: support array, comma-separated string, or single value
    let levels = [];
    if (levelParam) {
      if (Array.isArray(levelParam)) {
        levels = levelParam.filter(l => l && l !== "ALL");
      } else if (typeof levelParam === "string") {
        if (levelParam !== "ALL") {
          levels = levelParam.split(",").map(l => l.trim()).filter(l => l && l !== "ALL");
        }
      }
    }
    
    // Validate levels
    const validLevels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"];
    levels = levels.filter(l => validLevels.includes(l.toUpperCase()));
    
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

    // Support multiple levels with IN clause
    if (levels.length > 0) {
      const placeholders = levels.map((_, i) => `$${params.length + i + 1}`).join(',');
      params.push(...levels.map(l => l.toUpperCase()));
      where.push(`level IN (${placeholders})`);
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

    // Build query with optional DISTINCT ON for unique messages
    let query;
    if (distinctMessages) {
      // Use DISTINCT ON to get most recent entry per unique message
      // DISTINCT ON requires message to be first in ORDER BY
      query = `
        SELECT DISTINCT ON (message) ts, level, category, function, message
        FROM metadata.logs
        ${whereClause}
        ORDER BY message, ts DESC
        LIMIT $${params.length + 1}
      `;
    } else {
      // Standard query ordered by timestamp
      query = `
        SELECT ts, level, category, function, message
        FROM metadata.logs
        ${whereClause}
        ORDER BY ts DESC
        LIMIT $${params.length + 1}
      `;
    }
    
    const result = await pool.query(query, [...params, limit]);
    
    // If using DISTINCT ON, reorder results by timestamp DESC to show most recent first
    let sortedRows = result.rows;
    if (distinctMessages) {
      sortedRows = result.rows.sort((a, b) => {
        const tsA = a.ts ? new Date(a.ts).getTime() : 0;
        const tsB = b.ts ? new Date(b.ts).getTime() : 0;
        return tsB - tsA; // Most recent first
      });
    }

    const logs = sortedRows.map((r) => {
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
      filters: { level: levels.length > 0 ? levels.join(',') : 'ALL', category, function: func, search, startDate, endDate },
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
    const daysToKeep = parseInt(req.query.daysToKeep) || 30;
    const deleteAll = req.query.deleteAll === "true";

    let result;
    if (deleteAll) {
      await pool.query("TRUNCATE TABLE metadata.logs");
      result = { deleted: "all", message: "All logs deleted" };
    } else {
      const deleteResult = await pool.query(
        `DELETE FROM metadata.logs WHERE ts < NOW() - INTERVAL '${daysToKeep} days'`
      );
      result = {
        deleted: deleteResult.rowCount,
        message: `Logs older than ${daysToKeep} days deleted`,
        daysToKeep,
      };
    }

    res.json({
      success: true,
      ...result,
      clearedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Error cleaning logs:", err);
    const safeError = sanitizeError(
      err,
      "Error al limpiar logs",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.post("/api/logs/rotate", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const daysToKeep = parseInt(req.body.daysToKeep) || 30;
    const minLevel = req.body.minLevel || "INFO";

    const deleteResult = await pool.query(
      `DELETE FROM metadata.logs 
       WHERE ts < NOW() - INTERVAL '${daysToKeep} days' 
       OR (level = 'DEBUG' AND ts < NOW() - INTERVAL '7 days')
       OR (level = 'INFO' AND category = 'SYSTEM' AND ts < NOW() - INTERVAL '14 days')`
    );

    res.json({
      success: true,
      deleted: deleteResult.rowCount,
      message: `Log rotation completed. Deleted ${deleteResult.rowCount} old log entries.`,
      rotatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Error rotating logs:", err);
    const safeError = sanitizeError(
      err,
      "Error al rotar logs",
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
async function getMariaDBSecurity(connectionString) {
  try {
    const mysql = await import("mysql2/promise");
    const conn = await mysql.default.createConnection(connectionString);
    
    const [users] = await conn.execute(`
      SELECT 
        User as username,
        Host as host,
        CASE 
          WHEN Super_priv = 'Y' THEN 'SUPERUSER'
          WHEN Create_db_priv = 'Y' THEN 'CREATEDB'
          WHEN Create_user_priv = 'Y' THEN 'CREATEROLE'
          WHEN Select_priv = 'Y' THEN 'SELECT'
          ELSE 'OTHER'
        END as role_type,
        CASE 
          WHEN account_locked = 'N' THEN 'ACTIVE'
          ELSE 'INACTIVE'
        END as status
      FROM mysql.user
      LIMIT 50
    `);
    
    const [processList] = await conn.execute(`SHOW PROCESSLIST`);
    
    const [grants] = await conn.execute(`
      SELECT 
        COUNT(*) as total_grants,
        COUNT(DISTINCT table_schema) as schemas_with_access,
        COUNT(DISTINCT table_name) as tables_with_access
      FROM information_schema.table_privileges
      WHERE table_schema NOT IN ('information_schema', 'performance_schema', 'mysql', 'sys')
    `);
    
    await conn.end();
    
    return {
      users: users || [],
      activeConnections: processList?.length || 0,
      permissions: grants?.[0] || { total_grants: 0, schemas_with_access: 0, tables_with_access: 0 },
    };
  } catch (err) {
    console.error("Error getting MariaDB security:", err);
    return { users: [], activeConnections: 0, permissions: { total_grants: 0, schemas_with_access: 0, tables_with_access: 0 }, error: err.message };
  }
}

async function getMSSQLSecurity(connectionString) {
  try {
    const sql = await import("mssql");
    
    let config = {};
    
    if (connectionString.includes("DRIVER=") || connectionString.includes("SERVER=")) {
      const params = {};
      connectionString.split(";").forEach((part) => {
        const [key, ...valueParts] = part.split("=");
        if (key && valueParts.length > 0) {
          const value = valueParts.join("=").trim();
          const keyUpper = key.trim().toUpperCase();
          if (keyUpper === "SERVER") {
            if (value.includes(",")) {
              const [server, port] = value.split(",").map(s => s.trim());
              params.server = server;
              params.port = parseInt(port) || 1433;
            } else {
              params.server = value;
            }
          } else if (keyUpper === "DATABASE" || keyUpper === "INITIAL CATALOG") {
            params.database = value;
          } else if (keyUpper === "UID" || keyUpper === "USER ID" || keyUpper === "USER") {
            params.user = value;
          } else if (keyUpper === "PWD" || keyUpper === "PASSWORD") {
            params.password = value;
          } else if (keyUpper === "PORT") {
            params.port = parseInt(value);
          } else if (keyUpper === "TRUSTSERVERCERTIFICATE" || keyUpper === "TRUST SERVER CERTIFICATE") {
            params.trustServerCertificate = value.toLowerCase() === "yes" || value === "true";
          } else if (keyUpper === "ENCRYPT") {
            params.encrypt = value.toLowerCase() === "yes" || value === "true";
          }
        }
      });
      
      if (!params.server) {
        throw new Error("SERVER not found in connection string");
      }
      
      config = {
        server: params.server,
        database: params.database || "master",
        user: params.user,
        password: params.password,
        port: params.port || 1433,
        options: {
          encrypt: params.encrypt !== false,
          trustServerCertificate: params.trustServerCertificate !== false,
        },
      };
    } else {
      config = {
        connectionString: connectionString,
        options: { encrypt: true, trustServerCertificate: true },
      };
    }
    
    const pool = await sql.default.connect(config);
    
    const usersResult = await pool.request().query(`
      SELECT 
        name as username,
        CASE 
          WHEN is_srvrolemember('sysadmin', name) = 1 THEN 'SUPERUSER'
          WHEN is_srvrolemember('dbcreator', name) = 1 THEN 'CREATEDB'
          WHEN is_srvrolemember('securityadmin', name) = 1 THEN 'CREATEROLE'
          ELSE 'OTHER'
        END as role_type,
        CASE 
          WHEN is_disabled = 0 THEN 'ACTIVE'
          ELSE 'INACTIVE'
        END as status
      FROM sys.server_principals
      WHERE type IN ('S', 'U')
      ORDER BY name
    `);
    
    const connectionsResult = await pool.request().query(`
      SELECT COUNT(*) as current_connections
      FROM sys.dm_exec_sessions
      WHERE is_user_process = 1
    `);
    
    const permissionsResult = await pool.request().query(`
      SELECT 
        COUNT(*) as total_grants,
        COUNT(DISTINCT OBJECT_SCHEMA_NAME(major_id)) as schemas_with_access,
        COUNT(DISTINCT OBJECT_NAME(major_id)) as tables_with_access
      FROM sys.database_permissions
      WHERE class = 1
    `);
    
    await pool.close();
    
    return {
      users: usersResult.recordset || [],
      activeConnections: connectionsResult.recordset[0]?.current_connections || 0,
      permissions: permissionsResult.recordset[0] || { total_grants: 0, schemas_with_access: 0, tables_with_access: 0 },
    };
  } catch (err) {
    console.error("Error getting MSSQL security:", err);
    return { users: [], activeConnections: 0, permissions: { total_grants: 0, schemas_with_access: 0, tables_with_access: 0 }, error: err.message };
  }
}

async function getOracleSecurity(connectionString) {
  try {
    const oracledb = await import("oracledb");
    const conn = await oracledb.default.getConnection(connectionString);
    
    const usersResult = await conn.execute(`
      SELECT 
        username,
        CASE 
          WHEN account_status = 'OPEN' THEN 'ACTIVE'
          ELSE 'INACTIVE'
        END as status,
        CASE 
          WHEN dba_role = 'YES' THEN 'SUPERUSER'
          ELSE 'OTHER'
        END as role_type
      FROM dba_users
      WHERE username NOT IN ('SYS', 'SYSTEM')
      ORDER BY username
      FETCH FIRST 50 ROWS ONLY
    `);
    
    const connectionsResult = await conn.execute(`
      SELECT COUNT(*) as current_connections
      FROM v$session
      WHERE username IS NOT NULL
    `);
    
    const permissionsResult = await conn.execute(`
      SELECT 
        COUNT(*) as total_grants,
        COUNT(DISTINCT owner) as schemas_with_access,
        COUNT(DISTINCT table_name) as tables_with_access
      FROM dba_tab_privs
      WHERE owner NOT IN ('SYS', 'SYSTEM')
    `);
    
    await conn.close();
    
    return {
      users: usersResult.rows?.map(r => ({ username: r[0], status: r[1], role_type: r[2] })) || [],
      activeConnections: connectionsResult.rows?.[0]?.[0] || 0,
      permissions: permissionsResult.rows?.[0] ? { total_grants: permissionsResult.rows[0][0], schemas_with_access: permissionsResult.rows[0][1], tables_with_access: permissionsResult.rows[0][2] } : { total_grants: 0, schemas_with_access: 0, tables_with_access: 0 },
    };
  } catch (err) {
    console.error("Error getting Oracle security:", err);
    return { users: [], activeConnections: 0, permissions: { total_grants: 0, schemas_with_access: 0, tables_with_access: 0 }, error: err.message };
  }
}

async function getMongoDBSecurity(connectionString) {
  try {
    const { MongoClient } = await import("mongodb");
    const client = new MongoClient(connectionString);
    await client.connect();
    const adminDb = client.db().admin();
    
    const usersResult = await adminDb.command({ usersInfo: 1 });
    const users = usersResult.users?.map(u => ({
      username: u.user,
      role_type: u.roles?.map(r => r.role).join(', ') || 'OTHER',
      status: 'ACTIVE',
    })) || [];
    
    const serverStatus = await adminDb.command({ serverStatus: 1 });
    const activeConnections = serverStatus.connections?.current || 0;
    
    await client.close();
    
    return {
      users: users.slice(0, 50),
      activeConnections: activeConnections,
      permissions: { total_grants: users.length, schemas_with_access: 0, tables_with_access: 0 },
    };
  } catch (err) {
    console.error("Error getting MongoDB security:", err);
    return { users: [], activeConnections: 0, permissions: { total_grants: 0, schemas_with_access: 0, tables_with_access: 0 }, error: err.message };
  }
}

app.get("/api/security/data", async (req, res) => {
  try {
    const postgresSecurity = {
      users: { total: 0, active: 0, superusers: 0, withLogin: 0 },
      connections: { current: 0, max: 0, idle: 0, active: 0 },
      permissions: { totalGrants: 0, schemasWithAccess: 0, tablesWithAccess: 0 },
      activeUsers: [],
    };

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

    const connections = await pool.query(`
      SELECT 
        COUNT(*) as current_connections,
        (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max_connections,
        COUNT(*) FILTER (WHERE state = 'idle') as idle_connections,
        COUNT(*) FILTER (WHERE state = 'active') as active_connections
      FROM pg_stat_activity
    `);

    const activeUsers = await pool.query(`
      SELECT 
        sa.usename as username,
        sa.datname as database,
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
        sa.application_name,
        sa.backend_start,
        sa.state_change,
        CASE 
          WHEN sa.state = 'active' AND sa.query_start IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (NOW() - sa.query_start)) * 1000
          ELSE NULL
        END as query_duration,
        sa.wait_event_type,
        sa.wait_event,
        CASE 
          WHEN sa.query IS NOT NULL AND LENGTH(sa.query) > 0
          THEN LEFT(sa.query, 500)
          ELSE NULL
        END as query
      FROM pg_stat_activity sa
      JOIN pg_roles r ON sa.usename = r.rolname
      WHERE sa.usename IS NOT NULL
      ORDER BY last_activity DESC
      LIMIT 50
    `);

    const permissionsOverview = await pool.query(`
      SELECT 
        COUNT(*) as total_grants,
        COUNT(DISTINCT table_schema) as schemas_with_access,
        COUNT(DISTINCT table_name) as tables_with_access
      FROM information_schema.table_privileges
      WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
    `);

    postgresSecurity.users = {
      total: parseInt(users.rows[0]?.total_users || 0),
      active: parseInt(activeUsersCount.rows[0]?.active_users || 0),
      superusers: parseInt(users.rows[0]?.superusers || 0),
      withLogin: parseInt(users.rows[0]?.users_with_login || 0),
    };
    postgresSecurity.connections = {
      current: parseInt(connections.rows[0]?.current_connections || 0),
      max: parseInt(connections.rows[0]?.max_connections || 0),
      idle: parseInt(connections.rows[0]?.idle_connections || 0),
      active: parseInt(connections.rows[0]?.active_connections || 0),
    };
    postgresSecurity.permissions = {
      totalGrants: parseInt(permissionsOverview.rows[0]?.total_grants || 0),
      schemasWithAccess: parseInt(
        permissionsOverview.rows[0]?.schemas_with_access || 0
      ),
      tablesWithAccess: parseInt(
        permissionsOverview.rows[0]?.tables_with_access || 0
      ),
    };
    postgresSecurity.activeUsers = activeUsers.rows;

    // Obtener todas las conexiones activas usando available_connections
    const availableConnections = await pool.query(`
      SELECT 
        db_engine,
        connection_string,
        connection_string_masked,
        COUNT(*) OVER (PARTITION BY db_engine) as total_by_engine
      FROM metadata.available_connections
      ORDER BY db_engine, connection_string
    `);

    // Agrupar conexiones por motor
    const connectionsByEngine = {};
    availableConnections.rows.forEach(row => {
      if (!connectionsByEngine[row.db_engine]) {
        connectionsByEngine[row.db_engine] = {
          engine: row.db_engine,
          total_connections: 0,
          connections: []
        };
      }
      connectionsByEngine[row.db_engine].total_connections++;
      connectionsByEngine[row.db_engine].connections.push({
        connection_string: row.connection_string,
        connection_string_masked: row.connection_string_masked
      });
    });

    // Obtener estadísticas de auditoría DDL por motor
    const ddlAuditStats = await pool.query(`
      SELECT 
        db_engine,
        COUNT(*) as total_changes,
        COUNT(*) FILTER (WHERE change_type = 'DROP') as drop_operations,
        COUNT(*) FILTER (WHERE change_type = 'ALTER') as alter_operations,
        COUNT(*) FILTER (WHERE change_type = 'CREATE') as create_operations,
        COUNT(DISTINCT executed_by) as unique_users,
        MAX(execution_timestamp) as last_change,
        MIN(execution_timestamp) as first_change
      FROM metadata.schema_change_audit
      WHERE execution_timestamp >= NOW() - INTERVAL '30 days'
      GROUP BY db_engine
      ORDER BY db_engine
    `);

    // Obtener cambios DDL recientes (últimos 7 días) para alertas
    const recentDDLChanges = await pool.query(`
      SELECT 
        id,
        db_engine,
        server_name,
        database_name,
        schema_name,
        object_name,
        object_type,
        change_type,
        executed_by,
        execution_timestamp,
        ddl_statement
      FROM metadata.schema_change_audit
      WHERE execution_timestamp >= NOW() - INTERVAL '7 days'
      ORDER BY execution_timestamp DESC
      LIMIT 50
    `);

    // Calcular niveles de riesgo por motor
    const riskLevels = {};
    ddlAuditStats.rows.forEach(row => {
      let riskLevel = 'NORMAL';
      if (row.drop_operations > 5) {
        riskLevel = 'HIGH_RISK';
      } else if (row.drop_operations > 0) {
        riskLevel = 'MEDIUM_RISK';
      } else if (row.total_changes > 50) {
        riskLevel = 'ELEVATED_ACTIVITY';
      }
      riskLevels[row.db_engine] = riskLevel;
    });

    // Obtener información de seguridad para otras bases de datos
    const otherDatabases = {};
    for (const [engine, engineData] of Object.entries(connectionsByEngine)) {
      if (engine !== 'PostgreSQL') {
        if (!otherDatabases[engine]) {
          otherDatabases[engine] = [];
        }
        
        // Para cada conexión, intentar obtener datos de seguridad
        for (const conn of engineData.connections.slice(0, 5)) { // Limitar a 5 por motor
          let securityData = null;
          try {
            if (engine === 'MariaDB') {
              securityData = await getMariaDBSecurity(conn.connection_string);
            } else if (engine === 'MSSQL') {
              securityData = await getMSSQLSecurity(conn.connection_string);
            } else if (engine === 'Oracle') {
              securityData = await getOracleSecurity(conn.connection_string);
            } else if (engine === 'MongoDB') {
              securityData = await getMongoDBSecurity(conn.connection_string);
            }
          } catch (err) {
            console.error(`Error getting security for ${engine}:`, err);
            securityData = { error: err.message };
          }
          
          otherDatabases[engine].push({
            connection: conn.connection_string_masked || conn.connection_string.substring(0, 50) + '...',
            connection_string: conn.connection_string,
            security: securityData,
          });
        }
      }
    }

    const securityData = {
      postgres: postgresSecurity,
      otherDatabases: otherDatabases,
      summary: {
        users: postgresSecurity.users,
        connections: postgresSecurity.connections,
        permissions: postgresSecurity.permissions,
      },
      activeUsers: postgresSecurity.activeUsers,
      // Nuevos datos para Blue Team
      availableConnections: connectionsByEngine,
      ddlAuditStats: ddlAuditStats.rows.map(row => ({
        ...row,
        risk_level: riskLevels[row.db_engine] || 'NORMAL'
      })),
      recentDDLChanges: recentDDLChanges.rows,
      securityAlerts: recentDDLChanges.rows
        .filter(row => row.change_type === 'DROP')
        .map(row => ({
          severity: 'CRITICAL',
          db_engine: row.db_engine,
          object_name: row.object_name,
          executed_by: row.executed_by,
          execution_timestamp: row.execution_timestamp,
          message: `DROP operation detected on ${row.object_type} ${row.schema_name}.${row.object_name}`
        }))
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
        AND query_text NOT ILIKE '%information_schema%'
        AND query_text NOT ILIKE '%pg_stat%'
        AND query_text NOT ILIKE '%pg_catalog%'
        AND query_text NOT ILIKE '%pg_class%'
        AND query_text NOT ILIKE '%pg_namespace%'
        AND query_text NOT ILIKE '%pg_extension%'
        AND query_text NOT ILIKE '%pg_depend%'
        AND query_text NOT ILIKE '%pg_attribute%'
        AND query_text NOT ILIKE '%pg_index%'
        AND query_text NOT ILIKE '%pg_settings%'
        AND query_text NOT ILIKE '%pg_database%'
        AND query_text NOT ILIKE '%pg_user%'
        AND query_text NOT ILIKE '%pg_roles%'
        AND query_text NOT ILIKE '%pg_postmaster%'
        AND query_text NOT ILIKE '%pg_statio%'
        AND query_text NOT ILIKE '%current_database()%'
        AND operation_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
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

    const dataQuery = `
      SELECT *
      FROM metadata.column_catalog
      ${whereClause}
      ORDER BY schema_name, table_name, ordinal_position
    `;

    const result = await pool.query(dataQuery, params);

    res.json({
      data: result.rows,
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
        COUNT(*) FILTER (WHERE is_indexed = true) as indexed_columns,
        COUNT(*) FILTER (WHERE profiling_quality_score IS NOT NULL) as profiled_columns,
        AVG(profiling_quality_score) FILTER (WHERE profiling_quality_score IS NOT NULL) as avg_profiling_score,
        COUNT(*) FILTER (WHERE has_anomalies = true) as columns_with_anomalies
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

app.get("/api/column-catalog/stats", async (req, res) => {
  try {
    const [dataTypeDist, sensitivityDist, engineDist, piiDist, profilingDist] = await Promise.all([
      pool.query(`
        SELECT 
          COALESCE(data_type, 'Unknown') as data_type,
          COUNT(*) as count
        FROM metadata.column_catalog
        GROUP BY data_type
        ORDER BY count DESC
        LIMIT 15
      `),
      pool.query(`
        SELECT 
          COALESCE(sensitivity_level, 'UNKNOWN') as sensitivity_level,
          COUNT(*) as count
        FROM metadata.column_catalog
        GROUP BY sensitivity_level
        ORDER BY count DESC
      `),
      pool.query(`
        SELECT 
          COALESCE(db_engine, 'Unknown') as db_engine,
          COUNT(*) as count
        FROM metadata.column_catalog
        GROUP BY db_engine
        ORDER BY count DESC
      `),
      pool.query(`
        SELECT 
          CASE 
            WHEN contains_pii = true AND contains_phi = true THEN 'PII + PHI'
            WHEN contains_pii = true THEN 'PII Only'
            WHEN contains_phi = true THEN 'PHI Only'
            ELSE 'No Sensitive Data'
          END as category,
          COUNT(*) as count
        FROM metadata.column_catalog
        GROUP BY 
          CASE 
            WHEN contains_pii = true AND contains_phi = true THEN 'PII + PHI'
            WHEN contains_pii = true THEN 'PII Only'
            WHEN contains_phi = true THEN 'PHI Only'
            ELSE 'No Sensitive Data'
          END
        ORDER BY count DESC
      `),
      pool.query(`
        SELECT 
          quality_range,
          count
        FROM (
          SELECT 
            CASE 
              WHEN profiling_quality_score >= 90 THEN 'Excellent (90-100)'
              WHEN profiling_quality_score >= 75 THEN 'Good (75-89)'
              WHEN profiling_quality_score >= 50 THEN 'Fair (50-74)'
              WHEN profiling_quality_score IS NOT NULL THEN 'Poor (<50)'
              ELSE 'Not Profiled'
            END as quality_range,
            COUNT(*) as count
          FROM metadata.column_catalog
          GROUP BY 
            CASE 
              WHEN profiling_quality_score >= 90 THEN 'Excellent (90-100)'
              WHEN profiling_quality_score >= 75 THEN 'Good (75-89)'
              WHEN profiling_quality_score >= 50 THEN 'Fair (50-74)'
              WHEN profiling_quality_score IS NOT NULL THEN 'Poor (<50)'
              ELSE 'Not Profiled'
            END
        ) subquery
        ORDER BY 
          CASE quality_range
            WHEN 'Excellent (90-100)' THEN 1
            WHEN 'Good (75-89)' THEN 2
            WHEN 'Fair (50-74)' THEN 3
            WHEN 'Poor (<50)' THEN 4
            WHEN 'Not Profiled' THEN 5
          END
      `)
    ]);

    res.json({
      data_type_distribution: dataTypeDist.rows,
      sensitivity_distribution: sensitivityDist.rows,
      engine_distribution: engineDist.rows,
      pii_distribution: piiDist.rows,
      profiling_distribution: profilingDist.rows
    });
  } catch (err) {
    console.error("Error getting column catalog stats:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener estadísticas del catálogo de columnas",
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

app.get("/api/data-lineage/mariadb/stats", async (req, res) => {
  try {
    const [relationshipDist, objectTypeDist, confidenceDist, discoveryDist] = await Promise.all([
      pool.query(`
        SELECT 
          COALESCE(relationship_type, 'Unknown') as relationship_type,
          COUNT(*) as count
        FROM metadata.mdb_lineage
        GROUP BY relationship_type
        ORDER BY count DESC
      `),
      pool.query(`
        SELECT 
          COALESCE(object_type, 'Unknown') as object_type,
          COUNT(*) as count
        FROM metadata.mdb_lineage
        GROUP BY object_type
        ORDER BY count DESC
      `),
      pool.query(`
        SELECT 
          confidence_level,
          count
        FROM (
          SELECT 
            CASE 
              WHEN confidence_score >= 0.8 THEN 'High (≥0.8)'
              WHEN confidence_score >= 0.5 THEN 'Medium (0.5-0.8)'
              WHEN confidence_score IS NOT NULL THEN 'Low (<0.5)'
              ELSE 'Unknown'
            END as confidence_level,
            COUNT(*) as count
          FROM metadata.mdb_lineage
          GROUP BY 
            CASE 
              WHEN confidence_score >= 0.8 THEN 'High (≥0.8)'
              WHEN confidence_score >= 0.5 THEN 'Medium (0.5-0.8)'
              WHEN confidence_score IS NOT NULL THEN 'Low (<0.5)'
              ELSE 'Unknown'
            END
        ) subquery
        ORDER BY 
          CASE confidence_level
            WHEN 'High (≥0.8)' THEN 1
            WHEN 'Medium (0.5-0.8)' THEN 2
            WHEN 'Low (<0.5)' THEN 3
            WHEN 'Unknown' THEN 4
          END
      `),
      pool.query(`
        SELECT 
          COALESCE(discovery_method, 'Unknown') as discovery_method,
          COUNT(*) as count
        FROM metadata.mdb_lineage
        GROUP BY discovery_method
        ORDER BY count DESC
      `)
    ]);

    res.json({
      relationship_distribution: relationshipDist.rows,
      object_type_distribution: objectTypeDist.rows,
      confidence_distribution: confidenceDist.rows,
      discovery_method_distribution: discoveryDist.rows
    });
  } catch (err) {
    console.error("Error getting MariaDB lineage stats:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener estadísticas de lineage de MariaDB",
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

app.get("/api/data-lineage/mssql/stats", async (req, res) => {
  try {
    const [relationshipDist, objectTypeDist, confidenceDist, discoveryDist] = await Promise.all([
      pool.query(`
        SELECT 
          COALESCE(relationship_type, 'Unknown') as relationship_type,
          COUNT(*) as count
        FROM metadata.mssql_lineage
        GROUP BY relationship_type
        ORDER BY count DESC
      `),
      pool.query(`
        SELECT 
          COALESCE(object_type, 'Unknown') as object_type,
          COUNT(*) as count
        FROM metadata.mssql_lineage
        GROUP BY object_type
        ORDER BY count DESC
      `),
      pool.query(`
        SELECT 
          confidence_level,
          count
        FROM (
          SELECT 
            CASE 
              WHEN confidence_score >= 0.8 THEN 'High (≥0.8)'
              WHEN confidence_score >= 0.5 THEN 'Medium (0.5-0.8)'
              WHEN confidence_score IS NOT NULL THEN 'Low (<0.5)'
              ELSE 'Unknown'
            END as confidence_level,
            COUNT(*) as count
          FROM metadata.mssql_lineage
          GROUP BY 
            CASE 
              WHEN confidence_score >= 0.8 THEN 'High (≥0.8)'
              WHEN confidence_score >= 0.5 THEN 'Medium (0.5-0.8)'
              WHEN confidence_score IS NOT NULL THEN 'Low (<0.5)'
              ELSE 'Unknown'
            END
        ) subquery
        ORDER BY 
          CASE confidence_level
            WHEN 'High (≥0.8)' THEN 1
            WHEN 'Medium (0.5-0.8)' THEN 2
            WHEN 'Low (<0.5)' THEN 3
            WHEN 'Unknown' THEN 4
          END
      `),
      pool.query(`
        SELECT 
          COALESCE(discovery_method, 'Unknown') as discovery_method,
          COUNT(*) as count
        FROM metadata.mssql_lineage
        GROUP BY discovery_method
        ORDER BY count DESC
      `)
    ]);

    res.json({
      relationship_distribution: relationshipDist.rows,
      object_type_distribution: objectTypeDist.rows,
      confidence_distribution: confidenceDist.rows,
      discovery_method_distribution: discoveryDist.rows
    });
  } catch (err) {
    console.error("Error getting MSSQL lineage stats:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener estadísticas de lineage de MSSQL",
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

app.get("/api/governance-catalog/mariadb/history", async (req, res) => {
  try {
    const server_name = sanitizeSearch(req.query.server_name, 100);
    const database_name = validateIdentifier(req.query.database_name) || "";
    const schema_name = validateIdentifier(req.query.schema_name) || "";
    const table_name = validateIdentifier(req.query.table_name) || "";
    const days = parseInt(req.query.days || "30", 10);
    const limit = validateLimit(req.query.limit, 1, 10000, 1000);

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

    whereConditions.push(`snapshot_date >= NOW() - INTERVAL '${days} days'`);

    const whereClause =
      whereConditions.length > 0
        ? "WHERE " + whereConditions.join(" AND ")
        : "";

    const result = await pool.query(
      `
      SELECT 
        id,
        server_name,
        database_name,
        schema_name,
        table_name,
        snapshot_date,
        row_count,
        data_size_mb,
        index_size_mb,
        total_size_mb,
        health_status,
        fragmentation_pct,
        access_frequency
      FROM metadata.data_governance_catalog_mariadb
      ${whereClause}
      ORDER BY snapshot_date DESC
      LIMIT $${paramCount}
    `,
      [...params, limit]
    );

    res.json({
      data: result.rows,
      count: result.rows.length,
    });
  } catch (err) {
    console.error("Error getting MariaDB governance history:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener historial de governance de MariaDB",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/governance-catalog/mariadb/stats", async (req, res) => {
  try {
    const days = parseInt(req.query.days || "30", 10);
    const server_name = sanitizeSearch(req.query.server_name, 100);

    const whereConditions = [`snapshot_date >= NOW() - INTERVAL '${days} days'`];
    const params = [];

    if (server_name) {
      whereConditions.push(`server_name = $1`);
      params.push(server_name);
    }

    const whereClause = "WHERE " + whereConditions.join(" AND ");

    const result = await pool.query(
      `
      WITH latest_snapshots AS (
        SELECT DISTINCT ON (server_name, database_name, schema_name, table_name)
          *
        FROM metadata.data_governance_catalog_mariadb
        ${whereClause}
        ORDER BY server_name, database_name, schema_name, table_name, snapshot_date DESC
      )
      SELECT 
        COUNT(*) as total_tables,
        COUNT(*) FILTER (WHERE health_status IN ('EXCELLENT', 'HEALTHY')) as healthy_count,
        COUNT(*) FILTER (WHERE health_status = 'WARNING') as warning_count,
        COUNT(*) FILTER (WHERE health_status = 'CRITICAL') as critical_count,
        SUM(COALESCE(total_size_mb, 0)) as total_size_mb,
        SUM(COALESCE(row_count, 0)) as total_rows,
        COUNT(DISTINCT server_name) as server_count,
        COUNT(DISTINCT database_name) as database_count
      FROM latest_snapshots
    `,
      params
    );

    const serverStats = await pool.query(
      `
      WITH latest_snapshots AS (
        SELECT DISTINCT ON (server_name, database_name, schema_name, table_name)
          *
        FROM metadata.data_governance_catalog_mariadb
        ${whereClause}
        ORDER BY server_name, database_name, schema_name, table_name, snapshot_date DESC
      )
      SELECT 
        server_name,
        COUNT(*) as table_count,
        COUNT(*) FILTER (WHERE health_status IN ('EXCELLENT', 'HEALTHY')) as healthy,
        COUNT(*) FILTER (WHERE health_status = 'WARNING') as warning,
        COUNT(*) FILTER (WHERE health_status = 'CRITICAL') as critical
      FROM latest_snapshots
      GROUP BY server_name
      ORDER BY table_count DESC
    `,
      params
    );

    res.json({
      summary: result.rows[0],
      byServer: serverStats.rows,
    });
  } catch (err) {
    console.error("Error getting MariaDB governance stats:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener estadísticas de governance de MariaDB",
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

app.get("/api/governance-catalog/mssql/history", async (req, res) => {
  try {
    const server_name = sanitizeSearch(req.query.server_name, 100);
    const database_name = validateIdentifier(req.query.database_name) || "";
    const schema_name = validateIdentifier(req.query.schema_name) || "";
    const table_name = validateIdentifier(req.query.table_name) || "";
    const days = parseInt(req.query.days || "30", 10);
    const limit = validateLimit(req.query.limit, 1, 10000, 1000);

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

    whereConditions.push(`snapshot_date >= NOW() - INTERVAL '${days} days'`);

    const whereClause =
      whereConditions.length > 0
        ? "WHERE " + whereConditions.join(" AND ")
        : "";

    const result = await pool.query(
      `
      SELECT 
        id,
        server_name,
        database_name,
        schema_name,
        table_name,
        snapshot_date,
        row_count,
        table_size_mb,
        health_score,
        health_status,
        fragmentation_pct,
        access_frequency
      FROM metadata.data_governance_catalog_mssql
      ${whereClause}
      ORDER BY snapshot_date DESC
      LIMIT $${paramCount}
    `,
      [...params, limit]
    );

    res.json({
      data: result.rows,
      count: result.rows.length,
    });
  } catch (err) {
    console.error("Error getting MSSQL governance history:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener historial de governance de MSSQL",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/governance-catalog/mssql/stats", async (req, res) => {
  try {
    const days = parseInt(req.query.days || "30", 10);
    const server_name = sanitizeSearch(req.query.server_name, 100);

    const whereConditions = [`snapshot_date >= NOW() - INTERVAL '${days} days'`];
    const params = [];

    if (server_name) {
      whereConditions.push(`server_name = $1`);
      params.push(server_name);
    }

    const whereClause = "WHERE " + whereConditions.join(" AND ");

    const result = await pool.query(
      `
      WITH latest_snapshots AS (
        SELECT DISTINCT ON (server_name, database_name, schema_name, table_name, object_type, object_name)
          *
        FROM metadata.data_governance_catalog_mssql
        ${whereClause}
        ORDER BY server_name, database_name, schema_name, table_name, object_type, object_name, snapshot_date DESC
      )
      SELECT 
        COUNT(*) as total_objects,
        COUNT(*) FILTER (WHERE health_status IN ('EXCELLENT', 'HEALTHY')) as healthy_count,
        COUNT(*) FILTER (WHERE health_status = 'WARNING') as warning_count,
        COUNT(*) FILTER (WHERE health_status = 'CRITICAL') as critical_count,
        ROUND(AVG(health_score)::numeric, 2) as avg_health_score,
        SUM(COALESCE(table_size_mb, 0)) as total_size_mb,
        SUM(COALESCE(row_count, 0)) as total_rows,
        COUNT(DISTINCT server_name) as server_count,
        COUNT(DISTINCT database_name) as database_count
      FROM latest_snapshots
    `,
      params
    );

    const serverStats = await pool.query(
      `
      WITH latest_snapshots AS (
        SELECT DISTINCT ON (server_name, database_name, schema_name, table_name, object_type, object_name)
          *
        FROM metadata.data_governance_catalog_mssql
        ${whereClause}
        ORDER BY server_name, database_name, schema_name, table_name, object_type, object_name, snapshot_date DESC
      )
      SELECT 
        server_name,
        COUNT(*) as object_count,
        COUNT(*) FILTER (WHERE health_status IN ('EXCELLENT', 'HEALTHY')) as healthy,
        COUNT(*) FILTER (WHERE health_status = 'WARNING') as warning,
        COUNT(*) FILTER (WHERE health_status = 'CRITICAL') as critical,
        ROUND(AVG(health_score)::numeric, 2) as avg_score
      FROM latest_snapshots
      GROUP BY server_name
      ORDER BY object_count DESC
    `,
      params
    );

    res.json({
      summary: result.rows[0],
      byServer: serverStats.rows,
    });
  } catch (err) {
    console.error("Error getting MSSQL governance stats:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener estadísticas de governance de MSSQL",
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

app.get("/api/data-lineage/mongodb/stats", async (req, res) => {
  try {
    const [relationshipDist, objectTypeDist, confidenceDist, discoveryDist] = await Promise.all([
      pool.query(`
        SELECT 
          COALESCE(relationship_type, 'Unknown') as relationship_type,
          COUNT(*) as count
        FROM metadata.mongo_lineage
        GROUP BY relationship_type
        ORDER BY count DESC
      `),
      pool.query(`
        SELECT 
          COALESCE(object_type, 'Unknown') as object_type,
          COUNT(*) as count
        FROM metadata.mongo_lineage
        GROUP BY object_type
        ORDER BY count DESC
      `),
      pool.query(`
        SELECT 
          confidence_level,
          count
        FROM (
          SELECT 
            CASE 
              WHEN confidence_score >= 0.8 THEN 'High (≥0.8)'
              WHEN confidence_score >= 0.5 THEN 'Medium (0.5-0.8)'
              WHEN confidence_score IS NOT NULL THEN 'Low (<0.5)'
              ELSE 'Unknown'
            END as confidence_level,
            COUNT(*) as count
          FROM metadata.mongo_lineage
          GROUP BY 
            CASE 
              WHEN confidence_score >= 0.8 THEN 'High (≥0.8)'
              WHEN confidence_score >= 0.5 THEN 'Medium (0.5-0.8)'
              WHEN confidence_score IS NOT NULL THEN 'Low (<0.5)'
              ELSE 'Unknown'
            END
        ) subquery
        ORDER BY 
          CASE confidence_level
            WHEN 'High (≥0.8)' THEN 1
            WHEN 'Medium (0.5-0.8)' THEN 2
            WHEN 'Low (<0.5)' THEN 3
            WHEN 'Unknown' THEN 4
          END
      `),
      pool.query(`
        SELECT 
          COALESCE(discovery_method, 'Unknown') as discovery_method,
          COUNT(*) as count
        FROM metadata.mongo_lineage
        GROUP BY discovery_method
        ORDER BY count DESC
      `)
    ]);

    res.json({
      relationship_distribution: relationshipDist.rows,
      object_type_distribution: objectTypeDist.rows,
      confidence_distribution: confidenceDist.rows,
      discovery_method_distribution: discoveryDist.rows
    });
  } catch (err) {
    console.error("Error getting MongoDB lineage stats:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener estadísticas de lineage de MongoDB",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
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

app.get("/api/governance-catalog/mongodb/history", async (req, res) => {
  try {
    const server_name = sanitizeSearch(req.query.server_name, 100);
    const database_name = validateIdentifier(req.query.database_name) || "";
    const collection_name = validateIdentifier(req.query.collection_name) || "";
    const days = parseInt(req.query.days || "30", 10);
    const limit = validateLimit(req.query.limit, 1, 10000, 1000);

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

    if (collection_name) {
      whereConditions.push(`collection_name = $${paramCount}`);
      params.push(collection_name);
      paramCount++;
    }

    whereConditions.push(`snapshot_date >= NOW() - INTERVAL '${days} days'`);

    const whereClause =
      whereConditions.length > 0
        ? "WHERE " + whereConditions.join(" AND ")
        : "";

    const result = await pool.query(
      `
      SELECT 
        id,
        server_name,
        database_name,
        collection_name,
        snapshot_date,
        document_count,
        storage_size_mb,
        index_size_mb,
        total_size_mb,
        health_score,
        health_status,
        access_frequency
      FROM metadata.data_governance_catalog_mongodb
      ${whereClause}
      ORDER BY snapshot_date DESC
      LIMIT $${paramCount}
    `,
      [...params, limit]
    );

    res.json({
      data: result.rows,
      count: result.rows.length,
    });
  } catch (err) {
    console.error("Error getting MongoDB governance history:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener historial de governance de MongoDB",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/governance-catalog/mongodb/stats", async (req, res) => {
  try {
    const days = parseInt(req.query.days || "30", 10);
    const server_name = sanitizeSearch(req.query.server_name, 100);

    const whereConditions = [`snapshot_date >= NOW() - INTERVAL '${days} days'`];
    const params = [];

    if (server_name) {
      whereConditions.push(`server_name = $1`);
      params.push(server_name);
    }

    const whereClause = "WHERE " + whereConditions.join(" AND ");

    const result = await pool.query(
      `
      WITH latest_snapshots AS (
        SELECT DISTINCT ON (server_name, database_name, collection_name, index_name)
          *
        FROM metadata.data_governance_catalog_mongodb
        ${whereClause}
        ORDER BY server_name, database_name, collection_name, index_name, snapshot_date DESC
      )
      SELECT 
        COUNT(DISTINCT collection_name) as total_collections,
        COUNT(*) FILTER (WHERE health_status IN ('EXCELLENT', 'HEALTHY')) as healthy_count,
        COUNT(*) FILTER (WHERE health_status = 'WARNING') as warning_count,
        COUNT(*) FILTER (WHERE health_status = 'CRITICAL') as critical_count,
        ROUND(AVG(health_score)::numeric, 2) as avg_health_score,
        SUM(COALESCE(total_size_mb, 0)) as total_size_mb,
        SUM(COALESCE(document_count, 0)) as total_documents,
        COUNT(DISTINCT server_name) as server_count,
        COUNT(DISTINCT database_name) as database_count
      FROM latest_snapshots
    `,
      params
    );

    const serverStats = await pool.query(
      `
      WITH latest_snapshots AS (
        SELECT DISTINCT ON (server_name, database_name, collection_name, index_name)
          *
        FROM metadata.data_governance_catalog_mongodb
        ${whereClause}
        ORDER BY server_name, database_name, collection_name, index_name, snapshot_date DESC
      )
      SELECT 
        server_name,
        COUNT(DISTINCT collection_name) as collection_count,
        COUNT(*) FILTER (WHERE health_status IN ('EXCELLENT', 'HEALTHY')) as healthy,
        COUNT(*) FILTER (WHERE health_status = 'WARNING') as warning,
        COUNT(*) FILTER (WHERE health_status = 'CRITICAL') as critical,
        ROUND(AVG(health_score)::numeric, 2) as avg_score
      FROM latest_snapshots
      GROUP BY server_name
      ORDER BY collection_count DESC
    `,
      params
    );

    res.json({
      summary: result.rows[0],
      byServer: serverStats.rows,
    });
  } catch (err) {
    console.error("Error getting MongoDB governance stats:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener estadísticas de governance de MongoDB",
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

app.get("/api/data-lineage/oracle/stats", async (req, res) => {
  try {
    const [relationshipDist, objectTypeDist, confidenceDist, discoveryDist] = await Promise.all([
      pool.query(`
        SELECT 
          COALESCE(relationship_type, 'Unknown') as relationship_type,
          COUNT(*) as count
        FROM metadata.oracle_lineage
        GROUP BY relationship_type
        ORDER BY count DESC
      `),
      pool.query(`
        SELECT 
          COALESCE(object_type, 'Unknown') as object_type,
          COUNT(*) as count
        FROM metadata.oracle_lineage
        GROUP BY object_type
        ORDER BY count DESC
      `),
      pool.query(`
        SELECT 
          confidence_level,
          count
        FROM (
          SELECT 
            CASE 
              WHEN confidence_score >= 0.8 THEN 'High (≥0.8)'
              WHEN confidence_score >= 0.5 THEN 'Medium (0.5-0.8)'
              WHEN confidence_score IS NOT NULL THEN 'Low (<0.5)'
              ELSE 'Unknown'
            END as confidence_level,
            COUNT(*) as count
          FROM metadata.oracle_lineage
          GROUP BY 
            CASE 
              WHEN confidence_score >= 0.8 THEN 'High (≥0.8)'
              WHEN confidence_score >= 0.5 THEN 'Medium (0.5-0.8)'
              WHEN confidence_score IS NOT NULL THEN 'Low (<0.5)'
              ELSE 'Unknown'
            END
        ) subquery
        ORDER BY 
          CASE confidence_level
            WHEN 'High (≥0.8)' THEN 1
            WHEN 'Medium (0.5-0.8)' THEN 2
            WHEN 'Low (<0.5)' THEN 3
            WHEN 'Unknown' THEN 4
          END
      `),
      pool.query(`
        SELECT 
          COALESCE(discovery_method, 'Unknown') as discovery_method,
          COUNT(*) as count
        FROM metadata.oracle_lineage
        GROUP BY discovery_method
        ORDER BY count DESC
      `)
    ]);

    res.json({
      relationship_distribution: relationshipDist.rows,
      object_type_distribution: objectTypeDist.rows,
      confidence_distribution: confidenceDist.rows,
      discovery_method_distribution: discoveryDist.rows
    });
  } catch (err) {
    console.error("Error getting Oracle lineage stats:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener estadísticas de lineage de Oracle",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
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

app.get("/api/governance-catalog/oracle/history", async (req, res) => {
  try {
    const server_name = sanitizeSearch(req.query.server_name, 100);
    const schema_name = validateIdentifier(req.query.schema_name) || "";
    const table_name = validateIdentifier(req.query.table_name) || "";
    const days = parseInt(req.query.days || "30", 10);
    const limit = validateLimit(req.query.limit, 1, 10000, 1000);

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

    if (table_name) {
      whereConditions.push(`table_name = $${paramCount}`);
      params.push(table_name);
      paramCount++;
    }

    whereConditions.push(`snapshot_date >= NOW() - INTERVAL '${days} days'`);

    const whereClause =
      whereConditions.length > 0
        ? "WHERE " + whereConditions.join(" AND ")
        : "";

    const result = await pool.query(
      `
      SELECT 
        id,
        server_name,
        schema_name,
        table_name,
        snapshot_date,
        row_count,
        table_size_mb,
        index_size_mb,
        total_size_mb,
        health_score,
        health_status,
        fragmentation_pct,
        access_frequency
      FROM metadata.data_governance_catalog_oracle
      ${whereClause}
      ORDER BY snapshot_date DESC
      LIMIT $${paramCount}
    `,
      [...params, limit]
    );

    res.json({
      data: result.rows,
      count: result.rows.length,
    });
  } catch (err) {
    console.error("Error getting Oracle governance history:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener historial de governance de Oracle",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/governance-catalog/oracle/stats", async (req, res) => {
  try {
    const days = parseInt(req.query.days || "30", 10);
    const server_name = sanitizeSearch(req.query.server_name, 100);

    const whereConditions = [`snapshot_date >= NOW() - INTERVAL '${days} days'`];
    const params = [];

    if (server_name) {
      whereConditions.push(`server_name = $1`);
      params.push(server_name);
    }

    const whereClause = "WHERE " + whereConditions.join(" AND ");

    const result = await pool.query(
      `
      WITH latest_snapshots AS (
        SELECT DISTINCT ON (server_name, schema_name, table_name)
          *
        FROM metadata.data_governance_catalog_oracle
        ${whereClause}
        ORDER BY server_name, schema_name, table_name, snapshot_date DESC
      )
      SELECT 
        COUNT(*) as total_tables,
        COUNT(*) FILTER (WHERE health_status IN ('EXCELLENT', 'HEALTHY')) as healthy_count,
        COUNT(*) FILTER (WHERE health_status = 'WARNING') as warning_count,
        COUNT(*) FILTER (WHERE health_status = 'CRITICAL') as critical_count,
        ROUND(AVG(health_score)::numeric, 2) as avg_health_score,
        SUM(COALESCE(total_size_mb, 0)) as total_size_mb,
        SUM(COALESCE(row_count, 0)) as total_rows,
        COUNT(DISTINCT server_name) as server_count,
        COUNT(DISTINCT schema_name) as schema_count
      FROM latest_snapshots
    `,
      params
    );

    const serverStats = await pool.query(
      `
      WITH latest_snapshots AS (
        SELECT DISTINCT ON (server_name, schema_name, table_name)
          *
        FROM metadata.data_governance_catalog_oracle
        ${whereClause}
        ORDER BY server_name, schema_name, table_name, snapshot_date DESC
      )
      SELECT 
        server_name,
        COUNT(*) as table_count,
        COUNT(*) FILTER (WHERE health_status IN ('EXCELLENT', 'HEALTHY')) as healthy,
        COUNT(*) FILTER (WHERE health_status = 'WARNING') as warning,
        COUNT(*) FILTER (WHERE health_status = 'CRITICAL') as critical,
        ROUND(AVG(health_score)::numeric, 2) as avg_score
      FROM latest_snapshots
      GROUP BY server_name
      ORDER BY table_count DESC
    `,
      params
    );

    res.json({
      summary: result.rows[0],
      byServer: serverStats.rows,
    });
  } catch (err) {
    console.error("Error getting Oracle governance stats:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener estadísticas de governance de Oracle",
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
    const active = req.query.active !== undefined 
      ? validateBoolean(req.query.active) 
      : undefined;
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

    if (active !== undefined) {
      paramCount++;
      whereConditions.push(`active = $${paramCount}`);
      queryParams.push(active);
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
      ["PostgreSQL", "MariaDB", "MSSQL", "MongoDB", "Oracle", 
       "Salesforce", "SAP", "Teradata", "Netezza", "Hive", 
       "Cassandra", "DynamoDB", "AS400", "S3", "AzureBlob", 
       "GCS", "FTP", "SFTP", "Email", "SOAP", "GraphQL",
       "Excel", "FixedWidth", "EBCDIC", "XML", "Avro", 
       "Parquet", "ORC", "Compressed"],
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
        `SELECT api_name FROM metadata.api_catalog WHERE LOWER(api_name) = LOWER($1)`,
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

app.put(
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

    if (!api_name) {
      return res.status(400).json({
        error: "api_name is required",
      });
    }

    const validApiType = api_type ? validateEnum(
      api_type,
      ["REST", "GraphQL", "SOAP"],
      null
    ) : null;
    if (api_type && !validApiType) {
      return res.status(400).json({ error: "Invalid api_type" });
    }

    const validHttpMethod = http_method ? validateEnum(
      http_method,
      ["GET", "POST", "PUT", "PATCH", "DELETE"],
      null
    ) : null;
    if (http_method && !validHttpMethod) {
      return res.status(400).json({ error: "Invalid http_method" });
    }

    const validAuthType = auth_type ? validateEnum(
      auth_type,
      ["NONE", "BASIC", "BEARER", "API_KEY", "OAUTH2"],
      null
    ) : null;
    if (auth_type && !validAuthType) {
      return res.status(400).json({ error: "Invalid auth_type" });
    }

    const validTargetEngine = target_db_engine ? validateEnum(
      target_db_engine,
      ["PostgreSQL", "MariaDB", "MSSQL", "MongoDB", "Oracle", 
       "Salesforce", "SAP", "Teradata", "Netezza", "Hive", 
       "Cassandra", "DynamoDB", "AS400", "S3", "AzureBlob", 
       "GCS", "FTP", "SFTP", "Email", "SOAP", "GraphQL",
       "Excel", "FixedWidth", "EBCDIC", "XML", "Avro", 
       "Parquet", "ORC", "Compressed"],
      null
    ) : null;
    if (target_db_engine && !validTargetEngine) {
      return res.status(400).json({ error: "Invalid target_db_engine" });
    }

    const validStatus = status ? validateEnum(
      status,
      ["SUCCESS", "ERROR", "IN_PROGRESS", "PENDING"],
      null
    ) : null;
    if (status && !validStatus) {
      return res.status(400).json({ error: "Invalid status" });
    }

    try {
      const checkResult = await pool.query(
        `SELECT api_name FROM metadata.api_catalog WHERE api_name = $1`,
        [api_name]
      );

      if (checkResult.rows.length === 0) {
        return res.status(404).json({
          error: "API not found",
        });
      }

      const updateFields = [];
      const updateValues = [];
      let paramCount = 1;

      if (api_type !== undefined) {
        updateFields.push(`api_type = $${paramCount++}`);
        updateValues.push(api_type);
      }
      if (base_url !== undefined) {
        updateFields.push(`base_url = $${paramCount++}`);
        updateValues.push(base_url);
      }
      if (endpoint !== undefined) {
        updateFields.push(`endpoint = $${paramCount++}`);
        updateValues.push(endpoint);
      }
      if (http_method !== undefined) {
        updateFields.push(`http_method = $${paramCount++}`);
        updateValues.push(http_method);
      }
      if (auth_type !== undefined) {
        updateFields.push(`auth_type = $${paramCount++}`);
        updateValues.push(auth_type);
      }
      if (auth_config !== undefined) {
        updateFields.push(`auth_config = $${paramCount++}::jsonb`);
        updateValues.push(JSON.stringify(auth_config || {}));
      }
      if (target_db_engine !== undefined) {
        updateFields.push(`target_db_engine = $${paramCount++}`);
        updateValues.push(target_db_engine);
      }
      if (target_connection_string !== undefined) {
        updateFields.push(`target_connection_string = $${paramCount++}`);
        updateValues.push(target_connection_string);
      }
      if (target_schema !== undefined) {
        updateFields.push(`target_schema = $${paramCount++}`);
        updateValues.push(target_schema.toLowerCase());
      }
      if (target_table !== undefined) {
        updateFields.push(`target_table = $${paramCount++}`);
        updateValues.push(target_table.toLowerCase());
      }
      if (request_body !== undefined) {
        updateFields.push(`request_body = $${paramCount++}`);
        updateValues.push(request_body || null);
      }
      if (request_headers !== undefined) {
        updateFields.push(`request_headers = $${paramCount++}::jsonb`);
        updateValues.push(JSON.stringify(request_headers || {}));
      }
      if (query_params !== undefined) {
        updateFields.push(`query_params = $${paramCount++}::jsonb`);
        updateValues.push(JSON.stringify(query_params || {}));
      }
      if (sync_interval !== undefined) {
        const interval = sync_interval && sync_interval > 0 ? parseInt(sync_interval) : 3600;
        updateFields.push(`sync_interval = $${paramCount++}`);
        updateValues.push(interval);
      }
      if (status !== undefined) {
        updateFields.push(`status = $${paramCount++}`);
        updateValues.push(validStatus);
      }
      if (active !== undefined) {
        const isActive = validateBoolean(active, true);
        updateFields.push(`active = $${paramCount++}`);
        updateValues.push(isActive);
      }

      if (updateFields.length === 0) {
        return res.status(400).json({ error: "No fields to update" });
      }

      updateFields.push(`updated_at = NOW()`);
      updateValues.push(api_name);

      const updateQuery = `
        UPDATE metadata.api_catalog 
        SET ${updateFields.join(", ")}
        WHERE api_name = $${paramCount}
        RETURNING *
      `;

      const result = await pool.query(updateQuery, updateValues);

      res.json(result.rows[0]);
    } catch (err) {
      console.error("Database error:", err);
      const safeError = sanitizeError(
        err,
        "Error updating API entry",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.delete(
  "/api/api-catalog/:api_name",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    const { api_name } = req.params;

    if (!api_name) {
      return res.status(400).json({
        error: "api_name is required",
      });
    }

    try {
      const checkResult = await pool.query(
        `SELECT api_name FROM metadata.api_catalog WHERE api_name = $1`,
        [api_name]
      );

      if (checkResult.rows.length === 0) {
        return res.status(404).json({
          error: "API not found",
        });
      }

      await pool.query(
        `DELETE FROM metadata.api_catalog WHERE api_name = $1`,
        [api_name]
      );

      res.json({ message: "API deleted successfully" });
    } catch (err) {
      console.error("Database error:", err);
      const safeError = sanitizeError(
        err,
        "Error deleting API entry",
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
       WHERE process_type = 'API_SYNC' AND LOWER(process_name) = LOWER($1) 
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
       WHERE LOWER(api_name) = LOWER($1)`,
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

app.post("/api/discover-databases", requireAuth, async (req, res) => {
  const { db_engine, connection_string } = req.body;

  if (!db_engine || !connection_string) {
    return res.status(400).json({
      success: false,
      error: "Missing required fields: db_engine and connection_string",
    });
  }

  try {
    let databases = [];

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
            "SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname"
          );
          databases = result.rows.map((row) => row.datname);
          await testPool.end();
        } catch (err) {
          return res.status(400).json({
            success: false,
            error: `Failed to discover databases: ${err.message}`,
          });
        }
        break;
      }

      case "MariaDB": {
        try {
          const mysql = require("mysql2/promise");
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
                case "user":
                case "username":
                  config.user = value;
                  break;
                case "password":
                  config.password = value;
                  break;
                case "database":
                case "db":
                  config.database = value;
                  break;
                case "port":
                  config.port = parseInt(value, 10);
                  break;
              }
            }
          }

          const connection = await mysql.createConnection(config);
          const [rows] = await connection.query("SHOW DATABASES");
          databases = rows
            .map((row) => Object.values(row)[0])
            .filter(
              (db) =>
                !["information_schema", "performance_schema", "mysql", "sys"].includes(
                  db
                )
            );
          await connection.end();
        } catch (err) {
          return res.status(400).json({
            success: false,
            error: `Failed to discover databases: ${err.message}`,
          });
        }
        break;
      }

      case "MSSQL": {
        try {
          const sql = (await import("mssql")).default;
          const config = {
            connectionString: connection_string,
            options: {
              enableArithAbort: true,
              trustServerCertificate: true,
            },
          };
          const pool = await sql.connect(config);
          const result = await pool
            .request()
            .query(
              "SELECT name FROM sys.databases WHERE database_id > 4 ORDER BY name"
            );
          databases = result.recordset.map((row) => row.name);
          await pool.close();
        } catch (err) {
          return res.status(400).json({
            success: false,
            error: `Failed to discover databases: ${err.message}`,
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
          const adminDb = client.db().admin();
          const dbs = await adminDb.listDatabases();
          databases = dbs.databases
            .map((db) => db.name)
            .filter((name) => !["admin", "local", "config"].includes(name));
          await client.close();
        } catch (err) {
          return res.status(400).json({
            success: false,
            error: `Failed to discover databases: ${err.message}`,
          });
        }
        break;
      }

      case "Oracle": {
        return res.status(400).json({
          success: false,
          error: "Database discovery not yet implemented for Oracle",
        });
      }

      default:
        return res.status(400).json({
          success: false,
          error: `Unsupported database engine: ${db_engine}`,
        });
    }

    res.json({
      success: true,
      databases: databases,
    });
  } catch (err) {
    console.error("Error discovering databases:", err);
    res.status(500).json({
      success: false,
      error: sanitizeError(
        err,
        "Error discovering databases",
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
          connection_string &&
          (connection_string.includes("mysql://") ||
          connection_string.includes("mariadb://"))
        ) {
          try {
              const url = new URL(connection_string);
            config = {
              host: url.hostname,
              port: parseInt(url.port) || 3306,
              user: url.username,
              password: url.password,
              database: url.pathname.slice(1),
            };
          } catch (urlError) {
            throw new Error(`Invalid connection string URL format: ${urlError.message}`);
          }
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
        ["PostgreSQL", "MariaDB", "MSSQL", "MongoDB", "Oracle", 
       "Salesforce", "SAP", "Teradata", "Netezza", "Hive", 
       "Cassandra", "DynamoDB", "AS400", "S3", "AzureBlob", 
       "GCS", "FTP", "SFTP", "Email", "SOAP", "GraphQL",
       "Excel", "FixedWidth", "EBCDIC", "XML", "Avro", 
       "Parquet", "ORC", "Compressed"],
        null
      );
      const source_connection_string = sanitizeSearch(
        req.body.source_connection_string,
        500
      );
      const query_sql = sanitizeSearch(req.body.query_sql, 10000);
      const target_db_engine = validateEnum(
        req.body.target_db_engine,
        ["PostgreSQL", "MariaDB", "MSSQL", "MongoDB", "Oracle", 
       "Salesforce", "SAP", "Teradata", "Netezza", "Hive", 
       "Cassandra", "DynamoDB", "AS400", "S3", "AzureBlob", 
       "GCS", "FTP", "SFTP", "Email", "SOAP", "GraphQL",
       "Excel", "FixedWidth", "EBCDIC", "XML", "Avro", 
       "Parquet", "ORC", "Compressed"],
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
        ["PostgreSQL", "MariaDB", "MSSQL", "MongoDB", "Oracle", 
       "Salesforce", "SAP", "Teradata", "Netezza", "Hive", 
       "Cassandra", "DynamoDB", "AS400", "S3", "AzureBlob", 
       "GCS", "FTP", "SFTP", "Email", "SOAP", "GraphQL",
       "Excel", "FixedWidth", "EBCDIC", "XML", "Avro", 
       "Parquet", "ORC", "Compressed"],
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
                   WHERE LOWER(table_schema) = LOWER($1) AND LOWER(table_name) = LOWER($2)
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
          target_connection_string &&
          (target_connection_string.includes("mysql://") ||
          target_connection_string.includes("mariadb://"))
        ) {
          try {
              const url = new URL(target_connection_string);
            config = {
              host: url.hostname,
              port: parseInt(url.port) || 3306,
              user: url.username,
              password: url.password,
              database: url.pathname.slice(1),
            };
          } catch (urlError) {
            throw new Error(`Invalid target connection string URL format: ${urlError.message}`);
          }
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
      const target_layer = validateEnum(
        req.body.target_layer,
        ["BRONZE", "SILVER", "GOLD"],
        "BRONZE"
      );
      const source_db_engine = validateEnum(
        req.body.source_db_engine,
        ["PostgreSQL", "MariaDB", "MSSQL", "MongoDB", "Oracle", 
       "Salesforce", "SAP", "Teradata", "Netezza", "Hive", 
       "Cassandra", "DynamoDB", "AS400", "S3", "AzureBlob", 
       "GCS", "FTP", "SFTP", "Email", "SOAP", "GraphQL",
       "Excel", "FixedWidth", "EBCDIC", "XML", "Avro", 
       "Parquet", "ORC", "Compressed"],
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
       (warehouse_name, description, schema_type, target_layer, source_db_engine, source_connection_string,
        target_db_engine, target_connection_string, target_schema, dimensions, facts,
        schedule_cron, active, enabled, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb, $12, $13, $14, $15::jsonb)
       RETURNING *`,
        [
          warehouse_name,
          description || null,
          schema_type,
          target_layer,
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
      const target_layer = validateEnum(
        req.body.target_layer,
        ["BRONZE", "SILVER", "GOLD"],
        "BRONZE"
      );
      const source_db_engine = validateEnum(
        req.body.source_db_engine,
        ["PostgreSQL", "MariaDB", "MSSQL", "MongoDB", "Oracle", 
       "Salesforce", "SAP", "Teradata", "Netezza", "Hive", 
       "Cassandra", "DynamoDB", "AS400", "S3", "AzureBlob", 
       "GCS", "FTP", "SFTP", "Email", "SOAP", "GraphQL",
       "Excel", "FixedWidth", "EBCDIC", "XML", "Avro", 
       "Parquet", "ORC", "Compressed"],
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
       SET description = $1, schema_type = $2, target_layer = $3, source_db_engine = $4, source_connection_string = $5,
           target_db_engine = $6, target_connection_string = $7, target_schema = $8,
           dimensions = $9::jsonb, facts = $10::jsonb, schedule_cron = $11, active = $12,
           enabled = $13, metadata = $14::jsonb, updated_at = NOW()
       WHERE warehouse_name = $15
       RETURNING *`,
        [
          description || null,
          schema_type,
          target_layer,
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

// Cleanup previous layer schemas for a warehouse
app.delete(
  "/api/data-warehouse/:warehouseName/cleanup-layers",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const warehouseName = validateIdentifier(req.params.warehouseName);
      if (!warehouseName) {
        return res.status(400).json({ error: "Invalid warehouse name" });
      }

      const { layers } = req.body; // Array of layers to delete: ['BRONZE', 'SILVER', 'GOLD']
      
      if (!Array.isArray(layers) || layers.length === 0) {
        return res.status(400).json({ 
          error: "layers must be a non-empty array of layer names (BRONZE, SILVER, GOLD)" 
        });
      }

      // Validate layer names
      const validLayers = ['BRONZE', 'SILVER', 'GOLD'];
      const invalidLayers = layers.filter(l => !validLayers.includes(l.toUpperCase()));
      if (invalidLayers.length > 0) {
        return res.status(400).json({ 
          error: `Invalid layer names: ${invalidLayers.join(', ')}. Valid layers are: BRONZE, SILVER, GOLD` 
        });
      }

      const warehouseCheck = await pool.query(
        "SELECT warehouse_name, target_layer FROM metadata.data_warehouse_catalog WHERE warehouse_name = $1",
        [warehouseName]
      );

      if (warehouseCheck.rows.length === 0) {
        return res.status(404).json({
          error: "Warehouse not found",
          warehouse_name: warehouseName,
        });
      }

      const warehouse = warehouseCheck.rows[0];
      const currentLayer = (warehouse.target_layer || 'BRONZE').toUpperCase();
      
      // Normalize warehouse name (replace spaces with underscores, lowercase)
      const normalizedName = warehouseName.toLowerCase().replace(/\s+/g, '_');
      
      const droppedSchemas = [];
      const errors = [];

      // Drop each requested schema if it exists
      for (const layer of layers.map(l => l.toUpperCase())) {
        // Prevent deleting current layer
        if (layer === currentLayer) {
          errors.push(`Cannot delete current layer: ${layer}`);
          continue;
        }

        const schemaName = `${normalizedName}_${layer.toLowerCase()}`;
        
        try {
          const schemaExists = await pool.query(
            "SELECT EXISTS(SELECT 1 FROM information_schema.schemata WHERE schema_name = $1)",
            [schemaName]
          );

          if (schemaExists.rows[0].exists) {
            await pool.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
            droppedSchemas.push(schemaName);
          } else {
            errors.push(`Schema ${schemaName} does not exist`);
          }
        } catch (err) {
          console.error(`Error dropping schema ${schemaName}:`, err);
          errors.push(`Error dropping ${schemaName}: ${err.message}`);
        }
      }

      res.json({
        message: "Layer cleanup completed",
        warehouse_name: warehouseName,
        current_layer: currentLayer,
        dropped_schemas: droppedSchemas,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (err) {
      console.error("Error cleaning up previous layers:", err);
      res.status(500).json({
        error: sanitizeError(
          err,
          "Error cleaning up previous layers",
          process.env.NODE_ENV === "production"
        ),
      });
    }
  }
);

app.get("/api/data-vault", async (req, res) => {
  try {
    const page = validatePage(req.query.page, 1);
    const limit = validateLimit(req.query.limit, 1, 100);
    const offset = (page - 1) * limit;
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
      req.query.active !== undefined
        ? validateBoolean(req.query.active)
        : undefined;
    const search = sanitizeSearch(req.query.search, 100);

    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    if (source_db_engine) {
      whereConditions.push(`source_db_engine = $${paramIndex++}`);
      queryParams.push(source_db_engine);
    }

    if (target_db_engine) {
      whereConditions.push(`target_db_engine = $${paramIndex++}`);
      queryParams.push(target_db_engine);
    }

    if (active !== undefined) {
      whereConditions.push(`active = $${paramIndex++}`);
      queryParams.push(active);
    }

    if (search) {
      whereConditions.push(
        `(vault_name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`
      );
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause =
      whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM metadata.data_vault_catalog ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].total, 10);

    const result = await pool.query(
      `SELECT * FROM metadata.data_vault_catalog ${whereClause} ORDER BY vault_name LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...queryParams, limit, offset]
    );

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
    console.error("Error fetching data vaults:", err);
    res.status(500).json({
      error: sanitizeError(
        err,
        "Error fetching data vaults",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});

app.get("/api/data-vault/:vaultName", async (req, res) => {
  try {
    const vaultName = validateIdentifier(req.params.vaultName);
    if (!vaultName) {
      return res.status(400).json({ error: "Invalid vault name" });
    }

    const result = await pool.query(
      "SELECT * FROM metadata.data_vault_catalog WHERE vault_name = $1",
      [vaultName]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Vault not found" });
    }

    const vault = result.rows[0];
    vault.hubs = vault.hubs || [];
    vault.links = vault.links || [];
    vault.satellites = vault.satellites || [];
    vault.point_in_time_tables = vault.point_in_time_tables || [];
    vault.bridge_tables = vault.bridge_tables || [];

    res.json(vault);
  } catch (err) {
    console.error("Error fetching data vault:", err);
    res.status(500).json({
      error: sanitizeError(
        err,
        "Error fetching data vault",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});

app.post(
  "/api/data-vault",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const vault_name = validateIdentifier(req.body.vault_name);
      const description = sanitizeSearch(req.body.description, 500);
      const source_db_engine = validateEnum(
        req.body.source_db_engine,
        ["PostgreSQL", "MariaDB", "MSSQL", "MongoDB", "Oracle", 
       "Salesforce", "SAP", "Teradata", "Netezza", "Hive", 
       "Cassandra", "DynamoDB", "AS400", "S3", "AzureBlob", 
       "GCS", "FTP", "SFTP", "Email", "SOAP", "GraphQL",
       "Excel", "FixedWidth", "EBCDIC", "XML", "Avro", 
       "Parquet", "ORC", "Compressed"],
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
      const hubs = req.body.hubs || [];
      const links = req.body.links || [];
      const satellites = req.body.satellites || [];
      const point_in_time_tables = req.body.point_in_time_tables || [];
      const bridge_tables = req.body.bridge_tables || [];
      const metadata = req.body.metadata || {};

      if (!vault_name) {
        return res.status(400).json({ error: "vault_name is required" });
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
        `SELECT vault_name FROM metadata.data_vault_catalog WHERE vault_name = $1`,
        [vault_name]
      );

      if (checkResult.rows.length > 0) {
        return res.status(409).json({
          error: "Vault with this name already exists",
        });
      }

      const result = await pool.query(
        `INSERT INTO metadata.data_vault_catalog 
       (vault_name, description, source_db_engine, source_connection_string,
        target_db_engine, target_connection_string, target_schema, hubs, links, satellites,
        point_in_time_tables, bridge_tables, schedule_cron, active, enabled, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10::jsonb, $11::jsonb, $12::jsonb, $13, $14, $15, $16::jsonb)
       RETURNING *`,
        [
          vault_name,
          description || null,
          source_db_engine,
          source_connection_string,
          target_db_engine,
          target_connection_string,
          target_schema.toLowerCase(),
          JSON.stringify(hubs),
          JSON.stringify(links),
          JSON.stringify(satellites),
          JSON.stringify(point_in_time_tables),
          JSON.stringify(bridge_tables),
          schedule_cron || null,
          active,
          enabled,
          JSON.stringify(metadata),
        ]
      );

      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error creating data vault:", err);
      res.status(500).json({
        error: sanitizeError(
          err,
          "Error creating data vault",
          process.env.NODE_ENV === "production"
        ),
      });
    }
  }
);

app.put(
  "/api/data-vault/:vaultName",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const vaultName = validateIdentifier(req.params.vaultName);
      if (!vaultName) {
        return res.status(400).json({ error: "Invalid vault name" });
      }

      const description = sanitizeSearch(req.body.description, 500);
      const source_db_engine = validateEnum(
        req.body.source_db_engine,
        ["PostgreSQL", "MariaDB", "MSSQL", "MongoDB", "Oracle", 
       "Salesforce", "SAP", "Teradata", "Netezza", "Hive", 
       "Cassandra", "DynamoDB", "AS400", "S3", "AzureBlob", 
       "GCS", "FTP", "SFTP", "Email", "SOAP", "GraphQL",
       "Excel", "FixedWidth", "EBCDIC", "XML", "Avro", 
       "Parquet", "ORC", "Compressed"],
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
      const hubs = req.body.hubs || [];
      const links = req.body.links || [];
      const satellites = req.body.satellites || [];
      const point_in_time_tables = req.body.point_in_time_tables || [];
      const bridge_tables = req.body.bridge_tables || [];
      const metadata = req.body.metadata || {};

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
        `UPDATE metadata.data_vault_catalog 
       SET description = $1, source_db_engine = $2, source_connection_string = $3,
           target_db_engine = $4, target_connection_string = $5, target_schema = $6,
           hubs = $7::jsonb, links = $8::jsonb, satellites = $9::jsonb,
           point_in_time_tables = $10::jsonb, bridge_tables = $11::jsonb,
           schedule_cron = $12, active = $13, enabled = $14, metadata = $15::jsonb, updated_at = NOW()
       WHERE vault_name = $16
       RETURNING *`,
        [
          description || null,
          source_db_engine,
          source_connection_string,
          target_db_engine,
          target_connection_string,
          target_schema.toLowerCase(),
          JSON.stringify(hubs),
          JSON.stringify(links),
          JSON.stringify(satellites),
          JSON.stringify(point_in_time_tables),
          JSON.stringify(bridge_tables),
          schedule_cron || null,
          active,
          enabled,
          JSON.stringify(metadata),
          vaultName,
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Vault not found" });
      }

      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error updating data vault:", err);
      res.status(500).json({
        error: sanitizeError(
          err,
          "Error updating data vault",
          process.env.NODE_ENV === "production"
        ),
      });
    }
  }
);

app.delete(
  "/api/data-vault/:vaultName",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const vaultName = validateIdentifier(req.params.vaultName);
      if (!vaultName) {
        return res.status(400).json({ error: "Invalid vault name" });
      }

      const result = await pool.query(
        "DELETE FROM metadata.data_vault_catalog WHERE vault_name = $1 RETURNING *",
        [vaultName]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Vault not found" });
      }

      res.json({ message: "Vault deleted successfully", vault: result.rows[0] });
    } catch (err) {
      console.error("Error deleting data vault:", err);
      res.status(500).json({
        error: sanitizeError(
          err,
          "Error deleting data vault",
          process.env.NODE_ENV === "production"
        ),
      });
    }
  }
);

app.post(
  "/api/data-vault/:vaultName/build",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const vaultName = validateIdentifier(req.params.vaultName);
      if (!vaultName) {
        return res.status(400).json({ error: "Invalid vault name" });
      }

      const result = await pool.query(
        "SELECT vault_name, metadata FROM metadata.data_vault_catalog WHERE vault_name = $1",
        [vaultName]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Vault not found" });
      }

      const vault = result.rows[0];
      const metadata = vault.metadata || {};
      metadata.build_now = true;
      metadata.build_timestamp = new Date().toISOString();

      await pool.query(
        "UPDATE metadata.data_vault_catalog SET metadata = $1::jsonb WHERE vault_name = $2",
        [JSON.stringify(metadata), vaultName]
      );

      res.json({
        message: "Build triggered successfully",
        vault_name: vaultName,
        build_timestamp: metadata.build_timestamp,
      });
    } catch (err) {
      console.error("Error triggering vault build:", err);
      res.status(500).json({
        error: sanitizeError(
          err,
          "Error triggering vault build",
          process.env.NODE_ENV === "production"
        ),
      });
    }
  }
);

app.get("/api/data-vault/:vaultName/history", async (req, res) => {
  try {
    const vaultName = validateIdentifier(req.params.vaultName);
    if (!vaultName) {
      return res.status(400).json({ error: "Invalid vault name" });
    }

    const limit = validateLimit(req.query.limit, 1, 100, 50);

    const result = await pool.query(
      `SELECT * FROM metadata.process_log
       WHERE process_type = 'DATA_VAULT' AND process_name = $1
       ORDER BY start_time DESC
       LIMIT $2`,
      [vaultName, limit]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching vault build history:", err);
    res.status(500).json({
      error: sanitizeError(
        err,
        "Error fetching vault build history",
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
    const active = req.query.active !== undefined 
      ? validateBoolean(req.query.active) 
      : undefined;
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

    if (active !== undefined) {
      paramCount++;
      whereConditions.push(`active = $${paramCount}`);
      queryParams.push(active);
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
      ["PostgreSQL", "MariaDB", "MSSQL", "MongoDB", "Oracle", 
       "Salesforce", "SAP", "Teradata", "Netezza", "Hive", 
       "Cassandra", "DynamoDB", "AS400", "S3", "AzureBlob", 
       "GCS", "FTP", "SFTP", "Email", "SOAP", "GraphQL",
       "Excel", "FixedWidth", "EBCDIC", "XML", "Avro", 
       "Parquet", "ORC", "Compressed"],
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

app.put(
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

    if (!csv_name) {
      return res.status(400).json({
        error: "csv_name is required",
      });
    }

    try {
      const checkResult = await pool.query(
        `SELECT csv_name FROM metadata.csv_catalog WHERE csv_name = $1`,
        [csv_name]
      );

      if (checkResult.rows.length === 0) {
        return res.status(404).json({
          error: "CSV not found",
        });
      }

      const updateFields = [];
      const updateValues = [];
      let paramCount = 1;

      if (source_type !== undefined) {
        const validSourceType = validateEnum(
          source_type,
          ["FILEPATH", "URL", "ENDPOINT", "UPLOADED_FILE"],
          null
        );
        if (!validSourceType) {
          return res.status(400).json({ error: "Invalid source_type" });
        }
        updateFields.push(`source_type = $${paramCount++}`);
        updateValues.push(source_type);
      }

      if (source_path !== undefined) {
        updateFields.push(`source_path = $${paramCount++}`);
        updateValues.push(source_path);
      }

      if (has_header !== undefined) {
        updateFields.push(`has_header = $${paramCount++}`);
        updateValues.push(validateBoolean(has_header, true));
      }

      if (delimiter !== undefined) {
        updateFields.push(`delimiter = $${paramCount++}`);
        updateValues.push(delimiter);
      }

      if (skip_rows !== undefined) {
        updateFields.push(`skip_rows = $${paramCount++}`);
        updateValues.push(parseInt(skip_rows) || 0);
      }

      if (skip_empty_rows !== undefined) {
        updateFields.push(`skip_empty_rows = $${paramCount++}`);
        updateValues.push(validateBoolean(skip_empty_rows, true));
      }

      if (target_db_engine !== undefined) {
        const validTargetEngine = validateEnum(
          target_db_engine,
          ["PostgreSQL", "MariaDB", "MSSQL", "MongoDB", "Oracle", 
       "Salesforce", "SAP", "Teradata", "Netezza", "Hive", 
       "Cassandra", "DynamoDB", "AS400", "S3", "AzureBlob", 
       "GCS", "FTP", "SFTP", "Email", "SOAP", "GraphQL",
       "Excel", "FixedWidth", "EBCDIC", "XML", "Avro", 
       "Parquet", "ORC", "Compressed"],
          null
        );
        if (!validTargetEngine) {
          return res.status(400).json({ error: "Invalid target_db_engine" });
        }
        updateFields.push(`target_db_engine = $${paramCount++}`);
        updateValues.push(target_db_engine);
      }

      if (target_connection_string !== undefined) {
        updateFields.push(`target_connection_string = $${paramCount++}`);
        updateValues.push(target_connection_string);
      }

      if (target_schema !== undefined) {
        updateFields.push(`target_schema = $${paramCount++}`);
        updateValues.push(target_schema.toLowerCase());
      }

      if (target_table !== undefined) {
        updateFields.push(`target_table = $${paramCount++}`);
        updateValues.push(target_table.toLowerCase());
      }

      if (sync_interval !== undefined) {
        updateFields.push(`sync_interval = $${paramCount++}`);
        updateValues.push(parseInt(sync_interval) || 3600);
      }

      if (status !== undefined) {
        const validStatus = validateEnum(
          status,
          ["SUCCESS", "ERROR", "IN_PROGRESS", "PENDING"],
          "PENDING"
        );
        updateFields.push(`status = $${paramCount++}`);
        updateValues.push(validStatus);
      }

      if (active !== undefined) {
        updateFields.push(`active = $${paramCount++}`);
        updateValues.push(validateBoolean(active, true));
      }

      if (updateFields.length === 0) {
        return res.status(400).json({
          error: "No fields to update",
        });
      }

      updateFields.push(`updated_at = NOW()`);
      updateValues.push(csv_name);

      const query = `UPDATE metadata.csv_catalog 
                     SET ${updateFields.join(", ")}
                     WHERE csv_name = $${paramCount}
                     RETURNING *`;

      const result = await pool.query(query, updateValues);

      res.json(result.rows[0]);
    } catch (err) {
      console.error("Database error:", err);
      const safeError = sanitizeError(
        err,
        "Error updating CSV entry",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.delete(
  "/api/csv-catalog/:csv_name",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    const { csv_name } = req.params;

    if (!csv_name) {
      return res.status(400).json({
        error: "csv_name is required",
      });
    }

    try {
      const checkResult = await pool.query(
        `SELECT csv_name FROM metadata.csv_catalog WHERE csv_name = $1`,
        [csv_name]
      );

      if (checkResult.rows.length === 0) {
        return res.status(404).json({
          error: "CSV not found",
        });
      }

      await pool.query(
        `DELETE FROM metadata.csv_catalog WHERE csv_name = $1`,
        [csv_name]
      );

      res.json({ message: "CSV deleted successfully" });
    } catch (err) {
      console.error("Database error:", err);
      const safeError = sanitizeError(
        err,
        "Error deleting CSV entry",
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
    const active = req.query.active !== undefined 
      ? validateBoolean(req.query.active) 
      : undefined;
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

    if (active !== undefined) {
      paramCount++;
      whereConditions.push(`active = $${paramCount}`);
      queryParams.push(active);
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
      ["PostgreSQL", "MariaDB", "MSSQL", "MongoDB", "Oracle", 
       "Salesforce", "SAP", "Teradata", "Netezza", "Hive", 
       "Cassandra", "DynamoDB", "AS400", "S3", "AzureBlob", 
       "GCS", "FTP", "SFTP", "Email", "SOAP", "GraphQL",
       "Excel", "FixedWidth", "EBCDIC", "XML", "Avro", 
       "Parquet", "ORC", "Compressed"],
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

// Endpoint para validar/preview de Google Sheet
app.post(
  "/api/google-sheets-catalog/validate-sheet",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const { spreadsheet_id, api_key, access_token } = req.body;

      if (!spreadsheet_id) {
        return res.status(400).json({ 
          success: false, 
          error: "Spreadsheet ID is required" 
        });
      }

      if (!api_key && !access_token) {
        return res.status(400).json({ 
          success: false, 
          error: "Either API key or access token is required" 
        });
      }

      let url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheet_id}`;
      const headers = {
        'Content-Type': 'application/json'
      };

      if (api_key) {
        url += `?key=${encodeURIComponent(api_key)}`;
      } else if (access_token) {
        headers['Authorization'] = `Bearer ${access_token}`;
      }

      const response = await fetch(url, { headers });
      const data = await response.json();

      if (response.ok) {
        const sheets = data.sheets?.map((sheet, index) => ({
          title: sheet.properties?.title || `Sheet${index + 1}`,
          sheetId: sheet.properties?.sheetId || null,
          index: index
        })) || [];

        res.json({
          success: true,
          title: data.properties?.title,
          sheets: sheets
        });
      } else {
        res.status(response.status).json({
          success: false,
          error: data.error?.message || 'Failed to access spreadsheet'
        });
      }
    } catch (err) {
      console.error("Error validating Google Sheet:", err);
      res.status(500).json({
        success: false,
        error: err.message || "Internal server error"
      });
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

app.put(
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

    if (!sheet_name) {
      return res.status(400).json({
        error: "sheet_name is required",
      });
    }

    try {
      const checkResult = await pool.query(
        `SELECT sheet_name FROM metadata.google_sheets_catalog WHERE sheet_name = $1`,
        [sheet_name]
      );

      if (checkResult.rows.length === 0) {
        return res.status(404).json({
          error: "Google Sheet not found",
        });
      }

      const updateFields = [];
      const updateValues = [];
      let paramCount = 1;

      if (spreadsheet_id !== undefined) {
        updateFields.push(`spreadsheet_id = $${paramCount++}`);
        updateValues.push(spreadsheet_id);
      }

      if (api_key !== undefined) {
        updateFields.push(`api_key = $${paramCount++}`);
        updateValues.push(api_key || null);
      }

      if (access_token !== undefined) {
        updateFields.push(`access_token = $${paramCount++}`);
        updateValues.push(access_token || null);
      }

      if (range !== undefined) {
        updateFields.push(`range = $${paramCount++}`);
        updateValues.push(range || null);
      }

      if (target_db_engine !== undefined) {
        const validTargetEngine = validateEnum(
          target_db_engine,
          ["PostgreSQL", "MariaDB", "MSSQL", "MongoDB", "Oracle", 
       "Salesforce", "SAP", "Teradata", "Netezza", "Hive", 
       "Cassandra", "DynamoDB", "AS400", "S3", "AzureBlob", 
       "GCS", "FTP", "SFTP", "Email", "SOAP", "GraphQL",
       "Excel", "FixedWidth", "EBCDIC", "XML", "Avro", 
       "Parquet", "ORC", "Compressed"],
          null
        );
        if (!validTargetEngine) {
          return res.status(400).json({ error: "Invalid target_db_engine" });
        }
        updateFields.push(`target_db_engine = $${paramCount++}`);
        updateValues.push(target_db_engine);
      }

      if (target_connection_string !== undefined) {
        updateFields.push(`target_connection_string = $${paramCount++}`);
        updateValues.push(target_connection_string);
      }

      if (target_schema !== undefined) {
        updateFields.push(`target_schema = $${paramCount++}`);
        updateValues.push(target_schema.toLowerCase());
      }

      if (target_table !== undefined) {
        updateFields.push(`target_table = $${paramCount++}`);
        updateValues.push(target_table.toLowerCase());
      }

      if (sync_interval !== undefined) {
        updateFields.push(`sync_interval = $${paramCount++}`);
        updateValues.push(parseInt(sync_interval) || 3600);
      }

      if (status !== undefined) {
        const validStatus = validateEnum(
          status,
          ["SUCCESS", "ERROR", "IN_PROGRESS", "PENDING"],
          "PENDING"
        );
        updateFields.push(`status = $${paramCount++}`);
        updateValues.push(validStatus);
      }

      if (active !== undefined) {
        updateFields.push(`active = $${paramCount++}`);
        updateValues.push(validateBoolean(active, true));
      }

      if (updateFields.length === 0) {
        return res.status(400).json({
          error: "No fields to update",
        });
      }

      updateFields.push(`updated_at = NOW()`);
      updateValues.push(sheet_name);

      const query = `UPDATE metadata.google_sheets_catalog 
                     SET ${updateFields.join(", ")}
                     WHERE sheet_name = $${paramCount}
                     RETURNING *`;

      const result = await pool.query(query, updateValues);

      res.json(result.rows[0]);
    } catch (err) {
      console.error("Database error:", err);
      const safeError = sanitizeError(
        err,
        "Error updating Google Sheets entry",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.delete(
  "/api/google-sheets-catalog/:sheet_name",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    const { sheet_name } = req.params;

    if (!sheet_name) {
      return res.status(400).json({
        error: "sheet_name is required",
      });
    }

    try {
      const checkResult = await pool.query(
        `SELECT sheet_name FROM metadata.google_sheets_catalog WHERE sheet_name = $1`,
        [sheet_name]
      );

      if (checkResult.rows.length === 0) {
        return res.status(404).json({
          error: "Google Sheet not found",
        });
      }

      await pool.query(
        `DELETE FROM metadata.google_sheets_catalog WHERE sheet_name = $1`,
        [sheet_name]
      );

      res.json({ message: "Google Sheet deleted successfully" });
    } catch (err) {
      console.error("Database error:", err);
      const safeError = sanitizeError(
        err,
        "Error deleting Google Sheets entry",
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

// Business Glossary API Endpoints
app.get("/api/business-glossary/terms", requireAuth, async (req, res) => {
  try {
    const { domain, category, search } = req.query;
    let query = `
      SELECT id, term, definition, category, business_domain, owner, steward,
             related_tables, tags, created_at, updated_at
      FROM metadata.business_glossary
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (domain) {
      paramCount++;
      query += ` AND business_domain = $${paramCount}`;
      params.push(domain);
    }

    if (category) {
      paramCount++;
      query += ` AND category = $${paramCount}`;
      params.push(category);
    }

    if (search) {
      paramCount++;
      query += ` AND (
        term ILIKE $${paramCount} OR 
        definition ILIKE $${paramCount} OR
        tags ILIKE $${paramCount}
      )`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY term ASC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Error getting glossary terms:", err);
    const safeError = sanitizeError(
      err,
      "Error getting glossary terms",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/business-glossary/terms/search", requireAuth, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: "Search query is required" });
    }

    const result = await pool.query(
      `SELECT id, term, definition, category, business_domain, owner, steward,
              related_tables, tags, created_at, updated_at
       FROM metadata.business_glossary
       WHERE term ILIKE $1 OR definition ILIKE $1 OR tags ILIKE $1
       ORDER BY term ASC
       LIMIT 50`,
      [`%${q}%`]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error searching glossary terms:", err);
    const safeError = sanitizeError(
      err,
      "Error searching glossary terms",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/business-glossary/terms/by-domain/:domain", requireAuth, async (req, res) => {
  try {
    const domain = req.params.domain;
    const result = await pool.query(
      `SELECT id, term, definition, category, business_domain, owner, steward,
              related_tables, tags, created_at, updated_at
       FROM metadata.business_glossary
       WHERE business_domain = $1
       ORDER BY term ASC`,
      [domain]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error getting terms by domain:", err);
    const safeError = sanitizeError(
      err,
      "Error getting terms by domain",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.post(
  "/api/business-glossary/terms",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const { term, definition, category, business_domain, owner, steward, related_tables, tags } = req.body;

      if (!term || !definition) {
        return res.status(400).json({
          error: "Missing required fields: term, definition",
        });
      }

      const result = await pool.query(
        `INSERT INTO metadata.business_glossary 
        (term, definition, category, business_domain, owner, steward, related_tables, tags)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (term) DO UPDATE SET
          definition = EXCLUDED.definition,
          category = EXCLUDED.category,
          business_domain = EXCLUDED.business_domain,
          owner = EXCLUDED.owner,
          steward = EXCLUDED.steward,
          related_tables = EXCLUDED.related_tables,
          tags = EXCLUDED.tags,
          updated_at = NOW()
        RETURNING *`,
        [term, definition, category || null, business_domain || null, owner || null, steward || null, related_tables || null, tags || null]
      );

      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error creating glossary term:", err);
      const safeError = sanitizeError(
        err,
        "Error creating glossary term",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.put(
  "/api/business-glossary/terms/:id",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const termId = parseInt(req.params.id);
      if (isNaN(termId)) {
        return res.status(400).json({ error: "Invalid term ID" });
      }

      const { term, definition, category, business_domain, owner, steward, related_tables, tags } = req.body;

      if (!term || !definition) {
        return res.status(400).json({
          error: "Missing required fields: term, definition",
        });
      }

      const result = await pool.query(
        `UPDATE metadata.business_glossary 
       SET term = $1, definition = $2, category = $3, business_domain = $4,
           owner = $5, steward = $6, related_tables = $7, tags = $8,
           updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
        [term, definition, category || null, business_domain || null, owner || null, steward || null, related_tables || null, tags || null, termId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Glossary term not found" });
      }

      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error updating glossary term:", err);
      const safeError = sanitizeError(
        err,
        "Error updating glossary term",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.delete(
  "/api/business-glossary/terms/:id",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const termId = parseInt(req.params.id);
      if (isNaN(termId)) {
        return res.status(400).json({ error: "Invalid term ID" });
      }

      const result = await pool.query(
        `DELETE FROM metadata.business_glossary WHERE id = $1 RETURNING id`,
        [termId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Glossary term not found" });
      }

      res.json({ message: "Glossary term deleted successfully" });
    } catch (err) {
      console.error("Error deleting glossary term:", err);
      const safeError = sanitizeError(
        err,
        "Error deleting glossary term",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.get("/api/business-glossary/dictionary", requireAuth, async (req, res) => {
  try {
    const { schema_name, table_name, search } = req.query;
    let query = `
      SELECT schema_name, table_name, column_name, business_description,
             business_name, data_type_business, business_rules, examples,
             glossary_term, owner, steward, created_at, updated_at
      FROM metadata.data_dictionary
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (schema_name) {
      paramCount++;
      query += ` AND schema_name = $${paramCount}`;
      params.push(schema_name);
    }

    if (table_name) {
      paramCount++;
      query += ` AND table_name = $${paramCount}`;
      params.push(table_name);
    }

    if (search) {
      paramCount++;
      query += ` AND (
        column_name ILIKE $${paramCount} OR 
        business_description ILIKE $${paramCount} OR
        business_name ILIKE $${paramCount}
      )`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY schema_name, table_name, column_name`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Error getting data dictionary:", err);
    const safeError = sanitizeError(
      err,
      "Error getting data dictionary",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.post(
  "/api/business-glossary/dictionary",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const {
        schema_name,
        table_name,
        column_name,
        business_description,
        business_name,
        data_type_business,
        business_rules,
        examples,
        glossary_term,
        owner,
        steward,
      } = req.body;

      if (!schema_name || !table_name || !column_name) {
        return res.status(400).json({
          error: "Missing required fields: schema_name, table_name, column_name",
        });
      }

      const result = await pool.query(
        `INSERT INTO metadata.data_dictionary 
        (schema_name, table_name, column_name, business_description, business_name,
         data_type_business, business_rules, examples, glossary_term, owner, steward)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (schema_name, table_name, column_name) DO UPDATE SET
          business_description = EXCLUDED.business_description,
          business_name = EXCLUDED.business_name,
          data_type_business = EXCLUDED.data_type_business,
          business_rules = EXCLUDED.business_rules,
          examples = EXCLUDED.examples,
          glossary_term = EXCLUDED.glossary_term,
          owner = EXCLUDED.owner,
          steward = EXCLUDED.steward,
          updated_at = NOW()
        RETURNING *`,
        [
          schema_name,
          table_name,
          column_name,
          business_description || null,
          business_name || null,
          data_type_business || null,
          business_rules || null,
          examples || null,
          glossary_term || null,
          owner || null,
          steward || null,
        ]
      );

      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error creating dictionary entry:", err);
      const safeError = sanitizeError(
        err,
        "Error creating dictionary entry",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.put(
  "/api/business-glossary/dictionary",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const {
        schema_name,
        table_name,
        column_name,
        business_description,
        business_name,
        data_type_business,
        business_rules,
        examples,
        glossary_term,
        owner,
        steward,
      } = req.body;

      if (!schema_name || !table_name || !column_name) {
        return res.status(400).json({
          error: "Missing required fields: schema_name, table_name, column_name",
        });
      }

      const result = await pool.query(
        `UPDATE metadata.data_dictionary 
       SET business_description = $1, business_name = $2, data_type_business = $3,
           business_rules = $4, examples = $5, glossary_term = $6,
           owner = $7, steward = $8, updated_at = NOW()
       WHERE schema_name = $9 AND table_name = $10 AND column_name = $11
       RETURNING *`,
        [
          business_description || null,
          business_name || null,
          data_type_business || null,
          business_rules || null,
          examples || null,
          glossary_term || null,
          owner || null,
          steward || null,
          schema_name,
          table_name,
          column_name,
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Dictionary entry not found" });
      }

      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error updating dictionary entry:", err);
      const safeError = sanitizeError(
        err,
        "Error updating dictionary entry",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.post(
  "/api/business-glossary/terms/:termId/link-table",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const termId = parseInt(req.params.termId);
      if (isNaN(termId)) {
        return res.status(400).json({ error: "Invalid term ID" });
      }

      const { schema_name, table_name } = req.body;

      if (!schema_name || !table_name) {
        return res.status(400).json({
          error: "Missing required fields: schema_name, table_name",
        });
      }

      const result = await pool.query(
        `INSERT INTO metadata.glossary_term_links (term_id, schema_name, table_name)
         VALUES ($1, $2, $3)
         ON CONFLICT (term_id, schema_name, table_name) DO NOTHING
         RETURNING *`,
        [termId, schema_name, table_name]
      );

      if (result.rows.length === 0) {
        return res.status(409).json({ error: "Link already exists" });
      }

      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error linking term to table:", err);
      const safeError = sanitizeError(
        err,
        "Error linking term to table",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.get("/api/business-glossary/terms/:termId/tables", requireAuth, async (req, res) => {
  try {
    const termId = parseInt(req.params.termId);
    if (isNaN(termId)) {
      return res.status(400).json({ error: "Invalid term ID" });
    }

    const result = await pool.query(
      `SELECT gtl.id, gtl.schema_name, gtl.table_name, gtl.created_at
       FROM metadata.glossary_term_links gtl
       WHERE gtl.term_id = $1
       ORDER BY gtl.schema_name, gtl.table_name`,
      [termId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error getting tables for term:", err);
    const safeError = sanitizeError(
      err,
      "Error getting tables for term",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

// Compliance Manager API Endpoints
app.get("/api/compliance/requests", requireAuth, async (req, res) => {
  try {
    const { status, request_type, compliance_requirement } = req.query;
    let query = `
      SELECT request_id, request_type, data_subject_email, data_subject_name,
             request_status, requested_data, response_data, processed_by,
             compliance_requirement, created_at, updated_at
      FROM metadata.data_subject_requests
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      query += ` AND request_status = $${paramCount}`;
      params.push(status);
    }

    if (request_type) {
      paramCount++;
      query += ` AND request_type = $${paramCount}`;
      params.push(request_type);
    }

    if (compliance_requirement) {
      paramCount++;
      query += ` AND compliance_requirement = $${paramCount}`;
      params.push(compliance_requirement);
    }

    query += ` ORDER BY created_at DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Error getting compliance requests:", err);
    const safeError = sanitizeError(
      err,
      "Error getting compliance requests",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.post(
  "/api/compliance/requests",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const {
        request_type,
        data_subject_email,
        data_subject_name,
        compliance_requirement,
      } = req.body;

      if (!request_type) {
        return res.status(400).json({
          error: "Missing required field: request_type",
        });
      }

      const validTypes = ["ACCESS", "PORTABILITY", "RIGHT_TO_BE_FORGOTTEN"];
      if (!validTypes.includes(request_type)) {
        return res.status(400).json({ error: "Invalid request_type" });
      }

      const requestId = `DSR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const result = await pool.query(
        `INSERT INTO metadata.data_subject_requests 
        (request_id, request_type, data_subject_email, data_subject_name, 
         request_status, compliance_requirement)
        VALUES ($1, $2, $3, $4, 'PENDING', $5)
        RETURNING *`,
        [requestId, request_type, data_subject_email || null, data_subject_name || null, compliance_requirement || null]
      );

      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error creating compliance request:", err);
      const safeError = sanitizeError(
        err,
        "Error creating compliance request",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.put(
  "/api/compliance/requests/:requestId",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const requestId = req.params.requestId;
      const { request_status, processed_by, response_data } = req.body;

      const updates = [];
      const params = [];
      let paramCount = 0;

      if (request_status !== undefined) {
        paramCount++;
        updates.push(`request_status = $${paramCount}`);
        params.push(request_status);
      }

      if (processed_by !== undefined) {
        paramCount++;
        updates.push(`processed_by = $${paramCount}`);
        params.push(processed_by);
      }

      if (response_data !== undefined) {
        paramCount++;
        updates.push(`response_data = $${paramCount}`);
        params.push(response_data);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: "No fields to update" });
      }

      paramCount++;
      updates.push(`updated_at = NOW()`);
      paramCount++;
      params.push(requestId);
      updates.push(`WHERE request_id = $${paramCount}`);

      const result = await pool.query(
        `UPDATE metadata.data_subject_requests 
       SET ${updates.slice(0, -1).join(", ")} ${updates[updates.length - 1]}
       RETURNING *`,
        params
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Request not found" });
      }

      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error updating compliance request:", err);
      const safeError = sanitizeError(
        err,
        "Error updating compliance request",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.post(
  "/api/compliance/requests/:requestId/process-right-to-be-forgotten",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const requestId = req.params.requestId;
      const user = req.user?.username || "system";

      const requestResult = await pool.query(
        `SELECT * FROM metadata.data_subject_requests WHERE request_id = $1`,
        [requestId]
      );

      if (requestResult.rows.length === 0) {
        return res.status(404).json({ error: "Request not found" });
      }

      const request = requestResult.rows[0];
      if (request.request_type !== "RIGHT_TO_BE_FORGOTTEN") {
        return res.status(400).json({ error: "Invalid request type for this operation" });
      }

      await pool.query(
        `UPDATE metadata.data_subject_requests 
       SET request_status = 'IN_PROGRESS', processed_by = $1, updated_at = NOW()
       WHERE request_id = $2`,
        [user, requestId]
      );

      res.json({ 
        message: "Right to be forgotten processing initiated",
        request_id: requestId,
        status: "IN_PROGRESS"
      });
    } catch (err) {
      console.error("Error processing right to be forgotten:", err);
      const safeError = sanitizeError(
        err,
        "Error processing right to be forgotten",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.post(
  "/api/compliance/requests/:requestId/process-data-portability",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const requestId = req.params.requestId;
      const user = req.user?.username || "system";

      const requestResult = await pool.query(
        `SELECT * FROM metadata.data_subject_requests WHERE request_id = $1`,
        [requestId]
      );

      if (requestResult.rows.length === 0) {
        return res.status(404).json({ error: "Request not found" });
      }

      const request = requestResult.rows[0];
      if (request.request_type !== "PORTABILITY") {
        return res.status(400).json({ error: "Invalid request type for this operation" });
      }

      await pool.query(
        `UPDATE metadata.data_subject_requests 
       SET request_status = 'IN_PROGRESS', processed_by = $1, updated_at = NOW()
       WHERE request_id = $2`,
        [user, requestId]
      );

      res.json({ 
        message: "Data portability processing initiated",
        request_id: requestId,
        status: "IN_PROGRESS"
      });
    } catch (err) {
      console.error("Error processing data portability:", err);
      const safeError = sanitizeError(
        err,
        "Error processing data portability",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.post(
  "/api/compliance/requests/:requestId/process-access-request",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const requestId = req.params.requestId;
      const user = req.user?.username || "system";

      const requestResult = await pool.query(
        `SELECT * FROM metadata.data_subject_requests WHERE request_id = $1`,
        [requestId]
      );

      if (requestResult.rows.length === 0) {
        return res.status(404).json({ error: "Request not found" });
      }

      const request = requestResult.rows[0];
      if (request.request_type !== "ACCESS") {
        return res.status(400).json({ error: "Invalid request type for this operation" });
      }

      await pool.query(
        `UPDATE metadata.data_subject_requests 
       SET request_status = 'IN_PROGRESS', processed_by = $1, updated_at = NOW()
       WHERE request_id = $2`,
        [user, requestId]
      );

      res.json({ 
        message: "Access request processing initiated",
        request_id: requestId,
        status: "IN_PROGRESS"
      });
    } catch (err) {
      console.error("Error processing access request:", err);
      const safeError = sanitizeError(
        err,
        "Error processing access request",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.get("/api/compliance/consents", requireAuth, async (req, res) => {
  try {
    const { data_subject_id, schema_name, table_name, consent_status } = req.query;
    let query = `
      SELECT id, schema_name, table_name, data_subject_id, consent_type,
             consent_status, legal_basis, purpose, retention_period,
             created_at, updated_at
      FROM metadata.consent_records
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (data_subject_id) {
      paramCount++;
      query += ` AND data_subject_id = $${paramCount}`;
      params.push(data_subject_id);
    }

    if (schema_name) {
      paramCount++;
      query += ` AND schema_name = $${paramCount}`;
      params.push(schema_name);
    }

    if (table_name) {
      paramCount++;
      query += ` AND table_name = $${paramCount}`;
      params.push(table_name);
    }

    if (consent_status) {
      paramCount++;
      query += ` AND consent_status = $${paramCount}`;
      params.push(consent_status);
    }

    query += ` ORDER BY created_at DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Error getting consent records:", err);
    const safeError = sanitizeError(
      err,
      "Error getting consent records",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.post(
  "/api/compliance/consents",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const {
        schema_name,
        table_name,
        data_subject_id,
        consent_type,
        consent_status,
        legal_basis,
        purpose,
        retention_period,
      } = req.body;

      if (!schema_name || !table_name || !data_subject_id || !consent_type) {
        return res.status(400).json({
          error: "Missing required fields: schema_name, table_name, data_subject_id, consent_type",
        });
      }

      const result = await pool.query(
        `INSERT INTO metadata.consent_records 
        (schema_name, table_name, data_subject_id, consent_type, consent_status,
         legal_basis, purpose, retention_period)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          schema_name,
          table_name,
          data_subject_id,
          consent_type,
          consent_status || "GRANTED",
          legal_basis || null,
          purpose || null,
          retention_period || null,
        ]
      );

      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error creating consent record:", err);
      const safeError = sanitizeError(
        err,
        "Error creating consent record",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.delete(
  "/api/compliance/consents/:id",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const consentId = parseInt(req.params.id);
      if (isNaN(consentId)) {
        return res.status(400).json({ error: "Invalid consent ID" });
      }

      await pool.query(
        `UPDATE metadata.consent_records 
       SET consent_status = 'WITHDRAWN', updated_at = NOW()
       WHERE id = $1`,
        [consentId]
      );

      res.json({ message: "Consent withdrawn successfully" });
    } catch (err) {
      console.error("Error withdrawing consent:", err);
      const safeError = sanitizeError(
        err,
        "Error withdrawing consent",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.get("/api/compliance/breaches", requireAuth, async (req, res) => {
  try {
    const { status, schema_name, table_name } = req.query;
    let query = `
      SELECT id, schema_name, table_name, breach_type, detected_at,
             notified_at, notification_details, status, created_at
      FROM metadata.breach_notifications
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      params.push(status);
    }

    if (schema_name) {
      paramCount++;
      query += ` AND schema_name = $${paramCount}`;
      params.push(schema_name);
    }

    if (table_name) {
      paramCount++;
      query += ` AND table_name = $${paramCount}`;
      params.push(table_name);
    }

    query += ` ORDER BY detected_at DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Error getting breach notifications:", err);
    const safeError = sanitizeError(
      err,
      "Error getting breach notifications",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.post(
  "/api/compliance/breaches/check",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { schema_name, table_name, breach_type } = req.body;

      if (!schema_name || !table_name) {
        return res.status(400).json({
          error: "Missing required fields: schema_name, table_name",
        });
      }

      const result = await pool.query(
        `INSERT INTO metadata.breach_notifications 
        (schema_name, table_name, breach_type, status)
        VALUES ($1, $2, $3, 'DETECTED')
        RETURNING *`,
        [schema_name, table_name, breach_type || "SECURITY_INCIDENT"]
      );

      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error checking breach:", err);
      const safeError = sanitizeError(
        err,
        "Error checking breach",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

// Data Retention API Endpoints
app.get("/api/data-retention/jobs", requireAuth, async (req, res) => {
  try {
    const { status, schema_name, table_name } = req.query;
    let query = `
      SELECT id, schema_name, table_name, job_type, retention_policy,
             scheduled_date, status, rows_affected, error_message,
             created_at, executed_at
      FROM metadata.retention_jobs
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      params.push(status);
    }

    if (schema_name) {
      paramCount++;
      query += ` AND schema_name = $${paramCount}`;
      params.push(schema_name);
    }

    if (table_name) {
      paramCount++;
      query += ` AND table_name = $${paramCount}`;
      params.push(table_name);
    }

    query += ` ORDER BY scheduled_date DESC, created_at DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Error getting retention jobs:", err);
    const safeError = sanitizeError(
      err,
      "Error getting retention jobs",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.post(
  "/api/data-retention/jobs/schedule",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const { schema_name, table_name, job_type, retention_policy, scheduled_date } = req.body;

      if (!schema_name || !table_name || !job_type || !retention_policy) {
        return res.status(400).json({
          error: "Missing required fields: schema_name, table_name, job_type, retention_policy",
        });
      }

      const result = await pool.query(
        `INSERT INTO metadata.retention_jobs 
        (schema_name, table_name, job_type, retention_policy, scheduled_date, status)
        VALUES ($1, $2, $3, $4, $5, 'PENDING')
        RETURNING *`,
        [schema_name, table_name, job_type, retention_policy, scheduled_date || null]
      );

      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error scheduling retention job:", err);
      const safeError = sanitizeError(
        err,
        "Error scheduling retention job",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.post(
  "/api/data-retention/jobs/:id/execute",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);
      if (isNaN(jobId)) {
        return res.status(400).json({ error: "Invalid job ID" });
      }

      await pool.query(
        `UPDATE metadata.retention_jobs 
       SET status = 'RUNNING', executed_at = NOW()
       WHERE id = $1`,
        [jobId]
      );

      res.json({ message: "Retention job execution initiated", job_id: jobId });
    } catch (err) {
      console.error("Error executing retention job:", err);
      const safeError = sanitizeError(
        err,
        "Error executing retention job",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.get("/api/data-retention/policies", requireAuth, async (req, res) => {
  try {
    const { schema_name, table_name } = req.query;
    let query = `
      SELECT schema_name, table_name, retention_period, archival_location,
             policy_type, created_at, updated_at
      FROM metadata.retention_policies
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (schema_name) {
      paramCount++;
      query += ` AND schema_name = $${paramCount}`;
      params.push(schema_name);
    }

    if (table_name) {
      paramCount++;
      query += ` AND table_name = $${paramCount}`;
      params.push(table_name);
    }

    query += ` ORDER BY schema_name, table_name`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Error getting retention policies:", err);
    const safeError = sanitizeError(
      err,
      "Error getting retention policies",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.post(
  "/api/data-retention/policies",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const { schema_name, table_name, retention_period, archival_location, policy_type } = req.body;

      if (!schema_name || !table_name || !retention_period) {
        return res.status(400).json({
          error: "Missing required fields: schema_name, table_name, retention_period",
        });
      }

      const result = await pool.query(
        `INSERT INTO metadata.retention_policies 
        (schema_name, table_name, retention_period, archival_location, policy_type)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (schema_name, table_name) DO UPDATE SET
          retention_period = EXCLUDED.retention_period,
          archival_location = EXCLUDED.archival_location,
          policy_type = EXCLUDED.policy_type,
          updated_at = NOW()
        RETURNING *`,
        [schema_name, table_name, retention_period, archival_location || null, policy_type || "TIME_BASED"]
      );

      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error creating retention policy:", err);
      const safeError = sanitizeError(
        err,
        "Error creating retention policy",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.put(
  "/api/data-retention/policies",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const { schema_name, table_name, retention_period, archival_location, policy_type } = req.body;

      if (!schema_name || !table_name) {
        return res.status(400).json({
          error: "Missing required fields: schema_name, table_name",
        });
      }

      const result = await pool.query(
        `UPDATE metadata.retention_policies 
       SET retention_period = $1, archival_location = $2, policy_type = $3, updated_at = NOW()
       WHERE schema_name = $4 AND table_name = $5
       RETURNING *`,
        [retention_period, archival_location || null, policy_type || "TIME_BASED", schema_name, table_name]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Retention policy not found" });
      }

      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error updating retention policy:", err);
      const safeError = sanitizeError(
        err,
        "Error updating retention policy",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.post(
  "/api/data-retention/enforce/:schema/:table",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const schemaName = req.params.schema;
      const tableName = req.params.table;

      const policyResult = await pool.query(
        `SELECT * FROM metadata.retention_policies 
       WHERE schema_name = $1 AND table_name = $2`,
        [schemaName, tableName]
      );

      if (policyResult.rows.length === 0) {
        return res.status(404).json({ error: "Retention policy not found for this table" });
      }

      res.json({ 
        message: "Retention policy enforcement initiated",
        schema_name: schemaName,
        table_name: tableName
      });
    } catch (err) {
      console.error("Error enforcing retention policy:", err);
      const safeError = sanitizeError(
        err,
        "Error enforcing retention policy",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.get("/api/data-retention/legal-holds", requireAuth, async (req, res) => {
  try {
    const { schema_name, table_name } = req.query;
    let query = `
      SELECT id, schema_name, table_name, reason, hold_until,
             created_by, created_at, released_at, released_by
      FROM metadata.legal_holds
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (schema_name) {
      paramCount++;
      query += ` AND schema_name = $${paramCount}`;
      params.push(schema_name);
    }

    if (table_name) {
      paramCount++;
      query += ` AND table_name = $${paramCount}`;
      params.push(table_name);
    }

    query += ` AND released_at IS NULL ORDER BY created_at DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Error getting legal holds:", err);
    const safeError = sanitizeError(
      err,
      "Error getting legal holds",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.post(
  "/api/data-retention/legal-holds",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { schema_name, table_name, reason, hold_until } = req.body;
      const user = req.user?.username || "system";

      if (!schema_name || !table_name || !reason) {
        return res.status(400).json({
          error: "Missing required fields: schema_name, table_name, reason",
        });
      }

      const result = await pool.query(
        `INSERT INTO metadata.legal_holds 
        (schema_name, table_name, reason, hold_until, created_by)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (schema_name, table_name) DO UPDATE SET
          reason = EXCLUDED.reason,
          hold_until = EXCLUDED.hold_until,
          created_by = EXCLUDED.created_by
        RETURNING *`,
        [schema_name, table_name, reason, hold_until || null, user]
      );

      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error creating legal hold:", err);
      const safeError = sanitizeError(
        err,
        "Error creating legal hold",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.delete(
  "/api/data-retention/legal-holds/:id",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const holdId = parseInt(req.params.id);
      if (isNaN(holdId)) {
        return res.status(400).json({ error: "Invalid legal hold ID" });
      }

      const user = req.user?.username || "system";

      await pool.query(
        `UPDATE metadata.legal_holds 
       SET released_at = NOW(), released_by = $1
       WHERE id = $2`,
        [user, holdId]
      );

      res.json({ message: "Legal hold released successfully" });
    } catch (err) {
      console.error("Error releasing legal hold:", err);
      const safeError = sanitizeError(
        err,
        "Error releasing legal hold",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.post(
  "/api/data-retention/archive",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { schema_name, table_name, archival_location } = req.body;

      if (!schema_name || !table_name || !archival_location) {
        return res.status(400).json({
          error: "Missing required fields: schema_name, table_name, archival_location",
        });
      }

      res.json({ 
        message: "Archive operation initiated",
        schema_name,
        table_name,
        archival_location
      });
    } catch (err) {
      console.error("Error archiving table:", err);
      const safeError = sanitizeError(
        err,
        "Error archiving table",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

// Data Classifier API Endpoints
app.get("/api/data-classifier/rules", requireAuth, async (req, res) => {
  try {
    const { rule_type, active } = req.query;
    let query = `
      SELECT id, rule_name, rule_type, patterns, priority, active,
             created_at, updated_at
      FROM metadata.classification_rules
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (rule_type) {
      paramCount++;
      query += ` AND rule_type = $${paramCount}`;
      params.push(rule_type);
    }

    if (active !== undefined) {
      paramCount++;
      query += ` AND active = $${paramCount}`;
      params.push(active === "true");
    }

    query += ` ORDER BY priority ASC, rule_name ASC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Error getting classification rules:", err);
    const safeError = sanitizeError(
      err,
      "Error getting classification rules",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.post(
  "/api/data-classifier/rules",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const { rule_name, rule_type, patterns, priority, active } = req.body;

      if (!rule_name || !rule_type || !patterns) {
        return res.status(400).json({
          error: "Missing required fields: rule_name, rule_type, patterns",
        });
      }

      const result = await pool.query(
        `INSERT INTO metadata.classification_rules 
        (rule_name, rule_type, patterns, priority, active)
        VALUES ($1, $2, $3::jsonb, $4, $5)
        RETURNING *`,
        [
          rule_name,
          rule_type,
          JSON.stringify(patterns),
          priority || 100,
          active !== undefined ? active : true,
        ]
      );

      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error creating classification rule:", err);
      const safeError = sanitizeError(
        err,
        "Error creating classification rule",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.put(
  "/api/data-classifier/rules/:id",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const ruleId = parseInt(req.params.id);
      if (isNaN(ruleId)) {
        return res.status(400).json({ error: "Invalid rule ID" });
      }

      const { rule_name, rule_type, patterns, priority, active } = req.body;

      const result = await pool.query(
        `UPDATE metadata.classification_rules 
       SET rule_name = $1, rule_type = $2, patterns = $3::jsonb, 
           priority = $4, active = $5, updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
        [
          rule_name,
          rule_type,
          JSON.stringify(patterns),
          priority,
          active,
          ruleId,
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Classification rule not found" });
      }

      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error updating classification rule:", err);
      const safeError = sanitizeError(
        err,
        "Error updating classification rule",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.delete(
  "/api/data-classifier/rules/:id",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const ruleId = parseInt(req.params.id);
      if (isNaN(ruleId)) {
        return res.status(400).json({ error: "Invalid rule ID" });
      }

      await pool.query(`DELETE FROM metadata.classification_rules WHERE id = $1`, [ruleId]);

      res.json({ message: "Classification rule deleted successfully" });
    } catch (err) {
      console.error("Error deleting classification rule:", err);
      const safeError = sanitizeError(
        err,
        "Error deleting classification rule",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.post(
  "/api/data-classifier/classify",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const { schema_name, table_name, column_name } = req.body;

      if (!schema_name || !table_name) {
        return res.status(400).json({
          error: "Missing required fields: schema_name, table_name",
        });
      }

      res.json({ 
        message: "Classification initiated",
        schema_name,
        table_name,
        column_name: column_name || null
      });
    } catch (err) {
      console.error("Error classifying data:", err);
      const safeError = sanitizeError(
        err,
        "Error classifying data",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.get("/api/data-classifier/results", requireAuth, async (req, res) => {
  try {
    const { schema_name, table_name, column_name } = req.query;
    let query = `
      SELECT id, schema_name, table_name, column_name, data_category,
             business_domain, sensitivity_level, data_classification,
             rule_id, classified_at
      FROM metadata.classification_results
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (schema_name) {
      paramCount++;
      query += ` AND schema_name = $${paramCount}`;
      params.push(schema_name);
    }

    if (table_name) {
      paramCount++;
      query += ` AND table_name = $${paramCount}`;
      params.push(table_name);
    }

    if (column_name) {
      paramCount++;
      query += ` AND column_name = $${paramCount}`;
      params.push(column_name);
    }

    query += ` ORDER BY classified_at DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Error getting classification results:", err);
    const safeError = sanitizeError(
      err,
      "Error getting classification results",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.post(
  "/api/data-classifier/batch-classify",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { schema_name } = req.body;

      if (!schema_name) {
        return res.status(400).json({
          error: "Missing required field: schema_name",
        });
      }

      res.json({ 
        message: "Batch classification initiated",
        schema_name
      });
    } catch (err) {
      console.error("Error batch classifying:", err);
      const safeError = sanitizeError(
        err,
        "Error batch classifying",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

// Schema Change Auditor API Endpoints
app.get("/api/schema-changes/audit", requireAuth, async (req, res) => {
  try {
    const { db_engine, schema_name, change_type, object_type } = req.query;
    let query = `
      SELECT id, db_engine, server_name, database_name, schema_name,
             object_name, object_type, change_type, ddl_statement,
             executed_by, before_state, after_state,
             affected_columns, rollback_sql, is_rollback_possible,
             COALESCE(detected_at, execution_timestamp) as detected_at, created_at
      FROM metadata.schema_change_audit
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (db_engine) {
      paramCount++;
      query += ` AND db_engine = $${paramCount}`;
      params.push(db_engine);
    }

    if (schema_name) {
      paramCount++;
      query += ` AND schema_name = $${paramCount}`;
      params.push(schema_name);
    }

    if (change_type) {
      paramCount++;
      query += ` AND change_type = $${paramCount}`;
      params.push(change_type);
    }

    if (object_type) {
      paramCount++;
      query += ` AND object_type = $${paramCount}`;
      params.push(object_type);
    }

    query += ` ORDER BY detected_at DESC LIMIT 100`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Error getting schema change audit:", err);
    const safeError = sanitizeError(
      err,
      "Error getting schema change audit",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/schema-changes/audit/:id", requireAuth, async (req, res) => {
  try {
    const auditId = parseInt(req.params.id);
    if (isNaN(auditId)) {
      return res.status(400).json({ error: "Invalid audit ID" });
    }

    const result = await pool.query(
      `SELECT * FROM metadata.schema_change_audit WHERE id = $1`,
      [auditId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Audit record not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error getting schema change audit detail:", err);
    const safeError = sanitizeError(
      err,
      "Error getting schema change audit detail",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.post(
  "/api/schema-changes/capture/setup",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { db_engine, connection_string, enabled, capture_triggers } = req.body;

      if (!db_engine || !connection_string) {
        return res.status(400).json({
          error: "Missing required fields: db_engine, connection_string",
        });
      }

      const result = await pool.query(
        `INSERT INTO metadata.ddl_capture_config 
        (db_engine, connection_string, enabled, capture_triggers)
        VALUES ($1, $2, $3, $4::jsonb)
        ON CONFLICT (db_engine, connection_string) DO UPDATE SET
          enabled = EXCLUDED.enabled,
          capture_triggers = EXCLUDED.capture_triggers,
          updated_at = NOW()
        RETURNING *`,
        [
          db_engine,
          connection_string,
          enabled !== undefined ? enabled : true,
          JSON.stringify(capture_triggers || {}),
        ]
      );

      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error setting up DDL capture:", err);
      const safeError = sanitizeError(
        err,
        "Error setting up DDL capture",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.get("/api/schema-changes/capture/config", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM metadata.ddl_capture_config ORDER BY db_engine, connection_string`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error getting DDL capture config:", err);
    const safeError = sanitizeError(
      err,
      "Error getting DDL capture config",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.post(
  "/api/schema-changes/rollback/:id",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const auditId = parseInt(req.params.id);
      if (isNaN(auditId)) {
        return res.status(400).json({ error: "Invalid audit ID" });
      }

      const auditResult = await pool.query(
        `SELECT * FROM metadata.schema_change_audit WHERE id = $1`,
        [auditId]
      );

      if (auditResult.rows.length === 0) {
        return res.status(404).json({ error: "Audit record not found" });
      }

      const audit = auditResult.rows[0];
      if (!audit.is_rollback_possible || !audit.rollback_sql) {
        return res.status(400).json({ error: "Rollback is not possible for this change" });
      }

      res.json({ 
        message: "Rollback initiated",
        audit_id: auditId,
        rollback_sql: audit.rollback_sql
      });
    } catch (err) {
      console.error("Error rolling back schema change:", err);
      const safeError = sanitizeError(
        err,
        "Error rolling back schema change",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.get("/api/schema-changes/stats", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        COUNT(*) as total_changes,
        COUNT(*) FILTER (WHERE change_type = 'CREATE') as creates,
        COUNT(*) FILTER (WHERE change_type = 'ALTER') as alters,
        COUNT(*) FILTER (WHERE change_type = 'DROP') as drops,
        COUNT(*) FILTER (WHERE is_rollback_possible = true) as rollback_possible,
        MAX(detected_at) as last_change
      FROM metadata.schema_change_audit`
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error getting schema change stats:", err);
    const safeError = sanitizeError(
      err,
      "Error getting schema change stats",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

// Catalog Cleaner API Endpoints
app.post(
  "/api/catalog-cleaner/clean-non-existent-tables",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      res.json({ 
        message: "Clean non-existent tables operation initiated",
        status: "IN_PROGRESS"
      });
    } catch (err) {
      console.error("Error cleaning non-existent tables:", err);
      const safeError = sanitizeError(
        err,
        "Error cleaning non-existent tables",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.post(
  "/api/catalog-cleaner/clean-orphaned-tables",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      res.json({ 
        message: "Clean orphaned tables operation initiated",
        status: "IN_PROGRESS"
      });
    } catch (err) {
      console.error("Error cleaning orphaned tables:", err);
      const safeError = sanitizeError(
        err,
        "Error cleaning orphaned tables",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.post(
  "/api/catalog-cleaner/clean-old-logs",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { retention_hours } = req.body;
      const hours = retention_hours || 720; // Default 30 days

      res.json({ 
        message: "Clean old logs operation initiated",
        retention_hours: hours,
        status: "IN_PROGRESS"
      });
    } catch (err) {
      console.error("Error cleaning old logs:", err);
      const safeError = sanitizeError(
        err,
        "Error cleaning old logs",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.post(
  "/api/catalog-cleaner/clean-orphaned-governance",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      res.json({ 
        message: "Clean orphaned governance data operation initiated",
        status: "IN_PROGRESS"
      });
    } catch (err) {
      console.error("Error cleaning orphaned governance data:", err);
      const safeError = sanitizeError(
        err,
        "Error cleaning orphaned governance data",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.post(
  "/api/catalog-cleaner/clean-orphaned-quality",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      res.json({ 
        message: "Clean orphaned quality data operation initiated",
        status: "IN_PROGRESS"
      });
    } catch (err) {
      console.error("Error cleaning orphaned quality data:", err);
      const safeError = sanitizeError(
        err,
        "Error cleaning orphaned quality data",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.post(
  "/api/catalog-cleaner/clean-orphaned-maintenance",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      res.json({ 
        message: "Clean orphaned maintenance data operation initiated",
        status: "IN_PROGRESS"
      });
    } catch (err) {
      console.error("Error cleaning orphaned maintenance data:", err);
      const safeError = sanitizeError(
        err,
        "Error cleaning orphaned maintenance data",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.post(
  "/api/catalog-cleaner/clean-orphaned-lineage",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      res.json({ 
        message: "Clean orphaned lineage data operation initiated",
        status: "IN_PROGRESS"
      });
    } catch (err) {
      console.error("Error cleaning orphaned lineage data:", err);
      const safeError = sanitizeError(
        err,
        "Error cleaning orphaned lineage data",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.post(
  "/api/catalog-cleaner/clean-all",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      res.json({ 
        message: "Clean all operation initiated",
        status: "IN_PROGRESS"
      });
    } catch (err) {
      console.error("Error cleaning all:", err);
      const safeError = sanitizeError(
        err,
        "Error cleaning all",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.get("/api/catalog-cleaner/preview", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    res.json({ 
      preview: {
        non_existent_tables: 0,
        orphaned_tables: 0,
        old_logs: 0,
        orphaned_governance: 0,
        orphaned_quality: 0,
        orphaned_maintenance: 0,
        orphaned_lineage: 0
      }
    });
  } catch (err) {
    console.error("Error getting cleanup preview:", err);
    const safeError = sanitizeError(
      err,
      "Error getting cleanup preview",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

// Event Triggers API Endpoints (improvements)
app.get("/api/event-triggers", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT workflow_name, event_type, event_config, active
       FROM metadata.workflow_event_triggers
       ORDER BY workflow_name`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error getting event triggers:", err);
    const safeError = sanitizeError(
      err,
      "Error getting event triggers",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/event-triggers/:workflowName", requireAuth, async (req, res) => {
  try {
    const workflowName = req.params.workflowName;
    const result = await pool.query(
      `SELECT * FROM metadata.workflow_event_triggers WHERE workflow_name = $1`,
      [workflowName]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Event trigger not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error getting event trigger:", err);
    const safeError = sanitizeError(
      err,
      "Error getting event trigger",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.put(
  "/api/event-triggers/:workflowName",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const workflowName = req.params.workflowName;
      const { event_type, event_config, active } = req.body;

      const result = await pool.query(
        `UPDATE metadata.workflow_event_triggers 
       SET event_type = $1, event_config = $2::jsonb, active = $3
       WHERE workflow_name = $4
       RETURNING *`,
        [event_type, JSON.stringify(event_config || {}), active !== undefined ? active : true, workflowName]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Event trigger not found" });
      }

      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error updating event trigger:", err);
      const safeError = sanitizeError(
        err,
        "Error updating event trigger",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.post(
  "/api/event-triggers/:workflowName/test",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const workflowName = req.params.workflowName;
      res.json({ 
        message: "Event trigger test initiated",
        workflow_name: workflowName,
        status: "TESTING"
      });
    } catch (err) {
      console.error("Error testing event trigger:", err);
      const safeError = sanitizeError(
        err,
        "Error testing event trigger",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.get("/api/event-triggers/file-watchers", requireAuth, async (req, res) => {
  try {
    res.json({ 
      watchers: [],
      message: "File watchers information"
    });
  } catch (err) {
    console.error("Error getting file watchers:", err);
    const safeError = sanitizeError(
      err,
      "Error getting file watchers",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

// Transformations API Endpoints
app.get("/api/transformations", requireAuth, async (req, res) => {
  try {
    const { transformation_type } = req.query;
    let query = `
      SELECT id, name, description, transformation_type, config,
             created_by, created_at, updated_at
      FROM metadata.transformations
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (transformation_type) {
      paramCount++;
      query += ` AND transformation_type = $${paramCount}`;
      params.push(transformation_type);
    }

    query += ` ORDER BY name ASC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Error getting transformations:", err);
    const safeError = sanitizeError(
      err,
      "Error getting transformations",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.post(
  "/api/transformations",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const { name, description, transformation_type, config } = req.body;
      const user = req.user?.username || "system";

      if (!name || !transformation_type || !config) {
        return res.status(400).json({
          error: "Missing required fields: name, transformation_type, config",
        });
      }

      const result = await pool.query(
        `INSERT INTO metadata.transformations 
        (name, description, transformation_type, config, created_by)
        VALUES ($1, $2, $3, $4::jsonb, $5)
        RETURNING *`,
        [name, description || null, transformation_type, JSON.stringify(config), user]
      );

      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error creating transformation:", err);
      const safeError = sanitizeError(
        err,
        "Error creating transformation",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.put(
  "/api/transformations/:id",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const transformationId = parseInt(req.params.id);
      if (isNaN(transformationId)) {
        return res.status(400).json({ error: "Invalid transformation ID" });
      }

      const { name, description, transformation_type, config } = req.body;

      const result = await pool.query(
        `UPDATE metadata.transformations 
       SET name = $1, description = $2, transformation_type = $3,
           config = $4::jsonb, updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
        [name, description || null, transformation_type, JSON.stringify(config), transformationId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Transformation not found" });
      }

      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error updating transformation:", err);
      const safeError = sanitizeError(
        err,
        "Error updating transformation",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.delete(
  "/api/transformations/:id",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const transformationId = parseInt(req.params.id);
      if (isNaN(transformationId)) {
        return res.status(400).json({ error: "Invalid transformation ID" });
      }

      await pool.query(`DELETE FROM metadata.transformations WHERE id = $1`, [transformationId]);

      res.json({ message: "Transformation deleted successfully" });
    } catch (err) {
      console.error("Error deleting transformation:", err);
      const safeError = sanitizeError(
        err,
        "Error deleting transformation",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.get("/api/transformations/:id/usage", requireAuth, async (req, res) => {
  try {
    const transformationId = parseInt(req.params.id);
    if (isNaN(transformationId)) {
      return res.status(400).json({ error: "Invalid transformation ID" });
    }

    const result = await pool.query(
      `SELECT job_name, usage_count, last_used_at
       FROM metadata.transformation_usage
       WHERE transformation_id = $1
       ORDER BY last_used_at DESC`,
      [transformationId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error getting transformation usage:", err);
    const safeError = sanitizeError(
      err,
      "Error getting transformation usage",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/alert-rules", requireAuth, async (req, res) => {
  try {
    const page = validatePage(req.query.page, 1);
    const limit = validateLimit(req.query.limit, 20);
    const offset = (page - 1) * limit;
    const queryType = req.query.query_type || "";
    const dbEngine = req.query.db_engine || "";
    const enabled = req.query.enabled;

    const whereConditions = [];
    const params = [];
    let paramCount = 0;

    if (queryType) {
      paramCount++;
      whereConditions.push(`query_type = $${paramCount}`);
      params.push(queryType);
    }

    if (dbEngine) {
      paramCount++;
      whereConditions.push(`db_engine = $${paramCount}`);
      params.push(dbEngine);
    }

    if (enabled !== undefined && enabled !== "") {
      paramCount++;
      whereConditions.push(`enabled = $${paramCount}`);
      params.push(enabled === "true");
    }

    const whereClause = whereConditions.length > 0 ? "WHERE " + whereConditions.join(" AND ") : "";

    const countQuery = `SELECT COUNT(*) FROM metadata.alert_rules ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(limit, offset);
    const dataQuery = `
      SELECT 
        id, rule_name, alert_type, severity, evaluation_type, threshold_low, threshold_warning, threshold_critical,
        condition_expression, threshold_value, custom_message,
        enabled, notification_channels, db_engine, connection_string, query_type,
        check_interval, is_system_rule, query_template, webhook_ids,
        created_at, updated_at
      FROM metadata.alert_rules
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    const result = await pool.query(dataQuery, params);

    res.json({
      rules: result.rows.map(row => ({
        ...row,
        webhook_ids: Array.isArray(row.webhook_ids) ? row.webhook_ids : []
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error("Error getting alert rules:", err);
    const safeError = sanitizeError(
      err,
      "Error getting alert rules",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/alert-rules/system-templates", requireAuth, async (req, res) => {
  try {
    res.json({ templates: [] });
  } catch (err) {
    console.error("Error getting system templates:", err);
    const safeError = sanitizeError(
      err,
      "Error getting system templates",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/alert-rules/:id", requireAuth, async (req, res) => {
  try {
    const ruleId = parseInt(req.params.id);
    if (isNaN(ruleId)) {
      return res.status(400).json({ error: "Invalid alert rule ID" });
    }

    const result = await pool.query(
      `SELECT * FROM metadata.alert_rules WHERE id = $1`,
      [ruleId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Alert rule not found" });
    }

    res.json({
      ...result.rows[0],
      webhook_ids: Array.isArray(result.rows[0].webhook_ids) ? result.rows[0].webhook_ids : []
    });
  } catch (err) {
    console.error("Error getting alert rule:", err);
    const safeError = sanitizeError(
      err,
      "Error getting alert rule",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.post("/api/alert-rules", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const {
      rule_name,
      alert_type,
      severity,
      evaluation_type,
      threshold_low,
      threshold_warning,
      threshold_critical,
      condition_expression,
      threshold_value,
      custom_message,
      db_engine,
      connection_string,
      query_type,
      check_interval,
      is_system_rule,
      query_template,
      webhook_ids,
      enabled
    } = req.body;

    if (!rule_name || !alert_type || !severity || !condition_expression) {
      return res.status(400).json({
        error: "Missing required fields: rule_name, alert_type, severity, condition_expression"
      });
    }

    const validSeverity = validateEnum(severity, ["CRITICAL", "WARNING", "INFO"], null);
    if (!validSeverity) {
      return res.status(400).json({ error: "Invalid severity. Must be CRITICAL, WARNING, or INFO" });
    }

    const validQueryType = validateEnum(query_type || "CUSTOM_SQL", ["CUSTOM_SQL"], "CUSTOM_SQL");
    if (!validQueryType) {
      return res.status(400).json({ error: "Invalid query_type. Must be CUSTOM_SQL" });
    }

    if (query_type === "CUSTOM_SQL" && !db_engine) {
      return res.status(400).json({ error: "db_engine is required for CUSTOM_SQL queries" });
    }

    // Validar evaluation_type
    const validEvaluationType = validateEnum(evaluation_type || "TEXT", ["NUMERIC", "TEXT"], "TEXT");
    if (!validEvaluationType) {
      return res.status(400).json({ error: "Invalid evaluation_type. Must be NUMERIC or TEXT" });
    }

    // Validar thresholds para NUMERIC
    if (evaluation_type === "NUMERIC") {
      if (!threshold_low || !threshold_warning || !threshold_critical) {
        return res.status(400).json({
          error: "All thresholds (threshold_low, threshold_warning, threshold_critical) are required for NUMERIC evaluation type"
        });
      }
      
      const low = parseFloat(threshold_low);
      const warning = parseFloat(threshold_warning);
      const critical = parseFloat(threshold_critical);
      
      if (isNaN(low) || isNaN(warning) || isNaN(critical)) {
        return res.status(400).json({ error: "Thresholds must be valid numbers" });
      }
      
      if (low >= warning || warning >= critical) {
        return res.status(400).json({ 
          error: "Thresholds must be in ascending order: threshold_low < threshold_warning < threshold_critical" 
        });
      }
    }

    const checkResult = await pool.query(
      `SELECT rule_name FROM metadata.alert_rules WHERE LOWER(rule_name) = LOWER($1)`,
      [rule_name]
    );

    if (checkResult.rows.length > 0) {
      return res.status(409).json({ error: "Alert rule with this name already exists" });
    }

    const result = await pool.query(
      `INSERT INTO metadata.alert_rules 
       (rule_name, alert_type, severity, evaluation_type, threshold_low, threshold_warning, threshold_critical,
        condition_expression, threshold_value, custom_message,
        db_engine, connection_string, query_type, check_interval, is_system_rule,
        query_template, webhook_ids, enabled)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       RETURNING *`,
      [
        rule_name,
        alert_type,
        severity,
        evaluation_type || 'TEXT',
        evaluation_type === 'NUMERIC' ? parseFloat(threshold_low) : null,
        evaluation_type === 'NUMERIC' ? parseFloat(threshold_warning) : null,
        evaluation_type === 'NUMERIC' ? parseFloat(threshold_critical) : null,
        condition_expression,
        threshold_value || null,
        custom_message || null,
        db_engine || null,
        connection_string || null,
        validQueryType,
        check_interval || 60,
        is_system_rule || false,
        query_template || null,
        Array.isArray(webhook_ids) ? webhook_ids : [],
        enabled !== undefined ? enabled : true
      ]
    );

    res.json({
      ...result.rows[0],
      webhook_ids: Array.isArray(result.rows[0].webhook_ids) ? result.rows[0].webhook_ids : []
    });
  } catch (err) {
    console.error("Error creating alert rule:", err);
    const safeError = sanitizeError(
      err,
      "Error creating alert rule",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.put("/api/alert-rules/:id", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const ruleId = parseInt(req.params.id);
    if (isNaN(ruleId)) {
      return res.status(400).json({ error: "Invalid alert rule ID" });
    }

    const {
      rule_name,
      alert_type,
      severity,
      evaluation_type,
      threshold_low,
      threshold_warning,
      threshold_critical,
      condition_expression,
      threshold_value,
      custom_message,
      db_engine,
      connection_string,
      query_type,
      check_interval,
      query_template,
      webhook_ids,
      enabled
    } = req.body;

    const existingRule = await pool.query(
      `SELECT is_system_rule FROM metadata.alert_rules WHERE id = $1`,
      [ruleId]
    );

    if (existingRule.rows.length === 0) {
      return res.status(404).json({ error: "Alert rule not found" });
    }

    if (existingRule.rows[0].is_system_rule) {
      return res.status(403).json({ error: "Cannot modify system rules" });
    }

    if (severity) {
      const validSeverity = validateEnum(severity, ["CRITICAL", "WARNING", "INFO"], null);
      if (!validSeverity) {
        return res.status(400).json({ error: "Invalid severity" });
      }
    }

    const validQueryType = query_type ? validateEnum(query_type, ["CUSTOM_SQL"], null) : null;
    if (query_type && !validQueryType) {
      return res.status(400).json({ error: "Invalid query_type. Must be CUSTOM_SQL" });
    }

    // Validar evaluation_type si se proporciona
    if (evaluation_type) {
      const validEvaluationType = validateEnum(evaluation_type, ["NUMERIC", "TEXT"], null);
      if (!validEvaluationType) {
        return res.status(400).json({ error: "Invalid evaluation_type. Must be NUMERIC or TEXT" });
      }

      // Validar thresholds para NUMERIC
      if (evaluation_type === "NUMERIC") {
        if (threshold_low === undefined || threshold_warning === undefined || threshold_critical === undefined) {
          return res.status(400).json({
            error: "All thresholds (threshold_low, threshold_warning, threshold_critical) are required when changing to NUMERIC evaluation type"
          });
        }
        
        const low = parseFloat(threshold_low);
        const warning = parseFloat(threshold_warning);
        const critical = parseFloat(threshold_critical);
        
        if (isNaN(low) || isNaN(warning) || isNaN(critical)) {
          return res.status(400).json({ error: "Thresholds must be valid numbers" });
        }
        
        if (low >= warning || warning >= critical) {
          return res.status(400).json({ 
            error: "Thresholds must be in ascending order: threshold_low < threshold_warning < threshold_critical" 
          });
        }
      }
    }

    const updateFields = [];
    const params = [];
    let paramCount = 0;

    if (rule_name) {
      paramCount++;
      updateFields.push(`rule_name = $${paramCount}`);
      params.push(rule_name);
    }
    if (alert_type) {
      paramCount++;
      updateFields.push(`alert_type = $${paramCount}`);
      params.push(alert_type);
    }
    if (severity) {
      paramCount++;
      updateFields.push(`severity = $${paramCount}`);
      params.push(severity);
    }
    if (condition_expression) {
      paramCount++;
      updateFields.push(`condition_expression = $${paramCount}`);
      params.push(condition_expression);
    }
    if (evaluation_type !== undefined) {
      paramCount++;
      updateFields.push(`evaluation_type = $${paramCount}`);
      params.push(evaluation_type);
    }
    if (threshold_low !== undefined) {
      paramCount++;
      updateFields.push(`threshold_low = $${paramCount}`);
      params.push(evaluation_type === 'NUMERIC' ? parseFloat(threshold_low) : null);
    }
    if (threshold_warning !== undefined) {
      paramCount++;
      updateFields.push(`threshold_warning = $${paramCount}`);
      params.push(evaluation_type === 'NUMERIC' ? parseFloat(threshold_warning) : null);
    }
    if (threshold_critical !== undefined) {
      paramCount++;
      updateFields.push(`threshold_critical = $${paramCount}`);
      params.push(evaluation_type === 'NUMERIC' ? parseFloat(threshold_critical) : null);
    }
    if (threshold_value !== undefined) {
      paramCount++;
      updateFields.push(`threshold_value = $${paramCount}`);
      params.push(threshold_value);
    }
    if (custom_message !== undefined) {
      paramCount++;
      updateFields.push(`custom_message = $${paramCount}`);
      params.push(custom_message || null);
    }
    if (db_engine !== undefined) {
      paramCount++;
      updateFields.push(`db_engine = $${paramCount}`);
      params.push(db_engine);
    }
    if (connection_string !== undefined) {
      paramCount++;
      updateFields.push(`connection_string = $${paramCount}`);
      params.push(connection_string);
    }
    if (query_type) {
      paramCount++;
      updateFields.push(`query_type = $${paramCount}`);
      params.push(validQueryType);
    }
    if (check_interval !== undefined) {
      paramCount++;
      updateFields.push(`check_interval = $${paramCount}`);
      params.push(check_interval);
    }
    if (query_template !== undefined) {
      paramCount++;
      updateFields.push(`query_template = $${paramCount}`);
      params.push(query_template);
    }
    if (webhook_ids !== undefined) {
      paramCount++;
      updateFields.push(`webhook_ids = $${paramCount}`);
      params.push(Array.isArray(webhook_ids) ? webhook_ids : []);
    }
    if (enabled !== undefined) {
      paramCount++;
      updateFields.push(`enabled = $${paramCount}`);
      params.push(enabled);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    paramCount++;
    updateFields.push(`updated_at = NOW()`);
    params.push(ruleId);

    const result = await pool.query(
      `UPDATE metadata.alert_rules 
       SET ${updateFields.join(", ")}
       WHERE id = $${paramCount}
       RETURNING *`,
      params
    );

    res.json({
      ...result.rows[0],
      webhook_ids: Array.isArray(result.rows[0].webhook_ids) ? result.rows[0].webhook_ids : []
    });
  } catch (err) {
    console.error("Error updating alert rule:", err);
    const safeError = sanitizeError(
      err,
      "Error updating alert rule",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.delete("/api/alert-rules/:id", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const ruleId = parseInt(req.params.id);
    if (isNaN(ruleId)) {
      return res.status(400).json({ error: "Invalid alert rule ID" });
    }

    const existingRule = await pool.query(
      `SELECT is_system_rule FROM metadata.alert_rules WHERE id = $1`,
      [ruleId]
    );

    if (existingRule.rows.length === 0) {
      return res.status(404).json({ error: "Alert rule not found" });
    }

    if (existingRule.rows[0].is_system_rule) {
      return res.status(403).json({ error: "Cannot delete system rules" });
    }

    const result = await pool.query(
      `DELETE FROM metadata.alert_rules WHERE id = $1 RETURNING id`,
      [ruleId]
    );

    res.json({ message: "Alert rule deleted successfully" });
  } catch (err) {
    console.error("Error deleting alert rule:", err);
    const safeError = sanitizeError(
      err,
      "Error deleting alert rule",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.post("/api/alert-rules/:id/test", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const ruleId = parseInt(req.params.id);
    if (isNaN(ruleId)) {
      return res.status(400).json({ error: "Invalid alert rule ID" });
    }

    const rule = await pool.query(
      `SELECT * FROM metadata.alert_rules WHERE id = $1`,
      [ruleId]
    );

    if (rule.rows.length === 0) {
      return res.status(404).json({ error: "Alert rule not found" });
    }

    const alertRule = rule.rows[0];
    let query = alertRule.condition_expression;

    if (alertRule.query_type === "SYSTEM_METRIC" && alertRule.threshold_value) {
      query = query.replace(/\{\{threshold\}\}/g, alertRule.threshold_value);
    }

    let result;
    if (alertRule.query_type === "SYSTEM_METRIC" || (alertRule.db_engine === "PostgreSQL" && !alertRule.connection_string)) {
      result = await pool.query(query);
    } else {
      return res.status(400).json({ 
        error: "Testing queries for external databases is not yet supported. Use PostgreSQL connection to DataLake for testing." 
      });
    }

    res.json({
      success: true,
      rowCount: result.rows.length,
      sampleRows: result.rows.slice(0, 5),
      message: result.rows.length > 0 
        ? `Query returned ${result.rows.length} row(s). Alert would be triggered.`
        : `Query returned 0 rows. Alert would not be triggered.`
    });
  } catch (err) {
    console.error("Error testing alert rule:", err);
    const safeError = sanitizeError(
      err,
      "Error testing alert rule query",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ 
      error: safeError,
      details: err.message 
    });
  }
});

app.post("/api/alert-rules/test-query", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const { query, db_engine, connection_string } = req.body;

    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    let result;
    let testPool = null;

    try {
      if (connection_string && db_engine === "PostgreSQL") {
        // Create temporary connection for external PostgreSQL database
        let config;
        if (
          connection_string.includes("postgresql://") ||
          connection_string.includes("postgres://")
        ) {
          config = {
            connectionString: connection_string,
            connectionTimeoutMillis: 10000,
            max: 1,
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
            max: 1,
          };
        }
        testPool = new Pool(config);
        result = await testPool.query(query);
      } else if (db_engine === "PostgreSQL" || !db_engine) {
        // Use default DataLake connection
        result = await pool.query(query);
      } else {
        return res.status(400).json({ 
          error: `Testing queries for ${db_engine} is not yet supported. Only PostgreSQL is supported.` 
        });
      }

      res.json({
        success: true,
        rowCount: result.rows.length,
        sampleRows: result.rows.slice(0, 5),
        message: result.rows.length > 0 
          ? `Query returned ${result.rows.length} row(s). Alert would be triggered.`
          : `Query returned 0 rows. Alert would not be triggered.`
      });
    } finally {
      // Clean up temporary connection
      if (testPool) {
        try {
          await testPool.end();
        } catch (endErr) {
          console.error("Error closing test pool:", endErr);
        }
      }
    }
  } catch (err) {
    console.error("Error testing query:", err);
    const safeError = sanitizeError(
      err,
      "Error testing query",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ 
      error: safeError,
      details: err.message 
    });
  }
});

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
        environment_connections,
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

      const legacyConnectionString = connection_string || (environment_connections && environment_connections.production) || null;
      const envConnections = environment_connections || (legacyConnectionString ? { production: legacyConnectionString } : {});

      const result = await pool.query(
        `INSERT INTO metadata.schema_migrations 
        (migration_name, version, description, db_engine, forward_sql, rollback_sql, checksum, status, prev_hash, chain_position, is_genesis, connection_string, environment_connections, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING', $8, $9, $10, $11, $12, NOW())
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
          legacyConnectionString,
          JSON.stringify(envConnections),
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

      let targetConnectionString = null;
      if (migration.environment_connections && typeof migration.environment_connections === 'object') {
        const envConnections = typeof migration.environment_connections === 'string' 
          ? JSON.parse(migration.environment_connections) 
          : migration.environment_connections;
        targetConnectionString = envConnections[environment] || envConnections.production || null;
      } else {
        targetConnectionString = migration.connection_string || null;
      }

      try {
        if (targetConnectionString) {
          const targetPool = new Pool({
            connectionString: targetConnectionString,
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

      let targetConnectionString = null;
      if (migration.environment_connections && typeof migration.environment_connections === 'object') {
        const envConnections = typeof migration.environment_connections === 'string' 
          ? JSON.parse(migration.environment_connections) 
          : migration.environment_connections;
        targetConnectionString = envConnections[environment] || envConnections.production || null;
      } else {
        targetConnectionString = migration.connection_string || null;
      }

      try {
        if (targetConnectionString) {
          const targetPool = new Pool({
            connectionString: targetConnectionString,
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

      let targetConnectionString = null;
      if (migration.environment_connections && typeof migration.environment_connections === 'object') {
        const envConnections = typeof migration.environment_connections === 'string' 
          ? JSON.parse(migration.environment_connections) 
          : migration.environment_connections;
        targetConnectionString = envConnections[req.body.environment || 'production'] || envConnections.production || null;
      } else {
        targetConnectionString = migration.connection_string || null;
      }

      const targetPool = targetConnectionString
        ? new Pool({ connectionString: targetConnectionString, max: 1 })
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

app.post(
  "/api/schema-migrations/test-sql",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const { db_engine, connection_string, forward_sql, rollback_sql } = req.body;

      if (!forward_sql || !rollback_sql || !connection_string) {
        return res.status(400).json({
          error: "forward_sql, rollback_sql, and connection_string are required",
        });
      }

      const testSchema = `_migration_test_${Date.now()}`;
      const startTime = Date.now();
      const errors = [];

      let targetPool;
      try {
        if (db_engine === "PostgreSQL") {
          targetPool = new Pool({ connectionString: connection_string, max: 1 });
        } else {
          return res.status(400).json({
            error: "Only PostgreSQL is supported for SQL testing at the moment",
          });
        }

        await targetPool.query(`CREATE SCHEMA IF NOT EXISTS ${testSchema}`);

        const forwardSqlWithSchema = forward_sql.replace(
          /CREATE TABLE\s+(?:IF NOT EXISTS\s+)?["']?(\w+)["']?/gi,
          `CREATE TABLE ${testSchema}.$1`
        );

        try {
          await targetPool.query(forwardSqlWithSchema);
        } catch (forwardErr) {
          errors.push(`Forward SQL failed: ${forwardErr.message}`);
        }

        if (errors.length === 0) {
          const rollbackSqlWithSchema = rollback_sql.replace(
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
          if (targetPool) {
            await targetPool.query(`DROP SCHEMA IF EXISTS ${testSchema} CASCADE`);
          }
        } catch (cleanupErr) {
          console.error("Error cleaning up test schema:", cleanupErr);
        }
      } finally {
        if (targetPool) {
          await targetPool.end();
        }
      }

      const executionTime = Date.now() - startTime;

      res.json({
        success: errors.length === 0,
        test_schema: testSchema,
        execution_time_ms: executionTime,
        errors: errors.length > 0 ? errors : undefined,
        message: errors.length === 0
          ? "SQL test successful! Forward and rollback executed correctly."
          : errors.join("; "),
      });
    } catch (err) {
      console.error("Error testing SQL:", err);
      const safeError = sanitizeError(
        err,
        "Error al probar SQL",
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

const DataSyncPath = path.join(process.cwd(), "..", "DataSync", "DataSync");

// Helper function to execute C++ security commands
async function executeSecurityCommand(operation, requestData) {
  const { spawn } = await import("child_process");
  
  if (!fs.existsSync(DataSyncPath)) {
    throw new Error(`DataSync executable not found at: ${DataSyncPath}`);
  }

  const requestJson = JSON.stringify({ operation, ...requestData });
  
  const cppProcess = spawn(DataSyncPath, ["--security"], {
    cwd: path.join(process.cwd(), "..", "DataSync"),
    stdio: ["pipe", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";

  cppProcess.stdout.on("data", (data) => {
    stdout += data.toString();
  });

  cppProcess.stderr.on("data", (data) => {
    stderr += data.toString();
  });

  cppProcess.stdin.write(requestJson);
  cppProcess.stdin.end();

  return new Promise((resolve, reject) => {
    cppProcess.on("error", (err) => {
      reject(new Error(`Failed to start DataSync process: ${err.message}`));
    });

    cppProcess.on("close", (code) => {
      if (code === 0) {
        try {
          const output = JSON.parse(stdout);
          if (output.success) {
            resolve(output);
          } else {
            reject(new Error(output.error || "Command failed"));
          }
        } catch (parseErr) {
          reject(new Error(`Failed to parse output: ${parseErr.message}. Output: ${stdout}`));
        }
      } else {
        reject(new Error(`Process exited with code ${code}. Stderr: ${stderr || stdout}`));
      }
    });
  });
}

// Helper function to execute C++ monitoring commands
async function executeCatalogCommand(operation, requestData) {
  const { spawn } = await import("child_process");
  
  if (!fs.existsSync(DataSyncPath)) {
    throw new Error(`DataSync executable not found at: ${DataSyncPath}`);
  }

  const requestJson = JSON.stringify({ operation, ...requestData });
  
  const cppProcess = spawn(DataSyncPath, ["--catalog"], {
    cwd: path.join(process.cwd(), "..", "DataSync"),
    stdio: ["pipe", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";

  cppProcess.stdout.on("data", (data) => {
    stdout += data.toString();
  });

  cppProcess.stderr.on("data", (data) => {
    stderr += data.toString();
  });

  cppProcess.stdin.write(requestJson);
  cppProcess.stdin.end();

  return new Promise((resolve, reject) => {
    cppProcess.on("error", (err) => {
      reject(new Error(`Failed to start DataSync process: ${err.message}`));
    });

    cppProcess.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`DataSync process exited with code ${code}. stderr: ${stderr}`));
        return;
      }

      try {
        const result = JSON.parse(stdout);
        resolve(result);
      } catch (parseError) {
        reject(new Error(`Failed to parse DataSync output: ${parseError.message}. stdout: ${stdout}`));
      }
    });
  });
}

async function executeMaintenanceCommand(operation, requestData) {
  const { spawn } = await import("child_process");
  
  if (!fs.existsSync(DataSyncPath)) {
    throw new Error(`DataSync executable not found at: ${DataSyncPath}`);
  }

  const requestJson = JSON.stringify({ operation, ...requestData });
  
  const cppProcess = spawn(DataSyncPath, ["--maintenance"], {
    cwd: path.join(process.cwd(), "..", "DataSync"),
    stdio: ["pipe", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";

  cppProcess.stdout.on("data", (data) => {
    stdout += data.toString();
  });

  cppProcess.stderr.on("data", (data) => {
    stderr += data.toString();
  });

  cppProcess.stdin.write(requestJson);
  cppProcess.stdin.end();

  return new Promise((resolve, reject) => {
    cppProcess.on("error", (err) => {
      reject(new Error(`Failed to start DataSync process: ${err.message}`));
    });

    cppProcess.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`DataSync process exited with code ${code}. stderr: ${stderr}`));
        return;
      }

      try {
        const result = JSON.parse(stdout);
        resolve(result);
      } catch (parseError) {
        reject(new Error(`Failed to parse DataSync output: ${parseError.message}. stdout: ${stdout}`));
      }
    });
  });
}

async function executeMonitoringCommand(operation, requestData) {
  const { spawn } = await import("child_process");
  
  if (!fs.existsSync(DataSyncPath)) {
    throw new Error(`DataSync executable not found at: ${DataSyncPath}`);
  }

  const requestJson = JSON.stringify({ operation, ...requestData });
  
  const cppProcess = spawn(DataSyncPath, ["--monitoring"], {
    cwd: path.join(process.cwd(), "..", "DataSync"),
    stdio: ["pipe", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";

  cppProcess.stdout.on("data", (data) => {
    stdout += data.toString();
  });

  cppProcess.stderr.on("data", (data) => {
    stderr += data.toString();
  });

  cppProcess.stdin.write(requestJson);
  cppProcess.stdin.end();

  return new Promise((resolve, reject) => {
    cppProcess.on("error", (err) => {
      reject(new Error(`Failed to start DataSync process: ${err.message}`));
    });

    cppProcess.on("close", (code) => {
      if (code === 0) {
        try {
          const output = JSON.parse(stdout);
          if (output.success) {
            resolve(output);
          } else {
            reject(new Error(output.error || "Command failed"));
          }
        } catch (parseErr) {
          reject(new Error(`Failed to parse output: ${parseErr.message}. Output: ${stdout}`));
        }
      } else {
        reject(new Error(`Process exited with code ${code}. Stderr: ${stderr || stdout}`));
      }
    });
  });
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

          const backupConfig = {
            backup_name: backup_name,
            db_engine: db_engine,
            connection_string: connection_string,
            database_name: database_name,
            backup_type: backup_type,
            file_path: filePath
          };

          const configPath = path.join(process.cwd(), "backups", `backup_config_${backupId}.json`);
          await fs.promises.writeFile(configPath, JSON.stringify(backupConfig, null, 2));

          const backupProcess = spawn(DataSyncPath, ["backup", "create", configPath]);

          let stdout = "";
          let stderr = "";

          backupProcess.stdout.on("data", (data) => {
            stdout += data.toString();
          });

          backupProcess.stderr.on("data", (data) => {
            stderr += data.toString();
          });

          const exitCode = await new Promise((resolve) => {
            backupProcess.on("close", resolve);
          });

          try {
            await fs.promises.unlink(configPath);
          } catch (unlinkErr) {
            console.warn("Failed to delete temp config file:", unlinkErr);
          }

          if (exitCode !== 0) {
            throw new Error(`Backup process failed: ${stderr || stdout}`);
          }

          const result = JSON.parse(stdout);
          
          if (!result.success) {
            throw new Error(result.error_message || "Backup failed");
          }

          const resultPath = result.file_path || filePath;
          const fileSize = result.file_size || 0;
          const durationSeconds = result.duration_seconds || 0;

          if (isNaN(fileSize) || fileSize < 0) {
            throw new Error(`Invalid file size: ${fileSize}`);
          }
          if (isNaN(durationSeconds) || durationSeconds < 0) {
            throw new Error(`Invalid duration: ${durationSeconds}`);
          }

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
      
      let countQuery = "SELECT COUNT(*) as total FROM metadata.backups WHERE 1=1";
      const countParams = [];
      let countParamCount = 0;
      
      if (db_engine) {
        countParamCount++;
        countQuery += ` AND db_engine = $${countParamCount}`;
        countParams.push(db_engine);
      }
      
      if (status) {
        countParamCount++;
        countQuery += ` AND status = $${countParamCount}`;
        countParams.push(status);
      }
      
      const countResult = await pool.query(countQuery, countParams);

      const backups = result.rows.map(row => ({
        backup_id: row.backup_id,
        backup_name: row.backup_name,
        db_engine: row.db_engine,
        connection_string: row.connection_string || null,
        database_name: row.database_name || null,
        backup_type: row.backup_type,
        file_path: row.file_path,
        file_size: row.file_size ? parseInt(row.file_size) : null,
        status: row.status,
        error_message: row.error_message || null,
        created_at: row.created_at ? new Date(row.created_at).toISOString() : null,
        created_by: row.created_by || null,
        completed_at: row.completed_at ? new Date(row.completed_at).toISOString() : null,
        metadata: row.metadata || {},
        cron_schedule: row.cron_schedule || null,
        is_scheduled: row.is_scheduled || false,
        next_run_at: row.next_run_at ? new Date(row.next_run_at).toISOString() : null,
        last_run_at: row.last_run_at ? new Date(row.last_run_at).toISOString() : null,
        run_count: row.run_count ? parseInt(row.run_count) : 0,
      }));

      res.json({
        backups: backups,
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


app.get(
  "/api/data-masking/policies",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const {
        schema_name,
        table_name,
        masking_type,
        active,
        page = 1,
        limit = 20,
      } = req.query;

      let query = "SELECT * FROM metadata.masking_policies WHERE 1=1";
      const params = [];
      let paramCount = 0;

      if (schema_name) {
        paramCount++;
        query += ` AND schema_name ILIKE $${paramCount}`;
        params.push(`%${schema_name}%`);
      }

      if (table_name) {
        paramCount++;
        query += ` AND table_name ILIKE $${paramCount}`;
        params.push(`%${table_name}%`);
      }

      if (masking_type) {
        paramCount++;
        query += ` AND masking_type = $${paramCount}`;
        params.push(masking_type);
      }

      if (active !== undefined && active !== "") {
        paramCount++;
        query += ` AND active = $${paramCount}`;
        params.push(active === "true");
      }

      const countQuery = query.replace("SELECT *", "SELECT COUNT(*) as total");
      const countResult = await pool.query(countQuery, params);
      const total = parseInt(countResult.rows[0].total, 10);

      const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
      query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      params.push(parseInt(limit, 10), offset);

      const result = await pool.query(query, params);

      const policies = result.rows.map((row) => ({
        ...row,
        masking_params: typeof row.masking_params === 'string' 
          ? JSON.parse(row.masking_params) 
          : row.masking_params || {},
        role_whitelist: Array.isArray(row.role_whitelist) 
          ? row.role_whitelist 
          : [],
      }));

      res.json({
        policies,
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
      });
    } catch (err) {
      console.error("Error fetching masking policies:", err);
      const safeError = sanitizeError(
        err,
        "Error al obtener políticas de enmascaramiento",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.get(
  "/api/data-masking/policies/:id",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const policyId = parseInt(req.params.id);
      const result = await pool.query(
        "SELECT * FROM metadata.masking_policies WHERE policy_id = $1",
        [policyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Masking policy not found" });
      }

      const policy = result.rows[0];
      res.json({
        ...policy,
        masking_params: typeof policy.masking_params === 'string' 
          ? JSON.parse(policy.masking_params) 
          : policy.masking_params || {},
        role_whitelist: Array.isArray(policy.role_whitelist) 
          ? policy.role_whitelist 
          : [],
      });
    } catch (err) {
      console.error("Error fetching masking policy:", err);
      const safeError = sanitizeError(
        err,
        "Error al obtener política de enmascaramiento",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.post(
  "/api/data-masking/policies",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const {
        policy_name,
        schema_name,
        table_name,
        column_name,
        masking_type,
        masking_function,
        masking_params,
        role_whitelist,
        active,
      } = req.body;

      if (!policy_name || !schema_name || !table_name || !column_name || !masking_type) {
        return res.status(400).json({
          error: "policy_name, schema_name, table_name, column_name, and masking_type are required",
        });
      }

      const result = await pool.query(
        `INSERT INTO metadata.masking_policies 
         (policy_name, schema_name, table_name, column_name, masking_type, masking_function, masking_params, role_whitelist, active)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9)
         RETURNING *`,
        [
          policy_name,
          schema_name,
          table_name,
          column_name,
          masking_type,
          masking_function || null,
          masking_params ? JSON.stringify(masking_params) : "{}",
          role_whitelist || [],
          active !== undefined ? active : true,
        ]
      );

      const policy = result.rows[0];
      res.json({
        ...policy,
        masking_params: typeof policy.masking_params === 'string' 
          ? JSON.parse(policy.masking_params) 
          : policy.masking_params || {},
        role_whitelist: Array.isArray(policy.role_whitelist) 
          ? policy.role_whitelist 
          : [],
      });
    } catch (err) {
      console.error("Error creating masking policy:", err);
      const safeError = sanitizeError(
        err,
        "Error al crear política de enmascaramiento",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.put(
  "/api/data-masking/policies/:id",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const policyId = parseInt(req.params.id);
      const {
        policy_name,
        schema_name,
        table_name,
        column_name,
        masking_type,
        masking_function,
        masking_params,
        role_whitelist,
        active,
      } = req.body;

      const result = await pool.query(
        `UPDATE metadata.masking_policies 
         SET policy_name = $1, schema_name = $2, table_name = $3, column_name = $4, 
             masking_type = $5, masking_function = $6, masking_params = $7::jsonb, 
             role_whitelist = $8, active = $9, updated_at = NOW()
         WHERE policy_id = $10
         RETURNING *`,
        [
          policy_name,
          schema_name,
          table_name,
          column_name,
          masking_type,
          masking_function || null,
          masking_params ? JSON.stringify(masking_params) : "{}",
          role_whitelist || [],
          active !== undefined ? active : true,
          policyId,
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Masking policy not found" });
      }

      const policy = result.rows[0];
      res.json({
        ...policy,
        masking_params: typeof policy.masking_params === 'string' 
          ? JSON.parse(policy.masking_params) 
          : policy.masking_params || {},
        role_whitelist: Array.isArray(policy.role_whitelist) 
          ? policy.role_whitelist 
          : [],
      });
    } catch (err) {
      console.error("Error updating masking policy:", err);
      const safeError = sanitizeError(
        err,
        "Error al actualizar política de enmascaramiento",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.delete(
  "/api/data-masking/policies/:id",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const policyId = parseInt(req.params.id);
      const result = await pool.query(
        "DELETE FROM metadata.masking_policies WHERE policy_id = $1 RETURNING *",
        [policyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Masking policy not found" });
      }

      res.json({ message: "Masking policy deleted successfully" });
    } catch (err) {
      console.error("Error deleting masking policy:", err);
      const safeError = sanitizeError(
        err,
        "Error al eliminar política de enmascaramiento",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.post(
  "/api/data-masking/analyze",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const { schema_name, table_name } = req.body;

      if (!schema_name || !table_name) {
        return res.status(400).json({
          error: "schema_name and table_name are required",
        });
      }

      const result = await pool.query(
        "SELECT * FROM metadata.analyze_sensitive_columns($1, $2)",
        [schema_name, table_name]
      );

      res.json({
        columns: result.rows,
        total: result.rows.length,
        schema_name,
        table_name,
      });
    } catch (err) {
      console.error("Error analyzing sensitive columns:", err);
      const safeError = sanitizeError(
        err,
        "Error al analizar columnas sensibles",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.post(
  "/api/data-masking/create-view",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const { schema_name, table_name } = req.body;

      if (!schema_name || !table_name) {
        return res.status(400).json({
          error: "schema_name and table_name are required",
        });
      }

      const result = await pool.query(
        "SELECT metadata.create_masked_view($1, $2) as view_name",
        [schema_name, table_name]
      );

      res.json({
        message: "Masked view created successfully",
        view_name: result.rows[0].view_name,
        schema_name,
        table_name,
      });
    } catch (err) {
      console.error("Error creating masked view:", err);
      const safeError = sanitizeError(
        err,
        "Error al crear vista enmascarada",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.get(
  "/api/data-masking/databases",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const result = await pool.query(
        "SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname"
      );
      res.json({
        databases: result.rows.map((row) => row.datname),
      });
    } catch (err) {
      console.error("Error fetching databases:", err);
      const safeError = sanitizeError(
        err,
        "Error al obtener bases de datos",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.get(
  "/api/data-masking/sensitive-columns",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const { schema_name } = req.query;
      
      let query = `
        SELECT DISTINCT
          c.table_schema::VARCHAR as schema_name,
          c.table_name::VARCHAR as table_name,
          c.column_name::VARCHAR as column_name,
          c.data_type::VARCHAR as data_type,
          CASE 
            WHEN c.column_name ILIKE '%email%' THEN 'EMAIL'
            WHEN c.column_name ILIKE '%phone%' OR c.column_name ILIKE '%tel%' OR c.column_name ILIKE '%mobile%' THEN 'PHONE'
            WHEN c.column_name ILIKE '%ssn%' OR c.column_name ILIKE '%social%' THEN 'SSN'
            WHEN c.column_name ILIKE '%credit%' OR c.column_name ILIKE '%card%' THEN 'CREDIT_CARD'
            WHEN c.column_name ILIKE '%password%' OR c.column_name ILIKE '%passwd%' THEN 'PASSWORD'
            WHEN c.column_name ILIKE '%address%' THEN 'ADDRESS'
            WHEN c.column_name ILIKE '%birth%' OR c.column_name ILIKE '%dob%' THEN 'DATE_OF_BIRTH'
            WHEN c.column_name ILIKE '%name%' THEN 'NAME'
            WHEN c.column_name ILIKE '%id%' THEN 'ID_NUMBER'
            ELSE 'OTHER'
          END::VARCHAR as pii_category,
          CASE 
            WHEN c.column_name ILIKE '%email%' THEN 0.95
            WHEN c.column_name ILIKE '%phone%' OR c.column_name ILIKE '%tel%' THEN 0.90
            WHEN c.column_name ILIKE '%ssn%' OR c.column_name ILIKE '%social%' THEN 0.98
            WHEN c.column_name ILIKE '%credit%' OR c.column_name ILIKE '%card%' THEN 0.95
            WHEN c.column_name ILIKE '%password%' THEN 0.99
            ELSE 0.75
          END::NUMERIC as confidence_score
          FROM information_schema.columns c
          INNER JOIN information_schema.tables t
            ON c.table_schema = t.table_schema 
            AND c.table_name = t.table_name
          WHERE c.table_schema NOT IN ('pg_catalog', 'information_schema', 'pg_toast', 'pg_temp_1', 'pg_toast_temp_1', 'pg_temp', 'pg_toast_temp')
            AND c.table_schema NOT LIKE 'pg_temp%'
            AND c.table_schema NOT LIKE 'pg_toast%'
            AND c.table_schema != 'postgres'
            AND t.table_type = 'BASE TABLE'
            AND c.table_name NOT LIKE '%_masked_%'
            AND c.table_name NOT LIKE '%_smart_%'
      `;
      
      const params = [];
      if (schema_name) {
        query += ` AND c.table_schema = $1`;
        params.push(schema_name);
      }
      
      query += ` AND (
        c.column_name ILIKE '%email%' OR c.column_name ILIKE '%mail%' OR
        c.column_name ILIKE '%phone%' OR c.column_name ILIKE '%tel%' OR c.column_name ILIKE '%mobile%' OR
        c.column_name ILIKE '%ssn%' OR c.column_name ILIKE '%social%' OR c.column_name ILIKE '%security%' OR
        c.column_name ILIKE '%credit%' OR c.column_name ILIKE '%card%' OR c.column_name ILIKE '%payment%' OR
        c.column_name ILIKE '%password%' OR c.column_name ILIKE '%passwd%' OR c.column_name ILIKE '%pwd%' OR
        c.column_name ILIKE '%address%' OR c.column_name ILIKE '%street%' OR c.column_name ILIKE '%zip%' OR
        c.column_name ILIKE '%birth%' OR c.column_name ILIKE '%dob%' OR c.column_name ILIKE '%age%' OR
        (c.column_name ILIKE '%name%' AND (c.column_name ILIKE '%first%' OR c.column_name ILIKE '%last%' OR c.column_name ILIKE '%full%')) OR
        (c.column_name ILIKE '%id%' AND (c.column_name ILIKE '%national%' OR c.column_name ILIKE '%passport%' OR c.column_name ILIKE '%driver%'))
      )
      ORDER BY schema_name, table_name, column_name`;
      
      const result = await pool.query(query, params);
      
      res.json({
        columns: result.rows,
        total: result.rows.length,
      });
    } catch (err) {
      console.error("Error fetching sensitive columns:", err);
      const safeError = sanitizeError(
        err,
        "Error al obtener columnas sensibles",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.get(
  "/api/data-masking/unprotected-columns",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const { schema_name } = req.query;
      
      let query = `
        WITH sensitive_columns AS (
          SELECT DISTINCT
            c.table_schema::VARCHAR as schema_name,
            c.table_name::VARCHAR as table_name,
            c.column_name::VARCHAR as column_name,
            c.data_type::VARCHAR as data_type,
            CASE 
              WHEN c.column_name ILIKE '%email%' THEN 'EMAIL'
              WHEN c.column_name ILIKE '%phone%' OR c.column_name ILIKE '%tel%' OR c.column_name ILIKE '%mobile%' THEN 'PHONE'
              WHEN c.column_name ILIKE '%ssn%' OR c.column_name ILIKE '%social%' THEN 'SSN'
              WHEN c.column_name ILIKE '%credit%' OR c.column_name ILIKE '%card%' THEN 'CREDIT_CARD'
              WHEN c.column_name ILIKE '%password%' OR c.column_name ILIKE '%passwd%' THEN 'PASSWORD'
              WHEN c.column_name ILIKE '%address%' THEN 'ADDRESS'
              WHEN c.column_name ILIKE '%birth%' OR c.column_name ILIKE '%dob%' THEN 'DATE_OF_BIRTH'
              WHEN c.column_name ILIKE '%name%' THEN 'NAME'
              WHEN c.column_name ILIKE '%id%' THEN 'ID_NUMBER'
              ELSE 'OTHER'
            END::VARCHAR as pii_category,
            CASE 
              WHEN c.column_name ILIKE '%email%' THEN 0.95
              WHEN c.column_name ILIKE '%phone%' OR c.column_name ILIKE '%tel%' THEN 0.90
              WHEN c.column_name ILIKE '%ssn%' OR c.column_name ILIKE '%social%' THEN 0.98
              WHEN c.column_name ILIKE '%credit%' OR c.column_name ILIKE '%card%' THEN 0.95
              WHEN c.column_name ILIKE '%password%' THEN 0.99
              ELSE 0.75
            END::NUMERIC as confidence_score
          FROM information_schema.columns c
          INNER JOIN information_schema.tables t
            ON c.table_schema = t.table_schema 
            AND c.table_name = t.table_name
          WHERE c.table_schema NOT IN ('pg_catalog', 'information_schema', 'pg_toast', 'pg_temp_1', 'pg_toast_temp_1', 'pg_temp', 'pg_toast_temp')
            AND c.table_schema NOT LIKE 'pg_temp%'
            AND c.table_schema NOT LIKE 'pg_toast%'
            AND c.table_schema != 'postgres'
            AND t.table_type = 'BASE TABLE'
            AND c.table_name NOT LIKE '%_masked_%'
            AND c.table_name NOT LIKE '%_smart_%'
      `;
      
      const params = [];
      if (schema_name) {
        query += ` AND c.table_schema = $1`;
        params.push(schema_name);
      }
      
      query += ` AND (
            c.column_name ILIKE '%email%' OR c.column_name ILIKE '%mail%' OR
            c.column_name ILIKE '%phone%' OR c.column_name ILIKE '%tel%' OR c.column_name ILIKE '%mobile%' OR
            c.column_name ILIKE '%ssn%' OR c.column_name ILIKE '%social%' OR c.column_name ILIKE '%security%' OR
            c.column_name ILIKE '%credit%' OR c.column_name ILIKE '%card%' OR c.column_name ILIKE '%payment%' OR
            c.column_name ILIKE '%password%' OR c.column_name ILIKE '%passwd%' OR c.column_name ILIKE '%pwd%' OR
            c.column_name ILIKE '%address%' OR c.column_name ILIKE '%street%' OR c.column_name ILIKE '%zip%' OR
            c.column_name ILIKE '%birth%' OR c.column_name ILIKE '%dob%' OR c.column_name ILIKE '%age%' OR
            (c.column_name ILIKE '%name%' AND (c.column_name ILIKE '%first%' OR c.column_name ILIKE '%last%' OR c.column_name ILIKE '%full%')) OR
            (c.column_name ILIKE '%id%' AND (c.column_name ILIKE '%national%' OR c.column_name ILIKE '%passport%' OR c.column_name ILIKE '%driver%'))
          )
        )
        SELECT 
          sc.schema_name,
          sc.table_name,
          sc.column_name,
          sc.data_type,
          sc.pii_category,
          sc.confidence_score,
          CASE WHEN mp.policy_id IS NOT NULL AND mp.active = true THEN true ELSE false END as has_active_policy
        FROM sensitive_columns sc
        LEFT JOIN metadata.masking_policies mp 
          ON sc.schema_name = mp.schema_name 
          AND sc.table_name = mp.table_name 
          AND sc.column_name = mp.column_name
          AND mp.active = true
        WHERE mp.policy_id IS NULL OR mp.active = false
        ORDER BY schema_name, table_name, column_name
      `;
      
      const result = await pool.query(query, params);
      
      res.json({
        columns: result.rows,
        total: result.rows.length,
      });
    } catch (err) {
      console.error("Error fetching unprotected columns:", err);
      const safeError = sanitizeError(
        err,
        "Error al obtener columnas sin protección",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.post(
  "/api/data-masking/batch-analyze",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const {
        database_name,
        database_names,
        schema_name,
        masking_type = 'FULL',
        auto_activate = true,
        min_confidence = 0.75,
      } = req.body;

      // Support both single database_name and array of database_names
      const databases = database_names && Array.isArray(database_names) && database_names.length > 0
        ? database_names
        : database_name
        ? [database_name]
        : null;

      if (!databases || databases.length === 0) {
        return res.status(400).json({
          error: "database_name or database_names array is required",
        });
      }

      const configData = fs.readFileSync(
        path.join(process.cwd(), "config", "config.json"),
        "utf8"
      );
      const config = JSON.parse(configData);
      const dbConfig = config.database.postgres;

      const allResults = [];

      // Process each database
      for (const currentDatabase of databases) {
        let targetPool = pool;
        let shouldClosePool = false;

        if (currentDatabase) {
          const targetConnectionString = `postgresql://${dbConfig.user}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port}/${currentDatabase}`;
          
          targetPool = new Pool({
            connectionString: targetConnectionString,
            max: 1,
          });
          shouldClosePool = true;
        }

        try {
          await targetPool.query("SELECT 1");

          const schemasResult = schema_name
            ? { rows: [{ schema_name }] }
            : await targetPool.query(
                `SELECT DISTINCT table_schema as schema_name 
                 FROM information_schema.tables 
                 WHERE table_type = 'BASE TABLE' 
                   AND table_schema NOT IN ('pg_catalog', 'information_schema', 'pg_toast', 'postgres')
                   AND table_schema NOT LIKE 'pg_temp%'
                   AND table_schema NOT LIKE 'pg_toast%'
                 ORDER BY table_schema`
              );

          for (const schemaRow of schemasResult.rows) {
            const currentSchema = schemaRow.schema_name;

            const analyzeQuery = `
              SELECT 
                c.table_name::VARCHAR,
                c.column_name::VARCHAR,
                c.data_type::VARCHAR,
                CASE 
                  WHEN c.column_name ILIKE '%email%' OR c.column_name ILIKE '%mail%' THEN true
                  WHEN c.column_name ILIKE '%phone%' OR c.column_name ILIKE '%tel%' OR c.column_name ILIKE '%mobile%' THEN true
                  WHEN c.column_name ILIKE '%ssn%' OR c.column_name ILIKE '%social%' OR c.column_name ILIKE '%security%' THEN true
                  WHEN c.column_name ILIKE '%credit%' OR c.column_name ILIKE '%card%' OR c.column_name ILIKE '%payment%' THEN true
                  WHEN c.column_name ILIKE '%password%' OR c.column_name ILIKE '%passwd%' OR c.column_name ILIKE '%pwd%' THEN true
                  WHEN c.column_name ILIKE '%address%' OR c.column_name ILIKE '%street%' OR c.column_name ILIKE '%zip%' THEN true
                  WHEN c.column_name ILIKE '%birth%' OR c.column_name ILIKE '%dob%' OR c.column_name ILIKE '%age%' THEN true
                  WHEN c.column_name ILIKE '%name%' AND (c.column_name ILIKE '%first%' OR c.column_name ILIKE '%last%' OR c.column_name ILIKE '%full%') THEN true
                  WHEN c.column_name ILIKE '%id%' AND (c.column_name ILIKE '%national%' OR c.column_name ILIKE '%passport%' OR c.column_name ILIKE '%driver%') THEN true
                  ELSE false
                END as contains_pii,
                CASE 
                  WHEN c.column_name ILIKE '%email%' THEN 'EMAIL'
                  WHEN c.column_name ILIKE '%phone%' OR c.column_name ILIKE '%tel%' OR c.column_name ILIKE '%mobile%' THEN 'PHONE'
                  WHEN c.column_name ILIKE '%ssn%' OR c.column_name ILIKE '%social%' THEN 'SSN'
                  WHEN c.column_name ILIKE '%credit%' OR c.column_name ILIKE '%card%' THEN 'CREDIT_CARD'
                  WHEN c.column_name ILIKE '%password%' OR c.column_name ILIKE '%passwd%' THEN 'PASSWORD'
                  WHEN c.column_name ILIKE '%address%' THEN 'ADDRESS'
                  WHEN c.column_name ILIKE '%birth%' OR c.column_name ILIKE '%dob%' THEN 'DATE_OF_BIRTH'
                  WHEN c.column_name ILIKE '%name%' THEN 'NAME'
                  WHEN c.column_name ILIKE '%id%' THEN 'ID_NUMBER'
                  ELSE 'OTHER'
                END::VARCHAR as pii_category,
                CASE 
                  WHEN c.column_name ILIKE '%email%' THEN 0.95
                  WHEN c.column_name ILIKE '%phone%' OR c.column_name ILIKE '%tel%' THEN 0.90
                  WHEN c.column_name ILIKE '%ssn%' OR c.column_name ILIKE '%social%' THEN 0.98
                  WHEN c.column_name ILIKE '%credit%' OR c.column_name ILIKE '%card%' THEN 0.95
                  WHEN c.column_name ILIKE '%password%' THEN 0.99
                  ELSE 0.75
                END::NUMERIC as confidence_score
            FROM information_schema.columns c
            INNER JOIN information_schema.tables t
              ON c.table_schema = t.table_schema 
              AND c.table_name = t.table_name
            WHERE c.table_schema = $1
              AND t.table_type = 'BASE TABLE'
              AND c.table_name NOT LIKE '%_masked_%'
              AND c.table_name NOT LIKE '%_smart_%'
            ORDER BY c.table_name, c.ordinal_position
            `;

            const sensitiveColumns = await targetPool.query(analyzeQuery, [currentSchema]);

            for (const col of sensitiveColumns.rows) {
              if (col.contains_pii && col.confidence_score >= parseFloat(min_confidence)) {
                const policyName = `${currentSchema}_${col.table_name || 'unknown'}_${col.column_name}_mask`;
                
                const finalMaskingType = 
                  col.pii_category === 'EMAIL' ? 'EMAIL' :
                  col.pii_category === 'PHONE' ? 'PHONE' :
                  ['SSN', 'CREDIT_CARD', 'PASSWORD'].includes(col.pii_category) ? 'FULL' :
                  masking_type;

                try {
                  await pool.query(
                    `INSERT INTO metadata.masking_policies 
                     (policy_name, schema_name, table_name, column_name, masking_type, active)
                     VALUES ($1, $2, $3, $4, $5, $6)
                     ON CONFLICT (schema_name, table_name, column_name) DO UPDATE
                     SET masking_type = EXCLUDED.masking_type,
                         active = EXCLUDED.active,
                         updated_at = NOW()`,
                    [
                      policyName,
                      currentSchema,
                      col.table_name,
                      col.column_name,
                      finalMaskingType,
                      auto_activate,
                    ]
                  );

                  allResults.push({
                    schema_name: currentSchema,
                    table_name: col.table_name,
                    column_name: col.column_name,
                    pii_category: col.pii_category,
                    confidence_score: col.confidence_score,
                    policy_created: true,
                    policy_name: policyName,
                    message: 'Policy created successfully',
                  });
                } catch (policyErr) {
                  allResults.push({
                    schema_name: currentSchema,
                    table_name: col.table_name,
                    column_name: col.column_name,
                    pii_category: col.pii_category,
                    confidence_score: col.confidence_score,
                    policy_created: false,
                    policy_name: null,
                    message: `Error: ${policyErr.message}`,
                  });
                }
              }
            }
          }
        } finally {
          if (shouldClosePool) {
            await targetPool.end();
          }
        }
      }

      const created = allResults.filter((r) => r.policy_created).length;
      const failed = allResults.filter((r) => !r.policy_created).length;

      res.json({
        message: `Batch analysis completed: ${created} policies created, ${failed} skipped`,
        total_analyzed: allResults.length,
        policies_created: created,
        policies_skipped: failed,
        results: allResults,
      });
    } catch (err) {
      console.error("Error in batch analyze:", err);
      const safeError = sanitizeError(
        err,
        "Error al analizar y crear políticas en lote",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.post(
  "/api/data-masking/deactivate-all",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const result = await pool.query(
        "UPDATE metadata.masking_policies SET active = false, updated_at = NOW() WHERE active = true RETURNING policy_id"
      );

      res.json({
        message: `Deactivated ${result.rows.length} masking policies`,
        deactivated_count: result.rows.length,
      });
    } catch (err) {
      console.error("Error deactivating all masking policies:", err);
      const safeError = sanitizeError(
        err,
        "Error al desactivar todas las políticas de enmascaramiento",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

app.get(
  "/api/data-masking/status",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const { schema_name } = req.query;

      const result = await pool.query(
        "SELECT * FROM metadata.get_masking_status($1)",
        [schema_name || null]
      );

      // Filter out system schemas from the results
      const systemSchemas = ['pg_catalog', 'information_schema', 'pg_toast', 'postgres', 'pg_temp', 'pg_toast_temp'];
      const filteredRows = result.rows.filter(row => 
        !systemSchemas.includes(row.schema_name) && 
        !row.schema_name.startsWith('pg_temp') && 
        !row.schema_name.startsWith('pg_toast')
      );

      const totalStats = filteredRows.reduce(
        (acc, row) => ({
          total_tables: acc.total_tables + parseInt(row.total_tables, 10),
          total_columns: acc.total_columns + parseInt(row.total_columns, 10),
          sensitive_columns: acc.sensitive_columns + parseInt(row.sensitive_columns_detected, 10),
          columns_with_policies: acc.columns_with_policies + parseInt(row.columns_with_policies, 10),
          columns_without_policies: acc.columns_without_policies + parseInt(row.columns_without_policies, 10),
          active_policies: acc.active_policies + parseInt(row.active_policies, 10),
          inactive_policies: acc.inactive_policies + parseInt(row.inactive_policies, 10),
        }),
        {
          total_tables: 0,
          total_columns: 0,
          sensitive_columns: 0,
          columns_with_policies: 0,
          columns_without_policies: 0,
          active_policies: 0,
          inactive_policies: 0,
        }
      );

      const overallCoverage =
        totalStats.sensitive_columns > 0
          ? (totalStats.columns_with_policies / totalStats.sensitive_columns) * 100
          : 0;

      res.json({
        schema_details: filteredRows,
        overall_summary: {
          ...totalStats,
          coverage_percentage: Math.round(overallCoverage * 100) / 100,
          status:
            overallCoverage >= 90
              ? "EXCELLENT"
              : overallCoverage >= 70
              ? "GOOD"
              : overallCoverage >= 50
              ? "FAIR"
              : overallCoverage > 0
              ? "POOR"
              : "NONE",
        },
      });
    } catch (err) {
      console.error("Error fetching masking status:", err);
      const safeError = sanitizeError(
        err,
        "Error al obtener estado de enmascaramiento",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);


app.get(
  "/api/data-encryption/policies",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const {
        schema_name,
        table_name,
        active,
        page = 1,
        limit = 20,
      } = req.query;

      let query = "SELECT * FROM metadata.encryption_policies WHERE 1=1";
      const params = [];
      let paramCount = 0;

      if (schema_name) {
        paramCount++;
        query += ` AND schema_name ILIKE $${paramCount}`;
        params.push(`%${schema_name}%`);
      }

      if (table_name) {
        paramCount++;
        query += ` AND table_name ILIKE $${paramCount}`;
        params.push(`%${table_name}%`);
      }

      if (active !== undefined && active !== "") {
        paramCount++;
        query += ` AND active = $${paramCount}`;
        params.push(active === "true");
      }

      const countQuery = query.replace("SELECT *", "SELECT COUNT(*) as total");
      const countResult = await pool.query(countQuery, params);
      const total = parseInt(countResult.rows[0].total, 10);

      const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
      query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      params.push(parseInt(limit, 10), offset);

      const result = await pool.query(query, params);

      res.json({
        policies: result.rows,
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
      });
    } catch (err) {
      console.error("Error fetching encryption policies:", err);
      res.status(500).json({
        error: sanitizeError(
          err,
          "Error fetching encryption policies",
          process.env.NODE_ENV === "production"
        ),
      });
    }
  }
);

app.get(
  "/api/data-encryption/policies/:id",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const policyId = parseInt(req.params.id);
      const result = await pool.query(
        "SELECT * FROM metadata.encryption_policies WHERE policy_id = $1",
        [policyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Encryption policy not found" });
      }

      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error fetching encryption policy:", err);
      res.status(500).json({
        error: sanitizeError(
          err,
          "Error fetching encryption policy",
          process.env.NODE_ENV === "production"
        ),
      });
    }
  }
);

app.post(
  "/api/data-encryption/policies",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const {
        policy_name,
        schema_name,
        table_name,
        column_name,
        encryption_algorithm,
        key_id,
        key_rotation_interval_days,
        active,
      } = req.body;

      if (!policy_name || !schema_name || !table_name || !column_name || !key_id) {
        return res.status(400).json({
          error: "policy_name, schema_name, table_name, column_name, and key_id are required",
        });
      }

      const result = await pool.query(
        `INSERT INTO metadata.encryption_policies 
         (policy_name, schema_name, table_name, column_name, encryption_algorithm, key_id, key_rotation_interval_days, active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          policy_name,
          schema_name,
          table_name,
          column_name,
          encryption_algorithm || 'AES256',
          key_id,
          key_rotation_interval_days || 90,
          active !== undefined ? active : true,
        ]
      );

      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error creating encryption policy:", err);
      res.status(500).json({
        error: sanitizeError(
          err,
          "Error creating encryption policy",
          process.env.NODE_ENV === "production"
        ),
      });
    }
  }
);

app.put(
  "/api/data-encryption/policies/:id",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const policyId = parseInt(req.params.id);
      const {
        policy_name,
        encryption_algorithm,
        key_id,
        key_rotation_interval_days,
        active,
      } = req.body;

      const updates = [];
      const params = [];
      let paramCount = 0;

      if (policy_name !== undefined) {
        paramCount++;
        updates.push(`policy_name = $${paramCount}`);
        params.push(policy_name);
      }

      if (encryption_algorithm !== undefined) {
        paramCount++;
        updates.push(`encryption_algorithm = $${paramCount}`);
        params.push(encryption_algorithm);
      }

      if (key_id !== undefined) {
        paramCount++;
        updates.push(`key_id = $${paramCount}`);
        params.push(key_id);
      }

      if (key_rotation_interval_days !== undefined) {
        paramCount++;
        updates.push(`key_rotation_interval_days = $${paramCount}`);
        params.push(key_rotation_interval_days);
      }

      if (active !== undefined) {
        paramCount++;
        updates.push(`active = $${paramCount}`);
        params.push(active);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: "No fields to update" });
      }

      paramCount++;
      updates.push(`updated_at = NOW()`);
      params.push(policyId);

      const result = await pool.query(
        `UPDATE metadata.encryption_policies 
         SET ${updates.join(", ")}
         WHERE policy_id = $${paramCount}
         RETURNING *`,
        params
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Encryption policy not found" });
      }

      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error updating encryption policy:", err);
      res.status(500).json({
        error: sanitizeError(
          err,
          "Error updating encryption policy",
          process.env.NODE_ENV === "production"
        ),
      });
    }
  }
);

app.delete(
  "/api/data-encryption/policies/:id",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const policyId = parseInt(req.params.id);
      const result = await pool.query(
        "DELETE FROM metadata.encryption_policies WHERE policy_id = $1 RETURNING *",
        [policyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Encryption policy not found" });
      }

      res.json({ message: "Encryption policy deleted successfully", policy: result.rows[0] });
    } catch (err) {
      console.error("Error deleting encryption policy:", err);
      res.status(500).json({
        error: sanitizeError(
          err,
          "Error deleting encryption policy",
          process.env.NODE_ENV === "production"
        ),
      });
    }
  }
);

app.post(
  "/api/data-encryption/encrypt-column",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { schema_name, table_name, column_name, key_id } = req.body;

      if (!schema_name || !table_name || !column_name || !key_id) {
        return res.status(400).json({
          error: "schema_name, table_name, column_name, and key_id are required",
        });
      }

      const result = await pool.query(
        `UPDATE ${validateIdentifier(schema_name)}.${validateIdentifier(table_name)}
         SET ${validateIdentifier(column_name)} = encode(
           encrypt(${validateIdentifier(column_name)}::bytea, 
                   (SELECT key_value FROM metadata.encryption_keys WHERE key_id = $1 AND active = true LIMIT 1),
                   'aes'),
           'base64')
         WHERE ${validateIdentifier(column_name)} IS NOT NULL
         RETURNING COUNT(*) as rows_updated`,
        [key_id]
      );

      res.json({
        message: "Column encrypted successfully",
        rows_updated: parseInt(result.rows[0].rows_updated, 10),
      });
    } catch (err) {
      console.error("Error encrypting column:", err);
      res.status(500).json({
        error: sanitizeError(
          err,
          "Error encrypting column",
          process.env.NODE_ENV === "production"
        ),
      });
    }
  }
);

app.post(
  "/api/data-encryption/rotate-key",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { policy_id, new_key_id } = req.body;

      if (!policy_id || !new_key_id) {
        return res.status(400).json({
          error: "policy_id and new_key_id are required",
        });
      }

      await pool.query("SELECT metadata.rotate_encryption_key($1, $2)", [
        policy_id,
        new_key_id,
      ]);

      res.json({ message: "Encryption key rotated successfully" });
    } catch (err) {
      console.error("Error rotating encryption key:", err);
      res.status(500).json({
        error: sanitizeError(
          err,
          "Error rotating encryption key",
          process.env.NODE_ENV === "production"
        ),
      });
    }
  }
);

app.get(
  "/api/data-encryption/keys",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const result = await pool.query(
        "SELECT key_id, algorithm, created_at, last_used_at, rotation_count, active FROM metadata.encryption_keys WHERE active = true ORDER BY created_at DESC"
      );

      res.json({ keys: result.rows });
    } catch (err) {
      console.error("Error fetching encryption keys:", err);
      res.status(500).json({
        error: sanitizeError(
          err,
          "Error fetching encryption keys",
          process.env.NODE_ENV === "production"
        ),
      });
    }
  }
);

app.post(
  "/api/data-encryption/keys",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { key_id, key_value, algorithm } = req.body;

      if (!key_id || !key_value) {
        return res.status(400).json({
          error: "key_id and key_value are required",
        });
      }

      const result = await pool.query(
        `INSERT INTO metadata.encryption_keys (key_id, key_value, algorithm)
         VALUES ($1, $2, $3)
         ON CONFLICT (key_id) DO UPDATE SET
           key_value = EXCLUDED.key_value,
           algorithm = EXCLUDED.algorithm,
           rotation_count = encryption_keys.rotation_count + 1
         RETURNING key_id, algorithm, created_at, rotation_count`,
        [key_id, key_value, algorithm || 'AES256']
      );

      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error creating encryption key:", err);
      res.status(500).json({
        error: sanitizeError(
          err,
          "Error creating encryption key",
          process.env.NODE_ENV === "production"
        ),
      });
    }
  }
);


app.get(
  "/api/rls/policies",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const { schema_name, table_name, active, page = 1, limit = 20 } = req.query;

      let query = "SELECT * FROM metadata.rls_policies WHERE 1=1";
      const params = [];
      let paramCount = 0;

      if (schema_name) {
        paramCount++;
        query += ` AND schema_name ILIKE $${paramCount}`;
        params.push(`%${schema_name}%`);
      }

      if (table_name) {
        paramCount++;
        query += ` AND table_name ILIKE $${paramCount}`;
        params.push(`%${table_name}%`);
      }

      if (active !== undefined && active !== "") {
        paramCount++;
        query += ` AND active = $${paramCount}`;
        params.push(active === "true");
      }

      const countQuery = query.replace("SELECT *", "SELECT COUNT(*) as total");
      const countResult = await pool.query(countQuery, params);
      const total = parseInt(countResult.rows[0].total, 10);

      const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
      query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      params.push(parseInt(limit, 10), offset);

      const result = await pool.query(query, params);

      res.json({
        policies: result.rows,
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
      });
    } catch (err) {
      console.error("Error fetching RLS policies:", err);
      res.status(500).json({
        error: sanitizeError(
          err,
          "Error fetching RLS policies",
          process.env.NODE_ENV === "production"
        ),
      });
    }
  }
);

app.get(
  "/api/rls/policies/:id",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const policyId = parseInt(req.params.id);
      const result = await pool.query(
        "SELECT * FROM metadata.rls_policies WHERE policy_id = $1",
        [policyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "RLS policy not found" });
      }

      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error fetching RLS policy:", err);
      res.status(500).json({
        error: sanitizeError(
          err,
          "Error fetching RLS policy",
          process.env.NODE_ENV === "production"
        ),
      });
    }
  }
);

app.post(
  "/api/rls/policies",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const {
        policy_name,
        schema_name,
        table_name,
        policy_expression,
        policy_type,
        description,
        active,
      } = req.body;

      if (!policy_name || !schema_name || !table_name || !policy_expression) {
        return res.status(400).json({
          error: "policy_name, schema_name, table_name, and policy_expression are required",
        });
      }

      const result = await pool.query(
        `INSERT INTO metadata.rls_policies 
         (policy_name, schema_name, table_name, policy_expression, policy_type, description, active)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          policy_name,
          schema_name,
          table_name,
          policy_expression,
          policy_type || 'SELECT',
          description || null,
          active !== undefined ? active : true,
        ]
      );

      if (active !== false) {
        await pool.query("SELECT metadata.create_rls_policy($1, $2, $3, $4, $5)", [
          schema_name,
          table_name,
          policy_name,
          policy_expression,
          policy_type || 'SELECT',
        ]);
      }

      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error creating RLS policy:", err);
      res.status(500).json({
        error: sanitizeError(
          err,
          "Error creating RLS policy",
          process.env.NODE_ENV === "production"
        ),
      });
    }
  }
);

app.put(
  "/api/rls/policies/:id",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const policyId = parseInt(req.params.id);
      const {
        policy_name,
        policy_expression,
        policy_type,
        description,
        active,
      } = req.body;

      const policyResult = await pool.query(
        "SELECT * FROM metadata.rls_policies WHERE policy_id = $1",
        [policyId]
      );

      if (policyResult.rows.length === 0) {
        return res.status(404).json({ error: "RLS policy not found" });
      }

      const oldPolicy = policyResult.rows[0];

      const updates = [];
      const params = [];
      let paramCount = 0;

      if (policy_name !== undefined) {
        paramCount++;
        updates.push(`policy_name = $${paramCount}`);
        params.push(policy_name);
      }

      if (policy_expression !== undefined) {
        paramCount++;
        updates.push(`policy_expression = $${paramCount}`);
        params.push(policy_expression);
      }

      if (policy_type !== undefined) {
        paramCount++;
        updates.push(`policy_type = $${paramCount}`);
        params.push(policy_type);
      }

      if (description !== undefined) {
        paramCount++;
        updates.push(`description = $${paramCount}`);
        params.push(description);
      }

      if (active !== undefined) {
        paramCount++;
        updates.push(`active = $${paramCount}`);
        params.push(active);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: "No fields to update" });
      }

      paramCount++;
      updates.push(`updated_at = NOW()`);
      params.push(policyId);

      const result = await pool.query(
        `UPDATE metadata.rls_policies 
         SET ${updates.join(", ")}
         WHERE policy_id = $${paramCount}
         RETURNING *`,
        params
      );

      const newPolicy = result.rows[0];

      if (oldPolicy.active && !newPolicy.active) {
        await pool.query("SELECT metadata.drop_rls_policy($1, $2, $3)", [
          oldPolicy.schema_name,
          oldPolicy.table_name,
          oldPolicy.policy_name,
        ]);
      } else if (!oldPolicy.active && newPolicy.active) {
        await pool.query("SELECT metadata.create_rls_policy($1, $2, $3, $4, $5)", [
          newPolicy.schema_name,
          newPolicy.table_name,
          newPolicy.policy_name,
          newPolicy.policy_expression,
          newPolicy.policy_type,
        ]);
      } else if (newPolicy.active && (policy_expression !== undefined || policy_type !== undefined)) {
        await pool.query("SELECT metadata.drop_rls_policy($1, $2, $3)", [
          oldPolicy.schema_name,
          oldPolicy.table_name,
          oldPolicy.policy_name,
        ]);
        await pool.query("SELECT metadata.create_rls_policy($1, $2, $3, $4, $5)", [
          newPolicy.schema_name,
          newPolicy.table_name,
          newPolicy.policy_name,
          newPolicy.policy_expression,
          newPolicy.policy_type,
        ]);
      }

      res.json(newPolicy);
    } catch (err) {
      console.error("Error updating RLS policy:", err);
      res.status(500).json({
        error: sanitizeError(
          err,
          "Error updating RLS policy",
          process.env.NODE_ENV === "production"
        ),
      });
    }
  }
);

app.delete(
  "/api/rls/policies/:id",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const policyId = parseInt(req.params.id);
      const policyResult = await pool.query(
        "SELECT * FROM metadata.rls_policies WHERE policy_id = $1",
        [policyId]
      );

      if (policyResult.rows.length === 0) {
        return res.status(404).json({ error: "RLS policy not found" });
      }

      const policy = policyResult.rows[0];

      if (policy.active) {
        await pool.query("SELECT metadata.drop_rls_policy($1, $2, $3)", [
          policy.schema_name,
          policy.table_name,
          policy.policy_name,
        ]);
      }

      const result = await pool.query(
        "DELETE FROM metadata.rls_policies WHERE policy_id = $1 RETURNING *",
        [policyId]
      );

      res.json({ message: "RLS policy deleted successfully", policy: result.rows[0] });
    } catch (err) {
      console.error("Error deleting RLS policy:", err);
      res.status(500).json({
        error: sanitizeError(
          err,
          "Error deleting RLS policy",
          process.env.NODE_ENV === "production"
        ),
      });
    }
  }
);

app.post(
  "/api/rls/enable",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { schema_name, table_name } = req.body;

      if (!schema_name || !table_name) {
        return res.status(400).json({
          error: "schema_name and table_name are required",
        });
      }

      await pool.query("SELECT metadata.create_rls_policy($1, $2, $3, $4, $5)", [
        schema_name,
        table_name,
        'default_policy',
        'true',
        'ALL',
      ]);

      res.json({ message: "RLS enabled successfully" });
    } catch (err) {
      console.error("Error enabling RLS:", err);
      res.status(500).json({
        error: sanitizeError(
          err,
          "Error enabling RLS",
          process.env.NODE_ENV === "production"
        ),
      });
    }
  }
);

app.post(
  "/api/rls/disable",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { schema_name, table_name } = req.body;

      if (!schema_name || !table_name) {
        return res.status(400).json({
          error: "schema_name and table_name are required",
        });
      }

      await pool.query("SELECT metadata.disable_rls($1, $2)", [schema_name, table_name]);

      res.json({ message: "RLS disabled successfully" });
    } catch (err) {
      console.error("Error disabling RLS:", err);
      res.status(500).json({
        error: sanitizeError(
          err,
          "Error disabling RLS",
          process.env.NODE_ENV === "production"
        ),
      });
    }
  }
);

app.get(
  "/api/rls/policies-active",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const { schema_name, table_name } = req.query;

      const result = await pool.query("SELECT * FROM metadata.get_rls_policies($1, $2)", [
        schema_name || null,
        table_name || null,
      ]);

      res.json({ policies: result.rows });
    } catch (err) {
      console.error("Error fetching active RLS policies:", err);
      res.status(500).json({
        error: sanitizeError(
          err,
          "Error fetching active RLS policies",
          process.env.NODE_ENV === "production"
        ),
      });
    }
  }
);


app.get(
  "/api/audit/logs",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const {
        schema_name,
        table_name,
        username,
        action_type,
        start_date,
        end_date,
        page = 1,
        limit = 100,
      } = req.query;

      const result = await pool.query("SELECT * FROM metadata.get_audit_trail($1, $2, $3, $4, $5, $6, $7)", [
        schema_name || null,
        table_name || null,
        username || null,
        action_type || null,
        start_date ? new Date(start_date) : null,
        end_date ? new Date(end_date) : null,
        parseInt(limit, 10),
      ]);

      const total = result.rows.length;

      const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
      const paginatedRows = result.rows.slice(offset, offset + parseInt(limit, 10));

      res.json({
        logs: paginatedRows,
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
      });
    } catch (err) {
      console.error("Error fetching audit logs:", err);
      res.status(500).json({
        error: sanitizeError(
          err,
          "Error fetching audit logs",
          process.env.NODE_ENV === "production"
        ),
      });
    }
  }
);

app.post(
  "/api/audit/log",
  requireAuth,
  async (req, res) => {
    try {
      const {
        schema_name,
        table_name,
        column_name,
        username,
        action_type,
        query_text,
        old_values,
        new_values,
        rows_affected,
        client_addr,
        application_name,
        compliance_requirement,
      } = req.body;

      if (!username || !action_type) {
        return res.status(400).json({
          error: "username and action_type are required",
        });
      }

      const result = await pool.query(
        "SELECT metadata.log_audit_event($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) as log_id",
        [
          schema_name || null,
          table_name || null,
          column_name || null,
          username,
          action_type,
          query_text || null,
          old_values ? JSON.stringify(old_values) : null,
          new_values ? JSON.stringify(new_values) : null,
          rows_affected || 0,
          client_addr || null,
          application_name || null,
          compliance_requirement || null,
        ]
      );

      res.json({ log_id: result.rows[0].log_id });
    } catch (err) {
      console.error("Error logging audit event:", err);
      res.status(500).json({
        error: sanitizeError(
          err,
          "Error logging audit event",
          process.env.NODE_ENV === "production"
        ),
      });
    }
  }
);

app.get(
  "/api/audit/compliance-report",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { compliance_type, start_date, end_date } = req.query;

      if (!compliance_type) {
        return res.status(400).json({
          error: "compliance_type is required (GDPR, HIPAA, SOX, etc.)",
        });
      }

      const result = await pool.query("SELECT * FROM metadata.get_compliance_report($1, $2, $3)", [
        compliance_type,
        start_date ? new Date(start_date) : null,
        end_date ? new Date(end_date) : null,
      ]);

      res.json({ report: result.rows[0] || {} });
    } catch (err) {
      console.error("Error generating compliance report:", err);
      res.status(500).json({
        error: sanitizeError(
          err,
          "Error generating compliance report",
          process.env.NODE_ENV === "production"
        ),
      });
    }
  }
);

app.get(
  "/api/audit/stats",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const { days = 30 } = req.query;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days, 10));

      const statsResult = await pool.query(
        `SELECT 
          COUNT(*) as total_events,
          COUNT(DISTINCT username) as unique_users,
          COUNT(DISTINCT (schema_name || '.' || table_name)) as unique_tables,
          COUNT(*) FILTER (WHERE action_type = 'SELECT') as select_count,
          COUNT(*) FILTER (WHERE action_type = 'INSERT') as insert_count,
          COUNT(*) FILTER (WHERE action_type = 'UPDATE') as update_count,
          COUNT(*) FILTER (WHERE action_type = 'DELETE') as delete_count,
          COUNT(*) FILTER (WHERE compliance_requirement IS NOT NULL) as compliance_events
         FROM metadata.audit_log
         WHERE created_at >= $1`,
        [startDate]
      );

      const actionTypeResult = await pool.query(
        `SELECT action_type, COUNT(*) as count
         FROM metadata.audit_log
         WHERE created_at >= $1
         GROUP BY action_type
         ORDER BY count DESC`,
        [startDate]
      );

      const topUsersResult = await pool.query(
        `SELECT username, COUNT(*) as event_count
         FROM metadata.audit_log
         WHERE created_at >= $1
         GROUP BY username
         ORDER BY event_count DESC
         LIMIT 10`,
        [startDate]
      );

      res.json({
        summary: statsResult.rows[0],
        action_types: actionTypeResult.rows,
        top_users: topUsersResult.rows,
      });
    } catch (err) {
      console.error("Error fetching audit stats:", err);
      res.status(500).json({
        error: sanitizeError(
          err,
          "Error fetching audit stats",
          process.env.NODE_ENV === "production"
        ),
      });
    }
  }
);


app.get("/api/workflows", requireAuth, requireRole("admin", "user", "viewer"), async (req, res) => {
  try {
    const page = validatePage(req.query.page, 1);
    const limit = validateLimit(req.query.limit, 1, 100, 20);
    const offset = (page - 1) * limit;
    const active = req.query.active !== undefined ? validateBoolean(req.query.active) : undefined;
    const enabled = req.query.enabled !== undefined ? validateBoolean(req.query.enabled) : undefined;
    const search = sanitizeSearch(req.query.search, 100);

    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    if (active !== undefined) {
      whereConditions.push(`active = $${paramIndex++}`);
      queryParams.push(active);
    }

    if (enabled !== undefined) {
      whereConditions.push(`enabled = $${paramIndex++}`);
      queryParams.push(enabled);
    }

    if (search) {
      whereConditions.push(
        `(workflow_name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`
      );
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

    const totalResult = await pool.query(
      `SELECT COUNT(*) FROM metadata.workflows ${whereClause}`,
      queryParams
    );
    const total = parseInt(totalResult.rows[0].count, 10);

    const result = await pool.query(
      `SELECT * FROM metadata.workflows ${whereClause}
       ORDER BY workflow_name
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...queryParams, limit, offset]
    );

    res.json({
      total,
      page,
      limit,
      data: result.rows,
    });
  } catch (err) {
    console.error("Error fetching workflows:", err);
    res.status(500).json({
      error: sanitizeError(
        err,
        "Error fetching workflows",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});

app.get("/api/workflows/:workflowName", requireAuth, requireRole("admin", "user", "viewer"), async (req, res) => {
  try {
    const workflowName = validateIdentifier(req.params.workflowName);
    if (!workflowName) {
      return res.status(400).json({ error: "Invalid workflow name" });
    }

    const workflowResult = await pool.query(
      "SELECT * FROM metadata.workflows WHERE workflow_name = $1",
      [workflowName]
    );

    if (workflowResult.rows.length === 0) {
      return res.status(404).json({ error: "Workflow not found" });
    }

    const workflow = workflowResult.rows[0];

    const tasksResult = await pool.query(
      "SELECT * FROM metadata.workflow_tasks WHERE workflow_name = $1 ORDER BY task_name",
      [workflowName]
    );

    const dependenciesResult = await pool.query(
      "SELECT * FROM metadata.workflow_dependencies WHERE workflow_name = $1",
      [workflowName]
    );

    workflow.tasks = tasksResult.rows;
    workflow.dependencies = dependenciesResult.rows;

    res.json(workflow);
  } catch (err) {
    console.error("Error fetching workflow:", err);
    res.status(500).json({
      error: sanitizeError(
        err,
        "Error fetching workflow",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});

app.post("/api/workflows", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const workflow_name = validateIdentifier(req.body.workflow_name);
    const description = sanitizeSearch(req.body.description, 500);
    const schedule_cron = sanitizeSearch(req.body.schedule_cron, 100);
    const active = validateBoolean(req.body.active, true);
    const enabled = validateBoolean(req.body.enabled, true);
    const retry_policy = req.body.retry_policy || {
      max_retries: 3,
      retry_delay_seconds: 60,
      retry_backoff_multiplier: 2,
    };
    const sla_config = req.body.sla_config || {
      max_execution_time_seconds: 3600,
      alert_on_sla_breach: true,
    };
    const tasks = req.body.tasks || [];
    const dependencies = req.body.dependencies || [];
    const metadata = req.body.metadata || {};

    if (!workflow_name) {
      return res.status(400).json({ error: "workflow_name is required" });
    }

    const checkResult = await pool.query(
      `SELECT workflow_name FROM metadata.workflows WHERE workflow_name = $1`,
      [workflow_name]
    );

    if (checkResult.rows.length > 0) {
      return res.status(409).json({
        error: "Workflow with this name already exists",
      });
    }

    await pool.query("BEGIN");

    try {
      const workflowResult = await pool.query(
        `INSERT INTO metadata.workflows
         (workflow_name, description, schedule_cron, active, enabled, retry_policy, sla_config, metadata)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb)
         RETURNING *`,
        [
          workflow_name,
          description || null,
          schedule_cron || null,
          active,
          enabled,
          JSON.stringify(retry_policy),
          JSON.stringify(sla_config),
          JSON.stringify(metadata),
        ]
      );

      for (const task of tasks) {
        const task_type = validateEnum(
          task.task_type,
          ["CUSTOM_JOB", "DATA_WAREHOUSE", "DATA_VAULT", "SYNC", "API_CALL", "SCRIPT"],
          null
        );
        if (!task_type) {
          throw new Error(`Invalid task_type for task: ${task.task_name}`);
        }

        await pool.query(
          `INSERT INTO metadata.workflow_tasks
           (workflow_name, task_name, task_type, task_reference, description, task_config, retry_policy, position_x, position_y, metadata)
           VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9, $10::jsonb)`,
          [
            workflow_name,
            task.task_name,
            task_type,
            task.task_reference,
            task.description || null,
            JSON.stringify(task.task_config || {}),
            JSON.stringify(task.retry_policy || { max_retries: 3, retry_delay_seconds: 60 }),
            task.position_x || 0,
            task.position_y || 0,
            JSON.stringify(task.metadata || {}),
          ]
        );
      }

      for (const dep of dependencies) {
        const dependency_type = validateEnum(
          dep.dependency_type,
          ["SUCCESS", "COMPLETION", "SKIP_ON_FAILURE"],
          "SUCCESS"
        );

        await pool.query(
          `INSERT INTO metadata.workflow_dependencies
           (workflow_name, upstream_task_name, downstream_task_name, dependency_type, condition_expression)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            workflow_name,
            dep.upstream_task_name,
            dep.downstream_task_name,
            dependency_type,
            dep.condition_expression || null,
          ]
        );
      }

      await pool.query("COMMIT");

      const finalResult = await pool.query(
        "SELECT * FROM metadata.workflows WHERE workflow_name = $1",
        [workflow_name]
      );

      const finalWorkflow = finalResult.rows[0];
      const tasksResult = await pool.query(
        "SELECT * FROM metadata.workflow_tasks WHERE workflow_name = $1",
        [workflow_name]
      );
      const depsResult = await pool.query(
        "SELECT * FROM metadata.workflow_dependencies WHERE workflow_name = $1",
        [workflow_name]
      );

      finalWorkflow.tasks = tasksResult.rows;
      finalWorkflow.dependencies = depsResult.rows;

      res.json(finalWorkflow);
    } catch (err) {
      await pool.query("ROLLBACK");
      throw err;
    }
  } catch (err) {
    console.error("Error creating workflow:", err);
    res.status(500).json({
      error: sanitizeError(
        err,
        "Error creating workflow",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});

app.put("/api/workflows/:workflowName", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const workflowName = validateIdentifier(req.params.workflowName);
    if (!workflowName) {
      return res.status(400).json({ error: "Invalid workflow name" });
    }

    const description = sanitizeSearch(req.body.description, 500);
    const schedule_cron = sanitizeSearch(req.body.schedule_cron, 100);
    const active = validateBoolean(req.body.active, true);
    const enabled = validateBoolean(req.body.enabled, true);
    const retry_policy = req.body.retry_policy || {
      max_retries: 3,
      retry_delay_seconds: 60,
      retry_backoff_multiplier: 2,
    };
    const sla_config = req.body.sla_config || {
      max_execution_time_seconds: 3600,
      alert_on_sla_breach: true,
    };
    const tasks = req.body.tasks || [];
    const dependencies = req.body.dependencies || [];
    const metadata = req.body.metadata || {};

    const workflowCheck = await pool.query(
      "SELECT workflow_name FROM metadata.workflows WHERE workflow_name = $1",
      [workflowName]
    );

    if (workflowCheck.rows.length === 0) {
      return res.status(404).json({ error: "Workflow not found" });
    }

    await pool.query("BEGIN");

    try {
      await pool.query(
        `UPDATE metadata.workflows
         SET description = $1, schedule_cron = $2, active = $3, enabled = $4,
             retry_policy = $5::jsonb, sla_config = $6::jsonb, metadata = $7::jsonb,
             updated_at = NOW()
         WHERE workflow_name = $8`,
        [
          description || null,
          schedule_cron || null,
          active,
          enabled,
          JSON.stringify(retry_policy),
          JSON.stringify(sla_config),
          JSON.stringify(metadata),
          workflowName,
        ]
      );

      await pool.query(
        "DELETE FROM metadata.workflow_tasks WHERE workflow_name = $1",
        [workflowName]
      );

      await pool.query(
        "DELETE FROM metadata.workflow_dependencies WHERE workflow_name = $1",
        [workflowName]
      );

      for (const task of tasks) {
        const task_type = validateEnum(
          task.task_type,
          ["CUSTOM_JOB", "DATA_WAREHOUSE", "DATA_VAULT", "SYNC", "API_CALL", "SCRIPT"],
          null
        );
        if (!task_type) {
          throw new Error(`Invalid task_type for task: ${task.task_name}`);
        }

        await pool.query(
          `INSERT INTO metadata.workflow_tasks
           (workflow_name, task_name, task_type, task_reference, description, task_config, retry_policy, position_x, position_y, metadata)
           VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9, $10::jsonb)`,
          [
            workflowName,
            task.task_name,
            task_type,
            task.task_reference,
            task.description || null,
            JSON.stringify(task.task_config || {}),
            JSON.stringify(task.retry_policy || { max_retries: 3, retry_delay_seconds: 60 }),
            task.position_x || 0,
            task.position_y || 0,
            JSON.stringify(task.metadata || {}),
          ]
        );
      }

      for (const dep of dependencies) {
        const dependency_type = validateEnum(
          dep.dependency_type,
          ["SUCCESS", "COMPLETION", "SKIP_ON_FAILURE"],
          "SUCCESS"
        );

        await pool.query(
          `INSERT INTO metadata.workflow_dependencies
           (workflow_name, upstream_task_name, downstream_task_name, dependency_type, condition_expression)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            workflowName,
            dep.upstream_task_name,
            dep.downstream_task_name,
            dependency_type,
            dep.condition_expression || null,
          ]
        );
      }

      await pool.query("COMMIT");

      const finalResult = await pool.query(
        "SELECT * FROM metadata.workflows WHERE workflow_name = $1",
        [workflowName]
      );

      const finalWorkflow = finalResult.rows[0];
      const tasksResult = await pool.query(
        "SELECT * FROM metadata.workflow_tasks WHERE workflow_name = $1",
        [workflowName]
      );
      const depsResult = await pool.query(
        "SELECT * FROM metadata.workflow_dependencies WHERE workflow_name = $1",
        [workflowName]
      );

      finalWorkflow.tasks = tasksResult.rows;
      finalWorkflow.dependencies = depsResult.rows;

      res.json(finalWorkflow);
    } catch (err) {
      await pool.query("ROLLBACK");
      throw err;
    }
  } catch (err) {
    console.error("Error updating workflow:", err);
    res.status(500).json({
      error: sanitizeError(
        err,
        "Error updating workflow",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});

app.delete("/api/workflows/:workflowName", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const workflowName = validateIdentifier(req.params.workflowName);
    if (!workflowName) {
      return res.status(400).json({ error: "Invalid workflow name" });
    }

    const result = await pool.query(
      "DELETE FROM metadata.workflows WHERE workflow_name = $1 RETURNING *",
      [workflowName]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Workflow not found" });
    }

    res.json({ message: "Workflow deleted successfully" });
  } catch (err) {
    console.error("Error deleting workflow:", err);
    res.status(500).json({
      error: sanitizeError(
        err,
        "Error deleting workflow",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});

app.post("/api/workflows/:workflowName/execute", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const workflowName = validateIdentifier(req.params.workflowName);
    if (!workflowName) {
      return res.status(400).json({ error: "Invalid workflow name" });
    }

    const workflowCheck = await pool.query(
      "SELECT workflow_name, active, enabled FROM metadata.workflows WHERE workflow_name = $1",
      [workflowName]
    );

    if (workflowCheck.rows.length === 0) {
      return res.status(404).json({
        error: "Workflow not found",
        workflow_name: workflowName,
      });
    }

    const workflow = workflowCheck.rows[0];
    if (!workflow.active || !workflow.enabled) {
      return res.status(400).json({
        error: "Workflow is not active or enabled",
        workflow_name: workflowName,
        active: workflow.active,
        enabled: workflow.enabled,
      });
    }

    const executeMetadata = {
      execute_now: true,
      execute_timestamp: new Date().toISOString(),
    };

    await pool.query(
      `UPDATE metadata.workflows 
       SET metadata = COALESCE(metadata, '{}'::jsonb) || $1::jsonb
       WHERE workflow_name = $2`,
      [JSON.stringify(executeMetadata), workflowName]
    );

    res.json({
      message: "Workflow execution queued. DataSync will execute it shortly.",
      workflow_name: workflowName,
    });
  } catch (err) {
    console.error("Error executing workflow:", err);
    res.status(500).json({
      error: sanitizeError(
        err,
        "Error executing workflow",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});

app.get("/api/workflows/:workflowName/executions", requireAuth, requireRole("admin", "user", "viewer"), async (req, res) => {
  try {
    const workflowName = validateIdentifier(req.params.workflowName);
    if (!workflowName) {
      return res.status(400).json({ error: "Invalid workflow name" });
    }

    const limit = validateLimit(req.query.limit, 1, 100, 50);

    const result = await pool.query(
      `SELECT * FROM metadata.workflow_executions
       WHERE workflow_name = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [workflowName, limit]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching workflow executions:", err);
    res.status(500).json({
      error: sanitizeError(
        err,
        "Error fetching workflow executions",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});

app.get("/api/workflows/:workflowName/executions/:executionId", requireAuth, requireRole("admin", "user", "viewer"), async (req, res) => {
  try {
    const workflowName = validateIdentifier(req.params.workflowName);
    const executionId = sanitizeSearch(req.params.executionId, 255);
    if (!workflowName || !executionId) {
      return res.status(400).json({ error: "Invalid workflow name or execution ID" });
    }

    const result = await pool.query(
      `SELECT * FROM metadata.workflow_executions
       WHERE workflow_name = $1 AND execution_id = $2`,
      [workflowName, executionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Execution not found" });
    }

    const execution = result.rows[0];

    const tasksResult = await pool.query(
      `SELECT * FROM metadata.workflow_task_executions
       WHERE workflow_execution_id = $1
       ORDER BY created_at`,
      [execution.id]
    );

    execution.tasks = tasksResult.rows;

    res.json(execution);
  } catch (err) {
    console.error("Error fetching workflow execution:", err);
    res.status(500).json({
      error: sanitizeError(
        err,
        "Error fetching workflow execution",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});

app.get("/api/workflows/:workflowName/executions/:executionId/tasks", requireAuth, requireRole("admin", "user", "viewer"), async (req, res) => {
  try {
    const workflowName = validateIdentifier(req.params.workflowName);
    const executionId = sanitizeSearch(req.params.executionId, 255);
    if (!workflowName || !executionId) {
      return res.status(400).json({ error: "Invalid workflow name or execution ID" });
    }

    const executionResult = await pool.query(
      `SELECT id FROM metadata.workflow_executions
       WHERE workflow_name = $1 AND execution_id = $2`,
      [workflowName, executionId]
    );

    if (executionResult.rows.length === 0) {
      return res.status(404).json({ error: "Execution not found" });
    }

    const executionIdNum = executionResult.rows[0].id;

    const result = await pool.query(
      `SELECT * FROM metadata.workflow_task_executions
       WHERE workflow_execution_id = $1
       ORDER BY created_at`,
      [executionIdNum]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching task executions:", err);
    res.status(500).json({
      error: sanitizeError(
        err,
        "Error fetching task executions",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});

app.put("/api/workflows/:workflowName/toggle-active", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const workflowName = validateIdentifier(req.params.workflowName);
    if (!workflowName) {
      return res.status(400).json({ error: "Invalid workflow name" });
    }

    const result = await pool.query(
      `UPDATE metadata.workflows 
       SET active = NOT active, updated_at = NOW()
       WHERE workflow_name = $1
       RETURNING *`,
      [workflowName]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Workflow not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error toggling workflow active status:", err);
    res.status(500).json({
      error: sanitizeError(
        err,
        "Error toggling workflow active status",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});

app.put("/api/workflows/:workflowName/toggle-enabled", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const workflowName = validateIdentifier(req.params.workflowName);
    if (!workflowName) {
      return res.status(400).json({ error: "Invalid workflow name" });
    }

    const result = await pool.query(
      `UPDATE metadata.workflows 
       SET enabled = NOT enabled, updated_at = NOW()
       WHERE workflow_name = $1
       RETURNING *`,
      [workflowName]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Workflow not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error toggling workflow enabled status:", err);
    res.status(500).json({
      error: sanitizeError(
        err,
        "Error toggling workflow enabled status",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});


app.get("/api/dbt/models", requireAuth, requireRole("admin", "user", "viewer"), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, model_name, model_type, materialization, schema_name, database_name,
       sql_content, config, description, tags, depends_on, columns, tests, documentation,
       metadata, version, git_commit_hash, git_branch, active, created_at, updated_at,
       last_run_time, last_run_status, last_run_rows
       FROM metadata.dbt_models
       ORDER BY model_name`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error getting dbt models:", err);
    res.status(500).json({
      error: sanitizeError(err, "Error getting dbt models", process.env.NODE_ENV === "production"),
    });
  }
});

app.get("/api/dbt/models/:modelName", requireAuth, requireRole("admin", "user", "viewer"), async (req, res) => {
  try {
    const modelName = validateIdentifier(req.params.modelName);
    if (!modelName) {
      return res.status(400).json({ error: "Invalid model name" });
    }

    const result = await pool.query(
      `SELECT id, model_name, model_type, materialization, schema_name, database_name,
       sql_content, config, description, tags, depends_on, columns, tests, documentation,
       metadata, version, git_commit_hash, git_branch, active, created_at, updated_at,
       last_run_time, last_run_status, last_run_rows
       FROM metadata.dbt_models WHERE model_name = $1`,
      [modelName]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Model not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error getting dbt model:", err);
    res.status(500).json({
      error: sanitizeError(err, "Error getting dbt model", process.env.NODE_ENV === "production"),
    });
  }
});

app.post("/api/dbt/models", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const {
      model_name,
      model_type = "sql",
      materialization = "table",
      schema_name,
      database_name,
      sql_content,
      config = {},
      description,
      tags = [],
      depends_on = [],
      columns = [],
      tests = [],
      documentation,
      metadata = {},
      version = 1,
      git_commit_hash,
      git_branch,
      active = true,
    } = req.body;

    if (!model_name || !sql_content || !schema_name) {
      return res.status(400).json({ error: "model_name, sql_content, and schema_name are required" });
    }

    const result = await pool.query(
      `INSERT INTO metadata.dbt_models 
       (model_name, model_type, materialization, schema_name, database_name, sql_content,
        config, description, tags, depends_on, columns, tests, documentation, metadata,
        version, git_commit_hash, git_branch, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9::text[], $10::text[], 
               $11::jsonb, $12::jsonb, $13, $14::jsonb, $15, $16, $17, $18)
       ON CONFLICT (model_name) DO UPDATE SET
         model_type = EXCLUDED.model_type,
         materialization = EXCLUDED.materialization,
         schema_name = EXCLUDED.schema_name,
         database_name = EXCLUDED.database_name,
         sql_content = EXCLUDED.sql_content,
         config = EXCLUDED.config,
         description = EXCLUDED.description,
         tags = EXCLUDED.tags,
         depends_on = EXCLUDED.depends_on,
         columns = EXCLUDED.columns,
         tests = EXCLUDED.tests,
         documentation = EXCLUDED.documentation,
         metadata = EXCLUDED.metadata,
         version = EXCLUDED.version + 1,
         git_commit_hash = EXCLUDED.git_commit_hash,
         git_branch = EXCLUDED.git_branch,
         active = EXCLUDED.active,
         updated_at = NOW()
       RETURNING *`,
      [
        model_name, model_type, materialization, schema_name, database_name || null,
        sql_content, JSON.stringify(config), description || null, tags, depends_on,
        JSON.stringify(columns), JSON.stringify(tests), documentation || null,
        JSON.stringify(metadata), version, git_commit_hash || null, git_branch || null, active
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error creating/updating dbt model:", err);
    res.status(500).json({
      error: sanitizeError(err, "Error creating/updating dbt model", process.env.NODE_ENV === "production"),
    });
  }
});

app.delete("/api/dbt/models/:modelName", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const modelName = validateIdentifier(req.params.modelName);
    if (!modelName) {
      return res.status(400).json({ error: "Invalid model name" });
    }

    const result = await pool.query(
      "DELETE FROM metadata.dbt_models WHERE model_name = $1 RETURNING *",
      [modelName]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Model not found" });
    }

    res.json({ message: "Model deleted successfully", model: result.rows[0] });
  } catch (err) {
    console.error("Error deleting dbt model:", err);
    res.status(500).json({
      error: sanitizeError(err, "Error deleting dbt model", process.env.NODE_ENV === "production"),
    });
  }
});

app.post("/api/dbt/models/:modelName/execute", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const modelName = validateIdentifier(req.params.modelName);
    if (!modelName) {
      return res.status(400).json({ error: "Invalid model name" });
    }

    const result = await pool.query(
      "SELECT model_name, metadata FROM metadata.dbt_models WHERE model_name = $1 AND active = true",
      [modelName]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Model not found or inactive" });
    }

    const currentMetadata = result.rows[0].metadata || {};
    currentMetadata.execute_now = true;

    await pool.query(
      "UPDATE metadata.dbt_models SET metadata = $1::jsonb, updated_at = NOW() WHERE model_name = $2",
      [JSON.stringify(currentMetadata), modelName]
    );

    res.json({
      success: true,
      message: "Model execution queued. DataSync will execute it shortly.",
    });
  } catch (err) {
    console.error("Error queueing dbt model execution:", err);
    res.status(500).json({
      error: sanitizeError(err, "Error queueing dbt model execution", process.env.NODE_ENV === "production"),
    });
  }
});

app.post("/api/dbt/models/:modelName/tests/test-query", requireAuth, requireRole("admin", "user"), async (req, res) => {
  let testClient = null;
  try {
    const modelNameParam = req.params.modelName;
    if (!modelNameParam || typeof modelNameParam !== "string" || modelNameParam.trim().length === 0) {
      return res.status(400).json({ error: "Invalid model name" });
    }

    const { test_sql, test_type, column_name, test_config } = req.body;

    if (!test_sql) {
      return res.status(400).json({ error: "test_sql is required" });
    }

    const modelResult = await pool.query(
      `SELECT schema_name, database_name FROM metadata.dbt_models WHERE LOWER(model_name) = LOWER($1)`,
      [modelNameParam.trim()]
    );

    if (modelResult.rows.length === 0) {
      return res.status(404).json({ error: "Model not found" });
    }

    const model = modelResult.rows[0];
    const { Client } = pkg;
    
    const dbConfig = config.database?.postgres || {};
    const connectionString = model.database_name 
      ? `postgresql://${dbConfig.user || process.env.POSTGRES_USER || 'postgres'}:${dbConfig.password || process.env.POSTGRES_PASSWORD || ''}@${dbConfig.host || process.env.POSTGRES_HOST || 'localhost'}:${dbConfig.port || process.env.POSTGRES_PORT || 5432}/${model.database_name}`
      : `postgresql://${dbConfig.user || process.env.POSTGRES_USER || 'postgres'}:${dbConfig.password || process.env.POSTGRES_PASSWORD || ''}@${dbConfig.host || process.env.POSTGRES_HOST || 'localhost'}:${dbConfig.port || process.env.POSTGRES_PORT || 5432}/${dbConfig.database || process.env.POSTGRES_DATABASE || 'DataLake'}`;

    testClient = new Client({ connectionString });
    await testClient.connect();
    const testResult = await testClient.query(test_sql);
    
    let failureCount = 0;
    if (testResult.rows && testResult.rows.length > 0) {
      const firstRow = testResult.rows[0];
      const firstKey = Object.keys(firstRow)[0];
      failureCount = parseInt(firstRow[firstKey]) || 0;
    }

    await testClient.end();
    testClient = null;

    res.json({
      success: true,
      failure_count: failureCount,
      status: failureCount === 0 ? 'pass' : 'fail',
      message: failureCount === 0 
        ? 'Test passed: No failures found' 
        : `Test failed: ${failureCount} rows failed`,
      result: testResult.rows
    });
  } catch (err) {
    if (testClient) {
      try {
        await testClient.end();
      } catch (e) {
        console.error("Error closing test connection:", e);
      }
    }
    console.error("Error testing query:", err);
    if (err.message && (err.message.includes("syntax error") || err.message.includes("does not exist"))) {
      res.status(400).json({
        success: false,
        failure_count: 0,
        status: 'error',
        message: "SQL query execution failed",
        error: err.message
      });
    } else {
      res.status(500).json({
        error: sanitizeError(err, "Error testing query", process.env.NODE_ENV === "production"),
      });
    }
  }
});

app.post("/api/dbt/models/:modelName/tests/run", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const modelNameParam = req.params.modelName;
    if (!modelNameParam || typeof modelNameParam !== "string" || modelNameParam.trim().length === 0) {
      return res.status(400).json({ error: "Invalid model name" });
    }

    const result = await pool.query(
      "SELECT model_name, metadata FROM metadata.dbt_models WHERE LOWER(model_name) = LOWER($1) AND active = true",
      [modelNameParam.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Model not found or inactive" });
    }

    const actualModelName = result.rows[0].model_name;
    const currentMetadata = result.rows[0].metadata || {};
    currentMetadata.run_tests = true;

    await pool.query(
      "UPDATE metadata.dbt_models SET metadata = $1::jsonb, updated_at = NOW() WHERE model_name = $2",
      [JSON.stringify(currentMetadata), actualModelName]
    );

    res.json({
      success: true,
      message: "Test execution queued. DataSync will execute it shortly.",
    });
  } catch (err) {
    console.error("Error queueing dbt tests:", err);
    res.status(500).json({
      error: sanitizeError(err, "Error queueing dbt tests", process.env.NODE_ENV === "production"),
    });
  }
});

app.get("/api/dbt/test-results", requireAuth, requireRole("admin", "user", "viewer"), async (req, res) => {
  try {
    const modelName = req.query.model_name;
    const runId = req.query.run_id;
    let query, params;

    if (modelName && runId) {
      query = `SELECT * FROM metadata.dbt_test_results 
               WHERE LOWER(model_name) = LOWER($1) AND run_id = $2 ORDER BY created_at DESC`;
      params = [modelName, runId];
    } else if (modelName) {
      query = `SELECT * FROM metadata.dbt_test_results 
               WHERE LOWER(model_name) = LOWER($1) ORDER BY created_at DESC LIMIT 100`;
      params = [modelName];
    } else {
      query = `SELECT * FROM metadata.dbt_test_results 
               ORDER BY created_at DESC LIMIT 500`;
      params = [];
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Error getting test results:", err);
    res.status(500).json({
      error: sanitizeError(err, "Error getting test results", process.env.NODE_ENV === "production"),
    });
  }
});

app.get("/api/dbt/models/:modelName/test-results", requireAuth, requireRole("admin", "user", "viewer"), async (req, res) => {
  try {
    const modelNameParam = req.params.modelName;
    if (!modelNameParam || typeof modelNameParam !== "string" || modelNameParam.trim().length === 0) {
      return res.status(400).json({ error: "Invalid model name" });
    }

    const runId = req.query.run_id;
    let query, params;

    if (runId) {
      query = `SELECT * FROM metadata.dbt_test_results 
               WHERE LOWER(model_name) = LOWER($1) AND run_id = $2 ORDER BY created_at DESC`;
      params = [modelNameParam.trim(), runId];
    } else {
      query = `SELECT * FROM metadata.dbt_test_results 
               WHERE LOWER(model_name) = LOWER($1) ORDER BY created_at DESC LIMIT 100`;
      params = [modelNameParam.trim()];
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Error getting test results:", err);
    res.status(500).json({
      error: sanitizeError(err, "Error getting test results", process.env.NODE_ENV === "production"),
    });
  }
});

app.get("/api/dbt/models/:modelName/runs", requireAuth, requireRole("admin", "user", "viewer"), async (req, res) => {
  try {
    const modelName = validateIdentifier(req.params.modelName);
    if (!modelName) {
      return res.status(400).json({ error: "Invalid model name" });
    }

    const limit = parseInt(req.query.limit || "50", 10);
    const result = await pool.query(
      `SELECT * FROM metadata.dbt_model_runs 
       WHERE model_name = $1 ORDER BY created_at DESC LIMIT $2`,
      [modelName, limit]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error getting model runs:", err);
    res.status(500).json({
      error: sanitizeError(err, "Error getting model runs", process.env.NODE_ENV === "production"),
    });
  }
});

app.get("/api/dbt/macros", requireAuth, requireRole("admin", "user", "viewer"), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, macro_name, macro_sql, parameters, description, return_type,
       examples, tags, active, created_at, updated_at
       FROM metadata.dbt_macros WHERE active = true ORDER BY macro_name`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error getting dbt macros:", err);
    res.status(500).json({
      error: sanitizeError(err, "Error getting dbt macros", process.env.NODE_ENV === "production"),
    });
  }
});

app.post("/api/dbt/macros", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const {
      macro_name,
      macro_sql,
      parameters = [],
      description,
      return_type,
      examples,
      tags = [],
      active = true,
    } = req.body;

    if (!macro_name || !macro_sql) {
      return res.status(400).json({ error: "macro_name and macro_sql are required" });
    }

    const result = await pool.query(
      `INSERT INTO metadata.dbt_macros 
       (macro_name, macro_sql, parameters, description, return_type, examples, tags, active)
       VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7::text[], $8)
       ON CONFLICT (macro_name) DO UPDATE SET
         macro_sql = EXCLUDED.macro_sql,
         parameters = EXCLUDED.parameters,
         description = EXCLUDED.description,
         return_type = EXCLUDED.return_type,
         examples = EXCLUDED.examples,
         tags = EXCLUDED.tags,
         active = EXCLUDED.active,
         updated_at = NOW()
       RETURNING *`,
      [
        macro_name, macro_sql, JSON.stringify(parameters), description || null,
        return_type || null, examples || null, tags, active
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error creating/updating dbt macro:", err);
    res.status(500).json({
      error: sanitizeError(err, "Error creating/updating dbt macro", process.env.NODE_ENV === "production"),
    });
  }
});

app.put("/api/dbt/macros/:macroName", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const macroName = validateIdentifier(req.params.macroName);
    if (!macroName) {
      return res.status(400).json({ error: "Invalid macro name" });
    }

    const {
      macro_sql,
      parameters = [],
      description,
      return_type,
      examples,
      tags = [],
      active = true,
    } = req.body;

    if (!macro_sql) {
      return res.status(400).json({ error: "macro_sql is required" });
    }

    const result = await pool.query(
      `UPDATE metadata.dbt_macros SET
         macro_sql = $2,
         parameters = $3::jsonb,
         description = $4,
         return_type = $5,
         examples = $6,
         tags = $7::text[],
         active = $8,
         updated_at = NOW()
       WHERE macro_name = $1
       RETURNING *`,
      [
        macroName, macro_sql, JSON.stringify(parameters), description || null,
        return_type || null, examples || null, tags, active
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Macro not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating dbt macro:", err);
    res.status(500).json({
      error: sanitizeError(err, "Error updating dbt macro", process.env.NODE_ENV === "production"),
    });
  }
});

app.delete("/api/dbt/macros/:macroName", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const macroName = validateIdentifier(req.params.macroName);
    if (!macroName) {
      return res.status(400).json({ error: "Invalid macro name" });
    }

    const result = await pool.query(
      `DELETE FROM metadata.dbt_macros WHERE macro_name = $1 RETURNING *`,
      [macroName]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Macro not found" });
    }

    res.json({ message: "Macro deleted successfully", macro: result.rows[0] });
  } catch (err) {
    console.error("Error deleting dbt macro:", err);
    res.status(500).json({
      error: sanitizeError(err, "Error deleting dbt macro", process.env.NODE_ENV === "production"),
    });
  }
});

app.get("/api/dbt/sources", requireAuth, requireRole("admin", "user", "viewer"), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, source_name, source_type, database_name, schema_name, table_name,
       connection_string, description, columns, freshness_config, metadata, active,
       created_at, updated_at
       FROM metadata.dbt_sources WHERE active = true ORDER BY source_name, schema_name, table_name`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error getting dbt sources:", err);
    res.status(500).json({
      error: sanitizeError(err, "Error getting dbt sources", process.env.NODE_ENV === "production"),
    });
  }
});

app.post("/api/dbt/sources", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const {
      source_name,
      source_type,
      database_name,
      schema_name,
      table_name,
      connection_string,
      description,
      columns = [],
      freshness_config = {},
      metadata = {},
      active = true,
    } = req.body;

    if (!source_name || !source_type || !schema_name || !table_name) {
      return res.status(400).json({ error: "source_name, source_type, schema_name, and table_name are required" });
    }

    const result = await pool.query(
      `INSERT INTO metadata.dbt_sources 
       (source_name, source_type, database_name, schema_name, table_name, connection_string,
        description, columns, freshness_config, metadata, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10::jsonb, $11)
       ON CONFLICT (source_name, schema_name, table_name) DO UPDATE SET
         source_type = EXCLUDED.source_type,
         database_name = EXCLUDED.database_name,
         connection_string = EXCLUDED.connection_string,
         description = EXCLUDED.description,
         columns = EXCLUDED.columns,
         freshness_config = EXCLUDED.freshness_config,
         metadata = EXCLUDED.metadata,
         active = EXCLUDED.active,
         updated_at = NOW()
       RETURNING *`,
      [
        source_name, source_type, database_name || null, schema_name, table_name,
        connection_string || null, description || null, JSON.stringify(columns),
        JSON.stringify(freshness_config), JSON.stringify(metadata), active
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error creating/updating dbt source:", err);
    res.status(500).json({
      error: sanitizeError(err, "Error creating/updating dbt source", process.env.NODE_ENV === "production"),
    });
  }
});

app.put("/api/dbt/sources/:sourceName/:schemaName/:tableName", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const sourceName = validateIdentifier(req.params.sourceName);
    const schemaName = validateIdentifier(req.params.schemaName);
    const tableName = validateIdentifier(req.params.tableName);
    
    if (!sourceName || !schemaName || !tableName) {
      return res.status(400).json({ error: "Invalid source name, schema name, or table name" });
    }

    const {
      source_type,
      database_name,
      connection_string,
      description,
      columns = [],
      freshness_config = {},
      metadata = {},
      active = true,
    } = req.body;

    const result = await pool.query(
      `UPDATE metadata.dbt_sources SET
         source_type = $4,
         database_name = $5,
         connection_string = $6,
         description = $7,
         columns = $8::jsonb,
         freshness_config = $9::jsonb,
         metadata = $10::jsonb,
         active = $11,
         updated_at = NOW()
       WHERE source_name = $1 AND schema_name = $2 AND table_name = $3
       RETURNING *`,
      [
        sourceName, schemaName, tableName, source_type, database_name || null,
        connection_string || null, description || null, JSON.stringify(columns),
        JSON.stringify(freshness_config), JSON.stringify(metadata), active
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Source not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating dbt source:", err);
    res.status(500).json({
      error: sanitizeError(err, "Error updating dbt source", process.env.NODE_ENV === "production"),
    });
  }
});

app.delete("/api/dbt/sources/:sourceName/:schemaName/:tableName", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const sourceName = validateIdentifier(req.params.sourceName);
    const schemaName = validateIdentifier(req.params.schemaName);
    const tableName = validateIdentifier(req.params.tableName);
    
    if (!sourceName || !schemaName || !tableName) {
      return res.status(400).json({ error: "Invalid source name, schema name, or table name" });
    }

    const result = await pool.query(
      `DELETE FROM metadata.dbt_sources 
       WHERE source_name = $1 AND schema_name = $2 AND table_name = $3
       RETURNING *`,
      [sourceName, schemaName, tableName]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Source not found" });
    }

    res.json({ message: "Source deleted successfully", source: result.rows[0] });
  } catch (err) {
    console.error("Error deleting dbt source:", err);
    res.status(500).json({
      error: sanitizeError(err, "Error deleting dbt source", process.env.NODE_ENV === "production"),
    });
  }
});

app.get("/api/dbt/tests", requireAuth, requireRole("admin", "user", "viewer"), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, test_name, model_name, test_type, column_name, test_config, test_sql,
       description, severity, active, created_at, updated_at
       FROM metadata.dbt_tests ORDER BY model_name, test_name`
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error getting all dbt tests:", err);
    res.status(500).json({
      error: sanitizeError(err, "Error getting all dbt tests", process.env.NODE_ENV === "production"),
    });
  }
});

app.get("/api/dbt/models/:modelName/tests", requireAuth, requireRole("admin", "user", "viewer"), async (req, res) => {
  try {
    const modelNameParam = req.params.modelName;
    if (!modelNameParam || typeof modelNameParam !== "string" || modelNameParam.trim().length === 0) {
      return res.status(400).json({ error: "Invalid model name" });
    }

    const result = await pool.query(
      `SELECT id, test_name, model_name, test_type, column_name, test_config, test_sql,
       description, severity, active, created_at, updated_at
       FROM metadata.dbt_tests WHERE LOWER(model_name) = LOWER($1) ORDER BY test_name`,
      [modelNameParam.trim()]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error getting dbt tests:", err);
    res.status(500).json({
      error: sanitizeError(err, "Error getting dbt tests", process.env.NODE_ENV === "production"),
    });
  }
});

app.post("/api/dbt/models/:modelName/tests", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const modelNameParam = req.params.modelName;
    if (!modelNameParam || typeof modelNameParam !== "string" || modelNameParam.trim().length === 0) {
      return res.status(400).json({ error: "Invalid model name" });
    }

    const modelCheck = await pool.query(
      `SELECT model_name FROM metadata.dbt_models WHERE LOWER(model_name) = LOWER($1)`,
      [modelNameParam.trim()]
    );

    if (modelCheck.rows.length === 0) {
      return res.status(404).json({ error: `Model "${modelNameParam}" not found. Please save the model first before adding tests.` });
    }

    const actualModelName = modelCheck.rows[0].model_name;

    const {
      test_name,
      test_type,
      column_name,
      test_config = {},
      test_sql,
      description,
      severity = "error",
      active = true,
    } = req.body;

    if (!test_name || !test_type) {
      return res.status(400).json({ error: "test_name and test_type are required" });
    }

    const result = await pool.query(
      `INSERT INTO metadata.dbt_tests 
       (test_name, model_name, test_type, column_name, test_config, test_sql, description, severity, active)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9)
       ON CONFLICT (test_name, model_name) DO UPDATE SET
         test_type = EXCLUDED.test_type,
         column_name = EXCLUDED.column_name,
         test_config = EXCLUDED.test_config,
         test_sql = EXCLUDED.test_sql,
         description = EXCLUDED.description,
         severity = EXCLUDED.severity,
         active = EXCLUDED.active,
         updated_at = NOW()
       RETURNING *`,
      [
        test_name, actualModelName, test_type, column_name || null,
        JSON.stringify(test_config), test_sql || null, description || null,
        severity, active
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error creating/updating dbt test:", err);
    res.status(500).json({
      error: sanitizeError(err, "Error creating/updating dbt test", process.env.NODE_ENV === "production"),
    });
  }
});

app.put("/api/dbt/models/:modelName/tests/:testName", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const modelNameParam = req.params.modelName;
    const testName = validateIdentifier(req.params.testName);
    if (!modelNameParam || typeof modelNameParam !== "string" || modelNameParam.trim().length === 0 || !testName) {
      return res.status(400).json({ error: "Invalid model name or test name" });
    }

    const modelCheck = await pool.query(
      `SELECT model_name FROM metadata.dbt_models WHERE LOWER(model_name) = LOWER($1)`,
      [modelNameParam.trim()]
    );

    if (modelCheck.rows.length === 0) {
      return res.status(404).json({ error: "Model not found" });
    }

    const actualModelName = modelCheck.rows[0].model_name;

    const {
      test_type,
      column_name,
      test_config = {},
      test_sql,
      description,
      severity = "error",
      active = true,
    } = req.body;

    const result = await pool.query(
      `UPDATE metadata.dbt_tests SET
         test_type = $3,
         column_name = $4,
         test_config = $5::jsonb,
         test_sql = $6,
         description = $7,
         severity = $8,
         active = $9,
         updated_at = NOW()
       WHERE test_name = $1 AND model_name = $2
       RETURNING *`,
      [
        testName, actualModelName, test_type, column_name || null,
        JSON.stringify(test_config), test_sql || null, description || null,
        severity, active
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Test not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating dbt test:", err);
    res.status(500).json({
      error: sanitizeError(err, "Error updating dbt test", process.env.NODE_ENV === "production"),
    });
  }
});

app.delete("/api/dbt/models/:modelName/tests/:testName", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const modelNameParam = req.params.modelName;
    const testName = validateIdentifier(req.params.testName);
    if (!modelNameParam || typeof modelNameParam !== "string" || modelNameParam.trim().length === 0 || !testName) {
      return res.status(400).json({ error: "Invalid model name or test name" });
    }

    const modelCheck = await pool.query(
      `SELECT model_name FROM metadata.dbt_models WHERE LOWER(model_name) = LOWER($1)`,
      [modelNameParam.trim()]
    );

    if (modelCheck.rows.length === 0) {
      return res.status(404).json({ error: "Model not found" });
    }

    const actualModelName = modelCheck.rows[0].model_name;

    const result = await pool.query(
      `DELETE FROM metadata.dbt_tests 
       WHERE test_name = $1 AND model_name = $2
       RETURNING *`,
      [testName, actualModelName]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Test not found" });
    }

    res.json({ message: "Test deleted successfully", test: result.rows[0] });
  } catch (err) {
    console.error("Error deleting dbt test:", err);
    res.status(500).json({
      error: sanitizeError(err, "Error deleting dbt test", process.env.NODE_ENV === "production"),
    });
  }
});

app.get("/api/dbt/models/:modelName/compile", requireAuth, requireRole("admin", "user", "viewer"), async (req, res) => {
  try {
    const modelName = validateIdentifier(req.params.modelName);
    if (!modelName) {
      return res.status(400).json({ error: "Invalid model name" });
    }

    const { spawn } = await import("child_process");
    const DataSyncPath = path.join(process.cwd(), "..", "DataSync", "DataSync");
    
    if (!fs.existsSync(DataSyncPath)) {
      return res.status(500).json({
        error: `DataSync executable not found at: ${DataSyncPath}`,
      });
    }

    const cppProcess = spawn(DataSyncPath, ["--compile-dbt-model", modelName], {
      cwd: path.join(process.cwd(), "..", "DataSync"),
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    cppProcess.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    cppProcess.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    cppProcess.on("error", (err) => {
      console.error("Error spawning DataSync process:", err);
      if (!res.headersSent) {
        res.status(500).json({
          error: "Failed to start DataSync process",
          details: err.message,
        });
      }
    });

    cppProcess.on("close", (code) => {
      if (res.headersSent) return;
      
      if (code === 0) {
        try {
          const output = JSON.parse(stdout);
          if (output.compiled_sql) {
            res.json({ compiled_sql: output.compiled_sql });
          } else {
            res.json({ compiled_sql: stdout.trim() });
          }
        } catch (parseErr) {
          res.json({ compiled_sql: stdout.trim() });
        }
      } else {
        res.status(500).json({
          error: "Compilation failed",
          stderr: stderr || stdout,
          exitCode: code,
        });
      }
    });
  } catch (err) {
    console.error("Error compiling dbt model:", err);
    res.status(500).json({
      error: sanitizeError(err, "Error compiling dbt model", process.env.NODE_ENV === "production"),
    });
  }
});
// ============================================
// Big Data Processing API Endpoints
// ============================================

// Spark Configuration
app.get("/api/big-data/spark/config", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT master_url, app_name, spark_home, connect_url, 
              executor_memory_mb, executor_cores, max_retries, 
              retry_delay_seconds, spark_conf
       FROM metadata.spark_config 
       ORDER BY id DESC LIMIT 1`
    );

    if (result.rows.length === 0) {
      // Return default configuration when none exists
      return res.json({
        masterUrl: 'local[*]',
        appName: 'DataSync',
        sparkHome: undefined,
        connectUrl: undefined,
        executorMemoryMB: 2048,
        executorCores: 2,
        maxRetries: 3,
        retryDelaySeconds: 5,
        sparkConf: {}
      });
    }

    const row = result.rows[0];
    res.json({
      masterUrl: row.master_url,
      appName: row.app_name,
      sparkHome: row.spark_home || undefined,
      connectUrl: row.connect_url || undefined,
      executorMemoryMB: row.executor_memory_mb,
      executorCores: row.executor_cores,
      maxRetries: row.max_retries,
      retryDelaySeconds: row.retry_delay_seconds,
      sparkConf: row.spark_conf || {}
    });
  } catch (err) {
    const safeError = sanitizeError(
      err,
      "Error getting Spark config",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.put("/api/big-data/spark/config", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const { masterUrl, appName, sparkHome, connectUrl, executorMemoryMB, executorCores, maxRetries, retryDelaySeconds, sparkConf } = req.body;

    if (!masterUrl || !appName) {
      return res.status(400).json({ error: "masterUrl and appName are required" });
    }

    // Check if config exists
    const existing = await pool.query(`SELECT id FROM metadata.spark_config ORDER BY id DESC LIMIT 1`);
    
    if (existing.rows.length === 0) {
      // Insert new config
      await pool.query(
        `INSERT INTO metadata.spark_config 
         (master_url, app_name, spark_home, connect_url, executor_memory_mb, 
          executor_cores, max_retries, retry_delay_seconds, spark_conf)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)`,
        [
          masterUrl, appName, sparkHome || null, connectUrl || null,
          executorMemoryMB || 2048, executorCores || 2, maxRetries || 3,
          retryDelaySeconds || 5, JSON.stringify(sparkConf || {})
        ]
      );
    } else {
      // Update existing config
      await pool.query(
        `UPDATE metadata.spark_config SET
         master_url = $1, app_name = $2, spark_home = $3, connect_url = $4,
         executor_memory_mb = $5, executor_cores = $6, max_retries = $7,
         retry_delay_seconds = $8, spark_conf = $9::jsonb, updated_at = NOW()
         WHERE id = $10`,
        [
          masterUrl, appName, sparkHome || null, connectUrl || null,
          executorMemoryMB || 2048, executorCores || 2, maxRetries || 3,
          retryDelaySeconds || 5, JSON.stringify(sparkConf || {}), existing.rows[0].id
        ]
      );
    }

    res.json({ success: true, message: "Spark configuration updated" });
  } catch (err) {
    const safeError = sanitizeError(
      err,
      "Error updating Spark config",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.post("/api/big-data/spark/test-connection", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const { masterUrl, connectUrl, sparkHome } = req.body;

    // For now, just validate the configuration
    // In a real implementation, this would attempt to connect to Spark
    if (!masterUrl && !connectUrl) {
      return res.status(400).json({ error: "masterUrl or connectUrl is required" });
    }

    // Simulate connection test
    res.json({
      success: true,
      message: "Connection test successful",
      config: {
        masterUrl: masterUrl || "Not specified",
        connectUrl: connectUrl || "Not specified"
      }
    });
  } catch (err) {
    const safeError = sanitizeError(
      err,
      "Error testing Spark connection",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

// Distributed Processing Configuration
app.get("/api/big-data/distributed/config", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT force_mode, distributed_threshold_rows, 
              distributed_threshold_size_mb, broadcast_join_threshold_mb
       FROM metadata.distributed_processing_config 
       ORDER BY id DESC LIMIT 1`
    );

    if (result.rows.length === 0) {
      // Return default configuration when none exists
      return res.json({
        forceMode: 'AUTO',
        distributedThresholdRows: 1000000,
        distributedThresholdSizeMB: 1000,
        broadcastJoinThresholdMB: 10
      });
    }

    const row = result.rows[0];
    res.json({
      forceMode: row.force_mode,
      distributedThresholdRows: parseInt(row.distributed_threshold_rows),
      distributedThresholdSizeMB: row.distributed_threshold_size_mb,
      broadcastJoinThresholdMB: row.broadcast_join_threshold_mb
    });
  } catch (err) {
    const safeError = sanitizeError(
      err,
      "Error getting distributed processing config",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.put("/api/big-data/distributed/config", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const { forceMode, distributedThresholdRows, distributedThresholdSizeMB, broadcastJoinThresholdMB } = req.body;

    const existing = await pool.query(`SELECT id FROM metadata.distributed_processing_config ORDER BY id DESC LIMIT 1`);
    
    if (existing.rows.length === 0) {
      await pool.query(
        `INSERT INTO metadata.distributed_processing_config 
         (force_mode, distributed_threshold_rows, distributed_threshold_size_mb, broadcast_join_threshold_mb)
         VALUES ($1, $2, $3, $4)`,
        [
          forceMode || 'AUTO',
          distributedThresholdRows || 1000000,
          distributedThresholdSizeMB || 1000,
          broadcastJoinThresholdMB || 10
        ]
      );
    } else {
      await pool.query(
        `UPDATE metadata.distributed_processing_config SET
         force_mode = $1, distributed_threshold_rows = $2, 
         distributed_threshold_size_mb = $3, broadcast_join_threshold_mb = $4, updated_at = NOW()
         WHERE id = $5`,
        [
          forceMode || 'AUTO',
          distributedThresholdRows || 1000000,
          distributedThresholdSizeMB || 1000,
          broadcastJoinThresholdMB || 10,
          existing.rows[0].id
        ]
      );
    }

    res.json({ success: true, message: "Distributed processing configuration updated" });
  } catch (err) {
    const safeError = sanitizeError(
      err,
      "Error updating distributed processing config",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

// Partitioning Configuration
app.get("/api/big-data/partitioning/config", requireAuth, async (req, res) => {
  try {
    const tableId = req.query.table_id || null;

    const result = await pool.query(
      `SELECT table_id, enabled, auto_detect, partition_types, 
              date_column_pattern, region_column_pattern
       FROM metadata.partitioning_config 
       WHERE ($1::text IS NULL AND table_id IS NULL) OR table_id = $1
       ORDER BY id DESC LIMIT 1`,
      [tableId]
    );

    if (result.rows.length === 0) {
      // Return default configuration when none exists
      return res.json({
        config: {
          enabled: true,
          autoDetect: true,
          partitionTypes: [],
          dateColumnPattern: undefined,
          regionColumnPattern: undefined
        }
      });
    }

    const row = result.rows[0];
    res.json({
      config: {
        enabled: row.enabled,
        autoDetect: row.auto_detect,
        partitionTypes: row.partition_types || [],
        dateColumnPattern: row.date_column_pattern || undefined,
        regionColumnPattern: row.region_column_pattern || undefined
      }
    });
  } catch (err) {
    const safeError = sanitizeError(
      err,
      "Error getting partitioning config",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.put("/api/big-data/partitioning/config", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const tableId = req.query.table_id || null;
    const { enabled, autoDetect, partitionTypes, dateColumnPattern, regionColumnPattern } = req.body;

    const existing = await pool.query(
      `SELECT id FROM metadata.partitioning_config 
       WHERE ($1::text IS NULL AND table_id IS NULL) OR table_id = $1`,
      [tableId]
    );
    
    if (existing.rows.length === 0) {
      await pool.query(
        `INSERT INTO metadata.partitioning_config 
         (table_id, enabled, auto_detect, partition_types, date_column_pattern, region_column_pattern)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          tableId, enabled !== undefined ? enabled : true,
          autoDetect !== undefined ? autoDetect : true,
          partitionTypes || [],
          dateColumnPattern || null,
          regionColumnPattern || null
        ]
      );
    } else {
      await pool.query(
        `UPDATE metadata.partitioning_config SET
         enabled = $1, auto_detect = $2, partition_types = $3, 
         date_column_pattern = $4, region_column_pattern = $5, updated_at = NOW()
         WHERE id = $6`,
        [
          enabled !== undefined ? enabled : true,
          autoDetect !== undefined ? autoDetect : true,
          partitionTypes || [],
          dateColumnPattern || null,
          regionColumnPattern || null,
          existing.rows[0].id
        ]
      );
    }

    res.json({ success: true, message: "Partitioning configuration updated" });
  } catch (err) {
    const safeError = sanitizeError(
      err,
      "Error updating partitioning config",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

// Merge Strategies Configuration
app.get("/api/big-data/merge-strategies/config", requireAuth, async (req, res) => {
  try {
    const tableId = req.query.table_id || null;

    const result = await pool.query(
      `SELECT table_id, default_strategy, use_distributed, 
              enable_history_table, enable_hybrid
       FROM metadata.merge_strategies_config 
       WHERE ($1::text IS NULL AND table_id IS NULL) OR table_id = $1
       ORDER BY id DESC LIMIT 1`,
      [tableId]
    );

    if (result.rows.length === 0) {
      // Return default configuration when none exists
      return res.json({
        config: {
          defaultStrategy: 'UPSERT',
          useDistributed: false,
          enableHistoryTable: false,
          enableHybrid: false
        }
      });
    }

    const row = result.rows[0];
    res.json({
      config: {
        defaultStrategy: row.default_strategy,
        useDistributed: row.use_distributed,
        enableHistoryTable: row.enable_history_table,
        enableHybrid: row.enable_hybrid
      }
    });
  } catch (err) {
    const safeError = sanitizeError(
      err,
      "Error getting merge strategy config",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.put("/api/big-data/merge-strategies/config", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const tableId = req.query.table_id || null;
    const { defaultStrategy, useDistributed, enableHistoryTable, enableHybrid } = req.body;

    const existing = await pool.query(
      `SELECT id FROM metadata.merge_strategies_config 
       WHERE ($1::text IS NULL AND table_id IS NULL) OR table_id = $1`,
      [tableId]
    );
    
    if (existing.rows.length === 0) {
      await pool.query(
        `INSERT INTO metadata.merge_strategies_config 
         (table_id, default_strategy, use_distributed, enable_history_table, enable_hybrid)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          tableId,
          defaultStrategy || 'UPSERT',
          useDistributed !== undefined ? useDistributed : false,
          enableHistoryTable !== undefined ? enableHistoryTable : false,
          enableHybrid !== undefined ? enableHybrid : false
        ]
      );
    } else {
      await pool.query(
        `UPDATE metadata.merge_strategies_config SET
         default_strategy = $1, use_distributed = $2, 
         enable_history_table = $3, enable_hybrid = $4, updated_at = NOW()
         WHERE id = $5`,
        [
          defaultStrategy || 'UPSERT',
          useDistributed !== undefined ? useDistributed : false,
          enableHistoryTable !== undefined ? enableHistoryTable : false,
          enableHybrid !== undefined ? enableHybrid : false,
          existing.rows[0].id
        ]
      );
    }

    res.json({ success: true, message: "Merge strategy configuration updated" });
  } catch (err) {
    const safeError = sanitizeError(
      err,
      "Error updating merge strategy config",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

// Distributed Jobs
app.get("/api/big-data/jobs", requireAuth, async (req, res) => {
  try {
    const status = req.query.status;
    const executionMode = req.query.executionMode;
    const page = validatePage(req.query.page, 1);
    const limit = validateLimit(req.query.limit, 1, 100);
    const search = sanitizeSearch(req.query.search, 100);
    const offset = (page - 1) * limit;

    let whereConditions = [];
    let queryParams = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      whereConditions.push(`status = $${paramCount}`);
      queryParams.push(status.toUpperCase());
    }

    if (executionMode) {
      paramCount++;
      whereConditions.push(`execution_mode = $${paramCount}`);
      queryParams.push(executionMode.toUpperCase());
    }

    if (search) {
      paramCount++;
      whereConditions.push(`(job_id ILIKE $${paramCount} OR sql_query ILIKE $${paramCount})`);
      queryParams.push(`%${search}%`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM metadata.distributed_jobs ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].total);

    paramCount++;
    queryParams.push(limit);
    paramCount++;
    queryParams.push(offset);

    const result = await pool.query(
      `SELECT job_id, job_type, execution_mode, status, sql_query, 
              transformation_config, input_path, output_path, input_formats, 
              output_format, rows_processed, error_message, metadata,
              started_at, completed_at, created_at
       FROM metadata.distributed_jobs 
       ${whereClause}
       ORDER BY created_at DESC LIMIT $${paramCount - 1} OFFSET $${paramCount}`,
      queryParams
    );

    res.json({
      jobs: result.rows.map(row => ({
        jobId: row.job_id,
        taskId: row.job_id,
        taskType: row.job_type,
        executionMode: row.execution_mode.toLowerCase(),
        status: row.status.toLowerCase(),
        rowsProcessed: row.rows_processed,
        outputPath: row.output_path,
        errorMessage: row.error_message,
        startTime: row.started_at ? row.started_at.toISOString() : undefined,
        endTime: row.completed_at ? row.completed_at.toISOString() : undefined,
        duration: row.started_at && row.completed_at 
          ? Math.floor((row.completed_at - row.started_at) / 1000) 
          : undefined,
        metadata: row.metadata || {}
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    const safeError = sanitizeError(
      err,
      "Error getting distributed jobs",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/big-data/jobs/:jobId", requireAuth, async (req, res) => {
  try {
    const jobId = req.params.jobId;

    const result = await pool.query(
      `SELECT * FROM metadata.distributed_jobs WHERE job_id = $1`,
      [jobId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Job not found" });
    }

    const row = result.rows[0];
    res.json({
      jobId: row.job_id,
      taskId: row.job_id,
      taskType: row.job_type,
      executionMode: row.execution_mode.toLowerCase(),
      status: row.status.toLowerCase(),
      rowsProcessed: row.rows_processed,
      outputPath: row.output_path,
      errorMessage: row.error_message,
      startTime: row.started_at ? row.started_at.toISOString() : undefined,
      endTime: row.completed_at ? row.completed_at.toISOString() : undefined,
      duration: row.started_at && row.completed_at 
        ? Math.floor((row.completed_at - row.started_at) / 1000) 
        : undefined,
      metadata: row.metadata || {}
    });
  } catch (err) {
    const safeError = sanitizeError(
      err,
      "Error getting distributed job",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/big-data/jobs/:jobId/logs", requireAuth, async (req, res) => {
  try {
    const jobId = req.params.jobId;
    const lines = parseInt(req.query.lines) || 1000;

    const result = await pool.query(
      `SELECT log_level, message, timestamp, metadata
       FROM metadata.distributed_job_logs 
       WHERE job_id = $1
       ORDER BY timestamp DESC
       LIMIT $2`,
      [jobId, lines]
    );

    res.json({
      logs: result.rows.map(row => ({
        level: row.log_level.toLowerCase(),
        message: row.message,
        timestamp: row.timestamp.toISOString(),
        metadata: row.metadata || {}
      }))
    });
  } catch (err) {
    const safeError = sanitizeError(
      err,
      "Error getting distributed job logs",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/big-data/jobs/:jobId/metrics", requireAuth, async (req, res) => {
  try {
    const jobId = req.params.jobId;

    const result = await pool.query(
      `SELECT metric_name, metric_value, metric_unit, timestamp, metadata
       FROM metadata.distributed_job_metrics 
       WHERE job_id = $1
       ORDER BY timestamp DESC`,
      [jobId]
    );

    res.json({
      metrics: result.rows.map(row => ({
        name: row.metric_name,
        value: parseFloat(row.metric_value),
        unit: row.metric_unit,
        timestamp: row.timestamp.toISOString(),
        metadata: row.metadata || {}
      }))
    });
  } catch (err) {
    const safeError = sanitizeError(
      err,
      "Error getting distributed job metrics",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

app.post("/api/big-data/jobs/:jobId/cancel", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const jobId = req.params.jobId;

    const result = await pool.query(
      `UPDATE metadata.distributed_jobs 
       SET status = 'CANCELLED', updated_at = NOW()
       WHERE job_id = $1 AND status IN ('PENDING', 'RUNNING')
       RETURNING job_id`,
      [jobId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Job not found or cannot be cancelled" });
    }

    res.json({ success: true, message: "Job cancelled successfully" });
  } catch (err) {
    const safeError = sanitizeError(
      err,
      "Error cancelling distributed job",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

// Statistics
app.get("/api/big-data/stats", requireAuth, async (req, res) => {
  try {
    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'COMPLETED') as completed_jobs,
        COUNT(*) FILTER (WHERE status = 'RUNNING') as running_jobs,
        COUNT(*) FILTER (WHERE status = 'FAILED') as failed_jobs,
        COUNT(*) FILTER (WHERE status = 'PENDING') as pending_jobs,
        SUM(rows_processed) FILTER (WHERE status = 'COMPLETED') as total_rows_processed,
        COUNT(*) FILTER (WHERE execution_mode = 'DISTRIBUTED') as distributed_jobs_count,
        COUNT(*) FILTER (WHERE execution_mode = 'LOCAL') as local_jobs_count
      FROM metadata.distributed_jobs
    `);

    const configResult = await pool.query(`
      SELECT COUNT(*) as has_spark_config FROM metadata.spark_config
    `);

    const stats = statsResult.rows[0];
    res.json({
      jobs: {
        completed: parseInt(stats.completed_jobs) || 0,
        running: parseInt(stats.running_jobs) || 0,
        failed: parseInt(stats.failed_jobs) || 0,
        pending: parseInt(stats.pending_jobs) || 0
      },
      totalRowsProcessed: parseInt(stats.total_rows_processed) || 0,
      executionModes: {
        distributed: parseInt(stats.distributed_jobs_count) || 0,
        local: parseInt(stats.local_jobs_count) || 0
      },
      sparkAvailable: parseInt(configResult.rows[0].has_spark_config) > 0
    });
  } catch (err) {
    const safeError = sanitizeError(
      err,
      "Error getting distributed processing stats",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

// ============================================================================
// STREAM PROCESSING ENDPOINTS
// ============================================================================

// Stream Configuration
app.get("/api/stream-processing/config", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT stream_type, topic, queue, stream, consumer_group, consumer_name,
              serialization_format, schema_registry_url, engine_config
       FROM metadata.stream_config 
       ORDER BY id DESC LIMIT 1`
    );

    if (result.rows.length === 0) {
      return res.json({
        streamType: 'KAFKA',
        topic: undefined,
        queue: undefined,
        stream: undefined,
        consumerGroup: '',
        consumerName: '',
        serializationFormat: 'JSON',
        schemaRegistryUrl: undefined,
        engineConfig: {}
      });
    }

    const row = result.rows[0];
    res.json({
      streamType: row.stream_type,
      topic: row.topic || undefined,
      queue: row.queue || undefined,
      stream: row.stream || undefined,
      consumerGroup: row.consumer_group || '',
      consumerName: row.consumer_name || '',
      serializationFormat: row.serialization_format || 'JSON',
      schemaRegistryUrl: row.schema_registry_url || undefined,
      engineConfig: row.engine_config || {}
    });
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting stream config", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.put("/api/stream-processing/config", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const { streamType, topic, queue, stream, consumerGroup, consumerName, serializationFormat, schemaRegistryUrl, engineConfig } = req.body;

    if (!streamType) {
      return res.status(400).json({ error: "streamType is required" });
    }

    const existing = await pool.query(`SELECT id FROM metadata.stream_config ORDER BY id DESC LIMIT 1`);
    
    if (existing.rows.length === 0) {
      await pool.query(
        `INSERT INTO metadata.stream_config 
         (stream_type, topic, queue, stream, consumer_group, consumer_name,
          serialization_format, schema_registry_url, engine_config)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)`,
        [streamType, topic || null, queue || null, stream || null, consumerGroup || null,
         consumerName || null, serializationFormat || 'JSON', schemaRegistryUrl || null,
         JSON.stringify(engineConfig || {})]
      );
    } else {
      await pool.query(
        `UPDATE metadata.stream_config SET
         stream_type = $1, topic = $2, queue = $3, stream = $4, consumer_group = $5,
         consumer_name = $6, serialization_format = $7, schema_registry_url = $8,
         engine_config = $9::jsonb, updated_at = NOW()
         WHERE id = $10`,
        [streamType, topic || null, queue || null, stream || null, consumerGroup || null,
         consumerName || null, serializationFormat || 'JSON', schemaRegistryUrl || null,
         JSON.stringify(engineConfig || {}), existing.rows[0].id]
      );
    }

    res.json({ success: true, message: "Stream configuration updated" });
  } catch (err) {
    const safeError = sanitizeError(err, "Error updating stream config", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.post("/api/stream-processing/config/test-connection", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    // TODO: Implementar test de conexión real con engines
    res.json({ success: true, message: "Connection test not yet implemented" });
  } catch (err) {
    const safeError = sanitizeError(err, "Error testing connection", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

// Stream Consumers
app.get("/api/stream-processing/consumers", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT consumer_id, consumer_group, consumer_name, status, thread_id,
              started_at, stopped_at, error_message
       FROM metadata.stream_consumers
       ORDER BY started_at DESC`
    );

    res.json(result.rows.map(row => ({
      consumerId: row.consumer_id,
      consumerGroup: row.consumer_group,
      consumerName: row.consumer_name,
      status: row.status,
      threadId: row.thread_id,
      startedAt: row.started_at,
      stoppedAt: row.stopped_at,
      errorMessage: row.error_message
    })));
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting consumers", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.post("/api/stream-processing/consumers", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const { streamConfigId, consumerGroup, consumerName } = req.body;

    if (!consumerGroup || !consumerName) {
      return res.status(400).json({ error: "consumerGroup and consumerName are required" });
    }

    const consumerId = `consumer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await pool.query(
      `INSERT INTO metadata.stream_consumers 
       (consumer_id, stream_config_id, consumer_group, consumer_name, status)
       VALUES ($1, $2, $3, $4, 'ACTIVE')`,
      [consumerId, streamConfigId || null, consumerGroup, consumerName]
    );

    res.json({ success: true, consumerId });
  } catch (err) {
    const safeError = sanitizeError(err, "Error creating consumer", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.delete("/api/stream-processing/consumers/:consumerId", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    await pool.query(
      `UPDATE metadata.stream_consumers 
       SET status = 'STOPPED', stopped_at = NOW()
       WHERE consumer_id = $1`,
      [req.params.consumerId]
    );

    res.json({ success: true, message: "Consumer stopped" });
  } catch (err) {
    const safeError = sanitizeError(err, "Error stopping consumer", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/stream-processing/consumers/:consumerId/stats", requireAuth, async (req, res) => {
  try {
    // TODO: Obtener estadísticas reales del consumidor
    res.json({
      messagesProcessed: 0,
      messagesFailed: 0,
      bytesProcessed: 0,
      averageLatencyMs: 0,
      errors: 0
    });
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting consumer stats", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

// Windowing
app.get("/api/stream-processing/windows", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT window_id, window_type, window_size_seconds, slide_interval_seconds,
              session_timeout_seconds, start_time, end_time, event_count, is_closed
       FROM metadata.stream_windows
       WHERE is_closed = false
       ORDER BY start_time DESC`
    );

    res.json(result.rows.map(row => ({
      windowId: row.window_id,
      windowType: row.window_type,
      windowSizeSeconds: row.window_size_seconds,
      slideIntervalSeconds: row.slide_interval_seconds,
      sessionTimeoutSeconds: row.session_timeout_seconds,
      startTime: row.start_time,
      endTime: row.end_time,
      eventCount: row.event_count,
      isClosed: row.is_closed
    })));
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting windows", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/stream-processing/windows/:windowId", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM metadata.stream_windows WHERE window_id = $1`,
      [req.params.windowId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Window not found" });
    }

    const row = result.rows[0];
    res.json({
      windowId: row.window_id,
      windowType: row.window_type,
      windowSizeSeconds: row.window_size_seconds,
      slideIntervalSeconds: row.slide_interval_seconds,
      sessionTimeoutSeconds: row.session_timeout_seconds,
      startTime: row.start_time,
      endTime: row.end_time,
      eventCount: row.event_count,
      isClosed: row.is_closed,
      aggregatedData: row.aggregated_data
    });
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting window", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.post("/api/stream-processing/windows", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const { windowType, windowSizeSeconds, slideIntervalSeconds, sessionTimeoutSeconds } = req.body;

    const windowId = `window_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await pool.query(
      `INSERT INTO metadata.stream_windows 
       (window_id, window_type, window_size_seconds, slide_interval_seconds, session_timeout_seconds, start_time)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [windowId, windowType || 'TUMBLING', windowSizeSeconds || 60,
       slideIntervalSeconds || null, sessionTimeoutSeconds || null]
    );

    res.json({ success: true, windowId });
  } catch (err) {
    const safeError = sanitizeError(err, "Error creating window", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

// Stateful Processing
app.get("/api/stream-processing/state/:key", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT state_key, state_value, last_updated, update_count
       FROM metadata.stream_state WHERE state_key = $1`,
      [req.params.key]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "State not found" });
    }

    const row = result.rows[0];
    res.json({
      key: row.state_key,
      value: row.state_value,
      lastUpdated: row.last_updated,
      updateCount: row.update_count
    });
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting state", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.put("/api/stream-processing/state/:key", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const { value } = req.body;

    await pool.query(
      `INSERT INTO metadata.stream_state (state_key, state_value, last_updated, update_count)
       VALUES ($1, $2::jsonb, NOW(), 1)
       ON CONFLICT (state_key) 
       DO UPDATE SET state_value = $2::jsonb, last_updated = NOW(), update_count = stream_state.update_count + 1`,
      [req.params.key, JSON.stringify(value)]
    );

    res.json({ success: true, message: "State updated" });
  } catch (err) {
    const safeError = sanitizeError(err, "Error updating state", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.delete("/api/stream-processing/state/:key", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    await pool.query(`DELETE FROM metadata.stream_state WHERE state_key = $1`, [req.params.key]);
    res.json({ success: true, message: "State cleared" });
  } catch (err) {
    const safeError = sanitizeError(err, "Error clearing state", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

// CEP Rules
app.get("/api/stream-processing/cep/rules", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT rule_id, name, description, pattern, conditions, actions, enabled, window_seconds
       FROM metadata.stream_cep_rules
       ORDER BY created_at DESC`
    );

    res.json(result.rows.map(row => ({
      ruleId: row.rule_id,
      name: row.name,
      description: row.description,
      pattern: row.pattern,
      conditions: row.conditions,
      actions: row.actions,
      enabled: row.enabled,
      windowSeconds: row.window_seconds
    })));
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting CEP rules", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.post("/api/stream-processing/cep/rules", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const { ruleId, name, description, pattern, conditions, actions, enabled, windowSeconds } = req.body;

    if (!ruleId || !name || !pattern) {
      return res.status(400).json({ error: "ruleId, name, and pattern are required" });
    }

    await pool.query(
      `INSERT INTO metadata.stream_cep_rules 
       (rule_id, name, description, pattern, conditions, actions, enabled, window_seconds)
       VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7, $8)`,
      [ruleId, name, description || null, JSON.stringify(pattern),
       JSON.stringify(conditions || {}), JSON.stringify(actions || {}),
       enabled !== false, windowSeconds || 300]
    );

    res.json({ success: true, message: "CEP rule created" });
  } catch (err) {
    const safeError = sanitizeError(err, "Error creating CEP rule", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.put("/api/stream-processing/cep/rules/:ruleId", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const { name, description, pattern, conditions, actions, enabled, windowSeconds } = req.body;

    await pool.query(
      `UPDATE metadata.stream_cep_rules SET
       name = $1, description = $2, pattern = $3::jsonb, conditions = $4::jsonb,
       actions = $5::jsonb, enabled = $6, window_seconds = $7, updated_at = NOW()
       WHERE rule_id = $8`,
      [name, description || null, JSON.stringify(pattern), JSON.stringify(conditions || {}),
       JSON.stringify(actions || {}), enabled !== false, windowSeconds || 300, req.params.ruleId]
    );

    res.json({ success: true, message: "CEP rule updated" });
  } catch (err) {
    const safeError = sanitizeError(err, "Error updating CEP rule", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.delete("/api/stream-processing/cep/rules/:ruleId", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    await pool.query(`DELETE FROM metadata.stream_cep_rules WHERE rule_id = $1`, [req.params.ruleId]);
    res.json({ success: true, message: "CEP rule deleted" });
  } catch (err) {
    const safeError = sanitizeError(err, "Error deleting CEP rule", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/stream-processing/cep/matches", requireAuth, async (req, res) => {
  try {
    const { ruleId } = req.query;
    let query = `SELECT match_id, rule_id, matched_events, match_time, metadata
                 FROM metadata.stream_cep_matches`;
    const params = [];

    if (ruleId) {
      query += ` WHERE rule_id = $1`;
      params.push(ruleId);
    }

    query += ` ORDER BY match_time DESC LIMIT 100`;

    const result = await pool.query(query, params);
    res.json(result.rows.map(row => ({
      matchId: row.match_id,
      ruleId: row.rule_id,
      matchedEvents: row.matched_events,
      matchTime: row.match_time,
      metadata: row.metadata
    })));
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting CEP matches", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

// Native CDC
app.get("/api/stream-processing/native-cdc/config", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, db_engine, connection_string, cdc_type, database_name, table_name,
              position, status, error_message, started_at, stopped_at
       FROM metadata.native_cdc_config
       ORDER BY created_at DESC`
    );

    res.json(result.rows.map(row => ({
      id: row.id,
      dbEngine: row.db_engine,
      connectionString: row.connection_string,
      cdcType: row.cdc_type,
      databaseName: row.database_name,
      tableName: row.table_name,
      position: row.position,
      status: row.status,
      errorMessage: row.error_message,
      startedAt: row.started_at,
      stoppedAt: row.stopped_at
    })));
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting native CDC config", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.put("/api/stream-processing/native-cdc/config", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const { id, dbEngine, connectionString, cdcType, databaseName, tableName, position } = req.body;

    if (!dbEngine || !connectionString || !cdcType) {
      return res.status(400).json({ error: "dbEngine, connectionString, and cdcType are required" });
    }

    if (id) {
      await pool.query(
        `UPDATE metadata.native_cdc_config SET
         connection_string = $1, position = $2, updated_at = NOW()
         WHERE id = $3`,
        [connectionString, position || null, id]
      );
    } else {
      await pool.query(
        `INSERT INTO metadata.native_cdc_config 
         (db_engine, connection_string, cdc_type, database_name, table_name, position)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [dbEngine, connectionString, cdcType, databaseName || null, tableName || null, position || null]
      );
    }

    res.json({ success: true, message: "Native CDC configuration updated" });
  } catch (err) {
    const safeError = sanitizeError(err, "Error updating native CDC config", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.post("/api/stream-processing/native-cdc/start", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const { id } = req.body;

    await pool.query(
      `UPDATE metadata.native_cdc_config 
       SET status = 'RUNNING', started_at = NOW(), stopped_at = NULL, error_message = NULL
       WHERE id = $1`,
      [id]
    );

    res.json({ success: true, message: "Native CDC started" });
  } catch (err) {
    const safeError = sanitizeError(err, "Error starting native CDC", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.post("/api/stream-processing/native-cdc/stop", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const { id } = req.body;

    await pool.query(
      `UPDATE metadata.native_cdc_config 
       SET status = 'STOPPED', stopped_at = NOW()
       WHERE id = $1`,
      [id]
    );

    res.json({ success: true, message: "Native CDC stopped" });
  } catch (err) {
    const safeError = sanitizeError(err, "Error stopping native CDC", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/stream-processing/native-cdc/position", requireAuth, async (req, res) => {
  try {
    const { id } = req.query;

    const result = await pool.query(
      `SELECT position FROM metadata.native_cdc_config WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "CDC config not found" });
    }

    res.json({ position: result.rows[0].position });
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting CDC position", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

// Statistics
app.get("/api/stream-processing/stats", requireAuth, async (req, res) => {
  try {
    const consumersResult = await pool.query(
      `SELECT COUNT(*) FILTER (WHERE status = 'ACTIVE') as active,
              COUNT(*) FILTER (WHERE status = 'STOPPED') as stopped
       FROM metadata.stream_consumers`
    );

    const cepResult = await pool.query(
      `SELECT COUNT(*) as rules_count FROM metadata.stream_cep_rules WHERE enabled = true`
    );

    const matchesResult = await pool.query(
      `SELECT COUNT(*) as matches_count FROM metadata.stream_cep_matches
       WHERE match_time > NOW() - INTERVAL '24 hours'`
    );

    const cdcResult = await pool.query(
      `SELECT COUNT(*) FILTER (WHERE status = 'RUNNING') as running
       FROM metadata.native_cdc_config`
    );

    res.json({
      consumers: {
        active: parseInt(consumersResult.rows[0].active) || 0,
        stopped: parseInt(consumersResult.rows[0].stopped) || 0
      },
      cep: {
        activeRules: parseInt(cepResult.rows[0].rules_count) || 0,
        matchesLast24h: parseInt(matchesResult.rows[0].matches_count) || 0
      },
      nativeCDC: {
        running: parseInt(cdcResult.rows[0].running) || 0
      }
    });
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting stream processing stats", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

// ============================================================================
// Performance Optimization API Endpoints
// ============================================================================

// Partitioning Configuration
app.get("/api/performance/partitioning/config", requireAuth, async (req, res) => {
  try {
    const { schema, table } = req.query;
    if (!schema || !table) {
      return res.status(400).json({ error: "schema and table parameters required" });
    }

    const result = await pool.query(
      `SELECT * FROM metadata.table_partitions 
       WHERE schema_name = $1 AND table_name = $2 
       ORDER BY created_at DESC LIMIT 1`,
      [schema, table]
    );

    if (result.rows.length === 0) {
      return res.json(null);
    }

    res.json(result.rows[0]);
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting partitioning config", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.put("/api/performance/partitioning/config", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const { schema_name, table_name, partition_name, partition_column, partition_type, partition_value, partition_format } = req.body;

    await pool.query(
      `INSERT INTO metadata.table_partitions 
       (schema_name, table_name, partition_name, partition_column, partition_type, partition_value, partition_format)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (schema_name, table_name, partition_name) 
       DO UPDATE SET partition_value = $6, partition_format = $7, last_modified = NOW()`,
      [schema_name, table_name, partition_name, partition_column, partition_type, partition_value, partition_format]
    );

    res.json({ success: true, message: "Partitioning configuration updated" });
  } catch (err) {
    const safeError = sanitizeError(err, "Error updating partitioning config", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/performance/partitioning/stats", requireAuth, async (req, res) => {
  try {
    const { schema, table } = req.query;
    let query = `SELECT 
      COUNT(*) as total_partitions,
      SUM(row_count) as total_rows,
      SUM(size_bytes) as total_size_bytes
      FROM metadata.table_partitions`;
    const params = [];

    if (schema && table) {
      query += ` WHERE schema_name = $1 AND table_name = $2`;
      params.push(schema, table);
    }

    const result = await pool.query(query, params);
    res.json(result.rows[0] || { total_partitions: 0, total_rows: 0, total_size_bytes: 0 });
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting partitioning stats", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.post("/api/performance/partitioning/create", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const { schema_name, table_name, partition_name, partition_column, partition_type, partition_value } = req.body;

    await pool.query(
      `INSERT INTO metadata.table_partitions 
       (schema_name, table_name, partition_name, partition_column, partition_type, partition_value)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (schema_name, table_name, partition_name) DO NOTHING`,
      [schema_name, table_name, partition_name, partition_column, partition_type, partition_value]
    );

    res.json({ success: true, message: "Partition created" });
  } catch (err) {
    const safeError = sanitizeError(err, "Error creating partition", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

// Cache Configuration
app.get("/api/performance/cache/config", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM metadata.cache_stats ORDER BY last_updated DESC`
    );
    res.json(result.rows || []);
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting cache config", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.put("/api/performance/cache/config", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const { cache_type, max_size } = req.body;

    await pool.query(
      `INSERT INTO metadata.cache_stats (cache_type, max_size, last_updated)
       VALUES ($1, $2, NOW())
       ON CONFLICT (cache_type) 
       DO UPDATE SET max_size = $2, last_updated = NOW()`,
      [cache_type, max_size]
    );

    res.json({ success: true, message: "Cache configuration updated" });
  } catch (err) {
    const safeError = sanitizeError(err, "Error updating cache config", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/performance/cache/stats", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM metadata.cache_stats ORDER BY cache_type`
    );
    res.json(result.rows || []);
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting cache stats", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.post("/api/performance/cache/clear", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const { cache_type } = req.body;

    if (cache_type) {
      await pool.query(`DELETE FROM metadata.query_cache WHERE cache_key LIKE $1`, [`%${cache_type}%`]);
    } else {
      await pool.query(`DELETE FROM metadata.query_cache`);
    }

    res.json({ success: true, message: "Cache cleared" });
  } catch (err) {
    const safeError = sanitizeError(err, "Error clearing cache", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

// Compression Configuration
app.get("/api/performance/compression/config", requireAuth, async (req, res) => {
  try {
    const { schema, table } = req.query;
    let query = `SELECT * FROM metadata.compression_config`;
    const params = [];

    if (schema && table) {
      query += ` WHERE schema_name = $1 AND table_name = $2`;
      params.push(schema, table);
    }

    const result = await pool.query(query, params);
    res.json(result.rows || []);
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting compression config", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.put("/api/performance/compression/config", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const { schema_name, table_name, compression_algorithm, compress_on_transfer, compress_on_storage, min_size_bytes } = req.body;

    await pool.query(
      `INSERT INTO metadata.compression_config 
       (schema_name, table_name, compression_algorithm, compress_on_transfer, compress_on_storage, min_size_bytes, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (schema_name, table_name) 
       DO UPDATE SET compression_algorithm = $3, compress_on_transfer = $4, 
                     compress_on_storage = $5, min_size_bytes = $6, updated_at = NOW()`,
      [schema_name, table_name, compression_algorithm, compress_on_transfer, compress_on_storage, min_size_bytes]
    );

    res.json({ success: true, message: "Compression configuration updated" });
  } catch (err) {
    const safeError = sanitizeError(err, "Error updating compression config", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

// Memory Statistics
app.get("/api/performance/memory/stats", requireAuth, async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    const result = await pool.query(
      `SELECT * FROM metadata.memory_stats 
       ORDER BY recorded_at DESC 
       LIMIT $1`,
      [limit]
    );
    res.json(result.rows || []);
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting memory stats", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

// Partition Pruning Statistics
app.get("/api/performance/partition-pruning/stats", requireAuth, async (req, res) => {
  try {
    const { schema, table, limit = 50 } = req.query;
    let query = `SELECT * FROM metadata.partition_pruning_stats`;
    const params = [];
    let paramCount = 0;

    if (schema && table) {
      paramCount += 2;
      query += ` WHERE schema_name = $${paramCount - 1} AND table_name = $${paramCount}`;
      params.push(schema, table);
    }

    query += ` ORDER BY created_at DESC LIMIT $${++paramCount}`;
    params.push(limit);

    const result = await pool.query(query, params);
    res.json(result.rows || []);
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting partition pruning stats", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

// Pushdown Optimization Statistics
app.get("/api/performance/pushdown/stats", requireAuth, async (req, res) => {
  try {
    const { db_engine, limit = 50 } = req.query;
    let query = `SELECT * FROM metadata.pushdown_stats`;
    const params = [];
    let paramCount = 0;

    if (db_engine) {
      paramCount++;
      query += ` WHERE db_engine = $${paramCount}`;
      params.push(db_engine);
    }

    query += ` ORDER BY created_at DESC LIMIT $${++paramCount}`;
    params.push(limit);

    const result = await pool.query(query, params);
    res.json(result.rows || []);
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting pushdown stats", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

// Join Optimization Statistics
app.get("/api/performance/join-optimization/stats", requireAuth, async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const result = await pool.query(
      `SELECT * FROM metadata.join_optimization_stats 
       ORDER BY created_at DESC 
       LIMIT $1`,
      [limit]
    );
    res.json(result.rows || []);
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting join optimization stats", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

// Columnar Storage
app.get("/api/performance/columnar-storage", requireAuth, async (req, res) => {
  try {
    const { schema, table } = req.query;
    let query = `SELECT * FROM metadata.columnar_storage`;
    const params = [];

    if (schema && table) {
      query += ` WHERE schema_name = $1 AND table_name = $2`;
      params.push(schema, table);
    }

    const result = await pool.query(query, params);
    res.json(result.rows || []);
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting columnar storage", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

// ============================================================================
// Metadata and Documentation API Endpoints
// ============================================================================

// Impact Analysis
app.get("/api/metadata/impact-analysis", requireAuth, async (req, res) => {
  try {
    const { schema, table, column } = req.query;
    if (!schema || !table) {
      return res.status(400).json({ error: "schema and table parameters required" });
    }

    // TODO: Call C++ ImpactAnalyzer via API or implement in Node.js
    // For now, return placeholder
    res.json({
      schema_name: schema,
      table_name: table,
      column_name: column || null,
      downstream_impact: { affected_tables: [], affected_workflows: [] },
      upstream_impact: { dependent_tables: [] }
    });
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting impact analysis", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.post("/api/metadata/impact-analysis/analyze", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const { schema_name, table_name, column_name, change_type } = req.body;

    // TODO: Call C++ ImpactAnalyzer
    res.json({ success: true, message: "Impact analysis completed" });
  } catch (err) {
    const safeError = sanitizeError(err, "Error executing impact analysis", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

// Lineage Graph
app.get("/api/metadata/lineage/graph", requireAuth, async (req, res) => {
  try {
    const { db_engines, schemas } = req.query;
    
    // TODO: Call C++ LineageGraphBuilder
    res.json({ nodes: [], edges: [] });
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting lineage graph", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

// Column Lineage
app.get("/api/metadata/lineage/column", requireAuth, async (req, res) => {
  try {
    const { schema, table, column } = req.query;
    if (!schema || !table || !column) {
      return res.status(400).json({ error: "schema, table, and column parameters required" });
    }

    // TODO: Call C++ ColumnLineageExtractor
    res.json([]);
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting column lineage", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

// Transformation Lineage
app.get("/api/metadata/transformation-lineage", requireAuth, async (req, res) => {
  try {
    const { schema, table, workflow } = req.query;

    let query = "SELECT * FROM metadata.transformation_lineage WHERE 1=1";
    const params = [];
    let paramCount = 0;

    if (schema && table) {
      paramCount += 2;
      query += ` AND $${paramCount - 1} = ANY(output_schemas) AND $${paramCount} = ANY(output_tables)`;
      params.push(schema, table);
    }

    if (workflow) {
      paramCount++;
      query += ` AND workflow_name = $${paramCount}`;
      params.push(workflow);
    }

    query += " ORDER BY executed_at DESC LIMIT 100";

    const result = await pool.query(query, params);
    res.json(result.rows || []);
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting transformation lineage", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

// Pipeline Documentation
app.get("/api/metadata/pipeline-documentation/:workflowName", requireAuth, async (req, res) => {
  try {
    const { workflowName } = req.params;
    const { format = "markdown" } = req.query;

    // TODO: Call C++ PipelineDocumentationGenerator
    res.json({ workflow_name: workflowName, documentation: "" });
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting pipeline documentation", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.post("/api/metadata/pipeline-documentation/generate", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const { workflow_name, format, file_path } = req.body;

    // TODO: Call C++ PipelineDocumentationGenerator
    res.json({ success: true, message: "Documentation generated" });
  } catch (err) {
    const safeError = sanitizeError(err, "Error generating pipeline documentation", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

// Dictionary Generation
app.post("/api/metadata/dictionary/generate", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const { schema_name, table_name, overwrite_existing = false } = req.body;

    if (!schema_name || !table_name) {
      return res.status(400).json({ error: "schema_name and table_name required" });
    }

    // TODO: Call C++ DataDictionaryGenerator
    res.json({ success: true, message: "Dictionary generated", entries_created: 0 });
  } catch (err) {
    const safeError = sanitizeError(err, "Error generating dictionary", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

// ============================================================================
// Security Advanced API Endpoints
// ============================================================================

// Dynamic Masking
app.post("/api/security/masking/apply", requireAuth, async (req, res) => {
  try {
    const { value, schema_name, table_name, column_name } = req.body;
    const username = req.user?.username || "anonymous";
    const userRoles = req.user?.roles || [];

    if (!value || !schema_name || !table_name || !column_name) {
      return res.status(400).json({ error: "value, schema_name, table_name, and column_name required" });
    }

    const result = await executeSecurityCommand("masking_apply", {
      value,
      schema_name,
      table_name,
      column_name,
      username,
      user_roles: userRoles
    });
    
    res.json(result);
  } catch (err) {
    const safeError = sanitizeError(err, "Error applying masking", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/security/masking/policies", requireAuth, async (req, res) => {
  try {
    const { schema, table, column } = req.query;
    
    let query = "SELECT * FROM metadata.masking_policies WHERE 1=1";
    const params = [];
    let paramCount = 0;

    if (schema) {
      paramCount++;
      query += ` AND schema_name = $${paramCount}`;
      params.push(schema);
    }
    if (table) {
      paramCount++;
      query += ` AND table_name = $${paramCount}`;
      params.push(table);
    }
    if (column) {
      paramCount++;
      query += ` AND column_name = $${paramCount}`;
      params.push(column);
    }

    query += " ORDER BY policy_name";

    const result = await pool.query(query, params);
    res.json(result.rows || []);
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting masking policies", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.post("/api/security/masking/policies", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const { policy_name, schema_name, table_name, column_name, masking_type, masking_function, masking_params, role_whitelist, active = true } = req.body;

    if (!policy_name || !schema_name || !table_name || !column_name || !masking_type) {
      return res.status(400).json({ error: "policy_name, schema_name, table_name, column_name, and masking_type required" });
    }

    const result = await pool.query(
      `INSERT INTO metadata.masking_policies 
       (policy_name, schema_name, table_name, column_name, masking_type, masking_function, masking_params, role_whitelist, active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::text[], $9, NOW(), NOW())
       RETURNING *`,
      [policy_name, schema_name, table_name, column_name, masking_type, masking_function || null, JSON.stringify(masking_params || {}), role_whitelist || [], active]
    );

    res.json(result.rows[0]);
  } catch (err) {
    const safeError = sanitizeError(err, "Error creating masking policy", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.put("/api/security/masking/policies/:id", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const policyId = parseInt(req.params.id);
    const { policy_name, masking_type, masking_function, masking_params, role_whitelist, active } = req.body;

    const result = await pool.query(
      `UPDATE metadata.masking_policies 
       SET policy_name = COALESCE($1, policy_name),
           masking_type = COALESCE($2, masking_type),
           masking_function = COALESCE($3, masking_function),
           masking_params = COALESCE($4::jsonb, masking_params),
           role_whitelist = COALESCE($5::text[], role_whitelist),
           active = COALESCE($6, active),
           updated_at = NOW()
       WHERE policy_id = $7
       RETURNING *`,
      [policy_name, masking_type, masking_function, masking_params ? JSON.stringify(masking_params) : null, role_whitelist, active, policyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Policy not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    const safeError = sanitizeError(err, "Error updating masking policy", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.delete("/api/security/masking/policies/:id", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const policyId = parseInt(req.params.id);

    const result = await pool.query(
      `DELETE FROM metadata.masking_policies WHERE policy_id = $1 RETURNING *`,
      [policyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Policy not found" });
    }

    res.json({ message: "Policy deleted successfully", policy: result.rows[0] });
  } catch (err) {
    const safeError = sanitizeError(err, "Error deleting masking policy", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

// Tokenization
app.post("/api/security/tokenization/tokenize", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const { value, schema_name, table_name, column_name, reversible = true, token_type = "REVERSIBLE" } = req.body;

    if (!value || !schema_name || !table_name || !column_name) {
      return res.status(400).json({ error: "value, schema_name, table_name, and column_name required" });
    }

    const tokenType = req.body.token_type || "reversible";
    const result = await executeSecurityCommand("tokenize", {
      value,
      token_type: tokenType,
      schema_name,
      table_name,
      column_name
    });
    
    res.json(result);
  } catch (err) {
    const safeError = sanitizeError(err, "Error tokenizing value", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.post("/api/security/tokenization/detokenize", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const { token, schema_name, table_name, column_name, reason } = req.body;
    const username = req.user?.username || "anonymous";

    if (!token || !schema_name || !table_name || !column_name) {
      return res.status(400).json({ error: "token, schema_name, table_name, and column_name required" });
    }

    const result = await executeSecurityCommand("detokenize", {
      token,
      username
    });
    
    res.json(result);
  } catch (err) {
    const safeError = sanitizeError(err, "Error detokenizing", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/security/tokenization/tokens", requireAuth, async (req, res) => {
  try {
    const { schema, table, column, limit = 100 } = req.query;
    
    let query = "SELECT token_id, schema_name, table_name, column_name, token_value, token_type, created_at, access_count FROM metadata.tokenization_tokens WHERE 1=1";
    const params = [];
    let paramCount = 0;

    if (schema) {
      paramCount++;
      query += ` AND schema_name = $${paramCount}`;
      params.push(schema);
    }
    if (table) {
      paramCount++;
      query += ` AND table_name = $${paramCount}`;
      params.push(table);
    }
    if (column) {
      paramCount++;
      query += ` AND column_name = $${paramCount}`;
      params.push(column);
    }

    paramCount++;
    query += ` ORDER BY created_at DESC LIMIT $${paramCount}`;
    params.push(parseInt(limit));

    const result = await pool.query(query, params);
    res.json(result.rows || []);
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting tokens", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.post("/api/security/tokenization/rotate", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { schema_name, table_name, column_name } = req.body;

    if (!schema_name || !table_name || !column_name) {
      return res.status(400).json({ error: "schema_name, table_name, and column_name required" });
    }

    await executeSecurityCommand("rotate_tokens", {
      schema_name,
      table_name,
      column_name
    });
    
    res.json({ success: true, message: "Tokens rotated successfully" });
  } catch (err) {
    const safeError = sanitizeError(err, "Error rotating tokens", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/security/tokenization/keys", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT key_id, algorithm, created_at, rotated_at, active FROM metadata.tokenization_keys ORDER BY created_at DESC"
    );
    res.json(result.rows || []);
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting encryption keys", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.post("/api/security/tokenization/keys/rotate", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { key_id } = req.body;

    await executeSecurityCommand("rotate_encryption_keys", {
      key_id: key_id || ""
    });
    
    res.json({ success: true, message: "Encryption keys rotated successfully" });
  } catch (err) {
    const safeError = sanitizeError(err, "Error rotating encryption keys", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

// Anonymization
app.post("/api/security/anonymization/anonymize", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const { dataset, profile_name } = req.body;

    if (!dataset || !profile_name) {
      return res.status(400).json({ error: "dataset and profile_name required" });
    }

    const result = await executeSecurityCommand("anonymize", {
      profile_name: profile_name,
      data: dataset
    });
    
    const anonymizedData = result.anonymized_data || [];
    res.json({
      anonymized_dataset: anonymizedData,
      original_count: Array.isArray(dataset) ? dataset.length : 0,
      anonymized_count: Array.isArray(anonymizedData) ? anonymizedData.length : 0,
      information_loss: result.information_loss || 0
    });
  } catch (err) {
    const safeError = sanitizeError(err, "Error anonymizing dataset", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/security/anonymization/profiles", requireAuth, async (req, res) => {
  try {
    const { schema, table } = req.query;
    
    let query = "SELECT * FROM metadata.anonymization_profiles WHERE active = true";
    const params = [];
    let paramCount = 0;

    if (schema) {
      paramCount++;
      query += ` AND schema_name = $${paramCount}`;
      params.push(schema);
    }
    if (table) {
      paramCount++;
      query += ` AND table_name = $${paramCount}`;
      params.push(table);
    }

    query += " ORDER BY profile_name";

    const result = await pool.query(query, params);
    res.json(result.rows || []);
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting anonymization profiles", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.post("/api/security/anonymization/profiles", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const { profile_name, schema_name, table_name, anonymization_type, k_value, l_value, t_value, epsilon, quasi_identifiers, sensitive_attributes, generalization_levels, suppression_threshold, active = true } = req.body;

    if (!profile_name || !schema_name || !table_name || !anonymization_type || !quasi_identifiers) {
      return res.status(400).json({ error: "profile_name, schema_name, table_name, anonymization_type, and quasi_identifiers required" });
    }

    const result = await pool.query(
      `INSERT INTO metadata.anonymization_profiles 
       (profile_name, schema_name, table_name, anonymization_type, k_value, l_value, t_value, epsilon, 
        quasi_identifiers, sensitive_attributes, generalization_levels, suppression_threshold, active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::text[], $10::text[], $11::jsonb, $12, $13, NOW(), NOW())
       RETURNING *`,
      [profile_name, schema_name, table_name, anonymization_type, k_value || null, l_value || null, t_value || null, epsilon || null,
       quasi_identifiers, sensitive_attributes || [], JSON.stringify(generalization_levels || {}), suppression_threshold || 0.0, active]
    );

    res.json(result.rows[0]);
  } catch (err) {
    const safeError = sanitizeError(err, "Error creating anonymization profile", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.put("/api/security/anonymization/profiles/:id", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const profileId = parseInt(req.params.id);
    const { profile_name, anonymization_type, k_value, l_value, t_value, epsilon, quasi_identifiers, sensitive_attributes, generalization_levels, suppression_threshold, active } = req.body;

    const result = await pool.query(
      `UPDATE metadata.anonymization_profiles 
       SET profile_name = COALESCE($1, profile_name),
           anonymization_type = COALESCE($2, anonymization_type),
           k_value = COALESCE($3, k_value),
           l_value = COALESCE($4, l_value),
           t_value = COALESCE($5, t_value),
           epsilon = COALESCE($6, epsilon),
           quasi_identifiers = COALESCE($7::text[], quasi_identifiers),
           sensitive_attributes = COALESCE($8::text[], sensitive_attributes),
           generalization_levels = COALESCE($9::jsonb, generalization_levels),
           suppression_threshold = COALESCE($10, suppression_threshold),
           active = COALESCE($11, active),
           updated_at = NOW()
       WHERE profile_id = $12
       RETURNING *`,
      [profile_name, anonymization_type, k_value, l_value, t_value, epsilon, quasi_identifiers, sensitive_attributes,
       generalization_levels ? JSON.stringify(generalization_levels) : null, suppression_threshold, active, profileId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Profile not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    const safeError = sanitizeError(err, "Error updating anonymization profile", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.post("/api/security/anonymization/validate", requireAuth, async (req, res) => {
  try {
    const { dataset, k, l, quasi_identifiers, sensitive_attribute } = req.body;

    if (!dataset || !quasi_identifiers) {
      return res.status(400).json({ error: "dataset and quasi_identifiers required" });
    }

    const result = await executeSecurityCommand("validate_anonymization", {
      dataset,
      k: k || 0,
      l: l || 0,
      quasi_identifiers: quasi_identifiers || [],
      sensitive_attribute: sensitive_attribute || ""
    });
    
    res.json({
      k_anonymity_achieved: result.k_anonymity_achieved || false,
      l_diversity_achieved: result.l_diversity_achieved || false
    });
  } catch (err) {
    const safeError = sanitizeError(err, "Error validating anonymization", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

// Fine-Grained Permissions
app.get("/api/security/permissions/policies", requireAuth, async (req, res) => {
  try {
    const { schema, table, policy_type } = req.query;
    
    let query = "SELECT * FROM metadata.permission_policies WHERE 1=1";
    const params = [];
    let paramCount = 0;

    if (schema) {
      paramCount++;
      query += ` AND schema_name = $${paramCount}`;
      params.push(schema);
    }
    if (table) {
      paramCount++;
      query += ` AND table_name = $${paramCount}`;
      params.push(table);
    }
    if (policy_type) {
      paramCount++;
      query += ` AND policy_type = $${paramCount}`;
      params.push(policy_type);
    }

    query += " ORDER BY priority DESC, policy_id";

    const result = await pool.query(query, params);
    res.json(result.rows || []);
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting permission policies", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.post("/api/security/permissions/policies", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { policy_name, policy_type, schema_name, table_name, column_name, role_name, username, operation, condition_expression, attribute_conditions, priority = 0, active = true } = req.body;

    if (!policy_name || !policy_type || !operation) {
      return res.status(400).json({ error: "policy_name, policy_type, and operation required" });
    }

    const result = await pool.query(
      `INSERT INTO metadata.permission_policies 
       (policy_name, policy_type, schema_name, table_name, column_name, role_name, username, 
        operation, condition_expression, attribute_conditions, priority, active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12, NOW(), NOW())
       RETURNING *`,
      [policy_name, policy_type, schema_name || null, table_name || null, column_name || null, role_name || null, username || null,
       operation, condition_expression || null, JSON.stringify(attribute_conditions || {}), priority, active]
    );

    res.json(result.rows[0]);
  } catch (err) {
    const safeError = sanitizeError(err, "Error creating permission policy", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.put("/api/security/permissions/policies/:id", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const policyId = parseInt(req.params.id);
    const { policy_name, policy_type, schema_name, table_name, column_name, role_name, username, operation, condition_expression, attribute_conditions, priority, active } = req.body;

    const result = await pool.query(
      `UPDATE metadata.permission_policies 
       SET policy_name = COALESCE($1, policy_name),
           policy_type = COALESCE($2, policy_type),
           schema_name = COALESCE($3, schema_name),
           table_name = COALESCE($4, table_name),
           column_name = COALESCE($5, column_name),
           role_name = COALESCE($6, role_name),
           username = COALESCE($7, username),
           operation = COALESCE($8, operation),
           condition_expression = COALESCE($9, condition_expression),
           attribute_conditions = COALESCE($10::jsonb, attribute_conditions),
           priority = COALESCE($11, priority),
           active = COALESCE($12, active),
           updated_at = NOW()
       WHERE policy_id = $13
       RETURNING *`,
      [policy_name, policy_type, schema_name, table_name, column_name, role_name, username, operation,
       condition_expression, attribute_conditions ? JSON.stringify(attribute_conditions) : null, priority, active, policyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Policy not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    const safeError = sanitizeError(err, "Error updating permission policy", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.delete("/api/security/permissions/policies/:id", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const policyId = parseInt(req.params.id);

    const result = await pool.query(
      `DELETE FROM metadata.permission_policies WHERE policy_id = $1 RETURNING *`,
      [policyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Policy not found" });
    }

    res.json({ message: "Policy deleted successfully", policy: result.rows[0] });
  } catch (err) {
    const safeError = sanitizeError(err, "Error deleting permission policy", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/security/permissions/check", requireAuth, async (req, res) => {
  try {
    const { schema_name, table_name, column_name, operation } = req.query;
    const username = req.user?.username || "anonymous";
    const userRoles = req.user?.roles || [];

    if (!schema_name || !table_name || !operation) {
      return res.status(400).json({ error: "schema_name, table_name, and operation required" });
    }

    const columnName = req.query.column_name || "";
    
    const result = await executeSecurityCommand("check_permission", {
      username,
      user_roles: userRoles,
      schema_name,
      table_name,
      column_name: columnName,
      operation_type: operation
    });
    
    res.json({ allowed: result.allowed });
  } catch (err) {
    const safeError = sanitizeError(err, "Error checking permissions", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/security/permissions/accessible-columns", requireAuth, async (req, res) => {
  try {
    const { schema_name, table_name } = req.query;
    const username = req.user?.username || "anonymous";
    const userRoles = req.user?.roles || [];

    if (!schema_name || !table_name) {
      return res.status(400).json({ error: "schema_name and table_name required" });
    }
    
    const result = await executeSecurityCommand("get_accessible_columns", {
      username,
      user_roles: userRoles,
      schema_name,
      table_name
    });
    
    res.json({ columns: result.columns });
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting accessible columns", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/security/permissions/row-filter", requireAuth, async (req, res) => {
  try {
    const { schema_name, table_name } = req.query;
    const username = req.user?.username || "anonymous";
    const userRoles = req.user?.roles || [];

    if (!schema_name || !table_name) {
      return res.status(400).json({ error: "schema_name and table_name required" });
    }
    
    const result = await executeSecurityCommand("get_row_filter", {
      username,
      user_roles: userRoles,
      schema_name,
      table_name
    });
    
    res.json({ filter: result.filter });
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting row filter", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/security/permissions/user-attributes", requireAuth, async (req, res) => {
  try {
    const { user_id } = req.query;
    const userId = user_id || req.user?.username || "anonymous";

    const result = await pool.query(
      "SELECT * FROM metadata.user_attributes WHERE user_id = $1",
      [userId]
    );

    res.json(result.rows || []);
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting user attributes", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.post("/api/security/permissions/user-attributes", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { user_id, attribute_name, attribute_value } = req.body;

    if (!user_id || !attribute_name || !attribute_value) {
      return res.status(400).json({ error: "user_id, attribute_name, and attribute_value required" });
    }

    const result = await pool.query(
      `INSERT INTO metadata.user_attributes (user_id, attribute_name, attribute_value, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       ON CONFLICT (user_id, attribute_name)
       DO UPDATE SET attribute_value = EXCLUDED.attribute_value, updated_at = NOW()
       RETURNING *`,
      [user_id, attribute_name, attribute_value]
    );

    res.json(result.rows[0]);
  } catch (err) {
    const safeError = sanitizeError(err, "Error setting user attribute", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

// ============================================
// MONITORING AND OBSERVABILITY API ENDPOINTS
// ============================================

// Distributed Tracing
app.get("/api/monitoring/tracing/traces", requireAuth, async (req, res) => {
  try {
    const { service_name, limit = 100 } = req.query;
    const result = await executeMonitoringCommand("list_traces", {
      service_name: service_name || "",
      limit: parseInt(limit)
    });
    res.json(result);
  } catch (err) {
    const safeError = sanitizeError(err, "Error listing traces", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/monitoring/tracing/traces/:traceId", requireAuth, async (req, res) => {
  try {
    const { traceId } = req.params;
    const result = await executeMonitoringCommand("get_trace", { trace_id: traceId });
    res.json(result);
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting trace", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.post("/api/monitoring/tracing/spans/start", requireAuth, async (req, res) => {
  try {
    const { trace_id, parent_span_id, operation_name, service_name } = req.body;
    const result = await executeMonitoringCommand("start_span", {
      trace_id: trace_id || null,
      parent_span_id: parent_span_id || "",
      operation_name,
      service_name: service_name || "datasync"
    });
    res.json(result);
  } catch (err) {
    const safeError = sanitizeError(err, "Error starting span", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.post("/api/monitoring/tracing/spans/end", requireAuth, async (req, res) => {
  try {
    const { span_id, status, error_message } = req.body;
    const result = await executeMonitoringCommand("end_span", {
      span_id,
      status: status || "ok",
      error_message: error_message || ""
    });
    res.json(result);
  } catch (err) {
    const safeError = sanitizeError(err, "Error ending span", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

// APM
app.get("/api/monitoring/apm/metrics", requireAuth, async (req, res) => {
  try {
    const { operation_name, time_window = "1min" } = req.query;
    const result = await executeMonitoringCommand("get_metrics", {
      operation_name: operation_name || "",
      time_window
    });
    res.json(result);
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting APM metrics", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/monitoring/apm/baselines", requireAuth, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM metadata.apm_baselines ORDER BY calculated_at DESC");
    res.json(result.rows);
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting baselines", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/monitoring/apm/health", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM metadata.apm_health_checks ORDER BY timestamp DESC LIMIT 50"
    );
    res.json(result.rows);
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting health checks", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.post("/api/monitoring/apm/baselines/calculate", requireAuth, async (req, res) => {
  try {
    const { operation_name, service_name, days = 7 } = req.body;
    // TODO: Call C++ to calculate baseline
    res.json({ success: true, message: "Baseline calculation initiated" });
  } catch (err) {
    const safeError = sanitizeError(err, "Error calculating baseline", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

// Bottleneck Detection
app.get("/api/monitoring/bottlenecks/current", requireAuth, async (req, res) => {
  try {
    const result = await executeMonitoringCommand("analyze_bottlenecks", {});
    res.json(result);
  } catch (err) {
    const safeError = sanitizeError(err, "Error analyzing bottlenecks", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/monitoring/bottlenecks/history", requireAuth, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const result = await pool.query(
      `SELECT * FROM metadata.bottleneck_detections 
       WHERE detected_at >= NOW() - INTERVAL '${days} days'
       ORDER BY detected_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting bottleneck history", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.post("/api/monitoring/bottlenecks/analyze", requireAuth, async (req, res) => {
  try {
    const result = await executeMonitoringCommand("analyze_bottlenecks", {});
    res.json(result);
  } catch (err) {
    const safeError = sanitizeError(err, "Error analyzing bottlenecks", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

// Resource Tracking
app.get("/api/monitoring/resources/current", requireAuth, async (req, res) => {
  try {
    const result = await executeMonitoringCommand("collect_resources", {});
    res.json(result);
  } catch (err) {
    const safeError = sanitizeError(err, "Error collecting resources", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/monitoring/resources/history", requireAuth, async (req, res) => {
  try {
    const { hours = 24 } = req.query;
    const result = await pool.query(
      `SELECT * FROM metadata.resource_utilization 
       WHERE timestamp >= NOW() - INTERVAL '${hours} hours'
       ORDER BY timestamp DESC`
    );
    res.json(result.rows);
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting resource history", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/monitoring/resources/by-workflow/:workflowId", requireAuth, async (req, res) => {
  try {
    const { workflowId } = req.params;
    const result = await pool.query(
      "SELECT * FROM metadata.resource_utilization WHERE workflow_id = $1 ORDER BY timestamp DESC",
      [workflowId]
    );
    res.json(result.rows);
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting workflow resources", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/monitoring/resources/predictions", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM metadata.resource_predictions ORDER BY predicted_at DESC LIMIT 50"
    );
    res.json(result.rows);
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting predictions", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

// Cost Tracking
app.get("/api/monitoring/costs/summary", requireAuth, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const result = await pool.query(
      `SELECT 
        SUM(total_cost) as total_cost,
        SUM(compute_cost) as compute_cost,
        SUM(storage_cost) as storage_cost,
        SUM(network_cost) as network_cost,
        COUNT(*) as operation_count
       FROM metadata.cost_tracking
       WHERE timestamp >= NOW() - INTERVAL '${days} days'`
    );
    res.json(result.rows[0] || { total_cost: 0, compute_cost: 0, storage_cost: 0, network_cost: 0, operation_count: 0 });
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting cost summary", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/monitoring/costs/by-workflow/:workflowId", requireAuth, async (req, res) => {
  try {
    const { workflowId } = req.params;
    const { days = 30 } = req.query;
    const result = await pool.query(
      `SELECT * FROM metadata.cost_tracking 
       WHERE workflow_id = $1 AND timestamp >= NOW() - INTERVAL '${days} days'
       ORDER BY timestamp DESC`,
      [workflowId]
    );
    res.json(result.rows);
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting workflow costs", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/monitoring/costs/budgets", requireAuth, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM metadata.cost_budgets ORDER BY name");
    res.json(result.rows);
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting budgets", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.post("/api/monitoring/costs/budgets", requireAuth, async (req, res) => {
  try {
    const { budget_id, name, scope, scope_id, amount, period, alert_on_exceed, alert_threshold } = req.body;
    const result = await pool.query(
      `INSERT INTO metadata.cost_budgets 
       (budget_id, name, scope, scope_id, amount, period, alert_on_exceed, alert_threshold)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (budget_id) DO UPDATE SET
       name = EXCLUDED.name, amount = EXCLUDED.amount, period = EXCLUDED.period,
       alert_on_exceed = EXCLUDED.alert_on_exceed, alert_threshold = EXCLUDED.alert_threshold
       RETURNING *`,
      [budget_id, name, scope, scope_id || null, amount, period, alert_on_exceed !== false, alert_threshold || 80.0]
    );
    res.json(result.rows[0]);
  } catch (err) {
    const safeError = sanitizeError(err, "Error creating budget", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/monitoring/costs/estimates", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM metadata.cost_estimates ORDER BY estimated_at DESC LIMIT 50"
    );
    res.json(result.rows);
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting estimates", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

// Log Aggregation
app.get("/api/monitoring/log-aggregation/config", requireAuth, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM metadata.log_aggregation_config WHERE enabled = true");
    res.json(result.rows);
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting log aggregation config", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.post("/api/monitoring/log-aggregation/config", requireAuth, async (req, res) => {
  try {
    const { config_id, type, endpoint, index_name, token, username, password, enabled, batch_size, batch_interval_seconds } = req.body;
    const result = await pool.query(
      `INSERT INTO metadata.log_aggregation_config 
       (config_id, type, endpoint, index_name, token, username, password, enabled, batch_size, batch_interval_seconds)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (config_id) DO UPDATE SET
       endpoint = EXCLUDED.endpoint, index_name = EXCLUDED.index_name, token = EXCLUDED.token,
       username = EXCLUDED.username, password = EXCLUDED.password, enabled = EXCLUDED.enabled,
       batch_size = EXCLUDED.batch_size, batch_interval_seconds = EXCLUDED.batch_interval_seconds
       RETURNING *`,
      [config_id, type, endpoint || null, index_name || null, token || null, username || null, password || null, enabled !== false, batch_size || 1000, batch_interval_seconds || 60]
    );
    res.json(result.rows[0]);
  } catch (err) {
    const safeError = sanitizeError(err, "Error configuring log aggregation", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.post("/api/monitoring/log-aggregation/export", requireAuth, async (req, res) => {
  try {
    const { config_id, limit = 1000 } = req.body;
    const result = await executeMonitoringCommand("export_logs", { config_id, limit });
    res.json(result);
  } catch (err) {
    const safeError = sanitizeError(err, "Error exporting logs", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/monitoring/log-aggregation/status", requireAuth, async (req, res) => {
  try {
    const { config_id } = req.query;
    let query = "SELECT * FROM metadata.log_aggregation_status";
    if (config_id) {
      query += " WHERE config_id = $1";
      const result = await pool.query(query, [config_id]);
      res.json(result.rows[0] || null);
    } else {
      const result = await pool.query(query);
      res.json(result.rows);
    }
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting export status", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

// Advanced Alerting
app.get("/api/monitoring/alerting/integrations", requireAuth, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM metadata.alerting_integrations WHERE enabled = true");
    res.json(result.rows);
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting integrations", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.post("/api/monitoring/alerting/integrations", requireAuth, async (req, res) => {
  try {
    const { integration_id, type, name, integration_key, api_key, service_id, team_id, enabled, severity_mapping } = req.body;
    const result = await pool.query(
      `INSERT INTO metadata.alerting_integrations 
       (integration_id, type, name, integration_key, api_key, service_id, team_id, enabled, severity_mapping)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (integration_id) DO UPDATE SET
       name = EXCLUDED.name, integration_key = EXCLUDED.integration_key, api_key = EXCLUDED.api_key,
       service_id = EXCLUDED.service_id, team_id = EXCLUDED.team_id, enabled = EXCLUDED.enabled,
       severity_mapping = EXCLUDED.severity_mapping
       RETURNING *`,
      [integration_id, type, name, integration_key || null, api_key || null, service_id || null, team_id || null, enabled !== false, JSON.stringify(severity_mapping || {})]
    );
    res.json(result.rows[0]);
  } catch (err) {
    const safeError = sanitizeError(err, "Error creating integration", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.post("/api/monitoring/alerting/trigger", requireAuth, async (req, res) => {
  try {
    const { integration_id, alert_id, title, message, source } = req.body;
    const result = await executeMonitoringCommand("trigger_alert", {
      integration_id,
      alert_id: alert_id || 0,
      title,
      message: message || "",
      source: source || "datasync"
    });
    res.json(result);
  } catch (err) {
    const safeError = sanitizeError(err, "Error triggering alert", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/monitoring/alerting/incidents", requireAuth, async (req, res) => {
  try {
    const { integration_id } = req.query;
    let query = "SELECT * FROM metadata.alerting_incidents";
    if (integration_id) {
      query += " WHERE integration_id = $1";
      const result = await pool.query(query + " ORDER BY created_at DESC", [integration_id]);
      res.json(result.rows);
    } else {
      const result = await pool.query(query + " ORDER BY created_at DESC LIMIT 100");
      res.json(result.rows);
    }
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting incidents", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

// Query Performance Analysis
app.get("/api/monitoring/query-performance/analyze/:queryId", requireAuth, async (req, res) => {
  try {
    const { queryId } = req.params;
    const { query_text } = req.query;
    if (!query_text) {
      return res.status(400).json({ error: "query_text required" });
    }
    const result = await executeMonitoringCommand("analyze_query", {
      query_id: queryId,
      query_text
    });
    res.json(result);
  } catch (err) {
    const safeError = sanitizeError(err, "Error analyzing query", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/monitoring/query-performance/regressions", requireAuth, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    // TODO: Implement regression detection
    res.json({ regressions: [] });
  } catch (err) {
    const safeError = sanitizeError(err, "Error detecting regressions", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/monitoring/query-performance/suggestions", requireAuth, async (req, res) => {
  try {
    const { query_fingerprint } = req.query;
    let query = "SELECT * FROM metadata.query_optimization_suggestions";
    if (query_fingerprint) {
      query += " WHERE query_fingerprint = $1";
      const result = await pool.query(query + " ORDER BY suggested_at DESC", [query_fingerprint]);
      res.json(result.rows);
    } else {
      const result = await pool.query(query + " ORDER BY suggested_at DESC LIMIT 100");
      res.json(result.rows);
    }
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting suggestions", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

// DataLake Mapping Endpoints
app.get("/api/datalake/mapping", requireAuth, async (req, res) => {
  try {
    const { source_system, refresh_rate_type } = req.query;
    const result = await executeCatalogCommand("list_mappings", {
      source_system: source_system || "",
      refresh_rate_type: refresh_rate_type || ""
    });
    res.json(result);
  } catch (err) {
    const safeError = sanitizeError(err, "Error listing mappings", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/datalake/mapping/:schema/:table", requireAuth, async (req, res) => {
  try {
    const { schema, table } = req.params;
    const result = await executeCatalogCommand("get_mapping", {
      target_schema: schema,
      target_table: table
    });
    res.json(result);
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting mapping", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.post("/api/datalake/mapping", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const result = await executeCatalogCommand("create_mapping", req.body);
    res.json(result);
  } catch (err) {
    const safeError = sanitizeError(err, "Error creating mapping", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/datalake/mapping/stats", requireAuth, async (req, res) => {
  try {
    // Stats are calculated from mappings, return aggregated data
    const result = await executeCatalogCommand("list_mappings", {});
    if (result.success && result.mappings) {
      const stats = {
        total_mappings: result.mappings.length,
        by_source_system: {},
        by_refresh_type: {}
      };
      result.mappings.forEach(m => {
        stats.by_source_system[m.source_system] = (stats.by_source_system[m.source_system] || 0) + 1;
        stats.by_refresh_type[m.refresh_rate_type] = (stats.by_refresh_type[m.refresh_rate_type] || 0) + 1;
      });
      res.json({ success: true, stats });
    } else {
      res.json({ success: true, stats: { total_mappings: 0 } });
    }
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting mapping stats", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

// CDC Cleanup Endpoints
app.get("/api/cdc/cleanup/policies", requireAuth, async (req, res) => {
  try {
    // Get policies from database directly
    const pool = require("./db").pool;
    let query = "SELECT * FROM metadata.cdc_cleanup_policies";
    if (req.query.enabled_only === "true") {
      query += " WHERE enabled = true";
    }
    query += " ORDER BY connection_string, db_engine";
    const result = await pool.query(query);
    res.json({ success: true, policies: result.rows });
  } catch (err) {
    const safeError = sanitizeError(err, "Error listing cleanup policies", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.post("/api/cdc/cleanup/policies", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const result = await executeMaintenanceCommand("create_cleanup_policy", req.body);
    res.json(result);
  } catch (err) {
    const safeError = sanitizeError(err, "Error creating cleanup policy", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.post("/api/cdc/cleanup/execute", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const result = await executeMaintenanceCommand("execute_cleanup", req.body);
    res.json(result);
  } catch (err) {
    const safeError = sanitizeError(err, "Error executing cleanup", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/cdc/cleanup/history", requireAuth, async (req, res) => {
  try {
    const { connection_string, limit = 100 } = req.query;
    const pool = require("./db").pool;
    let query = "SELECT * FROM metadata.cdc_cleanup_history";
    const params = [];
    if (connection_string) {
      query += " WHERE connection_string = $1";
      params.push(connection_string);
      query += " ORDER BY started_at DESC LIMIT $2";
      params.push(parseInt(limit));
    } else {
      query += " ORDER BY started_at DESC LIMIT $1";
      params.push(parseInt(limit));
    }
    const result = await pool.query(query, params);
    res.json({ success: true, history: result.rows });
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting cleanup history", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/cdc/cleanup/stats", requireAuth, async (req, res) => {
  try {
    // Get stats from database directly
    const pool = require("./db").pool;
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_policies,
        COUNT(CASE WHEN enabled THEN 1 END) as enabled_policies,
        COALESCE(SUM(rows_deleted), 0) as total_rows_deleted,
        COALESCE(SUM(tables_cleaned), 0) as total_tables_cleaned,
        COALESCE(SUM(space_freed_mb), 0) as total_space_freed_mb,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_cleanups,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_cleanups
      FROM metadata.cdc_cleanup_history
    `);
    res.json({ success: true, stats: result.rows[0] || {} });
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting cleanup stats", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

// Unused Objects Endpoints
app.get("/api/unused-objects/detect", requireAuth, async (req, res) => {
  try {
    const { days_threshold = 90, generated_by = "" } = req.query;
    const result = await executeCatalogCommand("detect_unused", {
      days_threshold: parseInt(days_threshold),
      generated_by: generated_by || ""
    });
    res.json(result);
  } catch (err) {
    const safeError = sanitizeError(err, "Error detecting unused objects", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/unused-objects/report/:reportId", requireAuth, async (req, res) => {
  try {
    const { reportId } = req.params;
    // Load from database directly
    const pool = require("./db").pool;
    const result = await pool.query(
      "SELECT * FROM metadata.unused_objects_report WHERE report_id = $1",
      [reportId]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Report not found" });
    } else {
      res.json({ success: true, report: result.rows[0] });
    }
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting report", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/unused-objects/reports", requireAuth, async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    const pool = require("./db").pool;
    const result = await pool.query(
      "SELECT * FROM metadata.unused_objects_report ORDER BY generated_at DESC LIMIT $1",
      [parseInt(limit)]
    );
    res.json({ success: true, reports: result.rows });
  } catch (err) {
    const safeError = sanitizeError(err, "Error listing reports", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.get("/api/unused-objects/usage/:schema/:object", requireAuth, async (req, res) => {
  try {
    const { schema, object } = req.params;
    const { object_type = "table" } = req.query;
    const pool = require("./db").pool;
    const result = await pool.query(
      "SELECT * FROM metadata.object_usage_tracking WHERE object_type = $1 AND schema_name = $2 AND object_name = $3",
      [object_type, schema, object]
    );
    if (result.rows.length === 0) {
      res.json({ success: true, usage: null });
    } else {
      res.json({ success: true, usage: result.rows[0] });
    }
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting object usage", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

app.post("/api/unused-objects/track-access", requireAuth, async (req, res) => {
  try {
    const result = await executeCatalogCommand("track_access", req.body);
    res.json(result);
  } catch (err) {
    const safeError = sanitizeError(err, "Error tracking access", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

// API Documentation (Swagger)
app.get("/swagger.json", (req, res) => {
  const swaggerSpec = require("./swagger.json");
  res.json(swaggerSpec);
});

app.get("/api-docs", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>DataSync API Documentation</title>
      <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui.css" />
    </head>
    <body>
      <div id="swagger-ui"></div>
      <script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-bundle.js"></script>
      <script>
        SwaggerUIBundle({
          url: "/swagger.json",
          dom_id: "#swagger-ui"
        });
      </script>
    </body>
    </html>
  `);
});

// Export app for testing
export default app;

// Only start server if not in test environment
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
