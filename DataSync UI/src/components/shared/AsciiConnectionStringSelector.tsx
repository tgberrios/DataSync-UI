import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors } from '../../ui/theme/asciiTheme';
import { S3ConnectionConfig } from './S3ConnectionConfig';
import { FTPConnectionConfig } from './FTPConnectionConfig';
import { EmailConnectionConfig } from './EmailConnectionConfig';
import { AzureBlobConnectionConfig } from './AzureBlobConnectionConfig';
import { GCSConnectionConfig } from './GCSConnectionConfig';

interface AsciiConnectionStringSelectorProps {
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
  
  Object.entries(config).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      params.set(key, String(val));
    }
  });
  
  return params.toString();
};

export const AsciiConnectionStringSelector: React.FC<AsciiConnectionStringSelectorProps> = ({
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

  console.log(`[AsciiConnectionStringSelector:${label}] Render - dbEngine:`, dbEngine, 'value:', value, 'useCustom:', useCustom, 'availableConnections:', availableConnections.length);

  const fetchConnections = useCallback(async () => {
    if (!dbEngine) {
      console.log(`[AsciiConnectionStringSelector:${label}] fetchConnections - No dbEngine, skipping`);
      return;
    }
    
    console.log(`[AsciiConnectionStringSelector:${label}] fetchConnections - Starting fetch for dbEngine:`, dbEngine);
    setLoadingConnections(true);
    try {
      const token = localStorage.getItem('authToken');
      const url = `/api/connections?db_engine=${encodeURIComponent(dbEngine)}`;
      console.log(`[AsciiConnectionStringSelector:${label}] fetchConnections - Fetching from:`, url);
      
      const response = await fetch(url, {
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });
      
      console.log(`[AsciiConnectionStringSelector:${label}] fetchConnections - Response status:`, response.status, 'ok:', response.ok);
      
      if (response.ok) {
        const data = await response.json();
        const connections = data.connections || [];
        console.log(`[AsciiConnectionStringSelector:${label}] fetchConnections - Received connections:`, connections.length, connections);
        setAvailableConnections(connections);
      } else {
        const errorText = await response.text();
        console.error(`[AsciiConnectionStringSelector:${label}] fetchConnections - Error response:`, response.status, errorText);
      }
    } catch (err) {
      console.error(`[AsciiConnectionStringSelector:${label}] fetchConnections - Exception:`, err);
    } finally {
      setLoadingConnections(false);
      console.log(`[AsciiConnectionStringSelector:${label}] fetchConnections - Finished loading`);
    }
  }, [dbEngine, label]);

  useEffect(() => {
    console.log(`[AsciiConnectionStringSelector:${label}] useEffect[dbEngine] - dbEngine:`, dbEngine, 'fetchConnections exists:', !!fetchConnections);
    if (requiresSpecializedConfig) {
      // Para engines especializados, no buscar conexiones existentes
      console.log(`[AsciiConnectionStringSelector:${label}] useEffect[dbEngine] - Specialized engine, skipping connection fetch`);
      setAvailableConnections([]);
      setUseCustom(true);
    } else if (dbEngine) {
      fetchConnections();
    } else {
      console.log(`[AsciiConnectionStringSelector:${label}] useEffect[dbEngine] - No dbEngine, clearing connections`);
      setAvailableConnections([]);
      setUseCustom(false);
    }
  }, [dbEngine, fetchConnections, label, requiresSpecializedConfig]);

  useEffect(() => {
    console.log(`[AsciiConnectionStringSelector:${label}] useEffect[value,availableConnections] - value:`, value, 'availableConnections.length:', availableConnections.length);
    if (availableConnections.length > 0) {
      // Cuando hay conexiones disponibles, siempre mostrar el selector
      // Solo resetear useCustom a false si no está explícitamente en modo custom
      // Esto permite que el selector se muestre incluso si el valor actual no coincide con ninguna conexión
      if (!useCustom) {
        console.log(`[AsciiConnectionStringSelector:${label}] useEffect[value,availableConnections] - Connections available, keeping useCustom false to show selector`);
      }
    } else {
      console.log(`[AsciiConnectionStringSelector:${label}] useEffect[value,availableConnections] - No available connections yet`);
    }
  }, [value, availableConnections, label, useCustom]);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    console.log(`[AsciiConnectionStringSelector:${label}] handleSelectChange - Selected value:`, e.target.value);
    if (e.target.value === '__custom__') {
      setUseCustom(true);
      onChange('');
    } else {
      setUseCustom(false);
      onChange(e.target.value);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    console.log(`[AsciiConnectionStringSelector:${label}] handleTextareaChange - New value:`, e.target.value);
    onChange(e.target.value);
    // No cambiar useCustom automáticamente cuando se escribe en el textarea
    // useCustom solo debe cambiar cuando el usuario explícitamente elige "+ Add new connection..."
  };

  // Siempre mostrar el selector cuando hay conexiones disponibles (excepto cuando useCustom es true explícitamente o es engine especializado)
  const showSelector = !requiresSpecializedConfig && availableConnections.length > 0 && !loadingConnections && !useCustom;
  // Mostrar textarea solo cuando useCustom es true (usuario eligió "+ Add new connection...") o cuando no hay conexiones (y no es engine especializado)
  const showTextarea = !requiresSpecializedConfig && (useCustom || (availableConnections.length === 0 && !loadingConnections));

  console.log(`[AsciiConnectionStringSelector:${label}] Render calculation - showSelector:`, showSelector, 'showTextarea:', showTextarea, 'useCustom:', useCustom, 'availableConnections.length:', availableConnections.length, 'loadingConnections:', loadingConnections);

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <label style={{
          display: 'block',
          fontSize: 12,
          fontWeight: 600,
          color: asciiColors.foreground,
          fontFamily: 'Consolas',
        }}>
          {label} {required && '*'}
        </label>
        {onTestConnection && (
          <AsciiButton
            label={isTesting ? 'Testing...' : 'Test Connection'}
            onClick={onTestConnection}
            variant="ghost"
            disabled={isTesting || !dbEngine || !value.trim()}
          />
        )}
      </div>

      {loadingConnections && (
        <div style={{
          fontSize: 11,
          color: asciiColors.muted,
          fontStyle: 'italic',
          marginBottom: 8,
          fontFamily: 'Consolas',
        }}>
          Loading available connections...
        </div>
      )}

      {showSelector && (
        <select
          value={availableConnections.some((c: Connection) => c.connection_string === value) ? value : ""}
          onChange={handleSelectChange}
          style={{
            width: '100%',
            padding: '8px 12px',
            marginBottom: 8,
            border: `1px solid ${asciiColors.border}`,
            borderRadius: 2,
            fontSize: 12,
            fontFamily: 'Consolas',
            backgroundColor: asciiColors.background,
            color: asciiColors.foreground,
            cursor: 'pointer',
            outline: 'none',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = asciiColors.accent;
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = asciiColors.border;
          }}
        >
          <option value="">-- Select existing connection --</option>
          {availableConnections.map((conn, idx) => (
            <option key={idx} value={conn.connection_string}>
              {conn.connection_string_masked}
            </option>
          ))}
          <option value="__custom__">+ Add new connection...</option>
        </select>
      )}

      {showTextarea && !requiresSpecializedConfig && (
        <textarea
          value={value}
          onChange={handleTextareaChange}
          placeholder={placeholder}
          rows={2}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: `1px solid ${asciiColors.border}`,
            borderRadius: 2,
            fontSize: 12,
            fontFamily: 'Consolas',
            backgroundColor: asciiColors.background,
            color: asciiColors.foreground,
            outline: 'none',
            resize: 'vertical',
            minHeight: '60px',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = asciiColors.accent;
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = asciiColors.border;
          }}
        />
      )}
      
      {requiresSpecializedConfig && currentConfig && (
        <div style={{ 
          border: `1px solid ${asciiColors.border}`,
          borderRadius: 2,
          padding: 12,
          backgroundColor: asciiColors.backgroundSoft
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

      {!useCustom && availableConnections.length > 0 && showSelector && (
        <div style={{
          marginTop: 4,
          fontSize: 11,
          color: asciiColors.muted,
          fontFamily: 'Consolas',
        }}>
          Or select an existing connection above
        </div>
      )}

      {testResult && (
        <div style={{
          marginTop: 8,
          padding: '8px 12px',
          borderRadius: 2,
          fontSize: 12,
          fontFamily: 'Consolas',
          backgroundColor: testResult.success ? asciiColors.success + '20' : asciiColors.danger + '20',
          border: `1px solid ${testResult.success ? asciiColors.success : asciiColors.danger}`,
          color: testResult.success ? asciiColors.success : asciiColors.danger,
        }}>
          {testResult.success ? '✓ ' : '✗ '}
          {testResult.message}
        </div>
      )}
    </div>
  );
};
