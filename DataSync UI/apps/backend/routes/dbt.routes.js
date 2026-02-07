import express from "express";
import fs from "fs";
import path from "path";
import { pool } from "../services/database.service.js";
import { sanitizeError } from "../server-utils/errorHandler.js";
import { validateIdentifier } from "../server-utils/validation.js";
import { requireAuth, requireRole } from "../server-utils/auth.js";

const router = express.Router();

router.get("/models", requireAuth, requireRole("admin", "user", "viewer"), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, model_name, model_type, materialization, schema_name, database_name,
       sql_content, config, description, tags, depends_on, columns, tests, documentation,
       metadata, version, git_commit_hash, git_branch, active, created_at, updated_at,
       last_run_time, last_run_status, last_run_rows
       FROM metadata.dbt_models
       ORDER BY model_name`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error getting dbt models:", err);
    res.status(500).json({
      error: sanitizeError(err, "Error getting dbt models", process.env.NODE_ENV === "production"),
    });
  }
});

router.get("/models/:modelName", requireAuth, requireRole("admin", "user", "viewer"), async (req, res) => {
  try {
    const modelName = validateIdentifier(req.params.modelName);
    if (!modelName) {
      return res.status(400).json({ error: "Invalid model name" });
    }

    const result = await pool.query(
      `SELECT id, model_name, model_type, materialization, schema_name, database_name,
       sql_content, config, description, tags, depends_on, columns, tests, documentation,
       metadata, version, git_commit_hash, git_branch, active, created_at, updated_at,
       last_run_time, last_run_status, last_run_rows
       FROM metadata.dbt_models WHERE model_name = $1`,
      [modelName]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Model not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error getting dbt model:", err);
    res.status(500).json({
      error: sanitizeError(err, "Error getting dbt model", process.env.NODE_ENV === "production"),
    });
  }
});

router.post("/models", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const {
      model_name,
      model_type = "sql",
      materialization = "table",
      schema_name,
      database_name,
      sql_content,
      config = {},
      description,
      tags = [],
      depends_on = [],
      columns = [],
      tests = [],
      documentation,
      metadata = {},
      version = 1,
      git_commit_hash,
      git_branch,
      active = true,
    } = req.body;

    if (!model_name || !sql_content || !schema_name) {
      return res.status(400).json({ error: "model_name, sql_content, and schema_name are required" });
    }

    const result = await pool.query(
      `INSERT INTO metadata.dbt_models 
       (model_name, model_type, materialization, schema_name, database_name, sql_content,
        config, description, tags, depends_on, columns, tests, documentation, metadata,
        version, git_commit_hash, git_branch, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9::text[], $10::text[], 
               $11::jsonb, $12::jsonb, $13, $14::jsonb, $15, $16, $17, $18)
       ON CONFLICT (model_name) DO UPDATE SET
         model_type = EXCLUDED.model_type,
         materialization = EXCLUDED.materialization,
         schema_name = EXCLUDED.schema_name,
         database_name = EXCLUDED.database_name,
         sql_content = EXCLUDED.sql_content,
         config = EXCLUDED.config,
         description = EXCLUDED.description,
         tags = EXCLUDED.tags,
         depends_on = EXCLUDED.depends_on,
         columns = EXCLUDED.columns,
         tests = EXCLUDED.tests,
         documentation = EXCLUDED.documentation,
         metadata = EXCLUDED.metadata,
         version = EXCLUDED.version + 1,
         git_commit_hash = EXCLUDED.git_commit_hash,
         git_branch = EXCLUDED.git_branch,
         active = EXCLUDED.active,
         updated_at = NOW()
       RETURNING *`,
      [
        model_name, model_type, materialization, schema_name, database_name || null,
        sql_content, JSON.stringify(config), description || null, tags, depends_on,
        JSON.stringify(columns), JSON.stringify(tests), documentation || null,
        JSON.stringify(metadata), version, git_commit_hash || null, git_branch || null, active
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error creating/updating dbt model:", err);
    res.status(500).json({
      error: sanitizeError(err, "Error creating/updating dbt model", process.env.NODE_ENV === "production"),
    });
  }
});

router.delete("/models/:modelName", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const modelName = validateIdentifier(req.params.modelName);
    if (!modelName) {
      return res.status(400).json({ error: "Invalid model name" });
    }

    const result = await pool.query(
      "DELETE FROM metadata.dbt_models WHERE model_name = $1 RETURNING *",
      [modelName]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Model not found" });
    }

    res.json({ message: "Model deleted successfully", model: result.rows[0] });
  } catch (err) {
    console.error("Error deleting dbt model:", err);
    res.status(500).json({
      error: sanitizeError(err, "Error deleting dbt model", process.env.NODE_ENV === "production"),
    });
  }
});

router.post("/models/:modelName/execute", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const modelName = validateIdentifier(req.params.modelName);
    if (!modelName) {
      return res.status(400).json({ error: "Invalid model name" });
    }

    const result = await pool.query(
      "SELECT model_name, metadata FROM metadata.dbt_models WHERE model_name = $1 AND active = true",
      [modelName]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Model not found or inactive" });
    }

    const currentMetadata = result.rows[0].metadata || {};
    currentMetadata.execute_now = true;

    await pool.query(
      "UPDATE metadata.dbt_models SET metadata = $1::jsonb, updated_at = NOW() WHERE model_name = $2",
      [JSON.stringify(currentMetadata), modelName]
    );

    res.json({
      success: true,
      message: "Model execution queued. DataSync will execute it shortly.",
    });
  } catch (err) {
    console.error("Error queueing dbt model execution:", err);
    res.status(500).json({
      error: sanitizeError(err, "Error queueing dbt model execution", process.env.NODE_ENV === "production"),
    });
  }
});

router.post("/models/:modelName/tests/test-query", requireAuth, requireRole("admin", "user"), async (req, res) => {
  let testClient = null;
  try {
    const modelNameParam = req.params.modelName;
    if (!modelNameParam || typeof modelNameParam !== "string" || modelNameParam.trim().length === 0) {
      return res.status(400).json({ error: "Invalid model name" });
    }

    const { test_sql, test_type, column_name, test_config } = req.body;

    if (!test_sql) {
      return res.status(400).json({ error: "test_sql is required" });
    }

    const modelResult = await pool.query(
      `SELECT schema_name, database_name FROM metadata.dbt_models WHERE LOWER(model_name) = LOWER($1)`,
      [modelNameParam.trim()]
    );

    if (modelResult.rows.length === 0) {
      return res.status(404).json({ error: "Model not found" });
    }

    const model = modelResult.rows[0];
    const { Client } = pkg;
    
    const dbConfig = config.database?.postgres || {};
    const connectionString = model.database_name 
      ? `postgresql://${dbConfig.user || process.env.POSTGRES_USER || 'postgres'}:${dbConfig.password || process.env.POSTGRES_PASSWORD || ''}@${dbConfig.host || process.env.POSTGRES_HOST || 'localhost'}:${dbConfig.port || process.env.POSTGRES_PORT || 5432}/${model.database_name}`
      : `postgresql://${dbConfig.user || process.env.POSTGRES_USER || 'postgres'}:${dbConfig.password || process.env.POSTGRES_PASSWORD || ''}@${dbConfig.host || process.env.POSTGRES_HOST || 'localhost'}:${dbConfig.port || process.env.POSTGRES_PORT || 5432}/${dbConfig.database || process.env.POSTGRES_DATABASE || 'DataLake'}`;

    testClient = new Client({ connectionString });
    await testClient.connect();
    const testResult = await testClient.query(test_sql);
    
    let failureCount = 0;
    if (testResult.rows && testResult.rows.length > 0) {
      const firstRow = testResult.rows[0];
      const firstKey = Object.keys(firstRow)[0];
      failureCount = parseInt(firstRow[firstKey]) || 0;
    }

    await testClient.end();
    testClient = null;

    res.json({
      success: true,
      failure_count: failureCount,
      status: failureCount === 0 ? 'pass' : 'fail',
      message: failureCount === 0 
        ? 'Test passed: No failures found' 
        : `Test failed: ${failureCount} rows failed`,
      result: testResult.rows
    });
  } catch (err) {
    if (testClient) {
      try {
        await testClient.end();
      } catch (e) {
        console.error("Error closing test connection:", e);
      }
    }
    console.error("Error testing query:", err);
    if (err.message && (err.message.includes("syntax error") || err.message.includes("does not exist"))) {
      res.status(400).json({
        success: false,
        failure_count: 0,
        status: 'error',
        message: "SQL query execution failed",
        error: err.message
      });
    } else {
      res.status(500).json({
        error: sanitizeError(err, "Error testing query", process.env.NODE_ENV === "production"),
      });
    }
  }
});

