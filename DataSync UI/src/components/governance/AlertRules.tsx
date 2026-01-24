import React, { useState, useEffect, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import SkeletonLoader from '../shared/SkeletonLoader';
import { extractApiError } from '../../utils/errorHandler';
import { AlertRuleModal } from './AlertRuleModal';
import AlertRulesTreeView from './AlertRulesTreeView';

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
    
    const startTime = Date.now();
    const minLoadingTime = 300;
    
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
      
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minLoadingTime - elapsed);
      await new Promise(resolve => setTimeout(resolve, remaining));
      
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
      case 'CRITICAL': return asciiColors.foreground;
      case 'WARNING': return asciiColors.muted;
      case 'INFO': return asciiColors.accent;
      default: return asciiColors.muted;
    }
  };

  if (loading && rules.length === 0) {
    return <SkeletonLoader variant="table" />;
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
          <option value="Oracle">Oracle</option>
          <option value="DB2">DB2</option>
          <option value="Salesforce">Salesforce</option>
          <option value="SAP">SAP</option>
          <option value="Teradata">Teradata</option>
          <option value="Netezza">Netezza</option>
          <option value="Hive">Hive</option>
          <option value="Cassandra">Cassandra</option>
          <option value="DynamoDB">DynamoDB</option>
          <option value="AS400">AS/400</option>
          <option value="S3">S3</option>
          <option value="AzureBlob">Azure Blob</option>
          <option value="GCS">Google Cloud Storage</option>
          <option value="FTP">FTP</option>
          <option value="SFTP">SFTP</option>
          <option value="Email">Email</option>
          <option value="SOAP">SOAP</option>
          <option value="GraphQL">GraphQL</option>
          <option value="Excel">Excel</option>
          <option value="FixedWidth">Fixed Width</option>
          <option value="EBCDIC">EBCDIC</option>
          <option value="XML">XML</option>
          <option value="Avro">Avro</option>
          <option value="Parquet">Parquet</option>
          <option value="ORC">ORC</option>
          <option value="Compressed">Compressed</option>
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
        <AlertRulesTreeView
          rules={rules}
          onTest={handleTest}
          onToggle={handleToggle}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
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
