import { useState, useEffect, useCallback, useRef } from 'react';
import styled from 'styled-components';
import { auditApi, type AuditLogEntry } from '../../services/api';
import { Container, LoadingOverlay, ErrorMessage } from '../shared/BaseComponents';
import SkeletonLoader from '../shared/SkeletonLoader';
import { extractApiError } from '../../utils/errorHandler';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { theme } from '../../theme/theme';
import AuditTrailTreeView from './AuditTrailTreeView';

const AuditTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: ${theme.spacing.lg};
  background: ${asciiColors.background};
  border-radius: 2;
  overflow: hidden;
  font-family: 'Consolas';
`;

const Th = styled.th`
  padding: ${theme.spacing.sm};
  text-align: left;
  border-bottom: 2px solid ${asciiColors.border};
  background: ${asciiColors.backgroundSoft};
  font-weight: 600;
  font-family: 'Consolas';
  font-size: 13px;
  color: ${asciiColors.accent};
  position: sticky;
  top: 0;
  z-index: 10;
`;

const Td = styled.td`
  padding: ${theme.spacing.sm};
  border-bottom: 1px solid ${asciiColors.border};
  font-family: 'Consolas';
  font-size: 12px;
  transition: background-color 0.15s ease;
  word-break: break-word;
  max-width: 300px;
`;

const TableRow = styled.tr`
  transition: background-color 0.15s ease;