router.post("/models/:modelName/tests/run", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const modelNameParam = req.params.modelName;
    if (!modelNameParam || typeof modelNameParam !== "string" || modelNameParam.trim().length === 0) {
      return res.status(400).json({ error: "Invalid model name" });
    }

    const result = await pool.query(
      "SELECT model_name, metadata FROM metadata.dbt_models WHERE LOWER(model_name) = LOWER($1) AND active = true",
      [modelNameParam.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Model not found or inactive" });
    }

    const actualModelName = result.rows[0].model_name;
    const currentMetadata = result.rows[0].metadata || {};
    currentMetadata.run_tests = true;

    await pool.query(
      "UPDATE metadata.dbt_models SET metadata = $1::jsonb, updated_at = NOW() WHERE model_name = $2",
      [JSON.stringify(currentMetadata), actualModelName]
    );

    res.json({
      success: true,
      message: "Test execution queued. DataSync will execute it shortly.",
    });
  } catch (err) {
    console.error("Error queueing dbt tests:", err);
    res.status(500).json({
      error: sanitizeError(err, "Error queueing dbt tests", process.env.NODE_ENV === "production"),
    });
  }
});

router.get("/test-results", requireAuth, requireRole("admin", "user", "viewer"), async (req, res) => {
  try {
    const modelName = req.query.model_name;
    const runId = req.query.run_id;
    let query, params;

    if (modelName && runId) {
      query = `SELECT * FROM metadata.dbt_test_results 
               WHERE LOWER(model_name) = LOWER($1) AND run_id = $2 ORDER BY created_at DESC`;
      params = [modelName, runId];
    } else if (modelName) {
      query = `SELECT * FROM metadata.dbt_test_results 
               WHERE LOWER(model_name) = LOWER($1) ORDER BY created_at DESC LIMIT 100`;
      params = [modelName];
    } else {
      query = `SELECT * FROM metadata.dbt_test_results 
               ORDER BY created_at DESC LIMIT 500`;
      params = [];
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Error getting test results:", err);
    res.status(500).json({
      error: sanitizeError(err, "Error getting test results", process.env.NODE_ENV === "production"),
    });
  }
});

router.get("/models/:modelName/test-results", requireAuth, requireRole("admin", "user", "viewer"), async (req, res) => {
  try {
    const modelNameParam = req.params.modelName;
    if (!modelNameParam || typeof modelNameParam !== "string" || modelNameParam.trim().length === 0) {
      return res.status(400).json({ error: "Invalid model name" });
    }

    const runId = req.query.run_id;
    let query, params;

    if (runId) {
      query = `SELECT * FROM metadata.dbt_test_results 
               WHERE LOWER(model_name) = LOWER($1) AND run_id = $2 ORDER BY created_at DESC`;
      params = [modelNameParam.trim(), runId];
    } else {
      query = `SELECT * FROM metadata.dbt_test_results 
               WHERE LOWER(model_name) = LOWER($1) ORDER BY created_at DESC LIMIT 100`;
      params = [modelNameParam.trim()];
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Error getting test results:", err);
    res.status(500).json({
      error: sanitizeError(err, "Error getting test results", process.env.NODE_ENV === "production"),
    });
  }
});

router.get("/models/:modelName/runs", requireAuth, requireRole("admin", "user", "viewer"), async (req, res) => {
  try {
    const modelName = validateIdentifier(req.params.modelName);
    if (!modelName) {
      return res.status(400).json({ error: "Invalid model name" });
    }

    const limit = parseInt(req.query.limit || "50", 10);
    const result = await pool.query(
      `SELECT * FROM metadata.dbt_model_runs 
       WHERE model_name = $1 ORDER BY created_at DESC LIMIT $2`,
      [modelName, limit]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error getting model runs:", err);
    res.status(500).json({
      error: sanitizeError(err, "Error getting model runs", process.env.NODE_ENV === "production"),
    });
  }
});

router.get("/macros", requireAuth, requireRole("admin", "user", "viewer"), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, macro_name, macro_sql, parameters, description, return_type,
       examples, tags, active, created_at, updated_at
       FROM metadata.dbt_macros WHERE active = true ORDER BY macro_name`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error getting dbt macros:", err);
    res.status(500).json({
      error: sanitizeError(err, "Error getting dbt macros", process.env.NODE_ENV === "production"),
    });
  }
});

router.post("/macros", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const {
      macro_name,
      macro_sql,
      parameters = [],
      description,
      return_type,
      examples,
      tags = [],
      active = true,
    } = req.body;

    if (!macro_name || !macro_sql) {
      return res.status(400).json({ error: "macro_name and macro_sql are required" });
    }

    const result = await pool.query(
      `INSERT INTO metadata.dbt_macros 
       (macro_name, macro_sql, parameters, description, return_type, examples, tags, active)
       VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7::text[], $8)
       ON CONFLICT (macro_name) DO UPDATE SET
         macro_sql = EXCLUDED.macro_sql,
         parameters = EXCLUDED.parameters,
         description = EXCLUDED.description,
         return_type = EXCLUDED.return_type,
         examples = EXCLUDED.examples,
         tags = EXCLUDED.tags,
         active = EXCLUDED.active,
         updated_at = NOW()
       RETURNING *`,
      [
        macro_name, macro_sql, JSON.stringify(parameters), description || null,
        return_type || null, examples || null, tags, active
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error creating/updating dbt macro:", err);
    res.status(500).json({
      error: sanitizeError(err, "Error creating/updating dbt macro", process.env.NODE_ENV === "production"),
    });
  }
});

router.put("/macros/:macroName", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const macroName = validateIdentifier(req.params.macroName);
    if (!macroName) {
      return res.status(400).json({ error: "Invalid macro name" });
    }

    const {
      macro_sql,
      parameters = [],
      description,
      return_type,
      examples,
      tags = [],
      active = true,
    } = req.body;

    if (!macro_sql) {
      return res.status(400).json({ error: "macro_sql is required" });
    }

    const result = await pool.query(
      `UPDATE metadata.dbt_macros SET
         macro_sql = $2,
         parameters = $3::jsonb,
         description = $4,
         return_type = $5,
         examples = $6,
         tags = $7::text[],
         active = $8,
         updated_at = NOW()
       WHERE macro_name = $1
       RETURNING *`,
      [
        macroName, macro_sql, JSON.stringify(parameters), description || null,
        return_type || null, examples || null, tags, active
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Macro not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating dbt macro:", err);
    res.status(500).json({
      error: sanitizeError(err, "Error updating dbt macro", process.env.NODE_ENV === "production"),
    });
  }
});

router.delete("/macros/:macroName", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const macroName = validateIdentifier(req.params.macroName);
    if (!macroName) {
      return res.status(400).json({ error: "Invalid macro name" });
    }

    const result = await pool.query(
      `DELETE FROM metadata.dbt_macros WHERE macro_name = $1 RETURNING *`,
      [macroName]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Macro not found" });
    }

    res.json({ message: "Macro deleted successfully", macro: result.rows[0] });
  } catch (err) {
    console.error("Error deleting dbt macro:", err);
    res.status(500).json({
      error: sanitizeError(err, "Error deleting dbt macro", process.env.NODE_ENV === "production"),
    });
  }
});

router.get("/sources", requireAuth, requireRole("admin", "user", "viewer"), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, source_name, source_type, database_name, schema_name, table_name,
       connection_string, description, columns, freshness_config, metadata, active,
       created_at, updated_at
       FROM metadata.dbt_sources WHERE active = true ORDER BY source_name, schema_name, table_name`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error getting dbt sources:", err);
    res.status(500).json({
      error: sanitizeError(err, "Error getting dbt sources", process.env.NODE_ENV === "production"),
    });
  }
});

