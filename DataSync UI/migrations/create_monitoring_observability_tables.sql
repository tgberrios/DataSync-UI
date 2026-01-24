-- Migration: Create Monitoring and Observability Tables
-- Description: Creates tables for distributed tracing, APM, bottleneck detection, resource tracking, cost tracking, log aggregation, advanced alerting, and query performance analysis
-- Date: 2026-01-23

BEGIN;

-- Distributed Tracing Tables
CREATE TABLE IF NOT EXISTS metadata.distributed_traces (
    trace_id VARCHAR(36) PRIMARY KEY,
    service_name VARCHAR(100) NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    duration_microseconds BIGINT,
    span_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE metadata.distributed_traces IS 'Stores distributed traces for observability';

CREATE INDEX IF NOT EXISTS idx_distributed_traces_service_name ON metadata.distributed_traces(service_name);
CREATE INDEX IF NOT EXISTS idx_distributed_traces_start_time ON metadata.distributed_traces(start_time);

CREATE TABLE IF NOT EXISTS metadata.trace_spans (
    span_id VARCHAR(36) PRIMARY KEY,
    trace_id VARCHAR(36) NOT NULL,
    parent_span_id VARCHAR(36),
    operation_name VARCHAR(255) NOT NULL,
    service_name VARCHAR(100) NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    duration_microseconds BIGINT,
    tags JSONB DEFAULT '{}'::jsonb,
    logs JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(20) DEFAULT 'ok',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (trace_id) REFERENCES metadata.distributed_traces(trace_id) ON DELETE CASCADE
);

COMMENT ON TABLE metadata.trace_spans IS 'Stores individual spans within traces';

CREATE INDEX IF NOT EXISTS idx_trace_spans_trace_id ON metadata.trace_spans(trace_id);
CREATE INDEX IF NOT EXISTS idx_trace_spans_parent_span_id ON metadata.trace_spans(parent_span_id);
CREATE INDEX IF NOT EXISTS idx_trace_spans_operation_name ON metadata.trace_spans(operation_name);

-- APM Tables
CREATE TABLE IF NOT EXISTS metadata.apm_metrics (
    metric_id SERIAL PRIMARY KEY,
    operation_name VARCHAR(255) NOT NULL,
    service_name VARCHAR(100) NOT NULL,
    request_count BIGINT DEFAULT 0,
    error_count BIGINT DEFAULT 0,
    latency_p50 DECIMAL(10,2),
    latency_p95 DECIMAL(10,2),
    latency_p99 DECIMAL(10,2),
    throughput DECIMAL(10,2),
    error_rate DECIMAL(5,2),
    timestamp TIMESTAMP NOT NULL,
    time_window VARCHAR(20) NOT NULL, -- '1min', '5min', '1h'
    created_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE metadata.apm_metrics IS 'Stores APM metrics aggregated by time window';

CREATE INDEX IF NOT EXISTS idx_apm_metrics_operation_service ON metadata.apm_metrics(operation_name, service_name);
CREATE INDEX IF NOT EXISTS idx_apm_metrics_timestamp ON metadata.apm_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_apm_metrics_time_window ON metadata.apm_metrics(time_window);

CREATE TABLE IF NOT EXISTS metadata.apm_baselines (
    baseline_id SERIAL PRIMARY KEY,
    operation_name VARCHAR(255) NOT NULL,
    service_name VARCHAR(100) NOT NULL,
    latency_p50 DECIMAL(10,2),
    latency_p95 DECIMAL(10,2),
    latency_p99 DECIMAL(10,2),
    throughput DECIMAL(10,2),
    error_rate DECIMAL(5,2),
    calculated_at TIMESTAMP DEFAULT NOW(),
    sample_count INTEGER DEFAULT 0,
    UNIQUE(operation_name, service_name)
);

COMMENT ON TABLE metadata.apm_baselines IS 'Stores performance baselines for operations';

CREATE INDEX IF NOT EXISTS idx_apm_baselines_operation_service ON metadata.apm_baselines(operation_name, service_name);

CREATE TABLE IF NOT EXISTS metadata.apm_health_checks (
    check_id SERIAL PRIMARY KEY,
    check_name VARCHAR(255) NOT NULL,
    component VARCHAR(100) NOT NULL, -- 'database', 'external_service', 'disk_space'
    status VARCHAR(20) NOT NULL, -- 'healthy', 'degraded', 'unhealthy'
    message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE metadata.apm_health_checks IS 'Stores health check results';

CREATE INDEX IF NOT EXISTS idx_apm_health_checks_component ON metadata.apm_health_checks(component);
CREATE INDEX IF NOT EXISTS idx_apm_health_checks_status ON metadata.apm_health_checks(status);
CREATE INDEX IF NOT EXISTS idx_apm_health_checks_timestamp ON metadata.apm_health_checks(timestamp);

-- Bottleneck Detection Tables
CREATE TABLE IF NOT EXISTS metadata.bottleneck_detections (
    detection_id SERIAL PRIMARY KEY,
    resource_type VARCHAR(50) NOT NULL, -- 'CPU', 'MEMORY', 'IO', 'NETWORK', 'DATABASE'
    severity VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high', 'critical'
    description TEXT NOT NULL,
    recommendations TEXT[],
    detected_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb
);

COMMENT ON TABLE metadata.bottleneck_detections IS 'Stores detected bottlenecks';

CREATE INDEX IF NOT EXISTS idx_bottleneck_detections_resource_type ON metadata.bottleneck_detections(resource_type);
CREATE INDEX IF NOT EXISTS idx_bottleneck_detections_severity ON metadata.bottleneck_detections(severity);
CREATE INDEX IF NOT EXISTS idx_bottleneck_detections_detected_at ON metadata.bottleneck_detections(detected_at);

-- Resource Utilization Tables
CREATE TABLE IF NOT EXISTS metadata.resource_utilization (
    utilization_id SERIAL PRIMARY KEY,
    cpu_percent DECIMAL(5,2),
    memory_percent DECIMAL(5,2),
    io_read_ops_per_sec INTEGER,
    io_write_ops_per_sec INTEGER,
    io_throughput_mb_per_sec DECIMAL(10,2),
    network_bytes_in BIGINT,
    network_bytes_out BIGINT,
    db_connections INTEGER,
    db_locks INTEGER,
    db_cache_hit_ratio DECIMAL(5,2),
    workflow_id VARCHAR(100),
    job_id VARCHAR(100),
    timestamp TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE metadata.resource_utilization IS 'Stores resource utilization metrics';

CREATE INDEX IF NOT EXISTS idx_resource_utilization_timestamp ON metadata.resource_utilization(timestamp);
CREATE INDEX IF NOT EXISTS idx_resource_utilization_workflow_id ON metadata.resource_utilization(workflow_id);
CREATE INDEX IF NOT EXISTS idx_resource_utilization_job_id ON metadata.resource_utilization(job_id);

CREATE TABLE IF NOT EXISTS metadata.resource_predictions (
    prediction_id SERIAL PRIMARY KEY,
    resource_type VARCHAR(50) NOT NULL,
    current_utilization DECIMAL(5,2),
    predicted_utilization DECIMAL(5,2),
    predicted_exhaustion_date TIMESTAMP,
    confidence DECIMAL(5,2), -- 0-100
    predicted_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE metadata.resource_predictions IS 'Stores resource capacity predictions';

CREATE INDEX IF NOT EXISTS idx_resource_predictions_resource_type ON metadata.resource_predictions(resource_type);
CREATE INDEX IF NOT EXISTS idx_resource_predictions_predicted_at ON metadata.resource_predictions(predicted_at);

-- Cost Tracking Tables
CREATE TABLE IF NOT EXISTS metadata.cost_tracking (
    cost_id SERIAL PRIMARY KEY,
    workflow_id VARCHAR(100),
    operation_name VARCHAR(255),
    total_cost DECIMAL(10,4),
    compute_cost DECIMAL(10,4),
    storage_cost DECIMAL(10,4),
    network_cost DECIMAL(10,4),
    resource_usage JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE metadata.cost_tracking IS 'Stores cost tracking data by operation/workflow';

CREATE INDEX IF NOT EXISTS idx_cost_tracking_workflow_id ON metadata.cost_tracking(workflow_id);
CREATE INDEX IF NOT EXISTS idx_cost_tracking_operation_name ON metadata.cost_tracking(operation_name);
CREATE INDEX IF NOT EXISTS idx_cost_tracking_timestamp ON metadata.cost_tracking(timestamp);

CREATE TABLE IF NOT EXISTS metadata.cost_budgets (
    budget_id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    scope VARCHAR(50) NOT NULL, -- 'global', 'workflow', 'project'
    scope_id VARCHAR(100),
    amount DECIMAL(10,2) NOT NULL,
    period VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly'
    alert_on_exceed BOOLEAN DEFAULT true,
    alert_threshold DECIMAL(5,2) DEFAULT 80.0, -- percentage
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE metadata.cost_budgets IS 'Stores cost budgets with alerts';

CREATE INDEX IF NOT EXISTS idx_cost_budgets_scope ON metadata.cost_budgets(scope, scope_id);

CREATE TABLE IF NOT EXISTS metadata.cost_estimates (
    estimate_id SERIAL PRIMARY KEY,
    resource_type VARCHAR(50) NOT NULL,
    estimated_cost DECIMAL(10,4),
    usage_units DECIMAL(10,2),
    unit_cost DECIMAL(10,4),
    cloud_provider VARCHAR(50), -- 'aws', 'azure', 'gcp'
    estimated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE metadata.cost_estimates IS 'Stores cloud resource cost estimates';

CREATE INDEX IF NOT EXISTS idx_cost_estimates_resource_type ON metadata.cost_estimates(resource_type);
CREATE INDEX IF NOT EXISTS idx_cost_estimates_cloud_provider ON metadata.cost_estimates(cloud_provider);

-- Log Aggregation Tables
CREATE TABLE IF NOT EXISTS metadata.log_aggregation_config (
    config_id VARCHAR(100) PRIMARY KEY,
    type VARCHAR(50) NOT NULL, -- 'elasticsearch', 'splunk'
    endpoint VARCHAR(500),
    index_name VARCHAR(255), -- For Elasticsearch
    token VARCHAR(500), -- For Splunk HEC
    username VARCHAR(255),
    password VARCHAR(255),
    enabled BOOLEAN DEFAULT true,
    batch_size INTEGER DEFAULT 1000,
    batch_interval_seconds INTEGER DEFAULT 60,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE metadata.log_aggregation_config IS 'Stores log aggregation destination configuration';

CREATE INDEX IF NOT EXISTS idx_log_aggregation_config_type ON metadata.log_aggregation_config(type);
CREATE INDEX IF NOT EXISTS idx_log_aggregation_config_enabled ON metadata.log_aggregation_config(enabled);

CREATE TABLE IF NOT EXISTS metadata.log_aggregation_status (
    status_id SERIAL PRIMARY KEY,
    config_id VARCHAR(100) NOT NULL,
    last_export_at TIMESTAMP,
    last_export_count INTEGER DEFAULT 0,
    last_error TEXT,
    total_exported BIGINT DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (config_id) REFERENCES metadata.log_aggregation_config(config_id) ON DELETE CASCADE
);

COMMENT ON TABLE metadata.log_aggregation_status IS 'Stores log aggregation export status';

CREATE INDEX IF NOT EXISTS idx_log_aggregation_status_config_id ON metadata.log_aggregation_status(config_id);

-- Advanced Alerting Tables
CREATE TABLE IF NOT EXISTS metadata.alerting_integrations (
    integration_id VARCHAR(100) PRIMARY KEY,
    type VARCHAR(50) NOT NULL, -- 'pagerduty', 'opsgenie'
    name VARCHAR(255) NOT NULL,
    integration_key VARCHAR(500), -- For PagerDuty
    api_key VARCHAR(500), -- For Opsgenie
    service_id VARCHAR(255), -- For PagerDuty
    team_id VARCHAR(255), -- For Opsgenie
    enabled BOOLEAN DEFAULT true,
    severity_mapping JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE metadata.alerting_integrations IS 'Stores external alerting system integrations';

CREATE INDEX IF NOT EXISTS idx_alerting_integrations_type ON metadata.alerting_integrations(type);
CREATE INDEX IF NOT EXISTS idx_alerting_integrations_enabled ON metadata.alerting_integrations(enabled);

CREATE TABLE IF NOT EXISTS metadata.alerting_incidents (
    incident_id VARCHAR(100) PRIMARY KEY,
    integration_id VARCHAR(100) NOT NULL,
    external_id VARCHAR(255), -- ID in PagerDuty/Opsgenie
    alert_id INTEGER,
    status VARCHAR(20) NOT NULL, -- 'triggered', 'acknowledged', 'resolved'
    created_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb,
    FOREIGN KEY (integration_id) REFERENCES metadata.alerting_integrations(integration_id) ON DELETE CASCADE
);

COMMENT ON TABLE metadata.alerting_incidents IS 'Stores incidents created in external alerting systems';

CREATE INDEX IF NOT EXISTS idx_alerting_incidents_integration_id ON metadata.alerting_incidents(integration_id);
CREATE INDEX IF NOT EXISTS idx_alerting_incidents_status ON metadata.alerting_incidents(status);
CREATE INDEX IF NOT EXISTS idx_alerting_incidents_external_id ON metadata.alerting_incidents(external_id);

-- Query Performance Analysis Tables
CREATE TABLE IF NOT EXISTS metadata.query_performance_analysis (
    analysis_id SERIAL PRIMARY KEY,
    query_id VARCHAR(100) NOT NULL,
    query_fingerprint VARCHAR(500) NOT NULL,
    query_text TEXT,
    execution_plan JSONB,
    issues TEXT[],
    recommendations TEXT[],
    analyzed_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE metadata.query_performance_analysis IS 'Stores detailed query performance analysis';

CREATE INDEX IF NOT EXISTS idx_query_performance_analysis_query_id ON metadata.query_performance_analysis(query_id);
CREATE INDEX IF NOT EXISTS idx_query_performance_analysis_query_fingerprint ON metadata.query_performance_analysis(query_fingerprint);

CREATE TABLE IF NOT EXISTS metadata.query_optimization_suggestions (
    suggestion_id SERIAL PRIMARY KEY,
    query_fingerprint VARCHAR(500) NOT NULL,
    suggestion_type VARCHAR(50) NOT NULL, -- 'index', 'query_rewrite', 'partitioning'
    suggestion_text TEXT NOT NULL,
    estimated_improvement DECIMAL(5,2), -- percentage
    created_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE metadata.query_optimization_suggestions IS 'Stores query optimization suggestions';

CREATE INDEX IF NOT EXISTS idx_query_optimization_suggestions_fingerprint ON metadata.query_optimization_suggestions(query_fingerprint);
CREATE INDEX IF NOT EXISTS idx_query_optimization_suggestions_type ON metadata.query_optimization_suggestions(suggestion_type);

COMMIT;
