import React, { useState, useEffect, useCallback } from 'react';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { theme } from '../../theme/theme';
import { monitoringApi } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import SkeletonLoader from '../shared/SkeletonLoader';

interface Bottleneck {
  id: string;
  resource_type: string;
  severity: string;
  component?: string;
  description: string;
  recommendations: string[];
  detected_at: string;
}

const BottleneckDetection = () => {
  const [bottlenecks, setBottlenecks] = useState<Bottleneck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const fetchBottlenecks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await monitoringApi.getCurrentBottlenecks();
      setBottlenecks(data.bottlenecks || data || []);
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAnalyze = useCallback(async () => {
    try {
      setAnalyzing(true);
      setError(null);
      const data = await monitoringApi.analyzeBottlenecks();
      setBottlenecks(data.bottlenecks || data || []);
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setAnalyzing(false);
    }
  }, []);

  useEffect(() => {
    fetchBottlenecks();
    const interval = setInterval(fetchBottlenecks, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [fetchBottlenecks]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return asciiColors.error;
      case 'high': return asciiColors.warning;
      case 'medium': return '#ffa500';
      case 'low': return asciiColors.muted;
      default: return asciiColors.muted;
    }
  };

  if (loading && bottlenecks.length === 0) {
    return <SkeletonLoader />;
  }

  return (
    <div style={{ padding: theme.spacing.lg }}>
      <AsciiPanel>
        <div style={{ marginBottom: theme.spacing.lg }}>
          <h1 style={{
            fontSize: 18,
            fontWeight: 600,
            color: asciiColors.foreground,
            marginBottom: theme.spacing.md
          }}>
            Bottleneck Detection
          </h1>
          <p style={{
            color: asciiColors.muted,
            fontSize: 12,
            marginBottom: theme.spacing.lg
          }}>
            Automatic detection of system bottlenecks and performance issues
          </p>

          <div style={{
            display: 'flex',
            gap: theme.spacing.md,
            marginBottom: theme.spacing.lg,
            alignItems: 'center'
          }}>
            <AsciiButton
              label={analyzing ? "Analyzing..." : "Analyze Now"}
              onClick={handleAnalyze}
              disabled={analyzing}
            />
            <AsciiButton
              label="Refresh"
              onClick={fetchBottlenecks}
            />
          </div>

          {error && (
            <div style={{
              padding: theme.spacing.md,
              background: asciiColors.error,
              color: '#ffffff',
              marginBottom: theme.spacing.md,
              borderRadius: 2,
              fontSize: 12
            }}>
              {error}
            </div>
          )}

          {bottlenecks.length === 0 ? (
            <div style={{
              padding: theme.spacing.xl,
              textAlign: 'center',
              color: asciiColors.muted,
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2
            }}>
              No bottlenecks detected. System is running smoothly.
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gap: theme.spacing.md
            }}>
              {bottlenecks.map((bottleneck) => (
                <div
                  key={bottleneck.id}
                  style={{
                    padding: theme.spacing.md,
                    border: `1px solid ${getSeverityColor(bottleneck.severity)}`,
                    borderRadius: 2,
                    background: asciiColors.background
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: theme.spacing.sm
                  }}>
                    <div>
                      <span style={{
                        padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                        background: getSeverityColor(bottleneck.severity),
                        color: '#ffffff',
                        fontSize: 10,
                        fontWeight: 600,
                        borderRadius: 2,
                        textTransform: 'uppercase',
                        marginRight: theme.spacing.sm
                      }}>
                        {bottleneck.severity}
                      </span>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>
                        {bottleneck.resource_type.toUpperCase()}
                      </span>
                      {bottleneck.component && (
                        <span style={{ fontSize: 12, color: asciiColors.muted, marginLeft: theme.spacing.sm }}>
                          ({bottleneck.component})
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: 11, color: asciiColors.muted }}>
                      {new Date(bottleneck.detected_at).toLocaleString()}
                    </span>
                  </div>
                  <div style={{
                    fontSize: 12,
                    color: asciiColors.foreground,
                    marginBottom: theme.spacing.sm
                  }}>
                    {bottleneck.description}
                  </div>
                  {bottleneck.recommendations && bottleneck.recommendations.length > 0 && (
                    <div style={{ marginTop: theme.spacing.sm }}>
                      <div style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: asciiColors.foreground,
                        marginBottom: theme.spacing.xs
                      }}>
                        Recommendations:
                      </div>
                      <ul style={{
                        margin: 0,
                        paddingLeft: theme.spacing.lg,
                        fontSize: 11,
                        color: asciiColors.muted
                      }}>
                        {bottleneck.recommendations.map((rec, idx) => (
                          <li key={idx} style={{ marginBottom: theme.spacing.xs }}>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </AsciiPanel>
    </div>
  );
};

export default BottleneckDetection;
