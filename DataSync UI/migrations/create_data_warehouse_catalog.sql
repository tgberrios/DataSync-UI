CREATE SCHEMA IF NOT EXISTS metadata;

CREATE TABLE IF NOT EXISTS metadata.data_warehouse_catalog (
  id SERIAL PRIMARY KEY,
  warehouse_name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  schema_type VARCHAR(20) NOT NULL CHECK (schema_type IN ('STAR_SCHEMA', 'SNOWFLAKE_SCHEMA')),
  source_db_engine VARCHAR(50) NOT NULL,
  source_connection_string TEXT NOT NULL,
  target_db_engine VARCHAR(50) NOT NULL,
  target_connection_string TEXT NOT NULL,
  target_schema VARCHAR(100) NOT NULL,
  dimensions JSONB NOT NULL,
  facts JSONB NOT NULL,
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

CREATE INDEX IF NOT EXISTS idx_warehouse_active ON metadata.data_warehouse_catalog(active);
CREATE INDEX IF NOT EXISTS idx_warehouse_enabled ON metadata.data_warehouse_catalog(enabled);
CREATE INDEX IF NOT EXISTS idx_warehouse_status ON metadata.data_warehouse_catalog(last_build_status);
CREATE INDEX IF NOT EXISTS idx_warehouse_name ON metadata.data_warehouse_catalog(warehouse_name);
CREATE INDEX IF NOT EXISTS idx_warehouse_target_schema ON metadata.data_warehouse_catalog(target_schema);

COMMENT ON TABLE metadata.data_warehouse_catalog IS 'Stores data warehouse model definitions including dimensions and fact tables for dimensional modeling';
COMMENT ON COLUMN metadata.data_warehouse_catalog.dimensions IS 'JSONB array containing dimension table definitions with SCD types, source queries, and configuration';
COMMENT ON COLUMN metadata.data_warehouse_catalog.facts IS 'JSONB array containing fact table definitions with source queries, measures, and dimension keys';
COMMENT ON COLUMN metadata.data_warehouse_catalog.schema_type IS 'Type of dimensional schema: STAR_SCHEMA or SNOWFLAKE_SCHEMA';
COMMENT ON COLUMN metadata.data_warehouse_catalog.last_build_status IS 'Status of last warehouse build: SUCCESS, ERROR, or IN_PROGRESS';

