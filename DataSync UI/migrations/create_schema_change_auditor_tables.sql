CREATE SCHEMA IF NOT EXISTS metadata;

-- Schema Change Audit Table
CREATE TABLE IF NOT EXISTS metadata.schema_change_audit (
  id SERIAL PRIMARY KEY,
  db_engine VARCHAR(50) NOT NULL,
  server_name VARCHAR(255),
  database_name VARCHAR(255),
  schema_name VARCHAR(100),
  object_name VARCHAR(255) NOT NULL,
  object_type VARCHAR(50) NOT NULL,
  change_type VARCHAR(50) NOT NULL,
  ddl_statement TEXT NOT NULL,
  executed_by VARCHAR(100),
  connection_string TEXT,
  before_state JSONB,
  after_state JSONB,
  affected_columns TEXT[],
  rollback_sql TEXT,
  is_rollback_possible BOOLEAN DEFAULT false,
  metadata_json JSONB,
  execution_timestamp TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add detected_at column if it doesn't exist (alias for execution_timestamp)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'metadata' 
    AND table_name = 'schema_change_audit' 
    AND column_name = 'detected_at'
  ) THEN
    ALTER TABLE metadata.schema_change_audit ADD COLUMN detected_at TIMESTAMP;
    UPDATE metadata.schema_change_audit SET detected_at = execution_timestamp WHERE detected_at IS NULL;
    ALTER TABLE metadata.schema_change_audit ALTER COLUMN detected_at SET DEFAULT NOW();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_schema_change_audit_engine ON metadata.schema_change_audit(db_engine);
CREATE INDEX IF NOT EXISTS idx_schema_change_audit_table ON metadata.schema_change_audit(schema_name, object_name);
CREATE INDEX IF NOT EXISTS idx_schema_change_audit_type ON metadata.schema_change_audit(change_type);
CREATE INDEX IF NOT EXISTS idx_schema_change_audit_detected ON metadata.schema_change_audit(COALESCE(detected_at, execution_timestamp) DESC);
CREATE INDEX IF NOT EXISTS idx_schema_change_audit_object_type ON metadata.schema_change_audit(object_type);

COMMENT ON TABLE metadata.schema_change_audit IS 'Stores audit trail of all schema changes (DDL)';
COMMENT ON COLUMN metadata.schema_change_audit.change_type IS 'Type: CREATE, ALTER, DROP, RENAME, TRUNCATE';
COMMENT ON COLUMN metadata.schema_change_audit.object_type IS 'Type: TABLE, VIEW, INDEX, CONSTRAINT, FUNCTION, etc.';
COMMENT ON COLUMN metadata.schema_change_audit.before_state IS 'JSON representation of object state before change';
COMMENT ON COLUMN metadata.schema_change_audit.after_state IS 'JSON representation of object state after change';

-- DDL Capture Configuration Table
CREATE TABLE IF NOT EXISTS metadata.ddl_capture_config (
  id SERIAL PRIMARY KEY,
  db_engine VARCHAR(50) NOT NULL,
  connection_string TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  capture_triggers JSONB,
  last_capture_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT uq_ddl_capture_engine_conn UNIQUE (db_engine, connection_string)
);

CREATE INDEX IF NOT EXISTS idx_ddl_capture_config_engine ON metadata.ddl_capture_config(db_engine);
CREATE INDEX IF NOT EXISTS idx_ddl_capture_config_enabled ON metadata.ddl_capture_config(enabled);

COMMENT ON TABLE metadata.ddl_capture_config IS 'Stores configuration for DDL change capture per database engine';
COMMENT ON COLUMN metadata.ddl_capture_config.capture_triggers IS 'JSONB configuration for capture triggers';

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION metadata.update_ddl_capture_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_ddl_capture_config_updated_at ON metadata.ddl_capture_config;
CREATE TRIGGER trigger_update_ddl_capture_config_updated_at
  BEFORE UPDATE ON metadata.ddl_capture_config
  FOR EACH ROW
  EXECUTE FUNCTION metadata.update_ddl_capture_updated_at();
