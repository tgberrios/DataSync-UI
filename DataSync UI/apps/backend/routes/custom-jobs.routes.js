import express from "express";
import fs from "fs";
import path from "path";
import { pool } from "../services/database.service.js";
import { sanitizeError } from "../server-utils/errorHandler.js";
import { validatePage, validateLimit, validateBoolean, sanitizeSearch, validateIdentifier, validateEnum } from "../server-utils/validation.js";
import { requireAuth, requireRole } from "../server-utils/auth.js";
import pkg from "pg";

const router = express.Router();

router.get("/scripts", async (req, res) => {
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

router.post("/preview-query", requireAuth, async (req, res) => {
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

router.post(
  "/",
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

router.put(
  "/:jobName",
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

router.get("/", async (req, res) => {
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

router.post("/:jobName/execute", async (req, res) => {
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

router.get("/:jobName/results", async (req, res) => {
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

router.get("/:jobName/history", async (req, res) => {
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

router.get("/:jobName/table-structure", async (req, res) => {
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

router.patch(
  "/:jobName/active",
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

router.delete(
  "/:jobName",
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

router.post(
  "/:jobName/reboot-table",
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



export default router;
