import React, { useState, useEffect, useCallback, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import {
  LoadingOverlay,
} from '../shared/BaseComponents';
import { useTableFilters } from '../../hooks/useTableFilters';
import { dataLineageMongoDBApi } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import { sanitizeSearch } from '../../utils/validation';
import { theme } from '../../theme/theme';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import DataLineageMongoDBTreeView from './DataLineageMongoDBTreeView';
import LineageCharts from './LineageCharts';
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

const getConfidenceColor = (score: number | string | null | undefined) => {
  if (score === null || score === undefined) return asciiColors.muted;
  const numScore = Number(score);
  if (isNaN(numScore)) return asciiColors.muted;
  if (numScore >= 0.8) return asciiColors.success;
  if (numScore >= 0.5) return asciiColors.warning;
  return asciiColors.danger;
};

const DataLineageMongoDB = () => {
  const { filters, setFilter, clearFilters } = useTableFilters({
    server_name: '',
    database_name: '',
    relationship_type: '',
    search: ''
  });
  
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<any>({});
  const [openEdgeId, setOpenEdgeId] = useState<number | null>(null);
  const [servers, setServers] = useState<string[]>([]);
  const [databases, setDatabases] = useState<string[]>([]);
  const [allEdges, setAllEdges] = useState<any[]>([]);
  const [loadingTree, setLoadingTree] = useState(true);
  const [showLineagePlaybook, setShowLineagePlaybook] = useState(false);
  const [activeView, setActiveView] = useState<'list' | 'charts'>('list');
  const isMountedRef = useRef(true);

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
    
    const startTime = Date.now();
    const minLoadingTime = 300;
    
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
      
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minLoadingTime - elapsed);
      await new Promise(resolve => setTimeout(resolve, remaining));
      
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
    const fetchServers = async () => {
      try {
        const serversData = await dataLineageMongoDBApi.getMongoDBServers();
        if (isMountedRef.current) {
          setServers(serversData || []);
        }
      } catch (err) {
        console.error('Error loading servers:', err);
      }
    };
    fetchServers();
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
  }, [setFilter]);

  const handleExportCSV = useCallback(() => {
    const headers = ["Source Collection", "Source Field", "Relationship", "Target Collection", "Target Field", "Server", "Database", "Confidence", "Method"];
    const rows = allEdges.map(edge => [
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
  }, [allEdges, formatConfidence]);

  if (loadingTree && allEdges.length === 0) {
    return <SkeletonLoader variant="table" />;
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
          DATA LINEAGE - MONGODB
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
            <AsciiPanel title="DATA LINEAGE - MONGODB PLAYBOOK">
              <div style={{ padding: 16, fontFamily: 'Consolas', fontSize: 12, lineHeight: 1.6 }}>
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                    {ascii.blockFull} OVERVIEW
                  </div>
                  <div style={{ color: asciiColors.foreground, marginLeft: 16 }}>
                    Data Lineage tracks the flow of data through your MongoDB databases, showing how data moves 
                    from source collections to target collections, views, and aggregation pipelines. This helps you 
                    understand data dependencies, impact analysis, and data flow patterns across your MongoDB infrastructure, 
                    including document relationships and transformation pipelines.
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
                        Target collection depends on source collection (e.g., view depends on collection, aggregation pipeline depends on collection)
                      </span>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.accent, fontWeight: 600 }}>REFERENCES</span>
                      <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
                        Document reference relationship between collections (DBRef or manual references)
                      </span>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.accent, fontWeight: 600 }}>USES</span>
                      <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
                        Collection uses another collection (e.g., aggregation pipeline uses multiple collections)
                      </span>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.accent, fontWeight: 600 }}>CONTAINS</span>
                      <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
                        Parent-child relationship (e.g., database contains collection)
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
                        Strong evidence of relationship, typically from explicit references, view definitions, or aggregation pipelines
                      </span>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.warning, fontWeight: 600 }}>Medium (0.5-0.8)</span>
                      <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
                        Moderate confidence, inferred from patterns, naming conventions, or document structure analysis
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
                      <span style={{ color: asciiColors.accent, fontWeight: 600 }}>DBREF</span>
                      <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
                        Discovered through MongoDB DBRef references
                      </span>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.accent, fontWeight: 600 }}>VIEW_DEFINITION</span>
                      <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
                        Extracted from MongoDB view definitions
                      </span>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.accent, fontWeight: 600 }}>AGGREGATION_PIPELINE</span>
                      <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
                        Analyzed from aggregation pipeline stages ($lookup, $unionWith, etc.)
                      </span>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.accent, fontWeight: 600 }}>DOCUMENT_ANALYSIS</span>
                      <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
                        Discovered from document structure and field references
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                    {ascii.blockFull} MONGODB-SPECIFIC FEATURES
                  </div>
                  
                  <div style={{ marginLeft: 16 }}>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.accent, fontWeight: 600 }}>Collection-Level Tracking</span>
                      <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
                        Tracks relationships at the collection level, understanding how collections interact
                      </span>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.accent, fontWeight: 600 }}>Aggregation Pipeline Analysis</span>
                      <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
                        Analyzes aggregation pipelines to discover data transformations and relationships
                      </span>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.accent, fontWeight: 600 }}>Document References</span>
                      <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
                        Tracks DBRef and manual document references between collections
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
                    • Use filters to narrow down lineage to specific servers or databases<br/>
                    • Review confidence scores to identify relationships that may need verification<br/>
                    • Export lineage data for documentation and compliance purposes<br/>
                    • Monitor aggregation pipeline relationships to understand data transformations<br/>
                    • Review consumer context to understand how collections are being used<br/>
                    • Track document references to understand cross-collection dependencies
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
            <option value="DEPENDS_ON">DEPENDS_ON</option>
            <option value="REFERENCES">REFERENCES</option>
            <option value="USES">USES</option>
            <option value="CONTAINS">CONTAINS</option>
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
            label={activeView === 'list' ? 'Show Charts' : 'Show List'}
            onClick={() => setActiveView(activeView === 'list' ? 'charts' : 'list')}
            variant={activeView === 'charts' ? 'primary' : 'ghost'}
          />
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

      {activeView === 'charts' && (
        <LineageCharts
          engine="mongodb"
          getMetrics={dataLineageMongoDBApi.getMongoDBMetrics}
          getStats={dataLineageMongoDBApi.getMongoDBStats}
        />
      )}

      {activeView === 'list' && loadingTree ? (
        <LoadingOverlay>Loading tree view...</LoadingOverlay>
      ) : activeView === 'list' ? (
        <DataLineageMongoDBTreeView edges={allEdges} onEdgeClick={(edge) => toggleEdge(edge.id)} />
      ) : null}
    </div>
  );
};

export default DataLineageMongoDB;

