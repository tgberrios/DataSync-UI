import { useState, useEffect, useCallback, useRef } from 'react';
import styled from 'styled-components';
import {
  Container,
  Header,
  ErrorMessage,
  LoadingOverlay,
  Input,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalTitle,
  FormGroup,
  Label,
} from '../shared/BaseComponents';
import { configApi } from '../../services/api';
import type { ConfigEntry } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import { theme } from '../../theme/theme';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import ConfigTreeView from './ConfigTreeView';
import SkeletonLoader from '../shared/SkeletonLoader';

const TextArea = styled.textarea`
  width: 100%;
  padding: ${theme.spacing.sm};
  border: 1px solid ${asciiColors.border};
  border-radius: 2;
  font-family: 'Consolas';
  font-size: 12px;
  resize: vertical;
  min-height: 60px;
  background: ${asciiColors.background};
  color: ${asciiColors.foreground};
  transition: border-color 0.15s ease;
  outline: none;

  &:focus {
    border-color: ${asciiColors.accent};
    outline: 2px solid ${asciiColors.accent};
    outline-offset: 2px;
  }

  &:disabled {
    background: ${asciiColors.backgroundSoft};
    cursor: not-allowed;
  }
`;

const ValueExpanded = styled.pre`
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
  font-family: 'Consolas';
  font-size: 11px;
  background: ${asciiColors.backgroundSoft};
  color: ${asciiColors.foreground};
  padding: ${theme.spacing.sm};
  border-radius: 2;
  border: 1px solid ${asciiColors.border};
  max-height: 400px;
  overflow-y: auto;
  
  &::-webkit-scrollbar {
    width: 0px;
    display: none;
  }
  
  -ms-overflow-style: none;
  scrollbar-width: none;
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
  const isMountedRef = useRef(true);

  const fetchConfigs = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    const startTime = Date.now();
    const minLoadingTime = 300;
    
    try {
      setLoading(true);
      setError(null);
      const data = await configApi.getConfigs();
      
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minLoadingTime - elapsed);
      await new Promise(resolve => setTimeout(resolve, remaining));
      
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
    return <SkeletonLoader variant="list" panels={5} />;
  }

  return (
    <Container>
      <div style={{
        width: "100%",
        minHeight: "100vh",
        padding: theme.spacing.lg,
        fontFamily: 'Consolas',
        fontSize: 12,
        color: asciiColors.foreground,
        backgroundColor: asciiColors.background,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.lg
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: theme.spacing.lg,
          paddingBottom: theme.spacing.md,
          borderBottom: `2px solid ${asciiColors.accent}`
        }}>
          <h1 style={{
            fontSize: 14,
            fontWeight: 600,
            margin: 0,
            color: asciiColors.foreground,
            textTransform: "uppercase",
            fontFamily: 'Consolas'
          }}>
            <span style={{ color: asciiColors.accent, marginRight: theme.spacing.sm }}>{ascii.blockFull}</span>
            CONFIG
          </h1>
        </div>

        {error && (
          <div style={{ marginBottom: theme.spacing.lg }}>
            <AsciiPanel title="ERROR">
              <div style={{
                padding: theme.spacing.md,
                color: asciiColors.foreground,
                fontSize: 12,
                fontFamily: 'Consolas',
                background: asciiColors.backgroundSoft,
                borderRadius: 2,
                border: `2px solid ${asciiColors.foreground}`
              }}>
                {error}
              </div>
            </AsciiPanel>
          </div>
        )}

        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-start', 
          alignItems: 'center', 
          marginBottom: theme.spacing.md,
          fontFamily: 'Consolas',
          fontSize: 12
        }}>
          <AsciiButton 
            label={`${ascii.blockFull} Add New Configuration`}
            onClick={handleAdd}
            variant="primary"
          />
        </div>

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
                fontFamily: 'Consolas',
                fontSize: 12
              }}>
                <div>
                  <strong style={{ color: asciiColors.muted, fontSize: 11, fontFamily: 'Consolas', fontWeight: 600 }}>Key:</strong>
                  <div style={{ 
                    color: asciiColors.foreground, 
                    fontFamily: 'Consolas', 
                    fontSize: 12, 
                    marginTop: theme.spacing.xs,
                    padding: theme.spacing.sm,
                    background: asciiColors.backgroundSoft,
                    borderRadius: 2,
                    border: `1px solid ${asciiColors.border}`
                  }}>
                    {selectedConfig.key}
                  </div>
                </div>
                <div>
                  <strong style={{ color: asciiColors.muted, fontSize: 11, fontFamily: 'Consolas', fontWeight: 600 }}>Value:</strong>
                  <div style={{ 
                    color: asciiColors.foreground, 
                    fontSize: 11,
                    fontFamily: 'Consolas',
                    marginTop: theme.spacing.xs,
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
                    <strong style={{ color: asciiColors.muted, fontSize: 11, fontFamily: 'Consolas', fontWeight: 600 }}>Description:</strong>
                    <div style={{ color: asciiColors.foreground, fontSize: 12, marginTop: theme.spacing.xs, fontFamily: 'Consolas' }}>
                      {selectedConfig.description}
                    </div>
                  </div>
                )}
                <div>
                  <strong style={{ color: asciiColors.muted, fontSize: 11, fontFamily: 'Consolas', fontWeight: 600 }}>Last Updated:</strong>
                  <div style={{ color: asciiColors.foreground, fontSize: 12, marginTop: theme.spacing.xs, fontFamily: 'Consolas' }}>
                    {formatDate(selectedConfig.updated_at)}
                  </div>
                </div>
                <div style={{ 
                  marginTop: theme.spacing.md, 
                  paddingTop: theme.spacing.md, 
                  borderTop: `1px solid ${asciiColors.border}` 
                }}>
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

        {editingKey && editForm && (
          <ModalOverlay $isOpen={!!editingKey} onClick={handleCancel}>
            <ModalContent onClick={(e) => e.stopPropagation()}>
              <ModalHeader>
                <ModalTitle style={{ fontFamily: 'Consolas', fontSize: 14 }}>
                  {editingKey === 'new' ? 'Create Configuration' : 'Edit Configuration'}
                </ModalTitle>
                <button
                  onClick={handleCancel}
                  aria-label="Close modal"
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: 18,
                    fontFamily: 'Consolas',
                    cursor: 'pointer',
                    color: asciiColors.muted,
                    padding: 0,
                    width: 30,
                    height: 30,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    outline: 'none'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.color = asciiColors.foreground;
                    e.currentTarget.style.outline = `2px solid ${asciiColors.accent}`;
                    e.currentTarget.style.outlineOffset = '2px';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.color = asciiColors.muted;
                    e.currentTarget.style.outline = 'none';
                  }}
                  onMouseDown={(e) => {
                    e.currentTarget.style.outline = 'none';
                  }}
                >
                  ×
                </button>
              </ModalHeader>
              <div style={{ 
                padding: theme.spacing.md,
                fontFamily: 'Consolas',
                fontSize: 12
              }}>
                <FormGroup>
                  <Label htmlFor="config-key">
                    Key {editingKey !== 'new' && '(cannot be changed)'}
                  </Label>
                  <Input
                    id="config-key"
                    value={editForm.key}
                    onChange={e => setEditForm({ ...editForm, key: e.target.value })}
                    placeholder="Enter key..."
                    disabled={editingKey !== 'new'}
                  />
                </FormGroup>
                <FormGroup>
                  <Label htmlFor="config-value">Value</Label>
                  <TextArea
                    id="config-value"
                    value={editForm.value}
                    onChange={e => setEditForm({ ...editForm, value: e.target.value })}
                    placeholder="Enter value..."
                  />
                </FormGroup>
                <div style={{ 
                  display: 'flex', 
                  gap: theme.spacing.sm, 
                  justifyContent: 'flex-end',
                  marginTop: theme.spacing.lg,
                  paddingTop: theme.spacing.md,
                  borderTop: `1px solid ${asciiColors.border}`
                }}>
                  <AsciiButton 
                    label="Cancel" 
                    onClick={handleCancel} 
                    variant="ghost" 
                  />
                  <AsciiButton 
                    label={editingKey === 'new' ? 'Create' : 'Save'} 
                    onClick={editingKey === 'new' ? handleCreate : handleSave} 
                    variant="primary" 
                  />
                </div>
              </div>
            </ModalContent>
          </ModalOverlay>
        )}
      </div>
    </Container>
  );
};

export default Config;
