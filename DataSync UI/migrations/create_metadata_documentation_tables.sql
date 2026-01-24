CREATE SCHEMA IF NOT EXISTS metadata;

-- Impact Analysis Results
CREATE TABLE IF NOT EXISTS metadata.impact_analysis (
  id SERIAL PRIMARY KEY,
  schema_name VARCHAR(255) NOT NULL,
  table_name VARCHAR(255) NOT NULL,
  column_name VARCHAR(255),
  resource_type VARCHAR(50) NOT NULL CHECK (resource_type IN ('table', 'column', 'workflow', 'transformation', 'schema_change')),
  change_type VARCHAR(50),
  analysis_result JSONB NOT NULL,
  downstream_count INTEGER DEFAULT 0,
  upstream_count INTEGER DEFAULT 0,
  confidence_score DECIMAL(3,2) DEFAULT 1.0,
  created_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Column-Level Lineage
CREATE TABLE IF NOT EXISTS metadata.column_lineage (
  id SERIAL PRIMARY KEY,
  source_schema VARCHAR(255) NOT NULL,
  source_table VARCHAR(255) NOT NULL,
  source_column VARCHAR(255) NOT NULL,
  target_schema VARCHAR(255) NOT NULL,
  target_table VARCHAR(255) NOT NULL,
  target_column VARCHAR(255) NOT NULL,
  transformation_type VARCHAR(50) DEFAULT 'direct' CHECK (transformation_type IN ('direct', 'expression', 'aggregation', 'join', 'cast')),
  transformation_expression TEXT,
  query_text TEXT,
  confidence_score DECIMAL(3,2) DEFAULT 1.0,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_column_lineage UNIQUE (source_schema, source_table, source_column, target_schema, target_table, target_column)
);

-- Transformation Lineage
CREATE TABLE IF NOT EXISTS metadata.transformation_lineage (
  id SERIAL PRIMARY KEY,
  transformation_id VARCHAR(255) UNIQUE NOT NULL,
  transformation_type VARCHAR(100) NOT NULL,
  transformation_config JSONB,
  workflow_name VARCHAR(255),
  task_name VARCHAR(255),
  workflow_execution_id BIGINT,
  task_execution_id BIGINT,
  input_schemas TEXT[],
  input_tables TEXT[],
  input_columns TEXT[],
  output_schemas TEXT[],
  output_tables TEXT[],
  output_columns TEXT[],
  rows_processed BIGINT DEFAULT 0,
  execution_time_ms DECIMAL(10,2),
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  executed_at TIMESTAMP DEFAULT NOW()
);

-- Pipeline Documentation
CREATE TABLE IF NOT EXISTS metadata.pipeline_documentation (
  id SERIAL PRIMARY KEY,
  workflow_name VARCHAR(255) NOT NULL,
  documentation_format VARCHAR(20) DEFAULT 'markdown' CHECK (documentation_format IN ('markdown', 'html', 'json')),
  documentation_content TEXT NOT NULL,
  generated_at TIMESTAMP DEFAULT NOW(),
  generated_by VARCHAR(255),
  CONSTRAINT unique_workflow_doc UNIQUE (workflow_name, documentation_format)
);

-- Lineage Graph Cache
CREATE TABLE IF NOT EXISTS metadata.lineage_graph_cache (
  id SERIAL PRIMARY KEY,
  cache_key VARCHAR(255) UNIQUE NOT NULL,
  graph_data JSONB NOT NULL,
  node_count INTEGER DEFAULT 0,
  edge_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL
);

-- Dictionary Generation Log
CREATE TABLE IF NOT EXISTS metadata.dictionary_generation_log (
  id SERIAL PRIMARY KEY,
  schema_name VARCHAR(255) NOT NULL,
  table_name VARCHAR(255),
  entries_created INTEGER DEFAULT 0,
  entries_updated INTEGER DEFAULT 0,
  entries_skipped INTEGER DEFAULT 0,
  generation_config JSONB,
  generated_by VARCHAR(255),
  generated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_impact_analysis_table ON metadata.impact_analysis(schema_name, table_name);
CREATE INDEX IF NOT EXISTS idx_impact_analysis_column ON metadata.impact_analysis(schema_name, table_name, column_name);
CREATE INDEX IF NOT EXISTS idx_impact_analysis_created ON metadata.impact_analysis(created_at);

CREATE INDEX IF NOT EXISTS idx_column_lineage_source ON metadata.column_lineage(source_schema, source_table, source_column);
CREATE INDEX IF NOT EXISTS idx_column_lineage_target ON metadata.column_lineage(target_schema, target_table, target_column);

CREATE INDEX IF NOT EXISTS idx_transformation_lineage_workflow ON metadata.transformation_lineage(workflow_name);
CREATE INDEX IF NOT EXISTS idx_transformation_lineage_execution ON metadata.transformation_lineage(workflow_execution_id);
CREATE INDEX IF NOT EXISTS idx_transformation_lineage_executed ON metadata.transformation_lineage(executed_at);

CREATE INDEX IF NOT EXISTS idx_pipeline_doc_workflow ON metadata.pipeline_documentation(workflow_name);
CREATE INDEX IF NOT EXISTS idx_pipeline_doc_generated ON metadata.pipeline_documentation(generated_at);

CREATE INDEX IF NOT EXISTS idx_lineage_graph_cache_key ON metadata.lineage_graph_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_lineage_graph_cache_expires ON metadata.lineage_graph_cache(expires_at);

CREATE INDEX IF NOT EXISTS idx_dictionary_gen_log_table ON metadata.dictionary_generation_log(schema_name, table_name);
CREATE INDEX IF NOT EXISTS idx_dictionary_gen_log_created ON metadata.dictionary_generation_log(generated_at);

-- Comments
COMMENT ON TABLE metadata.impact_analysis IS 'Resultados de análisis de impacto de cambios';
COMMENT ON TABLE metadata.column_lineage IS 'Lineage a nivel de columna entre tablas';
COMMENT ON TABLE metadata.transformation_lineage IS 'Lineage de transformaciones aplicadas en pipelines';
COMMENT ON TABLE metadata.pipeline_documentation IS 'Documentación generada automáticamente de pipelines';
COMMENT ON TABLE metadata.lineage_graph_cache IS 'Cache de grafos de lineage para optimización';
COMMENT ON TABLE metadata.dictionary_generation_log IS 'Log de generaciones automáticas de diccionario';
