import express from "express";
import { pool } from "../services/database.service.js";
import { sanitizeError } from "../server-utils/errorHandler.js";
import { requireAuth, requireRole } from "../server-utils/auth.js";

const router = express.Router();

router.get("/policies",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const { schema_name, table_name, active, page = 1, limit = 20 } = req.query;

      let query = "SELECT * FROM metadata.rls_policies WHERE 1=1";
      const params = [];
      let paramCount = 0;

      if (schema_name) {
        paramCount++;
        query += ` AND schema_name ILIKE $${paramCount}`;
        params.push(`%${schema_name}%`);
      }

      if (table_name) {
        paramCount++;
        query += ` AND table_name ILIKE $${paramCount}`;
        params.push(`%${table_name}%`);
      }

      if (active !== undefined && active !== "") {
        paramCount++;
        query += ` AND active = $${paramCount}`;
        params.push(active === "true");
      }

      const countQuery = query.replace("SELECT *", "SELECT COUNT(*) as total");
      const countResult = await pool.query(countQuery, params);
      const total = parseInt(countResult.rows[0].total, 10);

      const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
      query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      params.push(parseInt(limit, 10), offset);

      const result = await pool.query(query, params);

      res.json({
        policies: result.rows,
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
      });
    } catch (err) {
      console.error("Error fetching RLS policies:", err);
      res.status(500).json({
        error: sanitizeError(
          err,
          "Error fetching RLS policies",
          process.env.NODE_ENV === "production"
        ),
      });
    }
  }
);

router.get("/policies/:id",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const policyId = parseInt(req.params.id);
      const result = await pool.query(
        "SELECT * FROM metadata.rls_policies WHERE policy_id = $1",
        [policyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "RLS policy not found" });
      }

      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error fetching RLS policy:", err);
      res.status(500).json({
        error: sanitizeError(
          err,
          "Error fetching RLS policy",
          process.env.NODE_ENV === "production"
        ),
      });
    }
  }
);

