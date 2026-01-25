import { useState, useCallback, useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import {
  Button,
  Input,
  FormGroup,
  Label,
  Select,
} from '../shared/BaseComponents';
import { ConnectionStringSelector } from '../shared/ConnectionStringSelector';
import type { CatalogEntry } from '../../services/api';
import { theme } from '../../theme/theme';

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const BlurOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  backdrop-filter: blur(5px);
  background: rgba(0, 0, 0, 0.3);
  z-index: 999;
  animation: fadeIn 0.15s ease-in;
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  animation: fadeIn 0.15s ease-in;
`;

const ModalContent = styled.div`
  background: ${theme.colors.background.main};
  padding: ${theme.spacing.xxl};
  border-radius: ${theme.borderRadius.lg};
  min-width: 500px;
  max-width: 700px;
  max-height: 90vh;
  overflow-y: auto;
  font-family: ${theme.fonts.primary};
  box-shadow: ${theme.shadows.lg};
  animation: slideUp 0.2s ease-out;
  border: 1px solid ${theme.colors.border.light};
`;

const ModalHeader = styled.div`
  border-bottom: 2px solid ${theme.colors.border.dark};
  padding-bottom: ${theme.spacing.sm};
  margin-bottom: ${theme.spacing.lg};
  font-size: 1.2em;
  font-weight: bold;
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 0;
    width: 60px;
    height: 2px;
    background: linear-gradient(90deg, ${theme.colors.primary.main}, ${theme.colors.primary.dark});
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${theme.spacing.sm};
  margin-top: ${theme.spacing.lg};
`;

const Textarea = styled.textarea`
  padding: 8px 12px;
  border: 1px solid ${theme.colors.border.medium};
  border-radius: ${theme.borderRadius.md};
  font-family: ${theme.fonts.primary};
  background: ${theme.colors.background.main};
  color: ${theme.colors.text.primary};
  font-size: 14px;
  width: 100%;
  min-height: 100px;
  resize: vertical;
  
  &:focus {
    outline: none;
    border-color: ${theme.colors.primary.main};
    box-shadow: 0 0 0 2px ${theme.colors.primary.light}33;
  }
`;

const ConnectionStringExample = styled.div`
  margin-top: ${theme.spacing.xs};
  padding: ${theme.spacing.sm};
  background: ${theme.colors.background.secondary};
  border-radius: ${theme.borderRadius.sm};
  border-left: 3px solid ${theme.colors.primary.main};
  font-family: "Consolas, 'Source Code Pro', monospace";
  font-size: 0.85em;
  color: ${theme.colors.text.secondary};
  white-space: pre-wrap;
  word-break: break-all;
`;

const ErrorMessage = styled.div`
  color: ${theme.colors.status.error.text};
  background: ${theme.colors.status.error.bg};
  padding: ${theme.spacing.sm};
  border-radius: ${theme.borderRadius.sm};
  margin-top: ${theme.spacing.sm};
  font-size: 0.9em;
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
  animation: ${fadeIn} 0.3s ease-out;
`;

interface AddTableModalProps {
  onClose: () => void;
  onSave: (entry: Omit<CatalogEntry, 'last_sync_time' | 'updated_at'>) => void;
}

const connectionStringExamples: Record<string, string> = {
  MariaDB: 'host=localhost;user=myuser;password=mypassword;db=mydatabase;port=3306',
  MSSQL: 'DRIVER={ODBC Driver 17 for SQL Server};SERVER=localhost,1433;DATABASE=mydatabase;UID=myuser;PWD=mypassword',
  Oracle: 'host=localhost;user=myuser;password=mypassword;db=mydatabase;port=1521',
  PostgreSQL: 'postgresql://myuser:mypassword@localhost:5432/mydatabase',
  MongoDB: 'mongodb://myuser:mypassword@localhost:27017/mydatabase',
  DB2: 'DRIVER={IBM DB2 ODBC Driver};DATABASE=MYDB;HOSTNAME=localhost;PORT=50000;UID=myuser;PWD=mypassword',
  Teradata: 'host=localhost;user=myuser;password=mypassword;database=mydatabase',
  Netezza: 'host=localhost;port=5480;database=mydatabase;user=myuser;password=mypassword',
  Hive: 'jdbc:hive2://localhost:10000/default;user=myuser;password=mypassword',
  Cassandra: 'hosts=localhost;port=9042;username=myuser;password=mypassword;keyspace=mykeyspace',
  DynamoDB: 'region=us-east-1;accessKeyId=AKIAIOSFODNN7EXAMPLE;secretAccessKey=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
  AS400: 'DRIVER={IBM i Access ODBC Driver};SYSTEM=localhost;UID=myuser;PWD=mypassword',
  Salesforce: 'username=myuser@example.com;password=mypassword;security_token=mytoken',
  SAP: 'ASHOST=localhost;SYSNR=00;CLIENT=100;USER=myuser;PASSWD=mypassword',
};

const connectionStringHelp: Record<string, string> = {
  MariaDB: 'Format: host=server;user=username;password=password;db=database;port=3306\n\nExample:\nhost=localhost;user=admin;password=secret123;db=production;port=3306',
  MSSQL: 'Format: DRIVER={ODBC Driver 17 for SQL Server};SERVER=server,port;DATABASE=database;UID=username;PWD=password\n\nExample:\nDRIVER={ODBC Driver 17 for SQL Server};SERVER=sqlserver.example.com,1433;DATABASE=MyDB;UID=sa;PWD=MyPassword123',
  Oracle: 'Format: host=server;user=username;password=password;db=database;port=1521\n\nExample:\nhost=oracle.example.com;user=system;password=oracle123;db=ORCL;port=1521',
  PostgreSQL: 'Format: postgresql://username:password@host:port/database\n\nExample:\npostgresql://postgres:postgres123@postgres.example.com:5432/mydb',
  MongoDB: 'Format: mongodb://username:password@host:port/database\n\nFor MongoDB Atlas (cloud): mongodb+srv://username:password@cluster.mongodb.net/database\n\nExample:\nmongodb://admin:secret123@localhost:27017/mydb\nmongodb+srv://admin:secret123@cluster0.xxxxx.mongodb.net/mydb',
  DB2: 'Format: DRIVER={IBM DB2 ODBC Driver};DATABASE=database;HOSTNAME=hostname;PORT=port;UID=username;PWD=password\n\nExample:\nDRIVER={IBM DB2 ODBC Driver};DATABASE=MYDB;HOSTNAME=db2.example.com;PORT=50000;UID=db2admin;PWD=MyPassword123',
  Teradata: 'Format: host=server;user=username;password=password;database=database\n\nExample:\nhost=teradata.example.com;user=tduser;password=tdpass123;database=MyDB',
  Netezza: 'Format: host=server;port=5480;database=database;user=username;password=password\n\nExample:\nhost=netezza.example.com;port=5480;database=MYDB;user=nzuser;password=nzpass123',
  Hive: 'Format: jdbc:hive2://host:port/database;user=username;password=password\n\nExample:\njdbc:hive2://hive.example.com:10000/default;user=hiveuser;password=hivepass123',
  Cassandra: 'Format: hosts=host1,host2;port=9042;username=username;password=password;keyspace=keyspace\n\nExample:\nhosts=cassandra1.example.com,cassandra2.example.com;port=9042;username=cassuser;password=casspass123;keyspace=mykeyspace',
  DynamoDB: 'Format: region=region;accessKeyId=key;secretAccessKey=secret\n\nExample:\nregion=us-east-1;accessKeyId=AKIAIOSFODNN7EXAMPLE;secretAccessKey=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
  AS400: 'Format: DRIVER={IBM i Access ODBC Driver};SYSTEM=system;UID=username;PWD=password\n\nExample:\nDRIVER={IBM i Access ODBC Driver};SYSTEM=as400.example.com;UID=as400user;PWD=as400pass123',
  Salesforce: 'Format: username=email;password=password;security_token=token\n\nExample:\nusername=user@example.com;password=MyPassword123;security_token=MySecurityToken123',
  SAP: 'Format: ASHOST=host;SYSNR=system_number;CLIENT=client;USER=username;PASSWD=password\n\nExample:\nASHOST=sap.example.com;SYSNR=00;CLIENT=100;USER=sapuser;PASSWD=sappass123',
};

const extractClusterName = (connectionString: string, dbEngine: string): string => {
  if (dbEngine === 'MongoDB') {
    const srvMatch = connectionString.match(/mongodb\+srv:\/\/[^@]+@([^.]+)/);
    if (srvMatch) {
      return srvMatch[1];
    }
    const standardMatchWithAuth = connectionString.match(/mongodb:\/\/[^@]+@([^:]+)/);
    if (standardMatchWithAuth) {
      return standardMatchWithAuth[1];
    }
    const standardMatchWithoutAuth = connectionString.match(/mongodb:\/\/([^:/]+)/);
    if (standardMatchWithoutAuth) {
      return standardMatchWithoutAuth[1];
    }
  } else {
    const parts = connectionString.split(';');
    for (const part of parts) {
      const [key, value] = part.split('=').map(s => s.trim());
      if (key && value) {
        const keyLower = key.toLowerCase();
        if (keyLower === 'host' || keyLower === 'hostname' || keyLower === 'server') {
          if (dbEngine === 'MSSQL' && value.includes(',')) {
            return value.split(',')[0].trim();
          }
          return value;
        }
      }
    }
    if (dbEngine === 'PostgreSQL' && (connectionString.includes('postgresql://') || connectionString.includes('postgres://'))) {
      const urlMatch = connectionString.match(/:\/\/(?:[^@]+@)?([^:]+)/);
      if (urlMatch) {
        return urlMatch[1];
      }
    }
  }
  return '';
};

const AddTableModal: React.FC<AddTableModalProps> = ({ onClose, onSave }) => {
  const [formData, setFormData] = useState({
    schema_name: '',
    table_name: '',
    db_engine: '',
    connection_string: '',
    active: true,
    status: 'FULL_LOAD',
    cluster_name: '',
    pk_strategy: 'CDC',
    cron_schedule: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<{ success: boolean; message: string; cluster_name?: string } | null>(null);
  const [schemas, setSchemas] = useState<string[]>([]);
  const [tables, setTables] = useState<string[]>([]);
  const [isLoadingSchemas, setIsLoadingSchemas] = useState(false);
  const [isLoadingTables, setIsLoadingTables] = useState(false);

  const connectionExample = useMemo(() => {
    if (!formData.db_engine) return '';
    return connectionStringExamples[formData.db_engine] || '';
  }, [formData.db_engine]);

  const connectionHelp = useMemo(() => {
    if (!formData.db_engine) return '';
    return connectionStringHelp[formData.db_engine] || '';
  }, [formData.db_engine]);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 150);
  }, [onClose]);

  const handleSave = useCallback(() => {
    setError(null);
    
    if (!formData.schema_name.trim()) {
      setError('Schema name is required');
      return;
    }
    
    if (!formData.table_name.trim()) {
      setError('Table name is required');
      return;
    }
    
    if (!formData.db_engine) {
      setError('Database engine is required');
      return;
    }
    
    if (!formData.connection_string.trim()) {
      setError('Connection string is required');
      return;
    }

    const specializedEngines = ['S3', 'FTP', 'SFTP', 'Email', 'AzureBlob', 'GCS', 'SOAP', 'GraphQL', 'Excel', 'FixedWidth', 'EBCDIC', 'XML', 'Avro', 'Parquet', 'ORC', 'Compressed'];
    
    if (specializedEngines.includes(formData.db_engine)) {
      // Para engines especializados, la validación se hace en el componente especializado
      // Solo verificar que haya algún valor
      if (!formData.connection_string.trim()) {
        setError('Please configure the connection using the form above');
        return;
      }
    } else if (formData.db_engine === 'MongoDB') {
      if (!formData.connection_string.startsWith('mongodb://') && 
          !formData.connection_string.startsWith('mongodb+srv://')) {
        setError('MongoDB connection string must start with mongodb:// or mongodb+srv://');
        return;
      }
    } else if (formData.db_engine === 'MSSQL') {
      const requiredParams = ['server', 'uid', 'pwd', 'database'];
      const connStr = formData.connection_string.toLowerCase();
      const missing = requiredParams.filter(param => !connStr.includes(`${param}=`));
      if (missing.length > 0) {
        setError(`Connection string must include: ${missing.join(', ')}`);
        return;
      }
    } else if (formData.db_engine === 'DB2') {
      const requiredParams = ['database', 'uid', 'pwd'];
      const connStr = formData.connection_string.toLowerCase();
      const missing = requiredParams.filter(param => !connStr.includes(`${param}=`));
      if (missing.length > 0) {
        setError(`Connection string must include: ${missing.join(', ')}`);
        return;
      }
    } else {
      const requiredParams = ['host', 'user', 'db'];
      const connStr = formData.connection_string.toLowerCase();
      const missing = requiredParams.filter(param => !connStr.includes(`${param}=`));
      if (missing.length > 0) {
        setError(`Connection string must include: ${missing.join(', ')}`);
        return;
      }
    }

    onSave({
      schema_name: formData.schema_name.trim().toLowerCase(),
      table_name: formData.table_name.trim().toLowerCase(),
      db_engine: formData.db_engine,
      connection_string: formData.connection_string.trim(),
      active: formData.active,
      status: formData.status,
      cluster_name: formData.cluster_name.trim() || '',
      pk_strategy: formData.pk_strategy,
      cron_schedule: formData.cron_schedule.trim() || null,
    });
    handleClose();
  }, [formData, onSave, handleClose]);

  const handleEngineChange = useCallback((engine: string) => {
    setFormData(prev => ({
      ...prev,
      db_engine: engine,
      connection_string: engine ? connectionStringExamples[engine] || '' : '',
    }));
    setConnectionTestResult(null);
  }, []);

  const handleTestConnection = useCallback(async () => {
    if (!formData.db_engine) {
      setConnectionTestResult({ success: false, message: 'Please select a database engine first' });
      return;
    }

    if (!formData.connection_string.trim()) {
      setConnectionTestResult({ success: false, message: 'Please enter a connection string' });
      return;
    }

    setIsTestingConnection(true);
    setConnectionTestResult(null);

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/test-connection', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({
          db_engine: formData.db_engine,
          connection_string: formData.connection_string.trim(),
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          setConnectionTestResult({ success: false, message: 'Authentication required. Please log in again.' });
          return;
        }
        if (response.status === 0 || response.status >= 500) {
          setConnectionTestResult({ success: false, message: 'Server error. Please check if the server is running.' });
          return;
        }
      }

      let data;
      try {
        data = await response.json();
      } catch (parseErr) {
        setConnectionTestResult({ success: false, message: 'Invalid response from server' });
        return;
      }

      if (response.ok && data.success) {
        const extractedClusterName = data.cluster_name || extractClusterName(formData.connection_string.trim(), formData.db_engine);
        if (extractedClusterName) {
          setFormData(prev => ({ ...prev, cluster_name: extractedClusterName }));
        }
        setConnectionTestResult({ 
          success: true, 
          message: data.message || 'Connection successful!',
          cluster_name: extractedClusterName 
        });
        
        await handleDiscoverSchemas();
      } else {
        setConnectionTestResult({ success: false, message: data.error || data.message || 'Connection failed' });
      }
    } catch (err: any) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        setConnectionTestResult({ success: false, message: 'Network error. Please check if the server is running and try again.' });
      } else {
        setConnectionTestResult({ success: false, message: err.message || 'Error testing connection' });
      }
    } finally {
      setIsTestingConnection(false);
    }
  }, [formData.db_engine, formData.connection_string]);

  const handleDiscoverSchemas = useCallback(async () => {
    if (!formData.db_engine || !formData.connection_string.trim()) {
      return;
    }

    setIsLoadingSchemas(true);
    setSchemas([]);
    setTables([]);
    setFormData(prev => ({ ...prev, schema_name: '', table_name: '' }));

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/discover-schemas', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({
          db_engine: formData.db_engine,
          connection_string: formData.connection_string.trim(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.schemas) {
          setSchemas(data.schemas);
        }
      }
    } catch (err: any) {
      console.error('Error discovering schemas:', err);
    } finally {
      setIsLoadingSchemas(false);
    }
  }, [formData.db_engine, formData.connection_string]);

  const handleSchemaChange = useCallback(async (schema: string) => {
    setFormData(prev => ({ ...prev, schema_name: schema, table_name: '' }));
    setTables([]);

    if (!schema || !formData.db_engine || !formData.connection_string.trim()) {
      return;
    }

    setIsLoadingTables(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/discover-tables', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({
          db_engine: formData.db_engine,
          connection_string: formData.connection_string.trim(),
          schema_name: schema,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.tables) {
          setTables(data.tables);
        }
      }
    } catch (err: any) {
      console.error('Error discovering tables:', err);
    } finally {
      setIsLoadingTables(false);
    }
  }, [formData.db_engine, formData.connection_string]);

  return (
    <>
      <BlurOverlay style={{ animation: isClosing ? 'fadeOut 0.15s ease-out' : 'fadeIn 0.15s ease-in' }} onClick={handleClose} />
      <ModalOverlay style={{ animation: isClosing ? 'fadeOut 0.15s ease-out' : 'fadeIn 0.15s ease-in' }}>
        <ModalContent onClick={(e) => e.stopPropagation()}>
          <ModalHeader>Add New Table to Catalog</ModalHeader>
          
          <FormGroup>
            <Label>Database Engine *</Label>
            <Select
              value={formData.db_engine}
              onChange={(e) => handleEngineChange(e.target.value)}
            >
              <option value="">Select Engine</option>
              <option value="PostgreSQL">PostgreSQL</option>
              <option value="MariaDB">MariaDB</option>
              <option value="MSSQL">MSSQL</option>
              <option value="MongoDB">MongoDB</option>
              <option value="Oracle">Oracle</option>
              <option value="DB2">DB2</option>
              <option value="Salesforce">Salesforce</option>
              <option value="SAP">SAP</option>
              <option value="Teradata">Teradata</option>
              <option value="Netezza">Netezza</option>
              <option value="Hive">Hive</option>
              <option value="Cassandra">Cassandra</option>
              <option value="DynamoDB">DynamoDB</option>
              <option value="AS400">AS/400</option>
              <option value="S3">S3</option>
              <option value="AzureBlob">Azure Blob</option>
              <option value="GCS">Google Cloud Storage</option>
              <option value="FTP">FTP</option>
              <option value="SFTP">SFTP</option>
              <option value="Email">Email</option>
              <option value="SOAP">SOAP</option>
              <option value="GraphQL">GraphQL</option>
              <option value="Excel">Excel</option>
              <option value="FixedWidth">Fixed Width</option>
              <option value="EBCDIC">EBCDIC</option>
              <option value="XML">XML</option>
              <option value="Avro">Avro</option>
              <option value="Parquet">Parquet</option>
              <option value="ORC">ORC</option>
              <option value="Compressed">Compressed</option>
            </Select>
          </FormGroup>

          {formData.db_engine && !['S3', 'FTP', 'SFTP', 'Email', 'AzureBlob', 'GCS'].includes(formData.db_engine) && connectionHelp && (
            <>
              <FormGroup>
                <Label>Connection String Format</Label>
                <ConnectionStringExample>
                  {connectionHelp}
                </ConnectionStringExample>
              </FormGroup>
            </>
          )}
          {formData.db_engine && !['S3', 'FTP', 'SFTP', 'Email', 'AzureBlob', 'GCS'].includes(formData.db_engine) && !connectionHelp && (
            <>
              <FormGroup>
                <Label>Connection String Format</Label>
                <ConnectionStringExample>
                  Please refer to the database engine documentation for the correct connection string format.
                  {connectionExample && `\n\nExample format:\n${connectionExample}`}
                </ConnectionStringExample>
              </FormGroup>
            </>
          )}

          <ConnectionStringSelector
            value={formData.connection_string}
            onChange={(val) => {
              setFormData(prev => ({ 
                ...prev, 
                connection_string: val,
                schema_name: '',
                table_name: ''
              }));
              setConnectionTestResult(null);
              setSchemas([]);
              setTables([]);
            }}
            dbEngine={formData.db_engine}
            label="Connection String"
            required
            onTestConnection={handleTestConnection}
            isTesting={isTestingConnection}
            testResult={connectionTestResult ? {
              success: connectionTestResult.success,
              message: connectionTestResult.success && connectionTestResult.cluster_name
                ? `${connectionTestResult.message} Cluster name detected: ${connectionTestResult.cluster_name}`
                : connectionTestResult.message
            } : null}
            placeholder={connectionExample || "Enter connection string..."}
          />

          {connectionTestResult?.success && (
            <>
              <FormGroup>
                <Label>Schema Name *</Label>
                <Select
                  value={formData.schema_name}
                  onChange={(e) => handleSchemaChange(e.target.value)}
                  disabled={isLoadingSchemas}
                >
                  <option value="">
                    {isLoadingSchemas ? 'Loading schemas...' : 'Select Schema'}
                  </option>
                  {schemas.map((schema) => (
                    <option key={schema} value={schema}>
                      {schema}
                    </option>
                  ))}
                </Select>
              </FormGroup>

              {formData.schema_name && (
                <FormGroup>
                  <Label>Table Name *</Label>
                  <Select
                    value={formData.table_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, table_name: e.target.value }))}
                    disabled={isLoadingTables}
                  >
                    <option value="">
                      {isLoadingTables ? 'Loading tables...' : 'Select Table'}
                    </option>
                    {tables.map((table) => (
                      <option key={table} value={table}>
                        {table}
                      </option>
                    ))}
                  </Select>
                </FormGroup>
              )}
            </>
          )}

          {!connectionTestResult?.success && (
            <>
              <FormGroup>
                <Label>Schema Name *</Label>
                <Input 
                  type="text" 
                  value={formData.schema_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, schema_name: e.target.value }))}
                  placeholder="e.g., public, dbo, my_schema"
                />
              </FormGroup>

              <FormGroup>
                <Label>Table Name *</Label>
                <Input 
                  type="text" 
                  value={formData.table_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, table_name: e.target.value }))}
                  placeholder="e.g., users, products, orders"
                />
              </FormGroup>
            </>
          )}

          <FormGroup>
            <Label>Cluster Name</Label>
            <Input 
              type="text" 
              value={formData.cluster_name}
              onChange={(e) => setFormData(prev => ({ ...prev, cluster_name: e.target.value }))}
              placeholder="Optional: cluster identifier"
            />
          </FormGroup>

          <FormGroup>
            <Label>PK Strategy</Label>
            <Select
              value={formData.pk_strategy}
              disabled
              style={{ opacity: 0.6, cursor: 'not-allowed' }}
            >
              <option value="CDC">CDC (Change Data Capture)</option>
            </Select>
          </FormGroup>

          <FormGroup>
            <Label>Cron Schedule (Optional)</Label>
            <Input 
              type="text" 
              value={formData.cron_schedule}
              onChange={(e) => setFormData(prev => ({ ...prev, cron_schedule: e.target.value }))}
              placeholder="e.g., 0 */6 * * * (every 6 hours)"
            />
            <div style={{ 
              marginTop: 4, 
              fontSize: 11, 
              color: theme.colors.text.secondary,
              fontFamily: "Consolas",
              lineHeight: 1.4
            }}>
              Format: minute hour day month day-of-week<br/>
              Examples: "0 */6 * * *" (every 6 hours), "0 0 * * *" (daily at midnight), "*/15 * * * *" (every 15 minutes)
            </div>
          </FormGroup>

          <FormGroup>
            <Label>Status</Label>
            <Select
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
            >
              <option value="FULL_LOAD">FULL_LOAD</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="LISTENING_CHANGES">LISTENING_CHANGES</option>
              <option value="NO_DATA">NO_DATA</option>
            </Select>
          </FormGroup>

          <FormGroup>
            <Label>Active</Label>
            <Select
              value={formData.active.toString()}
              onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.value === 'true' }))}
            >
              <option value="true">Yes</option>
              <option value="false">No</option>
            </Select>
          </FormGroup>

          {error && <ErrorMessage>{error}</ErrorMessage>}

          <ButtonGroup>
            <Button $variant="secondary" onClick={handleClose}>Cancel</Button>
            <Button $variant="primary" onClick={handleSave}>Add Table</Button>
          </ButtonGroup>
        </ModalContent>
      </ModalOverlay>
    </>
  );
};

export default AddTableModal;