`;

const getActionTypeColor = (actionType: string) => {
  switch (actionType.toUpperCase()) {
    case 'SELECT': return asciiColors.accent;
    case 'INSERT': return asciiColors.accent;
    case 'UPDATE': return asciiColors.muted;
    case 'DELETE': return asciiColors.foreground;
    default: return asciiColors.muted;
  }
};

const formatDate = (date: string) => {
  if (!date) return '-';
  return new Date(date).toLocaleString();
};

const AuditTrail = () => {
  const isMountedRef = useRef(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [filters, setFilters] = useState({
    schema_name: '',
    table_name: '',
    username: '',
    action_type: '',
    start_date: '',
    end_date: '',
  });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 100;
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [showComplianceModal, setShowComplianceModal] = useState(false);
  const [complianceType, setComplianceType] = useState('GDPR');
  const [complianceReport, setComplianceReport] = useState<any>(null);

  const fetchLogs = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    const startTime = Date.now();
    const minLoadingTime = 300;
    
    try {
      setLoading(true);
      setError(null);
      const params: any = { page, limit };
      if (filters.schema_name) params.schema_name = filters.schema_name;
      if (filters.table_name) params.table_name = filters.table_name;
      if (filters.username) params.username = filters.username;
      if (filters.action_type) params.action_type = filters.action_type;
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;

      const response = await auditApi.getLogs(params);
      
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minLoadingTime - elapsed);
      await new Promise(resolve => setTimeout(resolve, remaining));
      
      if (isMountedRef.current) {
        setLogs(response.logs || []);
        setTotal(response.total || 0);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(extractApiError(err));
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [page, filters]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await auditApi.getStats(30);
      setStats(response);
    } catch (err) {
      console.error("Error fetching audit stats:", err);
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    fetchLogs();
    fetchStats();
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchLogs, fetchStats]);

  const handleGenerateComplianceReport = useCallback(async () => {
    try {
      setError(null);
      const response = await auditApi.getComplianceReport(
        complianceType,
        filters.start_date || undefined,
        filters.end_date || undefined
      );
      setComplianceReport(response.report);
    } catch (err) {
      if (isMountedRef.current) {
        setError(extractApiError(err));
      }
    }
  }, [complianceType, filters.start_date, filters.end_date]);

  if (loading && logs.length === 0) {
    return <SkeletonLoader variant="table" />;
  }

  return (
    <Container>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
        paddingBottom: theme.spacing.md,
        borderBottom: `2px solid ${asciiColors.accent}`
      }}>
        <h1 style={{
          fontSize: 14,
          fontWeight: 600,
          margin: 0,
          color: asciiColors.foreground,
          textTransform: 'uppercase',
          fontFamily: 'Consolas'
        }}>
          <span style={{ color: asciiColors.accent, marginRight: theme.spacing.sm }}>{ascii.blockFull}</span>
          AUDIT TRAIL
        </h1>
      </div>

      {error && (
        <div style={{ marginBottom: theme.spacing.md }}>
          <AsciiPanel title="ERROR">
            <div style={{
              padding: theme.spacing.sm,
              color: asciiColors.foreground,
              fontSize: 12,
              fontFamily: 'Consolas',
              backgroundColor: asciiColors.backgroundSoft,
              borderRadius: 2
            }}>
              {error}
            </div>
          </AsciiPanel>
        </div>
      )}

      {stats && (
        <div style={{ marginBottom: theme.spacing.md }}>
          <AsciiPanel title="AUDIT STATISTICS (Last 30 Days)">
            <div style={{ padding: theme.spacing.md, fontFamily: 'Consolas', fontSize: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: theme.spacing.md }}>
                <div>
                  <div style={{ fontSize: 10, color: asciiColors.muted, marginBottom: theme.spacing.xs, fontFamily: 'Consolas' }}>Total Events</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: asciiColors.accent, fontFamily: 'Consolas' }}>
                    {stats.summary?.total_events || 0}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: asciiColors.muted, marginBottom: theme.spacing.xs, fontFamily: 'Consolas' }}>Unique Users</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: asciiColors.accent, fontFamily: 'Consolas' }}>
                    {stats.summary?.unique_users || 0}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: asciiColors.muted, marginBottom: theme.spacing.xs, fontFamily: 'Consolas' }}>Unique Tables</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: asciiColors.accent, fontFamily: 'Consolas' }}>
                    {stats.summary?.unique_tables || 0}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: asciiColors.muted, marginBottom: theme.spacing.xs, fontFamily: 'Consolas' }}>Compliance Events</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: asciiColors.muted, fontFamily: 'Consolas' }}>
                    {stats.summary?.compliance_events || 0}
                  </div>
                </div>
              </div>
            </div>
          </AsciiPanel>
        </div>
      )}

      <div style={{ marginBottom: theme.spacing.md }}>
        <AsciiPanel title="AUDIT TRAIL">
          <div style={{ padding: theme.spacing.md, fontFamily: 'Consolas', fontSize: 12 }}>
            <div style={{ display: 'flex', gap: theme.spacing.sm, marginBottom: theme.spacing.md, flexWrap: 'wrap' }}>
              <AsciiButton
                label={`${ascii.blockFull} Compliance Report`}
                onClick={() => setShowComplianceModal(true)}
                variant="ghost"
              />
            </div>

            <div style={{ marginBottom: theme.spacing.md, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: theme.spacing.sm }}>
              <input
                type="text"
                placeholder="Schema name"
                value={filters.schema_name}
                onChange={(e) => setFilters(prev => ({ ...prev, schema_name: e.target.value }))}
                style={{
                  padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                  border: `1px solid ${asciiColors.border}`,
                  backgroundColor: asciiColors.background,
                  color: asciiColors.foreground,
                  fontFamily: 'Consolas',
                  fontSize: 12,
                  borderRadius: 2,
                  outline: 'none',
                  transition: 'border-color 0.15s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = asciiColors.accent;
                  e.target.style.outline = `2px solid ${asciiColors.accent}`;
                  e.target.style.outlineOffset = '2px';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = asciiColors.border;
                  e.target.style.outline = 'none';
                }}
              />
              <input
                type="text"
                placeholder="Table name"
                value={filters.table_name}
                onChange={(e) => setFilters(prev => ({ ...prev, table_name: e.target.value }))}
                style={{
                  padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                  border: `1px solid ${asciiColors.border}`,
                  backgroundColor: asciiColors.background,
                  color: asciiColors.foreground,
                  fontFamily: 'Consolas',
                  fontSize: 12,
                  borderRadius: 2,
                  outline: 'none',
                  transition: 'border-color 0.15s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = asciiColors.accent;
                  e.target.style.outline = `2px solid ${asciiColors.accent}`;
                  e.target.style.outlineOffset = '2px';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = asciiColors.border;
                  e.target.style.outline = 'none';
                }}
              />
              <input
                type="text"
                placeholder="Username"
                value={filters.username}
                onChange={(e) => setFilters(prev => ({ ...prev, username: e.target.value }))}
                style={{
                  padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                  border: `1px solid ${asciiColors.border}`,
                  backgroundColor: asciiColors.background,
                  color: asciiColors.foreground,
                  fontFamily: 'Consolas',
                  fontSize: 12,
                  borderRadius: 2,
                  outline: 'none',
                  transition: 'border-color 0.15s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = asciiColors.accent;
                  e.target.style.outline = `2px solid ${asciiColors.accent}`;
                  e.target.style.outlineOffset = '2px';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = asciiColors.border;
                  e.target.style.outline = 'none';
                }}
              />
              <select
                value={filters.action_type}
                onChange={(e) => setFilters(prev => ({ ...prev, action_type: e.target.value }))}
                style={{
                  padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                  border: `1px solid ${asciiColors.border}`,
                  backgroundColor: asciiColors.background,
                  color: asciiColors.foreground,
                  fontFamily: 'Consolas',
                  fontSize: 12,
                  borderRadius: 2,
                  outline: 'none',
                  transition: 'border-color 0.15s ease',
                  cursor: 'pointer'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = asciiColors.accent;
                  e.target.style.outline = `2px solid ${asciiColors.accent}`;
                  e.target.style.outlineOffset = '2px';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = asciiColors.border;
                  e.target.style.outline = 'none';
                }}
              >
                <option value="">All Actions</option>
                <option value="SELECT">SELECT</option>
                <option value="INSERT">INSERT</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
                <option value="CREATE">CREATE</option>
                <option value="DROP">DROP</option>
                <option value="ALTER">ALTER</option>
              </select>
              <input
                type="date"
                placeholder="Start Date"
                value={filters.start_date}
                onChange={(e) => setFilters(prev => ({ ...prev, start_date: e.target.value }))}
                style={{
                  padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                  border: `1px solid ${asciiColors.border}`,
                  backgroundColor: asciiColors.background,
                  color: asciiColors.foreground,
                  fontFamily: 'Consolas',
                  fontSize: 12,
                  borderRadius: 2,
                  outline: 'none',
                  transition: 'border-color 0.15s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = asciiColors.accent;
                  e.target.style.outline = `2px solid ${asciiColors.accent}`;
                  e.target.style.outlineOffset = '2px';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = asciiColors.border;
                  e.target.style.outline = 'none';
                }}
              />
              <input
                type="date"
                placeholder="End Date"
                value={filters.end_date}
                onChange={(e) => setFilters(prev => ({ ...prev, end_date: e.target.value }))}
                style={{
                  padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                  border: `1px solid ${asciiColors.border}`,
                  backgroundColor: asciiColors.background,
                  color: asciiColors.foreground,
                  fontFamily: 'Consolas',
                  fontSize: 12,
                  borderRadius: 2,
                  outline: 'none',
                  transition: 'border-color 0.15s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = asciiColors.accent;
                  e.target.style.outline = `2px solid ${asciiColors.accent}`;
                  e.target.style.outlineOffset = '2px';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = asciiColors.border;
                  e.target.style.outline = 'none';
                }}
              />
            </div>

            <div style={{ marginBottom: theme.spacing.sm, fontSize: 11, color: asciiColors.muted, fontFamily: 'Consolas' }}>
              Audit Logs ({total})
            </div>

            <AuditTrailTreeView
              logs={logs}
              onViewDetails={setSelectedLog}
            />
          </div>
        </AsciiPanel>
      </div>

      {selectedLog && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedLog(null);
            }
          }}
        >
          <div
            style={{
              backgroundColor: asciiColors.background,
              border: `2px solid ${asciiColors.border}`,
              borderRadius: 2,
              width: '90%',
              maxWidth: 800,
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <style>{`
              div[style*="overflowY"]::-webkit-scrollbar {
                width: 0px;
                display: none;
              }
              div[style*="overflowY"] {
                -ms-overflow-style: none;
                scrollbar-width: none;
              }
            `}</style>
            <AsciiPanel title="AUDIT LOG DETAILS">
              <div style={{ padding: theme.spacing.md, fontFamily: 'Consolas', fontSize: 12 }}>
                <div style={{ marginBottom: theme.spacing.md }}>
                  <div style={{ fontSize: 10, color: asciiColors.muted, marginBottom: theme.spacing.xs, fontFamily: 'Consolas' }}>Log ID</div>
                  <div style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>{selectedLog.log_id}</div>
                </div>
                <div style={{ marginBottom: theme.spacing.md }}>
                  <div style={{ fontSize: 10, color: asciiColors.muted, marginBottom: theme.spacing.xs, fontFamily: 'Consolas' }}>Timestamp</div>
                  <div style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>{formatDate(selectedLog.created_at)}</div>
                </div>
                <div style={{ marginBottom: theme.spacing.md }}>
                  <div style={{ fontSize: 10, color: asciiColors.muted, marginBottom: theme.spacing.xs, fontFamily: 'Consolas' }}>User</div>
                  <div style={{ color: asciiColors.accent, fontSize: 12, fontFamily: 'Consolas' }}>{selectedLog.username}</div>
                </div>
                <div style={{ marginBottom: theme.spacing.md }}>
                  <div style={{ fontSize: 10, color: asciiColors.muted, marginBottom: theme.spacing.xs, fontFamily: 'Consolas' }}>Action Type</div>
                  <div style={{ 
                    color: getActionTypeColor(selectedLog.action_type),
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: 'Consolas'
                  }}>{selectedLog.action_type}</div>
                </div>
                {selectedLog.schema_name && (
                  <div style={{ marginBottom: theme.spacing.md }}>
                    <div style={{ fontSize: 10, color: asciiColors.muted, marginBottom: theme.spacing.xs, fontFamily: 'Consolas' }}>Schema.Table.Column</div>
                    <div style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>
                      <code>
                        {selectedLog.schema_name}.{selectedLog.table_name}
                        {selectedLog.column_name && `.${selectedLog.column_name}`}
                      </code>
                    </div>
                  </div>
                )}
                {selectedLog.query_text && (
                  <div style={{ marginBottom: theme.spacing.md }}>
                    <div style={{ fontSize: 10, color: asciiColors.muted, marginBottom: theme.spacing.xs, fontFamily: 'Consolas' }}>Query Text</div>
                    <div style={{
                      padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                      backgroundColor: asciiColors.backgroundSoft,
                      borderRadius: 2,
                      border: `1px solid ${asciiColors.border}`,
                      fontSize: 11,
                      fontFamily: 'Consolas',
                      color: asciiColors.foreground,
                      wordBreak: 'break-word',
                      whiteSpace: 'pre-wrap',
                      maxHeight: 200,
                      overflowY: 'auto'
                    }}>
                      {selectedLog.query_text}
                    </div>
                  </div>
                )}
                {selectedLog.old_values && (
                  <div style={{ marginBottom: theme.spacing.md }}>
                    <div style={{ fontSize: 10, color: asciiColors.muted, marginBottom: theme.spacing.xs, fontFamily: 'Consolas' }}>Old Values</div>
                    <div style={{
                      padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                      backgroundColor: asciiColors.backgroundSoft,
                      borderRadius: 2,
                      border: `1px solid ${asciiColors.border}`,
                      fontSize: 11,
                      fontFamily: 'Consolas',
                      color: asciiColors.foreground,
                      wordBreak: 'break-word',
                      whiteSpace: 'pre-wrap',
                      maxHeight: 200,
                      overflowY: 'auto'
                    }}>
                      <style>{`
                        div[style*="overflowY"]::-webkit-scrollbar {
                          width: 0px;
                          display: none;
                        }
                        div[style*="overflowY"] {
                          -ms-overflow-style: none;
                          scrollbar-width: none;
                        }
                      `}</style>
                      {JSON.stringify(selectedLog.old_values, null, 2)}
                    </div>
                  </div>
                )}
                {selectedLog.new_values && (
                  <div style={{ marginBottom: theme.spacing.md }}>
                    <div style={{ fontSize: 10, color: asciiColors.muted, marginBottom: theme.spacing.xs, fontFamily: 'Consolas' }}>New Values</div>
                    <div style={{
                      padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                      backgroundColor: asciiColors.backgroundSoft,
                      borderRadius: 2,
                      border: `1px solid ${asciiColors.border}`,
                      fontSize: 11,
                      fontFamily: 'Consolas',
                      color: asciiColors.foreground,
                      wordBreak: 'break-word',
                      whiteSpace: 'pre-wrap',
                      maxHeight: 200,
                      overflowY: 'auto'
                    }}>
                      {JSON.stringify(selectedLog.new_values, null, 2)}
                    </div>
                  </div>
                )}
                <div style={{ marginBottom: theme.spacing.md }}>
                  <div style={{ fontSize: 10, color: asciiColors.muted, marginBottom: theme.spacing.xs, fontFamily: 'Consolas' }}>Rows Affected</div>
                  <div style={{ color: asciiColors.foreground, fontSize: 12, fontFamily: 'Consolas' }}>{selectedLog.rows_affected || 0}</div>
                </div>
                {selectedLog.compliance_requirement && (
                  <div style={{ marginBottom: theme.spacing.md }}>
                    <div style={{ fontSize: 10, color: asciiColors.muted, marginBottom: theme.spacing.xs, fontFamily: 'Consolas' }}>Compliance Requirement</div>
                    <div style={{ color: asciiColors.muted, fontSize: 12, fontWeight: 600, fontFamily: 'Consolas' }}>
                      {selectedLog.compliance_requirement}
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: theme.spacing.lg }}>
                  <AsciiButton
                    label="Close"
                    onClick={() => setSelectedLog(null)}
                    variant="ghost"
                  />
                </div>
              </div>
            </AsciiPanel>
          </div>
        </div>
      )}

      {showComplianceModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowComplianceModal(false);
            }
          }}
        >
          <div
            style={{
              backgroundColor: asciiColors.background,
              border: `2px solid ${asciiColors.border}`,
              borderRadius: 2,
              width: '90%',
              maxWidth: 600,
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <style>{`
              div[style*="overflowY"]::-webkit-scrollbar {
                width: 0px;
                display: none;
              }
              div[style*="overflowY"] {
                -ms-overflow-style: none;
                scrollbar-width: none;
              }
            `}</style>
            <AsciiPanel title="COMPLIANCE REPORT">
              <div style={{ padding: theme.spacing.md, fontFamily: 'Consolas', fontSize: 12 }}>
                <div style={{ marginBottom: theme.spacing.md }}>
                  <label style={{ display: 'block', marginBottom: theme.spacing.xs, color: asciiColors.muted, fontSize: 11, fontFamily: 'Consolas' }}>
                    Compliance Type *
                  </label>
                  <select
                    value={complianceType}
                    onChange={(e) => setComplianceType(e.target.value)}
                    style={{
                      width: '100%',
                      padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                      border: `1px solid ${asciiColors.border}`,
                      backgroundColor: asciiColors.background,
                      color: asciiColors.foreground,
                      fontFamily: 'Consolas',
                      fontSize: 12,
                      borderRadius: 2,
                      outline: 'none',
                      transition: 'border-color 0.15s ease',
                      cursor: 'pointer'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = asciiColors.accent;
                      e.target.style.outline = `2px solid ${asciiColors.accent}`;
                      e.target.style.outlineOffset = '2px';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = asciiColors.border;
                      e.target.style.outline = 'none';
                    }}
                  >
                    <option value="GDPR">GDPR</option>
                    <option value="HIPAA">HIPAA</option>
                    <option value="SOX">SOX</option>
                    <option value="PCI-DSS">PCI-DSS</option>
                  </select>
                </div>

                <div style={{ marginBottom: theme.spacing.md }}>
                  <AsciiButton
                    label="Generate Report"
                    onClick={handleGenerateComplianceReport}
                  />
                </div>

                {complianceReport && (
                  <div style={{
                    marginTop: theme.spacing.lg,
                    padding: theme.spacing.md,
                    backgroundColor: asciiColors.backgroundSoft,
                    borderRadius: 2,
                    border: `1px solid ${asciiColors.border}`
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: asciiColors.accent, marginBottom: theme.spacing.sm, fontFamily: 'Consolas' }}>
                      {ascii.blockFull} COMPLIANCE REPORT: {complianceType}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: theme.spacing.md }}>
                      <div>
                        <div style={{ fontSize: 10, color: asciiColors.muted, marginBottom: theme.spacing.xs, fontFamily: 'Consolas' }}>Total Events</div>
                        <div style={{ fontSize: 16, fontWeight: 600, color: asciiColors.accent, fontFamily: 'Consolas' }}>
                          {complianceReport.total_events || 0}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: asciiColors.muted, marginBottom: theme.spacing.xs, fontFamily: 'Consolas' }}>Unique Users</div>
                        <div style={{ fontSize: 16, fontWeight: 600, color: asciiColors.accent, fontFamily: 'Consolas' }}>
                          {complianceReport.unique_users || 0}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: asciiColors.muted, marginBottom: theme.spacing.xs, fontFamily: 'Consolas' }}>Unique Tables</div>
                        <div style={{ fontSize: 16, fontWeight: 600, color: asciiColors.accent, fontFamily: 'Consolas' }}>
                          {complianceReport.unique_tables || 0}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: asciiColors.muted, marginBottom: theme.spacing.xs, fontFamily: 'Consolas' }}>Sensitive Access</div>
                        <div style={{ fontSize: 16, fontWeight: 600, color: asciiColors.muted, fontFamily: 'Consolas' }}>
                          {complianceReport.sensitive_access_count || 0}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: asciiColors.muted, marginBottom: theme.spacing.xs, fontFamily: 'Consolas' }}>Modifications</div>
                        <div style={{ fontSize: 16, fontWeight: 600, color: asciiColors.foreground, fontFamily: 'Consolas' }}>
                          {complianceReport.modification_count || 0}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: asciiColors.muted, marginBottom: theme.spacing.xs, fontFamily: 'Consolas' }}>Access Count</div>
                        <div style={{ fontSize: 16, fontWeight: 600, color: asciiColors.accent, fontFamily: 'Consolas' }}>
                          {complianceReport.access_count || 0}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: theme.spacing.lg }}>
                  <AsciiButton
                    label="Close"
                    onClick={() => {
                      setShowComplianceModal(false);
                      setComplianceReport(null);
                    }}
                    variant="ghost"
                  />
                </div>
              </div>
            </AsciiPanel>
          </div>
        </div>
      )}
    </Container>
  );
};

export default AuditTrail;
