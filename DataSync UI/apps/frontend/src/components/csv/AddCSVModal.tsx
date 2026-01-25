import React, { useState, useCallback, useMemo, useRef } from 'react';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { ConnectionStringSelector } from '../shared/ConnectionStringSelector';
import { csvCatalogApi } from '../../services/api';


interface AddCSVModalProps {
  onClose: () => void;
  onSave: (entry: any, isEdit?: boolean, originalCsvName?: string) => void;
  initialData?: Partial<any>;
}

const connectionStringExamples: Record<string, string> = {
  MariaDB: 'host=localhost;user=myuser;password=mypassword;db=mydatabase;port=3306',
  MSSQL: 'DRIVER={ODBC Driver 17 for SQL Server};SERVER=localhost,1433;DATABASE=mydatabase;UID=myuser;PWD=mypassword',
  Oracle: 'host=localhost;user=myuser;password=mypassword;db=mydatabase;port=1521',
  PostgreSQL: 'postgresql://myuser:mypassword@localhost:5432/mydatabase',
  MongoDB: 'mongodb://myuser:mypassword@localhost:27017/mydatabase',
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};


const AddCSVModal: React.FC<AddCSVModalProps> = ({ onClose, onSave, initialData }) => {
  const isEditMode = initialData?.csv_name && !initialData.csv_name.endsWith(' (Copy)');
  const originalCsvName = isEditMode ? initialData?.csv_name : undefined;
  
  const [formData, setFormData] = useState({
    csv_name: isEditMode ? (initialData?.csv_name || '') : (initialData?.csv_name ? `${initialData.csv_name} (Copy)` : ''),
    source_type: initialData?.source_type || 'FILEPATH',
    source_path: initialData?.source_path || '',
    has_header: initialData?.has_header !== undefined ? initialData.has_header : true,
    delimiter: initialData?.delimiter || ',',
    skip_rows: initialData?.skip_rows || 0,
    skip_empty_rows: initialData?.skip_empty_rows !== undefined ? initialData.skip_empty_rows : true,
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
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Estados para análisis de CSV
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    delimiter: string;
    has_header: boolean;
    skip_rows: number;
    sample_lines?: string[];
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

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
      setError('Please select a CSV file');
      return;
    }

    setUploadedFile(file);
    setError(null);
    setIsUploading(true);
    setUploadProgress('Uploading file...');

    try {
      const result = await csvCatalogApi.uploadCSV(file);
      setFormData(prev => ({
        ...prev,
        source_path: result.filePath,
        source_type: 'UPLOADED_FILE',
      }));
      setUploadProgress(`File uploaded successfully: ${result.fileName}`);
      setIsUploading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to upload file');
      setUploadedFile(null);
      setIsUploading(false);
      setUploadProgress('');
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      // Si no está en modo UPLOADED_FILE, cambiar automáticamente
      if (formData.source_type !== 'UPLOADED_FILE') {
        setFormData(prev => ({
          ...prev,
          source_type: 'UPLOADED_FILE',
        }));
      }
      handleFileSelect(files[0]);
    }
  }, [formData.source_type, handleFileSelect]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files[0]);
    }
  }, [handleFileSelect]);

  const handleRemoveFile = useCallback(() => {
    setUploadedFile(null);
    setFormData(prev => ({
      ...prev,
      source_path: '',
    }));
    setUploadProgress('');
    setAnalysisResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Handler para analizar CSV automáticamente
  const handleAnalyzeCSV = useCallback(async () => {
    if (!formData.source_path || !formData.source_type) {
      return;
    }

    // Solo analizar si es FILEPATH o UPLOADED_FILE
    if (formData.source_type !== 'FILEPATH' && formData.source_type !== 'UPLOADED_FILE') {
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/csv-catalog/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({
          source_path: formData.source_path,
          source_type: formData.source_type,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAnalysisResult(data);
          // Aplicar los valores detectados
          setFormData(prev => ({
            ...prev,
            delimiter: data.delimiter || prev.delimiter,
            has_header: data.has_header !== undefined ? data.has_header : prev.has_header,
            skip_rows: data.skip_rows || 0,
          }));
        }
      }
    } catch (err: any) {
      console.error('Error analyzing CSV:', err);
    } finally {
      setIsAnalyzing(false);
    }
  }, [formData.source_path, formData.source_type]);

  // Analizar automáticamente cuando cambia source_path
  React.useEffect(() => {
    if (formData.source_path && (formData.source_type === 'FILEPATH' || formData.source_type === 'UPLOADED_FILE')) {
      const timer = setTimeout(() => {
        handleAnalyzeCSV();
      }, 500); // Debounce de 500ms
      return () => clearTimeout(timer);
    }
  }, [formData.source_path, formData.source_type, handleAnalyzeCSV]);

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
      const response = await fetch('/api/csv-catalog/create-schema', {
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
      const response = await fetch('/api/csv-catalog/create-table', {
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
          source_path: formData.source_path,
          has_header: formData.has_header,
          delimiter: formData.delimiter,
          skip_rows: formData.skip_rows,
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
  }, [formData.target_table, formData.target_schema, formData.target_db_engine, formData.target_connection_string, formData.source_path, formData.has_header, formData.delimiter, formData.skip_rows, handleSchemaChange]);


  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 150);
  }, [onClose]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.csv_name || !formData.source_path || !formData.target_db_engine || 
        !formData.target_connection_string || !formData.target_schema || !formData.target_table) {
      setError('Please fill in all required fields');
      return;
    }

    onSave({
      ...formData,
      skip_rows: parseInt(String(formData.skip_rows)) || 0,
      sync_interval: parseInt(String(formData.sync_interval)) || 3600,
    }, isEditMode, originalCsvName);
  }, [formData, onSave, isEditMode, originalCsvName]);

  const handleGlobalDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  }, []);

  const handleGlobalDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Usar un pequeño delay para evitar que se desactive cuando se mueve entre elementos
    setTimeout(() => {
      const relatedTarget = e.relatedTarget as HTMLElement;
      if (!relatedTarget || !document.querySelector('[data-modal-content]')?.contains(relatedTarget)) {
        setIsDragging(false);
      }
    }, 50);
  }, []);

  const handleGlobalDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      // Cambiar automáticamente a UPLOADED_FILE si no lo está
      if (formData.source_type !== 'UPLOADED_FILE') {
        setFormData(prev => ({
          ...prev,
          source_type: 'UPLOADED_FILE',
        }));
      }
      handleFileSelect(files[0]);
    }
  }, [formData.source_type, handleFileSelect]);

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
          animation: isClosing ? "fadeOut 0.15s ease-out" : "fadeIn 0.15s ease-in"
        }}
        onClick={() => {
          if (!isDragging) {
            handleClose();
          }
        }}
        onDragOver={handleGlobalDragOver}
        onDragLeave={handleGlobalDragLeave}
        onDrop={handleGlobalDrop}
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
          animation: isClosing ? "fadeOut 0.15s ease-out" : "fadeIn 0.15s ease-in"
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget && !isDragging) {
            handleClose();
          }
        }}
        onDragOver={handleGlobalDragOver}
        onDragLeave={handleGlobalDragLeave}
        onDrop={handleGlobalDrop}
      >
        <div 
          data-modal-content
          style={{
            minWidth: 700,
            maxWidth: 900,
            maxHeight: "90vh",
            overflowY: "auto",
            animation: isClosing ? "slideDown 0.15s ease-out" : "slideUp 0.2s ease-out"
          }}
          onClick={(e) => e.stopPropagation()}
          onDragOver={handleGlobalDragOver}
          onDragLeave={handleGlobalDragLeave}
          onDrop={handleGlobalDrop}
        >
          <div style={{
            border: `2px solid ${asciiColors.border}`,
            backgroundColor: asciiColors.background,
            fontFamily: "Consolas",
            fontSize: 12,
            color: asciiColors.foreground,
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)"
          }}>
            <div style={{
              padding: "16px 20px",
              borderBottom: `2px solid ${asciiColors.border}`,
              backgroundColor: asciiColors.backgroundSoft
            }}>
              <h2 style={{
                fontSize: 14,
                fontWeight: 600,
                margin: 0,
                fontFamily: "Consolas",
                color: asciiColors.foreground,
                textTransform: "uppercase",
                letterSpacing: 0.5
              }}>
                <span style={{ color: asciiColors.accent, marginRight: 8 }}>{ascii.blockFull}</span>
                {isEditMode ? `EDIT CSV: ${originalCsvName}` : 'ADD NEW CSV SOURCE'}
              </h2>
            </div>
            
            <div style={{ padding: "20px" }}>
          
              <form 
                onSubmit={handleSubmit}
                onDragOver={handleGlobalDragOver}
                onDragLeave={handleGlobalDragLeave}
                onDrop={handleGlobalDrop}
              >
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
                    CSV NAME *
                  </label>
                  <input
                    type="text"
                    value={formData.csv_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, csv_name: e.target.value }))}
                    placeholder="e.g., Sales Data, Customer List"
                    disabled={isEditMode}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: `1px solid ${asciiColors.border}`,
                      borderRadius: 2,
                      fontSize: 12,
                      fontFamily: "Consolas",
                      backgroundColor: isEditMode ? asciiColors.backgroundSoft : asciiColors.background,
                      color: isEditMode ? asciiColors.muted : asciiColors.foreground,
                      outline: "none",
                      cursor: isEditMode ? "not-allowed" : "text"
                    }}
                    onFocus={(e) => {
                      if (!isEditMode) {
                        e.currentTarget.style.borderColor = asciiColors.accent;
                      }
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
                    SOURCE TYPE *
                  </label>
                  <select
                    value={formData.source_type}
                    onChange={(e) => {
                      const newType = e.target.value;
                      setFormData(prev => ({ ...prev, source_type: newType, source_path: newType !== 'UPLOADED_FILE' ? prev.source_path : '' }));
                      if (newType !== 'UPLOADED_FILE') {
                        setUploadedFile(null);
                        setUploadProgress('');
                      }
                    }}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
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
                    <option value="FILEPATH">File Path</option>
                    <option value="URL">URL</option>
                    <option value="ENDPOINT">Endpoint</option>
                    <option value="UPLOADED_FILE">Uploaded File</option>
                  </select>
                </div>

                {formData.source_type === 'UPLOADED_FILE' ? (
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
                      UPLOAD CSV FILE *
                    </label>
                    <div
                      style={{
                        border: `2px dashed ${isDragging ? asciiColors.accent : uploadedFile ? asciiColors.success : asciiColors.border}`,
                        borderRadius: 2,
                        padding: 24,
                        textAlign: "center",
                        cursor: "pointer",
                        transition: "all 0.3s ease",
                        backgroundColor: isDragging ? `${asciiColors.accentSoft}20` : uploadedFile ? asciiColors.backgroundSoft : asciiColors.background,
                        fontFamily: "Consolas",
                        fontSize: 12
                      }}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      onMouseEnter={(e) => {
                        if (!uploadedFile && !isDragging) {
                          e.currentTarget.style.borderColor = asciiColors.accent;
                          e.currentTarget.style.backgroundColor = asciiColors.backgroundSoft;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!uploadedFile && !isDragging) {
                          e.currentTarget.style.borderColor = asciiColors.border;
                          e.currentTarget.style.backgroundColor = asciiColors.background;
                        }
                      }}
                    >
                      <div style={{ fontSize: 48, marginBottom: 12, color: asciiColors.accent }}>
                        {ascii.blockFull}
                      </div>
                      <div style={{
                        color: asciiColors.foreground,
                        fontSize: 12,
                        marginBottom: 6,
                        fontFamily: "Consolas"
                      }}>
                        {uploadedFile
                          ? `File: ${uploadedFile.name}`
                          : isDragging
                          ? 'Drop your CSV file here'
                          : 'Click to upload or drag and drop'}
                      </div>
                      <div style={{
                        color: asciiColors.muted,
                        fontSize: 11,
                        fontFamily: "Consolas"
                      }}>
                        {uploadedFile
                          ? formatFileSize(uploadedFile.size)
                          : 'CSV files only, no size limit'}
                      </div>
                      {uploadedFile && (
                        <div style={{
                          marginTop: 12,
                          padding: 12,
                          backgroundColor: asciiColors.background,
                          borderRadius: 2,
                          border: `1px solid ${asciiColors.border}`
                        }}>
                          <div style={{
                            fontWeight: 600,
                            color: asciiColors.foreground,
                            marginBottom: 6,
                            fontFamily: "Consolas",
                            fontSize: 12
                          }}>
                            {uploadedFile.name}
                          </div>
                          <div style={{
                            fontSize: 11,
                            color: asciiColors.muted,
                            fontFamily: "Consolas"
                          }}>
                            {formatFileSize(uploadedFile.size)}
                          </div>
                          <button
                            type="button"
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                              handleRemoveFile();
                            }}
                            style={{
                              marginTop: 8,
                              padding: "6px 12px",
                              backgroundColor: asciiColors.danger,
                              color: asciiColors.background,
                              border: "none",
                              borderRadius: 2,
                              cursor: "pointer",
                              fontSize: 11,
                              fontFamily: "Consolas",
                              transition: "all 0.2s ease"
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = asciiColors.foreground;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = asciiColors.danger;
                            }}
                          >
                            Remove File
                          </button>
                        </div>
                      )}
                      {isUploading && (
                        <div style={{
                          marginTop: 12,
                          padding: 12,
                          backgroundColor: `${asciiColors.accentSoft}20`,
                          borderRadius: 2,
                          color: asciiColors.accent,
                          fontSize: 12,
                          fontFamily: "Consolas"
                        }}>
                          {uploadProgress}
                        </div>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,text/csv"
                      onChange={handleFileInputChange}
                      style={{ display: "none" }}
                    />
                    {formData.source_path && (
                      <div style={{ marginTop: 8, fontSize: 11, color: asciiColors.muted, fontFamily: "Consolas" }}>
                        Saved path: {formData.source_path}
                      </div>
                    )}
                  </div>
                ) : (
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
                      SOURCE PATH/URL *
                    </label>
                    <input
                      type="text"
                      value={formData.source_path}
                      onChange={(e) => setFormData(prev => ({ ...prev, source_path: e.target.value }))}
                      placeholder={formData.source_type === 'URL' ? 'https://example.com/data.csv' : formData.source_type === 'FILEPATH' ? '/path/to/file.csv' : 'Endpoint path'}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
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
                    {isAnalyzing && (
                      <div style={{ marginTop: 8, fontSize: 11, color: asciiColors.accent, fontFamily: "Consolas" }}>
                        Analyzing CSV...
                      </div>
                    )}
                    {analysisResult && !isAnalyzing && (
                      <div style={{
                        marginTop: 12,
                        padding: 12,
                        backgroundColor: `${asciiColors.accentSoft}20`,
                        borderRadius: 2,
                        borderLeft: `3px solid ${asciiColors.accent}`,
                        fontSize: 11,
                        color: asciiColors.foreground,
                        fontFamily: "Consolas"
                      }}>
                        <div style={{ fontWeight: 600, marginBottom: 8 }}>Analysis Results:</div>
                        <div>Delimiter: <code style={{ fontFamily: "Consolas", backgroundColor: asciiColors.backgroundSoft, padding: "2px 6px", borderRadius: 2 }}>{analysisResult.delimiter}</code></div>
                        <div>Has Header: {analysisResult.has_header ? 'Yes' : 'No'}</div>
                        <div>Skip Rows: {analysisResult.skip_rows}</div>
                        {analysisResult.sample_lines && analysisResult.sample_lines.length > 0 && (
                          <div style={{ marginTop: 8 }}>
                            <div style={{ fontWeight: 600, marginBottom: 4 }}>Sample (first 3 lines):</div>
                            <pre style={{
                              fontSize: 11,
                              overflow: "auto",
                              maxHeight: 100,
                              background: asciiColors.backgroundSoft,
                              padding: 8,
                              borderRadius: 2,
                              fontFamily: "Consolas",
                              border: `1px solid ${asciiColors.border}`
                            }}>
                              {analysisResult.sample_lines.slice(0, 3).join('\n')}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={formData.has_header}
                      onChange={(e) => setFormData(prev => ({ ...prev, has_header: e.target.checked }))}
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
                      color: asciiColors.foreground,
                      fontFamily: "Consolas"
                    }}>
                      Has Header Row
                    </label>
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
                    DELIMITER
                  </label>
                  <select
                    value={formData.delimiter}
                    onChange={(e) => setFormData(prev => ({ ...prev, delimiter: e.target.value }))}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
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
                    <option value=",">Comma (,)</option>
                    <option value=";">Semicolon (;)</option>
                    <option value="\t">Tab</option>
                    <option value="|">Pipe (|)</option>
                  </select>
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
                    SKIP ROWS
                  </label>
                  <input
                    type="number"
                    value={formData.skip_rows}
                    onChange={(e) => setFormData(prev => ({ ...prev, skip_rows: parseInt(e.target.value) || 0 }))}
                    min="0"
                    placeholder="0"
                    style={{
                      width: "100%",
                      padding: "8px 12px",
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
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={formData.skip_empty_rows}
                      onChange={(e) => setFormData(prev => ({ ...prev, skip_empty_rows: e.target.checked }))}
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
                      color: asciiColors.foreground,
                      fontFamily: "Consolas"
                    }}>
                      Skip Empty Rows
                    </label>
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
                    TARGET DB ENGINE *
                  </label>
                  <select
                    value={formData.target_db_engine}
                    onChange={(e) => setFormData(prev => ({ ...prev, target_db_engine: e.target.value }))}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
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
                      padding: 12,
                      backgroundColor: asciiColors.backgroundSoft,
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
                        TARGET SCHEMA *
                      </label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <div style={{ flex: 1, position: 'relative' }}>
                          <input
                            type="text"
                            list="schema-list"
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
                              padding: "8px 12px",
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
                          <datalist id="schema-list">
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
                        <div style={{ marginTop: 8, fontSize: 11, color: asciiColors.accent, fontFamily: "Consolas" }}>
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
                          TARGET TABLE *
                        </label>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <div style={{ flex: 1, position: 'relative' }}>
                            <input
                              type="text"
                              list="table-list"
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
                                padding: "8px 12px",
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
                            <datalist id="table-list">
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
                          <div style={{ marginTop: 8, fontSize: 11, color: asciiColors.accent, fontFamily: "Consolas" }}>
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
                        TARGET SCHEMA *
                      </label>
                      <input
                        type="text"
                        value={formData.target_schema}
                        onChange={(e) => setFormData(prev => ({ ...prev, target_schema: e.target.value.toLowerCase() }))}
                        placeholder="schema_name"
                        style={{
                          width: "100%",
                          padding: "8px 12px",
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
                        TARGET TABLE *
                      </label>
                      <input
                        type="text"
                        value={formData.target_table}
                        onChange={(e) => setFormData(prev => ({ ...prev, target_table: e.target.value.toLowerCase() }))}
                        placeholder="table_name"
                        style={{
                          width: "100%",
                          padding: "8px 12px",
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
                    SYNC INTERVAL (SECONDS)
                  </label>
                  <input
                    type="number"
                    value={formData.sync_interval}
                    onChange={(e) => setFormData(prev => ({ ...prev, sync_interval: parseInt(e.target.value) || 3600 }))}
                    min="60"
                    placeholder="3600"
                    style={{
                      width: "100%",
                      padding: "8px 12px",
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
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
                      color: asciiColors.foreground,
                      fontFamily: "Consolas"
                    }}>
                      Active
                    </label>
                  </div>
                </div>

                {error && (
                  <div style={{
                    color: asciiColors.danger,
                    backgroundColor: asciiColors.backgroundSoft,
                    padding: "12px",
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
                  gap: 12,
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
                      padding: "8px 16px",
                      border: `2px solid ${asciiColors.accent}`,
                      borderRadius: 2,
                      fontSize: 12,
                      fontFamily: "Consolas",
                      backgroundColor: asciiColors.accent,
                      color: asciiColors.background,
                      cursor: "pointer",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      transition: "all 0.2s ease"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = asciiColors.foreground;
                      e.currentTarget.style.borderColor = asciiColors.foreground;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = asciiColors.accent;
                      e.currentTarget.style.borderColor = asciiColors.accent;
                    }}
                  >
                    Save CSV Source
                  </button>
                </div>
              </form>
            </div>
          </div>
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
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        @keyframes slideDown {
          from {
            transform: translateY(0);
            opacity: 1;
          }
          to {
            transform: translateY(20px);
            opacity: 0;
          }
        }
      `}</style>
    </>
  );
};

export default AddCSVModal;

