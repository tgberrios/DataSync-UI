-- Migration: Add ANALYTICS and REPORTING roles
-- These roles have controlled access to encrypted/masked views

-- Update users table constraint to include new roles
ALTER TABLE metadata.users 
DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE metadata.users 
ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'user', 'viewer', 'analytics', 'reporting'));

-- Update get_user_role_from_db function to handle new roles
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

-- Update should_mask_column to handle ANALYTICS and REPORTING roles
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

  IF v_user_role = 'analytics' THEN
    RETURN false;
  END IF;

  IF v_user_role = 'reporting' THEN
    RETURN true;
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

-- Function to check if user can access encrypted views
CREATE OR REPLACE FUNCTION metadata.can_access_encrypted_view(
  p_schema_name VARCHAR,
  p_table_name VARCHAR
) RETURNS BOOLEAN AS $$
DECLARE
  v_user_role VARCHAR;
  v_has_encryption BOOLEAN;
BEGIN
  v_user_role := metadata.get_user_role_from_db();
  
  IF v_user_role = 'admin' THEN
    RETURN true;
  END IF;

  SELECT EXISTS(
    SELECT 1 
    FROM metadata.encryption_policies
    WHERE schema_name = p_schema_name
      AND table_name = p_table_name
      AND active = true
  ) INTO v_has_encryption;

  IF NOT v_has_encryption THEN
    RETURN true;
  END IF;

  IF v_user_role = 'analytics' THEN
    RETURN true;
  END IF;

  IF v_user_role = 'reporting' THEN
    RETURN false;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION metadata.can_access_encrypted_view IS 'Checks if user role can access encrypted views (analytics: yes, reporting: no)';

-- Function to check if user can access masked views
CREATE OR REPLACE FUNCTION metadata.can_access_masked_view(
  p_schema_name VARCHAR,
  p_table_name VARCHAR
) RETURNS BOOLEAN AS $$
DECLARE
  v_user_role VARCHAR;
  v_has_masking BOOLEAN;
BEGIN
  v_user_role := metadata.get_user_role_from_db();
  
  IF v_user_role = 'admin' THEN
    RETURN true;
  END IF;

  SELECT EXISTS(
    SELECT 1 
    FROM metadata.masking_policies
    WHERE schema_name = p_schema_name
      AND table_name = p_table_name
      AND active = true
  ) INTO v_has_masking;

  IF NOT v_has_masking THEN
    RETURN true;
  END IF;

  IF v_user_role = 'analytics' THEN
    RETURN false;
  END IF;

  IF v_user_role = 'reporting' THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION metadata.can_access_masked_view IS 'Checks if user role can access masked views (analytics: no, reporting: yes)';

-- Update create_masked_view to handle new roles
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

  IF v_user_role = 'analytics' THEN
    RAISE EXCEPTION 'Analytics users should access encrypted views, not masked views';
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
      v_has_masked_columns := true;
      
      SELECT masking_type, masking_params
      INTO v_masking_type, v_masking_params
      FROM metadata.masking_policies
      WHERE schema_name = p_schema_name
        AND table_name = p_table_name
        AND column_name = v_column.column_name
        AND active = true
      LIMIT 1;
      
      IF v_masking_type = 'FULL' THEN
        v_select_clause := v_select_clause || 'NULL::' || v_column.data_type || ' AS ' || v_column.column_name;
      ELSIF v_masking_type = 'PARTIAL' THEN
        v_select_clause := v_select_clause || 
          'CASE ' ||
          'WHEN LENGTH(' || v_column.column_name || '::TEXT) <= 4 THEN ' || v_column.column_name ||
          'ELSE LEFT(' || v_column.column_name || '::TEXT, 2) || REPEAT(''*'', LENGTH(' || v_column.column_name || '::TEXT) - 4) || RIGHT(' || v_column.column_name || '::TEXT, 2) ' ||
          'END::' || v_column.data_type || ' AS ' || v_column.column_name;
      ELSIF v_masking_type = 'HASH' THEN
        v_select_clause := v_select_clause || 'MD5(' || v_column.column_name || '::TEXT)::' || v_column.data_type || ' AS ' || v_column.column_name;
      ELSE
        v_select_clause := v_select_clause || v_column.column_name;
      END IF;
    ELSE
      v_select_clause := v_select_clause || v_column.column_name;
    END IF;
  END LOOP;
  
  IF NOT v_has_masked_columns THEN
    RAISE EXCEPTION 'No masking policies found for this table';
  END IF;
  
  v_select_clause := v_select_clause || ' FROM ' || quote_ident(p_schema_name) || '.' || quote_ident(p_table_name);
  
  EXECUTE 'DROP VIEW IF EXISTS ' || quote_ident(p_schema_name) || '.' || quote_ident(v_view_name);
  EXECUTE 'CREATE VIEW ' || quote_ident(p_schema_name) || '.' || quote_ident(v_view_name) || ' AS ' || v_select_clause;
  
  RETURN v_view_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION metadata.create_masked_view IS 'Creates a masked view for reporting users';
