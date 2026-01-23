import { useState, useEffect, useCallback, useRef } from 'react';
import styled from 'styled-components';
import { rlsApi, type RLSPolicy } from '../../services/api';
import { Container, LoadingOverlay, ErrorMessage } from '../shared/BaseComponents';
import SkeletonLoader from '../shared/SkeletonLoader';
import { extractApiError } from '../../utils/errorHandler';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { theme } from '../../theme/theme';

const RLSTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: ${theme.spacing.lg};
  background: ${asciiColors.background};
  border-radius: 2;
  overflow: hidden;
  font-family: 'Consolas';
`;

const Th = styled.th`
  padding: ${theme.spacing.sm};
  text-align: left;
  border-bottom: 2px solid ${asciiColors.border};
  background: ${asciiColors.backgroundSoft};
  font-weight: 600;
  font-family: 'Consolas';
  font-size: 13px;
  color: ${asciiColors.accent};
  position: sticky;
  top: 0;
  z-index: 10;
`;

const Td = styled.td`
  padding: ${theme.spacing.sm};
  border-bottom: 1px solid ${asciiColors.border};
  font-family: 'Consolas';
  font-size: 12px;
  transition: background-color 0.15s ease;
  word-break: break-word;
`;

const TableRow = styled.tr`
  transition: background-color 0.15s ease;
