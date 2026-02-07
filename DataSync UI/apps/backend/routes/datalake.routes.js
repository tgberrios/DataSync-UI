import express from "express";
import fs from "fs";
import { sanitizeError } from "../server-utils/errorHandler.js";
import { requireAuth, requireRole } from "../server-utils/auth.js";
import { executeCatalogCommand } from "../services/cppCommands.service.js";

const router = express.Router();

// DataLake Mapping Endpoints
router.get("/mapping", requireAuth, async (req, res) => {
  try {
    if (!fs.existsSync(DataSyncPath)) {
      return res.status(503).json({ 
        error: "DataSync executable not available",
        message: "DataLake mapping features require the DataSync backend to be available",
        mappings: []
      });
    }
    const { source_system, refresh_rate_type } = req.query;
    const result = await executeCatalogCommand("list_mappings", {
      source_system: source_system || "",
      refresh_rate_type: refresh_rate_type || ""
    });
    res.json(result);
  } catch (err) {
    const safeError = sanitizeError(err, "Error listing mappings", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError, mappings: [] });
  }
});

router.get("/mapping/:schema/:table", requireAuth, async (req, res) => {
  try {
    const { schema, table } = req.params;
    const result = await executeCatalogCommand("get_mapping", {
      target_schema: schema,
      target_table: table
    });
    res.json(result);
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting mapping", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

router.post("/mapping", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const result = await executeCatalogCommand("create_mapping", req.body);
    res.json(result);
  } catch (err) {
    const safeError = sanitizeError(err, "Error creating mapping", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

router.get("/mapping/stats", requireAuth, async (req, res) => {
  try {
    // Stats are calculated from mappings, return aggregated data
    const result = await executeCatalogCommand("list_mappings", {});
    if (result.success && result.mappings) {
      const stats = {
        total_mappings: result.mappings.length,
        by_source_system: {},
        by_refresh_type: {}
      };
      result.mappings.forEach(m => {
        stats.by_source_system[m.source_system] = (stats.by_source_system[m.source_system] || 0) + 1;
        stats.by_refresh_type[m.refresh_rate_type] = (stats.by_refresh_type[m.refresh_rate_type] || 0) + 1;
      });
      res.json({ success: true, stats });
    } else {
      res.json({ success: true, stats: { total_mappings: 0 } });
    }
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting mapping stats", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});



export default router;
