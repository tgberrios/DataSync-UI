CREATE SCHEMA IF NOT EXISTS metadata;

-- Data Subject Requests Table
CREATE TABLE IF NOT EXISTS metadata.data_subject_requests (
  id SERIAL PRIMARY KEY,
  request_id VARCHAR(100) NOT NULL UNIQUE,
  request_type VARCHAR(50) NOT NULL,
  data_subject_email VARCHAR(200),
  data_subject_name VARCHAR(200),
  request_status VARCHAR(50) DEFAULT 'PENDING',
  requested_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  requested_data TEXT,
  response_data TEXT,
  processed_by VARCHAR(200),
  notes TEXT,
  compliance_requirement VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_data_subject_requests_status ON metadata.data_subject_requests(request_status);
CREATE INDEX IF NOT EXISTS idx_data_subject_requests_type ON metadata.data_subject_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_data_subject_requests_email ON metadata.data_subject_requests(data_subject_email);
CREATE INDEX IF NOT EXISTS idx_data_subject_requests_compliance ON metadata.data_subject_requests(compliance_requirement);

COMMENT ON TABLE metadata.data_subject_requests IS 'Stores GDPR data subject requests (access, portability, right to be forgotten)';
COMMENT ON COLUMN metadata.data_subject_requests.request_type IS 'Type: ACCESS, PORTABILITY, RIGHT_TO_BE_FORGOTTEN';
COMMENT ON COLUMN metadata.data_subject_requests.request_status IS 'Status: PENDING, IN_PROGRESS, COMPLETED, REJECTED';

-- Consent Records Table
CREATE TABLE IF NOT EXISTS metadata.consent_records (
  id SERIAL PRIMARY KEY,
  schema_name VARCHAR(100) NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  data_subject_id VARCHAR(255) NOT NULL,
  consent_type VARCHAR(50) NOT NULL,
  consent_status VARCHAR(50) NOT NULL,
  legal_basis VARCHAR(100),
  purpose TEXT,
  retention_period VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consent_records_subject ON metadata.consent_records(data_subject_id);
CREATE INDEX IF NOT EXISTS idx_consent_records_table ON metadata.consent_records(schema_name, table_name);
CREATE INDEX IF NOT EXISTS idx_consent_records_status ON metadata.consent_records(consent_status);

COMMENT ON TABLE metadata.consent_records IS 'Stores consent records for data processing';
COMMENT ON COLUMN metadata.consent_records.consent_type IS 'Type: EXPLICIT, IMPLICIT, OPT_IN, OPT_OUT';
COMMENT ON COLUMN metadata.consent_records.consent_status IS 'Status: GRANTED, WITHDRAWN, PENDING';

-- Breach Notifications Table
CREATE TABLE IF NOT EXISTS metadata.breach_notifications (
  id SERIAL PRIMARY KEY,
  schema_name VARCHAR(100) NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  breach_type VARCHAR(50) NOT NULL,
  detected_at TIMESTAMP DEFAULT NOW(),
  notified_at TIMESTAMP,
  notification_details TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'DETECTED',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_breach_notifications_table ON metadata.breach_notifications(schema_name, table_name);
CREATE INDEX IF NOT EXISTS idx_breach_notifications_status ON metadata.breach_notifications(status);
CREATE INDEX IF NOT EXISTS idx_breach_notifications_detected ON metadata.breach_notifications(detected_at DESC);

COMMENT ON TABLE metadata.breach_notifications IS 'Stores data breach notifications';
COMMENT ON COLUMN metadata.breach_notifications.breach_type IS 'Type: UNAUTHORIZED_ACCESS, DATA_LOSS, SECURITY_INCIDENT';
COMMENT ON COLUMN metadata.breach_notifications.status IS 'Status: DETECTED, NOTIFIED, RESOLVED';

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION metadata.update_compliance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_data_subject_requests_updated_at
  BEFORE UPDATE ON metadata.data_subject_requests
  FOR EACH ROW
  EXECUTE FUNCTION metadata.update_compliance_updated_at();

CREATE TRIGGER trigger_update_consent_records_updated_at
  BEFORE UPDATE ON metadata.consent_records
  FOR EACH ROW
  EXECUTE FUNCTION metadata.update_compliance_updated_at();
