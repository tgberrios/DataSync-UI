import express from "express";
import { spawn } from "child_process";
import os from "os";
import { pool } from "../services/database.service.js";
import { sanitizeError } from "../server-utils/errorHandler.js";
import { validatePage, validateLimit } from "../server-utils/validation.js";
import { formatUptime } from "../services/utils.service.js";

const router = express.Router();

// Obtener estadísticas del dashboard
router.get("/stats", async (req, res) => {
  try {
    const syncStatus = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE active = true AND status = 'LISTENING_CHANGES') as listening_changes,
        COUNT(*) FILTER (WHERE active = true) as full_load_active,
        COUNT(*) FILTER (WHERE active = false) as full_load_inactive,
        COUNT(*) FILTER (WHERE active = false AND status = 'NO_DATA') as no_data,
        COUNT(*) FILTER (WHERE status = 'SKIP') as skip,
        COUNT(*) FILTER (WHERE active = true AND status = 'ERROR') as errors,
        COUNT(*) FILTER (WHERE status = 'IN_PROGRESS') as in_progress,
        '' as current_process
      FROM metadata.catalog
    `);

    // 2. DATA PROGRESS METRICS - total_data
    const dataProgress = await pool.query(`
      SELECT 
        COALESCE(SUM(table_size), 0) as total_data
      FROM metadata.catalog
      WHERE active = true AND status IN ('LISTENING_CHANGES', 'FULL_LOAD')
    `);

    // Get currently processing table
    const currentProcessingTable = await pool.query(`
      SELECT t.*
      FROM metadata.catalog t
      WHERE status = 'FULL_LOAD'
      LIMIT 1
    `);

    const currentProcessText =
      currentProcessingTable.rows.length > 0
        ? `${String(
            currentProcessingTable.rows[0].schema_name
          ).toLowerCase()}.${String(
            currentProcessingTable.rows[0].table_name
          ).toLowerCase()} [${
            currentProcessingTable.rows[0].db_engine
          }] - Status: ${currentProcessingTable.rows[0].status}`
        : "No active transfers";

    // 2. TRANSFER PERFORMANCE BY ENGINE
    const transferPerformance = await pool.query(`
      SELECT 
        db_engine,
        COUNT(*) FILTER (WHERE status = 'PROCESSING' AND completed_at IS NULL) as active_transfers,
        ROUND(AVG(memory_used_mb)::numeric, 2) as avg_memory_used,
        ROUND(AVG(io_operations_per_second)::numeric, 2) as avg_iops,
        SUM(bytes_transferred) as total_bytes
      FROM metadata.transfer_metrics
      WHERE created_at > NOW() - INTERVAL '5 minutes'
      GROUP BY db_engine
    `);

    // 3. SYSTEM RESOURCES (from OS)
    // CPU
    const cpus = os.cpus();
    const cpuCount = cpus.length;
    const loadAvg = os.loadavg()[0];
    const cpuUsagePercent =
      cpuCount > 0 ? ((loadAvg * 100) / cpuCount).toFixed(1) : "0.0";

    // Memory
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsedGB = (usedMemory / (1024 * 1024 * 1024)).toFixed(2);
    const memoryTotalGB = (totalMemory / (1024 * 1024 * 1024)).toFixed(2);
    const memoryPercentage = ((usedMemory / totalMemory) * 100).toFixed(1);

    // Process Memory
    const processMemory = process.memoryUsage();
    const rssGB = (processMemory.rss / (1024 * 1024 * 1024)).toFixed(2);
    const virtualGB = (processMemory.heapTotal / (1024 * 1024 * 1024)).toFixed(
      2
    );

    // Disk Space (from Linux system via df command)
    let diskFreeGB = 0;
    try {
      const dfProcess = spawn('df', ['-BG', '/']);
      let dfOutput = '';
      let dfError = '';
      
      dfProcess.stdout.on('data', (data) => {
        dfOutput += data.toString();
      });
      
      dfProcess.stderr.on('data', (data) => {
        dfError += data.toString();
      });
      
      await new Promise((resolve) => {
        dfProcess.on('close', (code) => {
          if (code === 0) {
            const lines = dfOutput.trim().split('\n');
            if (lines.length > 1) {
              const parts = lines[1].trim().split(/\s+/);
              if (parts.length >= 4) {
                const available = parts[3];
                if (available && available !== '-') {
                  const value = parseFloat(available.replace(/[^0-9.]/g, ''));
                  if (!isNaN(value)) {
                    diskFreeGB = value;
                  }
                }
              }
            }
          } else {
            console.error("df command error:", dfError);
          }
          resolve();
        });
        
        dfProcess.on('error', (err) => {
          console.error("Error spawning df command:", err);
          resolve();
        });
      });
    } catch (err) {
      console.error("Error getting disk space:", err);
      diskFreeGB = 0;
    }

    const systemResources = {
      rows: [
        {
          cpu_usage: cpuUsagePercent,
          cpu_cores: cpuCount,
          memory_used: memoryUsedGB,
          memory_total: memoryTotalGB,
          memory_percentage: memoryPercentage,
          memory_rss: rssGB,
          memory_virtual: virtualGB,
        },
      ],
    };

    // 4. DATABASE HEALTH
    const dbHealth = await pool.query(`
      SELECT 
        (SELECT count(*) FROM pg_stat_activity) as active_connections,
        (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max_connections,
        EXTRACT(EPOCH FROM (now() - pg_postmaster_start_time())) as uptime_seconds,
        (
          SELECT json_build_object(
            'buffer_hit_ratio', ROUND(COALESCE((sum(heap_blks_hit) * 100.0 / NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0)), 100)::numeric, 1),
            'cache_hit_ratio', ROUND(COALESCE((sum(idx_blks_hit) * 100.0 / NULLIF(sum(idx_blks_hit) + sum(idx_blks_read), 0)), 100)::numeric, 1)
          )
          FROM pg_statio_user_tables
        ) as cache_stats,
        (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as active_queries,
        (SELECT count(*) FROM pg_stat_activity WHERE wait_event_type IS NOT NULL) as waiting_queries,
        (SELECT ROUND(AVG(EXTRACT(EPOCH FROM (now() - query_start)))::numeric, 2) 
         FROM pg_stat_activity 
         WHERE state = 'active' 
           AND query_start IS NOT NULL
           AND query NOT ILIKE '%pg_stat%'
           AND query NOT ILIKE '%information_schema%'
           AND query NOT ILIKE '%pg_catalog%'
           AND query NOT ILIKE '%pg_class%'
           AND query NOT ILIKE '%pg_namespace%'
           AND query NOT ILIKE '%pg_extension%'
           AND query NOT ILIKE '%pg_depend%'
           AND query NOT ILIKE '%pg_attribute%'
           AND query NOT ILIKE '%pg_index%'
           AND query NOT ILIKE '%pg_settings%'
           AND query NOT ILIKE '%pg_database%'
           AND query NOT ILIKE '%pg_user%'
           AND query NOT ILIKE '%pg_roles%'
           AND query NOT ILIKE '%pg_postmaster%'
           AND query NOT ILIKE '%pg_statio%'
           AND query NOT ILIKE '%current_database()%'
        ) as avg_query_duration,
        (SELECT pg_database_size(current_database())) as database_size_bytes
    `);

    const queryPerformanceMetrics = await pool.query(`
      SELECT 
        ROUND(AVG(query_efficiency_score)::numeric, 2) as avg_efficiency_score,
        COUNT(*) FILTER (WHERE is_long_running = true) as long_running_count,
        COUNT(*) FILTER (WHERE is_blocking = true) as blocking_count,
        COUNT(*) as total_queries_24h
      FROM metadata.query_performance
      WHERE captured_at > NOW() - INTERVAL '24 hours'
        AND query_text NOT ILIKE '%information_schema%'
        AND query_text NOT ILIKE '%pg_stat%'
        AND query_text NOT ILIKE '%pg_catalog%'
        AND query_text NOT ILIKE '%pg_class%'
        AND query_text NOT ILIKE '%pg_namespace%'
        AND query_text NOT ILIKE '%pg_extension%'
        AND query_text NOT ILIKE '%pg_depend%'
        AND query_text NOT ILIKE '%pg_attribute%'
        AND query_text NOT ILIKE '%pg_index%'
        AND query_text NOT ILIKE '%pg_settings%'
        AND query_text NOT ILIKE '%pg_database%'
        AND query_text NOT ILIKE '%pg_user%'
        AND query_text NOT ILIKE '%pg_roles%'
        AND query_text NOT ILIKE '%pg_postmaster%'
        AND query_text NOT ILIKE '%pg_statio%'
        AND query_text NOT ILIKE '%current_database()%'
        AND operation_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
    `);

    // Connection pooling removed - using direct connections now

    // 6. RECENT ACTIVITY
    const recentActivity = await pool.query(`
      SELECT 
        COUNT(*) as transfers_last_hour,
        COUNT(*) FILTER (WHERE status = 'FAILED') as errors_last_hour,
        MIN(created_at) as first_transfer,
        MAX(created_at) as last_transfer,
        SUM(records_transferred) as total_records,
        SUM(bytes_transferred) as total_bytes
      FROM metadata.transfer_metrics
      WHERE created_at > NOW() - INTERVAL '1 hour'
    `);

    // Total tables count
    const totalTablesResult = await pool.query(
      `SELECT COUNT(*) as total FROM metadata.catalog`
    );

    // All sync types from process_log
    const allSyncTypes = await pool.query(`
      SELECT 
        process_type,
        COUNT(*) as total_count,
        COUNT(*) FILTER (WHERE status = 'SUCCESS') as success_count,
        COUNT(*) FILTER (WHERE status = 'ERROR') as error_count,
        COUNT(*) FILTER (WHERE status = 'IN_PROGRESS') as in_progress_count,
        COUNT(*) FILTER (WHERE start_time > NOW() - INTERVAL '24 hours') as last_24h,
        MAX(start_time) as last_execution
      FROM metadata.process_log
      WHERE process_type IN ('API_SYNC', 'CSV_SYNC', 'GOOGLE_SHEETS_SYNC', 'DATA_VAULT', 'DATA_WAREHOUSE', 'WORKFLOW', 'CUSTOM_JOB')
      GROUP BY process_type
    `);

    const processLogStats = {
      apiSync: allSyncTypes.rows.find(r => r.process_type === 'API_SYNC') || { total_count: 0, success_count: 0, error_count: 0, in_progress_count: 0, last_24h: 0, last_execution: null },
      csvSync: allSyncTypes.rows.find(r => r.process_type === 'CSV_SYNC') || { total_count: 0, success_count: 0, error_count: 0, in_progress_count: 0, last_24h: 0, last_execution: null },
      googleSheetsSync: allSyncTypes.rows.find(r => r.process_type === 'GOOGLE_SHEETS_SYNC') || { total_count: 0, success_count: 0, error_count: 0, in_progress_count: 0, last_24h: 0, last_execution: null },
      dataVault: allSyncTypes.rows.find(r => r.process_type === 'DATA_VAULT') || { total_count: 0, success_count: 0, error_count: 0, in_progress_count: 0, last_24h: 0, last_execution: null },
      dataWarehouse: allSyncTypes.rows.find(r => r.process_type === 'DATA_WAREHOUSE') || { total_count: 0, success_count: 0, error_count: 0, in_progress_count: 0, last_24h: 0, last_execution: null },
      workflow: allSyncTypes.rows.find(r => r.process_type === 'WORKFLOW') || { total_count: 0, success_count: 0, error_count: 0, in_progress_count: 0, last_24h: 0, last_execution: null },
      customJob: allSyncTypes.rows.find(r => r.process_type === 'CUSTOM_JOB') || { total_count: 0, success_count: 0, error_count: 0, in_progress_count: 0, last_24h: 0, last_execution: null },
    };

    // Construir el objeto de respuesta
    const listeningChanges = parseInt(
      syncStatus.rows[0]?.listening_changes || 0
    );
    const fullLoadActive = parseInt(syncStatus.rows[0]?.full_load_active || 0);
    const pending = Math.max(0, fullLoadActive - listeningChanges);

    const stats = {
      syncStatus: {
        progress: 0,
        listeningChanges: listeningChanges,
        pending: pending,
        fullLoadActive: fullLoadActive,
        fullLoadInactive: parseInt(syncStatus.rows[0]?.full_load_inactive || 0),
        noData: parseInt(syncStatus.rows[0]?.no_data || 0),
        skip: parseInt(syncStatus.rows[0]?.skip || 0),
        errors: parseInt(syncStatus.rows[0]?.errors || 0),
        inProgress: parseInt(syncStatus.rows[0]?.in_progress || 0),
        currentProcess: currentProcessText,
        totalData: parseInt(dataProgress.rows[0]?.total_data || 0),
        totalTables: parseInt(totalTablesResult.rows[0]?.total || 0),
      },
      systemResources: {
        cpuUsage: systemResources.rows[0].cpu_usage,
        cpuCores: systemResources.rows[0].cpu_cores.toString(),
        memoryUsed: systemResources.rows[0].memory_used,
        memoryTotal: systemResources.rows[0].memory_total,
        memoryPercentage: systemResources.rows[0].memory_percentage,
        rss: systemResources.rows[0].memory_rss,
        virtual: systemResources.rows[0].memory_virtual,
      },
      dbHealth: {
        activeConnections: dbHealth.rows[0]
          ? dbHealth.rows[0].active_connections +
            "/" +
            dbHealth.rows[0].max_connections
          : "0/0",
        connectionPercentage:
          dbHealth.rows[0] && dbHealth.rows[0].max_connections > 0
            ? (
                (dbHealth.rows[0].active_connections /
                  dbHealth.rows[0].max_connections) *
                100
              ).toFixed(1)
            : "0.0",
        responseTime: "< 1ms",
        bufferHitRate: (
          dbHealth.rows[0]?.cache_stats?.buffer_hit_ratio || 0
        ).toFixed(1),
        cacheHitRate: (
          dbHealth.rows[0]?.cache_stats?.cache_hit_ratio || 0
        ).toFixed(1),
        status: dbHealth.rows[0] ? "Healthy" : "Unknown",
        uptimeSeconds: parseFloat(dbHealth.rows[0]?.uptime_seconds || 0) || 0,
        activeQueries: parseInt(dbHealth.rows[0]?.active_queries || 0) || 0,
        waitingQueries: parseInt(dbHealth.rows[0]?.waiting_queries || 0) || 0,
        avgQueryDuration:
          parseFloat(dbHealth.rows[0]?.avg_query_duration || 0) || 0,
        databaseSizeBytes:
          parseInt(dbHealth.rows[0]?.database_size_bytes || 0) || 0,
        queryEfficiencyScore:
          parseFloat(
            queryPerformanceMetrics.rows[0]?.avg_efficiency_score || 0
          ) || 0,
        longRunningQueries: parseInt(
          queryPerformanceMetrics.rows[0]?.long_running_count || 0
        ),
        blockingQueries: parseInt(
          queryPerformanceMetrics.rows[0]?.blocking_count || 0
        ),
        totalQueries24h: parseInt(
          queryPerformanceMetrics.rows[0]?.total_queries_24h || 0
        ),
      },
      // Connection pooling removed - using direct connections now
    };

    // Calcular progreso total - solo contar registros activos
    const totalActive =
      stats.syncStatus.listeningChanges +
      stats.syncStatus.fullLoadActive +
      stats.syncStatus.errors;
    const total =
      totalActive + stats.syncStatus.fullLoadInactive + stats.syncStatus.noData;

    // El progreso se calcula como: Listening Changes / Total Active * 100
    // Representa qué porcentaje de tablas activas han llegado a LISTENING_CHANGES
    stats.syncStatus.progress =
      totalActive > 0
        ? Math.round((stats.syncStatus.listeningChanges / totalActive) * 100)
        : 0;

    // Agregar métricas por motor
    stats.engineMetrics = {};
    transferPerformance.rows.forEach((metric) => {
      stats.engineMetrics[metric.db_engine] = {
        recordsPerSecond: 0,
        bytesTransferred: parseFloat(metric.total_bytes),
        cpuUsage: 0,
        memoryUsed: parseFloat(metric.avg_memory_used),
        iops: parseFloat(metric.avg_iops),
        activeTransfers: parseInt(metric.active_transfers),
      };
    });

    // Agregar actividad reciente
    stats.recentActivity = {
      transfersLastHour: parseInt(
        recentActivity.rows[0]?.transfers_last_hour || 0
      ),
      errorsLastHour: parseInt(recentActivity.rows[0]?.errors_last_hour || 0),
      totalRecords: parseInt(recentActivity.rows[0]?.total_records || 0),
      totalBytes: parseInt(recentActivity.rows[0]?.total_bytes || 0),
      firstTransfer: recentActivity.rows[0]?.first_transfer || null,
      lastTransfer: recentActivity.rows[0]?.last_transfer || null,
      uptime: formatUptime(dbHealth.rows[0]?.uptime_seconds || 0),
    };

    // MÉTRICAS PARA CARDS INFORMATIVAS

    // 1. Top 10 Tablas por Throughput (Records/Segundo)
    const topTablesThroughput = await pool.query(`
      SELECT 
        tm.schema_name,
        tm.table_name,
        tm.db_engine,
        ROUND(tm.records_transferred::numeric / NULLIF(EXTRACT(EPOCH FROM (tm.completed_at - tm.created_at)), 0), 2) as throughput_rps,
        tm.records_transferred
      FROM metadata.transfer_metrics tm
      WHERE tm.created_at > NOW() - INTERVAL '24 hours'
        AND tm.completed_at IS NOT NULL
        AND tm.records_transferred > 0
      ORDER BY throughput_rps DESC
      LIMIT 10
    `);

    // 2. IO Operations promedio actual
    const currentIops = await pool.query(`
      SELECT ROUND(AVG(io_operations_per_second)::numeric, 2) as avg_iops
      FROM metadata.transfer_metrics
      WHERE created_at > NOW() - INTERVAL '1 hour'
        AND io_operations_per_second > 0
    `);

    // 3. Volumen de datos por tabla (últimos 7 días)
    const dataVolumeByTable = await pool.query(`
      SELECT 
        tm.schema_name,
        tm.table_name,
        tm.db_engine,
        SUM(tm.bytes_transferred) as total_bytes,
        COUNT(tm.id) as transfer_count
      FROM metadata.transfer_metrics tm
      WHERE tm.created_at > NOW() - INTERVAL '7 days'
        AND tm.bytes_transferred > 0
      GROUP BY tm.schema_name, tm.table_name, tm.db_engine
      ORDER BY total_bytes DESC
      LIMIT 10
    `);

    // 4. Throughput actual: usa COALESCE(completed_at, created_at) porque completed_at suele ser NULL;
    // duración = COALESCE(completed_at, created_at) - COALESCE(started_at, created_at). Ventana 24h para tener datos.
    const currentThroughput = await pool.query(`
      SELECT 
        ROUND(AVG(
          records_transferred::numeric / NULLIF(
            EXTRACT(EPOCH FROM (COALESCE(completed_at, created_at) - COALESCE(started_at, created_at))),
            0
          )
        )::numeric, 2) as avg_throughput_rps,
        SUM(records_transferred) as total_records,
        COUNT(*) as transfer_count
      FROM metadata.transfer_metrics
      WHERE created_at > NOW() - INTERVAL '24 hours'
        AND records_transferred > 0
        AND COALESCE(completed_at, created_at) > COALESCE(started_at, created_at)
    `);

    // Agregar las métricas al response
    stats.metricsCards = {
      topTablesThroughput: topTablesThroughput.rows.map((row) => ({
        tableName: `${row.schema_name}.${row.table_name}`,
        dbEngine: row.db_engine,
        throughputRps: parseFloat(row.throughput_rps || 0),
        recordsTransferred: parseInt(row.records_transferred || 0),
      })),
      currentIops: parseFloat(currentIops.rows[0]?.avg_iops || 0),
      dataVolumeByTable: dataVolumeByTable.rows.map((row) => ({
        tableName: `${row.schema_name}.${row.table_name}`,
        dbEngine: row.db_engine,
        totalBytes: parseInt(row.total_bytes || 0),
        transferCount: parseInt(row.transfer_count || 0),
      })),
      currentThroughput: {
        avgRps: parseFloat(currentThroughput.rows[0]?.avg_throughput_rps || 0),
        totalRecords: parseInt(currentThroughput.rows[0]?.total_records || 0),
        transferCount: parseInt(currentThroughput.rows[0]?.transfer_count || 0),
      },
    };

    const networkIops = stats.metricsCards.currentIops || 0;
    const throughputRps = stats.metricsCards.currentThroughput.avgRps || 0;

    try {
      await pool.query(
        `INSERT INTO metadata.system_logs (
          cpu_usage, cpu_cores, memory_used_gb, memory_total_gb, 
          memory_percentage, memory_rss_gb, memory_virtual_gb,
          network_iops, throughput_rps, disk_free_gb
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          parseFloat(cpuUsagePercent),
          cpuCount,
          parseFloat(memoryUsedGB),
          parseFloat(memoryTotalGB),
          parseFloat(memoryPercentage),
          parseFloat(rssGB),
          parseFloat(virtualGB),
          networkIops,
          throughputRps,
          parseFloat(diskFreeGB.toFixed(2)),
        ]
      );
    } catch (err) {
      console.error("Error saving system logs:", err);
    }

    const totalColumnsResult = await pool.query(
      `SELECT COUNT(*) as total FROM metadata.column_catalog`
    );
    stats.syncStatus.totalColumns = parseInt(totalColumnsResult.rows[0]?.total || 0);

    const dataProtection = await pool.query(`
      SELECT 
        COUNT(*) as total_policies,
        COUNT(*) FILTER (WHERE active = true) as active_policies,
        COUNT(*) FILTER (WHERE active = false) as inactive_policies
      FROM metadata.masking_policies
    `);

    const maskingStatus = await pool.query(`
      SELECT * FROM metadata.get_masking_status(NULL)
    `);
    const maskingSummary = maskingStatus.rows.reduce((acc, row) => ({
      total_tables: acc.total_tables + parseInt(row.total_tables || 0),
      sensitive_columns: acc.sensitive_columns + parseInt(row.sensitive_columns_detected || 0),
      protected: acc.protected + parseInt(row.columns_with_policies || 0),
      unprotected: acc.unprotected + parseInt(row.columns_without_policies || 0),
    }), { total_tables: 0, sensitive_columns: 0, protected: 0, unprotected: 0 });

    const alertsSummary = await pool.query(`
      SELECT 
        COUNT(*) as total_alerts,
        COUNT(*) FILTER (WHERE status = 'OPEN') as open_alerts,
        COUNT(*) FILTER (WHERE severity = 'CRITICAL' AND status = 'OPEN') as critical_alerts,
        COUNT(*) FILTER (WHERE severity = 'WARNING' AND status = 'OPEN') as warning_alerts,
        COUNT(*) FILTER (WHERE severity = 'INFO' AND status = 'OPEN') as info_alerts
      FROM metadata.alerts
    `);

    const alertRulesSummary = await pool.query(`
      SELECT 
        COUNT(*) as total_rules,
        COUNT(*) FILTER (WHERE enabled = true) as enabled_rules
      FROM metadata.alert_rules
    `);

    const backupsSummary = await pool.query(`
      SELECT 
        COUNT(*) as total_backups,
        COUNT(*) FILTER (WHERE is_scheduled = true) as scheduled_backups,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_backups,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_backups,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_backups,
        COALESCE(SUM(file_size), 0) as total_backup_size,
        MAX(completed_at) as last_backup_time
      FROM metadata.backups
    `);

    const nextBackup = await pool.query(`
      SELECT backup_name, next_run_at, db_engine, database_name
      FROM metadata.backups
      WHERE is_scheduled = true AND next_run_at IS NOT NULL
      ORDER BY next_run_at ASC
      LIMIT 1
    `);

    const migrationsSummary = await pool.query(`
      SELECT 
        COUNT(*) as total_migrations,
        COUNT(*) FILTER (WHERE status = 'PENDING') as pending_migrations,
        COUNT(*) FILTER (WHERE status = 'APPLIED') as applied_migrations,
        COUNT(*) FILTER (WHERE status = 'FAILED') as failed_migrations,
        MAX(last_applied_at) as last_migration_applied
      FROM metadata.schema_migrations
    `);

    const migrationsByEnv = await pool.query(`
      SELECT 
        environment,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE status = 'APPLIED') as applied_count
      FROM metadata.schema_migration_history
      GROUP BY environment
    `);

    const qualitySummary = await pool.query(`
      SELECT 
        COUNT(DISTINCT schema_name || '.' || table_name) as total_tables_checked,
        COUNT(*) FILTER (WHERE validation_status = 'PASSED') as passed_checks,
        COUNT(*) FILTER (WHERE validation_status = 'FAILED') as failed_checks,
        COUNT(*) FILTER (WHERE validation_status = 'WARNING') as warning_checks,
        ROUND(AVG(quality_score)::numeric, 2) as avg_quality_score,
        MAX(check_timestamp) as last_quality_check
      FROM metadata.data_quality
      WHERE check_timestamp > NOW() - INTERVAL '30 days'
    `);

    const governanceSummary = await pool.query(`
      SELECT 
        COUNT(DISTINCT schema_name || '.' || table_name) as total_tables,
        COUNT(*) FILTER (WHERE encryption_at_rest = true OR encryption_in_transit = true) as encrypted_tables,
        COUNT(*) FILTER (WHERE masking_policy_applied = true) as masked_tables,
        COUNT(*) FILTER (WHERE health_status = 'HEALTHY') as healthy_tables,
        COUNT(*) FILTER (WHERE health_status = 'WARNING') as warning_tables,
        COUNT(*) FILTER (WHERE health_status = 'CRITICAL') as critical_tables
      FROM metadata.data_governance_catalog
      WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM metadata.data_governance_catalog)
    `);

    const maintenanceSummary = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'PENDING') as pending_maintenance,
        COUNT(*) FILTER (WHERE status = 'COMPLETED' AND DATE(updated_at) = CURRENT_DATE) as completed_today,
        COALESCE(SUM(space_reclaimed_mb), 0) as total_space_reclaimed,
        COALESCE(ROUND(AVG(performance_improvement_pct)::numeric, 2), 0) as avg_performance_improvement
      FROM metadata.maintenance_control
    `);

    const sourcesSummary = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM metadata.catalog) as database_sources,
        (SELECT COUNT(*) FROM metadata.api_catalog WHERE active = true) as api_sources,
        (SELECT COUNT(*) FROM metadata.csv_catalog WHERE active = true) as csv_sources,
        (SELECT COUNT(*) FROM metadata.google_sheets_catalog WHERE active = true) as sheets_sources,
        (SELECT COUNT(*) FROM metadata.data_warehouse_catalog WHERE active = true) as warehouse_sources
    `);

    stats.dataProtection = {
      masking: {
        totalPolicies: parseInt(dataProtection.rows[0]?.total_policies || 0),
        activePolicies: parseInt(dataProtection.rows[0]?.active_policies || 0),
        inactivePolicies: parseInt(dataProtection.rows[0]?.inactive_policies || 0),
        sensitiveColumns: maskingSummary.sensitive_columns,
        protectedColumns: maskingSummary.protected,
        unprotectedColumns: maskingSummary.unprotected,
        coveragePercentage: maskingSummary.sensitive_columns > 0 
          ? Math.round((maskingSummary.protected / maskingSummary.sensitive_columns) * 100) 
          : 0,
      },
      alerts: {
        total: parseInt(alertsSummary.rows[0]?.total_alerts || 0),
        open: parseInt(alertsSummary.rows[0]?.open_alerts || 0),
        critical: parseInt(alertsSummary.rows[0]?.critical_alerts || 0),
        warning: parseInt(alertsSummary.rows[0]?.warning_alerts || 0),
        info: parseInt(alertsSummary.rows[0]?.info_alerts || 0),
        totalRules: parseInt(alertRulesSummary.rows[0]?.total_rules || 0),
        enabledRules: parseInt(alertRulesSummary.rows[0]?.enabled_rules || 0),
      },
    };

    stats.backups = {
      total: parseInt(backupsSummary.rows[0]?.total_backups || 0),
      scheduled: parseInt(backupsSummary.rows[0]?.scheduled_backups || 0),
      completed: parseInt(backupsSummary.rows[0]?.completed_backups || 0),
      failed: parseInt(backupsSummary.rows[0]?.failed_backups || 0),
      inProgress: parseInt(backupsSummary.rows[0]?.in_progress_backups || 0),
      totalSize: parseInt(backupsSummary.rows[0]?.total_backup_size || 0),
      lastBackupTime: backupsSummary.rows[0]?.last_backup_time || null,
      nextBackup: nextBackup.rows.length > 0 ? {
        name: nextBackup.rows[0].backup_name,
        nextRunAt: nextBackup.rows[0].next_run_at,
        dbEngine: nextBackup.rows[0].db_engine,
        databaseName: nextBackup.rows[0].database_name,
      } : null,
    };

    stats.migrations = {
      total: parseInt(migrationsSummary.rows[0]?.total_migrations || 0),
      pending: parseInt(migrationsSummary.rows[0]?.pending_migrations || 0),
      applied: parseInt(migrationsSummary.rows[0]?.applied_migrations || 0),
      failed: parseInt(migrationsSummary.rows[0]?.failed_migrations || 0),
      lastApplied: migrationsSummary.rows[0]?.last_migration_applied || null,
      byEnvironment: migrationsByEnv.rows.reduce((acc, row) => {
        acc[row.environment] = {
          total: parseInt(row.count || 0),
          applied: parseInt(row.applied_count || 0),
        };
        return acc;
      }, {}),
    };

    stats.dataQuality = {
      totalTablesChecked: parseInt(qualitySummary.rows[0]?.total_tables_checked || 0),
      passed: parseInt(qualitySummary.rows[0]?.passed_checks || 0),
      failed: parseInt(qualitySummary.rows[0]?.failed_checks || 0),
      warning: parseInt(qualitySummary.rows[0]?.warning_checks || 0),
      avgScore: parseFloat(qualitySummary.rows[0]?.avg_quality_score || 0),
      lastCheck: qualitySummary.rows[0]?.last_quality_check || null,
    };

    stats.governance = {
      totalTables: parseInt(governanceSummary.rows[0]?.total_tables || 0),
      encryptedTables: parseInt(governanceSummary.rows[0]?.encrypted_tables || 0),
      maskedTables: parseInt(governanceSummary.rows[0]?.masked_tables || 0),
      healthyTables: parseInt(governanceSummary.rows[0]?.healthy_tables || 0),
      warningTables: parseInt(governanceSummary.rows[0]?.warning_tables || 0),
      criticalTables: parseInt(governanceSummary.rows[0]?.critical_tables || 0),
    };

    stats.maintenance = {
      pending: parseInt(maintenanceSummary.rows[0]?.pending_maintenance || 0),
      completedToday: parseInt(maintenanceSummary.rows[0]?.completed_today || 0),
      totalSpaceReclaimedMB: parseFloat(maintenanceSummary.rows[0]?.total_space_reclaimed || 0),
      avgPerformanceImprovement: parseFloat(maintenanceSummary.rows[0]?.avg_performance_improvement || 0),
    };

    stats.dataSources = {
      database: parseInt(sourcesSummary.rows[0]?.database_sources || 0),
      api: parseInt(sourcesSummary.rows[0]?.api_sources || 0),
      csv: parseInt(sourcesSummary.rows[0]?.csv_sources || 0),
      sheets: parseInt(sourcesSummary.rows[0]?.sheets_sources || 0),
      warehouse: parseInt(sourcesSummary.rows[0]?.warehouse_sources || 0),
      total: parseInt(sourcesSummary.rows[0]?.database_sources || 0) +
             parseInt(sourcesSummary.rows[0]?.api_sources || 0) +
             parseInt(sourcesSummary.rows[0]?.csv_sources || 0) +
             parseInt(sourcesSummary.rows[0]?.sheets_sources || 0) +
             parseInt(sourcesSummary.rows[0]?.warehouse_sources || 0),
    };

    stats.allSyncTypes = {
      apiSync: {
        total: parseInt(processLogStats.apiSync.total_count || 0),
        success: parseInt(processLogStats.apiSync.success_count || 0),
        errors: parseInt(processLogStats.apiSync.error_count || 0),
        inProgress: parseInt(processLogStats.apiSync.in_progress_count || 0),
        last24h: parseInt(processLogStats.apiSync.last_24h || 0),
        lastExecution: processLogStats.apiSync.last_execution || null,
      },
      csvSync: {
        total: parseInt(processLogStats.csvSync.total_count || 0),
        success: parseInt(processLogStats.csvSync.success_count || 0),
        errors: parseInt(processLogStats.csvSync.error_count || 0),
        inProgress: parseInt(processLogStats.csvSync.in_progress_count || 0),
        last24h: parseInt(processLogStats.csvSync.last_24h || 0),
        lastExecution: processLogStats.csvSync.last_execution || null,
      },
      googleSheetsSync: {
        total: parseInt(processLogStats.googleSheetsSync.total_count || 0),
        success: parseInt(processLogStats.googleSheetsSync.success_count || 0),
        errors: parseInt(processLogStats.googleSheetsSync.error_count || 0),
        inProgress: parseInt(processLogStats.googleSheetsSync.in_progress_count || 0),
        last24h: parseInt(processLogStats.googleSheetsSync.last_24h || 0),
        lastExecution: processLogStats.googleSheetsSync.last_execution || null,
      },
      dataVault: {
        total: parseInt(processLogStats.dataVault.total_count || 0),
        success: parseInt(processLogStats.dataVault.success_count || 0),
        errors: parseInt(processLogStats.dataVault.error_count || 0),
        inProgress: parseInt(processLogStats.dataVault.in_progress_count || 0),
        last24h: parseInt(processLogStats.dataVault.last_24h || 0),
        lastExecution: processLogStats.dataVault.last_execution || null,
      },
      dataWarehouse: {
        total: parseInt(processLogStats.dataWarehouse.total_count || 0),
        success: parseInt(processLogStats.dataWarehouse.success_count || 0),
        errors: parseInt(processLogStats.dataWarehouse.error_count || 0),
        inProgress: parseInt(processLogStats.dataWarehouse.in_progress_count || 0),
        last24h: parseInt(processLogStats.dataWarehouse.last_24h || 0),
        lastExecution: processLogStats.dataWarehouse.last_execution || null,
      },
      workflow: {
        total: parseInt(processLogStats.workflow.total_count || 0),
        success: parseInt(processLogStats.workflow.success_count || 0),
        errors: parseInt(processLogStats.workflow.error_count || 0),
        inProgress: parseInt(processLogStats.workflow.in_progress_count || 0),
        last24h: parseInt(processLogStats.workflow.last_24h || 0),
        lastExecution: processLogStats.workflow.last_execution || null,
      },
      customJob: {
        total: parseInt(processLogStats.customJob.total_count || 0),
        success: parseInt(processLogStats.customJob.success_count || 0),
        errors: parseInt(processLogStats.customJob.error_count || 0),
        inProgress: parseInt(processLogStats.customJob.in_progress_count || 0),
        last24h: parseInt(processLogStats.customJob.last_24h || 0),
        lastExecution: processLogStats.customJob.last_execution || null,
      },
    };

    res.json(stats);
  } catch (err) {
    console.error("Error getting dashboard stats:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener estadísticas",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

// Obtener logs del sistema
router.get("/system-logs", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 60;

    const result = await pool.query(
      `SELECT 
        timestamp,
        cpu_usage,
        memory_percentage,
        COALESCE(network_iops, 0) as network_iops,
        COALESCE(throughput_rps, 0) as throughput_rps
      FROM metadata.system_logs
      ORDER BY timestamp DESC
      LIMIT $1`,
      [limit]
    );

    const logs = result.rows.reverse().map((row) => {
      const date = new Date(row.timestamp);
      const timeLabel = `${date.getHours().toString().padStart(2, "0")}:${date
        .getMinutes()
        .toString()
        .padStart(2, "0")}:${date.getSeconds().toString().padStart(2, "0")}`;

      return {
        timestamp: timeLabel,
        cpuUsage: parseFloat(row.cpu_usage) || 0,
        memoryPercentage: parseFloat(row.memory_percentage) || 0,
        network: parseFloat(row.network_iops) || 0,
        throughput: parseFloat(row.throughput_rps) || 0,
      };
    });

    res.json({ logs });
  } catch (err) {
    console.error("Error getting system logs:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener logs del sistema",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

// Obtener tablas actualmente procesándose
router.get("/currently-processing", async (req, res) => {
  try {
    const page = validatePage(req.query.page, 1);

    const maxWorkersResult = await pool.query(
      "SELECT value FROM metadata.config WHERE key = 'max_workers'"
    );
    const maxWorkers = maxWorkersResult.rows[0]
      ? parseInt(maxWorkersResult.rows[0].value) || 8
      : 8;
    const limit = validateLimit(req.query.limit, 1, Math.max(maxWorkers, 100));
    const pageSize = limit;
    const offset = (page - 1) * pageSize;

    const currentlyProcessingResult = await pool.query(`
      SELECT DISTINCT ON (pl.schema_name, pl.table_name, pl.db_engine)
        pl.schema_name,
        pl.table_name,
        pl.db_engine,
        pl.status,
        pl.processed_at,
        pl.new_pk,
        pl.record_count
      FROM metadata.processing_log pl
      WHERE pl.status = 'IN_PROGRESS'
      ORDER BY pl.schema_name, pl.table_name, pl.db_engine, pl.processed_at DESC
    `);

    const recentHistoryResult = await pool.query(`
      SELECT DISTINCT ON (pl.schema_name, pl.table_name, pl.db_engine)
        pl.schema_name,
        pl.table_name,
        pl.db_engine,
        pl.status,
        pl.processed_at,
        pl.new_pk,
        pl.record_count
      FROM metadata.processing_log pl
      WHERE pl.status != 'IN_PROGRESS'
        AND pl.processed_at > NOW() - INTERVAL '15 minutes'
      ORDER BY pl.schema_name, pl.table_name, pl.db_engine, pl.processed_at DESC
      LIMIT 10
    `);

    const allResults = [
      ...currentlyProcessingResult.rows,
      ...recentHistoryResult.rows,
    ];

    const results = [];

    for (const row of allResults) {
      let countResult;
      try {
        const providedSchema = String(row.schema_name);
        const providedTable = String(row.table_name);

        const resolved = await pool.query(
          `
          SELECT n.nspname AS schema_name, c.relname AS table_name
          FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE lower(n.nspname) = lower($1)
            AND lower(c.relname) = lower($2)
            AND c.relkind = 'r'
          LIMIT 1
          `,
          [providedSchema, providedTable]
        );

        if (resolved.rows.length > 0) {
          const schema = String(resolved.rows[0].schema_name).replace(
            /"/g,
            '""'
          );
          const table = String(resolved.rows[0].table_name).replace(/"/g, '""');
          const countSql = `SELECT COUNT(*) as total_records FROM "${schema}"."${table}"`;
          countResult = await pool.query(countSql);
        } else {
          countResult = { rows: [{ total_records: row.record_count || 0 }] };
        }
      } catch (countError) {
        countResult = { rows: [{ total_records: row.record_count || 0 }] };
      }

      results.push({
        schema_name: String(row.schema_name).toLowerCase(),
        table_name: String(row.table_name).toLowerCase(),
        db_engine: String(row.db_engine),
        new_pk: row.new_pk || null,
        status: String(row.status),
        processed_at: row.processed_at,
        total_records: parseInt(
          countResult.rows[0]?.total_records || row.record_count || 0
        ),
      });
    }

    const inProgressResults = results.filter((r) => r.status === "IN_PROGRESS");
    const historyResults = results.filter((r) => r.status !== "IN_PROGRESS");

    const sortedResults = [
      ...inProgressResults.sort(
        (a, b) =>
          new Date(b.processed_at).getTime() -
          new Date(a.processed_at).getTime()
      ),
      ...historyResults.sort(
        (a, b) =>
          new Date(b.processed_at).getTime() -
          new Date(a.processed_at).getTime()
      ),
    ];

    const total = sortedResults.length;
    const totalPages = Math.ceil(total / pageSize);
    const paginatedResults = sortedResults.slice(offset, offset + pageSize);

    res.json({
      data: paginatedResults,
      pagination: {
        page,
        limit: pageSize,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (err) {
    console.error("Error getting currently processing tables:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener tablas en procesamiento",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

export default router;
