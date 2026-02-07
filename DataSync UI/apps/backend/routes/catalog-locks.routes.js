import express from "express";
import { pool } from "../services/database.service.js";
import { sanitizeError } from "../server-utils/errorHandler.js";
import { validateIdentifier } from "../server-utils/validation.js";
import { requireAuth, requireRole } from "../server-utils/auth.js";

const router = express.Router();

router.get("/locks", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        lock_name,
        acquired_at,
        acquired_by,
        expires_at,
        session_id
      FROM metadata.catalog_locks
      ORDER BY acquired_at DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("Error getting catalog locks:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener locks del catálogo",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

router.get("/metrics", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_locks,
        COUNT(*) FILTER (WHERE expires_at > NOW()) as active_locks,
        COUNT(*) FILTER (WHERE expires_at <= NOW()) as expired_locks,
        COUNT(DISTINCT acquired_by) as unique_hosts
      FROM metadata.catalog_locks
    `);

    res.json(result.rows[0] || {});
  } catch (err) {
    console.error("Error getting catalog locks metrics:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener métricas de locks",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

router.delete(
  "/locks/:lockName",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    const lockName = validateIdentifier(req.params.lockName);

    if (!lockName) {
      return res.status(400).json({ error: "Invalid lockName" });
    }

    try {
      const result = await pool.query(
        `DELETE FROM metadata.catalog_locks WHERE lock_name = $1 RETURNING lock_name`,
        [lockName]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          error: "Lock not found",
          details: `Lock "${lockName}" does not exist`,
        });
      }

      res.json({
        success: true,
        message: `Lock "${lockName}" has been released`,
        lock_name: result.rows[0].lock_name,
      });
    } catch (err) {
      console.error("Error unlocking lock:", err);
      const safeError = sanitizeError(
        err,
        "Error al liberar lock",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

router.post(
  "/clean-expired",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const result = await pool.query(
        `DELETE FROM metadata.catalog_locks WHERE expires_at <= NOW() RETURNING lock_name`
      );

      res.json({
        success: true,
        message: `Cleaned ${result.rowCount} expired lock(s)`,
        cleaned_count: result.rowCount,
      });
    } catch (err) {
      console.error("Error cleaning expired locks:", err);
      const safeError = sanitizeError(
        err,
        "Error al limpiar locks expirados",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);





export default router;
