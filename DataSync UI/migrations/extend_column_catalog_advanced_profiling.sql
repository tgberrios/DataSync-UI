-- Migration: Extend column_catalog with Advanced Data Profiling fields
-- Description: Adds statistical analysis, pattern detection, distributions, and quality scoring capabilities
-- Date: 2024

BEGIN;

-- Add advanced statistical fields
ALTER TABLE metadata.column_catalog 
ADD COLUMN IF NOT EXISTS median_value DECIMAL(20,6),
ADD COLUMN IF NOT EXISTS std_deviation DECIMAL(20,6),
ADD COLUMN IF NOT EXISTS mode_value TEXT,
ADD COLUMN IF NOT EXISTS mode_frequency DECIMAL(10,4);

-- Add percentile fields
ALTER TABLE metadata.column_catalog
ADD COLUMN IF NOT EXISTS percentile_25 DECIMAL(20,6),
ADD COLUMN IF NOT EXISTS percentile_75 DECIMAL(20,6),
ADD COLUMN IF NOT EXISTS percentile_90 DECIMAL(20,6),
ADD COLUMN IF NOT EXISTS percentile_95 DECIMAL(20,6),
ADD COLUMN IF NOT EXISTS percentile_99 DECIMAL(20,6);

-- Add distribution fields
ALTER TABLE metadata.column_catalog
ADD COLUMN IF NOT EXISTS value_distribution JSONB,
ADD COLUMN IF NOT EXISTS top_values JSONB,
ADD COLUMN IF NOT EXISTS outlier_count BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS outlier_percentage DECIMAL(5,2) DEFAULT 0.0;

-- Add pattern detection fields
ALTER TABLE metadata.column_catalog
ADD COLUMN IF NOT EXISTS detected_pattern VARCHAR(50),
ADD COLUMN IF NOT EXISTS pattern_confidence DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS pattern_examples JSONB;

-- Add anomaly detection fields
ALTER TABLE metadata.column_catalog
ADD COLUMN IF NOT EXISTS anomalies JSONB,
ADD COLUMN IF NOT EXISTS has_anomalies BOOLEAN DEFAULT false;

-- Add profiling quality score
ALTER TABLE metadata.column_catalog
ADD COLUMN IF NOT EXISTS profiling_quality_score DECIMAL(5,2);

-- Add timestamp for profiling analysis
ALTER TABLE metadata.column_catalog
ADD COLUMN IF NOT EXISTS last_profiled_at TIMESTAMP;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_column_catalog_profiling_score 
ON metadata.column_catalog(profiling_quality_score) 
WHERE profiling_quality_score IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_column_catalog_detected_pattern 
ON metadata.column_catalog(detected_pattern) 
WHERE detected_pattern IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_column_catalog_has_anomalies 
ON metadata.column_catalog(has_anomalies) 
WHERE has_anomalies = true;

CREATE INDEX IF NOT EXISTS idx_column_catalog_last_profiled 
ON metadata.column_catalog(last_profiled_at) 
WHERE last_profiled_at IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN metadata.column_catalog.median_value IS 'Median value for numeric columns';
COMMENT ON COLUMN metadata.column_catalog.std_deviation IS 'Standard deviation for numeric columns';
COMMENT ON COLUMN metadata.column_catalog.mode_value IS 'Most frequent value (mode) in the column';
COMMENT ON COLUMN metadata.column_catalog.mode_frequency IS 'Frequency percentage of the mode value';
COMMENT ON COLUMN metadata.column_catalog.percentile_25 IS '25th percentile (Q1) for numeric columns';
COMMENT ON COLUMN metadata.column_catalog.percentile_75 IS '75th percentile (Q3) for numeric columns';
COMMENT ON COLUMN metadata.column_catalog.percentile_90 IS '90th percentile for numeric columns';
COMMENT ON COLUMN metadata.column_catalog.percentile_95 IS '95th percentile for numeric columns';
COMMENT ON COLUMN metadata.column_catalog.percentile_99 IS '99th percentile for numeric columns';
COMMENT ON COLUMN metadata.column_catalog.value_distribution IS 'JSONB histogram showing value distribution across bins';
COMMENT ON COLUMN metadata.column_catalog.top_values IS 'JSONB array of top N most frequent values with counts';
COMMENT ON COLUMN metadata.column_catalog.outlier_count IS 'Number of outlier values detected using IQR method';
COMMENT ON COLUMN metadata.column_catalog.outlier_percentage IS 'Percentage of values that are outliers';
COMMENT ON COLUMN metadata.column_catalog.detected_pattern IS 'Detected pattern type: EMAIL, PHONE, DATE, UUID, URL, IP, etc.';
COMMENT ON COLUMN metadata.column_catalog.pattern_confidence IS 'Confidence score (0-100) for pattern detection';
COMMENT ON COLUMN metadata.column_catalog.pattern_examples IS 'JSONB array of example values matching the detected pattern';
COMMENT ON COLUMN metadata.column_catalog.anomalies IS 'JSONB array of detected anomalies with details';
COMMENT ON COLUMN metadata.column_catalog.has_anomalies IS 'Boolean flag indicating if anomalies were detected';
COMMENT ON COLUMN metadata.column_catalog.profiling_quality_score IS 'Quality score (0-100) based on profiling analysis';
COMMENT ON COLUMN metadata.column_catalog.last_profiled_at IS 'Timestamp of last advanced profiling analysis';

COMMIT;

