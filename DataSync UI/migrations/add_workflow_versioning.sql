CREATE TABLE IF NOT EXISTS metadata.workflow_versions (
    id SERIAL PRIMARY KEY,
    workflow_name VARCHAR(255) NOT NULL REFERENCES metadata.workflows(workflow_name) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(255),
    is_current BOOLEAN DEFAULT false,
    workflow_definition JSONB NOT NULL,
    CONSTRAINT uq_workflow_version UNIQUE (workflow_name, version)
);

COMMENT ON TABLE metadata.workflow_versions IS 'Stores version history for workflows';

CREATE INDEX IF NOT EXISTS idx_workflow_versions_workflow ON metadata.workflow_versions(workflow_name);
CREATE INDEX IF NOT EXISTS idx_workflow_versions_current ON metadata.workflow_versions(workflow_name, is_current) WHERE is_current = true;
