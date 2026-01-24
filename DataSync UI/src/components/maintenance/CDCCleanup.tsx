import React, { useState, useEffect, useCallback } from 'react';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { theme } from '../../theme/theme';
import { datalakeApi } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import SkeletonLoader from '../shared/SkeletonLoader';

interface CleanupPolicy {
  policy_id: number;
  connection_string: string;
  db_engine: string;
  retention_days: number;
  batch_size: number;
  enabled: boolean;
  last_cleanup_at?: string;
}

interface CleanupHistory {
  cleanup_id: number;
  connection_string: string;
  db_engine: string;
  rows_deleted: number;
  tables_cleaned: number;
  space_freed_mb?: number;
  started_at: string;
  completed_at?: string;
  status: string;
}

const CDCCleanup = () => {
  const [policies, setPolicies] = useState<CleanupPolicy[]>([]);
  const [history, setHistory] = useState<CleanupHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'policies' | 'history'>('policies');

  const fetchPolicies = useCallback(async () => {
    try {
      const data = await datalakeApi.getCleanupPolicies({});
      setPolicies(data.policies || data || []);
    } catch (err) {
      setError(extractApiError(err));
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const data = await datalakeApi.getCleanupHistory({});
      setHistory(data.history || data || []);
    } catch (err) {
      setError(extractApiError(err));
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchPolicies(), fetchHistory()]);
      setLoading(false);
    };
    loadData();
  }, [fetchPolicies, fetchHistory]);

  const handleExecuteCleanup = useCallback(async (policyId: number) => {
    try {
      setError(null);
      await datalakeApi.executeCleanup({ policy_id: policyId });
      await fetchHistory();
    } catch (err) {
      setError(extractApiError(err));
    }
  }, [fetchHistory]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleString();
  };

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
            CDC Cleanup Manager
          </h1>
          <p style={{ 
            color: asciiColors.muted, 
            fontSize: 12,
            marginBottom: theme.spacing.lg 
          }}>
            Manage cleanup policies for CDC changelog tables
          </p>

          {/* Tabs */}
          <div style={{
            display: 'flex',
            gap: theme.spacing.sm,
            marginBottom: theme.spacing.lg,
            borderBottom: `2px solid ${asciiColors.border}`,
            paddingBottom: theme.spacing.sm
          }}>
            <button
              onClick={() => setActiveTab('policies')}
              style={{
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                border: 'none',
                background: activeTab === 'policies' ? asciiColors.accent : 'transparent',
                color: activeTab === 'policies' ? '#ffffff' : asciiColors.foreground,
                borderRadius: `${2} ${2} 0 0`,
                cursor: 'pointer',
                fontWeight: activeTab === 'policies' ? 600 : 500,
                fontFamily: 'Consolas, monospace',
                fontSize: 12
              }}
            >
              Policies
            </button>
            <button
              onClick={() => setActiveTab('history')}
              style={{
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                border: 'none',
                background: activeTab === 'history' ? asciiColors.accent : 'transparent',
                color: activeTab === 'history' ? '#ffffff' : asciiColors.foreground,
                borderRadius: `${2} ${2} 0 0`,
                cursor: 'pointer',
                fontWeight: activeTab === 'history' ? 600 : 500,
                fontFamily: 'Consolas, monospace',
                fontSize: 12
              }}
            >
              History
            </button>
          </div>

          {error && (
            <div style={{
              padding: theme.spacing.md,
              background: asciiColors.error,
              color: '#ffffff',
              marginBottom: theme.spacing.md,
              borderRadius: 2,
              fontFamily: 'Consolas, monospace',
              fontSize: 12
            }}>
              Error: {error}
            </div>
          )}

          {loading ? (
            <SkeletonLoader />
          ) : activeTab === 'policies' ? (
            <div style={{
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2,
              overflow: 'hidden'
            }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontFamily: 'Consolas, monospace',
                fontSize: 12
              }}>
                <thead>
                  <tr style={{
                    background: asciiColors.backgroundSoft,
                    borderBottom: `2px solid ${asciiColors.border}`
                  }}>
                    <th style={{ padding: theme.spacing.md, textAlign: 'left', fontWeight: 600 }}>Connection</th>
                    <th style={{ padding: theme.spacing.md, textAlign: 'left', fontWeight: 600 }}>Engine</th>
                    <th style={{ padding: theme.spacing.md, textAlign: 'left', fontWeight: 600 }}>Retention Days</th>
                    <th style={{ padding: theme.spacing.md, textAlign: 'left', fontWeight: 600 }}>Batch Size</th>
                    <th style={{ padding: theme.spacing.md, textAlign: 'left', fontWeight: 600 }}>Status</th>
                    <th style={{ padding: theme.spacing.md, textAlign: 'left', fontWeight: 600 }}>Last Cleanup</th>
                    <th style={{ padding: theme.spacing.md, textAlign: 'left', fontWeight: 600 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {policies.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: theme.spacing.lg, textAlign: 'center', color: asciiColors.muted }}>
                        No policies configured
                      </td>
                    </tr>
                  ) : (
                    policies.map((policy, idx) => (
                      <tr
                        key={policy.policy_id}
                        style={{
                          borderBottom: `1px solid ${asciiColors.border}`,
                          background: idx % 2 === 0 ? asciiColors.background : asciiColors.backgroundSoft
                        }}
                      >
                        <td style={{ padding: theme.spacing.md, fontFamily: 'Consolas, monospace', fontSize: 11 }}>
                          {policy.connection_string.substring(0, 50)}...
                        </td>
                        <td style={{ padding: theme.spacing.md }}>{policy.db_engine}</td>
                        <td style={{ padding: theme.spacing.md }}>{policy.retention_days} days</td>
                        <td style={{ padding: theme.spacing.md }}>{policy.batch_size.toLocaleString()}</td>
                        <td style={{ padding: theme.spacing.md }}>
                          <span style={{
                            padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                            background: policy.enabled ? asciiColors.accent : asciiColors.muted,
                            color: '#ffffff',
                            borderRadius: 2,
                            fontSize: 11
                          }}>
                            {policy.enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </td>
                        <td style={{ padding: theme.spacing.md, color: asciiColors.muted }}>
                          {formatDate(policy.last_cleanup_at)}
                        </td>
                        <td style={{ padding: theme.spacing.md }}>
                          <AsciiButton
                            onClick={() => handleExecuteCleanup(policy.policy_id)}
                            label="Execute"
                            disabled={!policy.enabled}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2,
              overflow: 'hidden'
            }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontFamily: 'Consolas, monospace',
                fontSize: 12
              }}>
                <thead>
                  <tr style={{
                    background: asciiColors.backgroundSoft,
                    borderBottom: `2px solid ${asciiColors.border}`
                  }}>
                    <th style={{ padding: theme.spacing.md, textAlign: 'left', fontWeight: 600 }}>Started At</th>
                    <th style={{ padding: theme.spacing.md, textAlign: 'left', fontWeight: 600 }}>Connection</th>
                    <th style={{ padding: theme.spacing.md, textAlign: 'left', fontWeight: 600 }}>Engine</th>
                    <th style={{ padding: theme.spacing.md, textAlign: 'left', fontWeight: 600 }}>Rows Deleted</th>
                    <th style={{ padding: theme.spacing.md, textAlign: 'left', fontWeight: 600 }}>Tables Cleaned</th>
                    <th style={{ padding: theme.spacing.md, textAlign: 'left', fontWeight: 600 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: theme.spacing.lg, textAlign: 'center', color: asciiColors.muted }}>
                        No cleanup history
                      </td>
                    </tr>
                  ) : (
                    history.map((entry, idx) => (
                      <tr
                        key={entry.cleanup_id}
                        style={{
                          borderBottom: `1px solid ${asciiColors.border}`,
                          background: idx % 2 === 0 ? asciiColors.background : asciiColors.backgroundSoft
                        }}
                      >
                        <td style={{ padding: theme.spacing.md }}>{formatDate(entry.started_at)}</td>
                        <td style={{ padding: theme.spacing.md, fontFamily: 'Consolas, monospace', fontSize: 11 }}>
                          {entry.connection_string.substring(0, 50)}...
                        </td>
                        <td style={{ padding: theme.spacing.md }}>{entry.db_engine}</td>
                        <td style={{ padding: theme.spacing.md }}>{entry.rows_deleted.toLocaleString()}</td>
                        <td style={{ padding: theme.spacing.md }}>{entry.tables_cleaned}</td>
                        <td style={{ padding: theme.spacing.md }}>
                          <span style={{
                            padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                            background: entry.status === 'completed' ? asciiColors.accent : 
                                       entry.status === 'failed' ? asciiColors.error : asciiColors.muted,
                            color: '#ffffff',
                            borderRadius: 2,
                            fontSize: 11
                          }}>
                            {entry.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </AsciiPanel>
    </div>
  );
};

export default CDCCleanup;
