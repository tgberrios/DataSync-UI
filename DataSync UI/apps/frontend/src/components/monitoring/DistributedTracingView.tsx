import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  const [showTracingPlaybook, setShowTracingPlaybook] = useState(false);

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
            fontSize: 14,
            fontWeight: 600,
            margin: 0,
            color: asciiColors.foreground,
            textTransform: 'uppercase',
            fontFamily: 'Consolas'
          }}>
            <span style={{ color: asciiColors.accent, marginRight: 8 }}>{ascii.blockFull}</span>
            DISTRIBUTED TRACING
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
              View and analyze distributed traces across services
            </p>
            <AsciiButton
              label="Playbook & How to use"
              onClick={() => setShowTracingPlaybook(true)}
              variant="ghost"
            />
          </div>

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

          {showTracingPlaybook && createPortal(
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
              onClick={() => setShowTracingPlaybook(false)}
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
                <AsciiPanel title="DISTRIBUTED TRACING - PLAYBOOK & HOW TO USE" animated={false}>
                  <div style={{ padding: 16, fontFamily: 'Consolas', fontSize: 12, lineHeight: 1.6 }}>
                    <div style={{ marginBottom: 24 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                        {ascii.blockFull} OVERVIEW
                      </div>
                      <div style={{ color: asciiColors.foreground, marginLeft: 16 }}>
                        Distributed Tracing lets you follow a single request as it flows across multiple services.
                        Each trace is a full journey (e.g. API → ingestion → DB); each step is a span with name,
                        service, duration, and status. Use this view to find slow or failed operations and
                        understand where time is spent in your data pipelines.
                      </div>
                    </div>

                    <div style={{ marginBottom: 24 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                        {ascii.blockFull} HOW TO USE
                      </div>
                      <div style={{ marginLeft: 16 }}>
                        <div style={{ marginBottom: 10 }}>
                          <span style={{ color: asciiColors.accent, fontWeight: 600 }}>1. List traces</span>
                          <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
                            Traces load automatically. Use &quot;Refresh&quot; to fetch the latest (up to 100).
                          </span>
                        </div>
                        <div style={{ marginBottom: 10 }}>
                          <span style={{ color: asciiColors.accent, fontWeight: 600 }}>2. Filter by service</span>
                          <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
                            Type a service name in the filter box and the list will show only traces for that service.
                          </span>
                        </div>
                        <div style={{ marginBottom: 10 }}>
                          <span style={{ color: asciiColors.accent, fontWeight: 600 }}>3. Select a trace</span>
                          <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
                            Click a trace in the left column to load its spans in the right column.
                          </span>
                        </div>
                        <div style={{ marginBottom: 10 }}>
                          <span style={{ color: asciiColors.accent, fontWeight: 600 }}>4. Inspect spans</span>
                          <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
                            Each span shows operation name, service, duration, status, and optional tags for debugging.
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
                          <span style={{ color: asciiColors.accent, fontWeight: 600 }}>Trace</span>
                          <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
                            One end-to-end request; identified by trace_id. Contains one or more spans.
                          </span>
                        </div>
                        <div style={{ marginBottom: 8 }}>
                          <span style={{ color: asciiColors.accent, fontWeight: 600 }}>Span</span>
                          <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
                            A single operation (e.g. DB query, HTTP call). Has operation_name, service_name, duration, status, and optional tags.
                          </span>
                        </div>
                        <div style={{ marginBottom: 8 }}>
                          <span style={{ color: asciiColors.accent, fontWeight: 600 }}>Duration</span>
                          <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
                            Shown in μs, ms, or s. Use it to spot slow steps in a trace.
                          </span>
                        </div>
                        <div style={{ marginBottom: 8 }}>
                          <span style={{ color: asciiColors.accent, fontWeight: 600 }}>Tags</span>
                          <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
                            Key-value metadata on spans (e.g. query_id, batch_id) for filtering and debugging.
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
                        • Filter by service when investigating a specific component (e.g. ingestion or API).<br/>
                        • Focus on traces with high duration or many spans to find bottlenecks.<br/>
                        • Use span tags to correlate traces with batch_id, workflow_id, or query_id.<br/>
                        • Refresh after running pipelines to see new traces; keep the backend tracing enabled for data to appear.
                      </div>
                    </div>

                    <div style={{ marginTop: 16, textAlign: 'right' }}>
                      <AsciiButton
                        label="Close"
                        onClick={() => setShowTracingPlaybook(false)}
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
