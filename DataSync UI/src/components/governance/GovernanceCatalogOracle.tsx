import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import {
  Container,
  LoadingOverlay,
  Pagination,
  PageButton,
} from '../shared/BaseComponents';
import { usePagination } from '../../hooks/usePagination';
import { useTableFilters } from '../../hooks/useTableFilters';
import { governanceCatalogOracleApi } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import { sanitizeSearch } from '../../utils/validation';
import { theme } from '../../theme/theme';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import GovernanceCatalogOracleTreeView from './GovernanceCatalogOracleTreeView';
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
 * Governance Catalog component for Oracle
 * Displays governance metadata for Oracle tables including health status, access frequency, and recommendations
 */
const GovernanceCatalogOracle = () => {
  const { page, limit, setPage, setLimit } = usePagination(1, 20, 1000);
  const { filters, setFilter, clearFilters } = useTableFilters({
    server_name: '',
    schema_name: '',
    health_status: '',
    access_frequency: '',
    search: ''
  });
  
  const [sortField, setSortField] = useState<string>("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>({});
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
    currentPage: 1,
    limit: 20
  });
  const [servers, setServers] = useState<string[]>([]);
  const [schemas, setSchemas] = useState<string[]>([]);
  const [allItems, setAllItems] = useState<any[]>([]);
  const [loadingTree, setLoadingTree] = useState(true);
  const [showMetricsPlaybook, setShowMetricsPlaybook] = useState(false);
  const [activeView, setActiveView] = useState<'list' | 'charts'>('list');
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'recommendations'>('overview');
  const isMountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    const startTime = Date.now();
    const minLoadingTime = 300;
    
    try {
      setLoading(true);
      setError(null);
      const sanitizedSearch = sanitizeSearch(filters.search as string, 100);
      const [itemsData, metricsData, serversData] = await Promise.all([
        governanceCatalogOracleApi.getOracleItems({
          page,
          limit,
          server_name: filters.server_name as string,
          schema_name: filters.schema_name as string,
          health_status: filters.health_status as string,
          access_frequency: filters.access_frequency as string,
          search: sanitizedSearch
        }),
        governanceCatalogOracleApi.getOracleMetrics(),
        governanceCatalogOracleApi.getOracleServers()
      ]);
      
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minLoadingTime - elapsed);
      await new Promise(resolve => setTimeout(resolve, remaining));
      
      if (isMountedRef.current) {
        setItems(itemsData.data || []);
        setPagination(itemsData.pagination || {
          total: 0,
          totalPages: 0,
          currentPage: 1,
          limit: 20
        });
        setMetrics(metricsData || {});
        setServers(serversData || []);
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
  }, [
    page, 
    limit, 
    filters.server_name, 
    filters.schema_name, 
    filters.health_status, 
    filters.access_frequency, 
    filters.search
  ]);

  const fetchAllItems = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    const startTime = Date.now();
    const minLoadingTime = 300;
    
    try {
      setLoadingTree(true);
      setError(null);
      const sanitizedSearch = sanitizeSearch(filters.search as string, 100);
      const itemsData = await governanceCatalogOracleApi.getOracleItems({
        page,
        limit,
        server_name: filters.server_name as string,
        schema_name: filters.schema_name as string,
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
    filters.schema_name,
    filters.health_status,
    filters.access_frequency,
    filters.search
  ]);

  useEffect(() => {
    isMountedRef.current = true;
    const loadData = async () => {
      await fetchAllItems();
      try {
        const metricsData = await governanceCatalogOracleApi.getOracleMetrics();
        if (isMountedRef.current) {
          setMetrics(metricsData || {});
        }
      } catch (err) {
        console.error("Oracle: Error loading metrics:", err);
        if (isMountedRef.current) {
          console.error('Oracle: Error loading metrics:', err);
        }
      }
    };
    loadData();
    const interval = setInterval(() => {
      if (isMountedRef.current) {
        fetchAllItems();
        governanceCatalogOracleApi.getOracleMetrics().then(metricsData => {
          if (isMountedRef.current) {
            setMetrics(metricsData || {});
          }
        }).catch(err => {
          console.error('Oracle: Error loading metrics in interval:', err);
        });
      }
    }, 30000);
    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchAllItems]);

  useEffect(() => {
    const fetchSchemas = async () => {
      if (filters.server_name && isMountedRef.current) {
        try {
          const schemasData = await governanceCatalogOracleApi.getOracleSchemas(filters.server_name as string);
          if (isMountedRef.current) {
            setSchemas(schemasData || []);
          }
        } catch (err) {
          if (isMountedRef.current) {
            console.error('Error loading schemas:', err);
          }
        }
      } else {
        setSchemas([]);
      }
    };
    fetchSchemas();
  }, [filters.server_name]);

  const handleItemClick = useCallback((item: any) => {
    if (!item) return;
    
    setSelectedItem((prev: any) => {
      if (prev && item.id && prev.id === item.id) {
        return null;
      }
      return item;
    });
    setActiveTab('overview');
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

  const formatPercentage = useCallback((value: number | string | null | undefined) => {
    if (value === null || value === undefined) return 'N/A';
    const num = Number(value);
    if (isNaN(num)) return 'N/A';
    return `${num.toFixed(2)}%`;
  }, []);

  const handleFilterChange = useCallback((key: string, value: string) => {
    setFilter(key as any, value);
    if (key === 'server_name') {
      setFilter('schema_name' as any, '');
    }
    setPage(1);
  }, [setFilter, setPage]);

  const handleSort = useCallback((field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
    setPage(1);
  }, [sortField, setPage]);

  const sortedItems = useMemo(() => {
    if (!sortField) return items;
    return [...items].sort((a, b) => {
      let aVal: any = a[sortField as keyof typeof a];
      let bVal: any = b[sortField as keyof typeof b];
      
      if (aVal === null || aVal === undefined) aVal = "";
      if (bVal === null || bVal === undefined) bVal = "";
      
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDirection === "asc" 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      
      const aNum = Number(aVal);
      const bNum = Number(bVal);
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return sortDirection === "asc" ? aNum - bNum : bNum - aNum;
      }
      
      return sortDirection === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [items, sortField, sortDirection]);

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
              <div style={{ color: asciiColors.muted, fontWeight: 500, fontSize: 11, marginBottom: 4, fontFamily: 'Consolas' }}>Schema:</div>
              <div style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>{item.schema_name || 'N/A'}</div>
            </div>
            <div>
              <div style={{ color: asciiColors.muted, fontWeight: 500, fontSize: 11, marginBottom: 4, fontFamily: 'Consolas' }}>Table:</div>
              <div style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>{item.table_name || 'N/A'}</div>
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
          </div>
        </div>

        <div style={{ marginBottom: 0 }}>
          <h3 style={{ fontSize: 13, fontFamily: 'Consolas', fontWeight: 600, color: asciiColors.foreground, margin: '0 0 12px 0', paddingBottom: 4, borderBottom: `2px solid ${asciiColors.accent}` }}>
            Storage
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
            <div>
              <div style={{ color: asciiColors.muted, fontWeight: 500, fontSize: 11, marginBottom: 4, fontFamily: 'Consolas' }}>Row Count:</div>
              <div style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>{formatNumber(item.row_count || item.num_rows)}</div>
            </div>
            <div>
              <div style={{ color: asciiColors.muted, fontWeight: 500, fontSize: 11, marginBottom: 4, fontFamily: 'Consolas' }}>Table Size:</div>
              <div style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>{formatBytes(item.table_size_mb)}</div>
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
              <div style={{ color: asciiColors.muted, fontWeight: 500, fontSize: 11, marginBottom: 4, fontFamily: 'Consolas' }}>Tablespace:</div>
              <div style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>{item.tablespace_name || 'N/A'}</div>
            </div>
            <div>
              <div style={{ color: asciiColors.muted, fontWeight: 500, fontSize: 11, marginBottom: 4, fontFamily: 'Consolas' }}>Fragmentation:</div>
              <div style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>{formatPercentage(item.fragmentation_pct)}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }, [formatBytes, formatNumber, formatPercentage]);

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
              <div style={{ color: asciiColors.muted, fontWeight: 500, fontSize: 11, marginBottom: 4, fontFamily: 'Consolas' }}>Fragmentation:</div>
              <div style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>{formatPercentage(item.fragmentation_pct)}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }, [formatPercentage]);

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
    const headers = ["Server", "Schema", "Table", "Rows", "Size (MB)", "Health", "Access", "Tablespace"];
    const rows = sortedItems.map(item => [
      item.server_name || "",
      item.schema_name || "",
      item.table_name || "",
      formatNumber(item.row_count),
      item.total_size_mb || 0,
      item.health_status || "",
      item.access_frequency || "",
      item.tablespace_name || ""
    ]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `governance_catalog_oracle_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [sortedItems, formatNumber]);

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
          GOVERNANCE CATALOG - ORACLE
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
        <AsciiPanel title="Total Tables">
          <div style={{ fontFamily: 'Consolas', fontSize: 14, fontWeight: 600, color: asciiColors.foreground }}>
            {metrics.total_tables || 0}
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
            value={filters.schema_name as string}
            onChange={(e) => handleFilterChange('schema_name', e.target.value)}
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
            <option value="">All Schemas</option>
            {schemas.map(schema => (
              <option key={schema} value={schema}>{schema}</option>
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
            placeholder="Search table name..."
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
            <AsciiPanel title="METRICS PLAYBOOK - ORACLE GOVERNANCE">
              <div style={{ padding: 16, fontFamily: 'Consolas', fontSize: 12, lineHeight: 1.6 }}>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.accent, marginBottom: 8 }}>
                    {ascii.blockFull} Total Tables
                  </div>
                  <div style={{ color: asciiColors.foreground, marginLeft: 16 }}>
                    Total number of tables cataloged across all Oracle servers and schemas in the governance system.
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.accent, marginBottom: 8 }}>
                    {ascii.blockFull} Total Size
                  </div>
                  <div style={{ color: asciiColors.foreground, marginLeft: 16 }}>
                    Combined storage size of all tables across all Oracle databases. Includes data and index sizes from tablespaces.
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.accent, marginBottom: 8 }}>
                    {ascii.blockFull} Total Rows
                  </div>
                  <div style={{ color: asciiColors.foreground, marginLeft: 16 }}>
                    Total number of rows across all Oracle tables in the governance catalog.
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.success, marginBottom: 8 }}>
                    {ascii.blockFull} Healthy
                  </div>
                  <div style={{ color: asciiColors.foreground, marginLeft: 16 }}>
                    Tables with HEALTHY status, indicating optimal performance, low fragmentation, proper indexing, and good access patterns.
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.warning, marginBottom: 8 }}>
                    {ascii.blockFull} Warning
                  </div>
                  <div style={{ color: asciiColors.foreground, marginLeft: 16 }}>
                    Tables with WARNING status, indicating potential issues such as moderate fragmentation, 
                    suboptimal indexes, or performance concerns that should be monitored.
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.danger, marginBottom: 8 }}>
                    {ascii.blockFull} Critical
                  </div>
                  <div style={{ color: asciiColors.foreground, marginLeft: 16 }}>
                    Tables with CRITICAL status, indicating serious issues requiring immediate attention such as 
                    high fragmentation, missing indexes, or severe performance degradation.
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.accent, marginBottom: 8 }}>
                    {ascii.blockFull} Unique Servers
                  </div>
                  <div style={{ color: asciiColors.foreground, marginLeft: 16 }}>
                    Number of distinct Oracle server instances being monitored in the governance catalog.
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
                    These metrics are calculated in real-time from the data_governance_catalog_oracle table and reflect 
                    the current state of your Oracle governance catalog.
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
          engine="oracle"
          selectedItem={selectedItem ? {
            server_name: selectedItem.server_name,
            schema_name: selectedItem.schema_name,
            table_name: selectedItem.table_name
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
            <GovernanceCatalogOracleTreeView items={allItems} onItemClick={handleItemClick} />
            
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

export default GovernanceCatalogOracle;
