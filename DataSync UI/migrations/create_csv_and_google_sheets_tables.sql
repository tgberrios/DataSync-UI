CREATE SCHEMA IF NOT EXISTS metadata;

CREATE TABLE IF NOT EXISTS metadata.csv_catalog (
  id SERIAL PRIMARY KEY,
  csv_name VARCHAR(255) UNIQUE NOT NULL,
  source_type VARCHAR(50) NOT NULL,
  source_path TEXT NOT NULL,
  has_header BOOLEAN DEFAULT true,
  delimiter VARCHAR(10) DEFAULT ',',
  skip_rows INTEGER DEFAULT 0,
  skip_empty_rows BOOLEAN DEFAULT true,
  target_db_engine VARCHAR(50) NOT NULL,
  target_connection_string TEXT NOT NULL,
  target_schema VARCHAR(100) NOT NULL,
  target_table VARCHAR(100) NOT NULL,
  sync_interval INTEGER DEFAULT 3600,
  status VARCHAR(50) DEFAULT 'PENDING',
  active BOOLEAN DEFAULT true,
  last_sync_time TIMESTAMP,
  last_sync_status VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT chk_csv_source_type CHECK (source_type IN ('FILEPATH', 'URL', 'ENDPOINT', 'UPLOADED_FILE')),
  CONSTRAINT chk_csv_target_engine CHECK (target_db_engine IN ('PostgreSQL', 'MariaDB', 'MSSQL', 'MongoDB', 'Oracle')),
  CONSTRAINT chk_csv_status CHECK (status IN ('SUCCESS', 'ERROR', 'IN_PROGRESS', 'PENDING'))
);

CREATE INDEX IF NOT EXISTS idx_csv_catalog_source_type ON metadata.csv_catalog(source_type);
CREATE INDEX IF NOT EXISTS idx_csv_catalog_target_engine ON metadata.csv_catalog(target_db_engine);
CREATE INDEX IF NOT EXISTS idx_csv_catalog_status ON metadata.csv_catalog(status);
CREATE INDEX IF NOT EXISTS idx_csv_catalog_active ON metadata.csv_catalog(active);
CREATE INDEX IF NOT EXISTS idx_csv_catalog_target ON metadata.csv_catalog(target_schema, target_table);

CREATE TABLE IF NOT EXISTS metadata.google_sheets_catalog (
  id SERIAL PRIMARY KEY,
  sheet_name VARCHAR(255) UNIQUE NOT NULL,
  spreadsheet_id VARCHAR(255) NOT NULL,
  api_key VARCHAR(500),
  access_token TEXT,
  range VARCHAR(255),
  target_db_engine VARCHAR(50) NOT NULL,
  target_connection_string TEXT NOT NULL,
  target_schema VARCHAR(100) NOT NULL,
  target_table VARCHAR(100) NOT NULL,
  sync_interval INTEGER DEFAULT 3600,
  status VARCHAR(50) DEFAULT 'PENDING',
  active BOOLEAN DEFAULT true,
  last_sync_time TIMESTAMP,
  last_sync_status VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT chk_sheets_target_engine CHECK (target_db_engine IN ('PostgreSQL', 'MariaDB', 'MSSQL', 'MongoDB', 'Oracle')),
  CONSTRAINT chk_sheets_status CHECK (status IN ('SUCCESS', 'ERROR', 'IN_PROGRESS', 'PENDING'))
);

CREATE INDEX IF NOT EXISTS idx_google_sheets_catalog_target_engine ON metadata.google_sheets_catalog(target_db_engine);
CREATE INDEX IF NOT EXISTS idx_google_sheets_catalog_status ON metadata.google_sheets_catalog(status);
CREATE INDEX IF NOT EXISTS idx_google_sheets_catalog_active ON metadata.google_sheets_catalog(active);
CREATE INDEX IF NOT EXISTS idx_google_sheets_catalog_target ON metadata.google_sheets_catalog(target_schema, target_table);
CREATE INDEX IF NOT EXISTS idx_google_sheets_catalog_spreadsheet_id ON metadata.google_sheets_catalog(spreadsheet_id);

COMMENT ON TABLE metadata.csv_catalog IS 'Stores CSV source configurations for data synchronization';
COMMENT ON TABLE metadata.google_sheets_catalog IS 'Stores Google Sheets source configurations for data synchronization';

