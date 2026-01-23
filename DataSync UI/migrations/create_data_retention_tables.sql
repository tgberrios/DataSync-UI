CREATE SCHEMA IF NOT EXISTS metadata;

-- Retention Jobs Table (matches C++ code which uses data_retention_jobs)
CREATE TABLE IF NOT EXISTS metadata.data_retention_jobs (
  id SERIAL PRIMARY KEY,
  schema_name VARCHAR(100) NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  job_type VARCHAR(50) NOT NULL,
  retention_policy VARCHAR(255) NOT NULL,
  scheduled_date TIMESTAMP,
  executed_at TIMESTAMP,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  rows_affected BIGINT DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_data_retention_jobs_status ON metadata.data_retention_jobs(status);
CREATE INDEX IF NOT EXISTS idx_data_retention_jobs_table ON metadata.data_retention_jobs(schema_name, table_name);
CREATE INDEX IF NOT EXISTS idx_data_retention_jobs_scheduled ON metadata.data_retention_jobs(scheduled_date);

COMMENT ON TABLE metadata.data_retention_jobs IS 'Stores scheduled and executed data retention jobs';
COMMENT ON COLUMN metadata.data_retention_jobs.job_type IS 'Type: DELETE, ARCHIVE';
COMMENT ON COLUMN metadata.data_retention_jobs.status IS 'Status: PENDING, SCHEDULED, RUNNING, COMPLETED, FAILED';

-- Legal Holds Table
CREATE TABLE IF NOT EXISTS metadata.legal_holds (
  id SERIAL PRIMARY KEY,
  schema_name VARCHAR(100) NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  reason TEXT NOT NULL,
  hold_until TIMESTAMP,
  created_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  released_at TIMESTAMP,
  released_by VARCHAR(100),
  CONSTRAINT uq_legal_hold_table UNIQUE (schema_name, table_name)
);

CREATE INDEX IF NOT EXISTS idx_legal_holds_table ON metadata.legal_holds(schema_name, table_name);
CREATE INDEX IF NOT EXISTS idx_legal_holds_active ON metadata.legal_holds(hold_until) WHERE released_at IS NULL;

COMMENT ON TABLE metadata.legal_holds IS 'Stores legal holds preventing data deletion';
COMMENT ON COLUMN metadata.legal_holds.hold_until IS 'Date until which the hold is active (NULL = indefinite)';

-- Retention Policies Table
CREATE TABLE IF NOT EXISTS metadata.retention_policies (
  schema_name VARCHAR(100) NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  retention_period VARCHAR(100) NOT NULL,
  archival_location TEXT,
  policy_type VARCHAR(50) NOT NULL DEFAULT 'TIME_BASED',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (schema_name, table_name)
);

CREATE INDEX IF NOT EXISTS idx_retention_policies_table ON metadata.retention_policies(schema_name, table_name);

COMMENT ON TABLE metadata.retention_policies IS 'Stores data retention policies per table';
COMMENT ON COLUMN metadata.retention_policies.retention_period IS 'Retention period (e.g., "90 days", "1 year")';
COMMENT ON COLUMN metadata.retention_policies.policy_type IS 'Type: TIME_BASED, EVENT_BASED, LEGAL_REQUIREMENT';

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION metadata.update_retention_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_retention_policies_updated_at
  BEFORE UPDATE ON metadata.retention_policies
  FOR EACH ROW
  EXECUTE FUNCTION metadata.update_retention_updated_at();
