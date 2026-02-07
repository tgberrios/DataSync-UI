import express from "express";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { pool } from "../services/database.service.js";
import { sanitizeError } from "../server-utils/errorHandler.js";
import { validateEnum } from "../server-utils/validation.js";
import { requireAuth, requireRole } from "../server-utils/auth.js";
import { Pool } from "pg";
import pkg from "pg";

const router = express.Router();

router.post("/test-connection", requireAuth, async (req, res) => {
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

router.post("/discover-databases", requireAuth, async (req, res) => {
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

router.post("/discover-schemas", requireAuth, async (req, res) => {
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

router.post("/discover-tables", requireAuth, async (req, res) => {
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

router.post("/discover-columns", requireAuth, async (req, res) => {
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







const backupsDir = path.join(process.cwd(), "storage", "backups");
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


export default router;