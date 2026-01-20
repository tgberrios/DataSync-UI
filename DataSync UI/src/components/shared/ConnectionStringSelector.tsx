import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FormGroup, Label, Button } from './BaseComponents';
import { theme } from '../../theme/theme';

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

  useEffect(() => {
    if (dbEngine && !useCustom) {
      fetchConnections();
    } else {
      setAvailableConnections([]);
    }
  }, [dbEngine, useCustom]);

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

  const showSelector = !useCustom && availableConnections.length > 0 && !loadingConnections;
  const showTextarea = useCustom || availableConnections.length === 0 || loadingConnections;

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

      {showTextarea && (
        <Textarea
          value={value}
          onChange={handleTextareaChange}
          placeholder={placeholder}
        />
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
