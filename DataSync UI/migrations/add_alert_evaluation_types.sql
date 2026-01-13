ALTER TABLE metadata.alert_rules
ADD COLUMN IF NOT EXISTS evaluation_type VARCHAR(20) DEFAULT 'TEXT' NOT NULL,
ADD COLUMN IF NOT EXISTS threshold_low NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS threshold_warning NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS threshold_critical NUMERIC(10, 2);

CREATE INDEX IF NOT EXISTS idx_alert_rules_evaluation_type ON metadata.alert_rules(evaluation_type);

COMMENT ON COLUMN metadata.alert_rules.evaluation_type IS 'Type of evaluation: NUMERIC (compares value to thresholds) or TEXT (checks if query returns rows)';
COMMENT ON COLUMN metadata.alert_rules.threshold_low IS 'Low threshold for numeric evaluation - triggers INFO severity';
COMMENT ON COLUMN metadata.alert_rules.threshold_warning IS 'Warning threshold for numeric evaluation - triggers WARNING severity';
COMMENT ON COLUMN metadata.alert_rules.threshold_critical IS 'Critical threshold for numeric evaluation - triggers CRITICAL severity';
