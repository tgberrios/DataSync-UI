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

const AuditTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: ${theme.spacing.lg};
  background: ${theme.colors.background.main};
  box-shadow: ${theme.shadows.md};
  border-radius: ${theme.borderRadius.md};
  overflow: hidden;
`;

const Th = styled.th`
  padding: ${theme.spacing.sm};
  text-align: left;
  border-bottom: 2px solid ${asciiColors.border};
  background: ${asciiColors.backgroundSoft};
  font-weight: bold;
  font-family: "Consolas";
  font-size: 13px;
  color: ${asciiColors.accent};
  position: sticky;
  top: 0;
  z-index: 10;
`;

const Td = styled.td`
  padding: ${theme.spacing.sm};
  border-bottom: 1px solid ${asciiColors.border};
  font-family: "Consolas";
  font-size: 12px;
  transition: all ${theme.transitions.normal};
  word-break: break-word;
  max-width: 300px;
`;

const TableRow = styled.tr`
  transition: all ${theme.transitions.normal};
  
  &:hover {
    background: linear-gradient(90deg, ${theme.colors.background.main} 0%, ${theme.colors.background.tertiary} 100%);
    transform: scale(1.001);
    box-shadow: ${theme.shadows.sm};
    
    ${Td} {
      border-bottom-color: rgba(10, 25, 41, 0.1);
    }
  }
