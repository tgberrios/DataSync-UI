CREATE SCHEMA IF NOT EXISTS metadata;

CREATE TABLE IF NOT EXISTS metadata.rls_policies (
  policy_id SERIAL PRIMARY KEY,
  policy_name VARCHAR(255) UNIQUE NOT NULL,
  schema_name VARCHAR(100) NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  policy_expression TEXT NOT NULL,
  policy_type VARCHAR(20) DEFAULT 'SELECT',
  description TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rls_policies_schema_table ON metadata.rls_policies(schema_name, table_name);
CREATE INDEX IF NOT EXISTS idx_rls_policies_active ON metadata.rls_policies(active);
CREATE INDEX IF NOT EXISTS idx_rls_policies_type ON metadata.rls_policies(policy_type);

COMMENT ON TABLE metadata.rls_policies IS 'Stores Row-Level Security (RLS) policies';
COMMENT ON COLUMN metadata.rls_policies.policy_name IS 'Unique name for the RLS policy';
COMMENT ON COLUMN metadata.rls_policies.policy_expression IS 'SQL expression for the policy (e.g., user_id = current_user)';
COMMENT ON COLUMN metadata.rls_policies.policy_type IS 'Policy type: SELECT, INSERT, UPDATE, DELETE, ALL';

CREATE OR REPLACE FUNCTION metadata.create_rls_policy(
  p_schema_name VARCHAR,
  p_table_name VARCHAR,
  p_policy_name VARCHAR,
  p_policy_expression TEXT,
  p_policy_type VARCHAR DEFAULT 'SELECT'
) RETURNS VOID AS $$
DECLARE
  v_policy_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = p_schema_name
      AND tablename = p_table_name
      AND policyname = p_policy_name
  ) INTO v_policy_exists;

  IF v_policy_exists THEN
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I',
      p_policy_name, p_schema_name, p_table_name
    );
  END IF;

  EXECUTE format(
    'ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY',
    p_schema_name, p_table_name
  );

  CASE p_policy_type
    WHEN 'SELECT' THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I.%I FOR SELECT USING (%s)',
        p_policy_name, p_schema_name, p_table_name, p_policy_expression
      );
    WHEN 'INSERT' THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I.%I FOR INSERT WITH CHECK (%s)',
        p_policy_name, p_schema_name, p_table_name, p_policy_expression
      );
    WHEN 'UPDATE' THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I.%I FOR UPDATE USING (%s) WITH CHECK (%s)',
        p_policy_name, p_schema_name, p_table_name, p_policy_expression, p_policy_expression
      );
    WHEN 'DELETE' THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I.%I FOR DELETE USING (%s)',
        p_policy_name, p_schema_name, p_table_name, p_policy_expression
      );
    WHEN 'ALL' THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I.%I FOR ALL USING (%s) WITH CHECK (%s)',
        p_policy_name, p_schema_name, p_table_name, p_policy_expression, p_policy_expression
      );
    ELSE
      RAISE EXCEPTION 'Invalid policy type: %. Must be SELECT, INSERT, UPDATE, DELETE, or ALL', p_policy_type;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION metadata.create_rls_policy IS 'Creates a Row-Level Security policy on a table';

CREATE OR REPLACE FUNCTION metadata.drop_rls_policy(
  p_schema_name VARCHAR,
  p_table_name VARCHAR,
  p_policy_name VARCHAR
) RETURNS VOID AS $$
BEGIN
  EXECUTE format(
    'DROP POLICY IF EXISTS %I ON %I.%I',
    p_policy_name, p_schema_name, p_table_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION metadata.drop_rls_policy IS 'Drops a Row-Level Security policy';

CREATE OR REPLACE FUNCTION metadata.disable_rls(
  p_schema_name VARCHAR,
  p_table_name VARCHAR
) RETURNS VOID AS $$
BEGIN
  EXECUTE format(
    'ALTER TABLE %I.%I DISABLE ROW LEVEL SECURITY',
    p_schema_name, p_table_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION metadata.disable_rls IS 'Disables Row-Level Security on a table';

CREATE OR REPLACE FUNCTION metadata.get_rls_policies(
  p_schema_name VARCHAR DEFAULT NULL,
  p_table_name VARCHAR DEFAULT NULL
) RETURNS TABLE (
  schemaname VARCHAR,
  tablename VARCHAR,
  policyname VARCHAR,
  permissive VARCHAR,
  roles TEXT[],
  cmd VARCHAR,
  qual TEXT,
  with_check TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.schemaname::VARCHAR,
    p.tablename::VARCHAR,
    p.policyname::VARCHAR,
    p.permissive::VARCHAR,
    p.roles::TEXT[],
    p.cmd::VARCHAR,
    p.qual::TEXT,
    p.with_check::TEXT
  FROM pg_policies p
  WHERE (p_schema_name IS NULL OR p.schemaname = p_schema_name)
    AND (p_table_name IS NULL OR p.tablename = p_table_name)
  ORDER BY p.schemaname, p.tablename, p.policyname;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION metadata.get_rls_policies IS 'Returns all RLS policies for the specified schema/table';
