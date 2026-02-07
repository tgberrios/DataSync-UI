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
    const object_type = validateEnum(
      req.query.object_type,
      ["TABLE", "VIEW", "PROCEDURE", "FUNCTION", ""],
      ""
    );
    const relationship_type = validateEnum(
      req.query.relationship_type,
      ["FOREIGN_KEY", "VIEW_DEPENDENCY", "PROCEDURE_DEPENDENCY", ""],
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

    const countQuery = `SELECT COUNT(*) FROM metadata.mdb_lineage ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(limit, offset);
    const dataQuery = `
      SELECT *
      FROM metadata.mdb_lineage
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
    console.error("Error getting MariaDB lineage data:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener datos de lineage de MariaDB",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

router.get("/mariadb/metrics", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*)::bigint as total_relationships,
        COUNT(DISTINCT object_name)::bigint as unique_objects,
        COUNT(DISTINCT server_name)::bigint as unique_servers,
        COUNT(DISTINCT database_name) FILTER (WHERE database_name IS NOT NULL)::bigint as unique_databases,
        COUNT(DISTINCT schema_name) FILTER (WHERE schema_name IS NOT NULL)::bigint as unique_schemas,
        COUNT(DISTINCT relationship_type)::bigint as unique_relationship_types,
        COUNT(*) FILTER (WHERE confidence_score >= 0.8)::bigint as high_confidence,
        COUNT(*) FILTER (WHERE confidence_score < 0.5)::bigint as low_confidence,
        ROUND(AVG(confidence_score)::numeric, 4) as avg_confidence,
        ROUND(AVG(dependency_level)::numeric, 2) as avg_dependency_level,
        MAX(dependency_level)::bigint as max_dependency_level,
        COUNT(*) FILTER (WHERE first_seen_at >= NOW() - INTERVAL '24 hours')::bigint as discovered_last_24h,
        COUNT(*) FILTER (WHERE first_seen_at >= NOW() - INTERVAL '7 days')::bigint as discovered_last_7d,
        COUNT(DISTINCT discovery_method)::bigint as unique_discovery_methods,
        COUNT(*) FILTER (WHERE consumer_type IS NOT NULL)::bigint as relationships_with_consumers
      FROM metadata.mdb_lineage
    `);

    res.json(result.rows[0] || {});
  } catch (err) {
    console.error("Error getting MariaDB lineage metrics:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener métricas de lineage de MariaDB",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

router.get("/mariadb/stats", async (req, res) => {
  try {
    const [relationshipDist, objectTypeDist, confidenceDist, discoveryDist] = await Promise.all([
      pool.query(`
        SELECT 
          COALESCE(relationship_type, 'Unknown') as relationship_type,
          COUNT(*) as count
        FROM metadata.mdb_lineage
        GROUP BY relationship_type
        ORDER BY count DESC
      `),
      pool.query(`
        SELECT 
          COALESCE(object_type, 'Unknown') as object_type,
          COUNT(*) as count
        FROM metadata.mdb_lineage
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
          FROM metadata.mdb_lineage
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
        FROM metadata.mdb_lineage
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
    console.error("Error getting MariaDB lineage stats:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener estadísticas de lineage de MariaDB",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

router.get("/mariadb/servers", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT server_name
      FROM metadata.mdb_lineage
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

router.get("/mariadb/databases/:serverName", async (req, res) => {
  try {
    const serverName = req.params.serverName;
    const result = await pool.query(
      `
        SELECT DISTINCT database_name
        FROM metadata.mdb_lineage
        WHERE server_name = $1 AND database_name IS NOT NULL
        ORDER BY database_name
      `,
      [serverName]
    );

    res.json(result.rows.map((row) => row.database_name));
  } catch (err) {
    console.error("Error getting MariaDB databases:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener bases de datos",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

router.get("/mssql", async (req, res) => {
  try {
    const page = validatePage(req.query.page, 1);
    const limit = validateLimit(req.query.limit, 1, 100);
    const offset = (page - 1) * limit;
    const server_name = sanitizeSearch(req.query.server_name, 100);
    const instance_name = sanitizeSearch(req.query.instance_name, 100);
    const database_name = sanitizeSearch(req.query.database_name, 100);
    const object_type = validateEnum(
      req.query.object_type,
      ["TABLE", "VIEW", "PROCEDURE", "FUNCTION", ""],
      ""
    );
    const relationship_type = validateEnum(
      req.query.relationship_type,
      ["FOREIGN_KEY", "VIEW_DEPENDENCY", "PROCEDURE_DEPENDENCY", ""],
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

    if (instance_name) {
      whereConditions.push(`instance_name = $${paramCount}`);
      params.push(instance_name);
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

    const countQuery = `SELECT COUNT(*) FROM metadata.mssql_lineage ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(limit, offset);
    const dataQuery = `
      SELECT *
      FROM metadata.mssql_lineage
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
    console.error("Error getting MSSQL lineage data:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener datos de lineage de MSSQL",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

router.get("/mssql/metrics", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*)::bigint as total_relationships,
        COUNT(DISTINCT object_name)::bigint as unique_objects,
        COUNT(DISTINCT server_name)::bigint as unique_servers,
        COUNT(DISTINCT instance_name) FILTER (WHERE instance_name IS NOT NULL)::bigint as unique_instances,
        COUNT(DISTINCT database_name) FILTER (WHERE database_name IS NOT NULL)::bigint as unique_databases,
        COUNT(DISTINCT schema_name) FILTER (WHERE schema_name IS NOT NULL)::bigint as unique_schemas,
        COUNT(DISTINCT relationship_type)::bigint as unique_relationship_types,
        COUNT(*) FILTER (WHERE confidence_score >= 0.8)::bigint as high_confidence,
        COUNT(*) FILTER (WHERE confidence_score < 0.5)::bigint as low_confidence,
        ROUND(AVG(confidence_score)::numeric, 4) as avg_confidence,
        ROUND(AVG(dependency_level) FILTER (WHERE dependency_level IS NOT NULL)::numeric, 2) as avg_dependency_level,
        MAX(dependency_level)::bigint as max_dependency_level,
        SUM(COALESCE(execution_count, 0))::bigint as total_executions,
        ROUND(AVG(avg_duration_ms) FILTER (WHERE avg_duration_ms IS NOT NULL)::numeric, 2) as avg_duration_ms,
        ROUND(AVG(avg_cpu_ms) FILTER (WHERE avg_cpu_ms IS NOT NULL)::numeric, 2) as avg_cpu_ms,
        COUNT(*) FILTER (WHERE first_seen_at >= NOW() - INTERVAL '24 hours')::bigint as discovered_last_24h,
        COUNT(*) FILTER (WHERE first_seen_at >= NOW() - INTERVAL '7 days')::bigint as discovered_last_7d,
        COUNT(DISTINCT discovery_method)::bigint as unique_discovery_methods,
        COUNT(*) FILTER (WHERE consumer_type IS NOT NULL)::bigint as relationships_with_consumers
      FROM metadata.mssql_lineage
    `);

    res.json(result.rows[0] || {});
  } catch (err) {
    console.error("Error getting MSSQL lineage metrics:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener métricas de lineage de MSSQL",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

router.get("/mssql/stats", async (req, res) => {
  try {
    const [relationshipDist, objectTypeDist, confidenceDist, discoveryDist] = await Promise.all([
      pool.query(`
        SELECT 
          COALESCE(relationship_type, 'Unknown') as relationship_type,
          COUNT(*) as count
        FROM metadata.mssql_lineage
        GROUP BY relationship_type
        ORDER BY count DESC
      `),
      pool.query(`
        SELECT 
          COALESCE(object_type, 'Unknown') as object_type,
          COUNT(*) as count
        FROM metadata.mssql_lineage
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
          FROM metadata.mssql_lineage
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
        FROM metadata.mssql_lineage
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
    console.error("Error getting MSSQL lineage stats:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener estadísticas de lineage de MSSQL",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

router.get("/mssql/servers", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT server_name
      FROM metadata.mssql_lineage
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

router.get("/mssql/instances/:serverName", async (req, res) => {
  try {
    const serverName = sanitizeSearch(req.params.serverName, 100);
    if (!serverName) {
      return res.status(400).json({ error: "Invalid serverName" });
    }
    const result = await pool.query(
      `
        SELECT DISTINCT instance_name
        FROM metadata.mssql_lineage
        WHERE server_name = $1 AND instance_name IS NOT NULL
        ORDER BY instance_name
      `,
      [serverName]
    );

    res.json(result.rows.map((row) => row.instance_name));
  } catch (err) {
    console.error("Error getting MSSQL instances:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener instancias",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

// --- MongoDB lineage (metadata.mongo_lineage) ---
router.get("/mongodb", async (req, res) => {
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
    const safeError = sanitizeError(
      err,
      "Error al obtener datos de lineage de MongoDB",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

router.get("/mongodb/metrics", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*)::bigint as total_relationships,
        (SELECT COUNT(DISTINCT col) FROM (
          SELECT source_collection as col FROM metadata.mongo_lineage WHERE source_collection IS NOT NULL
          UNION
          SELECT target_collection as col FROM metadata.mongo_lineage WHERE target_collection IS NOT NULL
        ) t)::bigint as unique_objects,
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
    const safeError = sanitizeError(
      err,
      "Error al obtener métricas de lineage de MongoDB",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

router.get("/mongodb/stats", async (req, res) => {
  try {
    const [relationshipDist, objectTypeDist, confidenceDist, discoveryDist] = await Promise.all([
      pool.query(`
        SELECT COALESCE(relationship_type, 'Unknown') as relationship_type, COUNT(*) as count
        FROM metadata.mongo_lineage
        GROUP BY relationship_type
        ORDER BY count DESC
      `),
      pool.query(`
        SELECT COALESCE(object_type, 'Unknown') as object_type, COUNT(*) as count
        FROM metadata.mongo_lineage
        GROUP BY object_type
        ORDER BY count DESC
      `),
      pool.query(`
        SELECT confidence_level, count FROM (
          SELECT 
            CASE 
              WHEN confidence_score >= 0.8 THEN 'High (≥0.8)'
              WHEN confidence_score >= 0.5 THEN 'Medium (0.5-0.8)'
              WHEN confidence_score IS NOT NULL THEN 'Low (<0.5)'
              ELSE 'Unknown'
            END as confidence_level,
            COUNT(*) as count
          FROM metadata.mongo_lineage
          GROUP BY CASE 
            WHEN confidence_score >= 0.8 THEN 'High (≥0.8)'
            WHEN confidence_score >= 0.5 THEN 'Medium (0.5-0.8)'
            WHEN confidence_score IS NOT NULL THEN 'Low (<0.5)'
            ELSE 'Unknown'
          END
        ) subquery
        ORDER BY CASE confidence_level
          WHEN 'High (≥0.8)' THEN 1
          WHEN 'Medium (0.5-0.8)' THEN 2
          WHEN 'Low (<0.5)' THEN 3
          WHEN 'Unknown' THEN 4
        END
      `),
      pool.query(`
        SELECT COALESCE(discovery_method, 'Unknown') as discovery_method, COUNT(*) as count
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

router.get("/mongodb/servers", async (req, res) => {
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

router.get("/mongodb/databases/:serverName", async (req, res) => {
  try {
    const serverName = sanitizeSearch(req.params.serverName, 100);
    if (!serverName) {
      return res.status(400).json({ error: "Invalid serverName" });
    }
    const result = await pool.query(
      `SELECT DISTINCT database_name
       FROM metadata.mongo_lineage
       WHERE server_name = $1 AND database_name IS NOT NULL
       ORDER BY database_name`,
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

// --- Oracle lineage (metadata.oracle_lineage) ---
router.get("/oracle", async (req, res) => {
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
    const safeError = sanitizeError(
      err,
      "Error al obtener datos de lineage de Oracle",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

router.get("/oracle/metrics", async (req, res) => {
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
    const safeError = sanitizeError(
      err,
      "Error al obtener métricas de lineage de Oracle",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

router.get("/oracle/stats", async (req, res) => {
  try {
    const [relationshipDist, objectTypeDist, confidenceDist, discoveryDist] = await Promise.all([
      pool.query(`
        SELECT COALESCE(relationship_type, 'Unknown') as relationship_type, COUNT(*) as count
        FROM metadata.oracle_lineage
        GROUP BY relationship_type
        ORDER BY count DESC
      `),
      pool.query(`
        SELECT COALESCE(object_type, 'Unknown') as object_type, COUNT(*) as count
        FROM metadata.oracle_lineage
        GROUP BY object_type
        ORDER BY count DESC
      `),
      pool.query(`
        SELECT confidence_level, count FROM (
          SELECT 
            CASE 
              WHEN confidence_score >= 0.8 THEN 'High (≥0.8)'
              WHEN confidence_score >= 0.5 THEN 'Medium (0.5-0.8)'
              WHEN confidence_score IS NOT NULL THEN 'Low (<0.5)'
              ELSE 'Unknown'
            END as confidence_level,
            COUNT(*) as count
          FROM metadata.oracle_lineage
          GROUP BY CASE 
            WHEN confidence_score >= 0.8 THEN 'High (≥0.8)'
            WHEN confidence_score >= 0.5 THEN 'Medium (0.5-0.8)'
            WHEN confidence_score IS NOT NULL THEN 'Low (<0.5)'
            ELSE 'Unknown'
          END
        ) subquery
        ORDER BY CASE confidence_level
          WHEN 'High (≥0.8)' THEN 1
          WHEN 'Medium (0.5-0.8)' THEN 2
          WHEN 'Low (<0.5)' THEN 3
          WHEN 'Unknown' THEN 4
        END
      `),
      pool.query(`
        SELECT COALESCE(discovery_method, 'Unknown') as discovery_method, COUNT(*) as count
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

router.get("/oracle/servers", async (req, res) => {
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

router.get("/oracle/schemas/:serverName", async (req, res) => {
  try {
    const serverName = sanitizeSearch(req.params.serverName, 100);
    if (!serverName) {
      return res.status(400).json({ error: "Invalid serverName" });
    }
    const result = await pool.query(
      `SELECT DISTINCT schema_name
       FROM metadata.oracle_lineage
       WHERE server_name = $1 AND schema_name IS NOT NULL
       ORDER BY schema_name`,
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

router.get("/data-lineage/mssql/databases/:serverName/:instanceName",
  async (req, res) => {
    try {
      const serverName = req.params.serverName;
      const instanceName = req.params.instanceName;
      const result = await pool.query(
        `
        SELECT DISTINCT database_name
        FROM metadata.mssql_lineage
        WHERE server_name = $1 AND instance_name = $2 AND database_name IS NOT NULL
        ORDER BY database_name
      `,
        [serverName, instanceName]
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

export default router;
