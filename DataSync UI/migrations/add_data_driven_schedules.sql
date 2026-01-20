ALTER TABLE metadata.workflows 
ADD COLUMN IF NOT EXISTS data_driven_schedule JSONB;

COMMENT ON COLUMN metadata.workflows.data_driven_schedule IS 'Data-driven schedule configuration: query, connection_string, condition_field, condition_value, check_interval_seconds';
