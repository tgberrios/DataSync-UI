import express from "express";
import { pool } from "../services/database.service.js";
import { sanitizeError } from "../server-utils/errorHandler.js";
import { validatePage, validateLimit, validateEnum } from "../server-utils/validation.js";
import { formatUptime } from "../services/utils.service.js";
import { requireAuth, requireRole } from "../server-utils/auth.js";

const router = express.Router();

// Obtener queries activas
router.get("/queries", async (req, res) => {
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

// Terminar una query por PID
router.post("/queries/:pid/kill", requireAuth, async (req, res) => {
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

// Obtener logs de procesamiento
router.get("/processing-logs", async (req, res) => {
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

// Obtener estadísticas de logs de procesamiento
router.get("/processing-logs/stats", async (req, res) => {
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

// Limpiar logs de procesamiento antiguos
router.post(
  "/processing-logs/cleanup",
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

// Obtener métricas de transferencia
router.get("/transfer-metrics", async (req, res) => {
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

// Obtener estadísticas de métricas de transferencia
router.get("/transfer-metrics/stats", async (req, res) => {
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

export default router;
