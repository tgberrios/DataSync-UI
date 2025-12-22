import React, { useState, useCallback, useMemo, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import {
  Button,
  Input,
  FormGroup,
  Label,
  Select,
} from '../shared/BaseComponents';
import { theme } from '../../theme/theme';
import { csvCatalogApi } from '../../services/api';

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

const FileUploadArea = styled.div<{ $isDragging: boolean; $hasFile: boolean }>`
  border: 2px dashed ${props => 
    props.$isDragging 
      ? theme.colors.primary.main 
      : props.$hasFile 
        ? theme.colors.status.success.text 
        : theme.colors.border.medium};
  border-radius: ${theme.borderRadius.md};
  padding: ${theme.spacing.xl};
  text-align: center;
  cursor: pointer;
  background: ${props => 
    props.$isDragging 
      ? theme.colors.primary.light + '20' 
      : props.$hasFile 
        ? theme.colors.status.success.bg 
        : theme.colors.background.secondary};
  transition: all 0.3s ease;
  position: relative;

  &:hover {
    border-color: ${theme.colors.primary.main};
    background: ${theme.colors.primary.light + '10'};
  }
`;

const FileUploadIcon = styled.div`
  font-size: 3em;
  margin-bottom: ${theme.spacing.sm};
  color: ${theme.colors.primary.main};
`;

const FileUploadText = styled.div`
  color: ${theme.colors.text.primary};
  font-size: 1em;
  margin-bottom: ${theme.spacing.xs};
`;

const FileUploadHint = styled.div`
  color: ${theme.colors.text.secondary};
  font-size: 0.85em;
`;

const FileInfo = styled.div`
  margin-top: ${theme.spacing.sm};
  padding: ${theme.spacing.sm};
  background: ${theme.colors.background.main};
  border-radius: ${theme.borderRadius.sm};
  border: 1px solid ${theme.colors.border.light};
`;

const FileName = styled.div`
  font-weight: bold;
  color: ${theme.colors.text.primary};
  margin-bottom: ${theme.spacing.xs};
`;

const FileSize = styled.div`
  font-size: 0.85em;
  color: ${theme.colors.text.secondary};
`;

const RemoveFileButton = styled.button`
  margin-top: ${theme.spacing.xs};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background: ${theme.colors.status.error.bg};
  color: ${theme.colors.status.error.text};
  border: none;
  border-radius: ${theme.borderRadius.sm};
  cursor: pointer;
  font-size: 0.85em;
  transition: all 0.2s ease;

  &:hover {
    background: ${theme.colors.status.error.text};
    color: white;
  }
`;

const UploadProgress = styled.div`
  margin-top: ${theme.spacing.sm};
  padding: ${theme.spacing.sm};
  background: ${theme.colors.primary.light + '20'};
  border-radius: ${theme.borderRadius.sm};
  color: ${theme.colors.primary.main};
  font-size: 0.9em;
`;

const HiddenFileInput = styled.input`
  display: none;
`;

interface AddCSVModalProps {
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

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};


const AddCSVModal: React.FC<AddCSVModalProps> = ({ onClose, onSave, initialData }) => {
  const [formData, setFormData] = useState({
    csv_name: initialData?.csv_name ? `${initialData.csv_name} (Copy)` : '',
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
    });
  }, [formData, onSave]);

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
      <BlurOverlay 
        style={{ animation: isClosing ? 'fadeOut 0.15s ease-out' : 'fadeIn 0.15s ease-in' }} 
        onClick={() => {
          // No cerrar si estamos arrastrando un archivo
          if (!isDragging) {
            handleClose();
          }
        }}
        onDragOver={handleGlobalDragOver}
        onDragLeave={handleGlobalDragLeave}
        onDrop={handleGlobalDrop}
      />
      <ModalOverlay 
        style={{ animation: isClosing ? 'fadeOut 0.15s ease-out' : 'fadeIn 0.15s ease-in' }}
        onDragOver={handleGlobalDragOver}
        onDragLeave={handleGlobalDragLeave}
        onDrop={handleGlobalDrop}
      >
        <ModalContent 
          data-modal-content
          onClick={(e) => e.stopPropagation()}
          onDragOver={handleGlobalDragOver}
          onDragLeave={handleGlobalDragLeave}
          onDrop={handleGlobalDrop}
        >
          <ModalHeader>Add New CSV Source</ModalHeader>
          
          <form 
            onSubmit={handleSubmit}
            onDragOver={handleGlobalDragOver}
            onDragLeave={handleGlobalDragLeave}
            onDrop={handleGlobalDrop}
          >
            <FormGroup>
              <Label>CSV Name *</Label>
              <Input 
                type="text" 
                value={formData.csv_name}
                onChange={(e) => setFormData(prev => ({ ...prev, csv_name: e.target.value }))}
                placeholder="e.g., Sales Data, Customer List"
              />
            </FormGroup>

            <FormGroup>
              <Label>Source Type *</Label>
              <Select
                value={formData.source_type}
                onChange={(e) => {
                  const newType = e.target.value;
                  setFormData(prev => ({ ...prev, source_type: newType, source_path: newType !== 'UPLOADED_FILE' ? prev.source_path : '' }));
                  if (newType !== 'UPLOADED_FILE') {
                    setUploadedFile(null);
                    setUploadProgress('');
                  }
                }}
              >
                <option value="FILEPATH">File Path</option>
                <option value="URL">URL</option>
                <option value="ENDPOINT">Endpoint</option>
                <option value="UPLOADED_FILE">Uploaded File</option>
              </Select>
            </FormGroup>

            {formData.source_type === 'UPLOADED_FILE' ? (
              <FormGroup>
                <Label>Upload CSV File *</Label>
                <FileUploadArea
                  $isDragging={isDragging}
                  $hasFile={!!uploadedFile}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileUploadIcon>📁</FileUploadIcon>
                  <FileUploadText>
                    {uploadedFile
                      ? `File: ${uploadedFile.name}`
                      : isDragging
                      ? 'Drop your CSV file here'
                      : 'Click to upload or drag and drop'}
                  </FileUploadText>
                  <FileUploadHint>
                    {uploadedFile
                      ? formatFileSize(uploadedFile.size)
                      : 'CSV files only, no size limit'}
                  </FileUploadHint>
                  {uploadedFile && (
                    <FileInfo>
                      <FileName>{uploadedFile.name}</FileName>
                      <FileSize>{formatFileSize(uploadedFile.size)}</FileSize>
                      <RemoveFileButton
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFile();
                        }}
                      >
                        Remove File
                      </RemoveFileButton>
                    </FileInfo>
                  )}
                  {isUploading && (
                    <UploadProgress>{uploadProgress}</UploadProgress>
                  )}
                </FileUploadArea>
                <HiddenFileInput
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileInputChange}
                />
                {formData.source_path && (
                  <div style={{ marginTop: theme.spacing.xs, fontSize: '0.85em', color: theme.colors.text.secondary }}>
                    Saved path: {formData.source_path}
                  </div>
                )}
              </FormGroup>
            ) : (
              <FormGroup>
                <Label>Source Path/URL *</Label>
                <Input 
                  type="text" 
                  value={formData.source_path}
                  onChange={(e) => setFormData(prev => ({ ...prev, source_path: e.target.value }))}
                  placeholder={formData.source_type === 'URL' ? 'https://example.com/data.csv' : formData.source_type === 'FILEPATH' ? '/path/to/file.csv' : 'Endpoint path'}
                />
                {isAnalyzing && (
                  <div style={{ marginTop: theme.spacing.xs, fontSize: '0.85em', color: theme.colors.primary.main }}>
                    Analyzing CSV...
                  </div>
                )}
                {analysisResult && !isAnalyzing && (
                  <AnalysisResult>
                    <div><strong>Analysis Results:</strong></div>
                    <div>Delimiter: <code>{analysisResult.delimiter}</code></div>
                    <div>Has Header: {analysisResult.has_header ? 'Yes' : 'No'}</div>
                    <div>Skip Rows: {analysisResult.skip_rows}</div>
                    {analysisResult.sample_lines && analysisResult.sample_lines.length > 0 && (
                      <div style={{ marginTop: theme.spacing.xs }}>
                        <div><strong>Sample (first 3 lines):</strong></div>
                        <pre style={{ fontSize: '0.75em', overflow: 'auto', maxHeight: '100px', background: theme.colors.background.secondary, padding: theme.spacing.xs, borderRadius: theme.borderRadius.sm }}>
                          {analysisResult.sample_lines.slice(0, 3).join('\n')}
                        </pre>
                      </div>
                    )}
                  </AnalysisResult>
                )}
              </FormGroup>
            )}

            <FormGroup>
              <CheckboxContainer>
                <Checkbox
                  type="checkbox"
                  checked={formData.has_header}
                  onChange={(e) => setFormData(prev => ({ ...prev, has_header: e.target.checked }))}
                />
                <Label style={{ margin: 0, cursor: 'pointer' }}>Has Header Row</Label>
              </CheckboxContainer>
            </FormGroup>

            <FormGroup>
              <Label>Delimiter</Label>
              <Select
                value={formData.delimiter}
                onChange={(e) => setFormData(prev => ({ ...prev, delimiter: e.target.value }))}
              >
                <option value=",">Comma (,)</option>
                <option value=";">Semicolon (;)</option>
                <option value="\t">Tab</option>
                <option value="|">Pipe (|)</option>
              </Select>
            </FormGroup>

            <FormGroup>
              <Label>Skip Rows</Label>
              <Input 
                type="number" 
                value={formData.skip_rows}
                onChange={(e) => setFormData(prev => ({ ...prev, skip_rows: parseInt(e.target.value) || 0 }))}
                min="0"
                placeholder="0"
              />
            </FormGroup>

            <FormGroup>
              <CheckboxContainer>
                <Checkbox
                  type="checkbox"
                  checked={formData.skip_empty_rows}
                  onChange={(e) => setFormData(prev => ({ ...prev, skip_empty_rows: e.target.checked }))}
                />
                <Label style={{ margin: 0, cursor: 'pointer' }}>Skip Empty Rows</Label>
              </CheckboxContainer>
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
                      />
                      <datalist id="schema-list">
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
                        />
                        <datalist id="table-list">
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
                Save CSV Source
              </Button>
            </ButtonGroup>
          </form>
        </ModalContent>
      </ModalOverlay>
    </>
  );
};

export default AddCSVModal;

