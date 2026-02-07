import express from "express";
import { pool } from "../services/database.service.js";
import { sanitizeError } from "../server-utils/errorHandler.js";
import { requireAuth, requireRole } from "../server-utils/auth.js";

const router = express.Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const { transformation_type } = req.query;
    let query = `
      SELECT id, name, description, transformation_type, config,
             created_by, created_at, updated_at
      FROM metadata.transformations
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (transformation_type) {
      paramCount++;
      query += ` AND transformation_type = $${paramCount}`;
      params.push(transformation_type);
    }

    query += ` ORDER BY name ASC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Error getting transformations:", err);
    const safeError = sanitizeError(
      err,
      "Error getting transformations",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

router.post(
  "/",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const { name, description, transformation_type, config } = req.body;
      const user = req.user?.username || "system";

      if (!name || !transformation_type || !config) {
        return res.status(400).json({
          error: "Missing required fields: name, transformation_type, config",
        });
      }

      const result = await pool.query(
        `INSERT INTO metadata.transformations 
        (name, description, transformation_type, config, created_by)
        VALUES ($1, $2, $3, $4::jsonb, $5)
        RETURNING *`,
        [name, description || null, transformation_type, JSON.stringify(config), user]
      );

      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error creating transformation:", err);
      const safeError = sanitizeError(
        err,
        "Error creating transformation",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

router.put(
  "/:id",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const transformationId = parseInt(req.params.id);
      if (isNaN(transformationId)) {
        return res.status(400).json({ error: "Invalid transformation ID" });
      }

      const { name, description, transformation_type, config } = req.body;

      const result = await pool.query(
        `UPDATE metadata.transformations 
       SET name = $1, description = $2, transformation_type = $3,
           config = $4::jsonb, updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
        [name, description || null, transformation_type, JSON.stringify(config), transformationId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Transformation not found" });
      }

      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error updating transformation:", err);
      const safeError = sanitizeError(
        err,
        "Error updating transformation",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

router.delete(
  "/:id",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const transformationId = parseInt(req.params.id);
      if (isNaN(transformationId)) {
        return res.status(400).json({ error: "Invalid transformation ID" });
      }

      await pool.query(`DELETE FROM metadata.transformations WHERE id = $1`, [transformationId]);

      res.json({ message: "Transformation deleted successfully" });
    } catch (err) {
      console.error("Error deleting transformation:", err);
      const safeError = sanitizeError(
        err,
        "Error deleting transformation",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

router.get("/:id/usage", requireAuth, async (req, res) => {
  try {
    const transformationId = parseInt(req.params.id);
    if (isNaN(transformationId)) {
      return res.status(400).json({ error: "Invalid transformation ID" });
    }

    const result = await pool.query(
      `SELECT job_name, usage_count, last_used_at
       FROM metadata.transformation_usage
       WHERE transformation_id = $1
       ORDER BY last_used_at DESC`,
      [transformationId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error getting transformation usage:", err);
    const safeError = sanitizeError(
      err,
      "Error getting transformation usage",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});



export default router;
