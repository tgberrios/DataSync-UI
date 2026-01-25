import { useState, useEffect, useCallback, useRef } from 'react';
import { governanceCatalogOracleApi, governanceCatalogMongoDBApi, governanceCatalogApi } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';

interface GovernanceCatalogChartsProps {
  engine: 'oracle' | 'mongodb' | 'mssql' | 'mariadb';
  selectedItem?: {
    server_name?: string;
    schema_name?: string;
    table_name?: string;
    database_name?: string;
    collection_name?: string;
  } | null;
}

const AsciiSparkline: React.FC<{
  data: number[];
  color: string;
  height?: number;
  width?: number;
  labels?: string[];
}> = ({ data, color, height = 4, width = 30, labels }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  if (!data || data.length === 0) {
    return <span style={{ color: asciiColors.muted }}>{ascii.dot.repeat(width)}</span>;
  }

  const sparklineData = data.slice(-width);
  const sparklineLabels = labels ? labels.slice(-width) : [];
  const min = Math.min(...sparklineData);
  const max = Math.max(...sparklineData);
  const range = max - min || 1;

  const sparklineChars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
  
  const getChar = (value: number) => {
    if (range === 0) return sparklineChars[0];
    const normalized = (value - min) / range;
    const index = Math.floor(normalized * (sparklineChars.length - 1));
    return sparklineChars[Math.max(0, Math.min(sparklineChars.length - 1, index))];
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLSpanElement>, index: number) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setTooltipPosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top - 30
      });
      setHoveredIndex(index);
    }
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
    setTooltipPosition(null);
  };

  return (
    <div 
      ref={containerRef}
      style={{ 
        position: "relative",
        display: "inline-block"
      }}
      onMouseLeave={handleMouseLeave}
    >
      <span style={{ 
        color, 
        fontFamily: "Consolas",
        fontSize: 11,
        letterSpacing: 0,
        lineHeight: 1,
        display: "inline-block"
      }}>
        {sparklineData.map((val, idx) => (
          <span
            key={idx}
            onMouseMove={(e) => handleMouseMove(e, idx)}
            style={{
              cursor: "pointer",
              transition: "all 0.2s ease",
              transform: hoveredIndex === idx ? "scale(1.2)" : "scale(1)",
              display: "inline-block",
              position: "relative"
            }}
          >
            {getChar(val)}
          </span>
        ))}
      </span>
      {hoveredIndex !== null && tooltipPosition && (
        <div
          style={{
            position: "absolute",
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            transform: "translateX(-50%)",
            backgroundColor: asciiColors.background,
            border: `1px solid ${asciiColors.border}`,
            borderRadius: 2,
            padding: "6px 10px",
            fontSize: 10,
            fontFamily: "Consolas",
            color: asciiColors.foreground,
            whiteSpace: "nowrap",
            zIndex: 1000,
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
            pointerEvents: "none",
            animation: "fadeInUp 0.15s ease-out",
            transition: "opacity 0.15s ease, transform 0.15s ease"
          }}
        >
          <div style={{ color: asciiColors.accent, fontWeight: 600, marginBottom: 2 }}>
            {sparklineData[hoveredIndex].toFixed(2)}
          </div>
          {sparklineLabels[hoveredIndex] && (
            <div style={{ color: asciiColors.muted, fontSize: 9 }}>
              {new Date(sparklineLabels[hoveredIndex]).toLocaleTimeString()}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const GovernanceCatalogCharts: React.FC<GovernanceCatalogChartsProps> = ({ engine, selectedItem }) => {
  const [timeRange, setTimeRange] = useState<number>(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [statsData, setStatsData] = useState<any>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const getHistoryApi = () => {
    switch (engine) {
      case 'oracle':
        return governanceCatalogOracleApi.getOracleHistory;
      case 'mongodb':
        return governanceCatalogMongoDBApi.getMongoDBHistory;
      case 'mssql':
        return governanceCatalogApi.getMSSQLHistory;
      case 'mariadb':
        return governanceCatalogApi.getMariaDBHistory;
      default:
        return governanceCatalogOracleApi.getOracleHistory;
    }
  };

  const getStatsApi = () => {
    switch (engine) {
      case 'oracle':
        return governanceCatalogOracleApi.getOracleStats;
      case 'mongodb':
        return governanceCatalogMongoDBApi.getMongoDBStats;
      case 'mssql':
        return governanceCatalogApi.getMSSQLStats;
      case 'mariadb':
        return governanceCatalogApi.getMariaDBStats;
      default:
        return governanceCatalogOracleApi.getOracleStats;
    }
  };

  const fetchHistory = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const currentController = abortControllerRef.current;

    setLoading(true);
    setError(null);

    try {
      const getHistory = getHistoryApi();
      const getStats = getStatsApi();
      const params: any = {
        days: timeRange,
        limit: 10000
      };

      if (selectedItem) {
        if (selectedItem.server_name) params.server_name = selectedItem.server_name;
        if (selectedItem.schema_name) params.schema_name = selectedItem.schema_name;
        if (selectedItem.table_name) params.table_name = selectedItem.table_name;
        if (selectedItem.database_name) params.database_name = selectedItem.database_name;
        if (selectedItem.collection_name) params.collection_name = selectedItem.collection_name;
      }

      const [historyResponse, statsResponse] = await Promise.all([
        getHistory(params, currentController.signal),
        getStats({ days: timeRange, server_name: selectedItem?.server_name }, currentController.signal)
      ]);

      if (!currentController.signal.aborted && abortControllerRef.current === currentController) {
        setHistoryData(historyResponse.data?.data || []);
        setStatsData(statsResponse);
      }
    } catch (err: any) {
      const isCanceled = err.name === 'CanceledError' || 
                        err.name === 'AbortError' || 
                        err.message?.includes('canceled') ||
                        err.message?.includes('aborted') ||
                        err.message?.includes('Request cancelled');
      
      if (!isCanceled && abortControllerRef.current === currentController) {
        const errorMessage = extractApiError(err);
        setError(errorMessage);
        console.error('Error fetching governance catalog charts data:', err);
      } else if (isCanceled) {
        return;
      }
    } finally {
      if (abortControllerRef.current === currentController) {
        setLoading(false);
      }
    }
  }, [timeRange, selectedItem, engine]);

  useEffect(() => {
    fetchHistory();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [timeRange, selectedItem, engine]);

  const prepareAggregatedData = () => {
    if (!historyData.length) return null;

    const sorted = [...historyData].sort((a, b) => 
      new Date(a.snapshot_date).getTime() - new Date(b.snapshot_date).getTime()
    );

    let aggregatedData: any[];
    if (!selectedItem) {
      const byTimestamp = new Map<string, { 
        health_score: number; 
        total_size_mb: number; 
        row_count: number; 
        fragmentation_pct: number;
        count: number; 
        timestamp: string;
      }>();
      
      sorted.forEach(item => {
        const timestamp = new Date(item.snapshot_date).toISOString();
        if (!byTimestamp.has(timestamp)) {
          byTimestamp.set(timestamp, { 
            health_score: 0, 
            total_size_mb: 0, 
            row_count: 0, 
            fragmentation_pct: 0,
            count: 0, 
            timestamp 
          });
        }
        const agg = byTimestamp.get(timestamp)!;
        agg.health_score += Number(item.health_score) || 0;
        agg.total_size_mb += Number(item.total_size_mb || item.table_size_mb || item.storage_size_mb || 0) || 0;
        agg.row_count += Number(item.row_count || item.document_count || 0) || 0;
        agg.fragmentation_pct += Number(item.fragmentation_pct || 0) || 0;
        agg.count += 1;
      });

      aggregatedData = Array.from(byTimestamp.values())
        .map(agg => ({
          snapshot_date: agg.timestamp,
          health_score: agg.count > 0 ? agg.health_score / agg.count : 0,
          total_size_mb: agg.total_size_mb,
          row_count: agg.row_count,
          fragmentation_pct: agg.count > 0 ? agg.fragmentation_pct / agg.count : 0
        }))
        .sort((a, b) => new Date(a.snapshot_date).getTime() - new Date(b.snapshot_date).getTime());
    } else {
      aggregatedData = sorted;
    }

    return aggregatedData;
  };

  const renderMetricCard = (
    label: string,
    value: number,
    unit: string,
    data: number[],
    color: string,
    icon: string,
    maxValue?: number,
    labels?: string[]
  ) => {
    const currentValue = data.length > 0 ? (Number(data[data.length - 1]) || 0) : 0;
    const displayValue = Number(value) || currentValue || 0;
    const hasData = data.length > 1;
    const minValue = hasData ? Math.min(...data.map(d => Number(d) || 0)) : 0;
    const maxValueData = hasData ? Math.max(...data.map(d => Number(d) || 0)) : 0;
    const effectiveMax = maxValue || (maxValueData > 0 ? maxValueData : 100);
    const percentage = effectiveMax > 0 ? (displayValue / effectiveMax) * 100 : 0;
    const barWidth = Math.min(100, Math.max(0, percentage));

    return (
      <div style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: "12px",
        backgroundColor: asciiColors.background,
        borderRadius: 2,
        border: `1px solid ${asciiColors.border}`,
        transition: "all 0.2s ease"
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = color;
        e.currentTarget.style.backgroundColor = asciiColors.backgroundSoft;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = asciiColors.border;
        e.currentTarget.style.backgroundColor = asciiColors.background;
      }}
      >
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 4
        }}>
          <div style={{
            fontSize: 11,
            color: asciiColors.accent,
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontFamily: "Consolas"
          }}>
            <span>{icon}</span>
            <span>{label}</span>
          </div>
          <div style={{
            fontSize: 13,
            fontWeight: 600,
            color: color,
            fontFamily: "Consolas"
          }}>
            {typeof displayValue === 'number' ? displayValue.toFixed(1) : Number(displayValue || 0).toFixed(1)}{unit}
          </div>
        </div>
        
        <div style={{
          width: "100%",
          height: 6,
          backgroundColor: asciiColors.backgroundSoft,
          borderRadius: 1,
          overflow: "hidden",
          border: `1px solid ${asciiColors.border}`
        }}>
          <div style={{
            width: `${barWidth}%`,
            height: "100%",
            backgroundColor: color,
            transition: "width 0.3s ease",
            borderRadius: 1
          }} />
        </div>
        
        <AsciiSparkline 
          data={data} 
          color={color}
          width={40}
          labels={labels}
        />
        
        {hasData && (
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 9,
            color: asciiColors.muted,
            marginTop: 2,
            fontFamily: "Consolas"
          }}>
            <span>Min: {minValue.toFixed(1)}{unit}</span>
            <span>Max: {maxValueData.toFixed(1)}{unit}</span>
          </div>
        )}
      </div>
    );
  };

  const prepareHealthDistributionData = () => {
    if (!statsData?.summary) return null;

    return {
      labels: ['HEALTHY', 'WARNING', 'CRITICAL'],
      datasets: [
        {
          data: [
            parseInt(statsData.summary.healthy_count || 0),
            parseInt(statsData.summary.warning_count || 0),
            parseInt(statsData.summary.critical_count || 0)
          ],
          backgroundColor: [
            asciiColors.success + '80',
            asciiColors.warning + '80',
            asciiColors.danger + '80'
          ],
          borderColor: [
            asciiColors.success,
            asciiColors.warning,
            asciiColors.danger
          ],
          borderWidth: 2
        }
      ]
    };
  };

  const prepareServerDistributionData = () => {
    if (!statsData?.byServer || !statsData.byServer.length) return null;

    return {
      labels: statsData.byServer.map((s: any) => s.server_name || 'Unknown'),
      datasets: [
        {
          label: engine === 'mongodb' ? 'Collections' : 'Tables',
          data: statsData.byServer.map((s: any) => parseInt(s.table_count || s.collection_count || s.object_count || 0)),
          backgroundColor: [
            asciiColors.accent + '80',
            asciiColors.success + '80',
            asciiColors.warning + '80',
            asciiColors.danger + '80',
            '#9b59b6' + '80'
          ],
          borderColor: [
            asciiColors.accent,
            asciiColors.success,
            asciiColors.warning,
            asciiColors.danger,
            '#9b59b6'
          ],
          borderWidth: 2
        }
      ]
    };
  };

  const aggregatedData = prepareAggregatedData();
  const healthPieData = prepareHealthDistributionData();
  const serverPieData = prepareServerDistributionData();

  const healthScoreData = aggregatedData ? aggregatedData.map(d => Number(d.health_score) || 0) : [];
  const healthScoreLabels = aggregatedData ? aggregatedData.map(d => d.snapshot_date) : [];
  const tableSizeData = aggregatedData ? aggregatedData.map(d => Number(d.total_size_mb) || 0) : [];
  const rowCountData = aggregatedData ? aggregatedData.map(d => Number(d.row_count) || 0) : [];
  const fragmentationData = aggregatedData ? aggregatedData.map(d => Number(d.fragmentation_pct) || 0) : [];

  const currentHealthScore = healthScoreData.length > 0 ? Number(healthScoreData[healthScoreData.length - 1]) || 0 : 0;
  const currentTableSize = tableSizeData.length > 0 ? Number(tableSizeData[tableSizeData.length - 1]) || 0 : 0;
  const currentRowCount = rowCountData.length > 0 ? Number(rowCountData[rowCountData.length - 1]) || 0 : 0;
  const currentFragmentation = fragmentationData.length > 0 ? Number(fragmentationData[fragmentationData.length - 1]) || 0 : 0;

  return (
    <div style={{ fontFamily: 'Consolas', fontSize: 12 }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        flexWrap: 'wrap',
        gap: 12
      }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ color: asciiColors.muted, fontSize: 11 }}>Time Range:</span>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(Number(e.target.value))}
            style={{
              padding: '4px 8px',
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2,
              fontFamily: 'Consolas',
              fontSize: 11,
              backgroundColor: asciiColors.background,
              color: asciiColors.foreground
            }}
          >
            <option value={1}>Last 24 hours</option>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={180}>Last 6 months</option>
            <option value={240}>Last 8 months</option>
          </select>
        </div>
        <AsciiButton
          label="Refresh"
          onClick={fetchHistory}
          variant="ghost"
          disabled={loading}
        />
      </div>

      {error && (
        <AsciiPanel title="ERROR">
          <div style={{
            padding: "12px",
            color: asciiColors.danger,
            fontSize: 11,
            fontFamily: "Consolas"
          }}>
            {error}
          </div>
        </AsciiPanel>
      )}

      {loading && (
        <div style={{ padding: 20, textAlign: 'center', color: asciiColors.muted }}>
          Loading charts...
        </div>
      )}

      {!loading && !error && aggregatedData && (
        <div style={{
          border: `1px solid ${asciiColors.border}`,
          borderRadius: 2,
          padding: 16,
          backgroundColor: asciiColors.backgroundSoft,
          marginBottom: 16
        }}>
          <h2 style={{
            fontSize: 14,
            fontFamily: "Consolas",
            fontWeight: 600,
            color: asciiColors.accent,
            margin: 0,
            marginBottom: 16,
            paddingBottom: 8,
            borderBottom: `1px solid ${asciiColors.border}`
          }}>
            {ascii.blockFull} {engine.toUpperCase()} GOVERNANCE METRICS
          </h2>
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12
          }}>
            {renderMetricCard(
              "Health Score",
              currentHealthScore,
              "%",
              healthScoreData,
              currentHealthScore >= 90 ? asciiColors.success : currentHealthScore >= 70 ? asciiColors.warning : asciiColors.danger,
              ascii.blockFull,
              100,
              healthScoreLabels
            )}
            
            {renderMetricCard(
              engine === 'mongodb' ? "Storage Size" : "Table Size",
              currentTableSize,
              " MB",
              tableSizeData,
              asciiColors.accent,
              ascii.blockSemi,
              undefined,
              healthScoreLabels
            )}
            
            {renderMetricCard(
              engine === 'mongodb' ? "Documents" : "Total Rows",
              currentRowCount,
              "",
              rowCountData,
              asciiColors.success,
              ascii.blockLight,
              undefined,
              healthScoreLabels
            )}
            
            {renderMetricCard(
              "Fragmentation",
              currentFragmentation,
              "%",
              fragmentationData,
              currentFragmentation > 30 ? asciiColors.danger : currentFragmentation > 10 ? asciiColors.warning : asciiColors.success,
              ascii.dot,
              100,
              healthScoreLabels
            )}
          </div>
        </div>
      )}

      {!loading && !error && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          {healthPieData && (() => {
            const total = healthPieData.datasets[0].data.reduce((a: number, b: number) => a + b, 0);
            const healthy = healthPieData.datasets[0].data[0] || 0;
            const warning = healthPieData.datasets[0].data[1] || 0;
            const critical = healthPieData.datasets[0].data[2] || 0;
            const healthyPct = total > 0 ? (healthy / total) * 100 : 0;
            const warningPct = total > 0 ? (warning / total) * 100 : 0;
            const criticalPct = total > 0 ? (critical / total) * 100 : 0;
            const barWidth = 40;
            
            return (
              <AsciiPanel title="HEALTH DISTRIBUTION">
                <div style={{ 
                  fontFamily: 'Consolas', 
                  fontSize: 11,
                  padding: '12px',
                  lineHeight: 1.8
                }}>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ color: asciiColors.muted }}>├─ HEALTHY:</span>
                      <span style={{ color: asciiColors.success, fontWeight: 600 }}>{healthy} ({healthyPct.toFixed(1)}%)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 12 }}>
                      <span style={{ color: asciiColors.success }}>
                        {ascii.blockFull.repeat(Math.round((healthyPct / 100) * barWidth))}
                        {ascii.blockLight.repeat(barWidth - Math.round((healthyPct / 100) * barWidth))}
                      </span>
                    </div>
                  </div>
                  
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ color: asciiColors.muted }}>├─ WARNING:</span>
                      <span style={{ color: asciiColors.warning, fontWeight: 600 }}>{warning} ({warningPct.toFixed(1)}%)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 12 }}>
                      <span style={{ color: asciiColors.warning }}>
                        {ascii.blockFull.repeat(Math.round((warningPct / 100) * barWidth))}
                        {ascii.blockLight.repeat(barWidth - Math.round((warningPct / 100) * barWidth))}
                      </span>
                    </div>
                  </div>
                  
                  <div style={{ marginBottom: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ color: asciiColors.muted }}>└─ CRITICAL:</span>
                      <span style={{ color: asciiColors.danger, fontWeight: 600 }}>{critical} ({criticalPct.toFixed(1)}%)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 12 }}>
                      <span style={{ color: asciiColors.danger }}>
                        {ascii.blockFull.repeat(Math.round((criticalPct / 100) * barWidth))}
                        {ascii.blockLight.repeat(barWidth - Math.round((criticalPct / 100) * barWidth))}
                      </span>
                    </div>
                  </div>
                  
                  <div style={{ 
                    marginTop: 16, 
                    paddingTop: 12, 
                    borderTop: `1px solid ${asciiColors.border}`,
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}>
                    <span style={{ color: asciiColors.muted, fontSize: 10 }}>Total:</span>
                    <span style={{ color: asciiColors.foreground, fontWeight: 600, fontSize: 10 }}>{total} {engine === 'mongodb' ? 'collections' : 'tables'}</span>
                  </div>
                </div>
              </AsciiPanel>
            );
          })()}

          {serverPieData && statsData?.byServer && (() => {
            const servers = statsData.byServer;
            const total = servers.reduce((sum: number, s: any) => sum + parseInt(s.table_count || s.collection_count || s.object_count || 0), 0);
            const barWidth = 40;
            
            return (
              <AsciiPanel title="SERVER DISTRIBUTION">
                <div style={{ 
                  fontFamily: 'Consolas', 
                  fontSize: 11,
                  padding: '12px',
                  lineHeight: 1.8
                }}>
                  {servers.map((server: any, idx: number) => {
                    const count = parseInt(server.table_count || server.collection_count || server.object_count || 0);
                    const pct = total > 0 ? (count / total) * 100 : 0;
                    const isLast = idx === servers.length - 1;
                    const prefix = isLast ? '└─' : '├─';
                    const serverName = server.server_name || 'Unknown';
                    
                    return (
                      <div key={idx} style={{ marginBottom: isLast ? 4 : 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ color: asciiColors.muted }}>{prefix} {serverName}:</span>
                          <span style={{ color: asciiColors.accent, fontWeight: 600 }}>{count} ({pct.toFixed(1)}%)</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 12 }}>
                          <span style={{ color: asciiColors.accent }}>
                            {ascii.blockFull.repeat(Math.round((pct / 100) * barWidth))}
                            {ascii.blockLight.repeat(barWidth - Math.round((pct / 100) * barWidth))}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  
                  <div style={{ 
                    marginTop: 16, 
                    paddingTop: 12, 
                    borderTop: `1px solid ${asciiColors.border}`,
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}>
                    <span style={{ color: asciiColors.muted, fontSize: 10 }}>Total:</span>
                    <span style={{ color: asciiColors.foreground, fontWeight: 600, fontSize: 10 }}>{total} {engine === 'mongodb' ? 'collections' : 'tables'}</span>
                  </div>
                </div>
              </AsciiPanel>
            );
          })()}
        </div>
      )}

      {!loading && !error && statsData?.summary && (
        <div style={{
          border: `1px solid ${asciiColors.border}`,
          borderRadius: 2,
          padding: 16,
          backgroundColor: asciiColors.backgroundSoft,
          marginBottom: 16
        }}>
          <h2 style={{
            fontSize: 14,
            fontFamily: "Consolas",
            fontWeight: 600,
            color: asciiColors.accent,
            margin: 0,
            marginBottom: 16,
            paddingBottom: 8,
            borderBottom: `1px solid ${asciiColors.border}`
          }}>
            {ascii.blockFull} {engine.toUpperCase()} GOVERNANCE SUMMARY
          </h2>
          <div style={{ 
            fontFamily: "Consolas",
            fontSize: 11,
            lineHeight: 1.8,
            color: asciiColors.foreground
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: asciiColors.muted }}>├─ Total {engine === 'mongodb' ? 'Collections' : 'Tables'}:</span>
              <span style={{ fontWeight: 500, marginLeft: '20px' }}>{statsData.summary.total_tables || statsData.summary.total_collections || statsData.summary.total_objects || 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: asciiColors.muted }}>├─ Healthy:</span>
              <span style={{ fontWeight: 500, marginLeft: '20px', color: asciiColors.success }}>
                {statsData.summary.healthy_count || 0}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: asciiColors.muted }}>├─ Warning:</span>
              <span style={{ fontWeight: 500, marginLeft: '20px', color: asciiColors.warning }}>
                {statsData.summary.warning_count || 0}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: asciiColors.muted }}>├─ Critical:</span>
              <span style={{ fontWeight: 500, marginLeft: '20px', color: asciiColors.danger }}>
                {statsData.summary.critical_count || 0}
              </span>
            </div>
            {statsData.summary.avg_health_score && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: asciiColors.muted }}>├─ Avg Health Score:</span>
                <span style={{ 
                  fontWeight: 500, 
                  marginLeft: '20px',
                  color: parseFloat(statsData.summary.avg_health_score || 0) >= 90 ? asciiColors.success : 
                         parseFloat(statsData.summary.avg_health_score || 0) >= 70 ? asciiColors.warning : 
                         asciiColors.danger
                }}>
                  {parseFloat(statsData.summary.avg_health_score || 0).toFixed(2)}%
                </span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: asciiColors.muted }}>├─ Total Size:</span>
              <span style={{ fontWeight: 500, marginLeft: '20px' }}>{(parseFloat(statsData.summary.total_size_mb || 0) / 1024).toFixed(2)} GB</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: asciiColors.muted }}>├─ Servers:</span>
              <span style={{ fontWeight: 500, marginLeft: '20px' }}>{statsData.summary.server_count || 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: asciiColors.muted }}>└─ {engine === 'mongodb' ? 'Databases' : 'Schemas'}:</span>
              <span style={{ fontWeight: 500, marginLeft: '20px' }}>{statsData.summary.database_count || statsData.summary.schema_count || 0}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GovernanceCatalogCharts;
