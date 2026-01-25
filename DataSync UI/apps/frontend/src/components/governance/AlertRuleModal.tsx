import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { theme } from '../../theme/theme';

const connectionStringExamples: Record<string, string> = {
  MariaDB: 'host=localhost;user=myuser;password=mypassword;db=mydatabase;port=3306',
  MSSQL: 'DRIVER={ODBC Driver 17 for SQL Server};SERVER=localhost,1433;DATABASE=mydatabase;UID=myuser;PWD=mypassword',
  PostgreSQL: 'postgresql://myuser:mypassword@localhost:5432/mydatabase',
  MongoDB: 'mongodb://myuser:mypassword@localhost:27017/mydatabase',
};

const connectionStringHelp: Record<string, string> = {
  MariaDB: 'Format: host=server;user=username;password=password;db=database;port=3306\n\nExample:\nhost=localhost;user=admin;password=secret123;db=production;port=3306',
  MSSQL: 'Format: DRIVER={ODBC Driver 17 for SQL Server};SERVER=server,port;DATABASE=database;UID=username;PWD=password\n\nExample:\nDRIVER={ODBC Driver 17 for SQL Server};SERVER=sqlserver.example.com,1433;DATABASE=MyDB;UID=sa;PWD=MyPassword123',
  PostgreSQL: 'Format: postgresql://user:password@host:port/database\n\nExample:\npostgresql://postgres:postgres123@postgres.example.com:5432/mydb\n\nLeave empty to use DataLake connection',
  MongoDB: 'Format: mongodb://username:password@host:port/database\n\nFor MongoDB Atlas (cloud): mongodb+srv://username:password@cluster.mongodb.net/database\n\nWithout authentication:\nmongodb://host:port/database\n\nExamples:\nmongodb://admin:secret123@localhost:27017/mydb\nmongodb://localhost:27017/mydb (no auth)\nmongodb+srv://admin:secret123@cluster0.xxxxx.mongodb.net/mydb',
};

interface AlertRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (rule: any) => Promise<void>;
  initialData?: any;
}

