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
import { governanceCatalogMongoDBApi } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import { sanitizeSearch } from '../../utils/validation';
import { theme } from '../../theme/theme';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import GovernanceCatalogMongoDBTreeView from './GovernanceCatalogMongoDBTreeView';
import GovernanceCatalogCharts from './GovernanceCatalogCharts';
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

const getStatusColor = (status?: string) => {
  if (!status) return asciiColors.muted;
  switch (status) {
    case 'HEALTHY':
    case 'EXCELLENT': return asciiColors.success;
    case 'WARNING': return asciiColors.warning;
    case 'CRITICAL': return asciiColors.danger;
    default: return asciiColors.muted;
  }
};

/**
 * Governance Catalog component for MongoDB
 * Displays governance metadata for MongoDB collections including health status, access frequency, and recommendations
 */
const GovernanceCatalogMongoDB = () => {
  const { page, limit, setPage, setLimit } = usePagination(1, 20, 1000);
  const { filters, setFilter, clearFilters } = useTableFilters({
    server_name: '',
    database_name: '',
    health_status: '',
    access_frequency: '',
    search: ''
  });
  
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'indexes' | 'performance' | 'recommendations'>('overview');
  const [metrics, setMetrics] = useState<any>({});
  const [servers, setServers] = useState<string[]>([]);
  const [databases, setDatabases] = useState<string[]>([]);
  const [allItems, setAllItems] = useState<any[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
    currentPage: 1,
    limit: 20
  });
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
      const sanitizedSearch = sanitizeSearch(filters.search as string, 100);
      const itemsData = await governanceCatalogMongoDBApi.getMongoDBItems({
        page,
        limit,
        server_name: filters.server_name as string,
        database_name: filters.database_name as string,
        health_status: filters.health_status as string,
        access_frequency: filters.access_frequency as string,
        search: sanitizedSearch
      });
      
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minLoadingTime - elapsed);
      await new Promise(resolve => setTimeout(resolve, remaining));
      
      if (isMountedRef.current) {
        setAllItems(itemsData.data || []);
        setPagination(itemsData.pagination || {
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
    filters.server_name,
    filters.database_name,
    filters.health_status,
    filters.access_frequency,
    filters.search
  ]);

  useEffect(() => {
    isMountedRef.current = true;
    const loadData = async () => {
      await fetchAllItems();
      try {
        const metricsData = await governanceCatalogMongoDBApi.getMongoDBMetrics();
        if (isMountedRef.current) {
          setMetrics(metricsData || {});
        }
      } catch (err) {
        console.error("MongoDB: Error loading metrics:", err);
        if (isMountedRef.current) {
          console.error('MongoDB: Error loading metrics:', err);
        }
      }
    };
    loadData();
    const interval = setInterval(() => {
      if (isMountedRef.current) {
        fetchAllItems();
        governanceCatalogMongoDBApi.getMongoDBMetrics().then(metricsData => {
          if (isMountedRef.current) {
            setMetrics(metricsData || {});
          }
        }).catch(err => {
          console.error('MongoDB: Error loading metrics in interval:', err);
        });
      }
    }, 30000);
    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchAllItems]);

  useEffect(() => {
    const fetchDatabases = async () => {
      if (filters.server_name && isMountedRef.current) {
        try {
          const databasesData = await governanceCatalogMongoDBApi.getMongoDBDatabases(filters.server_name as string);
          if (isMountedRef.current) {
            setDatabases(databasesData || []);
          }
        } catch (err) {
          if (isMountedRef.current) {
            console.error('Error loading databases:', err);
          }
        }
      } else {
        setDatabases([]);
      }
    };
    fetchDatabases();
  }, [filters.server_name]);

  const handleItemClick = useCallback((item: any) => {
    setSelectedItem((prev: any) => {
      if (prev?.id === item.id) {
        return null;
      }
      return item;
    });
    setActiveTab('overview');
  }, []);

  const formatBoolean = useCallback((value: boolean | null | undefined) => {
    if (value === null || value === undefined) return 'N/A';
    return value ? 'Yes' : 'No';
  }, []);

  const formatBytes = useCallback((mb: number | string | null | undefined) => {
    if (mb === null || mb === undefined) return 'N/A';
    const num = Number(mb);
    if (isNaN(num)) return 'N/A';
    if (num < 1) return `${(num * 1024).toFixed(2)} KB`;
    return `${num.toFixed(2)} MB`;
  }, []);

  const formatNumber = useCallback((value: number | string | null | undefined) => {
    if (value === null || value === undefined) return 'N/A';
    const num = Number(value);
    if (isNaN(num)) return 'N/A';
    return num.toLocaleString();
  }, []);

  const formatDate = useCallback((date: string | null | undefined) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString();
  }, []);

  const handleFilterChange = useCallback((key: string, value: string) => {
    setFilter(key as any, value);
    if (key === 'server_name') {
      setFilter('database_name' as any, '');
    }
    setPage(1);
  }, [setFilter, setPage]);

  const renderOverviewTab = useCallback((item: any) => {
    return (
      <div>
        <div style={{ marginBottom: 16, paddingBottom: 12, borderBottom: `1px solid ${asciiColors.border}` }}>
          <h3 style={{ fontSize: 13, fontFamily: 'Consolas', fontWeight: 600, color: asciiColors.foreground, margin: '0 0 12px 0', paddingBottom: 4, borderBottom: `2px solid ${asciiColors.accent}` }}>
            Basic Information
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
            <div>
              <div style={{ color: asciiColors.muted, fontWeight: 500, fontSize: 11, marginBottom: 4, fontFamily: 'Consolas' }}>Server:</div>
              <div style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>{item.server_name || 'N/A'}</div>
            </div>
            <div>
              <div style={{ color: asciiColors.muted, fontWeight: 500, fontSize: 11, marginBottom: 4, fontFamily: 'Consolas' }}>Database:</div>
              <div style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>{item.database_name || 'N/A'}</div>
            </div>
            <div>
              <div style={{ color: asciiColors.muted, fontWeight: 500, fontSize: 11, marginBottom: 4, fontFamily: 'Consolas' }}>Collection:</div>
              <div style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>{item.collection_name || 'N/A'}</div>
            </div>
            <div>
              <div style={{ color: asciiColors.muted, fontWeight: 500, fontSize: 11, marginBottom: 4, fontFamily: 'Consolas' }}>Health Status:</div>
              <div style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>
                {item.health_status ? (
                  <span style={{
                    padding: '2px 8px',
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
            <div>
              <div style={{ color: asciiColors.muted, fontWeight: 500, fontSize: 11, marginBottom: 4, fontFamily: 'Consolas' }}>Access Frequency:</div>
              <div style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>{item.access_frequency || 'N/A'}</div>
            </div>
            <div>
              <div style={{ color: asciiColors.muted, fontWeight: 500, fontSize: 11, marginBottom: 4, fontFamily: 'Consolas' }}>Health Score:</div>
              <div style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>
                {item.health_score !== null && item.health_score !== undefined
                  ? `${Number(item.health_score).toFixed(2)}`
                  : 'N/A'}
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 16, paddingBottom: 12, borderBottom: `1px solid ${asciiColors.border}` }}>
          <h3 style={{ fontSize: 13, fontFamily: 'Consolas', fontWeight: 600, color: asciiColors.foreground, margin: '0 0 12px 0', paddingBottom: 4, borderBottom: `2px solid ${asciiColors.accent}` }}>
            Storage
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
            <div>
              <div style={{ color: asciiColors.muted, fontWeight: 500, fontSize: 11, marginBottom: 4, fontFamily: 'Consolas' }}>Document Count:</div>
              <div style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>{formatNumber(item.document_count)}</div>
            </div>
            <div>
              <div style={{ color: asciiColors.muted, fontWeight: 500, fontSize: 11, marginBottom: 4, fontFamily: 'Consolas' }}>Collection Size:</div>
              <div style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>{formatBytes(item.collection_size_mb)}</div>
            </div>
            <div>
              <div style={{ color: asciiColors.muted, fontWeight: 500, fontSize: 11, marginBottom: 4, fontFamily: 'Consolas' }}>Index Size:</div>
              <div style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>{formatBytes(item.index_size_mb)}</div>
            </div>
            <div>
              <div style={{ color: asciiColors.muted, fontWeight: 500, fontSize: 11, marginBottom: 4, fontFamily: 'Consolas' }}>Total Size:</div>
              <div style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>{formatBytes(item.total_size_mb)}</div>
            </div>
            <div>
              <div style={{ color: asciiColors.muted, fontWeight: 500, fontSize: 11, marginBottom: 4, fontFamily: 'Consolas' }}>Storage Size:</div>
              <div style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>{formatBytes(item.storage_size_mb)}</div>
            </div>
            <div>
              <div style={{ color: asciiColors.muted, fontWeight: 500, fontSize: 11, marginBottom: 4, fontFamily: 'Consolas' }}>Avg Object Size:</div>
              <div style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>
                {item.avg_object_size_bytes
                  ? `${(Number(item.avg_object_size_bytes) / 1024).toFixed(2)} KB`
                  : 'N/A'}
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 0 }}>
          <h3 style={{ fontSize: 13, fontFamily: 'Consolas', fontWeight: 600, color: asciiColors.foreground, margin: '0 0 12px 0', paddingBottom: 4, borderBottom: `2px solid ${asciiColors.accent}` }}>
            MongoDB Configuration
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
            <div>
              <div style={{ color: asciiColors.muted, fontWeight: 500, fontSize: 11, marginBottom: 4, fontFamily: 'Consolas' }}>MongoDB Version:</div>
              <div style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>{item.mongodb_version || 'N/A'}</div>
            </div>
            <div>
              <div style={{ color: asciiColors.muted, fontWeight: 500, fontSize: 11, marginBottom: 4, fontFamily: 'Consolas' }}>Storage Engine:</div>
              <div style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>{item.storage_engine || 'N/A'}</div>
            </div>
            <div>
              <div style={{ color: asciiColors.muted, fontWeight: 500, fontSize: 11, marginBottom: 4, fontFamily: 'Consolas' }}>Replica Set:</div>
              <div style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>{item.replica_set_name || 'N/A'}</div>
            </div>
            <div>
              <div style={{ color: asciiColors.muted, fontWeight: 500, fontSize: 11, marginBottom: 4, fontFamily: 'Consolas' }}>Is Sharded:</div>
              <div style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: 2,
                  fontSize: 11,
                  fontFamily: 'Consolas',
                  backgroundColor: getStatusColor(item.is_sharded ? 'WARNING' : 'HEALTHY') + '20',
                  color: getStatusColor(item.is_sharded ? 'WARNING' : 'HEALTHY'),
                  border: `1px solid ${getStatusColor(item.is_sharded ? 'WARNING' : 'HEALTHY')}`
                }}>
                  {formatBoolean(item.is_sharded)}
                </span>
              </div>
            </div>
            <div>
              <div style={{ color: asciiColors.muted, fontWeight: 500, fontSize: 11, marginBottom: 4, fontFamily: 'Consolas' }}>Shard Key:</div>
              <div style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>{item.shard_key || 'N/A'}</div>
            </div>
            <div>
              <div style={{ color: asciiColors.muted, fontWeight: 500, fontSize: 11, marginBottom: 4, fontFamily: 'Consolas' }}>Index Count:</div>
              <div style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>{formatNumber(item.index_count)}</div>
            </div>
            <div>
              <div style={{ color: asciiColors.muted, fontWeight: 500, fontSize: 11, marginBottom: 4, fontFamily: 'Consolas' }}>Snapshot Date:</div>
              <div style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>{formatDate(item.snapshot_date)}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }, [formatBytes, formatNumber, formatBoolean, formatDate]);

  const renderIndexesTab = useCallback((item: any) => {
    return (
      <div>
        <div style={{ marginBottom: 0 }}>
          <h3 style={{ fontSize: 13, fontFamily: 'Consolas', fontWeight: 600, color: asciiColors.foreground, margin: '0 0 12px 0', paddingBottom: 4, borderBottom: `2px solid ${asciiColors.accent}` }}>
            Index Information
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
            <div>
              <div style={{ color: asciiColors.muted, fontWeight: 500, fontSize: 11, marginBottom: 4, fontFamily: 'Consolas' }}>Index Name:</div>
              <div style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>{item.index_name || 'N/A'}</div>
            </div>
            <div>
              <div style={{ color: asciiColors.muted, fontWeight: 500, fontSize: 11, marginBottom: 4, fontFamily: 'Consolas' }}>Index Keys:</div>
              <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'Consolas', fontSize: 12, color: asciiColors.foreground }}>
                {item.index_keys || 'N/A'}
              </div>
            </div>
            <div>
              <div style={{ color: asciiColors.muted, fontWeight: 500, fontSize: 11, marginBottom: 4, fontFamily: 'Consolas' }}>Index Type:</div>
              <div style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>{item.index_type || 'N/A'}</div>
            </div>
            <div>
              <div style={{ color: asciiColors.muted, fontWeight: 500, fontSize: 11, marginBottom: 4, fontFamily: 'Consolas' }}>Unique Index:</div>
              <div style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: 2,
                  fontSize: 11,
                  fontFamily: 'Consolas',
                  backgroundColor: getStatusColor(item.index_unique ? 'HEALTHY' : 'WARNING') + '20',
                  color: getStatusColor(item.index_unique ? 'HEALTHY' : 'WARNING'),
                  border: `1px solid ${getStatusColor(item.index_unique ? 'HEALTHY' : 'WARNING')}`
                }}>
                  {formatBoolean(item.index_unique)}
                </span>
              </div>
            </div>
            <div>
              <div style={{ color: asciiColors.muted, fontWeight: 500, fontSize: 11, marginBottom: 4, fontFamily: 'Consolas' }}>Sparse Index:</div>
              <div style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: 2,
                  fontSize: 11,
                  fontFamily: 'Consolas',
                  backgroundColor: getStatusColor(item.index_sparse ? 'WARNING' : 'HEALTHY') + '20',
                  color: getStatusColor(item.index_sparse ? 'WARNING' : 'HEALTHY'),
                  border: `1px solid ${getStatusColor(item.index_sparse ? 'WARNING' : 'HEALTHY')}`
                }}>
                  {formatBoolean(item.index_sparse)}
                </span>
              </div>
            </div>
            <div>
              <div style={{ color: asciiColors.muted, fontWeight: 500, fontSize: 11, marginBottom: 4, fontFamily: 'Consolas' }}>Index Size:</div>
              <div style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>{formatBytes(item.index_size_mb)}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }, [formatBoolean, formatBytes]);

  const renderPerformanceTab = useCallback((item: any) => {
    return (
      <div>
        <div style={{ marginBottom: 16, paddingBottom: 12, borderBottom: `1px solid ${asciiColors.border}` }}>
          <h3 style={{ fontSize: 13, fontFamily: 'Consolas', fontWeight: 600, color: asciiColors.foreground, margin: '0 0 12px 0', paddingBottom: 4, borderBottom: `2px solid ${asciiColors.accent}` }}>
            Performance Metrics
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
            <div>
              <div style={{ color: asciiColors.muted, fontWeight: 500, fontSize: 11, marginBottom: 4, fontFamily: 'Consolas' }}>Health Score:</div>
              <div style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>
                {item.health_score !== null && item.health_score !== undefined
                  ? `${Number(item.health_score).toFixed(2)}`
                  : 'N/A'}
              </div>
            </div>
            <div>
              <div style={{ color: asciiColors.muted, fontWeight: 500, fontSize: 11, marginBottom: 4, fontFamily: 'Consolas' }}>Document Count:</div>
              <div style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>{formatNumber(item.document_count)}</div>
            </div>
            <div>
              <div style={{ color: asciiColors.muted, fontWeight: 500, fontSize: 11, marginBottom: 4, fontFamily: 'Consolas' }}>Total Size:</div>
              <div style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>{formatBytes(item.total_size_mb)}</div>
            </div>
            <div>
              <div style={{ color: asciiColors.muted, fontWeight: 500, fontSize: 11, marginBottom: 4, fontFamily: 'Consolas' }}>Index Count:</div>
              <div style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>{formatNumber(item.index_count)}</div>
            </div>
            <div>
              <div style={{ color: asciiColors.muted, fontWeight: 500, fontSize: 11, marginBottom: 4, fontFamily: 'Consolas' }}>Avg Object Size:</div>
              <div style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>
                {item.avg_object_size_bytes
                  ? `${(Number(item.avg_object_size_bytes) / 1024).toFixed(2)} KB`
                  : 'N/A'}
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 0 }}>
          <h3 style={{ fontSize: 13, fontFamily: 'Consolas', fontWeight: 600, color: asciiColors.foreground, margin: '0 0 12px 0', paddingBottom: 4, borderBottom: `2px solid ${asciiColors.accent}` }}>
            Sharding
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
            <div>
              <div style={{ color: asciiColors.muted, fontWeight: 500, fontSize: 11, marginBottom: 4, fontFamily: 'Consolas' }}>Is Sharded:</div>
              <div style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: 2,
                  fontSize: 11,
                  fontFamily: 'Consolas',
                  backgroundColor: getStatusColor(item.is_sharded ? 'WARNING' : 'HEALTHY') + '20',
                  color: getStatusColor(item.is_sharded ? 'WARNING' : 'HEALTHY'),
                  border: `1px solid ${getStatusColor(item.is_sharded ? 'WARNING' : 'HEALTHY')}`
                }}>
                  {formatBoolean(item.is_sharded)}
                </span>
              </div>
            </div>
            <div>
              <div style={{ color: asciiColors.muted, fontWeight: 500, fontSize: 11, marginBottom: 4, fontFamily: 'Consolas' }}>Shard Key:</div>
              <div style={{ fontFamily: 'Consolas', fontSize: 12, color: asciiColors.foreground }}>
                {item.shard_key || 'N/A'}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }, [formatBytes, formatNumber, formatBoolean]);

  const renderRecommendationsTab = useCallback((item: any) => {
    return (
      <div>
        <div style={{ marginBottom: 0 }}>
          <h3 style={{ fontSize: 13, fontFamily: 'Consolas', fontWeight: 600, color: asciiColors.foreground, margin: '0 0 12px 0', paddingBottom: 4, borderBottom: `2px solid ${asciiColors.accent}` }}>
            Recommendations
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
            <div>
              <div style={{ color: asciiColors.muted, fontWeight: 500, fontSize: 11, marginBottom: 4, fontFamily: 'Consolas' }}>Recommendation Summary:</div>
              <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'Consolas', fontSize: 12, color: asciiColors.foreground }}>
                {item.recommendation_summary || 'No recommendations available'}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }, []);

  const handleExportCSV = useCallback(() => {
    const headers = ["Server", "Database", "Collection", "Document Count", "Size (MB)", "Health", "Access", "Storage Engine"];
    const rows = allItems.map(item => [
      item.server_name || "",
      item.database_name || "",
      item.collection_name || "",
      formatNumber(item.document_count),
      item.total_size_mb || 0,
      item.health_status || "",
      item.access_frequency || "",
      item.storage_engine || ""
    ]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `governance_catalog_mongodb_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [allItems, formatNumber]);

  if (loadingTree && allItems.length === 0) {
    return <SkeletonLoader variant="table" />;
  }

  return (
    <div style={{ padding: "20px", fontFamily: "Consolas", fontSize: 12 }}>
      <h1 style={{
        fontSize: 14,
        fontWeight: 600,
        margin: "0 0 20px 0",
        color: asciiColors.foreground,
        textTransform: "uppercase",
        fontFamily: "Consolas"
      }}>
        <span style={{ color: asciiColors.accent, marginRight: 8 }}>{ascii.blockFull}</span>
        GOVERNANCE CATALOG - MONGODB
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
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
        gap: 12, 
        marginBottom: 24 
      }}>
        <AsciiPanel title="Total Collections">
          <div style={{ fontFamily: 'Consolas', fontSize: 14, fontWeight: 600, color: asciiColors.foreground }}>
            {metrics.total_collections || 0}
          </div>
        </AsciiPanel>
        <AsciiPanel title="Total Size">
          <div style={{ fontFamily: 'Consolas', fontSize: 14, fontWeight: 600, color: asciiColors.foreground }}>
            {formatBytes(metrics.total_size_mb)}
          </div>
        </AsciiPanel>
        <AsciiPanel title="Total Documents">
          <div style={{ fontFamily: 'Consolas', fontSize: 14, fontWeight: 600, color: asciiColors.foreground }}>
            {formatNumber(metrics.total_documents)}
          </div>
        </AsciiPanel>
        <AsciiPanel title="Healthy">
          <div style={{ fontFamily: 'Consolas', fontSize: 14, fontWeight: 600, color: asciiColors.foreground }}>
            {metrics.healthy_count || 0}
          </div>
        </AsciiPanel>
        <AsciiPanel title="Warning">
          <div style={{ fontFamily: 'Consolas', fontSize: 14, fontWeight: 600, color: asciiColors.foreground }}>
            {metrics.warning_count || 0}
          </div>
        </AsciiPanel>
        <AsciiPanel title="Critical">
          <div style={{ fontFamily: 'Consolas', fontSize: 14, fontWeight: 600, color: asciiColors.foreground }}>
            {metrics.critical_count || 0}
          </div>
        </AsciiPanel>
        <AsciiPanel title="Unique Servers">
          <div style={{ fontFamily: 'Consolas', fontSize: 14, fontWeight: 600, color: asciiColors.foreground }}>
            {metrics.unique_servers || 0}
          </div>
        </AsciiPanel>
      </div>

      <AsciiPanel title="FILTERS">
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            value={filters.server_name as string}
            onChange={(e) => handleFilterChange('server_name', e.target.value)}
            style={{
              padding: '4px 8px',
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2,
              fontFamily: 'Consolas',
              fontSize: 12,
              backgroundColor: asciiColors.background,
              color: asciiColors.foreground
            }}
          >
            <option value="">All Servers</option>
            {servers.map(server => (
              <option key={server} value={server}>{server}</option>
            ))}
          </select>
          
          <select
            value={filters.database_name as string}
            onChange={(e) => handleFilterChange('database_name', e.target.value)}
            disabled={!filters.server_name}
            style={{
              padding: '4px 8px',
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2,
              fontFamily: 'Consolas',
              fontSize: 12,
              backgroundColor: asciiColors.background,
              color: asciiColors.foreground,
              opacity: !filters.server_name ? 0.5 : 1
            }}
          >
            <option value="">All Databases</option>
            {databases.map(db => (
              <option key={db} value={db}>{db}</option>
            ))}
          </select>
          
          <select
            value={filters.health_status as string}
            onChange={(e) => handleFilterChange('health_status', e.target.value)}
            style={{
              padding: '4px 8px',
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2,
              fontFamily: 'Consolas',
              fontSize: 12,
              backgroundColor: asciiColors.background,
              color: asciiColors.foreground
            }}
          >
            <option value="">All Health Status</option>
            <option value="EXCELLENT">Excellent</option>
            <option value="HEALTHY">Healthy</option>
            <option value="WARNING">Warning</option>
            <option value="CRITICAL">Critical</option>
          </select>
          
          <select
            value={filters.access_frequency as string}
            onChange={(e) => handleFilterChange('access_frequency', e.target.value)}
            style={{
              padding: '4px 8px',
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2,
              fontFamily: 'Consolas',
              fontSize: 12,
              backgroundColor: asciiColors.background,
              color: asciiColors.foreground
            }}
          >
            <option value="">All Access Frequency</option>
            <option value="REAL_TIME">Real Time</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
            <option value="RARE">Rare</option>
          </select>
          
          <input
            type="text"
            placeholder="Search collection name..."
            value={filters.search as string}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            style={{
              flex: 1,
              minWidth: '200px',
              padding: '4px 8px',
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2,
              fontFamily: 'Consolas',
              fontSize: 12,
              backgroundColor: asciiColors.background,
              color: asciiColors.foreground
            }}
          />
          
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

      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 24,
        marginTop: 8,
        fontFamily: 'Consolas',
        fontSize: 12,
        gap: 32
      }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
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
              padding: '4px 8px',
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2,
              fontFamily: 'Consolas',
              fontSize: 12,
              backgroundColor: asciiColors.background,
              color: asciiColors.foreground,
              cursor: 'pointer'
            }}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
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
          <AsciiButton
            label="Export CSV"
            onClick={handleExportCSV}
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
            <AsciiPanel title="METRICS PLAYBOOK - MONGODB GOVERNANCE">
              <div style={{ padding: 16, fontFamily: 'Consolas', fontSize: 12, lineHeight: 1.6 }}>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.accent, marginBottom: 8 }}>
                    {ascii.blockFull} Total Collections
                  </div>
                  <div style={{ color: asciiColors.foreground, marginLeft: 16 }}>
                    Total number of collections cataloged across all MongoDB servers and databases in the governance system.
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.accent, marginBottom: 8 }}>
                    {ascii.blockFull} Total Size
                  </div>
                  <div style={{ color: asciiColors.foreground, marginLeft: 16 }}>
                    Combined storage size of all collections across all MongoDB databases. Includes data and index sizes.
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.accent, marginBottom: 8 }}>
                    {ascii.blockFull} Total Documents
                  </div>
                  <div style={{ color: asciiColors.foreground, marginLeft: 16 }}>
                    Total number of documents across all MongoDB collections in the governance catalog.
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.success, marginBottom: 8 }}>
                    {ascii.blockFull} Healthy
                  </div>
                  <div style={{ color: asciiColors.foreground, marginLeft: 16 }}>
                    Collections with HEALTHY status, indicating optimal performance, proper indexing, and good access patterns.
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.warning, marginBottom: 8 }}>
                    {ascii.blockFull} Warning
                  </div>
                  <div style={{ color: asciiColors.foreground, marginLeft: 16 }}>
                    Collections with WARNING status, indicating potential issues such as missing indexes, 
                    suboptimal sharding, or performance concerns that should be monitored.
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.danger, marginBottom: 8 }}>
                    {ascii.blockFull} Critical
                  </div>
                  <div style={{ color: asciiColors.foreground, marginLeft: 16 }}>
                    Collections with CRITICAL status, indicating serious issues requiring immediate attention such as 
                    missing critical indexes, sharding problems, or severe performance degradation.
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
                    {ascii.blockSemi} Note
                  </div>
                  <div style={{ fontSize: 11, color: asciiColors.foreground }}>
                    These metrics are calculated in real-time from the data_governance_catalog_mongodb table and reflect 
                    the current state of your MongoDB governance catalog.
                  </div>
                </div>

                <div style={{ marginTop: 16, textAlign: 'right' }}>
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
        <GovernanceCatalogCharts 
          engine="mongodb"
          selectedItem={selectedItem ? {
            server_name: selectedItem.server_name,
            database_name: selectedItem.database_name,
            collection_name: selectedItem.collection_name
          } : null}
        />
      )}

      {activeView === 'list' && loadingTree ? (
        <LoadingOverlay>Loading tree view...</LoadingOverlay>
      ) : activeView === 'list' ? (
        <>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: selectedItem ? '1fr 500px' : '1fr', 
            gap: 16, 
            marginTop: 16 
          }}>
            <GovernanceCatalogMongoDBTreeView 
              items={allItems} 
              onItemClick={handleItemClick} 
            />
            
            {selectedItem && (
              <div style={{ 
                position: 'sticky', 
                top: 16, 
                maxHeight: 'calc(100vh - 200px)',
                overflowY: 'auto'
              }}>
                <AsciiPanel title="DETAILS">
                <div style={{ 
                  display: 'flex', 
                  gap: 4, 
                  marginBottom: 16, 
                  borderBottom: `1px solid ${asciiColors.border}`, 
                  paddingBottom: 8,
                  flexWrap: 'wrap'
                }}>
                  <AsciiButton
                    label="Overview"
                    onClick={() => setActiveTab('overview')}
                    variant={activeTab === 'overview' ? 'primary' : 'ghost'}
                  />
                  <AsciiButton
                    label="Indexes"
                    onClick={() => setActiveTab('indexes')}
                    variant={activeTab === 'indexes' ? 'primary' : 'ghost'}
                  />
                  <AsciiButton
                    label="Performance"
                    onClick={() => setActiveTab('performance')}
                    variant={activeTab === 'performance' ? 'primary' : 'ghost'}
                  />
                  <AsciiButton
                    label="Recommendations"
                    onClick={() => setActiveTab('recommendations')}
                    variant={activeTab === 'recommendations' ? 'primary' : 'ghost'}
                  />
                </div>
                
                {activeTab === 'overview' && renderOverviewTab(selectedItem)}
                {activeTab === 'indexes' && renderIndexesTab(selectedItem)}
                {activeTab === 'performance' && renderPerformanceTab(selectedItem)}
                {activeTab === 'recommendations' && renderRecommendationsTab(selectedItem)}
                </AsciiPanel>
              </div>
            )}
          </div>
          
          {pagination.totalPages > 1 && (
            <div style={{ marginTop: 24 }}>
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
      ) : null}
    </div>
  );
};

export default GovernanceCatalogMongoDB;
