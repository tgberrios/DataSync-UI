import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Pie,
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Pie as PieChart } from 'react-chartjs-2';
import { qualityApi } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';

ChartJS.register(
  CategoryScale,
  LinearScale,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface QualityChartsProps {
  selectedTable?: {
    schema_name: string;
    table_name: string;
    source_db_engine: string;
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
            pointerEvents: "none"
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

const QualityCharts: React.FC<QualityChartsProps> = ({ selectedTable }) => {
  const [timeRange, setTimeRange] = useState<number>(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [statsData, setStatsData] = useState<any>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchHistory = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const currentController = abortControllerRef.current;

    setLoading(true);
    setError(null);

    try {
      const params: any = {
        days: timeRange,
        limit: 10000
      };

      if (selectedTable) {
        params.schema = selectedTable.schema_name;
        params.table = selectedTable.table_name;
        params.engine = selectedTable.source_db_engine;
      }

      const [historyResponse, statsResponse] = await Promise.all([
        qualityApi.getQualityHistory(params, currentController.signal),
        qualityApi.getQualityStats({ days: timeRange }, currentController.signal)
      ]);

      if (!currentController.signal.aborted && abortControllerRef.current === currentController) {
        setHistoryData(historyResponse.data || []);
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
        console.error('Error fetching quality charts data:', err);
      } else if (isCanceled) {
        return;
      }
    } finally {
      if (abortControllerRef.current === currentController) {
        setLoading(false);
      }
    }
  }, [timeRange, selectedTable]);

  useEffect(() => {
    fetchHistory();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [timeRange, selectedTable]);

  const prepareAggregatedData = () => {
    if (!historyData.length) return null;

    const sorted = [...historyData].sort((a, b) => 
      new Date(a.check_timestamp).getTime() - new Date(b.check_timestamp).getTime()
    );

    let aggregatedData: any[];
    if (!selectedTable) {
      const byTimestamp = new Map<string, { 
        quality_score: number; 
        null_count: number; 
        duplicate_count: number; 
        invalid_type_count: number;
        count: number; 
        timestamp: string;
      }>();
      
      sorted.forEach(item => {
        const timestamp = new Date(item.check_timestamp).toISOString();
        if (!byTimestamp.has(timestamp)) {
          byTimestamp.set(timestamp, { 
            quality_score: 0, 
            null_count: 0, 
            duplicate_count: 0, 
            invalid_type_count: 0,
            count: 0, 
            timestamp 
          });
        }
        const agg = byTimestamp.get(timestamp)!;
        agg.quality_score += item.quality_score || 0;
        agg.null_count += item.null_count || 0;
        agg.duplicate_count += item.duplicate_count || 0;
        agg.invalid_type_count += item.invalid_type_count || 0;
        agg.count += 1;
      });

      aggregatedData = Array.from(byTimestamp.values())
        .map(agg => ({
          check_timestamp: agg.timestamp,
          quality_score: agg.count > 0 ? agg.quality_score / agg.count : 0,
          null_count: agg.null_count,
          duplicate_count: agg.duplicate_count,
          invalid_type_count: agg.invalid_type_count
        }))
        .sort((a, b) => new Date(a.check_timestamp).getTime() - new Date(b.check_timestamp).getTime());
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

  const prepareStatusDistributionData = () => {
    if (!statsData?.summary) return null;

    return {
      labels: ['PASSED', 'WARNING', 'FAILED'],
      datasets: [
        {
          data: [
            parseInt(statsData.summary.passed_count || 0),
            parseInt(statsData.summary.warning_count || 0),
            parseInt(statsData.summary.failed_count || 0)
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

  const prepareEngineDistributionData = () => {
    if (!statsData?.byEngine || !statsData.byEngine.length) return null;

    return {
      labels: statsData.byEngine.map((e: any) => e.source_db_engine),
      datasets: [
        {
          label: 'Tables',
          data: statsData.byEngine.map((e: any) => parseInt(e.table_count || 0)),
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
  const statusPieData = prepareStatusDistributionData();
  const enginePieData = prepareEngineDistributionData();

  const qualityScoreData = aggregatedData ? aggregatedData.map(d => Number(d.quality_score) || 0) : [];
  const qualityScoreLabels = aggregatedData ? aggregatedData.map(d => d.check_timestamp) : [];
  const nullCountData = aggregatedData ? aggregatedData.map(d => Number(d.null_count) || 0) : [];
  const duplicateCountData = aggregatedData ? aggregatedData.map(d => Number(d.duplicate_count) || 0) : [];
  const invalidTypeData = aggregatedData ? aggregatedData.map(d => Number(d.invalid_type_count) || 0) : [];

  const currentQualityScore = qualityScoreData.length > 0 ? Number(qualityScoreData[qualityScoreData.length - 1]) || 0 : 0;
  const currentNullCount = nullCountData.length > 0 ? Number(nullCountData[nullCountData.length - 1]) || 0 : 0;
  const currentDuplicateCount = duplicateCountData.length > 0 ? Number(duplicateCountData[duplicateCountData.length - 1]) || 0 : 0;
  const currentInvalidType = invalidTypeData.length > 0 ? Number(invalidTypeData[invalidTypeData.length - 1]) || 0 : 0;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: asciiColors.foreground,
          font: {
            family: 'Consolas',
            size: 11
          }
        }
      },
      tooltip: {
        backgroundColor: asciiColors.background,
        titleColor: asciiColors.foreground,
        bodyColor: asciiColors.foreground,
        borderColor: asciiColors.border,
        borderWidth: 1,
        padding: 12,
        font: {
          family: 'Consolas',
          size: 11
        }
      }
    }
  };

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

      {!loading && !error && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          {statusPieData && (() => {
            const total = statusPieData.datasets[0].data.reduce((a: number, b: number) => a + b, 0);
            const passed = statusPieData.datasets[0].data[0] || 0;
            const warning = statusPieData.datasets[0].data[1] || 0;
            const failed = statusPieData.datasets[0].data[2] || 0;
            const passedPct = total > 0 ? (passed / total) * 100 : 0;
            const warningPct = total > 0 ? (warning / total) * 100 : 0;
            const failedPct = total > 0 ? (failed / total) * 100 : 0;
            const barWidth = 40;
            
            return (
              <AsciiPanel title="STATUS DISTRIBUTION">
                <div style={{ 
                  fontFamily: 'Consolas', 
                  fontSize: 11,
                  padding: '12px',
                  lineHeight: 1.8
                }}>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ color: asciiColors.muted }}>├─ PASSED:</span>
                      <span style={{ color: asciiColors.success, fontWeight: 600 }}>{passed} ({passedPct.toFixed(1)}%)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 12 }}>
                      <span style={{ color: asciiColors.success }}>
                        {ascii.blockFull.repeat(Math.round((passedPct / 100) * barWidth))}
                        {ascii.blockLight.repeat(barWidth - Math.round((passedPct / 100) * barWidth))}
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
                      <span style={{ color: asciiColors.muted }}>└─ FAILED:</span>
                      <span style={{ color: asciiColors.danger, fontWeight: 600 }}>{failed} ({failedPct.toFixed(1)}%)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 12 }}>
                      <span style={{ color: asciiColors.danger }}>
                        {ascii.blockFull.repeat(Math.round((failedPct / 100) * barWidth))}
                        {ascii.blockLight.repeat(barWidth - Math.round((failedPct / 100) * barWidth))}
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
                    <span style={{ color: asciiColors.foreground, fontWeight: 600, fontSize: 10 }}>{total} tables</span>
                  </div>
                </div>
              </AsciiPanel>
            );
          })()}

          {enginePieData && statsData?.byEngine && (() => {
            const engines = statsData.byEngine;
            const total = engines.reduce((sum: number, e: any) => sum + parseInt(e.table_count || 0), 0);
            const barWidth = 40;
            
            return (
              <AsciiPanel title="ENGINE DISTRIBUTION">
                <div style={{ 
                  fontFamily: 'Consolas', 
                  fontSize: 11,
                  padding: '12px',
                  lineHeight: 1.8
                }}>
                  {engines.map((engine: any, idx: number) => {
                    const count = parseInt(engine.table_count || 0);
                    const pct = total > 0 ? (count / total) * 100 : 0;
                    const isLast = idx === engines.length - 1;
                    const prefix = isLast ? '└─' : '├─';
                    const engineName = engine.source_db_engine || 'Unknown';
                    
                    return (
                      <div key={idx} style={{ marginBottom: isLast ? 4 : 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ color: asciiColors.muted }}>{prefix} {engineName}:</span>
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
                    <span style={{ color: asciiColors.foreground, fontWeight: 600, fontSize: 10 }}>{total} tables</span>
                  </div>
                </div>
              </AsciiPanel>
            );
          })()}
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
            {ascii.blockFull} QUALITY METRICS
          </h2>
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12
          }}>
            {renderMetricCard(
              "Quality Score",
              currentQualityScore,
              "%",
              qualityScoreData,
              currentQualityScore >= 90 ? asciiColors.success : currentQualityScore >= 70 ? asciiColors.warning : asciiColors.danger,
              ascii.blockFull,
              100,
              qualityScoreLabels
            )}
            
            {renderMetricCard(
              "Null Count",
              currentNullCount,
              "",
              nullCountData,
              asciiColors.warning,
              ascii.blockSemi,
              undefined,
              qualityScoreLabels
            )}
            
            {renderMetricCard(
              "Duplicate Count",
              currentDuplicateCount,
              "",
              duplicateCountData,
              asciiColors.danger,
              ascii.blockLight,
              undefined,
              qualityScoreLabels
            )}
            
            {renderMetricCard(
              "Invalid Type Count",
              currentInvalidType,
              "",
              invalidTypeData,
              '#ff6b6b',
              ascii.dot,
              undefined,
              qualityScoreLabels
            )}
          </div>
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
            {ascii.blockFull} QUALITY SUMMARY
          </h2>
          <div style={{ 
            fontFamily: "Consolas",
            fontSize: 11,
            lineHeight: 1.8,
            color: asciiColors.foreground
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: asciiColors.muted }}>├─ Total Tables:</span>
              <span style={{ fontWeight: 500, marginLeft: '20px' }}>{statsData.summary.total_tables || 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: asciiColors.muted }}>├─ Passed:</span>
              <span style={{ fontWeight: 500, marginLeft: '20px', color: asciiColors.success }}>
                {statsData.summary.passed_count || 0}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: asciiColors.muted }}>├─ Warning:</span>
              <span style={{ fontWeight: 500, marginLeft: '20px', color: asciiColors.warning }}>
                {statsData.summary.warning_count || 0}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: asciiColors.muted }}>├─ Failed:</span>
              <span style={{ fontWeight: 500, marginLeft: '20px', color: asciiColors.danger }}>
                {statsData.summary.failed_count || 0}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: asciiColors.muted }}>├─ Avg Quality Score:</span>
              <span style={{ 
                fontWeight: 500, 
                marginLeft: '20px',
                color: parseFloat(statsData.summary.avg_score || 0) >= 90 ? asciiColors.success : 
                       parseFloat(statsData.summary.avg_score || 0) >= 70 ? asciiColors.warning : 
                       asciiColors.danger
              }}>
                {parseFloat(statsData.summary.avg_score || 0).toFixed(2)}%
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: asciiColors.muted }}>├─ Engines:</span>
              <span style={{ fontWeight: 500, marginLeft: '20px' }}>{statsData.summary.engine_count || 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: asciiColors.muted }}>└─ Schemas:</span>
              <span style={{ fontWeight: 500, marginLeft: '20px' }}>{statsData.summary.schema_count || 0}</span>
            </div>
          </div>
        </div>
      )}

      {!loading && !error && statsData?.byEngine && statsData.byEngine.length > 0 && (
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
            {ascii.blockFull} STATUS BY ENGINE
          </h2>
          <div style={{ 
            fontFamily: "Consolas",
            fontSize: 11,
            lineHeight: 1.8,
            color: asciiColors.foreground
          }}>
            {statsData.byEngine.map((engine: any, idx: number) => (
              <div key={idx} style={{ marginBottom: idx < statsData.byEngine.length - 1 ? 8 : 0 }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  marginBottom: '4px',
                  fontWeight: 500,
                  color: asciiColors.accent
                }}>
                  <span>{engine.source_db_engine}:</span>
                  <span>{engine.table_count || 0} tables</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px', marginLeft: 12 }}>
                  <span style={{ color: asciiColors.muted, fontSize: 10 }}>├─ Passed:</span>
                  <span style={{ color: asciiColors.success, fontSize: 10 }}>{engine.passed || 0}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px', marginLeft: 12 }}>
                  <span style={{ color: asciiColors.muted, fontSize: 10 }}>├─ Warning:</span>
                  <span style={{ color: asciiColors.warning, fontSize: 10 }}>{engine.warning || 0}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', marginLeft: 12 }}>
                  <span style={{ color: asciiColors.muted, fontSize: 10 }}>└─ Failed:</span>
                  <span style={{ color: asciiColors.danger, fontSize: 10 }}>{engine.failed || 0}</span>
                </div>
                {idx < statsData.byEngine.length - 1 && (
                  <div style={{ 
                    borderBottom: `1px solid ${asciiColors.border}`, 
                    marginTop: 8, 
                    marginBottom: 8 
                  }} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default QualityCharts;
