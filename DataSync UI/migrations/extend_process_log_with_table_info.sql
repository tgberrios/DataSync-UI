-- Migration: Extend process_log with schema_name, table_name, and db_engine columns
-- Description: Adds direct columns for schema_name, table_name, and db_engine to improve query performance
-- Date: 2025-01-06

BEGIN;

-- Add new columns
ALTER TABLE metadata.process_log 
ADD COLUMN IF NOT EXISTS schema_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS table_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS db_engine VARCHAR(50);

-- Migrate existing data from metadata JSONB if available
UPDATE metadata.process_log
SET 
  schema_name = COALESCE(
    schema_name,
    metadata->>'schema_name',
    source_schema,
    target_schema
  ),
  table_name = COALESCE(
    table_name,
    metadata->>'table_name'
  ),
  db_engine = COALESCE(
    db_engine,
    metadata->>'db_engine'
  )
WHERE schema_name IS NULL OR table_name IS NULL OR db_engine IS NULL;

-- Extract schema_name and table_name from process_name if they follow the pattern "schema.table"
UPDATE metadata.process_log
SET 
  schema_name = COALESCE(
    schema_name,
    SPLIT_PART(process_name, '.', 1)
  ),
  table_name = COALESCE(
    table_name,
    SPLIT_PART(process_name, '.', 2)
  )
WHERE (schema_name IS NULL OR table_name IS NULL)
  AND process_name LIKE '%.%'
  AND (SELECT COUNT(*) FROM regexp_split_to_table(process_name, '\.')) = 2;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_process_log_schema_name 
ON metadata.process_log(schema_name) 
WHERE schema_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_process_log_table_name 
ON metadata.process_log(table_name) 
WHERE table_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_process_log_db_engine 
ON metadata.process_log(db_engine) 
WHERE db_engine IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_process_log_schema_table_engine 
ON metadata.process_log(schema_name, table_name, db_engine) 
WHERE schema_name IS NOT NULL AND table_name IS NOT NULL AND db_engine IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN metadata.process_log.schema_name IS 'Source schema name for the process (extracted from process_name or metadata)';
COMMENT ON COLUMN metadata.process_log.table_name IS 'Table name for the process (extracted from process_name or metadata)';
COMMENT ON COLUMN metadata.process_log.db_engine IS 'Database engine (PostgreSQL, MariaDB, MSSQL, Oracle, MongoDB)';

COMMIT;
