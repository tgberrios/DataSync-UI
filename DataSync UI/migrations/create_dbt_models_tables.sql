CREATE SCHEMA IF NOT EXISTS metadata;

CREATE TABLE IF NOT EXISTS metadata.dbt_models (
    id SERIAL PRIMARY KEY,
    model_name VARCHAR(255) UNIQUE NOT NULL,
    model_type VARCHAR(50) DEFAULT 'sql' CHECK (model_type IN ('sql', 'python', 'yaml')),
    materialization VARCHAR(50) DEFAULT 'table' CHECK (materialization IN ('table', 'view', 'incremental', 'ephemeral')),
    schema_name VARCHAR(100) NOT NULL,
    database_name VARCHAR(100),
    sql_content TEXT NOT NULL,
    config JSONB DEFAULT '{}'::jsonb,
    description TEXT,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    depends_on TEXT[] DEFAULT ARRAY[]::TEXT[],
    columns JSONB DEFAULT '[]'::jsonb,
    tests JSONB DEFAULT '[]'::jsonb,
    documentation TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    version INTEGER DEFAULT 1,
    git_commit_hash VARCHAR(40),
    git_branch VARCHAR(100),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_run_time TIMESTAMP,
    last_run_status VARCHAR(50),
    last_run_rows INTEGER
);

COMMENT ON TABLE metadata.dbt_models IS 'Stores dbt-like transformation models as code (SQL/YAML).';

CREATE TABLE IF NOT EXISTS metadata.dbt_tests (
    id SERIAL PRIMARY KEY,
    test_name VARCHAR(255) NOT NULL,
    model_name VARCHAR(255) NOT NULL REFERENCES metadata.dbt_models(model_name) ON DELETE CASCADE,
    test_type VARCHAR(50) NOT NULL CHECK (test_type IN ('not_null', 'unique', 'relationships', 'accepted_values', 'custom', 'expression')),
    column_name VARCHAR(100),
    test_config JSONB DEFAULT '{}'::jsonb,
    test_sql TEXT,
    description TEXT,
    severity VARCHAR(20) DEFAULT 'error' CHECK (severity IN ('error', 'warn')),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT uq_dbt_test UNIQUE (test_name, model_name)
);

COMMENT ON TABLE metadata.dbt_tests IS 'Stores test definitions for dbt models (data quality tests).';

CREATE TABLE IF NOT EXISTS metadata.dbt_test_results (
    id BIGSERIAL PRIMARY KEY,
    test_name VARCHAR(255) NOT NULL,
    model_name VARCHAR(255) NOT NULL,
    test_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('pass', 'fail', 'error', 'skipped')),
    error_message TEXT,
    rows_affected INTEGER,
    execution_time_seconds NUMERIC(10, 3),
    test_result JSONB DEFAULT '{}'::jsonb,
    run_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (test_name, model_name) REFERENCES metadata.dbt_tests(test_name, model_name) ON DELETE CASCADE
);

COMMENT ON TABLE metadata.dbt_test_results IS 'Stores test execution results for dbt models.';

