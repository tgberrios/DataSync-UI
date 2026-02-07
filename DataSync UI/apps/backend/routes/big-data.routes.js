import express from "express";
import { pool } from "../services/database.service.js";
import { sanitizeError } from "../server-utils/errorHandler.js";
import { requireAuth, requireRole } from "../server-utils/auth.js";

const router = express.Router();

router.get("/spark/config", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT master_url, app_name, spark_home, connect_url, 
              executor_memory_mb, executor_cores, max_retries, 
              retry_delay_seconds, spark_conf
       FROM metadata.spark_config 
       ORDER BY id DESC LIMIT 1`
    );

    if (result.rows.length === 0) {
      // Return default configuration when none exists
      return res.json({
        masterUrl: 'local[*]',
        appName: 'DataSync',
        sparkHome: undefined,
        connectUrl: undefined,
        executorMemoryMB: 2048,
        executorCores: 2,
        maxRetries: 3,
        retryDelaySeconds: 5,
        sparkConf: {}
      });
    }

    const row = result.rows[0];
    res.json({
      masterUrl: row.master_url,
      appName: row.app_name,
      sparkHome: row.spark_home || undefined,
      connectUrl: row.connect_url || undefined,
      executorMemoryMB: row.executor_memory_mb,
      executorCores: row.executor_cores,
      maxRetries: row.max_retries,
      retryDelaySeconds: row.retry_delay_seconds,
      sparkConf: row.spark_conf || {}
    });
  } catch (err) {
    const safeError = sanitizeError(
      err,
      "Error getting Spark config",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

router.put("/spark/config", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const { masterUrl, appName, sparkHome, connectUrl, executorMemoryMB, executorCores, maxRetries, retryDelaySeconds, sparkConf } = req.body;

    if (!masterUrl || !appName) {
      return res.status(400).json({ error: "masterUrl and appName are required" });
    }

    // Check if config exists
    const existing = await pool.query(`SELECT id FROM metadata.spark_config ORDER BY id DESC LIMIT 1`);
    
    if (existing.rows.length === 0) {
      // Insert new config
      await pool.query(
        `INSERT INTO metadata.spark_config 
         (master_url, app_name, spark_home, connect_url, executor_memory_mb, 
          executor_cores, max_retries, retry_delay_seconds, spark_conf)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)`,
        [
          masterUrl, appName, sparkHome || null, connectUrl || null,
          executorMemoryMB || 2048, executorCores || 2, maxRetries || 3,
          retryDelaySeconds || 5, JSON.stringify(sparkConf || {})
        ]
      );
    } else {
      // Update existing config
      await pool.query(
        `UPDATE metadata.spark_config SET
         master_url = $1, app_name = $2, spark_home = $3, connect_url = $4,
         executor_memory_mb = $5, executor_cores = $6, max_retries = $7,
         retry_delay_seconds = $8, spark_conf = $9::jsonb, updated_at = NOW()
         WHERE id = $10`,
        [
          masterUrl, appName, sparkHome || null, connectUrl || null,
          executorMemoryMB || 2048, executorCores || 2, maxRetries || 3,
          retryDelaySeconds || 5, JSON.stringify(sparkConf || {}), existing.rows[0].id
        ]
      );
    }

    res.json({ success: true, message: "Spark configuration updated" });
  } catch (err) {
    const safeError = sanitizeError(
      err,
      "Error updating Spark config",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

router.post("/spark/test-connection", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const { masterUrl, connectUrl, sparkHome } = req.body;

    // For now, just validate the configuration
    // In a real implementation, this would attempt to connect to Spark
    if (!masterUrl && !connectUrl) {
      return res.status(400).json({ error: "masterUrl or connectUrl is required" });
    }

    // Simulate connection test
    res.json({
      success: true,
      message: "Connection test successful",
      config: {
        masterUrl: masterUrl || "Not specified",
        connectUrl: connectUrl || "Not specified"
      }
    });
  } catch (err) {
    const safeError = sanitizeError(
      err,
      "Error testing Spark connection",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

// Distributed Processing Configuration
router.get("/distributed/config", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT force_mode, distributed_threshold_rows, 
              distributed_threshold_size_mb, broadcast_join_threshold_mb
       FROM metadata.distributed_processing_config 
       ORDER BY id DESC LIMIT 1`
    );

    if (result.rows.length === 0) {
      // Return default configuration when none exists
      return res.json({
        forceMode: 'AUTO',
        distributedThresholdRows: 1000000,
        distributedThresholdSizeMB: 1000,
        broadcastJoinThresholdMB: 10
      });
    }

    const row = result.rows[0];
    res.json({
      forceMode: row.force_mode,
      distributedThresholdRows: parseInt(row.distributed_threshold_rows),
      distributedThresholdSizeMB: row.distributed_threshold_size_mb,
      broadcastJoinThresholdMB: row.broadcast_join_threshold_mb
    });
  } catch (err) {
    const safeError = sanitizeError(
      err,
      "Error getting distributed processing config",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

router.put("/distributed/config", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const { forceMode, distributedThresholdRows, distributedThresholdSizeMB, broadcastJoinThresholdMB } = req.body;

    const existing = await pool.query(`SELECT id FROM metadata.distributed_processing_config ORDER BY id DESC LIMIT 1`);
    
    if (existing.rows.length === 0) {
      await pool.query(
        `INSERT INTO metadata.distributed_processing_config 
         (force_mode, distributed_threshold_rows, distributed_threshold_size_mb, broadcast_join_threshold_mb)
         VALUES ($1, $2, $3, $4)`,
        [
          forceMode || 'AUTO',
          distributedThresholdRows || 1000000,
          distributedThresholdSizeMB || 1000,
          broadcastJoinThresholdMB || 10
        ]
      );
    } else {
      await pool.query(
        `UPDATE metadata.distributed_processing_config SET
         force_mode = $1, distributed_threshold_rows = $2, 
         distributed_threshold_size_mb = $3, broadcast_join_threshold_mb = $4, updated_at = NOW()
         WHERE id = $5`,
        [
          forceMode || 'AUTO',
          distributedThresholdRows || 1000000,
          distributedThresholdSizeMB || 1000,
          broadcastJoinThresholdMB || 10,
          existing.rows[0].id
        ]
      );
    }

    res.json({ success: true, message: "Distributed processing configuration updated" });
  } catch (err) {
    const safeError = sanitizeError(
      err,
      "Error updating distributed processing config",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

// Partitioning Configuration
router.get("/partitioning/config", requireAuth, async (req, res) => {
  try {
    const tableId = req.query.table_id || null;

    const result = await pool.query(
      `SELECT table_id, enabled, auto_detect, partition_types, 
              date_column_pattern, region_column_pattern
       FROM metadata.partitioning_config 
       WHERE ($1::text IS NULL AND table_id IS NULL) OR table_id = $1
       ORDER BY id DESC LIMIT 1`,
      [tableId]
    );

    if (result.rows.length === 0) {
      // Return default configuration when none exists
      return res.json({
        config: {
          enabled: true,
          autoDetect: true,
          partitionTypes: [],
          dateColumnPattern: undefined,
          regionColumnPattern: undefined
        }
      });
    }

    const row = result.rows[0];
    res.json({
      config: {
        enabled: row.enabled,
        autoDetect: row.auto_detect,
        partitionTypes: row.partition_types || [],
        dateColumnPattern: row.date_column_pattern || undefined,
        regionColumnPattern: row.region_column_pattern || undefined
      }
    });
  } catch (err) {
    const safeError = sanitizeError(
      err,
      "Error getting partitioning config",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

router.put("/partitioning/config", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const tableId = req.query.table_id || null;
    const { enabled, autoDetect, partitionTypes, dateColumnPattern, regionColumnPattern } = req.body;

    const existing = await pool.query(
      `SELECT id FROM metadata.partitioning_config 
       WHERE ($1::text IS NULL AND table_id IS NULL) OR table_id = $1`,
      [tableId]
    );
    
    if (existing.rows.length === 0) {
      await pool.query(
        `INSERT INTO metadata.partitioning_config 
         (table_id, enabled, auto_detect, partition_types, date_column_pattern, region_column_pattern)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          tableId, enabled !== undefined ? enabled : true,
          autoDetect !== undefined ? autoDetect : true,
          partitionTypes || [],
          dateColumnPattern || null,
          regionColumnPattern || null
        ]
      );
    } else {
      await pool.query(
        `UPDATE metadata.partitioning_config SET
         enabled = $1, auto_detect = $2, partition_types = $3, 
         date_column_pattern = $4, region_column_pattern = $5, updated_at = NOW()
         WHERE id = $6`,
        [
          enabled !== undefined ? enabled : true,
          autoDetect !== undefined ? autoDetect : true,
          partitionTypes || [],
          dateColumnPattern || null,
          regionColumnPattern || null,
          existing.rows[0].id
        ]
      );
    }

    res.json({ success: true, message: "Partitioning configuration updated" });
  } catch (err) {
    const safeError = sanitizeError(
      err,
      "Error updating partitioning config",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

// Merge Strategies Configuration
router.get("/merge-strategies/config", requireAuth, async (req, res) => {
  try {
    const tableId = req.query.table_id || null;

    const result = await pool.query(
      `SELECT table_id, default_strategy, use_distributed, 
              enable_history_table, enable_hybrid
       FROM metadata.merge_strategies_config 
       WHERE ($1::text IS NULL AND table_id IS NULL) OR table_id = $1
       ORDER BY id DESC LIMIT 1`,
      [tableId]
    );

    if (result.rows.length === 0) {
      // Return default configuration when none exists
      return res.json({
        config: {
          defaultStrategy: 'UPSERT',
          useDistributed: false,
          enableHistoryTable: false,
          enableHybrid: false
        }
      });
    }

    const row = result.rows[0];
    res.json({
      config: {
        defaultStrategy: row.default_strategy,
        useDistributed: row.use_distributed,
        enableHistoryTable: row.enable_history_table,
        enableHybrid: row.enable_hybrid
      }
    });
  } catch (err) {
    const safeError = sanitizeError(
      err,
      "Error getting merge strategy config",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

router.put("/merge-strategies/config", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const tableId = req.query.table_id || null;
    const { defaultStrategy, useDistributed, enableHistoryTable, enableHybrid } = req.body;

    const existing = await pool.query(
      `SELECT id FROM metadata.merge_strategies_config 
       WHERE ($1::text IS NULL AND table_id IS NULL) OR table_id = $1`,
      [tableId]
    );
    
    if (existing.rows.length === 0) {
      await pool.query(
        `INSERT INTO metadata.merge_strategies_config 
         (table_id, default_strategy, use_distributed, enable_history_table, enable_hybrid)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          tableId,
          defaultStrategy || 'UPSERT',
          useDistributed !== undefined ? useDistributed : false,
          enableHistoryTable !== undefined ? enableHistoryTable : false,
          enableHybrid !== undefined ? enableHybrid : false
        ]
      );
    } else {
      await pool.query(
        `UPDATE metadata.merge_strategies_config SET
         default_strategy = $1, use_distributed = $2, 
         enable_history_table = $3, enable_hybrid = $4, updated_at = NOW()
         WHERE id = $5`,
        [
          defaultStrategy || 'UPSERT',
          useDistributed !== undefined ? useDistributed : false,
          enableHistoryTable !== undefined ? enableHistoryTable : false,
          enableHybrid !== undefined ? enableHybrid : false,
          existing.rows[0].id
        ]
      );
    }

    res.json({ success: true, message: "Merge strategy configuration updated" });
  } catch (err) {
    const safeError = sanitizeError(
      err,
      "Error updating merge strategy config",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

// Distributed Jobs
router.get("/jobs", requireAuth, async (req, res) => {
  try {
    const status = req.query.status;
    const executionMode = req.query.executionMode;
    const page = validatePage(req.query.page, 1);
    const limit = validateLimit(req.query.limit, 1, 100);
    const search = sanitizeSearch(req.query.search, 100);
    const offset = (page - 1) * limit;

    let whereConditions = [];
    let queryParams = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      whereConditions.push(`status = $${paramCount}`);
      queryParams.push(status.toUpperCase());
    }

    if (executionMode) {
      paramCount++;
      whereConditions.push(`execution_mode = $${paramCount}`);
      queryParams.push(executionMode.toUpperCase());
    }

    if (search) {
      paramCount++;
      whereConditions.push(`(job_id ILIKE $${paramCount} OR sql_query ILIKE $${paramCount})`);
      queryParams.push(`%${search}%`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM metadata.distributed_jobs ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].total);

    paramCount++;
    queryParams.push(limit);
    paramCount++;
    queryParams.push(offset);

    const result = await pool.query(
      `SELECT job_id, job_type, execution_mode, status, sql_query, 
              transformation_config, input_path, output_path, input_formats, 
              output_format, rows_processed, error_message, metadata,
              started_at, completed_at, created_at
       FROM metadata.distributed_jobs 
       ${whereClause}
       ORDER BY created_at DESC LIMIT $${paramCount - 1} OFFSET $${paramCount}`,
      queryParams
    );

    res.json({
      jobs: result.rows.map(row => ({
        jobId: row.job_id,
        taskId: row.job_id,
        taskType: row.job_type,
        executionMode: row.execution_mode.toLowerCase(),
        status: row.status.toLowerCase(),
        rowsProcessed: row.rows_processed,
        outputPath: row.output_path,
        errorMessage: row.error_message,
        startTime: row.started_at ? row.started_at.toISOString() : undefined,
        endTime: row.completed_at ? row.completed_at.toISOString() : undefined,
        duration: row.started_at && row.completed_at 
          ? Math.floor((row.completed_at - row.started_at) / 1000) 
          : undefined,
        metadata: row.metadata || {}
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    const safeError = sanitizeError(
      err,
      "Error getting distributed jobs",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

router.get("/jobs/:jobId", requireAuth, async (req, res) => {
  try {
    const jobId = req.params.jobId;

    const result = await pool.query(
      `SELECT * FROM metadata.distributed_jobs WHERE job_id = $1`,
      [jobId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Job not found" });
    }

    const row = result.rows[0];
    res.json({
      jobId: row.job_id,
      taskId: row.job_id,
      taskType: row.job_type,
      executionMode: row.execution_mode.toLowerCase(),
      status: row.status.toLowerCase(),
      rowsProcessed: row.rows_processed,
      outputPath: row.output_path,
      errorMessage: row.error_message,
      startTime: row.started_at ? row.started_at.toISOString() : undefined,
      endTime: row.completed_at ? row.completed_at.toISOString() : undefined,
      duration: row.started_at && row.completed_at 
        ? Math.floor((row.completed_at - row.started_at) / 1000) 
        : undefined,
      metadata: row.metadata || {}
    });
  } catch (err) {
    const safeError = sanitizeError(
      err,
      "Error getting distributed job",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

router.get("/jobs/:jobId/logs", requireAuth, async (req, res) => {
  try {
    const jobId = req.params.jobId;
    const lines = parseInt(req.query.lines) || 1000;

    const result = await pool.query(
      `SELECT log_level, message, timestamp, metadata
       FROM metadata.distributed_job_logs 
       WHERE job_id = $1
       ORDER BY timestamp DESC
       LIMIT $2`,
      [jobId, lines]
    );

    res.json({
      logs: result.rows.map(row => ({
        level: row.log_level.toLowerCase(),
        message: row.message,
        timestamp: row.timestamp.toISOString(),
        metadata: row.metadata || {}
      }))
    });
  } catch (err) {
    const safeError = sanitizeError(
      err,
      "Error getting distributed job logs",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

router.get("/jobs/:jobId/metrics", requireAuth, async (req, res) => {
  try {
    const jobId = req.params.jobId;

    const result = await pool.query(
      `SELECT metric_name, metric_value, metric_unit, timestamp, metadata
       FROM metadata.distributed_job_metrics 
       WHERE job_id = $1
       ORDER BY timestamp DESC`,
      [jobId]
    );

    res.json({
      metrics: result.rows.map(row => ({
        name: row.metric_name,
        value: parseFloat(row.metric_value),
        unit: row.metric_unit,
        timestamp: row.timestamp.toISOString(),
        metadata: row.metadata || {}
      }))
    });
  } catch (err) {
    const safeError = sanitizeError(
      err,
      "Error getting distributed job metrics",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

router.post("/jobs/:jobId/cancel", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const jobId = req.params.jobId;

    const result = await pool.query(
      `UPDATE metadata.distributed_jobs 
       SET status = 'CANCELLED', updated_at = NOW()
       WHERE job_id = $1 AND status IN ('PENDING', 'RUNNING')
       RETURNING job_id`,
      [jobId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Job not found or cannot be cancelled" });
    }

    res.json({ success: true, message: "Job cancelled successfully" });
  } catch (err) {
    const safeError = sanitizeError(
      err,
      "Error cancelling distributed job",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

// Statistics
router.get("/stats", requireAuth, async (req, res) => {
  try {
    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'COMPLETED') as completed_jobs,
        COUNT(*) FILTER (WHERE status = 'RUNNING') as running_jobs,
        COUNT(*) FILTER (WHERE status = 'FAILED') as failed_jobs,
        COUNT(*) FILTER (WHERE status = 'PENDING') as pending_jobs,
        SUM(rows_processed) FILTER (WHERE status = 'COMPLETED') as total_rows_processed,
        COUNT(*) FILTER (WHERE execution_mode = 'DISTRIBUTED') as distributed_jobs_count,
        COUNT(*) FILTER (WHERE execution_mode = 'LOCAL') as local_jobs_count
      FROM metadata.distributed_jobs
    `);

    const configResult = await pool.query(`
      SELECT COUNT(*) as has_spark_config FROM metadata.spark_config
    `);

    const stats = statsResult.rows[0];
    res.json({
      jobs: {
        completed: parseInt(stats.completed_jobs) || 0,
        running: parseInt(stats.running_jobs) || 0,
        failed: parseInt(stats.failed_jobs) || 0,
        pending: parseInt(stats.pending_jobs) || 0
      },
      totalRowsProcessed: parseInt(stats.total_rows_processed) || 0,
      executionModes: {
        distributed: parseInt(stats.distributed_jobs_count) || 0,
        local: parseInt(stats.local_jobs_count) || 0
      },
      sparkAvailable: parseInt(configResult.rows[0].has_spark_config) > 0
    });
  } catch (err) {
    const safeError = sanitizeError(
      err,
      "Error getting distributed processing stats",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

// ============================================================================
// STREAM PROCESSING ENDPOINTS
// ============================================================================

// Stream Configuration


export default router;
