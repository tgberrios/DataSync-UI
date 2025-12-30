import { useState, useEffect, useCallback, useRef } from 'react';
import styled from 'styled-components';
import {
  Container,
  Header,
  ErrorMessage,
  LoadingOverlay,
  Input,
} from '../shared/BaseComponents';
import { configApi } from '../../services/api';
import type { ConfigEntry } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import { theme } from '../../theme/theme';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import ConfigTreeView from './ConfigTreeView';

const ConfigTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: ${theme.spacing.lg};
  background: ${theme.colors.background.main};
  box-shadow: ${theme.shadows.md};
  border-radius: ${theme.borderRadius.md};
  overflow: hidden;
  animation: slideUp 0.25s ease-out;
  animation-delay: 0.1s;
  animation-fill-mode: both;
`;

const Th = styled.th`
  padding: ${theme.spacing.sm};
  text-align: left;
  border-bottom: 2px solid ${asciiColors.border};
  background: ${asciiColors.backgroundSoft};
  font-weight: bold;
  font-family: "Consolas";
  font-size: 13px;
  color: ${asciiColors.accent};
  position: sticky;
  top: 0;
  z-index: 10;
`;

const Td = styled.td`
  padding: ${theme.spacing.sm};
  border-bottom: 1px solid ${asciiColors.border};
  font-family: "Consolas";
  font-size: 12px;
  transition: all ${theme.transitions.normal};
