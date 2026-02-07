import express from "express";
import { pool } from "../services/database.service.js";
import { sanitizeError } from "../server-utils/errorHandler.js";
import {
  validatePage,
  validateLimit,
  validateEnum,
  validateBoolean,
  sanitizeSearch,
} from "../server-utils/validation.js";

const router = express.Router();

/**
 * GET /api/csv-catalog - List CSV catalog entries with pagination and filters.
 * Response shape matches frontend: { data: [], pagination: { total, totalPages, currentPage, limit } }
 */
router.get("/", async (req, res) => {
  try {
    const page = validatePage(req.query.page, 1);
    const limit = validateLimit(req.query.limit, 1, 10000);
    const offset = (page - 1) * limit;
    const source_type = validateEnum(
      req.query.source_type,
      ["FILE", "URL", "S3", ""],
      ""
    );
    const target_db_engine = validateEnum(
      req.query.target_db_engine,
      ["PostgreSQL", "MariaDB", "MSSQL", "MongoDB", "Oracle", ""],
      ""
    );
    const status = validateEnum(
      req.query.status,
      ["SUCCESS", "ERROR", "IN_PROGRESS", "PENDING", ""],
      ""
    );
    const active =
      req.query.active !== undefined
        ? validateBoolean(req.query.active)
        : undefined;
    const search = sanitizeSearch(req.query.search, 200);

    let whereConditions = [];
    let queryParams = [];
    let paramCount = 0;

    if (source_type) {
      paramCount++;
      whereConditions.push(`source_type = $${paramCount}`);
      queryParams.push(source_type);
    }
    if (target_db_engine) {
      paramCount++;
      whereConditions.push(`target_db_engine = $${paramCount}`);
      queryParams.push(target_db_engine);
    }
    if (status) {
      paramCount++;
      whereConditions.push(`status = $${paramCount}`);
      queryParams.push(status);
    }
    if (active !== undefined) {
      paramCount++;
      whereConditions.push(`active = $${paramCount}`);
      queryParams.push(active);
    }
    if (search) {
      paramCount++;
      whereConditions.push(
        `(csv_name ILIKE $${paramCount} OR source_path ILIKE $${paramCount} OR target_schema ILIKE $${paramCount} OR target_table ILIKE $${paramCount})`
      );
      queryParams.push(`%${search}%`);
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    const countQuery = `SELECT COUNT(*) FROM metadata.csv_catalog ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count, 10) || 0;

    paramCount++;
    const dataQuery = `SELECT * FROM metadata.csv_catalog ${whereClause}
      ORDER BY
        CASE status
          WHEN 'SUCCESS' THEN 1
          WHEN 'IN_PROGRESS' THEN 2
          WHEN 'ERROR' THEN 3
          WHEN 'PENDING' THEN 4
          ELSE 5
        END,
        active DESC,
        csv_name
      LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    queryParams.push(limit, offset);

    const result = await pool.query(dataQuery, queryParams);
    const totalPages = Math.ceil(total / limit) || 0;

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
    if (err.code === "42P01") {
      return res.json({
        data: [],
        pagination: { total: 0, totalPages: 0, currentPage: 1, limit: 100 },
      });
    }
    console.error("Error getting CSV catalog:", err);
    res.status(500).json({
      error: "Error al obtener catálogo CSV",
      details: sanitizeError(
        err,
        "Error en el servidor",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});

router.patch("/active", async (req, res) => {
  const { csv_name: csvName, active } = req.body;
  try {
    const result = await pool.query(
      `UPDATE metadata.csv_catalog
       SET active = $1, updated_at = NOW()
       WHERE csv_name = $2
       RETURNING *`,
      [active, csvName]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "CSV entry not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === "42P01") {
      return res.status(503).json({ error: "CSV catalog table not available" });
    }
    console.error("Error updating CSV active status:", err);
    res.status(500).json({
      error: "Error al actualizar estado",
      details: sanitizeError(
        err,
        "Error en el servidor",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});

router.get("/metrics", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE active = true) AS active_count,
        COUNT(*) FILTER (WHERE status = 'SUCCESS') AS success_count,
        COUNT(*) FILTER (WHERE status = 'ERROR') AS error_count,
        COUNT(*) FILTER (WHERE status = 'IN_PROGRESS') AS in_progress_count,
        COUNT(*) FILTER (WHERE status = 'PENDING') AS pending_count
      FROM metadata.csv_catalog
    `);
    const row = result.rows[0] || {};
    res.json({
      total: parseInt(row.total, 10) || 0,
      active_count: parseInt(row.active_count, 10) || 0,
      success_count: parseInt(row.success_count, 10) || 0,
      error_count: parseInt(row.error_count, 10) || 0,
      in_progress_count: parseInt(row.in_progress_count, 10) || 0,
      pending_count: parseInt(row.pending_count, 10) || 0,
    });
  } catch (err) {
    if (err.code === "42P01") {
      return res.json({
        total: 0,
        active_count: 0,
        success_count: 0,
        error_count: 0,
        in_progress_count: 0,
        pending_count: 0,
      });
    }
    console.error("Error getting CSV catalog metrics:", err);
    res.status(500).json({
      error: "Error al obtener métricas",
      details: sanitizeError(
        err,
        "Error en el servidor",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});

export default router;
