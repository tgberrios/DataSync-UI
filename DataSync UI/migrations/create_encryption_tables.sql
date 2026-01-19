CREATE SCHEMA IF NOT EXISTS metadata;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS metadata.encryption_policies (
  policy_id SERIAL PRIMARY KEY,
  policy_name VARCHAR(255) UNIQUE NOT NULL,
  schema_name VARCHAR(100) NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  column_name VARCHAR(100) NOT NULL,
  encryption_algorithm VARCHAR(50) DEFAULT 'AES256',
  key_id VARCHAR(100) NOT NULL,
  key_rotation_interval_days INTEGER DEFAULT 90,
  last_rotated_at TIMESTAMP,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(schema_name, table_name, column_name)
);

CREATE INDEX IF NOT EXISTS idx_encryption_policies_schema_table ON metadata.encryption_policies(schema_name, table_name);
CREATE INDEX IF NOT EXISTS idx_encryption_policies_active ON metadata.encryption_policies(active);
CREATE INDEX IF NOT EXISTS idx_encryption_policies_key_id ON metadata.encryption_policies(key_id);

COMMENT ON TABLE metadata.encryption_policies IS 'Stores encryption policies for sensitive columns';
COMMENT ON COLUMN metadata.encryption_policies.policy_name IS 'Unique name for the encryption policy';
COMMENT ON COLUMN metadata.encryption_policies.encryption_algorithm IS 'Encryption algorithm: AES128, AES192, AES256';
COMMENT ON COLUMN metadata.encryption_policies.key_id IS 'Identifier for the encryption key';
COMMENT ON COLUMN metadata.encryption_policies.key_rotation_interval_days IS 'Days between key rotations';

CREATE TABLE IF NOT EXISTS metadata.encryption_keys (
  key_id VARCHAR(100) PRIMARY KEY,
  key_value TEXT NOT NULL,
  algorithm VARCHAR(50) DEFAULT 'AES256',
  created_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP,
  rotation_count INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_encryption_keys_active ON metadata.encryption_keys(active);

COMMENT ON TABLE metadata.encryption_keys IS 'Stores encryption keys (keys should be managed securely)';
COMMENT ON COLUMN metadata.encryption_keys.key_value IS 'Encrypted key value (should be encrypted at application level)';

CREATE OR REPLACE FUNCTION metadata.encrypt_value(
  p_value TEXT,
  p_key_id VARCHAR
) RETURNS TEXT AS $$
DECLARE
  v_key_value TEXT;
BEGIN
  IF p_value IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT key_value INTO v_key_value
  FROM metadata.encryption_keys
  WHERE key_id = p_key_id AND active = true
  LIMIT 1;

  IF v_key_value IS NULL THEN
    RAISE EXCEPTION 'Encryption key not found: %', p_key_id;
  END IF;

  UPDATE metadata.encryption_keys
  SET last_used_at = NOW()
  WHERE key_id = p_key_id;

  RETURN encode(
    encrypt(p_value::bytea, v_key_value, 'aes'),
    'base64'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION metadata.encrypt_value IS 'Encrypts a value using the specified key';

CREATE OR REPLACE FUNCTION metadata.decrypt_value(
  p_encrypted_value TEXT,
  p_key_id VARCHAR
) RETURNS TEXT AS $$
DECLARE
  v_key_value TEXT;
BEGIN
  IF p_encrypted_value IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT key_value INTO v_key_value
  FROM metadata.encryption_keys
  WHERE key_id = p_key_id AND active = true
  LIMIT 1;

  IF v_key_value IS NULL THEN
    RAISE EXCEPTION 'Encryption key not found: %', p_key_id;
  END IF;

  UPDATE metadata.encryption_keys
  SET last_used_at = NOW()
  WHERE key_id = p_key_id;

  RETURN convert_from(
    decrypt(decode(p_encrypted_value, 'base64'), v_key_value, 'aes'),
    'UTF8'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION metadata.decrypt_value IS 'Decrypts a value using the specified key';

CREATE OR REPLACE FUNCTION metadata.create_encrypted_view(
  p_schema_name VARCHAR,
  p_table_name VARCHAR
) RETURNS VARCHAR AS $$
DECLARE
  v_view_name VARCHAR;
  v_select_clause TEXT;
  v_column RECORD;
  v_key_id VARCHAR;
BEGIN
  v_view_name := p_schema_name || '_encrypted_' || p_table_name;

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

    SELECT key_id INTO v_key_id
    FROM metadata.encryption_policies
    WHERE schema_name = p_schema_name
      AND table_name = p_table_name
      AND column_name = v_column.column_name
      AND active = true
    LIMIT 1;

    IF v_key_id IS NOT NULL THEN
      v_select_clause := v_select_clause || 
        'metadata.decrypt_value(' || quote_ident(v_column.column_name) || '::TEXT, ' ||
        quote_literal(v_key_id) || ') ' ||
        'AS ' || quote_ident(v_column.column_name);
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

COMMENT ON FUNCTION metadata.create_encrypted_view IS 'Creates a view with decrypted columns based on active encryption policies';

CREATE OR REPLACE FUNCTION metadata.rotate_encryption_key(
  p_policy_id INTEGER,
  p_new_key_id VARCHAR
) RETURNS VOID AS $$
DECLARE
  v_old_key_id VARCHAR;
  v_schema_name VARCHAR;
  v_table_name VARCHAR;
  v_column_name VARCHAR;
  v_sql TEXT;
BEGIN
  SELECT key_id, schema_name, table_name, column_name
  INTO v_old_key_id, v_schema_name, v_table_name, v_column_name
  FROM metadata.encryption_policies
  WHERE policy_id = p_policy_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Encryption policy not found: %', p_policy_id;
  END IF;

  v_sql := format(
    'UPDATE %I.%I SET %I = encode(encrypt(metadata.decrypt_value(%I::TEXT, %L)::bytea, %L, ''aes''), ''base64'')',
    v_schema_name, v_table_name, v_column_name, v_column_name, v_old_key_id, p_new_key_id
  );

  EXECUTE v_sql;

  UPDATE metadata.encryption_policies
  SET key_id = p_new_key_id,
      last_rotated_at = NOW(),
      updated_at = NOW()
  WHERE policy_id = p_policy_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION metadata.rotate_encryption_key IS 'Rotates encryption key for a policy and re-encrypts all data';
