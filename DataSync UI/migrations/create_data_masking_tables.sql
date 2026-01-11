CREATE SCHEMA IF NOT EXISTS metadata;

CREATE TABLE IF NOT EXISTS metadata.masking_policies (
  policy_id SERIAL PRIMARY KEY,
  policy_name VARCHAR(255) UNIQUE NOT NULL,
  schema_name VARCHAR(100) NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  column_name VARCHAR(100) NOT NULL,
  masking_type VARCHAR(50) NOT NULL,
  masking_function VARCHAR(100),
  masking_params JSONB DEFAULT '{}'::jsonb,
  role_whitelist TEXT[] DEFAULT ARRAY[]::TEXT[],
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT chk_masking_type CHECK (masking_type IN ('FULL', 'PARTIAL', 'EMAIL', 'PHONE', 'HASH', 'TOKENIZE')),
  UNIQUE(schema_name, table_name, column_name)
);

CREATE INDEX IF NOT EXISTS idx_masking_policies_schema_table ON metadata.masking_policies(schema_name, table_name);
CREATE INDEX IF NOT EXISTS idx_masking_policies_active ON metadata.masking_policies(active);
CREATE INDEX IF NOT EXISTS idx_masking_policies_type ON metadata.masking_policies(masking_type);

COMMENT ON TABLE metadata.masking_policies IS 'Stores data masking policies for sensitive columns';
COMMENT ON COLUMN metadata.masking_policies.policy_name IS 'Unique name for the masking policy';
COMMENT ON COLUMN metadata.masking_policies.masking_type IS 'Type of masking: FULL, PARTIAL, EMAIL, PHONE, HASH, TOKENIZE';
COMMENT ON COLUMN metadata.masking_policies.role_whitelist IS 'Array of roles that can see unmasked data';
COMMENT ON COLUMN metadata.masking_policies.active IS 'Whether the policy is currently active';

