import React, { useState, useEffect, useCallback } from 'react';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { theme } from '../../theme/theme';
import { monitoringApi } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import SkeletonLoader from '../shared/SkeletonLoader';

interface ResourceMetrics {
  cpu_percent: number;
  memory_percent: number;
  memory_used_mb: number;
  memory_total_mb: number;
  db_connections: number;
  db_locks: number;
  db_cache_hit_ratio: number;
  timestamp: string;
}

interface ResourcePrediction {
  resource_type: string;
  current_usage: number;
  predicted_usage: number;
  days_until_exhaustion: number;
  confidence: number;
}

const ResourceTracking = () => {
  const [currentResources, setCurrentResources] = useState<ResourceMetrics | null>(null);
  const [history, setHistory] = useState<ResourceMetrics[]>([]);
  const [predictions, setPredictions] = useState<ResourcePrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [currentData, historyData, predictionsData] = await Promise.all([
        monitoringApi.getCurrentResources().catch(() => null),
        monitoringApi.getResourceHistory({ hours: 24 }).catch(() => []),
        monitoringApi.getResourcePredictions().catch(() => [])
      ]);
      setCurrentResources(currentData);
      setHistory(historyData || []);
      setPredictions(predictionsData || []);
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [fetchData]);

  const getUsageColor = (percent: number | null | undefined) => {
    if (percent == null || Number.isNaN(percent)) return asciiColors.muted;
    if (percent > 90) return asciiColors.error;
    if (percent > 80) return asciiColors.warning;
    return asciiColors.success;
  };

  const formatPercent = (n: number | null | undefined) =>
    n != null && !Number.isNaN(n) ? n.toFixed(1) : '—';
  const formatNumber = (n: number | null | undefined, decimals = 0) =>
    n != null && !Number.isNaN(n) ? n.toFixed(decimals) : '—';

  if (loading && !currentResources) {
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
            Resource Tracking
          </h1>
          <p style={{
            color: asciiColors.muted,
            fontSize: 12,
            marginBottom: theme.spacing.lg
          }}>
            Monitor system resource utilization and capacity predictions
          </p>

          <div style={{ marginBottom: theme.spacing.lg }}>
            <AsciiButton
              label="Refresh"
              onClick={fetchData}
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

          {/* Current Resources */}
          {currentResources && (
            <div style={{ marginBottom: theme.spacing.lg }}>
              <h3 style={{
                fontSize: 14,
                fontWeight: 600,
                color: asciiColors.foreground,
                marginBottom: theme.spacing.md
              }}>
                Current Resources
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: theme.spacing.md
              }}>
                <div style={{
                  padding: theme.spacing.md,
                  border: `1px solid ${asciiColors.border}`,
                  borderRadius: 2
                }}>
                  <div style={{ fontSize: 11, color: asciiColors.muted, marginBottom: theme.spacing.xs }}>
                    CPU Usage
                  </div>
                  <div style={{
                    fontSize: 20,
                    fontWeight: 600,
                    color: getUsageColor(currentResources.cpu_percent)
                  }}>
                    {formatPercent(currentResources.cpu_percent)}%
                  </div>
                </div>
                <div style={{
                  padding: theme.spacing.md,
                  border: `1px solid ${asciiColors.border}`,
                  borderRadius: 2
                }}>
                  <div style={{ fontSize: 11, color: asciiColors.muted, marginBottom: theme.spacing.xs }}>
                    Memory Usage
                  </div>
                  <div style={{
                    fontSize: 20,
                    fontWeight: 600,
                    color: getUsageColor(currentResources.memory_percent)
                  }}>
                    {formatPercent(currentResources.memory_percent)}%
                  </div>
                  <div style={{ fontSize: 10, color: asciiColors.muted, marginTop: theme.spacing.xs }}>
                    {formatNumber(currentResources.memory_used_mb)} MB / {formatNumber(currentResources.memory_total_mb)} MB
                  </div>
                </div>
                <div style={{
                  padding: theme.spacing.md,
                  border: `1px solid ${asciiColors.border}`,
                  borderRadius: 2
                }}>
                  <div style={{ fontSize: 11, color: asciiColors.muted, marginBottom: theme.spacing.xs }}>
                    DB Connections
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 600, color: asciiColors.foreground }}>
                    {currentResources.db_connections != null ? currentResources.db_connections : '—'}
                  </div>
                </div>
                <div style={{
                  padding: theme.spacing.md,
                  border: `1px solid ${asciiColors.border}`,
                  borderRadius: 2
                }}>
                  <div style={{ fontSize: 11, color: asciiColors.muted, marginBottom: theme.spacing.xs }}>
                    DB Locks
                  </div>
                  <div style={{
                    fontSize: 20,
                    fontWeight: 600,
                    color: (currentResources.db_locks ?? 0) > 10 ? asciiColors.error : asciiColors.foreground
                  }}>
                    {currentResources.db_locks != null ? currentResources.db_locks : '—'}
                  </div>
                </div>
                <div style={{
                  padding: theme.spacing.md,
                  border: `1px solid ${asciiColors.border}`,
                  borderRadius: 2
                }}>
                  <div style={{ fontSize: 11, color: asciiColors.muted, marginBottom: theme.spacing.xs }}>
                    Cache Hit Ratio
                  </div>
                  <div style={{
                    fontSize: 20,
                    fontWeight: 600,
                    color: (currentResources.db_cache_hit_ratio ?? 0) < 80 ? asciiColors.warning : asciiColors.success
                  }}>
                    {formatPercent(currentResources.db_cache_hit_ratio)}%
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Predictions */}
          {predictions.length > 0 && (
            <div style={{ marginBottom: theme.spacing.lg }}>
              <h3 style={{
                fontSize: 14,
                fontWeight: 600,
                color: asciiColors.foreground,
                marginBottom: theme.spacing.md
              }}>
                Capacity Predictions
              </h3>
              <div style={{
                display: 'grid',
                gap: theme.spacing.md
              }}>
                {predictions.map((pred, idx) => (
                  <div
                    key={idx}
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
                      <span style={{ fontWeight: 600, fontSize: 14, textTransform: 'capitalize' }}>
                        {pred.resource_type}
                      </span>
                      {pred.days_until_exhaustion > 0 && (
                        <span style={{
                          fontSize: 11,
                          color: pred.days_until_exhaustion < 30 ? asciiColors.error : asciiColors.warning
                        }}>
                          {pred.days_until_exhaustion} days until exhaustion
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: asciiColors.muted }}>
                      Current: {formatPercent(pred.current_usage)}% | Predicted: {formatPercent(pred.predicted_usage)}% | Confidence: {formatPercent(pred.confidence)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </AsciiPanel>
    </div>
  );
};

export default ResourceTracking;
