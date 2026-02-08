import express from "express";
import { pool } from "../services/database.service.js";
import { sanitizeError } from "../server-utils/errorHandler.js";
import { requireAuth, requireRole } from "../server-utils/auth.js";

const router = express.Router();

/**
 * GET /api/schema-changes/audit
 * List schema change audit records from metadata.schema_change_audit.
 * Optional query: db_engine, schema_name, change_type, object_type.
 */
router.get(
  "/audit",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const db_engine = (req.query.db_engine && String(req.query.db_engine).trim()) || "";
      const schema_name = (req.query.schema_name && String(req.query.schema_name).trim()) || "";
      const change_type = (req.query.change_type && String(req.query.change_type).trim()) || "";
      const object_type = (req.query.object_type && String(req.query.object_type).trim()) || "";

      const whereConditions = [];
      const params = [];
      let paramCount = 0;

      if (db_engine) {
        paramCount++;
        whereConditions.push(`db_engine = $${paramCount}`);
        params.push(db_engine);
      }
      if (schema_name) {
        paramCount++;
        whereConditions.push(`schema_name = $${paramCount}`);
        params.push(schema_name);
      }
      if (change_type) {
        paramCount++;
        whereConditions.push(`change_type = $${paramCount}`);
        params.push(change_type);
      }
      if (object_type) {
        paramCount++;
        whereConditions.push(`object_type = $${paramCount}`);
        params.push(object_type);
      }

      const whereClause =
        whereConditions.length > 0 ? "WHERE " + whereConditions.join(" AND ") : "";

      const query = `
        SELECT
          id,
          db_engine,
          server_name,
          database_name,
          schema_name,
          object_name,
          object_type,
          change_type,
          executed_by,
          execution_timestamp,
          is_rollback_possible,
          created_at
        FROM metadata.schema_change_audit
        ${whereClause}
        ORDER BY execution_timestamp DESC
        LIMIT 500
      `;

      const result = await pool.query(query, params);

      const rows = result.rows.map((row) => ({
        id: row.id,
        db_engine: row.db_engine,
        server_name: row.server_name,
        database_name: row.database_name,
        schema_name: row.schema_name,
        object_name: row.object_name,
        object_type: row.object_type,
        change_type: row.change_type,
        executed_by: row.executed_by,
        detected_at: row.execution_timestamp,
        is_rollback_possible: row.is_rollback_possible ?? false,
        created_at: row.created_at,
      }));

      res.json(rows);
    } catch (err) {
      if (err.code === "42P01") {
        return res.json([]);
      }
      console.error("Error fetching schema change audit:", err);
      res.status(500).json({
        error: sanitizeError(
          err,
          "Error fetching schema change audit",
          process.env.NODE_ENV === "production"
        ),
      });
    }
  }
);

/**
 * GET /api/schema-changes/audit/:id
 * Single schema change audit record by id.
 */
router.get(
  "/audit/:id",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({ error: "Invalid audit id" });
      }

      const result = await pool.query(
        `SELECT
          id,
          db_engine,
          server_name,
          database_name,
          schema_name,
          object_name,
          object_type,
          change_type,
          ddl_statement,
          executed_by,
          execution_timestamp,
          before_state,
          after_state,
          affected_columns,
          rollback_sql,
          is_rollback_possible,
          metadata_json,
          created_at
        FROM metadata.schema_change_audit
        WHERE id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Schema change audit record not found" });
      }

      const row = result.rows[0];
      const record = {
        id: row.id,
        db_engine: row.db_engine,
        server_name: row.server_name,
        database_name: row.database_name,
        schema_name: row.schema_name,
        object_name: row.object_name,
        object_type: row.object_type,
        change_type: row.change_type,
        ddl_statement: row.ddl_statement,
        executed_by: row.executed_by,
        detected_at: row.execution_timestamp,
        execution_timestamp: row.execution_timestamp,
        before_state: row.before_state,
        after_state: row.after_state,
        affected_columns: row.affected_columns,
        rollback_sql: row.rollback_sql,
        is_rollback_possible: row.is_rollback_possible ?? false,
        metadata_json: row.metadata_json,
        created_at: row.created_at,
      };

      res.json(record);
    } catch (err) {
      if (err.code === "42P01") {
        return res.status(404).json({ error: "Schema change audit record not found" });
      }
      console.error("Error fetching schema change audit detail:", err);
      res.status(500).json({
        error: sanitizeError(
          err,
          "Error fetching schema change audit detail",
          process.env.NODE_ENV === "production"
        ),
      });
    }
  }
);

export default router;
