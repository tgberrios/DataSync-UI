import React, { useState, useEffect, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { extractApiError } from '../../utils/errorHandler';
import { AlertRuleModal } from './AlertRuleModal';

interface AlertRule {
  id: number;
  rule_name: string;
  alert_type: string;
  severity: string;
  evaluation_type?: string;
  threshold_low?: number;
  threshold_warning?: number;
  threshold_critical?: number;
  condition_expression: string;
  threshold_value?: string;
  custom_message?: string;
  db_engine?: string;
  connection_string?: string;
  query_type: string;
  check_interval: number;
  is_system_rule: boolean;
  query_template?: string;
  webhook_ids: number[];
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

const AlertRules = () => {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    query_type: '',
    db_engine: '',
    enabled: ''
  });
  const isMountedRef = useRef(true);

  const fetchRules = useCallback(async () => {
    if (!isMountedRef.current) return;
    try {
      setError(null);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      });
      if (filters.query_type) params.append('query_type', filters.query_type);
      if (filters.db_engine) params.append('db_engine', filters.db_engine);
      if (filters.enabled !== '') params.append('enabled', filters.enabled);

      const response = await fetch(`/api/alert-rules?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch alert rules');
      }
      
      const data = await response.json();
      if (isMountedRef.current) {
        setRules(data.rules || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setLoading(false);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(extractApiError(err));
        setLoading(false);
      }
    }
  }, [page, filters]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchRules();
    const interval = setInterval(() => {
      if (isMountedRef.current && !showModal) {
        fetchRules();
      }
    }, 30000);
    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchRules, showModal]);

  const handleAdd = useCallback(() => {
    setEditingRule(null);
    setShowModal(true);
  }, []);

  const handleEdit = useCallback((rule: AlertRule) => {
    setEditingRule(rule);
    setShowModal(true);
  }, []);

  const handleDelete = useCallback(async (rule: AlertRule) => {
    if (rule.is_system_rule) {
      alert('Cannot delete system rules');
      return;
    }
    if (!confirm(`Are you sure you want to delete alert rule "${rule.rule_name}"?`)) {
      return;
    }

    try {
      setError(null);
      const response = await fetch(`/api/alert-rules/${rule.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete alert rule');
      }

      await fetchRules();
      alert(`Alert rule "${rule.rule_name}" deleted successfully.`);
    } catch (err) {
      setError(extractApiError(err));
    }
  }, [fetchRules]);

  const handleToggle = useCallback(async (rule: AlertRule) => {
    try {
      setError(null);
      const response = await fetch(`/api/alert-rules/${rule.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ enabled: !rule.enabled })
      });

      if (!response.ok) {
        throw new Error('Failed to toggle alert rule');
      }

      await fetchRules();
    } catch (err) {
      setError(extractApiError(err));
    }
  }, [fetchRules]);

  const handleTest = useCallback(async (rule: AlertRule) => {
    try {
      setError(null);
      const response = await fetch(`/api/alert-rules/${rule.id}/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to test alert rule');
      }

      const result = await response.json();
      alert(result.message || `Query returned ${result.rowCount} row(s)`);
    } catch (err: any) {
      alert(`Error testing query: ${err.message || extractApiError(err)}`);
    }
  }, []);

  const handleSave = useCallback(async (ruleData: any) => {
    try {
      setError(null);
      const url = editingRule 
        ? `/api/alert-rules/${editingRule.id}`
        : '/api/alert-rules';
      const method = editingRule ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(ruleData)
      });

      if (!response.ok) {
        let errorMessage = 'Failed to save alert rule';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      await fetchRules();
      setShowModal(false);
      setEditingRule(null);
      alert(`Alert rule "${ruleData.rule_name}" ${editingRule ? 'updated' : 'created'} successfully.`);
    } catch (err: any) {
      setError(extractApiError(err));
      throw err;
    }
  }, [editingRule, fetchRules]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return asciiColors.danger;
      case 'WARNING': return asciiColors.warning;
      case 'INFO': return asciiColors.accent;
      default: return asciiColors.muted;
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "20px", fontFamily: "Consolas", fontSize: 12 }}>
        <AsciiPanel title="LOADING">
          <div style={{ padding: "40px", textAlign: "center", color: asciiColors.muted }}>
            {ascii.blockFull} Loading alert rules...
          </div>
        </AsciiPanel>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px", fontFamily: "Consolas", fontSize: 12 }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "20px"
      }}>
        <h2 style={{
          fontSize: 13,
          fontWeight: 600,
          margin: 0,
          color: asciiColors.foreground,
          textTransform: "uppercase",
          fontFamily: "Consolas"
        }}>
          <span style={{ color: asciiColors.warning, marginRight: 8 }}>{ascii.blockFull}</span>
          ALERT RULES
        </h2>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <AsciiButton
            label="Create Alert Rule"
            onClick={handleAdd}
            variant="primary"
          />
        </div>
      </div>

      {error && (
        <AsciiPanel title="ERROR">
          <div style={{ color: asciiColors.danger, padding: "10px" }}>
            {error}
          </div>
        </AsciiPanel>
      )}

      <div style={{ display: "flex", gap: "10px", marginBottom: "15px", flexWrap: "wrap" }}>
        <select
          value={filters.query_type}
          onChange={(e) => setFilters(prev => ({ ...prev, query_type: e.target.value }))}
          style={{
            padding: '6px 10px',
            border: `1px solid ${asciiColors.border}`,
            borderRadius: 2,
            background: asciiColors.background,
            color: asciiColors.foreground,
            fontFamily: "Consolas",
            fontSize: 11
          }}
        >
          <option value="">All Types</option>
          <option value="CUSTOM_SQL">Custom SQL</option>
        </select>
        <select
          value={filters.db_engine}
          onChange={(e) => setFilters(prev => ({ ...prev, db_engine: e.target.value }))}
          style={{
            padding: '6px 10px',
            border: `1px solid ${asciiColors.border}`,
            borderRadius: 2,
            background: asciiColors.background,
            color: asciiColors.foreground,
            fontFamily: "Consolas",
            fontSize: 11
          }}
        >
          <option value="">All Engines</option>
          <option value="PostgreSQL">PostgreSQL</option>
          <option value="MSSQL">MSSQL</option>
          <option value="MariaDB">MariaDB</option>
          <option value="MongoDB">MongoDB</option>
        </select>
        <select
          value={filters.enabled}
          onChange={(e) => setFilters(prev => ({ ...prev, enabled: e.target.value }))}
          style={{
            padding: '6px 10px',
            border: `1px solid ${asciiColors.border}`,
            borderRadius: 2,
            background: asciiColors.background,
            color: asciiColors.foreground,
            fontFamily: "Consolas",
            fontSize: 11
          }}
        >
          <option value="">All Status</option>
          <option value="true">Enabled</option>
          <option value="false">Disabled</option>
        </select>
      </div>

      {rules.length === 0 ? (
        <AsciiPanel title="NO ALERT RULES">
          <div style={{
            padding: "40px",
            textAlign: "center",
            fontSize: 12,
            fontFamily: "Consolas",
            color: asciiColors.muted
          }}>
            {ascii.blockEmpty} No alert rules configured
            <br />
            <br />
            <AsciiButton
              label="Create First Alert Rule"
              onClick={handleAdd}
              variant="primary"
            />
          </div>
        </AsciiPanel>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {rules.map(rule => (
            <AsciiPanel key={rule.id} title={rule.rule_name}>
              <div style={{ padding: "15px" }}>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "start",
                  marginBottom: "10px"
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ marginBottom: "8px", display: "flex", gap: "15px", flexWrap: "wrap" }}>
                      <div>
                        <span style={{ color: asciiColors.accent, fontWeight: 600 }}>Type:</span>{' '}
                        <span style={{ color: asciiColors.foreground }}>{rule.query_type}</span>
                      </div>
                      <div>
                        <span style={{ color: asciiColors.accent, fontWeight: 600 }}>Severity:</span>{' '}
                        <span style={{ color: getSeverityColor(rule.severity), fontWeight: 600 }}>
                          {rule.severity}
                        </span>
                      </div>
                      {rule.db_engine && (
                        <div>
                          <span style={{ color: asciiColors.accent, fontWeight: 600 }}>Engine:</span>{' '}
                          <span style={{ color: asciiColors.foreground }}>{rule.db_engine}</span>
                        </div>
                      )}
                      <div>
                        <span style={{ color: asciiColors.accent, fontWeight: 600 }}>Interval:</span>{' '}
                        <span style={{ color: asciiColors.foreground }}>{rule.check_interval}s</span>
                      </div>
                    </div>
                    {rule.threshold_value && (
                      <div style={{ marginBottom: "8px" }}>
                        <span style={{ color: asciiColors.accent, fontWeight: 600 }}>Threshold:</span>{' '}
                        <span style={{ color: asciiColors.foreground }}>{rule.threshold_value}</span>
                      </div>
                    )}
                    <div style={{ marginBottom: "8px" }}>
                      <span style={{ color: asciiColors.accent, fontWeight: 600 }}>Query:</span>
                      <div style={{
                        marginTop: "4px",
                        padding: "8px",
                        background: asciiColors.backgroundSoft,
                        border: `1px solid ${asciiColors.border}`,
                        borderRadius: 2,
                        fontSize: 10,
                        fontFamily: "monospace",
                        color: asciiColors.foreground,
                        maxHeight: "100px",
                        overflow: "auto",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-all"
                      }}>
                        {rule.condition_expression.length > 200 
                          ? rule.condition_expression.substring(0, 200) + '...'
                          : rule.condition_expression}
                      </div>
                    </div>
                    {rule.is_system_rule && (
                      <div style={{ marginBottom: "8px" }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 6px',
                          background: asciiColors.accent,
                          color: '#ffffff',
                          borderRadius: 2,
                          fontSize: 10,
                          fontWeight: 600
                        }}>
                          SYSTEM RULE
                        </span>
                      </div>
                    )}
                    <div style={{ marginBottom: "8px" }}>
                      <span style={{ color: asciiColors.accent, fontWeight: 600 }}>Status:</span>{' '}
                      <span style={{
                        color: rule.enabled ? asciiColors.success : asciiColors.muted,
                        fontWeight: 600
                      }}>
                        {rule.enabled ? 'ENABLED' : 'DISABLED'}
                      </span>
                    </div>
                    <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: `1px solid ${asciiColors.border}`, fontSize: 11, color: asciiColors.muted }}>
                      <div style={{ marginBottom: "4px" }}>
                        Created: {format(new Date(rule.created_at), 'yyyy-MM-dd HH:mm:ss')}
                      </div>
                      {rule.updated_at !== rule.created_at && (
                        <div>
                          Updated: {format(new Date(rule.updated_at), 'yyyy-MM-dd HH:mm:ss')}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "5px",
                    marginLeft: "15px"
                  }}>
                    <AsciiButton
                      label="Test Query"
                      onClick={() => handleTest(rule)}
                      variant="ghost"
                    />
                    {!rule.is_system_rule && (
                      <>
                        <AsciiButton
                          label={rule.enabled ? "Disable" : "Enable"}
                          onClick={() => handleToggle(rule)}
                          variant="ghost"
                        />
                        <AsciiButton
                          label="Edit"
                          onClick={() => handleEdit(rule)}
                          variant="ghost"
                        />
                        <AsciiButton
                          label="Delete"
                          onClick={() => handleDelete(rule)}
                          variant="ghost"
                        />
                      </>
                    )}
                  </div>
                </div>
              </div>
            </AsciiPanel>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "10px",
          marginTop: "20px"
        }}>
          <AsciiButton
            label="Previous"
            onClick={() => setPage(prev => Math.max(1, prev - 1))}
            variant="ghost"
            disabled={page === 1}
          />
          <span style={{ color: asciiColors.muted, fontSize: 11 }}>
            Page {page} of {totalPages}
          </span>
          <AsciiButton
            label="Next"
            onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
            variant="ghost"
            disabled={page >= totalPages}
          />
        </div>
      )}

      <AlertRuleModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingRule(null);
        }}
        onSave={handleSave}
        initialData={editingRule}
      />
    </div>
  );
};

export default AlertRules;
