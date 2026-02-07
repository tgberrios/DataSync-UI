import express from "express";
import { pool } from "../services/database.service.js";
import { sanitizeError } from "../server-utils/errorHandler.js";
import { requireAuth, requireRole } from "../server-utils/auth.js";
import { validateIdentifier } from "../server-utils/validation.js";

const router = express.Router();

router.get("/policies",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const {
        schema_name,
        table_name,
        active,
        page = 1,
        limit = 20,
      } = req.query;

      let query = "SELECT * FROM metadata.encryption_policies WHERE 1=1";
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
      console.error("Error fetching encryption policies:", err);
      res.status(500).json({
        error: sanitizeError(
          err,
          "Error fetching encryption policies",
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
        "SELECT * FROM metadata.encryption_policies WHERE policy_id = $1",
        [policyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Encryption policy not found" });
      }

      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error fetching encryption policy:", err);
      res.status(500).json({
        error: sanitizeError(
          err,
          "Error fetching encryption policy",
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
        column_name,
        encryption_algorithm,
        key_id,
        key_rotation_interval_days,
        active,
      } = req.body;

      if (!policy_name || !schema_name || !table_name || !column_name || !key_id) {
        return res.status(400).json({
          error: "policy_name, schema_name, table_name, column_name, and key_id are required",
        });
      }

      const result = await pool.query(
        `INSERT INTO metadata.encryption_policies 
         (policy_name, schema_name, table_name, column_name, encryption_algorithm, key_id, key_rotation_interval_days, active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          policy_name,
          schema_name,
          table_name,
          column_name,
          encryption_algorithm || 'AES256',
          key_id,
          key_rotation_interval_days || 90,
          active !== undefined ? active : true,
        ]
      );

      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error creating encryption policy:", err);
      res.status(500).json({
        error: sanitizeError(
          err,
          "Error creating encryption policy",
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
        encryption_algorithm,
        key_id,
        key_rotation_interval_days,
        active,
      } = req.body;

      const updates = [];
      const params = [];
      let paramCount = 0;

      if (policy_name !== undefined) {
        paramCount++;
        updates.push(`policy_name = $${paramCount}`);
        params.push(policy_name);
      }

      if (encryption_algorithm !== undefined) {
        paramCount++;
        updates.push(`encryption_algorithm = $${paramCount}`);
        params.push(encryption_algorithm);
      }

      if (key_id !== undefined) {
        paramCount++;
        updates.push(`key_id = $${paramCount}`);
        params.push(key_id);
      }

      if (key_rotation_interval_days !== undefined) {
        paramCount++;
        updates.push(`key_rotation_interval_days = $${paramCount}`);
        params.push(key_rotation_interval_days);
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
        `UPDATE metadata.encryption_policies 
         SET ${updates.join(", ")}
         WHERE policy_id = $${paramCount}
         RETURNING *`,
        params
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Encryption policy not found" });
      }

      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error updating encryption policy:", err);
      res.status(500).json({
        error: sanitizeError(
          err,
          "Error updating encryption policy",
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
      const result = await pool.query(
        "DELETE FROM metadata.encryption_policies WHERE policy_id = $1 RETURNING *",
        [policyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Encryption policy not found" });
      }

      res.json({ message: "Encryption policy deleted successfully", policy: result.rows[0] });
    } catch (err) {
      console.error("Error deleting encryption policy:", err);
      res.status(500).json({
        error: sanitizeError(
          err,
          "Error deleting encryption policy",
          process.env.NODE_ENV === "production"
        ),
      });
    }
  }
);

router.post("/encrypt-column",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { schema_name, table_name, column_name, key_id } = req.body;

      if (!schema_name || !table_name || !column_name || !key_id) {
        return res.status(400).json({
          error: "schema_name, table_name, column_name, and key_id are required",
        });
      }

      const result = await pool.query(
        `UPDATE ${validateIdentifier(schema_name)}.${validateIdentifier(table_name)}
         SET ${validateIdentifier(column_name)} = encode(
           encrypt(${validateIdentifier(column_name)}::bytea, 
                   (SELECT key_value FROM metadata.encryption_keys WHERE key_id = $1 AND active = true LIMIT 1),
                   'aes'),
           'base64')
         WHERE ${validateIdentifier(column_name)} IS NOT NULL
         RETURNING COUNT(*) as rows_updated`,
        [key_id]
      );

      res.json({
        message: "Column encrypted successfully",
        rows_updated: parseInt(result.rows[0].rows_updated, 10),
      });
    } catch (err) {
      console.error("Error encrypting column:", err);
      res.status(500).json({
        error: sanitizeError(
          err,
          "Error encrypting column",
          process.env.NODE_ENV === "production"
        ),
      });
    }
  }
);

router.post("/rotate-key",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { policy_id, new_key_id } = req.body;

      if (!policy_id || !new_key_id) {
        return res.status(400).json({
          error: "policy_id and new_key_id are required",
        });
      }

      await pool.query("SELECT metadata.rotate_encryption_key($1, $2)", [
        policy_id,
        new_key_id,
      ]);

      res.json({ message: "Encryption key rotated successfully" });
    } catch (err) {
      console.error("Error rotating encryption key:", err);
      res.status(500).json({
        error: sanitizeError(
          err,
          "Error rotating encryption key",
          process.env.NODE_ENV === "production"
        ),
      });
    }
  }
);

router.get("/keys",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const result = await pool.query(
        "SELECT key_id, algorithm, created_at, last_used_at, rotation_count, active FROM metadata.encryption_keys WHERE active = true ORDER BY created_at DESC"
      );

      res.json({ keys: result.rows });
    } catch (err) {
      console.error("Error fetching encryption keys:", err);
      res.status(500).json({
        error: sanitizeError(
          err,
          "Error fetching encryption keys",
          process.env.NODE_ENV === "production"
        ),
      });
    }
  }
);

router.post("/keys",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { key_id, key_value, algorithm } = req.body;

      if (!key_id || !key_value) {
        return res.status(400).json({
          error: "key_id and key_value are required",
        });
      }

      const result = await pool.query(
        `INSERT INTO metadata.encryption_keys (key_id, key_value, algorithm)
         VALUES ($1, $2, $3)
         ON CONFLICT (key_id) DO UPDATE SET
           key_value = EXCLUDED.key_value,
           algorithm = EXCLUDED.algorithm,
           rotation_count = encryption_keys.rotation_count + 1
         RETURNING key_id, algorithm, created_at, rotation_count`,
        [key_id, key_value, algorithm || 'AES256']
      );

      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error creating encryption key:", err);
      res.status(500).json({
        error: sanitizeError(
          err,
          "Error creating encryption key",
          process.env.NODE_ENV === "production"
        ),
      });
    }
  }
);



export default router;