CREATE TABLE IF NOT EXISTS metadata.dbt_documentation (
    id SERIAL PRIMARY KEY,
    model_name VARCHAR(255) NOT NULL REFERENCES metadata.dbt_models(model_name) ON DELETE CASCADE,
    doc_type VARCHAR(50) DEFAULT 'model' CHECK (doc_type IN ('model', 'column', 'macro', 'source')),
    doc_key VARCHAR(255) NOT NULL,
    doc_content TEXT NOT NULL,
    doc_format VARCHAR(20) DEFAULT 'markdown' CHECK (doc_format IN ('markdown', 'html', 'text')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT uq_dbt_doc UNIQUE (model_name, doc_type, doc_key)
);

COMMENT ON TABLE metadata.dbt_documentation IS 'Stores documentation for dbt models, columns, and macros.';

CREATE TABLE IF NOT EXISTS metadata.dbt_lineage (
    id SERIAL PRIMARY KEY,
    source_model VARCHAR(255) NOT NULL,
    target_model VARCHAR(255) NOT NULL,
    source_column VARCHAR(100),
    target_column VARCHAR(100),
    transformation_type VARCHAR(50),
    transformation_sql TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (source_model) REFERENCES metadata.dbt_models(model_name) ON DELETE CASCADE,
    FOREIGN KEY (target_model) REFERENCES metadata.dbt_models(model_name) ON DELETE CASCADE
);

COMMENT ON TABLE metadata.dbt_lineage IS 'Stores column-level lineage between dbt models.';

CREATE TABLE IF NOT EXISTS metadata.dbt_macros (
    id SERIAL PRIMARY KEY,
    macro_name VARCHAR(255) UNIQUE NOT NULL,
    macro_sql TEXT NOT NULL,
    parameters JSONB DEFAULT '[]'::jsonb,
    description TEXT,
    return_type VARCHAR(50),
    examples TEXT,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE metadata.dbt_macros IS 'Stores reusable SQL macros (functions) for dbt models.';

CREATE TABLE IF NOT EXISTS metadata.dbt_sources (
    id SERIAL PRIMARY KEY,
    source_name VARCHAR(255) NOT NULL,
    source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('table', 'view', 'query', 'api')),
    database_name VARCHAR(100),
    schema_name VARCHAR(100) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    connection_string TEXT,
    description TEXT,
    columns JSONB DEFAULT '[]'::jsonb,
    freshness_config JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT uq_dbt_source UNIQUE (source_name, schema_name, table_name)
);

COMMENT ON TABLE metadata.dbt_sources IS 'Stores source definitions for dbt models (external data sources).';

CREATE TABLE IF NOT EXISTS metadata.dbt_model_runs (
    id BIGSERIAL PRIMARY KEY,
    model_name VARCHAR(255) NOT NULL REFERENCES metadata.dbt_models(model_name) ON DELETE CASCADE,
    run_id VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'running', 'success', 'error', 'skipped')),
    materialization VARCHAR(50),
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    duration_seconds NUMERIC(10, 3),
    rows_affected INTEGER,
    error_message TEXT,
    compiled_sql TEXT,
    executed_sql TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE metadata.dbt_model_runs IS 'Stores execution history for dbt models.';

CREATE INDEX IF NOT EXISTS idx_dbt_models_active ON metadata.dbt_models(active);
CREATE INDEX IF NOT EXISTS idx_dbt_models_schema ON metadata.dbt_models(schema_name);
CREATE INDEX IF NOT EXISTS idx_dbt_models_materialization ON metadata.dbt_models(materialization);
CREATE INDEX IF NOT EXISTS idx_dbt_tests_model ON metadata.dbt_tests(model_name);
CREATE INDEX IF NOT EXISTS idx_dbt_tests_active ON metadata.dbt_tests(active);
CREATE INDEX IF NOT EXISTS idx_dbt_test_results_model ON metadata.dbt_test_results(model_name);
CREATE INDEX IF NOT EXISTS idx_dbt_test_results_run ON metadata.dbt_test_results(run_id);
CREATE INDEX IF NOT EXISTS idx_dbt_test_results_status ON metadata.dbt_test_results(status);
CREATE INDEX IF NOT EXISTS idx_dbt_documentation_model ON metadata.dbt_documentation(model_name);
CREATE INDEX IF NOT EXISTS idx_dbt_lineage_source ON metadata.dbt_lineage(source_model);
CREATE INDEX IF NOT EXISTS idx_dbt_lineage_target ON metadata.dbt_lineage(target_model);
CREATE INDEX IF NOT EXISTS idx_dbt_macros_active ON metadata.dbt_macros(active);
CREATE INDEX IF NOT EXISTS idx_dbt_sources_active ON metadata.dbt_sources(active);
CREATE INDEX IF NOT EXISTS idx_dbt_model_runs_model ON metadata.dbt_model_runs(model_name);
CREATE INDEX IF NOT EXISTS idx_dbt_model_runs_run ON metadata.dbt_model_runs(run_id);
CREATE INDEX IF NOT EXISTS idx_dbt_model_runs_status ON metadata.dbt_model_runs(status);
