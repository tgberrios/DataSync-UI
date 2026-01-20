ALTER TABLE metadata.workflows 
ADD COLUMN IF NOT EXISTS rollback_config JSONB DEFAULT '{"enabled": false, "on_failure": true, "on_timeout": false, "max_rollback_depth": 10}'::jsonb;

COMMENT ON COLUMN metadata.workflows.rollback_config IS 'Configuration for automatic rollback: enabled, on_failure, on_timeout, max_rollback_depth';

ALTER TABLE metadata.workflow_executions
ADD COLUMN IF NOT EXISTS rollback_status VARCHAR(50) CHECK (rollback_status IN (NULL, 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED')),
ADD COLUMN IF NOT EXISTS rollback_started_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS rollback_completed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS rollback_error_message TEXT;

COMMENT ON COLUMN metadata.workflow_executions.rollback_status IS 'Status of rollback operation for this execution';
COMMENT ON COLUMN metadata.workflow_executions.rollback_started_at IS 'When rollback started';
COMMENT ON COLUMN metadata.workflow_executions.rollback_completed_at IS 'When rollback completed';
COMMENT ON COLUMN metadata.workflow_executions.rollback_error_message IS 'Error message if rollback failed';

CREATE TABLE IF NOT EXISTS metadata.workflow_rollback_log (
    id BIGSERIAL PRIMARY KEY,
    workflow_execution_id BIGINT NOT NULL REFERENCES metadata.workflow_executions(id) ON DELETE CASCADE,
    task_name VARCHAR(255) NOT NULL,
    rollback_action VARCHAR(100) NOT NULL,
    rollback_status VARCHAR(50) NOT NULL CHECK (rollback_status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED')),
    rollback_details JSONB DEFAULT '{}'::jsonb,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

COMMENT ON TABLE metadata.workflow_rollback_log IS 'Logs of rollback operations for individual tasks';

CREATE INDEX IF NOT EXISTS idx_workflow_rollback_log_execution ON metadata.workflow_rollback_log(workflow_execution_id);
CREATE INDEX IF NOT EXISTS idx_workflow_rollback_log_status ON metadata.workflow_rollback_log(rollback_status);
