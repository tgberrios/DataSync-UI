import express from "express";
import { pool } from "../services/database.service.js";
import { sanitizeError } from "../server-utils/errorHandler.js";
import { requireAuth, requireRole } from "../server-utils/auth.js";

const router = express.Router();

// Stream Configuration
router.get("/config", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT stream_type, topic, queue, stream, consumer_group, consumer_name,
              serialization_format, schema_registry_url, engine_config
       FROM metadata.stream_config 
       ORDER BY id DESC LIMIT 1`
    );

    if (result.rows.length === 0) {
      return res.json({
        streamType: 'KAFKA',
        topic: undefined,
        queue: undefined,
        stream: undefined,
        consumerGroup: '',
        consumerName: '',
        serializationFormat: 'JSON',
        schemaRegistryUrl: undefined,
        engineConfig: {}
      });
    }

    const row = result.rows[0];
    res.json({
      streamType: row.stream_type,
      topic: row.topic || undefined,
      queue: row.queue || undefined,
      stream: row.stream || undefined,
      consumerGroup: row.consumer_group || '',
      consumerName: row.consumer_name || '',
      serializationFormat: row.serialization_format || 'JSON',
      schemaRegistryUrl: row.schema_registry_url || undefined,
      engineConfig: row.engine_config || {}
    });
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting stream config", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

router.put("/config", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const { streamType, topic, queue, stream, consumerGroup, consumerName, serializationFormat, schemaRegistryUrl, engineConfig } = req.body;

    if (!streamType) {
      return res.status(400).json({ error: "streamType is required" });
    }

    const existing = await pool.query(`SELECT id FROM metadata.stream_config ORDER BY id DESC LIMIT 1`);
    
    if (existing.rows.length === 0) {
      await pool.query(
        `INSERT INTO metadata.stream_config 
         (stream_type, topic, queue, stream, consumer_group, consumer_name,
          serialization_format, schema_registry_url, engine_config)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)`,
        [streamType, topic || null, queue || null, stream || null, consumerGroup || null,
         consumerName || null, serializationFormat || 'JSON', schemaRegistryUrl || null,
         JSON.stringify(engineConfig || {})]
      );
    } else {
      await pool.query(
        `UPDATE metadata.stream_config SET
         stream_type = $1, topic = $2, queue = $3, stream = $4, consumer_group = $5,
         consumer_name = $6, serialization_format = $7, schema_registry_url = $8,
         engine_config = $9::jsonb, updated_at = NOW()
         WHERE id = $10`,
        [streamType, topic || null, queue || null, stream || null, consumerGroup || null,
         consumerName || null, serializationFormat || 'JSON', schemaRegistryUrl || null,
         JSON.stringify(engineConfig || {}), existing.rows[0].id]
      );
    }

    res.json({ success: true, message: "Stream configuration updated" });
  } catch (err) {
    const safeError = sanitizeError(err, "Error updating stream config", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

router.post("/config/test-connection", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    // TODO: Implementar test de conexión real con engines
    res.json({ success: true, message: "Connection test not yet implemented" });
  } catch (err) {
    const safeError = sanitizeError(err, "Error testing connection", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

// Stream Consumers
router.get("/consumers", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT consumer_id, consumer_group, consumer_name, status, thread_id,
              started_at, stopped_at, error_message
       FROM metadata.stream_consumers
       ORDER BY started_at DESC`
    );

    res.json(result.rows.map(row => ({
      consumerId: row.consumer_id,
      consumerGroup: row.consumer_group,
      consumerName: row.consumer_name,
      status: row.status,
      threadId: row.thread_id,
      startedAt: row.started_at,
      stoppedAt: row.stopped_at,
      errorMessage: row.error_message
    })));
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting consumers", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

