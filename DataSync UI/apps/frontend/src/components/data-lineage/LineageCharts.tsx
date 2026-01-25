import { useState, useEffect, useCallback, useRef } from 'react';
import { extractApiError } from '../../utils/errorHandler';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';

interface LineageChartsProps {
  engine: 'mariadb' | 'mssql' | 'mongodb' | 'oracle';
  getMetrics: () => Promise<any>;
  getStats: () => Promise<any>;
}

const LineageCharts: React.FC<LineageChartsProps> = ({ engine, getMetrics, getStats }) => {
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
        getMetrics(),
        getStats()
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
        console.error('Error fetching lineage charts data:', err);
      }
    } finally {
      if (abortControllerRef.current === currentController) {
        setLoading(false);
      }
    }
  }, [getMetrics, getStats]);

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
            Total: {total.toLocaleString()} relationships
          </div>
        </div>
      </AsciiPanel>
    );
  };

  if (loading && !metrics.total_relationships) {
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

  const engineName = engine.toUpperCase();

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
          {ascii.tl}{ascii.h.repeat(2)} LINEAGE METRICS - {engineName}
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          {renderMetricCard('Total Relationships', metrics.total_relationships)}
          {renderMetricCard('Unique Objects', metrics.unique_objects)}
          {renderMetricCard('High Confidence', metrics.high_confidence, `${((Number(metrics.high_confidence) || 0) / (Number(metrics.total_relationships) || 1) * 100).toFixed(1)}% of total`, asciiColors.success)}
          {renderMetricCard('Low Confidence', metrics.low_confidence, `${((Number(metrics.low_confidence) || 0) / (Number(metrics.total_relationships) || 1) * 100).toFixed(1)}% of total`, asciiColors.warning)}
          {renderMetricCard('Avg Confidence', metrics.avg_confidence ? Number(metrics.avg_confidence).toFixed(2) : 'N/A', 'Score (0-1)')}
          {renderMetricCard('Unique Servers', metrics.unique_servers)}
          {renderMetricCard('Unique Relationship Types', metrics.unique_relationship_types)}
          {renderMetricCard('Unique Discovery Methods', metrics.unique_discovery_methods)}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {stats?.relationship_distribution && renderDistributionChart(
            'RELATIONSHIP TYPE DISTRIBUTION',
            stats.relationship_distribution,
            'relationship_type',
            'count',
            [asciiColors.accent, asciiColors.success, asciiColors.warning, asciiColors.error, asciiColors.info]
          )}
          {stats?.object_type_distribution && renderDistributionChart(
            'OBJECT TYPE DISTRIBUTION',
            stats.object_type_distribution,
            'object_type',
            'count',
            [asciiColors.success, asciiColors.warning, asciiColors.error, asciiColors.info, '#9b59b6']
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {stats?.confidence_distribution && renderDistributionChart(
            'CONFIDENCE LEVEL DISTRIBUTION',
            stats.confidence_distribution,
            'confidence_level',
            'count',
            [asciiColors.success, asciiColors.warning, asciiColors.error, asciiColors.muted]
          )}
          {stats?.discovery_method_distribution && renderDistributionChart(
            'DISCOVERY METHOD DISTRIBUTION',
            stats.discovery_method_distribution,
            'discovery_method',
            'count'
          )}
        </div>
      </div>

      <AsciiPanel>
        <div style={{ padding: '16px' }}>
          <div style={{
            fontSize: 12,
            fontWeight: 700,
            color: asciiColors.foreground,
            marginBottom: 12,
            fontFamily: 'Consolas'
          }}>
            {ascii.tl}{ascii.h.repeat(2)} LINEAGE SUMMARY - {engineName}
          </div>
          <div style={{
            fontSize: 11,
            color: asciiColors.foreground,
            lineHeight: 1.8,
            fontFamily: 'Consolas'
          }}>
            <div>{ascii.v} Total Relationships: <span style={{ color: asciiColors.accent, fontWeight: 600 }}>{Number(metrics.total_relationships || 0).toLocaleString()}</span></div>
            <div>{ascii.v} Unique Objects: <span style={{ color: asciiColors.accent, fontWeight: 600 }}>{Number(metrics.unique_objects || 0).toLocaleString()}</span></div>
            <div>{ascii.v} High Confidence: <span style={{ color: asciiColors.success, fontWeight: 600 }}>{Number(metrics.high_confidence || 0).toLocaleString()}</span> ({((Number(metrics.high_confidence) || 0) / (Number(metrics.total_relationships) || 1) * 100).toFixed(1)}%)</div>
            <div>{ascii.v} Low Confidence: <span style={{ color: asciiColors.warning, fontWeight: 600 }}>{Number(metrics.low_confidence || 0).toLocaleString()}</span> ({((Number(metrics.low_confidence) || 0) / (Number(metrics.total_relationships) || 1) * 100).toFixed(1)}%)</div>
            {metrics.avg_confidence && (
              <div>{ascii.v} Avg Confidence: <span style={{ color: asciiColors.accent, fontWeight: 600 }}>{Number(metrics.avg_confidence).toFixed(2)}</span></div>
            )}
            <div>{ascii.v} Unique Servers: <span style={{ color: asciiColors.accent, fontWeight: 600 }}>{Number(metrics.unique_servers || 0).toLocaleString()}</span></div>
            <div>{ascii.v} Unique Relationship Types: <span style={{ color: asciiColors.accent, fontWeight: 600 }}>{Number(metrics.unique_relationship_types || 0).toLocaleString()}</span></div>
            <div>{ascii.v} Unique Discovery Methods: <span style={{ color: asciiColors.accent, fontWeight: 600 }}>{Number(metrics.unique_discovery_methods || 0).toLocaleString()}</span></div>
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${asciiColors.border}` }}>
              {ascii.bl}{ascii.h.repeat(40)}
            </div>
          </div>
        </div>
      </AsciiPanel>
    </div>
  );
};

export default LineageCharts;