export const AlertRuleModal: React.FC<AlertRuleModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [ruleName, setRuleName] = useState('');
  const [alertType, setAlertType] = useState('SYSTEM');
  const [severity, setSeverity] = useState('WARNING');
  const [evaluationType, setEvaluationType] = useState<'NUMERIC' | 'TEXT'>('TEXT');
  const [thresholdLow, setThresholdLow] = useState('');
  const [thresholdWarning, setThresholdWarning] = useState('');
  const [thresholdCritical, setThresholdCritical] = useState('');
  const [dbEngine, setDbEngine] = useState('');
  const [connectionString, setConnectionString] = useState('');
  const [conditionExpression, setConditionExpression] = useState('');
  const [thresholdValue, setThresholdValue] = useState('');
  const [checkInterval, setCheckInterval] = useState(60);
  const [webhookIds, setWebhookIds] = useState<number[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [customMessage, setCustomMessage] = useState('');
  const [availableWebhooks, setAvailableWebhooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showQueryResult, setShowQueryResult] = useState(false);
  const queryResultRef = useRef<{ success: boolean; rowCount: number; sampleRows: any[]; message: string; error?: string } | null>(null);
  
  // Usar solo el ref para queryResult - no usar useState para evitar problemas de re-render
  const [queryResult, setQueryResult] = useState<{ success: boolean; rowCount: number; sampleRows: any[]; message: string; error?: string } | null>(null);
  
  // Función helper para establecer queryResult que también actualiza el ref
  // IMPORTANTE: El ref es la fuente de verdad - NO se limpia cuando se limpia el estado
  const setQueryResultWithRef = (value: { success: boolean; rowCount: number; sampleRows: any[]; message: string; error?: string } | null) => {
    // SIEMPRE actualizar el ref primero - es la fuente de verdad que persiste
    queryResultRef.current = value;
    // El estado es solo para UI/reactividad - puede limpiarse pero el ref persiste
    setQueryResult(value);
  };
  
  // Mantener el ref sincronizado - pero el ref es la fuente de verdad
  useEffect(() => {
    // Solo actualizar el ref si el nuevo valor no es null (para preservar el valor anterior)
    if (queryResult) {
      queryResultRef.current = queryResult;
    }
  }, [queryResult]);
  const [messagePreview, setMessagePreview] = useState<string | null>(null);
  const [testingMessage, setTestingMessage] = useState(false);
  const [showPlaceholders, setShowPlaceholders] = useState(false);
  const [showPlaybook, setShowPlaybook] = useState(false);
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<string[]>([]);
  const [autocompletePosition, setAutocompletePosition] = useState<{ top: number; left: number } | null>(null);
  const [selectedRowIndex, setSelectedRowIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchWebhooks();
    } else {
      setShowQueryResult(false);
      // NO limpiar el ref aquí - solo limpiar el estado para UI
      setQueryResult(null);
      queryResultRef.current = null;
      setConnectionTestResult(null);
      setMessagePreview(null);
      setAutocompleteSuggestions([]);
      setAutocompletePosition(null);
      setShowPlaceholders(false);
      setSelectedRowIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    setConnectionTestResult(null);
  }, [dbEngine]);

  useEffect(() => {
    // Limpiar autocompletado y preview cuando cambia el evaluationType
    setAutocompleteSuggestions([]);
    setAutocompletePosition(null);
    setMessagePreview(null);
  }, [evaluationType]);

  useEffect(() => {
    if (!isOpen) return;
    
    if (initialData) {
      setRuleName(initialData.rule_name || '');
      setAlertType(initialData.alert_type || 'SYSTEM');
      setSeverity(initialData.severity || 'WARNING');
      setEvaluationType(initialData.evaluation_type || 'TEXT');
      setThresholdLow(initialData.threshold_low ? initialData.threshold_low.toString() : '');
      setThresholdWarning(initialData.threshold_warning ? initialData.threshold_warning.toString() : '');
      setThresholdCritical(initialData.threshold_critical ? initialData.threshold_critical.toString() : '');
      setDbEngine(initialData.db_engine || '');
      setConnectionString(initialData.connection_string || '');
      setConditionExpression(initialData.condition_expression || '');
      setThresholdValue(initialData.threshold_value || '');
      setCheckInterval(initialData.check_interval || 60);
      setWebhookIds(Array.isArray(initialData.webhook_ids) ? initialData.webhook_ids : []);
      setEnabled(initialData.enabled !== undefined ? initialData.enabled : true);
      setCustomMessage(initialData.custom_message || '');
    } else {
      resetForm();
    }
  }, [initialData]);

  const resetForm = () => {
    setRuleName('');
    setAlertType('SYSTEM');
    setSeverity('WARNING');
    setEvaluationType('TEXT');
    setThresholdLow('');
    setThresholdWarning('');
    setThresholdCritical('');
    setDbEngine('');
    setConnectionString('');
    setConditionExpression('');
    setThresholdValue('');
    setCheckInterval(60);
    setWebhookIds([]);
    setEnabled(true);
    setCustomMessage('');
    setMessagePreview(null);
    setAutocompleteSuggestions([]);
    setAutocompletePosition(null);
    setShowPlaceholders(false);
    setShowPlaybook(false);
    setConnectionTestResult(null);
    setShowQueryResult(false);
    // NO limpiar queryResult aquí - el usuario puede estar testeando
    // setQueryResult(null);
  };

  const fetchWebhooks = async () => {
    try {
      const response = await fetch('/api/webhooks', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setAvailableWebhooks(data || []);
      }
    } catch (err) {
      console.error('Error fetching webhooks:', err);
    }
  };

  const connectionExample = useMemo(() => {
    if (!dbEngine) return '';
    return connectionStringExamples[dbEngine] || '';
  }, [dbEngine]);

  const connectionHelp = useMemo(() => {
    if (!dbEngine) return '';
    return connectionStringHelp[dbEngine] || '';
  }, [dbEngine]);

  const handleTestConnection = async () => {
    if (!dbEngine) {
      setConnectionTestResult({ success: false, message: 'Please select a database engine first' });
      return;
    }

    if (!connectionString.trim()) {
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
          db_engine: dbEngine,
          connection_string: connectionString.trim(),
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
        setConnectionTestResult({ success: true, message: data.message || 'Connection successful!' });
      } else {
        setConnectionTestResult({ success: false, message: data.error || data.message || 'Connection failed' });
      }
    } catch (err: any) {
      setConnectionTestResult({ success: false, message: err.message || 'Failed to test connection' });
    } finally {
      setIsTestingConnection(false);
    }
  };


  const handleTestQuery = async () => {
    if (!conditionExpression) {
      alert('Please enter a query to test');
      return;
    }

    setTesting(true);
    setQueryResultWithRef(null);
    try {
      if (dbEngine === 'PostgreSQL' || !dbEngine) {
        const response = await fetch('/api/alert-rules/test-query', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          },
          body: JSON.stringify({ 
            query: conditionExpression, 
            db_engine: dbEngine || 'PostgreSQL',
            connection_string: connectionString || null
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          setQueryResultWithRef({
            success: false,
            rowCount: 0,
            sampleRows: [],
            message: errorData.error || 'Failed to test query',
            error: errorData.details || errorData.error
          });
        } else {
          const result = await response.json();
          
          // Verificar que el resultado tenga success: true
          if (!result.success) {
            setQueryResultWithRef({
              success: false,
              rowCount: 0,
              sampleRows: [],
              message: result.error || result.message || 'Query test failed',
              error: result.error || result.details
            });
            setShowQueryResult(true);
            setTesting(false);
            return;
          }
          
          // Validación para NUMERIC evaluation type
          if (evaluationType === 'NUMERIC') {
            if (result.rowCount !== 1) {
              setQueryResultWithRef({
                success: false,
                rowCount: result.rowCount,
                sampleRows: result.sampleRows || [],
                message: `NUMERIC evaluation requires query to return exactly 1 row with 1 numeric value. Got ${result.rowCount} row(s).`,
                error: 'Invalid result format for NUMERIC evaluation'
              });
              setShowQueryResult(true);
              return;
            }
            
            const firstRow = result.sampleRows[0];
            const firstValue = firstRow[Object.keys(firstRow)[0]];
            const value = parseFloat(firstValue);
            
            if (isNaN(value)) {
              setQueryResultWithRef({
                success: false,
                rowCount: result.rowCount,
                sampleRows: result.sampleRows || [],
                message: `Query returned a non-numeric value: ${firstValue}`,
                error: 'Value must be numeric for NUMERIC evaluation'
              });
              setShowQueryResult(true);
              return;
            }
            
            // Determinar severity basado en thresholds
            let severity = 'INFO';
            if (thresholdCritical && value > parseFloat(thresholdCritical)) {
              severity = 'CRITICAL';
            } else if (thresholdWarning && value > parseFloat(thresholdWarning)) {
              severity = 'WARNING';
            } else if (thresholdLow && value > parseFloat(thresholdLow)) {
              severity = 'INFO';
            }
            
            const numericResult = {
              success: true,
              rowCount: 1,
              sampleRows: result.sampleRows || [],
              message: `Value: ${value} → Would trigger ${severity} alert${thresholdLow && thresholdWarning && thresholdCritical ? ` (Low: ${thresholdLow}, Warning: ${thresholdWarning}, Critical: ${thresholdCritical})` : ''}`
            };
            setQueryResult(numericResult);
            
            // Si hay custom message, actualizar preview automáticamente
            if (customMessage) {
              const preview = replacePlaceholders(customMessage, {
                success: true,
                rowCount: 1,
                sampleRows: result.sampleRows || []
              }, selectedRowIndex);
              const fullMessage = `[${severity}] ${alertType}: ${preview}`;
              setMessagePreview(fullMessage);
            }
            
            // Resetear selectedRowIndex cuando hay nuevos resultados
            setSelectedRowIndex(0);
          } else {
            // Asegurarse de que result.success sea true antes de establecer queryResult
            const queryResultData = {
              success: result.success === true ? true : false,
              rowCount: result.rowCount || 0,
              sampleRows: result.sampleRows || [],
              message: result.message || `Query returned ${result.rowCount || 0} row(s)`
            };
            
            // Si el backend no devolvió success: true, pero tenemos datos, asumir éxito
            if (!queryResultData.success && queryResultData.sampleRows.length > 0) {
              queryResultData.success = true;
            }
            
            setQueryResult(queryResultData);
            
            // Si hay custom message, actualizar preview automáticamente
            if (customMessage) {
              const preview = replacePlaceholders(customMessage, {
                success: true,
                rowCount: result.rowCount || 0,
                sampleRows: result.sampleRows || []
              }, selectedRowIndex);
              const fullMessage = `[${severity}] ${alertType}: ${preview}`;
              setMessagePreview(fullMessage);
            }
            
            // Resetear selectedRowIndex cuando hay nuevos resultados
            setSelectedRowIndex(0);
          }
          
          // Resetear selectedRowIndex cuando hay nuevos resultados
          setSelectedRowIndex(0);
        }
        setShowQueryResult(true);
      } else {
        setQueryResult({
          success: false,
          rowCount: 0,
          sampleRows: [],
          message: `Testing queries for ${dbEngine} is not yet supported. Only PostgreSQL is supported.`
        });
        setShowQueryResult(true);
      }
    } catch (err: any) {
      setQueryResult({
        success: false,
        rowCount: 0,
        sampleRows: [],
        message: `Error testing query: ${err.message}`,
        error: err.message
      });
      setShowQueryResult(true);
    } finally {
      setTesting(false);
    }
  };

  // Obtener placeholders disponibles según el tipo de evaluación
  const getAvailablePlaceholders = useMemo(() => {
    if (evaluationType === 'NUMERIC') {
      return [
        { placeholder: '{value}', description: 'Numeric value from query' }
      ];
    } else {
      // TEXT - placeholders dinámicos basados en los resultados de la query
      const basePlaceholders = [
        { placeholder: '{row_count}', description: 'Number of rows returned' },
        { placeholder: '{first_row}', description: 'First row as JSON' }
      ];
      
      // Si hay resultados de query, agregar las columnas reales
      const currentQueryResult = queryResultRef.current || queryResult;
      if (currentQueryResult && currentQueryResult.success && currentQueryResult.sampleRows && currentQueryResult.sampleRows.length > 0) {
        const firstRow = currentQueryResult.sampleRows[0];
        const columnPlaceholders = Object.keys(firstRow).map(columnName => ({
          placeholder: `{${columnName}}`,
          description: `Column: ${columnName}`
        }));
        return [...basePlaceholders, ...columnPlaceholders];
      }
      
      // Si no hay resultados, usar placeholders comunes por defecto
      return [
        ...basePlaceholders,
        { placeholder: '{schema_name}', description: 'Schema name' },
        { placeholder: '{table_name}', description: 'Table name' },
        { placeholder: '{db_engine}', description: 'Database engine' },
        { placeholder: '{status}', description: 'Status (e.g., LISTENING_CHANGES)' },
        { placeholder: '{cluster_name}', description: 'Cluster name' },
        { placeholder: '{updated_at}', description: 'Last updated timestamp' },
        { placeholder: '{pk_columns}', description: 'Primary key columns' },
        { placeholder: '{pk_strategy}', description: 'Primary key strategy' },
        { placeholder: '{table_size}', description: 'Table size' },
        { placeholder: '{active}', description: 'Active status' },
        { placeholder: '{connection_string}', description: 'Connection string' },
        { placeholder: '{notes}', description: 'Notes' },
        { placeholder: '{mongo_last_sync_time}', description: 'Mongo last sync time' },
        { placeholder: '{cron_schedule}', description: 'Cron schedule' },
        { placeholder: '{next_sync_time}', description: 'Next sync time' }
      ];
    }
  }, [evaluationType, queryResult, queryResult?.success, queryResult?.sampleRows?.length, queryResult?.sampleRows]);

  // Función para reemplazar placeholders en el mensaje
  const replacePlaceholders = (message: string, queryResult: any, rowIndex: number = 0) => {
    if (!message || !queryResult) return message;
    
    let replaced = message;
    
    if (evaluationType === 'NUMERIC') {
      if (queryResult.sampleRows && queryResult.sampleRows.length > 0) {
        const value = queryResult.sampleRows[0][Object.keys(queryResult.sampleRows[0])[0]];
        replaced = replaced.replace(/\{value\}/g, String(value));
      }
    } else {
      // TEXT evaluation
      replaced = replaced.replace(/\{row_count\}/g, queryResult.rowCount?.toString() || '0');
      
      if (queryResult.sampleRows && queryResult.sampleRows.length > 0) {
        // Primero, reemplazar placeholders con índice específico: {column_name[0]}, {column_name[1]}, etc.
        Object.keys(queryResult.sampleRows[0]).forEach(columnName => {
          const indexedRegex = new RegExp(`\\{${columnName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\[(\\d+)\\]\\}`, 'g');
          replaced = replaced.replace(indexedRegex, (match, indexStr) => {
            const index = parseInt(indexStr);
            if (index >= 0 && index < queryResult.sampleRows.length) {
              const value = queryResult.sampleRows[index][columnName];
              if (value === null || value === undefined) return 'null';
              if (typeof value === 'object') return JSON.stringify(value);
              return String(value);
            }
            return match;
          });
        });
        
        // Usar la fila seleccionada o la primera si no hay selección válida
        const selectedRow = queryResult.sampleRows[rowIndex] || queryResult.sampleRows[0];
        
        // Reemplazar {first_row}
        replaced = replaced.replace(/\{first_row\}/g, JSON.stringify(selectedRow, null, 2));
        
        // Reemplazar columnas específicas sin índice (solo las que no tienen índice ya reemplazado)
        Object.keys(selectedRow).forEach(columnName => {
          const escapedColumnName = columnName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`\\{${escapedColumnName}\\}(?!\\[)`, 'g');
          const value = selectedRow[columnName];
          let displayValue = '';
          if (value === null || value === undefined) {
            displayValue = 'null';
          } else if (typeof value === 'object') {
            displayValue = JSON.stringify(value);
          } else {
            displayValue = String(value);
          }
          replaced = replaced.replace(regex, displayValue);
        });
      }
    }
    
    return replaced;
  };

  // Preview en tiempo real del mensaje
  useEffect(() => {
    if (customMessage && queryResult && queryResult.success) {
      const preview = replacePlaceholders(customMessage, queryResult, selectedRowIndex);
      const fullMessage = `[${severity}] ${alertType}: ${preview}`;
      setMessagePreview(fullMessage);
    } else {
      setMessagePreview(null);
    }
  }, [customMessage, queryResult, severity, alertType, evaluationType, selectedRowIndex]);

  // Función para testear el mensaje personalizado
  const handleTestCustomMessage = async () => {
    // SIEMPRE usar el ref - es la única fuente de verdad que no se pierde en re-renders
    const currentQueryResult = queryResultRef.current;
    
    if (!customMessage || !customMessage.trim()) {
      alert('Please enter a custom message');
      return;
    }

    if (!currentQueryResult) {
      alert('Please test the query first to see the message preview with actual data.\n\nClick "Test Query" button to execute the query and get results.');
      return;
    }

    if (!currentQueryResult.success) {
      alert(`Query test failed: ${currentQueryResult.error || currentQueryResult.message || 'Unknown error'}\n\nPlease fix the query and test it again.`);
      return;
    }

    if (!currentQueryResult.sampleRows || currentQueryResult.sampleRows.length === 0) {
      alert('No data available from query results. Please test the query again.');
      return;
    }

    setTestingMessage(true);
    
    try {
      const preview = replacePlaceholders(customMessage, currentQueryResult, selectedRowIndex);
      const fullMessage = `[${severity}] ${alertType}: ${preview}`;
      setMessagePreview(fullMessage);
    } catch (err: any) {
      console.error('Error generating preview:', err);
      setMessagePreview(`ERROR: ${err.message}`);
    } finally {
      setTestingMessage(false);
    }
  };

  // Función para insertar placeholder en el textarea
  const insertPlaceholder = (placeholder: string) => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = customMessage;
    const newText = text.substring(0, start) + placeholder + text.substring(end);
    
    setCustomMessage(newText);
    
    // Restaurar cursor después del placeholder insertado
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = start + placeholder.length;
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        textareaRef.current.focus();
      }
    }, 0);
  };

  // Manejar autocompletado cuando escribe {
  const handleCustomMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setCustomMessage(value);
    setMessagePreview(null); // Limpiar preview cuando cambia
    
    const textarea = e.target;
    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastOpenBrace = textBeforeCursor.lastIndexOf('{');
    
    if (lastOpenBrace !== -1 && cursorPos > lastOpenBrace) {
      const textAfterBrace = textBeforeCursor.substring(lastOpenBrace + 1);
      if (!textAfterBrace.includes('}')) {
        // Hay un { sin cerrar, mostrar sugerencias
        const matchingPlaceholders = getAvailablePlaceholders.filter(p => 
          p.placeholder.toLowerCase().includes(textAfterBrace.toLowerCase())
        );
        
        if (matchingPlaceholders.length > 0) {
          setAutocompleteSuggestions(matchingPlaceholders.map(p => p.placeholder));
          
          // Calcular posición del autocompletado
          const textareaRect = textarea.getBoundingClientRect();
          const lineHeight = 20;
          const lines = textBeforeCursor.split('\n');
          const lineNumber = lines.length - 1;
          const charPos = lines[lines.length - 1].length;
          
          setAutocompletePosition({
            top: textareaRect.top + (lineNumber * lineHeight) + 25,
            left: textareaRect.left + (charPos * 7) + 8
          });
        } else {
          setAutocompleteSuggestions([]);
          setAutocompletePosition(null);
        }
      } else {
        setAutocompleteSuggestions([]);
        setAutocompletePosition(null);
      }
    } else {
      setAutocompleteSuggestions([]);
      setAutocompletePosition(null);
    }
  };

  // Manejar selección de autocompletado
  const handleAutocompleteSelect = (placeholder: string) => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = customMessage.substring(0, cursorPos);
    const lastOpenBrace = textBeforeCursor.lastIndexOf('{');
    
    if (lastOpenBrace !== -1) {
      const textAfterBrace = textBeforeCursor.substring(lastOpenBrace + 1);
      const newText = customMessage.substring(0, lastOpenBrace) + placeholder + customMessage.substring(cursorPos);
      setCustomMessage(newText);
      
      setTimeout(() => {
        if (textareaRef.current) {
          const newCursorPos = lastOpenBrace + placeholder.length;
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
          textareaRef.current.focus();
        }
      }, 0);
    }
    
    setAutocompleteSuggestions([]);
    setAutocompletePosition(null);
  };

  // Manejar drag and drop
  const handleDragStart = (e: React.DragEvent, placeholder: string) => {
    e.dataTransfer.setData('text/plain', placeholder);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const placeholder = e.dataTransfer.getData('text/plain');
    if (placeholder && textareaRef.current) {
      insertPlaceholder(placeholder);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onSave({
        rule_name: ruleName,
        alert_type: alertType,
        severity,
        evaluation_type: evaluationType,
        threshold_low: evaluationType === 'NUMERIC' && thresholdLow ? parseFloat(thresholdLow) : null,
        threshold_warning: evaluationType === 'NUMERIC' && thresholdWarning ? parseFloat(thresholdWarning) : null,
        threshold_critical: evaluationType === 'NUMERIC' && thresholdCritical ? parseFloat(thresholdCritical) : null,
        condition_expression: conditionExpression,
        threshold_value: thresholdValue || null,
        db_engine: dbEngine,
        connection_string: connectionString || null,
        query_type: 'CUSTOM_SQL',
        check_interval: checkInterval,
        webhook_ids: webhookIds,
        enabled,
        custom_message: customMessage || null
      });
      resetForm();
    } catch (error) {
      console.error('Error saving alert rule:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}
        onClick={onClose}
      >
        <div
          style={{
            width: '90%',
            maxWidth: 900,
            maxHeight: '90vh',
            overflowY: 'auto'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <AsciiPanel title={initialData ? "EDIT ALERT RULE" : "CREATE ALERT RULE"}>
            <form onSubmit={handleSubmit} style={{ padding: 16 }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ color: asciiColors.muted, fontSize: 11, display: 'block', marginBottom: 4 }}>
                  Rule Name *
                </label>
                <input
                  type="text"
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: `1px solid ${asciiColors.border}`,
                    borderRadius: 2,
                    background: asciiColors.background,
                    color: asciiColors.foreground,
                    fontFamily: "Consolas",
                    fontSize: 12
                  }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ color: asciiColors.muted, fontSize: 11, display: 'block', marginBottom: 4 }}>
                  Database Engine *
                </label>
                <select
                  value={dbEngine}
                  onChange={(e) => setDbEngine(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: `1px solid ${asciiColors.border}`,
                    borderRadius: 2,
                    background: asciiColors.background,
                    color: asciiColors.foreground,
                    fontFamily: "Consolas",
                    fontSize: 12
                  }}
                >
                  <option value="">-- Select Engine --</option>
                  <option value="PostgreSQL">PostgreSQL</option>
                  <option value="MSSQL">MSSQL</option>
                  <option value="MariaDB">MariaDB</option>
                  <option value="MongoDB">MongoDB</option>
                </select>
                <div style={{ marginTop: 4, fontSize: 10, color: asciiColors.muted }}>
                  Select the database engine where the query will be executed
                </div>
              </div>
              {dbEngine && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ color: asciiColors.muted, fontSize: 11, display: 'block', marginBottom: 4 }}>
                    Connection String Format
                  </label>
                  <div style={{
                    marginTop: 4,
                    padding: '8px',
                    background: asciiColors.backgroundSoft,
                    borderRadius: 2,
                    borderLeft: `3px solid ${asciiColors.accent}`,
                    fontFamily: "Consolas, monospace",
                    fontSize: 10,
                    color: asciiColors.muted,
                    whiteSpace: 'pre-wrap'
                  }}>
                    {connectionHelp}
                  </div>
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <label style={{ color: asciiColors.muted, fontSize: 11, display: 'block', marginBottom: 0 }}>
                    Connection String {dbEngine ? '*' : '(Optional - leave empty for DataLake)'}
                  </label>
                  {dbEngine && (
                    <AsciiButton
                      label={isTestingConnection ? "Testing..." : "Test Connection"}
                      onClick={handleTestConnection}
                      variant="ghost"
                      disabled={isTestingConnection || !dbEngine || !connectionString.trim()}
                    />
                  )}
                </div>
                <textarea
                  value={connectionString}
                  onChange={(e) => {
                    setConnectionString(e.target.value);
                    setConnectionTestResult(null);
                  }}
                  placeholder={connectionExample || "Enter connection string... (leave empty for DataLake)"}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: `1px solid ${asciiColors.border}`,
                    borderRadius: 2,
                    background: asciiColors.background,
                    color: asciiColors.foreground,
                    fontFamily: "Consolas, monospace",
                    fontSize: 11,
                    resize: 'vertical'
                  }}
                />
                {connectionTestResult && (
                  <div style={{
                    marginTop: 8,
                    padding: '8px 12px',
                    borderRadius: 2,
                    fontSize: 10,
                    backgroundColor: connectionTestResult.success ? asciiColors.success : asciiColors.danger,
                    color: '#ffffff',
                    fontFamily: "Consolas"
                  }}>
                    {connectionTestResult.success ? '✓ ' : '✗ '}
                    {connectionTestResult.message}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ color: asciiColors.muted, fontSize: 11, display: 'block', marginBottom: 4 }}>
                  SQL Query / Condition Expression *
                </label>
                <textarea
                  value={conditionExpression}
                  onChange={(e) => setConditionExpression(e.target.value)}
                  required
                  rows={10}
                  placeholder="SELECT * FROM table WHERE condition...
