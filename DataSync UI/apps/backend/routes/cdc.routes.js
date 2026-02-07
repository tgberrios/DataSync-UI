import express from "express";
import { pool } from "../services/database.service.js";
import { sanitizeError } from "../server-utils/errorHandler.js";
import { requireAuth, requireRole } from "../server-utils/auth.js";
import { executeMaintenanceCommand } from "../services/cppCommands.service.js";

const router = express.Router();

// CDC Cleanup Endpoints
router.get("/cleanup/policies", requireAuth, async (req, res) => {
  try {
    // Get policies from database directly
    // pool already imported
    let query = "SELECT * FROM metadata.cdc_cleanup_policies";
    if (req.query.enabled_only === "true") {
      query += " WHERE enabled = true";
    }
    query += " ORDER BY connection_string, db_engine";
    const result = await pool.query(query);
    res.json({ success: true, policies: result.rows });
  } catch (err) {
    const safeError = sanitizeError(err, "Error listing cleanup policies", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

router.post("/cleanup/policies", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const result = await executeMaintenanceCommand("create_cleanup_policy", req.body);
    res.json(result);
  } catch (err) {
    const safeError = sanitizeError(err, "Error creating cleanup policy", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

router.post("/cleanup/execute", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const result = await executeMaintenanceCommand("execute_cleanup", req.body);
    res.json(result);
  } catch (err) {
    const safeError = sanitizeError(err, "Error executing cleanup", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

router.get("/cleanup/history", requireAuth, async (req, res) => {
  try {
    const { connection_string, limit = 100 } = req.query;
    // pool already imported
    let query = "SELECT * FROM metadata.cdc_cleanup_history";
    const params = [];
    if (connection_string) {
      query += " WHERE connection_string = $1";
      params.push(connection_string);
      query += " ORDER BY started_at DESC LIMIT $2";
      params.push(parseInt(limit));
    } else {
      query += " ORDER BY started_at DESC LIMIT $1";
      params.push(parseInt(limit));
    }
    const result = await pool.query(query, params);
    res.json({ success: true, history: result.rows });
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting cleanup history", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

router.get("/cleanup/stats", requireAuth, async (req, res) => {
  try {
    // Get stats from database directly
    // pool already imported
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_policies,
        COUNT(CASE WHEN enabled THEN 1 END) as enabled_policies,
        COALESCE(SUM(rows_deleted), 0) as total_rows_deleted,
        COALESCE(SUM(tables_cleaned), 0) as total_tables_cleaned,
        COALESCE(SUM(space_freed_mb), 0) as total_space_freed_mb,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_cleanups,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_cleanups
      FROM metadata.cdc_cleanup_history
    `);
    res.json({ success: true, stats: result.rows[0] || {} });
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting cleanup stats", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});



export default router;
