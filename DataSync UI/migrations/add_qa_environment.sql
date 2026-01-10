ALTER TABLE metadata.schema_migration_history
DROP CONSTRAINT IF EXISTS chk_history_environment;

ALTER TABLE metadata.schema_migration_history
ADD CONSTRAINT chk_history_environment CHECK (environment IN ('dev', 'staging', 'qa', 'production'));

ALTER TABLE metadata.schema_migration_chain
DROP CONSTRAINT IF EXISTS chk_chain_environment;

ALTER TABLE metadata.schema_migration_chain
ADD CONSTRAINT chk_chain_environment CHECK (environment IN ('dev', 'staging', 'qa', 'production'));

COMMENT ON COLUMN metadata.schema_migration_history.environment IS 'Environment where migration was executed (dev, staging, qa, production)';
COMMENT ON COLUMN metadata.schema_migration_chain.environment IS 'Environment for the migration chain (dev, staging, qa, production)';
