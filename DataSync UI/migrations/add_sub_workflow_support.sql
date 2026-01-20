ALTER TABLE metadata.workflow_tasks 
DROP CONSTRAINT IF EXISTS workflow_tasks_task_type_check;

ALTER TABLE metadata.workflow_tasks
ADD CONSTRAINT workflow_tasks_task_type_check 
CHECK (task_type IN ('CUSTOM_JOB', 'DATA_WAREHOUSE', 'DATA_VAULT', 'SYNC', 'API_CALL', 'SCRIPT', 'SUB_WORKFLOW'));

COMMENT ON COLUMN metadata.workflow_tasks.task_type IS 'Type of task: CUSTOM_JOB, DATA_WAREHOUSE, DATA_VAULT, SYNC, API_CALL, SCRIPT, or SUB_WORKFLOW';