router.post("/consumers", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const { streamConfigId, consumerGroup, consumerName } = req.body;

    if (!consumerGroup || !consumerName) {
      return res.status(400).json({ error: "consumerGroup and consumerName are required" });
    }

    const consumerId = `consumer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await pool.query(
      `INSERT INTO metadata.stream_consumers 
       (consumer_id, stream_config_id, consumer_group, consumer_name, status)
       VALUES ($1, $2, $3, $4, 'ACTIVE')`,
      [consumerId, streamConfigId || null, consumerGroup, consumerName]
    );

    res.json({ success: true, consumerId });
  } catch (err) {
    const safeError = sanitizeError(err, "Error creating consumer", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

router.delete("/consumers/:consumerId", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    await pool.query(
      `UPDATE metadata.stream_consumers 
       SET status = 'STOPPED', stopped_at = NOW()
       WHERE consumer_id = $1`,
      [req.params.consumerId]
    );

    res.json({ success: true, message: "Consumer stopped" });
  } catch (err) {
    const safeError = sanitizeError(err, "Error stopping consumer", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

router.get("/consumers/:consumerId/stats", requireAuth, async (req, res) => {
  try {
    // TODO: Obtener estadísticas reales del consumidor
    res.json({
      messagesProcessed: 0,
      messagesFailed: 0,
      bytesProcessed: 0,
      averageLatencyMs: 0,
      errors: 0
    });
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting consumer stats", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

// Windowing
router.get("/windows", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT window_id, window_type, window_size_seconds, slide_interval_seconds,
              session_timeout_seconds, start_time, end_time, event_count, is_closed
       FROM metadata.stream_windows
       WHERE is_closed = false
       ORDER BY start_time DESC`
    );

    res.json(result.rows.map(row => ({
      windowId: row.window_id,
      windowType: row.window_type,
      windowSizeSeconds: row.window_size_seconds,
      slideIntervalSeconds: row.slide_interval_seconds,
      sessionTimeoutSeconds: row.session_timeout_seconds,
      startTime: row.start_time,
      endTime: row.end_time,
      eventCount: row.event_count,
      isClosed: row.is_closed
    })));
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting windows", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

router.get("/windows/:windowId", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM metadata.stream_windows WHERE window_id = $1`,
      [req.params.windowId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Window not found" });
    }

    const row = result.rows[0];
    res.json({
      windowId: row.window_id,
      windowType: row.window_type,
      windowSizeSeconds: row.window_size_seconds,
      slideIntervalSeconds: row.slide_interval_seconds,
      sessionTimeoutSeconds: row.session_timeout_seconds,
      startTime: row.start_time,
      endTime: row.end_time,
      eventCount: row.event_count,
      isClosed: row.is_closed,
      aggregatedData: row.aggregated_data
    });
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting window", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

router.post("/windows", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const { windowType, windowSizeSeconds, slideIntervalSeconds, sessionTimeoutSeconds } = req.body;

    const windowId = `window_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await pool.query(
      `INSERT INTO metadata.stream_windows 
       (window_id, window_type, window_size_seconds, slide_interval_seconds, session_timeout_seconds, start_time)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [windowId, windowType || 'TUMBLING', windowSizeSeconds || 60,
       slideIntervalSeconds || null, sessionTimeoutSeconds || null]
    );

    res.json({ success: true, windowId });
  } catch (err) {
    const safeError = sanitizeError(err, "Error creating window", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

// Stateful Processing
router.get("/state/:key", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT state_key, state_value, last_updated, update_count
       FROM metadata.stream_state WHERE state_key = $1`,
      [req.params.key]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "State not found" });
    }

    const row = result.rows[0];
    res.json({
      key: row.state_key,
      value: row.state_value,
      lastUpdated: row.last_updated,
      updateCount: row.update_count
    });
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting state", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

