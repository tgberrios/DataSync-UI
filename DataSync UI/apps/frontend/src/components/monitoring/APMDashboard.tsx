import React, { useState, useEffect, useCallback } from 'react';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { theme } from '../../theme/theme';
import { monitoringApi } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import SkeletonLoader from '../shared/SkeletonLoader';

interface APMMetric {
  operation_name: string;
  service_name: string;
  latency_p50: number;
  latency_p95: number;
  latency_p99: number;
  throughput: number;
  error_rate: number;
  timestamp: string;
}

interface Baseline {
  operation_name: string;
  service_name: string;
  latency_p50: number;
  latency_p95: number;
  latency_p99: number;
  throughput: number;
  error_rate: number;
}

interface HealthCheck {
  check_name: string;
  component: string;
  status: string;
  message: string;
  timestamp: string;
}

const APMDashboard = () => {
  const [metrics, setMetrics] = useState<APMMetric[]>([]);
  const [baselines, setBaselines] = useState<Baseline[]>([]);
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeWindow, setTimeWindow] = useState<string>('1min');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [metricsData, baselinesData, healthData] = await Promise.all([
        monitoringApi.getAPMMetrics({ time_window: timeWindow }).catch(() => ({ metrics: [] })),
        monitoringApi.getAPMBaselines().catch(() => []),
        monitoringApi.getAPMHealth().catch(() => [])
      ]);
      setMetrics(metricsData.metrics || metricsData || []);
      setBaselines(baselinesData || []);
      setHealthChecks(healthData || []);
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setLoading(false);
    }
  }, [timeWindow]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [fetchData]);

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return asciiColors.success;
      case 'degraded': return asciiColors.warning;
      case 'unhealthy': return asciiColors.error;
      default: return asciiColors.muted;
    }
  };

  if (loading && metrics.length === 0) {
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
            APM Dashboard
          </h1>
          <p style={{
            color: asciiColors.muted,
            fontSize: 12,
            marginBottom: theme.spacing.lg
          }}>
            Application Performance Monitoring with metrics, baselines, and health checks
          </p>

          <div style={{
            display: 'flex',
            gap: theme.spacing.md,
            marginBottom: theme.spacing.lg,
            alignItems: 'center'
          }}>
            <select
              value={timeWindow}
              onChange={(e) => setTimeWindow(e.target.value)}
              style={{
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                border: `1px solid ${asciiColors.border}`,
                background: asciiColors.background,
                color: asciiColors.foreground,
                fontFamily: 'Consolas, monospace',
                fontSize: 12,
                borderRadius: 2
              }}
            >
              <option value="1min">1 Minute</option>
              <option value="5min">5 Minutes</option>
              <option value="1h">1 Hour</option>
            </select>
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

          {/* Health Checks */}
          <div style={{ marginBottom: theme.spacing.lg }}>
            <h3 style={{
              fontSize: 14,
              fontWeight: 600,
              color: asciiColors.foreground,
              marginBottom: theme.spacing.md
            }}>
              Health Checks
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: theme.spacing.md
            }}>
              {healthChecks.map((check, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: theme.spacing.md,
                    border: `1px solid ${asciiColors.border}`,
                    borderRadius: 2,
                    background: asciiColors.background
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: theme.spacing.xs
                  }}>
                    <span style={{ fontWeight: 600, fontSize: 12 }}>{check.check_name}</span>
                    <span style={{
                      padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                      background: getHealthStatusColor(check.status),
                      color: '#ffffff',
                      fontSize: 10,
                      borderRadius: 2,
                      textTransform: 'uppercase'
                    }}>
                      {check.status}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: asciiColors.muted }}>
                    {check.component} | {check.message}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Metrics */}
          <div style={{ marginBottom: theme.spacing.lg }}>
            <h3 style={{
              fontSize: 14,
              fontWeight: 600,
              color: asciiColors.foreground,
              marginBottom: theme.spacing.md
            }}>
              Performance Metrics
            </h3>
            <div style={{
              overflowX: 'auto',
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2
            }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontFamily: 'Consolas, monospace',
                fontSize: 12
              }}>
                <thead>
                  <tr style={{ background: asciiColors.backgroundSoft }}>
                    <th style={{ padding: theme.spacing.sm, textAlign: 'left', borderBottom: `1px solid ${asciiColors.border}` }}>Operation</th>
                    <th style={{ padding: theme.spacing.sm, textAlign: 'left', borderBottom: `1px solid ${asciiColors.border}` }}>Service</th>
                    <th style={{ padding: theme.spacing.sm, textAlign: 'right', borderBottom: `1px solid ${asciiColors.border}` }}>P50</th>
                    <th style={{ padding: theme.spacing.sm, textAlign: 'right', borderBottom: `1px solid ${asciiColors.border}` }}>P95</th>
                    <th style={{ padding: theme.spacing.sm, textAlign: 'right', borderBottom: `1px solid ${asciiColors.border}` }}>P99</th>
                    <th style={{ padding: theme.spacing.sm, textAlign: 'right', borderBottom: `1px solid ${asciiColors.border}` }}>Throughput</th>
                    <th style={{ padding: theme.spacing.sm, textAlign: 'right', borderBottom: `1px solid ${asciiColors.border}` }}>Error Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.map((metric, idx) => {
                    const baseline = baselines.find(
                      b => b.operation_name === metric.operation_name && b.service_name === metric.service_name
                    );
                    const exceedsBaseline = baseline && (
                      metric.latency_p95 > baseline.latency_p95 * 1.5 ||
                      metric.error_rate > baseline.error_rate * 1.5
                    );

                    return (
                      <tr
                        key={idx}
                        style={{
                          borderBottom: `1px solid ${asciiColors.border}`,
                          background: exceedsBaseline ? asciiColors.error + '20' : 'transparent'
                        }}
                      >
                        <td style={{ padding: theme.spacing.sm }}>{metric.operation_name}</td>
                        <td style={{ padding: theme.spacing.sm }}>{metric.service_name}</td>
                        <td style={{ padding: theme.spacing.sm, textAlign: 'right' }}>{metric.latency_p50.toFixed(2)}ms</td>
                        <td style={{ padding: theme.spacing.sm, textAlign: 'right' }}>{metric.latency_p95.toFixed(2)}ms</td>
                        <td style={{ padding: theme.spacing.sm, textAlign: 'right' }}>{metric.latency_p99.toFixed(2)}ms</td>
                        <td style={{ padding: theme.spacing.sm, textAlign: 'right' }}>{metric.throughput.toFixed(2)} req/s</td>
                        <td style={{
                          padding: theme.spacing.sm,
                          textAlign: 'right',
                          color: metric.error_rate > 1 ? asciiColors.error : asciiColors.foreground
                        }}>
                          {metric.error_rate.toFixed(2)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </AsciiPanel>
    </div>
  );
};

export default APMDashboard;
