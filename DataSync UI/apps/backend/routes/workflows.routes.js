import express from "express";
import { pool } from "../services/database.service.js";
import { sanitizeError } from "../server-utils/errorHandler.js";
import { validatePage, validateLimit, validateBoolean, sanitizeSearch, validateIdentifier } from "../server-utils/validation.js";
import { requireAuth, requireRole } from "../server-utils/auth.js";

const router = express.Router();

router.get("/", requireAuth, requireRole("admin", "user", "viewer"), async (req, res) => {
  try {
    const page = validatePage(req.query.page, 1);
    const limit = validateLimit(req.query.limit, 1, 100, 20);
    const offset = (page - 1) * limit;
    const active = req.query.active !== undefined ? validateBoolean(req.query.active) : undefined;
    const enabled = req.query.enabled !== undefined ? validateBoolean(req.query.enabled) : undefined;
    const search = sanitizeSearch(req.query.search, 100);

    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    if (active !== undefined) {
      whereConditions.push(`active = $${paramIndex++}`);
      queryParams.push(active);
    }

    if (enabled !== undefined) {
      whereConditions.push(`enabled = $${paramIndex++}`);
      queryParams.push(enabled);
    }

    if (search) {
      whereConditions.push(
        `(workflow_name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`
      );
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

    const totalResult = await pool.query(
      `SELECT COUNT(*) FROM metadata.workflows ${whereClause}`,
      queryParams
    );
    const total = parseInt(totalResult.rows[0].count, 10);

    const result = await pool.query(
      `SELECT * FROM metadata.workflows ${whereClause}
       ORDER BY workflow_name
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...queryParams, limit, offset]
    );

    res.json({
      total,
      page,
      limit,
      data: result.rows,
    });
  } catch (err) {
    console.error("Error fetching workflows:", err);
    res.status(500).json({
      error: sanitizeError(
        err,
        "Error fetching workflows",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});

router.get("/:workflowName", requireAuth, requireRole("admin", "user", "viewer"), async (req, res) => {
  try {
    const workflowName = validateIdentifier(req.params.workflowName);
    if (!workflowName) {
      return res.status(400).json({ error: "Invalid workflow name" });
    }

    const workflowResult = await pool.query(
      "SELECT * FROM metadata.workflows WHERE workflow_name = $1",
      [workflowName]
    );

    if (workflowResult.rows.length === 0) {
      return res.status(404).json({ error: "Workflow not found" });
    }

    const workflow = workflowResult.rows[0];

    const tasksResult = await pool.query(
      "SELECT * FROM metadata.workflow_tasks WHERE workflow_name = $1 ORDER BY task_name",
      [workflowName]
    );

    const dependenciesResult = await pool.query(
      "SELECT * FROM metadata.workflow_dependencies WHERE workflow_name = $1",
      [workflowName]
    );

    workflow.tasks = tasksResult.rows;
    workflow.dependencies = dependenciesResult.rows;

    res.json(workflow);
  } catch (err) {
    console.error("Error fetching workflow:", err);
    res.status(500).json({
      error: sanitizeError(
        err,
        "Error fetching workflow",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});

router.post("/", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const workflow_name = validateIdentifier(req.body.workflow_name);
    const description = sanitizeSearch(req.body.description, 500);
    const schedule_cron = sanitizeSearch(req.body.schedule_cron, 100);
    const active = validateBoolean(req.body.active, true);
    const enabled = validateBoolean(req.body.enabled, true);
    const retry_policy = req.body.retry_policy || {
      max_retries: 3,
      retry_delay_seconds: 60,
      retry_backoff_multiplier: 2,
    };
    const sla_config = req.body.sla_config || {
      max_execution_time_seconds: 3600,
      alert_on_sla_breach: true,
    };
    const tasks = req.body.tasks || [];
    const dependencies = req.body.dependencies || [];
    const metadata = req.body.metadata || {};

    if (!workflow_name) {
      return res.status(400).json({ error: "workflow_name is required" });
    }

    const checkResult = await pool.query(
      `SELECT workflow_name FROM metadata.workflows WHERE workflow_name = $1`,
      [workflow_name]
    );

    if (checkResult.rows.length > 0) {
      return res.status(409).json({
        error: "Workflow with this name already exists",
      });
    }

    await pool.query("BEGIN");

    try {
      const workflowResult = await pool.query(
        `INSERT INTO metadata.workflows
         (workflow_name, description, schedule_cron, active, enabled, retry_policy, sla_config, metadata)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb)
         RETURNING *`,
        [
          workflow_name,
          description || null,
          schedule_cron || null,
          active,
          enabled,
          JSON.stringify(retry_policy),
          JSON.stringify(sla_config),
          JSON.stringify(metadata),
        ]
      );

      for (const task of tasks) {
        const task_type = validateEnum(
          task.task_type,
          ["CUSTOM_JOB", "DATA_WAREHOUSE", "DATA_VAULT", "SYNC", "API_CALL", "SCRIPT"],
          null
        );
        if (!task_type) {
          throw new Error(`Invalid task_type for task: ${task.task_name}`);
        }

        await pool.query(
          `INSERT INTO metadata.workflow_tasks
           (workflow_name, task_name, task_type, task_reference, description, task_config, retry_policy, position_x, position_y, metadata)
           VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9, $10::jsonb)`,
          [
            workflow_name,
            task.task_name,
            task_type,
            task.task_reference,
            task.description || null,
            JSON.stringify(task.task_config || {}),
            JSON.stringify(task.retry_policy || { max_retries: 3, retry_delay_seconds: 60 }),
            task.position_x || 0,
            task.position_y || 0,
            JSON.stringify(task.metadata || {}),
          ]
        );
      }

      for (const dep of dependencies) {
        const dependency_type = validateEnum(
          dep.dependency_type,
          ["SUCCESS", "COMPLETION", "SKIP_ON_FAILURE"],
          "SUCCESS"
        );

        await pool.query(
          `INSERT INTO metadata.workflow_dependencies
           (workflow_name, upstream_task_name, downstream_task_name, dependency_type, condition_expression)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            workflow_name,
            dep.upstream_task_name,
            dep.downstream_task_name,
            dependency_type,
            dep.condition_expression || null,
          ]
        );
      }

      await pool.query("COMMIT");

      const finalResult = await pool.query(
        "SELECT * FROM metadata.workflows WHERE workflow_name = $1",
        [workflow_name]
      );

      const finalWorkflow = finalResult.rows[0];
      const tasksResult = await pool.query(
        "SELECT * FROM metadata.workflow_tasks WHERE workflow_name = $1",
        [workflow_name]
      );
      const depsResult = await pool.query(
        "SELECT * FROM metadata.workflow_dependencies WHERE workflow_name = $1",
        [workflow_name]
      );

      finalWorkflow.tasks = tasksResult.rows;
      finalWorkflow.dependencies = depsResult.rows;

      res.json(finalWorkflow);
    } catch (err) {
      await pool.query("ROLLBACK");
      throw err;
    }
  } catch (err) {
    console.error("Error creating workflow:", err);
    res.status(500).json({
      error: sanitizeError(
        err,
        "Error creating workflow",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});

router.put("/:workflowName", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const workflowName = validateIdentifier(req.params.workflowName);
    if (!workflowName) {
      return res.status(400).json({ error: "Invalid workflow name" });
    }

    const description = sanitizeSearch(req.body.description, 500);
    const schedule_cron = sanitizeSearch(req.body.schedule_cron, 100);
    const active = validateBoolean(req.body.active, true);
    const enabled = validateBoolean(req.body.enabled, true);
    const retry_policy = req.body.retry_policy || {
      max_retries: 3,
      retry_delay_seconds: 60,
      retry_backoff_multiplier: 2,
    };
    const sla_config = req.body.sla_config || {
      max_execution_time_seconds: 3600,
      alert_on_sla_breach: true,
    };
    const tasks = req.body.tasks || [];
    const dependencies = req.body.dependencies || [];
    const metadata = req.body.metadata || {};

    const workflowCheck = await pool.query(
      "SELECT workflow_name FROM metadata.workflows WHERE workflow_name = $1",
      [workflowName]
    );

    if (workflowCheck.rows.length === 0) {
      return res.status(404).json({ error: "Workflow not found" });
    }

    await pool.query("BEGIN");

    try {
      await pool.query(
        `UPDATE metadata.workflows
         SET description = $1, schedule_cron = $2, active = $3, enabled = $4,
             retry_policy = $5::jsonb, sla_config = $6::jsonb, metadata = $7::jsonb,
             updated_at = NOW()
         WHERE workflow_name = $8`,
        [
          description || null,
          schedule_cron || null,
          active,
          enabled,
          JSON.stringify(retry_policy),
          JSON.stringify(sla_config),
          JSON.stringify(metadata),
          workflowName,
        ]
      );

      await pool.query(
        "DELETE FROM metadata.workflow_tasks WHERE workflow_name = $1",
        [workflowName]
      );

      await pool.query(
        "DELETE FROM metadata.workflow_dependencies WHERE workflow_name = $1",
        [workflowName]
      );

      for (const task of tasks) {
        const task_type = validateEnum(
          task.task_type,
          ["CUSTOM_JOB", "DATA_WAREHOUSE", "DATA_VAULT", "SYNC", "API_CALL", "SCRIPT"],
          null
        );
        if (!task_type) {
          throw new Error(`Invalid task_type for task: ${task.task_name}`);
        }

        await pool.query(
          `INSERT INTO metadata.workflow_tasks
           (workflow_name, task_name, task_type, task_reference, description, task_config, retry_policy, position_x, position_y, metadata)
           VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9, $10::jsonb)`,
          [
            workflowName,
            task.task_name,
            task_type,
            task.task_reference,
            task.description || null,
            JSON.stringify(task.task_config || {}),
            JSON.stringify(task.retry_policy || { max_retries: 3, retry_delay_seconds: 60 }),
            task.position_x || 0,
            task.position_y || 0,
            JSON.stringify(task.metadata || {}),
          ]
        );
      }

      for (const dep of dependencies) {
        const dependency_type = validateEnum(
          dep.dependency_type,
          ["SUCCESS", "COMPLETION", "SKIP_ON_FAILURE"],
          "SUCCESS"
        );

        await pool.query(
          `INSERT INTO metadata.workflow_dependencies
           (workflow_name, upstream_task_name, downstream_task_name, dependency_type, condition_expression)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            workflowName,
            dep.upstream_task_name,
            dep.downstream_task_name,
            dependency_type,
            dep.condition_expression || null,
          ]
        );
      }

      await pool.query("COMMIT");

      const finalResult = await pool.query(
        "SELECT * FROM metadata.workflows WHERE workflow_name = $1",
        [workflowName]
      );

      const finalWorkflow = finalResult.rows[0];
      const tasksResult = await pool.query(
        "SELECT * FROM metadata.workflow_tasks WHERE workflow_name = $1",
        [workflowName]
      );
      const depsResult = await pool.query(
        "SELECT * FROM metadata.workflow_dependencies WHERE workflow_name = $1",
        [workflowName]
      );

      finalWorkflow.tasks = tasksResult.rows;
      finalWorkflow.dependencies = depsResult.rows;

      res.json(finalWorkflow);
    } catch (err) {
      await pool.query("ROLLBACK");
      throw err;
    }
  } catch (err) {
    console.error("Error updating workflow:", err);
    res.status(500).json({
      error: sanitizeError(
        err,
        "Error updating workflow",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});

router.delete("/:workflowName", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const workflowName = validateIdentifier(req.params.workflowName);
    if (!workflowName) {
      return res.status(400).json({ error: "Invalid workflow name" });
    }

    const result = await pool.query(
      "DELETE FROM metadata.workflows WHERE workflow_name = $1 RETURNING *",
      [workflowName]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Workflow not found" });
    }

    res.json({ message: "Workflow deleted successfully" });
  } catch (err) {
    console.error("Error deleting workflow:", err);
    res.status(500).json({
      error: sanitizeError(
        err,
        "Error deleting workflow",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});

router.post("/:workflowName/execute", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const workflowName = validateIdentifier(req.params.workflowName);
    if (!workflowName) {
      return res.status(400).json({ error: "Invalid workflow name" });
    }

    const workflowCheck = await pool.query(
      "SELECT workflow_name, active, enabled FROM metadata.workflows WHERE workflow_name = $1",
      [workflowName]
    );

    if (workflowCheck.rows.length === 0) {
      return res.status(404).json({
        error: "Workflow not found",
        workflow_name: workflowName,
      });
    }

    const workflow = workflowCheck.rows[0];
    if (!workflow.active || !workflow.enabled) {
      return res.status(400).json({
        error: "Workflow is not active or enabled",
        workflow_name: workflowName,
        active: workflow.active,
        enabled: workflow.enabled,
      });
    }

    const executeMetadata = {
      execute_now: true,
      execute_timestamp: new Date().toISOString(),
    };

    await pool.query(
      `UPDATE metadata.workflows 
       SET metadata = COALESCE(metadata, '{}'::jsonb) || $1::jsonb
       WHERE workflow_name = $2`,
      [JSON.stringify(executeMetadata), workflowName]
    );

    res.json({
      message: "Workflow execution queued. DataSync will execute it shortly.",
      workflow_name: workflowName,
    });
  } catch (err) {
    console.error("Error executing workflow:", err);
    res.status(500).json({
      error: sanitizeError(
        err,
        "Error executing workflow",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});

router.get("/:workflowName/executions", requireAuth, requireRole("admin", "user", "viewer"), async (req, res) => {
  try {
    const workflowName = validateIdentifier(req.params.workflowName);
    if (!workflowName) {
      return res.status(400).json({ error: "Invalid workflow name" });
    }

    const limit = validateLimit(req.query.limit, 1, 100, 50);

    const result = await pool.query(
      `SELECT * FROM metadata.workflow_executions
       WHERE workflow_name = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [workflowName, limit]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching workflow executions:", err);
    res.status(500).json({
      error: sanitizeError(
        err,
        "Error fetching workflow executions",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});

router.get("/:workflowName/executions/:executionId", requireAuth, requireRole("admin", "user", "viewer"), async (req, res) => {
  try {
    const workflowName = validateIdentifier(req.params.workflowName);
    const executionId = sanitizeSearch(req.params.executionId, 255);
    if (!workflowName || !executionId) {
      return res.status(400).json({ error: "Invalid workflow name or execution ID" });
    }

    const result = await pool.query(
      `SELECT * FROM metadata.workflow_executions
       WHERE workflow_name = $1 AND execution_id = $2`,
      [workflowName, executionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Execution not found" });
    }

    const execution = result.rows[0];

    const tasksResult = await pool.query(
      `SELECT * FROM metadata.workflow_task_executions
       WHERE workflow_execution_id = $1
       ORDER BY created_at`,
      [execution.id]
    );

    execution.tasks = tasksResult.rows;

    res.json(execution);
  } catch (err) {
    console.error("Error fetching workflow execution:", err);
    res.status(500).json({
      error: sanitizeError(
        err,
        "Error fetching workflow execution",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});

router.get("/:workflowName/executions/:executionId/tasks", requireAuth, requireRole("admin", "user", "viewer"), async (req, res) => {
  try {
    const workflowName = validateIdentifier(req.params.workflowName);
    const executionId = sanitizeSearch(req.params.executionId, 255);
    if (!workflowName || !executionId) {
      return res.status(400).json({ error: "Invalid workflow name or execution ID" });
    }

    const executionResult = await pool.query(
      `SELECT id FROM metadata.workflow_executions
       WHERE workflow_name = $1 AND execution_id = $2`,
      [workflowName, executionId]
    );

    if (executionResult.rows.length === 0) {
      return res.status(404).json({ error: "Execution not found" });
    }

    const executionIdNum = executionResult.rows[0].id;

    const result = await pool.query(
      `SELECT * FROM metadata.workflow_task_executions
       WHERE workflow_execution_id = $1
       ORDER BY created_at`,
      [executionIdNum]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching task executions:", err);
    res.status(500).json({
      error: sanitizeError(
        err,
        "Error fetching task executions",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});

router.put("/:workflowName/toggle-active", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const workflowName = validateIdentifier(req.params.workflowName);
    if (!workflowName) {
      return res.status(400).json({ error: "Invalid workflow name" });
    }

    const result = await pool.query(
      `UPDATE metadata.workflows 
       SET active = NOT active, updated_at = NOW()
       WHERE workflow_name = $1
       RETURNING *`,
      [workflowName]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Workflow not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error toggling workflow active status:", err);
    res.status(500).json({
      error: sanitizeError(
        err,
        "Error toggling workflow active status",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});

router.put("/:workflowName/toggle-enabled", requireAuth, requireRole("admin", "user"), async (req, res) => {
  try {
    const workflowName = validateIdentifier(req.params.workflowName);
    if (!workflowName) {
      return res.status(400).json({ error: "Invalid workflow name" });
    }

    const result = await pool.query(
      `UPDATE metadata.workflows 
       SET enabled = NOT enabled, updated_at = NOW()
       WHERE workflow_name = $1
       RETURNING *`,
      [workflowName]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Workflow not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error toggling workflow enabled status:", err);
    res.status(500).json({
      error: sanitizeError(
        err,
        "Error toggling workflow enabled status",
        process.env.NODE_ENV === "production"
      ),
    });
  }
});




export default router;
