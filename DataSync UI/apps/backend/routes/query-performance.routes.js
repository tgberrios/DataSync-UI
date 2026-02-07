import express from "express";
import { pool } from "../services/database.service.js";
import { sanitizeError } from "../server-utils/errorHandler.js";

const router = express.Router();

router.get("/queries", async (req, res) => {
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

router.get("/metrics", async (req, res) => {
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



export default router;
