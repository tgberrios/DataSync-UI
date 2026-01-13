ALTER TABLE metadata.system_logs
ADD COLUMN IF NOT EXISTS disk_free_gb NUMERIC(10, 2);

COMMENT ON COLUMN metadata.system_logs.disk_free_gb IS 'Free disk space in GB obtained from Linux system';
