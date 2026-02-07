import express from "express";
import { pool } from "../services/database.service.js";
import { sanitizeError } from "../server-utils/errorHandler.js";

const router = express.Router();

router.get("/items", async (req, res) => {
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

router.get("/metrics", async (req, res) => {
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



export default router;
