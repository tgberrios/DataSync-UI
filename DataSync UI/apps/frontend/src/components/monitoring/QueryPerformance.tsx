import { useState, useEffect, useCallback, useRef } from 'react';
import styled from 'styled-components';
import { queryPerformanceApi, monitoringApi } from '../../services/api';
import { Container, Header, Select, FiltersContainer, Input, Pagination, PageButton, LoadingOverlay, ErrorMessage } from '../shared/BaseComponents';
import { usePagination } from '../../hooks/usePagination';
import { useTableFilters } from '../../hooks/useTableFilters';
import { extractApiError } from '../../utils/errorHandler';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { theme } from '../../theme/theme';
import QueryPerformanceTreeView from './QueryPerformanceTreeView';

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-bottom: 30px;
  animation: slideUp 0.25s ease-out;
  animation-delay: 0.1s;
  animation-fill-mode: both;
`;

const MetricCard = styled.div`
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 15px;
  background: linear-gradient(135deg, #fafafa 0%, #ffffff 100%);
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.03);
  
  &:hover {
    border-color: rgba(10, 25, 41, 0.3);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }
`;

const MetricLabel = styled.div`
  font-size: 0.85em;
  color: #666;
  margin-bottom: 8px;
  font-weight: 500;
`;

const MetricValue = styled.div`
  font-size: 1.5em;
  font-weight: bold;
  color: #0d1b2a;
`;


const QueryTable = styled.div`
  border: 1px solid #ddd;
  border-radius: 6px;
  overflow: hidden;
  animation: slideUp 0.25s ease-out;
  animation-delay: 0.2s;
  animation-fill-mode: both;
