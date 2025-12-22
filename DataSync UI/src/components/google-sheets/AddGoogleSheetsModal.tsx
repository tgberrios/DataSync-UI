import React, { useState, useCallback, useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import {
  Button,
  Input,
  FormGroup,
  Label,
  Select,
} from '../shared/BaseComponents';
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

const slideUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
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
  animation: ${fadeIn} 0.15s ease-in;
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
  animation: ${fadeIn} 0.15s ease-in;
`;

const ModalContent = styled.div`
  background: ${theme.colors.background.main};
  padding: ${theme.spacing.xxl};
  border-radius: ${theme.borderRadius.lg};
  min-width: 700px;
  max-width: 900px;
  max-height: 90vh;
  overflow-y: auto;
  font-family: ${theme.fonts.primary};
  box-shadow: ${theme.shadows.lg};
  animation: ${slideUp} 0.2s ease-out;
  border: 1px solid ${theme.colors.border.light};
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: ${theme.colors.background.secondary};
    border-radius: ${theme.borderRadius.sm};
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${theme.colors.border.medium};
    border-radius: ${theme.borderRadius.sm};
    
    &:hover {
      background: ${theme.colors.primary.main};
    }
  }
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

const ErrorMessage = styled.div`
  color: ${theme.colors.status.error.text};
  background: ${theme.colors.status.error.bg};
  padding: ${theme.spacing.sm};
  border-radius: ${theme.borderRadius.sm};
  margin-top: ${theme.spacing.sm};
  font-size: 0.9em;
  animation: ${fadeIn} 0.3s ease-out;
`;

const ConnectionStringExample = styled.div`
  margin-top: ${theme.spacing.xs};
  padding: ${theme.spacing.sm};
  background: ${theme.colors.background.secondary};
  border-radius: ${theme.borderRadius.sm};
  border-left: 3px solid ${theme.colors.primary.main};
  font-family: monospace;
  font-size: 0.85em;
  color: ${theme.colors.text.secondary};
  white-space: pre-wrap;
  word-break: break-all;
`;

const CheckboxContainer = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

const Checkbox = styled.input`
  width: 18px;
  height: 18px;
  cursor: pointer;
`;

const HelpText = styled.div`
  margin-top: ${theme.spacing.xs};
  font-size: 0.85em;
  color: ${theme.colors.text.secondary};
  font-style: italic;
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

const AnalysisResult = styled.div`
  margin-top: ${theme.spacing.sm};
  padding: ${theme.spacing.sm};
  background: ${theme.colors.primary.light + '20'};
  border-radius: ${theme.borderRadius.sm};
  border-left: 3px solid ${theme.colors.primary.main};
  font-size: 0.85em;
  color: ${theme.colors.text.primary};
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

interface AddGoogleSheetsModalProps {
  onClose: () => void;
  onSave: (entry: any) => void;
  initialData?: Partial<any>;
}

const connectionStringExamples: Record<string, string> = {
  MariaDB: 'host=localhost;user=myuser;password=mypassword;db=mydatabase;port=3306',
  MSSQL: 'DRIVER={ODBC Driver 17 for SQL Server};SERVER=localhost,1433;DATABASE=mydatabase;UID=myuser;PWD=mypassword',
  Oracle: 'host=localhost;user=myuser;password=mypassword;db=mydatabase;port=1521',
  PostgreSQL: 'postgresql://myuser:mypassword@localhost:5432/mydatabase',
  MongoDB: 'mongodb://myuser:mypassword@localhost:27017/mydatabase',
};


