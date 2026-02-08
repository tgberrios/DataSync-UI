import express from "express";
import { pool } from "../services/database.service.js";
import { sanitizeError } from "../server-utils/errorHandler.js";
import { sanitizeSearch } from "../server-utils/validation.js";

const router = express.Router();

/**
 * GET /api/data-retention/policies
 * Returns retention policies from metadata.data_governance_catalog (tables with retention_policy set).
 */
router.get("/policies", async (req, res) => {
  try {
    const schemaName = sanitizeSearch(req.query.schema_name, 100);
    const tableName = sanitizeSearch(req.query.table_name, 100);

    const whereConditions = ["(retention_policy IS NOT NULL AND retention_policy != '')"];
    const params = [];
    let paramIndex = 1;

    if (schemaName) {
      whereConditions.push(`schema_name = $${paramIndex}`);
      params.push(schemaName);
      paramIndex += 1;
    }
    if (tableName) {
      whereConditions.push(`table_name = $${paramIndex}`);
      params.push(tableName);
      paramIndex += 1;
    }

    const result = await pool.query(
      `
      SELECT schema_name, table_name, retention_policy
      FROM metadata.data_governance_catalog
      WHERE ${whereConditions.join(" AND ")}
      ORDER BY schema_name, table_name
      `,
      params
    );

    const rows = result.rows || [];
    const policies = rows.map((row) => ({
      schema_name: row.schema_name,
      table_name: row.table_name,
      retention_policy: row.retention_policy,
      retention_period: row.retention_policy,
    }));

    res.json(policies);
  } catch (err) {
    const msg = err?.message || "";
    if (msg.includes("does not exist") || msg.includes("relation")) {
      res.json([]);
      return;
    }
    const message = sanitizeError(err);
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/data-retention/jobs
 * Returns retention jobs from metadata.data_retention_jobs.
 */
router.get("/jobs", async (req, res) => {
  try {
    const status = sanitizeSearch(req.query.status, 50);
    const schemaName = sanitizeSearch(req.query.schema_name, 100);
    const tableName = sanitizeSearch(req.query.table_name, 100);

    const whereConditions = [];
    const params = [];
    let paramIndex = 1;

    if (status) {
      whereConditions.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex += 1;
    }
    if (schemaName) {
      whereConditions.push(`schema_name = $${paramIndex}`);
      params.push(schemaName);
      paramIndex += 1;
    }
    if (tableName) {
      whereConditions.push(`table_name = $${paramIndex}`);
      params.push(tableName);
      paramIndex += 1;
    }

    const whereClause =
      whereConditions.length > 0 ? "WHERE " + whereConditions.join(" AND ") : "";

    const result = await pool.query(
      `
      SELECT id, schema_name, table_name, job_type, retention_policy,
             scheduled_date, status, rows_affected, error_message, executed_at
      FROM metadata.data_retention_jobs
      ${whereClause}
      ORDER BY scheduled_date DESC NULLS LAST, id DESC
      `,
      params
    );

    const jobs = (result.rows || []).map((row) => ({
      id: row.id,
      schema_name: row.schema_name,
      table_name: row.table_name,
      job_type: row.job_type,
      retention_policy: row.retention_policy,
      scheduled_date: row.scheduled_date,
      status: row.status,
      rows_affected: row.rows_affected ?? 0,
      error_message: row.error_message ?? null,
      executed_at: row.executed_at,
    }));

    res.json(jobs);
  } catch (err) {
    const msg = err?.message || "";
    if (msg.includes("does not exist") || msg.includes("relation")) {
      res.json([]);
      return;
    }
    const message = sanitizeError(err);
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/data-retention/legal-holds
 * Returns tables with legal hold from metadata.data_governance_catalog (when legal_hold column exists).
 */
router.get("/legal-holds", async (req, res) => {
  try {
    const schemaName = sanitizeSearch(req.query.schema_name, 100);
    const tableName = sanitizeSearch(req.query.table_name, 100);

    const whereConditions = ["legal_hold = true"];
    const params = [];
    let paramIndex = 1;

    if (schemaName) {
      whereConditions.push(`schema_name = $${paramIndex}`);
      params.push(schemaName);
      paramIndex += 1;
    }
    if (tableName) {
      whereConditions.push(`table_name = $${paramIndex}`);
      params.push(tableName);
      paramIndex += 1;
    }

    const result = await pool.query(
      `
      SELECT schema_name, table_name, legal_hold_reason AS reason, legal_hold_until AS hold_until
      FROM metadata.data_governance_catalog
      WHERE ${whereConditions.join(" AND ")}
      ORDER BY schema_name, table_name
      `,
      params
    );

    const rows = result.rows || [];
    const holds = rows.map((row, index) => ({
      id: index + 1,
      schema_name: row.schema_name,
      table_name: row.table_name,
      reason: row.reason ?? "",
      hold_until: row.hold_until ?? null,
    }));

    res.json(holds);
  } catch (err) {
    const msg = err?.message || "";
    if (msg.includes("does not exist") || msg.includes("column") || msg.includes("relation")) {
      res.json([]);
      return;
    }
    const message = sanitizeError(err);
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/data-retention/policies
 * Create/update retention policy in governance catalog (upsert by schema_name, table_name).
 */
router.post("/policies", async (req, res) => {
  try {
    const { schema_name, table_name, retention_period, archival_location, policy_type } =
      req.body || {};
    if (!schema_name || !table_name || !retention_period) {
      res.status(400).json({
        error: "schema_name, table_name and retention_period are required",
      });
      return;
    }

    const policyValue =
      typeof retention_period === "string" ? retention_period : String(retention_period);

    await pool.query(
      `
      INSERT INTO metadata.data_governance_catalog (schema_name, table_name, retention_policy)
      VALUES ($1, $2, $3)
      ON CONFLICT (schema_name, table_name)
      DO UPDATE SET retention_policy = EXCLUDED.retention_policy, updated_at = NOW()
      `,
      [schema_name.trim(), table_name.trim(), policyValue]
    );

    res.status(201).json({
      schema_name,
      table_name,
      retention_period: policyValue,
      archival_location: archival_location ?? null,
      policy_type: policy_type ?? null,
    });
  } catch (err) {
    const message = sanitizeError(err);
    res.status(500).json({ error: message });
  }
});

/**
 * PUT /api/data-retention/policies
 * Update retention policy in governance catalog.
 */
router.put("/policies", async (req, res) => {
  try {
    const { schema_name, table_name, retention_period, archival_location, policy_type } =
      req.body || {};
    if (!schema_name || !table_name || !retention_period) {
      res.status(400).json({
        error: "schema_name, table_name and retention_period are required",
      });
      return;
    }

    const policyValue =
      typeof retention_period === "string" ? retention_period : String(retention_period);

    const updateResult = await pool.query(
      `
      UPDATE metadata.data_governance_catalog
      SET retention_policy = $1, updated_at = NOW()
      WHERE schema_name = $2 AND table_name = $3
      `,
      [policyValue, schema_name.trim(), table_name.trim()]
    );

    if (updateResult.rowCount === 0) {
      res.status(404).json({ error: "Policy not found for the given schema and table" });
      return;
    }

    res.json({
      schema_name,
      table_name,
      retention_period: policyValue,
      archival_location: archival_location ?? null,
      policy_type: policy_type ?? null,
    });
  } catch (err) {
    const message = sanitizeError(err);
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/data-retention/jobs/schedule
 * Schedule a retention job (insert into metadata.data_retention_jobs).
 */
router.post("/jobs/schedule", async (req, res) => {
  try {
    const { schema_name, table_name, job_type, retention_policy, scheduled_date } =
      req.body || {};
    if (!schema_name || !table_name || !job_type || !retention_policy) {
      res.status(400).json({
        error: "schema_name, table_name, job_type and retention_policy are required",
      });
      return;
    }

    const result = await pool.query(
      `
      INSERT INTO metadata.data_retention_jobs
        (schema_name, table_name, job_type, retention_policy, scheduled_date, status)
      VALUES ($1, $2, $3, $4, $5::timestamp, 'SCHEDULED')
      RETURNING id, schema_name, table_name, job_type, retention_policy, scheduled_date, status
      `,
      [
        schema_name.trim(),
        table_name.trim(),
        job_type,
        retention_policy,
        scheduled_date || new Date().toISOString(),
      ]
    );

    const row = result.rows?.[0];
    if (!row) {
      res.status(500).json({ error: "Failed to create job" });
      return;
    }

    res.status(201).json({
      id: row.id,
      schema_name: row.schema_name,
      table_name: row.table_name,
      job_type: row.job_type,
      retention_policy: row.retention_policy,
      scheduled_date: row.scheduled_date,
      status: row.status,
    });
  } catch (err) {
    const message = sanitizeError(err);
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/data-retention/jobs/:id/execute
 * Mark job as executed (status update). Actual execution is done by C++ DataRetentionManager.
 */
router.post("/jobs/:id/execute", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id) || id < 1) {
      res.status(400).json({ error: "Invalid job id" });
      return;
    }

    const result = await pool.query(
      `
      UPDATE metadata.data_retention_jobs
      SET status = 'EXECUTING', executed_at = NOW()
      WHERE id = $1 AND status IN ('PENDING', 'SCHEDULED')
      RETURNING id, schema_name, table_name, status
      `,
      [id]
    );

    const row = result.rows?.[0];
    if (!row) {
      res.status(404).json({ error: "Job not found or not in executable state" });
      return;
    }

    res.json({
      id: row.id,
      schema_name: row.schema_name,
      table_name: row.table_name,
      status: row.status,
    });
  } catch (err) {
    const message = sanitizeError(err);
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/data-retention/enforce/:schemaName/:tableName
 * Set retention_enforced = true for the given table in governance catalog.
 */
router.post("/enforce/:schemaName/:tableName", async (req, res) => {
  try {
    const schemaName = decodeURIComponent(req.params.schemaName || "");
    const tableName = decodeURIComponent(req.params.tableName || "");
    if (!schemaName || !tableName) {
      res.status(400).json({ error: "schemaName and tableName are required" });
      return;
    }

    const result = await pool.query(
      `
      UPDATE metadata.data_governance_catalog
      SET retention_enforced = true, updated_at = NOW()
      WHERE schema_name = $1 AND table_name = $2
      `,
      [schemaName, tableName]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: "Table not found in governance catalog" });
      return;
    }

    res.json({
      schema_name: schemaName,
      table_name: tableName,
      retention_enforced: true,
    });
  } catch (err) {
    const message = sanitizeError(err);
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/data-retention/legal-holds
 * Set legal_hold = true for the given table (requires legal_hold columns in catalog).
 */
router.post("/legal-holds", async (req, res) => {
  try {
    const { schema_name, table_name, reason, hold_until } = req.body || {};
    if (!schema_name || !table_name || !reason) {
      res.status(400).json({
        error: "schema_name, table_name and reason are required",
      });
      return;
    }

    const result = await pool.query(
      `
      UPDATE metadata.data_governance_catalog
      SET legal_hold = true, legal_hold_reason = $1, legal_hold_until = $2::timestamp,
          retention_enforced = false, updated_at = NOW()
      WHERE schema_name = $3 AND table_name = $4
      RETURNING schema_name, table_name
      `,
      [reason.trim(), hold_until || null, schema_name.trim(), table_name.trim()]
    );

    if (result.rows?.length === 0) {
      res.status(404).json({ error: "Table not found in governance catalog" });
      return;
    }

    res.status(201).json({
      schema_name: result.rows[0].schema_name,
      table_name: result.rows[0].table_name,
      reason: reason.trim(),
      hold_until: hold_until || null,
    });
  } catch (err) {
    const message = sanitizeError(err);
    res.status(500).json({ error: message });
  }
});

/**
 * DELETE /api/data-retention/legal-holds/:id
 * Release legal hold. Id here is the row index from GET; we use schema_name/table_name from body or query.
 * Frontend may pass id; we need schema_name and table_name to update. For simplicity we support
 * DELETE with query params schema_name and table_name.
 */
router.delete("/legal-holds/:id", async (req, res) => {
  try {
    const schemaName = sanitizeSearch(req.query.schema_name, 100);
    const tableName = sanitizeSearch(req.query.table_name, 100);
    if (!schemaName || !tableName) {
      res.status(400).json({
        error: "schema_name and table_name query params are required to release a legal hold",
      });
      return;
    }

    const result = await pool.query(
      `
      UPDATE metadata.data_governance_catalog
      SET legal_hold = false, legal_hold_reason = NULL, legal_hold_until = NULL,
          retention_enforced = true, updated_at = NOW()
      WHERE schema_name = $1 AND table_name = $2
      `,
      [schemaName, tableName]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: "Table not found or legal hold already released" });
      return;
    }

    res.status(204).send();
  } catch (err) {
    const message = sanitizeError(err);
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/data-retention/archive
 * Record archival_location for the table; actual archive is done by C++ DataRetentionManager.
 */
router.post("/archive", async (req, res) => {
  try {
    const { schema_name, table_name, archival_location } = req.body || {};
    if (!schema_name || !table_name || !archival_location) {
      res.status(400).json({
        error: "schema_name, table_name and archival_location are required",
      });
      return;
    }

    const result = await pool.query(
      `
      UPDATE metadata.data_governance_catalog
      SET archival_location = $1, last_archived_at = NOW(), updated_at = NOW()
      WHERE schema_name = $2 AND table_name = $3
      RETURNING schema_name, table_name, archival_location
      `,
      [archival_location.trim(), schema_name.trim(), table_name.trim()]
    );

    if (result.rows?.length === 0) {
      res.status(404).json({ error: "Table not found in governance catalog" });
      return;
    }

    res.status(201).json({
      schema_name: result.rows[0].schema_name,
      table_name: result.rows[0].table_name,
      archival_location: result.rows[0].archival_location,
    });
  } catch (err) {
    const message = sanitizeError(err);
    res.status(500).json({ error: message });
  }
});

export default router;
