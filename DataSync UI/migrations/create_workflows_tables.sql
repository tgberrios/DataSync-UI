CREATE SCHEMA IF NOT EXISTS metadata;

CREATE TABLE IF NOT EXISTS metadata.workflows (
    id SERIAL PRIMARY KEY,
    workflow_name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    schedule_cron VARCHAR(100),
    active BOOLEAN DEFAULT true,
    enabled BOOLEAN DEFAULT true,
    retry_policy JSONB DEFAULT '{"max_retries": 3, "retry_delay_seconds": 60, "retry_backoff_multiplier": 2}'::jsonb,
    sla_config JSONB DEFAULT '{"max_execution_time_seconds": 3600, "alert_on_sla_breach": true}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_execution_time TIMESTAMP,
    last_execution_status VARCHAR(50)
);

COMMENT ON TABLE metadata.workflows IS 'Stores workflow definitions (DAGs) with scheduling and SLA configuration.';

CREATE TABLE IF NOT EXISTS metadata.workflow_tasks (
    id SERIAL PRIMARY KEY,
    workflow_name VARCHAR(255) NOT NULL REFERENCES metadata.workflows(workflow_name) ON DELETE CASCADE,
    task_name VARCHAR(255) NOT NULL,
    task_type VARCHAR(50) NOT NULL CHECK (task_type IN ('CUSTOM_JOB', 'DATA_WAREHOUSE', 'DATA_VAULT', 'SYNC', 'API_CALL', 'SCRIPT')),
    task_reference VARCHAR(255) NOT NULL,
    description TEXT,
    task_config JSONB DEFAULT '{}'::jsonb,
    retry_policy JSONB DEFAULT '{"max_retries": 3, "retry_delay_seconds": 60}'::jsonb,
    position_x INTEGER DEFAULT 0,
    position_y INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT uq_workflow_task UNIQUE (workflow_name, task_name)
);

COMMENT ON TABLE metadata.workflow_tasks IS 'Stores individual tasks within workflows. Tasks can reference Custom Jobs, Data Warehouses, Data Vaults, etc.';

CREATE TABLE IF NOT EXISTS metadata.workflow_dependencies (
    id SERIAL PRIMARY KEY,
    workflow_name VARCHAR(255) NOT NULL REFERENCES metadata.workflows(workflow_name) ON DELETE CASCADE,
    upstream_task_name VARCHAR(255) NOT NULL,
    downstream_task_name VARCHAR(255) NOT NULL,
    dependency_type VARCHAR(50) DEFAULT 'SUCCESS' CHECK (dependency_type IN ('SUCCESS', 'COMPLETION', 'SKIP_ON_FAILURE')),
    condition_expression TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT uq_workflow_dependency UNIQUE (workflow_name, upstream_task_name, downstream_task_name),
    CONSTRAINT chk_different_tasks CHECK (upstream_task_name != downstream_task_name),
    FOREIGN KEY (workflow_name, upstream_task_name) REFERENCES metadata.workflow_tasks(workflow_name, task_name) ON DELETE CASCADE,
    FOREIGN KEY (workflow_name, downstream_task_name) REFERENCES metadata.workflow_tasks(workflow_name, task_name) ON DELETE CASCADE
);

COMMENT ON TABLE metadata.workflow_dependencies IS 'Defines dependencies between tasks in a workflow (DAG edges).';

CREATE TABLE IF NOT EXISTS metadata.workflow_executions (
    id BIGSERIAL PRIMARY KEY,
    workflow_name VARCHAR(255) NOT NULL REFERENCES metadata.workflows(workflow_name) ON DELETE CASCADE,
    execution_id VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'CANCELLED', 'SKIPPED')),
    trigger_type VARCHAR(50) DEFAULT 'SCHEDULED' CHECK (trigger_type IN ('SCHEDULED', 'MANUAL', 'API', 'EVENT')),
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    duration_seconds INTEGER,
    total_tasks INTEGER DEFAULT 0,
    completed_tasks INTEGER DEFAULT 0,
    failed_tasks INTEGER DEFAULT 0,
    skipped_tasks INTEGER DEFAULT 0,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT chk_execution_times CHECK (end_time IS NULL OR end_time >= start_time)
);

COMMENT ON TABLE metadata.workflow_executions IS 'Tracks workflow execution instances with status and timing information.';

CREATE TABLE IF NOT EXISTS metadata.workflow_task_executions (
    id BIGSERIAL PRIMARY KEY,
    workflow_execution_id BIGINT NOT NULL REFERENCES metadata.workflow_executions(id) ON DELETE CASCADE,
    workflow_name VARCHAR(255) NOT NULL,
    task_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'CANCELLED', 'SKIPPED', 'RETRYING')),
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    duration_seconds INTEGER,
    retry_count INTEGER DEFAULT 0,
    error_message TEXT,
    task_output JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (workflow_name, task_name) REFERENCES metadata.workflow_tasks(workflow_name, task_name) ON DELETE CASCADE
);

COMMENT ON TABLE metadata.workflow_task_executions IS 'Tracks individual task executions within workflow runs.';

CREATE INDEX IF NOT EXISTS idx_workflows_active ON metadata.workflows(active);
CREATE INDEX IF NOT EXISTS idx_workflows_enabled ON metadata.workflows(enabled);
CREATE INDEX IF NOT EXISTS idx_workflows_schedule ON metadata.workflows(schedule_cron) WHERE schedule_cron IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_workflow ON metadata.workflow_tasks(workflow_name);
CREATE INDEX IF NOT EXISTS idx_workflow_dependencies_workflow ON metadata.workflow_dependencies(workflow_name);
CREATE INDEX IF NOT EXISTS idx_workflow_dependencies_upstream ON metadata.workflow_dependencies(upstream_task_name);
CREATE INDEX IF NOT EXISTS idx_workflow_dependencies_downstream ON metadata.workflow_dependencies(downstream_task_name);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow ON metadata.workflow_executions(workflow_name);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON metadata.workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_start_time ON metadata.workflow_executions(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_task_executions_execution ON metadata.workflow_task_executions(workflow_execution_id);
CREATE INDEX IF NOT EXISTS idx_workflow_task_executions_task ON metadata.workflow_task_executions(workflow_name, task_name);
CREATE INDEX IF NOT EXISTS idx_workflow_task_executions_status ON metadata.workflow_task_executions(status);
