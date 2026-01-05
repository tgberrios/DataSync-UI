CREATE SCHEMA IF NOT EXISTS metadata;

CREATE TABLE IF NOT EXISTS metadata.backups (
  backup_id SERIAL PRIMARY KEY,
  backup_name VARCHAR(255) NOT NULL,
  db_engine VARCHAR(50) NOT NULL,
  connection_string TEXT,
  database_name VARCHAR(255),
  backup_type VARCHAR(20) NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(255),
  completed_at TIMESTAMP,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_backups_db_engine ON metadata.backups(db_engine);
CREATE INDEX IF NOT EXISTS idx_backups_status ON metadata.backups(status);
CREATE INDEX IF NOT EXISTS idx_backups_created_at ON metadata.backups(created_at DESC);

COMMENT ON TABLE metadata.backups IS 'Stores backup records for all supported database engines';
COMMENT ON COLUMN metadata.backups.backup_name IS 'User-friendly name for the backup';
COMMENT ON COLUMN metadata.backups.db_engine IS 'Database engine: PostgreSQL, MariaDB, MongoDB, Oracle, MSSQL';
COMMENT ON COLUMN metadata.backups.backup_type IS 'Type of backup: structure, data, full, config';
COMMENT ON COLUMN metadata.backups.file_path IS 'Full path to the backup file on disk';
COMMENT ON COLUMN metadata.backups.file_size IS 'Size of backup file in bytes';
COMMENT ON COLUMN metadata.backups.status IS 'Backup status: pending, in_progress, completed, failed';
COMMENT ON COLUMN metadata.backups.metadata IS 'Additional backup metadata (compression, encryption, etc.)';

