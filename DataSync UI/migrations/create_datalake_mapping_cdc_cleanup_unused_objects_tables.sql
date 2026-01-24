-- Migration: Create DataLake Mapping, CDC Cleanup, and Unused Objects Tables
-- Description: Creates tables for datalake mapping, CDC cleanup policies, and unused objects detection
-- Date: 2026-01-23

BEGIN;

-- DataLake Mapping Table
CREATE TABLE IF NOT EXISTS metadata.datalake_mapping (
    mapping_id SERIAL PRIMARY KEY,
    target_schema VARCHAR(100) NOT NULL,
    target_table VARCHAR(100) NOT NULL,
    source_system VARCHAR(100) NOT NULL, -- 'mariadb', 'mssql', 'oracle', 'postgresql', 'mongodb', 'api', 'csv', 'google_sheets'
    source_connection VARCHAR(500),
    source_schema VARCHAR(100),
    source_table VARCHAR(100),
    refresh_rate_type VARCHAR(50) NOT NULL, -- 'manual', 'scheduled', 'real-time', 'on-demand'
    refresh_schedule VARCHAR(255), -- Cron expression para scheduled
    last_refresh_at TIMESTAMP,
    next_refresh_at TIMESTAMP,
    refresh_duration_avg DECIMAL(10,2), -- milliseconds
    refresh_success_count INTEGER DEFAULT 0,
    refresh_failure_count INTEGER DEFAULT 0,
    refresh_success_rate DECIMAL(5,2), -- percentage
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(target_schema, target_table)
);

COMMENT ON TABLE metadata.datalake_mapping IS 'Stores mapping of datalake tables to their source systems and refresh rates';
COMMENT ON COLUMN metadata.datalake_mapping.refresh_rate_type IS 'Type of refresh: manual, scheduled, real-time, on-demand';
COMMENT ON COLUMN metadata.datalake_mapping.refresh_schedule IS 'Cron expression for scheduled refreshes';

CREATE INDEX IF NOT EXISTS idx_datalake_mapping_source_system 
    ON metadata.datalake_mapping(source_system);
CREATE INDEX IF NOT EXISTS idx_datalake_mapping_refresh_rate_type 
    ON metadata.datalake_mapping(refresh_rate_type);
CREATE INDEX IF NOT EXISTS idx_datalake_mapping_target 
    ON metadata.datalake_mapping(target_schema, target_table);

-- CDC Cleanup Policies Table
CREATE TABLE IF NOT EXISTS metadata.cdc_cleanup_policies (
    policy_id SERIAL PRIMARY KEY,
    connection_string VARCHAR(500) NOT NULL,
    db_engine VARCHAR(50) NOT NULL,
    retention_days INTEGER NOT NULL DEFAULT 30,
    batch_size INTEGER DEFAULT 10000,
    enabled BOOLEAN DEFAULT true,
    last_cleanup_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(connection_string, db_engine)
);

COMMENT ON TABLE metadata.cdc_cleanup_policies IS 'Stores cleanup policies for CDC changelog tables';
COMMENT ON COLUMN metadata.cdc_cleanup_policies.retention_days IS 'Number of days to retain changelog entries before cleanup';
COMMENT ON COLUMN metadata.cdc_cleanup_policies.batch_size IS 'Number of rows to delete per batch during cleanup';

CREATE INDEX IF NOT EXISTS idx_cdc_cleanup_policies_db_engine 
    ON metadata.cdc_cleanup_policies(db_engine);
CREATE INDEX IF NOT EXISTS idx_cdc_cleanup_policies_enabled 
    ON metadata.cdc_cleanup_policies(enabled);

