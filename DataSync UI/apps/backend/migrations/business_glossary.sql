-- Business glossary tables for the DataSync UI backend.
-- Run this against your PostgreSQL metadata schema (e.g. in the DataLake database).
-- Example: psql -d DataLake -f migrations/business_glossary.sql

CREATE SCHEMA IF NOT EXISTS metadata;

CREATE TABLE IF NOT EXISTS metadata.business_glossary_terms (
  id SERIAL PRIMARY KEY,
  term TEXT NOT NULL,
  definition TEXT NOT NULL,
  category TEXT,
  business_domain TEXT,
  owner TEXT,
  steward TEXT,
  related_tables TEXT,
  tags TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS metadata.business_glossary_term_tables (
  term_id INT NOT NULL REFERENCES metadata.business_glossary_terms(id) ON DELETE CASCADE,
  schema_name TEXT NOT NULL,
  table_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (term_id, schema_name, table_name)
);

CREATE TABLE IF NOT EXISTS metadata.business_glossary_dictionary (
  id SERIAL PRIMARY KEY,
  schema_name TEXT NOT NULL,
  table_name TEXT NOT NULL,
  column_name TEXT NOT NULL,
  business_description TEXT,
  business_name TEXT,
  data_type_business TEXT,
  business_rules TEXT,
  examples TEXT,
  glossary_term TEXT,
  owner TEXT,
  steward TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (schema_name, table_name, column_name)
);
