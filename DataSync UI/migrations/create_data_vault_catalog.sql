CREATE SCHEMA IF NOT EXISTS metadata;

CREATE TABLE IF NOT EXISTS metadata.data_vault_catalog (
  id SERIAL PRIMARY KEY,
  vault_name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  source_db_engine VARCHAR(50) NOT NULL,
  source_connection_string TEXT NOT NULL,
  target_db_engine VARCHAR(50) NOT NULL,
  target_connection_string TEXT NOT NULL,
  target_schema VARCHAR(100) NOT NULL,
  hubs JSONB NOT NULL DEFAULT '[]',
  links JSONB NOT NULL DEFAULT '[]',
  satellites JSONB NOT NULL DEFAULT '[]',
  point_in_time_tables JSONB NOT NULL DEFAULT '[]',
  bridge_tables JSONB NOT NULL DEFAULT '[]',
  schedule_cron VARCHAR(100),
  active BOOLEAN DEFAULT true,
  enabled BOOLEAN DEFAULT true,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_build_time TIMESTAMP,
  last_build_status VARCHAR(50),
  CONSTRAINT chk_target_engine CHECK (target_db_engine IN ('PostgreSQL', 'Snowflake', 'BigQuery', 'Redshift'))
);

CREATE INDEX IF NOT EXISTS idx_data_vault_active ON metadata.data_vault_catalog(active);
CREATE INDEX IF NOT EXISTS idx_data_vault_enabled ON metadata.data_vault_catalog(enabled);
CREATE INDEX IF NOT EXISTS idx_data_vault_status ON metadata.data_vault_catalog(last_build_status);
CREATE INDEX IF NOT EXISTS idx_data_vault_name ON metadata.data_vault_catalog(vault_name);
CREATE INDEX IF NOT EXISTS idx_data_vault_target_schema ON metadata.data_vault_catalog(target_schema);

COMMENT ON TABLE metadata.data_vault_catalog IS 'Stores Data Vault 2.0 model definitions including hubs, links, satellites, point-in-time and bridge tables';
COMMENT ON COLUMN metadata.data_vault_catalog.hubs IS 'JSONB array containing hub table definitions with business keys';
COMMENT ON COLUMN metadata.data_vault_catalog.links IS 'JSONB array containing link table definitions with relationships';
COMMENT ON COLUMN metadata.data_vault_catalog.satellites IS 'JSONB array containing satellite table definitions with descriptive attributes and history';
COMMENT ON COLUMN metadata.data_vault_catalog.point_in_time_tables IS 'JSONB array containing point-in-time table definitions for temporal snapshots';
COMMENT ON COLUMN metadata.data_vault_catalog.bridge_tables IS 'JSONB array containing bridge table definitions for query optimization';
