import express from "express";
import fs from "fs";
import { pool } from "../services/database.service.js";
import { sanitizeError } from "../server-utils/errorHandler.js";
import { requireAuth } from "../server-utils/auth.js";
import { executeMonitoringCommand, DataSyncPath } from "../services/cppCommands.service.js";

const router = express.Router();

// Tracing
router.get("/tracing/traces", requireAuth, async (req, res) => {
  try {
    const { service_name, limit = 100 } = req.query;
    const result = await executeMonitoringCommand("list_traces", {
      service_name: service_name || "",
      limit: parseInt(limit)
    });
    res.json(result);
  } catch (err) {
    const safeError = sanitizeError(err, "Error listing traces", process.env.NODE_ENV === "production");
    if (process.env.NODE_ENV !== "production") {
      console.warn("[monitoring] list_traces failed (DataSync config/DB?):", err?.message || err);
    }
    res.status(200).json({ success: true, traces: [], _datasync_unavailable: true, _error: safeError });
  }
});

router.get("/tracing/traces/:traceId", requireAuth, async (req, res) => {
  try {
    const { traceId } = req.params;
    const result = await executeMonitoringCommand("get_trace", { trace_id: traceId });
    res.json(result);
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting trace", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

router.post("/tracing/spans/start", requireAuth, async (req, res) => {
  try {
    const { trace_id, parent_span_id, operation_name, service_name } = req.body;
    const result = await executeMonitoringCommand("start_span", {
      trace_id: trace_id || null,
      parent_span_id: parent_span_id || "",
      operation_name,
      service_name: service_name || "datasync"
    });
    res.json(result);
  } catch (err) {
    const safeError = sanitizeError(err, "Error starting span", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

router.post("/tracing/spans/end", requireAuth, async (req, res) => {
  try {
    const { span_id, status, error_message } = req.body;
    const result = await executeMonitoringCommand("end_span", {
      span_id,
      status: status || "ok",
      error_message: error_message || ""
    });
    res.json(result);
  } catch (err) {
    const safeError = sanitizeError(err, "Error ending span", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

// APM
router.get("/apm/metrics", requireAuth, async (req, res) => {
  try {
    const { operation_name, time_window = "1min" } = req.query;
    const result = await executeMonitoringCommand("get_metrics", {
      operation_name: operation_name || "",
      time_window
    });
    res.json(result);
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting APM metrics", process.env.NODE_ENV === "production");
    if (process.env.NODE_ENV !== "production") {
      console.warn("[monitoring] get_metrics failed (DataSync config/DB?):", err?.message || err);
    }
    res.status(200).json({ success: true, metrics: [], _datasync_unavailable: true, _error: safeError });
  }
});

router.get("/apm/baselines", requireAuth, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM metadata.apm_baselines ORDER BY calculated_at DESC");
    res.json(result.rows);
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting baselines", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

router.get("/apm/health", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM metadata.apm_health_checks ORDER BY timestamp DESC LIMIT 50"
    );
    res.json(result.rows);
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting health checks", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

router.post("/apm/baselines/calculate", requireAuth, async (req, res) => {
  try {
    const { operation_name, service_name, days = 7 } = req.body;
    // TODO: Call C++ to calculate baseline
    res.json({ success: true, message: "Baseline calculation initiated" });
  } catch (err) {
    const safeError = sanitizeError(err, "Error calculating baseline", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

// Bottleneck Detection
router.get("/bottlenecks/current", requireAuth, async (req, res) => {
  try {
    const result = await executeMonitoringCommand("analyze_bottlenecks", {});
    res.json(result);
  } catch (err) {
    const safeError = sanitizeError(err, "Error analyzing bottlenecks", process.env.NODE_ENV === "production");
    if (process.env.NODE_ENV !== "production") {
      console.warn("[monitoring] analyze_bottlenecks failed (DataSync config/DB?):", err?.message || err);
    }
    res.status(200).json({ success: true, bottlenecks: [], _datasync_unavailable: true, _error: safeError });
  }
});

router.get("/bottlenecks/history", requireAuth, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const result = await pool.query(
      `SELECT * FROM metadata.bottleneck_detections 
       WHERE detected_at >= NOW() - INTERVAL '${days} days'
       ORDER BY detected_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting bottleneck history", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

router.post("/bottlenecks/analyze", requireAuth, async (req, res) => {
  try {
    const result = await executeMonitoringCommand("analyze_bottlenecks", {});
    res.json(result);
  } catch (err) {
    const safeError = sanitizeError(err, "Error analyzing bottlenecks", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

// Resource Tracking
router.get("/resources/current", requireAuth, async (req, res) => {
  try {
    if (!fs.existsSync(DataSyncPath)) {
      return res.status(503).json({ 
        error: "DataSync executable not available",
        message: "Monitoring features require the DataSync backend to be available"
      });
    }
    const result = await executeMonitoringCommand("collect_resources", {});
    res.json(result);
  } catch (err) {
    const safeError = sanitizeError(err, "Error collecting resources", process.env.NODE_ENV === "production");
    if (process.env.NODE_ENV !== "production") {
      console.warn("[monitoring] collect_resources failed (DataSync config.json or DB in DataSync dir?):", err?.message || err);
    }
    res.status(200).json({
      success: true,
      cpu_percent: 0,
      memory_percent: 0,
      db_connections: 0,
      _datasync_unavailable: true,
      _error: safeError
    });
  }
});

router.get("/resources/history", requireAuth, async (req, res) => {
  try {
    const { hours = 24 } = req.query;
    const result = await pool.query(
      `SELECT * FROM metadata.resource_utilization 
       WHERE timestamp >= NOW() - INTERVAL '${hours} hours'
       ORDER BY timestamp DESC`
    );
    res.json(result.rows);
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting resource history", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

router.get("/resources/by-workflow/:workflowId", requireAuth, async (req, res) => {
  try {
    const { workflowId } = req.params;
    const result = await pool.query(
      "SELECT * FROM metadata.resource_utilization WHERE workflow_id = $1 ORDER BY timestamp DESC",
      [workflowId]
    );
    res.json(result.rows);
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting workflow resources", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

router.get("/resources/predictions", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM metadata.resource_predictions ORDER BY predicted_at DESC LIMIT 50"
    );
    res.json(result.rows);
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting predictions", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

// Cost Tracking
router.get("/costs/summary", requireAuth, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const result = await pool.query(
      `SELECT 
        SUM(total_cost) as total_cost,
        SUM(compute_cost) as compute_cost,
        SUM(storage_cost) as storage_cost,
        SUM(network_cost) as network_cost,
        COUNT(*) as operation_count
       FROM metadata.cost_tracking
       WHERE timestamp >= NOW() - INTERVAL '${days} days'`
    );
    res.json(result.rows[0] || { total_cost: 0, compute_cost: 0, storage_cost: 0, network_cost: 0, operation_count: 0 });
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting cost summary", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

router.get("/costs/by-workflow/:workflowId", requireAuth, async (req, res) => {
  try {
    const { workflowId } = req.params;
    const { days = 30 } = req.query;
    const result = await pool.query(
      `SELECT * FROM metadata.cost_tracking 
       WHERE workflow_id = $1 AND timestamp >= NOW() - INTERVAL '${days} days'
       ORDER BY timestamp DESC`,
      [workflowId]
    );
    res.json(result.rows);
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting workflow costs", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

router.get("/costs/budgets", requireAuth, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM metadata.cost_budgets ORDER BY name");
    res.json(result.rows);
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting budgets", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

router.post("/costs/budgets", requireAuth, async (req, res) => {
  try {
    const { budget_id, name, scope, scope_id, amount, period, alert_on_exceed, alert_threshold } = req.body;
    const result = await pool.query(
      `INSERT INTO metadata.cost_budgets 
       (budget_id, name, scope, scope_id, amount, period, alert_on_exceed, alert_threshold)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (budget_id) DO UPDATE SET
       name = EXCLUDED.name, amount = EXCLUDED.amount, period = EXCLUDED.period,
       alert_on_exceed = EXCLUDED.alert_on_exceed, alert_threshold = EXCLUDED.alert_threshold
       RETURNING *`,
      [budget_id, name, scope, scope_id || null, amount, period, alert_on_exceed !== false, alert_threshold || 80.0]
    );
    res.json(result.rows[0]);
  } catch (err) {
    const safeError = sanitizeError(err, "Error creating budget", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

router.get("/costs/estimates", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM metadata.cost_estimates ORDER BY estimated_at DESC LIMIT 50"
    );
    res.json(result.rows);
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting estimates", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

// Log Aggregation
router.get("/log-aggregation/config", requireAuth, async (req, res) => {
  try {
    // Check if table exists first
    const tableCheck = await pool.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'metadata' AND table_name = 'log_aggregation_config')"
    );
    if (!tableCheck.rows[0].exists) {
      return res.json([]);
    }
    const result = await pool.query("SELECT * FROM metadata.log_aggregation_config WHERE enabled = true");
    res.json(result.rows);
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting log aggregation config", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

router.post("/log-aggregation/config", requireAuth, async (req, res) => {
  try {
    const { config_id, type, endpoint, index_name, token, username, password, enabled, batch_size, batch_interval_seconds } = req.body;
    const result = await pool.query(
      `INSERT INTO metadata.log_aggregation_config 
       (config_id, type, endpoint, index_name, token, username, password, enabled, batch_size, batch_interval_seconds)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (config_id) DO UPDATE SET
       endpoint = EXCLUDED.endpoint, index_name = EXCLUDED.index_name, token = EXCLUDED.token,
       username = EXCLUDED.username, password = EXCLUDED.password, enabled = EXCLUDED.enabled,
       batch_size = EXCLUDED.batch_size, batch_interval_seconds = EXCLUDED.batch_interval_seconds
       RETURNING *`,
      [config_id, type, endpoint || null, index_name || null, token || null, username || null, password || null, enabled !== false, batch_size || 1000, batch_interval_seconds || 60]
    );
    res.json(result.rows[0]);
  } catch (err) {
    const safeError = sanitizeError(err, "Error configuring log aggregation", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

router.post("/log-aggregation/export", requireAuth, async (req, res) => {
  try {
    if (!fs.existsSync(DataSyncPath)) {
      return res.status(503).json({ 
        error: "DataSync executable not available",
        message: "Log aggregation export requires the DataSync backend to be available"
      });
    }
    const { config_id, limit = 1000 } = req.body;
    const result = await executeMonitoringCommand("export_logs", { config_id, limit });
    res.json(result);
  } catch (err) {
    const safeError = sanitizeError(err, "Error exporting logs", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

router.get("/log-aggregation/status", requireAuth, async (req, res) => {
  try {
    // Check if table exists first
    const tableCheck = await pool.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'metadata' AND table_name = 'log_aggregation_status')"
    );
    if (!tableCheck.rows[0].exists) {
      return res.json([]);
    }
    const { config_id } = req.query;
    let query = "SELECT * FROM metadata.log_aggregation_status";
    if (config_id) {
      query += " WHERE config_id = $1";
      const result = await pool.query(query, [config_id]);
      res.json(result.rows[0] || null);
    } else {
      const result = await pool.query(query);
      res.json(result.rows);
    }
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting export status", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

// Advanced Alerting
router.get("/alerting/integrations", requireAuth, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM metadata.alerting_integrations WHERE enabled = true");
    res.json(result.rows);
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting integrations", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

router.post("/alerting/integrations", requireAuth, async (req, res) => {
  try {
    const { integration_id, type, name, integration_key, api_key, service_id, team_id, enabled, severity_mapping } = req.body;
    const result = await pool.query(
      `INSERT INTO metadata.alerting_integrations 
       (integration_id, type, name, integration_key, api_key, service_id, team_id, enabled, severity_mapping)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (integration_id) DO UPDATE SET
       name = EXCLUDED.name, integration_key = EXCLUDED.integration_key, api_key = EXCLUDED.api_key,
       service_id = EXCLUDED.service_id, team_id = EXCLUDED.team_id, enabled = EXCLUDED.enabled,
       severity_mapping = EXCLUDED.severity_mapping
       RETURNING *`,
      [integration_id, type, name, integration_key || null, api_key || null, service_id || null, team_id || null, enabled !== false, JSON.stringify(severity_mapping || {})]
    );
    res.json(result.rows[0]);
  } catch (err) {
    const safeError = sanitizeError(err, "Error creating integration", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

router.post("/alerting/trigger", requireAuth, async (req, res) => {
  try {
    const { integration_id, alert_id, title, message, source } = req.body;
    const result = await executeMonitoringCommand("trigger_alert", {
      integration_id,
      alert_id: alert_id || 0,
      title,
      message: message || "",
      source: source || "datasync"
    });
    res.json(result);
  } catch (err) {
    const safeError = sanitizeError(err, "Error triggering alert", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

router.get("/alerting/incidents", requireAuth, async (req, res) => {
  try {
    const { integration_id } = req.query;
    let query = "SELECT * FROM metadata.alerting_incidents";
    if (integration_id) {
      query += " WHERE integration_id = $1";
      const result = await pool.query(query + " ORDER BY created_at DESC", [integration_id]);
      res.json(result.rows);
    } else {
      const result = await pool.query(query + " ORDER BY created_at DESC LIMIT 100");
      res.json(result.rows);
    }
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting incidents", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

// Query Performance Analysis
router.get("/query-performance/analyze/:queryId", requireAuth, async (req, res) => {
  try {
    const { queryId } = req.params;
    const { query_text } = req.query;
    if (!query_text) {
      return res.status(400).json({ error: "query_text required" });
    }
    const result = await executeMonitoringCommand("analyze_query", {
      query_id: queryId,
      query_text
    });
    res.json(result);
  } catch (err) {
    const safeError = sanitizeError(err, "Error analyzing query", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

router.get("/query-performance/regressions", requireAuth, async (req, res) => {
  try {
    const days = parseInt(req.query.days, 10) || 7;
    const result = await executeMonitoringCommand("get_regressions", { days });
    res.json(result);
  } catch (err) {
    const safeError = sanitizeError(err, "Error detecting regressions", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

router.get("/query-performance/suggestions", requireAuth, async (req, res) => {
  try {
    const { query_fingerprint } = req.query;
    let query = "SELECT * FROM metadata.query_optimization_suggestions";
    if (query_fingerprint) {
      query += " WHERE query_fingerprint = $1";
      const result = await pool.query(query + " ORDER BY created_at DESC", [query_fingerprint]);
      res.json(result.rows);
    } else {
      const result = await pool.query(query + " ORDER BY created_at DESC LIMIT 100");
      res.json(result.rows);
    }
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting suggestions", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

export default router;
