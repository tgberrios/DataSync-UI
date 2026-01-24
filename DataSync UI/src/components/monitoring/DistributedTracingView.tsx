import React, { useState, useEffect, useCallback } from 'react';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { theme } from '../../theme/theme';
import { monitoringApi } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import SkeletonLoader from '../shared/SkeletonLoader';

interface Trace {
  trace_id: string;
  service_name: string;
  span_count: number;
  duration_microseconds: number;
  start_time: string;
}

interface Span {
  span_id: string;
  trace_id: string;
  parent_span_id?: string;
  operation_name: string;
  service_name: string;
  start_time: string;
  end_time?: string;
  duration_microseconds: number;
  status: string;
  tags?: Record<string, string>;
}

const DistributedTracingView = () => {
  const [traces, setTraces] = useState<Trace[]>([]);
  const [selectedTrace, setSelectedTrace] = useState<Trace | null>(null);
  const [spans, setSpans] = useState<Span[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [serviceFilter, setServiceFilter] = useState<string>('');

  const fetchTraces = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await monitoringApi.getTraces({
        service_name: serviceFilter || undefined,
        limit: 100
      });
      setTraces(data.traces || data || []);
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setLoading(false);
    }
  }, [serviceFilter]);

  const fetchTraceDetails = useCallback(async (traceId: string) => {
    try {
      const data = await monitoringApi.getTrace(traceId);
      setSelectedTrace(data);
      setSpans(data.spans || []);
    } catch (err) {
      setError(extractApiError(err));
    }
  }, []);

  useEffect(() => {
    fetchTraces();
  }, [fetchTraces]);

  const formatDuration = (microseconds: number) => {
    if (microseconds < 1000) return `${microseconds}μs`;
    if (microseconds < 1000000) return `${(microseconds / 1000).toFixed(2)}ms`;
    return `${(microseconds / 1000000).toFixed(2)}s`;
  };

  if (loading && traces.length === 0) {
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
            Distributed Tracing
          </h1>
          <p style={{
            color: asciiColors.muted,
            fontSize: 12,
            marginBottom: theme.spacing.lg
          }}>
            View and analyze distributed traces across services
          </p>

          <div style={{
            display: 'flex',
            gap: theme.spacing.md,
            marginBottom: theme.spacing.lg,
            alignItems: 'center'
          }}>
            <input
              type="text"
              placeholder="Filter by service name"
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              style={{
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                border: `1px solid ${asciiColors.border}`,
                background: asciiColors.background,
                color: asciiColors.foreground,
                fontFamily: 'Consolas, monospace',
                fontSize: 12,
                borderRadius: 2
              }}
            />
            <AsciiButton
              label="Refresh"
              onClick={fetchTraces}
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

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: theme.spacing.lg
          }}>
            <div>
              <h3 style={{
                fontSize: 14,
                fontWeight: 600,
                color: asciiColors.foreground,
                marginBottom: theme.spacing.md
              }}>
                Traces ({traces.length})
              </h3>
              <div style={{
                maxHeight: '600px',
                overflowY: 'auto',
                border: `1px solid ${asciiColors.border}`,
                borderRadius: 2
              }}>
                {traces.map((trace) => (
                  <div
                    key={trace.trace_id}
                    onClick={() => fetchTraceDetails(trace.trace_id)}
                    style={{
                      padding: theme.spacing.md,
                      borderBottom: `1px solid ${asciiColors.border}`,
                      cursor: 'pointer',
                      background: selectedTrace?.trace_id === trace.trace_id ? asciiColors.accent : 'transparent',
                      color: selectedTrace?.trace_id === trace.trace_id ? '#ffffff' : asciiColors.foreground,
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (selectedTrace?.trace_id !== trace.trace_id) {
                        e.currentTarget.style.background = asciiColors.backgroundSoft;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedTrace?.trace_id !== trace.trace_id) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: theme.spacing.xs }}>
                      {trace.service_name}
                    </div>
                    <div style={{ fontSize: 11, color: selectedTrace?.trace_id === trace.trace_id ? '#ffffff' : asciiColors.muted }}>
                      {trace.trace_id.substring(0, 8)}... | {trace.span_count} spans | {formatDuration(trace.duration_microseconds)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 style={{
                fontSize: 14,
                fontWeight: 600,
                color: asciiColors.foreground,
                marginBottom: theme.spacing.md
              }}>
                Spans {selectedTrace && `(${spans.length})`}
              </h3>
              {selectedTrace ? (
                <div style={{
                  maxHeight: '600px',
                  overflowY: 'auto',
                  border: `1px solid ${asciiColors.border}`,
                  borderRadius: 2
                }}>
                  {spans.map((span) => (
                    <div
                      key={span.span_id}
                      style={{
                        padding: theme.spacing.md,
                        borderBottom: `1px solid ${asciiColors.border}`,
                        marginLeft: span.parent_span_id ? theme.spacing.lg : 0
                      }}
                    >
                      <div style={{ fontWeight: 600, marginBottom: theme.spacing.xs }}>
                        {span.operation_name}
                      </div>
                      <div style={{ fontSize: 11, color: asciiColors.muted, marginBottom: theme.spacing.xs }}>
                        {span.service_name} | {formatDuration(span.duration_microseconds)} | {span.status}
                      </div>
                      {span.tags && Object.keys(span.tags).length > 0 && (
                        <div style={{ fontSize: 10, color: asciiColors.muted }}>
                          Tags: {Object.entries(span.tags).map(([k, v]) => `${k}=${v}`).join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{
                  padding: theme.spacing.lg,
                  textAlign: 'center',
                  color: asciiColors.muted
                }}>
                  Select a trace to view spans
                </div>
              )}
            </div>
          </div>
        </div>
      </AsciiPanel>
    </div>
  );
};

export default DistributedTracingView;
