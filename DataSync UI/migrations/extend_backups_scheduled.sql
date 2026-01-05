ALTER TABLE metadata.backups
ADD COLUMN IF NOT EXISTS cron_schedule VARCHAR(100),
ADD COLUMN IF NOT EXISTS is_scheduled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS next_run_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS last_run_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS run_count INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS metadata.backup_history (
  id SERIAL PRIMARY KEY,
  backup_id INTEGER NOT NULL,
  backup_name VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL,
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  duration_seconds INTEGER,
  file_path TEXT,
  file_size BIGINT,
  error_message TEXT,
  triggered_by VARCHAR(50) DEFAULT 'scheduled',
  FOREIGN KEY (backup_id) REFERENCES metadata.backups(backup_id) ON DELETE CASCADE,
  CONSTRAINT chk_backup_history_status CHECK (status IN ('pending', 'in_progress', 'completed', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_backup_history_backup_id ON metadata.backup_history(backup_id);
CREATE INDEX IF NOT EXISTS idx_backup_history_started_at ON metadata.backup_history(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_backup_history_status ON metadata.backup_history(status);
CREATE INDEX IF NOT EXISTS idx_backups_cron_schedule ON metadata.backups(cron_schedule) WHERE cron_schedule IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_backups_next_run_at ON metadata.backups(next_run_at) WHERE next_run_at IS NOT NULL;

COMMENT ON COLUMN metadata.backups.cron_schedule IS 'Cron expression for scheduled backups (format: minute hour day month dow). Example: "0 2 * * *" = daily at 2 AM';
COMMENT ON COLUMN metadata.backups.is_scheduled IS 'Whether this backup is scheduled (true) or manual (false)';
COMMENT ON COLUMN metadata.backups.next_run_at IS 'Next scheduled execution time';
COMMENT ON COLUMN metadata.backups.last_run_at IS 'Last execution time';
COMMENT ON COLUMN metadata.backups.run_count IS 'Total number of scheduled executions';
COMMENT ON TABLE metadata.backup_history IS 'History of scheduled backup executions';
COMMENT ON COLUMN metadata.backup_history.triggered_by IS 'How backup was triggered: scheduled, manual, api';

