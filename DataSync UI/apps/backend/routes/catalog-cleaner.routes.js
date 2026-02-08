import express from "express";
import { pool } from "../services/database.service.js";
import { sanitizeError } from "../server-utils/errorHandler.js";

const router = express.Router();

/**
 * Safe count: run query and return 0 on any error (e.g. table does not exist).
 */
async function safeCount(query, params = []) {
  try {
    const result = await pool.query(query, params);
    const count = result.rows?.[0]?.count ?? result.rows?.[0]?.total ?? 0;
    return typeof count === "string" ? parseInt(count, 10) : (count || 0);
  } catch {
    return 0;
  }
}

/**
 * GET /preview - Returns counts of cleanable items per category.
 * Frontend expects { preview: { non_existent_tables, orphaned_tables, old_logs, ... } }.
 */
router.get("/preview", async (req, res) => {
  try {
    const retentionHours = parseInt(req.query.retention_hours, 10) || 720; // default 30 days

    const nonExistentTables = await safeCount(`
      SELECT COUNT(*)::bigint as count FROM metadata.catalog c
      WHERE NOT EXISTS (
        SELECT 1 FROM information_schema.tables t
        WHERE t.table_schema = c.schema_name AND t.table_name = c.table_name
      )
    `);

    const orphanedTables = await safeCount(`
      SELECT COUNT(*)::bigint as count FROM information_schema.tables t
      WHERE t.table_schema IN ('raw','staging','curated')
        AND t.table_type = 'BASE TABLE'
        AND NOT EXISTS (
          SELECT 1 FROM metadata.catalog c
          WHERE LOWER(c.schema_name) = LOWER(t.table_schema) AND LOWER(c.table_name) = LOWER(t.table_name)
        )
    `);

    const oldLogs = await safeCount(
      `SELECT COUNT(*)::bigint as count FROM metadata.logs WHERE ts < NOW() - INTERVAL '1 hour' * $1`,
      [Math.max(1, retentionHours)]
    );

    const orphanedGovernance = await safeCount(`
      SELECT COUNT(*)::bigint as count FROM metadata.data_governance_catalog g
      WHERE NOT EXISTS (
        SELECT 1 FROM metadata.catalog c
        WHERE LOWER(c.schema_name) = LOWER(g.schema_name) AND LOWER(c.table_name) = LOWER(g.table_name)
      )
    `);

    const orphanedQuality = await safeCount(`
      SELECT COUNT(*)::bigint as count FROM metadata.data_quality q
      WHERE NOT EXISTS (
        SELECT 1 FROM metadata.catalog c
        WHERE LOWER(c.schema_name) = LOWER(q.schema_name) AND LOWER(c.table_name) = LOWER(q.table_name)
      )
    `);

    const orphanedMaintenance = await safeCount(`
      SELECT COUNT(*)::bigint as count FROM metadata.maintenance_control m
      WHERE (m.schema_name IS NULL OR m.table_name IS NULL)
         OR NOT EXISTS (
        SELECT 1 FROM metadata.catalog c
        WHERE LOWER(c.schema_name) = LOWER(m.schema_name) AND LOWER(c.table_name) = LOWER(m.table_name)
      )
    `);

    let orphanedLineage = 0;
    for (const table of ["mdb_lineage", "mssql_lineage", "mongo_lineage", "oracle_lineage"]) {
      orphanedLineage += await safeCount(`
        SELECT COUNT(*)::bigint as count FROM metadata.${table} l
        WHERE (l.schema_name IS NULL OR l.table_name IS NULL)
           OR NOT EXISTS (
          SELECT 1 FROM metadata.catalog c
          WHERE LOWER(c.schema_name) = LOWER(l.schema_name) AND LOWER(c.table_name) = LOWER(l.table_name)
        )
      `);
    }

    res.json({
      preview: {
        non_existent_tables: nonExistentTables,
        orphaned_tables: orphanedTables,
        old_logs: oldLogs,
        orphaned_governance: orphanedGovernance,
        orphaned_quality: orphanedQuality,
        orphaned_maintenance: orphanedMaintenance,
        orphaned_lineage: orphanedLineage,
      },
    });
  } catch (err) {
    console.error("Error getting catalog-cleaner preview:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener preview de catalog cleaner",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

/**
 * POST /clean-non-existent-tables - Remove catalog entries for tables that no longer exist.
 */
router.post("/clean-non-existent-tables", async (req, res) => {
  try {
    const result = await pool.query(`
      WITH deleted AS (
        DELETE FROM metadata.catalog c
        WHERE NOT EXISTS (
          SELECT 1 FROM information_schema.tables t
          WHERE t.table_schema = c.schema_name AND t.table_name = c.table_name
        )
        RETURNING 1
      )
      SELECT COUNT(*)::bigint as deleted FROM deleted
    `);
    const deleted = parseInt(result.rows[0]?.deleted ?? "0", 10);
    res.json({ deleted });
  } catch (err) {
    console.error("Error cleaning non-existent tables:", err);
    const safeError = sanitizeError(
      err,
      "Error al limpiar tablas no existentes",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

/**
 * POST /clean-orphaned-tables - No-op for "orphaned tables" (tables in lake without catalog entry).
 * We do not drop physical tables from here; this endpoint exists for API parity.
 */
router.post("/clean-orphaned-tables", async (req, res) => {
  res.json({ deleted: 0, message: "Orphaned tables are physical tables; no catalog rows to delete." });
});

/**
 * POST /clean-old-logs - Delete log rows older than retention_hours.
 */
router.post("/clean-old-logs", async (req, res) => {
  try {
    const retentionHours = Math.max(1, parseInt(req.body?.retention_hours, 10) || 720);
    const result = await pool.query(
      `WITH deleted AS (
        DELETE FROM metadata.logs WHERE ts < NOW() - INTERVAL '1 hour' * $1 RETURNING 1
       ) SELECT COUNT(*)::bigint as deleted FROM deleted`,
      [retentionHours]
    );
    const deleted = parseInt(result.rows[0]?.deleted ?? "0", 10);
    res.json({ deleted });
  } catch (err) {
    console.error("Error cleaning old logs:", err);
    const safeError = sanitizeError(
      err,
      "Error al limpiar logs antiguos",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

/**
 * POST /clean-orphaned-governance - Remove governance rows not in catalog.
 */
router.post("/clean-orphaned-governance", async (req, res) => {
  try {
    const result = await pool.query(`
      WITH deleted AS (
        DELETE FROM metadata.data_governance_catalog g
        WHERE NOT EXISTS (
          SELECT 1 FROM metadata.catalog c
          WHERE LOWER(c.schema_name) = LOWER(g.schema_name) AND LOWER(c.table_name) = LOWER(g.table_name)
        )
        RETURNING 1
      )
      SELECT COUNT(*)::bigint as deleted FROM deleted
    `);
    const deleted = parseInt(result.rows[0]?.deleted ?? "0", 10);
    res.json({ deleted });
  } catch (err) {
    console.error("Error cleaning orphaned governance:", err);
    const safeError = sanitizeError(
      err,
      "Error al limpiar governance huérfano",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

/**
 * POST /clean-orphaned-quality - Remove quality rows not in catalog.
 */
router.post("/clean-orphaned-quality", async (req, res) => {
  try {
    const result = await pool.query(`
      WITH deleted AS (
        DELETE FROM metadata.data_quality q
        WHERE NOT EXISTS (
          SELECT 1 FROM metadata.catalog c
          WHERE LOWER(c.schema_name) = LOWER(q.schema_name) AND LOWER(c.table_name) = LOWER(q.table_name)
        )
        RETURNING 1
      )
      SELECT COUNT(*)::bigint as deleted FROM deleted
    `);
    const deleted = parseInt(result.rows[0]?.deleted ?? "0", 10);
    res.json({ deleted });
  } catch (err) {
    console.error("Error cleaning orphaned quality:", err);
    const safeError = sanitizeError(
      err,
      "Error al limpiar quality huérfano",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

/**
 * POST /clean-orphaned-maintenance - Remove maintenance_control rows not in catalog.
 * Safe if table or schema_name/table_name columns do not exist.
 */
router.post("/clean-orphaned-maintenance", async (req, res) => {
  try {
    const result = await pool.query(`
      WITH deleted AS (
        DELETE FROM metadata.maintenance_control m
        WHERE (m.schema_name IS NULL OR m.table_name IS NULL)
           OR NOT EXISTS (
          SELECT 1 FROM metadata.catalog c
          WHERE LOWER(c.schema_name) = LOWER(m.schema_name) AND LOWER(c.table_name) = LOWER(m.table_name)
        )
        RETURNING 1
      )
      SELECT COUNT(*)::bigint as deleted FROM deleted
    `);
    const deleted = parseInt(result.rows[0]?.deleted ?? "0", 10);
    res.json({ deleted });
  } catch (err) {
    const msg = err?.message || "";
    if (msg.includes("column") && (msg.includes("schema_name") || msg.includes("table_name"))) {
      res.json({ deleted: 0 });
      return;
    }
    console.error("Error cleaning orphaned maintenance:", err);
    const safeError = sanitizeError(
      err,
      "Error al limpiar maintenance huérfano",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

/**
 * POST /clean-orphaned-lineage - Remove lineage rows not in catalog (all lineage tables).
 * Each table is tried individually so missing tables or columns do not fail the whole request.
 */
router.post("/clean-orphaned-lineage", async (req, res) => {
  try {
    let totalDeleted = 0;
    for (const table of ["mdb_lineage", "mssql_lineage", "mongo_lineage", "oracle_lineage"]) {
      try {
        const result = await pool.query(`
          WITH deleted AS (
            DELETE FROM metadata.${table} l
            WHERE (l.schema_name IS NULL OR l.table_name IS NULL)
               OR NOT EXISTS (
              SELECT 1 FROM metadata.catalog c
              WHERE LOWER(c.schema_name) = LOWER(l.schema_name) AND LOWER(c.table_name) = LOWER(l.table_name)
            )
            RETURNING 1
          )
          SELECT COUNT(*)::bigint as deleted FROM deleted
        `);
        totalDeleted += parseInt(result.rows[0]?.deleted ?? "0", 10);
      } catch (tErr) {
        const msg = tErr?.message || "";
        if (msg.includes("does not exist") || (msg.includes("column") && msg.includes("schema_name"))) {
          continue;
        }
        throw tErr;
      }
    }
    res.json({ deleted: totalDeleted });
  } catch (err) {
    console.error("Error cleaning orphaned lineage:", err);
    const safeError = sanitizeError(
      err,
      "Error al limpiar lineage huérfano",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

/**
 * POST /clean-all - Run all cleanup operations in sequence and return combined result.
 */
router.post("/clean-all", async (req, res) => {
  try {
    const retentionHours = Math.max(1, parseInt(req.body?.retention_hours, 10) || 720);
    const results = {};

    const nonExistent = await pool.query(`
      WITH deleted AS (
        DELETE FROM metadata.catalog c
        WHERE NOT EXISTS (
          SELECT 1 FROM information_schema.tables t
          WHERE t.table_schema = c.schema_name AND t.table_name = c.table_name
        )
        RETURNING 1
      )
      SELECT COUNT(*)::bigint as deleted FROM deleted
    `);
    results.non_existent_tables = parseInt(nonExistent.rows[0]?.deleted ?? "0", 10);

    results.orphaned_tables = 0;

    const oldLogs = await pool.query(
      `WITH deleted AS (DELETE FROM metadata.logs WHERE ts < NOW() - INTERVAL '1 hour' * $1 RETURNING 1) SELECT COUNT(*)::bigint as deleted FROM deleted`,
      [retentionHours]
    );
    results.old_logs = parseInt(oldLogs.rows[0]?.deleted ?? "0", 10);

    const gov = await pool.query(`
      WITH deleted AS (
        DELETE FROM metadata.data_governance_catalog g
        WHERE NOT EXISTS (SELECT 1 FROM metadata.catalog c WHERE LOWER(c.schema_name) = LOWER(g.schema_name) AND LOWER(c.table_name) = LOWER(g.table_name))
        RETURNING 1
      )
      SELECT COUNT(*)::bigint as deleted FROM deleted
    `);
    results.orphaned_governance = parseInt(gov.rows[0]?.deleted ?? "0", 10);

    const qual = await pool.query(`
      WITH deleted AS (
        DELETE FROM metadata.data_quality q
        WHERE NOT EXISTS (SELECT 1 FROM metadata.catalog c WHERE LOWER(c.schema_name) = LOWER(q.schema_name) AND LOWER(c.table_name) = LOWER(q.table_name))
        RETURNING 1
      )
      SELECT COUNT(*)::bigint as deleted FROM deleted
    `);
    results.orphaned_quality = parseInt(qual.rows[0]?.deleted ?? "0", 10);

    try {
      const maint = await pool.query(`
        WITH deleted AS (
          DELETE FROM metadata.maintenance_control m
          WHERE (m.schema_name IS NULL OR m.table_name IS NULL)
             OR NOT EXISTS (SELECT 1 FROM metadata.catalog c WHERE LOWER(c.schema_name) = LOWER(m.schema_name) AND LOWER(c.table_name) = LOWER(m.table_name))
          RETURNING 1
        )
        SELECT COUNT(*)::bigint as deleted FROM deleted
      `);
      results.orphaned_maintenance = parseInt(maint.rows[0]?.deleted ?? "0", 10);
    } catch {
      results.orphaned_maintenance = 0;
    }

    let lineageDeleted = 0;
    for (const table of ["mdb_lineage", "mssql_lineage", "mongo_lineage", "oracle_lineage"]) {
      try {
        const lr = await pool.query(`
          WITH deleted AS (
            DELETE FROM metadata.${table} l
            WHERE (l.schema_name IS NULL OR l.table_name IS NULL)
               OR NOT EXISTS (SELECT 1 FROM metadata.catalog c WHERE LOWER(c.schema_name) = LOWER(l.schema_name) AND LOWER(c.table_name) = LOWER(l.table_name))
            RETURNING 1
          )
          SELECT COUNT(*)::bigint as deleted FROM deleted
        `);
        lineageDeleted += parseInt(lr.rows[0]?.deleted ?? "0", 10);
      } catch {
        // table or columns may not exist
      }
    }
    results.orphaned_lineage = lineageDeleted;

    res.json({ results });
  } catch (err) {
    console.error("Error in clean-all:", err);
    const safeError = sanitizeError(
      err,
      "Error al ejecutar limpieza total",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

export default router;
