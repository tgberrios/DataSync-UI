import React, { useState, useEffect, useCallback, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import {
  LoadingOverlay,
} from '../shared/BaseComponents';
import { useTableFilters } from '../../hooks/useTableFilters';
import { dataLineageApi } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import { sanitizeSearch } from '../../utils/validation';
import { theme } from '../../theme/theme';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import DataLineageMariaDBTreeView from './DataLineageMariaDBTreeView';

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



const DataLineageMariaDB = () => {
  const { filters, setFilter, clearFilters } = useTableFilters({
    server_name: '',
    database_name: '',
    object_type: '',
    relationship_type: '',
    search: ''
  });
  
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<any>({});
  const [openEdgeId, setOpenEdgeId] = useState<number | null>(null);
  const [servers, setServers] = useState<string[]>([]);
  const [databases, setDatabases] = useState<string[]>([]);
  const [allEdges, setAllEdges] = useState<any[]>([]);
  const [loadingTree, setLoadingTree] = useState(false);
  const [showLineagePlaybook, setShowLineagePlaybook] = useState(false);
  const isMountedRef = useRef(true);

  const fetchMetrics = useCallback(async () => {
    if (!isMountedRef.current) return;
    try {
      const metricsData = await dataLineageApi.getMariaDBMetrics().catch(err => {
        console.error("MariaDB getMariaDBMetrics error:", err);
        throw err;
      });
      if (isMountedRef.current) {
        setMetrics(metricsData || {});
      }
    } catch (err) {
      console.error("MariaDB fetchMetrics error:", err);
    }
  }, []);

  const fetchAllEdges = useCallback(async () => {
    if (!isMountedRef.current) return;
    try {
      setLoadingTree(true);
      setError(null);
      const sanitizedSearch = sanitizeSearch(filters.search as string, 100);
      const lineageData = await dataLineageApi.getMariaDBLineage({
        page: 1,
        limit: 10000,
        server_name: filters.server_name as string,
        database_name: filters.database_name as string,
        object_type: filters.object_type as string,
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
    filters.object_type,
    filters.relationship_type,
    filters.search
  ]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchMetrics();
    fetchAllEdges();
    const interval = setInterval(() => {
      if (isMountedRef.current) {
        fetchMetrics();
        fetchAllEdges();
      }
    }, 30000);
    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchAllEdges, fetchMetrics]);

  useEffect(() => {
    const fetchDatabases = async () => {
      if (filters.server_name && isMountedRef.current) {
        try {
          const databasesData = await dataLineageApi.getMariaDBDatabases(filters.server_name as string);
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
  }, [setFilter]);

  const handleExportCSV = useCallback(() => {
    const headers = ["Source Object", "Source Type", "Relationship", "Target Object", "Target Type", "Server", "Database", "Confidence", "Method"];
    const rows = allEdges.map(edge => [
      edge.object_name || "",
      edge.object_type || "",
      edge.relationship_type || "",
      edge.target_object_name || "",
      edge.target_object_type || "",
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
    link.setAttribute("download", `lineage_mariadb_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [allEdges, formatConfidence]);

  if (loadingTree && allEdges.length === 0) {
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
          DATA LINEAGE - MARIADB
        </h1>
        <LoadingOverlay>Loading data lineage...</LoadingOverlay>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px", fontFamily: "Consolas", fontSize: 12 }}>
      <div style={{
        marginBottom: "20px"
      }}>
        <h1 style={{
          fontSize: 14,
          fontWeight: 600,
          margin: 0,
          color: asciiColors.foreground,
          textTransform: "uppercase",
          fontFamily: "Consolas"
        }}>
          <span style={{ color: asciiColors.accent, marginRight: 8 }}>{ascii.blockFull}</span>
          DATA LINEAGE - MARIADB
        </h1>
      </div>

      {showLineagePlaybook && (
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
        onClick={() => setShowLineagePlaybook(false)}
        >
          <div style={{
            width: '90%',
            maxWidth: 1000,
            maxHeight: '90vh',
            overflowY: 'auto'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <AsciiPanel title="DATA LINEAGE - MARIADB PLAYBOOK">
              <div style={{ padding: 16, fontFamily: 'Consolas', fontSize: 12, lineHeight: 1.6 }}>
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                    {ascii.blockFull} OVERVIEW
                  </div>
                  <div style={{ color: asciiColors.foreground, marginLeft: 16 }}>
                    Data Lineage tracks the flow of data through your MariaDB databases, showing how data moves 
                    from source tables to target tables, views, stored procedures, and other database objects. 
                    This helps you understand data dependencies, impact analysis, and data flow patterns across 
                    your MariaDB infrastructure.
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                    {ascii.blockFull} RELATIONSHIP TYPES
                  </div>
                  
                  <div style={{ marginLeft: 16 }}>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.accent, fontWeight: 600 }}>DEPENDS_ON</span>
                      <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
                        Target object depends on source object (e.g., view depends on table)
                      </span>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.accent, fontWeight: 600 }}>REFERENCES</span>
                      <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
                        Foreign key or reference relationship between objects
                      </span>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.accent, fontWeight: 600 }}>USES</span>
                      <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
                        Object uses another object (e.g., stored procedure uses table)
                      </span>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.accent, fontWeight: 600 }}>CONTAINS</span>
                      <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
                        Parent-child relationship (e.g., schema contains table)
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                    {ascii.blockFull} CONFIDENCE SCORE
                  </div>
                  
                  <div style={{ marginLeft: 16 }}>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.success, fontWeight: 600 }}>High (0.8-1.0)</span>
                      <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
                        Strong evidence of relationship, typically from explicit dependencies or foreign keys
                      </span>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.warning, fontWeight: 600 }}>Medium (0.5-0.8)</span>
                      <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
                        Moderate confidence, inferred from patterns or naming conventions
                      </span>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.danger, fontWeight: 600 }}>Low (0.0-0.5)</span>
                      <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
                        Weak evidence, may require manual verification
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                    {ascii.blockFull} DISCOVERY METHODS
                  </div>
                  
                  <div style={{ marginLeft: 16 }}>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.accent, fontWeight: 600 }}>FOREIGN_KEY</span>
                      <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
                        Discovered through foreign key constraints
                      </span>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.accent, fontWeight: 600 }}>VIEW_DEFINITION</span>
                      <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
                        Extracted from view CREATE statements
                      </span>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.accent, fontWeight: 600 }}>STORED_PROCEDURE</span>
                      <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
                        Analyzed from stored procedure code
                      </span>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.accent, fontWeight: 600 }}>TRIGGER</span>
                      <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
                        Discovered from trigger definitions
                      </span>
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
                    {ascii.blockSemi} Best Practices
                  </div>
                  <div style={{ fontSize: 11, color: asciiColors.foreground }}>
                    • Use filters to narrow down lineage to specific servers, databases, or object types<br/>
                    • Review confidence scores to identify relationships that may need verification<br/>
                    • Export lineage data for documentation and compliance purposes<br/>
                    • Monitor lineage changes to track data flow evolution over time<br/>
                    • Use dependency level to understand the depth of relationships
                  </div>
                </div>

                <div style={{ marginTop: 16, textAlign: 'right' }}>
                  <AsciiButton
                    label="Close"
                    onClick={() => setShowLineagePlaybook(false)}
                    variant="ghost"
                  />
                </div>
              </div>
            </AsciiPanel>
          </div>
        </div>
      )}
      
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
        <AsciiPanel title="Unique Objects">
          <div style={{ fontFamily: 'Consolas', fontSize: 14, fontWeight: 600, color: asciiColors.foreground }}>
            {metrics.unique_objects || 0}
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
            value={filters.object_type as string}
            onChange={(e) => handleFilterChange('object_type', e.target.value)}
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
            <option value="">All Types</option>
            <option value="TABLE">TABLE</option>
            <option value="VIEW">VIEW</option>
            <option value="TRIGGER">TRIGGER</option>
            <option value="FOREIGN_KEY">FOREIGN_KEY</option>
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
            <option value="DEPENDS_ON">DEPENDS_ON</option>
            <option value="REFERENCES">REFERENCES</option>
            <option value="CONTAINS">CONTAINS</option>
            <option value="TRIGGERS">TRIGGERS</option>
          </select>
          
          <input
            type="text"
            placeholder="Search object name..."
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
            }}
            variant="ghost"
          />
        </div>
      </AsciiPanel>

      <div style={{ 
        display: 'flex', 
        justifyContent: 'flex-end', 
        alignItems: 'center', 
        marginTop: 24,
        marginBottom: 16,
        fontFamily: 'Consolas',
        fontSize: 12
      }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <AsciiButton
            label="Export CSV"
            onClick={handleExportCSV}
            variant="ghost"
          />
          <AsciiButton
            label="Lineage Info"
            onClick={() => setShowLineagePlaybook(true)}
            variant="ghost"
          />
        </div>
      </div>

      {loadingTree ? (
        <LoadingOverlay>Loading tree view...</LoadingOverlay>
      ) : (
        <DataLineageMariaDBTreeView edges={allEdges} onEdgeClick={(edge) => toggleEdge(edge.id)} />
      )}
    </div>
  );
};

export default DataLineageMariaDB; 
