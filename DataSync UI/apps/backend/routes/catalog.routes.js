import express from "express";
import { requireAuth, requireRole } from "../server-utils/auth.js";
import { pool, config } from "../services/database.service.js";
import { sanitizeError } from "../server-utils/errorHandler.js";
import {
  validatePage,
  validateLimit,
  validateBoolean,
  sanitizeSearch,
  validateIdentifier,
  validateEnum,
} from "../server-utils/validation.js";

const router = express.Router();

// Resetear CDC (last_change_id a 0) - DEBE IR ANTES DE /api/catalog
router.post("/reset-cdc", requireAuth, requireRole("admin", "user"), async (req, res) => {
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
});

// Obtener historial de ejecuciones de una tabla del catalog - DEBE IR ANTES DE /api/catalog
router.get("/execution-history", requireAuth, async (req, res) => {
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
router.get("/table-structure", requireAuth, async (req, res) => {
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

// Obtener catálogo con paginación, filtros y búsqueda ("" y "/" so GET /api/catalog works with or without trailing slash)
router.get(["/", ""], requireAuth, async (req, res) => {
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
router.patch(
  "/status",
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
router.post(
  "/sync",
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
router.post(
  "/",
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

// Actualizar una entrada del catálogo ("" y "/" so PUT /api/catalog and PUT /api/catalog/ both match)
router.put(["/", ""], requireAuth, requireRole("admin", "user"), async (req, res) => {
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
       WHERE LOWER(schema_name) = LOWER($1) AND LOWER(table_name) = LOWER($2) AND db_engine = $3`,
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
      WHERE LOWER(schema_name) = LOWER($${paramCount - 2}) AND LOWER(table_name) = LOWER($${paramCount - 1}) AND db_engine = $${paramCount}
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

// Eliminar una entrada del catálogo ("" y "/" so DELETE /api/catalog works with or without trailing slash)
router.delete(["/", ""], requireAuth, requireRole("admin", "user"), async (req, res) => {
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
router.get("/schemas", requireAuth, async (req, res) => {
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
router.get("/engines", requireAuth, async (req, res) => {
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
router.get("/statuses", requireAuth, async (req, res) => {
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
router.get("/strategies", requireAuth, async (req, res) => {
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
router.patch(
  "/activate-schema",
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
router.patch(
  "/skip-table",
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
router.patch(
  "/deactivate-schema",
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

export default router;
