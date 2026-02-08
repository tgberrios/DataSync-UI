import express from "express";
import { pool } from "../services/database.service.js";
import { sanitizeError } from "../server-utils/errorHandler.js";
import { requireAuth, requireRole } from "../server-utils/auth.js";

const router = express.Router();

const WEBHOOK_TYPES = ["HTTP", "SLACK", "TEAMS", "TELEGRAM", "EMAIL"];

function normalizeLogArray(val) {
  if (Array.isArray(val)) return val;
  if (val == null) return [];
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

/** GET /api/webhooks — list all webhooks (same shape as C++ WebhookManager.getAllWebhooks). */
router.get("/", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, webhook_type, url, api_key, bot_token, chat_id,
              email_address, log_levels, log_categories, enabled, created_at, updated_at
       FROM metadata.webhooks
       ORDER BY created_at DESC`
    );

    const rows = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      webhook_type: row.webhook_type,
      url: row.url ?? undefined,
      api_key: row.api_key ?? undefined,
      bot_token: row.bot_token ?? undefined,
      chat_id: row.chat_id ?? undefined,
      email_address: row.email_address ?? undefined,
      log_levels: normalizeLogArray(row.log_levels),
      log_categories: normalizeLogArray(row.log_categories),
      enabled: Boolean(row.enabled),
      created_at: row.created_at ? new Date(row.created_at).toISOString() : null,
      updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : null,
    }));

    res.json(rows);
  } catch (err) {
    console.error("Error getting webhooks:", err);
    const safeError = sanitizeError(
      err,
      "Error getting webhooks",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

/** POST /api/webhooks — create webhook. */
router.post("/", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const {
      name,
      webhook_type,
      url,
      api_key,
      bot_token,
      chat_id,
      email_address,
      log_levels,
      log_categories,
      enabled,
    } = req.body;

    if (!name || !webhook_type) {
      return res.status(400).json({
        error: "Missing required fields: name, webhook_type",
      });
    }

    if (!WEBHOOK_TYPES.includes(webhook_type)) {
      return res.status(400).json({
        error: `Invalid webhook_type. Must be one of: ${WEBHOOK_TYPES.join(", ")}`,
      });
    }

    const logLevelsJson = JSON.stringify(Array.isArray(log_levels) ? log_levels : []);
    const logCategoriesJson = JSON.stringify(
      Array.isArray(log_categories) ? log_categories : []
    );

    const result = await pool.query(
      `INSERT INTO metadata.webhooks (
        name, webhook_type, url, api_key, bot_token, chat_id, email_address,
        log_levels, log_categories, enabled
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10)
      RETURNING id, name, webhook_type, url, api_key, bot_token, chat_id,
                email_address, log_levels, log_categories, enabled, created_at, updated_at`,
      [
        name,
        webhook_type,
        url ?? null,
        api_key ?? null,
        bot_token ?? null,
        chat_id ?? null,
        email_address ?? null,
        logLevelsJson,
        logCategoriesJson,
        enabled !== false,
      ]
    );

    const row = result.rows[0];
    res.status(201).json({
      id: row.id,
      name: row.name,
      webhook_type: row.webhook_type,
      url: row.url ?? undefined,
      api_key: row.api_key ?? undefined,
      bot_token: row.bot_token ?? undefined,
      chat_id: row.chat_id ?? undefined,
      email_address: row.email_address ?? undefined,
      log_levels: normalizeLogArray(row.log_levels),
      log_categories: normalizeLogArray(row.log_categories),
      enabled: Boolean(row.enabled),
      created_at: row.created_at ? new Date(row.created_at).toISOString() : null,
      updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : null,
    });
  } catch (err) {
    console.error("Error creating webhook:", err);
    const safeError = sanitizeError(
      err,
      "Error creating webhook",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

/** PUT /api/webhooks/:id — update webhook. */
router.put("/:id", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid webhook ID" });
    }

    const {
      name,
      webhook_type,
      url,
      api_key,
      bot_token,
      chat_id,
      email_address,
      log_levels,
      log_categories,
      enabled,
    } = req.body;

    if (!name || !webhook_type) {
      return res.status(400).json({
        error: "Missing required fields: name, webhook_type",
      });
    }

    if (!WEBHOOK_TYPES.includes(webhook_type)) {
      return res.status(400).json({
        error: `Invalid webhook_type. Must be one of: ${WEBHOOK_TYPES.join(", ")}`,
      });
    }

    const logLevelsJson = JSON.stringify(Array.isArray(log_levels) ? log_levels : []);
    const logCategoriesJson = JSON.stringify(
      Array.isArray(log_categories) ? log_categories : []
    );

    const result = await pool.query(
      `UPDATE metadata.webhooks
       SET name = $1, webhook_type = $2, url = $3, api_key = $4,
           bot_token = $5, chat_id = $6, email_address = $7,
           log_levels = $8::jsonb, log_categories = $9::jsonb, enabled = $10,
           updated_at = NOW()
       WHERE id = $11
       RETURNING id, name, webhook_type, url, api_key, bot_token, chat_id,
                 email_address, log_levels, log_categories, enabled, created_at, updated_at`,
      [
        name,
        webhook_type,
        url ?? null,
        api_key ?? null,
        bot_token ?? null,
        chat_id ?? null,
        email_address ?? null,
        logLevelsJson,
        logCategoriesJson,
        enabled !== false,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Webhook not found" });
    }

    const row = result.rows[0];
    res.json({
      id: row.id,
      name: row.name,
      webhook_type: row.webhook_type,
      url: row.url ?? undefined,
      api_key: row.api_key ?? undefined,
      bot_token: row.bot_token ?? undefined,
      chat_id: row.chat_id ?? undefined,
      email_address: row.email_address ?? undefined,
      log_levels: normalizeLogArray(row.log_levels),
      log_categories: normalizeLogArray(row.log_categories),
      enabled: Boolean(row.enabled),
      created_at: row.created_at ? new Date(row.created_at).toISOString() : null,
      updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : null,
    });
  } catch (err) {
    console.error("Error updating webhook:", err);
    const safeError = sanitizeError(
      err,
      "Error updating webhook",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

/** DELETE /api/webhooks/:id — delete webhook. */
router.delete("/:id", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid webhook ID" });
    }

    const result = await pool.query(
      "DELETE FROM metadata.webhooks WHERE id = $1 RETURNING id",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Webhook not found" });
    }

    res.status(204).send();
  } catch (err) {
    console.error("Error deleting webhook:", err);
    const safeError = sanitizeError(
      err,
      "Error deleting webhook",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

/** PATCH /api/webhooks/:id/enable — set enabled flag. */
router.patch("/:id/enable", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid webhook ID" });
    }

    const { enabled } = req.body;
    if (typeof enabled !== "boolean") {
      return res.status(400).json({ error: "Body must include boolean 'enabled'" });
    }

    const result = await pool.query(
      `UPDATE metadata.webhooks SET enabled = $1, updated_at = NOW() WHERE id = $2
       RETURNING id, name, webhook_type, enabled, created_at, updated_at`,
      [enabled, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Webhook not found" });
    }

    const row = result.rows[0];
    res.json({
      id: row.id,
      name: row.name,
      webhook_type: row.webhook_type,
      enabled: Boolean(row.enabled),
      created_at: row.created_at ? new Date(row.created_at).toISOString() : null,
      updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : null,
    });
  } catch (err) {
    console.error("Error updating webhook enable:", err);
    const safeError = sanitizeError(
      err,
      "Error updating webhook",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

export default router;
