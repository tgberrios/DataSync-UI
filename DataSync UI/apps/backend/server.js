import express from "express";
import cors from "cors";
import helmet from "helmet";
import { spawn } from "child_process";
import os from "os";
import path from "path";
import fs from "fs";
import crypto from "crypto";

// Import services
import { pool, config, getConfigPath } from "./services/database.service.js";
import { upload } from "./services/fileUpload.service.js";

// Import middleware
import { normalizeSchema } from "./middleware/normalizeSchema.js";

// Import routers
import apiRoutes from "./routes/index.js";

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

// Import server utilities
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

// Middleware: normalize schema/table identifiers to lowercase in body and query
app.use(normalizeSchema);

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

// Global authentication middleware for /api routes (must be BEFORE route registration)
// Public paths that don't require authentication
const publicPaths = ["/api/auth/login", "/api/health"];
app.use("/api", (req, res, next) => {
  // Get the full request path including /api prefix
  const requestPath = req.originalUrl ? req.originalUrl.split("?")[0] : req.url.split("?")[0];
  
  // Allow public paths without authentication
  if (publicPaths.includes(requestPath)) {
    return next();
  }
  
  // Apply authentication middleware for all other /api routes
  requireAuth(req, res, next);
});

// Register API routes
app.use("/api", apiRoutes);

// ============================================================================
// LEGACY ENDPOINTS - Moved to routers
// These endpoints are now handled by routers in routes/
// They are kept here temporarily for reference and will be removed once
// all endpoints are migrated and tested.
// ============================================================================
// Auth endpoints moved to routes/auth.routes.js
// Health endpoint moved to routes/health.routes.js
// Connections endpoint moved to routes/connections.routes.js
// Catalog endpoints moved to routes/catalog.routes.js
// Dashboard endpoints moved to routes/dashboard.routes.js
// ============================================================================

const PORT = process.env.PORT || 8765;

// Endpoint para obtener tabla actualmente procesándose
// ============================================================================
// END OF LEGACY DASHBOARD ENDPOINTS
// ============================================================================ */

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

/* ============================================================================
// LEGACY BACKUPS ENDPOINTS - MOVED TO routes/backups.routes.js
// ============================================================================
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

          const configPath = path.join(process.cwd(), "storage", "backups", `backup_config_${backupId}.json`);
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


// ============================================================================
// END OF LEGACY BACKUPS ENDPOINTS
// ============================================================================ */

/* ============================================================================
// LEGACY DATA-MASKING ENDPOINTS - MOVED TO routes/data-masking.routes.js
// ============================================================================
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

      const configData = fs.readFileSync(getConfigPath(), "utf8");
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


// ============================================================================
// END OF LEGACY DATA-MASKING ENDPOINTS
// ============================================================================ */

/* ============================================================================
// LEGACY DATA-ENCRYPTION ENDPOINTS - MOVED TO routes/data-encryption.routes.js
// ============================================================================
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


// ============================================================================
// END OF LEGACY DATA-ENCRYPTION ENDPOINTS
// ============================================================================ */

/* ============================================================================
// LEGACY RLS ENDPOINTS - MOVED TO routes/rls.routes.js
// ============================================================================
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


// ============================================================================
// END OF LEGACY RLS ENDPOINTS
// ============================================================================ */

/* ============================================================================
// LEGACY AUDIT ENDPOINTS - MOVED TO routes/audit.routes.js
// ============================================================================
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


// ============================================================================
// END OF LEGACY AUDIT ENDPOINTS
// ============================================================================ */

// ============================================
// Big Data Processing API Endpoints
// ============================================

// ============================================================================
// STREAM PROCESSING ENDPOINTS
// ============================================================================

// ============================================================================
// Performance Optimization API Endpoints
// ============================================================================

// ============================================================================
// Metadata and Documentation API Endpoints
// ============================================================================

// ============================================
// MONITORING AND OBSERVABILITY API ENDPOINTS
// ============================================

// Distributed Tracing

// API Documentation endpoints moved to routes/docs.routes.js

// Export app for testing
export default app;

// Only start server if not in test environment
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
