CREATE SCHEMA IF NOT EXISTS metadata;

-- Business Glossary Terms Table
CREATE TABLE IF NOT EXISTS metadata.business_glossary (
  id SERIAL PRIMARY KEY,
  term VARCHAR(255) NOT NULL UNIQUE,
  definition TEXT NOT NULL,
  category VARCHAR(100),
  business_domain VARCHAR(100),
  owner VARCHAR(100),
  steward VARCHAR(100),
  related_tables TEXT,
  tags TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_business_glossary_term ON metadata.business_glossary(term);
CREATE INDEX IF NOT EXISTS idx_business_glossary_category ON metadata.business_glossary(category);
CREATE INDEX IF NOT EXISTS idx_business_glossary_domain ON metadata.business_glossary(business_domain);
CREATE INDEX IF NOT EXISTS idx_business_glossary_owner ON metadata.business_glossary(owner);

COMMENT ON TABLE metadata.business_glossary IS 'Stores business glossary terms and definitions';
COMMENT ON COLUMN metadata.business_glossary.term IS 'Unique term name';
COMMENT ON COLUMN metadata.business_glossary.definition IS 'Business definition of the term';
COMMENT ON COLUMN metadata.business_glossary.category IS 'Category classification';
COMMENT ON COLUMN metadata.business_glossary.business_domain IS 'Business domain (e.g., Sales, Finance, HR)';
COMMENT ON COLUMN metadata.business_glossary.related_tables IS 'Comma-separated list of related table names';
COMMENT ON COLUMN metadata.business_glossary.tags IS 'Comma-separated tags for categorization';

-- Data Dictionary Table
CREATE TABLE IF NOT EXISTS metadata.data_dictionary (
  schema_name VARCHAR(100) NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  column_name VARCHAR(100) NOT NULL,
  business_description TEXT,
  business_name VARCHAR(255),
  data_type_business VARCHAR(100),
  business_rules TEXT,
  examples TEXT,
  glossary_term VARCHAR(255),
  owner VARCHAR(100),
  steward VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (schema_name, table_name, column_name),
  CONSTRAINT fk_glossary_term FOREIGN KEY (glossary_term) 
    REFERENCES metadata.business_glossary(term) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_data_dictionary_schema_table ON metadata.data_dictionary(schema_name, table_name);
CREATE INDEX IF NOT EXISTS idx_data_dictionary_glossary_term ON metadata.data_dictionary(glossary_term);
CREATE INDEX IF NOT EXISTS idx_data_dictionary_owner ON metadata.data_dictionary(owner);

COMMENT ON TABLE metadata.data_dictionary IS 'Stores business metadata for database columns';
COMMENT ON COLUMN metadata.data_dictionary.business_description IS 'Business description of the column';
COMMENT ON COLUMN metadata.data_dictionary.business_name IS 'Business-friendly name for the column';
COMMENT ON COLUMN metadata.data_dictionary.data_type_business IS 'Business data type description';
COMMENT ON COLUMN metadata.data_dictionary.business_rules IS 'Business rules and constraints';
COMMENT ON COLUMN metadata.data_dictionary.examples IS 'Example values';
COMMENT ON COLUMN metadata.data_dictionary.glossary_term IS 'Related glossary term';

-- Glossary Term Links Table
CREATE TABLE IF NOT EXISTS metadata.glossary_term_links (
  id SERIAL PRIMARY KEY,
  term_id INTEGER NOT NULL,
  schema_name VARCHAR(100) NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_term FOREIGN KEY (term_id) 
    REFERENCES metadata.business_glossary(id) ON DELETE CASCADE,
  CONSTRAINT uq_term_table UNIQUE (term_id, schema_name, table_name)
);

CREATE INDEX IF NOT EXISTS idx_glossary_term_links_term ON metadata.glossary_term_links(term_id);
CREATE INDEX IF NOT EXISTS idx_glossary_term_links_table ON metadata.glossary_term_links(schema_name, table_name);

COMMENT ON TABLE metadata.glossary_term_links IS 'Links glossary terms to catalog tables';
COMMENT ON COLUMN metadata.glossary_term_links.term_id IS 'Reference to business_glossary.id';
COMMENT ON COLUMN metadata.glossary_term_links.schema_name IS 'Schema name from catalog';
COMMENT ON COLUMN metadata.glossary_term_links.table_name IS 'Table name from catalog';

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION metadata.update_business_glossary_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_business_glossary_updated_at
  BEFORE UPDATE ON metadata.business_glossary
  FOR EACH ROW
  EXECUTE FUNCTION metadata.update_business_glossary_updated_at();

CREATE TRIGGER trigger_update_data_dictionary_updated_at
  BEFORE UPDATE ON metadata.data_dictionary
  FOR EACH ROW
  EXECUTE FUNCTION metadata.update_business_glossary_updated_at();
