ALTER TABLE metadata.data_warehouse_catalog
ADD COLUMN IF NOT EXISTS target_layer VARCHAR(20) DEFAULT 'BRONZE' 
CHECK (target_layer IN ('BRONZE', 'SILVER', 'GOLD'));

COMMENT ON COLUMN metadata.data_warehouse_catalog.target_layer IS 'Medallion architecture layer: BRONZE (raw data), SILVER (cleaned/validated), GOLD (business-ready)';
