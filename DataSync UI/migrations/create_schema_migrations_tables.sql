CREATE SCHEMA IF NOT EXISTS metadata;

CREATE TABLE IF NOT EXISTS metadata.schema_migrations (
  id SERIAL PRIMARY KEY,
  migration_name VARCHAR(255) UNIQUE NOT NULL,
  version VARCHAR(50) NOT NULL,
  description TEXT,
  db_engine VARCHAR(50) NOT NULL DEFAULT 'PostgreSQL',
  forward_sql TEXT NOT NULL,
  rollback_sql TEXT,
  checksum VARCHAR(64) NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING',
  created_at TIMESTAMP DEFAULT NOW(),
  last_applied_at TIMESTAMP,
  applied_by VARCHAR(100),
  connection_string TEXT,
  CONSTRAINT chk_migration_status CHECK (status IN ('PENDING', 'APPLIED', 'FAILED', 'ROLLED_BACK')),
  CONSTRAINT chk_migration_db_engine CHECK (db_engine IN ('PostgreSQL', 'MariaDB', 'MSSQL', 'Oracle', 'MongoDB'))
);

CREATE TABLE IF NOT EXISTS metadata.schema_migration_history (
  id SERIAL PRIMARY KEY,
  migration_name VARCHAR(255) NOT NULL,
  environment VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL,
  executed_at TIMESTAMP DEFAULT NOW(),
  executed_by VARCHAR(100),
  execution_time_ms INTEGER,
  error_message TEXT,
  CONSTRAINT chk_history_status CHECK (status IN ('APPLIED', 'FAILED', 'ROLLED_BACK')),
  CONSTRAINT chk_history_environment CHECK (environment IN ('dev', 'staging', 'production')),
  FOREIGN KEY (migration_name) REFERENCES metadata.schema_migrations(migration_name) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_schema_migrations_version ON metadata.schema_migrations(version);
CREATE INDEX IF NOT EXISTS idx_schema_migrations_status ON metadata.schema_migrations(status);
CREATE INDEX IF NOT EXISTS idx_schema_migrations_db_engine ON metadata.schema_migrations(db_engine);
CREATE INDEX IF NOT EXISTS idx_schema_migrations_created_at ON metadata.schema_migrations(created_at);

CREATE INDEX IF NOT EXISTS idx_schema_migration_history_migration_name ON metadata.schema_migration_history(migration_name);
CREATE INDEX IF NOT EXISTS idx_schema_migration_history_environment ON metadata.schema_migration_history(environment);
CREATE INDEX IF NOT EXISTS idx_schema_migration_history_status ON metadata.schema_migration_history(status);
CREATE INDEX IF NOT EXISTS idx_schema_migration_history_executed_at ON metadata.schema_migration_history(executed_at);

COMMENT ON TABLE metadata.schema_migrations IS 'Stores schema migration definitions with forward and rollback SQL';
COMMENT ON TABLE metadata.schema_migration_history IS 'Tracks execution history of migrations across different environments';

COMMENT ON COLUMN metadata.schema_migrations.migration_name IS 'Unique name identifier for the migration';
COMMENT ON COLUMN metadata.schema_migrations.version IS 'Version number or tag for the migration (e.g., 1.0.0)';
COMMENT ON COLUMN metadata.schema_migrations.description IS 'Human-readable description of what the migration does';
COMMENT ON COLUMN metadata.schema_migrations.db_engine IS 'Target database engine for this migration';
COMMENT ON COLUMN metadata.schema_migrations.forward_sql IS 'SQL statements to apply the migration';
COMMENT ON COLUMN metadata.schema_migrations.rollback_sql IS 'SQL statements to rollback the migration (optional)';
COMMENT ON COLUMN metadata.schema_migrations.checksum IS 'SHA256 hash of the forward_sql for integrity checking';
COMMENT ON COLUMN metadata.schema_migrations.status IS 'Current status: PENDING, APPLIED, FAILED, or ROLLED_BACK';
COMMENT ON COLUMN metadata.schema_migrations.connection_string IS 'Optional connection string for target database (if different from default)';
COMMENT ON COLUMN metadata.schema_migrations.last_applied_at IS 'Timestamp when migration was last successfully applied';
COMMENT ON COLUMN metadata.schema_migrations.applied_by IS 'Username who applied the migration';

COMMENT ON COLUMN metadata.schema_migration_history.migration_name IS 'Reference to the migration';
COMMENT ON COLUMN metadata.schema_migration_history.environment IS 'Environment where migration was executed (dev, staging, production)';
COMMENT ON COLUMN metadata.schema_migration_history.status IS 'Result of execution: APPLIED, FAILED, or ROLLED_BACK';
COMMENT ON COLUMN metadata.schema_migration_history.executed_at IS 'Timestamp when migration was executed';
COMMENT ON COLUMN metadata.schema_migration_history.executed_by IS 'Username who executed the migration';
COMMENT ON COLUMN metadata.schema_migration_history.execution_time_ms IS 'Time taken to execute the migration in milliseconds';
COMMENT ON COLUMN metadata.schema_migration_history.error_message IS 'Error message if migration failed';

