import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  LoadingOverlay,
} from '../shared/BaseComponents';
import { useTableFilters } from '../../hooks/useTableFilters';
import { dataLineageOracleApi } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import { sanitizeSearch } from '../../utils/validation';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import DataLineageOracleTreeView from './DataLineageOracleTreeView';
import LineageCharts from './LineageCharts';
import { LineageMetricsDashboard } from './LineageSummaryCards';
import SkeletonLoader from '../shared/SkeletonLoader';

const DataLineageOracle = () => {
  const { filters, setFilter, clearFilters } = useTableFilters({
    server_name: '',
    schema_name: '',
    relationship_type: '',
    search: ''
  });
  
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<any>({});
  const [openEdgeId, setOpenEdgeId] = useState<number | null>(null);
  const [servers, setServers] = useState<string[]>([]);
  const [schemas, setSchemas] = useState<string[]>([]);
  const [allEdges, setAllEdges] = useState<any[]>([]);
  const [loadingTree, setLoadingTree] = useState(true);
  const [showLineagePlaybook, setShowLineagePlaybook] = useState(false);
  const [activeView, setActiveView] = useState<'list' | 'charts'>('list');
  const isMountedRef = useRef(true);

  const fetchMetrics = useCallback(async () => {
    if (!isMountedRef.current) return;
    try {
      const metricsData = await dataLineageOracleApi.getOracleMetrics().catch(err => {
        console.error("Oracle getOracleMetrics error:", err);
        throw err;
      });
      if (isMountedRef.current) {
        setMetrics(metricsData || {});
      }
    } catch (err) {
      console.error("Oracle fetchMetrics error:", err);
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
      const lineageData = await dataLineageOracleApi.getOracleLineage({
        page: 1,
        limit: 10000,
        server_name: filters.server_name as string,
        schema_name: filters.schema_name as string,
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
    filters.schema_name,
    filters.relationship_type,
    filters.search
  ]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchMetrics();
    fetchAllEdges();
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchAllEdges, fetchMetrics]);

  useEffect(() => {
    const fetchSchemas = async () => {
      if (filters.server_name && isMountedRef.current) {
        try {
          const schemasData = await dataLineageOracleApi.getOracleSchemas(filters.server_name as string);
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
      setFilter('schema_name' as any, '');
    }
  }, [setFilter]);


  const metricsDashboardCards = React.useMemo(() => {
    const totalR = Number(metrics.total_relationships) || 1;
    const pctHigh = totalR ? `${(((Number(metrics.high_confidence) || 0) / totalR) * 100).toFixed(1)}% of total` : undefined;
    const pctLow = totalR ? `${(((Number(metrics.low_confidence) || 0) / totalR) * 100).toFixed(1)}% of total` : undefined;
    const avgConf = metrics.avg_confidence != null ? `${(Number(metrics.avg_confidence) * 100).toFixed(1)}%` : undefined;
    return [
      {
        title: 'Objects & topology',
        rows: [
          { label: 'Unique Objects', value: metrics.unique_objects },
          { label: 'Unique Servers', value: metrics.unique_servers },
          { label: 'Unique Schemas', value: metrics.unique_schemas },
        ],
      },
      {
        title: 'Relationships',
        rows: [{ label: 'Relationship Types', value: metrics.unique_relationship_types }],
      },
      {
        title: 'Confidence',
        rows: [
          { label: 'High Confidence', value: metrics.high_confidence, subtitle: pctHigh },
          { label: 'Low Confidence', value: metrics.low_confidence, subtitle: pctLow },
          { label: 'Avg Confidence', value: avgConf, subtitle: 'Score (0-100%)' },
          { label: 'Avg Dependency Level', value: metrics.avg_dependency_level != null ? Number(metrics.avg_dependency_level).toFixed(1) : undefined },
        ],
      },
      {
        title: 'Discovery',
        rows: [
          { label: 'Discovered (24h)', value: metrics.discovered_last_24h },
          { label: 'Discovery Methods', value: metrics.unique_discovery_methods },
        ],
      },
    ];
  }, [metrics]);

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
          DATA LINEAGE - ORACLE
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
            <AsciiPanel title="DATA LINEAGE - ORACLE PLAYBOOK">
              <div style={{ padding: 16, fontFamily: 'Consolas', fontSize: 12, lineHeight: 1.6 }}>
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                    {ascii.blockFull} OVERVIEW
                  </div>
                  <div style={{ color: asciiColors.foreground, marginLeft: 16 }}>
                    Data Lineage tracks the flow of data through your Oracle databases, showing how data moves 
                    from source tables to target tables, views, materialized views, stored procedures, functions, 
                    and other database objects. This helps you understand data dependencies, impact analysis, and 
                    data flow patterns across your Oracle infrastructure, including schema-level relationships.
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
                        Target object depends on source object (e.g., view depends on table, materialized view depends on table)
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
                        Object uses another object (e.g., stored procedure uses table, function uses view)
                      </span>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.accent, fontWeight: 600 }}>CONTAINS</span>
                      <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
                        Parent-child relationship (e.g., schema contains table, table contains column)
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
                      <span style={{ color: asciiColors.accent, fontWeight: 600 }}>High (0.8-1.0)</span>
                      <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
                        Strong evidence of relationship, typically from explicit dependencies, foreign keys, or PL/SQL code analysis
                      </span>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.muted, fontWeight: 600 }}>Medium (0.5-0.8)</span>
                      <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
                        Moderate confidence, inferred from patterns, naming conventions, or code analysis
                      </span>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.foreground, fontWeight: 600 }}>Low (0.0-0.5)</span>
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
                      <span style={{ color: asciiColors.accent, fontWeight: 600 }}>MATERIALIZED_VIEW</span>
                      <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
                        Analyzed from materialized view definitions
                      </span>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.accent, fontWeight: 600 }}>STORED_PROCEDURE</span>
                      <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
                        Analyzed from PL/SQL stored procedure code
                      </span>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.accent, fontWeight: 600 }}>FUNCTION</span>
                      <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
                        Analyzed from PL/SQL function code
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

                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                    {ascii.blockFull} ORACLE-SPECIFIC FEATURES
                  </div>
                  
                  <div style={{ marginLeft: 16 }}>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.accent, fontWeight: 600 }}>Schema-Level Tracking</span>
                      <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
                        Tracks relationships at the schema level, understanding how schemas and their objects interact
                      </span>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.accent, fontWeight: 600 }}>PL/SQL Code Analysis</span>
                      <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
                        Analyzes PL/SQL code in stored procedures, functions, and triggers to discover relationships
                      </span>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.accent, fontWeight: 600 }}>Materialized View Support</span>
                      <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
                        Tracks dependencies for materialized views, including refresh dependencies
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
                    • Use filters to narrow down lineage to specific servers or schemas<br/>
                    • Review confidence scores to identify relationships that may need verification<br/>
                    • Export lineage data for documentation and compliance purposes<br/>
                    • Monitor PL/SQL code relationships to understand programmatic data flows<br/>
                    • Review consumer context to understand how objects are being used<br/>
                    • Track materialized view dependencies for refresh scheduling
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
              color: asciiColors.foreground,
              fontSize: 12,
              fontFamily: "Consolas",
              border: `2px solid ${asciiColors.borderStrong}`
            }}>
              {error}
            </div>
          </AsciiPanel>
        </div>
      )}
      
      <LineageMetricsDashboard cards={metricsDashboardCards} />

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
          <option value="FOREIGN_KEY">FOREIGN_KEY</option>
          <option value="VIEW_READS_TABLE">VIEW_READS_TABLE</option>
          <option value="TRIGGER_ON_TABLE">TRIGGER_ON_TABLE</option>
          <option value="TRIGGER_READS_TABLE">TRIGGER_READS_TABLE</option>
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
            label={activeView === 'list' ? 'Show Charts' : 'Show List'}
            onClick={() => setActiveView(activeView === 'list' ? 'charts' : 'list')}
            variant={activeView === 'charts' ? 'primary' : 'ghost'}
          />
          <AsciiButton
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
          engine="oracle"
          getMetrics={dataLineageOracleApi.getOracleMetrics}
          getStats={dataLineageOracleApi.getOracleStats}
        />
      )}

      {activeView === 'list' && loadingTree ? (
        <LoadingOverlay>Loading tree view...</LoadingOverlay>
      ) : activeView === 'list' ? (
        <DataLineageOracleTreeView edges={allEdges} onEdgeClick={(edge) => toggleEdge(edge.id)} />
      ) : null}
    </div>
  );
};

export default DataLineageOracle;

