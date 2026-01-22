import React, { useState, useEffect, useCallback } from 'react';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors } from '../../ui/theme/asciiTheme';

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
    if (dbEngine) {
      fetchConnections();
    } else {
      console.log(`[AsciiConnectionStringSelector:${label}] useEffect[dbEngine] - No dbEngine, clearing connections`);
      setAvailableConnections([]);
      setUseCustom(false);
    }
  }, [dbEngine, fetchConnections, label]);

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

  // Siempre mostrar el selector cuando hay conexiones disponibles (excepto cuando useCustom es true explícitamente)
  const showSelector = availableConnections.length > 0 && !loadingConnections && !useCustom;
  // Mostrar textarea solo cuando useCustom es true (usuario eligió "+ Add new connection...") o cuando no hay conexiones
  const showTextarea = useCustom || (availableConnections.length === 0 && !loadingConnections);

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

      {showTextarea && (
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