`;

const TableRow = styled.tr`
  transition: all ${theme.transitions.normal};
  
  &:hover {
    background: linear-gradient(90deg, ${theme.colors.background.main} 0%, ${theme.colors.background.tertiary} 100%);
    transform: scale(1.001);
    box-shadow: ${theme.shadows.sm};
    
    ${Td} {
      border-bottom-color: rgba(10, 25, 41, 0.1);
    }
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 10px;
  border: 1px solid ${asciiColors.border};
  border-radius: 2px;
  font-family: "Consolas";
  font-size: 12px;
  resize: vertical;
  min-height: 60px;
  background: ${asciiColors.background};
  color: ${asciiColors.foreground};
  transition: all ${theme.transitions.normal};

  &:hover:not(:disabled) {
    border-color: ${asciiColors.accent};
  }

  &:focus {
    outline: none;
    border-color: ${asciiColors.accent};
    box-shadow: 0 0 0 2px ${asciiColors.accent}30;
  }

  &:disabled {
    background: ${asciiColors.backgroundSoft};
    cursor: not-allowed;
  }
`;

const ActionCell = styled.td`
  padding: ${theme.spacing.sm};
  border-bottom: 1px solid ${asciiColors.border};
  text-align: right;
  font-family: "Consolas";
  font-size: 12px;
`;

const ExpandableValue = styled.div`
  position: relative;
`;

const ValuePreview = styled.div`
  font-family: "Consolas";
  font-size: 11px;
  color: ${asciiColors.muted};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  padding-right: 30px;
`;

const ValueExpanded = styled.pre`
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
  font-family: "Consolas";
  font-size: 11px;
  background: ${asciiColors.backgroundSoft};
  color: ${asciiColors.foreground};
  padding: ${theme.spacing.sm};
  border-radius: 2px;
  border: 1px solid ${asciiColors.border};
  max-height: 400px;
  overflow-y: auto;
`;

/**
 * Configuration component
 * Manages application configuration entries with CRUD operations
 */
const Config = () => {
  const [configs, setConfigs] = useState<ConfigEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ConfigEntry | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [selectedConfig, setSelectedConfig] = useState<ConfigEntry | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'tree'>('tree');
  const isMountedRef = useRef(true);

  const fetchConfigs = useCallback(async () => {
    if (!isMountedRef.current) return;
    try {
      setLoading(true);
      setError(null);
      const data = await configApi.getConfigs();
      if (isMountedRef.current) {
        setConfigs(data || []);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(extractApiError(err));
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    fetchConfigs();
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchConfigs]);

  const handleEdit = useCallback((config: ConfigEntry) => {
    setEditingKey(config.key);
    setEditForm({ ...config });
  }, []);

  const handleCancel = useCallback(() => {
    setEditingKey(null);
    setEditForm(null);
  }, []);

  const handleSave = useCallback(async () => {
    if (!editForm) return;

    try {
      if (!isMountedRef.current) return;
      await configApi.updateConfig(editForm);
      if (isMountedRef.current) {
        await fetchConfigs();
        setEditingKey(null);
        setEditForm(null);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(extractApiError(err));
      }
    }
  }, [editForm, fetchConfigs]);

  const handleAdd = useCallback(() => {
    const newConfig: ConfigEntry = {
      key: '',
      value: '',
      description: null,
      updated_at: new Date().toISOString()
    };
    setEditingKey('new');
    setEditForm(newConfig);
  }, []);

  const handleCreate = useCallback(async () => {
    if (!editForm) return;

    try {
      if (!isMountedRef.current) return;
      await configApi.createConfig(editForm);
      if (isMountedRef.current) {
        await fetchConfigs();
        setEditingKey(null);
        setEditForm(null);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(extractApiError(err));
      }
    }
  }, [editForm, fetchConfigs]);

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleString();
  }, []);

  const isJsonValue = useCallback((value: string): boolean => {
    if (!value || value.trim().length === 0) return false;
    const trimmed = value.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || 
        (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        JSON.parse(value);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }, []);

  const isLongValue = useCallback((value: string): boolean => {
    return !!(value && value.length > 100);
  }, []);

  const shouldBeExpandable = useCallback((value: string): boolean => {
    return isJsonValue(value) || isLongValue(value);
  }, [isJsonValue, isLongValue]);

  const formatJsonValue = useCallback((value: string): string => {
    if (isJsonValue(value)) {
      try {
        return JSON.stringify(JSON.parse(value), null, 2);
      } catch {
        return value;
      }
    }
    return value;
  }, [isJsonValue]);

  const getValuePreview = useCallback((value: string): string => {
    if (isJsonValue(value)) {
      try {
        const parsed = JSON.parse(value);
        const keys = Object.keys(parsed);
        if (keys.length > 0) {
          return `{ ${keys.slice(0, 3).join(', ')}${keys.length > 3 ? '...' : ''} }`;
        }
        return '{ }';
      } catch {
        return value.substring(0, 50) + '...';
      }
    }
    if (isLongValue(value)) {
      return value.substring(0, 50) + '...';
    }
    return value;
  }, [isJsonValue, isLongValue]);

  const toggleExpand = useCallback((key: string) => {
    setExpandedKeys(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  }, []);

  if (loading && configs.length === 0) {
    return (
      <div style={{
        width: "100%",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Consolas",
        fontSize: 12,
        color: asciiColors.foreground,
        backgroundColor: asciiColors.background,
        gap: 12
      }}>
        <div style={{
          fontSize: 24,
          animation: "spin 1s linear infinite"
        }}>
          {ascii.blockFull}
        </div>
        <div style={{
          display: "flex",
          gap: 4,
          alignItems: "center"
        }}>
          <span>Loading configurations</span>
          <span style={{ animation: "dots 1.5s steps(4, end) infinite" }}>
            {ascii.dot.repeat(3)}
          </span>
        </div>
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes dots {
            0%, 20% { opacity: 0; }
            50% { opacity: 1; }
            100% { opacity: 0; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{
      width: "100%",
      minHeight: "100vh",
      padding: "24px 32px",
      fontFamily: "Consolas",
      fontSize: 12,
      color: asciiColors.foreground,
      backgroundColor: asciiColors.background,
      display: "flex",
      flexDirection: "column",
      gap: 20
    }}>
      <h1 style={{
        fontSize: 18,
        fontFamily: "Consolas",
        fontWeight: 600,
        margin: 0,
        marginBottom: 16,
        padding: "12px 8px",
        borderBottom: `2px solid ${asciiColors.border}`
      }}>
        CONFIGURATION
      </h1>

      {error && (
        <AsciiPanel title="ERROR">
          <div style={{ 
            color: asciiColors.danger, 
            fontFamily: "Consolas", 
            fontSize: 12,
            padding: "8px 0"
          }}>
            {ascii.blockFull} {error}
          </div>
        </AsciiPanel>
      )}

      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: theme.spacing.md,
        fontFamily: "Consolas",
        fontSize: 12
      }}>
        <AsciiButton 
          label={`${ascii.blockFull} Add New Configuration`}
          onClick={handleAdd}
          variant="primary"
        />
        <div style={{ display: 'flex', gap: theme.spacing.sm }}>
          <AsciiButton
            label="Tree View"
            onClick={() => setViewMode('tree')}
            variant={viewMode === 'tree' ? 'primary' : 'ghost'}
          />
          <AsciiButton
            label="Table View"
            onClick={() => setViewMode('table')}
            variant={viewMode === 'table' ? 'primary' : 'ghost'}
          />
        </div>
      </div>

      {viewMode === 'tree' ? (
        <div style={{ display: 'grid', gridTemplateColumns: selectedConfig ? '1fr 400px' : '1fr', gap: theme.spacing.lg }}>
          <ConfigTreeView 
            configs={configs} 
            onConfigClick={(config) => setSelectedConfig(prev => prev?.key === config.key ? null : config)}
          />
          
          {selectedConfig && (
            <AsciiPanel title="CONFIGURATION DETAILS">
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr', 
                gap: theme.spacing.md,
                fontFamily: "Consolas",
                fontSize: 12
              }}>
                <div>
                  <strong style={{ color: asciiColors.muted, fontSize: 11, fontFamily: "Consolas" }}>Key:</strong>
                  <div style={{ 
                    color: asciiColors.foreground, 
                    fontFamily: "Consolas", 
                    fontSize: 12, 
                    marginTop: '4px',
                    padding: theme.spacing.sm,
                    background: asciiColors.backgroundSoft,
                    borderRadius: 2,
                    border: `1px solid ${asciiColors.border}`
                  }}>
                    {selectedConfig.key}
                  </div>
                </div>
                <div>
                  <strong style={{ color: asciiColors.muted, fontSize: 11, fontFamily: "Consolas" }}>Value:</strong>
                  <div style={{ 
                    color: asciiColors.foreground, 
                    fontSize: 11,
                    fontFamily: "Consolas",
                    padding: theme.spacing.sm,
                    background: asciiColors.background,
                    borderRadius: 2,
                    border: `1px solid ${asciiColors.border}`,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    maxHeight: '300px',
                    overflowY: 'auto'
                  }}>
                    {selectedConfig.value || '(empty)'}
                  </div>
                </div>
                {selectedConfig.description && (
                  <div>
                    <strong style={{ color: asciiColors.muted, fontSize: 11, fontFamily: "Consolas" }}>Description:</strong>
                    <div style={{ color: asciiColors.foreground, fontSize: 12, marginTop: '4px', fontFamily: "Consolas" }}>
                      {selectedConfig.description}
                    </div>
                  </div>
                )}
                <div>
                  <strong style={{ color: asciiColors.muted, fontSize: 11, fontFamily: "Consolas" }}>Last Updated:</strong>
                  <div style={{ color: asciiColors.foreground, fontSize: 12, marginTop: '4px', fontFamily: "Consolas" }}>
                    {formatDate(selectedConfig.updated_at)}
                  </div>
                </div>
                <div style={{ marginTop: theme.spacing.md, paddingTop: theme.spacing.md, borderTop: `1px solid ${asciiColors.border}` }}>
                  <AsciiButton
                    label="Edit Configuration"
                    onClick={() => {
                      handleEdit(selectedConfig);
                      setSelectedConfig(null);
                    }}
                    variant="primary"
                  />
                </div>
              </div>
            </AsciiPanel>
          )}
        </div>
      ) : (
        <AsciiPanel title="CONFIGURATION TABLE">
          <ConfigTable>
        <thead>
          <tr>
            <Th>Key</Th>
            <Th>Value</Th>
            <Th>Current Batch</Th>
            <Th>Last Updated</Th>
            <Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {editingKey === 'new' && editForm && (
            <TableRow>
              <Td>
                <Input
                  value={editForm.key}
                  onChange={e => setEditForm({ ...editForm, key: e.target.value })}
                  placeholder="Enter key..."
                />
              </Td>
              <Td>
                <TextArea
                  value={editForm.value}
                  onChange={e => setEditForm({ ...editForm, value: e.target.value })}
                  placeholder="Enter value..."
                />
              </Td>
              <Td>-</Td>
              <Td>-</Td>
              <ActionCell>
                <div style={{ display: 'flex', gap: theme.spacing.sm, justifyContent: 'flex-end' }}>
                  <AsciiButton label="Save" onClick={handleCreate} variant="primary" />
                  <AsciiButton label="Cancel" onClick={handleCancel} variant="ghost" />
                </div>
              </ActionCell>
            </TableRow>
          )}
          {configs.map(config => (
            <TableRow key={config.key}>
              <Td>
                {editingKey === config.key ? (
                  <Input
                    value={editForm?.key || ''}
                    onChange={e => setEditForm(prev => prev ? { ...prev, key: e.target.value } : null)}
                    disabled
                  />
                ) : (
                  config.key
                )}
              </Td>
              <Td>
                {editingKey === config.key ? (
                  <TextArea
                    value={editForm?.value || ''}
                    onChange={e => setEditForm(prev => prev ? { ...prev, value: e.target.value } : null)}
                  />
                ) : shouldBeExpandable(config.value) ? (
                  <ExpandableValue>
                    {expandedKeys.has(config.key) ? (
                      <ValueExpanded>
                        {formatJsonValue(config.value)}
                      </ValueExpanded>
                    ) : (
                      <ValuePreview>
                        {getValuePreview(config.value)}
                      </ValuePreview>
                    )}
                  </ExpandableValue>
                ) : (
                  <pre style={{ 
                    margin: 0, 
                    whiteSpace: 'pre-wrap', 
                    wordBreak: 'break-all',
                    fontFamily: "Consolas",
                    fontSize: 11,
                    color: asciiColors.foreground
                  }}>
                    {config.value}
                  </pre>
                )}
              </Td>
              <Td>
                {config.key === 'batch_size' ? config.value : '-'}
              </Td>
              <Td>{formatDate(config.updated_at)}</Td>
              <ActionCell>
                <div style={{ display: 'flex', gap: theme.spacing.sm, justifyContent: 'flex-end' }}>
                  {editingKey === config.key ? (
                    <>
                      <AsciiButton label="Save" onClick={handleSave} variant="primary" />
                      <AsciiButton label="Cancel" onClick={handleCancel} variant="ghost" />
                    </>
                  ) : (
                    <>
                      {shouldBeExpandable(config.value) && (
                        <AsciiButton
                          label={expandedKeys.has(config.key) ? 'Collapse' : 'Expand'}
                          onClick={() => toggleExpand(config.key)}
                          variant="ghost"
                        />
                      )}
                      <AsciiButton label="Edit" onClick={() => handleEdit(config)} variant="ghost" />
                    </>
                  )}
                </div>
              </ActionCell>
            </TableRow>
          ))}
        </tbody>
      </ConfigTable>
        </AsciiPanel>
      )}
    </div>
  );
};

export default Config;
