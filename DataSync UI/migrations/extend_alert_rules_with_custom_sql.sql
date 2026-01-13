ALTER TABLE metadata.alert_rules
ADD COLUMN IF NOT EXISTS db_engine VARCHAR(50),
ADD COLUMN IF NOT EXISTS connection_string TEXT,
ADD COLUMN IF NOT EXISTS query_type VARCHAR(20) DEFAULT 'CUSTOM',
ADD COLUMN IF NOT EXISTS check_interval INTEGER DEFAULT 60,
ADD COLUMN IF NOT EXISTS is_system_rule BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS query_template TEXT,
ADD COLUMN IF NOT EXISTS webhook_ids INTEGER[] DEFAULT ARRAY[]::INTEGER[];

CREATE INDEX IF NOT EXISTS idx_alert_rules_db_engine ON metadata.alert_rules(db_engine);
CREATE INDEX IF NOT EXISTS idx_alert_rules_query_type ON metadata.alert_rules(query_type);
CREATE INDEX IF NOT EXISTS idx_alert_rules_system ON metadata.alert_rules(is_system_rule) WHERE is_system_rule = true;

COMMENT ON COLUMN metadata.alert_rules.db_engine IS 'Database engine: PostgreSQL, MSSQL, MariaDB, MongoDB';
COMMENT ON COLUMN metadata.alert_rules.connection_string IS 'Connection string to the target database (optional for system rules)';
COMMENT ON COLUMN metadata.alert_rules.query_type IS 'Type of alert: SYSTEM_METRIC, CUSTOM_SQL, CUSTOM';
COMMENT ON COLUMN metadata.alert_rules.check_interval IS 'Interval in seconds between checks';
COMMENT ON COLUMN metadata.alert_rules.is_system_rule IS 'If true, this is a predefined system rule that cannot be deleted';
COMMENT ON COLUMN metadata.alert_rules.query_template IS 'Template query for system rules (with placeholders)';
COMMENT ON COLUMN metadata.alert_rules.webhook_ids IS 'Array of webhook IDs to trigger when alert fires';
