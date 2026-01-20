CREATE TABLE IF NOT EXISTS metadata.workflow_event_triggers (
    id SERIAL PRIMARY KEY,
    workflow_name VARCHAR(255) NOT NULL REFERENCES metadata.workflows(workflow_name) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('FILE_ARRIVAL', 'API_CALL', 'DATABASE_CHANGE', 'SCHEDULE', 'MANUAL')),
    event_config JSONB DEFAULT '{}'::jsonb,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT uq_workflow_event_trigger UNIQUE (workflow_name, event_type)
);

COMMENT ON TABLE metadata.workflow_event_triggers IS 'Stores event-based triggers for workflows';

CREATE INDEX IF NOT EXISTS idx_workflow_event_triggers_workflow ON metadata.workflow_event_triggers(workflow_name);
CREATE INDEX IF NOT EXISTS idx_workflow_event_triggers_active ON metadata.workflow_event_triggers(active) WHERE active = true;