`;

const formatDate = (date: string) => {
  if (!date) return '-';
  return new Date(date).toLocaleString();
};

const RowLevelSecurity = () => {
  const isMountedRef = useRef(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [policies, setPolicies] = useState<RLSPolicy[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<RLSPolicy | null>(null);
  const [filters, setFilters] = useState({
    schema_name: '',
    table_name: '',
    active: '',
  });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

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

      const response = await rlsApi.getAll(params);
      
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

  useEffect(() => {
    isMountedRef.current = true;
    fetchPolicies();
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchPolicies]);

  const handleCreatePolicy = useCallback(() => {
    setSelectedPolicy({
      policy_name: '',
      schema_name: '',
      table_name: '',
      policy_expression: '',
      policy_type: 'SELECT',
      description: '',
      active: true,
    });
    setIsModalOpen(true);
  }, []);

  const handleEditPolicy = useCallback((policy: RLSPolicy) => {
    setSelectedPolicy({ ...policy });
    setIsModalOpen(true);
  }, []);

  const handleDeletePolicy = useCallback(async (policyId: number) => {
    if (!confirm('Are you sure you want to delete this RLS policy?')) {
      return;
    }

    try {
      await rlsApi.delete(policyId);
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
        await rlsApi.update(selectedPolicy.policy_id, selectedPolicy);
      } else {
        await rlsApi.create(selectedPolicy);
      }
      setIsModalOpen(false);
      fetchPolicies();
    } catch (err) {
      if (isMountedRef.current) {
        setError(extractApiError(err));
      }
    }
  }, [selectedPolicy, fetchPolicies]);

  const policyTypeExamples = {
    SELECT: "user_id = current_setting('app.user_id')::integer",
    INSERT: "user_id = current_setting('app.user_id')::integer",
    UPDATE: "user_id = current_setting('app.user_id')::integer",
    DELETE: "user_id = current_setting('app.user_id')::integer",
    ALL: "user_id = current_setting('app.user_id')::integer",
  };

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
          ROW-LEVEL SECURITY
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
        <AsciiPanel title="ROW-LEVEL SECURITY (RLS)">
          <div style={{ padding: theme.spacing.md, fontFamily: 'Consolas', fontSize: 12 }}>
            <div style={{ marginBottom: theme.spacing.md }}>
              <AsciiButton
                label={`${ascii.blockFull} Create RLS Policy`}
                onClick={handleCreatePolicy}
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
              RLS Policies ({total})
            </div>

            <RLSTable>
              <thead>
                <tr>
                  <Th>Policy Name</Th>
                  <Th>Schema.Table</Th>
                  <Th>Type</Th>
                  <Th>Expression</Th>
                  <Th>Status</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {policies.length === 0 ? (
                  <tr>
                    <Td colSpan={6} style={{ textAlign: 'center', padding: 20, color: asciiColors.muted }}>
                      No RLS policies found. Create one to get started.
                    </Td>
                  </tr>
                ) : (
                  policies.map((policy) => (
                    <TableRow key={policy.policy_id}>
                      <Td>{policy.policy_name}</Td>
                      <Td>
                        <code style={{ color: asciiColors.accent }}>
                          {policy.schema_name}.{policy.table_name}
                        </code>
                      </Td>
                      <Td>
                        <span style={{ color: asciiColors.accent, fontWeight: 600 }}>
                          {policy.policy_type}
                        </span>
                      </Td>
                      <Td>
                        <code style={{ 
                          color: asciiColors.muted, 
                          fontSize: 11,
                          maxWidth: 400,
                          display: 'block',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }} title={policy.policy_expression}>
                          {policy.policy_expression}
                        </code>
                      </Td>
                      <Td>
                        <span style={{
                          color: policy.active ? asciiColors.accent : asciiColors.muted,
                          fontWeight: 600,
                          fontFamily: 'Consolas'
                        }}>
                          {policy.active ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </Td>
                      <Td>
                        <div style={{ display: 'flex', gap: theme.spacing.sm }}>
                          <AsciiButton
                            label="✎"
                            onClick={() => handleEditPolicy(policy)}
                            variant="ghost"
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
            </RLSTable>

            {total > limit && (
              <div style={{ marginTop: theme.spacing.md, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 11, color: asciiColors.muted, fontFamily: 'Consolas' }}>
                  Page {page} of {Math.ceil(total / limit)}
                </div>
                <div style={{ display: 'flex', gap: theme.spacing.sm }}>
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
              maxWidth: 700,
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
            <AsciiPanel title={selectedPolicy.policy_id ? "EDIT RLS POLICY" : "CREATE RLS POLICY"}>
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
                    Policy Type *
                  </label>
                  <select
                    value={selectedPolicy.policy_type}
                    onChange={(e) => setSelectedPolicy(prev => prev ? { ...prev, policy_type: e.target.value as any } : null)}
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
                    <option value="SELECT">SELECT</option>
                    <option value="INSERT">INSERT</option>
                    <option value="UPDATE">UPDATE</option>
                    <option value="DELETE">DELETE</option>
                    <option value="ALL">ALL</option>
                  </select>
                </div>

                <div style={{ marginBottom: theme.spacing.md }}>
                  <label style={{ display: 'block', marginBottom: theme.spacing.xs, color: asciiColors.muted, fontSize: 11, fontFamily: 'Consolas' }}>
                    Policy Expression (SQL) *
                  </label>
                  <textarea
                    value={selectedPolicy.policy_expression}
                    onChange={(e) => setSelectedPolicy(prev => prev ? { ...prev, policy_expression: e.target.value } : null)}
                    placeholder={policyTypeExamples[selectedPolicy.policy_type]}
                    rows={4}
                    style={{
                      width: '100%',
                      padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                      border: `1px solid ${asciiColors.border}`,
                      backgroundColor: asciiColors.background,
                      color: asciiColors.foreground,
                      fontFamily: 'Consolas',
                      fontSize: 12,
                      borderRadius: 2,
                      resize: 'vertical',
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
                  <div style={{ marginTop: theme.spacing.xs, fontSize: 10, color: asciiColors.muted, fontFamily: 'Consolas' }}>
                    Example: user_id = current_setting('app.user_id')::integer
                  </div>
                </div>

                <div style={{ marginBottom: theme.spacing.md }}>
                  <label style={{ display: 'block', marginBottom: theme.spacing.xs, color: asciiColors.muted, fontSize: 11, fontFamily: 'Consolas' }}>
                    Description
                  </label>
                  <textarea
                    value={selectedPolicy.description || ''}
                    onChange={(e) => setSelectedPolicy(prev => prev ? { ...prev, description: e.target.value } : null)}
                    rows={2}
                    style={{
                      width: '100%',
                      padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                      border: `1px solid ${asciiColors.border}`,
                      backgroundColor: asciiColors.background,
                      color: asciiColors.foreground,
                      fontFamily: 'Consolas',
                      fontSize: 12,
                      borderRadius: 2,
                      resize: 'vertical',
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
    </Container>
  );
};

export default RowLevelSecurity;
