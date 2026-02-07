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
        ROUND(AVG(query_efficiency_score)::numeric, 2) as avg_efficiency,
        AVG(mean_time_ms)::double precision as avg_mean_time_ms
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

const SYSTEM_QUERY_FILTER = `
  captured_at > NOW() - INTERVAL '24 hours'
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
`;

const SYSTEM_QUERY_FILTER_WITHOUT_TIME = `
  query_text NOT ILIKE '%information_schema%'
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
`;

const VOLUME_INTERVALS = ["minute", "hour", "day"];

router.get("/volume-over-time", async (req, res) => {
  try {
    const hours = Math.min(168, Math.max(1, parseInt(req.query.hours) || 24));
    const intervalParam = (req.query.interval || "hour").toLowerCase();
    const interval = VOLUME_INTERVALS.includes(intervalParam) ? intervalParam : "hour";
    const timeCondition = `captured_at > NOW() - INTERVAL '${hours} hours'`;
    const whereFilter = `${timeCondition} AND ${SYSTEM_QUERY_FILTER_WITHOUT_TIME.replace(/^\s+/gm, "").trim()}`;
    // date_trunc first argument must be a literal in PostgreSQL, so we use validated interval only
    const result = await pool.query(
      `
      SELECT 
        date_trunc('${interval}', captured_at) AS bucket_ts,
        COUNT(*)::int AS count
      FROM metadata.query_performance
      WHERE ${whereFilter}
      GROUP BY date_trunc('${interval}', captured_at)
      ORDER BY bucket_ts ASC
      `
    );
    const data = (result.rows || []).map((r) => ({
      bucket_ts: r.bucket_ts ? new Date(r.bucket_ts).toISOString() : null,
      count: parseInt(r.count, 10) || 0,
    }));
    res.json({ data });
  } catch (err) {
    console.error("Error getting query volume over time:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener volumen de queries por tiempo",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

router.get("/top-slowest", async (req, res) => {
  try {
    const limit = Math.min(50, Math.max(5, parseInt(req.query.limit) || 10));
    const hours = Math.min(168, Math.max(1, parseInt(req.query.hours) || 24));
    const timeCondition = `captured_at > NOW() - INTERVAL '${hours} hours'`;
    const whereFilter = `${timeCondition} AND ${SYSTEM_QUERY_FILTER_WITHOUT_TIME.replace(/^\s+/gm, "").trim()}`;
    // One row per distinct query_text (the one with highest mean_time_ms), then top N by time
    const result = await pool.query(
      `
      SELECT * FROM (
        SELECT DISTINCT ON (query_text) *
        FROM metadata.query_performance
        WHERE ${whereFilter}
        ORDER BY query_text, mean_time_ms DESC NULLS LAST
      ) sub
      ORDER BY mean_time_ms DESC NULLS LAST
      LIMIT $1
      `,
      [limit]
    );
    res.json({ data: result.rows || [] });
  } catch (err) {
    console.error("Error getting top slowest queries:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener consultas más lentas",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

export default router;
