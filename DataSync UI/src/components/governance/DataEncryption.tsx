import { useState, useEffect, useCallback, useRef } from 'react';
import styled from 'styled-components';
import { dataEncryptionApi, type EncryptionPolicy, type EncryptionKey } from '../../services/api';
import { Container, LoadingOverlay, ErrorMessage } from '../shared/BaseComponents';
import { extractApiError } from '../../utils/errorHandler';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { theme } from '../../theme/theme';

const EncryptionTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: ${theme.spacing.lg};
  background: ${theme.colors.background.main};
  box-shadow: ${theme.shadows.md};
  border-radius: ${theme.borderRadius.md};
  overflow: hidden;
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
    
    try {
      setLoading(true);
      setError(null);
      const params: any = { page, limit };
      if (filters.schema_name) params.schema_name = filters.schema_name;
      if (filters.table_name) params.table_name = filters.table_name;
      if (filters.active !== '') params.active = filters.active === 'true';

      const response = await dataEncryptionApi.getAll(params);
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

  return (
    <Container>
      <LoadingOverlay loading={loading} />
      {error && <ErrorMessage message={error} onClose={() => setError(null)} />}

      <div style={{ marginBottom: 20 }}>
        <AsciiPanel title="DATA ENCRYPTION">
          <div style={{ padding: 16, fontFamily: 'Consolas', fontSize: 12 }}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
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

            <div style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Schema name"
                value={filters.schema_name}
                onChange={(e) => setFilters(prev => ({ ...prev, schema_name: e.target.value }))}
                style={{
                  padding: '8px 12px',
                  border: `1px solid ${asciiColors.border}`,
                  backgroundColor: asciiColors.background,
                  color: asciiColors.foreground,
                  fontFamily: 'Consolas',
                  fontSize: 12,
                  borderRadius: 2,
                  flex: 1,
                  minWidth: 150,
                }}
              />
              <input
                type="text"
                placeholder="Table name"
                value={filters.table_name}
                onChange={(e) => setFilters(prev => ({ ...prev, table_name: e.target.value }))}
                style={{
                  padding: '8px 12px',
                  border: `1px solid ${asciiColors.border}`,
                  backgroundColor: asciiColors.background,
                  color: asciiColors.foreground,
                  fontFamily: 'Consolas',
                  fontSize: 12,
                  borderRadius: 2,
                  flex: 1,
                  minWidth: 150,
                }}
              />
              <select
                value={filters.active}
                onChange={(e) => setFilters(prev => ({ ...prev, active: e.target.value }))}
                style={{
                  padding: '8px 12px',
                  border: `1px solid ${asciiColors.border}`,
                  backgroundColor: asciiColors.background,
                  color: asciiColors.foreground,
                  fontFamily: 'Consolas',
                  fontSize: 12,
                  borderRadius: 2,
                  minWidth: 120,
                }}
              >
                <option value="">All Status</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>

            <div style={{ marginBottom: 12, fontSize: 11, color: asciiColors.muted }}>
              Encryption Policies ({total})
            </div>

            <EncryptionTable>
              <thead>
                <tr>
                  <Th>Policy Name</Th>
                  <Th>Schema.Table.Column</Th>
                  <Th>Algorithm</Th>
                  <Th>Key ID</Th>
                  <Th>Status</Th>
                  <Th>Last Rotated</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {policies.length === 0 ? (
                  <tr>
                    <Td colSpan={7} style={{ textAlign: 'center', padding: 20, color: asciiColors.muted }}>
                      No encryption policies found. Create one to get started.
                    </Td>
                  </tr>
                ) : (
                  policies.map((policy) => (
                    <TableRow key={policy.policy_id}>
                      <Td>{policy.policy_name}</Td>
                      <Td>
                        <code style={{ color: asciiColors.accent }}>
                          {policy.schema_name}.{policy.table_name}.{policy.column_name}
                        </code>
                      </Td>
                      <Td>{policy.encryption_algorithm}</Td>
                      <Td>
                        <code style={{ color: asciiColors.muted }}>{policy.key_id}</code>
                      </Td>
                      <Td>
                        <span style={{
                          color: policy.active ? asciiColors.success : asciiColors.danger,
                          fontWeight: 600
                        }}>
                          {policy.active ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </Td>
                      <Td>{formatDate(policy.last_rotated_at || '')}</Td>
                      <Td>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <AsciiButton
                            label="✎"
                            onClick={() => handleEditPolicy(policy)}
                            variant="ghost"
                          />
                          <AsciiButton
                            label="🔒"
                            onClick={() => handleEncryptColumn(policy)}
                            variant="ghost"
                            title="Encrypt Column Data"
                          />
                          <AsciiButton
                            label="🔄"
                            onClick={() => handleRotateKey(policy)}
                            variant="ghost"
                            title="Rotate Key"
                          />
                          <AsciiButton
                            label="🗑️"
                            onClick={() => handleDeletePolicy(policy.policy_id!)}
                            variant="ghost"
                          />
                        </div>
                      </Td>
                    </TableRow>
                  ))
                )}
              </tbody>
            </EncryptionTable>

            {total > limit && (
              <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 11, color: asciiColors.muted }}>
                  Page {page} of {Math.ceil(total / limit)}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <AsciiButton
                    label="◀ Previous"
                    onClick={() => setPage(prev => Math.max(1, prev - 1))}
                    disabled={page === 1}
                    variant="ghost"
                  />
                  <AsciiButton
                    label="Next ▶"
                    onClick={() => setPage(prev => Math.min(Math.ceil(total / limit), prev + 1))}
                    disabled={page >= Math.ceil(total / limit)}
                    variant="ghost"
                  />
                </div>
              </div>
            )}
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
            <AsciiPanel title={selectedPolicy.policy_id ? "EDIT ENCRYPTION POLICY" : "CREATE ENCRYPTION POLICY"}>
              <div style={{ padding: 16, fontFamily: 'Consolas', fontSize: 12 }}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', marginBottom: 4, color: asciiColors.muted, fontSize: 11 }}>
                    Policy Name *
                  </label>
                  <input
                    type="text"
                    value={selectedPolicy.policy_name}
                    onChange={(e) => setSelectedPolicy(prev => prev ? { ...prev, policy_name: e.target.value } : null)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: `1px solid ${asciiColors.border}`,
                      backgroundColor: asciiColors.background,
                      color: asciiColors.foreground,
                      fontFamily: 'Consolas',
                      fontSize: 12,
                      borderRadius: 2,
                    }}
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', marginBottom: 4, color: asciiColors.muted, fontSize: 11 }}>
                    Schema Name *
                  </label>
                  <input
                    type="text"
                    value={selectedPolicy.schema_name}
                    onChange={(e) => setSelectedPolicy(prev => prev ? { ...prev, schema_name: e.target.value } : null)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: `1px solid ${asciiColors.border}`,
                      backgroundColor: asciiColors.background,
                      color: asciiColors.foreground,
                      fontFamily: 'Consolas',
                      fontSize: 12,
                      borderRadius: 2,
                    }}
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', marginBottom: 4, color: asciiColors.muted, fontSize: 11 }}>
                    Table Name *
                  </label>
                  <input
                    type="text"
                    value={selectedPolicy.table_name}
                    onChange={(e) => setSelectedPolicy(prev => prev ? { ...prev, table_name: e.target.value } : null)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: `1px solid ${asciiColors.border}`,
                      backgroundColor: asciiColors.background,
                      color: asciiColors.foreground,
                      fontFamily: 'Consolas',
                      fontSize: 12,
                      borderRadius: 2,
                    }}
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', marginBottom: 4, color: asciiColors.muted, fontSize: 11 }}>
                    Column Name *
                  </label>
                  <input
                    type="text"
                    value={selectedPolicy.column_name}
                    onChange={(e) => setSelectedPolicy(prev => prev ? { ...prev, column_name: e.target.value } : null)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: `1px solid ${asciiColors.border}`,
                      backgroundColor: asciiColors.background,
                      color: asciiColors.foreground,
                      fontFamily: 'Consolas',
                      fontSize: 12,
                      borderRadius: 2,
                    }}
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', marginBottom: 4, color: asciiColors.muted, fontSize: 11 }}>
                    Encryption Algorithm *
                  </label>
                  <select
                    value={selectedPolicy.encryption_algorithm}
                    onChange={(e) => setSelectedPolicy(prev => prev ? { ...prev, encryption_algorithm: e.target.value } : null)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: `1px solid ${asciiColors.border}`,
                      backgroundColor: asciiColors.background,
                      color: asciiColors.foreground,
                      fontFamily: 'Consolas',
                      fontSize: 12,
                      borderRadius: 2,
                    }}
                  >
                    <option value="AES128">AES128</option>
                    <option value="AES192">AES192</option>
                    <option value="AES256">AES256</option>
                  </select>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', marginBottom: 4, color: asciiColors.muted, fontSize: 11 }}>
                    Key ID *
                  </label>
                  <select
                    value={selectedPolicy.key_id}
                    onChange={(e) => setSelectedPolicy(prev => prev ? { ...prev, key_id: e.target.value } : null)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: `1px solid ${asciiColors.border}`,
                      backgroundColor: asciiColors.background,
                      color: asciiColors.foreground,
                      fontFamily: 'Consolas',
                      fontSize: 12,
                      borderRadius: 2,
                    }}
                  >
                    <option value="">Select Key</option>
                    {keys.map(key => (
                      <option key={key.key_id} value={key.key_id}>{key.key_id} ({key.algorithm})</option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', marginBottom: 4, color: asciiColors.muted, fontSize: 11 }}>
                    Key Rotation Interval (days)
                  </label>
                  <input
                    type="number"
                    value={selectedPolicy.key_rotation_interval_days || 90}
                    onChange={(e) => setSelectedPolicy(prev => prev ? { ...prev, key_rotation_interval_days: parseInt(e.target.value) || 90 } : null)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: `1px solid ${asciiColors.border}`,
                      backgroundColor: asciiColors.background,
                      color: asciiColors.foreground,
                      fontFamily: 'Consolas',
                      fontSize: 12,
                      borderRadius: 2,
                    }}
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={selectedPolicy.active}
                      onChange={(e) => setSelectedPolicy(prev => prev ? { ...prev, active: e.target.checked } : null)}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ color: asciiColors.foreground, fontSize: 12 }}>Active</span>
                  </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 20 }}>
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
            <AsciiPanel title="ENCRYPTION KEYS">
              <div style={{ padding: 16, fontFamily: 'Consolas', fontSize: 12 }}>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                    {ascii.blockFull} CREATE NEW KEY
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', marginBottom: 4, color: asciiColors.muted, fontSize: 11 }}>
                      Key ID *
                    </label>
                    <input
                      type="text"
                      value={newKey.key_id}
                      onChange={(e) => setNewKey(prev => ({ ...prev, key_id: e.target.value }))}
                      placeholder="e.g., key_2024_01"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: `1px solid ${asciiColors.border}`,
                        backgroundColor: asciiColors.background,
                        color: asciiColors.foreground,
                        fontFamily: 'Consolas',
                        fontSize: 12,
                        borderRadius: 2,
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', marginBottom: 4, color: asciiColors.muted, fontSize: 11 }}>
                      Key Value *
                    </label>
                    <input
                      type="password"
                      value={newKey.key_value}
                      onChange={(e) => setNewKey(prev => ({ ...prev, key_value: e.target.value }))}
                      placeholder="Enter encryption key"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: `1px solid ${asciiColors.border}`,
                        backgroundColor: asciiColors.background,
                        color: asciiColors.foreground,
                        fontFamily: 'Consolas',
                        fontSize: 12,
                        borderRadius: 2,
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', marginBottom: 4, color: asciiColors.muted, fontSize: 11 }}>
                      Algorithm
                    </label>
                    <select
                      value={newKey.algorithm}
                      onChange={(e) => setNewKey(prev => ({ ...prev, algorithm: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: `1px solid ${asciiColors.border}`,
                        backgroundColor: asciiColors.background,
                        color: asciiColors.foreground,
                        fontFamily: 'Consolas',
                        fontSize: 12,
                        borderRadius: 2,
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

                <div style={{ marginTop: 24, paddingTop: 16, borderTop: `1px solid ${asciiColors.border}` }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                    {ascii.blockFull} EXISTING KEYS
                  </div>
                  {keys.length === 0 ? (
                    <div style={{ color: asciiColors.muted, fontSize: 11, padding: 12 }}>
                      No encryption keys found. Create one above.
                    </div>
                  ) : (
                    <EncryptionTable>
                      <thead>
                        <tr>
                          <Th>Key ID</Th>
                          <Th>Algorithm</Th>
                          <Th>Created</Th>
                          <Th>Last Used</Th>
                          <Th>Rotations</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {keys.map(key => (
                          <TableRow key={key.key_id}>
                            <Td><code style={{ color: asciiColors.accent }}>{key.key_id}</code></Td>
                            <Td>{key.algorithm}</Td>
                            <Td>{formatDate(key.created_at)}</Td>
                            <Td>{formatDate(key.last_used_at || '')}</Td>
                            <Td>{key.rotation_count}</Td>
                          </TableRow>
                        ))}
                      </tbody>
                    </EncryptionTable>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
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
