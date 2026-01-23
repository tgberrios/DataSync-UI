import { useState, useEffect, useCallback, useRef } from 'react';
import styled from 'styled-components';
import { dataMaskingApi } from '../../services/api';
import { Container, LoadingOverlay, ErrorMessage } from '../shared/BaseComponents';
import SkeletonLoader from '../shared/SkeletonLoader';
import { extractApiError } from '../../utils/errorHandler';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { theme } from '../../theme/theme';

const MaskingTable = styled.table`
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
`;

const TableRow = styled.tr`
  transition: background-color 0.15s ease;
`;

const getMaskingTypeColor = (type: string) => {
  switch (type) {
    case 'FULL': return asciiColors.foreground;
    case 'PARTIAL': return asciiColors.muted;
    case 'EMAIL': return asciiColors.accent;
    case 'PHONE': return asciiColors.accent;
    case 'HASH': return asciiColors.muted;
    case 'TOKENIZE': return asciiColors.accent;
    default: return asciiColors.muted;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'ACTIVE': return asciiColors.accent;
    case 'INACTIVE': return asciiColors.muted;
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
    database_names: [] as string[],
    schema_name: '',
    masking_type: 'FULL',
    auto_activate: true,
    min_confidence: 0.75,
  });
  const [availableDatabases, setAvailableDatabases] = useState<string[]>([]);
  const [deactivatingAll, setDeactivatingAll] = useState(false);
  const [activeTab, setActiveTab] = useState<'policies' | 'sensitive' | 'unprotected'>('policies');
  const [sensitiveColumnsList, setSensitiveColumnsList] = useState<any[]>([]);
  const [unprotectedColumnsList, setUnprotectedColumnsList] = useState<any[]>([]);
  const [loadingSensitiveColumns, setLoadingSensitiveColumns] = useState(false);
  const [loadingUnprotectedColumns, setLoadingUnprotectedColumns] = useState(false);
  const fetchingSensitiveRef = useRef(false);
  const fetchingUnprotectedRef = useRef(false);
  const lastSensitiveTabRef = useRef<string | null>(null);
  const lastUnprotectedTabRef = useRef<string | null>(null);
  const [showMaskingPlaybook, setShowMaskingPlaybook] = useState(false);

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
    
    const startTime = Date.now();
    const minLoadingTime = 300;
    
    try {
      setLoading(true);
      setError(null);
      const params: any = { page, limit };
      if (filters.schema_name) params.schema_name = filters.schema_name;
      if (filters.table_name) params.table_name = filters.table_name;
      if (filters.masking_type) params.masking_type = filters.masking_type;
      if (filters.active !== '') params.active = filters.active === 'true';

      const response = await dataMaskingApi.getAll(params);
      
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
      const params: any = {
        schema_name: batchConfig.schema_name,
        masking_type: batchConfig.masking_type,
        auto_activate: batchConfig.auto_activate,
        min_confidence: batchConfig.min_confidence,
      };
      
      // Use database_names if multiple selected, otherwise use database_name
      if (batchConfig.database_names && batchConfig.database_names.length > 0) {
        params.database_names = batchConfig.database_names;
      } else if (batchConfig.database_name) {
        params.database_name = batchConfig.database_name;
      }
      
      const response = await dataMaskingApi.batchAnalyze(params);
      setBatchResults(response);
      await fetchPolicies();
      await fetchMaskingStatus();
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setBatchProcessing(false);
    }
  }, [batchConfig, fetchPolicies, fetchMaskingStatus]);

  const handleDeactivateAll = useCallback(async () => {
    if (!confirm('Are you sure you want to deactivate ALL masking policies? This will disable masking for all columns.')) {
      return;
    }

    try {
      setDeactivatingAll(true);
      setError(null);
      const response = await dataMaskingApi.deactivateAll();
      alert(`Successfully deactivated ${response.deactivated_count} masking policies.`);
      await fetchPolicies();
      await fetchMaskingStatus();
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setDeactivatingAll(false);
    }
  }, [fetchPolicies, fetchMaskingStatus]);

  useEffect(() => {
    if (activeTab === 'sensitive' && lastSensitiveTabRef.current !== 'sensitive' && !loadingSensitiveColumns && !fetchingSensitiveRef.current) {
      lastSensitiveTabRef.current = 'sensitive';
      fetchingSensitiveRef.current = true;
      const fetchSensitive = async () => {
        try {
          setLoadingSensitiveColumns(true);
          setError(null);
          const response = await dataMaskingApi.getSensitiveColumns();
          setSensitiveColumnsList(response.columns || []);
        } catch (err) {
          setError(extractApiError(err));
          // Set a placeholder to prevent infinite loop
          setSensitiveColumnsList([{ _error: true }]);
        } finally {
          setLoadingSensitiveColumns(false);
          fetchingSensitiveRef.current = false;
        }
      };
      fetchSensitive();
    } else if (activeTab !== 'sensitive') {
      lastSensitiveTabRef.current = null;
    }
  }, [activeTab]); // Only depend on activeTab

  useEffect(() => {
    if (activeTab === 'unprotected' && lastUnprotectedTabRef.current !== 'unprotected' && !loadingUnprotectedColumns && !fetchingUnprotectedRef.current) {
      lastUnprotectedTabRef.current = 'unprotected';
      fetchingUnprotectedRef.current = true;
      const fetchUnprotected = async () => {
        try {
          setLoadingUnprotectedColumns(true);
          setError(null);
          const response = await dataMaskingApi.getUnprotectedColumns();
          setUnprotectedColumnsList(response.columns || []);
        } catch (err) {
          setError(extractApiError(err));
          // Set a placeholder to prevent infinite loop
          setUnprotectedColumnsList([{ _error: true }]);
        } finally {
          setLoadingUnprotectedColumns(false);
          fetchingUnprotectedRef.current = false;
        }
      };
      fetchUnprotected();
    } else if (activeTab !== 'unprotected') {
      lastUnprotectedTabRef.current = null;
    }
  }, [activeTab]); // Only depend on activeTab

  useEffect(() => {
    fetchMaskingStatus();
    fetchAvailableDatabases();
    
    const fetchInitialData = async () => {
      if (!fetchingSensitiveRef.current) {
        fetchingSensitiveRef.current = true;
        try {
          setLoadingSensitiveColumns(true);
          const sensitiveResponse = await dataMaskingApi.getSensitiveColumns();
          setSensitiveColumnsList(sensitiveResponse.columns || []);
        } catch (err) {
          setError(extractApiError(err));
          setSensitiveColumnsList([{ _error: true }]);
        } finally {
          setLoadingSensitiveColumns(false);
          fetchingSensitiveRef.current = false;
        }
      }
      
      if (!fetchingUnprotectedRef.current) {
        fetchingUnprotectedRef.current = true;
        try {
          setLoadingUnprotectedColumns(true);
          const unprotectedResponse = await dataMaskingApi.getUnprotectedColumns();
          setUnprotectedColumnsList(unprotectedResponse.columns || []);
        } catch (err) {
          setError(extractApiError(err));
          setUnprotectedColumnsList([{ _error: true }]);
        } finally {
          setLoadingUnprotectedColumns(false);
          fetchingUnprotectedRef.current = false;
        }
      }
    };
    
    fetchInitialData();
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
          DATA MASKING
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

      {maskingStatus && maskingStatus.overall_summary && (
        <AsciiPanel title="MASKING STATUS OVERVIEW">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            gap: theme.spacing.md,
            padding: theme.spacing.md,
            fontFamily: 'Consolas',
            fontSize: 11
          }}>
            <div style={{
              padding: theme.spacing.lg,
              minHeight: '100px',
              background: asciiColors.backgroundSoft,
              border: `1px solid ${asciiColors.border}`,
              borderLeft: `2px solid ${asciiColors.accent}`,
              borderRadius: 2,
              transition: 'background-color 0.15s ease',
              position: 'relative',
              fontFamily: 'Consolas',
              fontSize: 12
            }}>
              <div style={{
                fontSize: 11,
                color: asciiColors.muted,
                marginBottom: theme.spacing.sm,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontFamily: 'Consolas',
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.xs
              }}>
                Total Tables
              </div>
              <div style={{
                fontSize: 18,
                fontWeight: 700,
                color: asciiColors.accent,
                fontFamily: 'Consolas'
              }}>
                {maskingStatus.overall_summary.total_tables}
              </div>
            </div>
            <div style={{
              padding: theme.spacing.lg,
              minHeight: '100px',
              background: asciiColors.backgroundSoft,
              border: `1px solid ${asciiColors.border}`,
              borderLeft: `2px solid ${asciiColors.muted}`,
              borderRadius: 2,
              transition: 'background-color 0.15s ease',
              position: 'relative',
              fontFamily: 'Consolas',
              fontSize: 12
            }}>
              <div style={{
                fontSize: 11,
                color: asciiColors.muted,
                marginBottom: theme.spacing.sm,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontFamily: 'Consolas',
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.xs
              }}>
                Sensitive Columns
              </div>
              <div style={{
                fontSize: 18,
                fontWeight: 700,
                color: asciiColors.muted,
                fontFamily: 'Consolas'
              }}>
                {(() => {
                  const realCount = sensitiveColumnsList.filter(item => !item._error).length;
                  return realCount || maskingStatus.overall_summary.sensitive_columns;
                })()}
              </div>
            </div>
            <div style={{
              padding: theme.spacing.lg,
              minHeight: '100px',
              background: asciiColors.backgroundSoft,
              border: `1px solid ${asciiColors.border}`,
              borderLeft: `2px solid ${asciiColors.accent}`,
              borderRadius: 2,
              transition: 'background-color 0.15s ease',
              position: 'relative',
              fontFamily: 'Consolas',
              fontSize: 12
            }}>
              <div style={{
                fontSize: 11,
                color: asciiColors.muted,
                marginBottom: theme.spacing.sm,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontFamily: 'Consolas',
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.xs
              }}>
                Protected
              </div>
              <div style={{
                fontSize: 18,
                fontWeight: 700,
                color: asciiColors.accent,
                fontFamily: 'Consolas'
              }}>
                {(() => {
                  const realSensitive = sensitiveColumnsList.filter(item => !item._error).length;
                  const realUnprotected = unprotectedColumnsList.filter(item => !item._error).length;
                  return realSensitive > 0 ? realSensitive - realUnprotected : maskingStatus.overall_summary.columns_with_policies;
                })()}
              </div>
            </div>
            <div style={{
              padding: theme.spacing.lg,
              minHeight: '100px',
              background: asciiColors.backgroundSoft,
              border: `1px solid ${asciiColors.border}`,
              borderLeft: `2px solid ${asciiColors.foreground}`,
              borderRadius: 2,
              transition: 'background-color 0.15s ease',
              position: 'relative',
              fontFamily: 'Consolas',
              fontSize: 12
            }}>
              <div style={{
                fontSize: 11,
                color: asciiColors.muted,
                marginBottom: theme.spacing.sm,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontFamily: 'Consolas',
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.xs
              }}>
                Unprotected
              </div>
              <div style={{
                fontSize: 18,
                fontWeight: 700,
                color: asciiColors.foreground,
                fontFamily: 'Consolas'
              }}>
                {unprotectedColumnsList.filter(item => !item._error).length}
              </div>
            </div>
            <div style={{
              padding: theme.spacing.lg,
              minHeight: '100px',
              background: asciiColors.backgroundSoft,
              border: `1px solid ${asciiColors.border}`,
              borderLeft: `2px solid ${(() => {
                const realSensitive = sensitiveColumnsList.filter(item => !item._error).length;
                const realUnprotected = unprotectedColumnsList.filter(item => !item._error).length;
                const realCoverage = realSensitive > 0 ? (realSensitive - realUnprotected) / realSensitive * 100 : maskingStatus.overall_summary.coverage_percentage;
                return realCoverage >= 90 ? asciiColors.accent : realCoverage >= 70 ? asciiColors.muted : asciiColors.foreground;
              })()}`,
              borderRadius: 2,
              transition: 'background-color 0.15s ease',
              position: 'relative',
              fontFamily: 'Consolas',
              fontSize: 12
            }}>
              <div style={{
                fontSize: 11,
                color: asciiColors.muted,
                marginBottom: theme.spacing.sm,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontFamily: 'Consolas',
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.xs
              }}>
                Coverage
              </div>
              <div style={{
                fontSize: 18,
                fontWeight: 700,
                color: (() => {
                  const realSensitive = sensitiveColumnsList.filter(item => !item._error).length;
                  const realUnprotected = unprotectedColumnsList.filter(item => !item._error).length;
                  const realCoverage = realSensitive > 0 ? (realSensitive - realUnprotected) / realSensitive * 100 : maskingStatus.overall_summary.coverage_percentage;
                  return realCoverage >= 90 ? asciiColors.accent : realCoverage >= 70 ? asciiColors.muted : asciiColors.foreground;
                })(),
                fontFamily: 'Consolas'
              }}>
                {(() => {
                  const realSensitive = sensitiveColumnsList.filter(item => !item._error).length;
                  const realUnprotected = unprotectedColumnsList.filter(item => !item._error).length;
                  const realCoverage = realSensitive > 0 ? (realSensitive - realUnprotected) / realSensitive * 100 : maskingStatus.overall_summary.coverage_percentage;
                  return realCoverage.toFixed(1);
                })()}%
              </div>
            </div>
            <div style={{
              padding: theme.spacing.lg,
              minHeight: '100px',
              background: asciiColors.backgroundSoft,
              border: `1px solid ${asciiColors.border}`,
              borderLeft: `2px solid ${(() => {
                const realSensitive = sensitiveColumnsList.filter(item => !item._error).length;
                const realUnprotected = unprotectedColumnsList.filter(item => !item._error).length;
                const realCoverage = realSensitive > 0 ? (realSensitive - realUnprotected) / realSensitive * 100 : maskingStatus.overall_summary.coverage_percentage;
                const realStatus = realCoverage >= 90 ? 'EXCELLENT' : realCoverage >= 70 ? 'GOOD' : realCoverage >= 50 ? 'FAIR' : realCoverage > 0 ? 'POOR' : 'NONE';
                return realStatus === 'EXCELLENT' ? asciiColors.accent : realStatus === 'GOOD' ? asciiColors.muted : realStatus === 'FAIR' ? asciiColors.muted : asciiColors.foreground;
              })()}`,
              borderRadius: 2,
              transition: 'background-color 0.15s ease',
              position: 'relative',
              fontFamily: 'Consolas',
              fontSize: 12
            }}>
              <div style={{
                fontSize: 11,
                color: asciiColors.muted,
                marginBottom: theme.spacing.sm,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontFamily: 'Consolas',
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.xs
              }}>
                Status
              </div>
              <div style={{
                fontSize: 18,
                fontWeight: 700,
                color: (() => {
                  const realSensitive = sensitiveColumnsList.filter(item => !item._error).length;
                  const realUnprotected = unprotectedColumnsList.filter(item => !item._error).length;
                  const realCoverage = realSensitive > 0 ? (realSensitive - realUnprotected) / realSensitive * 100 : maskingStatus.overall_summary.coverage_percentage;
                  const realStatus = realCoverage >= 90 ? 'EXCELLENT' : realCoverage >= 70 ? 'GOOD' : realCoverage >= 50 ? 'FAIR' : realCoverage > 0 ? 'POOR' : 'NONE';
                  return realStatus === 'EXCELLENT' ? asciiColors.accent : realStatus === 'GOOD' ? asciiColors.muted : realStatus === 'FAIR' ? asciiColors.muted : asciiColors.foreground;
                })(),
                fontFamily: 'Consolas'
              }}>
                {(() => {
                  const realSensitive = sensitiveColumnsList.filter(item => !item._error).length;
                  const realUnprotected = unprotectedColumnsList.filter(item => !item._error).length;
                  const realCoverage = realSensitive > 0 ? (realSensitive - realUnprotected) / realSensitive * 100 : maskingStatus.overall_summary.coverage_percentage;
                  return realCoverage >= 90 ? 'EXCELLENT' : realCoverage >= 70 ? 'GOOD' : realCoverage >= 50 ? 'FAIR' : realCoverage > 0 ? 'POOR' : 'NONE';
                })()}
              </div>
            </div>
          </div>
          <div style={{ marginTop: theme.spacing.md, padding: theme.spacing.sm, borderTop: `1px solid ${asciiColors.border}`, display: 'flex', gap: theme.spacing.sm, justifyContent: 'flex-end' }}>
            <AsciiButton
              label="Masking Info"
              onClick={() => setShowMaskingPlaybook(true)}
              variant="ghost"
            />
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
          <AsciiButton 
            label={`${ascii.blockFull} Deactivate All Masking`}
            onClick={handleDeactivateAll}
            variant="ghost"
            disabled={deactivatingAll}
          />
        </div>
        <div style={{ display: 'flex', gap: theme.spacing.sm }}>
          <input
            type="text"
            placeholder="Schema..."
            value={filters.schema_name}
            onChange={(e) => setFilters(prev => ({ ...prev, schema_name: e.target.value }))}
            style={{
              padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2,
              background: asciiColors.background,
              color: asciiColors.foreground,
              fontFamily: 'Consolas',
              fontSize: 11,
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
            placeholder="Table..."
            value={filters.table_name}
            onChange={(e) => setFilters(prev => ({ ...prev, table_name: e.target.value }))}
            style={{
              padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2,
              background: asciiColors.background,
              color: asciiColors.foreground,
              fontFamily: 'Consolas',
              fontSize: 11,
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
            value={filters.masking_type}
            onChange={(e) => setFilters(prev => ({ ...prev, masking_type: e.target.value }))}
            style={{
              padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2,
              background: asciiColors.background,
              color: asciiColors.foreground,
              fontFamily: 'Consolas',
              fontSize: 11,
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
            <option value="">All Types</option>
            {maskingTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
          <select
            value={filters.active}
            onChange={(e) => setFilters(prev => ({ ...prev, active: e.target.value }))}
            style={{
              padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2,
              background: asciiColors.background,
              color: asciiColors.foreground,
              fontFamily: 'Consolas',
              fontSize: 11,
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
      </div>

      <div style={{
        display: 'flex',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.md,
        borderBottom: `2px solid ${asciiColors.border}`
      }}>
        <button
          onClick={() => setActiveTab('policies')}
          style={{
            padding: `${theme.spacing.sm} ${theme.spacing.md}`,
            border: 'none',
            borderBottom: activeTab === 'policies' ? `3px solid ${asciiColors.accent}` : '3px solid transparent',
            background: 'transparent',
            color: activeTab === 'policies' ? asciiColors.accent : asciiColors.muted,
            fontFamily: 'Consolas',
            fontSize: 12,
            fontWeight: activeTab === 'policies' ? 600 : 'normal',
            cursor: 'pointer',
            transition: 'border-color 0.15s ease, color 0.15s ease'
          }}
        >
          Masking Policies ({policies.length})
        </button>
        <button
          onClick={() => setActiveTab('sensitive')}
          style={{
            padding: `${theme.spacing.sm} ${theme.spacing.md}`,
            border: 'none',
            borderBottom: activeTab === 'sensitive' ? `3px solid ${asciiColors.accent}` : '3px solid transparent',
            background: 'transparent',
            color: activeTab === 'sensitive' ? asciiColors.accent : asciiColors.muted,
            fontFamily: 'Consolas',
            fontSize: 12,
            fontWeight: activeTab === 'sensitive' ? 600 : 'normal',
            cursor: 'pointer',
            transition: 'border-color 0.15s ease, color 0.15s ease'
          }}
        >
          Sensitive Columns ({sensitiveColumnsList.filter(item => !item._error).length})
        </button>
        <button
          onClick={() => setActiveTab('unprotected')}
          style={{
            padding: `${theme.spacing.sm} ${theme.spacing.md}`,
            border: 'none',
            borderBottom: activeTab === 'unprotected' ? `3px solid ${asciiColors.foreground}` : '3px solid transparent',
            background: 'transparent',
            color: activeTab === 'unprotected' ? asciiColors.foreground : asciiColors.muted,
            fontFamily: 'Consolas',
            fontSize: 12,
            fontWeight: activeTab === 'unprotected' ? 600 : 'normal',
            cursor: 'pointer',
            transition: 'border-color 0.15s ease, color 0.15s ease'
          }}
        >
          Unprotected ({unprotectedColumnsList.filter(item => !item._error).length})
        </button>
      </div>

      {activeTab === 'policies' && (
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
                  <Td style={{ fontFamily: 'Consolas' }}>{policy.policy_name}</Td>
                  <Td style={{ fontFamily: 'Consolas' }}>{policy.schema_name}</Td>
                  <Td style={{ fontFamily: 'Consolas' }}>{policy.table_name}</Td>
                  <Td style={{ fontFamily: 'Consolas' }}>{policy.column_name}</Td>
                  <Td>
                    <span style={{ color: getMaskingTypeColor(policy.masking_type), fontFamily: 'Consolas' }}>
                      {policy.masking_type}
                    </span>
                  </Td>
                  <Td>
                    <span style={{ color: getStatusColor(policy.active ? 'ACTIVE' : 'INACTIVE'), fontFamily: 'Consolas' }}>
                      {policy.active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </Td>
                  <Td style={{ fontFamily: 'Consolas' }}>
                    {policy.role_whitelist && policy.role_whitelist.length > 0
                      ? policy.role_whitelist.join(', ')
                      : '-'}
                  </Td>
                  <Td style={{ fontFamily: 'Consolas' }}>{formatDate(policy.created_at || '')}</Td>
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
            <div style={{ fontFamily: 'Consolas' }}>
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
      )}

      {activeTab === 'sensitive' && (
        <AsciiPanel title={`SENSITIVE COLUMNS (${sensitiveColumnsList.length})`}>
          {loadingSensitiveColumns ? (
            <div style={{ textAlign: 'center', padding: theme.spacing.lg, color: asciiColors.muted }}>
              Loading...
            </div>
          ) : sensitiveColumnsList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: theme.spacing.lg, color: asciiColors.muted }}>
              No sensitive columns found
            </div>
          ) : (
            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
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
              <MaskingTable>
                <thead>
                  <tr>
                    <Th>Schema</Th>
                    <Th>Table</Th>
                    <Th>Column</Th>
                    <Th>Data Type</Th>
                    <Th>PII Category</Th>
                    <Th>Confidence</Th>
                  </tr>
                </thead>
                <tbody>
                  {sensitiveColumnsList.filter(c => !c._error).map((col, idx) => (
                    <TableRow key={idx}>
                      <Td style={{ fontFamily: 'Consolas' }}>{col.schema_name}</Td>
                      <Td style={{ fontFamily: 'Consolas' }}>{col.table_name}</Td>
                      <Td style={{ fontFamily: 'Consolas' }}>{col.column_name}</Td>
                      <Td style={{ fontFamily: 'Consolas' }}>{col.data_type}</Td>
                      <Td>
                        <span style={{ color: getMaskingTypeColor(col.pii_category), fontFamily: 'Consolas' }}>
                          {col.pii_category}
                        </span>
                      </Td>
                      <Td style={{ fontFamily: 'Consolas' }}>{(col.confidence_score * 100).toFixed(0)}%</Td>
                    </TableRow>
                  ))}
                </tbody>
              </MaskingTable>
            </div>
          )}
        </AsciiPanel>
      )}

      {activeTab === 'unprotected' && (
        <AsciiPanel title={`UNPROTECTED COLUMNS (${unprotectedColumnsList.filter(c => !c._error).length})`}>
          {loadingUnprotectedColumns ? (
            <div style={{ textAlign: 'center', padding: theme.spacing.lg, color: asciiColors.muted }}>
              Loading...
            </div>
          ) : unprotectedColumnsList.length === 0 || (unprotectedColumnsList.length === 1 && unprotectedColumnsList[0]._error) ? (
            <div style={{ textAlign: 'center', padding: theme.spacing.lg, color: error ? asciiColors.foreground : asciiColors.accent, fontFamily: 'Consolas' }}>
              {error ? `Error: ${error}` : 'All sensitive columns are protected! 🎉'}
            </div>
          ) : (
            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
              <MaskingTable>
                <thead>
                  <tr>
                    <Th>Schema</Th>
                    <Th>Table</Th>
                    <Th>Column</Th>
                    <Th>Data Type</Th>
                    <Th>PII Category</Th>
                    <Th>Confidence</Th>
                    <Th>Action</Th>
                  </tr>
                </thead>
                <tbody>
                  {unprotectedColumnsList.filter(c => !c._error).map((col, idx) => (
                    <TableRow key={idx}>
                      <Td style={{ fontFamily: 'Consolas' }}>{col.schema_name}</Td>
                      <Td style={{ fontFamily: 'Consolas' }}>{col.table_name}</Td>
                      <Td style={{ fontFamily: 'Consolas' }}>{col.column_name}</Td>
                      <Td style={{ fontFamily: 'Consolas' }}>{col.data_type}</Td>
                      <Td>
                        <span style={{ color: getMaskingTypeColor(col.pii_category), fontFamily: 'Consolas' }}>
                          {col.pii_category}
                        </span>
                      </Td>
                      <Td style={{ fontFamily: 'Consolas' }}>{(col.confidence_score * 100).toFixed(0)}%</Td>
                      <Td>
                        <AsciiButton
                          label="Create Policy"
                          onClick={() => {
                            setSelectedPolicy({
                              policy_name: `${col.schema_name}_${col.table_name}_${col.column_name}_mask`,
                              schema_name: col.schema_name,
                              table_name: col.table_name,
                              column_name: col.column_name,
                              masking_type: col.pii_category === 'EMAIL' ? 'EMAIL' : col.pii_category === 'PHONE' ? 'PHONE' : 'FULL',
                              active: true,
                            });
                            setActiveTab('policies');
                            setIsModalOpen(true);
                          }}
                          variant="ghost"
                        />
                      </Td>
                    </TableRow>
                  ))}
                </tbody>
              </MaskingTable>
            </div>
          )}
        </AsciiPanel>
      )}

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
              borderRadius: 2,
              padding: theme.spacing.lg,
              maxWidth: '600px',
              width: '90%',
              maxHeight: '90vh',
              overflowY: 'auto'
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
            <AsciiPanel title={selectedPolicy.policy_id ? "EDIT POLICY" : "CREATE POLICY"}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md, padding: theme.spacing.md, fontFamily: 'Consolas', fontSize: 12 }}>
                <div>
                  <label style={{ color: asciiColors.muted, fontSize: 11, display: 'block', marginBottom: theme.spacing.xs, fontFamily: 'Consolas' }}>
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
                      borderRadius: 2,
                      background: asciiColors.background,
                      color: asciiColors.foreground,
                      fontFamily: 'Consolas',
                      fontSize: 12,
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.spacing.sm }}>
                  <div>
                    <label style={{ color: asciiColors.muted, fontSize: 11, display: 'block', marginBottom: theme.spacing.xs, fontFamily: 'Consolas' }}>
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
                        borderRadius: 2,
                        background: asciiColors.background,
                        color: asciiColors.foreground,
                        fontFamily: 'Consolas',
                        fontSize: 12,
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
                  <div>
                    <label style={{ color: asciiColors.muted, fontSize: 11, display: 'block', marginBottom: theme.spacing.xs, fontFamily: 'Consolas' }}>
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
                        borderRadius: 2,
                        background: asciiColors.background,
                        color: asciiColors.foreground,
                        fontFamily: 'Consolas',
                        fontSize: 12,
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
                </div>

                <div>
                  <label style={{ color: asciiColors.muted, fontSize: 11, display: 'block', marginBottom: theme.spacing.xs, fontFamily: 'Consolas' }}>
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
                      borderRadius: 2,
                      background: asciiColors.background,
                      color: asciiColors.foreground,
                      fontFamily: 'Consolas',
                      fontSize: 12,
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

                <div>
                  <label style={{ color: asciiColors.muted, fontSize: 11, display: 'block', marginBottom: theme.spacing.xs, fontFamily: 'Consolas' }}>
                    Masking Type *
                  </label>
                  <select
                    value={selectedPolicy.masking_type}
                    onChange={(e) => setSelectedPolicy(prev => prev ? { ...prev, masking_type: e.target.value } : null)}
                    style={{
                      width: '100%',
                      padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                      border: `1px solid ${asciiColors.border}`,
                      borderRadius: 2,
                      background: asciiColors.background,
                      color: asciiColors.foreground,
                      fontFamily: 'Consolas',
                      fontSize: 12,
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
                    {maskingTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ color: asciiColors.muted, fontSize: 11, display: 'block', marginBottom: theme.spacing.xs, fontFamily: 'Consolas' }}>
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
              borderRadius: 2,
              padding: theme.spacing.lg,
              maxWidth: '700px',
              width: '90%',
              maxHeight: '90vh',
              overflowY: 'auto'
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
            <AsciiPanel title="BATCH ANALYZE & CREATE POLICIES">
              {!batchResults ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
                  <div>
                    <label style={{ color: asciiColors.muted, fontSize: 11, display: 'block', marginBottom: 4 }}>
                      Select Databases * (Multiple selection allowed)
                    </label>
                    {availableDatabases.length > 0 ? (
                      <div>
                        <div style={{
                          padding: theme.spacing.xs,
                          marginBottom: theme.spacing.sm,
                          background: asciiColors.backgroundSoft,
                          borderRadius: 2,
                          fontSize: 10,
                          color: asciiColors.muted,
                          fontFamily: 'Consolas',
                          border: `1px solid ${asciiColors.border}`
                        }}>
                          <strong>⚠️ Warning:</strong> Avoid selecting system databases like 'postgres' unless you have application data there. System databases typically don't need masking.
                        </div>
                        <div style={{
                          maxHeight: '200px',
                          overflowY: 'auto',
                          border: `1px solid ${asciiColors.border}`,
                          borderRadius: 2,
                          padding: theme.spacing.sm,
                          background: asciiColors.background,
                        }}>
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
                          {availableDatabases.map(db => {
                            const isSystemDb = db === 'postgres' || db === 'template0' || db === 'template1';
                            return (
                              <div key={db} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: theme.spacing.xs,
                                padding: theme.spacing.xs,
                                marginBottom: theme.spacing.xs,
                                opacity: isSystemDb ? 0.7 : 1,
                              }}>
                                <input
                                  type="checkbox"
                                  checked={batchConfig.database_names.includes(db)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setBatchConfig(prev => ({
                                        ...prev,
                                        database_names: [...prev.database_names, db],
                                        database_name: '' // Clear single selection
                                      }));
                                    } else {
                                      setBatchConfig(prev => ({
                                        ...prev,
                                        database_names: prev.database_names.filter(d => d !== db)
                                      }));
                                    }
                                  }}
                                  style={{
                                    width: '18px',
                                    height: '18px',
                                    cursor: 'pointer'
                                  }}
                                />
                                <label style={{
                                  color: isSystemDb ? asciiColors.muted : asciiColors.foreground,
                                  fontSize: 12,
                                  fontFamily: 'Consolas',
                                  cursor: 'pointer',
                                  flex: 1
                                }}>
                                  {db} {isSystemDb && '(System DB)'}
                                </label>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={batchConfig.database_name}
                        onChange={(e) => setBatchConfig(prev => ({ ...prev, database_name: e.target.value, database_names: [] }))}
                        placeholder="DataLake, postgres, etc. (single database)"
                        style={{
                          width: '100%',
                          padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                          border: `1px solid ${asciiColors.border}`,
                          borderRadius: 2,
                          background: asciiColors.background,
                          color: asciiColors.foreground,
                          fontFamily: 'Consolas',
                          fontSize: 12,
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
                    )}
                    {batchConfig.database_names.length > 0 && (
                      <div style={{
                        marginTop: theme.spacing.xs,
                        fontSize: 10,
                        color: asciiColors.muted,
                        fontFamily: 'Consolas'
                      }}>
                        Selected: {batchConfig.database_names.join(', ')}
                      </div>
                    )}
                  </div>

                  <div>
                    <label style={{ color: asciiColors.muted, fontSize: 11, display: 'block', marginBottom: theme.spacing.xs, fontFamily: 'Consolas' }}>
                      Schema Name (leave empty for all schemas in database)
                    </label>
                    <input
                      type="text"
                      value={batchConfig.schema_name}
                      onChange={(e) => setBatchConfig(prev => ({ ...prev, schema_name: e.target.value }))}
                      placeholder="public (optional)"
                      style={{
                        width: '100%',
                        padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                        border: `1px solid ${asciiColors.border}`,
                        borderRadius: 2,
                        background: asciiColors.background,
                        color: asciiColors.foreground,
                        fontFamily: 'Consolas',
                        fontSize: 12,
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

                  <div>
                    <label style={{ color: asciiColors.muted, fontSize: 11, display: 'block', marginBottom: theme.spacing.xs, fontFamily: 'Consolas' }}>
                      Default Masking Type
                    </label>
                    <select
                      value={batchConfig.masking_type}
                      onChange={(e) => setBatchConfig(prev => ({ ...prev, masking_type: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                        border: `1px solid ${asciiColors.border}`,
                        borderRadius: 2,
                        background: asciiColors.background,
                        color: asciiColors.foreground,
                        fontFamily: 'Consolas',
                        fontSize: 12,
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
                      {maskingTypes.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ color: asciiColors.muted, fontSize: 11, display: 'block', marginBottom: theme.spacing.xs, fontFamily: 'Consolas' }}>
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
                        padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                        border: `1px solid ${asciiColors.border}`,
                        borderRadius: 2,
                        background: asciiColors.background,
                        color: asciiColors.foreground,
                        fontFamily: 'Consolas',
                        fontSize: 12,
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

                  <div>
                    <label style={{ color: asciiColors.muted, fontSize: 11, display: 'block', marginBottom: theme.spacing.xs, fontFamily: 'Consolas' }}>
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
                    color: asciiColors.muted,
                    fontFamily: 'Consolas'
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
                      disabled={batchProcessing || (batchConfig.database_names.length === 0 && !batchConfig.database_name)}
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
                    fontSize: 12,
                    fontFamily: 'Consolas'
                  }}>
                    <div style={{ marginBottom: theme.spacing.sm, fontFamily: 'Consolas' }}>
                      <strong>Batch Analysis Complete!</strong>
                    </div>
                    <div style={{ fontFamily: 'Consolas' }}>Total Analyzed: {batchResults.total_analyzed}</div>
                    <div style={{ color: asciiColors.accent, fontFamily: 'Consolas' }}>Policies Created: {batchResults.policies_created}</div>
                    <div style={{ color: asciiColors.muted, fontFamily: 'Consolas' }}>Policies Skipped: {batchResults.policies_skipped}</div>
                  </div>

                  {batchResults.results && batchResults.results.length > 0 && (
                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
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
                      <div style={{ fontSize: 11, color: asciiColors.muted, marginBottom: theme.spacing.sm, fontFamily: 'Consolas' }}>
                        Results:
                      </div>
                      {batchResults.results.slice(0, 20).map((result: any, idx: number) => (
                        <div key={idx} style={{
                          padding: theme.spacing.xs,
                          marginBottom: theme.spacing.xs,
                          background: result.policy_created ? asciiColors.backgroundSoft : asciiColors.background,
                          borderRadius: 2,
                          fontSize: 10,
                          fontFamily: 'Consolas',
                          borderLeft: `3px solid ${result.policy_created ? asciiColors.accent : asciiColors.foreground}`
                        }}>
                          {result.schema_name}.{result.table_name}.{result.column_name} - {result.pii_category} 
                          {result.policy_created ? ' ✓' : ` ✗ (${result.message})`}
                        </div>
                      ))}
                      {batchResults.results.length > 20 && (
                        <div style={{ fontSize: 10, color: asciiColors.muted, marginTop: theme.spacing.sm, fontFamily: 'Consolas' }}>
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

      {showMaskingPlaybook && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }}
        onClick={() => setShowMaskingPlaybook(false)}
        >
          <div style={{
            width: '90%',
            maxWidth: 1000,
            maxHeight: '90vh',
            overflowY: 'auto'
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
            <AsciiPanel title="DATA MASKING PLAYBOOK">
              <div style={{ padding: theme.spacing.md, fontFamily: 'Consolas', fontSize: 12, lineHeight: 1.6 }}>
                <div style={{ marginBottom: theme.spacing.lg }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: theme.spacing.sm, fontFamily: 'Consolas' }}>
                    {ascii.blockFull} OVERVIEW
                  </div>
                  <div style={{ color: asciiColors.foreground, marginLeft: theme.spacing.md, fontSize: 11, fontFamily: 'Consolas' }}>
                    Data Masking provides role-based column-level data protection at the database level. The system automatically redirects 
                    queries to masked views or original data based on user privileges, ensuring sensitive data is protected while maintaining 
                    seamless access for authorized users.
                  </div>
                </div>

                <div style={{ marginBottom: theme.spacing.lg }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: theme.spacing.sm, fontFamily: 'Consolas' }}>
                    {ascii.blockFull} FLOW: USER CONNECTION → ROLE MAPPING
                  </div>
                  
                  <div style={{ marginLeft: theme.spacing.md }}>
                    <div style={{ marginBottom: theme.spacing.md }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.accent, marginBottom: theme.spacing.xs, fontFamily: 'Consolas' }}>
                        {ascii.blockSemi} Step 1: PostgreSQL User Identification
                      </div>
                      <div style={{ color: asciiColors.foreground, marginLeft: theme.spacing.md, fontSize: 11, fontFamily: 'Consolas' }}>
                        When you connect to PostgreSQL as a user (e.g., <code style={{ background: asciiColors.backgroundSoft, padding: `${theme.spacing.xs} ${theme.spacing.xs}`, fontFamily: 'Consolas' }}>tomy.berrios</code>), 
                        PostgreSQL identifies the session user:
                      </div>
                      <pre style={{ 
                        marginLeft: theme.spacing.lg, 
                        marginTop: theme.spacing.sm, 
                        padding: theme.spacing.sm, 
                        background: asciiColors.backgroundSoft, 
                        border: `1px solid ${asciiColors.border}`,
                        borderRadius: 2,
                        fontSize: 11,
                        fontFamily: 'Consolas',
                        overflowX: 'auto'
                      }}>
{`-- PostgreSQL identifies your user
current_user = 'tomy.berrios'
session_user = 'tomy.berrios'`}
                      </pre>
                    </div>

                    <div style={{ marginBottom: theme.spacing.md }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.accent, marginBottom: theme.spacing.xs, fontFamily: 'Consolas' }}>
                        {ascii.blockSemi} Step 2: Role Mapping Function
                      </div>
                      <div style={{ color: asciiColors.foreground, marginLeft: theme.spacing.md, fontSize: 11, fontFamily: 'Consolas' }}>
                        The function <code style={{ background: asciiColors.backgroundSoft, padding: `${theme.spacing.xs} ${theme.spacing.xs}`, fontFamily: 'Consolas' }}>metadata.get_user_role_from_db()</code> maps PostgreSQL users to application roles:
                      </div>
                      <pre style={{ 
                        marginLeft: theme.spacing.lg, 
                        marginTop: theme.spacing.sm, 
                        padding: theme.spacing.sm, 
                        background: asciiColors.backgroundSoft, 
                        border: `1px solid ${asciiColors.border}`,
                        borderRadius: 2,
                        fontSize: 11,
                        fontFamily: 'Consolas',
                        overflowX: 'auto'
                      }}>
{`-- 1. Gets current PostgreSQL user
v_db_user := current_user;  -- 'tomy.berrios'

-- 2. Looks up in metadata.users
SELECT role FROM metadata.users 
WHERE username = 'tomy.berrios';
-- Result: 'admin'

-- 3. Returns the role
RETURN 'admin';`}
                      </pre>
                      <div style={{ color: asciiColors.foreground, marginLeft: theme.spacing.lg, marginTop: theme.spacing.sm, fontSize: 11, fontFamily: 'Consolas' }}>
                        <strong>Important:</strong> The mapping is <code style={{ background: asciiColors.backgroundSoft, padding: `${theme.spacing.xs} ${theme.spacing.xs}`, fontFamily: 'Consolas' }}>username</code> in <code style={{ background: asciiColors.backgroundSoft, padding: `${theme.spacing.xs} ${theme.spacing.xs}`, fontFamily: 'Consolas' }}>metadata.users</code> = <code style={{ background: asciiColors.backgroundSoft, padding: `${theme.spacing.xs} ${theme.spacing.xs}`, fontFamily: 'Consolas' }}>session_user</code> of PostgreSQL
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: theme.spacing.lg }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: theme.spacing.sm, fontFamily: 'Consolas' }}>
                    {ascii.blockFull} FLOW: POLICY VERIFICATION
                  </div>
                  
                  <div style={{ marginLeft: theme.spacing.md }}>
                    <div style={{ marginBottom: theme.spacing.md }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.accent, marginBottom: theme.spacing.xs, fontFamily: 'Consolas' }}>
                        {ascii.blockSemi} Step 3: Column Masking Decision
                      </div>
                      <div style={{ color: asciiColors.foreground, marginLeft: theme.spacing.md, fontSize: 11, fontFamily: 'Consolas' }}>
                        When querying a column, <code style={{ background: asciiColors.backgroundSoft, padding: `${theme.spacing.xs} ${theme.spacing.xs}`, fontFamily: 'Consolas' }}>metadata.should_mask_column()</code> verifies:
                      </div>
                      <div style={{ color: asciiColors.foreground, marginLeft: theme.spacing.lg, marginTop: theme.spacing.sm, fontSize: 11, fontFamily: 'Consolas' }}>
                        <div style={{ marginBottom: theme.spacing.xs }}>1. <strong>Is the user admin?</strong></div>
                        <div style={{ marginLeft: theme.spacing.md, color: asciiColors.accent }}>→ If YES: RETURN false (NO masking)</div>
                        <div style={{ marginLeft: theme.spacing.md, color: asciiColors.accent }}>→ If NO: continue</div>
                        <div style={{ marginBottom: theme.spacing.xs, marginTop: theme.spacing.sm }}>2. <strong>Does an active policy exist for this column?</strong></div>
                        <div style={{ marginLeft: theme.spacing.md, color: asciiColors.accent }}>→ If NO: RETURN false (NO masking)</div>
                        <div style={{ marginLeft: theme.spacing.md, color: asciiColors.accent }}>→ If YES: continue</div>
                        <div style={{ marginBottom: theme.spacing.xs, marginTop: theme.spacing.sm }}>3. <strong>Is the role in the whitelist?</strong></div>
                        <div style={{ marginLeft: theme.spacing.md, color: asciiColors.accent }}>→ If YES: RETURN false (NO masking)</div>
                        <div style={{ marginLeft: theme.spacing.md, color: asciiColors.accent }}>→ If NO: RETURN true (YES masking)</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: theme.spacing.lg }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: theme.spacing.sm, fontFamily: 'Consolas' }}>
                    {ascii.blockFull} FLOW: SMART VIEW - AUTOMATIC REDIRECTION
                  </div>
                  
                  <div style={{ marginLeft: theme.spacing.md }}>
                    <div style={{ marginBottom: theme.spacing.md }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.accent, marginBottom: theme.spacing.xs, fontFamily: 'Consolas' }}>
                        {ascii.blockSemi} Step 4: Smart View Creation
                      </div>
                      <div style={{ color: asciiColors.foreground, marginLeft: theme.spacing.md, fontSize: 11, fontFamily: 'Consolas' }}>
                        The view <code style={{ background: asciiColors.backgroundSoft, padding: `${theme.spacing.xs} ${theme.spacing.xs}`, fontFamily: 'Consolas' }}>saleslt_smart_customer</code> is created with dynamic masking:
                      </div>
                      <pre style={{ 
                        marginLeft: theme.spacing.lg, 
                        marginTop: theme.spacing.sm, 
                        padding: theme.spacing.sm, 
                        background: asciiColors.backgroundSoft, 
                        border: `1px solid ${asciiColors.border}`,
                        borderRadius: 2,
                        fontSize: 11,
                        fontFamily: 'Consolas',
                        overflowX: 'auto'
                      }}>
{`CREATE VIEW saleslt_smart_customer AS
SELECT 
  customerid,
  
  -- For emailaddress (has EMAIL policy)
  CASE 
    WHEN (SELECT role FROM metadata.users 
          WHERE username = session_user) = 'admin' 
    THEN emailaddress  -- Admin sees original
    ELSE metadata.mask_value(
      emailaddress::TEXT, 'EMAIL', '{}'::jsonb
    )  -- User sees masked
  END as emailaddress,
  
  -- For phone (has PHONE policy)
  CASE 
    WHEN (SELECT role FROM metadata.users 
          WHERE username = session_user) = 'admin' 
    THEN phone  -- Admin sees original
    ELSE metadata.mask_value(
      phone::TEXT, 'PHONE', '{}'::jsonb
    )  -- User sees masked
  END as phone
  
FROM saleslt.customer;`}
                      </pre>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: theme.spacing.lg }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: theme.spacing.sm, fontFamily: 'Consolas' }}>
                    {ascii.blockFull} FLOW: EXECUTION EXAMPLES
                  </div>
                  
                  <div style={{ marginLeft: theme.spacing.md }}>
                    <div style={{ marginBottom: theme.spacing.md }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.accent, marginBottom: theme.spacing.xs, fontFamily: 'Consolas' }}>
                        {ascii.blockSemi} Admin User Query
                      </div>
                      <div style={{ color: asciiColors.foreground, marginLeft: theme.spacing.md, fontSize: 11, fontFamily: 'Consolas' }}>
                        When <code style={{ background: asciiColors.backgroundSoft, padding: `${theme.spacing.xs} ${theme.spacing.xs}`, fontFamily: 'Consolas' }}>tomy.berrios</code> (admin) executes:
                      </div>
                      <pre style={{ 
                        marginLeft: theme.spacing.lg, 
                        marginTop: theme.spacing.sm, 
                        padding: theme.spacing.sm, 
                        background: asciiColors.backgroundSoft, 
                        border: `1px solid ${asciiColors.border}`,
                        borderRadius: 2,
                        fontSize: 11,
                        fontFamily: 'Consolas',
                        overflowX: 'auto'
                      }}>
{`SELECT emailaddress, phone 
FROM saleslt.saleslt_smart_customer;`}
                      </pre>
                      <div style={{ color: asciiColors.foreground, marginLeft: theme.spacing.lg, marginTop: theme.spacing.sm, fontSize: 11, fontFamily: 'Consolas' }}>
                        PostgreSQL evaluates CASE WHEN:
                        <div style={{ marginLeft: theme.spacing.md, marginTop: theme.spacing.xs }}>
                          • <code style={{ background: asciiColors.backgroundSoft, padding: `${theme.spacing.xs} ${theme.spacing.xs}`, fontFamily: 'Consolas' }}>session_user = 'tomy.berrios'</code>
                        </div>
                        <div style={{ marginLeft: theme.spacing.md }}>
                          • Query: <code style={{ background: asciiColors.backgroundSoft, padding: `${theme.spacing.xs} ${theme.spacing.xs}`, fontFamily: 'Consolas' }}>SELECT role FROM metadata.users WHERE username = 'tomy.berrios'</code>
                        </div>
                        <div style={{ marginLeft: theme.spacing.md }}>
                          • Result: <code style={{ background: asciiColors.backgroundSoft, padding: `${theme.spacing.xs} ${theme.spacing.xs}`, fontFamily: 'Consolas' }}>'admin'</code>
                        </div>
                        <div style={{ marginLeft: theme.spacing.md, color: asciiColors.accent, marginTop: theme.spacing.xs }}>
                          → Returns: <strong>original values</strong> (no masking)
                        </div>
                      </div>
                    </div>

                    <div style={{ marginBottom: theme.spacing.md }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.muted, marginBottom: theme.spacing.xs, fontFamily: 'Consolas' }}>
                        {ascii.blockSemi} Regular User Query
                      </div>
                      <div style={{ color: asciiColors.foreground, marginLeft: 16, fontSize: 11 }}>
                        When <code style={{ background: asciiColors.backgroundSoft, padding: '2px 4px' }}>testuser</code> (non-admin) executes the same query:
                      </div>
                      <div style={{ color: asciiColors.foreground, marginLeft: theme.spacing.lg, marginTop: theme.spacing.sm, fontSize: 11, fontFamily: 'Consolas' }}>
                        PostgreSQL evaluates CASE WHEN:
                        <div style={{ marginLeft: theme.spacing.md, marginTop: theme.spacing.xs }}>
                          • <code style={{ background: asciiColors.backgroundSoft, padding: `${theme.spacing.xs} ${theme.spacing.xs}`, fontFamily: 'Consolas' }}>session_user = 'testuser'</code>
                        </div>
                        <div style={{ marginLeft: theme.spacing.md }}>
                          • Query: <code style={{ background: asciiColors.backgroundSoft, padding: `${theme.spacing.xs} ${theme.spacing.xs}`, fontFamily: 'Consolas' }}>SELECT role FROM metadata.users WHERE username = 'testuser'</code>
                        </div>
                        <div style={{ marginLeft: theme.spacing.md }}>
                          • Result: <code style={{ background: asciiColors.backgroundSoft, padding: `${theme.spacing.xs} ${theme.spacing.xs}`, fontFamily: 'Consolas' }}>'user'</code>
                        </div>
                        <div style={{ marginLeft: theme.spacing.md }}>
                          • Condition: <code style={{ background: asciiColors.backgroundSoft, padding: `${theme.spacing.xs} ${theme.spacing.xs}`, fontFamily: 'Consolas' }}>'user' = 'admin'</code> → FALSE
                        </div>
                        <div style={{ marginLeft: theme.spacing.md, color: asciiColors.muted, marginTop: theme.spacing.xs }}>
                          → Executes: <code style={{ background: asciiColors.backgroundSoft, padding: `${theme.spacing.xs} ${theme.spacing.xs}`, fontFamily: 'Consolas' }}>metadata.mask_value(emailaddress, 'EMAIL', '{}')</code>
                        </div>
                        <div style={{ marginLeft: theme.spacing.md, color: asciiColors.muted }}>
                          → Returns: <strong>'orl***@adventure-works.com'</strong> (masked)
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: theme.spacing.lg }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: theme.spacing.sm, fontFamily: 'Consolas' }}>
                    {ascii.blockFull} REQUIREMENTS
                  </div>
                  
                  <div style={{ marginLeft: theme.spacing.md }}>
                    <div style={{ marginBottom: theme.spacing.sm }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.foreground, marginBottom: theme.spacing.xs, fontFamily: 'Consolas' }}>
                        1. PostgreSQL User Must Exist
                      </div>
                      <pre style={{ 
                        marginLeft: theme.spacing.md, 
                        marginTop: theme.spacing.xs, 
                        padding: theme.spacing.sm, 
                        background: asciiColors.backgroundSoft, 
                        border: `1px solid ${asciiColors.border}`,
                        borderRadius: 2,
                        fontSize: 11,
                        fontFamily: 'Consolas',
                        overflowX: 'auto'
                      }}>
{`CREATE USER tomy.berrios WITH PASSWORD 'your_password';`}
                      </pre>
                    </div>

                    <div style={{ marginBottom: theme.spacing.sm }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.foreground, marginBottom: theme.spacing.xs, fontFamily: 'Consolas' }}>
                        2. User Must Be in metadata.users
                      </div>
                      <pre style={{ 
                        marginLeft: theme.spacing.md, 
                        marginTop: theme.spacing.xs, 
                        padding: theme.spacing.sm, 
                        background: asciiColors.backgroundSoft, 
                        border: `1px solid ${asciiColors.border}`,
                        borderRadius: 2,
                        fontSize: 11,
                        fontFamily: 'Consolas',
                        overflowX: 'auto'
                      }}>
{`INSERT INTO metadata.users (username, email, password_hash, role, active)
VALUES ('tomy.berrios', 'your@email.com', 'hash', 'admin', true);`}
                      </pre>
                    </div>

                    <div style={{ marginBottom: theme.spacing.sm }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.foreground, marginBottom: theme.spacing.xs, fontFamily: 'Consolas' }}>
                        3. Required Permissions
                      </div>
                      <pre style={{ 
                        marginLeft: theme.spacing.md, 
                        marginTop: theme.spacing.xs, 
                        padding: theme.spacing.sm, 
                        background: asciiColors.backgroundSoft, 
                        border: `1px solid ${asciiColors.border}`,
                        borderRadius: 2,
                        fontSize: 11,
                        fontFamily: 'Consolas',
                        overflowX: 'auto'
                      }}>
{`GRANT CONNECT ON DATABASE DataLake TO tomy.berrios;
GRANT USAGE ON SCHEMA saleslt TO tomy.berrios;
GRANT SELECT ON saleslt.saleslt_smart_customer TO tomy.berrios;
GRANT SELECT ON metadata.users TO tomy.berrios;`}
                      </pre>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: theme.spacing.lg }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: theme.spacing.sm, fontFamily: 'Consolas' }}>
                    {ascii.blockFull} MASKING TYPES
                  </div>
                  
                  <div style={{ marginLeft: theme.spacing.md }}>
                    <div style={{ marginBottom: theme.spacing.sm }}>
                      <span style={{ color: asciiColors.foreground, fontWeight: 600, fontFamily: 'Consolas' }}>FULL</span>
                      <span style={{ color: asciiColors.foreground, marginLeft: theme.spacing.sm, fontFamily: 'Consolas' }}>Complete masking: ***MASKED***</span>
                    </div>
                    <div style={{ marginBottom: theme.spacing.sm }}>
                      <span style={{ color: asciiColors.muted, fontWeight: 600, fontFamily: 'Consolas' }}>PARTIAL</span>
                      <span style={{ color: asciiColors.foreground, marginLeft: theme.spacing.sm, fontFamily: 'Consolas' }}>Partial masking: Shows first/last characters</span>
                    </div>
                    <div style={{ marginBottom: theme.spacing.sm }}>
                      <span style={{ color: asciiColors.accent, fontWeight: 600, fontFamily: 'Consolas' }}>EMAIL</span>
                      <span style={{ color: asciiColors.foreground, marginLeft: theme.spacing.sm, fontFamily: 'Consolas' }}>Email masking: orl***@adventure-works.com</span>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.accent, fontWeight: 600 }}>PHONE</span>
                      <span style={{ color: asciiColors.foreground, marginLeft: 8 }}>Phone masking: 245-****-0173</span>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.muted, fontWeight: 600 }}>HASH</span>
                      <span style={{ color: asciiColors.foreground, marginLeft: 8 }}>Hash-based masking: Deterministic hash</span>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.success, fontWeight: 600 }}>TOKENIZE</span>
                      <span style={{ color: asciiColors.foreground, marginLeft: 8 }}>Tokenization: Replaces with tokens</span>
                    </div>
                  </div>
                </div>

                <div style={{ 
                  marginTop: 16, 
                  padding: 12, 
                  background: asciiColors.backgroundSoft, 
                  borderRadius: 2,
                  border: `1px solid ${asciiColors.border}`
                }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: asciiColors.muted, marginBottom: 4 }}>
                    {ascii.blockSemi} Important Notes
                  </div>
                  <div style={{ fontSize: 11, color: asciiColors.foreground, fontFamily: 'Consolas' }}>
                    • The view queries <code style={{ background: asciiColors.background, padding: `${theme.spacing.xs} ${theme.spacing.xs}`, fontFamily: 'Consolas' }}>metadata.users</code> at <strong>execution time</strong>, not at creation time<br/>
                    • If a PostgreSQL user exists but is not in <code style={{ background: asciiColors.background, padding: `${theme.spacing.xs} ${theme.spacing.xs}`, fontFamily: 'Consolas' }}>metadata.users</code>, the function returns 'admin' by default (hardcoded)<br/>
                    • If the user exists in <code style={{ background: asciiColors.background, padding: `${theme.spacing.xs} ${theme.spacing.xs}`, fontFamily: 'Consolas' }}>metadata.users</code>, it uses the role from that table<br/>
                    • Masking is applied at the database level, ensuring consistent protection across all applications
                  </div>
                </div>

                <div style={{ marginTop: theme.spacing.md, textAlign: 'right' }}>
                  <AsciiButton
                    label="Close"
                    onClick={() => setShowMaskingPlaybook(false)}
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

export default DataMasking;