const AddGoogleSheetsModal: React.FC<AddGoogleSheetsModalProps> = ({ onClose, onSave, initialData }) => {
  const [formData, setFormData] = useState({
    sheet_name: initialData?.sheet_name ? `${initialData.sheet_name} (Copy)` : '',
    spreadsheet_id: initialData?.spreadsheet_id || '',
    api_key: initialData?.api_key || '',
    access_token: initialData?.access_token || '',
    range: initialData?.range || '',
    target_db_engine: initialData?.target_db_engine || '',
    target_connection_string: initialData?.target_connection_string || '',
    target_schema: initialData?.target_schema || '',
    target_table: initialData?.target_table || '',
    sync_interval: initialData?.sync_interval || 3600,
    status: initialData?.status || 'PENDING',
    active: initialData?.active !== undefined ? initialData.active : true,
  });
  const [error, setError] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  
  // Estados para hojas disponibles
  const [availableSheets, setAvailableSheets] = useState<Array<{title: string, sheetId: number | null, index: number}>>([]);
  const [isLoadingSheets, setIsLoadingSheets] = useState(false);
  
  // Estados para análisis de Google Sheets
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    has_header: boolean;
    skip_rows: number;
    column_count: number;
    row_count: number;
    sample_rows?: any[][];
  } | null>(null);
  
  // Estados para test de conexión
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<{ success: boolean; message: string } | null>(null);
  
  // Estados para schemas y tables
  const [schemas, setSchemas] = useState<string[]>([]);
  const [tables, setTables] = useState<string[]>([]);
  const [isLoadingSchemas, setIsLoadingSchemas] = useState(false);
  const [isLoadingTables, setIsLoadingTables] = useState(false);
  const [showCreateSchema, setShowCreateSchema] = useState(false);
  const [showCreateTable, setShowCreateTable] = useState(false);

  const connectionExample = useMemo(() => {
    if (!formData.target_db_engine) return '';
    return connectionStringExamples[formData.target_db_engine] || '';
  }, [formData.target_db_engine]);

  // Handler para obtener hojas disponibles
  const handleGetSheets = useCallback(async () => {
    if (!formData.spreadsheet_id || (!formData.api_key && !formData.access_token)) {
      return;
    }

    setIsLoadingSheets(true);
    setAvailableSheets([]);

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/google-sheets-catalog/get-sheets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({
          spreadsheet_id: formData.spreadsheet_id,
          api_key: formData.api_key || null,
          access_token: formData.access_token || null,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.sheets) {
          setAvailableSheets(data.sheets);
          // Si hay hojas y no hay rango seleccionado, seleccionar la primera
          if (data.sheets.length > 0 && !formData.range) {
            setFormData(prev => ({ ...prev, range: data.sheets[0].title }));
          }
        }
      }
    } catch (err: any) {
      console.error('Error getting sheets:', err);
    } finally {
      setIsLoadingSheets(false);
    }
  }, [formData.spreadsheet_id, formData.api_key, formData.access_token]);

  // Obtener hojas automáticamente cuando cambian los campos relevantes
  React.useEffect(() => {
    if (formData.spreadsheet_id && (formData.api_key || formData.access_token)) {
      const timer = setTimeout(() => {
        handleGetSheets();
      }, 500); // Debounce de 500ms
      return () => clearTimeout(timer);
    } else {
      setAvailableSheets([]);
      if (!formData.spreadsheet_id || (!formData.api_key && !formData.access_token)) {
        setFormData(prev => ({ ...prev, range: '' }));
      }
    }
  }, [formData.spreadsheet_id, formData.api_key, formData.access_token, handleGetSheets]);

  // Handler para analizar Google Sheets automáticamente
  const handleAnalyzeSheet = useCallback(async () => {
    if (!formData.spreadsheet_id || (!formData.api_key && !formData.access_token)) {
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/google-sheets-catalog/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({
          spreadsheet_id: formData.spreadsheet_id,
          api_key: formData.api_key || null,
          access_token: formData.access_token || null,
          range: formData.range || null,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAnalysisResult(data);
        }
      }
    } catch (err: any) {
      console.error('Error analyzing Google Sheet:', err);
    } finally {
      setIsAnalyzing(false);
    }
  }, [formData.spreadsheet_id, formData.api_key, formData.access_token, formData.range]);

  // Analizar automáticamente cuando cambian los campos relevantes y hay un range seleccionado
  React.useEffect(() => {
    if (formData.spreadsheet_id && (formData.api_key || formData.access_token) && formData.range) {
      const timer = setTimeout(() => {
        handleAnalyzeSheet();
      }, 1000); // Debounce de 1 segundo
      return () => clearTimeout(timer);
    } else {
      setAnalysisResult(null);
    }
  }, [formData.spreadsheet_id, formData.api_key, formData.access_token, formData.range, handleAnalyzeSheet]);

  // Handler para test de conexión
  const handleTestConnection = useCallback(async () => {
    if (!formData.target_db_engine || !formData.target_connection_string.trim()) {
      setConnectionTestResult({ success: false, message: 'Please select database engine and enter connection string' });
      return;
    }

    setIsTestingConnection(true);
    setConnectionTestResult(null);
    setSchemas([]);
    setTables([]);

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({
          db_engine: formData.target_db_engine,
          connection_string: formData.target_connection_string.trim(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setConnectionTestResult({ success: true, message: 'Connection successful!' });
          // Obtener schemas automáticamente
          await handleDiscoverSchemas();
        } else {
          setConnectionTestResult({ success: false, message: data.error || data.message || 'Connection failed' });
        }
      } else {
        const data = await response.json();
        setConnectionTestResult({ success: false, message: data.error || data.message || 'Connection failed' });
      }
    } catch (err: any) {
      setConnectionTestResult({ success: false, message: err.message || 'Error testing connection' });
    } finally {
      setIsTestingConnection(false);
    }
  }, [formData.target_db_engine, formData.target_connection_string]);

  // Handler para obtener schemas
  const handleDiscoverSchemas = useCallback(async () => {
    if (!formData.target_db_engine || !formData.target_connection_string.trim()) {
      return;
    }

    setIsLoadingSchemas(true);
    setSchemas([]);
    setTables([]);
    setFormData(prev => ({ ...prev, target_schema: '', target_table: '' }));

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/discover-schemas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({
          db_engine: formData.target_db_engine,
          connection_string: formData.target_connection_string.trim(),
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
  }, [formData.target_db_engine, formData.target_connection_string]);

  // Handler para cambiar schema y obtener tables
  const handleSchemaChange = useCallback(async (schema: string) => {
    setFormData(prev => ({ ...prev, target_schema: schema, target_table: '' }));
    setTables([]);
    setShowCreateSchema(false);

    if (!schema || !formData.target_db_engine || !formData.target_connection_string.trim()) {
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
          db_engine: formData.target_db_engine,
          connection_string: formData.target_connection_string.trim(),
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
  }, [formData.target_db_engine, formData.target_connection_string]);

  // Handler para crear schema si no existe
  const handleCreateSchema = useCallback(async () => {
    if (!formData.target_schema || !formData.target_db_engine || !formData.target_connection_string.trim()) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/google-sheets-catalog/create-schema', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({
          db_engine: formData.target_db_engine,
          connection_string: formData.target_connection_string.trim(),
          schema_name: formData.target_schema,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Refrescar lista de schemas
          await handleDiscoverSchemas();
          setShowCreateSchema(false);
        }
      }
    } catch (err: any) {
      console.error('Error creating schema:', err);
    }
  }, [formData.target_schema, formData.target_db_engine, formData.target_connection_string, handleDiscoverSchemas]);

  // Handler para crear table si no existe
  const handleCreateTable = useCallback(async () => {
    if (!formData.target_table || !formData.target_schema || !formData.target_db_engine || !formData.target_connection_string.trim()) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/google-sheets-catalog/create-table', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({
          db_engine: formData.target_db_engine,
          connection_string: formData.target_connection_string.trim(),
          schema_name: formData.target_schema,
          table_name: formData.target_table,
          spreadsheet_id: formData.spreadsheet_id,
          api_key: formData.api_key,
          access_token: formData.access_token,
          range: formData.range,
          has_header: analysisResult?.has_header ?? true,
          skip_rows: analysisResult?.skip_rows ?? 0,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Refrescar lista de tables
          await handleSchemaChange(formData.target_schema);
          setShowCreateTable(false);
        }
      }
    } catch (err: any) {
      console.error('Error creating table:', err);
    }
  }, [formData.target_table, formData.target_schema, formData.target_db_engine, formData.target_connection_string, formData.spreadsheet_id, formData.api_key, formData.access_token, formData.range, analysisResult, handleSchemaChange]);


  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 150);
  }, [onClose]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.sheet_name || !formData.spreadsheet_id || !formData.target_db_engine || 
        !formData.target_connection_string || !formData.target_schema || !formData.target_table) {
      setError('Please fill in all required fields');
      return;
    }

    if (!formData.api_key && !formData.access_token) {
      setError('Either API Key or Access Token must be provided');
      return;
    }

    onSave({
      ...formData,
      sync_interval: parseInt(String(formData.sync_interval)) || 3600,
    });
  }, [formData, onSave]);

  return (
    <>
      <BlurOverlay style={{ animation: isClosing ? 'fadeOut 0.15s ease-out' : 'fadeIn 0.15s ease-in' }} onClick={handleClose} />
      <ModalOverlay style={{ animation: isClosing ? 'fadeOut 0.15s ease-out' : 'fadeIn 0.15s ease-in' }}>
        <ModalContent onClick={(e) => e.stopPropagation()}>
          <ModalHeader>Add New Google Sheet Source</ModalHeader>
          
          <form onSubmit={handleSubmit}>
            <FormGroup>
              <Label>Sheet Name *</Label>
              <Input 
                type="text" 
                value={formData.sheet_name}
                onChange={(e) => setFormData(prev => ({ ...prev, sheet_name: e.target.value }))}
                placeholder="e.g., Sales Data, Customer List"
              />
            </FormGroup>

            <FormGroup>
              <Label>Spreadsheet ID *</Label>
              <Input 
                type="text" 
                value={formData.spreadsheet_id}
                onChange={(e) => setFormData(prev => ({ ...prev, spreadsheet_id: e.target.value }))}
                placeholder="e.g., 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
              />
              <HelpText>
                Found in the Google Sheets URL: https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
              </HelpText>
            </FormGroup>

            <FormGroup>
              <Label>API Key</Label>
              <Input 
                type="text" 
                value={formData.api_key}
                onChange={(e) => setFormData(prev => ({ ...prev, api_key: e.target.value }))}
                placeholder="Google Sheets API Key (optional if using Access Token)"
              />
              <HelpText>
                Get your API key from Google Cloud Console. Required if not using Access Token.
              </HelpText>
            </FormGroup>

            <FormGroup>
              <Label>Access Token</Label>
              <Input 
                type="text" 
                value={formData.access_token}
                onChange={(e) => setFormData(prev => ({ ...prev, access_token: e.target.value }))}
                placeholder="OAuth2 Access Token (optional if using API Key)"
              />
              <HelpText>
                OAuth2 access token for authenticated access. Required if not using API Key.
              </HelpText>
            </FormGroup>

            <FormGroup>
              <Label>Sheet / Range *</Label>
              {isLoadingSheets ? (
                <div style={{ padding: theme.spacing.sm, color: theme.colors.text.secondary, fontSize: '0.9em' }}>
                  Loading sheets from spreadsheet...
                </div>
              ) : availableSheets.length > 0 ? (
                <>
                  <Select
                    value={formData.range}
                    onChange={(e) => {
                      const selectedRange = e.target.value;
                      setFormData(prev => ({ ...prev, range: selectedRange }));
                    }}
                  >
                    <option value="">Select Sheet</option>
                    {availableSheets.map((sheet) => (
                      <option key={sheet.sheetId || sheet.index} value={sheet.title}>
                        {sheet.title} (Entire Sheet)
                      </option>
                    ))}
                    {availableSheets.map((sheet) => (
                      <option key={`${sheet.sheetId || sheet.index}-range`} value={`${sheet.title}!A1:Z1000`}>
                        {sheet.title} (A1:Z1000)
                      </option>
                    ))}
                  </Select>
                  <HelpText>
                    Select a sheet from the dropdown or enter a custom range below
                  </HelpText>
                  <Input 
                    type="text" 
                    value={formData.range}
                    onChange={(e) => setFormData(prev => ({ ...prev, range: e.target.value }))}
                    placeholder="Or enter custom range: Sheet1!A1:C10"
                    style={{ marginTop: theme.spacing.xs }}
                  />
                </>
              ) : (
                <>
                  <Input 
                    type="text" 
                    value={formData.range}
                    onChange={(e) => setFormData(prev => ({ ...prev, range: e.target.value }))}
                    placeholder="e.g., Sheet1!A1:C10 or Sheet1"
                  />
                  <HelpText>
                    {formData.spreadsheet_id && (formData.api_key || formData.access_token)
                      ? 'Enter range like "Sheet1!A1:C10" or just "Sheet1" for the entire sheet. Sheets will load automatically.'
                      : 'Enter range like "Sheet1!A1:C10" or just "Sheet1" for the entire sheet. Leave empty for default.'}
                  </HelpText>
                </>
              )}
              {isAnalyzing && (
                <div style={{ marginTop: theme.spacing.xs, fontSize: '0.85em', color: theme.colors.primary.main }}>
                  Analyzing Google Sheet...
                </div>
              )}
              {analysisResult && !isAnalyzing && (
                <AnalysisResult>
                  <div><strong>Analysis Results:</strong></div>
                  <div>Has Header: {analysisResult.has_header ? 'Yes' : 'No'}</div>
                  <div>Skip Rows: {analysisResult.skip_rows}</div>
                  <div>Columns: {analysisResult.column_count}</div>
                  <div>Rows (sample): {analysisResult.row_count}</div>
                  {analysisResult.sample_rows && analysisResult.sample_rows.length > 0 && (
                    <div style={{ marginTop: theme.spacing.xs }}>
                      <div><strong>Sample (first 3 rows):</strong></div>
                      <pre style={{ fontSize: '0.75em', overflow: 'auto', maxHeight: '100px', background: theme.colors.background.secondary, padding: theme.spacing.xs, borderRadius: theme.borderRadius.sm }}>
                        {analysisResult.sample_rows.slice(0, 3).map((row, idx) => 
                          `${idx + 1}: ${row.map(cell => String(cell || '')).join(' | ')}`
                        ).join('\n')}
                      </pre>
                    </div>
                  )}
                </AnalysisResult>
              )}
            </FormGroup>

            <FormGroup>
              <Label>Target DB Engine *</Label>
              <Select
                value={formData.target_db_engine}
                onChange={(e) => setFormData(prev => ({ ...prev, target_db_engine: e.target.value }))}
              >
                <option value="">Select Engine</option>
                <option value="PostgreSQL">PostgreSQL</option>
                <option value="MariaDB">MariaDB</option>
                <option value="MSSQL">MSSQL</option>
                <option value="MongoDB">MongoDB</option>
                <option value="Oracle">Oracle</option>
              </Select>
            </FormGroup>

            <FormGroup>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <Label style={{ marginBottom: 0 }}>Target Connection String *</Label>
                <Button
                  type="button"
                  $variant="secondary"
                  onClick={handleTestConnection}
                  disabled={isTestingConnection || !formData.target_db_engine || !formData.target_connection_string.trim()}
                  style={{ padding: '6px 12px', fontSize: '0.85em', minWidth: 'auto' }}
                >
                  {isTestingConnection ? 'Testing...' : 'Test Connection'}
                </Button>
              </div>
              <Textarea
                value={formData.target_connection_string}
                onChange={(e) => {
                  setFormData(prev => ({ 
                    ...prev, 
                    target_connection_string: e.target.value,
                    target_schema: '',
                    target_table: ''
                  }));
                  setConnectionTestResult(null);
                  setSchemas([]);
                  setTables([]);
                }}
                placeholder={connectionExample || "Enter connection string..."}
              />
              {connectionExample && (
                <ConnectionStringExample>
                  Example: {connectionExample}
                </ConnectionStringExample>
              )}
              {connectionTestResult && (
                <ConnectionTestResult $success={connectionTestResult.success}>
                  {connectionTestResult.success ? '✓ ' : '✗ '}
                  {connectionTestResult.message}
                </ConnectionTestResult>
              )}
            </FormGroup>

            {connectionTestResult?.success ? (
              <>
                <FormGroup>
                  <Label>Target Schema *</Label>
                  <div style={{ display: 'flex', gap: theme.spacing.xs }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                      <Input
                        type="text"
                        list="schema-list-gs"
                        value={formData.target_schema}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFormData(prev => ({ ...prev, target_schema: value.toLowerCase() }));
                          if (value && schemas.includes(value)) {
                            setShowCreateSchema(false);
                            handleSchemaChange(value);
                          } else if (value && !schemas.includes(value)) {
                            setShowCreateSchema(true);
                          } else {
                            setShowCreateSchema(false);
                          }
                        }}
                        disabled={isLoadingSchemas}
                        placeholder={isLoadingSchemas ? 'Loading schemas...' : 'Type or select schema name'}
                      />
                      <datalist id="schema-list-gs">
                        {schemas.map((schema) => (
                          <option key={schema} value={schema} />
                        ))}
                      </datalist>
                    </div>
                    {showCreateSchema && formData.target_schema && (
                      <Button
                        type="button"
                        $variant="primary"
                        onClick={handleCreateSchema}
                        style={{ padding: '6px 12px', fontSize: '0.85em' }}
                      >
                        Create Schema
                      </Button>
                    )}
                  </div>
                  {formData.target_schema && !schemas.includes(formData.target_schema) && !showCreateSchema && (
                    <div style={{ marginTop: theme.spacing.xs, fontSize: '0.85em', color: theme.colors.primary.main }}>
                      Schema "{formData.target_schema}" will be created if it doesn't exist
                    </div>
                  )}
                </FormGroup>

                {formData.target_schema && (
                  <FormGroup>
                    <Label>Target Table *</Label>
                    <div style={{ display: 'flex', gap: theme.spacing.xs }}>
                      <div style={{ flex: 1, position: 'relative' }}>
                        <Input
                          type="text"
                          list="table-list-gs"
                          value={formData.target_table}
                          onChange={(e) => {
                            const value = e.target.value;
                            setFormData(prev => ({ ...prev, target_table: value.toLowerCase() }));
                            if (value && !tables.includes(value)) {
                              setShowCreateTable(true);
                            } else {
                              setShowCreateTable(false);
                            }
                          }}
                          disabled={isLoadingTables}
                          placeholder={isLoadingTables ? 'Loading tables...' : 'Type or select table name'}
                        />
                        <datalist id="table-list-gs">
                          {tables.map((table) => (
                            <option key={table} value={table} />
                          ))}
                        </datalist>
                      </div>
                      {showCreateTable && formData.target_table && (
                        <Button
                          type="button"
                          $variant="primary"
                          onClick={handleCreateTable}
                          style={{ padding: '6px 12px', fontSize: '0.85em' }}
                        >
                          Create Table
                        </Button>
                      )}
                    </div>
                    {formData.target_table && !tables.includes(formData.target_table) && !showCreateTable && (
                      <div style={{ marginTop: theme.spacing.xs, fontSize: '0.85em', color: theme.colors.primary.main }}>
                        Table "{formData.target_table}" will be created if it doesn't exist
                      </div>
                    )}
                  </FormGroup>
                )}
              </>
            ) : (
              <>
                <FormGroup>
                  <Label>Target Schema *</Label>
                  <Input
                    type="text"
                    value={formData.target_schema}
                    onChange={(e) => setFormData(prev => ({ ...prev, target_schema: e.target.value.toLowerCase() }))}
                    placeholder="schema_name"
                  />
                </FormGroup>

                <FormGroup>
                  <Label>Target Table *</Label>
                  <Input
                    type="text"
                    value={formData.target_table}
                    onChange={(e) => setFormData(prev => ({ ...prev, target_table: e.target.value.toLowerCase() }))}
                    placeholder="table_name"
                  />
                </FormGroup>
              </>
            )}

            <FormGroup>
              <Label>Sync Interval (seconds)</Label>
              <Input
                type="number"
                value={formData.sync_interval}
                onChange={(e) => setFormData(prev => ({ ...prev, sync_interval: parseInt(e.target.value) || 3600 }))}
                min="60"
                placeholder="3600"
              />
            </FormGroup>

            <FormGroup>
              <CheckboxContainer>
                <Checkbox
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                />
                <Label style={{ margin: 0, cursor: 'pointer' }}>Active</Label>
              </CheckboxContainer>
            </FormGroup>

            {error && <ErrorMessage>{error}</ErrorMessage>}

            <ButtonGroup>
              <Button type="button" $variant="secondary" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" $variant="primary">
                Save Google Sheet Source
              </Button>
            </ButtonGroup>
          </form>
        </ModalContent>
      </ModalOverlay>
    </>
  );
};

export default AddGoogleSheetsModal;

