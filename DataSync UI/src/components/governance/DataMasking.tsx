import { useState, useEffect, useCallback, useRef } from 'react';
import styled from 'styled-components';
import { dataMaskingApi } from '../../services/api';
import { Container, LoadingOverlay, ErrorMessage } from '../shared/BaseComponents';
import { extractApiError } from '../../utils/errorHandler';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { theme } from '../../theme/theme';

const MaskingTable = styled.table`
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

const getMaskingTypeColor = (type: string) => {
  switch (type) {
    case 'FULL': return asciiColors.danger;
    case 'PARTIAL': return asciiColors.warning;
    case 'EMAIL': return asciiColors.accent;
    case 'PHONE': return asciiColors.accent;
    case 'HASH': return asciiColors.muted;
    case 'TOKENIZE': return asciiColors.success;
    default: return asciiColors.muted;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'ACTIVE': return asciiColors.success;
    case 'INACTIVE': return asciiColors.danger;
    default: return asciiColors.muted;
  }
};

const formatDate = (date: string) => {
  if (!date) return '-';
  return new Date(date).toLocaleString();
};

interface MaskingPolicy {
  policy_id?: number;
  policy_name: string;
  schema_name: string;
  table_name: string;
  column_name: string;
  masking_type: string;
  masking_function?: string;
  masking_params?: Record<string, any>;
  role_whitelist?: string[];
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

const DataMasking = () => {
  const isMountedRef = useRef(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [policies, setPolicies] = useState<MaskingPolicy[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<MaskingPolicy | null>(null);
  const [filters, setFilters] = useState({
    schema_name: '',
    table_name: '',
    masking_type: '',
    active: '',
  });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;
  const [maskingStatus, setMaskingStatus] = useState<any>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [batchResults, setBatchResults] = useState<any>(null);
  const [batchConfig, setBatchConfig] = useState({
    database_name: '',
    schema_name: '',
    masking_type: 'FULL',
    auto_activate: true,
    min_confidence: 0.75,
  });
  const [availableDatabases, setAvailableDatabases] = useState<string[]>([]);

  const maskingTypes = [
    { value: 'FULL', label: 'Full Mask (***MASKED***)' },
    { value: 'PARTIAL', label: 'Partial Mask (j***@email.com)' },
    { value: 'EMAIL', label: 'Email Mask (j***@email.com)' },
    { value: 'PHONE', label: 'Phone Mask (555-****)' },
    { value: 'HASH', label: 'Hash (SHA256)' },
    { value: 'TOKENIZE', label: 'Tokenize (TOKEN_xxx)' },
  ];

  const fetchPolicies = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    try {
      setLoading(true);
      setError(null);
      const params: any = { page, limit };
      if (filters.schema_name) params.schema_name = filters.schema_name;
      if (filters.table_name) params.table_name = filters.table_name;
      if (filters.masking_type) params.masking_type = filters.masking_type;
      if (filters.active !== '') params.active = filters.active === 'true';

      const response = await dataMaskingApi.getAll(params);
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
      column_name: '',
      masking_type: 'FULL',
      active: true,
    });
    setIsModalOpen(true);
  }, []);

  const handleEditPolicy = useCallback((policy: MaskingPolicy) => {
    setSelectedPolicy({ ...policy });
    setIsModalOpen(true);
  }, []);

  const handleDeletePolicy = useCallback(async (policyId: number) => {
    if (!confirm('Are you sure you want to delete this masking policy?')) {
      return;
    }

    try {
      await dataMaskingApi.delete(policyId);
      await fetchPolicies();
    } catch (err) {
      setError(extractApiError(err));
    }
  }, [fetchPolicies]);

  const handleSavePolicy = useCallback(async () => {
    if (!selectedPolicy) return;

    try {
      if (selectedPolicy.policy_id) {
        await dataMaskingApi.update(selectedPolicy.policy_id, selectedPolicy);
      } else {
        await dataMaskingApi.create(selectedPolicy);
      }
      setIsModalOpen(false);
      setSelectedPolicy(null);
      await fetchPolicies();
    } catch (err) {
      setError(extractApiError(err));
    }
  }, [selectedPolicy, fetchPolicies]);

  const handleAnalyzeColumns = useCallback(async (schemaName: string, tableName: string) => {
    try {
      setLoading(true);
      const response = await dataMaskingApi.analyzeSensitiveColumns(schemaName, tableName);
      if (response.columns && response.columns.length > 0) {
        alert(`Found ${response.columns.length} potentially sensitive columns:\n${response.columns.map((c: any) => `- ${c.column_name} (${c.pii_category || 'Unknown'})`).join('\n')}`);
      } else {
        alert('No sensitive columns detected.');
      }
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMaskingStatus = useCallback(async () => {
    try {
      setLoadingStatus(true);
      const response = await dataMaskingApi.getStatus();
      setMaskingStatus(response);
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  const handleBatchAnalyze = useCallback(async () => {
    try {
      setBatchProcessing(true);
      setError(null);
      const response = await dataMaskingApi.batchAnalyze(batchConfig);
      setBatchResults(response);
      await fetchPolicies();
      await fetchMaskingStatus();
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setBatchProcessing(false);
    }
  }, [batchConfig, fetchPolicies, fetchMaskingStatus]);

  useEffect(() => {
    fetchMaskingStatus();
    fetchAvailableDatabases();
  }, [fetchMaskingStatus]);

  const fetchAvailableDatabases = useCallback(async () => {
    try {
      const response = await dataMaskingApi.getAvailableDatabases();
      if (response.databases && response.databases.length > 0) {
        setAvailableDatabases(response.databases);
      }
    } catch (err) {
      console.error('Error fetching databases:', err);
    }
  }, []);

  if (loading && policies.length === 0) {
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
          <span>Loading masking policies</span>
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
      padding: "20px",
      fontFamily: "Consolas",
      fontSize: 12,
      color: asciiColors.foreground,
      backgroundColor: asciiColors.background,
      display: "flex",
      flexDirection: "column",
      gap: 20
    }}>
      <h1 style={{
        fontSize: 14,
        fontWeight: 600,
        margin: "0 0 20px 0",
        color: asciiColors.foreground,
        textTransform: "uppercase",
        fontFamily: "Consolas"
      }}>
        <span style={{ color: asciiColors.accent, marginRight: 8 }}>{ascii.blockFull}</span>
        DATA MASKING & ENCRYPTION
      </h1>

      {error && (
        <div style={{ marginBottom: 20 }}>
          <AsciiPanel title="ERROR">
            <div style={{
              padding: "12px",
              color: asciiColors.danger,
              fontSize: 12,
              fontFamily: "Consolas"
            }}>
              {error}
            </div>
          </AsciiPanel>
        </div>
      )}

      {maskingStatus && maskingStatus.overall_summary && (
        <AsciiPanel title="MASKING STATUS OVERVIEW">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: theme.spacing.md,
            padding: theme.spacing.md,
            fontFamily: "Consolas",
            fontSize: 11
          }}>
            <div>
              <div style={{ color: asciiColors.muted, fontSize: 10, marginBottom: 4 }}>Total Tables</div>
              <div style={{ color: asciiColors.foreground, fontSize: 16, fontWeight: 'bold' }}>
                {maskingStatus.overall_summary.total_tables}
              </div>
            </div>
            <div>
              <div style={{ color: asciiColors.muted, fontSize: 10, marginBottom: 4 }}>Sensitive Columns</div>
              <div style={{ color: asciiColors.warning, fontSize: 16, fontWeight: 'bold' }}>
                {maskingStatus.overall_summary.sensitive_columns}
              </div>
            </div>
            <div>
              <div style={{ color: asciiColors.muted, fontSize: 10, marginBottom: 4 }}>Protected</div>
              <div style={{ color: asciiColors.success, fontSize: 16, fontWeight: 'bold' }}>
                {maskingStatus.overall_summary.columns_with_policies}
              </div>
            </div>
            <div>
              <div style={{ color: asciiColors.muted, fontSize: 10, marginBottom: 4 }}>Unprotected</div>
              <div style={{ color: asciiColors.danger, fontSize: 16, fontWeight: 'bold' }}>
                {maskingStatus.overall_summary.columns_without_policies}
              </div>
            </div>
            <div>
              <div style={{ color: asciiColors.muted, fontSize: 10, marginBottom: 4 }}>Coverage</div>
              <div style={{ 
                color: maskingStatus.overall_summary.coverage_percentage >= 90 
                  ? asciiColors.success 
                  : maskingStatus.overall_summary.coverage_percentage >= 70 
                  ? asciiColors.warning 
                  : asciiColors.danger, 
                fontSize: 16, 
                fontWeight: 'bold' 
              }}>
                {maskingStatus.overall_summary.coverage_percentage.toFixed(1)}%
              </div>
            </div>
            <div>
              <div style={{ color: asciiColors.muted, fontSize: 10, marginBottom: 4 }}>Status</div>
              <div style={{ 
                color: maskingStatus.overall_summary.status === 'EXCELLENT' 
                  ? asciiColors.success 
                  : maskingStatus.overall_summary.status === 'GOOD' 
                  ? asciiColors.warning 
                  : asciiColors.danger, 
                fontSize: 16, 
                fontWeight: 'bold' 
              }}>
                {maskingStatus.overall_summary.status}
              </div>
            </div>
          </div>
          <div style={{ marginTop: theme.spacing.md, padding: theme.spacing.sm, borderTop: `1px solid ${asciiColors.border}` }}>
            <AsciiButton
              label="Refresh Status"
              onClick={fetchMaskingStatus}
              variant="ghost"
              disabled={loadingStatus}
            />
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
        <div style={{ display: 'flex', gap: theme.spacing.sm }}>
          <AsciiButton 
            label={`${ascii.blockFull} Create Masking Policy`}
            onClick={handleCreatePolicy}
            variant="primary"
          />
          <AsciiButton 
            label={`${ascii.blockFull} Batch Analyze & Create`}
            onClick={() => setIsBatchModalOpen(true)}
            variant="primary"
          />
        </div>
        <div style={{ display: 'flex', gap: theme.spacing.sm }}>
          <input
            type="text"
            placeholder="Schema..."
            value={filters.schema_name}
            onChange={(e) => setFilters(prev => ({ ...prev, schema_name: e.target.value }))}
            style={{
              padding: '6px 10px',
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2,
              background: asciiColors.background,
              color: asciiColors.foreground,
              fontFamily: "Consolas",
              fontSize: 11
            }}
          />
          <input
            type="text"
            placeholder="Table..."
            value={filters.table_name}
            onChange={(e) => setFilters(prev => ({ ...prev, table_name: e.target.value }))}
            style={{
              padding: '6px 10px',
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2,
              background: asciiColors.background,
              color: asciiColors.foreground,
              fontFamily: "Consolas",
              fontSize: 11
            }}
          />
          <select
            value={filters.masking_type}
            onChange={(e) => setFilters(prev => ({ ...prev, masking_type: e.target.value }))}
            style={{
              padding: '6px 10px',
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2,
              background: asciiColors.background,
              color: asciiColors.foreground,
              fontFamily: "Consolas",
              fontSize: 11
            }}
          >
            <option value="">All Types</option>
            {maskingTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
          <select
            value={filters.active}
            onChange={(e) => setFilters(prev => ({ ...prev, active: e.target.value }))}
            style={{
              padding: '6px 10px',
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2,
              background: asciiColors.background,
              color: asciiColors.foreground,
              fontFamily: "Consolas",
              fontSize: 11
            }}
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
      </div>

      <AsciiPanel title="MASKING POLICIES">
        {loading && <LoadingOverlay />}
        <MaskingTable>
          <thead>
            <tr>
              <Th>Policy Name</Th>
              <Th>Schema</Th>
              <Th>Table</Th>
              <Th>Column</Th>
              <Th>Masking Type</Th>
              <Th>Status</Th>
              <Th>Roles Whitelist</Th>
              <Th>Created</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {policies.length === 0 ? (
              <TableRow>
                <Td colSpan={9} style={{ textAlign: 'center', padding: theme.spacing.lg }}>
                  No masking policies found. Create one to get started.
                </Td>
              </TableRow>
            ) : (
              policies.map((policy) => (
                <TableRow key={policy.policy_id}>
                  <Td>{policy.policy_name}</Td>
                  <Td>{policy.schema_name}</Td>
                  <Td>{policy.table_name}</Td>
                  <Td>{policy.column_name}</Td>
                  <Td>
                    <span style={{ color: getMaskingTypeColor(policy.masking_type) }}>
                      {policy.masking_type}
                    </span>
                  </Td>
                  <Td>
                    <span style={{ color: getStatusColor(policy.active ? 'ACTIVE' : 'INACTIVE') }}>
                      {policy.active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </Td>
                  <Td>
                    {policy.role_whitelist && policy.role_whitelist.length > 0
                      ? policy.role_whitelist.join(', ')
                      : '-'}
                  </Td>
                  <Td>{formatDate(policy.created_at || '')}</Td>
                  <Td>
                    <div style={{ display: 'flex', gap: theme.spacing.sm }}>
                      <AsciiButton
                        label="Edit"
                        onClick={() => handleEditPolicy(policy)}
                        variant="ghost"
                      />
                      {policy.policy_id && (
                        <AsciiButton
                          label="Delete"
                          onClick={() => handleDeletePolicy(policy.policy_id!)}
                          variant="ghost"
                        />
                      )}
                      <AsciiButton
                        label="Analyze"
                        onClick={() => handleAnalyzeColumns(policy.schema_name, policy.table_name)}
                        variant="ghost"
                      />
                    </div>
                  </Td>
                </TableRow>
              ))
            )}
          </tbody>
        </MaskingTable>

        {total > limit && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: theme.spacing.md,
            padding: theme.spacing.sm,
            fontFamily: "Consolas",
            fontSize: 11
          }}>
            <div>
              Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} policies
            </div>
            <div style={{ display: 'flex', gap: theme.spacing.sm }}>
              <AsciiButton
                label="Previous"
                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                variant="ghost"
                disabled={page === 1}
              />
              <AsciiButton
                label="Next"
                onClick={() => setPage(prev => prev + 1)}
                variant="ghost"
                disabled={page * limit >= total}
              />
            </div>
          </div>
        )}
      </AsciiPanel>

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
            fontFamily: "Consolas"
          }}
          onClick={() => setIsModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: asciiColors.background,
              border: `2px solid ${asciiColors.border}`,
              borderRadius: 4,
              padding: theme.spacing.lg,
              maxWidth: '600px',
              width: '90%',
              maxHeight: '90vh',
              overflow: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <AsciiPanel title={selectedPolicy.policy_id ? "EDIT POLICY" : "CREATE POLICY"}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
                <div>
                  <label style={{ color: asciiColors.muted, fontSize: 11, display: 'block', marginBottom: 4 }}>
                    Policy Name *
                  </label>
                  <input
                    type="text"
                    value={selectedPolicy.policy_name}
                    onChange={(e) => setSelectedPolicy(prev => prev ? { ...prev, policy_name: e.target.value } : null)}
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.spacing.sm }}>
                  <div>
                    <label style={{ color: asciiColors.muted, fontSize: 11, display: 'block', marginBottom: 4 }}>
                      Schema Name *
                    </label>
                    <input
                      type="text"
                      value={selectedPolicy.schema_name}
                      onChange={(e) => setSelectedPolicy(prev => prev ? { ...prev, schema_name: e.target.value } : null)}
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
                  <div>
                    <label style={{ color: asciiColors.muted, fontSize: 11, display: 'block', marginBottom: 4 }}>
                      Table Name *
                    </label>
                    <input
                      type="text"
                      value={selectedPolicy.table_name}
                      onChange={(e) => setSelectedPolicy(prev => prev ? { ...prev, table_name: e.target.value } : null)}
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

                <div>
                  <label style={{ color: asciiColors.muted, fontSize: 11, display: 'block', marginBottom: 4 }}>
                    Column Name *
                  </label>
                  <input
                    type="text"
                    value={selectedPolicy.column_name}
                    onChange={(e) => setSelectedPolicy(prev => prev ? { ...prev, column_name: e.target.value } : null)}
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

                <div>
                  <label style={{ color: asciiColors.muted, fontSize: 11, display: 'block', marginBottom: 4 }}>
                    Masking Type *
                  </label>
                  <select
                    value={selectedPolicy.masking_type}
                    onChange={(e) => setSelectedPolicy(prev => prev ? { ...prev, masking_type: e.target.value } : null)}
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
                    {maskingTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ color: asciiColors.muted, fontSize: 11, display: 'block', marginBottom: 4 }}>
                    Active
                  </label>
                  <input
                    type="checkbox"
                    checked={selectedPolicy.active}
                    onChange={(e) => setSelectedPolicy(prev => prev ? { ...prev, active: e.target.checked } : null)}
                    style={{
                      width: '20px',
                      height: '20px',
                      cursor: 'pointer'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
                  <AsciiButton
                    label="Save"
                    onClick={handleSavePolicy}
                    variant="primary"
                  />
                  <AsciiButton
                    label="Cancel"
                    onClick={() => {
                      setIsModalOpen(false);
                      setSelectedPolicy(null);
                    }}
                    variant="ghost"
                  />
                </div>
              </div>
            </AsciiPanel>
          </div>
        </div>
      )}

      {isBatchModalOpen && (
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
            fontFamily: "Consolas"
          }}
          onClick={() => {
            if (!batchProcessing) {
              setIsBatchModalOpen(false);
              setBatchResults(null);
            }
          }}
        >
          <div
            style={{
              backgroundColor: asciiColors.background,
              border: `2px solid ${asciiColors.border}`,
              borderRadius: 4,
              padding: theme.spacing.lg,
              maxWidth: '700px',
              width: '90%',
              maxHeight: '90vh',
              overflow: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <AsciiPanel title="BATCH ANALYZE & CREATE POLICIES">
              {!batchResults ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
                  <div>
                    <label style={{ color: asciiColors.muted, fontSize: 11, display: 'block', marginBottom: 4 }}>
                      Database Name *
                    </label>
                    {availableDatabases.length > 0 ? (
                      <select
                        value={batchConfig.database_name}
                        onChange={(e) => setBatchConfig(prev => ({ ...prev, database_name: e.target.value }))}
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
                        <option value="">Select database...</option>
                        {availableDatabases.map(db => (
                          <option key={db} value={db}>{db}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={batchConfig.database_name}
                        onChange={(e) => setBatchConfig(prev => ({ ...prev, database_name: e.target.value }))}
                        placeholder="DataLake, postgres, etc."
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
                    )}
                  </div>

                  <div>
                    <label style={{ color: asciiColors.muted, fontSize: 11, display: 'block', marginBottom: 4 }}>
                      Schema Name (leave empty for all schemas in database)
                    </label>
                    <input
                      type="text"
                      value={batchConfig.schema_name}
                      onChange={(e) => setBatchConfig(prev => ({ ...prev, schema_name: e.target.value }))}
                      placeholder="public (optional)"
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

                  <div>
                    <label style={{ color: asciiColors.muted, fontSize: 11, display: 'block', marginBottom: 4 }}>
                      Default Masking Type
                    </label>
                    <select
                      value={batchConfig.masking_type}
                      onChange={(e) => setBatchConfig(prev => ({ ...prev, masking_type: e.target.value }))}
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
                      {maskingTypes.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ color: asciiColors.muted, fontSize: 11, display: 'block', marginBottom: 4 }}>
                      Minimum Confidence Score (0.0 - 1.0)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="1"
                      step="0.05"
                      value={batchConfig.min_confidence}
                      onChange={(e) => setBatchConfig(prev => ({ ...prev, min_confidence: parseFloat(e.target.value) || 0.75 }))}
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

                  <div>
                    <label style={{ color: asciiColors.muted, fontSize: 11, display: 'block', marginBottom: 4 }}>
                      Auto Activate Policies
                    </label>
                    <input
                      type="checkbox"
                      checked={batchConfig.auto_activate}
                      onChange={(e) => setBatchConfig(prev => ({ ...prev, auto_activate: e.target.checked }))}
                      style={{
                        width: '20px',
                        height: '20px',
                        cursor: 'pointer'
                      }}
                    />
                  </div>

                  <div style={{ 
                    padding: theme.spacing.sm, 
                    background: asciiColors.backgroundSoft, 
                    borderRadius: 2,
                    fontSize: 11,
                    color: asciiColors.muted
                  }}>
                    <strong>Note:</strong> This will scan all tables in the specified database and schema (or all schemas if schema is empty), 
                    detect sensitive columns, and automatically create masking policies. Email and phone columns will use 
                    appropriate masking types automatically.
                  </div>

                  <div style={{ display: 'flex', gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
                    <AsciiButton
                      label={batchProcessing ? "Processing..." : "Start Batch Analysis"}
                      onClick={handleBatchAnalyze}
                      variant="primary"
                      disabled={batchProcessing || !batchConfig.database_name}
                    />
                    <AsciiButton
                      label="Cancel"
                      onClick={() => {
                        setIsBatchModalOpen(false);
                        setBatchResults(null);
                      }}
                      variant="ghost"
                      disabled={batchProcessing}
                    />
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
                  <div style={{
                    padding: theme.spacing.md,
                    background: asciiColors.backgroundSoft,
                    borderRadius: 2,
                    fontSize: 12
                  }}>
                    <div style={{ marginBottom: theme.spacing.sm }}>
                      <strong>Batch Analysis Complete!</strong>
                    </div>
                    <div>Total Analyzed: {batchResults.total_analyzed}</div>
                    <div style={{ color: asciiColors.success }}>Policies Created: {batchResults.policies_created}</div>
                    <div style={{ color: asciiColors.warning }}>Policies Skipped: {batchResults.policies_skipped}</div>
                  </div>

                  {batchResults.results && batchResults.results.length > 0 && (
                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                      <div style={{ fontSize: 11, color: asciiColors.muted, marginBottom: theme.spacing.sm }}>
                        Results:
                      </div>
                      {batchResults.results.slice(0, 20).map((result: any, idx: number) => (
                        <div key={idx} style={{
                          padding: theme.spacing.xs,
                          marginBottom: theme.spacing.xs,
                          background: result.policy_created ? asciiColors.backgroundSoft : asciiColors.background,
                          borderRadius: 2,
                          fontSize: 10,
                          borderLeft: `3px solid ${result.policy_created ? asciiColors.success : asciiColors.danger}`
                        }}>
                          {result.schema_name}.{result.table_name}.{result.column_name} - {result.pii_category} 
                          {result.policy_created ? ' ✓' : ` ✗ (${result.message})`}
                        </div>
                      ))}
                      {batchResults.results.length > 20 && (
                        <div style={{ fontSize: 10, color: asciiColors.muted, marginTop: theme.spacing.sm }}>
                          ... and {batchResults.results.length - 20} more
                        </div>
                      )}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
                    <AsciiButton
                      label="Close"
                      onClick={() => {
                        setIsBatchModalOpen(false);
                        setBatchResults(null);
                        fetchPolicies();
                        fetchMaskingStatus();
                      }}
                      variant="primary"
                    />
                  </div>
                </div>
              )}
            </AsciiPanel>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataMasking;
