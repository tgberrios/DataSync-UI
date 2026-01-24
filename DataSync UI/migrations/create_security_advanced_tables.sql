-- Migration: Create Security Advanced Tables
-- Description: Creates tables for advanced security features: tokenization, anonymization, and fine-grained permissions
-- Date: 2026-01-23

BEGIN;

-- Extend masking_policies table with additional fields
DO $$
BEGIN
    -- Add masking_algorithm if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'metadata' 
        AND table_name = 'masking_policies' 
        AND column_name = 'masking_algorithm'
    ) THEN
        ALTER TABLE metadata.masking_policies
        ADD COLUMN masking_algorithm VARCHAR(50) DEFAULT 'random';
    END IF;

    -- Add preserve_format if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'metadata' 
        AND table_name = 'masking_policies' 
        AND column_name = 'preserve_format'
    ) THEN
        ALTER TABLE metadata.masking_policies
        ADD COLUMN preserve_format BOOLEAN DEFAULT false;
    END IF;

    -- Add mask_char if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'metadata' 
        AND table_name = 'masking_policies' 
        AND column_name = 'mask_char'
    ) THEN
        ALTER TABLE metadata.masking_policies
        ADD COLUMN mask_char CHAR(1) DEFAULT '*';
    END IF;

    -- Add visible_chars if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'metadata' 
        AND table_name = 'masking_policies' 
        AND column_name = 'visible_chars'
    ) THEN
        ALTER TABLE metadata.masking_policies
        ADD COLUMN visible_chars INTEGER DEFAULT 0;
    END IF;

    -- Add hash_algorithm if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'metadata' 
        AND table_name = 'masking_policies' 
        AND column_name = 'hash_algorithm'
    ) THEN
        ALTER TABLE metadata.masking_policies
        ADD COLUMN hash_algorithm VARCHAR(50) DEFAULT 'SHA256';
    END IF;
END $$;

-- Create tokenization_tokens table
CREATE TABLE IF NOT EXISTS metadata.tokenization_tokens (
    token_id SERIAL PRIMARY KEY,
    schema_name VARCHAR(100) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    column_name VARCHAR(100) NOT NULL,
    original_value TEXT NOT NULL,
    token_value TEXT NOT NULL,
    token_type INTEGER NOT NULL, -- 0: REVERSIBLE, 1: IRREVERSIBLE, 2: FPE
    encryption_key_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    last_accessed_at TIMESTAMP,
    access_count INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(schema_name, table_name, column_name, original_value)
);

COMMENT ON TABLE metadata.tokenization_tokens IS 'Stores tokenization mappings for sensitive data';
COMMENT ON COLUMN metadata.tokenization_tokens.token_type IS '0: REVERSIBLE, 1: IRREVERSIBLE, 2: FPE';
COMMENT ON COLUMN metadata.tokenization_tokens.encryption_key_id IS 'Reference to encryption key used for tokenization';

CREATE INDEX IF NOT EXISTS idx_tokenization_tokens_schema_table_column 
    ON metadata.tokenization_tokens(schema_name, table_name, column_name);
CREATE INDEX IF NOT EXISTS idx_tokenization_tokens_token_value 
    ON metadata.tokenization_tokens(token_value);
CREATE INDEX IF NOT EXISTS idx_tokenization_tokens_key_id 
    ON metadata.tokenization_tokens(encryption_key_id);

-- Create tokenization_keys table
CREATE TABLE IF NOT EXISTS metadata.tokenization_keys (
    key_id VARCHAR(255) PRIMARY KEY,
    key_material BYTEA NOT NULL, -- Encrypted key material
    algorithm VARCHAR(50) NOT NULL DEFAULT 'AES256',
    created_at TIMESTAMP DEFAULT NOW(),
    rotated_at TIMESTAMP,
    active BOOLEAN DEFAULT true
);

COMMENT ON TABLE metadata.tokenization_keys IS 'Stores encryption keys for tokenization';
COMMENT ON COLUMN metadata.tokenization_keys.key_material IS 'Encrypted key material - must be decrypted before use';

CREATE INDEX IF NOT EXISTS idx_tokenization_keys_active 
    ON metadata.tokenization_keys(active);
CREATE INDEX IF NOT EXISTS idx_tokenization_keys_created 
    ON metadata.tokenization_keys(created_at);

