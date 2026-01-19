CREATE SCHEMA IF NOT EXISTS metadata;

CREATE TABLE IF NOT EXISTS metadata.audit_log (
  log_id BIGSERIAL PRIMARY KEY,
  schema_name VARCHAR(100),
  table_name VARCHAR(100),
  column_name VARCHAR(100),
  username VARCHAR(100) NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  query_text TEXT,
  old_values JSONB,
  new_values JSONB,
  rows_affected INTEGER DEFAULT 0,
  client_addr INET,
  application_name VARCHAR(100),
  session_id VARCHAR(100),
  compliance_requirement VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_schema_table ON metadata.audit_log(schema_name, table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_username ON metadata.audit_log(username);
CREATE INDEX IF NOT EXISTS idx_audit_log_action_type ON metadata.audit_log(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON metadata.audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_compliance ON metadata.audit_log(compliance_requirement) WHERE compliance_requirement IS NOT NULL;

COMMENT ON TABLE metadata.audit_log IS 'Stores audit trail of all data access and modifications';
COMMENT ON COLUMN metadata.audit_log.action_type IS 'Action type: SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, ALTER';
COMMENT ON COLUMN metadata.audit_log.old_values IS 'Previous values (for UPDATE/DELETE)';
COMMENT ON COLUMN metadata.audit_log.new_values IS 'New values (for INSERT/UPDATE)';
COMMENT ON COLUMN metadata.audit_log.compliance_requirement IS 'Compliance requirement: GDPR, HIPAA, SOX, etc.';

CREATE OR REPLACE FUNCTION metadata.log_audit_event(
  p_schema_name VARCHAR,
  p_table_name VARCHAR,
  p_column_name VARCHAR,
  p_username VARCHAR,
  p_action_type VARCHAR,
  p_query_text TEXT,
  p_old_values JSONB,
  p_new_values JSONB,
  p_rows_affected INTEGER,
  p_client_addr INET,
  p_application_name VARCHAR,
  p_compliance_requirement VARCHAR
) RETURNS BIGINT AS $$
DECLARE
  v_log_id BIGINT;
BEGIN
  INSERT INTO metadata.audit_log (
    schema_name, table_name, column_name, username, action_type,
    query_text, old_values, new_values, rows_affected,
    client_addr, application_name, compliance_requirement
  ) VALUES (
    p_schema_name, p_table_name, p_column_name, p_username, p_action_type,
    p_query_text, p_old_values, p_new_values, p_rows_affected,
    p_client_addr, p_application_name, p_compliance_requirement
  ) RETURNING log_id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION metadata.log_audit_event IS 'Logs an audit event to the audit log table';

CREATE OR REPLACE FUNCTION metadata.get_audit_trail(
  p_schema_name VARCHAR DEFAULT NULL,
  p_table_name VARCHAR DEFAULT NULL,
  p_username VARCHAR DEFAULT NULL,
  p_action_type VARCHAR DEFAULT NULL,
  p_start_date TIMESTAMP DEFAULT NULL,
  p_end_date TIMESTAMP DEFAULT NULL,
  p_limit INTEGER DEFAULT 1000
) RETURNS TABLE (
  log_id BIGINT,
  schema_name VARCHAR,
  table_name VARCHAR,
  column_name VARCHAR,
  username VARCHAR,
  action_type VARCHAR,
  query_text TEXT,
  old_values JSONB,
  new_values JSONB,
  rows_affected INTEGER,
  client_addr INET,
  application_name VARCHAR,
  compliance_requirement VARCHAR,
  created_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.log_id,
    a.schema_name::VARCHAR,
    a.table_name::VARCHAR,
    a.column_name::VARCHAR,
    a.username::VARCHAR,
    a.action_type::VARCHAR,
    a.query_text,
    a.old_values,
    a.new_values,
    a.rows_affected,
    a.client_addr,
    a.application_name::VARCHAR,
    a.compliance_requirement::VARCHAR,
    a.created_at
  FROM metadata.audit_log a
  WHERE (p_schema_name IS NULL OR a.schema_name = p_schema_name)
    AND (p_table_name IS NULL OR a.table_name = p_table_name)
    AND (p_username IS NULL OR a.username = p_username)
    AND (p_action_type IS NULL OR a.action_type = p_action_type)
    AND (p_start_date IS NULL OR a.created_at >= p_start_date)
    AND (p_end_date IS NULL OR a.created_at <= p_end_date)
  ORDER BY a.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION metadata.get_audit_trail IS 'Retrieves audit trail with filters';

CREATE OR REPLACE FUNCTION metadata.get_compliance_report(
  p_compliance_type VARCHAR,
  p_start_date TIMESTAMP DEFAULT NULL,
  p_end_date TIMESTAMP DEFAULT NULL
) RETURNS TABLE (
  total_events BIGINT,
  unique_users INTEGER,
  unique_tables INTEGER,
  sensitive_access_count BIGINT,
  modification_count BIGINT,
  access_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_events,
    COUNT(DISTINCT username)::INTEGER as unique_users,
    COUNT(DISTINCT (schema_name || '.' || table_name))::INTEGER as unique_tables,
    COUNT(*) FILTER (WHERE action_type IN ('SELECT', 'UPDATE', 'DELETE') AND compliance_requirement IS NOT NULL)::BIGINT as sensitive_access_count,
    COUNT(*) FILTER (WHERE action_type IN ('INSERT', 'UPDATE', 'DELETE'))::BIGINT as modification_count,
    COUNT(*) FILTER (WHERE action_type = 'SELECT')::BIGINT as access_count
  FROM metadata.audit_log
  WHERE compliance_requirement = p_compliance_type
    AND (p_start_date IS NULL OR created_at >= p_start_date)
    AND (p_end_date IS NULL OR created_at <= p_end_date);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION metadata.get_compliance_report IS 'Generates compliance report for GDPR, HIPAA, SOX, etc.';