`;

const getActionTypeColor = (actionType: string) => {
  switch (actionType.toUpperCase()) {
    case 'SELECT': return asciiColors.accent;
    case 'INSERT': return asciiColors.success;
    case 'UPDATE': return asciiColors.warning;
    case 'DELETE': return asciiColors.danger;
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
      {error && <ErrorMessage message={error} onClose={() => setError(null)} />}

      {stats && (
        <div style={{ marginBottom: 20 }}>
          <AsciiPanel title="AUDIT STATISTICS (Last 30 Days)">
            <div style={{ padding: 16, fontFamily: 'Consolas', fontSize: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 10, color: asciiColors.muted, marginBottom: 4 }}>Total Events</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: asciiColors.accent }}>
                    {stats.summary?.total_events || 0}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: asciiColors.muted, marginBottom: 4 }}>Unique Users</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: asciiColors.accent }}>
                    {stats.summary?.unique_users || 0}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: asciiColors.muted, marginBottom: 4 }}>Unique Tables</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: asciiColors.accent }}>
                    {stats.summary?.unique_tables || 0}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: asciiColors.muted, marginBottom: 4 }}>Compliance Events</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: asciiColors.warning }}>
                    {stats.summary?.compliance_events || 0}
                  </div>
                </div>
              </div>
            </div>
          </AsciiPanel>
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <AsciiPanel title="AUDIT TRAIL">
          <div style={{ padding: 16, fontFamily: 'Consolas', fontSize: 12 }}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <AsciiButton
                label={`${ascii.blockFull} Compliance Report`}
                onClick={() => setShowComplianceModal(true)}
                variant="ghost"
              />
            </div>

            <div style={{ marginBottom: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
              <input
                type="text"
                placeholder="Schema name"
                value={filters.schema_name}
                onChange={(e) => setFilters(prev => ({ ...prev, schema_name: e.target.value }))}
                style={{
                  padding: '8px 12px',
                  border: `1px solid ${asciiColors.border}`,
                  backgroundColor: asciiColors.background,
                  color: asciiColors.foreground,
                  fontFamily: 'Consolas',
                  fontSize: 12,
                  borderRadius: 2,
                }}
              />
              <input
                type="text"
                placeholder="Table name"
                value={filters.table_name}
                onChange={(e) => setFilters(prev => ({ ...prev, table_name: e.target.value }))}
                style={{
                  padding: '8px 12px',
                  border: `1px solid ${asciiColors.border}`,
                  backgroundColor: asciiColors.background,
                  color: asciiColors.foreground,
                  fontFamily: 'Consolas',
                  fontSize: 12,
                  borderRadius: 2,
                }}
              />
              <input
                type="text"
                placeholder="Username"
                value={filters.username}
                onChange={(e) => setFilters(prev => ({ ...prev, username: e.target.value }))}
                style={{
                  padding: '8px 12px',
                  border: `1px solid ${asciiColors.border}`,
                  backgroundColor: asciiColors.background,
                  color: asciiColors.foreground,
                  fontFamily: 'Consolas',
                  fontSize: 12,
                  borderRadius: 2,
                }}
              />
              <select
                value={filters.action_type}
                onChange={(e) => setFilters(prev => ({ ...prev, action_type: e.target.value }))}
                style={{
                  padding: '8px 12px',
                  border: `1px solid ${asciiColors.border}`,
                  backgroundColor: asciiColors.background,
                  color: asciiColors.foreground,
                  fontFamily: 'Consolas',
                  fontSize: 12,
                  borderRadius: 2,
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
                  padding: '8px 12px',
                  border: `1px solid ${asciiColors.border}`,
                  backgroundColor: asciiColors.background,
                  color: asciiColors.foreground,
                  fontFamily: 'Consolas',
                  fontSize: 12,
                  borderRadius: 2,
                }}
              />
              <input
                type="date"
                placeholder="End Date"
                value={filters.end_date}
                onChange={(e) => setFilters(prev => ({ ...prev, end_date: e.target.value }))}
                style={{
                  padding: '8px 12px',
                  border: `1px solid ${asciiColors.border}`,
                  backgroundColor: asciiColors.background,
                  color: asciiColors.foreground,
                  fontFamily: 'Consolas',
                  fontSize: 12,
                  borderRadius: 2,
                }}
              />
            </div>

            <div style={{ marginBottom: 12, fontSize: 11, color: asciiColors.muted }}>
              Audit Logs ({total})
            </div>

            <AuditTable>
              <thead>
                <tr>
                  <Th>Timestamp</Th>
                  <Th>User</Th>
                  <Th>Action</Th>
                  <Th>Schema.Table</Th>
                  <Th>Rows</Th>
                  <Th>Compliance</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <Td colSpan={7} style={{ textAlign: 'center', padding: 20, color: asciiColors.muted }}>
                      No audit logs found.
                    </Td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.log_id}>
                      <Td>{formatDate(log.created_at)}</Td>
                      <Td>
                        <code style={{ color: asciiColors.accent }}>{log.username}</code>
                      </Td>
                      <Td>
                        <span style={{ 
                          color: getActionTypeColor(log.action_type),
                          fontWeight: 600 
                        }}>
                          {log.action_type}
                        </span>
                      </Td>
                      <Td>
                        {log.schema_name && log.table_name ? (
                          <code style={{ color: asciiColors.muted, fontSize: 11 }}>
                            {log.schema_name}.{log.table_name}
                          </code>
                        ) : (
                          <span style={{ color: asciiColors.muted }}>-</span>
                        )}
                      </Td>
                      <Td>{log.rows_affected || 0}</Td>
                      <Td>
                        {log.compliance_requirement ? (
                          <span style={{ color: asciiColors.warning, fontSize: 11 }}>
                            {log.compliance_requirement}
                          </span>
                        ) : (
                          <span style={{ color: asciiColors.muted }}>-</span>
                        )}
                      </Td>
                      <Td>
                        <AsciiButton
                          label="👁️"
                          onClick={() => setSelectedLog(log)}
                          variant="ghost"
                          title="View Details"
                        />
                      </Td>
                    </TableRow>
                  ))
                )}
              </tbody>
            </AuditTable>

            {total > limit && (
              <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 11, color: asciiColors.muted }}>
                  Page {page} of {Math.ceil(total / limit)}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <AsciiButton
                    label="◀ Previous"
                    onClick={() => setPage(prev => Math.max(1, prev - 1))}
                    disabled={page === 1}
                    variant="ghost"
                  />
                  <AsciiButton
                    label="Next ▶"
                    onClick={() => setPage(prev => Math.min(Math.ceil(total / limit), prev + 1))}
                    disabled={page >= Math.ceil(total / limit)}
                    variant="ghost"
                  />
                </div>
              </div>
            )}
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
            <AsciiPanel title="AUDIT LOG DETAILS">
              <div style={{ padding: 16, fontFamily: 'Consolas', fontSize: 12 }}>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, color: asciiColors.muted, marginBottom: 4 }}>Log ID</div>
                  <div style={{ color: asciiColors.foreground, fontSize: 12 }}>{selectedLog.log_id}</div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, color: asciiColors.muted, marginBottom: 4 }}>Timestamp</div>
                  <div style={{ color: asciiColors.foreground, fontSize: 12 }}>{formatDate(selectedLog.created_at)}</div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, color: asciiColors.muted, marginBottom: 4 }}>User</div>
                  <div style={{ color: asciiColors.accent, fontSize: 12 }}>{selectedLog.username}</div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, color: asciiColors.muted, marginBottom: 4 }}>Action Type</div>
                  <div style={{ 
                    color: getActionTypeColor(selectedLog.action_type),
                    fontSize: 12,
                    fontWeight: 600
                  }}>{selectedLog.action_type}</div>
                </div>
                {selectedLog.schema_name && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 10, color: asciiColors.muted, marginBottom: 4 }}>Schema.Table.Column</div>
                    <div style={{ color: asciiColors.foreground, fontSize: 12 }}>
                      <code>
                        {selectedLog.schema_name}.{selectedLog.table_name}
                        {selectedLog.column_name && `.${selectedLog.column_name}`}
                      </code>
                    </div>
                  </div>
                )}
                {selectedLog.query_text && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 10, color: asciiColors.muted, marginBottom: 4 }}>Query Text</div>
                    <div style={{
                      padding: '8px 12px',
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
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 10, color: asciiColors.muted, marginBottom: 4 }}>Old Values</div>
                    <div style={{
                      padding: '8px 12px',
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
                      {JSON.stringify(selectedLog.old_values, null, 2)}
                    </div>
                  </div>
                )}
                {selectedLog.new_values && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 10, color: asciiColors.muted, marginBottom: 4 }}>New Values</div>
                    <div style={{
                      padding: '8px 12px',
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
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, color: asciiColors.muted, marginBottom: 4 }}>Rows Affected</div>
                  <div style={{ color: asciiColors.foreground, fontSize: 12 }}>{selectedLog.rows_affected || 0}</div>
                </div>
                {selectedLog.compliance_requirement && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 10, color: asciiColors.muted, marginBottom: 4 }}>Compliance Requirement</div>
                    <div style={{ color: asciiColors.warning, fontSize: 12, fontWeight: 600 }}>
                      {selectedLog.compliance_requirement}
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
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
            <AsciiPanel title="COMPLIANCE REPORT">
              <div style={{ padding: 16, fontFamily: 'Consolas', fontSize: 12 }}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', marginBottom: 4, color: asciiColors.muted, fontSize: 11 }}>
                    Compliance Type *
                  </label>
                  <select
                    value={complianceType}
                    onChange={(e) => setComplianceType(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: `1px solid ${asciiColors.border}`,
                      backgroundColor: asciiColors.background,
                      color: asciiColors.foreground,
                      fontFamily: 'Consolas',
                      fontSize: 12,
                      borderRadius: 2,
                    }}
                  >
                    <option value="GDPR">GDPR</option>
                    <option value="HIPAA">HIPAA</option>
                    <option value="SOX">SOX</option>
                    <option value="PCI-DSS">PCI-DSS</option>
                  </select>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <AsciiButton
                    label="Generate Report"
                    onClick={handleGenerateComplianceReport}
                  />
                </div>

                {complianceReport && (
                  <div style={{
                    marginTop: 20,
                    padding: 16,
                    backgroundColor: asciiColors.backgroundSoft,
                    borderRadius: 2,
                    border: `1px solid ${asciiColors.border}`
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                      {ascii.blockFull} COMPLIANCE REPORT: {complianceType}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16 }}>
                      <div>
                        <div style={{ fontSize: 10, color: asciiColors.muted, marginBottom: 4 }}>Total Events</div>
                        <div style={{ fontSize: 16, fontWeight: 600, color: asciiColors.accent }}>
                          {complianceReport.total_events || 0}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: asciiColors.muted, marginBottom: 4 }}>Unique Users</div>
                        <div style={{ fontSize: 16, fontWeight: 600, color: asciiColors.accent }}>
                          {complianceReport.unique_users || 0}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: asciiColors.muted, marginBottom: 4 }}>Unique Tables</div>
                        <div style={{ fontSize: 16, fontWeight: 600, color: asciiColors.accent }}>
                          {complianceReport.unique_tables || 0}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: asciiColors.muted, marginBottom: 4 }}>Sensitive Access</div>
                        <div style={{ fontSize: 16, fontWeight: 600, color: asciiColors.warning }}>
                          {complianceReport.sensitive_access_count || 0}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: asciiColors.muted, marginBottom: 4 }}>Modifications</div>
                        <div style={{ fontSize: 16, fontWeight: 600, color: asciiColors.danger }}>
                          {complianceReport.modification_count || 0}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: asciiColors.muted, marginBottom: 4 }}>Access Count</div>
                        <div style={{ fontSize: 16, fontWeight: 600, color: asciiColors.accent }}>
                          {complianceReport.access_count || 0}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
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