-- Create tokenization_audit table
CREATE TABLE IF NOT EXISTS metadata.tokenization_audit (
    audit_id SERIAL PRIMARY KEY,
    token_value TEXT NOT NULL,
    username VARCHAR(100) NOT NULL,
    reason TEXT,
    original_value TEXT NOT NULL,
    accessed_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE metadata.tokenization_audit IS 'Audit log for detokenization operations';
COMMENT ON COLUMN metadata.tokenization_audit.reason IS 'Justification for detokenization request';

CREATE INDEX IF NOT EXISTS idx_tokenization_audit_token 
    ON metadata.tokenization_audit(token_value);
CREATE INDEX IF NOT EXISTS idx_tokenization_audit_username 
    ON metadata.tokenization_audit(username);
CREATE INDEX IF NOT EXISTS idx_tokenization_audit_accessed 
    ON metadata.tokenization_audit(accessed_at);

-- Create anonymization_profiles table
CREATE TABLE IF NOT EXISTS metadata.anonymization_profiles (
    profile_id SERIAL PRIMARY KEY,
    profile_name VARCHAR(255) NOT NULL UNIQUE,
    schema_name VARCHAR(100) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    anonymization_type VARCHAR(50) NOT NULL 
        CHECK (anonymization_type IN ('K_ANONYMITY', 'L_DIVERSITY', 'T_CLOSENESS', 'DIFFERENTIAL_PRIVACY')),
    k_value INTEGER,
    l_value INTEGER,
    t_value DECIMAL(5,4),
    epsilon DECIMAL(10,8), -- For differential privacy
    quasi_identifiers TEXT[] NOT NULL,
    sensitive_attributes TEXT[],
    generalization_levels JSONB DEFAULT '{}'::jsonb,
    suppression_threshold DECIMAL(5,2) DEFAULT 0.0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE metadata.anonymization_profiles IS 'Stores anonymization profiles for datasets';
COMMENT ON COLUMN metadata.anonymization_profiles.anonymization_type IS 'Type of anonymization: K_ANONYMITY, L_DIVERSITY, T_CLOSENESS, DIFFERENTIAL_PRIVACY';
COMMENT ON COLUMN metadata.anonymization_profiles.epsilon IS 'Privacy budget for differential privacy';

CREATE INDEX IF NOT EXISTS idx_anonymization_profiles_schema_table 
    ON metadata.anonymization_profiles(schema_name, table_name);
CREATE INDEX IF NOT EXISTS idx_anonymization_profiles_active 
    ON metadata.anonymization_profiles(active);
CREATE INDEX IF NOT EXISTS idx_anonymization_profiles_type 
    ON metadata.anonymization_profiles(anonymization_type);

-- Create permission_policies table
CREATE TABLE IF NOT EXISTS metadata.permission_policies (
    policy_id SERIAL PRIMARY KEY,
    policy_name VARCHAR(255) NOT NULL UNIQUE,
    policy_type VARCHAR(50) NOT NULL 
        CHECK (policy_type IN ('COLUMN', 'ROW', 'TABLE')),
    schema_name VARCHAR(100),
    table_name VARCHAR(100),
    column_name VARCHAR(100),
    role_name VARCHAR(100),
    username VARCHAR(100),
    operation VARCHAR(50) NOT NULL 
        CHECK (operation IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')),
    condition_expression TEXT, -- SQL condition for ROW-level policies
    attribute_conditions JSONB DEFAULT '{}'::jsonb, -- For ABAC
    priority INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE metadata.permission_policies IS 'Stores fine-grained permission policies';
COMMENT ON COLUMN metadata.permission_policies.policy_type IS 'Type of policy: COLUMN, ROW, or TABLE';
COMMENT ON COLUMN metadata.permission_policies.condition_expression IS 'SQL WHERE clause for ROW-level policies';
COMMENT ON COLUMN metadata.permission_policies.attribute_conditions IS 'JSON conditions for Attribute-Based Access Control (ABAC)';
COMMENT ON COLUMN metadata.permission_policies.priority IS 'Higher priority policies are evaluated first';

CREATE INDEX IF NOT EXISTS idx_permission_policies_schema_table 
    ON metadata.permission_policies(schema_name, table_name);
CREATE INDEX IF NOT EXISTS idx_permission_policies_type 
    ON metadata.permission_policies(policy_type);
CREATE INDEX IF NOT EXISTS idx_permission_policies_role 
    ON metadata.permission_policies(role_name);
CREATE INDEX IF NOT EXISTS idx_permission_policies_username 
    ON metadata.permission_policies(username);
CREATE INDEX IF NOT EXISTS idx_permission_policies_active 
    ON metadata.permission_policies(active);
CREATE INDEX IF NOT EXISTS idx_permission_policies_operation 
    ON metadata.permission_policies(operation);

-- Create user_attributes table (for ABAC)
CREATE TABLE IF NOT EXISTS metadata.user_attributes (
    user_id VARCHAR(100) NOT NULL,
    attribute_name VARCHAR(100) NOT NULL,
    attribute_value TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, attribute_name)
);

COMMENT ON TABLE metadata.user_attributes IS 'Stores user attributes for Attribute-Based Access Control (ABAC)';
COMMENT ON COLUMN metadata.user_attributes.attribute_name IS 'Name of the attribute (e.g., department, clearance_level)';
COMMENT ON COLUMN metadata.user_attributes.attribute_value IS 'Value of the attribute';

CREATE INDEX IF NOT EXISTS idx_user_attributes_user_id 
    ON metadata.user_attributes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_attributes_name 
    ON metadata.user_attributes(attribute_name);

COMMIT;