Example: SELECT COUNT(*) FROM metadata.processing_log WHERE status = 'FAILED' AND processed_at > NOW() - INTERVAL '1 hour'"
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: `1px solid ${asciiColors.border}`,
                    borderRadius: 2,
                    background: asciiColors.background,
                    color: asciiColors.foreground,
                    fontFamily: "Consolas, monospace",
                    fontSize: 11,
                    resize: 'vertical'
                  }}
                />
                <div style={{ marginTop: 4, fontSize: 10, color: asciiColors.muted }}>
                  Alert will trigger if query returns any rows. Write SQL that returns rows when alert condition is met.
                </div>
                <AsciiButton
                  label={testing ? "Testing..." : "Test Query"}
                  onClick={handleTestQuery}
                  variant="ghost"
                  disabled={testing || !conditionExpression}
                  style={{ marginTop: 8 }}
                />
              </div>


              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ color: asciiColors.muted, fontSize: 11, display: 'block', marginBottom: 4 }}>
                    Severity *
                  </label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: `1px solid ${asciiColors.border}`,
                      borderRadius: 2,
                      background: asciiColors.background,
                      color: asciiColors.foreground,
                      fontFamily: "Consolas",
                      fontSize: 12
                    }}
                  >
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="WARNING">WARNING</option>
                    <option value="INFO">INFO</option>
                  </select>
                </div>
                <div>
                  <label style={{ color: asciiColors.muted, fontSize: 11, display: 'block', marginBottom: 4 }}>
                    Check Interval (seconds) *
                  </label>
                  <input
                    type="number"
                    value={checkInterval}
                    onChange={(e) => setCheckInterval(parseInt(e.target.value) || 60)}
                    min={10}
                    required
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: `1px solid ${asciiColors.border}`,
                      borderRadius: 2,
                      background: asciiColors.background,
                      color: asciiColors.foreground,
                      fontFamily: "Consolas",
                      fontSize: 12
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ color: asciiColors.muted, fontSize: 11, display: 'block', marginBottom: 4 }}>
                  Alert Type
                </label>
                <input
                  type="text"
                  value={alertType}
                  onChange={(e) => setAlertType(e.target.value)}
                  placeholder="SYSTEM, DATABASE, etc."
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: `1px solid ${asciiColors.border}`,
                    borderRadius: 2,
                    background: asciiColors.background,
                    color: asciiColors.foreground,
                    fontFamily: "Consolas",
                    fontSize: 12
                  }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ color: asciiColors.muted, fontSize: 11, display: 'block', marginBottom: 4 }}>
                  Evaluation Type *
                </label>
                <select
                  value={evaluationType}
                  onChange={(e) => setEvaluationType(e.target.value as 'NUMERIC' | 'TEXT')}
                  required
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: `1px solid ${asciiColors.border}`,
                    borderRadius: 2,
                    background: asciiColors.background,
                    color: asciiColors.foreground,
                    fontFamily: "Consolas",
                    fontSize: 12
                  }}
                >
                  <option value="TEXT">Text/Boolean (returns rows = alert triggered)</option>
                  <option value="NUMERIC">Numeric (compare value to thresholds)</option>
                </select>
                <div style={{ marginTop: 4, fontSize: 10, color: asciiColors.muted }}>
                  {evaluationType === 'TEXT' 
                    ? 'Alert triggers if query returns any rows'
                    : 'Query must return a single numeric value to compare against thresholds'}
                </div>
              </div>

              {evaluationType === 'NUMERIC' && (
                <>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ color: asciiColors.muted, fontSize: 11, display: 'block', marginBottom: 4 }}>
                      Threshold - Low (INFO) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={thresholdLow}
                      onChange={(e) => setThresholdLow(e.target.value)}
                      required
                      placeholder="e.g., 50"
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: `1px solid ${asciiColors.border}`,
                        borderRadius: 2,
                        background: asciiColors.background,
                        color: asciiColors.foreground,
                        fontFamily: "Consolas",
                        fontSize: 12
                      }}
                    />
                    <div style={{ marginTop: 4, fontSize: 10, color: asciiColors.muted }}>
                      Value &lt;= Low → INFO severity
                    </div>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ color: asciiColors.muted, fontSize: 11, display: 'block', marginBottom: 4 }}>
                      Threshold - Warning *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={thresholdWarning}
                      onChange={(e) => setThresholdWarning(e.target.value)}
                      required
                      placeholder="e.g., 75"
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: `1px solid ${asciiColors.border}`,
                        borderRadius: 2,
                        background: asciiColors.background,
                        color: asciiColors.foreground,
                        fontFamily: "Consolas",
                        fontSize: 12
                      }}
                    />
                    <div style={{ marginTop: 4, fontSize: 10, color: asciiColors.muted }}>
                      Low &lt; Value &lt;= Warning → WARNING severity
                    </div>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ color: asciiColors.muted, fontSize: 11, display: 'block', marginBottom: 4 }}>
                      Threshold - Critical *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={thresholdCritical}
                      onChange={(e) => setThresholdCritical(e.target.value)}
                      required
                      placeholder="e.g., 90"
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: `1px solid ${asciiColors.border}`,
                        borderRadius: 2,
                        background: asciiColors.background,
                        color: asciiColors.foreground,
                        fontFamily: "Consolas",
                        fontSize: 12
                      }}
                    />
                    <div style={{ marginTop: 4, fontSize: 10, color: asciiColors.muted }}>
                      Warning &lt; Value &lt;= Critical → WARNING severity<br />
                      Value &gt; Critical → CRITICAL severity
                    </div>
                  </div>
                </>
              )}

              <div style={{ marginBottom: 16 }}>
                <label style={{ color: asciiColors.muted, fontSize: 11, display: 'block', marginBottom: 4 }}>
                  Webhooks to Trigger (Optional)
                </label>
                <div style={{
                  maxHeight: '150px',
                  overflowY: 'auto',
                  border: `1px solid ${asciiColors.border}`,
                  borderRadius: 2,
                  padding: 8,
                  background: asciiColors.backgroundSoft
                }}>
                  {availableWebhooks.length === 0 ? (
                    <div style={{ fontSize: 11, color: asciiColors.muted }}>
                      No webhooks available. Create webhooks first.
                    </div>
                  ) : (
                    availableWebhooks.map(webhook => (
                      <div key={webhook.id} style={{ marginBottom: 8 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={webhookIds.includes(webhook.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setWebhookIds([...webhookIds, webhook.id]);
                              } else {
                                setWebhookIds(webhookIds.filter(id => id !== webhook.id));
                              }
                            }}
                            style={{ cursor: 'pointer' }}
                          />
                          <span style={{ fontSize: 11, color: asciiColors.foreground }}>
                            {webhook.name} ({webhook.webhook_type})
                          </span>
                        </label>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: 11, color: asciiColors.foreground }}>
                    Enabled
                  </span>
                </label>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <label style={{ color: asciiColors.muted, fontSize: 11, display: 'block', marginBottom: 0 }}>
                    Custom Alert Message (Optional)
                  </label>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {evaluationType === 'TEXT' && (
                      <AsciiButton
                        label={showPlaybook ? "Hide Guide" : "Show Guide"}
                        onClick={() => setShowPlaybook(!showPlaybook)}
                        variant="ghost"
                        style={{ fontSize: 10, padding: '4px 8px' }}
                      />
                    )}
                    <AsciiButton
                      label={showPlaceholders ? "Hide Placeholders" : "Show Placeholders"}
                      onClick={() => setShowPlaceholders(!showPlaceholders)}
                      variant="ghost"
                      style={{ fontSize: 10, padding: '4px 8px' }}
                    />
                  </div>
                </div>
                
                {showPlaceholders && (() => {
                  // Calcular placeholders dinámicamente cuando se muestran
                  let placeholdersToShow = getAvailablePlaceholders;
                  
                  // Si hay resultados de query, usar las columnas reales
                  const currentQueryResult = queryResultRef.current || queryResult;
                  if (evaluationType === 'TEXT' && currentQueryResult && currentQueryResult.success && currentQueryResult.sampleRows && currentQueryResult.sampleRows.length > 0) {
                    const basePlaceholders = [
                      { placeholder: '{row_count}', description: 'Number of rows returned' },
                      { placeholder: '{first_row}', description: 'First row as JSON' }
                    ];
                    const firstRow = currentQueryResult.sampleRows[0];
                    const columnPlaceholders = Object.keys(firstRow).map(columnName => ({
                      placeholder: `{${columnName}}`,
                      description: `Column: ${columnName}`
                    }));
                    placeholdersToShow = [...basePlaceholders, ...columnPlaceholders];
                  }
                  
                  return (
                    <div style={{
                      marginBottom: 8,
                      padding: '8px',
                      backgroundColor: asciiColors.backgroundSoft,
                      border: `1px solid ${asciiColors.border}`,
                      borderRadius: 2,
                      maxHeight: '150px',
                      overflowY: 'auto'
                    }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: asciiColors.accent, marginBottom: 6 }}>
                        Available Placeholders (Drag & Drop or Click):
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {placeholdersToShow.map((item, idx) => (
                        <div
                          key={idx}
                          draggable
                          onDragStart={(e) => handleDragStart(e, item.placeholder)}
                          onClick={() => insertPlaceholder(item.placeholder)}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: asciiColors.accent + '20',
                            border: `1px solid ${asciiColors.accent}`,
                            borderRadius: 2,
                            fontSize: 10,
                            fontFamily: "Consolas, monospace",
                            color: asciiColors.foreground,
                            cursor: 'grab',
                            userSelect: 'none',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = asciiColors.accent + '40';
                            e.currentTarget.style.cursor = 'grab';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = asciiColors.accent + '20';
                          }}
                          title={item.description}
                        >
                          {item.placeholder}
                        </div>
                      ))}
                      </div>
                    </div>
                  );
                })()}

                <div style={{ position: 'relative' }}>
                  <textarea
                    ref={textareaRef}
                    value={customMessage}
                    onChange={handleCustomMessageChange}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    rows={4}
                    placeholder={evaluationType === 'NUMERIC' 
                      ? "Alert: {value} failed syncs detected\n\nType { to see autocomplete suggestions"
                      : "Alert: Found {row_count} unprotected columns in {schema_name}.{table_name}\n\nType { to see autocomplete suggestions"}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: `1px solid ${asciiColors.border}`,
                      borderRadius: 2,
                      background: asciiColors.background,
                      color: asciiColors.foreground,
                      fontFamily: "Consolas, monospace",
                      fontSize: 11,
                      resize: 'vertical'
                    }}
                  />
                  
                  {autocompleteSuggestions.length > 0 && autocompletePosition && (
                    <div
                      style={{
                        position: 'fixed',
                        top: autocompletePosition.top,
                        left: autocompletePosition.left,
                        backgroundColor: asciiColors.background,
                        border: `1px solid ${asciiColors.border}`,
                        borderRadius: 2,
                        boxShadow: `0 2px 8px rgba(0,0,0,0.3)`,
                        zIndex: 2000,
                        maxHeight: '200px',
                        overflowY: 'auto',
                        minWidth: '200px'
                      }}
                    >
                      {autocompleteSuggestions.map((suggestion, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleAutocompleteSelect(suggestion)}
                          style={{
                            padding: '6px 10px',
                            cursor: 'pointer',
                            fontSize: 11,
                            fontFamily: "Consolas, monospace",
                            color: asciiColors.foreground,
                            borderBottom: idx < autocompleteSuggestions.length - 1 ? `1px solid ${asciiColors.border}` : 'none'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = asciiColors.accent + '20';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          {suggestion}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 10, color: asciiColors.muted, marginBottom: 4 }}>
                    {evaluationType === 'NUMERIC' 
                      ? 'Available placeholders: {value} (the numeric value from query). Type { for autocomplete.'
                      : 'Available placeholders: {row_count}, {first_row}, or column names. Type { for autocomplete or drag from list above.'}
                  </div>
                  
                  {evaluationType === 'TEXT' && showPlaybook && (
                    <div style={{
                      marginTop: 8,
                      padding: '12px',
                      backgroundColor: asciiColors.backgroundSoft,
                      border: `1px solid ${asciiColors.accent}`,
                      borderRadius: 2,
                      fontSize: 10,
                      fontFamily: "Consolas, monospace"
                    }}>
                      <div style={{ fontWeight: 600, color: asciiColors.accent, marginBottom: 8 }}>
                        Guide: Using Placeholders with Multiple Rows
                      </div>
                      <div style={{ color: asciiColors.foreground, lineHeight: 1.6 }}>
                        <div style={{ marginBottom: 6 }}>
                          <strong>When your query returns multiple rows, you can reference specific rows using indices:</strong>
                        </div>
                        <div style={{ marginBottom: 4, paddingLeft: 8 }}>
                          • <code style={{ color: asciiColors.accent }}>{`{table_name}`}</code> - Uses the row selected in the dropdown above
                        </div>
                        <div style={{ marginBottom: 4, paddingLeft: 8 }}>
                          • <code style={{ color: asciiColors.accent }}>{`{table_name[0]}`}</code> - Always uses row 0 (first row)
                        </div>
                        <div style={{ marginBottom: 4, paddingLeft: 8 }}>
                          • <code style={{ color: asciiColors.accent }}>{`{table_name[1]}`}</code> - Always uses row 1 (second row)
                        </div>
                        <div style={{ marginBottom: 4, paddingLeft: 8 }}>
                          • <code style={{ color: asciiColors.accent }}>{`{status[2]}`}</code> - Always uses row 2 (third row)
                        </div>
                        <div style={{ marginTop: 8, marginBottom: 4 }}>
                          <strong>Example:</strong>
                        </div>
                        <div style={{ 
                          padding: '8px', 
                          backgroundColor: asciiColors.background, 
                          borderRadius: 2,
                          border: `1px solid ${asciiColors.border}`,
                          marginTop: 4,
                          whiteSpace: 'pre-wrap'
                        }}>
{`Found {row_count} issues:
- {table_name[0]} has status {status[0]}
- {table_name[1]} has status {status[1]}
- Default: {table_name} (uses selected row)`}
                        </div>
                        <div style={{ marginTop: 8, color: asciiColors.muted, fontStyle: 'italic' }}>
                          You can mix indexed and non-indexed placeholders in the same message!
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {customMessage && queryResult && queryResult.success && queryResult.sampleRows && queryResult.sampleRows.length > 1 && (
                  <div style={{ marginTop: 8, marginBottom: 8 }}>
                    <label style={{ color: asciiColors.muted, fontSize: 11, display: 'block', marginBottom: 4 }}>
                      Select Row for Preview ({queryResult.sampleRows.length} rows available):
                    </label>
                    <select
                      value={selectedRowIndex}
                      onChange={(e) => {
                        const newIndex = parseInt(e.target.value);
                        setSelectedRowIndex(newIndex);
                      }}
                      style={{
                        width: '100%',
                        padding: '6px',
                        border: `1px solid ${asciiColors.border}`,
                        borderRadius: 2,
                        background: asciiColors.background,
                        color: asciiColors.foreground,
                        fontFamily: "Consolas, monospace",
                        fontSize: 11
                      }}
                    >
                      {queryResult.sampleRows.map((row: any, idx: number) => {
                        let label = `Row ${idx + 1}`;
                        if (row.schema_name && row.table_name) {
                          label = `Row ${idx + 1}: ${row.schema_name}.${row.table_name}`;
                        } else if (row.table_name) {
                          label = `Row ${idx + 1}: ${row.table_name}`;
                        } else {
                          const keys = Object.keys(row);
                          if (keys.length > 0) {
                            const firstKey = keys[0];
                            const firstValue = row[firstKey];
                            if (firstValue && typeof firstValue === 'string' && firstValue.length < 50) {
                              label = `Row ${idx + 1}: ${firstKey}=${firstValue}`;
                            } else if (firstValue !== null && firstValue !== undefined) {
                              const valueStr = String(firstValue).substring(0, 30);
                              label = `Row ${idx + 1}: ${firstKey}=${valueStr}${String(firstValue).length > 30 ? '...' : ''}`;
                            }
                          }
                        }
                        return (
                          <option key={idx} value={idx}>
                            {label}
                          </option>
                        );
                      })}
                    </select>
                    <div style={{ marginTop: 4, fontSize: 10, color: asciiColors.muted }}>
                      Placeholders will use values from the selected row. Preview updates automatically.
                    </div>
                  </div>
                )}

                {customMessage && (
                  <div style={{ marginTop: 8 }}>
                    {messagePreview && (
                      <div style={{
                        marginBottom: 12,
                        padding: '12px',
                        borderRadius: 2,
                        backgroundColor: asciiColors.backgroundSoft,
                        border: `1px solid ${asciiColors.border}`,
                        fontFamily: "Consolas, monospace",
                        fontSize: 11,
                        color: asciiColors.foreground,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word'
                      }}>
                        <div style={{ 
                          marginBottom: 8, 
                          fontSize: 10, 
                          fontWeight: 600, 
                          color: asciiColors.accent 
                        }}>
                          Preview (Final Alert Message)
                          {queryResult && queryResult.sampleRows && queryResult.sampleRows.length > 1 && (
                            <span style={{ marginLeft: 8, color: asciiColors.muted, fontWeight: 400 }}>
                              (using row {selectedRowIndex + 1} of {queryResult.sampleRows.length})
                            </span>
                          )}:
                        </div>
                        <div style={{
                          padding: '8px',
                          backgroundColor: severity === 'CRITICAL' ? asciiColors.danger + '20' :
                                          severity === 'WARNING' ? asciiColors.warning + '20' :
                                          asciiColors.accent + '20',
                          borderLeft: `3px solid ${
                            severity === 'CRITICAL' ? asciiColors.danger :
                            severity === 'WARNING' ? asciiColors.warning :
                            asciiColors.accent
                          }`,
                          borderRadius: 2
                        }}>
                          {messagePreview}
                        </div>
                      </div>
                    )}
                    
                    <AsciiButton
                      label={testingMessage ? "Testing..." : "Test Custom Alert Message"}
                      onClick={handleTestCustomMessage}
                      variant="ghost"
                      disabled={testingMessage}
                      style={{ fontSize: 10, padding: '4px 8px' }}
                    />
                    {!queryResult && (
                      <div style={{ marginTop: 4, fontSize: 10, color: asciiColors.muted }}>
                        Test the query first to see the preview with actual data
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                <AsciiButton
                  label="Save"
                  onClick={handleSubmit}
                  variant="primary"
                  disabled={loading}
                />
                <AsciiButton
                  label="Cancel"
                  onClick={onClose}
                  variant="ghost"
                  disabled={loading}
                />
              </div>
            </form>
          </AsciiPanel>
        </div>
      </div>

      {showQueryResult && queryResult && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000
          }}
          onClick={() => {
            setShowQueryResult(false);
            setQueryResult(null);
          }}
        >
          <div
            style={{
              width: '90%',
              maxWidth: 800,
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <AsciiPanel title="QUERY TEST RESULTS">
              <div style={{ padding: 16 }}>
                <div style={{
                  marginBottom: 16,
                  padding: '12px',
                  borderRadius: 2,
                  backgroundColor: queryResult.success ? asciiColors.success : asciiColors.danger,
                  color: '#ffffff',
                  fontFamily: "Consolas",
                  fontSize: 12
                }}>
                  {queryResult.success ? '✓ ' : '✗ '}
                  <strong>{queryResult.message}</strong>
                </div>

                {queryResult.error && (
                  <div style={{
                    marginBottom: 16,
                    padding: '12px',
                    borderRadius: 2,
                    backgroundColor: asciiColors.backgroundSoft,
                    border: `1px solid ${asciiColors.danger}`,
                    fontFamily: "Consolas, monospace",
                    fontSize: 11,
                    color: asciiColors.danger,
                    whiteSpace: 'pre-wrap'
                  }}>
                    <strong>Error Details:</strong><br />
                    {queryResult.error}
                  </div>
                )}

                {queryResult.success && (
                  <>
                    <div style={{
                      marginBottom: 12,
                      padding: '8px 12px',
                      backgroundColor: asciiColors.backgroundSoft,
                      borderRadius: 2,
                      fontFamily: "Consolas",
                      fontSize: 11,
                      color: asciiColors.foreground
                    }}>
                      <strong>Rows Returned:</strong> {queryResult.rowCount}
                    </div>

                    {queryResult.rowCount > 0 && queryResult.sampleRows && queryResult.sampleRows.length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <div style={{
                          marginBottom: 8,
                          fontSize: 11,
                          fontWeight: 600,
                          color: asciiColors.accent
                        }}>
                          Sample Rows (showing up to 5):
                        </div>
                        <div style={{
                          maxHeight: '400px',
                          overflow: 'auto',
                          border: `1px solid ${asciiColors.border}`,
                          borderRadius: 2,
                          padding: '8px',
                          backgroundColor: asciiColors.background,
                          fontFamily: "Consolas, monospace",
                          fontSize: 10
                        }}>
                          <pre style={{
                            margin: 0,
                            color: asciiColors.foreground,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word'
                          }}>
                            {JSON.stringify(queryResult.sampleRows, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}

                    {queryResult.rowCount > 0 && (
                      <div style={{
                        padding: '12px',
                        backgroundColor: asciiColors.warning + '20',
                        borderRadius: 2,
                        border: `1px solid ${asciiColors.warning}`,
                        fontSize: 11,
                        color: asciiColors.foreground,
                        fontFamily: "Consolas"
                      }}>
                        <strong>⚠ Alert Trigger:</strong> This query returned {queryResult.rowCount} row(s). 
                        {queryResult.rowCount > 0 ? ' The alert will be triggered when this rule is active.' : ' The alert will not be triggered.'}
                      </div>
                    )}
                  </>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
                  <AsciiButton
                    label="Close"
                    onClick={() => {
                      setShowQueryResult(false);
                      setQueryResult(null);
                    }}
                    variant="ghost"
                  />
                </div>
              </div>
            </AsciiPanel>
          </div>
        </div>
      )}
    </>
  );
};
