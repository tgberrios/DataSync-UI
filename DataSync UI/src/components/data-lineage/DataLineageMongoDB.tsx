import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import {
  Container,
  LoadingOverlay,
  Pagination,
  PageButton,
  Table,
  Th,
  Td,
  TableRow,
} from '../shared/BaseComponents';
import { usePagination } from '../../hooks/usePagination';
import { useTableFilters } from '../../hooks/useTableFilters';
import { dataLineageMongoDBApi } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import { sanitizeSearch } from '../../utils/validation';
import { theme } from '../../theme/theme';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import DataLineageMongoDBTreeView from './DataLineageMongoDBTreeView';

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

const getConfidenceColor = (score: number | string | null | undefined) => {
  if (score === null || score === undefined) return asciiColors.muted;
  const numScore = Number(score);
  if (isNaN(numScore)) return asciiColors.muted;
  if (numScore >= 0.8) return asciiColors.success;
  if (numScore >= 0.5) return asciiColors.warning;
  return asciiColors.danger;
};

const DataLineageMongoDB = () => {
  const { page, limit, setPage } = usePagination(1, 20);
  const { filters, setFilter, clearFilters } = useTableFilters({
    server_name: '',
    database_name: '',
    relationship_type: '',
    search: ''
  });
  
  const [sortField, setSortField] = useState<string>("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lineage, setLineage] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>({});
  const [openEdgeId, setOpenEdgeId] = useState<number | null>(null);
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
    currentPage: 1,
    limit: 20
  });
  const [servers, setServers] = useState<string[]>([]);
  const [databases, setDatabases] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"table" | "tree">("tree");
  const [allEdges, setAllEdges] = useState<any[]>([]);
  const [loadingTree, setLoadingTree] = useState(false);
  const isMountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    if (!isMountedRef.current) return;
    try {
      setLoading(true);
      setError(null);
      const sanitizedSearch = sanitizeSearch(filters.search as string, 100);
      const [lineageData, metricsData, serversData] = await Promise.all([
        dataLineageMongoDBApi.getMongoDBLineage({
          page,
          limit,
          server_name: filters.server_name as string,
          database_name: filters.database_name as string,
          relationship_type: filters.relationship_type as string,
          search: sanitizedSearch
        }),
        dataLineageMongoDBApi.getMongoDBMetrics(),
        dataLineageMongoDBApi.getMongoDBServers()
      ]);
      if (isMountedRef.current) {
        setLineage(lineageData.data || []);
        setPagination(lineageData.pagination || {
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
    filters.database_name, 
    filters.relationship_type, 
    filters.search
  ]);

  const fetchMetrics = useCallback(async () => {
    if (!isMountedRef.current) return;
    try {
      const metricsData = await dataLineageMongoDBApi.getMongoDBMetrics().catch(err => {
        console.error("MongoDB getMongoDBMetrics error:", err);
        throw err;
      });
      if (isMountedRef.current) {
        setMetrics(metricsData || {});
      }
    } catch (err) {
      console.error("MongoDB fetchMetrics error:", err);
    }
  }, []);

  const fetchAllEdges = useCallback(async () => {
    if (!isMountedRef.current) return;
    try {
      setLoadingTree(true);
      setError(null);
      const sanitizedSearch = sanitizeSearch(filters.search as string, 100);
      const lineageData = await dataLineageMongoDBApi.getMongoDBLineage({
        page: 1,
        limit: 10000,
        server_name: filters.server_name as string,
        database_name: filters.database_name as string,
        relationship_type: filters.relationship_type as string,
        search: sanitizedSearch
      });
      if (isMountedRef.current) {
        setAllEdges(lineageData.data || []);
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
    filters.server_name,
    filters.database_name,
    filters.relationship_type,
    filters.search
  ]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchMetrics();
    if (viewMode === "table") {
      fetchData();
    } else {
      fetchAllEdges();
    }
    const interval = setInterval(() => {
      if (isMountedRef.current) {
        fetchMetrics();
        if (viewMode === "table") {
          fetchData();
        } else {
          fetchAllEdges();
        }
      }
    }, 30000);
    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchData, fetchAllEdges, fetchMetrics, viewMode]);

  useEffect(() => {
    if (viewMode === "tree") {
      fetchAllEdges();
    }
  }, [viewMode, fetchAllEdges]);

  useEffect(() => {
    const fetchDatabases = async () => {
      if (filters.server_name && isMountedRef.current) {
        try {
          const databasesData = await dataLineageMongoDBApi.getMongoDBDatabases(filters.server_name as string);
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

  const toggleEdge = useCallback((id: number) => {
    setOpenEdgeId(prev => prev === id ? null : id);
  }, []);

  const formatDate = useCallback((date: string | null | undefined) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString();
  }, []);

  const formatConfidence = useCallback((score: number | string | null | undefined) => {
    if (score === null || score === undefined) return 'N/A';
    const numScore = Number(score);
    if (isNaN(numScore)) return 'N/A';
    return `${(numScore * 100).toFixed(1)}%`;
  }, []);

  const handleFilterChange = useCallback((key: string, value: string) => {
    setFilter(key as any, value);
    if (key === 'server_name') {
      setFilter('database_name' as any, '');
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

  const sortedLineage = useMemo(() => {
    if (!sortField) return lineage;
    return [...lineage].sort((a, b) => {
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
  }, [lineage, sortField, sortDirection]);

  const handleExportCSV = useCallback(() => {
    const headers = ["Source Collection", "Source Field", "Relationship", "Target Collection", "Target Field", "Server", "Database", "Confidence", "Method"];
    const rows = sortedLineage.map(edge => [
      edge.source_collection || "",
      edge.source_field || "",
      edge.relationship_type || "",
      edge.target_collection || "",
      edge.target_field || "",
      edge.server_name || "",
      edge.database_name || "",
      formatConfidence(edge.confidence_score),
      edge.discovery_method || ""
    ]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `lineage_mongodb_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [sortedLineage, formatConfidence]);

  if ((loading && lineage.length === 0 && viewMode === "table") || (loadingTree && allEdges.length === 0 && viewMode === "tree")) {
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
          DATA LINEAGE - MONGODB
        </h1>
        <LoadingOverlay>Loading data lineage...</LoadingOverlay>
      </div>
    );
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
        DATA LINEAGE - MONGODB
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
        <AsciiPanel title="Total Relationships">
          <div style={{ fontFamily: 'Consolas', fontSize: 14, fontWeight: 600, color: asciiColors.foreground }}>
            {metrics.total_relationships || 0}
          </div>
        </AsciiPanel>
        <AsciiPanel title="Unique Collections">
          <div style={{ fontFamily: 'Consolas', fontSize: 14, fontWeight: 600, color: asciiColors.foreground }}>
            {metrics.unique_collections || 0}
          </div>
        </AsciiPanel>
        <AsciiPanel title="Unique Servers">
          <div style={{ fontFamily: 'Consolas', fontSize: 14, fontWeight: 600, color: asciiColors.foreground }}>
            {metrics.unique_servers || 0}
          </div>
        </AsciiPanel>
        <AsciiPanel title="Unique Databases">
          <div style={{ fontFamily: 'Consolas', fontSize: 14, fontWeight: 600, color: asciiColors.foreground }}>
            {metrics.unique_databases || 0}
          </div>
        </AsciiPanel>
        <AsciiPanel title="Unique Schemas">
          <div style={{ fontFamily: 'Consolas', fontSize: 14, fontWeight: 600, color: asciiColors.foreground }}>
            {metrics.unique_schemas || 0}
          </div>
        </AsciiPanel>
        <AsciiPanel title="Relationship Types">
          <div style={{ fontFamily: 'Consolas', fontSize: 14, fontWeight: 600, color: asciiColors.foreground }}>
            {metrics.unique_relationship_types || 0}
          </div>
        </AsciiPanel>
        <AsciiPanel title="High Confidence">
          <div style={{ fontFamily: 'Consolas', fontSize: 14, fontWeight: 600, color: asciiColors.foreground }}>
            {metrics.high_confidence || 0}
          </div>
        </AsciiPanel>
        <AsciiPanel title="Low Confidence">
          <div style={{ fontFamily: 'Consolas', fontSize: 14, fontWeight: 600, color: asciiColors.foreground }}>
            {metrics.low_confidence || 0}
          </div>
        </AsciiPanel>
        <AsciiPanel title="Avg Confidence">
          <div style={{ fontFamily: 'Consolas', fontSize: 14, fontWeight: 600, color: asciiColors.foreground }}>
            {metrics.avg_confidence ? `${(Number(metrics.avg_confidence) * 100).toFixed(1)}%` : 'N/A'}
          </div>
        </AsciiPanel>
        <AsciiPanel title="Avg Dependency Level">
          <div style={{ fontFamily: 'Consolas', fontSize: 14, fontWeight: 600, color: asciiColors.foreground }}>
            {metrics.avg_dependency_level ? Number(metrics.avg_dependency_level).toFixed(1) : 'N/A'}
          </div>
        </AsciiPanel>
        <AsciiPanel title="Discovered (24h)">
          <div style={{ fontFamily: 'Consolas', fontSize: 14, fontWeight: 600, color: asciiColors.foreground }}>
            {metrics.discovered_last_24h || 0}
          </div>
        </AsciiPanel>
        <AsciiPanel title="Discovery Methods">
          <div style={{ fontFamily: 'Consolas', fontSize: 14, fontWeight: 600, color: asciiColors.foreground }}>
            {metrics.unique_discovery_methods || 0}
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
            value={filters.relationship_type as string}
            onChange={(e) => handleFilterChange('relationship_type', e.target.value)}
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
            <option value="">All Relationships</option>
            <option value="VIEW_DEPENDENCY">VIEW_DEPENDENCY</option>
            <option value="AGGREGATION_PIPELINE">AGGREGATION_PIPELINE</option>
            <option value="REFERENCE">REFERENCE</option>
            <option value="EMBEDDED">EMBEDDED</option>
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
        marginBottom: 16,
        fontFamily: 'Consolas',
        fontSize: 12
      }}>
        <div style={{ color: asciiColors.muted }}>
          {viewMode === "table" 
            ? `Showing ${sortedLineage.length} of ${pagination.total} relationships (Page ${pagination.currentPage} of ${pagination.totalPages})`
            : `Total: ${allEdges.length} relationships`
          }
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <AsciiButton
            label="Table View"
            onClick={() => setViewMode("table")}
            variant={viewMode === "table" ? "primary" : "ghost"}
          />
          <AsciiButton
            label="Tree View"
            onClick={() => {
              setViewMode("tree");
              fetchAllEdges();
            }}
            variant={viewMode === "tree" ? "primary" : "ghost"}
          />
          <AsciiButton
            label="Export CSV"
            onClick={handleExportCSV}
            variant="ghost"
          />
        </div>
      </div>

      {viewMode === "tree" ? (
        loadingTree ? (
          <LoadingOverlay>Loading tree view...</LoadingOverlay>
        ) : (
          <DataLineageMongoDBTreeView edges={allEdges} onEdgeClick={(edge) => toggleEdge(edge.id)} />
        )
      ) : (
        <AsciiPanel title="LINEAGE RELATIONSHIPS">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ 
              width: '100%', 
              minWidth: '1400px',
              borderCollapse: 'collapse',
              fontFamily: 'Consolas',
              fontSize: 12
            }}>
              <thead>
                <tr>
                  <th 
                    onClick={() => handleSort("source_collection")}
                    style={{
                      padding: '8px',
                      textAlign: 'left',
                      borderBottom: `2px solid ${asciiColors.border}`,
                      cursor: 'pointer',
                      fontFamily: 'Consolas',
                      fontSize: 12,
                      fontWeight: 600,
                      color: sortField === "source_collection" ? asciiColors.accent : asciiColors.foreground,
                      backgroundColor: sortField === "source_collection" ? asciiColors.accentLight : 'transparent'
                    }}
                  >
                    Source Collection {sortField === "source_collection" ? (sortDirection === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th 
                    onClick={() => handleSort("source_field")}
                    style={{
                      padding: '8px',
                      textAlign: 'left',
                      borderBottom: `2px solid ${asciiColors.border}`,
                      cursor: 'pointer',
                      fontFamily: 'Consolas',
                      fontSize: 12,
                      fontWeight: 600,
                      color: sortField === "source_field" ? asciiColors.accent : asciiColors.foreground,
                      backgroundColor: sortField === "source_field" ? asciiColors.accentLight : 'transparent'
                    }}
                  >
                    Source Field {sortField === "source_field" ? (sortDirection === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th 
                    onClick={() => handleSort("relationship_type")}
                    style={{
                      padding: '8px',
                      textAlign: 'left',
                      borderBottom: `2px solid ${asciiColors.border}`,
                      cursor: 'pointer',
                      fontFamily: 'Consolas',
                      fontSize: 12,
                      fontWeight: 600,
                      color: sortField === "relationship_type" ? asciiColors.accent : asciiColors.foreground,
                      backgroundColor: sortField === "relationship_type" ? asciiColors.accentLight : 'transparent'
                    }}
                  >
                    Relationship {sortField === "relationship_type" ? (sortDirection === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th 
                    onClick={() => handleSort("target_collection")}
                    style={{
                      padding: '8px',
                      textAlign: 'left',
                      borderBottom: `2px solid ${asciiColors.border}`,
                      cursor: 'pointer',
                      fontFamily: 'Consolas',
                      fontSize: 12,
                      fontWeight: 600,
                      color: sortField === "target_collection" ? asciiColors.accent : asciiColors.foreground,
                      backgroundColor: sortField === "target_collection" ? asciiColors.accentLight : 'transparent'
                    }}
                  >
                    Target Collection {sortField === "target_collection" ? (sortDirection === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th 
                    onClick={() => handleSort("target_field")}
                    style={{
                      padding: '8px',
                      textAlign: 'left',
                      borderBottom: `2px solid ${asciiColors.border}`,
                      cursor: 'pointer',
                      fontFamily: 'Consolas',
                      fontSize: 12,
                      fontWeight: 600,
                      color: sortField === "target_field" ? asciiColors.accent : asciiColors.foreground,
                      backgroundColor: sortField === "target_field" ? asciiColors.accentLight : 'transparent'
                    }}
                  >
                    Target Field {sortField === "target_field" ? (sortDirection === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th 
                    onClick={() => handleSort("server_name")}
                    style={{
                      padding: '8px',
                      textAlign: 'left',
                      borderBottom: `2px solid ${asciiColors.border}`,
                      cursor: 'pointer',
                      fontFamily: 'Consolas',
                      fontSize: 12,
                      fontWeight: 600,
                      color: sortField === "server_name" ? asciiColors.accent : asciiColors.foreground,
                      backgroundColor: sortField === "server_name" ? asciiColors.accentLight : 'transparent'
                    }}
                  >
                    Server {sortField === "server_name" ? (sortDirection === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th 
                    onClick={() => handleSort("database_name")}
                    style={{
                      padding: '8px',
                      textAlign: 'left',
                      borderBottom: `2px solid ${asciiColors.border}`,
                      cursor: 'pointer',
                      fontFamily: 'Consolas',
                      fontSize: 12,
                      fontWeight: 600,
                      color: sortField === "database_name" ? asciiColors.accent : asciiColors.foreground,
                      backgroundColor: sortField === "database_name" ? asciiColors.accentLight : 'transparent'
                    }}
                  >
                    Database {sortField === "database_name" ? (sortDirection === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th 
                    onClick={() => handleSort("confidence_score")}
                    style={{
                      padding: '8px',
                      textAlign: 'left',
                      borderBottom: `2px solid ${asciiColors.border}`,
                      cursor: 'pointer',
                      fontFamily: 'Consolas',
                      fontSize: 12,
                      fontWeight: 600,
                      color: sortField === "confidence_score" ? asciiColors.accent : asciiColors.foreground,
                      backgroundColor: sortField === "confidence_score" ? asciiColors.accentLight : 'transparent'
                    }}
                  >
                    Confidence {sortField === "confidence_score" ? (sortDirection === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th style={{
                    padding: '8px',
                    textAlign: 'left',
                    borderBottom: `2px solid ${asciiColors.border}`,
                    fontFamily: 'Consolas',
                    fontSize: 12,
                    fontWeight: 600
                  }}>
                    Method
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedLineage.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ padding: '60px 40px', textAlign: 'center', color: asciiColors.muted, fontFamily: 'Consolas' }}>
                      <div style={{ fontSize: 48, marginBottom: 16, fontFamily: 'Consolas', opacity: 0.5 }}>
                        {ascii.arrowRight}
                      </div>
                      <div style={{ fontSize: 13, fontFamily: 'Consolas', fontWeight: 600, marginBottom: 8, color: asciiColors.foreground }}>
                        No lineage data available
                      </div>
                      <div style={{ fontSize: 12, fontFamily: 'Consolas', opacity: 0.7, color: asciiColors.muted }}>
                        Lineage relationships will appear here once extracted.
                      </div>
                    </td>
                  </tr>
                ) : (
                  sortedLineage.map((edge, index) => (
                    <React.Fragment key={edge.id}>
                      <tr 
                        onClick={() => toggleEdge(edge.id)} 
                        style={{ 
                          cursor: 'pointer',
                          borderBottom: `1px solid ${asciiColors.border}`,
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = asciiColors.backgroundSoft;
                          e.currentTarget.style.transform = 'translateX(4px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.transform = 'translateX(0)';
                        }}
                      >
                        <td style={{ padding: '8px', fontFamily: 'Consolas', fontSize: 12 }}>
                          <strong style={{ color: asciiColors.accent }}>
                            {edge.source_collection || 'N/A'}
                          </strong>
                          {edge.source_field && (
                            <div style={{ fontSize: 11, color: asciiColors.muted, fontFamily: 'Consolas' }}>.{edge.source_field}</div>
                          )}
                        </td>
                        <td style={{ padding: '8px', color: asciiColors.muted, fontFamily: 'Consolas', fontSize: 12 }}>
                          {edge.source_field || 'N/A'}
                        </td>
                        <td style={{ padding: '8px', fontFamily: 'Consolas', fontSize: 12 }}>
                          <div style={{ color: asciiColors.accent, fontSize: 14, fontWeight: 'bold' }}>
                            {ascii.arrowRight}
                          </div>
                          <div style={{ fontSize: 11, color: asciiColors.muted, marginTop: 4, fontFamily: 'Consolas' }}>
                            {edge.relationship_type || 'N/A'}
                          </div>
                        </td>
                        <td style={{ padding: '8px', fontFamily: 'Consolas', fontSize: 12 }}>
                          <strong style={{ color: asciiColors.foreground }}>{edge.target_collection || 'N/A'}</strong>
                          {edge.target_field && (
                            <div style={{ fontSize: 11, color: asciiColors.muted, fontFamily: 'Consolas' }}>.{edge.target_field}</div>
                          )}
                        </td>
                        <td style={{ padding: '8px', color: asciiColors.muted, fontFamily: 'Consolas', fontSize: 12 }}>
                          {edge.target_field || 'N/A'}
                        </td>
                        <td style={{ padding: '8px', color: asciiColors.muted, fontFamily: 'Consolas', fontSize: 12 }}>
                          {edge.server_name || 'N/A'}
                        </td>
                        <td style={{ padding: '8px', color: asciiColors.muted, fontFamily: 'Consolas', fontSize: 12 }}>
                          {edge.database_name || 'N/A'}
                        </td>
                        <td style={{ padding: '8px', fontFamily: 'Consolas', fontSize: 12 }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: 2,
                            fontSize: 11,
                            fontFamily: 'Consolas',
                            backgroundColor: getConfidenceColor(edge.confidence_score) + '20',
                            color: getConfidenceColor(edge.confidence_score),
                            border: `1px solid ${getConfidenceColor(edge.confidence_score)}`
                          }}>
                            {formatConfidence(edge.confidence_score)}
                          </span>
                        </td>
                        <td style={{ padding: '8px', color: asciiColors.muted, fontFamily: 'Consolas', fontSize: 12 }}>
                          {edge.discovery_method || 'N/A'}
                        </td>
                      </tr>
                      {openEdgeId === edge.id && (
                        <tr>
                          <td colSpan={10} style={{ padding: 0, border: 'none' }}>
                            <div style={{
                              maxHeight: openEdgeId === edge.id ? '700px' : '0',
                              opacity: openEdgeId === edge.id ? '1' : '0',
                              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                              borderTop: openEdgeId === edge.id ? `1px solid ${asciiColors.border}` : 'none',
                              backgroundColor: asciiColors.background,
                              overflow: 'hidden'
                            }}>
                              <div style={{ 
                                display: 'grid', 
                                gridTemplateColumns: '200px 1fr', 
                                padding: 16, 
                                gap: 12,
                                fontFamily: 'Consolas',
                                fontSize: 12
                              }}>
                                <div style={{ color: asciiColors.muted, fontWeight: 500, fontFamily: 'Consolas' }}>Edge Key:</div>
                                <div style={{ color: asciiColors.foreground, fontFamily: 'Consolas' }}>{edge.edge_key || 'N/A'}</div>
                                
                                <div style={{ color: asciiColors.muted, fontWeight: 500, fontFamily: 'Consolas' }}>Source Collection:</div>
                                <div style={{ color: asciiColors.foreground, fontFamily: 'Consolas' }}>{edge.source_collection || 'N/A'}</div>
                                
                                <div style={{ color: asciiColors.muted, fontWeight: 500, fontFamily: 'Consolas' }}>Source Field:</div>
                                <div style={{ color: asciiColors.foreground, fontFamily: 'Consolas' }}>{edge.source_field || 'N/A'}</div>
                                
                                <div style={{ color: asciiColors.muted, fontWeight: 500, fontFamily: 'Consolas' }}>Target Collection:</div>
                                <div style={{ color: asciiColors.foreground, fontFamily: 'Consolas' }}>{edge.target_collection || 'N/A'}</div>
                                
                                <div style={{ color: asciiColors.muted, fontWeight: 500, fontFamily: 'Consolas' }}>Target Field:</div>
                                <div style={{ color: asciiColors.foreground, fontFamily: 'Consolas' }}>{edge.target_field || 'N/A'}</div>
                                
                                <div style={{ color: asciiColors.muted, fontWeight: 500, fontFamily: 'Consolas' }}>Dependency Level:</div>
                                <div style={{ color: asciiColors.foreground, fontFamily: 'Consolas' }}>{edge.dependency_level !== null && edge.dependency_level !== undefined ? edge.dependency_level : 'N/A'}</div>
                                
                                <div style={{ color: asciiColors.muted, fontWeight: 500, fontFamily: 'Consolas' }}>Discovery Method:</div>
                                <div style={{ color: asciiColors.foreground, fontFamily: 'Consolas' }}>{edge.discovery_method || 'N/A'}</div>
                                
                                <div style={{ color: asciiColors.muted, fontWeight: 500, fontFamily: 'Consolas' }}>Snapshot Date:</div>
                                <div style={{ color: asciiColors.foreground, fontFamily: 'Consolas' }}>{formatDate(edge.snapshot_date)}</div>
                              </div>
                              
                              {edge.definition_text && (
                                <>
                                  <div style={{ padding: '15px 15px 5px 15px', fontWeight: 600, color: asciiColors.muted, fontFamily: 'Consolas', fontSize: 12 }}>
                                    Definition:
                                  </div>
                                  <pre style={{
                                    margin: 0,
                                    padding: 16,
                                    backgroundColor: asciiColors.backgroundSoft,
                                    borderRadius: 2,
                                    overflowX: 'auto',
                                    fontSize: 11,
                                    border: `1px solid ${asciiColors.border}`,
                                    fontFamily: 'Consolas',
                                    color: asciiColors.foreground
                                  }}>
                                    {edge.definition_text}
                                  </pre>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </AsciiPanel>
      )}

      {viewMode === "table" && pagination.totalPages > 1 && (
        <Pagination>
          <PageButton
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
          >
            Previous
          </PageButton>
          <span>
            Page {pagination.currentPage} of {pagination.totalPages} ({pagination.total} total)
          </span>
          <PageButton
            onClick={() => setPage(Math.min(pagination.totalPages, page + 1))}
            disabled={page === pagination.totalPages}
          >
            Next
          </PageButton>
        </Pagination>
      )}
    </div>
  );
};

export default DataLineageMongoDB;
