import { useState, useEffect, useCallback, useRef } from 'react';
import { columnCatalogApi } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';

const ColumnCatalogCharts: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<any>({});
  const [stats, setStats] = useState<any>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const currentController = abortControllerRef.current;

    setLoading(true);
    setError(null);

    try {
      const [metricsData, statsData] = await Promise.all([
        columnCatalogApi.getMetrics(),
        columnCatalogApi.getStats()
      ]);

      if (!currentController.signal.aborted && abortControllerRef.current === currentController) {
        setMetrics(metricsData || {});
        setStats(statsData || {});
      }
    } catch (err: any) {
      const isCanceled = err.name === 'CanceledError' || 
                        err.name === 'AbortError' || 
                        err.message?.includes('canceled') ||
                        err.message?.includes('aborted');
      
      if (!isCanceled && abortControllerRef.current === currentController) {
        const errorMessage = extractApiError(err);
        setError(errorMessage);
        console.error('Error fetching column catalog charts data:', err);
      }
    } finally {
      if (abortControllerRef.current === currentController) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      clearInterval(interval);
    };
  }, [fetchData]);

  const renderMetricCard = (title: string, value: number | string | null | undefined, subtitle?: string, color: string = asciiColors.accent) => {
    const displayValue = value === null || value === undefined ? 'N/A' : Number(value).toLocaleString();
    return (
      <div style={{
        padding: '16px',
        backgroundColor: asciiColors.background,
        border: `1px solid ${asciiColors.border}`,
        borderRadius: 4,
        minWidth: '150px'
      }}>
        <div style={{
          fontSize: 11,
          color: asciiColors.muted,
          marginBottom: 8,
          textTransform: 'uppercase',
          letterSpacing: 0.5
        }}>
          {title}
        </div>
        <div style={{
          fontSize: 24,
          fontWeight: 700,
          color: color,
          fontFamily: 'Consolas',
          marginBottom: subtitle ? 4 : 0
        }}>
          {displayValue}
        </div>
        {subtitle && (
          <div style={{
            fontSize: 10,
            color: asciiColors.muted
          }}>
            {subtitle}
          </div>
        )}
      </div>
    );
  };

  const renderDistributionChart = (title: string, data: any[], labelKey: string, valueKey: string, colors: string[] = []) => {
    if (!data || data.length === 0) {
      return (
        <AsciiPanel>
          <div style={{ padding: '20px', textAlign: 'center', color: asciiColors.muted }}>
            No data available
          </div>
        </AsciiPanel>
      );
    }

    const total = data.reduce((sum, item) => sum + (Number(item[valueKey]) || 0), 0);
    const defaultColors = [
      asciiColors.accent,
      asciiColors.success,
      asciiColors.warning,
      asciiColors.error,
      asciiColors.info,
      '#9b59b6',
      '#e74c3c',
      '#3498db',
      '#f39c12',
      '#1abc9c',
      '#34495e',
      '#e67e22',
      '#16a085',
      '#c0392b',
      '#8e44ad'
    ];

    return (
      <AsciiPanel>
        <div style={{ marginBottom: '16px' }}>
          <div style={{
            fontSize: 12,
            fontWeight: 700,
            color: asciiColors.foreground,
            marginBottom: 8,
            fontFamily: 'Consolas'
          }}>
            {ascii.tl}{ascii.h.repeat(2)} {title}
          </div>
        </div>
        <div style={{ padding: '0 16px 16px' }}>
          {data.map((item, index) => {
            const value = Number(item[valueKey]) || 0;
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
            const barWidth = total > 0 ? (value / total) * 100 : 0;
            const color = colors[index] || defaultColors[index % defaultColors.length];
            
            return (
              <div key={index} style={{ marginBottom: 12 }}>
                <div style={{
                  fontSize: 10,
                  color: asciiColors.foreground,
                  marginBottom: 4,
                  fontFamily: 'Consolas',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span>{ascii.v} {item[labelKey] || 'Unknown'}</span>
                  <span style={{ color: asciiColors.muted }}>{value.toLocaleString()} ({percentage}%)</span>
                </div>
                <div style={{
                  width: '100%',
                  height: 10,
                  backgroundColor: asciiColors.border,
                  borderRadius: 2,
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${barWidth}%`,
                    height: '100%',
                    backgroundColor: color,
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>
            );
          })}
          <div style={{
            marginTop: 16,
            paddingTop: 12,
            borderTop: `1px solid ${asciiColors.border}`,
            fontSize: 10,
            color: asciiColors.muted,
            fontFamily: 'Consolas'
          }}>
            {ascii.bl}{ascii.h.repeat(30)}
            <br />
            Total: {total.toLocaleString()} columns
          </div>
        </div>
      </AsciiPanel>
    );
  };

  if (loading && !metrics.total_columns) {
    return (
      <AsciiPanel>
        <div style={{ padding: '40px', textAlign: 'center', color: asciiColors.muted }}>
          Loading charts...
        </div>
      </AsciiPanel>
    );
  }

  if (error) {
    return (
      <AsciiPanel>
        <div style={{ padding: '20px', color: asciiColors.error }}>
          Error: {error}
        </div>
      </AsciiPanel>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '24px' }}>
        <div style={{
          fontSize: 14,
          fontWeight: 700,
          color: asciiColors.foreground,
          marginBottom: 16,
          fontFamily: 'Consolas'
        }}>
          {ascii.tl}{ascii.h.repeat(2)} COLUMN CATALOG METRICS
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          {renderMetricCard('Total Columns', metrics.total_columns)}
          {renderMetricCard('PII Columns', metrics.pii_columns, `${((Number(metrics.pii_columns) || 0) / (Number(metrics.total_columns) || 1) * 100).toFixed(1)}% of total`, asciiColors.warning)}
          {renderMetricCard('PHI Columns', metrics.phi_columns, `${((Number(metrics.phi_columns) || 0) / (Number(metrics.total_columns) || 1) * 100).toFixed(1)}% of total`, asciiColors.error)}
          {renderMetricCard('High Sensitivity', metrics.high_sensitivity, `${((Number(metrics.high_sensitivity) || 0) / (Number(metrics.total_columns) || 1) * 100).toFixed(1)}% of total`, asciiColors.error)}
          {renderMetricCard('Primary Keys', metrics.primary_keys)}
          {renderMetricCard('Indexed Columns', metrics.indexed_columns)}
          {renderMetricCard('Profiled Columns', metrics.profiled_columns, `${((Number(metrics.profiled_columns) || 0) / (Number(metrics.total_columns) || 1) * 100).toFixed(1)}% of total`)}
          {renderMetricCard('Avg Profiling Score', metrics.avg_profiling_score ? Number(metrics.avg_profiling_score).toFixed(1) : 'N/A', 'Quality score')}
          {renderMetricCard('With Anomalies', metrics.columns_with_anomalies, `${((Number(metrics.columns_with_anomalies) || 0) / (Number(metrics.total_columns) || 1) * 100).toFixed(1)}% of total`, asciiColors.warning)}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {stats?.data_type_distribution && renderDistributionChart(
            'DATA TYPE DISTRIBUTION',
            stats.data_type_distribution,
            'data_type',
            'count',
            [asciiColors.accent, asciiColors.success, asciiColors.warning, asciiColors.error, asciiColors.info, '#9b59b6', '#e74c3c', '#3498db', '#f39c12', '#1abc9c', '#34495e', '#e67e22', '#16a085', '#c0392b', '#8e44ad']
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {stats?.sensitivity_distribution && renderDistributionChart(
            'SENSITIVITY LEVEL DISTRIBUTION',
            stats.sensitivity_distribution,
            'sensitivity_level',
            'count',
            [asciiColors.success, asciiColors.warning, asciiColors.error, asciiColors.muted]
          )}
          {stats?.engine_distribution && renderDistributionChart(
            'ENGINE DISTRIBUTION',
            stats.engine_distribution,
            'db_engine',
            'count'
          )}
          {stats?.pii_distribution && renderDistributionChart(
            'SENSITIVE DATA DISTRIBUTION',
            stats.pii_distribution,
            'category',
            'count',
            [asciiColors.error, asciiColors.warning, asciiColors.info, asciiColors.success]
          )}
        </div>
      </div>

      {stats?.profiling_distribution && (
        <div style={{ marginBottom: '24px' }}>
          {renderDistributionChart(
            'PROFILING QUALITY DISTRIBUTION',
            stats.profiling_distribution,
            'quality_range',
            'count',
            [asciiColors.success, asciiColors.info, asciiColors.warning, asciiColors.error, asciiColors.muted]
          )}
        </div>
      )}

      <AsciiPanel>
        <div style={{ padding: '16px' }}>
          <div style={{
            fontSize: 12,
            fontWeight: 700,
            color: asciiColors.foreground,
            marginBottom: 12,
            fontFamily: 'Consolas'
          }}>
            {ascii.tl}{ascii.h.repeat(2)} COLUMN CATALOG SUMMARY
          </div>
          <div style={{
            fontSize: 11,
            color: asciiColors.foreground,
            lineHeight: 1.8,
            fontFamily: 'Consolas'
          }}>
            <div>{ascii.v} Total Columns: <span style={{ color: asciiColors.accent, fontWeight: 600 }}>{Number(metrics.total_columns || 0).toLocaleString()}</span></div>
            <div>{ascii.v} PII Columns: <span style={{ color: asciiColors.warning, fontWeight: 600 }}>{Number(metrics.pii_columns || 0).toLocaleString()}</span> ({((Number(metrics.pii_columns) || 0) / (Number(metrics.total_columns) || 1) * 100).toFixed(1)}%)</div>
            <div>{ascii.v} PHI Columns: <span style={{ color: asciiColors.error, fontWeight: 600 }}>{Number(metrics.phi_columns || 0).toLocaleString()}</span> ({((Number(metrics.phi_columns) || 0) / (Number(metrics.total_columns) || 1) * 100).toFixed(1)}%)</div>
            <div>{ascii.v} High Sensitivity: <span style={{ color: asciiColors.error, fontWeight: 600 }}>{Number(metrics.high_sensitivity || 0).toLocaleString()}</span> ({((Number(metrics.high_sensitivity) || 0) / (Number(metrics.total_columns) || 1) * 100).toFixed(1)}%)</div>
            <div>{ascii.v} Profiled Columns: <span style={{ color: asciiColors.accent, fontWeight: 600 }}>{Number(metrics.profiled_columns || 0).toLocaleString()}</span> ({((Number(metrics.profiled_columns) || 0) / (Number(metrics.total_columns) || 1) * 100).toFixed(1)}%)</div>
            {metrics.avg_profiling_score && (
              <div>{ascii.v} Avg Profiling Score: <span style={{ color: asciiColors.accent, fontWeight: 600 }}>{Number(metrics.avg_profiling_score).toFixed(1)}</span></div>
            )}
            <div>{ascii.v} Columns with Anomalies: <span style={{ color: asciiColors.warning, fontWeight: 600 }}>{Number(metrics.columns_with_anomalies || 0).toLocaleString()}</span> ({((Number(metrics.columns_with_anomalies) || 0) / (Number(metrics.total_columns) || 1) * 100).toFixed(1)}%)</div>
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${asciiColors.border}` }}>
              {ascii.bl}{ascii.h.repeat(40)}
            </div>
          </div>
        </div>
      </AsciiPanel>
    </div>
  );
};

export default ColumnCatalogCharts;
