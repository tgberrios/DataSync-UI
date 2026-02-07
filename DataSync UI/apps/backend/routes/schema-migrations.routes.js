import express from "express";
import crypto from "crypto";
import { pool } from "../services/database.service.js";
import { sanitizeError } from "../server-utils/errorHandler.js";
import { validatePage, validateLimit, validateIdentifier } from "../server-utils/validation.js";
import { requireAuth, requireRole } from "../server-utils/auth.js";
import { Pool } from "pg";

const router = express.Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const page = validatePage(req.query.page, 1);
    const limit = validateLimit(req.query.limit, 20);
    const offset = (page - 1) * limit;
    const search = req.query.search || "";
    const status = req.query.status || "";
    const environment = req.query.environment || "";
    const db_engine = req.query.db_engine || "";

    const whereConditions = [];
    const params = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      whereConditions.push(
        `(migration_name ILIKE $${paramCount} OR version ILIKE $${paramCount} OR description ILIKE $${paramCount})`
      );
      params.push(`%${search}%`);
    }

    if (status) {
      paramCount++;
      whereConditions.push(`status = $${paramCount}`);
      params.push(status);
    }

    if (db_engine) {
      paramCount++;
      whereConditions.push(`db_engine = $${paramCount}`);
      params.push(db_engine);
    }

    const whereClause =
      whereConditions.length > 0
        ? "WHERE " + whereConditions.join(" AND ")
        : "";

    const countQuery = `SELECT COUNT(*) FROM metadata.schema_migrations ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    paramCount++;
    const limitParam = paramCount;
    paramCount++;
    const offsetParam = paramCount;

    params.push(limit, offset);

    const dataQuery = `
      SELECT * FROM metadata.schema_migrations
      ${whereClause}
      ORDER BY version DESC, created_at DESC
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `;

    const result = await pool.query(dataQuery, params);

    const totalPages = Math.ceil(total / limit);

    res.json({
      migrations: result.rows,
      pagination: {
        total,
        totalPages,
        currentPage: page,
        limit,
      },
    });
  } catch (err) {
    console.error("Error fetching schema migrations:", err);
    const safeError = sanitizeError(
      err,
      "Error al obtener migraciones",
      process.env.NODE_ENV === "production"
    );
    res.status(500).json({ error: safeError });
  }
});

router.get(
  "/:migrationName",
  requireAuth,
  async (req, res) => {
    try {
      const migrationName = validateIdentifier(req.params.migrationName);
      if (!migrationName) {
        return res.status(400).json({ error: "Invalid migration name" });
      }

      const result = await pool.query(
        `SELECT * FROM metadata.schema_migrations WHERE migration_name = $1`,
        [migrationName]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Migration not found" });
      }

      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error fetching migration:", err);
      const safeError = sanitizeError(
        err,
        "Error al obtener migración",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

router.post(
  "/",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const {
        migration_name,
        version,
        description,
        db_engine,
        forward_sql,
        rollback_sql,
        connection_string,
        environment_connections,
      } = req.body;

      if (!migration_name || !version || !forward_sql) {
        return res.status(400).json({
          error: "Migration name, version, and forward_sql are required",
        });
      }

      if (!rollback_sql || rollback_sql.trim() === "") {
        return res.status(400).json({
          error:
            "Rollback SQL is MANDATORY. Every migration must have a rollback strategy.",
        });
      }

      const currentHash = crypto
        .createHash("sha256")
        .update(forward_sql + rollback_sql)
        .digest("hex");

      const lastMigrationResult = await pool.query(
        `SELECT current_hash, chain_position 
         FROM metadata.schema_migration_chain 
         ORDER BY chain_position DESC 
         LIMIT 1`
      );

      const isGenesis = lastMigrationResult.rows.length === 0;
      const prevHash = isGenesis
        ? null
        : lastMigrationResult.rows[0].current_hash;
      const chainPosition = isGenesis
        ? 0
        : lastMigrationResult.rows[0].chain_position + 1;

      const legacyConnectionString = connection_string || (environment_connections && environment_connections.production) || null;
      const envConnections = environment_connections || (legacyConnectionString ? { production: legacyConnectionString } : {});

      const result = await pool.query(
        `INSERT INTO metadata.schema_migrations 
        (migration_name, version, description, db_engine, forward_sql, rollback_sql, checksum, status, prev_hash, chain_position, is_genesis, connection_string, environment_connections, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING', $8, $9, $10, $11, $12, NOW())
        RETURNING *`,
        [
          migration_name,
          version,
          description || null,
          db_engine || "PostgreSQL",
          forward_sql,
          rollback_sql,
          currentHash,
          prevHash,
          chainPosition,
          isGenesis,
          legacyConnectionString,
          JSON.stringify(envConnections),
        ]
      );

      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error("Error creating migration:", err);
      if (err.code === "23505") {
        return res.status(409).json({ error: "Migration name already exists" });
      }
      const safeError = sanitizeError(
        err,
        "Error al crear migración",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

router.post(
  "/:migrationName/apply",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const migrationName = validateIdentifier(req.params.migrationName);
      if (!migrationName) {
        return res.status(400).json({ error: "Invalid migration name" });
      }

      const { environment } = req.body;
      if (!environment) {
        return res.status(400).json({ error: "Environment is required" });
      }

      const migrationResult = await pool.query(
        `SELECT * FROM metadata.schema_migrations WHERE migration_name = $1`,
        [migrationName]
      );

      if (migrationResult.rows.length === 0) {
        return res.status(404).json({ error: "Migration not found" });
      }

      const migration = migrationResult.rows[0];

      const historyCheck = await pool.query(
        `SELECT * FROM metadata.schema_migration_history 
         WHERE migration_name = $1 AND environment = $2 AND status = 'APPLIED'
         ORDER BY executed_at DESC LIMIT 1`,
        [migrationName, environment]
      );

      if (historyCheck.rows.length > 0) {
        return res.status(409).json({
          error: `Migration ${migrationName} is already applied to ${environment}`,
        });
      }

      const startTime = Date.now();
      let executionError = null;

      let targetConnectionString = null;
      if (migration.environment_connections && typeof migration.environment_connections === 'object') {
        const envConnections = typeof migration.environment_connections === 'string' 
          ? JSON.parse(migration.environment_connections) 
          : migration.environment_connections;
        targetConnectionString = envConnections[environment] || envConnections.production || null;
      } else {
        targetConnectionString = migration.connection_string || null;
      }

      try {
        if (targetConnectionString) {
          const targetPool = new Pool({
            connectionString: targetConnectionString,
            max: 1,
          });

          try {
            await targetPool.query(migration.forward_sql);
            await targetPool.end();
          } catch (dbError) {
            executionError = dbError.message;
            try {
              await targetPool.end();
            } catch (endError) {
              console.error("Error closing connection pool:", endError);
            }
            throw dbError;
          }
        } else {
          await pool.query(migration.forward_sql);
        }

        const executionTime = Date.now() - startTime;
        const currentUser = req.user?.username || "system";

        await pool.query(
          `INSERT INTO metadata.schema_migration_history 
           (migration_name, environment, status, executed_at, executed_by, execution_time_ms, error_message)
           VALUES ($1, $2, 'APPLIED', NOW(), $3, $4, NULL)`,
          [migrationName, environment, currentUser, executionTime]
        );

        const currentHash = crypto
          .createHash("sha256")
          .update(migration.forward_sql + migration.rollback_sql)
          .digest("hex");

        const lastChainResult = await pool.query(
          `SELECT chain_position, current_hash
           FROM metadata.schema_migration_chain
           WHERE environment = $1
           ORDER BY chain_position DESC
           LIMIT 1`,
          [environment]
        );

        const isGenesis = lastChainResult.rows.length === 0;
        const prevHash = isGenesis
          ? null
          : lastChainResult.rows[0].current_hash;
        const chainPosition = isGenesis
          ? 0
          : lastChainResult.rows[0].chain_position + 1;

        if (!isGenesis && migration.prev_hash !== prevHash) {
          return res.status(400).json({
            error: `Chain validation failed. Expected prev_hash: ${prevHash}, got: ${migration.prev_hash}. Migration chain is broken.`,
          });
        }

        await pool.query(
          `INSERT INTO metadata.schema_migration_chain
           (migration_name, prev_hash, current_hash, chain_position, environment)
           VALUES ($1, $2, $3, $4, $5)`,
          [migrationName, prevHash, currentHash, chainPosition, environment]
        );

        await pool.query(
          `UPDATE metadata.schema_migrations 
           SET status = 'APPLIED', last_applied_at = NOW(), applied_by = $1
           WHERE migration_name = $2`,
          [currentUser, migrationName]
        );

        res.json({
          message: `Migration ${migrationName} applied successfully to ${environment}`,
          execution_time_ms: executionTime,
        });
      } catch (dbError) {
        const executionTime = Date.now() - startTime;
        const currentUser = req.user?.username || "system";
        executionError = dbError.message;

        await pool.query(
          `INSERT INTO metadata.schema_migration_history 
           (migration_name, environment, status, executed_at, executed_by, execution_time_ms, error_message)
           VALUES ($1, $2, 'FAILED', NOW(), $3, $4, $5)`,
          [
            migrationName,
            environment,
            currentUser,
            executionTime,
            executionError,
          ]
        );

        await pool.query(
          `UPDATE metadata.schema_migrations 
           SET status = 'FAILED'
           WHERE migration_name = $1`,
          [migrationName]
        );

        throw dbError;
      }
    } catch (err) {
      console.error("Error applying migration:", err);
      const safeError = sanitizeError(
        err,
        "Error al aplicar migración",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

router.post(
  "/:migrationName/rollback",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const migrationName = validateIdentifier(req.params.migrationName);
      if (!migrationName) {
        return res.status(400).json({ error: "Invalid migration name" });
      }

      const { environment } = req.body;
      if (!environment) {
        return res.status(400).json({ error: "Environment is required" });
      }

      const migrationResult = await pool.query(
        `SELECT * FROM metadata.schema_migrations WHERE migration_name = $1`,
        [migrationName]
      );

      if (migrationResult.rows.length === 0) {
        return res.status(404).json({ error: "Migration not found" });
      }

      const migration = migrationResult.rows[0];

      if (!migration.rollback_sql) {
        return res.status(400).json({
          error: "Migration does not have rollback SQL defined",
        });
      }

      const historyCheck = await pool.query(
        `SELECT * FROM metadata.schema_migration_history 
         WHERE migration_name = $1 AND environment = $2 AND status = 'APPLIED'
         ORDER BY executed_at DESC LIMIT 1`,
        [migrationName, environment]
      );

      if (historyCheck.rows.length === 0) {
        return res.status(404).json({
          error: `Migration ${migrationName} is not applied to ${environment}`,
        });
      }

      const startTime = Date.now();
      let executionError = null;

      let targetConnectionString = null;
      if (migration.environment_connections && typeof migration.environment_connections === 'object') {
        const envConnections = typeof migration.environment_connections === 'string' 
          ? JSON.parse(migration.environment_connections) 
          : migration.environment_connections;
        targetConnectionString = envConnections[environment] || envConnections.production || null;
      } else {
        targetConnectionString = migration.connection_string || null;
      }

      try {
        if (targetConnectionString) {
          const targetPool = new Pool({
            connectionString: targetConnectionString,
            max: 1,
          });

          try {
            await targetPool.query(migration.rollback_sql);
            await targetPool.end();
          } catch (dbError) {
            executionError = dbError.message;
            try {
              await targetPool.end();
            } catch (endError) {
              console.error("Error closing connection pool:", endError);
            }
            throw dbError;
          }
        } else {
          await pool.query(migration.rollback_sql);
        }

        const executionTime = Date.now() - startTime;
        const currentUser = req.user?.username || "system";

        await pool.query(
          `INSERT INTO metadata.schema_migration_history 
           (migration_name, environment, status, executed_at, executed_by, execution_time_ms, error_message)
           VALUES ($1, $2, 'ROLLED_BACK', NOW(), $3, $4, NULL)`,
          [migrationName, environment, currentUser, executionTime]
        );

        await pool.query(
          `UPDATE metadata.schema_migrations 
           SET status = 'ROLLED_BACK'
           WHERE migration_name = $1`,
          [migrationName]
        );

        res.json({
          message: `Migration ${migrationName} rolled back successfully from ${environment}`,
          execution_time_ms: executionTime,
        });
      } catch (dbError) {
        const executionTime = Date.now() - startTime;
        const currentUser = req.user?.username || "system";
        executionError = dbError.message;

        await pool.query(
          `INSERT INTO metadata.schema_migration_history 
           (migration_name, environment, status, executed_at, executed_by, execution_time_ms, error_message)
           VALUES ($1, $2, 'FAILED', NOW(), $3, $4, $5)`,
          [
            migrationName,
            environment,
            currentUser,
            executionTime,
            executionError,
          ]
        );

        throw dbError;
      }
    } catch (err) {
      console.error("Error rolling back migration:", err);
      const safeError = sanitizeError(
        err,
        "Error al hacer rollback de migración",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

router.get(
  "/:migrationName/history",
  requireAuth,
  async (req, res) => {
    try {
      const migrationName = validateIdentifier(req.params.migrationName);
      if (!migrationName) {
        return res.status(400).json({ error: "Invalid migration name" });
      }

      const result = await pool.query(
        `SELECT * FROM metadata.schema_migration_history 
       WHERE migration_name = $1 
       ORDER BY executed_at DESC 
       LIMIT 100`,
        [migrationName]
      );

      res.json({ history: result.rows });
    } catch (err) {
      console.error("Error fetching migration history:", err);
      const safeError = sanitizeError(
        err,
        "Error al obtener historial de migración",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

router.delete(
  "/:migrationName",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const migrationName = validateIdentifier(req.params.migrationName);
      if (!migrationName) {
        return res.status(400).json({ error: "Invalid migration name" });
      }

      const result = await pool.query(
        `DELETE FROM metadata.schema_migrations WHERE migration_name = $1 RETURNING *`,
        [migrationName]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Migration not found" });
      }

      res.json({ message: `Migration ${migrationName} deleted successfully` });
    } catch (err) {
      console.error("Error deleting migration:", err);
      const safeError = sanitizeError(
        err,
        "Error al eliminar migración",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

router.get(
  "/chain/:environment",
  requireAuth,
  async (req, res) => {
    try {
      const environment = req.params.environment;
      if (!["dev", "staging", "production"].includes(environment)) {
        return res.status(400).json({ error: "Invalid environment" });
      }

      const chainResult = await pool.query(
        `SELECT 
          sm.migration_name,
          sm.version,
          sm.prev_hash,
          sm.chain_position,
          sm.status,
          sm.is_genesis,
          smc.current_hash
        FROM metadata.schema_migration_chain smc
        JOIN metadata.schema_migrations sm ON smc.migration_name = sm.migration_name
        WHERE smc.environment = $1
        ORDER BY smc.chain_position ASC`,
        [environment]
      );

      const statusResult = await pool.query(
        `SELECT 
          COUNT(*) as total_links,
          COUNT(CASE WHEN sm.status = 'APPLIED' THEN 1 END) as applied_count
        FROM metadata.schema_migration_chain smc
        JOIN metadata.schema_migrations sm ON smc.migration_name = sm.migration_name
        WHERE smc.environment = $1`,
        [environment]
      );

      res.json({
        chain: chainResult.rows,
        status: {
          total_links: parseInt(statusResult.rows[0].total_links),
          applied_count: parseInt(statusResult.rows[0].applied_count),
          environment,
        },
      });
    } catch (err) {
      console.error("Error fetching migration chain:", err);
      const safeError = sanitizeError(
        err,
        "Error al obtener cadena de migraciones",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

router.post(
  "/chain/validate",
  requireAuth,
  async (req, res) => {
    try {
      const { environment } = req.body;
      if (!["dev", "staging", "production"].includes(environment)) {
        return res.status(400).json({ error: "Invalid environment" });
      }

      const chainResult = await pool.query(
        `SELECT 
          sm.migration_name,
          sm.prev_hash,
          smc.current_hash,
          smc.chain_position
        FROM metadata.schema_migration_chain smc
        JOIN metadata.schema_migrations sm ON smc.migration_name = sm.migration_name
        WHERE smc.environment = $1
        ORDER BY smc.chain_position ASC`,
        [environment]
      );

      if (chainResult.rows.length === 0) {
        return res.json({
          valid: true,
          total_links: 0,
          environment,
          missing: [],
        });
      }

      let brokenAt = null;
      const missing = [];

      for (let i = 0; i < chainResult.rows.length; i++) {
        const current = chainResult.rows[i];
        if (i === 0) {
          if (!current.prev_hash && !current.is_genesis) {
            brokenAt = current.migration_name;
            break;
          }
        } else {
          const prev = chainResult.rows[i - 1];
          if (current.prev_hash !== prev.current_hash) {
            brokenAt = current.migration_name;
            missing.push(prev.migration_name);
            break;
          }
        }
      }

      res.json({
        valid: !brokenAt,
        broken_at: brokenAt,
        missing,
        total_links: chainResult.rows.length,
        environment,
      });
    } catch (err) {
      console.error("Error validating chain:", err);
      const safeError = sanitizeError(
        err,
        "Error al validar cadena",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

router.post(
  "/detect-unregistered",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const { environment, connection_string } = req.body;

      const targetPool = connection_string
        ? new Pool({ connectionString: connection_string, max: 1 })
        : pool;

      try {
        const tablesResult = await targetPool.query(`
          SELECT schemaname, tablename
          FROM pg_tables
          WHERE schemaname NOT IN ('pg_catalog', 'information_schema', 'metadata')
          ORDER BY schemaname, tablename
        `);

        const columnsResult = await targetPool.query(`
          SELECT 
            table_schema,
            table_name,
            column_name,
            data_type
          FROM information_schema.columns
          WHERE table_schema NOT IN ('pg_catalog', 'information_schema', 'metadata')
          ORDER BY table_schema, table_name, column_name
        `);

        const indexesResult = await targetPool.query(`
          SELECT 
            schemaname,
            tablename,
            indexname
          FROM pg_indexes
          WHERE schemaname NOT IN ('pg_catalog', 'information_schema', 'metadata')
          ORDER BY schemaname, tablename, indexname
        `);

        const constraintsResult = await targetPool.query(`
          SELECT 
            tc.table_schema,
            tc.table_name,
            tc.constraint_name,
            tc.constraint_type
          FROM information_schema.table_constraints tc
          WHERE tc.table_schema NOT IN ('pg_catalog', 'information_schema', 'metadata')
          ORDER BY tc.table_schema, tc.table_name, tc.constraint_name
        `);

        const registeredTables = await pool.query(`
          SELECT DISTINCT 
            LOWER(REGEXP_REPLACE(forward_sql, '.*CREATE TABLE[\\s]+(?:IF NOT EXISTS[\\s]+)?(?:["\']?([\\w\\.]+)["\']?|([\\w\\.]+)).*', '\\1\\2', 'i')) as table_name
          FROM metadata.schema_migrations
          WHERE forward_sql ILIKE '%CREATE TABLE%'
        `);

        const registeredTableNames = new Set(
          registeredTables.rows
            .map((r) => r.table_name?.toLowerCase())
            .filter(Boolean)
        );

        const unregisteredTables = tablesResult.rows
          .filter(
            (t) =>
              !registeredTableNames.has(
                `${t.schemaname}.${t.tablename}`.toLowerCase()
              )
          )
          .map((t) => ({
            type: "table",
            name: t.tablename,
            schema: t.schemaname,
          }));

        res.json({
          unregistered_tables: unregisteredTables,
          unregistered_columns: [],
          unregistered_indexes: indexesResult.rows.map((idx) => ({
            type: "index",
            name: idx.indexname,
            schema: idx.schemaname,
            table: idx.tablename,
          })),
          unregistered_constraints: constraintsResult.rows.map((c) => ({
            type: "constraint",
            name: c.constraint_name,
            schema: c.table_schema,
            table: c.table_name,
            details: { constraint_type: c.constraint_type },
          })),
        });
      } finally {
        if (connection_string && targetPool !== pool) {
          await targetPool.end();
        }
      }
    } catch (err) {
      console.error("Error detecting unregistered changes:", err);
      const safeError = sanitizeError(
        err,
        "Error al detectar cambios no registrados",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

router.post(
  "/generate-from-diff",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const { environment, connection_string, changes } = req.body;

      if (!changes || Object.keys(changes).length === 0) {
        return res.status(400).json({ error: "No changes provided" });
      }

      const migrationName = `auto_generated_${Date.now()}`;
      const version = "1.0.0";
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

      let forwardSql = `-- Auto-generated migration from unregistered changes\n-- Generated at: ${new Date().toISOString()}\n\n`;
      let rollbackSql = `-- Rollback for auto-generated migration\n-- Generated at: ${new Date().toISOString()}\n\n`;

      if (
        changes.unregistered_tables &&
        changes.unregistered_tables.length > 0
      ) {
        forwardSql += `-- Unregistered tables detected but not automatically migrated\n-- Manual review required for: ${changes.unregistered_tables
          .map((t) => t.name)
          .join(", ")}\n\n`;
      }

      if (
        changes.unregistered_indexes &&
        changes.unregistered_indexes.length > 0
      ) {
        forwardSql += `-- Unregistered indexes (manual review recommended)\n`;
        changes.unregistered_indexes.forEach((idx) => {
          forwardSql += `-- CREATE INDEX ${idx.name} ON ${idx.schema}.${idx.table};\n`;
        });
        forwardSql += "\n";
      }

      if (
        changes.unregistered_constraints &&
        changes.unregistered_constraints.length > 0
      ) {
        forwardSql += `-- Unregistered constraints (manual review recommended)\n`;
        changes.unregistered_constraints.forEach((c) => {
          forwardSql += `-- ALTER TABLE ${c.schema}.${c.table} ADD CONSTRAINT ${c.name} ...;\n`;
        });
        forwardSql += "\n";
      }

      rollbackSql += `-- Rollback operations\n-- Manual review required\n`;

      const checksum = crypto
        .createHash("sha256")
        .update(forwardSql)
        .digest("hex");

      const result = await pool.query(
        `INSERT INTO metadata.schema_migrations 
         (migration_name, version, description, db_engine, forward_sql, rollback_sql, checksum, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING', NOW())
         RETURNING *`,
        [
          migrationName,
          version,
          "Auto-generated from unregistered changes",
          "PostgreSQL",
          forwardSql,
          rollbackSql,
          checksum,
        ]
      );

      res.json({
        migration_name: migrationName,
        migration: result.rows[0],
        message:
          "Migration generated successfully. Please review and edit before applying.",
      });
    } catch (err) {
      console.error("Error generating migration from diff:", err);
      const safeError = sanitizeError(
        err,
        "Error al generar migración desde diferencias",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

router.post(
  "/:migrationName/test",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const migrationName = validateIdentifier(req.params.migrationName);
      if (!migrationName) {
        return res.status(400).json({ error: "Invalid migration name" });
      }

      const { environment, test_schema_prefix = "_migration_test_" } = req.body;

      const migrationResult = await pool.query(
        `SELECT * FROM metadata.schema_migrations WHERE migration_name = $1`,
        [migrationName]
      );

      if (migrationResult.rows.length === 0) {
        return res.status(404).json({ error: "Migration not found" });
      }

      const migration = migrationResult.rows[0];

      if (!migration.rollback_sql) {
        return res.status(400).json({
          error: "Migration must have rollback SQL to be tested",
        });
      }

      const testSchema = `${test_schema_prefix}${Date.now()}`;
      const startTime = Date.now();
      const errors = [];

      let targetConnectionString = null;
      if (migration.environment_connections && typeof migration.environment_connections === 'object') {
        const envConnections = typeof migration.environment_connections === 'string' 
          ? JSON.parse(migration.environment_connections) 
          : migration.environment_connections;
        targetConnectionString = envConnections[req.body.environment || 'production'] || envConnections.production || null;
      } else {
        targetConnectionString = migration.connection_string || null;
      }

      const targetPool = targetConnectionString
        ? new Pool({ connectionString: targetConnectionString, max: 1 })
        : pool;

      try {
        await targetPool.query(`CREATE SCHEMA IF NOT EXISTS ${testSchema}`);

        const forwardSqlWithSchema = migration.forward_sql.replace(
          /CREATE TABLE\s+(?:IF NOT EXISTS\s+)?["']?(\w+)["']?/gi,
          `CREATE TABLE ${testSchema}.$1`
        );

        try {
          await targetPool.query(forwardSqlWithSchema);
        } catch (forwardErr) {
          errors.push(`Forward SQL failed: ${forwardErr.message}`);
        }

        if (errors.length === 0) {
          const rollbackSqlWithSchema = migration.rollback_sql.replace(
            /DROP TABLE\s+(?:IF EXISTS\s+)?["']?(\w+)["']?/gi,
            `DROP TABLE IF EXISTS ${testSchema}.$1`
          );

          try {
            await targetPool.query(rollbackSqlWithSchema);
          } catch (rollbackErr) {
            errors.push(`Rollback SQL failed: ${rollbackErr.message}`);
          }
        }

        await targetPool.query(`DROP SCHEMA IF EXISTS ${testSchema} CASCADE`);
      } catch (testErr) {
        errors.push(`Test execution failed: ${testErr.message}`);
        try {
          await targetPool.query(`DROP SCHEMA IF EXISTS ${testSchema} CASCADE`);
        } catch (cleanupErr) {
          console.error("Error cleaning up test schema:", cleanupErr);
        }
      } finally {
        if (migration.connection_string && targetPool !== pool) {
          await targetPool.end();
        }
      }

      const executionTime = Date.now() - startTime;

      res.json({
        success: errors.length === 0,
        test_schema: testSchema,
        execution_time_ms: executionTime,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (err) {
      console.error("Error testing migration:", err);
      const safeError = sanitizeError(
        err,
        "Error al probar migración",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

router.post(
  "/test-sql",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const { db_engine, connection_string, forward_sql, rollback_sql } = req.body;

      if (!forward_sql || !rollback_sql || !connection_string) {
        return res.status(400).json({
          error: "forward_sql, rollback_sql, and connection_string are required",
        });
      }

      const testSchema = `_migration_test_${Date.now()}`;
      const startTime = Date.now();
      const errors = [];

      let targetPool;
      try {
        if (db_engine === "PostgreSQL") {
          targetPool = new Pool({ connectionString: connection_string, max: 1 });
        } else {
          return res.status(400).json({
            error: "Only PostgreSQL is supported for SQL testing at the moment",
          });
        }

        await targetPool.query(`CREATE SCHEMA IF NOT EXISTS ${testSchema}`);

        const forwardSqlWithSchema = forward_sql.replace(
          /CREATE TABLE\s+(?:IF NOT EXISTS\s+)?["']?(\w+)["']?/gi,
          `CREATE TABLE ${testSchema}.$1`
        );

        try {
          await targetPool.query(forwardSqlWithSchema);
        } catch (forwardErr) {
          errors.push(`Forward SQL failed: ${forwardErr.message}`);
        }

        if (errors.length === 0) {
          const rollbackSqlWithSchema = rollback_sql.replace(
            /DROP TABLE\s+(?:IF EXISTS\s+)?["']?(\w+)["']?/gi,
            `DROP TABLE IF EXISTS ${testSchema}.$1`
          );

          try {
            await targetPool.query(rollbackSqlWithSchema);
          } catch (rollbackErr) {
            errors.push(`Rollback SQL failed: ${rollbackErr.message}`);
          }
        }

        await targetPool.query(`DROP SCHEMA IF EXISTS ${testSchema} CASCADE`);
      } catch (testErr) {
        errors.push(`Test execution failed: ${testErr.message}`);
        try {
          if (targetPool) {
            await targetPool.query(`DROP SCHEMA IF EXISTS ${testSchema} CASCADE`);
          }
        } catch (cleanupErr) {
          console.error("Error cleaning up test schema:", cleanupErr);
        }
      } finally {
        if (targetPool) {
          await targetPool.end();
        }
      }

      const executionTime = Date.now() - startTime;

      res.json({
        success: errors.length === 0,
        test_schema: testSchema,
        execution_time_ms: executionTime,
        errors: errors.length > 0 ? errors : undefined,
        message: errors.length === 0
          ? "SQL test successful! Forward and rollback executed correctly."
          : errors.join("; "),
      });
    } catch (err) {
      console.error("Error testing SQL:", err);
      const safeError = sanitizeError(
        err,
        "Error al probar SQL",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

router.delete(
  "/test/:testSchema",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const testSchema = validateIdentifier(req.params.testSchema);
      if (!testSchema || !testSchema.startsWith("_migration_test_")) {
        return res.status(400).json({ error: "Invalid test schema name" });
      }

      await pool.query(`DROP SCHEMA IF EXISTS ${testSchema} CASCADE`);

      res.json({
        message: `Test schema ${testSchema} cleaned up successfully`,
      });
    } catch (err) {
      console.error("Error cleaning up test schema:", err);
      const safeError = sanitizeError(
        err,
        "Error al limpiar schema de test",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

router.get(
  "/integrity-check",
  requireAuth,
  async (req, res) => {
    try {
      const chainValidation = await pool.query(`
        SELECT environment, COUNT(*) as chain_length
        FROM metadata.schema_migration_chain
        GROUP BY environment
      `);

      const unregisteredCheck = await pool.query(`
        SELECT COUNT(*) as unregistered_count
        FROM (
          SELECT tablename, schemaname
          FROM pg_tables
          WHERE schemaname NOT IN ('pg_catalog', 'information_schema', 'metadata')
          EXCEPT
          SELECT DISTINCT 
            LOWER(REGEXP_REPLACE(forward_sql, '.*CREATE TABLE[\\s]+(?:IF NOT EXISTS[\\s]+)?(?:["\']?([\\w\\.]+)["\']?|([\\w\\.]+)).*', '\\1\\2', 'i')) as table_name,
            'public' as schemaname
          FROM metadata.schema_migrations
          WHERE forward_sql ILIKE '%CREATE TABLE%'
        ) AS unregistered
      `);

      const missingRollback = await pool.query(`
        SELECT COUNT(*) as count
        FROM metadata.schema_migrations
        WHERE rollback_sql IS NULL OR rollback_sql = ''
      `);

      const lastApplied = await pool.query(`
        SELECT migration_name, MAX(executed_at) as last_executed
        FROM metadata.schema_migration_history
        WHERE status = 'APPLIED'
        GROUP BY migration_name
        ORDER BY last_executed DESC
        LIMIT 1
      `);

      const mostUpdatedEnv = await pool.query(`
        SELECT environment, COUNT(*) as applied_count
        FROM metadata.schema_migration_history
        WHERE status = 'APPLIED'
        GROUP BY environment
        ORDER BY applied_count DESC
        LIMIT 1
      `);

      const totalMigrations = await pool.query(`
        SELECT COUNT(*) as count FROM metadata.schema_migrations
      `);

      const pendingTests = await pool.query(`
        SELECT COUNT(*) as count
        FROM metadata.schema_migrations
        WHERE status = 'PENDING'
      `);

      const chainValid = chainValidation.rows.length > 0;

      res.json({
        chain_valid: chainValid,
        unregistered_changes: parseInt(
          unregisteredCheck.rows[0]?.unregistered_count || "0"
        ),
        migrations_without_rollback: parseInt(
          missingRollback.rows[0]?.count || "0"
        ),
        last_migration_applied: lastApplied.rows[0]?.migration_name || null,
        most_updated_environment: mostUpdatedEnv.rows[0]?.environment || "N/A",
        total_migrations: parseInt(totalMigrations.rows[0]?.count || "0"),
        pending_tests: parseInt(pendingTests.rows[0]?.count || "0"),
      });
    } catch (err) {
      console.error("Error checking integrity:", err);
      const safeError = sanitizeError(
        err,
        "Error al verificar integridad",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);



export default router;
