CREATE SCHEMA IF NOT EXISTS metadata;

-- Stream Configuration
CREATE TABLE IF NOT EXISTS metadata.stream_config (
  id SERIAL PRIMARY KEY,
  stream_type VARCHAR(20) NOT NULL CHECK (stream_type IN ('KAFKA', 'RABBITMQ', 'REDIS_STREAMS')),
  topic VARCHAR(500),              -- Para Kafka
  queue VARCHAR(500),               -- Para RabbitMQ
  stream VARCHAR(500),              -- Para Redis Streams
  consumer_group VARCHAR(255),
  consumer_name VARCHAR(255),
  serialization_format VARCHAR(20) DEFAULT 'JSON' CHECK (serialization_format IN ('AVRO', 'PROTOBUF', 'JSON_SCHEMA', 'JSON')),
  schema_registry_url VARCHAR(500),
  engine_config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_stream_config UNIQUE (id)
);

-- Stream Consumers
CREATE TABLE IF NOT EXISTS metadata.stream_consumers (
  id SERIAL PRIMARY KEY,
  consumer_id VARCHAR(255) UNIQUE NOT NULL,
  stream_config_id INTEGER REFERENCES metadata.stream_config(id) ON DELETE CASCADE,
  consumer_group VARCHAR(255),
  consumer_name VARCHAR(255),
  status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'STOPPED', 'ERROR')),
  thread_id VARCHAR(255),
  started_at TIMESTAMP DEFAULT NOW(),
  stopped_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Stream Messages (opcional, para auditoría)
