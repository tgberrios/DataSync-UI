import express from "express";
import { pool } from "../services/database.service.js";
import { sanitizeError } from "../server-utils/errorHandler.js";
import { requireAuth } from "../server-utils/auth.js";
import { executeCatalogCommand } from "../services/cppCommands.service.js";

const router = express.Router();

// Unused Objects Endpoints
router.get("/detect", requireAuth, async (req, res) => {
  try {
    const { days_threshold = 90, generated_by = "" } = req.query;
    const result = await executeCatalogCommand("detect_unused", {
      days_threshold: parseInt(days_threshold),
      generated_by: generated_by || ""
    });
    res.json(result);
  } catch (err) {
    const safeError = sanitizeError(err, "Error detecting unused objects", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

router.get("/report/:reportId", requireAuth, async (req, res) => {
  try {
    const { reportId } = req.params;
    // Load from database directly
    // pool already imported
    const result = await pool.query(
      "SELECT * FROM metadata.unused_objects_report WHERE report_id = $1",
      [reportId]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Report not found" });
    } else {
      res.json({ success: true, report: result.rows[0] });
    }
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting report", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

router.get("/reports", requireAuth, async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    // pool already imported
    // Check if table exists first
    const tableCheck = await pool.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'metadata' AND table_name = 'unused_objects_report')"
    );
    if (!tableCheck.rows[0].exists) {
      return res.json({ success: true, reports: [] });
    }
    const result = await pool.query(
      "SELECT * FROM metadata.unused_objects_report ORDER BY generated_at DESC LIMIT $1",
      [parseInt(limit)]
    );
    res.json({ success: true, reports: result.rows });
  } catch (err) {
    const safeError = sanitizeError(err, "Error listing reports", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError, reports: [] });
  }
});

router.get("/usage/:schema/:object", requireAuth, async (req, res) => {
  try {
    const { schema, object } = req.params;
    const { object_type = "table" } = req.query;
    // pool already imported
    const result = await pool.query(
      "SELECT * FROM metadata.object_usage_tracking WHERE object_type = $1 AND schema_name = $2 AND object_name = $3",
      [object_type, schema, object]
    );
    if (result.rows.length === 0) {
      res.json({ success: true, usage: null });
    } else {
      res.json({ success: true, usage: result.rows[0] });
    }
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting object usage", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

router.post("/track-access", requireAuth, async (req, res) => {
  try {
    const result = await executeCatalogCommand("track_access", req.body);
    res.json(result);
  } catch (err) {
    const safeError = sanitizeError(err, "Error tracking access", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});



export default router;