router.post("/sources", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const {
      source_name,
      source_type,
      database_name,
      schema_name,
      table_name,
      connection_string,
      description,
      columns = [],
      freshness_config = {},
      metadata = {},
      active = true,
    } = req.body;

    if (!source_name || !source_type || !schema_name || !table_name) {
      return res.status(400).json({ error: "source_name, source_type, schema_name, and table_name are required" });
    }

    const result = await pool.query(
      `INSERT INTO metadata.dbt_sources 
       (source_name, source_type, database_name, schema_name, table_name, connection_string,
        description, columns, freshness_config, metadata, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10::jsonb, $11)
       ON CONFLICT (source_name, schema_name, table_name) DO UPDATE SET
         source_type = EXCLUDED.source_type,
         database_name = EXCLUDED.database_name,
         connection_string = EXCLUDED.connection_string,
         description = EXCLUDED.description,
         columns = EXCLUDED.columns,
         freshness_config = EXCLUDED.freshness_config,
         metadata = EXCLUDED.metadata,
         active = EXCLUDED.active,
         updated_at = NOW()
       RETURNING *`,
      [
        source_name, source_type, database_name || null, schema_name, table_name,
        connection_string || null, description || null, JSON.stringify(columns),
        JSON.stringify(freshness_config), JSON.stringify(metadata), active
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error creating/updating dbt source:", err);
    res.status(500).json({
      error: sanitizeError(err, "Error creating/updating dbt source", process.env.NODE_ENV === "production"),
    });
  }
});