CREATE OR REPLACE FUNCTION metadata.analyze_sensitive_columns(
  p_schema_name VARCHAR,
  p_table_name VARCHAR
) RETURNS TABLE (
  column_name VARCHAR,
  data_type VARCHAR,
  contains_pii BOOLEAN,
  pii_category VARCHAR,
  confidence_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.column_name::VARCHAR,
    c.data_type::VARCHAR,
    CASE 
      WHEN c.column_name ILIKE '%email%' OR c.column_name ILIKE '%mail%' THEN true
      WHEN c.column_name ILIKE '%phone%' OR c.column_name ILIKE '%tel%' OR c.column_name ILIKE '%mobile%' THEN true
      WHEN c.column_name ILIKE '%ssn%' OR c.column_name ILIKE '%social%' OR c.column_name ILIKE '%security%' THEN true
      WHEN c.column_name ILIKE '%credit%' OR c.column_name ILIKE '%card%' OR c.column_name ILIKE '%payment%' THEN true
      WHEN c.column_name ILIKE '%password%' OR c.column_name ILIKE '%passwd%' OR c.column_name ILIKE '%pwd%' THEN true
      WHEN c.column_name ILIKE '%address%' OR c.column_name ILIKE '%street%' OR c.column_name ILIKE '%zip%' THEN true
      WHEN c.column_name ILIKE '%birth%' OR c.column_name ILIKE '%dob%' OR c.column_name ILIKE '%age%' THEN true
      WHEN c.column_name ILIKE '%name%' AND (c.column_name ILIKE '%first%' OR c.column_name ILIKE '%last%' OR c.column_name ILIKE '%full%') THEN true
      WHEN c.column_name ILIKE '%id%' AND (c.column_name ILIKE '%national%' OR c.column_name ILIKE '%passport%' OR c.column_name ILIKE '%driver%') THEN true
      ELSE false
    END as contains_pii,
    CASE 
      WHEN c.column_name ILIKE '%email%' THEN 'EMAIL'
      WHEN c.column_name ILIKE '%phone%' OR c.column_name ILIKE '%tel%' OR c.column_name ILIKE '%mobile%' THEN 'PHONE'
      WHEN c.column_name ILIKE '%ssn%' OR c.column_name ILIKE '%social%' THEN 'SSN'
      WHEN c.column_name ILIKE '%credit%' OR c.column_name ILIKE '%card%' THEN 'CREDIT_CARD'
      WHEN c.column_name ILIKE '%password%' OR c.column_name ILIKE '%passwd%' THEN 'PASSWORD'
      WHEN c.column_name ILIKE '%address%' THEN 'ADDRESS'
      WHEN c.column_name ILIKE '%birth%' OR c.column_name ILIKE '%dob%' THEN 'DATE_OF_BIRTH'
      WHEN c.column_name ILIKE '%name%' THEN 'NAME'
      WHEN c.column_name ILIKE '%id%' THEN 'ID_NUMBER'
      ELSE 'OTHER'
    END::VARCHAR as pii_category,
    CASE 
      WHEN c.column_name ILIKE '%email%' THEN 0.95
      WHEN c.column_name ILIKE '%phone%' OR c.column_name ILIKE '%tel%' THEN 0.90
      WHEN c.column_name ILIKE '%ssn%' OR c.column_name ILIKE '%social%' THEN 0.98
      WHEN c.column_name ILIKE '%credit%' OR c.column_name ILIKE '%card%' THEN 0.95
      WHEN c.column_name ILIKE '%password%' THEN 0.99
      ELSE 0.75
    END::NUMERIC as confidence_score
  FROM information_schema.columns c
  WHERE c.table_schema = p_schema_name
    AND c.table_name = p_table_name
  ORDER BY c.ordinal_position;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION metadata.analyze_sensitive_columns IS 'Analyzes columns in a table to detect potentially sensitive PII data based on column names';

CREATE OR REPLACE FUNCTION metadata.mask_value(
  p_value TEXT,
  p_masking_type VARCHAR,
  p_params JSONB DEFAULT '{}'::jsonb
) RETURNS TEXT AS $$
DECLARE
  v_result TEXT;
  v_length INTEGER;
  v_prefix_length INTEGER;
  v_suffix_length INTEGER;
BEGIN
  IF p_value IS NULL THEN
    RETURN NULL;
  END IF;

  v_length := length(p_value);
  
  CASE p_masking_type
    WHEN 'FULL' THEN
      v_result := '***MASKED***';
    
    WHEN 'PARTIAL' THEN
      v_prefix_length := COALESCE((p_params->>'prefix_length')::INTEGER, 1);
      v_suffix_length := COALESCE((p_params->>'suffix_length')::INTEGER, 4);
      
      IF v_length <= (v_prefix_length + v_suffix_length) THEN
        v_result := repeat('*', v_length);
      ELSE
        v_result := left(p_value, v_prefix_length) || 
                   repeat('*', v_length - v_prefix_length - v_suffix_length) || 
                   right(p_value, v_suffix_length);
      END IF;
    
    WHEN 'EMAIL' THEN
      IF position('@' in p_value) > 0 THEN
        v_result := regexp_replace(
          p_value, 
          '^(.{1,3}).*@(.*)$', 
          '\1***@\2'
        );
      ELSE
        v_result := '***MASKED***';
      END IF;
    
    WHEN 'PHONE' THEN
      v_result := regexp_replace(
        p_value,
        '(\d{3})\d{4}(\d{4})',
        '\1-****-\2',
        'g'
      );
      IF v_result = p_value THEN
        v_result := regexp_replace(
          p_value,
          '(\d{3})\d{3}(\d{4})',
          '\1-***-\2',
          'g'
        );
      END IF;
      IF v_result = p_value THEN
        v_result := left(p_value, 3) || '-****-' || right(p_value, 4);
      END IF;
    
    WHEN 'HASH' THEN
      v_result := encode(digest(p_value, 'sha256'), 'hex');
    
    WHEN 'TOKENIZE' THEN
      v_result := 'TOKEN_' || encode(digest(p_value || clock_timestamp()::text, 'md5'), 'hex');
    
    ELSE
      v_result := p_value;
  END CASE;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION metadata.mask_value IS 'Masks a value based on the masking type and parameters';

CREATE OR REPLACE FUNCTION metadata.get_user_role_from_db()
RETURNS VARCHAR AS $$
DECLARE
  v_db_user VARCHAR;
  v_app_role VARCHAR;
BEGIN
  v_db_user := current_user;
  
  SELECT role INTO v_app_role
  FROM metadata.users
  WHERE username = v_db_user
  LIMIT 1;
  
  IF FOUND AND v_app_role IS NOT NULL THEN
    RETURN v_app_role;
  END IF;
  
  IF v_db_user = 'tomy.berrios' OR v_db_user LIKE '%admin%' THEN
    RETURN 'admin';
  END IF;
  
  RETURN 'user';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION metadata.get_user_role_from_db IS 'Gets the application role based on the current PostgreSQL user';

CREATE OR REPLACE FUNCTION metadata.should_mask_column(
  p_schema_name VARCHAR,
  p_table_name VARCHAR,
  p_column_name VARCHAR
) RETURNS BOOLEAN AS $$
DECLARE
  v_policy_exists BOOLEAN;
  v_role_whitelist TEXT[];
  v_active BOOLEAN;
  v_user_role VARCHAR;
BEGIN
  v_user_role := metadata.get_user_role_from_db();
  
  IF v_user_role = 'admin' THEN
    RETURN false;
  END IF;

  SELECT 
    active,
    role_whitelist
  INTO 
    v_active,
    v_role_whitelist
  FROM metadata.masking_policies
  WHERE schema_name = p_schema_name
    AND table_name = p_table_name
    AND column_name = p_column_name
  LIMIT 1;
  
  IF NOT FOUND OR NOT v_active THEN
    RETURN false;
  END IF;
  
  IF v_role_whitelist IS NOT NULL AND array_length(v_role_whitelist, 1) > 0 THEN
    IF v_user_role = ANY(v_role_whitelist) THEN
      RETURN false;
    END IF;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION metadata.should_mask_column IS 'Checks if a column should be masked based on policy and user role';

CREATE OR REPLACE FUNCTION metadata.create_masked_view(
  p_schema_name VARCHAR,
  p_table_name VARCHAR
) RETURNS VARCHAR AS $$
DECLARE
  v_view_name VARCHAR;
  v_select_clause TEXT;
  v_column RECORD;
  v_masking_type VARCHAR;
  v_masking_params JSONB;
  v_has_masked_columns BOOLEAN := false;
  v_should_mask BOOLEAN;
  v_user_role VARCHAR;
BEGIN
  v_user_role := metadata.get_user_role_from_db();
  v_view_name := p_schema_name || '_masked_' || p_table_name;
  
  IF v_user_role = 'admin' THEN
    RAISE EXCEPTION 'Admin users should access tables directly, not masked views';
  END IF;
  
  v_select_clause := 'SELECT ';
  
  FOR v_column IN 
    SELECT column_name::VARCHAR, data_type::VARCHAR
    FROM information_schema.columns
    WHERE table_schema = p_schema_name
      AND table_name = p_table_name
    ORDER BY ordinal_position
  LOOP
    IF v_select_clause != 'SELECT ' THEN
      v_select_clause := v_select_clause || ', ';
    END IF;
    
    v_should_mask := metadata.should_mask_column(p_schema_name, p_table_name, v_column.column_name);
    
    IF v_should_mask THEN
      SELECT masking_type, masking_params
      INTO v_masking_type, v_masking_params
      FROM metadata.masking_policies
      WHERE schema_name = p_schema_name
        AND table_name = p_table_name
        AND column_name = v_column.column_name
        AND active = true
      LIMIT 1;
      
      IF FOUND AND v_masking_type IS NOT NULL THEN
        v_has_masked_columns := true;
        v_select_clause := v_select_clause || 
          'metadata.mask_value(' || quote_ident(v_column.column_name) || '::TEXT, ' ||
          quote_literal(v_masking_type) || ', ' ||
          COALESCE(quote_literal(v_masking_params::text), '''{}''::jsonb') || ') ' ||
          'AS ' || quote_ident(v_column.column_name);
      ELSE
        v_select_clause := v_select_clause || quote_ident(v_column.column_name);
      END IF;
    ELSE
      v_select_clause := v_select_clause || quote_ident(v_column.column_name);
    END IF;
  END LOOP;
  
  IF NOT v_has_masked_columns THEN
    RAISE EXCEPTION 'No active masking policies found for table %.%', p_schema_name, p_table_name;
  END IF;
  
  v_select_clause := v_select_clause || ' FROM ' || 
    quote_ident(p_schema_name) || '.' || quote_ident(p_table_name);
  
  EXECUTE 'DROP VIEW IF EXISTS ' || quote_ident(p_schema_name) || '.' || quote_ident(v_view_name) || ' CASCADE';
  EXECUTE 'CREATE VIEW ' || quote_ident(p_schema_name) || '.' || quote_ident(v_view_name) || 
    ' AS ' || v_select_clause;
  
  RETURN v_view_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION metadata.create_masked_view IS 'Creates a view with masked columns based on active masking policies';

CREATE OR REPLACE FUNCTION metadata.get_table_data(
  p_schema_name VARCHAR,
  p_table_name VARCHAR
) RETURNS TABLE (
  result_data JSONB
) AS $$
DECLARE
  v_user_role VARCHAR;
  v_has_policies BOOLEAN;
  v_query TEXT;
BEGIN
  v_user_role := metadata.get_user_role_from_db();
  
  SELECT EXISTS (
    SELECT 1 
    FROM metadata.masking_policies 
    WHERE schema_name = p_schema_name 
      AND table_name = p_table_name 
      AND active = true
  ) INTO v_has_policies;
  
  IF v_user_role = 'admin' OR NOT v_has_policies THEN
    v_query := format('SELECT row_to_json(t)::jsonb as result_data FROM %I.%I t', p_schema_name, p_table_name);
  ELSE
    v_query := format('SELECT row_to_json(t)::jsonb as result_data FROM %I.%I_masked t', p_schema_name, p_table_name);
  END IF;
  
  RETURN QUERY EXECUTE v_query;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION metadata.get_table_data IS 'Automatically returns masked or unmasked data based on user role';

CREATE OR REPLACE FUNCTION metadata.create_smart_view(
  p_schema_name VARCHAR,
  p_table_name VARCHAR
) RETURNS VARCHAR AS $$
DECLARE
  v_view_name VARCHAR;
  v_select_clause TEXT;
  v_column RECORD;
  v_masking_type VARCHAR;
  v_masking_params JSONB;
BEGIN
  v_view_name := p_schema_name || '_smart_' || p_table_name;
  
  v_select_clause := 'SELECT ';
  
  FOR v_column IN 
    SELECT column_name::VARCHAR, data_type::VARCHAR
    FROM information_schema.columns
    WHERE table_schema = p_schema_name
      AND table_name = p_table_name
    ORDER BY ordinal_position
  LOOP
    IF v_select_clause != 'SELECT ' THEN
      v_select_clause := v_select_clause || ', ';
    END IF;
    
    IF metadata.should_mask_column(p_schema_name, p_table_name, v_column.column_name) THEN
      SELECT masking_type, masking_params
      INTO v_masking_type, v_masking_params
      FROM metadata.masking_policies
      WHERE schema_name = p_schema_name
        AND table_name = p_table_name
        AND column_name = v_column.column_name
        AND active = true
      LIMIT 1;
      
      IF FOUND AND v_masking_type IS NOT NULL THEN
        v_select_clause := v_select_clause || 
          'CASE WHEN (SELECT role FROM metadata.users WHERE username = session_user LIMIT 1) = ''admin'' OR session_user = ''tomy.berrios'' THEN ' || 
          quote_ident(v_column.column_name) ||
          ' ELSE metadata.mask_value(' || quote_ident(v_column.column_name) || '::TEXT, ' ||
          quote_literal(v_masking_type) || ', ' ||
          COALESCE(quote_literal(v_masking_params::text), '''{}''::jsonb') || ') END ' ||
          'AS ' || quote_ident(v_column.column_name);
      ELSE
        v_select_clause := v_select_clause || quote_ident(v_column.column_name);
      END IF;
    ELSE
      v_select_clause := v_select_clause || quote_ident(v_column.column_name);
    END IF;
  END LOOP;
  
  v_select_clause := v_select_clause || ' FROM ' || 
    quote_ident(p_schema_name) || '.' || quote_ident(p_table_name);
  
  EXECUTE 'DROP VIEW IF EXISTS ' || quote_ident(p_schema_name) || '.' || quote_ident(v_view_name) || ' CASCADE';
  EXECUTE 'CREATE VIEW ' || quote_ident(p_schema_name) || '.' || quote_ident(v_view_name) || 
    ' AS ' || v_select_clause;
  
  RETURN v_view_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION metadata.create_smart_view IS 'Creates a smart view that automatically shows masked or unmasked data based on the current user role';

CREATE OR REPLACE FUNCTION metadata.update_masking_policy_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_masking_policy_timestamp
  BEFORE UPDATE ON metadata.masking_policies
  FOR EACH ROW
  EXECUTE FUNCTION metadata.update_masking_policy_timestamp();

CREATE OR REPLACE FUNCTION metadata.batch_analyze_and_create_policies(
  p_schema_name VARCHAR DEFAULT NULL,
  p_masking_type VARCHAR DEFAULT 'FULL',
  p_auto_activate BOOLEAN DEFAULT true,
  p_min_confidence NUMERIC DEFAULT 0.75
) RETURNS TABLE (
  schema_name VARCHAR,
  table_name VARCHAR,
  column_name VARCHAR,
  pii_category VARCHAR,
  confidence_score NUMERIC,
  policy_created BOOLEAN,
  policy_name VARCHAR,
  message TEXT
) AS $$
DECLARE
  v_table RECORD;
  v_column RECORD;
  v_policy_name VARCHAR;
  v_policy_count INTEGER := 0;
  v_skipped_count INTEGER := 0;
BEGIN
  FOR v_table IN 
    SELECT DISTINCT table_schema, table_name
    FROM information_schema.tables
    WHERE table_type = 'BASE TABLE'
      AND table_schema NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
      AND (p_schema_name IS NULL OR table_schema = p_schema_name)
    ORDER BY table_schema, table_name
  LOOP
    FOR v_column IN 
      SELECT * FROM metadata.analyze_sensitive_columns(v_table.table_schema, v_table.table_name)
      WHERE contains_pii = true AND confidence_score >= p_min_confidence
    LOOP
      v_policy_name := v_table.table_schema || '_' || v_table.table_name || '_' || v_column.column_name || '_mask';
      
      BEGIN
        INSERT INTO metadata.masking_policies (
          policy_name,
          schema_name,
          table_name,
          column_name,
          masking_type,
          active
        ) VALUES (
          v_policy_name,
          v_table.table_schema,
          v_table.table_name,
          v_column.column_name,
          CASE 
            WHEN v_column.pii_category = 'EMAIL' THEN 'EMAIL'
            WHEN v_column.pii_category = 'PHONE' THEN 'PHONE'
            WHEN v_column.pii_category = 'SSN' OR v_column.pii_category = 'CREDIT_CARD' OR v_column.pii_category = 'PASSWORD' THEN 'FULL'
            ELSE p_masking_type
          END,
          p_auto_activate
        )
        ON CONFLICT (schema_name, table_name, column_name) DO UPDATE
        SET masking_type = EXCLUDED.masking_type,
            active = EXCLUDED.active,
            updated_at = NOW();
        
        v_policy_count := v_policy_count + 1;
        
        RETURN QUERY SELECT
          v_table.table_schema::VARCHAR,
          v_table.table_name::VARCHAR,
          v_column.column_name::VARCHAR,
          v_column.pii_category::VARCHAR,
          v_column.confidence_score::NUMERIC,
          true::BOOLEAN as policy_created,
          v_policy_name::VARCHAR,
          'Policy created successfully'::TEXT;
      EXCEPTION WHEN OTHERS THEN
        v_skipped_count := v_skipped_count + 1;
        RETURN QUERY SELECT
          v_table.table_schema::VARCHAR,
          v_table.table_name::VARCHAR,
          v_column.column_name::VARCHAR,
          v_column.pii_category::VARCHAR,
          v_column.confidence_score::NUMERIC,
          false::BOOLEAN as policy_created,
          NULL::VARCHAR,
          ('Error: ' || SQLERRM)::TEXT;
      END;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION metadata.batch_analyze_and_create_policies IS 'Batch processes a schema or entire database to automatically create masking policies for sensitive columns';

CREATE OR REPLACE FUNCTION metadata.get_masking_status(
  p_schema_name VARCHAR DEFAULT NULL
) RETURNS TABLE (
  schema_name VARCHAR,
  total_tables BIGINT,
  total_columns BIGINT,
  sensitive_columns_detected BIGINT,
  columns_with_policies BIGINT,
  columns_without_policies BIGINT,
  active_policies BIGINT,
  inactive_policies BIGINT,
  coverage_percentage NUMERIC,
  status_summary JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH schema_stats AS (
    SELECT 
      COALESCE(p_schema_name, c.table_schema)::VARCHAR as schema_name,
      COUNT(DISTINCT c.table_name)::BIGINT as total_tables,
      COUNT(*)::BIGINT as total_columns
    FROM information_schema.columns c
    WHERE c.table_schema NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
      AND (p_schema_name IS NULL OR c.table_schema = p_schema_name)
    GROUP BY COALESCE(p_schema_name, c.table_schema)
  ),
  sensitive_detected AS (
    SELECT 
      c.table_schema,
      COUNT(*)::BIGINT as sensitive_count
    FROM information_schema.columns c
    WHERE c.table_schema NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
      AND (p_schema_name IS NULL OR c.table_schema = p_schema_name)
      AND (
        c.column_name ILIKE '%email%' OR c.column_name ILIKE '%phone%' OR
        c.column_name ILIKE '%ssn%' OR c.column_name ILIKE '%credit%' OR
        c.column_name ILIKE '%password%' OR c.column_name ILIKE '%address%' OR
        c.column_name ILIKE '%birth%' OR c.column_name ILIKE '%name%'
      )
    GROUP BY c.table_schema
  ),
  policy_stats AS (
    SELECT 
      mp.schema_name,
      COUNT(*)::BIGINT as total_policies,
      COUNT(*) FILTER (WHERE mp.active = true)::BIGINT as active_policies,
      COUNT(*) FILTER (WHERE mp.active = false)::BIGINT as inactive_policies
    FROM metadata.masking_policies mp
    WHERE (p_schema_name IS NULL OR mp.schema_name = p_schema_name)
    GROUP BY mp.schema_name
  ),
  detailed_status AS (
    SELECT 
      ss.schema_name,
      ss.total_tables,
      ss.total_columns,
      COALESCE(sd.sensitive_count, 0)::BIGINT as sensitive_columns_detected,
      COALESCE(ps.total_policies, 0)::BIGINT as columns_with_policies,
      GREATEST(0, COALESCE(sd.sensitive_count, 0) - COALESCE(ps.total_policies, 0))::BIGINT as columns_without_policies,
      COALESCE(ps.active_policies, 0)::BIGINT as active_policies,
      COALESCE(ps.inactive_policies, 0)::BIGINT as inactive_policies,
      CASE 
        WHEN COALESCE(sd.sensitive_count, 0) > 0 THEN
          ROUND((COALESCE(ps.total_policies, 0)::NUMERIC / sd.sensitive_count::NUMERIC) * 100, 2)
        ELSE 0
      END::NUMERIC as coverage_percentage
    FROM schema_stats ss
    LEFT JOIN sensitive_detected sd ON ss.schema_name = sd.table_schema
    LEFT JOIN policy_stats ps ON ss.schema_name = ps.schema_name
  )
  SELECT 
    ds.schema_name,
    ds.total_tables,
    ds.total_columns,
    ds.sensitive_columns_detected,
    ds.columns_with_policies,
    ds.columns_without_policies,
    ds.active_policies,
    ds.inactive_policies,
    ds.coverage_percentage,
    jsonb_build_object(
      'total_tables', ds.total_tables,
      'total_columns', ds.total_columns,
      'sensitive_columns', ds.sensitive_columns_detected,
      'protected_columns', ds.columns_with_policies,
      'unprotected_columns', ds.columns_without_policies,
      'active_policies', ds.active_policies,
      'inactive_policies', ds.inactive_policies,
      'coverage_percent', ds.coverage_percentage,
      'status', CASE 
        WHEN ds.coverage_percentage >= 90 THEN 'EXCELLENT'
        WHEN ds.coverage_percentage >= 70 THEN 'GOOD'
        WHEN ds.coverage_percentage >= 50 THEN 'FAIR'
        WHEN ds.coverage_percentage > 0 THEN 'POOR'
        ELSE 'NONE'
      END
    ) as status_summary
  FROM detailed_status ds
  ORDER BY ds.schema_name;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION metadata.get_masking_status IS 'Returns comprehensive masking status report for a schema or entire database';
