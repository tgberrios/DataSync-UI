import express from "express";
import { pool, config } from "../services/database.service.js";
import { sanitizeError } from "../server-utils/errorHandler.js";
import { sanitizeSearch } from "../server-utils/validation.js";
import { requireAuth, requireRole } from "../server-utils/auth.js";

const router = express.Router();

// Obtener todas las configuraciones
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT key, value, description, updated_at FROM metadata.config ORDER BY key"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error getting configurations:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener configuraciones",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

// Crear una nueva configuración
router.post("/", requireAuth, requireRole("admin"), async (req, res) => {
  const { key, value, description } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO metadata.config (key, value, description) VALUES ($1, $2, $3) RETURNING *",
      [key, value, description]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error creating configuration:", err);
    const safeError = sanitizeError(
      err,
      "Error al crear configuración",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

// Actualizar una configuración
router.put(
  "/:key",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    const key = sanitizeSearch(req.params.key, 100);
    const value = sanitizeSearch(req.body.value, 500);
    const description = sanitizeSearch(req.body.description, 500);

    if (!key || key.trim() === "") {
      return res.status(400).json({ error: "Invalid key" });
    }

    try {
      const result = await pool.query(
        "UPDATE metadata.config SET value = $1, description = $2, updated_at = NOW() WHERE key = $3 RETURNING *",
        [value || "", description || "", key]
      );
      if (result.rows.length === 0) {
        res.status(404).json({ error: "Configuración no encontrada" });
        return;
      }
      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error updating configuration:", err);
      const safeError = sanitizeError(
        err,
        "Error al actualizar configuración",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

// Eliminar una configuración
router.delete(
  "/:key",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    const key = sanitizeSearch(req.params.key, 100);

    if (!key || key.trim() === "") {
      return res.status(400).json({ error: "Invalid key" });
    }

    try {
      const result = await pool.query(
        "DELETE FROM metadata.config WHERE key = $1 RETURNING *",
        [key]
      );
      if (result.rows.length === 0) {
        res.status(404).json({ error: "Configuración no encontrada" });
        return;
      }
      res.json({ message: "Configuración eliminada correctamente" });
    } catch (err) {
      console.error("Error deleting configuration:", err);
      const safeError = sanitizeError(
        err,
        "Error al eliminar configuración",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

// Obtener configuración de batch size específicamente
router.get("/batch", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT t.* FROM metadata.config t WHERE key = 'chunk_size'"
    );
    if (result.rows.length === 0) {
      res.json({
        key: "chunk_size",
        value: "25000",
        description: "Tamaño de lote para procesamiento de datos",
        updated_at: new Date().toISOString(),
      });
    } else {
      res.json(result.rows[0]);
    }
  } catch (err) {
    console.error("Error getting batch configuration:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener configuración de batch",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

export default router;
