import { useState, useEffect, useCallback, useRef } from 'react';
import { dataEncryptionApi, type EncryptionPolicy, type EncryptionKey } from '../../services/api';
import { Container, LoadingOverlay, ErrorMessage } from '../shared/BaseComponents';
import SkeletonLoader from '../shared/SkeletonLoader';
import { extractApiError } from '../../utils/errorHandler';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { theme } from '../../theme/theme';
import DataEncryptionTreeView from './DataEncryptionTreeView';
import EncryptionKeysTreeView from './EncryptionKeysTreeView';


const formatDate = (date: string) => {
  if (!date) return '-';
  return new Date(date).toLocaleString();
};

const DataEncryption = () => {
  const isMountedRef = useRef(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [policies, setPolicies] = useState<EncryptionPolicy[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<EncryptionPolicy | null>(null);
  const [filters, setFilters] = useState({
    schema_name: '',
    table_name: '',
    active: '',
  });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;
  const [keys, setKeys] = useState<EncryptionKey[]>([]);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [newKey, setNewKey] = useState({ key_id: '', key_value: '', algorithm: 'AES256' });

  const fetchPolicies = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    const startTime = Date.now();
    const minLoadingTime = 300;
    
    try {
      setLoading(true);
      setError(null);
      const params: any = { page, limit };
      if (filters.schema_name) params.schema_name = filters.schema_name;
      if (filters.table_name) params.table_name = filters.table_name;
      if (filters.active !== '') params.active = filters.active === 'true';

      const response = await dataEncryptionApi.getAll(params);
      
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minLoadingTime - elapsed);
      await new Promise(resolve => setTimeout(resolve, remaining));
      
      if (isMountedRef.current) {
        setPolicies(response.policies || []);
        setTotal(response.total || 0);
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
  }, [page, filters]);

  const fetchKeys = useCallback(async () => {
    try {
      const response = await dataEncryptionApi.getKeys();
      setKeys(response.keys || []);
    } catch (err) {
      console.error("Error fetching encryption keys:", err);
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    fetchPolicies();
    fetchKeys();
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchPolicies, fetchKeys]);

  const handleCreatePolicy = useCallback(() => {
    setSelectedPolicy({
      policy_name: '',
      schema_name: '',
      table_name: '',
      column_name: '',
      encryption_algorithm: 'AES256',
      key_id: '',
      key_rotation_interval_days: 90,
      active: true,
    });
    setIsModalOpen(true);
  }, []);

  const handleEditPolicy = useCallback((policy: EncryptionPolicy) => {
    setSelectedPolicy({ ...policy });
    setIsModalOpen(true);
  }, []);

  const handleDeletePolicy = useCallback(async (policyId: number) => {
    if (!confirm('Are you sure you want to delete this encryption policy?')) {
      return;
    }

    try {
      await dataEncryptionApi.delete(policyId);
      fetchPolicies();
    } catch (err) {
      if (isMountedRef.current) {
        setError(extractApiError(err));
      }
    }
  }, [fetchPolicies]);

  const handleSavePolicy = useCallback(async () => {
    if (!selectedPolicy) return;

    try {
      setError(null);
      if (selectedPolicy.policy_id) {
        await dataEncryptionApi.update(selectedPolicy.policy_id, selectedPolicy);
      } else {
        await dataEncryptionApi.create(selectedPolicy);
      }
      setIsModalOpen(false);
      fetchPolicies();
    } catch (err) {
      if (isMountedRef.current) {
        setError(extractApiError(err));
      }
    }
  }, [selectedPolicy, fetchPolicies]);

  const handleEncryptColumn = useCallback(async (policy: EncryptionPolicy) => {
    if (!confirm(`Are you sure you want to encrypt all data in ${policy.schema_name}.${policy.table_name}.${policy.column_name}? This action cannot be undone.`)) {
      return;
    }

    try {
      setError(null);
      await dataEncryptionApi.encryptColumn(
        policy.schema_name,
        policy.table_name,
        policy.column_name,
        policy.key_id
      );
      alert('Column encrypted successfully');
      fetchPolicies();
    } catch (err) {
      if (isMountedRef.current) {
        setError(extractApiError(err));
      }
    }
  }, [fetchPolicies]);

  const handleRotateKey = useCallback(async (policy: EncryptionPolicy) => {
    const newKeyId = prompt(`Enter new key ID for policy "${policy.policy_name}":`);
    if (!newKeyId) return;

    try {
      setError(null);
      await dataEncryptionApi.rotateKey(policy.policy_id!, newKeyId);
      alert('Encryption key rotated successfully');
      fetchPolicies();
      fetchKeys();
    } catch (err) {
      if (isMountedRef.current) {
        setError(extractApiError(err));
      }
    }
  }, [fetchPolicies, fetchKeys]);

  const handleCreateKey = useCallback(async () => {
    if (!newKey.key_id || !newKey.key_value) {
      alert('Key ID and Key Value are required');
      return;
    }

    try {
      setError(null);
      await dataEncryptionApi.createKey(newKey.key_id, newKey.key_value, newKey.algorithm);
      setShowKeyModal(false);
      setNewKey({ key_id: '', key_value: '', algorithm: 'AES256' });
      fetchKeys();
    } catch (err) {
      if (isMountedRef.current) {
        setError(extractApiError(err));
      }
    }
  }, [newKey, fetchKeys]);

  if (loading && policies.length === 0) {
    return <SkeletonLoader variant="table" />;
  }

  return (
    <Container>
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
          textTransform: 'uppercase',
          fontFamily: 'Consolas'
        }}>
          <span style={{ color: asciiColors.accent, marginRight: theme.spacing.sm }}>{ascii.blockFull}</span>
          DATA ENCRYPTION
        </h1>
      </div>

      {error && (
        <div style={{ marginBottom: theme.spacing.md }}>
          <AsciiPanel title="ERROR">
            <div style={{
              padding: theme.spacing.sm,
              color: asciiColors.foreground,
              fontSize: 12,
              fontFamily: 'Consolas',
              backgroundColor: asciiColors.backgroundSoft,
              borderRadius: 2
            }}>
              {error}
            </div>
          </AsciiPanel>
        </div>
      )}

      <div style={{ marginBottom: theme.spacing.md }}>
        <AsciiPanel title="DATA ENCRYPTION">
          <div style={{ padding: theme.spacing.md, fontFamily: 'Consolas', fontSize: 12 }}>
            <div style={{ display: 'flex', gap: theme.spacing.sm, marginBottom: theme.spacing.md, flexWrap: 'wrap' }}>
              <AsciiButton
                label={`${ascii.blockFull} Create Encryption Policy`}
                onClick={handleCreatePolicy}
              />
              <AsciiButton
                label={`${ascii.blockFull} Manage Keys`}
                onClick={() => setShowKeyModal(true)}
                variant="ghost"
              />
            </div>

            <div style={{ marginBottom: theme.spacing.md, display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Schema name"
                value={filters.schema_name}
                onChange={(e) => setFilters(prev => ({ ...prev, schema_name: e.target.value }))}
                style={{
                  padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                  border: `1px solid ${asciiColors.border}`,
                  backgroundColor: asciiColors.background,
                  color: asciiColors.foreground,
                  fontFamily: 'Consolas',
                  fontSize: 12,
                  borderRadius: 2,
                  flex: 1,
                  minWidth: 150,
                  outline: 'none',
                  transition: 'border-color 0.15s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = asciiColors.accent;
                  e.target.style.outline = `2px solid ${asciiColors.accent}`;
                  e.target.style.outlineOffset = '2px';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = asciiColors.border;
                  e.target.style.outline = 'none';
                }}
              />
              <input
                type="text"
                placeholder="Table name"
                value={filters.table_name}
                onChange={(e) => setFilters(prev => ({ ...prev, table_name: e.target.value }))}
                style={{
                  padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                  border: `1px solid ${asciiColors.border}`,
                  backgroundColor: asciiColors.background,
                  color: asciiColors.foreground,
                  fontFamily: 'Consolas',
                  fontSize: 12,
                  borderRadius: 2,
                  flex: 1,
                  minWidth: 150,
                  outline: 'none',
                  transition: 'border-color 0.15s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = asciiColors.accent;
                  e.target.style.outline = `2px solid ${asciiColors.accent}`;
                  e.target.style.outlineOffset = '2px';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = asciiColors.border;
                  e.target.style.outline = 'none';
                }}
              />
              <select
                value={filters.active}
                onChange={(e) => setFilters(prev => ({ ...prev, active: e.target.value }))}
                style={{
                  padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                  border: `1px solid ${asciiColors.border}`,
                  backgroundColor: asciiColors.background,
                  color: asciiColors.foreground,
                  fontFamily: 'Consolas',
                  fontSize: 12,
                  borderRadius: 2,
                  minWidth: 120,
                  outline: 'none',
                  transition: 'border-color 0.15s ease',
                  cursor: 'pointer'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = asciiColors.accent;
                  e.target.style.outline = `2px solid ${asciiColors.accent}`;
                  e.target.style.outlineOffset = '2px';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = asciiColors.border;
                  e.target.style.outline = 'none';
                }}
              >
                <option value="">All Status</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>

            <div style={{ marginBottom: theme.spacing.sm, fontSize: 11, color: asciiColors.muted, fontFamily: 'Consolas' }}>
              Encryption Policies ({total})
            </div>

            <DataEncryptionTreeView
              policies={policies}
              onEdit={handleEditPolicy}
              onDelete={handleDeletePolicy}
              onEncrypt={handleEncryptColumn}
              onRotateKey={handleRotateKey}
            />
          </div>
        </AsciiPanel>
      </div>

      {isModalOpen && selectedPolicy && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsModalOpen(false);
            }
          }}
        >
          <div
            style={{
              backgroundColor: asciiColors.background,
              border: `2px solid ${asciiColors.border}`,
              borderRadius: 2,
              width: '90%',
              maxWidth: 600,
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <style>{`
              div[style*="overflowY"]::-webkit-scrollbar {
                width: 0px;
                display: none;
              }
              div[style*="overflowY"] {
                -ms-overflow-style: none;
                scrollbar-width: none;
              }
            `}</style>
            <AsciiPanel title={selectedPolicy.policy_id ? "EDIT ENCRYPTION POLICY" : "CREATE ENCRYPTION POLICY"}>
              <div style={{ padding: theme.spacing.md, fontFamily: 'Consolas', fontSize: 12 }}>
                <div style={{ marginBottom: theme.spacing.md }}>
                  <label style={{ display: 'block', marginBottom: theme.spacing.xs, color: asciiColors.muted, fontSize: 11, fontFamily: 'Consolas' }}>
                    Policy Name *
                  </label>
                  <input
                    type="text"
                    value={selectedPolicy.policy_name}
                    onChange={(e) => setSelectedPolicy(prev => prev ? { ...prev, policy_name: e.target.value } : null)}
                    style={{
                      width: '100%',
                      padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                      border: `1px solid ${asciiColors.border}`,
                      backgroundColor: asciiColors.background,
                      color: asciiColors.foreground,
                      fontFamily: 'Consolas',
                      fontSize: 12,
                      borderRadius: 2,
                      outline: 'none',
                      transition: 'border-color 0.15s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = asciiColors.accent;
                      e.target.style.outline = `2px solid ${asciiColors.accent}`;
                      e.target.style.outlineOffset = '2px';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = asciiColors.border;
                      e.target.style.outline = 'none';
                    }}
                  />
                </div>

                <div style={{ marginBottom: theme.spacing.md }}>
                  <label style={{ display: 'block', marginBottom: theme.spacing.xs, color: asciiColors.muted, fontSize: 11, fontFamily: 'Consolas' }}>
                    Schema Name *
                  </label>
                  <input
                    type="text"
                    value={selectedPolicy.schema_name}
                    onChange={(e) => setSelectedPolicy(prev => prev ? { ...prev, schema_name: e.target.value } : null)}
                    style={{
                      width: '100%',
                      padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                      border: `1px solid ${asciiColors.border}`,
                      backgroundColor: asciiColors.background,
                      color: asciiColors.foreground,
                      fontFamily: 'Consolas',
                      fontSize: 12,
                      borderRadius: 2,
                      outline: 'none',
                      transition: 'border-color 0.15s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = asciiColors.accent;
                      e.target.style.outline = `2px solid ${asciiColors.accent}`;
                      e.target.style.outlineOffset = '2px';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = asciiColors.border;
                      e.target.style.outline = 'none';
                    }}
                  />
                </div>

                <div style={{ marginBottom: theme.spacing.md }}>
                  <label style={{ display: 'block', marginBottom: theme.spacing.xs, color: asciiColors.muted, fontSize: 11, fontFamily: 'Consolas' }}>
                    Table Name *
                  </label>
                  <input
                    type="text"
                    value={selectedPolicy.table_name}
                    onChange={(e) => setSelectedPolicy(prev => prev ? { ...prev, table_name: e.target.value } : null)}
                    style={{
                      width: '100%',
                      padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                      border: `1px solid ${asciiColors.border}`,
                      backgroundColor: asciiColors.background,
                      color: asciiColors.foreground,
                      fontFamily: 'Consolas',
                      fontSize: 12,
                      borderRadius: 2,
                      outline: 'none',
                      transition: 'border-color 0.15s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = asciiColors.accent;
                      e.target.style.outline = `2px solid ${asciiColors.accent}`;
                      e.target.style.outlineOffset = '2px';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = asciiColors.border;
                      e.target.style.outline = 'none';
                    }}
                  />
                </div>

                <div style={{ marginBottom: theme.spacing.md }}>
                  <label style={{ display: 'block', marginBottom: theme.spacing.xs, color: asciiColors.muted, fontSize: 11, fontFamily: 'Consolas' }}>
                    Column Name *
                  </label>
                  <input
                    type="text"
                    value={selectedPolicy.column_name}
                    onChange={(e) => setSelectedPolicy(prev => prev ? { ...prev, column_name: e.target.value } : null)}
                    style={{
                      width: '100%',
                      padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                      border: `1px solid ${asciiColors.border}`,
                      backgroundColor: asciiColors.background,
                      color: asciiColors.foreground,
                      fontFamily: 'Consolas',
                      fontSize: 12,
                      borderRadius: 2,
                      outline: 'none',
                      transition: 'border-color 0.15s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = asciiColors.accent;
                      e.target.style.outline = `2px solid ${asciiColors.accent}`;
                      e.target.style.outlineOffset = '2px';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = asciiColors.border;
                      e.target.style.outline = 'none';
                    }}
                  />
                </div>

                <div style={{ marginBottom: theme.spacing.md }}>
                  <label style={{ display: 'block', marginBottom: theme.spacing.xs, color: asciiColors.muted, fontSize: 11, fontFamily: 'Consolas' }}>
                    Encryption Algorithm *
                  </label>
                  <select
                    value={selectedPolicy.encryption_algorithm}
                    onChange={(e) => setSelectedPolicy(prev => prev ? { ...prev, encryption_algorithm: e.target.value } : null)}
                    style={{
                      width: '100%',
                      padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                      border: `1px solid ${asciiColors.border}`,
                      backgroundColor: asciiColors.background,
                      color: asciiColors.foreground,
                      fontFamily: 'Consolas',
                      fontSize: 12,
                      borderRadius: 2,
                      outline: 'none',
                      transition: 'border-color 0.15s ease',
                      cursor: 'pointer'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = asciiColors.accent;
                      e.target.style.outline = `2px solid ${asciiColors.accent}`;
                      e.target.style.outlineOffset = '2px';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = asciiColors.border;
                      e.target.style.outline = 'none';
                    }}
                  >
                    <option value="AES128">AES128</option>
                    <option value="AES192">AES192</option>
                    <option value="AES256">AES256</option>
                  </select>
                </div>

                <div style={{ marginBottom: theme.spacing.md }}>
                  <label style={{ display: 'block', marginBottom: theme.spacing.xs, color: asciiColors.muted, fontSize: 11, fontFamily: 'Consolas' }}>
                    Key ID *
                  </label>
                  <select
                    value={selectedPolicy.key_id}
                    onChange={(e) => setSelectedPolicy(prev => prev ? { ...prev, key_id: e.target.value } : null)}
                    style={{
                      width: '100%',
                      padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                      border: `1px solid ${asciiColors.border}`,
                      backgroundColor: asciiColors.background,
                      color: asciiColors.foreground,
                      fontFamily: 'Consolas',
                      fontSize: 12,
                      borderRadius: 2,
                      outline: 'none',
                      transition: 'border-color 0.15s ease',
                      cursor: 'pointer'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = asciiColors.accent;
                      e.target.style.outline = `2px solid ${asciiColors.accent}`;
                      e.target.style.outlineOffset = '2px';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = asciiColors.border;
                      e.target.style.outline = 'none';
                    }}
                  >
                    <option value="">Select Key</option>
                    {keys.map(key => (
                      <option key={key.key_id} value={key.key_id}>{key.key_id} ({key.algorithm})</option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: theme.spacing.md }}>
                  <label style={{ display: 'block', marginBottom: theme.spacing.xs, color: asciiColors.muted, fontSize: 11, fontFamily: 'Consolas' }}>
                    Key Rotation Interval (days)
                  </label>
                  <input
                    type="number"
                    value={selectedPolicy.key_rotation_interval_days || 90}
                    onChange={(e) => setSelectedPolicy(prev => prev ? { ...prev, key_rotation_interval_days: parseInt(e.target.value) || 90 } : null)}
                    style={{
                      width: '100%',
                      padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                      border: `1px solid ${asciiColors.border}`,
                      backgroundColor: asciiColors.background,
                      color: asciiColors.foreground,
                      fontFamily: 'Consolas',
                      fontSize: 12,
                      borderRadius: 2,
                      outline: 'none',
                      transition: 'border-color 0.15s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = asciiColors.accent;
                      e.target.style.outline = `2px solid ${asciiColors.accent}`;
                      e.target.style.outlineOffset = '2px';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = asciiColors.border;
                      e.target.style.outline = 'none';
                    }}
                  />
                </div>

                <div style={{ marginBottom: theme.spacing.md }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={selectedPolicy.active}
                      onChange={(e) => setSelectedPolicy(prev => prev ? { ...prev, active: e.target.checked } : null)}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>Active</span>
                  </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: theme.spacing.sm, marginTop: theme.spacing.lg }}>
                  <AsciiButton
                    label="Cancel"
                    onClick={() => setIsModalOpen(false)}
                    variant="ghost"
                  />
                  <AsciiButton
                    label="Save"
                    onClick={handleSavePolicy}
                  />
                </div>
              </div>
            </AsciiPanel>
          </div>
        </div>
      )}

      {showKeyModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowKeyModal(false);
            }
          }}
        >
          <div
            style={{
              backgroundColor: asciiColors.background,
              border: `2px solid ${asciiColors.border}`,
              borderRadius: 2,
              width: '90%',
              maxWidth: 500,
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <style>{`
              div[style*="overflowY"]::-webkit-scrollbar {
                width: 0px;
                display: none;
              }
              div[style*="overflowY"] {
                -ms-overflow-style: none;
                scrollbar-width: none;
              }
            `}</style>
            <AsciiPanel title="ENCRYPTION KEYS">
              <div style={{ padding: theme.spacing.md, fontFamily: 'Consolas', fontSize: 12 }}>
                <div style={{ marginBottom: theme.spacing.lg }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: asciiColors.accent, marginBottom: theme.spacing.sm, fontFamily: 'Consolas' }}>
                    {ascii.blockFull} CREATE NEW KEY
                  </div>
                  <div style={{ marginBottom: theme.spacing.sm }}>
                    <label style={{ display: 'block', marginBottom: theme.spacing.xs, color: asciiColors.muted, fontSize: 11, fontFamily: 'Consolas' }}>
                      Key ID *
                    </label>
                    <input
                      type="text"
                      value={newKey.key_id}
                      onChange={(e) => setNewKey(prev => ({ ...prev, key_id: e.target.value }))}
                      placeholder="e.g., key_2024_01"
                      style={{
                        width: '100%',
                        padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                        border: `1px solid ${asciiColors.border}`,
                        backgroundColor: asciiColors.background,
                        color: asciiColors.foreground,
                        fontFamily: 'Consolas',
                        fontSize: 12,
                        borderRadius: 2,
                        outline: 'none',
                        transition: 'border-color 0.15s ease'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = asciiColors.accent;
                        e.target.style.outline = `2px solid ${asciiColors.accent}`;
                        e.target.style.outlineOffset = '2px';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = asciiColors.border;
                        e.target.style.outline = 'none';
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: theme.spacing.sm }}>
                    <label style={{ display: 'block', marginBottom: theme.spacing.xs, color: asciiColors.muted, fontSize: 11, fontFamily: 'Consolas' }}>
                      Key Value *
                    </label>
                    <input
                      type="password"
                      value={newKey.key_value}
                      onChange={(e) => setNewKey(prev => ({ ...prev, key_value: e.target.value }))}
                      placeholder="Enter encryption key"
                      style={{
                        width: '100%',
                        padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                        border: `1px solid ${asciiColors.border}`,
                        backgroundColor: asciiColors.background,
                        color: asciiColors.foreground,
                        fontFamily: 'Consolas',
                        fontSize: 12,
                        borderRadius: 2,
                        outline: 'none',
                        transition: 'border-color 0.15s ease'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = asciiColors.accent;
                        e.target.style.outline = `2px solid ${asciiColors.accent}`;
                        e.target.style.outlineOffset = '2px';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = asciiColors.border;
                        e.target.style.outline = 'none';
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: theme.spacing.md }}>
                    <label style={{ display: 'block', marginBottom: theme.spacing.xs, color: asciiColors.muted, fontSize: 11, fontFamily: 'Consolas' }}>
                      Algorithm
                    </label>
                    <select
                      value={newKey.algorithm}
                      onChange={(e) => setNewKey(prev => ({ ...prev, algorithm: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                        border: `1px solid ${asciiColors.border}`,
                        backgroundColor: asciiColors.background,
                        color: asciiColors.foreground,
                        fontFamily: 'Consolas',
                        fontSize: 12,
                        borderRadius: 2,
                        outline: 'none',
                        transition: 'border-color 0.15s ease',
                        cursor: 'pointer'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = asciiColors.accent;
                        e.target.style.outline = `2px solid ${asciiColors.accent}`;
                        e.target.style.outlineOffset = '2px';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = asciiColors.border;
                        e.target.style.outline = 'none';
                      }}
                    >
                      <option value="AES128">AES128</option>
                      <option value="AES192">AES192</option>
                      <option value="AES256">AES256</option>
                    </select>
                  </div>
                  <AsciiButton
                    label="Create Key"
                    onClick={handleCreateKey}
                  />
                </div>

                <div style={{ marginTop: theme.spacing.lg, paddingTop: theme.spacing.md, borderTop: `1px solid ${asciiColors.border}` }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: asciiColors.accent, marginBottom: theme.spacing.sm, fontFamily: 'Consolas' }}>
                    {ascii.blockFull} EXISTING KEYS
                  </div>
                  {keys.length === 0 ? (
                    <div style={{ color: asciiColors.muted, fontSize: 11, padding: theme.spacing.sm, fontFamily: 'Consolas' }}>
                      No encryption keys found. Create one above.
                    </div>
                  ) : (
                    <EncryptionKeysTreeView keys={keys} />
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: theme.spacing.lg }}>
                  <AsciiButton
                    label="Close"
                    onClick={() => setShowKeyModal(false)}
                    variant="ghost"
                  />
                </div>
              </div>
            </AsciiPanel>
          </div>
        </div>
      )}
    </Container>
  );
};

export default DataEncryption;
