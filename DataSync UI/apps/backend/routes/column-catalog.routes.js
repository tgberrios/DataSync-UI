import express from "express";
import { pool } from "../services/database.service.js";
import { sanitizeError } from "../server-utils/errorHandler.js";
import { validatePage, validateLimit, validateBoolean, sanitizeSearch, validateIdentifier, validateEnum } from "../server-utils/validation.js";

const router = express.Router();

router.get("/columns", async (req, res) => {
  try {
    const schema_name = validateIdentifier(req.query.schema_name) || "";
    const table_name = validateIdentifier(req.query.table_name) || "";
    const db_engine = validateEnum(
      req.query.db_engine,
      ["PostgreSQL", "MariaDB", "MSSQL", "MongoDB", "Oracle", ""],
      ""
    );
    const data_type = sanitizeSearch(req.query.data_type, 50);
    const sensitivity_level = validateEnum(
      req.query.sensitivity_level,
      ["LOW", "MEDIUM", "HIGH", "CRITICAL", ""],
      ""
    );
    const contains_pii =
      req.query.contains_pii !== undefined
        ? validateBoolean(req.query.contains_pii)
        : "";
    const contains_phi =
      req.query.contains_phi !== undefined
        ? validateBoolean(req.query.contains_phi)
        : "";
    const search = sanitizeSearch(req.query.search, 100);

    const whereConditions = [];
    const params = [];
    let paramCount = 1;

    if (schema_name) {
      whereConditions.push(`schema_name = $${paramCount}`);
      params.push(schema_name);
      paramCount++;
    }

    if (table_name) {
      whereConditions.push(`table_name = $${paramCount}`);
      params.push(table_name);
      paramCount++;
    }

    if (db_engine) {
      whereConditions.push(`db_engine = $${paramCount}`);
      params.push(db_engine);
      paramCount++;
    }

    if (data_type) {
      whereConditions.push(`data_type ILIKE $${paramCount}`);
      params.push(`%${data_type}%`);
      paramCount++;
    }

    if (sensitivity_level) {
      whereConditions.push(`sensitivity_level = $${paramCount}`);
      params.push(sensitivity_level);
      paramCount++;
    }

    if (contains_pii !== "") {
      whereConditions.push(`contains_pii = $${paramCount}`);
      params.push(contains_pii === "true");
      paramCount++;
    }

    if (contains_phi !== "") {
      whereConditions.push(`contains_phi = $${paramCount}`);
      params.push(contains_phi === "true");
      paramCount++;
    }

    if (search) {
      whereConditions.push(`column_name ILIKE $${paramCount}`);
      params.push(`%${search}%`);
      paramCount++;
    }

    const whereClause =
      whereConditions.length > 0
        ? "WHERE " + whereConditions.join(" AND ")
        : "";

    const dataQuery = `
      SELECT *
      FROM metadata.column_catalog
      ${whereClause}
      ORDER BY schema_name, table_name, ordinal_position
    `;

    const result = await pool.query(dataQuery, params);

    res.json({
      data: result.rows,
    });
  } catch (err) {
    console.error("Error getting column catalog data:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener datos del catálogo de columnas",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

router.get("/metrics", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_columns,
        COUNT(*) FILTER (WHERE contains_pii = true) as pii_columns,
        COUNT(*) FILTER (WHERE contains_phi = true) as phi_columns,
        COUNT(*) FILTER (WHERE sensitivity_level = 'HIGH') as high_sensitivity,
        COUNT(*) FILTER (WHERE is_primary_key = true) as primary_keys,
        COUNT(*) FILTER (WHERE is_indexed = true) as indexed_columns,
        COUNT(*) FILTER (WHERE profiling_quality_score IS NOT NULL) as profiled_columns,
        AVG(profiling_quality_score) FILTER (WHERE profiling_quality_score IS NOT NULL) as avg_profiling_score,
        COUNT(*) FILTER (WHERE has_anomalies = true) as columns_with_anomalies
      FROM metadata.column_catalog
    `);

    res.json(result.rows[0] || {});
  } catch (err) {
    console.error("Error getting column catalog metrics:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener métricas del catálogo de columnas",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

router.get("/stats", async (req, res) => {
  try {
    const [dataTypeDist, sensitivityDist, engineDist, piiDist, profilingDist] = await Promise.all([
      pool.query(`
        SELECT 
          COALESCE(data_type, 'Unknown') as data_type,
          COUNT(*) as count
        FROM metadata.column_catalog
        GROUP BY data_type
        ORDER BY count DESC
        LIMIT 15
      `),
      pool.query(`
        SELECT 
          COALESCE(sensitivity_level, 'UNKNOWN') as sensitivity_level,
          COUNT(*) as count
        FROM metadata.column_catalog
        GROUP BY sensitivity_level
        ORDER BY count DESC
      `),
      pool.query(`
        SELECT 
          COALESCE(db_engine, 'Unknown') as db_engine,
          COUNT(*) as count
        FROM metadata.column_catalog
        GROUP BY db_engine
        ORDER BY count DESC
      `),
      pool.query(`
        SELECT 
          CASE 
            WHEN contains_pii = true AND contains_phi = true THEN 'PII + PHI'
            WHEN contains_pii = true THEN 'PII Only'
            WHEN contains_phi = true THEN 'PHI Only'
            ELSE 'No Sensitive Data'
          END as category,
          COUNT(*) as count
        FROM metadata.column_catalog
        GROUP BY 
          CASE 
            WHEN contains_pii = true AND contains_phi = true THEN 'PII + PHI'
            WHEN contains_pii = true THEN 'PII Only'
            WHEN contains_phi = true THEN 'PHI Only'
            ELSE 'No Sensitive Data'
          END
        ORDER BY count DESC
      `),
      pool.query(`
        SELECT 
          quality_range,
          count
        FROM (
          SELECT 
            CASE 
              WHEN profiling_quality_score >= 90 THEN 'Excellent (90-100)'
              WHEN profiling_quality_score >= 75 THEN 'Good (75-89)'
              WHEN profiling_quality_score >= 50 THEN 'Fair (50-74)'
              WHEN profiling_quality_score IS NOT NULL THEN 'Poor (<50)'
              ELSE 'Not Profiled'
            END as quality_range,
            COUNT(*) as count
          FROM metadata.column_catalog
          GROUP BY 
            CASE 
              WHEN profiling_quality_score >= 90 THEN 'Excellent (90-100)'
              WHEN profiling_quality_score >= 75 THEN 'Good (75-89)'
              WHEN profiling_quality_score >= 50 THEN 'Fair (50-74)'
              WHEN profiling_quality_score IS NOT NULL THEN 'Poor (<50)'
              ELSE 'Not Profiled'
            END
        ) subquery
        ORDER BY 
          CASE quality_range
            WHEN 'Excellent (90-100)' THEN 1
            WHEN 'Good (75-89)' THEN 2
            WHEN 'Fair (50-74)' THEN 3
            WHEN 'Poor (<50)' THEN 4
            WHEN 'Not Profiled' THEN 5
          END
      `)
    ]);

    res.json({
      data_type_distribution: dataTypeDist.rows,
      sensitivity_distribution: sensitivityDist.rows,
      engine_distribution: engineDist.rows,
      pii_distribution: piiDist.rows,
      profiling_distribution: profilingDist.rows
    });
  } catch (err) {
    console.error("Error getting column catalog stats:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener estadísticas del catálogo de columnas",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

router.get("/schemas", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT schema_name
      FROM metadata.column_catalog
      ORDER BY schema_name
    `);

    res.json(result.rows.map((row) => row.schema_name));
  } catch (err) {
    console.error("Error getting schemas:", err);
    res.status(500).json({
      error: "Error al obtener schemas",
      error: sanitizeError(
        err,
        "Error en el servidor",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});

router.get("/tables/:schemaName", async (req, res) => {
  try {
    const schemaName = validateIdentifier(req.params.schemaName);
    if (!schemaName) {
      return res.status(400).json({ error: "Invalid schemaName" });
    }
    const result = await pool.query(
      `
        SELECT DISTINCT table_name
        FROM metadata.column_catalog
        WHERE schema_name = $1
        ORDER BY table_name
      `,
      [schemaName]
    );

    res.json(result.rows.map((row) => row.table_name));
  } catch (err) {
    console.error("Error getting tables:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener tablas",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});



export default router;
