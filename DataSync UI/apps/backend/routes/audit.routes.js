import express from "express";
import { pool } from "../services/database.service.js";
import { sanitizeError } from "../server-utils/errorHandler.js";
import { requireAuth, requireRole } from "../server-utils/auth.js";

const router = express.Router();

router.get("/logs",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const {
        schema_name,
        table_name,
        username,
        action_type,
        start_date,
        end_date,
        page = 1,
        limit = 100,
      } = req.query;

      const result = await pool.query("SELECT * FROM metadata.get_audit_trail($1, $2, $3, $4, $5, $6, $7)", [
        schema_name || null,
        table_name || null,
        username || null,
        action_type || null,
        start_date ? new Date(start_date) : null,
        end_date ? new Date(end_date) : null,
        parseInt(limit, 10),
      ]);

      const total = result.rows.length;

      const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
      const paginatedRows = result.rows.slice(offset, offset + parseInt(limit, 10));

      res.json({
        logs: paginatedRows,
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
      });
    } catch (err) {
      console.error("Error fetching audit logs:", err);
      res.status(500).json({
        error: sanitizeError(
          err,
          "Error fetching audit logs",
          process.env.NODE_ENV === "production"
        ),
      });
    }
  }
);

router.post("/log",
  requireAuth,
  async (req, res) => {
    try {
      const {
        schema_name,
        table_name,
        column_name,
        username,
        action_type,
        query_text,
        old_values,
        new_values,
        rows_affected,
        client_addr,
        application_name,
        compliance_requirement,
      } = req.body;

      if (!username || !action_type) {
        return res.status(400).json({
          error: "username and action_type are required",
        });
      }

      const result = await pool.query(
        "SELECT metadata.log_audit_event($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) as log_id",
        [
          schema_name || null,
          table_name || null,
          column_name || null,
          username,
          action_type,
          query_text || null,
          old_values ? JSON.stringify(old_values) : null,
          new_values ? JSON.stringify(new_values) : null,
          rows_affected || 0,
          client_addr || null,
          application_name || null,
          compliance_requirement || null,
        ]
      );

      res.json({ log_id: result.rows[0].log_id });
    } catch (err) {
      console.error("Error logging audit event:", err);
      res.status(500).json({
        error: sanitizeError(
          err,
          "Error logging audit event",
          process.env.NODE_ENV === "production"
        ),
      });
    }
  }
);

router.get("/compliance-report",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { compliance_type, start_date, end_date } = req.query;

      if (!compliance_type) {
        return res.status(400).json({
          error: "compliance_type is required (GDPR, HIPAA, SOX, etc.)",
        });
      }

      const result = await pool.query("SELECT * FROM metadata.get_compliance_report($1, $2, $3)", [
        compliance_type,
        start_date ? new Date(start_date) : null,
        end_date ? new Date(end_date) : null,
      ]);

      res.json({ report: result.rows[0] || {} });
    } catch (err) {
      console.error("Error generating compliance report:", err);
      res.status(500).json({
        error: sanitizeError(
          err,
          "Error generating compliance report",
          process.env.NODE_ENV === "production"
        ),
      });
    }
  }
);

router.get("/stats",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const { days = 30 } = req.query;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days, 10));

      const statsResult = await pool.query(
        `SELECT 
          COUNT(*) as total_events,
          COUNT(DISTINCT username) as unique_users,
          COUNT(DISTINCT (schema_name || '.' || table_name)) as unique_tables,
          COUNT(*) FILTER (WHERE action_type = 'SELECT') as select_count,
          COUNT(*) FILTER (WHERE action_type = 'INSERT') as insert_count,
          COUNT(*) FILTER (WHERE action_type = 'UPDATE') as update_count,
          COUNT(*) FILTER (WHERE action_type = 'DELETE') as delete_count,
          COUNT(*) FILTER (WHERE compliance_requirement IS NOT NULL) as compliance_events
         FROM metadata.audit_log
         WHERE created_at >= $1`,
        [startDate]
      );

      const actionTypeResult = await pool.query(
        `SELECT action_type, COUNT(*) as count
         FROM metadata.audit_log
         WHERE created_at >= $1
         GROUP BY action_type
         ORDER BY count DESC`,
        [startDate]
      );

      const topUsersResult = await pool.query(
        `SELECT username, COUNT(*) as event_count
         FROM metadata.audit_log
         WHERE created_at >= $1
         GROUP BY username
         ORDER BY event_count DESC
         LIMIT 10`,
        [startDate]
      );

      res.json({
        summary: statsResult.rows[0],
        action_types: actionTypeResult.rows,
        top_users: topUsersResult.rows,
      });
    } catch (err) {
      console.error("Error fetching audit stats:", err);
      res.status(500).json({
        error: sanitizeError(
          err,
          "Error fetching audit stats",
          process.env.NODE_ENV === "production"
        ),
      });
    }
  }
);



export default router;
