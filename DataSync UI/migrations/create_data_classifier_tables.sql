CREATE SCHEMA IF NOT EXISTS metadata;

-- Classification Rules Table
CREATE TABLE IF NOT EXISTS metadata.classification_rules (
  id SERIAL PRIMARY KEY,
  rule_name VARCHAR(255) NOT NULL UNIQUE,
  rule_type VARCHAR(50) NOT NULL,
  patterns JSONB NOT NULL,
  priority INTEGER NOT NULL DEFAULT 100,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_classification_rules_type ON metadata.classification_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_classification_rules_active ON metadata.classification_rules(active);
CREATE INDEX IF NOT EXISTS idx_classification_rules_priority ON metadata.classification_rules(priority);

COMMENT ON TABLE metadata.classification_rules IS 'Stores data classification rules';
COMMENT ON COLUMN metadata.classification_rules.rule_type IS 'Type: CATEGORY, DOMAIN, SENSITIVITY, CLASSIFICATION';
COMMENT ON COLUMN metadata.classification_rules.patterns IS 'JSONB array of pattern objects for matching';
COMMENT ON COLUMN metadata.classification_rules.priority IS 'Rule priority (lower = higher priority)';

-- Classification Results Table
CREATE TABLE IF NOT EXISTS metadata.classification_results (
  id SERIAL PRIMARY KEY,
  schema_name VARCHAR(100) NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  column_name VARCHAR(100),
  data_category VARCHAR(100),
  business_domain VARCHAR(100),
  sensitivity_level VARCHAR(50),
  data_classification VARCHAR(100),
  rule_id INTEGER,
  classified_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_classification_rule FOREIGN KEY (rule_id) 
    REFERENCES metadata.classification_rules(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_classification_results_table ON metadata.classification_results(schema_name, table_name);
CREATE INDEX IF NOT EXISTS idx_classification_results_column ON metadata.classification_results(schema_name, table_name, column_name);
CREATE INDEX IF NOT EXISTS idx_classification_results_category ON metadata.classification_results(data_category);
CREATE INDEX IF NOT EXISTS idx_classification_results_sensitivity ON metadata.classification_results(sensitivity_level);

COMMENT ON TABLE metadata.classification_results IS 'Stores classification results for tables and columns';
COMMENT ON COLUMN metadata.classification_results.sensitivity_level IS 'Level: PUBLIC, INTERNAL, CONFIDENTIAL, RESTRICTED';

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION metadata.update_classification_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_classification_rules_updated_at
  BEFORE UPDATE ON metadata.classification_rules
  FOR EACH ROW
  EXECUTE FUNCTION metadata.update_classification_updated_at();
