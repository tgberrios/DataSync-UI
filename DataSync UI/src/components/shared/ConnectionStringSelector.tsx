import React, { useState, useEffect, useMemo, useRef } from 'react';
import styled from 'styled-components';
import { FormGroup, Label, Button } from './BaseComponents';
import { theme } from '../../theme/theme';
import { S3ConnectionConfig } from './S3ConnectionConfig';
import { FTPConnectionConfig } from './FTPConnectionConfig';
import { EmailConnectionConfig } from './EmailConnectionConfig';
import { AzureBlobConnectionConfig } from './AzureBlobConnectionConfig';
import { GCSConnectionConfig } from './GCSConnectionConfig';

const ConnectionSelect = styled.select`
  width: 100%;
  padding: 8px 12px;
  margin-bottom: 8px;
  border: 1px solid ${theme.colors.border.medium};
  border-radius: ${theme.borderRadius.md};
  font-size: 12px;
  font-family: 'Consolas', monospace;
  background-color: ${theme.colors.background.main};
  color: ${theme.colors.text.primary};
  cursor: pointer;
  transition: all ${theme.transitions.normal};
  
  &:focus {
    outline: none;
    border-color: ${theme.colors.primary.main};
    box-shadow: 0 0 0 2px ${theme.colors.primary.light}33;
  }
  
  &:hover {
    border-color: ${theme.colors.primary.main};
  }
  
  option {
    font-family: 'Consolas', monospace;
    font-size: 12px;
    padding: 4px;
  }
`;

const Textarea = styled.textarea`
  padding: 8px 12px;
  border: 1px solid ${theme.colors.border.medium};
  border-radius: ${theme.borderRadius.md};
  font-family: 'Consolas', monospace;
  background: ${theme.colors.background.main};
  color: ${theme.colors.text.primary};
  font-size: 12px;
  width: 100%;
  min-height: 80px;
  resize: vertical;
  
  &:focus {
    outline: none;
    border-color: ${theme.colors.primary.main};
    box-shadow: 0 0 0 2px ${theme.colors.primary.light}33;
  }
`;

const ConnectionTestResult = styled.div<{ $success: boolean }>`
  margin-top: 8px;
  padding: 8px 12px;
  border-radius: ${theme.borderRadius.sm};
  font-size: 0.9em;
  background-color: ${props => props.$success 
    ? theme.colors.status.success.bg 
    : theme.colors.status.error.bg};
  color: ${props => props.$success 
    ? theme.colors.status.success.text 
    : theme.colors.status.error.text};
`;

const LoadingText = styled.div`
  font-size: 0.85em;
  color: ${theme.colors.text.secondary};
  font-style: italic;
  margin-bottom: 8px;
`;

interface ConnectionStringSelectorProps {
  value: string;
  onChange: (value: string) => void;
  dbEngine: string;
  label: string;
  required?: boolean;
  onTestConnection?: () => void;
  isTesting?: boolean;
  testResult?: { success: boolean; message: string } | null;
  placeholder?: string;
}

interface Connection {
  db_engine: string;
  connection_string: string;
  connection_string_masked: string;
}

const SPECIALIZED_ENGINES = ['S3', 'FTP', 'SFTP', 'Email', 'AzureBlob', 'GCS'];

const parseConnectionString = (connStr: string, engine: string): any => {
  if (!connStr) return null;
  
  try {
    if (engine === 'S3') {
      const params = new URLSearchParams(connStr);
      return {
        access_key_id: params.get('access_key_id') || '',
        secret_access_key: params.get('secret_access_key') || '',
        region: params.get('region') || 'us-east-1',
        bucket_name: params.get('bucket_name') || '',
        endpoint: params.get('endpoint') || '',
        use_ssl: params.get('use_ssl') !== 'false'
      };
    } else if (engine === 'FTP' || engine === 'SFTP') {
      const params = new URLSearchParams(connStr);
      return {
        protocol: engine === 'SFTP' ? 'SFTP' : 'FTP',
        host: params.get('host') || '',
        port: parseInt(params.get('port') || (engine === 'SFTP' ? '22' : '21')),
        username: params.get('username') || '',
        password: params.get('password') || '',
        remote_path: params.get('remote_path') || '/',
        use_passive: params.get('use_passive') !== 'false',
        use_ssl: params.get('use_ssl') === 'true'
      };
    } else if (engine === 'Email') {
      const params = new URLSearchParams(connStr);
      return {
        protocol: params.get('protocol') === 'POP3' ? 'POP3' : 'IMAP',
        server: params.get('server') || '',
        port: parseInt(params.get('port') || '993'),
        username: params.get('username') || '',
        password: params.get('password') || '',
        folder: params.get('folder') || 'INBOX',
        use_ssl: params.get('use_ssl') !== 'false',
        max_emails: parseInt(params.get('max_emails') || '100'),
        download_attachments: params.get('download_attachments') === 'true'
      };
    } else if (engine === 'AzureBlob') {
      const params = new URLSearchParams(connStr);
      return {
        account_name: params.get('account_name') || '',
        account_key: params.get('account_key') || '',
        container_name: params.get('container_name') || '',
        endpoint_suffix: params.get('endpoint_suffix') || 'core.windows.net',
        use_https: params.get('use_https') !== 'false'
      };
    } else if (engine === 'GCS') {
      const params = new URLSearchParams(connStr);
      return {
        project_id: params.get('project_id') || '',
        credentials_json: params.get('credentials_json') || '',
        bucket_name: params.get('bucket_name') || '',
        use_https: params.get('use_https') !== 'false'
      };
    }
  } catch (e) {
    console.error('Error parsing connection string:', e);
  }
  return null;
};

