import express from "express";
import { pool } from "../services/database.service.js";
import { sanitizeError } from "../server-utils/errorHandler.js";
import { validatePage, validateLimit, validateEnum } from "../server-utils/validation.js";
import { sanitizeSearch } from "../server-utils/validation.js";

const router = express.Router();

// Obtener métricas de calidad
router.get("/metrics", async (req, res) => {
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

// Obtener historial de calidad
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

// Obtener estadísticas de calidad
router.get("/stats", async (req, res) => {
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

export default router;
