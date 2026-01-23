CREATE SCHEMA IF NOT EXISTS metadata;

-- Transformations Catalog Table
CREATE TABLE IF NOT EXISTS metadata.transformations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  transformation_type VARCHAR(100) NOT NULL,
  config JSONB NOT NULL,
  created_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transformations_type ON metadata.transformations(transformation_type);
CREATE INDEX IF NOT EXISTS idx_transformations_name ON metadata.transformations(name);

COMMENT ON TABLE metadata.transformations IS 'Stores reusable transformation definitions';
COMMENT ON COLUMN metadata.transformations.transformation_type IS 'Type: aggregate, join, lookup, expression, etc.';
COMMENT ON COLUMN metadata.transformations.config IS 'JSONB configuration for the transformation';

-- Transformation Usage Tracking Table
CREATE TABLE IF NOT EXISTS metadata.transformation_usage (
  id SERIAL PRIMARY KEY,
  transformation_id INTEGER NOT NULL,
  job_name VARCHAR(255) NOT NULL,
  usage_count INTEGER NOT NULL DEFAULT 1,
  last_used_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_transformation FOREIGN KEY (transformation_id) 
    REFERENCES metadata.transformations(id) ON DELETE CASCADE,
  CONSTRAINT uq_transformation_job UNIQUE (transformation_id, job_name)
);

CREATE INDEX IF NOT EXISTS idx_transformation_usage_transformation ON metadata.transformation_usage(transformation_id);
CREATE INDEX IF NOT EXISTS idx_transformation_usage_job ON metadata.transformation_usage(job_name);
CREATE INDEX IF NOT EXISTS idx_transformation_usage_last_used ON metadata.transformation_usage(last_used_at DESC);

COMMENT ON TABLE metadata.transformation_usage IS 'Tracks usage of transformations in jobs';

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION metadata.update_transformations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_transformations_updated_at
  BEFORE UPDATE ON metadata.transformations
  FOR EACH ROW
  EXECUTE FUNCTION metadata.update_transformations_updated_at();
