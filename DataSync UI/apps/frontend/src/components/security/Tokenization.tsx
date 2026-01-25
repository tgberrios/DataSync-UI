import React, { useState, useEffect } from 'react';
import { securityApi } from '../../services/api';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors } from '../../ui/theme/asciiTheme';
import { theme } from '../../theme/theme';
import { extractApiError } from '../../utils/errorHandler';

interface Token {
  token_id: number;
  schema_name: string;
  table_name: string;
  column_name: string;
  token_value: string;
  token_type: number;
  created_at: string;
  access_count: number;
}

const Tokenization = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [filters, setFilters] = useState({
    schema: '',
    table: '',
    column: ''
  });
  const [tokenizeForm, setTokenizeForm] = useState({
    value: '',
    schema_name: '',
    table_name: '',
    column_name: '',
    reversible: true,
    token_type: 'REVERSIBLE'
  });
  const [detokenizeForm, setDetokenizeForm] = useState({
    token: '',
    schema_name: '',
    table_name: '',
    column_name: '',
    reason: ''
  });

  const loadTokens = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await securityApi.getTokens({
        schema: filters.schema || undefined,
        table: filters.table || undefined,
        column: filters.column || undefined,
        limit: 100
      });
      setTokens(data);
    } catch (err: any) {
      setError(extractApiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTokens();
  }, [filters]);

  const handleTokenize = async () => {
    if (!tokenizeForm.value || !tokenizeForm.schema_name || !tokenizeForm.table_name || !tokenizeForm.column_name) {
      setError('All fields are required');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await securityApi.tokenize({
        value: tokenizeForm.value,
        schema_name: tokenizeForm.schema_name,
        table_name: tokenizeForm.table_name,
        column_name: tokenizeForm.column_name,
        reversible: tokenizeForm.reversible,
        token_type: tokenizeForm.token_type
      });
      setTokenizeForm({ ...tokenizeForm, value: '' });
      loadTokens();
    } catch (err: any) {
      setError(extractApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleDetokenize = async () => {
    if (!detokenizeForm.token || !detokenizeForm.schema_name || !detokenizeForm.table_name || !detokenizeForm.column_name) {
      setError('All fields are required');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await securityApi.detokenize({
        token: detokenizeForm.token,
        schema_name: detokenizeForm.schema_name,
        table_name: detokenizeForm.table_name,
        column_name: detokenizeForm.column_name,
        reason: detokenizeForm.reason
      });
      setDetokenizeForm({ ...detokenizeForm, token: '', reason: '' });
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

      {/* Tokenize Form */}
      <AsciiPanel style={{ marginBottom: theme.spacing.lg }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: theme.spacing.md, color: asciiColors.foreground }}>
          Tokenize Value
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.spacing.md, marginBottom: theme.spacing.md }}>
          <div>
            <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: 12, color: asciiColors.muted }}>
              Schema Name
            </label>
            <input
              type="text"
              value={tokenizeForm.schema_name}
              onChange={(e) => setTokenizeForm({ ...tokenizeForm, schema_name: e.target.value })}
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
              value={tokenizeForm.table_name}
              onChange={(e) => setTokenizeForm({ ...tokenizeForm, table_name: e.target.value })}
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
              Column Name
            </label>
            <input
              type="text"
              value={tokenizeForm.column_name}
              onChange={(e) => setTokenizeForm({ ...tokenizeForm, column_name: e.target.value })}
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
              Value
            </label>
            <input
              type="text"
              value={tokenizeForm.value}
              onChange={(e) => setTokenizeForm({ ...tokenizeForm, value: e.target.value })}
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
        <div style={{ display: 'flex', gap: theme.spacing.md, alignItems: 'center', marginBottom: theme.spacing.md }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.xs, fontSize: 12, color: asciiColors.foreground }}>
            <input
              type="checkbox"
              checked={tokenizeForm.reversible}
              onChange={(e) => setTokenizeForm({ ...tokenizeForm, reversible: e.target.checked })}
            />
            Reversible
          </label>
          <select
            value={tokenizeForm.token_type}
            onChange={(e) => setTokenizeForm({ ...tokenizeForm, token_type: e.target.value })}
            style={{
              padding: theme.spacing.sm,
              background: asciiColors.background,
              border: `1px solid ${asciiColors.border}`,
              color: asciiColors.foreground,
              fontFamily: 'Consolas, monospace',
              fontSize: 12
            }}
          >
            <option value="REVERSIBLE">Reversible</option>
            <option value="IRREVERSIBLE">Irreversible</option>
            <option value="FPE">Format-Preserving</option>
          </select>
        </div>
        <AsciiButton onClick={handleTokenize} disabled={loading}>
          Tokenize
        </AsciiButton>
      </AsciiPanel>

      {/* Detokenize Form */}
      <AsciiPanel style={{ marginBottom: theme.spacing.lg }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: theme.spacing.md, color: asciiColors.foreground }}>
          Detokenize
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.spacing.md, marginBottom: theme.spacing.md }}>
          <div>
            <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: 12, color: asciiColors.muted }}>
              Schema Name
            </label>
            <input
              type="text"
              value={detokenizeForm.schema_name}
              onChange={(e) => setDetokenizeForm({ ...detokenizeForm, schema_name: e.target.value })}
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
              value={detokenizeForm.table_name}
              onChange={(e) => setDetokenizeForm({ ...detokenizeForm, table_name: e.target.value })}
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
              Column Name
            </label>
            <input
              type="text"
              value={detokenizeForm.column_name}
              onChange={(e) => setDetokenizeForm({ ...detokenizeForm, column_name: e.target.value })}
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
              Token
            </label>
            <input
              type="text"
              value={detokenizeForm.token}
              onChange={(e) => setDetokenizeForm({ ...detokenizeForm, token: e.target.value })}
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
        <div style={{ marginBottom: theme.spacing.md }}>
          <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: 12, color: asciiColors.muted }}>
            Reason (required for audit)
          </label>
          <textarea
            value={detokenizeForm.reason}
            onChange={(e) => setDetokenizeForm({ ...detokenizeForm, reason: e.target.value })}
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
        <AsciiButton onClick={handleDetokenize} disabled={loading}>
          Detokenize
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
              Column
            </label>
            <input
              type="text"
              value={filters.column}
              onChange={(e) => setFilters({ ...filters, column: e.target.value })}
              placeholder="Filter by column"
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
      </AsciiPanel>

      {/* Tokens List */}
      <AsciiPanel>
        <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: theme.spacing.md, color: asciiColors.foreground }}>
          Tokens ({tokens.length})
        </h2>
        {loading ? (
          <div style={{ padding: theme.spacing.lg, textAlign: 'center', color: asciiColors.muted }}>
            Loading...
          </div>
        ) : tokens.length === 0 ? (
          <div style={{ padding: theme.spacing.lg, textAlign: 'center', color: asciiColors.muted }}>
            No tokens found
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${asciiColors.border}` }}>
                <th style={{ padding: theme.spacing.sm, textAlign: 'left', color: asciiColors.accent }}>Schema</th>
                <th style={{ padding: theme.spacing.sm, textAlign: 'left', color: asciiColors.accent }}>Table</th>
                <th style={{ padding: theme.spacing.sm, textAlign: 'left', color: asciiColors.accent }}>Column</th>
                <th style={{ padding: theme.spacing.sm, textAlign: 'left', color: asciiColors.accent }}>Token</th>
                <th style={{ padding: theme.spacing.sm, textAlign: 'left', color: asciiColors.accent }}>Type</th>
                <th style={{ padding: theme.spacing.sm, textAlign: 'left', color: asciiColors.accent }}>Access Count</th>
                <th style={{ padding: theme.spacing.sm, textAlign: 'left', color: asciiColors.accent }}>Created</th>
              </tr>
            </thead>
            <tbody>
              {tokens.map((token) => (
                <tr key={token.token_id} style={{ borderBottom: `1px solid ${asciiColors.border}` }}>
                  <td style={{ padding: theme.spacing.sm }}>{token.schema_name}</td>
                  <td style={{ padding: theme.spacing.sm }}>{token.table_name}</td>
                  <td style={{ padding: theme.spacing.sm }}>{token.column_name}</td>
                  <td style={{ padding: theme.spacing.sm, fontFamily: 'monospace' }}>{token.token_value.substring(0, 20)}...</td>
                  <td style={{ padding: theme.spacing.sm }}>
                    {token.token_type === 0 ? 'Reversible' : token.token_type === 1 ? 'Irreversible' : 'FPE'}
                  </td>
                  <td style={{ padding: theme.spacing.sm }}>{token.access_count}</td>
                  <td style={{ padding: theme.spacing.sm }}>
                    {new Date(token.created_at).toLocaleDateString()}
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

export default Tokenization;
