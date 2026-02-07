import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  const [showAPMPlaybook, setShowAPMPlaybook] = useState(false);

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
            fontSize: 14,
            fontWeight: 600,
            margin: 0,
            color: asciiColors.foreground,
            textTransform: 'uppercase',
            fontFamily: 'Consolas'
          }}>
            <span style={{ color: asciiColors.accent, marginRight: 8 }}>{ascii.blockFull}</span>
            APM DASHBOARD
          </h1>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: theme.spacing.lg,
            flexWrap: 'wrap',
            gap: theme.spacing.md
          }}>
            <p style={{
              color: asciiColors.muted,
              fontSize: 12,
              margin: 0
            }}>
              Application Performance Monitoring with metrics, baselines, and health checks
            </p>
            <AsciiButton
              label="Playbook & How to use"
              onClick={() => setShowAPMPlaybook(true)}
              variant="ghost"
            />
          </div>

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

          {showAPMPlaybook && createPortal(
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10000
              }}
              onClick={() => setShowAPMPlaybook(false)}
            >
              <div
                style={{
                  width: '90%',
                  maxWidth: 1000,
                  maxHeight: '90vh',
                  minHeight: 400,
                  overflowY: 'auto',
                  flexShrink: 0
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <AsciiPanel title="APM DASHBOARD - PLAYBOOK & HOW TO USE" animated={false}>
                  <div style={{ padding: 16, fontFamily: 'Consolas', fontSize: 12, lineHeight: 1.6 }}>
                    <div style={{ marginBottom: 24 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                        {ascii.blockFull} OVERVIEW
                      </div>
                      <div style={{ color: asciiColors.foreground, marginLeft: 16 }}>
                        APM (Application Performance Monitoring) shows how your services and operations perform over time.
                        The dashboard combines live metrics (latency, throughput, error rate), stored baselines for comparison,
                        and health checks for key components. Use it to spot regressions, capacity issues, and failing dependencies.
                      </div>
                    </div>

                    <div style={{ marginBottom: 24 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                        {ascii.blockFull} HOW TO USE
                      </div>
                      <div style={{ marginLeft: 16 }}>
                        <div style={{ marginBottom: 10 }}>
                          <span style={{ color: asciiColors.accent, fontWeight: 600 }}>1. Choose time window</span>
                          <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
                            Select 1 Minute, 5 Minutes, or 1 Hour to see metrics for that period. Data refreshes automatically every 30 seconds; use &quot;Refresh&quot; for an immediate update.
                          </span>
                        </div>
                        <div style={{ marginBottom: 10 }}>
                          <span style={{ color: asciiColors.accent, fontWeight: 600 }}>2. Check Health Checks</span>
                          <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
                            The top section shows component health (e.g. DB, API). Green = healthy, yellow = degraded, red = unhealthy. Use this to see if a dependency is down before digging into metrics.
                          </span>
                        </div>
                        <div style={{ marginBottom: 10 }}>
                          <span style={{ color: asciiColors.accent, fontWeight: 600 }}>3. Read Performance Metrics</span>
                          <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
                            The table lists each operation and service with P50/P95/P99 latency, throughput (req/s), and error rate (%). Rows highlighted in red exceed their baseline (latency or error rate &gt; 1.5× baseline).
                          </span>
                        </div>
                        <div style={{ marginBottom: 10 }}>
                          <span style={{ color: asciiColors.accent, fontWeight: 600 }}>4. Use baselines</span>
                          <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
                            Baselines are calculated from historical data. When current metrics go far above baseline, the row is highlighted so you can prioritize investigations.
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ marginBottom: 24 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                        {ascii.blockFull} KEY CONCEPTS
                      </div>
                      <div style={{ marginLeft: 16 }}>
                        <div style={{ marginBottom: 8 }}>
                          <span style={{ color: asciiColors.accent, fontWeight: 600 }}>P50 / P95 / P99</span>
                          <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
                            Latency percentiles in ms: 50% of requests faster than P50, 95% faster than P95, 99% faster than P99. P95 and P99 show tail latency and spikes.
                          </span>
                        </div>
                        <div style={{ marginBottom: 8 }}>
                          <span style={{ color: asciiColors.accent, fontWeight: 600 }}>Throughput</span>
                          <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
                            Requests per second (req/s) for that operation; indicates load and capacity.
                          </span>
                        </div>
                        <div style={{ marginBottom: 8 }}>
                          <span style={{ color: asciiColors.accent, fontWeight: 600 }}>Error rate</span>
                          <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
                            Percentage of requests that failed; high values point to bugs, timeouts, or dependency failures.
                          </span>
                        </div>
                        <div style={{ marginBottom: 8 }}>
                          <span style={{ color: asciiColors.accent, fontWeight: 600 }}>Baseline</span>
                          <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
                            Expected “normal” performance per operation; used to detect regressions when current metrics exceed it by a factor (e.g. 1.5×).
                          </span>
                        </div>
                        <div style={{ marginBottom: 8 }}>
                          <span style={{ color: asciiColors.accent, fontWeight: 600 }}>Health (healthy / degraded / unhealthy)</span>
                          <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
                            Status of monitored components; helps you see at a glance if a dependency is failing before checking detailed metrics.
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
                        • Start with Health Checks when something is wrong; then drill into metrics for the affected service or operation.<br/>
                        • Use a shorter time window (1 min) for live debugging and longer (1 h) for trend view.<br/>
                        • Investigate highlighted rows first—they indicate operations that have regressed vs. baseline.<br/>
                        • Recalculate baselines periodically (via backend/API) after traffic or code changes so comparisons stay meaningful.
                      </div>
                    </div>

                    <div style={{ marginTop: 16, textAlign: 'right' }}>
                      <AsciiButton
                        label="Close"
                        onClick={() => setShowAPMPlaybook(false)}
                        variant="ghost"
                      />
                    </div>
                  </div>
                </AsciiPanel>
              </div>
            </div>,
            document.body
          )}

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
