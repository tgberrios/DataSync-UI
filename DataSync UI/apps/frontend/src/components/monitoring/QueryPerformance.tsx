import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [queries, setQueries] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>({});
  const [volumeOverTime, setVolumeOverTime] = useState<{ bucket_ts: string; count: number }[]>([]);
  const [topSlowest, setTopSlowest] = useState<any[]>([]);
  const [openQueryId, setOpenQueryId] = useState<number | null>(null);
  const [selectedQueryForAnalysis, setSelectedQueryForAnalysis] = useState<any>(null);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [analysisSuggestions, setAnalysisSuggestions] = useState<any[]>([]);
  const [analysisRegressions, setAnalysisRegressions] = useState<any[]>([]);
  const [analysisModalOpen, setAnalysisModalOpen] = useState(false);
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
      const [queriesData, metricsData, volumeData, slowestData] = await Promise.all([
        queryPerformanceApi.getQueries({
          page,
          limit: 20,
          performance_tier: filters.performance_tier as string,
          operation_type: filters.operation_type as string,
          source_type: filters.source_type as string,
          search: filters.search as string
        }),
        queryPerformanceApi.getMetrics(),
        queryPerformanceApi.getVolumeOverTime({ hours: 24 }).catch(() => ({ data: [] })),
        queryPerformanceApi.getTopSlowest(15).catch(() => ({ data: [] }))
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
        setVolumeOverTime(Array.isArray(volumeData?.data) ? volumeData.data : []);
        setTopSlowest(Array.isArray(slowestData?.data) ? slowestData.data : []);
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

  /** Monochromatic tier color for charts (accent, foreground, muted only). */
  const getTierColor = useCallback((tier: string) => {
    const u = (tier || '').toUpperCase();
    if (u === 'POOR' || u === 'FAIR') return asciiColors.muted;
    if (u === 'EXCELLENT' || u === 'GOOD') return asciiColors.accent;
    return asciiColors.foreground;
  }, []);

  const CHART_SIZE = { w: 520, h: 220 };
  const TOP_SLOWEST_N = 15;

  const volumeSeries = useMemo(() => {
    return volumeOverTime
      .filter((d) => d.bucket_ts)
      .map((d) => ({ ts: new Date(d.bucket_ts).getTime(), volume: d.count }))
      .sort((a, b) => a.ts - b.ts);
  }, [volumeOverTime]);

  const handleAnalyzeQuery = useCallback(async (query: any) => {
    try {
      setAnalyzing(true);
      setError(null);
      setAnalysisSuggestions([]);
      setAnalysisRegressions([]);
      const result = await monitoringApi.analyzeQuery(query.queryid || query.id, query.query_text);
      setAnalysisData(result);
      setSelectedQueryForAnalysis(query);
      setAnalysisModalOpen(true);
      const fp = result?.query_fingerprint;
      if (fp) {
        try {
          const suggestionList = await monitoringApi.getSuggestions({
            query_fingerprint: fp
          });
          setAnalysisSuggestions(Array.isArray(suggestionList) ? suggestionList : []);
        } catch {
          setAnalysisSuggestions([]);
        }
        try {
          const regData = await monitoringApi.getRegressions({ days: 7 });
          const list = regData?.regressions ?? (Array.isArray(regData) ? regData : []);
          setAnalysisRegressions(
            Array.isArray(list)
              ? list.filter((r: any) => r?.query_fingerprint === fp)
              : []
          );
        } catch {
          setAnalysisRegressions([]);
        }
      } else {
        setAnalysisSuggestions([]);
        setAnalysisRegressions([]);
      }
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setAnalyzing(false);
    }
  }, []);

  return (
    <Container>
      <Header>Query Performance</Header>
      
      {error && <ErrorMessage>{error}</ErrorMessage>}

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

      {/* QUERY VOLUME OVER TIME — Area / line */}
      <AsciiPanel title="QUERY VOLUME OVER TIME — Area / line (picos = más queries)">
        <div style={{ overflowX: 'auto' }}>
          {volumeSeries.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: asciiColors.muted, fontSize: 11 }}>
              No time-series data. Volume is grouped by hour for the last 24h.
            </div>
          ) : (() => {
            const padding = { top: 20, right: 24, bottom: 32, left: 44 };
            const w = CHART_SIZE.w;
            const h = CHART_SIZE.h;
            const innerW = w - padding.left - padding.right;
            const innerH = h - padding.top - padding.bottom;
            const minT = Math.min(...volumeSeries.map((d) => d.ts));
            const maxT = Math.max(...volumeSeries.map((d) => d.ts));
            const rangeT = Math.max(1, maxT - minT);
            const maxVol = Math.max(1, ...volumeSeries.map((d) => d.volume));
            const scaleX = (ts: number) => padding.left + ((ts - minT) / rangeT) * innerW;
            const scaleY = (v: number) => padding.top + innerH - (v / maxVol) * innerH;
            const baselineY = padding.top + innerH;
            const points = volumeSeries.map((d) => `${scaleX(d.ts)},${scaleY(d.volume)}`).join(' ');
            const areaPoints = `${padding.left},${baselineY} ${points} ${padding.left + innerW},${baselineY}`;
            const linePoints = volumeSeries.map((d) => `${scaleX(d.ts)},${scaleY(d.volume)}`).join(' ');
            const formatTick = (ts: number) => {
              const d = new Date(ts);
              return volumeSeries.length > 6 ? d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit' }) : d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
            };
            const gridLines = 4;
            return (
              <svg width={w} height={h} style={{ display: 'block', border: `1px solid ${asciiColors.border}`, borderRadius: 2, backgroundColor: asciiColors.background }}>
                {Array.from({ length: gridLines + 1 }).map((_, i) => {
                  const y = padding.top + (innerH * i) / gridLines;
                  const val = maxVol - (maxVol * i) / gridLines;
                  return (
                    <g key={i}>
                      <line x1={padding.left} y1={y} x2={w - padding.right} y2={y} stroke={asciiColors.border} strokeWidth={1} strokeDasharray="2 2" opacity={0.7} />
                      <text x={padding.left - 6} y={y + 4} textAnchor="end" fontSize={9} fill={asciiColors.muted}>{i === 0 ? maxVol : Math.round(val)}</text>
                    </g>
                  );
                })}
                <line x1={padding.left} y1={padding.top} x2={padding.left} y2={h - padding.bottom} stroke={asciiColors.border} strokeWidth={1} />
                <line x1={padding.left} y1={h - padding.bottom} x2={w - padding.right} y2={h - padding.bottom} stroke={asciiColors.border} strokeWidth={1} />
                {volumeSeries.map((d, i) => {
                  const step = volumeSeries.length > 10 ? Math.max(1, Math.floor(volumeSeries.length / 6)) : 1;
                  if (step > 1 && i % step !== 0 && i !== volumeSeries.length - 1) return null;
                  return (
                    <text key={`vol-tick-${i}-${d.ts}`} x={scaleX(d.ts)} y={h - padding.bottom + 14} textAnchor="middle" fontSize={9} fill={asciiColors.muted}>{formatTick(d.ts)}</text>
                  );
                })}
                <polygon points={areaPoints} fill={asciiColors.backgroundSoft} stroke="none" />
                <polyline points={linePoints} fill="none" stroke={asciiColors.accent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            );
          })()}
        </div>
      </AsciiPanel>

      {/* TOP SLOWEST — Bar chart */}
      <AsciiPanel title="TOP SLOWEST — Bar chart">
        <div style={{ overflowX: 'auto' }}>
          {topSlowest.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: asciiColors.muted, fontSize: 11 }}>No data</div>
          ) : (() => {
            const topN = topSlowest.slice(0, TOP_SLOWEST_N).map((q: any) => ({ ...q, _mean: Number(q.mean_time_ms) || 0 })).filter((q: any) => q._mean > 0);
            if (topN.length === 0) return <div style={{ padding: 24, textAlign: 'center', color: asciiColors.muted, fontSize: 11 }}>No timing data</div>;
            const maxTime = Math.max(1, ...topN.map((q: any) => q._mean));
            const barH = 18;
            const gap = 4;
            const labelW = 160;
            const barW = 220;
            const totalH = topN.length * (barH + gap) - gap;
            const h = Math.max(120, totalH + 24);
            const w = labelW + barW + 72;
            return (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: asciiColors.accent, marginBottom: 8 }}>Top {TOP_SLOWEST_N} slowest (mean time)</div>
                <svg width={w} height={h} style={{ display: 'block', border: `1px solid ${asciiColors.border}`, borderRadius: 2 }}>
                {topN.map((q: any, i: number) => {
                  const y = 16 + i * (barH + gap);
                  const width = (q._mean / maxTime) * barW;
                  const fill = getTierColor(q.performance_tier || '');
                  const label = (q.query_text || '').substring(0, 28);
                  return (
                    <g key={`slowest-${i}`}>
                      <text x={4} y={y + barH - 4} fontSize={9} fill={asciiColors.muted}>{label}{label.length >= 28 ? '…' : ''}</text>
                      <rect x={labelW} y={y} width={barW} height={barH - 2} fill={asciiColors.backgroundSoft} stroke={asciiColors.border} rx={2} />
                      <rect x={labelW} y={y} width={width} height={barH - 2} fill={fill} rx={2} opacity={0.85} />
                      <text x={labelW + barW + 6} y={y + barH - 4} fontSize={9} fill={asciiColors.foreground}>{formatTime(q._mean)}</text>
                    </g>
                  );
                })}
                </svg>
              </div>
            );
          })()}
        </div>
      </AsciiPanel>

      {/* DETAILS — Distribution by tier, Blocking vs non-blocking, Avg execution time */}
      <AsciiPanel title="DETAILS">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontFamily: 'Consolas', fontSize: 12, color: asciiColors.foreground }}>
          <div style={{ border: `1px solid ${asciiColors.border}`, borderRadius: 2, padding: 16, backgroundColor: asciiColors.backgroundSoft }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: asciiColors.accent, marginBottom: 12, paddingBottom: 8, borderBottom: `1px solid ${asciiColors.border}` }}>
              {ascii.blockFull} DISTRIBUTION BY TIER
            </div>
            {['EXCELLENT', 'GOOD', 'FAIR', 'POOR'].map((tier, idx, arr) => {
              const key = `${tier.toLowerCase()}_count` as keyof typeof metrics;
              const count = Number(metrics[key] ?? 0) || 0;
              const total = Number(metrics.total_queries) || 1;
              const percentage = total > 0 ? (count / total) * 100 : 0;
              const isLast = idx === arr.length - 1;
              return (
                <div key={tier} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 11 }}>
                  <span style={{ color: asciiColors.muted, width: 20 }}>{isLast ? ascii.bl : ascii.v}</span>
                  <span style={{ color: getTierColor(tier), width: 12 }}>{ascii.blockFull}</span>
                  <span style={{ flex: 1, color: asciiColors.foreground }}>{tier}</span>
                  <span style={{ fontWeight: 600, color: getTierColor(tier), minWidth: '64px', textAlign: 'right' }}>{count} ({percentage.toFixed(1)}%)</span>
                </div>
              );
            })}
          </div>
          <div style={{ border: `1px solid ${asciiColors.border}`, borderRadius: 2, padding: 16, backgroundColor: asciiColors.backgroundSoft }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: asciiColors.accent, marginBottom: 12, paddingBottom: 8, borderBottom: `1px solid ${asciiColors.border}` }}>
              {ascii.blockFull} BLOCKING VS NON-BLOCKING
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 11 }}>
                <span style={{ color: asciiColors.muted, width: 20 }}>{ascii.v}</span>
                <span style={{ color: asciiColors.foreground, width: 12 }}>{ascii.blockFull}</span>
                <span style={{ flex: 1, color: asciiColors.foreground }}>Blocking</span>
                <span style={{ fontWeight: 600, color: asciiColors.foreground, minWidth: '30px', textAlign: 'right' }}>{Number(metrics.blocking_count) || 0}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 11 }}>
                <span style={{ color: asciiColors.muted, width: 20 }}>{ascii.bl}</span>
                <span style={{ color: asciiColors.accent, width: 12 }}>{ascii.blockFull}</span>
                <span style={{ flex: 1, color: asciiColors.foreground }}>Non-Blocking</span>
                <span style={{ fontWeight: 600, color: asciiColors.accent, minWidth: '30px', textAlign: 'right' }}>{Math.max(0, (Number(metrics.total_queries) || 0) - (Number(metrics.blocking_count) || 0))}</span>
              </div>
            </div>
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${asciiColors.border}` }}>
              <div style={{ fontSize: 11, color: asciiColors.muted, marginBottom: 4 }}>{ascii.v} Avg Execution Time</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, fontFamily: 'Consolas' }}>
                {formatTime(metrics.avg_mean_time_ms ?? metrics.avg_mean_time)}
              </div>
            </div>
          </div>
        </div>
      </AsciiPanel>

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

      {/* Analysis result modal */}
      {analysisModalOpen && analysisData && selectedQueryForAnalysis && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(2px)',
              zIndex: 999,
              transition: 'opacity 0.15s ease'
            }}
            onClick={() => setAnalysisModalOpen(false)}
          />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '85%',
              maxWidth: 720,
              maxHeight: '85%',
              overflow: 'auto',
              backgroundColor: asciiColors.background,
              border: `2px solid ${asciiColors.border}`,
              borderRadius: 2,
              zIndex: 1000,
              display: 'flex',
              flexDirection: 'column',
              fontFamily: 'Consolas',
              fontSize: 12,
              color: asciiColors.foreground,
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 20px',
              borderBottom: `2px solid ${asciiColors.border}`,
              backgroundColor: asciiColors.backgroundSoft
            }}>
              <h2 style={{
                fontSize: 14,
                fontFamily: 'Consolas',
                fontWeight: 600,
                color: asciiColors.accent,
                margin: 0
              }}>
                {ascii.blockFull} QUERY ANALYSIS
              </h2>
              <button
                onClick={() => setAnalysisModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: `1px solid ${asciiColors.border}`,
                  color: asciiColors.foreground,
                  padding: '4px 12px',
                  borderRadius: 2,
                  cursor: 'pointer',
                  fontFamily: 'Consolas',
                  fontSize: 11,
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.border = `2px solid ${asciiColors.foreground}`;
                  e.currentTarget.style.backgroundColor = asciiColors.backgroundSoft;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.border = `1px solid ${asciiColors.border}`;
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {ascii.blockFull} CLOSE
              </button>
            </div>
            <div style={{ padding: 20, overflowY: 'auto' }}>
              <div style={{
                padding: theme.spacing.md,
                background: asciiColors.backgroundSoft,
                borderRadius: 2,
                marginBottom: theme.spacing.md,
                fontFamily: 'Consolas, monospace',
                fontSize: 11
              }}>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {selectedQueryForAnalysis.query_text}
                </pre>
              </div>
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
                      <li key={idx} style={{ marginBottom: theme.spacing.xs, color: asciiColors.foreground }}>
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
                <div style={{ marginBottom: theme.spacing.md }}>
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
              ) : (
                <div style={{ marginBottom: theme.spacing.md, color: asciiColors.muted, fontSize: 11 }}>
                  No recommendations available.
                </div>
              )}
              <h4 style={{
                fontSize: 12,
                fontWeight: 600,
                color: asciiColors.foreground,
                marginBottom: theme.spacing.sm
              }}>
                Optimization Suggestions
              </h4>
              {analysisSuggestions.length === 0 ? (
                <div style={{ color: asciiColors.muted, fontSize: 11 }}>
                  No suggestions for this query.
                </div>
              ) : (
                <div style={{ display: 'grid', gap: theme.spacing.md }}>
                  {analysisSuggestions.map((suggestion: any) => (
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
                          {suggestion.estimated_improvement != null
                            ? `${Number(suggestion.estimated_improvement).toFixed(1)}% improvement`
                            : ''}
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
              <h4 style={{
                fontSize: 12,
                fontWeight: 600,
                color: asciiColors.foreground,
                marginTop: theme.spacing.lg,
                marginBottom: theme.spacing.sm
              }}>
                Performance Regressions
              </h4>
              {analysisRegressions.length === 0 ? (
                <div style={{ color: asciiColors.muted, fontSize: 11 }}>
                  No regressions for this query.
                </div>
              ) : (
                <div style={{ display: 'grid', gap: theme.spacing.md }}>
                  {analysisRegressions.map((regression: any, idx: number) => (
                    <div
                      key={idx}
                      style={{
                        padding: theme.spacing.md,
                        border: `1px solid ${asciiColors.border}`,
                        borderRadius: 2
                      }}
                    >
                      <div style={{ fontSize: 11, color: asciiColors.muted }}>
                        Previous avg: {Number(regression.previous_avg_time).toFixed(2)}ms →
                        Current avg: {Number(regression.current_avg_time).toFixed(2)}ms
                      </div>
                      <div style={{ fontWeight: 600, marginTop: theme.spacing.xs, fontSize: 12 }}>
                        Regression: {Number(regression.regression_percent).toFixed(1)}%
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
                  <AsciiButton
                    label={analyzing ? "Analyzing..." : "Analyze Query"}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (selectedQuery) {
                        handleAnalyzeQuery(selectedQuery);
                        setOpenQueryId(null);
                      }
                    }}
                    disabled={analyzing}
                  />
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