CREATE TABLE IF NOT EXISTS metadata.stream_messages (
  id SERIAL PRIMARY KEY,
  consumer_id VARCHAR(255) REFERENCES metadata.stream_consumers(consumer_id) ON DELETE CASCADE,
  message_id VARCHAR(255),
  message_key TEXT,
  message_value TEXT,
  headers JSONB DEFAULT '{}'::jsonb,
  timestamp BIGINT,
  source VARCHAR(500),
  processed_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Stream Windows
CREATE TABLE IF NOT EXISTS metadata.stream_windows (
  id SERIAL PRIMARY KEY,
  window_id VARCHAR(255) UNIQUE NOT NULL,
  window_type VARCHAR(20) NOT NULL CHECK (window_type IN ('TUMBLING', 'SLIDING', 'SESSION')),
  window_size_seconds INTEGER NOT NULL,
  slide_interval_seconds INTEGER,
  session_timeout_seconds INTEGER,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  event_count INTEGER DEFAULT 0,
  is_closed BOOLEAN DEFAULT false,
  aggregated_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Stream State (stateful processing)
CREATE TABLE IF NOT EXISTS metadata.stream_state (
  id SERIAL PRIMARY KEY,
  state_key VARCHAR(500) NOT NULL,
  state_value JSONB NOT NULL,
  last_updated TIMESTAMP DEFAULT NOW(),
  update_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_stream_state_key UNIQUE (state_key)
);

-- CEP Rules
CREATE TABLE IF NOT EXISTS metadata.stream_cep_rules (
  id SERIAL PRIMARY KEY,
  rule_id VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  pattern JSONB NOT NULL,
  conditions JSONB DEFAULT '{}'::jsonb,
  actions JSONB DEFAULT '{}'::jsonb,
  enabled BOOLEAN DEFAULT true,
  window_seconds INTEGER DEFAULT 300,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- CEP Matches
CREATE TABLE IF NOT EXISTS metadata.stream_cep_matches (
  id SERIAL PRIMARY KEY,
  match_id VARCHAR(255) UNIQUE NOT NULL,
  rule_id VARCHAR(255) NOT NULL REFERENCES metadata.stream_cep_rules(rule_id) ON DELETE CASCADE,
  matched_events JSONB NOT NULL,
  match_time TIMESTAMP DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Native CDC Configuration
CREATE TABLE IF NOT EXISTS metadata.native_cdc_config (
  id SERIAL PRIMARY KEY,
  db_engine VARCHAR(50) NOT NULL,
  connection_string TEXT NOT NULL,
  cdc_type VARCHAR(50) NOT NULL CHECK (cdc_type IN ('BINLOG', 'WAL', 'TRANSACTION_LOG', 'REDO_LOG', 'CHANGE_STREAMS')),
  database_name VARCHAR(255),
  table_name VARCHAR(255),
  position VARCHAR(500),            -- binlog position, LSN, SCN, resume token, etc.
  status VARCHAR(20) DEFAULT 'STOPPED' CHECK (status IN ('RUNNING', 'STOPPED', 'ERROR')),
  error_message TEXT,
  started_at TIMESTAMP,
  stopped_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_native_cdc_config UNIQUE (db_engine, database_name, table_name, cdc_type)
);

-- Native CDC Changes (opcional, para auditoría)
CREATE TABLE IF NOT EXISTS metadata.native_cdc_changes (
  id SERIAL PRIMARY KEY,
  cdc_config_id INTEGER REFERENCES metadata.native_cdc_config(id) ON DELETE CASCADE,
  operation VARCHAR(20) NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  schema_name VARCHAR(255),
  table_name VARCHAR(255),
  old_data JSONB,
  new_data JSONB,
  position VARCHAR(500),
  timestamp BIGINT,
  processed_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_stream_config_updated ON metadata.stream_config(updated_at);
CREATE INDEX IF NOT EXISTS idx_stream_consumers_consumer_id ON metadata.stream_consumers(consumer_id);
CREATE INDEX IF NOT EXISTS idx_stream_consumers_status ON metadata.stream_consumers(status);
CREATE INDEX IF NOT EXISTS idx_stream_consumers_started ON metadata.stream_consumers(started_at);
CREATE INDEX IF NOT EXISTS idx_stream_messages_consumer_id ON metadata.stream_messages(consumer_id);
CREATE INDEX IF NOT EXISTS idx_stream_messages_timestamp ON metadata.stream_messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_stream_windows_window_id ON metadata.stream_windows(window_id);
CREATE INDEX IF NOT EXISTS idx_stream_windows_closed ON metadata.stream_windows(is_closed);
CREATE INDEX IF NOT EXISTS idx_stream_state_key ON metadata.stream_state(state_key);
CREATE INDEX IF NOT EXISTS idx_stream_state_updated ON metadata.stream_state(last_updated);
CREATE INDEX IF NOT EXISTS idx_stream_cep_rules_rule_id ON metadata.stream_cep_rules(rule_id);
CREATE INDEX IF NOT EXISTS idx_stream_cep_rules_enabled ON metadata.stream_cep_rules(enabled);
CREATE INDEX IF NOT EXISTS idx_stream_cep_matches_rule_id ON metadata.stream_cep_matches(rule_id);
CREATE INDEX IF NOT EXISTS idx_stream_cep_matches_time ON metadata.stream_cep_matches(match_time);
CREATE INDEX IF NOT EXISTS idx_native_cdc_config_db_engine ON metadata.native_cdc_config(db_engine);
CREATE INDEX IF NOT EXISTS idx_native_cdc_config_status ON metadata.native_cdc_config(status);
CREATE INDEX IF NOT EXISTS idx_native_cdc_changes_config_id ON metadata.native_cdc_changes(cdc_config_id);
CREATE INDEX IF NOT EXISTS idx_native_cdc_changes_timestamp ON metadata.native_cdc_changes(timestamp);

-- Comments
COMMENT ON TABLE metadata.stream_config IS 'Stores stream processing configuration (Kafka, RabbitMQ, Redis Streams)';
COMMENT ON TABLE metadata.stream_consumers IS 'Stores active stream consumers';
COMMENT ON TABLE metadata.stream_messages IS 'Stores processed stream messages (optional, for auditing)';
COMMENT ON TABLE metadata.stream_windows IS 'Stores windowing information for stream processing';
COMMENT ON TABLE metadata.stream_state IS 'Stores stateful processing state';
COMMENT ON TABLE metadata.stream_cep_rules IS 'Stores CEP (Complex Event Processing) rules';
COMMENT ON TABLE metadata.stream_cep_matches IS 'Stores detected CEP pattern matches';
COMMENT ON TABLE metadata.native_cdc_config IS 'Stores native CDC configuration for databases';
COMMENT ON TABLE metadata.native_cdc_changes IS 'Stores captured native CDC changes (optional, for auditing)';