router.put("/sources/:sourceName/:schemaName/:tableName", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const sourceName = validateIdentifier(req.params.sourceName);
    const schemaName = validateIdentifier(req.params.schemaName);
    const tableName = validateIdentifier(req.params.tableName);
    
    if (!sourceName || !schemaName || !tableName) {
      return res.status(400).json({ error: "Invalid source name, schema name, or table name" });
    }

    const {
      source_type,
      database_name,
      connection_string,
      description,
      columns = [],
      freshness_config = {},
      metadata = {},
      active = true,
    } = req.body;

    const result = await pool.query(
      `UPDATE metadata.dbt_sources SET
         source_type = $4,
         database_name = $5,
         connection_string = $6,
         description = $7,
         columns = $8::jsonb,
         freshness_config = $9::jsonb,
         metadata = $10::jsonb,
         active = $11,
         updated_at = NOW()
       WHERE source_name = $1 AND schema_name = $2 AND table_name = $3
       RETURNING *`,
      [
        sourceName, schemaName, tableName, source_type, database_name || null,
        connection_string || null, description || null, JSON.stringify(columns),
        JSON.stringify(freshness_config), JSON.stringify(metadata), active
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Source not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating dbt source:", err);
    res.status(500).json({
      error: sanitizeError(err, "Error updating dbt source", process.env.NODE_ENV === "production"),
    });
  }
});

