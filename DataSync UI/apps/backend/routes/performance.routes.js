import express from "express";
import { pool } from "../services/database.service.js";
import { sanitizeError } from "../server-utils/errorHandler.js";
import { requireAuth, requireRole } from "../server-utils/auth.js";

const router = express.Router();

router.get("/partitioning/config", requireAuth, async (req, res) => {
  try {
    const { schema, table } = req.query;
    if (!schema || !table) {
      return res.status(400).json({ error: "schema and table parameters required" });
    }

    const result = await pool.query(
      `SELECT * FROM metadata.table_partitions 
       WHERE schema_name = $1 AND table_name = $2 
       ORDER BY created_at DESC LIMIT 1`,
      [schema, table]
    );

    if (result.rows.length === 0) {
      return res.json(null);
    }

    res.json(result.rows[0]);
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting partitioning config", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

router.put("/partitioning/config", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const { schema_name, table_name, partition_name, partition_column, partition_type, partition_value, partition_format } = req.body;

    await pool.query(
      `INSERT INTO metadata.table_partitions 
       (schema_name, table_name, partition_name, partition_column, partition_type, partition_value, partition_format)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (schema_name, table_name, partition_name) 
       DO UPDATE SET partition_value = $6, partition_format = $7, last_modified = NOW()`,
      [schema_name, table_name, partition_name, partition_column, partition_type, partition_value, partition_format]
    );

    res.json({ success: true, message: "Partitioning configuration updated" });
  } catch (err) {
    const safeError = sanitizeError(err, "Error updating partitioning config", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

router.get("/partitioning/stats", requireAuth, async (req, res) => {
  try {
    const { schema, table } = req.query;
    let query = `SELECT 
      COUNT(*) as total_partitions,
      SUM(row_count) as total_rows,
      SUM(size_bytes) as total_size_bytes
      FROM metadata.table_partitions`;
    const params = [];

    if (schema && table) {
      query += ` WHERE schema_name = $1 AND table_name = $2`;
      params.push(schema, table);
    }

    const result = await pool.query(query, params);
    res.json(result.rows[0] || { total_partitions: 0, total_rows: 0, total_size_bytes: 0 });
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting partitioning stats", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

router.post("/partitioning/create", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const { schema_name, table_name, partition_name, partition_column, partition_type, partition_value } = req.body;

    await pool.query(
      `INSERT INTO metadata.table_partitions 
       (schema_name, table_name, partition_name, partition_column, partition_type, partition_value)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (schema_name, table_name, partition_name) DO NOTHING`,
      [schema_name, table_name, partition_name, partition_column, partition_type, partition_value]
    );

    res.json({ success: true, message: "Partition created" });
  } catch (err) {
    const safeError = sanitizeError(err, "Error creating partition", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

// Cache Configuration
router.get("/cache/config", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM metadata.cache_stats ORDER BY last_updated DESC`
    );
    res.json(result.rows || []);
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting cache config", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

router.put("/cache/config", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const { cache_type, max_size } = req.body;

    await pool.query(
      `INSERT INTO metadata.cache_stats (cache_type, max_size, last_updated)
       VALUES ($1, $2, NOW())
       ON CONFLICT (cache_type) 
       DO UPDATE SET max_size = $2, last_updated = NOW()`,
      [cache_type, max_size]
    );

    res.json({ success: true, message: "Cache configuration updated" });
  } catch (err) {
    const safeError = sanitizeError(err, "Error updating cache config", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

router.get("/cache/stats", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM metadata.cache_stats ORDER BY cache_type`
    );
    res.json(result.rows || []);
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting cache stats", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

router.post("/cache/clear", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const { cache_type } = req.body;

    if (cache_type) {
      await pool.query(`DELETE FROM metadata.query_cache WHERE cache_key LIKE $1`, [`%${cache_type}%`]);
    } else {
      await pool.query(`DELETE FROM metadata.query_cache`);
    }

    res.json({ success: true, message: "Cache cleared" });
  } catch (err) {
    const safeError = sanitizeError(err, "Error clearing cache", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

// Compression Configuration
router.get("/compression/config", requireAuth, async (req, res) => {
  try {
    const { schema, table } = req.query;
    let query = `SELECT * FROM metadata.compression_config`;
    const params = [];

    if (schema && table) {
      query += ` WHERE schema_name = $1 AND table_name = $2`;
      params.push(schema, table);
    }

    const result = await pool.query(query, params);
    res.json(result.rows || []);
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting compression config", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

router.put("/compression/config", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const { schema_name, table_name, compression_algorithm, compress_on_transfer, compress_on_storage, min_size_bytes } = req.body;

    await pool.query(
      `INSERT INTO metadata.compression_config 
       (schema_name, table_name, compression_algorithm, compress_on_transfer, compress_on_storage, min_size_bytes, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (schema_name, table_name) 
       DO UPDATE SET compression_algorithm = $3, compress_on_transfer = $4, 
                     compress_on_storage = $5, min_size_bytes = $6, updated_at = NOW()`,
      [schema_name, table_name, compression_algorithm, compress_on_transfer, compress_on_storage, min_size_bytes]
    );

    res.json({ success: true, message: "Compression configuration updated" });
  } catch (err) {
    const safeError = sanitizeError(err, "Error updating compression config", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

// Memory Statistics
router.get("/memory/stats", requireAuth, async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    const result = await pool.query(
      `SELECT * FROM metadata.memory_stats 
       ORDER BY recorded_at DESC 
       LIMIT $1`,
      [limit]
    );
    res.json(result.rows || []);
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting memory stats", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

// Partition Pruning Statistics
router.get("/partition-pruning/stats", requireAuth, async (req, res) => {
  try {
    const { schema, table, limit = 50 } = req.query;
    let query = `SELECT * FROM metadata.partition_pruning_stats`;
    const params = [];
    let paramCount = 0;

    if (schema && table) {
      paramCount += 2;
      query += ` WHERE schema_name = $${paramCount - 1} AND table_name = $${paramCount}`;
      params.push(schema, table);
    }

    query += ` ORDER BY created_at DESC LIMIT $${++paramCount}`;
    params.push(limit);

    const result = await pool.query(query, params);
    res.json(result.rows || []);
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting partition pruning stats", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

// Pushdown Optimization Statistics
router.get("/pushdown/stats", requireAuth, async (req, res) => {
  try {
    const { db_engine, limit = 50 } = req.query;
    let query = `SELECT * FROM metadata.pushdown_stats`;
    const params = [];
    let paramCount = 0;

    if (db_engine) {
      paramCount++;
      query += ` WHERE db_engine = $${paramCount}`;
      params.push(db_engine);
    }

    query += ` ORDER BY created_at DESC LIMIT $${++paramCount}`;
    params.push(limit);

    const result = await pool.query(query, params);
    res.json(result.rows || []);
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting pushdown stats", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

// Join Optimization Statistics
router.get("/join-optimization/stats", requireAuth, async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const result = await pool.query(
      `SELECT * FROM metadata.join_optimization_stats 
       ORDER BY created_at DESC 
       LIMIT $1`,
      [limit]
    );
    res.json(result.rows || []);
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting join optimization stats", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

// Columnar Storage
router.get("/columnar-storage", requireAuth, async (req, res) => {
  try {
    const { schema, table } = req.query;
    let query = `SELECT * FROM metadata.columnar_storage`;
    const params = [];

    if (schema && table) {
      query += ` WHERE schema_name = $1 AND table_name = $2`;
      params.push(schema, table);
    }

    const result = await pool.query(query, params);
    res.json(result.rows || []);
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting columnar storage", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

// ============================================================================
// Metadata and Documentation API Endpoints
// ============================================================================

// Impact Analysis


export default router;
