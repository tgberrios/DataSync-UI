ALTER TABLE metadata.workflow_tasks 
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS condition_type VARCHAR(50) DEFAULT 'ALWAYS' CHECK (condition_type IN ('ALWAYS', 'IF', 'ELSE', 'ELSE_IF')),
ADD COLUMN IF NOT EXISTS condition_expression TEXT,
ADD COLUMN IF NOT EXISTS parent_condition_task_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS loop_type VARCHAR(50) CHECK (loop_type IN (NULL, 'FOR', 'WHILE', 'FOREACH')),
ADD COLUMN IF NOT EXISTS loop_config JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN metadata.workflow_tasks.priority IS 'Task priority (higher number = higher priority)';
COMMENT ON COLUMN metadata.workflow_tasks.condition_type IS 'Type of conditional execution: ALWAYS, IF, ELSE, ELSE_IF';
COMMENT ON COLUMN metadata.workflow_tasks.condition_expression IS 'Expression to evaluate for conditional execution (e.g., ${task1.status} == "SUCCESS")';
COMMENT ON COLUMN metadata.workflow_tasks.parent_condition_task_name IS 'Parent IF task name for ELSE/ELSE_IF tasks';
COMMENT ON COLUMN metadata.workflow_tasks.loop_type IS 'Type of loop: FOR, WHILE, FOREACH';
COMMENT ON COLUMN metadata.workflow_tasks.loop_config IS 'Loop configuration (iterations, condition, etc.)';

ALTER TABLE metadata.workflow_dependencies
ADD COLUMN IF NOT EXISTS condition_expression TEXT;

COMMENT ON COLUMN metadata.workflow_dependencies.condition_expression IS 'Condition expression for conditional dependencies';

CREATE INDEX IF NOT EXISTS idx_workflow_tasks_priority ON metadata.workflow_tasks(workflow_name, priority DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_condition ON metadata.workflow_tasks(workflow_name, condition_type, parent_condition_task_name);
