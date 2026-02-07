import express from "express";
import { pool } from "../services/database.service.js";
import { sanitizeError } from "../server-utils/errorHandler.js";
import { validatePage, validateLimit, validateEnum } from "../server-utils/validation.js";
import { sanitizeSearch } from "../server-utils/validation.js";

const router = express.Router();

// Obtener datos de governance
router.get("/data", async (req, res) => {
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

// Obtener métricas de governance
router.get("/metrics", async (req, res) => {
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
router.get("/history", async (req, res) => {
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
router.get("/stats", async (req, res) => {
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

export default router;
