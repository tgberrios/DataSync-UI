ALTER TABLE metadata.schema_migrations
ADD COLUMN IF NOT EXISTS environment_connections JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN metadata.schema_migrations.environment_connections IS 'JSONB object storing connection strings per environment: {"dev": "...", "staging": "...", "qa": "...", "production": "..."}';