-- CDC Cleanup History Table
CREATE TABLE IF NOT EXISTS metadata.cdc_cleanup_history (
    cleanup_id SERIAL PRIMARY KEY,
    policy_id INTEGER REFERENCES metadata.cdc_cleanup_policies(policy_id) ON DELETE SET NULL,
    connection_string VARCHAR(500) NOT NULL,
    db_engine VARCHAR(50) NOT NULL,
    rows_deleted BIGINT DEFAULT 0,
    tables_cleaned INTEGER DEFAULT 0,
    space_freed_mb DECIMAL(10,2),
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'running', -- 'running', 'completed', 'failed'
    error_message TEXT
);

COMMENT ON TABLE metadata.cdc_cleanup_history IS 'Stores history of CDC cleanup operations';
COMMENT ON COLUMN metadata.cdc_cleanup_history.status IS 'Status of cleanup: running, completed, failed';

CREATE INDEX IF NOT EXISTS idx_cdc_cleanup_history_policy_id 
    ON metadata.cdc_cleanup_history(policy_id);
CREATE INDEX IF NOT EXISTS idx_cdc_cleanup_history_connection 
    ON metadata.cdc_cleanup_history(connection_string, db_engine);
CREATE INDEX IF NOT EXISTS idx_cdc_cleanup_history_started_at 
    ON metadata.cdc_cleanup_history(started_at);
CREATE INDEX IF NOT EXISTS idx_cdc_cleanup_history_status 
    ON metadata.cdc_cleanup_history(status);

-- Object Usage Tracking Table
CREATE TABLE IF NOT EXISTS metadata.object_usage_tracking (
    tracking_id SERIAL PRIMARY KEY,
    object_type VARCHAR(50) NOT NULL, -- 'table', 'view', 'materialized_view'
    schema_name VARCHAR(100) NOT NULL,
    object_name VARCHAR(100) NOT NULL,
    last_accessed_at TIMESTAMP,
    access_count BIGINT DEFAULT 0,
    last_access_type VARCHAR(20), -- 'SELECT', 'INSERT', 'UPDATE', 'DELETE'
    accessed_by_user VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(object_type, schema_name, object_name)
);

COMMENT ON TABLE metadata.object_usage_tracking IS 'Tracks access to database objects for unused object detection';
COMMENT ON COLUMN metadata.object_usage_tracking.object_type IS 'Type of object: table, view, materialized_view';
COMMENT ON COLUMN metadata.object_usage_tracking.last_access_type IS 'Type of last access: SELECT, INSERT, UPDATE, DELETE';

CREATE INDEX IF NOT EXISTS idx_object_usage_tracking_object 
    ON metadata.object_usage_tracking(object_type, schema_name, object_name);
CREATE INDEX IF NOT EXISTS idx_object_usage_tracking_last_accessed 
    ON metadata.object_usage_tracking(last_accessed_at);
CREATE INDEX IF NOT EXISTS idx_object_usage_tracking_schema_object 
    ON metadata.object_usage_tracking(schema_name, object_name);

-- Unused Objects Report Table
CREATE TABLE IF NOT EXISTS metadata.unused_objects_report (
    report_id SERIAL PRIMARY KEY,
    generated_at TIMESTAMP DEFAULT NOW(),
    days_threshold INTEGER NOT NULL,
    unused_objects JSONB NOT NULL, -- Array de objetos no usados
    recommendations JSONB DEFAULT '[]'::jsonb,
    total_unused_count INTEGER DEFAULT 0,
    generated_by VARCHAR(100)
);

COMMENT ON TABLE metadata.unused_objects_report IS 'Stores reports of unused objects detection';
COMMENT ON COLUMN metadata.unused_objects_report.unused_objects IS 'JSON array of unused objects with details';
COMMENT ON COLUMN metadata.unused_objects_report.recommendations IS 'JSON array of recommendations for each unused object';

CREATE INDEX IF NOT EXISTS idx_unused_objects_report_generated_at 
    ON metadata.unused_objects_report(generated_at);
CREATE INDEX IF NOT EXISTS idx_unused_objects_report_days_threshold 
    ON metadata.unused_objects_report(days_threshold);

COMMIT;
