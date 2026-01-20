CREATE OR REPLACE VIEW metadata.available_connections AS
WITH all_connections AS (
  SELECT DISTINCT db_engine, connection_string
  FROM metadata.catalog
  WHERE active = true AND connection_string IS NOT NULL AND connection_string != ''
  
  UNION
  
  SELECT DISTINCT target_db_engine as db_engine, target_connection_string as connection_string
  FROM metadata.csv_catalog
  WHERE active = true AND target_connection_string IS NOT NULL AND target_connection_string != ''
  
  UNION
  
  SELECT DISTINCT target_db_engine as db_engine, target_connection_string as connection_string
  FROM metadata.google_sheets_catalog
  WHERE active = true AND target_connection_string IS NOT NULL AND target_connection_string != ''
  
  UNION
  
  SELECT DISTINCT source_db_engine as db_engine, source_connection_string as connection_string
  FROM metadata.data_warehouse_catalog
  WHERE active = true AND source_connection_string IS NOT NULL AND source_connection_string != ''
  
  UNION
  
  SELECT DISTINCT target_db_engine as db_engine, target_connection_string as connection_string
  FROM metadata.data_warehouse_catalog
  WHERE active = true AND target_connection_string IS NOT NULL AND target_connection_string != ''
  
  UNION
  
  SELECT DISTINCT source_db_engine as db_engine, source_connection_string as connection_string
  FROM metadata.data_vault_catalog
  WHERE active = true AND source_connection_string IS NOT NULL AND source_connection_string != ''
  
  UNION
  
  SELECT DISTINCT target_db_engine as db_engine, target_connection_string as connection_string
  FROM metadata.data_vault_catalog
  WHERE active = true AND target_connection_string IS NOT NULL AND target_connection_string != ''
  
  UNION
  
  SELECT DISTINCT target_db_engine as db_engine, target_connection_string as connection_string
  FROM metadata.api_catalog
  WHERE active = true AND target_connection_string IS NOT NULL AND target_connection_string != ''
  
  UNION
  
  SELECT DISTINCT source_db_engine as db_engine, source_connection_string as connection_string
  FROM metadata.custom_jobs
  WHERE active = true AND source_connection_string IS NOT NULL AND source_connection_string != ''
  
  UNION
  
  SELECT DISTINCT target_db_engine as db_engine, target_connection_string as connection_string
  FROM metadata.custom_jobs
  WHERE active = true AND target_connection_string IS NOT NULL AND target_connection_string != ''
)
SELECT DISTINCT
  db_engine,
  connection_string,
  CASE
    WHEN connection_string ~ '^postgresql://' OR connection_string ~ '^postgres://' THEN
      regexp_replace(connection_string, '://([^:]+):([^@]+)@', '://\1:***@', 'g')
    WHEN connection_string ~ '^mysql://' OR connection_string ~ '^mariadb://' THEN
      regexp_replace(connection_string, '://([^:]+):([^@]+)@', '://\1:***@', 'g')
    WHEN connection_string ~ '^mongodb://' OR connection_string ~ '^mongodb\+srv://' THEN
      regexp_replace(connection_string, '://([^:]+):([^@]+)@', '://\1:***@', 'g')
    WHEN connection_string ~ 'UID=' AND connection_string ~ 'PWD=' THEN
      regexp_replace(
        regexp_replace(connection_string, 'PWD=([^;]+)', 'PWD=***', 'g'),
        'Password=([^;]+)',
        'Password=***',
        'g'
      )
    WHEN connection_string ~ '^oracle://' THEN
      regexp_replace(connection_string, '://([^:]+):([^@]+)@', '://\1:***@', 'g')
    WHEN connection_string ~ 'password=' THEN
      regexp_replace(connection_string, 'password=([^;&]+)', 'password=***', 'gi')
    WHEN connection_string ~ 'pwd=' THEN
      regexp_replace(connection_string, 'pwd=([^;&]+)', 'pwd=***', 'gi')
    ELSE connection_string
  END as connection_string_masked
FROM all_connections
ORDER BY db_engine, connection_string;

COMMENT ON VIEW metadata.available_connections IS 'Vista consolidada de todas las conexiones disponibles en el sistema, con passwords censuradas para uso en frontend';
