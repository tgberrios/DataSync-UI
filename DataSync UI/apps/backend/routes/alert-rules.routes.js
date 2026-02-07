import express from "express";
import { pool } from "../services/database.service.js";
import { sanitizeError } from "../server-utils/errorHandler.js";
import { validatePage, validateLimit, validateEnum, sanitizeSearch, validateIdentifier } from "../server-utils/validation.js";
import { requireAuth, requireRole } from "../server-utils/auth.js";

const router = express.Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const page = validatePage(req.query.page, 1);
    const limit = validateLimit(req.query.limit, 20);
    const offset = (page - 1) * limit;
    const queryType = req.query.query_type || "";
    const dbEngine = req.query.db_engine || "";
    const enabled = req.query.enabled;

    const whereConditions = [];
    const params = [];
    let paramCount = 0;

    if (queryType) {
      paramCount++;
      whereConditions.push(`query_type = $${paramCount}`);
      params.push(queryType);
    }

    if (dbEngine) {
      paramCount++;
      whereConditions.push(`db_engine = $${paramCount}`);
      params.push(dbEngine);
    }

    if (enabled !== undefined && enabled !== "") {
      paramCount++;
      whereConditions.push(`enabled = $${paramCount}`);
      params.push(enabled === "true");
    }

    const whereClause = whereConditions.length > 0 ? "WHERE " + whereConditions.join(" AND ") : "";

    const countQuery = `SELECT COUNT(*) FROM metadata.alert_rules ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(limit, offset);
    const dataQuery = `
      SELECT 
        id, rule_name, alert_type, severity, evaluation_type, threshold_low, threshold_warning, threshold_critical,
        condition_expression, threshold_value, custom_message,
        enabled, notification_channels, db_engine, connection_string, query_type,
        check_interval, is_system_rule, query_template, webhook_ids,
        created_at, updated_at
      FROM metadata.alert_rules
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    const result = await pool.query(dataQuery, params);

    res.json({
      rules: result.rows.map(row => ({
        ...row,
        webhook_ids: Array.isArray(row.webhook_ids) ? row.webhook_ids : []
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error("Error getting alert rules:", err);
    const safeError = sanitizeError(
      err,
      "Error getting alert rules",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

router.get("/system-templates", requireAuth, async (req, res) => {
  try {
    res.json({ templates: [] });
  } catch (err) {
    console.error("Error getting system templates:", err);
    const safeError = sanitizeError(
      err,
      "Error getting system templates",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const ruleId = parseInt(req.params.id);
    if (isNaN(ruleId)) {
      return res.status(400).json({ error: "Invalid alert rule ID" });
    }

    const result = await pool.query(
      `SELECT * FROM metadata.alert_rules WHERE id = $1`,
      [ruleId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Alert rule not found" });
    }

    res.json({
      ...result.rows[0],
      webhook_ids: Array.isArray(result.rows[0].webhook_ids) ? result.rows[0].webhook_ids : []
    });
  } catch (err) {
    console.error("Error getting alert rule:", err);
    const safeError = sanitizeError(
      err,
      "Error getting alert rule",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

router.post("/", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const {
      rule_name,
      alert_type,
      severity,
      evaluation_type,
      threshold_low,
      threshold_warning,
      threshold_critical,
      condition_expression,
      threshold_value,
      custom_message,
      db_engine,
      connection_string,
      query_type,
      check_interval,
      is_system_rule,
      query_template,
      webhook_ids,
      enabled
    } = req.body;

    if (!rule_name || !alert_type || !severity || !condition_expression) {
      return res.status(400).json({
        error: "Missing required fields: rule_name, alert_type, severity, condition_expression"
      });
    }

    const validSeverity = validateEnum(severity, ["CRITICAL", "WARNING", "INFO"], null);
    if (!validSeverity) {
      return res.status(400).json({ error: "Invalid severity. Must be CRITICAL, WARNING, or INFO" });
    }

    const validQueryType = validateEnum(query_type || "CUSTOM_SQL", ["CUSTOM_SQL"], "CUSTOM_SQL");
    if (!validQueryType) {
      return res.status(400).json({ error: "Invalid query_type. Must be CUSTOM_SQL" });
    }

    if (query_type === "CUSTOM_SQL" && !db_engine) {
      return res.status(400).json({ error: "db_engine is required for CUSTOM_SQL queries" });
    }

    // Validar evaluation_type
    const validEvaluationType = validateEnum(evaluation_type || "TEXT", ["NUMERIC", "TEXT"], "TEXT");
    if (!validEvaluationType) {
      return res.status(400).json({ error: "Invalid evaluation_type. Must be NUMERIC or TEXT" });
    }

    // Validar thresholds para NUMERIC
    if (evaluation_type === "NUMERIC") {
      if (!threshold_low || !threshold_warning || !threshold_critical) {
        return res.status(400).json({
          error: "All thresholds (threshold_low, threshold_warning, threshold_critical) are required for NUMERIC evaluation type"
        });
      }
      
      const low = parseFloat(threshold_low);
      const warning = parseFloat(threshold_warning);
      const critical = parseFloat(threshold_critical);
      
      if (isNaN(low) || isNaN(warning) || isNaN(critical)) {
        return res.status(400).json({ error: "Thresholds must be valid numbers" });
      }
      
      if (low >= warning || warning >= critical) {
        return res.status(400).json({ 
          error: "Thresholds must be in ascending order: threshold_low < threshold_warning < threshold_critical" 
        });
      }
    }

    const checkResult = await pool.query(
      `SELECT rule_name FROM metadata.alert_rules WHERE LOWER(rule_name) = LOWER($1)`,
      [rule_name]
    );

    if (checkResult.rows.length > 0) {
      return res.status(409).json({ error: "Alert rule with this name already exists" });
    }

    const result = await pool.query(
      `INSERT INTO metadata.alert_rules 
       (rule_name, alert_type, severity, evaluation_type, threshold_low, threshold_warning, threshold_critical,
        condition_expression, threshold_value, custom_message,
        db_engine, connection_string, query_type, check_interval, is_system_rule,
        query_template, webhook_ids, enabled)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       RETURNING *`,
      [
        rule_name,
        alert_type,
        severity,
        evaluation_type || 'TEXT',
        evaluation_type === 'NUMERIC' ? parseFloat(threshold_low) : null,
        evaluation_type === 'NUMERIC' ? parseFloat(threshold_warning) : null,
        evaluation_type === 'NUMERIC' ? parseFloat(threshold_critical) : null,
        condition_expression,
        threshold_value || null,
        custom_message || null,
        db_engine || null,
        connection_string || null,
        validQueryType,
        check_interval || 60,
        is_system_rule || false,
        query_template || null,
        Array.isArray(webhook_ids) ? webhook_ids : [],
        enabled !== undefined ? enabled : true
      ]
    );

    res.json({
      ...result.rows[0],
      webhook_ids: Array.isArray(result.rows[0].webhook_ids) ? result.rows[0].webhook_ids : []
    });
  } catch (err) {
    console.error("Error creating alert rule:", err);
    const safeError = sanitizeError(
      err,
      "Error creating alert rule",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

router.put("/:id", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const ruleId = parseInt(req.params.id);
    if (isNaN(ruleId)) {
      return res.status(400).json({ error: "Invalid alert rule ID" });
    }

    const {
      rule_name,
      alert_type,
      severity,
      evaluation_type,
      threshold_low,
      threshold_warning,
      threshold_critical,
      condition_expression,
      threshold_value,
      custom_message,
      db_engine,
      connection_string,
      query_type,
      check_interval,
      query_template,
      webhook_ids,
      enabled
    } = req.body;

    const existingRule = await pool.query(
      `SELECT is_system_rule FROM metadata.alert_rules WHERE id = $1`,
      [ruleId]
    );

    if (existingRule.rows.length === 0) {
      return res.status(404).json({ error: "Alert rule not found" });
    }

    if (existingRule.rows[0].is_system_rule) {
      return res.status(403).json({ error: "Cannot modify system rules" });
    }

    if (severity) {
      const validSeverity = validateEnum(severity, ["CRITICAL", "WARNING", "INFO"], null);
      if (!validSeverity) {
        return res.status(400).json({ error: "Invalid severity" });
      }
    }

    const validQueryType = query_type ? validateEnum(query_type, ["CUSTOM_SQL"], null) : null;
    if (query_type && !validQueryType) {
      return res.status(400).json({ error: "Invalid query_type. Must be CUSTOM_SQL" });
    }

    // Validar evaluation_type si se proporciona
    if (evaluation_type) {
      const validEvaluationType = validateEnum(evaluation_type, ["NUMERIC", "TEXT"], null);
      if (!validEvaluationType) {
        return res.status(400).json({ error: "Invalid evaluation_type. Must be NUMERIC or TEXT" });
      }

      // Validar thresholds para NUMERIC
      if (evaluation_type === "NUMERIC") {
        if (threshold_low === undefined || threshold_warning === undefined || threshold_critical === undefined) {
          return res.status(400).json({
            error: "All thresholds (threshold_low, threshold_warning, threshold_critical) are required when changing to NUMERIC evaluation type"
          });
        }
        
        const low = parseFloat(threshold_low);
        const warning = parseFloat(threshold_warning);
        const critical = parseFloat(threshold_critical);
        
        if (isNaN(low) || isNaN(warning) || isNaN(critical)) {
          return res.status(400).json({ error: "Thresholds must be valid numbers" });
        }
        
        if (low >= warning || warning >= critical) {
          return res.status(400).json({ 
            error: "Thresholds must be in ascending order: threshold_low < threshold_warning < threshold_critical" 
          });
        }
      }
    }

    const updateFields = [];
    const params = [];
    let paramCount = 0;

    if (rule_name) {
      paramCount++;
      updateFields.push(`rule_name = $${paramCount}`);
      params.push(rule_name);
    }
    if (alert_type) {
      paramCount++;
      updateFields.push(`alert_type = $${paramCount}`);
      params.push(alert_type);
    }
    if (severity) {
      paramCount++;
      updateFields.push(`severity = $${paramCount}`);
      params.push(severity);
    }
    if (condition_expression) {
      paramCount++;
      updateFields.push(`condition_expression = $${paramCount}`);
      params.push(condition_expression);
    }
    if (evaluation_type !== undefined) {
      paramCount++;
      updateFields.push(`evaluation_type = $${paramCount}`);
      params.push(evaluation_type);
    }
    if (threshold_low !== undefined) {
      paramCount++;
      updateFields.push(`threshold_low = $${paramCount}`);
      params.push(evaluation_type === 'NUMERIC' ? parseFloat(threshold_low) : null);
    }
    if (threshold_warning !== undefined) {
      paramCount++;
      updateFields.push(`threshold_warning = $${paramCount}`);
      params.push(evaluation_type === 'NUMERIC' ? parseFloat(threshold_warning) : null);
    }
    if (threshold_critical !== undefined) {
      paramCount++;
      updateFields.push(`threshold_critical = $${paramCount}`);
      params.push(evaluation_type === 'NUMERIC' ? parseFloat(threshold_critical) : null);
    }
    if (threshold_value !== undefined) {
      paramCount++;
      updateFields.push(`threshold_value = $${paramCount}`);
      params.push(threshold_value);
    }
    if (custom_message !== undefined) {
      paramCount++;
      updateFields.push(`custom_message = $${paramCount}`);
      params.push(custom_message || null);
    }
    if (db_engine !== undefined) {
      paramCount++;
      updateFields.push(`db_engine = $${paramCount}`);
      params.push(db_engine);
    }
    if (connection_string !== undefined) {
      paramCount++;
      updateFields.push(`connection_string = $${paramCount}`);
      params.push(connection_string);
    }
    if (query_type) {
      paramCount++;
      updateFields.push(`query_type = $${paramCount}`);
      params.push(validQueryType);
    }
    if (check_interval !== undefined) {
      paramCount++;
      updateFields.push(`check_interval = $${paramCount}`);
      params.push(check_interval);
    }
    if (query_template !== undefined) {
      paramCount++;
      updateFields.push(`query_template = $${paramCount}`);
      params.push(query_template);
    }
    if (webhook_ids !== undefined) {
      paramCount++;
      updateFields.push(`webhook_ids = $${paramCount}`);
      params.push(Array.isArray(webhook_ids) ? webhook_ids : []);
    }
    if (enabled !== undefined) {
      paramCount++;
      updateFields.push(`enabled = $${paramCount}`);
      params.push(enabled);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    paramCount++;
    updateFields.push(`updated_at = NOW()`);
    params.push(ruleId);

    const result = await pool.query(
      `UPDATE metadata.alert_rules 
       SET ${updateFields.join(", ")}
       WHERE id = $${paramCount}
       RETURNING *`,
      params
    );

    res.json({
      ...result.rows[0],
      webhook_ids: Array.isArray(result.rows[0].webhook_ids) ? result.rows[0].webhook_ids : []
    });
  } catch (err) {
    console.error("Error updating alert rule:", err);
    const safeError = sanitizeError(
      err,
      "Error updating alert rule",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

router.delete("/:id", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const ruleId = parseInt(req.params.id);
    if (isNaN(ruleId)) {
      return res.status(400).json({ error: "Invalid alert rule ID" });
    }

    const existingRule = await pool.query(
      `SELECT is_system_rule FROM metadata.alert_rules WHERE id = $1`,
      [ruleId]
    );

    if (existingRule.rows.length === 0) {
      return res.status(404).json({ error: "Alert rule not found" });
    }

    if (existingRule.rows[0].is_system_rule) {
      return res.status(403).json({ error: "Cannot delete system rules" });
    }

    const result = await pool.query(
      `DELETE FROM metadata.alert_rules WHERE id = $1 RETURNING id`,
      [ruleId]
    );

    res.json({ message: "Alert rule deleted successfully" });
  } catch (err) {
    console.error("Error deleting alert rule:", err);
    const safeError = sanitizeError(
      err,
      "Error deleting alert rule",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

router.post("/:id/test", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const ruleId = parseInt(req.params.id);
    if (isNaN(ruleId)) {
      return res.status(400).json({ error: "Invalid alert rule ID" });
    }

    const rule = await pool.query(
      `SELECT * FROM metadata.alert_rules WHERE id = $1`,
      [ruleId]
    );

    if (rule.rows.length === 0) {
      return res.status(404).json({ error: "Alert rule not found" });
    }

    const alertRule = rule.rows[0];
    let query = alertRule.condition_expression;

    if (alertRule.query_type === "SYSTEM_METRIC" && alertRule.threshold_value) {
      query = query.replace(/\{\{threshold\}\}/g, alertRule.threshold_value);
    }

    let result;
    if (alertRule.query_type === "SYSTEM_METRIC" || (alertRule.db_engine === "PostgreSQL" && !alertRule.connection_string)) {
      result = await pool.query(query);
    } else {
      return res.status(400).json({ 
        error: "Testing queries for external databases is not yet supported. Use PostgreSQL connection to DataLake for testing." 
      });
    }

    res.json({
      success: true,
      rowCount: result.rows.length,
      sampleRows: result.rows.slice(0, 5),
      message: result.rows.length > 0 
        ? `Query returned ${result.rows.length} row(s). Alert would be triggered.`
        : `Query returned 0 rows. Alert would not be triggered.`
    });
  } catch (err) {
    console.error("Error testing alert rule:", err);
    const safeError = sanitizeError(
      err,
      "Error testing alert rule query",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ 
      error: safeError,
      details: err.message 
    });
  }
});

router.post("/test-query", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const { query, db_engine, connection_string } = req.body;

    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    let result;
    let testPool = null;

    try {
      if (connection_string && db_engine === "PostgreSQL") {
        // Create temporary connection for external PostgreSQL database
        let config;
        if (
          connection_string.includes("postgresql://") ||
          connection_string.includes("postgres://")
        ) {
          config = {
            connectionString: connection_string,
            connectionTimeoutMillis: 10000,
            max: 1,
          };
        } else {
          const params = {};
          const parts = connection_string.split(";");
          for (const part of parts) {
            const [key, value] = part.split("=").map((s) => s.trim());
            if (key && value) {
              switch (key.toLowerCase()) {
                case "host":
                case "hostname":
                  params.host = value;
                  break;
                case "user":
                case "username":
                  params.user = value;
                  break;
                case "password":
                  params.password = value;
                  break;
                case "db":
                case "database":
                  params.database = value;
                  break;
                case "port":
                  params.port = parseInt(value, 10);
                  break;
              }
            }
          }
          config = {
            ...params,
            connectionTimeoutMillis: 10000,
            max: 1,
          };
        }
        testPool = new Pool(config);
        result = await testPool.query(query);
      } else if (db_engine === "PostgreSQL" || !db_engine) {
        // Use default DataLake connection
        result = await pool.query(query);
      } else {
        return res.status(400).json({ 
          error: `Testing queries for ${db_engine} is not yet supported. Only PostgreSQL is supported.` 
        });
      }

      res.json({
        success: true,
        rowCount: result.rows.length,
        sampleRows: result.rows.slice(0, 5),
        message: result.rows.length > 0 
          ? `Query returned ${result.rows.length} row(s). Alert would be triggered.`
          : `Query returned 0 rows. Alert would not be triggered.`
      });
    } finally {
      // Clean up temporary connection
      if (testPool) {
        try {
          await testPool.end();
        } catch (endErr) {
          console.error("Error closing test pool:", endErr);
        }
      }
    }
  } catch (err) {
    console.error("Error testing query:", err);
    const safeError = sanitizeError(
      err,
      "Error testing query",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ 
      error: safeError,
      details: err.message 
    });
  }
});



export default router;
