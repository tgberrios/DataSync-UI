import React, { useState, useCallback, useMemo } from 'react';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { ConnectionStringSelector } from '../shared/ConnectionStringSelector';


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
  
  // Estados para validación/preview del Spreadsheet ID
  const [isValidatingSheet, setIsValidatingSheet] = useState(false);
  const [sheetPreview, setSheetPreview] = useState<{
    valid: boolean;
    title?: string;
    sheets?: Array<{title: string, sheetId: number | null, index: number}>;
    error?: string;
  } | null>(null);
  
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

  // Handler para validar el Spreadsheet ID
  const handleValidateSheetId = useCallback(async () => {
    if (!formData.spreadsheet_id || formData.spreadsheet_id.length < 20) {
      setSheetPreview(null);
      return;
    }

    if (!formData.api_key && !formData.access_token) {
      setSheetPreview(null);
      return;
    }

    setIsValidatingSheet(true);
    setSheetPreview(null);

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/google-sheets-catalog/validate-sheet', {
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
        setSheetPreview({
          valid: data.success,
          title: data.title,
          sheets: data.sheets,
          error: data.error
        });
      } else {
        const errorData = await response.json();
        setSheetPreview({
          valid: false,
          error: errorData.error || 'Failed to validate spreadsheet'
        });
      }
    } catch (err) {
      setSheetPreview({
        valid: false,
        error: 'Network error. Please check your connection.'
      });
    } finally {
      setIsValidatingSheet(false);
    }
  }, [formData.spreadsheet_id, formData.api_key, formData.access_token]);

  // Validar Spreadsheet ID automáticamente cuando se ingresa
  React.useEffect(() => {
    if (formData.spreadsheet_id && formData.spreadsheet_id.length >= 20 && (formData.api_key || formData.access_token)) {
      const timer = setTimeout(() => {
        handleValidateSheetId();
      }, 800);
      return () => clearTimeout(timer);
    } else {
      setSheetPreview(null);
    }
  }, [formData.spreadsheet_id, formData.api_key, formData.access_token, handleValidateSheetId]);

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
    if (!formData.target_db_engine || !formData.target_connection_string || !formData.target_connection_string.trim()) {
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
    } catch (err) {
      setConnectionTestResult({ success: false, message: err.message || 'Error testing connection' });
    } finally {
      setIsTestingConnection(false);
    }
  }, [formData.target_db_engine, formData.target_connection_string, handleDiscoverSchemas]);

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
      <div 
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backdropFilter: "blur(5px)",
          background: "rgba(0, 0, 0, 0.3)",
          zIndex: 999,
          animation: isClosing ? 'fadeOut 0.15s ease-out' : 'fadeIn 0.15s ease-in'
        }}
        onClick={handleClose}
      />
      <div 
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000,
          animation: isClosing ? 'fadeOut 0.15s ease-out' : 'fadeIn 0.15s ease-in'
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            handleClose();
          }
        }}
      >
        <div 
          style={{
            background: asciiColors.background,
            padding: "24px",
            borderRadius: 2,
            minWidth: 700,
            maxWidth: 900,
            maxHeight: "90vh",
            overflowY: "auto",
            fontFamily: "Consolas",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
            animation: "slideUp 0.2s ease-out",
            border: `2px solid ${asciiColors.border}`
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <h2 style={{
            borderBottom: `2px solid ${asciiColors.border}`,
            paddingBottom: "8px",
            marginBottom: "20px",
            fontSize: 14,
            fontWeight: 600,
            position: "relative",
            fontFamily: "Consolas",
            color: asciiColors.foreground,
            textTransform: "uppercase"
          }}>
            <span style={{ color: asciiColors.accent, marginRight: 8 }}>{ascii.blockFull}</span>
            ADD NEW GOOGLE SHEET SOURCE
          </h2>
          
          <form onSubmit={handleSubmit} style={{ fontFamily: "Consolas", fontSize: 12 }}>
            <div style={{ marginBottom: 16 }}>
              <label style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                color: asciiColors.foreground,
                marginBottom: 6,
                fontFamily: "Consolas",
                textTransform: "uppercase"
              }}>
                {ascii.v} SHEET NAME *
              </label>
              <input
                type="text"
                value={formData.sheet_name}
                onChange={(e) => setFormData(prev => ({ ...prev, sheet_name: e.target.value }))}
                placeholder="e.g., Sales Data, Customer List"
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  border: `1px solid ${asciiColors.border}`,
                  borderRadius: 2,
                  fontSize: 12,
                  fontFamily: "Consolas",
                  backgroundColor: asciiColors.background,
                  color: asciiColors.foreground,
                  outline: "none"
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = asciiColors.accent;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = asciiColors.border;
                }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                color: asciiColors.foreground,
                marginBottom: 6,
                fontFamily: "Consolas",
                textTransform: "uppercase"
              }}>
                {ascii.v} SPREADSHEET ID *
              </label>
              <input
                type="text"
                value={formData.spreadsheet_id}
                onChange={(e) => setFormData(prev => ({ ...prev, spreadsheet_id: e.target.value }))}
                placeholder="e.g., 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  border: `1px solid ${asciiColors.border}`,
                  borderRadius: 2,
                  fontSize: 12,
                  fontFamily: "Consolas",
                  backgroundColor: asciiColors.background,
                  color: asciiColors.foreground,
                  outline: "none"
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = asciiColors.accent;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = asciiColors.border;
                }}
              />
              <div style={{
                marginTop: 6,
                fontSize: 11,
                color: asciiColors.muted,
                fontStyle: "italic",
                fontFamily: "Consolas"
              }}>
                Found in the Google Sheets URL: https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
              </div>
              {isValidatingSheet && (
                <div style={{
                  marginTop: 6,
                  fontSize: 11,
                  color: asciiColors.muted,
                  fontFamily: "Consolas"
                }}>
                  {ascii.blockFull} Validating spreadsheet...
                </div>
              )}
              {sheetPreview && (
                <div style={{
                  marginTop: 8,
                  padding: 8,
                  backgroundColor: sheetPreview.valid ? asciiColors.backgroundSoft : asciiColors.background,
                  border: `1px solid ${sheetPreview.valid ? asciiColors.accent : asciiColors.foreground}`,
                  borderRadius: 2,
                  fontSize: 11,
                  fontFamily: "Consolas"
                }}>
                  {sheetPreview.valid ? (
                    <>
                      <div style={{ color: asciiColors.accent, fontWeight: 600, marginBottom: 4 }}>
                        ✓ Spreadsheet found
                      </div>
                      {sheetPreview.title && (
                        <div style={{ color: asciiColors.foreground, marginBottom: 4 }}>
                          Title: {sheetPreview.title}
                        </div>
                      )}
                      {sheetPreview.sheets && sheetPreview.sheets.length > 0 && (
                        <div style={{ color: asciiColors.muted, fontSize: 10 }}>
                          Available sheets: {sheetPreview.sheets.map(s => s.title).join(', ')}
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ color: asciiColors.foreground }}>
                      ✗ {sheetPreview.error || 'Invalid spreadsheet ID or access denied'}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                color: asciiColors.foreground,
                marginBottom: 6,
                fontFamily: "Consolas",
                textTransform: "uppercase"
              }}>
                {ascii.v} API KEY
              </label>
              <input
                type="text"
                value={formData.api_key}
                onChange={(e) => setFormData(prev => ({ ...prev, api_key: e.target.value }))}
                placeholder="Google Sheets API Key (optional if using Access Token)"
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  border: `1px solid ${asciiColors.border}`,
                  borderRadius: 2,
                  fontSize: 12,
                  fontFamily: "Consolas",
                  backgroundColor: asciiColors.background,
                  color: asciiColors.foreground,
                  outline: "none"
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = asciiColors.accent;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = asciiColors.border;
                }}
              />
              <div style={{
                marginTop: 6,
                fontSize: 11,
                color: asciiColors.muted,
                fontStyle: "italic",
                fontFamily: "Consolas"
              }}>
                Get your API key from{' '}
                <a 
                  href="https://console.cloud.google.com/apis/credentials" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ 
                    color: asciiColors.accent, 
                    textDecoration: 'underline',
                    cursor: 'pointer'
                  }}
                >
                  Google Cloud Console
                </a>
                . Required if not using Access Token.
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                color: asciiColors.foreground,
                marginBottom: 6,
                fontFamily: "Consolas",
                textTransform: "uppercase"
              }}>
                {ascii.v} ACCESS TOKEN
              </label>
              <input
                type="text"
                value={formData.access_token}
                onChange={(e) => setFormData(prev => ({ ...prev, access_token: e.target.value }))}
                placeholder="OAuth2 Access Token (optional if using API Key)"
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  border: `1px solid ${asciiColors.border}`,
                  borderRadius: 2,
                  fontSize: 12,
                  fontFamily: "Consolas",
                  backgroundColor: asciiColors.background,
                  color: asciiColors.foreground,
                  outline: "none"
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = asciiColors.accent;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = asciiColors.border;
                }}
              />
              <div style={{
                marginTop: 6,
                fontSize: 11,
                color: asciiColors.muted,
                fontStyle: "italic",
                fontFamily: "Consolas"
              }}>
                OAuth2 access token for authenticated access. Required if not using API Key.{' '}
                <a 
                  href="https://console.cloud.google.com/apis/credentials" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ 
                    color: asciiColors.accent, 
                    textDecoration: 'underline',
                    cursor: 'pointer'
                  }}
                >
                  Get credentials from Google Cloud Console
                </a>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                color: asciiColors.foreground,
                marginBottom: 6,
                fontFamily: "Consolas",
                textTransform: "uppercase"
              }}>
                {ascii.v} SHEET / RANGE *
              </label>
              {isLoadingSheets ? (
                <div style={{ padding: 8, color: asciiColors.muted, fontSize: 12, fontFamily: "Consolas" }}>
                  {ascii.blockFull} Loading sheets from spreadsheet...
                </div>
              ) : availableSheets.length > 0 ? (
                <>
                  <select
                    value={formData.range}
                    onChange={(e) => {
                      const selectedRange = e.target.value;
                      setFormData(prev => ({ ...prev, range: selectedRange }));
                    }}
                    style={{
                      width: "100%",
                      padding: "6px 10px",
                      border: `1px solid ${asciiColors.border}`,
                      borderRadius: 2,
                      fontSize: 12,
                      fontFamily: "Consolas",
                      backgroundColor: asciiColors.background,
                      color: asciiColors.foreground,
                      cursor: "pointer",
                      outline: "none",
                      marginBottom: 8
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = asciiColors.accent;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = asciiColors.border;
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
                  </select>
                  <div style={{
                    marginTop: 6,
                    fontSize: 11,
                    color: asciiColors.muted,
                    fontStyle: "italic",
                    fontFamily: "Consolas"
                  }}>
                    Select a sheet from the dropdown or enter a custom range below
                  </div>
                  <input
                    type="text"
                    value={formData.range}
                    onChange={(e) => setFormData(prev => ({ ...prev, range: e.target.value }))}
                    placeholder="Or enter custom range: Sheet1!A1:C10"
                    style={{
                      width: "100%",
                      padding: "6px 10px",
                      border: `1px solid ${asciiColors.border}`,
                      borderRadius: 2,
                      fontSize: 12,
                      fontFamily: "Consolas",
                      backgroundColor: asciiColors.background,
                      color: asciiColors.foreground,
                      outline: "none",
                      marginTop: 8
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = asciiColors.accent;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = asciiColors.border;
                    }}
                  />
                </>
              ) : (
                <>
                  <input
                    type="text"
                    value={formData.range}
                    onChange={(e) => setFormData(prev => ({ ...prev, range: e.target.value }))}
                    placeholder="e.g., Sheet1!A1:C10 or Sheet1"
                    style={{
                      width: "100%",
                      padding: "6px 10px",
                      border: `1px solid ${asciiColors.border}`,
                      borderRadius: 2,
                      fontSize: 12,
                      fontFamily: "Consolas",
                      backgroundColor: asciiColors.background,
                      color: asciiColors.foreground,
                      outline: "none"
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = asciiColors.accent;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = asciiColors.border;
                    }}
                  />
                  <div style={{
                    marginTop: 6,
                    fontSize: 11,
                    color: asciiColors.muted,
                    fontStyle: "italic",
                    fontFamily: "Consolas"
                  }}>
                    {formData.spreadsheet_id && (formData.api_key || formData.access_token)
                      ? 'Enter range like "Sheet1!A1:C10" or just "Sheet1" for the entire sheet. Sheets will load automatically.'
                      : 'Enter range like "Sheet1!A1:C10" or just "Sheet1" for the entire sheet. Leave empty for default.'}
                  </div>
                </>
              )}
              {isAnalyzing && (
                <div style={{ marginTop: 8, fontSize: 12, color: asciiColors.accent, fontFamily: "Consolas" }}>
                  {ascii.blockFull} Analyzing Google Sheet...
                </div>
              )}
              {analysisResult && !isAnalyzing && (
                <div style={{
                  marginTop: 12,
                  padding: 12,
                  background: asciiColors.accentSoft + "20",
                  borderRadius: 2,
                  borderLeft: `3px solid ${asciiColors.accent}`,
                  fontSize: 12,
                  color: asciiColors.foreground,
                  fontFamily: "Consolas"
                }}>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>Analysis Results:</div>
                  <div>Has Header: {analysisResult.has_header ? 'Yes' : 'No'}</div>
                  <div>Skip Rows: {analysisResult.skip_rows}</div>
                  <div>Columns: {analysisResult.column_count}</div>
                  <div>Rows (sample): {analysisResult.row_count}</div>
                  {analysisResult.sample_rows && analysisResult.sample_rows.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>Sample (first 3 rows):</div>
                      <pre style={{
                        fontSize: 11,
                        overflow: 'auto',
                        maxHeight: '100px',
                        background: asciiColors.backgroundSoft,
                        padding: 8,
                        borderRadius: 2,
                        fontFamily: "Consolas",
                        border: `1px solid ${asciiColors.border}`
                      }}>
                        {analysisResult.sample_rows.slice(0, 3).map((row, idx) =>
                          `${idx + 1}: ${row.map(cell => String(cell || '')).join(' | ')}`
                        ).join('\n')}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                color: asciiColors.foreground,
                marginBottom: 6,
                fontFamily: "Consolas",
                textTransform: "uppercase"
              }}>
                {ascii.v} TARGET DB ENGINE *
              </label>
              <select
                value={formData.target_db_engine}
                onChange={(e) => setFormData(prev => ({ ...prev, target_db_engine: e.target.value }))}
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  border: `1px solid ${asciiColors.border}`,
                  borderRadius: 2,
                  fontSize: 12,
                  fontFamily: "Consolas",
                  backgroundColor: asciiColors.background,
                  color: asciiColors.foreground,
                  cursor: "pointer",
                  outline: "none"
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = asciiColors.accent;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = asciiColors.border;
                }}
              >
                <option value="">Select Engine</option>
                <option value="PostgreSQL">PostgreSQL</option>
                <option value="MariaDB">MariaDB</option>
                <option value="MSSQL">MSSQL</option>
                <option value="MongoDB">MongoDB</option>
                <option value="Oracle">Oracle</option>
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <ConnectionStringSelector
                value={formData.target_connection_string}
                onChange={(val) => {
                  setFormData(prev => ({
                    ...prev,
                    target_connection_string: val,
                    target_schema: '',
                    target_table: ''
                  }));
                  setConnectionTestResult(null);
                  setSchemas([]);
                  setTables([]);
                }}
                dbEngine={formData.target_db_engine}
                label="Target Connection String"
                required
                onTestConnection={handleTestConnection}
                isTesting={isTestingConnection}
                testResult={connectionTestResult}
                placeholder={connectionExample || "Enter connection string..."}
              />
              {connectionExample && (
                <div style={{
                  marginTop: 8,
                  padding: 8,
                  background: asciiColors.backgroundSoft,
                  borderRadius: 2,
                  borderLeft: `3px solid ${asciiColors.accent}`,
                  fontFamily: "Consolas",
                  fontSize: 11,
                  color: asciiColors.muted,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all"
                }}>
                  Example: {connectionExample}
                </div>
              )}
              {connectionTestResult && (
                <div style={{
                  marginTop: 8,
                  padding: "8px 12px",
                  borderRadius: 2,
                  fontSize: 12,
                  fontFamily: "Consolas",
                  backgroundColor: connectionTestResult.success ? asciiColors.success : asciiColors.danger,
                  color: asciiColors.background
                }}>
                  {connectionTestResult.success ? '✓ ' : '✗ '}
                  {connectionTestResult.message}
                </div>
              )}
            </div>

            {connectionTestResult?.success ? (
              <>
                <div style={{ marginBottom: 16 }}>
                  <label style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 600,
                    color: asciiColors.foreground,
                    marginBottom: 6,
                    fontFamily: "Consolas",
                    textTransform: "uppercase"
                  }}>
                    {ascii.v} TARGET SCHEMA *
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                      <input
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
                        style={{
                          width: "100%",
                          padding: "6px 10px",
                          border: `1px solid ${asciiColors.border}`,
                          borderRadius: 2,
                          fontSize: 12,
                          fontFamily: "Consolas",
                          backgroundColor: asciiColors.background,
                          color: asciiColors.foreground,
                          outline: "none"
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = asciiColors.accent;
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = asciiColors.border;
                        }}
                      />
                      <datalist id="schema-list-gs">
                        {schemas.map((schema) => (
                          <option key={schema} value={schema} />
                        ))}
                      </datalist>
                    </div>
                    {showCreateSchema && formData.target_schema && (
                      <AsciiButton
                        label="Create Schema"
                        onClick={handleCreateSchema}
                        variant="primary"
                      />
                    )}
                  </div>
                  {formData.target_schema && !schemas.includes(formData.target_schema) && !showCreateSchema && (
                    <div style={{ marginTop: 6, fontSize: 11, color: asciiColors.accent, fontFamily: "Consolas" }}>
                      Schema "{formData.target_schema}" will be created if it doesn't exist
                    </div>
                  )}
                </div>

                {formData.target_schema && (
                  <div style={{ marginBottom: 16 }}>
                    <label style={{
                      display: "block",
                      fontSize: 12,
                      fontWeight: 600,
                      color: asciiColors.foreground,
                      marginBottom: 6,
                      fontFamily: "Consolas",
                      textTransform: "uppercase"
                    }}>
                      {ascii.v} TARGET TABLE *
                    </label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <div style={{ flex: 1, position: 'relative' }}>
                        <input
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
                          style={{
                            width: "100%",
                            padding: "6px 10px",
                            border: `1px solid ${asciiColors.border}`,
                            borderRadius: 2,
                            fontSize: 12,
                            fontFamily: "Consolas",
                            backgroundColor: asciiColors.background,
                            color: asciiColors.foreground,
                            outline: "none"
                          }}
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor = asciiColors.accent;
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = asciiColors.border;
                          }}
                        />
                        <datalist id="table-list-gs">
                          {tables.map((table) => (
                            <option key={table} value={table} />
                          ))}
                        </datalist>
                      </div>
                      {showCreateTable && formData.target_table && (
                        <AsciiButton
                          label="Create Table"
                          onClick={handleCreateTable}
                          variant="primary"
                        />
                      )}
                    </div>
                    {formData.target_table && !tables.includes(formData.target_table) && !showCreateTable && (
                      <div style={{ marginTop: 6, fontSize: 11, color: asciiColors.accent, fontFamily: "Consolas" }}>
                        Table "{formData.target_table}" will be created if it doesn't exist
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                <div style={{ marginBottom: 16 }}>
                  <label style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 600,
                    color: asciiColors.foreground,
                    marginBottom: 6,
                    fontFamily: "Consolas",
                    textTransform: "uppercase"
                  }}>
                    {ascii.v} TARGET SCHEMA *
                  </label>
                  <input
                    type="text"
                    value={formData.target_schema}
                    onChange={(e) => setFormData(prev => ({ ...prev, target_schema: e.target.value.toLowerCase() }))}
                    placeholder="schema_name"
                    style={{
                      width: "100%",
                      padding: "6px 10px",
                      border: `1px solid ${asciiColors.border}`,
                      borderRadius: 2,
                      fontSize: 12,
                      fontFamily: "Consolas",
                      backgroundColor: asciiColors.background,
                      color: asciiColors.foreground,
                      outline: "none"
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = asciiColors.accent;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = asciiColors.border;
                    }}
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 600,
                    color: asciiColors.foreground,
                    marginBottom: 6,
                    fontFamily: "Consolas",
                    textTransform: "uppercase"
                  }}>
                    {ascii.v} TARGET TABLE *
                  </label>
                  <input
                    type="text"
                    value={formData.target_table}
                    onChange={(e) => setFormData(prev => ({ ...prev, target_table: e.target.value.toLowerCase() }))}
                    placeholder="table_name"
                    style={{
                      width: "100%",
                      padding: "6px 10px",
                      border: `1px solid ${asciiColors.border}`,
                      borderRadius: 2,
                      fontSize: 12,
                      fontFamily: "Consolas",
                      backgroundColor: asciiColors.background,
                      color: asciiColors.foreground,
                      outline: "none"
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = asciiColors.accent;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = asciiColors.border;
                    }}
                  />
                </div>
              </>
            )}

            <div style={{ marginBottom: 16 }}>
              <label style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                color: asciiColors.foreground,
                marginBottom: 6,
                fontFamily: "Consolas",
                textTransform: "uppercase"
              }}>
                {ascii.v} SYNC INTERVAL (SECONDS)
              </label>
              <input
                type="number"
                value={formData.sync_interval}
                onChange={(e) => setFormData(prev => ({ ...prev, sync_interval: parseInt(e.target.value) || 3600 }))}
                min="60"
                placeholder="3600"
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  border: `1px solid ${asciiColors.border}`,
                  borderRadius: 2,
                  fontSize: 12,
                  fontFamily: "Consolas",
                  backgroundColor: asciiColors.background,
                  color: asciiColors.foreground,
                  outline: "none"
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = asciiColors.accent;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = asciiColors.border;
                }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                  style={{
                    width: 18,
                    height: 18,
                    cursor: "pointer"
                  }}
                />
                <label style={{
                  margin: 0,
                  cursor: "pointer",
                  fontSize: 12,
                  fontFamily: "Consolas",
                  color: asciiColors.foreground
                }}>
                  Active
                </label>
              </div>
            </div>

            {error && (
              <div style={{
                color: asciiColors.danger,
                background: asciiColors.danger + "20",
                padding: 12,
                borderRadius: 2,
                marginTop: 12,
                fontSize: 12,
                fontFamily: "Consolas",
                border: `1px solid ${asciiColors.danger}`
              }}>
                {error}
              </div>
            )}

            <div style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
              marginTop: 20
            }}>
              <AsciiButton
                label="Cancel"
                onClick={handleClose}
                variant="ghost"
              />
              <button
                type="submit"
                style={{
                  padding: "6px 16px",
                  border: `1px solid ${asciiColors.accent}`,
                  borderRadius: 2,
                  fontSize: 12,
                  fontFamily: "Consolas",
                  backgroundColor: asciiColors.accent,
                  color: asciiColors.background,
                  cursor: "pointer",
                  fontWeight: 600,
                  outline: "none"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = asciiColors.accentSoft;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = asciiColors.accent;
                }}
              >
                Save Google Sheet Source
              </button>
            </div>
          </form>
        </div>
      </div>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
};

export default AddGoogleSheetsModal;

