CREATE SCHEMA IF NOT EXISTS metadata;

-- Table Partitions Metadata (para dynamic partitioning)
CREATE TABLE IF NOT EXISTS metadata.table_partitions (
  id SERIAL PRIMARY KEY,
  schema_name VARCHAR(255) NOT NULL,
  table_name VARCHAR(255) NOT NULL,
  partition_name VARCHAR(255) NOT NULL,
  partition_column VARCHAR(255) NOT NULL,
  partition_type VARCHAR(50) NOT NULL CHECK (partition_type IN ('DATE', 'REGION', 'RANGE', 'HASH', 'LIST')),
  partition_value VARCHAR(500),
  partition_format VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  last_modified TIMESTAMP DEFAULT NOW(),
  row_count BIGINT DEFAULT 0,
  size_bytes BIGINT DEFAULT 0,
  CONSTRAINT unique_table_partition UNIQUE (schema_name, table_name, partition_name)
);

-- Query Cache (para result caching)
CREATE TABLE IF NOT EXISTS metadata.query_cache (
  id SERIAL PRIMARY KEY,
  cache_key VARCHAR(255) UNIQUE NOT NULL,
  query_hash VARCHAR(64) NOT NULL,
  connection_string TEXT,
  db_engine VARCHAR(50),
  schema_name VARCHAR(255),
  table_name VARCHAR(255),
  query_text TEXT,
  result_data JSONB,
  result_rows BIGINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  access_count BIGINT DEFAULT 0,
  last_accessed TIMESTAMP DEFAULT NOW()
);

-- Cache Statistics
CREATE TABLE IF NOT EXISTS metadata.cache_stats (
  id SERIAL PRIMARY KEY,
  cache_type VARCHAR(50) NOT NULL CHECK (cache_type IN ('RESULT', 'METADATA', 'LOOKUP')),
  total_entries BIGINT DEFAULT 0,
  total_hits BIGINT DEFAULT 0,
  total_misses BIGINT DEFAULT 0,
  total_evictions BIGINT DEFAULT 0,
  hit_rate DECIMAL(5, 4) DEFAULT 0.0,
  current_size BIGINT DEFAULT 0,
  max_size BIGINT DEFAULT 0,
  last_updated TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_cache_type UNIQUE (cache_type)
);

-- Compression Configuration
CREATE TABLE IF NOT EXISTS metadata.compression_config (
  id SERIAL PRIMARY KEY,
  schema_name VARCHAR(255) NOT NULL,
  table_name VARCHAR(255) NOT NULL,
  compression_algorithm VARCHAR(20) DEFAULT 'GZIP' CHECK (compression_algorithm IN ('NONE', 'GZIP', 'LZ4', 'SNAPPY')),
  compress_on_transfer BOOLEAN DEFAULT true,
  compress_on_storage BOOLEAN DEFAULT false,
  min_size_bytes BIGINT DEFAULT 1048576,  -- 1MB default threshold
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_compression_config UNIQUE (schema_name, table_name)
);

-- Columnar Storage Metadata
CREATE TABLE IF NOT EXISTS metadata.columnar_storage (
  id SERIAL PRIMARY KEY,
  schema_name VARCHAR(255) NOT NULL,
  table_name VARCHAR(255) NOT NULL,
  storage_path TEXT NOT NULL,
  row_count BIGINT DEFAULT 0,
  column_count INTEGER DEFAULT 0,
  compression_algorithm VARCHAR(20),
  uncompressed_size BIGINT DEFAULT 0,
  compressed_size BIGINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  last_updated TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_columnar_storage UNIQUE (schema_name, table_name)
);

