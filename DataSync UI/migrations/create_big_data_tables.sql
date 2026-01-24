CREATE SCHEMA IF NOT EXISTS metadata;

-- Spark Configuration
CREATE TABLE IF NOT EXISTS metadata.spark_config (
  id SERIAL PRIMARY KEY,
  master_url VARCHAR(500) NOT NULL DEFAULT 'local[*]',
  app_name VARCHAR(255) NOT NULL DEFAULT 'DataSync',
  spark_home VARCHAR(500),
  connect_url VARCHAR(500),
  executor_memory_mb INTEGER DEFAULT 2048,
  executor_cores INTEGER DEFAULT 2,
  max_retries INTEGER DEFAULT 3,
  retry_delay_seconds INTEGER DEFAULT 5,
  spark_conf JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_spark_config UNIQUE (id)
);

-- Distributed Processing Configuration
CREATE TABLE IF NOT EXISTS metadata.distributed_processing_config (
  id SERIAL PRIMARY KEY,
  force_mode VARCHAR(20) DEFAULT 'AUTO' CHECK (force_mode IN ('AUTO', 'LOCAL_ONLY', 'DISTRIBUTED_ONLY')),
  distributed_threshold_rows BIGINT DEFAULT 1000000,
  distributed_threshold_size_mb INTEGER DEFAULT 1000,
  broadcast_join_threshold_mb INTEGER DEFAULT 10,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_distributed_config UNIQUE (id)
);

-- Partitioning Configuration (global or per table)
CREATE TABLE IF NOT EXISTS metadata.partitioning_config (
  id SERIAL PRIMARY KEY,
  table_id VARCHAR(500), -- NULL for global config, format: schema.table
  enabled BOOLEAN DEFAULT true,
  auto_detect BOOLEAN DEFAULT true,
  partition_types TEXT[] DEFAULT ARRAY[]::TEXT[],
  date_column_pattern VARCHAR(500),
  region_column_pattern VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_partitioning_config UNIQUE (table_id)
);

-- Merge Strategies Configuration (global or per table)
CREATE TABLE IF NOT EXISTS metadata.merge_strategies_config (
  id SERIAL PRIMARY KEY,
  table_id VARCHAR(500), -- NULL for global config, format: schema.table
  default_strategy VARCHAR(50) DEFAULT 'UPSERT' CHECK (default_strategy IN ('UPSERT', 'SCD_TYPE_4', 'SCD_TYPE_6', 'INCREMENTAL')),
  use_distributed BOOLEAN DEFAULT false,
  enable_history_table BOOLEAN DEFAULT false,
  enable_hybrid BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_merge_strategies_config UNIQUE (table_id)
);

-- Distributed Jobs
CREATE TABLE IF NOT EXISTS metadata.distributed_jobs (
  id SERIAL PRIMARY KEY,
  job_id VARCHAR(255) UNIQUE NOT NULL,
  job_type VARCHAR(50) NOT NULL,
  execution_mode VARCHAR(20) NOT NULL CHECK (execution_mode IN ('LOCAL', 'DISTRIBUTED')),
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED')),
  sql_query TEXT,
  transformation_config JSONB,
  input_path VARCHAR(1000),
  output_path VARCHAR(1000),
  input_formats TEXT[],
  output_format VARCHAR(50),
  rows_processed BIGINT DEFAULT 0,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Distributed Job Logs
CREATE TABLE IF NOT EXISTS metadata.distributed_job_logs (
  id SERIAL PRIMARY KEY,
  job_id VARCHAR(255) NOT NULL REFERENCES metadata.distributed_jobs(job_id) ON DELETE CASCADE,
  log_level VARCHAR(20) NOT NULL CHECK (log_level IN ('DEBUG', 'INFO', 'WARN', 'ERROR')),
  message TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Distributed Job Metrics
CREATE TABLE IF NOT EXISTS metadata.distributed_job_metrics (
  id SERIAL PRIMARY KEY,
  job_id VARCHAR(255) NOT NULL REFERENCES metadata.distributed_jobs(job_id) ON DELETE CASCADE,
  metric_name VARCHAR(255) NOT NULL,
  metric_value NUMERIC,
  metric_unit VARCHAR(50),
  timestamp TIMESTAMP DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_spark_config_updated ON metadata.spark_config(updated_at);
CREATE INDEX IF NOT EXISTS idx_distributed_config_updated ON metadata.distributed_processing_config(updated_at);
CREATE INDEX IF NOT EXISTS idx_partitioning_config_table ON metadata.partitioning_config(table_id);
CREATE INDEX IF NOT EXISTS idx_partitioning_config_updated ON metadata.partitioning_config(updated_at);
CREATE INDEX IF NOT EXISTS idx_merge_strategies_config_table ON metadata.merge_strategies_config(table_id);
CREATE INDEX IF NOT EXISTS idx_merge_strategies_config_updated ON metadata.merge_strategies_config(updated_at);
CREATE INDEX IF NOT EXISTS idx_distributed_jobs_job_id ON metadata.distributed_jobs(job_id);
CREATE INDEX IF NOT EXISTS idx_distributed_jobs_status ON metadata.distributed_jobs(status);
CREATE INDEX IF NOT EXISTS idx_distributed_jobs_created ON metadata.distributed_jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_distributed_job_logs_job_id ON metadata.distributed_job_logs(job_id);
CREATE INDEX IF NOT EXISTS idx_distributed_job_logs_timestamp ON metadata.distributed_job_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_distributed_job_metrics_job_id ON metadata.distributed_job_metrics(job_id);
CREATE INDEX IF NOT EXISTS idx_distributed_job_metrics_timestamp ON metadata.distributed_job_metrics(timestamp);

-- Comments
COMMENT ON TABLE metadata.spark_config IS 'Stores Spark configuration for distributed processing';
COMMENT ON TABLE metadata.distributed_processing_config IS 'Stores distributed processing configuration (force mode, thresholds)';
COMMENT ON TABLE metadata.partitioning_config IS 'Stores partitioning configuration (global or per table)';
COMMENT ON TABLE metadata.merge_strategies_config IS 'Stores merge strategies configuration (global or per table)';
COMMENT ON TABLE metadata.distributed_jobs IS 'Stores distributed job execution records';
COMMENT ON TABLE metadata.distributed_job_logs IS 'Stores logs for distributed jobs';
COMMENT ON TABLE metadata.distributed_job_metrics IS 'Stores metrics for distributed jobs';