router.delete("/sources/:sourceName/:schemaName/:tableName", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const sourceName = validateIdentifier(req.params.sourceName);
    const schemaName = validateIdentifier(req.params.schemaName);
    const tableName = validateIdentifier(req.params.tableName);
    
    if (!sourceName || !schemaName || !tableName) {
      return res.status(400).json({ error: "Invalid source name, schema name, or table name" });
    }

    const result = await pool.query(
      `DELETE FROM metadata.dbt_sources 
       WHERE source_name = $1 AND schema_name = $2 AND table_name = $3
       RETURNING *`,
      [sourceName, schemaName, tableName]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Source not found" });
    }

    res.json({ message: "Source deleted successfully", source: result.rows[0] });
  } catch (err) {
    console.error("Error deleting dbt source:", err);
    res.status(500).json({
      error: sanitizeError(err, "Error deleting dbt source", process.env.NODE_ENV === "production"),
    });
  }
});

router.get("/tests", requireAuth, requireRole("admin", "user", "viewer"), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, test_name, model_name, test_type, column_name, test_config, test_sql,
       description, severity, active, created_at, updated_at
       FROM metadata.dbt_tests ORDER BY model_name, test_name`
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error getting all dbt tests:", err);
    res.status(500).json({
      error: sanitizeError(err, "Error getting all dbt tests", process.env.NODE_ENV === "production"),
    });
  }
});

router.get("/models/:modelName/tests", requireAuth, requireRole("admin", "user", "viewer"), async (req, res) => {
  try {
    const modelNameParam = req.params.modelName;
    if (!modelNameParam || typeof modelNameParam !== "string" || modelNameParam.trim().length === 0) {
      return res.status(400).json({ error: "Invalid model name" });
    }

    const result = await pool.query(
      `SELECT id, test_name, model_name, test_type, column_name, test_config, test_sql,
       description, severity, active, created_at, updated_at
       FROM metadata.dbt_tests WHERE LOWER(model_name) = LOWER($1) ORDER BY test_name`,
      [modelNameParam.trim()]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error getting dbt tests:", err);
    res.status(500).json({
      error: sanitizeError(err, "Error getting dbt tests", process.env.NODE_ENV === "production"),
    });
  }
});

router.post("/models/:modelName/tests", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const modelNameParam = req.params.modelName;
    if (!modelNameParam || typeof modelNameParam !== "string" || modelNameParam.trim().length === 0) {
      return res.status(400).json({ error: "Invalid model name" });
    }

    const modelCheck = await pool.query(
      `SELECT model_name FROM metadata.dbt_models WHERE LOWER(model_name) = LOWER($1)`,
      [modelNameParam.trim()]
    );

    if (modelCheck.rows.length === 0) {
      return res.status(404).json({ error: `Model "${modelNameParam}" not found. Please save the model first before adding tests.` });
    }

    const actualModelName = modelCheck.rows[0].model_name;

    const {
      test_name,
      test_type,
      column_name,
      test_config = {},
      test_sql,
      description,
      severity = "error",
      active = true,
    } = req.body;

    if (!test_name || !test_type) {
      return res.status(400).json({ error: "test_name and test_type are required" });
    }

    const result = await pool.query(
      `INSERT INTO metadata.dbt_tests 
       (test_name, model_name, test_type, column_name, test_config, test_sql, description, severity, active)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9)
       ON CONFLICT (test_name, model_name) DO UPDATE SET
         test_type = EXCLUDED.test_type,
         column_name = EXCLUDED.column_name,
         test_config = EXCLUDED.test_config,
         test_sql = EXCLUDED.test_sql,
         description = EXCLUDED.description,
         severity = EXCLUDED.severity,
         active = EXCLUDED.active,
         updated_at = NOW()
       RETURNING *`,
      [
        test_name, actualModelName, test_type, column_name || null,
        JSON.stringify(test_config), test_sql || null, description || null,
        severity, active
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error creating/updating dbt test:", err);
    res.status(500).json({
      error: sanitizeError(err, "Error creating/updating dbt test", process.env.NODE_ENV === "production"),
    });
  }
});

router.put("/models/:modelName/tests/:testName", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const modelNameParam = req.params.modelName;
    const testName = validateIdentifier(req.params.testName);
    if (!modelNameParam || typeof modelNameParam !== "string" || modelNameParam.trim().length === 0 || !testName) {
      return res.status(400).json({ error: "Invalid model name or test name" });
    }

    const modelCheck = await pool.query(
      `SELECT model_name FROM metadata.dbt_models WHERE LOWER(model_name) = LOWER($1)`,
      [modelNameParam.trim()]
    );

    if (modelCheck.rows.length === 0) {
      return res.status(404).json({ error: "Model not found" });
    }

    const actualModelName = modelCheck.rows[0].model_name;

    const {
      test_type,
      column_name,
      test_config = {},
      test_sql,
      description,
      severity = "error",
      active = true,
    } = req.body;

    const result = await pool.query(
      `UPDATE metadata.dbt_tests SET
         test_type = $3,
         column_name = $4,
         test_config = $5::jsonb,
         test_sql = $6,
         description = $7,
         severity = $8,
         active = $9,
         updated_at = NOW()
       WHERE test_name = $1 AND model_name = $2
       RETURNING *`,
      [
        testName, actualModelName, test_type, column_name || null,
        JSON.stringify(test_config), test_sql || null, description || null,
        severity, active
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Test not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating dbt test:", err);
    res.status(500).json({
      error: sanitizeError(err, "Error updating dbt test", process.env.NODE_ENV === "production"),
    });
  }
});

router.delete("/models/:modelName/tests/:testName", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const modelNameParam = req.params.modelName;
    const testName = validateIdentifier(req.params.testName);
    if (!modelNameParam || typeof modelNameParam !== "string" || modelNameParam.trim().length === 0 || !testName) {
      return res.status(400).json({ error: "Invalid model name or test name" });
    }

    const modelCheck = await pool.query(
      `SELECT model_name FROM metadata.dbt_models WHERE LOWER(model_name) = LOWER($1)`,
      [modelNameParam.trim()]
    );

    if (modelCheck.rows.length === 0) {
      return res.status(404).json({ error: "Model not found" });
    }

    const actualModelName = modelCheck.rows[0].model_name;

    const result = await pool.query(
      `DELETE FROM metadata.dbt_tests 
       WHERE test_name = $1 AND model_name = $2
       RETURNING *`,
      [testName, actualModelName]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Test not found" });
    }

    res.json({ message: "Test deleted successfully", test: result.rows[0] });
  } catch (err) {
    console.error("Error deleting dbt test:", err);
    res.status(500).json({
      error: sanitizeError(err, "Error deleting dbt test", process.env.NODE_ENV === "production"),
    });
  }
});

router.get("/models/:modelName/compile", requireAuth, requireRole("admin", "user", "viewer"), async (req, res) => {
  try {
    const modelName = validateIdentifier(req.params.modelName);
    if (!modelName) {
      return res.status(400).json({ error: "Invalid model name" });
    }

    const { spawn } = await import("child_process");
    const DataSyncPath = path.join(process.cwd(), "..", "DataSync", "DataSync");
    
    if (!fs.existsSync(DataSyncPath)) {
      return res.status(500).json({
        error: `DataSync executable not found at: ${DataSyncPath}`,
      });
    }

    const cppProcess = spawn(DataSyncPath, ["--compile-dbt-model", modelName], {
      cwd: path.join(process.cwd(), "..", "DataSync"),
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    cppProcess.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    cppProcess.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    cppProcess.on("error", (err) => {
      console.error("Error spawning DataSync process:", err);
      if (!res.headersSent) {
        res.status(500).json({
          error: "Failed to start DataSync process",
          details: err.message,
        });
      }
    });

    cppProcess.on("close", (code) => {
      if (res.headersSent) return;
      
      if (code === 0) {
        try {
          const output = JSON.parse(stdout);
          if (output.compiled_sql) {
            res.json({ compiled_sql: output.compiled_sql });
          } else {
            res.json({ compiled_sql: stdout.trim() });
          }
        } catch (parseErr) {
          res.json({ compiled_sql: stdout.trim() });
        }
      } else {
        res.status(500).json({
          error: "Compilation failed",
          stderr: stderr || stdout,
          exitCode: code,
        });
      }
    });
  } catch (err) {
    console.error("Error compiling dbt model:", err);
    res.status(500).json({
      error: sanitizeError(err, "Error compiling dbt model", process.env.NODE_ENV === "production"),
    });
  }
});
// ============================================
// Big Data Processing API Endpoints
// ============================================

// Spark Configuration


export default router;