-- Partition Pruning Statistics
CREATE TABLE IF NOT EXISTS metadata.partition_pruning_stats (
  id SERIAL PRIMARY KEY,
  schema_name VARCHAR(255) NOT NULL,
  table_name VARCHAR(255) NOT NULL,
  query_hash VARCHAR(64) NOT NULL,
  total_partitions INTEGER NOT NULL,
  pruned_partitions INTEGER NOT NULL,
  partitions_used INTEGER NOT NULL,
  pruning_ratio DECIMAL(5, 4) DEFAULT 0.0,
  execution_time_ms DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Pushdown Optimization Statistics
CREATE TABLE IF NOT EXISTS metadata.pushdown_stats (
  id SERIAL PRIMARY KEY,
  db_engine VARCHAR(50) NOT NULL,
  query_hash VARCHAR(64) NOT NULL,
  filters_pushed BOOLEAN DEFAULT false,
  projections_pushed BOOLEAN DEFAULT false,
  aggregations_pushed BOOLEAN DEFAULT false,
  limit_pushed BOOLEAN DEFAULT false,
  rows_reduced BIGINT DEFAULT 0,
  execution_time_ms DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Join Optimization Statistics
CREATE TABLE IF NOT EXISTS metadata.join_optimization_stats (
  id SERIAL PRIMARY KEY,
  left_table VARCHAR(255) NOT NULL,
  right_table VARCHAR(255) NOT NULL,
  join_algorithm VARCHAR(50) NOT NULL,
  left_table_rows BIGINT,
  right_table_rows BIGINT,
  result_rows BIGINT,
  execution_time_ms DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Memory Usage Statistics
CREATE TABLE IF NOT EXISTS metadata.memory_stats (
  id SERIAL PRIMARY KEY,
  operation_type VARCHAR(50),
  current_usage_bytes BIGINT DEFAULT 0,
  peak_usage_bytes BIGINT DEFAULT 0,
  limit_bytes BIGINT,
  spill_count BIGINT DEFAULT 0,
  spill_bytes BIGINT DEFAULT 0,
  recorded_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_table_partitions_schema_table ON metadata.table_partitions(schema_name, table_name);
CREATE INDEX IF NOT EXISTS idx_table_partitions_type ON metadata.table_partitions(partition_type);
CREATE INDEX IF NOT EXISTS idx_table_partitions_modified ON metadata.table_partitions(last_modified);

CREATE INDEX IF NOT EXISTS idx_query_cache_key ON metadata.query_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_query_cache_hash ON metadata.query_cache(query_hash);
CREATE INDEX IF NOT EXISTS idx_query_cache_expires ON metadata.query_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_query_cache_table ON metadata.query_cache(schema_name, table_name);

CREATE INDEX IF NOT EXISTS idx_compression_config_table ON metadata.compression_config(schema_name, table_name);

CREATE INDEX IF NOT EXISTS idx_columnar_storage_table ON metadata.columnar_storage(schema_name, table_name);

CREATE INDEX IF NOT EXISTS idx_partition_pruning_table ON metadata.partition_pruning_stats(schema_name, table_name);
CREATE INDEX IF NOT EXISTS idx_partition_pruning_created ON metadata.partition_pruning_stats(created_at);

CREATE INDEX IF NOT EXISTS idx_pushdown_engine ON metadata.pushdown_stats(db_engine);
CREATE INDEX IF NOT EXISTS idx_pushdown_created ON metadata.pushdown_stats(created_at);

CREATE INDEX IF NOT EXISTS idx_join_optimization_created ON metadata.join_optimization_stats(created_at);

CREATE INDEX IF NOT EXISTS idx_memory_stats_recorded ON metadata.memory_stats(recorded_at);
CREATE INDEX IF NOT EXISTS idx_memory_stats_operation ON metadata.memory_stats(operation_type);

-- Comments
COMMENT ON TABLE metadata.table_partitions IS 'Metadata de particiones dinámicas para optimización';
COMMENT ON TABLE metadata.query_cache IS 'Cache de resultados de queries para optimización';
COMMENT ON TABLE metadata.cache_stats IS 'Estadísticas de cache (hit rate, etc.)';
COMMENT ON TABLE metadata.compression_config IS 'Configuración de compresión por tabla';
COMMENT ON TABLE metadata.columnar_storage IS 'Metadata de almacenamiento columnar';
COMMENT ON TABLE metadata.partition_pruning_stats IS 'Estadísticas de partition pruning';
COMMENT ON TABLE metadata.pushdown_stats IS 'Estadísticas de pushdown optimization';
COMMENT ON TABLE metadata.join_optimization_stats IS 'Estadísticas de join optimization';
COMMENT ON TABLE metadata.memory_stats IS 'Estadísticas de uso de memoria';
