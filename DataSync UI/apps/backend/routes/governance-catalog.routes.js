import express from "express";
import { pool } from "../services/database.service.js";
import { sanitizeError } from "../server-utils/errorHandler.js";
import { validatePage, validateLimit, validateEnum, sanitizeSearch, validateIdentifier } from "../server-utils/validation.js";

const router = express.Router();
router.get("/mariadb", async (req, res) => {
  try {
    const page = validatePage(req.query.page, 1);
    const limit = validateLimit(req.query.limit, 1, 100);
    const offset = (page - 1) * limit;
    const server_name = sanitizeSearch(req.query.server_name, 100);
    const database_name = sanitizeSearch(req.query.database_name, 100);
    const health_status = validateEnum(
      req.query.health_status,
      ["HEALTHY", "WARNING", "CRITICAL", ""],
      ""
    );
    const access_frequency = validateEnum(
      req.query.access_frequency,
      ["HIGH", "MEDIUM", "LOW", ""],
      ""
    );
    const search = sanitizeSearch(req.query.search, 100);

    const whereConditions = [];
    const params = [];
    let paramCount = 1;

    if (server_name) {
      whereConditions.push(`server_name = $${paramCount}`);
      params.push(server_name);
      paramCount++;
    }

    if (database_name) {
      whereConditions.push(`database_name = $${paramCount}`);
      params.push(database_name);
      paramCount++;
    }

    if (health_status) {
      whereConditions.push(`health_status = $${paramCount}`);
      params.push(health_status);
      paramCount++;
    }

    if (access_frequency) {
      whereConditions.push(`access_frequency = $${paramCount}`);
      params.push(access_frequency);
      paramCount++;
    }

    if (search) {
      whereConditions.push(`table_name ILIKE $${paramCount}`);
      params.push(`%${search}%`);
      paramCount++;
    }

    const whereClause =
      whereConditions.length > 0
        ? "WHERE " + whereConditions.join(" AND ")
        : "";

    const countQuery = `SELECT COUNT(*) FROM metadata.data_governance_catalog_mariadb ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(limit, offset);
    const dataQuery = `
      SELECT *
      FROM metadata.data_governance_catalog_mariadb
      ${whereClause}
      ORDER BY server_name, database_name, schema_name, table_name
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
    console.error("Error getting MariaDB governance catalog:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener catálogo de governance de MariaDB",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

router.get("/mariadb/metrics", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_tables,
        SUM(COALESCE(total_size_mb, 0)) as total_size_mb,
        COUNT(*) FILTER (WHERE health_status IN ('EXCELLENT', 'HEALTHY')) as healthy_count,
        COUNT(*) FILTER (WHERE health_status = 'WARNING') as warning_count,
        COUNT(*) FILTER (WHERE health_status = 'CRITICAL') as critical_count,
        COUNT(DISTINCT server_name) as unique_servers
      FROM metadata.data_governance_catalog_mariadb
    `);

    res.json(result.rows[0] || {});
  } catch (err) {
    console.error("Error getting MariaDB governance metrics:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener métricas de governance de MariaDB",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

router.get("/mariadb/servers", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT server_name
      FROM metadata.data_governance_catalog_mariadb
      WHERE server_name IS NOT NULL
      ORDER BY server_name
    `);

    res.json(result.rows.map((row) => row.server_name));
  } catch (err) {
    console.error("Error getting MariaDB servers:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener servidores",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

router.get("/mariadb/history", async (req, res) => {
  try {
    const server_name = sanitizeSearch(req.query.server_name, 100);
    const database_name = validateIdentifier(req.query.database_name) || "";
    const schema_name = validateIdentifier(req.query.schema_name) || "";
    const table_name = validateIdentifier(req.query.table_name) || "";
    const days = parseInt(req.query.days || "30", 10);
    const limit = validateLimit(req.query.limit, 1, 10000, 1000);

    const whereConditions = [];
    const params = [];
    let paramCount = 1;

    if (server_name) {
      whereConditions.push(`server_name = $${paramCount}`);
      params.push(server_name);
      paramCount++;
    }

    if (database_name) {
      whereConditions.push(`database_name = $${paramCount}`);
      params.push(database_name);
      paramCount++;
    }

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

    whereConditions.push(`snapshot_date >= NOW() - INTERVAL '${days} days'`);

    const whereClause =
      whereConditions.length > 0
        ? "WHERE " + whereConditions.join(" AND ")
        : "";

    const result = await pool.query(
      `
      SELECT 
        id,
        server_name,
        database_name,
        schema_name,
        table_name,
        snapshot_date,
        row_count,
        data_size_mb,
        index_size_mb,
        total_size_mb,
        health_status,
        fragmentation_pct,
        access_frequency
      FROM metadata.data_governance_catalog_mariadb
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
    console.error("Error getting MariaDB governance history:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener historial de governance de MariaDB",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

router.get("/mariadb/stats", async (req, res) => {
  try {
    const days = parseInt(req.query.days || "30", 10);
    const server_name = sanitizeSearch(req.query.server_name, 100);

    const whereConditions = [`snapshot_date >= NOW() - INTERVAL '${days} days'`];
    const params = [];

    if (server_name) {
      whereConditions.push(`server_name = $1`);
      params.push(server_name);
    }

    const whereClause = "WHERE " + whereConditions.join(" AND ");

    const result = await pool.query(
      `
      WITH latest_snapshots AS (
        SELECT DISTINCT ON (server_name, database_name, schema_name, table_name)
          *
        FROM metadata.data_governance_catalog_mariadb
        ${whereClause}
        ORDER BY server_name, database_name, schema_name, table_name, snapshot_date DESC
      )
      SELECT 
        COUNT(*) as total_tables,
        COUNT(*) FILTER (WHERE health_status IN ('EXCELLENT', 'HEALTHY')) as healthy_count,
        COUNT(*) FILTER (WHERE health_status = 'WARNING') as warning_count,
        COUNT(*) FILTER (WHERE health_status = 'CRITICAL') as critical_count,
        SUM(COALESCE(total_size_mb, 0)) as total_size_mb,
        SUM(COALESCE(row_count, 0)) as total_rows,
        COUNT(DISTINCT server_name) as server_count,
        COUNT(DISTINCT database_name) as database_count
      FROM latest_snapshots
    `,
      params
    );

    const serverStats = await pool.query(
      `
      WITH latest_snapshots AS (
        SELECT DISTINCT ON (server_name, database_name, schema_name, table_name)
          *
        FROM metadata.data_governance_catalog_mariadb
        ${whereClause}
        ORDER BY server_name, database_name, schema_name, table_name, snapshot_date DESC
      )
      SELECT 
        server_name,
        COUNT(*) as table_count,
        COUNT(*) FILTER (WHERE health_status IN ('EXCELLENT', 'HEALTHY')) as healthy,
        COUNT(*) FILTER (WHERE health_status = 'WARNING') as warning,
        COUNT(*) FILTER (WHERE health_status = 'CRITICAL') as critical
      FROM latest_snapshots
      GROUP BY server_name
      ORDER BY table_count DESC
    `,
      params
    );

    res.json({
      summary: result.rows[0],
      byServer: serverStats.rows,
    });
  } catch (err) {
    console.error("Error getting MariaDB governance stats:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener estadísticas de governance de MariaDB",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});
router.get("/governance-catalog/mariadb/databases/:serverName",
  async (req, res) => {
    try {
      const serverName = req.params.serverName;
      const result = await pool.query(
        `
        SELECT DISTINCT database_name
        FROM metadata.data_governance_catalog_mariadb
        WHERE server_name = $1 AND database_name IS NOT NULL
        ORDER BY database_name
      `,
        [serverName]
      );

      res.json(result.rows.map((row) => row.database_name));
    } catch (err) {
      console.error("Error getting MariaDB databases:", err);
      res.status(500).json({
        error: "Error al obtener bases de datos",
        error: sanitizeError(
          err,
          "Error en el servidor",
          process.env.NODE_ENV === "production"
        ),
      });
    }
  }
);

router.get("/mssql", async (req, res) => {
  try {
    const page = validatePage(req.query.page, 1);
    const limit = validateLimit(req.query.limit, 1, 100);
    const offset = (page - 1) * limit;
    const server_name = sanitizeSearch(req.query.server_name, 100);
    const database_name = sanitizeSearch(req.query.database_name, 100);
    const object_type = validateEnum(
      req.query.object_type,
      ["TABLE", "VIEW", "PROCEDURE", "FUNCTION", ""],
      ""
    );
    const health_status = validateEnum(
      req.query.health_status,
      ["HEALTHY", "WARNING", "CRITICAL", ""],
      ""
    );
    const access_frequency = validateEnum(
      req.query.access_frequency,
      ["HIGH", "MEDIUM", "LOW", ""],
      ""
    );
    const search = sanitizeSearch(req.query.search, 100);

    const whereConditions = [];
    const params = [];
    let paramCount = 1;

    if (server_name) {
      whereConditions.push(`server_name = $${paramCount}`);
      params.push(server_name);
      paramCount++;
    }

    if (database_name) {
      whereConditions.push(`database_name = $${paramCount}`);
      params.push(database_name);
      paramCount++;
    }

    if (object_type) {
      whereConditions.push(`object_type = $${paramCount}`);
      params.push(object_type);
      paramCount++;
    }

    if (health_status) {
      whereConditions.push(`health_status = $${paramCount}`);
      params.push(health_status);
      paramCount++;
    }

    if (access_frequency) {
      whereConditions.push(`access_frequency = $${paramCount}`);
      params.push(access_frequency);
      paramCount++;
    }

    if (search) {
      whereConditions.push(
        `(object_name ILIKE $${paramCount} OR table_name ILIKE $${paramCount})`
      );
      params.push(`%${search}%`);
      paramCount++;
    }

    const whereClause =
      whereConditions.length > 0
        ? "WHERE " + whereConditions.join(" AND ")
        : "";

    const countQuery = `SELECT COUNT(*) FROM metadata.data_governance_catalog_mssql ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(limit, offset);
    const dataQuery = `
      SELECT *
      FROM metadata.data_governance_catalog_mssql
      ${whereClause}
      ORDER BY server_name, database_name, schema_name, object_name
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
    console.error("Error getting MSSQL governance catalog:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener catálogo de governance de MSSQL",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

router.get("/mssql/metrics", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_objects,
        SUM(COALESCE(table_size_mb, 0)) as total_size_mb,
        COUNT(*) FILTER (WHERE health_status IN ('EXCELLENT', 'HEALTHY')) as healthy_count,
        COUNT(*) FILTER (WHERE health_status = 'WARNING') as warning_count,
        COUNT(*) FILTER (WHERE health_status = 'CRITICAL') as critical_count,
        COUNT(DISTINCT server_name) as unique_servers
      FROM metadata.data_governance_catalog_mssql
    `);

    res.json(result.rows[0] || {});
  } catch (err) {
    console.error("Error getting MSSQL governance metrics:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener métricas de governance de MSSQL",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

router.get("/mssql/servers", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT server_name
      FROM metadata.data_governance_catalog_mssql
      WHERE server_name IS NOT NULL
      ORDER BY server_name
    `);

    res.json(result.rows.map((row) => row.server_name));
  } catch (err) {
    console.error("Error getting MSSQL servers:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener servidores",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

router.get("/mssql/history", async (req, res) => {
  try {
    const server_name = sanitizeSearch(req.query.server_name, 100);
    const database_name = validateIdentifier(req.query.database_name) || "";
    const schema_name = validateIdentifier(req.query.schema_name) || "";
    const table_name = validateIdentifier(req.query.table_name) || "";
    const days = parseInt(req.query.days || "30", 10);
    const limit = validateLimit(req.query.limit, 1, 10000, 1000);

    const whereConditions = [];
    const params = [];
    let paramCount = 1;

    if (server_name) {
      whereConditions.push(`server_name = $${paramCount}`);
      params.push(server_name);
      paramCount++;
    }

    if (database_name) {
      whereConditions.push(`database_name = $${paramCount}`);
      params.push(database_name);
      paramCount++;
    }

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

    whereConditions.push(`snapshot_date >= NOW() - INTERVAL '${days} days'`);

    const whereClause =
      whereConditions.length > 0
        ? "WHERE " + whereConditions.join(" AND ")
        : "";

    const result = await pool.query(
      `
      SELECT 
        id,
        server_name,
        database_name,
        schema_name,
        table_name,
        snapshot_date,
        row_count,
        table_size_mb,
        health_score,
        health_status,
        fragmentation_pct,
        access_frequency
      FROM metadata.data_governance_catalog_mssql
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
    console.error("Error getting MSSQL governance history:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener historial de governance de MSSQL",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

router.get("/mssql/stats", async (req, res) => {
  try {
    const days = parseInt(req.query.days || "30", 10);
    const server_name = sanitizeSearch(req.query.server_name, 100);

    const whereConditions = [`snapshot_date >= NOW() - INTERVAL '${days} days'`];
    const params = [];

    if (server_name) {
      whereConditions.push(`server_name = $1`);
      params.push(server_name);
    }

    const whereClause = "WHERE " + whereConditions.join(" AND ");

    const result = await pool.query(
      `
      WITH latest_snapshots AS (
        SELECT DISTINCT ON (server_name, database_name, schema_name, table_name, object_type, object_name)
          *
        FROM metadata.data_governance_catalog_mssql
        ${whereClause}
        ORDER BY server_name, database_name, schema_name, table_name, object_type, object_name, snapshot_date DESC
      )
      SELECT 
        COUNT(*) as total_objects,
        COUNT(*) FILTER (WHERE health_status IN ('EXCELLENT', 'HEALTHY')) as healthy_count,
        COUNT(*) FILTER (WHERE health_status = 'WARNING') as warning_count,
        COUNT(*) FILTER (WHERE health_status = 'CRITICAL') as critical_count,
        ROUND(AVG(health_score)::numeric, 2) as avg_health_score,
        SUM(COALESCE(table_size_mb, 0)) as total_size_mb,
        SUM(COALESCE(row_count, 0)) as total_rows,
        COUNT(DISTINCT server_name) as server_count,
        COUNT(DISTINCT database_name) as database_count
      FROM latest_snapshots
    `,
      params
    );

    const serverStats = await pool.query(
      `
      WITH latest_snapshots AS (
        SELECT DISTINCT ON (server_name, database_name, schema_name, table_name, object_type, object_name)
          *
        FROM metadata.data_governance_catalog_mssql
        ${whereClause}
        ORDER BY server_name, database_name, schema_name, table_name, object_type, object_name, snapshot_date DESC
      )
      SELECT 
        server_name,
        COUNT(*) as object_count,
        COUNT(*) FILTER (WHERE health_status IN ('EXCELLENT', 'HEALTHY')) as healthy,
        COUNT(*) FILTER (WHERE health_status = 'WARNING') as warning,
        COUNT(*) FILTER (WHERE health_status = 'CRITICAL') as critical,
        ROUND(AVG(health_score)::numeric, 2) as avg_score
      FROM latest_snapshots
      GROUP BY server_name
      ORDER BY object_count DESC
    `,
      params
    );

    res.json({
      summary: result.rows[0],
      byServer: serverStats.rows,
    });
  } catch (err) {
    console.error("Error getting MSSQL governance stats:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener estadísticas de governance de MSSQL",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});
router.get("/governance-catalog/mssql/databases/:serverName",
  async (req, res) => {
    try {
      const serverName = req.params.serverName;
      const result = await pool.query(
        `
        SELECT DISTINCT database_name
        FROM metadata.data_governance_catalog_mssql
        WHERE server_name = $1 AND database_name IS NOT NULL
        ORDER BY database_name
      `,
        [serverName]
      );

      res.json(result.rows.map((row) => row.database_name));
    } catch (err) {
      console.error("Error getting MSSQL databases:", err);
      res.status(500).json({
        error: "Error al obtener bases de datos",
        error: sanitizeError(
          err,
          "Error en el servidor",
          process.env.NODE_ENV === "production"
        ),
      });
    }
  }
);

// MongoDB Lineage endpoints
router.get("/data-lineage/mongodb", async (req, res) => {
  try {
    const page = validatePage(req.query.page, 1);
    const limit = validateLimit(req.query.limit, 1, 100);
    const offset = (page - 1) * limit;
    const server_name = sanitizeSearch(req.query.server_name, 100);
    const database_name = sanitizeSearch(req.query.database_name, 100);
    const relationship_type = validateEnum(
      req.query.relationship_type,
      ["VIEW_DEPENDENCY", "COLLECTION_REFERENCE", ""],
      ""
    );
    const search = sanitizeSearch(req.query.search, 100);

    const whereConditions = [];
    const params = [];
    let paramCount = 1;

    if (server_name) {
      whereConditions.push(`server_name = $${paramCount}`);
      params.push(server_name);
      paramCount++;
    }

    if (database_name) {
      whereConditions.push(`database_name = $${paramCount}`);
      params.push(database_name);
      paramCount++;
    }

    if (relationship_type) {
      whereConditions.push(`relationship_type = $${paramCount}`);
      params.push(relationship_type);
      paramCount++;
    }

    if (search) {
      whereConditions.push(
        `(source_collection ILIKE $${paramCount} OR target_collection ILIKE $${paramCount})`
      );
      params.push(`%${search}%`);
      paramCount++;
    }

    const whereClause =
      whereConditions.length > 0
        ? "WHERE " + whereConditions.join(" AND ")
        : "";

    const countQuery = `SELECT COUNT(*) FROM metadata.mongo_lineage ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(limit, offset);
    const dataQuery = `
      SELECT *
      FROM metadata.mongo_lineage
      ${whereClause}
      ORDER BY dependency_level, confidence_score DESC, snapshot_date DESC
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
    console.error("Error getting MongoDB lineage data:", err);
    res.status(500).json({
      error: "Error al obtener datos de lineage de MongoDB",
      error: sanitizeError(
        err,
        "Error en el servidor",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});
router.get("/data-lineage/mongodb/metrics", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*)::bigint as total_relationships,
        (SELECT COUNT(DISTINCT col) FROM (
          SELECT source_collection as col FROM metadata.mongo_lineage WHERE source_collection IS NOT NULL
          UNION
          SELECT target_collection as col FROM metadata.mongo_lineage WHERE target_collection IS NOT NULL
        ) t)::bigint as unique_collections,
        COUNT(DISTINCT server_name)::bigint as unique_servers,
        COUNT(DISTINCT database_name) FILTER (WHERE database_name IS NOT NULL)::bigint as unique_databases,
        COUNT(DISTINCT schema_name) FILTER (WHERE schema_name IS NOT NULL)::bigint as unique_schemas,
        COUNT(DISTINCT relationship_type)::bigint as unique_relationship_types,
        COUNT(*) FILTER (WHERE confidence_score >= 0.8)::bigint as high_confidence,
        COUNT(*) FILTER (WHERE confidence_score < 0.5)::bigint as low_confidence,
        ROUND(AVG(confidence_score)::numeric, 4) as avg_confidence,
        ROUND(AVG(dependency_level) FILTER (WHERE dependency_level IS NOT NULL)::numeric, 2) as avg_dependency_level,
        MAX(dependency_level)::bigint as max_dependency_level,
        COUNT(*) FILTER (WHERE first_seen_at >= NOW() - INTERVAL '24 hours')::bigint as discovered_last_24h,
        COUNT(*) FILTER (WHERE first_seen_at >= NOW() - INTERVAL '7 days')::bigint as discovered_last_7d,
        COUNT(DISTINCT discovery_method)::bigint as unique_discovery_methods,
        COUNT(*) FILTER (WHERE consumer_type IS NOT NULL)::bigint as relationships_with_consumers
      FROM metadata.mongo_lineage
    `);

    res.json(result.rows[0] || {});
  } catch (err) {
    console.error("Error getting MongoDB lineage metrics:", err);
    res.status(500).json({
      error: "Error al obtener métricas de lineage de MongoDB",
      error: sanitizeError(
        err,
        "Error en el servidor",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});
router.get("/data-lineage/mongodb/stats", async (req, res) => {
  try {
    const [relationshipDist, objectTypeDist, confidenceDist, discoveryDist] = await Promise.all([
      pool.query(`
        SELECT 
          COALESCE(relationship_type, 'Unknown') as relationship_type,
          COUNT(*) as count
        FROM metadata.mongo_lineage
        GROUP BY relationship_type
        ORDER BY count DESC
      `),
      pool.query(`
        SELECT 
          COALESCE(object_type, 'Unknown') as object_type,
          COUNT(*) as count
        FROM metadata.mongo_lineage
        GROUP BY object_type
        ORDER BY count DESC
      `),
      pool.query(`
        SELECT 
          confidence_level,
          count
        FROM (
          SELECT 
            CASE 
              WHEN confidence_score >= 0.8 THEN 'High (≥0.8)'
              WHEN confidence_score >= 0.5 THEN 'Medium (0.5-0.8)'
              WHEN confidence_score IS NOT NULL THEN 'Low (<0.5)'
              ELSE 'Unknown'
            END as confidence_level,
            COUNT(*) as count
          FROM metadata.mongo_lineage
          GROUP BY 
            CASE 
              WHEN confidence_score >= 0.8 THEN 'High (≥0.8)'
              WHEN confidence_score >= 0.5 THEN 'Medium (0.5-0.8)'
              WHEN confidence_score IS NOT NULL THEN 'Low (<0.5)'
              ELSE 'Unknown'
            END
        ) subquery
        ORDER BY 
          CASE confidence_level
            WHEN 'High (≥0.8)' THEN 1
            WHEN 'Medium (0.5-0.8)' THEN 2
            WHEN 'Low (<0.5)' THEN 3
            WHEN 'Unknown' THEN 4
          END
      `),
      pool.query(`
        SELECT 
          COALESCE(discovery_method, 'Unknown') as discovery_method,
          COUNT(*) as count
        FROM metadata.mongo_lineage
        GROUP BY discovery_method
        ORDER BY count DESC
      `)
    ]);

    res.json({
      relationship_distribution: relationshipDist.rows,
      object_type_distribution: objectTypeDist.rows,
      confidence_distribution: confidenceDist.rows,
      discovery_method_distribution: discoveryDist.rows
    });
  } catch (err) {
    console.error("Error getting MongoDB lineage stats:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener estadísticas de lineage de MongoDB",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});
router.get("/data-lineage/mongodb/servers", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT server_name
      FROM metadata.mongo_lineage
      WHERE server_name IS NOT NULL
      ORDER BY server_name
    `);

    res.json(result.rows.map((row) => row.server_name));
  } catch (err) {
    console.error("Error getting MongoDB servers:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener servidores",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});
router.get("/data-lineage/mongodb/databases/:serverName", async (req, res) => {
  try {
    const serverName = sanitizeSearch(req.params.serverName, 100);
    if (!serverName) {
      return res.status(400).json({ error: "Invalid serverName" });
    }
    const result = await pool.query(
      `
        SELECT DISTINCT database_name
        FROM metadata.mongo_lineage
        WHERE server_name = $1 AND database_name IS NOT NULL
        ORDER BY database_name
      `,
      [serverName]
    );

    res.json(result.rows.map((row) => row.database_name));
  } catch (err) {
    console.error("Error getting MongoDB databases:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener bases de datos",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

// MongoDB Governance Catalog endpoints
router.get("/mongodb", async (req, res) => {
  try {
    const page = validatePage(req.query.page, 1);
    const limit = validateLimit(req.query.limit, 1, 100);
    const offset = (page - 1) * limit;
    const server_name = sanitizeSearch(req.query.server_name, 100);
    const database_name = sanitizeSearch(req.query.database_name, 100);
    const health_status = validateEnum(
      req.query.health_status,
      ["HEALTHY", "WARNING", "CRITICAL", ""],
      ""
    );
    const access_frequency = validateEnum(
      req.query.access_frequency,
      ["HIGH", "MEDIUM", "LOW", ""],
      ""
    );
    const search = sanitizeSearch(req.query.search, 100);

    const whereConditions = [];
    const params = [];
    let paramCount = 1;

    if (server_name) {
      whereConditions.push(`server_name = $${paramCount}`);
      params.push(server_name);
      paramCount++;
    }

    if (database_name) {
      whereConditions.push(`database_name = $${paramCount}`);
      params.push(database_name);
      paramCount++;
    }

    if (health_status) {
      whereConditions.push(`health_status = $${paramCount}`);
      params.push(health_status);
      paramCount++;
    }

    if (access_frequency) {
      whereConditions.push(`access_frequency = $${paramCount}`);
      params.push(access_frequency);
      paramCount++;
    }

    if (search) {
      whereConditions.push(`collection_name ILIKE $${paramCount}`);
      params.push(`%${search}%`);
      paramCount++;
    }

    const whereClause =
      whereConditions.length > 0
        ? "WHERE " + whereConditions.join(" AND ")
        : "";

    const countQuery = `SELECT COUNT(*) FROM metadata.data_governance_catalog_mongodb ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(limit, offset);
    const dataQuery = `
      SELECT *
      FROM metadata.data_governance_catalog_mongodb
      ${whereClause}
      ORDER BY server_name, database_name, collection_name, index_name
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
    console.error("Error getting MongoDB governance catalog:", err);
    res.status(500).json({
      error: "Error al obtener catálogo de governance de MongoDB",
      error: sanitizeError(
        err,
        "Error en el servidor",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});

router.get("/mongodb/metrics", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(DISTINCT collection_name) as total_collections,
        SUM(COALESCE(total_size_mb, 0)) as total_size_mb,
        SUM(COALESCE(document_count, 0)) as total_documents,
        COUNT(*) FILTER (WHERE health_status IN ('EXCELLENT', 'HEALTHY')) as healthy_count,
        COUNT(*) FILTER (WHERE health_status = 'WARNING') as warning_count,
        COUNT(*) FILTER (WHERE health_status = 'CRITICAL') as critical_count,
        COUNT(DISTINCT server_name) as unique_servers
      FROM metadata.data_governance_catalog_mongodb
    `);

    res.json(result.rows[0] || {});
  } catch (err) {
    console.error("Error getting MongoDB governance metrics:", err);
    res.status(500).json({
      error: "Error al obtener métricas de governance de MongoDB",
      error: sanitizeError(
        err,
        "Error en el servidor",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});

router.get("/mongodb/servers", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT server_name
      FROM metadata.data_governance_catalog_mongodb
      WHERE server_name IS NOT NULL
      ORDER BY server_name
    `);

    res.json(result.rows.map((row) => row.server_name));
  } catch (err) {
    console.error("Error getting MongoDB servers:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener servidores",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

router.get("/mongodb/history", async (req, res) => {
  try {
    const server_name = sanitizeSearch(req.query.server_name, 100);
    const database_name = validateIdentifier(req.query.database_name) || "";
    const collection_name = validateIdentifier(req.query.collection_name) || "";
    const days = parseInt(req.query.days || "30", 10);
    const limit = validateLimit(req.query.limit, 1, 10000, 1000);

    const whereConditions = [];
    const params = [];
    let paramCount = 1;

    if (server_name) {
      whereConditions.push(`server_name = $${paramCount}`);
      params.push(server_name);
      paramCount++;
    }

    if (database_name) {
      whereConditions.push(`database_name = $${paramCount}`);
      params.push(database_name);
      paramCount++;
    }

    if (collection_name) {
      whereConditions.push(`collection_name = $${paramCount}`);
      params.push(collection_name);
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
        server_name,
        database_name,
        collection_name,
        snapshot_date,
        document_count,
        storage_size_mb,
        index_size_mb,
        total_size_mb,
        health_score,
        health_status,
        access_frequency
      FROM metadata.data_governance_catalog_mongodb
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
    console.error("Error getting MongoDB governance history:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener historial de governance de MongoDB",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

router.get("/mongodb/stats", async (req, res) => {
  try {
    const days = parseInt(req.query.days || "30", 10);
    const server_name = sanitizeSearch(req.query.server_name, 100);

    const whereConditions = [`snapshot_date >= NOW() - INTERVAL '${days} days'`];
    const params = [];

    if (server_name) {
      whereConditions.push(`server_name = $1`);
      params.push(server_name);
    }

    const whereClause = "WHERE " + whereConditions.join(" AND ");

    const result = await pool.query(
      `
      WITH latest_snapshots AS (
        SELECT DISTINCT ON (server_name, database_name, collection_name, index_name)
          *
        FROM metadata.data_governance_catalog_mongodb
        ${whereClause}
        ORDER BY server_name, database_name, collection_name, index_name, snapshot_date DESC
      )
      SELECT 
        COUNT(DISTINCT collection_name) as total_collections,
        COUNT(*) FILTER (WHERE health_status IN ('EXCELLENT', 'HEALTHY')) as healthy_count,
        COUNT(*) FILTER (WHERE health_status = 'WARNING') as warning_count,
        COUNT(*) FILTER (WHERE health_status = 'CRITICAL') as critical_count,
        ROUND(AVG(health_score)::numeric, 2) as avg_health_score,
        SUM(COALESCE(total_size_mb, 0)) as total_size_mb,
        SUM(COALESCE(document_count, 0)) as total_documents,
        COUNT(DISTINCT server_name) as server_count,
        COUNT(DISTINCT database_name) as database_count
      FROM latest_snapshots
    `,
      params
    );

    const serverStats = await pool.query(
      `
      WITH latest_snapshots AS (
        SELECT DISTINCT ON (server_name, database_name, collection_name, index_name)
          *
        FROM metadata.data_governance_catalog_mongodb
        ${whereClause}
        ORDER BY server_name, database_name, collection_name, index_name, snapshot_date DESC
      )
      SELECT 
        server_name,
        COUNT(DISTINCT collection_name) as collection_count,
        COUNT(*) FILTER (WHERE health_status IN ('EXCELLENT', 'HEALTHY')) as healthy,
        COUNT(*) FILTER (WHERE health_status = 'WARNING') as warning,
        COUNT(*) FILTER (WHERE health_status = 'CRITICAL') as critical,
        ROUND(AVG(health_score)::numeric, 2) as avg_score
      FROM latest_snapshots
      GROUP BY server_name
      ORDER BY collection_count DESC
    `,
      params
    );

    res.json({
      summary: result.rows[0],
      byServer: serverStats.rows,
    });
  } catch (err) {
    console.error("Error getting MongoDB governance stats:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener estadísticas de governance de MongoDB",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});
router.get("/governance-catalog/mongodb/databases/:serverName",
  async (req, res) => {
    try {
      const serverName = req.params.serverName;
      const result = await pool.query(
        `
        SELECT DISTINCT database_name
        FROM metadata.data_governance_catalog_mongodb
        WHERE server_name = $1 AND database_name IS NOT NULL
        ORDER BY database_name
      `,
        [serverName]
      );

      res.json(result.rows.map((row) => row.database_name));
    } catch (err) {
      console.error("Error getting MongoDB databases:", err);
      res.status(500).json({
        error: "Error al obtener bases de datos",
        error: sanitizeError(
          err,
          "Error en el servidor",
          process.env.NODE_ENV === "production"
        ),
      });
    }
  }
);

// Oracle Lineage endpoints
router.get("/data-lineage/oracle", async (req, res) => {
  try {
    const page = validatePage(req.query.page, 1);
    const limit = validateLimit(req.query.limit, 1, 100);
    const offset = (page - 1) * limit;
    const server_name = sanitizeSearch(req.query.server_name, 100);
    const schema_name = validateIdentifier(req.query.schema_name) || "";
    const relationship_type = validateEnum(
      req.query.relationship_type,
      ["FOREIGN_KEY", "VIEW_DEPENDENCY", "TRIGGER_DEPENDENCY", ""],
      ""
    );
    const search = sanitizeSearch(req.query.search, 100);

    const whereConditions = [];
    const params = [];
    let paramCount = 1;

    if (server_name) {
      whereConditions.push(`server_name = $${paramCount}`);
      params.push(server_name);
      paramCount++;
    }

    if (schema_name) {
      whereConditions.push(`schema_name = $${paramCount}`);
      params.push(schema_name);
      paramCount++;
    }

    if (relationship_type) {
      whereConditions.push(`relationship_type = $${paramCount}`);
      params.push(relationship_type);
      paramCount++;
    }

    if (search) {
      whereConditions.push(
        `(object_name ILIKE $${paramCount} OR target_object_name ILIKE $${paramCount})`
      );
      params.push(`%${search}%`);
      paramCount++;
    }

    const whereClause =
      whereConditions.length > 0
        ? "WHERE " + whereConditions.join(" AND ")
        : "";

    const countQuery = `SELECT COUNT(*) FROM metadata.oracle_lineage ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(limit, offset);
    const dataQuery = `
      SELECT *
      FROM metadata.oracle_lineage
      ${whereClause}
      ORDER BY confidence_score DESC, last_seen_at DESC
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
    console.error("Error getting Oracle lineage data:", err);
    res.status(500).json({
      error: "Error al obtener datos de lineage de Oracle",
      error: sanitizeError(
        err,
        "Error en el servidor",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});
router.get("/data-lineage/oracle/metrics", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*)::bigint as total_relationships,
        (SELECT COUNT(DISTINCT col) FROM (
          SELECT object_name as col FROM metadata.oracle_lineage WHERE object_name IS NOT NULL
          UNION
          SELECT target_object_name as col FROM metadata.oracle_lineage WHERE target_object_name IS NOT NULL
        ) t)::bigint as unique_objects,
        COUNT(DISTINCT server_name)::bigint as unique_servers,
        COUNT(DISTINCT schema_name) FILTER (WHERE schema_name IS NOT NULL)::bigint as unique_schemas,
        COUNT(DISTINCT relationship_type)::bigint as unique_relationship_types,
        COUNT(*) FILTER (WHERE confidence_score >= 0.8)::bigint as high_confidence,
        COUNT(*) FILTER (WHERE confidence_score < 0.5)::bigint as low_confidence,
        ROUND(AVG(confidence_score)::numeric, 4) as avg_confidence,
        ROUND(AVG(dependency_level) FILTER (WHERE dependency_level IS NOT NULL)::numeric, 2) as avg_dependency_level,
        MAX(dependency_level)::bigint as max_dependency_level,
        COUNT(*) FILTER (WHERE first_seen_at >= NOW() - INTERVAL '24 hours')::bigint as discovered_last_24h,
        COUNT(*) FILTER (WHERE first_seen_at >= NOW() - INTERVAL '7 days')::bigint as discovered_last_7d,
        COUNT(DISTINCT discovery_method) FILTER (WHERE discovery_method IS NOT NULL)::bigint as unique_discovery_methods
      FROM metadata.oracle_lineage
    `);

    res.json(result.rows[0] || {});
  } catch (err) {
    console.error("Error getting Oracle lineage metrics:", err);
    res.status(500).json({
      error: "Error al obtener métricas de lineage de Oracle",
      error: sanitizeError(
        err,
        "Error en el servidor",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});
router.get("/data-lineage/oracle/stats", async (req, res) => {
  try {
    const [relationshipDist, objectTypeDist, confidenceDist, discoveryDist] = await Promise.all([
      pool.query(`
        SELECT 
          COALESCE(relationship_type, 'Unknown') as relationship_type,
          COUNT(*) as count
        FROM metadata.oracle_lineage
        GROUP BY relationship_type
        ORDER BY count DESC
      `),
      pool.query(`
        SELECT 
          COALESCE(object_type, 'Unknown') as object_type,
          COUNT(*) as count
        FROM metadata.oracle_lineage
        GROUP BY object_type
        ORDER BY count DESC
      `),
      pool.query(`
        SELECT 
          confidence_level,
          count
        FROM (
          SELECT 
            CASE 
              WHEN confidence_score >= 0.8 THEN 'High (≥0.8)'
              WHEN confidence_score >= 0.5 THEN 'Medium (0.5-0.8)'
              WHEN confidence_score IS NOT NULL THEN 'Low (<0.5)'
              ELSE 'Unknown'
            END as confidence_level,
            COUNT(*) as count
          FROM metadata.oracle_lineage
          GROUP BY 
            CASE 
              WHEN confidence_score >= 0.8 THEN 'High (≥0.8)'
              WHEN confidence_score >= 0.5 THEN 'Medium (0.5-0.8)'
              WHEN confidence_score IS NOT NULL THEN 'Low (<0.5)'
              ELSE 'Unknown'
            END
        ) subquery
        ORDER BY 
          CASE confidence_level
            WHEN 'High (≥0.8)' THEN 1
            WHEN 'Medium (0.5-0.8)' THEN 2
            WHEN 'Low (<0.5)' THEN 3
            WHEN 'Unknown' THEN 4
          END
      `),
      pool.query(`
        SELECT 
          COALESCE(discovery_method, 'Unknown') as discovery_method,
          COUNT(*) as count
        FROM metadata.oracle_lineage
        GROUP BY discovery_method
        ORDER BY count DESC
      `)
    ]);

    res.json({
      relationship_distribution: relationshipDist.rows,
      object_type_distribution: objectTypeDist.rows,
      confidence_distribution: confidenceDist.rows,
      discovery_method_distribution: discoveryDist.rows
    });
  } catch (err) {
    console.error("Error getting Oracle lineage stats:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener estadísticas de lineage de Oracle",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});
router.get("/data-lineage/oracle/servers", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT server_name
      FROM metadata.oracle_lineage
      WHERE server_name IS NOT NULL
      ORDER BY server_name
    `);

    res.json(result.rows.map((row) => row.server_name));
  } catch (err) {
    console.error("Error getting Oracle servers:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener servidores",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});
router.get("/data-lineage/oracle/schemas/:serverName", async (req, res) => {
  try {
    const serverName = sanitizeSearch(req.params.serverName, 100);
    if (!serverName) {
      return res.status(400).json({ error: "Invalid serverName" });
    }
    const result = await pool.query(
      `
        SELECT DISTINCT schema_name
        FROM metadata.oracle_lineage
        WHERE server_name = $1 AND schema_name IS NOT NULL
        ORDER BY schema_name
      `,
      [serverName]
    );

    res.json(result.rows.map((row) => row.schema_name));
  } catch (err) {
    console.error("Error getting Oracle schemas:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener schemas de Oracle",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

// Oracle Governance Catalog endpoints
router.get("/oracle", async (req, res) => {
  try {
    const page = validatePage(req.query.page, 1);
    const limit = validateLimit(req.query.limit, 1, 100);
    const offset = (page - 1) * limit;
    const server_name = sanitizeSearch(req.query.server_name, 100);
    const schema_name = validateIdentifier(req.query.schema_name) || "";
    const health_status = validateEnum(
      req.query.health_status,
      ["HEALTHY", "WARNING", "CRITICAL", "EXCELLENT", ""],
      ""
    );
    const access_frequency = validateEnum(
      req.query.access_frequency,
      ["HIGH", "MEDIUM", "LOW", ""],
      ""
    );
    const search = sanitizeSearch(req.query.search, 100);

    const whereConditions = [];
    const params = [];
    let paramCount = 1;

    if (server_name) {
      whereConditions.push(`server_name = $${paramCount}`);
      params.push(server_name);
      paramCount++;
    }

    if (schema_name) {
      whereConditions.push(`schema_name = $${paramCount}`);
      params.push(schema_name);
      paramCount++;
    }

    if (health_status) {
      whereConditions.push(`health_status = $${paramCount}`);
      params.push(health_status);
      paramCount++;
    }

    if (access_frequency) {
      whereConditions.push(`access_frequency = $${paramCount}`);
      params.push(access_frequency);
      paramCount++;
    }

    if (search) {
      whereConditions.push(
        `(table_name ILIKE $${paramCount} OR schema_name ILIKE $${paramCount})`
      );
      params.push(`%${search}%`);
      paramCount++;
    }

    const whereClause =
      whereConditions.length > 0
        ? "WHERE " + whereConditions.join(" AND ")
        : "";

    const countQuery = `SELECT COUNT(*) FROM metadata.data_governance_catalog_oracle ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(limit, offset);
    const dataQuery = `
      SELECT *
      FROM metadata.data_governance_catalog_oracle
      ${whereClause}
      ORDER BY health_score DESC NULLS LAST, table_name
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
    console.error("Error getting Oracle governance catalog:", err);
    res.status(500).json({
      error: "Error al obtener datos de governance de Oracle",
      error: sanitizeError(
        err,
        "Error en el servidor",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});

router.get("/oracle/metrics", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(DISTINCT CASE WHEN index_name IS NULL THEN table_name END) as total_tables,
        SUM(COALESCE(total_size_mb, 0)) as total_size_mb,
        SUM(COALESCE(row_count, 0)) as total_rows,
        COUNT(*) FILTER (WHERE health_status IN ('EXCELLENT', 'HEALTHY')) as healthy_count,
        COUNT(*) FILTER (WHERE health_status = 'WARNING') as warning_count,
        COUNT(*) FILTER (WHERE health_status = 'CRITICAL') as critical_count,
        COUNT(DISTINCT server_name) as unique_servers
      FROM metadata.data_governance_catalog_oracle
    `);

    res.json(result.rows[0] || {});
  } catch (err) {
    console.error("Error getting Oracle governance metrics:", err);
    res.status(500).json({
      error: "Error al obtener métricas de governance de Oracle",
      error: sanitizeError(
        err,
        "Error en el servidor",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});

router.get("/oracle/servers", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT server_name
      FROM metadata.data_governance_catalog_oracle
      WHERE server_name IS NOT NULL
      ORDER BY server_name
    `);

    res.json(result.rows.map((row) => row.server_name));
  } catch (err) {
    console.error("Error getting Oracle servers:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener servidores",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

router.get("/oracle/history", async (req, res) => {
  try {
    const server_name = sanitizeSearch(req.query.server_name, 100);
    const schema_name = validateIdentifier(req.query.schema_name) || "";
    const table_name = validateIdentifier(req.query.table_name) || "";
    const days = parseInt(req.query.days || "30", 10);
    const limit = validateLimit(req.query.limit, 1, 10000, 1000);

    const whereConditions = [];
    const params = [];
    let paramCount = 1;

    if (server_name) {
      whereConditions.push(`server_name = $${paramCount}`);
      params.push(server_name);
      paramCount++;
    }

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

    whereConditions.push(`snapshot_date >= NOW() - INTERVAL '${days} days'`);

    const whereClause =
      whereConditions.length > 0
        ? "WHERE " + whereConditions.join(" AND ")
        : "";

    const result = await pool.query(
      `
      SELECT 
        id,
        server_name,
        schema_name,
        table_name,
        snapshot_date,
        row_count,
        table_size_mb,
        index_size_mb,
        total_size_mb,
        health_score,
        health_status,
        fragmentation_pct,
        access_frequency
      FROM metadata.data_governance_catalog_oracle
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
    console.error("Error getting Oracle governance history:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener historial de governance de Oracle",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

router.get("/oracle/stats", async (req, res) => {
  try {
    const days = parseInt(req.query.days || "30", 10);
    const server_name = sanitizeSearch(req.query.server_name, 100);

    const whereConditions = [`snapshot_date >= NOW() - INTERVAL '${days} days'`];
    const params = [];

    if (server_name) {
      whereConditions.push(`server_name = $1`);
      params.push(server_name);
    }

    const whereClause = "WHERE " + whereConditions.join(" AND ");

    const result = await pool.query(
      `
      WITH latest_snapshots AS (
        SELECT DISTINCT ON (server_name, schema_name, table_name)
          *
        FROM metadata.data_governance_catalog_oracle
        ${whereClause}
        ORDER BY server_name, schema_name, table_name, snapshot_date DESC
      )
      SELECT 
        COUNT(*) as total_tables,
        COUNT(*) FILTER (WHERE health_status IN ('EXCELLENT', 'HEALTHY')) as healthy_count,
        COUNT(*) FILTER (WHERE health_status = 'WARNING') as warning_count,
        COUNT(*) FILTER (WHERE health_status = 'CRITICAL') as critical_count,
        ROUND(AVG(health_score)::numeric, 2) as avg_health_score,
        SUM(COALESCE(total_size_mb, 0)) as total_size_mb,
        SUM(COALESCE(row_count, 0)) as total_rows,
        COUNT(DISTINCT server_name) as server_count,
        COUNT(DISTINCT schema_name) as schema_count
      FROM latest_snapshots
    `,
      params
    );

    const serverStats = await pool.query(
      `
      WITH latest_snapshots AS (
        SELECT DISTINCT ON (server_name, schema_name, table_name)
          *
        FROM metadata.data_governance_catalog_oracle
        ${whereClause}
        ORDER BY server_name, schema_name, table_name, snapshot_date DESC
      )
      SELECT 
        server_name,
        COUNT(*) as table_count,
        COUNT(*) FILTER (WHERE health_status IN ('EXCELLENT', 'HEALTHY')) as healthy,
        COUNT(*) FILTER (WHERE health_status = 'WARNING') as warning,
        COUNT(*) FILTER (WHERE health_status = 'CRITICAL') as critical,
        ROUND(AVG(health_score)::numeric, 2) as avg_score
      FROM latest_snapshots
      GROUP BY server_name
      ORDER BY table_count DESC
    `,
      params
    );

    res.json({
      summary: result.rows[0],
      byServer: serverStats.rows,
    });
  } catch (err) {
    console.error("Error getting Oracle governance stats:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener estadísticas de governance de Oracle",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

router.get("/oracle/schemas/:serverName", async (req, res) => {
  try {
    const serverName = req.params.serverName;
    const result = await pool.query(
      `
        SELECT DISTINCT schema_name
        FROM metadata.data_governance_catalog_oracle
        WHERE server_name = $1 AND schema_name IS NOT NULL
        ORDER BY schema_name
      `,
      [serverName]
    );

    res.json(result.rows.map((row) => row.schema_name));
  } catch (err) {
    console.error("Error getting Oracle schemas:", err);
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


// Oracle Governance Catalog endpoints
router.get("/governance-catalog/oracle", async (req, res) => {
  try {
    const page = validatePage(req.query.page, 1);
    const limit = validateLimit(req.query.limit, 1, 100);
    const offset = (page - 1) * limit;
    const server_name = sanitizeSearch(req.query.server_name, 100);
    const schema_name = validateIdentifier(req.query.schema_name) || "";
    const health_status = validateEnum(
      req.query.health_status,
      ["HEALTHY", "WARNING", "CRITICAL", "EXCELLENT", ""],
      ""
    );
    const access_frequency = validateEnum(
      req.query.access_frequency,
      ["HIGH", "MEDIUM", "LOW", ""],
      ""
    );
    const search = sanitizeSearch(req.query.search, 100);

    const whereConditions = [];
    const params = [];
    let paramCount = 1;

    if (server_name) {
      whereConditions.push(`server_name = $${paramCount}`);
      params.push(server_name);
      paramCount++;
    }

    if (schema_name) {
      whereConditions.push(`schema_name = $${paramCount}`);
      params.push(schema_name);
      paramCount++;
    }

    if (health_status) {
      whereConditions.push(`health_status = $${paramCount}`);
      params.push(health_status);
      paramCount++;
    }

    if (access_frequency) {
      whereConditions.push(`access_frequency = $${paramCount}`);
      params.push(access_frequency);
      paramCount++;
    }

    if (search) {
      whereConditions.push(
        `(table_name ILIKE $${paramCount} OR schema_name ILIKE $${paramCount})`
      );
      params.push(`%${search}%`);
      paramCount++;
    }

    const whereClause =
      whereConditions.length > 0
        ? "WHERE " + whereConditions.join(" AND ")
        : "";

    const countQuery = `SELECT COUNT(*) FROM metadata.data_governance_catalog_oracle ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(limit, offset);
    const dataQuery = `
      SELECT *
      FROM metadata.data_governance_catalog_oracle
      ${whereClause}
      ORDER BY health_score DESC NULLS LAST, table_name
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
    console.error("Error getting Oracle governance catalog:", err);
    res.status(500).json({
      error: "Error al obtener datos de governance de Oracle",
      error: sanitizeError(
        err,
        "Error en el servidor",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});

export default router;
