ALTER TABLE metadata.data_warehouse_catalog
ADD COLUMN notes TEXT;

COMMENT ON COLUMN metadata.data_warehouse_catalog.notes IS 'Error messages, warnings, or other notes related to warehouse builds';