`;

const TableHeader = styled.div`
  display: grid;
  grid-template-columns: 80px 100px 120px 100px 1fr 100px 100px 100px;
  background: linear-gradient(135deg, #f5f5f5 0%, #ffffff 100%);
  padding: 12px 15px;
  font-weight: bold;
  font-size: 0.9em;
  border-bottom: 2px solid #ddd;
  gap: 10px;
`;

const TableRow = styled.div`
  display: grid;
  grid-template-columns: 80px 100px 120px 100px 1fr 100px 100px 100px;
  padding: 12px 15px;
  border-bottom: 1px solid #eee;
  transition: all 0.2s ease;
  cursor: pointer;
  gap: 10px;
  align-items: center;
  
  &:hover {
    background: linear-gradient(90deg, #f0f0f0 0%, #f8f9fa 100%);
    border-left: 3px solid #0d1b2a;
  }
  
  &:last-child {
    border-bottom: none;
  }
`;

const TableCell = styled.div`
  font-size: 0.9em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const QueryTextCell = styled.div`
  font-size: 0.85em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: "Consolas";
  color: #555;
`;

const Badge = styled.span<{ $tier?: string; $type?: string }>`
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.8em;
  font-weight: 500;
  display: inline-block;
  transition: all 0.2s ease;
  
  ${props => {
    if (props.$tier) {
      switch (props.$tier) {
        case 'EXCELLENT': return 'background-color: #e8f5e9; color: #2e7d32;';
        case 'GOOD': return 'background-color: #e3f2fd; color: #1565c0;';
        case 'FAIR': return 'background-color: #fff3e0; color: #ef6c00;';
        case 'POOR': return 'background-color: #ffebee; color: #c62828;';
        default: return 'background-color: #f5f5f5; color: #757575;';
      }
    }
    if (props.$type) {
      return 'background-color: #f0f0f0; color: #333;';
    }
    return 'background-color: #f5f5f5; color: #757575;';
  }}
  
  &:hover {
    transform: scale(1.05);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  }
`;

const QueryDetails = styled.div<{ $isOpen: boolean }>`
  max-height: ${props => props.$isOpen ? '600px' : '0'};
  opacity: ${props => props.$isOpen ? '1' : '0'};
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  border-top: ${props => props.$isOpen ? '1px solid #eee' : 'none'};
  background-color: white;
  overflow: hidden;
`;

const DetailGrid = styled.div`
  display: grid;
  grid-template-columns: 180px 1fr;
  padding: 15px;
  gap: 10px;
  font-size: 0.9em;
`;

const DetailLabel = styled.div`
  color: #666;
  font-weight: 500;
`;

const DetailValue = styled.div`
  color: #333;
`;

const QueryText = styled.pre`
  margin: 0;
  padding: 15px;
  background-color: #f8f8f8;
  border-radius: 6px;
  overflow-x: auto;
  font-size: 0.85em;
  border: 1px solid #eee;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: rgba(10, 25, 41, 0.2);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }
`;


/**
 * Componente para monitorear el rendimiento de consultas
 * Muestra métricas de rendimiento, consultas lentas y detalles de ejecución
 */
const QueryPerformance = () => {
  const isMountedRef = useRef(true);
  const [activeTab, setActiveTab] = useState<'queries' | 'analysis' | 'regressions' | 'suggestions'>('queries');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [queries, setQueries] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>({});
  const [openQueryId, setOpenQueryId] = useState<number | null>(null);
  const [selectedQueryForAnalysis, setSelectedQueryForAnalysis] = useState<any>(null);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [regressions, setRegressions] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
    currentPage: 1,
    limit: 20
  });

  const { page, setPage } = usePagination(1, 20);
  const { filters, setFilter } = useTableFilters({
    performance_tier: '',
    operation_type: '',
    source_type: '',
    search: ''
  });

  /**
   * Obtiene los datos de rendimiento de consultas desde la API
   */
  const fetchData = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    try {
      setLoading(true);
      setError(null);
      const [queriesData, metricsData] = await Promise.all([
        queryPerformanceApi.getQueries({
          page,
          limit: 20,
          performance_tier: filters.performance_tier as string,
          operation_type: filters.operation_type as string,
          source_type: filters.source_type as string,
          search: filters.search as string
        }),
        queryPerformanceApi.getMetrics()
      ]);
      
      if (isMountedRef.current) {
        setQueries(queriesData.data || []);
        setPagination(queriesData.pagination || {
          total: 0,
          totalPages: 0,
          currentPage: 1,
          limit: 20
        });
        setMetrics(metricsData || {});
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
  }, [page, filters.performance_tier, filters.operation_type, filters.source_type, filters.search]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchData();
    
    const interval = setInterval(fetchData, 30000);
    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchData]);

  /**
   * Alterna la expansión de una consulta
   */
  const toggleQuery = useCallback((id: number) => {
    setOpenQueryId(prev => prev === id ? null : id);
  }, []);

  /**
   * Formatea un tiempo en milisegundos a formato legible
   */
  const formatTime = useCallback((ms: number | string | null | undefined) => {
    if (!ms) return 'N/A';
    const numMs = Number(ms);
    if (isNaN(numMs)) return 'N/A';
    if (numMs < 1) return `${(numMs * 1000).toFixed(2)}μs`;
    if (numMs < 1000) return `${numMs.toFixed(2)}ms`;
    return `${(numMs / 1000).toFixed(2)}s`;
  }, []);

  /**
   * Formatea un número a formato legible (K, M)
   */
  const formatNumber = useCallback((num: number | string | null | undefined) => {
    if (num === null || num === undefined) return 'N/A';
    const numVal = Number(num);
    if (isNaN(numVal)) return 'N/A';
    if (numVal >= 1000000) return `${(numVal / 1000000).toFixed(2)}M`;
    if (numVal >= 1000) return `${(numVal / 1000).toFixed(2)}K`;
    return numVal.toString();
  }, []);

  const handleAnalyzeQuery = useCallback(async (query: any) => {
    try {
      setAnalyzing(true);
      setError(null);
      const result = await monitoringApi.analyzeQuery(query.queryid || query.id, query.query_text);
      setAnalysisData(result);
      setSelectedQueryForAnalysis(query);
      setActiveTab('analysis');
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setAnalyzing(false);
    }
  }, []);

  const fetchRegressions = useCallback(async () => {
    try {
      const data = await monitoringApi.getRegressions({ days: 7 });
      setRegressions(data.regressions || data || []);
    } catch (err) {
      setError(extractApiError(err));
    }
  }, []);

  const fetchSuggestions = useCallback(async () => {
    try {
      const data = await monitoringApi.getSuggestions();
      setSuggestions(data || []);
    } catch (err) {
      setError(extractApiError(err));
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'regressions') {
      fetchRegressions();
    } else if (activeTab === 'suggestions') {
      fetchSuggestions();
    }
  }, [activeTab, fetchRegressions, fetchSuggestions]);

  return (
    <Container>
      <Header>Query Performance</Header>
      
      {error && <ErrorMessage>{error}</ErrorMessage>}

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.lg,
        borderBottom: `2px solid ${asciiColors.border}`,
        paddingBottom: theme.spacing.sm
      }}>
        {(['queries', 'analysis', 'regressions', 'suggestions'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: `${theme.spacing.sm} ${theme.spacing.md}`,
              border: 'none',
              background: activeTab === tab ? asciiColors.accent : 'transparent',
              color: activeTab === tab ? '#ffffff' : asciiColors.foreground,
              borderRadius: `${2} ${2} 0 0`,
              cursor: 'pointer',
              fontWeight: activeTab === tab ? 600 : 500,
              transition: 'all 0.15s ease',
              textTransform: 'capitalize',
              fontFamily: 'Consolas, monospace',
              fontSize: 12
            }}
            onMouseEnter={(e) => {
              if (activeTab !== tab) {
                e.currentTarget.style.background = asciiColors.backgroundSoft;
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== tab) {
                e.currentTarget.style.background = 'transparent';
              }
            }}
          >
            {tab === 'queries' && 'Queries'}
            {tab === 'analysis' && 'Analysis'}
            {tab === 'regressions' && 'Regressions'}
            {tab === 'suggestions' && 'Suggestions'}
          </button>
        ))}
      </div>
      
      <MetricsGrid>
        <MetricCard>
          <MetricLabel>Total Queries</MetricLabel>
          <MetricValue>{formatNumber(metrics.total_queries)}</MetricValue>
        </MetricCard>
        <MetricCard>
          <MetricLabel>Excellent</MetricLabel>
          <MetricValue>{formatNumber(metrics.excellent_count)}</MetricValue>
        </MetricCard>
        <MetricCard>
          <MetricLabel>Good</MetricLabel>
          <MetricValue>{formatNumber(metrics.good_count)}</MetricValue>
        </MetricCard>
        <MetricCard>
          <MetricLabel>Fair</MetricLabel>
          <MetricValue>{formatNumber(metrics.fair_count)}</MetricValue>
        </MetricCard>
        <MetricCard>
          <MetricLabel>Poor</MetricLabel>
          <MetricValue>{formatNumber(metrics.poor_count)}</MetricValue>
        </MetricCard>
        <MetricCard>
          <MetricLabel>Long Running</MetricLabel>
          <MetricValue>{formatNumber(metrics.long_running_count)}</MetricValue>
        </MetricCard>
        <MetricCard>
          <MetricLabel>Blocking</MetricLabel>
          <MetricValue>{formatNumber(metrics.blocking_count)}</MetricValue>
        </MetricCard>
        <MetricCard>
          <MetricLabel>Avg Efficiency</MetricLabel>
          <MetricValue>{metrics.avg_efficiency ? `${Number(metrics.avg_efficiency).toFixed(1)}%` : 'N/A'}</MetricValue>
        </MetricCard>
      </MetricsGrid>

      <FiltersContainer>
        <Select
          value={filters.performance_tier as string}
          onChange={(e) => {
            setFilter('performance_tier', e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Tiers</option>
          <option value="EXCELLENT">Excellent</option>
          <option value="GOOD">Good</option>
          <option value="FAIR">Fair</option>
          <option value="POOR">Poor</option>
        </Select>
        
        <Select
          value={filters.operation_type as string}
          onChange={(e) => {
            setFilter('operation_type', e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Operations</option>
          <option value="SELECT">SELECT</option>
          <option value="INSERT">INSERT</option>
          <option value="UPDATE">UPDATE</option>
          <option value="DELETE">DELETE</option>
        </Select>
        
        <Select
          value={filters.source_type as string}
          onChange={(e) => {
            setFilter('source_type', e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Sources</option>
          <option value="snapshot">Snapshot</option>
          <option value="activity">Activity</option>
        </Select>
        
        <Input
          type="text"
          placeholder="Search query text..."
          value={filters.search as string}
          onChange={(e) => {
            setFilter('search', e.target.value);
            setPage(1);
          }}
        />
      </FiltersContainer>

      {activeTab === 'queries' && (
        <>
          <QueryPerformanceTreeView
            queries={queries}
            onQueryClick={(query) => {
              toggleQuery(query.id);
              setSelectedQueryForAnalysis(query);
            }}
          />
          {selectedQueryForAnalysis && (
            <div style={{ marginTop: theme.spacing.md }}>
              <AsciiButton
                label={analyzing ? "Analyzing..." : "Analyze Query"}
                onClick={() => handleAnalyzeQuery(selectedQueryForAnalysis)}
                disabled={analyzing}
              />
            </div>
          )}
        </>
      )}

      {activeTab === 'analysis' && (
        <AsciiPanel>
          <div style={{ padding: theme.spacing.lg }}>
            <h3 style={{
              fontSize: 14,
              fontWeight: 600,
              color: asciiColors.foreground,
              marginBottom: theme.spacing.md
            }}>
              Query Analysis
            </h3>
            {!selectedQueryForAnalysis ? (
              <div style={{
                padding: theme.spacing.xl,
                textAlign: 'center',
                color: asciiColors.muted
              }}>
                Select a query from the Queries tab and click "Analyze Query" to see analysis results.
              </div>
            ) : !analysisData ? (
              <div style={{
                padding: theme.spacing.xl,
                textAlign: 'center',
                color: asciiColors.muted
              }}>
                Click "Analyze Query" button to analyze the selected query.
              </div>
            ) : (
              <>
                {selectedQueryForAnalysis && (
                  <div style={{
                    padding: theme.spacing.md,
                    background: asciiColors.backgroundSoft,
                    borderRadius: 2,
                    marginBottom: theme.spacing.md,
                    fontFamily: 'Consolas, monospace',
                    fontSize: 11
                  }}>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                      {selectedQueryForAnalysis.query_text}
                    </pre>
                  </div>
                )}
                {analysisData.issues && analysisData.issues.length > 0 ? (
                  <div style={{ marginBottom: theme.spacing.md }}>
                    <h4 style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: asciiColors.foreground,
                      marginBottom: theme.spacing.sm
                    }}>
                      Issues Detected:
                    </h4>
                    <ul style={{ margin: 0, paddingLeft: theme.spacing.lg, fontSize: 11 }}>
                      {analysisData.issues.map((issue: string, idx: number) => (
                        <li key={idx} style={{ marginBottom: theme.spacing.xs, color: asciiColors.error }}>
                          {issue}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div style={{ marginBottom: theme.spacing.md, color: asciiColors.muted, fontSize: 11 }}>
                    No issues detected.
                  </div>
                )}
                {analysisData.recommendations && analysisData.recommendations.length > 0 ? (
                  <div>
                    <h4 style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: asciiColors.foreground,
                      marginBottom: theme.spacing.sm
                    }}>
                      Recommendations:
                    </h4>
                    <ul style={{ margin: 0, paddingLeft: theme.spacing.lg, fontSize: 11 }}>
                      {analysisData.recommendations.map((rec: string, idx: number) => (
                        <li key={idx} style={{ marginBottom: theme.spacing.xs, color: asciiColors.foreground }}>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : analysisData && (
                  <div style={{ color: asciiColors.muted, fontSize: 11 }}>
                    No recommendations available.
                  </div>
                )}
              </>
            )}
          </div>
        </AsciiPanel>
      )}

      {activeTab === 'regressions' && (
        <AsciiPanel>
          <div style={{ padding: theme.spacing.lg }}>
            <h3 style={{
              fontSize: 14,
              fontWeight: 600,
              color: asciiColors.foreground,
              marginBottom: theme.spacing.md
            }}>
              Performance Regressions
            </h3>
            {regressions.length === 0 ? (
              <div style={{
                padding: theme.spacing.xl,
                textAlign: 'center',
                color: asciiColors.muted
              }}>
                No regressions detected
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gap: theme.spacing.md
              }}>
                {regressions.map((regression: any, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      padding: theme.spacing.md,
                      border: `1px solid ${asciiColors.border}`,
                      borderRadius: 2
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: theme.spacing.xs }}>
                      Query Fingerprint: {regression.query_fingerprint?.substring(0, 16)}...
                    </div>
                    <div style={{ fontSize: 11, color: asciiColors.muted }}>
                      Previous: {regression.previous_avg_time?.toFixed(2)}ms | 
                      Current: {regression.current_avg_time?.toFixed(2)}ms | 
                      Regression: {regression.regression_percent?.toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </AsciiPanel>
      )}

      {activeTab === 'suggestions' && (
        <AsciiPanel>
          <div style={{ padding: theme.spacing.lg }}>
            <h3 style={{
              fontSize: 14,
              fontWeight: 600,
              color: asciiColors.foreground,
              marginBottom: theme.spacing.md
            }}>
              Optimization Suggestions
            </h3>
            {suggestions.length === 0 ? (
              <div style={{
                padding: theme.spacing.xl,
                textAlign: 'center',
                color: asciiColors.muted
              }}>
                No suggestions available
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gap: theme.spacing.md
              }}>
                {suggestions.map((suggestion: any) => (
                  <div
                    key={suggestion.suggestion_id}
                    style={{
                      padding: theme.spacing.md,
                      border: `1px solid ${asciiColors.border}`,
                      borderRadius: 2
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: theme.spacing.sm
                    }}>
                      <span style={{
                        fontSize: 11,
                        padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                        background: asciiColors.accent,
                        color: '#ffffff',
                        borderRadius: 2,
                        textTransform: 'uppercase'
                      }}>
                        {suggestion.type}
                      </span>
                      <span style={{ fontSize: 11, color: asciiColors.muted }}>
                        {suggestion.estimated_improvement?.toFixed(1)}% improvement
                      </span>
                    </div>
                    <div style={{ fontSize: 12, marginBottom: theme.spacing.xs }}>
                      {suggestion.description}
                    </div>
                    {suggestion.sql_suggestion && (
                      <div style={{
                        padding: theme.spacing.sm,
                        background: asciiColors.backgroundSoft,
                        borderRadius: 2,
                        fontFamily: 'Consolas, monospace',
                        fontSize: 11,
                        marginTop: theme.spacing.sm
                      }}>
                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                          {suggestion.sql_suggestion}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </AsciiPanel>
      )}

      {loading && queries.length === 0 && (
        <LoadingOverlay>Loading query performance data...</LoadingOverlay>
      )}

      {pagination.totalPages > 1 && (
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

      {openQueryId && queries.find(q => q.id === openQueryId) && (() => {
        const selectedQuery = queries.find(q => q.id === openQueryId);
        return (
          <>
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                backdropFilter: "blur(2px)",
                zIndex: 999,
                transition: "opacity 0.15s ease"
              }}
              onClick={() => setOpenQueryId(null)}
            />
            <div
              style={{
                position: "fixed",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "85%",
                height: "85%",
                backgroundColor: asciiColors.background,
                border: `2px solid ${asciiColors.border}`,
                borderRadius: 2,
                zIndex: 1000,
                display: "flex",
                flexDirection: "column",
                fontFamily: "Consolas",
                fontSize: 12,
                color: asciiColors.foreground,
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
                transition: "opacity 0.15s ease"
              }}
            >
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px 20px",
                borderBottom: `2px solid ${asciiColors.border}`,
                backgroundColor: asciiColors.backgroundSoft
              }}>
                <h2 style={{
                  fontSize: 14,
                  fontFamily: "Consolas",
                  fontWeight: 600,
                  color: asciiColors.accent,
                  margin: 0
                }}>
                  {ascii.blockFull} QUERY DETAILS
                </h2>
                <button
                  onClick={() => setOpenQueryId(null)}
                  style={{
                    background: "transparent",
                    border: `1px solid ${asciiColors.border}`,
                    color: asciiColors.foreground,
                    padding: "4px 12px",
                    borderRadius: 2,
                    cursor: "pointer",
                    fontFamily: "Consolas",
                    fontSize: 11,
                    transition: "all 0.2s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.border = `2px solid ${asciiColors.foreground}`;
                    e.currentTarget.style.backgroundColor = asciiColors.backgroundSoft;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.border = `1px solid ${asciiColors.border}`;
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  {ascii.blockFull} CLOSE
                </button>
              </div>
              <div style={{
                display: "grid",
                gridTemplateColumns: "4fr 1fr",
                gap: 20,
                flex: 1,
                padding: 20,
                overflow: "hidden"
              }}>
                <div style={{
                  display: "flex",
                  flexDirection: "column",
                  height: "100%",
                  overflow: "hidden"
                }}>
                  <h3 style={{
                    fontSize: 13,
                    fontFamily: "Consolas",
                    fontWeight: 600,
                    color: asciiColors.accent,
                    margin: 0,
                    marginBottom: 12,
                    paddingBottom: 8,
                    borderBottom: `1px solid ${asciiColors.border}`
                  }}>
                    {ascii.blockFull} QUERY TEXT
                  </h3>
                  <pre style={{
                    margin: 0,
                    padding: 16,
                    backgroundColor: asciiColors.backgroundSoft,
                    borderRadius: 2,
                    overflowX: "auto",
                    overflowY: "auto",
                    fontSize: 11,
                    border: `1px solid ${asciiColors.border}`,
                    fontFamily: "Consolas",
                    whiteSpace: "pre-wrap",
                    wordWrap: "break-word",
                    color: asciiColors.foreground,
                    flex: 1
                  }}>
                    {selectedQuery?.query_text || 'N/A'}
                  </pre>
                </div>

                <div style={{
                  display: "flex",
                  flexDirection: "column",
                  height: "100%",
                  overflow: "hidden"
                }}>
                  <h3 style={{
                    fontSize: 13,
                    fontFamily: "Consolas",
                    fontWeight: 600,
                    color: asciiColors.accent,
                    margin: 0,
                    marginBottom: 12,
                    paddingBottom: 8,
                    borderBottom: `1px solid ${asciiColors.border}`
                  }}>
                    {ascii.blockFull} DETAILS
                  </h3>
                  <div style={{
                    overflowY: "auto",
                    flex: 1,
                    fontFamily: "Consolas",
                    fontSize: 11,
                    transition: "opacity 0.15s ease"
                  }}>
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "150px 1fr",
                      gap: 12,
                      padding: 8
                    }}>
                      <div style={{ color: asciiColors.muted, fontWeight: 500 }}>Query ID:</div>
                      <div style={{ color: asciiColors.foreground }}>{selectedQuery?.queryid || 'N/A'}</div>
                      
                      <div style={{ color: asciiColors.muted, fontWeight: 500 }}>Database:</div>
                      <div style={{ color: asciiColors.foreground }}>{selectedQuery?.dbname || 'N/A'}</div>
                      
                      <div style={{ color: asciiColors.muted, fontWeight: 500 }}>Username:</div>
                      <div style={{ color: asciiColors.foreground }}>{selectedQuery?.username || 'N/A'}</div>
                      
                      <div style={{ color: asciiColors.muted, fontWeight: 500 }}>Application:</div>
                      <div style={{ color: asciiColors.foreground }}>{selectedQuery?.application_name || 'N/A'}</div>
                      
                      <div style={{ color: asciiColors.muted, fontWeight: 500 }}>State:</div>
                      <div style={{ color: asciiColors.foreground }}>{selectedQuery?.state || 'N/A'}</div>
                      
                      <div style={{ color: asciiColors.muted, fontWeight: 500 }}>Wait Event:</div>
                      <div style={{ color: asciiColors.foreground }}>{selectedQuery?.wait_event_type || 'N/A'}</div>
                      
                      <div style={{ color: asciiColors.muted, fontWeight: 500 }}>Calls:</div>
                      <div style={{ color: asciiColors.foreground }}>{formatNumber(selectedQuery?.calls)}</div>
                      
                      <div style={{ color: asciiColors.muted, fontWeight: 500 }}>Total Time:</div>
                      <div style={{ color: asciiColors.foreground }}>{formatTime(selectedQuery?.total_time_ms)}</div>
                      
                      <div style={{ color: asciiColors.muted, fontWeight: 500 }}>Mean Time:</div>
                      <div style={{ color: asciiColors.foreground }}>{formatTime(selectedQuery?.mean_time_ms)}</div>
                      
                      <div style={{ color: asciiColors.muted, fontWeight: 500 }}>Min Time:</div>
                      <div style={{ color: asciiColors.foreground }}>{formatTime(selectedQuery?.min_time_ms)}</div>
                      
                      <div style={{ color: asciiColors.muted, fontWeight: 500 }}>Max Time:</div>
                      <div style={{ color: asciiColors.foreground }}>{formatTime(selectedQuery?.max_time_ms)}</div>
                      
                      <div style={{ color: asciiColors.muted, fontWeight: 500 }}>Query Duration:</div>
                      <div style={{ color: asciiColors.foreground }}>{formatTime(selectedQuery?.query_duration_ms)}</div>
                      
                      <div style={{ color: asciiColors.muted, fontWeight: 500 }}>Cache Hit Ratio:</div>
                      <div style={{ color: asciiColors.foreground }}>{selectedQuery?.cache_hit_ratio ? `${Number(selectedQuery.cache_hit_ratio).toFixed(2)}%` : 'N/A'}</div>
                      
                      <div style={{ color: asciiColors.muted, fontWeight: 500 }}>IO Efficiency:</div>
                      <div style={{ color: asciiColors.foreground }}>{selectedQuery?.io_efficiency ? Number(selectedQuery.io_efficiency).toFixed(2) : 'N/A'}</div>
                      
                      <div style={{ color: asciiColors.muted, fontWeight: 500 }}>Query Efficiency Score:</div>
                      <div style={{ color: asciiColors.foreground }}>{selectedQuery?.query_efficiency_score ? `${Number(selectedQuery.query_efficiency_score).toFixed(2)}%` : 'N/A'}</div>
                      
                      <div style={{ color: asciiColors.muted, fontWeight: 500 }}>Long Running:</div>
                      <div style={{ color: asciiColors.foreground }}>{selectedQuery?.is_long_running ? 'Yes' : 'No'}</div>
                      
                      <div style={{ color: asciiColors.muted, fontWeight: 500 }}>Blocking:</div>
                      <div style={{ color: asciiColors.foreground }}>{selectedQuery?.is_blocking ? 'Yes' : 'No'}</div>
                      
                      <div style={{ color: asciiColors.muted, fontWeight: 500 }}>Has Joins:</div>
                      <div style={{ color: asciiColors.foreground }}>{selectedQuery?.has_joins ? 'Yes' : 'No'}</div>
                      
                      <div style={{ color: asciiColors.muted, fontWeight: 500 }}>Has Subqueries:</div>
                      <div style={{ color: asciiColors.foreground }}>{selectedQuery?.has_subqueries ? 'Yes' : 'No'}</div>
                      
                      <div style={{ color: asciiColors.muted, fontWeight: 500 }}>Has CTE:</div>
                      <div style={{ color: asciiColors.foreground }}>{selectedQuery?.has_cte ? 'Yes' : 'No'}</div>
                      
                      <div style={{ color: asciiColors.muted, fontWeight: 500 }}>Has Window Functions:</div>
                      <div style={{ color: asciiColors.foreground }}>{selectedQuery?.has_window_functions ? 'Yes' : 'No'}</div>
                      
                      <div style={{ color: asciiColors.muted, fontWeight: 500 }}>Captured At:</div>
                      <div style={{ color: asciiColors.foreground }}>{selectedQuery?.captured_at ? new Date(selectedQuery.captured_at).toLocaleString() : 'N/A'}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        );
      })()}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </Container>
  );
};

export default QueryPerformance;

