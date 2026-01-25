import { useState, useEffect, useCallback, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import {
  Container,
  LoadingOverlay,
  Pagination,
  PageButton,
} from '../shared/BaseComponents';
import { usePagination } from '../../hooks/usePagination';
import { useTableFilters } from '../../hooks/useTableFilters';
import { governanceApi } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import { theme } from '../../theme/theme';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import GovernanceTreeView from './GovernanceTreeView';
import GovernanceCharts from './GovernanceCharts';
import SkeletonLoader from '../shared/SkeletonLoader';

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const slideUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const TabContent = styled.div`
  font-family: 'Consolas';
  font-size: 12px;
`;

const DetailsSection = styled.div`
  margin-bottom: ${theme.spacing.md};
  padding-bottom: ${theme.spacing.sm};
  border-bottom: 1px solid ${asciiColors.border};
  
  &:last-child {
    margin-bottom: 0;
    border-bottom: none;
  }
`;

const SectionTitle = styled.h3`
  font-size: 13px;
  font-family: 'Consolas';
  font-weight: 600;
  color: ${asciiColors.foreground};
  margin: 0 0 ${theme.spacing.sm} 0;
  padding-bottom: ${theme.spacing.xs};
  border-bottom: 2px solid ${asciiColors.accent};
`;

const DetailsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${theme.spacing.sm};
`;

const DetailLabel = styled.div`
  color: ${asciiColors.muted};
  font-weight: 500;
  font-size: 11px;
  font-family: 'Consolas';
`;

const DetailValue = styled.div`
  color: ${asciiColors.foreground};
  font-size: 12px;
  font-family: 'Consolas';
`;

const Badge = styled.span<{ $status?: string }>`
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border-radius: 2;
  font-size: 11px;
  font-family: 'Consolas';
  background-color: ${props => getStatusColor(props.$status) + '20'};
  color: ${props => getStatusColor(props.$status)};
  border: 1px solid ${props => getStatusColor(props.$status)};
`;

const QualityScore = styled.span<{ $score: number }>`
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border-radius: 2;
  font-size: 11px;
  font-family: 'Consolas';
  background-color: ${props => getScoreColor(props.$score) + '20'};
  color: ${props => getScoreColor(props.$score)};
  border: 1px solid ${props => getScoreColor(props.$score)};
`;

const getStatusColor = (status?: string) => {
  if (!status) return asciiColors.muted;
  switch (status) {
    case 'HEALTHY':
    case 'EXCELLENT': return asciiColors.accent;
    case 'WARNING': return asciiColors.muted;
    case 'CRITICAL':
    case 'EMERGENCY': return asciiColors.foreground;
    default: return asciiColors.muted;
  }
};

const getScoreColor = (score: number) => {
  if (score >= 90) return asciiColors.accent;
  if (score >= 70) return asciiColors.accent;
  if (score >= 50) return asciiColors.muted;
  return asciiColors.foreground;
};

/**
 * Governance component
 * Displays data governance catalog with filtering, sorting, and detailed information
 */
const Governance = () => {
  const { page, limit, setPage, setLimit } = usePagination(1, 20, 1000);
  const { filters, setFilter, clearFilters } = useTableFilters({
    engine: '',
    category: '',
    health: '',
    domain: '',
    sensitivity: ''
  });
  
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'ownership' | 'security' | 'privacy' | 'retention' | 'legal' | 'quality' | 'integration' | 'documentation'>('overview');
  const [allItems, setAllItems] = useState<any[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
    currentPage: 1,
    limit: 20
  });
  const [metrics, setMetrics] = useState<any>({});
  const [loadingTree, setLoadingTree] = useState(true);
  const [showMetricsPlaybook, setShowMetricsPlaybook] = useState(false);
  const [activeView, setActiveView] = useState<'list' | 'charts'>('list');
  const isMountedRef = useRef(true);

  const fetchAllItems = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    const startTime = Date.now();
    const minLoadingTime = 300;
    
    try {
      setLoadingTree(true);
      setError(null);
      const response = await governanceApi.getGovernanceData({
        page,
        limit,
        engine: filters.engine as string,
        category: filters.category as string,
        health: filters.health as string,
        domain: filters.domain as string,
        sensitivity: filters.sensitivity as string
      });
      
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minLoadingTime - elapsed);
      await new Promise(resolve => setTimeout(resolve, remaining));
      
      if (isMountedRef.current) {
        setAllItems(response.data || []);
        setPagination(response.pagination || {
          total: 0,
          totalPages: 0,
          currentPage: 1,
          limit: 20
        });
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(extractApiError(err));
      }
    } finally {
      if (isMountedRef.current) {
        setLoadingTree(false);
      }
    }
  }, [
    page,
    limit,
    filters.engine,
    filters.category,
    filters.health,
    filters.domain,
    filters.sensitivity
  ]);

  useEffect(() => {
    isMountedRef.current = true;
    const loadData = async () => {
      await fetchAllItems();
      try {
        const metricsData = await governanceApi.getGovernanceMetrics();
        if (isMountedRef.current) {
          setMetrics(metricsData || {});
        }
      } catch (err) {
        if (isMountedRef.current) {
          console.error('Error loading metrics:', err);
        }
      }
    };
    loadData();
    const interval = setInterval(() => {
      if (isMountedRef.current) {
        fetchAllItems();
        governanceApi.getGovernanceMetrics().then(metricsData => {
          if (isMountedRef.current) {
            setMetrics(metricsData || {});
          }
        }).catch(err => {
          console.error('Error loading metrics:', err);
        });
      }
    }, 30000);
    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchAllItems]);

  const handleItemClick = useCallback((item: any) => {
    if (!item) return;
    
    setSelectedItem((prev: any) => {
      if (prev && item.id && prev.id === item.id) {
        return null;
      }
      if (prev && item.schema_name && item.table_name && 
          prev.schema_name === item.schema_name && 
          prev.table_name === item.table_name) {
        return null;
      }
      return item;
    });
    setActiveTab('overview');
  }, []);

  const formatDate = useCallback((date: string) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString();
  }, []);

  const formatBoolean = useCallback((value: boolean | null | undefined) => {
    if (value === null || value === undefined) return 'N/A';
    return value ? 'Yes' : 'No';
  }, []);

  const formatPercentage = useCallback((value: number | null | undefined) => {
    if (value === null || value === undefined) return 'N/A';
    return `${Number(value).toFixed(2)}%`;
  }, []);

  const formatBytes = useCallback((mb: number | null | undefined) => {
    if (mb === null || mb === undefined) return 'N/A';
    const size = Number(mb);
    if (isNaN(size)) return 'N/A';
    if (size >= 1024) {
      return `${(size / 1024).toFixed(2)} GB`;
    }
    return `${size.toFixed(2)} MB`;
  }, []);

  const formatNumber = useCallback((value: number | string | null | undefined) => {
    if (value === null || value === undefined) return 'N/A';
    const num = Number(value);
    if (isNaN(num)) return 'N/A';
    return num.toLocaleString();
  }, []);




  const getCategoryDescription = useCallback((category: string) => {
    const descriptions: { [key: string]: string } = {
      'TRANSACTIONAL': 'Data that represents business transactions and events that occur in real-time',
      'ANALYTICAL': 'Data used for analysis, reporting, and business intelligence purposes',
      'REFERENCE': 'Lookup tables and master data used across multiple systems',
      'MASTER_DATA': 'Core business entities like customers, products, and suppliers',
      'OPERATIONAL': 'Data used for day-to-day operational processes and workflows',
      'TEMPORAL': 'Time-series data that tracks changes over time',
      'GEOSPATIAL': 'Location-based data including coordinates and geographic information',
      'FINANCIAL': 'Financial transactions, accounts, and monetary data',
      'COMPLIANCE': 'Data required for regulatory compliance and auditing',
      'TECHNICAL': 'System-generated data for technical monitoring and maintenance',
      'SPORTS': 'Sports-related data including scores, statistics, and player information'
    };
    return descriptions[category] || 'Data category classification';
  }, []);

  const getHealthDescription = useCallback((health: string) => {
    const descriptions: { [key: string]: string } = {
      'EXCELLENT': 'Optimal data quality with no issues detected',
      'HEALTHY': 'Good data quality with minor or no issues',
      'WARNING': 'Some data quality issues detected that need attention',
      'CRITICAL': 'Significant data quality issues requiring immediate attention',
      'EMERGENCY': 'Severe data quality issues that may impact system functionality'
    };
    return descriptions[health] || 'Health status of the data';
  }, []);

  const getSensitivityDescription = useCallback((sensitivity: string) => {
    const descriptions: { [key: string]: string } = {
      'PUBLIC': 'Data that can be freely shared and accessed by anyone',
      'LOW': 'Data with minimal sensitivity requirements',
      'MEDIUM': 'Data with moderate sensitivity requiring controlled access',
      'HIGH': 'Data with high sensitivity requiring strict access controls',
      'CRITICAL': 'Data with critical sensitivity requiring maximum security measures'
    };
    return descriptions[sensitivity] || 'Data sensitivity level';
  }, []);

  const handleFilterChange = useCallback((key: string, value: string) => {
    setFilter(key as any, value);
    setPage(1);
  }, [setFilter, setPage]);

  const renderOverviewTab = useCallback((item: any) => {
    return (
      <div>
        <div style={{ marginBottom: theme.spacing.md, paddingBottom: theme.spacing.sm, borderBottom: `1px solid ${asciiColors.border}` }}>
          <h3 style={{ fontSize: 13, fontFamily: 'Consolas', fontWeight: 600, color: asciiColors.foreground, margin: `0 0 ${theme.spacing.sm} 0`, paddingBottom: theme.spacing.xs, borderBottom: `2px solid ${asciiColors.accent}` }}>
            Basic Information
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: theme.spacing.sm }}>
            <div>
              <div style={{ color: asciiColors.muted, fontWeight: 500, fontSize: 11, marginBottom: theme.spacing.xs, fontFamily: 'Consolas' }}>Schema:</div>
              <div style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>{item.schema_name || 'N/A'}</div>
            </div>
            <div>
              <div style={{ color: asciiColors.muted, fontWeight: 500, fontSize: 11, marginBottom: 4, fontFamily: 'Consolas' }}>Table:</div>
              <div style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>{item.table_name || 'N/A'}</div>
            </div>
            <div>
              <div style={{ color: asciiColors.muted, fontWeight: 500, fontSize: 11, marginBottom: 4, fontFamily: 'Consolas' }}>Source Engine:</div>
              <div style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>{item.inferred_source_engine || 'N/A'}</div>
            </div>
            <div>
              <div style={{ color: asciiColors.muted, fontWeight: 500, fontSize: 11, marginBottom: 4, fontFamily: 'Consolas' }}>Data Category:</div>
              <div style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>
              {item.data_category ? (
                  <span style={{
                    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                    borderRadius: 2,
                    fontSize: 11,
                    fontFamily: 'Consolas',
                    backgroundColor: asciiColors.backgroundSoft,
                    color: asciiColors.foreground,
                    border: `1px solid ${asciiColors.border}`
                  }}>
                    {item.data_category}
                  </span>
              ) : 'N/A'}
              </div>
            </div>
            <div>
              <div style={{ color: asciiColors.muted, fontWeight: 500, fontSize: 11, marginBottom: theme.spacing.xs, fontFamily: 'Consolas' }}>Business Domain:</div>
              <div style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>{item.business_domain || 'N/A'}</div>
            </div>
            <div>
              <div style={{ color: asciiColors.muted, fontWeight: 500, fontSize: 11, marginBottom: theme.spacing.xs, fontFamily: 'Consolas' }}>Sensitivity Level:</div>
              <div style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>
              {item.sensitivity_level ? (
                  <span style={{
                    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                    borderRadius: 2,
                    fontSize: 11,
                    fontFamily: 'Consolas',
                    backgroundColor: getStatusColor(item.sensitivity_level) + '20',
                    color: getStatusColor(item.sensitivity_level),
                    border: `1px solid ${getStatusColor(item.sensitivity_level)}`
                  }}>
                    {item.sensitivity_level}
                  </span>
              ) : 'N/A'}
              </div>
            </div>
            <div>
              <div style={{ color: asciiColors.muted, fontWeight: 500, fontSize: 11, marginBottom: theme.spacing.xs, fontFamily: 'Consolas' }}>Health Status:</div>
              <div style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>
              {item.health_status ? (
                  <span style={{
                    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                    borderRadius: 2,
                    fontSize: 11,
                    fontFamily: 'Consolas',
                    backgroundColor: getStatusColor(item.health_status) + '20',
                    color: getStatusColor(item.health_status),
                    border: `1px solid ${getStatusColor(item.health_status)}`
                  }}>
                    {item.health_status}
                  </span>
              ) : 'N/A'}
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: theme.spacing.md, paddingBottom: theme.spacing.sm, borderBottom: `1px solid ${asciiColors.border}` }}>
          <h3 style={{ fontSize: 13, fontFamily: 'Consolas', fontWeight: 600, color: asciiColors.foreground, margin: `0 0 ${theme.spacing.sm} 0`, paddingBottom: theme.spacing.xs, borderBottom: `2px solid ${asciiColors.accent}` }}>
            Metrics
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: theme.spacing.sm }}>
            <div>
              <div style={{ color: asciiColors.muted, fontWeight: 500, fontSize: 11, marginBottom: 4, fontFamily: 'Consolas' }}>Total Columns:</div>
              <div style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>{item.total_columns?.toLocaleString() || 'N/A'}</div>
            </div>
            <div>
              <div style={{ color: asciiColors.muted, fontWeight: 500, fontSize: 11, marginBottom: 4, fontFamily: 'Consolas' }}>Total Rows:</div>
              <div style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>{item.total_rows?.toLocaleString() || 'N/A'}</div>
            </div>
            <div>
              <div style={{ color: asciiColors.muted, fontWeight: 500, fontSize: 11, marginBottom: 4, fontFamily: 'Consolas' }}>Table Size:</div>
              <div style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>{formatBytes(item.table_size_mb)}</div>
            </div>
            <div>
              <div style={{ color: asciiColors.muted, fontWeight: 500, fontSize: 11, marginBottom: 4, fontFamily: 'Consolas' }}>Primary Key Columns:</div>
              <div style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>{item.primary_key_columns || 'N/A'}</div>
            </div>
            <div>
              <div style={{ color: asciiColors.muted, fontWeight: 500, fontSize: 11, marginBottom: 4, fontFamily: 'Consolas' }}>Index Count:</div>
              <div style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>{item.index_count?.toLocaleString() || 'N/A'}</div>
            </div>
            <div>
              <div style={{ color: asciiColors.muted, fontWeight: 500, fontSize: 11, marginBottom: 4, fontFamily: 'Consolas' }}>Constraint Count:</div>
              <div style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>{item.constraint_count?.toLocaleString() || 'N/A'}</div>
            </div>
            <div>
              <div style={{ color: asciiColors.muted, fontWeight: 500, fontSize: 11, marginBottom: 4, fontFamily: 'Consolas' }}>Data Quality Score:</div>
              <div style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>
              {item.data_quality_score !== null && item.data_quality_score !== undefined ? (
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: 2,
                    fontSize: 11,
                    fontFamily: 'Consolas',
                    backgroundColor: getScoreColor(Number(item.data_quality_score)) + '20',
                    color: getScoreColor(Number(item.data_quality_score)),
                    border: `1px solid ${getScoreColor(Number(item.data_quality_score))}`
                  }}>
                  {Number(item.data_quality_score).toFixed(2)}%
                  </span>
              ) : 'N/A'}
              </div>
            </div>
            <div>
              <div style={{ color: asciiColors.muted, fontWeight: 500, fontSize: 11, marginBottom: 4, fontFamily: 'Consolas' }}>Null Percentage:</div>
              <div style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>{formatPercentage(item.null_percentage)}</div>
            </div>
            <div>
              <div style={{ color: asciiColors.muted, fontWeight: 500, fontSize: 11, marginBottom: 4, fontFamily: 'Consolas' }}>Duplicate Percentage:</div>
              <div style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>{formatPercentage(item.duplicate_percentage)}</div>
            </div>
            <div>
              <div style={{ color: asciiColors.muted, fontWeight: 500, fontSize: 11, marginBottom: 4, fontFamily: 'Consolas' }}>Fragmentation:</div>
              <div style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>{formatPercentage(item.fragmentation_percentage)}</div>
            </div>
            <div>
              <div style={{ color: asciiColors.muted, fontWeight: 500, fontSize: 11, marginBottom: 4, fontFamily: 'Consolas' }}>Access Frequency:</div>
              <div style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>{item.access_frequency || 'N/A'}</div>
            </div>
            <div>
              <div style={{ color: asciiColors.muted, fontWeight: 500, fontSize: 11, marginBottom: 4, fontFamily: 'Consolas' }}>Query Count (Daily):</div>
              <div style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>{item.query_count_daily?.toLocaleString() || 'N/A'}</div>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 0 }}>
          <h3 style={{ fontSize: 13, fontFamily: 'Consolas', fontWeight: 600, color: asciiColors.foreground, margin: '0 0 12px 0', paddingBottom: 4, borderBottom: `2px solid ${asciiColors.accent}` }}>
            Timestamps
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
            <div>
              <div style={{ color: asciiColors.muted, fontWeight: 500, fontSize: 11, marginBottom: 4, fontFamily: 'Consolas' }}>First Discovered:</div>
              <div style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>{formatDate(item.first_discovered)}</div>
            </div>
            <div>
              <div style={{ color: asciiColors.muted, fontWeight: 500, fontSize: 11, marginBottom: 4, fontFamily: 'Consolas' }}>Last Analyzed:</div>
              <div style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>{formatDate(item.last_analyzed)}</div>
            </div>
            <div>
              <div style={{ color: asciiColors.muted, fontWeight: 500, fontSize: 11, marginBottom: 4, fontFamily: 'Consolas' }}>Last Accessed:</div>
              <div style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>{formatDate(item.last_accessed)}</div>
            </div>
            <div>
              <div style={{ color: asciiColors.muted, fontWeight: 500, fontSize: 11, marginBottom: 4, fontFamily: 'Consolas' }}>Last Vacuum:</div>
              <div style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>{formatDate(item.last_vacuum)}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }, [formatDate, formatBytes, formatPercentage]);

  const renderOwnershipTab = useCallback((item: any) => {
    return (
      <div>
        <div style={{ marginBottom: 0 }}>
          <h3 style={{ fontSize: 13, fontFamily: 'Consolas', fontWeight: 600, color: asciiColors.foreground, margin: '0 0 12px 0', paddingBottom: 4, borderBottom: `2px solid ${asciiColors.accent}` }}>
            Ownership
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
            <div>
              <div style={{ color: asciiColors.muted, fontWeight: 500, fontSize: 11, marginBottom: 4, fontFamily: 'Consolas' }}>Data Owner:</div>
              <div style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>{item.data_owner || 'N/A'}</div>
            </div>
            <div>
              <div style={{ color: asciiColors.muted, fontWeight: 500, fontSize: 11, marginBottom: 4, fontFamily: 'Consolas' }}>Owner Email:</div>
              <div style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>
              {item.owner_email ? (
                  <a href={`mailto:${item.owner_email}`} style={{ color: asciiColors.accent, fontFamily: 'Consolas' }}>
                  {item.owner_email}
                </a>
              ) : 'N/A'}
              </div>
            </div>
            <div>
              <div style={{ color: asciiColors.muted, fontWeight: 500, fontSize: 11, marginBottom: 4, fontFamily: 'Consolas' }}>Data Steward:</div>
              <div style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>{item.data_steward || 'N/A'}</div>
            </div>
            <div>
              <div style={{ color: asciiColors.muted, fontWeight: 500, fontSize: 11, marginBottom: 4, fontFamily: 'Consolas' }}>Steward Email:</div>
              <div style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>
              {item.steward_email ? (
                  <a href={`mailto:${item.steward_email}`} style={{ color: asciiColors.accent, fontFamily: 'Consolas' }}>
                  {item.steward_email}
                </a>
              ) : 'N/A'}
              </div>
            </div>
            <div>
              <div style={{ color: asciiColors.muted, fontWeight: 500, fontSize: 11, marginBottom: 4, fontFamily: 'Consolas' }}>Data Custodian:</div>
              <div style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>{item.data_custodian || 'N/A'}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }, []);

  const renderSecurityTab = useCallback((item: any) => {
    return (
      <div>
        <div style={{ marginBottom: 16, paddingBottom: 12, borderBottom: `1px solid ${asciiColors.border}` }}>
          <h3 style={{ fontSize: 13, fontFamily: 'Consolas', fontWeight: 600, color: asciiColors.foreground, margin: '0 0 12px 0', paddingBottom: 4, borderBottom: `2px solid ${asciiColors.accent}` }}>
            Encryption
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
            <div>
              <div style={{ color: asciiColors.muted, fontWeight: 500, fontSize: 11, marginBottom: 4, fontFamily: 'Consolas' }}>Encryption at Rest:</div>
              <div style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: 2,
                  fontSize: 11,
                  fontFamily: 'Consolas',
                  backgroundColor: getStatusColor(item.encryption_at_rest ? 'HEALTHY' : 'WARNING') + '20',
                  color: getStatusColor(item.encryption_at_rest ? 'HEALTHY' : 'WARNING'),
                  border: `1px solid ${getStatusColor(item.encryption_at_rest ? 'HEALTHY' : 'WARNING')}`
                }}>
                {formatBoolean(item.encryption_at_rest)}
                </span>
              </div>
            </div>
            <div>
              <div style={{ color: asciiColors.muted, fontWeight: 500, fontSize: 11, marginBottom: 4, fontFamily: 'Consolas' }}>Encryption in Transit:</div>
              <div style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: 2,
                  fontSize: 11,
                  fontFamily: 'Consolas',
                  backgroundColor: getStatusColor(item.encryption_in_transit ? 'HEALTHY' : 'WARNING') + '20',
                  color: getStatusColor(item.encryption_in_transit ? 'HEALTHY' : 'WARNING'),
                  border: `1px solid ${getStatusColor(item.encryption_in_transit ? 'HEALTHY' : 'WARNING')}`
                }}>
                {formatBoolean(item.encryption_in_transit)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 16, paddingBottom: 12, borderBottom: `1px solid ${asciiColors.border}` }}>
          <h3 style={{ fontSize: 13, fontFamily: 'Consolas', fontWeight: 600, color: asciiColors.foreground, margin: '0 0 12px 0', paddingBottom: 4, borderBottom: `2px solid ${asciiColors.accent}` }}>
            Data Masking
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
            <div>
              <div style={{ color: asciiColors.muted, fontWeight: 500, fontSize: 11, marginBottom: 4, fontFamily: 'Consolas' }}>Masking Policy Applied:</div>
              <div style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: 2,
                  fontSize: 11,
                  fontFamily: 'Consolas',
                  backgroundColor: getStatusColor(item.masking_policy_applied ? 'HEALTHY' : 'WARNING') + '20',
                  color: getStatusColor(item.masking_policy_applied ? 'HEALTHY' : 'WARNING'),
                  border: `1px solid ${getStatusColor(item.masking_policy_applied ? 'HEALTHY' : 'WARNING')}`
                }}>
                {formatBoolean(item.masking_policy_applied)}
                </span>
              </div>
            </div>
            <div>
              <div style={{ color: asciiColors.muted, fontWeight: 500, fontSize: 11, marginBottom: 4, fontFamily: 'Consolas' }}>Masking Policy Name:</div>
              <div style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>{item.masking_policy_name || 'N/A'}</div>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 0 }}>
          <h3 style={{ fontSize: 13, fontFamily: 'Consolas', fontWeight: 600, color: asciiColors.foreground, margin: '0 0 12px 0', paddingBottom: 4, borderBottom: `2px solid ${asciiColors.accent}` }}>
            Access Control
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
            <div>
              <div style={{ color: asciiColors.muted, fontWeight: 500, fontSize: 11, marginBottom: 4, fontFamily: 'Consolas' }}>Row Level Security:</div>
              <div style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: 2,
                  fontSize: 11,
                  fontFamily: 'Consolas',
                  backgroundColor: getStatusColor(item.row_level_security_enabled ? 'HEALTHY' : 'WARNING') + '20',
                  color: getStatusColor(item.row_level_security_enabled ? 'HEALTHY' : 'WARNING'),
                  border: `1px solid ${getStatusColor(item.row_level_security_enabled ? 'HEALTHY' : 'WARNING')}`
                }}>
                {formatBoolean(item.row_level_security_enabled)}
                </span>
              </div>
            </div>
            <div>
              <div style={{ color: asciiColors.muted, fontWeight: 500, fontSize: 11, marginBottom: 4, fontFamily: 'Consolas' }}>Column Level Security:</div>
              <div style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: 2,
                  fontSize: 11,
                  fontFamily: 'Consolas',
                  backgroundColor: getStatusColor(item.column_level_security_enabled ? 'HEALTHY' : 'WARNING') + '20',
                  color: getStatusColor(item.column_level_security_enabled ? 'HEALTHY' : 'WARNING'),
                  border: `1px solid ${getStatusColor(item.column_level_security_enabled ? 'HEALTHY' : 'WARNING')}`
                }}>
                {formatBoolean(item.column_level_security_enabled)}
                </span>
              </div>
            </div>
            <div>
              <div style={{ color: asciiColors.muted, fontWeight: 500, fontSize: 11, marginBottom: 4, fontFamily: 'Consolas' }}>Access Control Policy:</div>
              <div style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>{item.access_control_policy || 'N/A'}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }, [formatBoolean]);

  const renderPrivacyTab = useCallback((item: any) => {
    return (
      <TabContent>
        <DetailsSection>
          <SectionTitle>Consent & Legal Basis</SectionTitle>
          <DetailsGrid>
            <DetailLabel>Consent Required:</DetailLabel>
            <DetailValue>
              <Badge $status={item.consent_required ? 'WARNING' : 'HEALTHY'}>
                {formatBoolean(item.consent_required)}
              </Badge>
            </DetailValue>
            
            <DetailLabel>Consent Type:</DetailLabel>
            <DetailValue>{item.consent_type || 'N/A'}</DetailValue>
            
            <DetailLabel>Legal Basis:</DetailLabel>
            <DetailValue>{item.legal_basis || 'N/A'}</DetailValue>
            
            <DetailLabel>Data Subject Rights:</DetailLabel>
            <DetailValue style={{ whiteSpace: 'pre-wrap' }}>
              {item.data_subject_rights || 'N/A'}
            </DetailValue>
          </DetailsGrid>
        </DetailsSection>

        <DetailsSection>
          <SectionTitle>PII/PHI Detection</SectionTitle>
          <DetailsGrid>
            <DetailLabel>PII Detection Method:</DetailLabel>
            <DetailValue>{item.pii_detection_method || 'N/A'}</DetailValue>
            
            <DetailLabel>PII Confidence Score:</DetailLabel>
            <DetailValue>
              {item.pii_confidence_score !== null && item.pii_confidence_score !== undefined
                ? `${Number(item.pii_confidence_score).toFixed(2)}%`
                : 'N/A'}
            </DetailValue>
            
            <DetailLabel>PII Categories:</DetailLabel>
            <DetailValue style={{ whiteSpace: 'pre-wrap' }}>
              {item.pii_categories || 'N/A'}
            </DetailValue>
            
            <DetailLabel>PHI Detection Method:</DetailLabel>
            <DetailValue>{item.phi_detection_method || 'N/A'}</DetailValue>
            
            <DetailLabel>PHI Confidence Score:</DetailLabel>
            <DetailValue>
              {item.phi_confidence_score !== null && item.phi_confidence_score !== undefined
                ? `${Number(item.phi_confidence_score).toFixed(2)}%`
                : 'N/A'}
            </DetailValue>
            
            <DetailLabel>Sensitive Data Count:</DetailLabel>
            <DetailValue>{item.sensitive_data_count?.toLocaleString() || '0'}</DetailValue>
            
            <DetailLabel>Last PII Scan:</DetailLabel>
            <DetailValue>{formatDate(item.last_pii_scan)}</DetailValue>
          </DetailsGrid>
        </DetailsSection>

        <DetailsSection>
          <SectionTitle>Cross-Border Transfer</SectionTitle>
          <DetailsGrid>
            <DetailLabel>Cross-Border Transfer:</DetailLabel>
            <DetailValue>
              <Badge $status={item.cross_border_transfer ? 'WARNING' : 'HEALTHY'}>
                {formatBoolean(item.cross_border_transfer)}
              </Badge>
            </DetailValue>
            
            <DetailLabel>Cross-Border Countries:</DetailLabel>
            <DetailValue style={{ whiteSpace: 'pre-wrap' }}>
              {item.cross_border_countries || 'N/A'}
            </DetailValue>
            
            <DetailLabel>Data Processing Agreement:</DetailLabel>
            <DetailValue style={{ whiteSpace: 'pre-wrap' }}>
              {item.data_processing_agreement || 'N/A'}
            </DetailValue>
            
            <DetailLabel>Privacy Impact Assessment:</DetailLabel>
            <DetailValue style={{ whiteSpace: 'pre-wrap' }}>
              {item.privacy_impact_assessment || 'N/A'}
            </DetailValue>
          </DetailsGrid>
        </DetailsSection>

        <DetailsSection>
          <SectionTitle>Breach Management</SectionTitle>
          <DetailsGrid>
            <DetailLabel>Breach Notification Required:</DetailLabel>
            <DetailValue>
              <Badge $status={item.breach_notification_required ? 'WARNING' : 'HEALTHY'}>
                {formatBoolean(item.breach_notification_required)}
              </Badge>
            </DetailValue>
            
            <DetailLabel>Last Breach Check:</DetailLabel>
            <DetailValue>{formatDate(item.last_breach_check)}</DetailValue>
          </DetailsGrid>
        </DetailsSection>
      </TabContent>
    );
  }, [formatBoolean, formatDate]);

  const renderRetentionTab = useCallback((item: any) => {
    return (
      <TabContent>
        <DetailsSection>
          <SectionTitle>Retention Policy</SectionTitle>
          <DetailsGrid>
            <DetailLabel>Retention Enforced:</DetailLabel>
            <DetailValue>
              <Badge $status={item.retention_enforced ? 'HEALTHY' : 'WARNING'}>
                {formatBoolean(item.retention_enforced)}
              </Badge>
            </DetailValue>
            
            <DetailLabel>Data Expiration Date:</DetailLabel>
            <DetailValue>{formatDate(item.data_expiration_date)}</DetailValue>
            
            <DetailLabel>Auto Delete Enabled:</DetailLabel>
            <DetailValue>
              <Badge $status={item.auto_delete_enabled ? 'WARNING' : 'HEALTHY'}>
                {formatBoolean(item.auto_delete_enabled)}
              </Badge>
            </DetailValue>
          </DetailsGrid>
        </DetailsSection>

        <DetailsSection>
          <SectionTitle>Archival</SectionTitle>
          <DetailsGrid>
            <DetailLabel>Archival Policy:</DetailLabel>
            <DetailValue>{item.archival_policy || 'N/A'}</DetailValue>
            
            <DetailLabel>Archival Location:</DetailLabel>
            <DetailValue>{item.archival_location || 'N/A'}</DetailValue>
            
            <DetailLabel>Last Archived At:</DetailLabel>
            <DetailValue>{formatDate(item.last_archived_at)}</DetailValue>
          </DetailsGrid>
        </DetailsSection>
      </TabContent>
    );
  }, [formatBoolean, formatDate]);

  const renderLegalTab = useCallback((item: any) => {
    return (
      <TabContent>
        <DetailsSection>
          <SectionTitle>Legal Hold</SectionTitle>
          <DetailsGrid>
            <DetailLabel>Legal Hold:</DetailLabel>
            <DetailValue>
              <Badge $status={item.legal_hold ? 'CRITICAL' : 'HEALTHY'}>
                {formatBoolean(item.legal_hold)}
              </Badge>
            </DetailValue>
            
            <DetailLabel>Legal Hold Reason:</DetailLabel>
            <DetailValue style={{ whiteSpace: 'pre-wrap' }}>
              {item.legal_hold_reason || 'N/A'}
            </DetailValue>
            
            <DetailLabel>Legal Hold Until:</DetailLabel>
            <DetailValue>{formatDate(item.legal_hold_until)}</DetailValue>
          </DetailsGrid>
        </DetailsSection>
      </TabContent>
    );
  }, [formatBoolean, formatDate]);

  const renderQualityTab = useCallback((item: any) => {
    return (
      <TabContent>
        <DetailsSection>
          <SectionTitle>Quality Metrics</SectionTitle>
          <DetailsGrid>
            <DetailLabel>Quality SLA Score:</DetailLabel>
            <DetailValue>
              {item.quality_sla_score !== null && item.quality_sla_score !== undefined ? (
                <QualityScore $score={Number(item.quality_sla_score)}>
                  {Number(item.quality_sla_score).toFixed(2)}%
                </QualityScore>
              ) : 'N/A'}
            </DetailValue>
            
            <DetailLabel>Quality Checks Automated:</DetailLabel>
            <DetailValue>
              <Badge $status={item.quality_checks_automated ? 'HEALTHY' : 'WARNING'}>
                {formatBoolean(item.quality_checks_automated)}
              </Badge>
            </DetailValue>
            
            <DetailLabel>Anomaly Detection Enabled:</DetailLabel>
            <DetailValue>
              <Badge $status={item.anomaly_detection_enabled ? 'HEALTHY' : 'WARNING'}>
                {formatBoolean(item.anomaly_detection_enabled)}
              </Badge>
            </DetailValue>
            
            <DetailLabel>Last Anomaly Detected:</DetailLabel>
            <DetailValue>{formatDate(item.last_anomaly_detected)}</DetailValue>
          </DetailsGrid>
        </DetailsSection>

        <DetailsSection>
          <SectionTitle>Data Freshness</SectionTitle>
          <DetailsGrid>
            <DetailLabel>Freshness Threshold (Hours):</DetailLabel>
            <DetailValue>{item.data_freshness_threshold_hours?.toLocaleString() || 'N/A'}</DetailValue>
            
            <DetailLabel>Last Freshness Check:</DetailLabel>
            <DetailValue>{formatDate(item.last_freshness_check)}</DetailValue>
          </DetailsGrid>
        </DetailsSection>

        <DetailsSection>
          <SectionTitle>Schema Evolution</SectionTitle>
          <DetailsGrid>
            <DetailLabel>Schema Evolution Tracking:</DetailLabel>
            <DetailValue>
              <Badge $status={item.schema_evolution_tracking ? 'HEALTHY' : 'WARNING'}>
                {formatBoolean(item.schema_evolution_tracking)}
              </Badge>
            </DetailValue>
            
            <DetailLabel>Last Schema Change:</DetailLabel>
            <DetailValue>{formatDate(item.last_schema_change)}</DetailValue>
          </DetailsGrid>
        </DetailsSection>
      </TabContent>
    );
  }, [formatBoolean, formatDate]);

  const renderIntegrationTab = useCallback((item: any) => {
    return (
      <TabContent>
        <DetailsSection>
          <SectionTitle>ETL Pipeline</SectionTitle>
          <DetailsGrid>
            <DetailLabel>ETL Pipeline Name:</DetailLabel>
            <DetailValue>{item.etl_pipeline_name || 'N/A'}</DetailValue>
            
            <DetailLabel>ETL Pipeline ID:</DetailLabel>
            <DetailValue>{item.etl_pipeline_id || 'N/A'}</DetailValue>
            
            <DetailLabel>Transformation Rules:</DetailLabel>
            <DetailValue style={{ whiteSpace: 'pre-wrap' }}>
              {item.transformation_rules || 'N/A'}
            </DetailValue>
          </DetailsGrid>
        </DetailsSection>

        <DetailsSection>
          <SectionTitle>Systems</SectionTitle>
          <DetailsGrid>
            <DetailLabel>Source Systems:</DetailLabel>
            <DetailValue style={{ whiteSpace: 'pre-wrap' }}>
              {item.source_systems || 'N/A'}
            </DetailValue>
            
            <DetailLabel>Downstream Systems:</DetailLabel>
            <DetailValue style={{ whiteSpace: 'pre-wrap' }}>
              {item.downstream_systems || 'N/A'}
            </DetailValue>
            
            <DetailLabel>BI Tools Used:</DetailLabel>
            <DetailValue style={{ whiteSpace: 'pre-wrap' }}>
              {item.bi_tools_used || 'N/A'}
            </DetailValue>
            
            <DetailLabel>API Endpoints:</DetailLabel>
            <DetailValue style={{ whiteSpace: 'pre-wrap' }}>
              {item.api_endpoints || 'N/A'}
            </DetailValue>
          </DetailsGrid>
        </DetailsSection>
      </TabContent>
    );
  }, []);

  const renderDocumentationTab = useCallback((item: any) => {
    return (
      <TabContent>
        <DetailsSection>
          <SectionTitle>Documentation</SectionTitle>
          <DetailsGrid>
            <DetailLabel>Business Glossary Term:</DetailLabel>
            <DetailValue style={{ whiteSpace: 'pre-wrap' }}>
              {item.business_glossary_term || 'N/A'}
            </DetailValue>
            
            <DetailLabel>Data Dictionary Description:</DetailLabel>
            <DetailValue style={{ whiteSpace: 'pre-wrap' }}>
              {item.data_dictionary_description || 'N/A'}
            </DetailValue>
          </DetailsGrid>
        </DetailsSection>

        <DetailsSection>
          <SectionTitle>Approval</SectionTitle>
          <DetailsGrid>
            <DetailLabel>Approval Required:</DetailLabel>
            <DetailValue>
              <Badge $status={item.approval_required ? 'WARNING' : 'HEALTHY'}>
                {formatBoolean(item.approval_required)}
              </Badge>
            </DetailValue>
            
            <DetailLabel>Last Approved By:</DetailLabel>
            <DetailValue>{item.last_approved_by || 'N/A'}</DetailValue>
            
            <DetailLabel>Last Approved At:</DetailLabel>
            <DetailValue>{formatDate(item.last_approved_at)}</DetailValue>
          </DetailsGrid>
        </DetailsSection>
      </TabContent>
    );
  }, [formatBoolean, formatDate]);

  if (loadingTree && allItems.length === 0) {
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
          DATA GOVERNANCE CATALOG
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

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
        gap: theme.spacing.md, 
        marginBottom: theme.spacing.lg 
      }}>
        <AsciiPanel title="Total Tables">
          <div style={{ fontFamily: 'Consolas', fontSize: 14, fontWeight: 600, color: asciiColors.foreground }}>
            {formatNumber(metrics.total_tables)}
          </div>
        </AsciiPanel>
        <AsciiPanel title="Total Size">
          <div style={{ fontFamily: 'Consolas', fontSize: 14, fontWeight: 600, color: asciiColors.foreground }}>
            {formatBytes(metrics.total_size_mb)}
          </div>
        </AsciiPanel>
        <AsciiPanel title="Total Rows">
          <div style={{ fontFamily: 'Consolas', fontSize: 14, fontWeight: 600, color: asciiColors.foreground }}>
            {formatNumber(metrics.total_rows)}
          </div>
        </AsciiPanel>
        <AsciiPanel title="Healthy">
          <div style={{ fontFamily: 'Consolas', fontSize: 14, fontWeight: 600, color: asciiColors.foreground }}>
            {formatNumber(metrics.healthy_count)}
          </div>
        </AsciiPanel>
        <AsciiPanel title="Warning">
          <div style={{ fontFamily: 'Consolas', fontSize: 14, fontWeight: 600, color: asciiColors.foreground }}>
            {formatNumber(metrics.warning_count)}
          </div>
        </AsciiPanel>
        <AsciiPanel title="Critical">
          <div style={{ fontFamily: 'Consolas', fontSize: 14, fontWeight: 600, color: asciiColors.foreground }}>
            {formatNumber(metrics.critical_count)}
          </div>
        </AsciiPanel>
        <AsciiPanel title="Unique Engines">
          <div style={{ fontFamily: 'Consolas', fontSize: 14, fontWeight: 600, color: asciiColors.foreground }}>
            {formatNumber(metrics.unique_engines)}
          </div>
        </AsciiPanel>
      </div>

      <AsciiPanel title="FILTERS">
        <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap', alignItems: 'center' }}>
          <select 
          value={filters.engine as string}
          onChange={(e) => handleFilterChange('engine', e.target.value)}
            style={{
              padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2,
              fontFamily: 'Consolas',
              fontSize: 12,
              backgroundColor: asciiColors.background,
              color: asciiColors.foreground,
              cursor: 'pointer',
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
        >
          <option value="">All Engines</option>
          <option value="PostgreSQL">PostgreSQL</option>
          <option value="MongoDB">MongoDB</option>
          <option value="MSSQL">MSSQL</option>
          <option value="MariaDB">MariaDB</option>
          </select>

          <select
          value={filters.category as string}
          onChange={(e) => handleFilterChange('category', e.target.value)}
            style={{
              padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2,
              fontFamily: 'Consolas',
              fontSize: 12,
              backgroundColor: asciiColors.background,
              color: asciiColors.foreground,
              cursor: 'pointer',
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
        >
          <option value="">All Categories</option>
          <option value="TRANSACTIONAL">Transactional</option>
          <option value="ANALYTICAL">Analytical</option>
          <option value="REFERENCE">Reference</option>
          <option value="MASTER_DATA">Master Data</option>
          <option value="OPERATIONAL">Operational</option>
          <option value="TEMPORAL">Temporal</option>
          <option value="GEOSPATIAL">Geospatial</option>
          <option value="FINANCIAL">Financial</option>
          <option value="COMPLIANCE">Compliance</option>
          <option value="TECHNICAL">Technical</option>
          <option value="SPORTS">Sports</option>
          </select>

          <select
          value={filters.health as string}
          onChange={(e) => handleFilterChange('health', e.target.value)}
            style={{
              padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2,
              fontFamily: 'Consolas',
              fontSize: 12,
              backgroundColor: asciiColors.background,
              color: asciiColors.foreground,
              cursor: 'pointer',
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
        >
          <option value="">All Health Status</option>
          <option value="EXCELLENT">Excellent</option>
          <option value="HEALTHY">Healthy</option>
          <option value="WARNING">Warning</option>
          <option value="CRITICAL">Critical</option>
          <option value="EMERGENCY">Emergency</option>
          </select>

          <select
          value={filters.sensitivity as string}
          onChange={(e) => handleFilterChange('sensitivity', e.target.value)}
            style={{
              padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2,
              fontFamily: 'Consolas',
              fontSize: 12,
              backgroundColor: asciiColors.background,
              color: asciiColors.foreground,
              cursor: 'pointer',
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
        >
          <option value="">All Sensitivity</option>
          <option value="PUBLIC">Public</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="CRITICAL">Critical</option>
          </select>

          <select
          value={filters.domain as string}
          onChange={(e) => handleFilterChange('domain', e.target.value)}
            style={{
              padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2,
              fontFamily: 'Consolas',
              fontSize: 12,
              backgroundColor: asciiColors.background,
              color: asciiColors.foreground,
              cursor: 'pointer',
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
        >
          <option value="">All Domains</option>
          <option value="CUSTOMER">Customer</option>
          <option value="SALES">Sales</option>
          <option value="MARKETING">Marketing</option>
          <option value="HR">HR</option>
          <option value="FINANCE">Finance</option>
          <option value="INVENTORY">Inventory</option>
          <option value="OPERATIONS">Operations</option>
          <option value="SUPPORT">Support</option>
          <option value="SECURITY">Security</option>
          <option value="ANALYTICS">Analytics</option>
          <option value="COMMUNICATION">Communication</option>
          <option value="LEGAL">Legal</option>
          <option value="RESEARCH">Research</option>
          <option value="MANUFACTURING">Manufacturing</option>
          <option value="LOGISTICS">Logistics</option>
          <option value="HEALTHCARE">Healthcare</option>
          <option value="EDUCATION">Education</option>
          <option value="REAL_ESTATE">Real Estate</option>
          <option value="INSURANCE">Insurance</option>
          <option value="SPORTS">Sports</option>
          <option value="GENERAL">General</option>
          </select>

          <AsciiButton
            label="Reset All"
          onClick={() => {
            clearFilters();
            setPage(1);
          }}
            variant="ghost"
          />
        </div>
      </AsciiPanel>

      {!loadingTree && !error && (
        <>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: theme.spacing.lg,
            marginTop: theme.spacing.sm,
            fontFamily: 'Consolas',
            fontSize: 12,
            gap: theme.spacing.lg
          }}>
            <div style={{ display: 'flex', gap: theme.spacing.sm, alignItems: 'center' }}>
              <label style={{ color: asciiColors.muted, fontSize: 11, fontFamily: 'Consolas' }}>
                Items per page:
              </label>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                style={{
                  padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                  border: `1px solid ${asciiColors.border}`,
                  borderRadius: 2,
                  fontFamily: 'Consolas',
                  fontSize: 12,
                  backgroundColor: asciiColors.background,
                  color: asciiColors.foreground,
                  cursor: 'pointer',
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
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: theme.spacing.sm, alignItems: 'center' }}>
              <AsciiButton
                label={activeView === 'list' ? 'Show Charts' : 'Show List'}
                onClick={() => setActiveView(activeView === 'list' ? 'charts' : 'list')}
                variant={activeView === 'charts' ? 'primary' : 'ghost'}
              />
              <AsciiButton
                label="Metrics Info"
                onClick={() => setShowMetricsPlaybook(true)}
                variant="ghost"
              />
            </div>
          </div>

          {showMetricsPlaybook && (
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
              zIndex: 1000
            }}
            onClick={() => setShowMetricsPlaybook(false)}
            >
              <div style={{
                width: '90%',
                maxWidth: 900,
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
                <AsciiPanel title="METRICS PLAYBOOK - DATA GOVERNANCE">
                  <div style={{ padding: theme.spacing.md, fontFamily: 'Consolas', fontSize: 12, lineHeight: 1.6 }}>
                    <div style={{ marginBottom: theme.spacing.md }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.accent, marginBottom: theme.spacing.sm, fontFamily: 'Consolas' }}>
                        {ascii.blockFull} Total Tables
                      </div>
                      <div style={{ color: asciiColors.foreground, marginLeft: theme.spacing.md, fontSize: 11, fontFamily: 'Consolas' }}>
                        Total number of tables cataloged across all database engines in the unified governance system.
                      </div>
                    </div>

                    <div style={{ marginBottom: theme.spacing.md }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.accent, marginBottom: theme.spacing.sm, fontFamily: 'Consolas' }}>
                        {ascii.blockFull} Total Size
                      </div>
                      <div style={{ color: asciiColors.foreground, marginLeft: theme.spacing.md, fontSize: 11, fontFamily: 'Consolas' }}>
                        Combined storage size of all tables across all databases. Includes data and index sizes.
                      </div>
                    </div>

                    <div style={{ marginBottom: theme.spacing.md }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.accent, marginBottom: theme.spacing.sm, fontFamily: 'Consolas' }}>
                        {ascii.blockFull} Total Rows
                      </div>
                      <div style={{ color: asciiColors.foreground, marginLeft: theme.spacing.md, fontSize: 11, fontFamily: 'Consolas' }}>
                        Total number of rows across all tables in the governance catalog.
                      </div>
                    </div>

                    <div style={{ marginBottom: theme.spacing.md }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.accent, marginBottom: theme.spacing.sm, fontFamily: 'Consolas' }}>
                        {ascii.blockFull} Healthy
                      </div>
                      <div style={{ color: asciiColors.foreground, marginLeft: theme.spacing.md, fontSize: 11, fontFamily: 'Consolas' }}>
                        Tables with HEALTHY status, indicating optimal performance, good data quality, proper governance controls, and compliance.
                      </div>
                    </div>

                    <div style={{ marginBottom: theme.spacing.md }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.muted, marginBottom: theme.spacing.sm, fontFamily: 'Consolas' }}>
                        {ascii.blockFull} Warning
                      </div>
                      <div style={{ color: asciiColors.foreground, marginLeft: theme.spacing.md, fontSize: 11, fontFamily: 'Consolas' }}>
                        Tables with WARNING status, indicating potential governance issues such as missing metadata, 
                        incomplete documentation, or compliance concerns that should be addressed.
                      </div>
                    </div>

                    <div style={{ marginBottom: theme.spacing.md }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.foreground, marginBottom: theme.spacing.sm, fontFamily: 'Consolas' }}>
                        {ascii.blockFull} Critical
                      </div>
                      <div style={{ color: asciiColors.foreground, marginLeft: theme.spacing.md, fontSize: 11, fontFamily: 'Consolas' }}>
                        Tables with CRITICAL status, indicating serious governance issues requiring immediate attention such as 
                        missing data owners, unclassified sensitive data, or compliance violations.
                      </div>
                    </div>

                    <div style={{ marginBottom: theme.spacing.md }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.accent, marginBottom: theme.spacing.sm, fontFamily: 'Consolas' }}>
                        {ascii.blockFull} Unique Engines
                      </div>
                      <div style={{ color: asciiColors.foreground, marginLeft: theme.spacing.md, fontSize: 11, fontFamily: 'Consolas' }}>
                        Number of distinct database engines (PostgreSQL, MariaDB, MSSQL, MongoDB, Oracle) being monitored in the unified governance catalog.
                      </div>
                    </div>

                    <div style={{ 
                      marginTop: theme.spacing.md, 
                      padding: theme.spacing.sm, 
                      background: asciiColors.backgroundSoft, 
                      borderRadius: 2,
                      border: `1px solid ${asciiColors.border}`
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: asciiColors.muted, marginBottom: theme.spacing.xs, fontFamily: 'Consolas' }}>
                        {ascii.blockSemi} Note
                      </div>
                      <div style={{ fontSize: 11, color: asciiColors.foreground, fontFamily: 'Consolas' }}>
                        These metrics are calculated in real-time from the data_governance_catalog table and reflect 
                        the current state of your unified data governance catalog across all database engines.
                      </div>
                    </div>

                    <div style={{ marginTop: theme.spacing.md, textAlign: 'right' }}>
                      <AsciiButton
                        label="Close"
                        onClick={() => setShowMetricsPlaybook(false)}
                        variant="ghost"
                      />
                    </div>
                  </div>
                </AsciiPanel>
              </div>
            </div>
          )}

          {activeView === 'charts' && (
            <GovernanceCharts 
              selectedTable={selectedItem ? {
                schema_name: selectedItem.schema_name,
                table_name: selectedItem.table_name,
                inferred_source_engine: selectedItem.inferred_source_engine
              } : null}
            />
          )}

          {activeView === 'list' && (
            <>
              {loadingTree ? (
                <LoadingOverlay>Loading tree view...</LoadingOverlay>
              ) : (
                <>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: selectedItem ? '1fr 500px' : '1fr', 
                    gap: theme.spacing.md, 
                    marginTop: theme.spacing.md 
                  }}>
                    <GovernanceTreeView 
                      items={allItems} 
                      onItemClick={handleItemClick} 
                    />
                    
                    {selectedItem && (
                      <AsciiPanel title="DETAILS" style={{ 
                        position: 'sticky', 
                        top: theme.spacing.md, 
                        maxHeight: 'calc(100vh - 200px)',
                        overflowY: 'auto'
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
                        <div style={{ 
                          display: 'flex', 
                          gap: theme.spacing.xs, 
                          marginBottom: theme.spacing.md, 
                          borderBottom: `1px solid ${asciiColors.border}`, 
                          paddingBottom: theme.spacing.sm,
                          flexWrap: 'wrap'
                        }}>
                          <AsciiButton
                            label="Overview"
                            onClick={() => setActiveTab('overview')}
                            variant={activeTab === 'overview' ? 'primary' : 'ghost'}
                          />
                          <AsciiButton
                            label="Ownership"
                            onClick={() => setActiveTab('ownership')}
                            variant={activeTab === 'ownership' ? 'primary' : 'ghost'}
                          />
                          <AsciiButton
                            label="Security"
                            onClick={() => setActiveTab('security')}
                            variant={activeTab === 'security' ? 'primary' : 'ghost'}
                          />
                          <AsciiButton
                            label="Privacy/GDPR"
                            onClick={() => setActiveTab('privacy')}
                            variant={activeTab === 'privacy' ? 'primary' : 'ghost'}
                          />
                          <AsciiButton
                            label="Retention"
                            onClick={() => setActiveTab('retention')}
                            variant={activeTab === 'retention' ? 'primary' : 'ghost'}
                          />
                          <AsciiButton
                            label="Legal Hold"
                            onClick={() => setActiveTab('legal')}
                            variant={activeTab === 'legal' ? 'primary' : 'ghost'}
                          />
                          <AsciiButton
                            label="Data Quality"
                            onClick={() => setActiveTab('quality')}
                            variant={activeTab === 'quality' ? 'primary' : 'ghost'}
                          />
                          <AsciiButton
                            label="Integration"
                            onClick={() => setActiveTab('integration')}
                            variant={activeTab === 'integration' ? 'primary' : 'ghost'}
                          />
                          <AsciiButton
                            label="Documentation"
                            onClick={() => setActiveTab('documentation')}
                            variant={activeTab === 'documentation' ? 'primary' : 'ghost'}
                          />
                        </div>
                        
                        {activeTab === 'overview' && renderOverviewTab(selectedItem)}
                        {activeTab === 'ownership' && renderOwnershipTab(selectedItem)}
                        {activeTab === 'security' && renderSecurityTab(selectedItem)}
                        {activeTab === 'privacy' && renderPrivacyTab(selectedItem)}
                        {activeTab === 'retention' && renderRetentionTab(selectedItem)}
                        {activeTab === 'legal' && renderLegalTab(selectedItem)}
                        {activeTab === 'quality' && renderQualityTab(selectedItem)}
                        {activeTab === 'integration' && renderIntegrationTab(selectedItem)}
                        {activeTab === 'documentation' && renderDocumentationTab(selectedItem)}
                      </AsciiPanel>
                    )}
                  </div>
                  
                  {pagination.totalPages > 1 && (
                    <div style={{ marginTop: theme.spacing.lg }}>
                      <Pagination>
                        <PageButton
                          onClick={() => setPage(Math.max(1, page - 1))}
                          disabled={page === 1}
                        >
                          Previous
                        </PageButton>
                        <span style={{ fontFamily: 'Consolas', fontSize: 12, color: asciiColors.foreground }}>
                          Page {pagination.currentPage} of {pagination.totalPages} ({pagination.total} total)
                        </span>
                        <PageButton
                          onClick={() => setPage(Math.min(pagination.totalPages, page + 1))}
                          disabled={page === pagination.totalPages}
                        >
                          Next
                        </PageButton>
                      </Pagination>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}

    </Container>
  );
};

export default Governance;
