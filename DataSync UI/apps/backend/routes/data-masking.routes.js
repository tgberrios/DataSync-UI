import express from "express";
import { pool, getConfigPath } from "../services/database.service.js";
import { sanitizeError } from "../server-utils/errorHandler.js";
import { requireAuth, requireRole } from "../server-utils/auth.js";
import { Pool } from "pg";
import fs from "fs";
import path from "path";

const router = express.Router();

router.get("/policies",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const {
        schema_name,
        table_name,
        masking_type,
        active,
        page = 1,
        limit = 20,
      } = req.query;

      let query = "SELECT * FROM metadata.masking_policies WHERE 1=1";
      const params = [];
      let paramCount = 0;

      if (schema_name) {
        paramCount++;
        query += ` AND schema_name ILIKE $${paramCount}`;
        params.push(`%${schema_name}%`);
      }

      if (table_name) {
        paramCount++;
        query += ` AND table_name ILIKE $${paramCount}`;
        params.push(`%${table_name}%`);
      }

      if (masking_type) {
        paramCount++;
        query += ` AND masking_type = $${paramCount}`;
        params.push(masking_type);
      }

      if (active !== undefined && active !== "") {
        paramCount++;
        query += ` AND active = $${paramCount}`;
        params.push(active === "true");
      }

      const countQuery = query.replace("SELECT *", "SELECT COUNT(*) as total");
      const countResult = await pool.query(countQuery, params);
      const total = parseInt(countResult.rows[0].total, 10);

      const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
      query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      params.push(parseInt(limit, 10), offset);

      const result = await pool.query(query, params);

      const policies = result.rows.map((row) => ({
        ...row,
        masking_params: typeof row.masking_params === 'string' 
          ? JSON.parse(row.masking_params) 
          : row.masking_params || {},
        role_whitelist: Array.isArray(row.role_whitelist) 
          ? row.role_whitelist 
          : [],
      }));

      res.json({
        policies,
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
      });
    } catch (err) {
      console.error("Error fetching masking policies:", err);
      const safeError = sanitizeError(
        err,
        "Error al obtener políticas de enmascaramiento",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

router.get("/policies/:id",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const policyId = parseInt(req.params.id);
      const result = await pool.query(
        "SELECT * FROM metadata.masking_policies WHERE policy_id = $1",
        [policyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Masking policy not found" });
      }

      const policy = result.rows[0];
      res.json({
        ...policy,
        masking_params: typeof policy.masking_params === 'string' 
          ? JSON.parse(policy.masking_params) 
          : policy.masking_params || {},
        role_whitelist: Array.isArray(policy.role_whitelist) 
          ? policy.role_whitelist 
          : [],
      });
    } catch (err) {
      console.error("Error fetching masking policy:", err);
      const safeError = sanitizeError(
        err,
        "Error al obtener política de enmascaramiento",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

router.post("/policies",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const {
        policy_name,
        schema_name,
        table_name,
        column_name,
        masking_type,
        masking_function,
        masking_params,
        role_whitelist,
        active,
      } = req.body;

      if (!policy_name || !schema_name || !table_name || !column_name || !masking_type) {
        return res.status(400).json({
          error: "policy_name, schema_name, table_name, column_name, and masking_type are required",
        });
      }

      const result = await pool.query(
        `INSERT INTO metadata.masking_policies 
         (policy_name, schema_name, table_name, column_name, masking_type, masking_function, masking_params, role_whitelist, active)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9)
         RETURNING *`,
        [
          policy_name,
          schema_name,
          table_name,
          column_name,
          masking_type,
          masking_function || null,
          masking_params ? JSON.stringify(masking_params) : "{}",
          role_whitelist || [],
          active !== undefined ? active : true,
        ]
      );

      const policy = result.rows[0];
      res.json({
        ...policy,
        masking_params: typeof policy.masking_params === 'string' 
          ? JSON.parse(policy.masking_params) 
          : policy.masking_params || {},
        role_whitelist: Array.isArray(policy.role_whitelist) 
          ? policy.role_whitelist 
          : [],
      });
    } catch (err) {
      console.error("Error creating masking policy:", err);
      const safeError = sanitizeError(
        err,
        "Error al crear política de enmascaramiento",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

router.put("/policies/:id",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const policyId = parseInt(req.params.id);
      const {
        policy_name,
        schema_name,
        table_name,
        column_name,
        masking_type,
        masking_function,
        masking_params,
        role_whitelist,
        active,
      } = req.body;

      const result = await pool.query(
        `UPDATE metadata.masking_policies 
         SET policy_name = $1, schema_name = $2, table_name = $3, column_name = $4, 
             masking_type = $5, masking_function = $6, masking_params = $7::jsonb, 
             role_whitelist = $8, active = $9, updated_at = NOW()
         WHERE policy_id = $10
         RETURNING *`,
        [
          policy_name,
          schema_name,
          table_name,
          column_name,
          masking_type,
          masking_function || null,
          masking_params ? JSON.stringify(masking_params) : "{}",
          role_whitelist || [],
          active !== undefined ? active : true,
          policyId,
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Masking policy not found" });
      }

      const policy = result.rows[0];
      res.json({
        ...policy,
        masking_params: typeof policy.masking_params === 'string' 
          ? JSON.parse(policy.masking_params) 
          : policy.masking_params || {},
        role_whitelist: Array.isArray(policy.role_whitelist) 
          ? policy.role_whitelist 
          : [],
      });
    } catch (err) {
      console.error("Error updating masking policy:", err);
      const safeError = sanitizeError(
        err,
        "Error al actualizar política de enmascaramiento",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

router.delete("/policies/:id",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const policyId = parseInt(req.params.id);
      const result = await pool.query(
        "DELETE FROM metadata.masking_policies WHERE policy_id = $1 RETURNING *",
        [policyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Masking policy not found" });
      }

      res.json({ message: "Masking policy deleted successfully" });
    } catch (err) {
      console.error("Error deleting masking policy:", err);
      const safeError = sanitizeError(
        err,
        "Error al eliminar política de enmascaramiento",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

router.post("/analyze",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const { schema_name, table_name } = req.body;

      if (!schema_name || !table_name) {
        return res.status(400).json({
          error: "schema_name and table_name are required",
        });
      }

      const result = await pool.query(
        "SELECT * FROM metadata.analyze_sensitive_columns($1, $2)",
        [schema_name, table_name]
      );

      res.json({
        columns: result.rows,
        total: result.rows.length,
        schema_name,
        table_name,
      });
    } catch (err) {
      console.error("Error analyzing sensitive columns:", err);
      const safeError = sanitizeError(
        err,
        "Error al analizar columnas sensibles",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

router.post("/create-view",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const { schema_name, table_name } = req.body;

      if (!schema_name || !table_name) {
        return res.status(400).json({
          error: "schema_name and table_name are required",
        });
      }

      const result = await pool.query(
        "SELECT metadata.create_masked_view($1, $2) as view_name",
        [schema_name, table_name]
      );

      res.json({
        message: "Masked view created successfully",
        view_name: result.rows[0].view_name,
        schema_name,
        table_name,
      });
    } catch (err) {
      console.error("Error creating masked view:", err);
      const safeError = sanitizeError(
        err,
        "Error al crear vista enmascarada",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

router.get("/databases",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const result = await pool.query(
        "SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname"
      );
      res.json({
        databases: result.rows.map((row) => row.datname),
      });
    } catch (err) {
      console.error("Error fetching databases:", err);
      const safeError = sanitizeError(
        err,
        "Error al obtener bases de datos",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

router.get("/sensitive-columns",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const { schema_name } = req.query;
      
      let query = `
        SELECT DISTINCT
          c.table_schema::VARCHAR as schema_name,
          c.table_name::VARCHAR as table_name,
          c.column_name::VARCHAR as column_name,
          c.data_type::VARCHAR as data_type,
          CASE 
            WHEN c.column_name ILIKE '%email%' THEN 'EMAIL'
            WHEN c.column_name ILIKE '%phone%' OR c.column_name ILIKE '%tel%' OR c.column_name ILIKE '%mobile%' THEN 'PHONE'
            WHEN c.column_name ILIKE '%ssn%' OR c.column_name ILIKE '%social%' THEN 'SSN'
            WHEN c.column_name ILIKE '%credit%' OR c.column_name ILIKE '%card%' THEN 'CREDIT_CARD'
            WHEN c.column_name ILIKE '%password%' OR c.column_name ILIKE '%passwd%' THEN 'PASSWORD'
            WHEN c.column_name ILIKE '%address%' THEN 'ADDRESS'
            WHEN c.column_name ILIKE '%birth%' OR c.column_name ILIKE '%dob%' THEN 'DATE_OF_BIRTH'
            WHEN c.column_name ILIKE '%name%' THEN 'NAME'
            WHEN c.column_name ILIKE '%id%' THEN 'ID_NUMBER'
            ELSE 'OTHER'
          END::VARCHAR as pii_category,
          CASE 
            WHEN c.column_name ILIKE '%email%' THEN 0.95
            WHEN c.column_name ILIKE '%phone%' OR c.column_name ILIKE '%tel%' THEN 0.90
            WHEN c.column_name ILIKE '%ssn%' OR c.column_name ILIKE '%social%' THEN 0.98
            WHEN c.column_name ILIKE '%credit%' OR c.column_name ILIKE '%card%' THEN 0.95
            WHEN c.column_name ILIKE '%password%' THEN 0.99
            ELSE 0.75
          END::NUMERIC as confidence_score
          FROM information_schema.columns c
          INNER JOIN information_schema.tables t
            ON c.table_schema = t.table_schema 
            AND c.table_name = t.table_name
          WHERE c.table_schema NOT IN ('pg_catalog', 'information_schema', 'pg_toast', 'pg_temp_1', 'pg_toast_temp_1', 'pg_temp', 'pg_toast_temp')
            AND c.table_schema NOT LIKE 'pg_temp%'
            AND c.table_schema NOT LIKE 'pg_toast%'
            AND c.table_schema != 'postgres'
            AND t.table_type = 'BASE TABLE'
            AND c.table_name NOT LIKE '%_masked_%'
            AND c.table_name NOT LIKE '%_smart_%'
      `;
      
      const params = [];
      if (schema_name) {
        query += ` AND c.table_schema = $1`;
        params.push(schema_name);
      }
      
      query += ` AND (
        c.column_name ILIKE '%email%' OR c.column_name ILIKE '%mail%' OR
        c.column_name ILIKE '%phone%' OR c.column_name ILIKE '%tel%' OR c.column_name ILIKE '%mobile%' OR
        c.column_name ILIKE '%ssn%' OR c.column_name ILIKE '%social%' OR c.column_name ILIKE '%security%' OR
        c.column_name ILIKE '%credit%' OR c.column_name ILIKE '%card%' OR c.column_name ILIKE '%payment%' OR
        c.column_name ILIKE '%password%' OR c.column_name ILIKE '%passwd%' OR c.column_name ILIKE '%pwd%' OR
        c.column_name ILIKE '%address%' OR c.column_name ILIKE '%street%' OR c.column_name ILIKE '%zip%' OR
        c.column_name ILIKE '%birth%' OR c.column_name ILIKE '%dob%' OR c.column_name ILIKE '%age%' OR
        (c.column_name ILIKE '%name%' AND (c.column_name ILIKE '%first%' OR c.column_name ILIKE '%last%' OR c.column_name ILIKE '%full%')) OR
        (c.column_name ILIKE '%id%' AND (c.column_name ILIKE '%national%' OR c.column_name ILIKE '%passport%' OR c.column_name ILIKE '%driver%'))
      )
      ORDER BY schema_name, table_name, column_name`;
      
      const result = await pool.query(query, params);
      
      res.json({
        columns: result.rows,
        total: result.rows.length,
      });
    } catch (err) {
      console.error("Error fetching sensitive columns:", err);
      const safeError = sanitizeError(
        err,
        "Error al obtener columnas sensibles",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

router.get("/unprotected-columns",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const { schema_name } = req.query;
      
      let query = `
        WITH sensitive_columns AS (
          SELECT DISTINCT
            c.table_schema::VARCHAR as schema_name,
            c.table_name::VARCHAR as table_name,
            c.column_name::VARCHAR as column_name,
            c.data_type::VARCHAR as data_type,
            CASE 
              WHEN c.column_name ILIKE '%email%' THEN 'EMAIL'
              WHEN c.column_name ILIKE '%phone%' OR c.column_name ILIKE '%tel%' OR c.column_name ILIKE '%mobile%' THEN 'PHONE'
              WHEN c.column_name ILIKE '%ssn%' OR c.column_name ILIKE '%social%' THEN 'SSN'
              WHEN c.column_name ILIKE '%credit%' OR c.column_name ILIKE '%card%' THEN 'CREDIT_CARD'
              WHEN c.column_name ILIKE '%password%' OR c.column_name ILIKE '%passwd%' THEN 'PASSWORD'
              WHEN c.column_name ILIKE '%address%' THEN 'ADDRESS'
              WHEN c.column_name ILIKE '%birth%' OR c.column_name ILIKE '%dob%' THEN 'DATE_OF_BIRTH'
              WHEN c.column_name ILIKE '%name%' THEN 'NAME'
              WHEN c.column_name ILIKE '%id%' THEN 'ID_NUMBER'
              ELSE 'OTHER'
            END::VARCHAR as pii_category,
            CASE 
              WHEN c.column_name ILIKE '%email%' THEN 0.95
              WHEN c.column_name ILIKE '%phone%' OR c.column_name ILIKE '%tel%' THEN 0.90
              WHEN c.column_name ILIKE '%ssn%' OR c.column_name ILIKE '%social%' THEN 0.98
              WHEN c.column_name ILIKE '%credit%' OR c.column_name ILIKE '%card%' THEN 0.95
              WHEN c.column_name ILIKE '%password%' THEN 0.99
              ELSE 0.75
            END::NUMERIC as confidence_score
          FROM information_schema.columns c
          INNER JOIN information_schema.tables t
            ON c.table_schema = t.table_schema 
            AND c.table_name = t.table_name
          WHERE c.table_schema NOT IN ('pg_catalog', 'information_schema', 'pg_toast', 'pg_temp_1', 'pg_toast_temp_1', 'pg_temp', 'pg_toast_temp')
            AND c.table_schema NOT LIKE 'pg_temp%'
            AND c.table_schema NOT LIKE 'pg_toast%'
            AND c.table_schema != 'postgres'
            AND t.table_type = 'BASE TABLE'
            AND c.table_name NOT LIKE '%_masked_%'
            AND c.table_name NOT LIKE '%_smart_%'
      `;
      
      const params = [];
      if (schema_name) {
        query += ` AND c.table_schema = $1`;
        params.push(schema_name);
      }
      
      query += ` AND (
            c.column_name ILIKE '%email%' OR c.column_name ILIKE '%mail%' OR
            c.column_name ILIKE '%phone%' OR c.column_name ILIKE '%tel%' OR c.column_name ILIKE '%mobile%' OR
            c.column_name ILIKE '%ssn%' OR c.column_name ILIKE '%social%' OR c.column_name ILIKE '%security%' OR
            c.column_name ILIKE '%credit%' OR c.column_name ILIKE '%card%' OR c.column_name ILIKE '%payment%' OR
            c.column_name ILIKE '%password%' OR c.column_name ILIKE '%passwd%' OR c.column_name ILIKE '%pwd%' OR
            c.column_name ILIKE '%address%' OR c.column_name ILIKE '%street%' OR c.column_name ILIKE '%zip%' OR
            c.column_name ILIKE '%birth%' OR c.column_name ILIKE '%dob%' OR c.column_name ILIKE '%age%' OR
            (c.column_name ILIKE '%name%' AND (c.column_name ILIKE '%first%' OR c.column_name ILIKE '%last%' OR c.column_name ILIKE '%full%')) OR
            (c.column_name ILIKE '%id%' AND (c.column_name ILIKE '%national%' OR c.column_name ILIKE '%passport%' OR c.column_name ILIKE '%driver%'))
          )
        )
        SELECT 
          sc.schema_name,
          sc.table_name,
          sc.column_name,
          sc.data_type,
          sc.pii_category,
          sc.confidence_score,
          CASE WHEN mp.policy_id IS NOT NULL AND mp.active = true THEN true ELSE false END as has_active_policy
        FROM sensitive_columns sc
        LEFT JOIN metadata.masking_policies mp 
          ON sc.schema_name = mp.schema_name 
          AND sc.table_name = mp.table_name 
          AND sc.column_name = mp.column_name
          AND mp.active = true
        WHERE mp.policy_id IS NULL OR mp.active = false
        ORDER BY schema_name, table_name, column_name
      `;
      
      const result = await pool.query(query, params);
      
      res.json({
        columns: result.rows,
        total: result.rows.length,
      });
    } catch (err) {
      console.error("Error fetching unprotected columns:", err);
      const safeError = sanitizeError(
        err,
        "Error al obtener columnas sin protección",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

router.post("/batch-analyze",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const {
        database_name,
        database_names,
        schema_name,
        masking_type = 'FULL',
        auto_activate = true,
        min_confidence = 0.75,
      } = req.body;

      // Support both single database_name and array of database_names
      const databases = database_names && Array.isArray(database_names) && database_names.length > 0
        ? database_names
        : database_name
        ? [database_name]
        : null;

      if (!databases || databases.length === 0) {
        return res.status(400).json({
          error: "database_name or database_names array is required",
        });
      }

      const configData = fs.readFileSync(getConfigPath(), "utf8");
      const config = JSON.parse(configData);
      const dbConfig = config.database.postgres;

      const allResults = [];

      // Process each database
      for (const currentDatabase of databases) {
        let targetPool = pool;
        let shouldClosePool = false;

        if (currentDatabase) {
          const targetConnectionString = `postgresql://${dbConfig.user}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port}/${currentDatabase}`;
          
          targetPool = new Pool({
            connectionString: targetConnectionString,
            max: 1,
          });
          shouldClosePool = true;
        }

        try {
          await targetPool.query("SELECT 1");

          const schemasResult = schema_name
            ? { rows: [{ schema_name }] }
            : await targetPool.query(
                `SELECT DISTINCT table_schema as schema_name 
                 FROM information_schema.tables 
                 WHERE table_type = 'BASE TABLE' 
                   AND table_schema NOT IN ('pg_catalog', 'information_schema', 'pg_toast', 'postgres')
                   AND table_schema NOT LIKE 'pg_temp%'
                   AND table_schema NOT LIKE 'pg_toast%'
                 ORDER BY table_schema`
              );

          for (const schemaRow of schemasResult.rows) {
            const currentSchema = schemaRow.schema_name;

            const analyzeQuery = `
              SELECT 
                c.table_name::VARCHAR,
                c.column_name::VARCHAR,
                c.data_type::VARCHAR,
                CASE 
                  WHEN c.column_name ILIKE '%email%' OR c.column_name ILIKE '%mail%' THEN true
                  WHEN c.column_name ILIKE '%phone%' OR c.column_name ILIKE '%tel%' OR c.column_name ILIKE '%mobile%' THEN true
                  WHEN c.column_name ILIKE '%ssn%' OR c.column_name ILIKE '%social%' OR c.column_name ILIKE '%security%' THEN true
                  WHEN c.column_name ILIKE '%credit%' OR c.column_name ILIKE '%card%' OR c.column_name ILIKE '%payment%' THEN true
                  WHEN c.column_name ILIKE '%password%' OR c.column_name ILIKE '%passwd%' OR c.column_name ILIKE '%pwd%' THEN true
                  WHEN c.column_name ILIKE '%address%' OR c.column_name ILIKE '%street%' OR c.column_name ILIKE '%zip%' THEN true
                  WHEN c.column_name ILIKE '%birth%' OR c.column_name ILIKE '%dob%' OR c.column_name ILIKE '%age%' THEN true
                  WHEN c.column_name ILIKE '%name%' AND (c.column_name ILIKE '%first%' OR c.column_name ILIKE '%last%' OR c.column_name ILIKE '%full%') THEN true
                  WHEN c.column_name ILIKE '%id%' AND (c.column_name ILIKE '%national%' OR c.column_name ILIKE '%passport%' OR c.column_name ILIKE '%driver%') THEN true
                  ELSE false
                END as contains_pii,
                CASE 
                  WHEN c.column_name ILIKE '%email%' THEN 'EMAIL'
                  WHEN c.column_name ILIKE '%phone%' OR c.column_name ILIKE '%tel%' OR c.column_name ILIKE '%mobile%' THEN 'PHONE'
                  WHEN c.column_name ILIKE '%ssn%' OR c.column_name ILIKE '%social%' THEN 'SSN'
                  WHEN c.column_name ILIKE '%credit%' OR c.column_name ILIKE '%card%' THEN 'CREDIT_CARD'
                  WHEN c.column_name ILIKE '%password%' OR c.column_name ILIKE '%passwd%' THEN 'PASSWORD'
                  WHEN c.column_name ILIKE '%address%' THEN 'ADDRESS'
                  WHEN c.column_name ILIKE '%birth%' OR c.column_name ILIKE '%dob%' THEN 'DATE_OF_BIRTH'
                  WHEN c.column_name ILIKE '%name%' THEN 'NAME'
                  WHEN c.column_name ILIKE '%id%' THEN 'ID_NUMBER'
                  ELSE 'OTHER'
                END::VARCHAR as pii_category,
                CASE 
                  WHEN c.column_name ILIKE '%email%' THEN 0.95
                  WHEN c.column_name ILIKE '%phone%' OR c.column_name ILIKE '%tel%' THEN 0.90
                  WHEN c.column_name ILIKE '%ssn%' OR c.column_name ILIKE '%social%' THEN 0.98
                  WHEN c.column_name ILIKE '%credit%' OR c.column_name ILIKE '%card%' THEN 0.95
                  WHEN c.column_name ILIKE '%password%' THEN 0.99
                  ELSE 0.75
                END::NUMERIC as confidence_score
            FROM information_schema.columns c
            INNER JOIN information_schema.tables t
              ON c.table_schema = t.table_schema 
              AND c.table_name = t.table_name
            WHERE c.table_schema = $1
              AND t.table_type = 'BASE TABLE'
              AND c.table_name NOT LIKE '%_masked_%'
              AND c.table_name NOT LIKE '%_smart_%'
            ORDER BY c.table_name, c.ordinal_position
            `;

            const sensitiveColumns = await targetPool.query(analyzeQuery, [currentSchema]);

            for (const col of sensitiveColumns.rows) {
              if (col.contains_pii && col.confidence_score >= parseFloat(min_confidence)) {
                const policyName = `${currentSchema}_${col.table_name || 'unknown'}_${col.column_name}_mask`;
                
                const finalMaskingType = 
                  col.pii_category === 'EMAIL' ? 'EMAIL' :
                  col.pii_category === 'PHONE' ? 'PHONE' :
                  ['SSN', 'CREDIT_CARD', 'PASSWORD'].includes(col.pii_category) ? 'FULL' :
                  masking_type;

                try {
                  await pool.query(
                    `INSERT INTO metadata.masking_policies 
                     (policy_name, schema_name, table_name, column_name, masking_type, active)
                     VALUES ($1, $2, $3, $4, $5, $6)
                     ON CONFLICT (schema_name, table_name, column_name) DO UPDATE
                     SET masking_type = EXCLUDED.masking_type,
                         active = EXCLUDED.active,
                         updated_at = NOW()`,
                    [
                      policyName,
                      currentSchema,
                      col.table_name,
                      col.column_name,
                      finalMaskingType,
                      auto_activate,
                    ]
                  );

                  allResults.push({
                    schema_name: currentSchema,
                    table_name: col.table_name,
                    column_name: col.column_name,
                    pii_category: col.pii_category,
                    confidence_score: col.confidence_score,
                    policy_created: true,
                    policy_name: policyName,
                    message: 'Policy created successfully',
                  });
                } catch (policyErr) {
                  allResults.push({
                    schema_name: currentSchema,
                    table_name: col.table_name,
                    column_name: col.column_name,
                    pii_category: col.pii_category,
                    confidence_score: col.confidence_score,
                    policy_created: false,
                    policy_name: null,
                    message: `Error: ${policyErr.message}`,
                  });
                }
              }
            }
          }
        } finally {
          if (shouldClosePool) {
            await targetPool.end();
          }
        }
      }

      const created = allResults.filter((r) => r.policy_created).length;
      const failed = allResults.filter((r) => !r.policy_created).length;

      res.json({
        message: `Batch analysis completed: ${created} policies created, ${failed} skipped`,
        total_analyzed: allResults.length,
        policies_created: created,
        policies_skipped: failed,
        results: allResults,
      });
    } catch (err) {
      console.error("Error in batch analyze:", err);
      const safeError = sanitizeError(
        err,
        "Error al analizar y crear políticas en lote",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

router.post("/deactivate-all",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const result = await pool.query(
        "UPDATE metadata.masking_policies SET active = false, updated_at = NOW() WHERE active = true RETURNING policy_id"
      );

      res.json({
        message: `Deactivated ${result.rows.length} masking policies`,
        deactivated_count: result.rows.length,
      });
    } catch (err) {
      console.error("Error deactivating all masking policies:", err);
      const safeError = sanitizeError(
        err,
        "Error al desactivar todas las políticas de enmascaramiento",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);

router.get("/status",
  requireAuth,
  requireRole("admin", "user"),
  async (req, res) => {
    try {
      const { schema_name } = req.query;

      const result = await pool.query(
        "SELECT * FROM metadata.get_masking_status($1)",
        [schema_name || null]
      );

      // Filter out system schemas from the results
      const systemSchemas = ['pg_catalog', 'information_schema', 'pg_toast', 'postgres', 'pg_temp', 'pg_toast_temp'];
      const filteredRows = result.rows.filter(row => 
        !systemSchemas.includes(row.schema_name) && 
        !row.schema_name.startsWith('pg_temp') && 
        !row.schema_name.startsWith('pg_toast')
      );

      const totalStats = filteredRows.reduce(
        (acc, row) => ({
          total_tables: acc.total_tables + parseInt(row.total_tables, 10),
          total_columns: acc.total_columns + parseInt(row.total_columns, 10),
          sensitive_columns: acc.sensitive_columns + parseInt(row.sensitive_columns_detected, 10),
          columns_with_policies: acc.columns_with_policies + parseInt(row.columns_with_policies, 10),
          columns_without_policies: acc.columns_without_policies + parseInt(row.columns_without_policies, 10),
          active_policies: acc.active_policies + parseInt(row.active_policies, 10),
          inactive_policies: acc.inactive_policies + parseInt(row.inactive_policies, 10),
        }),
        {
          total_tables: 0,
          total_columns: 0,
          sensitive_columns: 0,
          columns_with_policies: 0,
          columns_without_policies: 0,
          active_policies: 0,
          inactive_policies: 0,
        }
      );

      const overallCoverage =
        totalStats.sensitive_columns > 0
          ? (totalStats.columns_with_policies / totalStats.sensitive_columns) * 100
          : 0;

      res.json({
        schema_details: filteredRows,
        overall_summary: {
          ...totalStats,
          coverage_percentage: Math.round(overallCoverage * 100) / 100,
          status:
            overallCoverage >= 90
              ? "EXCELLENT"
              : overallCoverage >= 70
              ? "GOOD"
              : overallCoverage >= 50
              ? "FAIR"
              : overallCoverage > 0
              ? "POOR"
              : "NONE",
        },
      });
    } catch (err) {
      console.error("Error fetching masking status:", err);
      const safeError = sanitizeError(
        err,
        "Error al obtener estado de enmascaramiento",
        process.env.NODE_ENV === "production"
      );
      res.status(500).json({ error: safeError });
    }
  }
);



export default router;
