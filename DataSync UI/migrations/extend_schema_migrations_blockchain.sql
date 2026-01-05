ALTER TABLE metadata.schema_migrations
ADD COLUMN IF NOT EXISTS prev_hash VARCHAR(64),
ADD COLUMN IF NOT EXISTS chain_position INTEGER,
ADD COLUMN IF NOT EXISTS is_genesis BOOLEAN DEFAULT false;

CREATE TABLE IF NOT EXISTS metadata.schema_migration_chain (
  id SERIAL PRIMARY KEY,
  migration_name VARCHAR(255) NOT NULL,
  prev_hash VARCHAR(64),
  current_hash VARCHAR(64) NOT NULL,
  chain_position INTEGER NOT NULL,
  environment VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT chk_chain_environment CHECK (environment IN ('dev', 'staging', 'production')),
  FOREIGN KEY (migration_name) REFERENCES metadata.schema_migrations(migration_name) ON DELETE CASCADE,
  UNIQUE (environment, chain_position)
);

CREATE INDEX IF NOT EXISTS idx_schema_migrations_prev_hash ON metadata.schema_migrations(prev_hash);
CREATE INDEX IF NOT EXISTS idx_schema_migrations_chain_position ON metadata.schema_migrations(chain_position);
CREATE INDEX IF NOT EXISTS idx_schema_migrations_is_genesis ON metadata.schema_migrations(is_genesis);

CREATE INDEX IF NOT EXISTS idx_schema_migration_chain_migration_name ON metadata.schema_migration_chain(migration_name);
CREATE INDEX IF NOT EXISTS idx_schema_migration_chain_environment ON metadata.schema_migration_chain(environment);
CREATE INDEX IF NOT EXISTS idx_schema_migration_chain_position ON metadata.schema_migration_chain(environment, chain_position);
CREATE INDEX IF NOT EXISTS idx_schema_migration_chain_prev_hash ON metadata.schema_migration_chain(prev_hash);

COMMENT ON COLUMN metadata.schema_migrations.prev_hash IS 'Hash of the previous migration in the chain (blockchain-like)';
COMMENT ON COLUMN metadata.schema_migrations.chain_position IS 'Position in the migration chain (0 for genesis)';
COMMENT ON COLUMN metadata.schema_migrations.is_genesis IS 'True if this is the first migration in the chain';

COMMENT ON TABLE metadata.schema_migration_chain IS 'Tracks the blockchain-like chain of migrations per environment';
COMMENT ON COLUMN metadata.schema_migration_chain.migration_name IS 'Reference to the migration';
COMMENT ON COLUMN metadata.schema_migration_chain.prev_hash IS 'Hash of the previous migration in the chain';
COMMENT ON COLUMN metadata.schema_migration_chain.current_hash IS 'Hash of this migration (forward_sql + rollback_sql)';
COMMENT ON COLUMN metadata.schema_migration_chain.chain_position IS 'Position in the chain for this environment';
COMMENT ON COLUMN metadata.schema_migration_chain.environment IS 'Environment where this chain position applies';

