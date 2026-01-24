import React, { useState, useEffect } from 'react';
import { securityApi } from '../../services/api';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors } from '../../ui/theme/asciiTheme';
import { theme } from '../../theme/theme';
import { extractApiError } from '../../utils/errorHandler';

interface PermissionPolicy {
  policy_id?: number;
  policy_name: string;
  policy_type: 'COLUMN' | 'ROW' | 'TABLE';
  schema_name?: string;
  table_name?: string;
  column_name?: string;
  role_name?: string;
  username?: string;
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  condition_expression?: string;
  attribute_conditions?: Record<string, string>;
  priority: number;
  active: boolean;
}

const Permissions = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [policies, setPolicies] = useState<PermissionPolicy[]>([]);
  const [policyForm, setPolicyForm] = useState<PermissionPolicy>({
    policy_name: '',
    policy_type: 'COLUMN',
    schema_name: '',
    table_name: '',
    column_name: '',
    role_name: '',
    username: '',
    operation: 'SELECT',
    condition_expression: '',
    attribute_conditions: {},
    priority: 0,
    active: true
  });
  const [filters, setFilters] = useState({
    schema: '',
    table: '',
    policy_type: ''
  });

  const loadPolicies = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await securityApi.getPermissionPolicies({
        schema: filters.schema || undefined,
        table: filters.table || undefined,
        policy_type: filters.policy_type || undefined
      });
      setPolicies(data);
    } catch (err: any) {
      setError(extractApiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPolicies();
  }, [filters]);

  const handleCreatePolicy = async () => {
    if (!policyForm.policy_name || !policyForm.operation) {
      setError('Policy name and operation are required');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await securityApi.createPermissionPolicy(policyForm);
      setPolicyForm({
        policy_name: '',
        policy_type: 'COLUMN',
        schema_name: '',
        table_name: '',
        column_name: '',
        role_name: '',
        username: '',
        operation: 'SELECT',
        condition_expression: '',
        attribute_conditions: {},
        priority: 0,
        active: true
      });
      loadPolicies();
    } catch (err: any) {
      setError(extractApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
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

      {/* Create Policy Form */}
      <AsciiPanel style={{ marginBottom: theme.spacing.lg }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: theme.spacing.md, color: asciiColors.foreground }}>
          Create Permission Policy
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.spacing.md, marginBottom: theme.spacing.md }}>
          <div>
            <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: 12, color: asciiColors.muted }}>
              Policy Name
            </label>
            <input
              type="text"
              value={policyForm.policy_name}
              onChange={(e) => setPolicyForm({ ...policyForm, policy_name: e.target.value })}
              style={{
                width: '100%',
                padding: theme.spacing.sm,
                background: asciiColors.background,
                border: `1px solid ${asciiColors.border}`,
                color: asciiColors.foreground,
                fontFamily: 'Consolas, monospace',
                fontSize: 12
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: 12, color: asciiColors.muted }}>
              Policy Type
            </label>
            <select
              value={policyForm.policy_type}
              onChange={(e) => setPolicyForm({ ...policyForm, policy_type: e.target.value as 'COLUMN' | 'ROW' | 'TABLE' })}
              style={{
                width: '100%',
                padding: theme.spacing.sm,
                background: asciiColors.background,
                border: `1px solid ${asciiColors.border}`,
                color: asciiColors.foreground,
                fontFamily: 'Consolas, monospace',
                fontSize: 12
              }}
            >
              <option value="COLUMN">Column</option>
              <option value="ROW">Row</option>
              <option value="TABLE">Table</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: 12, color: asciiColors.muted }}>
              Schema Name
            </label>
            <input
              type="text"
              value={policyForm.schema_name || ''}
              onChange={(e) => setPolicyForm({ ...policyForm, schema_name: e.target.value })}
              style={{
                width: '100%',
                padding: theme.spacing.sm,
                background: asciiColors.background,
                border: `1px solid ${asciiColors.border}`,
                color: asciiColors.foreground,
                fontFamily: 'Consolas, monospace',
                fontSize: 12
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: 12, color: asciiColors.muted }}>
              Table Name
            </label>
            <input
              type="text"
              value={policyForm.table_name || ''}
              onChange={(e) => setPolicyForm({ ...policyForm, table_name: e.target.value })}
              style={{
                width: '100%',
                padding: theme.spacing.sm,
                background: asciiColors.background,
                border: `1px solid ${asciiColors.border}`,
                color: asciiColors.foreground,
                fontFamily: 'Consolas, monospace',
                fontSize: 12
              }}
            />
          </div>
          {policyForm.policy_type === 'COLUMN' && (
            <div>
              <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: 12, color: asciiColors.muted }}>
                Column Name
              </label>
              <input
                type="text"
                value={policyForm.column_name || ''}
                onChange={(e) => setPolicyForm({ ...policyForm, column_name: e.target.value })}
                style={{
                  width: '100%',
                  padding: theme.spacing.sm,
                  background: asciiColors.background,
                  border: `1px solid ${asciiColors.border}`,
                  color: asciiColors.foreground,
                  fontFamily: 'Consolas, monospace',
                  fontSize: 12
                }}
              />
            </div>
          )}
          <div>
            <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: 12, color: asciiColors.muted }}>
              Operation
            </label>
            <select
              value={policyForm.operation}
              onChange={(e) => setPolicyForm({ ...policyForm, operation: e.target.value as 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' })}
              style={{
                width: '100%',
                padding: theme.spacing.sm,
                background: asciiColors.background,
                border: `1px solid ${asciiColors.border}`,
                color: asciiColors.foreground,
                fontFamily: 'Consolas, monospace',
                fontSize: 12
              }}
            >
              <option value="SELECT">SELECT</option>
              <option value="INSERT">INSERT</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: 12, color: asciiColors.muted }}>
              Role Name (optional)
            </label>
            <input
              type="text"
              value={policyForm.role_name || ''}
              onChange={(e) => setPolicyForm({ ...policyForm, role_name: e.target.value })}
              placeholder="Leave empty for all roles"
              style={{
                width: '100%',
                padding: theme.spacing.sm,
                background: asciiColors.background,
                border: `1px solid ${asciiColors.border}`,
                color: asciiColors.foreground,
                fontFamily: 'Consolas, monospace',
                fontSize: 12
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: 12, color: asciiColors.muted }}>
              Username (optional)
            </label>
            <input
              type="text"
              value={policyForm.username || ''}
              onChange={(e) => setPolicyForm({ ...policyForm, username: e.target.value })}
              placeholder="Leave empty for all users"
              style={{
                width: '100%',
                padding: theme.spacing.sm,
                background: asciiColors.background,
                border: `1px solid ${asciiColors.border}`,
                color: asciiColors.foreground,
                fontFamily: 'Consolas, monospace',
                fontSize: 12
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: 12, color: asciiColors.muted }}>
              Priority
            </label>
            <input
              type="number"
              value={policyForm.priority}
              onChange={(e) => setPolicyForm({ ...policyForm, priority: parseInt(e.target.value) || 0 })}
              style={{
                width: '100%',
                padding: theme.spacing.sm,
                background: asciiColors.background,
                border: `1px solid ${asciiColors.border}`,
                color: asciiColors.foreground,
                fontFamily: 'Consolas, monospace',
                fontSize: 12
              }}
            />
          </div>
        </div>
        {policyForm.policy_type === 'ROW' && (
          <div style={{ marginBottom: theme.spacing.md }}>
            <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: 12, color: asciiColors.muted }}>
              Condition Expression (SQL WHERE clause)
            </label>
            <textarea
              value={policyForm.condition_expression || ''}
              onChange={(e) => setPolicyForm({ ...policyForm, condition_expression: e.target.value })}
              placeholder="e.g., department = 'Sales' AND salary < 50000"
              rows={3}
              style={{
                width: '100%',
                padding: theme.spacing.sm,
                background: asciiColors.background,
                border: `1px solid ${asciiColors.border}`,
                color: asciiColors.foreground,
                fontFamily: 'Consolas, monospace',
                fontSize: 12,
                resize: 'vertical'
              }}
            />
          </div>
        )}
        <div style={{ display: 'flex', gap: theme.spacing.md, alignItems: 'center', marginBottom: theme.spacing.md }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.xs, fontSize: 12, color: asciiColors.foreground }}>
            <input
              type="checkbox"
              checked={policyForm.active}
              onChange={(e) => setPolicyForm({ ...policyForm, active: e.target.checked })}
            />
            Active
          </label>
        </div>
        <AsciiButton onClick={handleCreatePolicy} disabled={loading}>
          Create Policy
        </AsciiButton>
      </AsciiPanel>

      {/* Filters */}
      <AsciiPanel style={{ marginBottom: theme.spacing.lg }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: theme.spacing.md, color: asciiColors.foreground }}>
          Filters
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: theme.spacing.md }}>
          <div>
            <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: 12, color: asciiColors.muted }}>
              Schema
            </label>
            <input
              type="text"
              value={filters.schema}
              onChange={(e) => setFilters({ ...filters, schema: e.target.value })}
              placeholder="Filter by schema"
              style={{
                width: '100%',
                padding: theme.spacing.sm,
                background: asciiColors.background,
                border: `1px solid ${asciiColors.border}`,
                color: asciiColors.foreground,
                fontFamily: 'Consolas, monospace',
                fontSize: 12
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: 12, color: asciiColors.muted }}>
              Table
            </label>
            <input
              type="text"
              value={filters.table}
              onChange={(e) => setFilters({ ...filters, table: e.target.value })}
              placeholder="Filter by table"
              style={{
                width: '100%',
                padding: theme.spacing.sm,
                background: asciiColors.background,
                border: `1px solid ${asciiColors.border}`,
                color: asciiColors.foreground,
                fontFamily: 'Consolas, monospace',
                fontSize: 12
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: 12, color: asciiColors.muted }}>
              Policy Type
            </label>
            <select
              value={filters.policy_type}
              onChange={(e) => setFilters({ ...filters, policy_type: e.target.value })}
              style={{
                width: '100%',
                padding: theme.spacing.sm,
                background: asciiColors.background,
                border: `1px solid ${asciiColors.border}`,
                color: asciiColors.foreground,
                fontFamily: 'Consolas, monospace',
                fontSize: 12
              }}
            >
              <option value="">All Types</option>
              <option value="COLUMN">Column</option>
              <option value="ROW">Row</option>
              <option value="TABLE">Table</option>
            </select>
          </div>
        </div>
      </AsciiPanel>

      {/* Policies List */}
      <AsciiPanel>
        <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: theme.spacing.md, color: asciiColors.foreground }}>
          Permission Policies ({policies.length})
        </h2>
        {loading ? (
          <div style={{ padding: theme.spacing.lg, textAlign: 'center', color: asciiColors.muted }}>
            Loading...
          </div>
        ) : policies.length === 0 ? (
          <div style={{ padding: theme.spacing.lg, textAlign: 'center', color: asciiColors.muted }}>
            No policies found
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${asciiColors.border}` }}>
                <th style={{ padding: theme.spacing.sm, textAlign: 'left', color: asciiColors.accent }}>Policy Name</th>
                <th style={{ padding: theme.spacing.sm, textAlign: 'left', color: asciiColors.accent }}>Type</th>
                <th style={{ padding: theme.spacing.sm, textAlign: 'left', color: asciiColors.accent }}>Schema</th>
                <th style={{ padding: theme.spacing.sm, textAlign: 'left', color: asciiColors.accent }}>Table</th>
                <th style={{ padding: theme.spacing.sm, textAlign: 'left', color: asciiColors.accent }}>Column</th>
                <th style={{ padding: theme.spacing.sm, textAlign: 'left', color: asciiColors.accent }}>Operation</th>
                <th style={{ padding: theme.spacing.sm, textAlign: 'left', color: asciiColors.accent }}>Role/User</th>
                <th style={{ padding: theme.spacing.sm, textAlign: 'left', color: asciiColors.accent }}>Priority</th>
                <th style={{ padding: theme.spacing.sm, textAlign: 'left', color: asciiColors.accent }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {policies.map((policy) => (
                <tr key={policy.policy_id} style={{ borderBottom: `1px solid ${asciiColors.border}` }}>
                  <td style={{ padding: theme.spacing.sm }}>{policy.policy_name}</td>
                  <td style={{ padding: theme.spacing.sm }}>{policy.policy_type}</td>
                  <td style={{ padding: theme.spacing.sm }}>{policy.schema_name || '-'}</td>
                  <td style={{ padding: theme.spacing.sm }}>{policy.table_name || '-'}</td>
                  <td style={{ padding: theme.spacing.sm }}>{policy.column_name || '-'}</td>
                  <td style={{ padding: theme.spacing.sm }}>{policy.operation}</td>
                  <td style={{ padding: theme.spacing.sm }}>
                    {policy.role_name || policy.username || 'All'}
                  </td>
                  <td style={{ padding: theme.spacing.sm }}>{policy.priority}</td>
                  <td style={{ padding: theme.spacing.sm }}>
                    <span style={{ color: policy.active ? asciiColors.accent : asciiColors.muted }}>
                      {policy.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </AsciiPanel>
    </div>
  );
};

export default Permissions;