const buildConnectionString = (config: any, engine: string): string => {
  if (!config) return '';
  
  const params = new URLSearchParams();
  
  if (engine === 'S3') {
    Object.entries(config).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        params.set(key, String(val));
      }
    });
  } else if (engine === 'FTP' || engine === 'SFTP') {
    Object.entries(config).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        params.set(key, String(val));
      }
    });
  } else if (engine === 'Email') {
    Object.entries(config).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        params.set(key, String(val));
      }
    });
  } else if (engine === 'AzureBlob') {
    Object.entries(config).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        params.set(key, String(val));
      }
    });
  } else if (engine === 'GCS') {
    Object.entries(config).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        params.set(key, String(val));
      }
    });
  }
  
  return params.toString();
};

export const ConnectionStringSelector: React.FC<ConnectionStringSelectorProps> = ({
  value,
  onChange,
  dbEngine,
  label,
  required = false,
  onTestConnection,
  isTesting = false,
  testResult,
  placeholder = "Enter connection string..."
}) => {
  const [availableConnections, setAvailableConnections] = useState<Connection[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [useCustom, setUseCustom] = useState(false);
  
  const requiresSpecializedConfig = useMemo(() => {
    return SPECIALIZED_ENGINES.includes(dbEngine);
  }, [dbEngine]);
  
  const specializedConfig = useMemo(() => {
    if (!requiresSpecializedConfig || !value) {
      return null;
    }
    return parseConnectionString(value, dbEngine);
  }, [value, dbEngine, requiresSpecializedConfig]);
  
  const defaultConfig = useMemo(() => {
    if (!requiresSpecializedConfig) return null;
    
    if (dbEngine === 'S3') {
      return {
        access_key_id: '',
        secret_access_key: '',
        region: 'us-east-1',
        bucket_name: '',
        endpoint: '',
        use_ssl: true
      };
    } else if (dbEngine === 'FTP' || dbEngine === 'SFTP') {
      return {
        protocol: dbEngine === 'SFTP' ? 'SFTP' : 'FTP',
        host: '',
        port: dbEngine === 'SFTP' ? 22 : 21,
        username: '',
        password: '',
        remote_path: '/',
        use_passive: true,
        use_ssl: dbEngine === 'SFTP'
      };
    } else if (dbEngine === 'Email') {
      return {
        protocol: 'IMAP',
        server: '',
        port: 993,
        username: '',
        password: '',
        folder: 'INBOX',
        use_ssl: true,
        max_emails: 100,
        download_attachments: false
      };
    } else if (dbEngine === 'AzureBlob') {
      return {
        account_name: '',
        account_key: '',
        container_name: '',
        endpoint_suffix: 'core.windows.net',
        use_https: true
      };
    } else if (dbEngine === 'GCS') {
      return {
        project_id: '',
        credentials_json: '',
        bucket_name: '',
        use_https: true
      };
    }
    return null;
  }, [dbEngine, requiresSpecializedConfig]);
  
  const [currentConfig, setCurrentConfig] = useState<any>(defaultConfig);
  const initializedRef = useRef<Record<string, boolean>>({});
  
  useEffect(() => {
    if (requiresSpecializedConfig) {
      const parsed = specializedConfig || defaultConfig;
      if (JSON.stringify(parsed) !== JSON.stringify(currentConfig)) {
        setCurrentConfig(parsed);
      }
      // Solo inicializar connection string una vez por engine cuando no hay valor
      if (!specializedConfig && defaultConfig && !value && !initializedRef.current[dbEngine]) {
        const initialConnStr = buildConnectionString(defaultConfig, dbEngine);
        if (initialConnStr) {
          initializedRef.current[dbEngine] = true;
          onChange(initialConnStr);
        }
      }
      if (dbEngine && !initializedRef.current[dbEngine] && value) {
        initializedRef.current[dbEngine] = true;
      }
    } else {
      setCurrentConfig(null);
      // Reset initialized flag when switching away from specialized engine
      if (dbEngine) {
        delete initializedRef.current[dbEngine];
      }
    }
  }, [requiresSpecializedConfig, specializedConfig, defaultConfig, dbEngine, value]);
  
  const handleSpecializedConfigChange = (newConfig: any) => {
    setCurrentConfig(newConfig);
    const connStr = buildConnectionString(newConfig, dbEngine);
    onChange(connStr);
  };

  useEffect(() => {
    if (requiresSpecializedConfig) {
      // Para engines especializados, no buscar conexiones existentes
      setAvailableConnections([]);
      setUseCustom(true);
    } else if (dbEngine && !useCustom) {
      fetchConnections();
    } else {
      setAvailableConnections([]);
    }
  }, [dbEngine, useCustom, requiresSpecializedConfig]);

  const fetchConnections = async () => {
    if (!dbEngine) return;
    
    setLoadingConnections(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/connections?db_engine=${encodeURIComponent(dbEngine)}`, {
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });
      if (response.ok) {
        const data = await response.json();
        setAvailableConnections(data.connections || []);
        if (value && data.connections && data.connections.some((c: Connection) => c.connection_string === value)) {
          setUseCustom(false);
        } else if (value) {
          setUseCustom(true);
        }
      }
    } catch (err) {
      console.error('Error fetching connections:', err);
    } finally {
      setLoadingConnections(false);
    }
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value === '__custom__') {
      setUseCustom(true);
      onChange('');
    } else {
      setUseCustom(false);
      onChange(e.target.value);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    if (e.target.value && !useCustom) {
      setUseCustom(true);
    }
  };

  const showSelector = !requiresSpecializedConfig && !useCustom && availableConnections.length > 0 && !loadingConnections;
  const showTextarea = !requiresSpecializedConfig && (useCustom || availableConnections.length === 0 || loadingConnections);

  return (
    <FormGroup>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <Label style={{ marginBottom: 0 }}>
          {label} {required && '*'}
        </Label>
        {onTestConnection && (
          <Button
            type="button"
            $variant="secondary"
            onClick={onTestConnection}
            disabled={isTesting || !dbEngine || !value.trim()}
            style={{ padding: '6px 12px', fontSize: '0.85em', minWidth: 'auto' }}
          >
            {isTesting ? 'Testing...' : 'Test Connection'}
          </Button>
        )}
      </div>

      {loadingConnections && (
        <LoadingText>Loading available connections...</LoadingText>
      )}

      {showSelector && (
        <ConnectionSelect
          value={value}
          onChange={handleSelectChange}
        >
          <option value="">-- Select existing connection --</option>
          {availableConnections.map((conn, idx) => (
            <option key={idx} value={conn.connection_string}>
              {conn.connection_string_masked}
            </option>
          ))}
          <option value="__custom__">+ Add new connection...</option>
        </ConnectionSelect>
      )}

      {showTextarea && !requiresSpecializedConfig && (
        <Textarea
          value={value}
          onChange={handleTextareaChange}
          placeholder={placeholder}
        />
      )}
      
      {requiresSpecializedConfig && currentConfig && (
        <div style={{ 
          border: `1px solid ${theme.colors.border.medium}`,
          borderRadius: theme.borderRadius.md,
          padding: theme.spacing.sm,
          backgroundColor: theme.colors.background.secondary
        }}>
          {dbEngine === 'S3' && (
            <S3ConnectionConfig
              config={currentConfig}
              onChange={handleSpecializedConfigChange}
              onTest={onTestConnection}
              isTesting={isTesting}
            />
          )}
          {dbEngine === 'FTP' && (
            <FTPConnectionConfig
              config={currentConfig}
              onChange={handleSpecializedConfigChange}
              onTest={onTestConnection}
              isTesting={isTesting}
            />
          )}
          {dbEngine === 'SFTP' && (
            <FTPConnectionConfig
              config={{ ...currentConfig, protocol: 'SFTP' }}
              onChange={handleSpecializedConfigChange}
              onTest={onTestConnection}
              isTesting={isTesting}
            />
          )}
          {dbEngine === 'Email' && (
            <EmailConnectionConfig
              config={currentConfig}
              onChange={handleSpecializedConfigChange}
              onTest={onTestConnection}
              isTesting={isTesting}
            />
          )}
          {dbEngine === 'AzureBlob' && (
            <AzureBlobConnectionConfig
              config={currentConfig}
              onChange={handleSpecializedConfigChange}
              onTest={onTestConnection}
              isTesting={isTesting}
            />
          )}
          {dbEngine === 'GCS' && (
            <GCSConnectionConfig
              config={currentConfig}
              onChange={handleSpecializedConfigChange}
              onTest={onTestConnection}
              isTesting={isTesting}
            />
          )}
        </div>
      )}

      {!useCustom && availableConnections.length > 0 && (
        <div style={{ marginTop: '4px', fontSize: '0.85em', color: theme.colors.text.secondary }}>
          Or select an existing connection above
        </div>
      )}

      {testResult && (
        <ConnectionTestResult $success={testResult.success}>
          {testResult.success ? '✓ ' : '✗ '}
          {testResult.message}
        </ConnectionTestResult>
      )}
    </FormGroup>
  );
};
