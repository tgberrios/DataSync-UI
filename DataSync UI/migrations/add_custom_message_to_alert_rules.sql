ALTER TABLE metadata.alert_rules
ADD COLUMN IF NOT EXISTS custom_message TEXT;

COMMENT ON COLUMN metadata.alert_rules.custom_message IS 'Custom alert message with placeholders like {value}, {row_count}, {column_name} that will be replaced with actual query results';