router.put("/state/:key", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const { value } = req.body;

    await pool.query(
      `INSERT INTO metadata.stream_state (state_key, state_value, last_updated, update_count)
       VALUES ($1, $2::jsonb, NOW(), 1)
       ON CONFLICT (state_key) 
       DO UPDATE SET state_value = $2::jsonb, last_updated = NOW(), update_count = stream_state.update_count + 1`,
      [req.params.key, JSON.stringify(value)]
    );

    res.json({ success: true, message: "State updated" });
  } catch (err) {
    const safeError = sanitizeError(err, "Error updating state", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

router.delete("/state/:key", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    await pool.query(`DELETE FROM metadata.stream_state WHERE state_key = $1`, [req.params.key]);
    res.json({ success: true, message: "State cleared" });
  } catch (err) {
    const safeError = sanitizeError(err, "Error clearing state", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

// CEP Rules
router.get("/cep/rules", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT rule_id, name, description, pattern, conditions, actions, enabled, window_seconds
       FROM metadata.stream_cep_rules
       ORDER BY created_at DESC`
    );

    res.json(result.rows.map(row => ({
      ruleId: row.rule_id,
      name: row.name,
      description: row.description,
      pattern: row.pattern,
      conditions: row.conditions,
      actions: row.actions,
      enabled: row.enabled,
      windowSeconds: row.window_seconds
    })));
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting CEP rules", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

router.post("/cep/rules", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const { ruleId, name, description, pattern, conditions, actions, enabled, windowSeconds } = req.body;

    if (!ruleId || !name || !pattern) {
      return res.status(400).json({ error: "ruleId, name, and pattern are required" });
    }

    await pool.query(
      `INSERT INTO metadata.stream_cep_rules 
       (rule_id, name, description, pattern, conditions, actions, enabled, window_seconds)
       VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7, $8)`,
      [ruleId, name, description || null, JSON.stringify(pattern),
       JSON.stringify(conditions || {}), JSON.stringify(actions || {}),
       enabled !== false, windowSeconds || 300]
    );

    res.json({ success: true, message: "CEP rule created" });
  } catch (err) {
    const safeError = sanitizeError(err, "Error creating CEP rule", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

router.put("/cep/rules/:ruleId", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const { name, description, pattern, conditions, actions, enabled, windowSeconds } = req.body;

    await pool.query(
      `UPDATE metadata.stream_cep_rules SET
       name = $1, description = $2, pattern = $3::jsonb, conditions = $4::jsonb,
       actions = $5::jsonb, enabled = $6, window_seconds = $7, updated_at = NOW()
       WHERE rule_id = $8`,
      [name, description || null, JSON.stringify(pattern), JSON.stringify(conditions || {}),
       JSON.stringify(actions || {}), enabled !== false, windowSeconds || 300, req.params.ruleId]
    );

    res.json({ success: true, message: "CEP rule updated" });
  } catch (err) {
    const safeError = sanitizeError(err, "Error updating CEP rule", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

router.delete("/cep/rules/:ruleId", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    await pool.query(`DELETE FROM metadata.stream_cep_rules WHERE rule_id = $1`, [req.params.ruleId]);
    res.json({ success: true, message: "CEP rule deleted" });
  } catch (err) {
    const safeError = sanitizeError(err, "Error deleting CEP rule", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

router.get("/cep/matches", requireAuth, async (req, res) => {
  try {
    const { ruleId } = req.query;
    let query = `SELECT match_id, rule_id, matched_events, match_time, metadata
                 FROM metadata.stream_cep_matches`;
    const params = [];

    if (ruleId) {
      query += ` WHERE rule_id = $1`;
      params.push(ruleId);
    }

    query += ` ORDER BY match_time DESC LIMIT 100`;

    const result = await pool.query(query, params);
    res.json(result.rows.map(row => ({
      matchId: row.match_id,
      ruleId: row.rule_id,
      matchedEvents: row.matched_events,
      matchTime: row.match_time,
      metadata: row.metadata
    })));
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting CEP matches", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

// Native CDC
router.get("/native-cdc/config", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, db_engine, connection_string, cdc_type, database_name, table_name,
              position, status, error_message, started_at, stopped_at
       FROM metadata.native_cdc_config
       ORDER BY created_at DESC`
    );

    res.json(result.rows.map(row => ({
      id: row.id,
      dbEngine: row.db_engine,
      connectionString: row.connection_string,
      cdcType: row.cdc_type,
      databaseName: row.database_name,
      tableName: row.table_name,
      position: row.position,
      status: row.status,
      errorMessage: row.error_message,
      startedAt: row.started_at,
      stoppedAt: row.stopped_at
    })));
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting native CDC config", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

router.put("/native-cdc/config", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const { id, dbEngine, connectionString, cdcType, databaseName, tableName, position } = req.body;

    if (!dbEngine || !connectionString || !cdcType) {
      return res.status(400).json({ error: "dbEngine, connectionString, and cdcType are required" });
    }

    if (id) {
      await pool.query(
        `UPDATE metadata.native_cdc_config SET
         connection_string = $1, position = $2, updated_at = NOW()
         WHERE id = $3`,
        [connectionString, position || null, id]
      );
    } else {
      await pool.query(
        `INSERT INTO metadata.native_cdc_config 
         (db_engine, connection_string, cdc_type, database_name, table_name, position)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [dbEngine, connectionString, cdcType, databaseName || null, tableName || null, position || null]
      );
    }

    res.json({ success: true, message: "Native CDC configuration updated" });
  } catch (err) {
    const safeError = sanitizeError(err, "Error updating native CDC config", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

router.post("/native-cdc/start", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const { id } = req.body;

    await pool.query(
      `UPDATE metadata.native_cdc_config 
       SET status = 'RUNNING', started_at = NOW(), stopped_at = NULL, error_message = NULL
       WHERE id = $1`,
      [id]
    );

    res.json({ success: true, message: "Native CDC started" });
  } catch (err) {
    const safeError = sanitizeError(err, "Error starting native CDC", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

router.post("/native-cdc/stop", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const { id } = req.body;

    await pool.query(
      `UPDATE metadata.native_cdc_config 
       SET status = 'STOPPED', stopped_at = NOW()
       WHERE id = $1`,
      [id]
    );

    res.json({ success: true, message: "Native CDC stopped" });
  } catch (err) {
    const safeError = sanitizeError(err, "Error stopping native CDC", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

router.get("/native-cdc/position", requireAuth, async (req, res) => {
  try {
    const { id } = req.query;

    const result = await pool.query(
      `SELECT position FROM metadata.native_cdc_config WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "CDC config not found" });
    }

    res.json({ position: result.rows[0].position });
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting CDC position", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

// Statistics
router.get("/stats", requireAuth, async (req, res) => {
  try {
    const consumersResult = await pool.query(
      `SELECT COUNT(*) FILTER (WHERE status = 'ACTIVE') as active,
              COUNT(*) FILTER (WHERE status = 'STOPPED') as stopped
       FROM metadata.stream_consumers`
    );

    const cepResult = await pool.query(
      `SELECT COUNT(*) as rules_count FROM metadata.stream_cep_rules WHERE enabled = true`
    );

    const matchesResult = await pool.query(
      `SELECT COUNT(*) as matches_count FROM metadata.stream_cep_matches
       WHERE match_time > NOW() - INTERVAL '24 hours'`
    );

    const cdcResult = await pool.query(
      `SELECT COUNT(*) FILTER (WHERE status = 'RUNNING') as running
       FROM metadata.native_cdc_config`
    );

    res.json({
      consumers: {
        active: parseInt(consumersResult.rows[0].active) || 0,
        stopped: parseInt(consumersResult.rows[0].stopped) || 0
      },
      cep: {
        activeRules: parseInt(cepResult.rows[0].rules_count) || 0,
        matchesLast24h: parseInt(matchesResult.rows[0].matches_count) || 0
      },
      nativeCDC: {
        running: parseInt(cdcResult.rows[0].running) || 0
      }
    });
  } catch (err) {
    const safeError = sanitizeError(err, "Error getting stream processing stats", process.env.NODE_ENV === "production");
    res.status(500).json({ error: safeError });
  }
});

// ============================================================================
// Performance Optimization API Endpoints
// ============================================================================

// Partitioning Configuration


export default router;