router.post("/policies",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const {
        policy_name,
        schema_name,
        table_name,
        policy_expression,
        policy_type,
        description,
        active,
      } = req.body;

      if (!policy_name || !schema_name || !table_name || !policy_expression) {
        return res.status(400).json({
          error: "policy_name, schema_name, table_name, and policy_expression are required",
        });
      }

      const result = await pool.query(
        `INSERT INTO metadata.rls_policies 
         (policy_name, schema_name, table_name, policy_expression, policy_type, description, active)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          policy_name,
          schema_name,
          table_name,
          policy_expression,
          policy_type || 'SELECT',
          description || null,
          active !== undefined ? active : true,
        ]
      );

      if (active !== false) {
        await pool.query("SELECT metadata.create_rls_policy($1, $2, $3, $4, $5)", [
          schema_name,
          table_name,
          policy_name,
          policy_expression,
          policy_type || 'SELECT',
        ]);
      }

      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error creating RLS policy:", err);
      res.status(500).json({
        error: sanitizeError(
          err,
          "Error creating RLS policy",
          process.env.NODE_ENV === "production"
        ),
      });
    }
  }
);

router.put("/policies/:id",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const policyId = parseInt(req.params.id);
      const {
        policy_name,
        policy_expression,
        policy_type,
        description,
        active,
      } = req.body;

      const policyResult = await pool.query(
        "SELECT * FROM metadata.rls_policies WHERE policy_id = $1",
        [policyId]
      );

      if (policyResult.rows.length === 0) {
        return res.status(404).json({ error: "RLS policy not found" });
      }

      const oldPolicy = policyResult.rows[0];

      const updates = [];
      const params = [];
      let paramCount = 0;

      if (policy_name !== undefined) {
        paramCount++;
        updates.push(`policy_name = $${paramCount}`);
        params.push(policy_name);
      }

      if (policy_expression !== undefined) {
        paramCount++;
        updates.push(`policy_expression = $${paramCount}`);
        params.push(policy_expression);
      }

      if (policy_type !== undefined) {
        paramCount++;
        updates.push(`policy_type = $${paramCount}`);
        params.push(policy_type);
      }

      if (description !== undefined) {
        paramCount++;
        updates.push(`description = $${paramCount}`);
        params.push(description);
      }

      if (active !== undefined) {
        paramCount++;
        updates.push(`active = $${paramCount}`);
        params.push(active);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: "No fields to update" });
      }

      paramCount++;
      updates.push(`updated_at = NOW()`);
      params.push(policyId);

      const result = await pool.query(
        `UPDATE metadata.rls_policies 
         SET ${updates.join(", ")}
         WHERE policy_id = $${paramCount}
         RETURNING *`,
        params
      );

      const newPolicy = result.rows[0];

      if (oldPolicy.active && !newPolicy.active) {
        await pool.query("SELECT metadata.drop_rls_policy($1, $2, $3)", [
          oldPolicy.schema_name,
          oldPolicy.table_name,
          oldPolicy.policy_name,
        ]);
      } else if (!oldPolicy.active && newPolicy.active) {
        await pool.query("SELECT metadata.create_rls_policy($1, $2, $3, $4, $5)", [
          newPolicy.schema_name,
          newPolicy.table_name,
          newPolicy.policy_name,
          newPolicy.policy_expression,
          newPolicy.policy_type,
        ]);
      } else if (newPolicy.active && (policy_expression !== undefined || policy_type !== undefined)) {
        await pool.query("SELECT metadata.drop_rls_policy($1, $2, $3)", [
          oldPolicy.schema_name,
          oldPolicy.table_name,
          oldPolicy.policy_name,
        ]);
        await pool.query("SELECT metadata.create_rls_policy($1, $2, $3, $4, $5)", [
          newPolicy.schema_name,
          newPolicy.table_name,
          newPolicy.policy_name,
          newPolicy.policy_expression,
          newPolicy.policy_type,
        ]);
      }

      res.json(newPolicy);
    } catch (err) {
      console.error("Error updating RLS policy:", err);
      res.status(500).json({
        error: sanitizeError(
          err,
          "Error updating RLS policy",
          process.env.NODE_ENV === "production"
        ),
      });
    }
  }
);

router.delete("/policies/:id",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const policyId = parseInt(req.params.id);
      const policyResult = await pool.query(
        "SELECT * FROM metadata.rls_policies WHERE policy_id = $1",
        [policyId]
      );

      if (policyResult.rows.length === 0) {
        return res.status(404).json({ error: "RLS policy not found" });
      }

      const policy = policyResult.rows[0];

      if (policy.active) {
        await pool.query("SELECT metadata.drop_rls_policy($1, $2, $3)", [
          policy.schema_name,
          policy.table_name,
          policy.policy_name,
        ]);
      }

      const result = await pool.query(
        "DELETE FROM metadata.rls_policies WHERE policy_id = $1 RETURNING *",
        [policyId]
      );

      res.json({ message: "RLS policy deleted successfully", policy: result.rows[0] });
    } catch (err) {
      console.error("Error deleting RLS policy:", err);
      res.status(500).json({
        error: sanitizeError(
          err,
          "Error deleting RLS policy",
          process.env.NODE_ENV === "production"
        ),
      });
    }
  }
);

router.post("/enable",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { schema_name, table_name } = req.body;

      if (!schema_name || !table_name) {
        return res.status(400).json({
          error: "schema_name and table_name are required",
        });
      }

      await pool.query("SELECT metadata.create_rls_policy($1, $2, $3, $4, $5)", [
        schema_name,
        table_name,
        'default_policy',
        'true',
        'ALL',
      ]);

      res.json({ message: "RLS enabled successfully" });
    } catch (err) {
      console.error("Error enabling RLS:", err);
      res.status(500).json({
        error: sanitizeError(
          err,
          "Error enabling RLS",
          process.env.NODE_ENV === "production"
        ),
      });
    }
  }
);

router.post("/disable",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { schema_name, table_name } = req.body;

      if (!schema_name || !table_name) {
        return res.status(400).json({
          error: "schema_name and table_name are required",
        });
      }

      await pool.query("SELECT metadata.disable_rls($1, $2)", [schema_name, table_name]);

      res.json({ message: "RLS disabled successfully" });
    } catch (err) {
      console.error("Error disabling RLS:", err);
      res.status(500).json({
        error: sanitizeError(
          err,
          "Error disabling RLS",
          process.env.NODE_ENV === "production"
        ),
      });
    }
  }
);

router.get("/policies-active",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const { schema_name, table_name } = req.query;

      const result = await pool.query("SELECT * FROM metadata.get_rls_policies($1, $2)", [
        schema_name || null,
        table_name || null,
      ]);

      res.json({ policies: result.rows });
    } catch (err) {
      console.error("Error fetching active RLS policies:", err);
      res.status(500).json({
        error: sanitizeError(
          err,
          "Error fetching active RLS policies",
          process.env.NODE_ENV === "production"
        ),
      });
    }
  }
);



export default router;
