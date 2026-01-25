import React, { useState, useEffect, useCallback } from 'react';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { theme } from '../../theme/theme';
import { monitoringApi } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import SkeletonLoader from '../shared/SkeletonLoader';

interface CostSummary {
  total_cost: number;
  compute_cost: number;
  storage_cost: number;
  network_cost: number;
  operation_count: number;
}

interface Budget {
  budget_id: string;
  name: string;
  scope: string;
  scope_id?: string;
  amount: number;
  period: string;
  current_spend: number;
  alert_on_exceed: boolean;
  alert_threshold: number;
}

const CostTracking = () => {
  const [summary, setSummary] = useState<CostSummary | null>(null);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState<number>(30);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [newBudget, setNewBudget] = useState<Partial<Budget>>({
    budget_id: '',
    name: '',
    scope: 'global',
    amount: 0,
    period: 'monthly',
    alert_on_exceed: true,
    alert_threshold: 80.0
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [summaryData, budgetsData] = await Promise.all([
        monitoringApi.getCostSummary({ days }).catch(() => null),
        monitoringApi.getBudgets().catch(() => [])
      ]);
      setSummary(summaryData);
      setBudgets(budgetsData || []);
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setLoading(false);
    }
  }, [days]);

  const handleCreateBudget = useCallback(async () => {
    try {
      if (!newBudget.budget_id || !newBudget.name || !newBudget.amount) {
        setError('Budget ID, name, and amount are required');
        return;
      }
      await monitoringApi.setBudget(newBudget as Budget);
      setShowBudgetModal(false);
      setNewBudget({
        budget_id: '',
        name: '',
        scope: 'global',
        amount: 0,
        period: 'monthly',
        alert_on_exceed: true,
        alert_threshold: 80.0
      });
      fetchData();
    } catch (err) {
      setError(extractApiError(err));
    }
  }, [newBudget, fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getBudgetUsagePercent = (budget: Budget) => {
    return (budget.current_spend / budget.amount) * 100;
  };

  if (loading && !summary) {
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
            Cost Tracking
          </h1>
          <p style={{
            color: asciiColors.muted,
            fontSize: 12,
            marginBottom: theme.spacing.lg
          }}>
            Track costs by operation and workflow, manage budgets and alerts
          </p>

          <div style={{
            display: 'flex',
            gap: theme.spacing.md,
            marginBottom: theme.spacing.lg,
            alignItems: 'center'
          }}>
            <select
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value))}
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
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
            <AsciiButton
              label="Create Budget"
              onClick={() => setShowBudgetModal(true)}
            />
            <AsciiButton
              label="Refresh"
              onClick={fetchData}
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

          {/* Cost Summary */}
          {summary && (
            <div style={{ marginBottom: theme.spacing.lg }}>
              <h3 style={{
                fontSize: 14,
                fontWeight: 600,
                color: asciiColors.foreground,
                marginBottom: theme.spacing.md
              }}>
                Cost Summary ({days} days)
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: theme.spacing.md
              }}>
                <div style={{
                  padding: theme.spacing.md,
                  border: `1px solid ${asciiColors.border}`,
                  borderRadius: 2
                }}>
                  <div style={{ fontSize: 11, color: asciiColors.muted, marginBottom: theme.spacing.xs }}>
                    Total Cost
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 600, color: asciiColors.foreground }}>
                    ${summary.total_cost.toFixed(2)}
                  </div>
                </div>
                <div style={{
                  padding: theme.spacing.md,
                  border: `1px solid ${asciiColors.border}`,
                  borderRadius: 2
                }}>
                  <div style={{ fontSize: 11, color: asciiColors.muted, marginBottom: theme.spacing.xs }}>
                    Compute
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: asciiColors.foreground }}>
                    ${summary.compute_cost.toFixed(2)}
                  </div>
                </div>
                <div style={{
                  padding: theme.spacing.md,
                  border: `1px solid ${asciiColors.border}`,
                  borderRadius: 2
                }}>
                  <div style={{ fontSize: 11, color: asciiColors.muted, marginBottom: theme.spacing.xs }}>
                    Storage
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: asciiColors.foreground }}>
                    ${summary.storage_cost.toFixed(2)}
                  </div>
                </div>
                <div style={{
                  padding: theme.spacing.md,
                  border: `1px solid ${asciiColors.border}`,
                  borderRadius: 2
                }}>
                  <div style={{ fontSize: 11, color: asciiColors.muted, marginBottom: theme.spacing.xs }}>
                    Network
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: asciiColors.foreground }}>
                    ${summary.network_cost.toFixed(2)}
                  </div>
                </div>
                <div style={{
                  padding: theme.spacing.md,
                  border: `1px solid ${asciiColors.border}`,
                  borderRadius: 2
                }}>
                  <div style={{ fontSize: 11, color: asciiColors.muted, marginBottom: theme.spacing.xs }}>
                    Operations
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: asciiColors.foreground }}>
                    {summary.operation_count}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Budgets */}
          <div style={{ marginBottom: theme.spacing.lg }}>
            <h3 style={{
              fontSize: 14,
              fontWeight: 600,
              color: asciiColors.foreground,
              marginBottom: theme.spacing.md
            }}>
              Budgets ({budgets.length})
            </h3>
            {budgets.length === 0 ? (
              <div style={{
                padding: theme.spacing.lg,
                textAlign: 'center',
                color: asciiColors.muted,
                border: `1px solid ${asciiColors.border}`,
                borderRadius: 2
              }}>
                No budgets configured
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gap: theme.spacing.md
              }}>
                {budgets.map((budget) => {
                  const usagePercent = getBudgetUsagePercent(budget);
                  const exceedsThreshold = usagePercent >= budget.alert_threshold;

                  return (
                    <div
                      key={budget.budget_id}
                      style={{
                        padding: theme.spacing.md,
                        border: `1px solid ${exceedsThreshold ? asciiColors.error : asciiColors.border}`,
                        borderRadius: 2,
                        background: exceedsThreshold ? asciiColors.error + '20' : asciiColors.background
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: theme.spacing.sm
                      }}>
                        <div>
                          <span style={{ fontWeight: 600, fontSize: 14 }}>{budget.name}</span>
                          <span style={{ fontSize: 11, color: asciiColors.muted, marginLeft: theme.spacing.sm }}>
                            ({budget.scope} - {budget.period})
                          </span>
                        </div>
                        <span style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: exceedsThreshold ? asciiColors.error : asciiColors.foreground
                        }}>
                          {usagePercent.toFixed(1)}%
                        </span>
                      </div>
                      <div style={{
                        height: 8,
                        background: asciiColors.backgroundSoft,
                        borderRadius: 2,
                        marginBottom: theme.spacing.xs,
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${Math.min(usagePercent, 100)}%`,
                          background: exceedsThreshold ? asciiColors.error : asciiColors.accent,
                          transition: 'width 0.15s ease'
                        }} />
                      </div>
                      <div style={{ fontSize: 11, color: asciiColors.muted }}>
                        ${budget.current_spend.toFixed(2)} / ${budget.amount.toFixed(2)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Budget Modal */}
          {showBudgetModal && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}>
              <div style={{
                background: asciiColors.background,
                border: `1px solid ${asciiColors.border}`,
                borderRadius: 2,
                padding: theme.spacing.lg,
                maxWidth: 500,
                width: '90%'
              }}>
                <h2 style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: asciiColors.foreground,
                  marginBottom: theme.spacing.md
                }}>
                  Create Budget
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
                  <input
                    type="text"
                    placeholder="Budget ID"
                    value={newBudget.budget_id}
                    onChange={(e) => setNewBudget({ ...newBudget, budget_id: e.target.value })}
                    style={{
                      padding: theme.spacing.sm,
                      border: `1px solid ${asciiColors.border}`,
                      background: asciiColors.background,
                      color: asciiColors.foreground,
                      fontFamily: 'Consolas, monospace',
                      fontSize: 12,
                      borderRadius: 2
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Budget Name"
                    value={newBudget.name}
                    onChange={(e) => setNewBudget({ ...newBudget, name: e.target.value })}
                    style={{
                      padding: theme.spacing.sm,
                      border: `1px solid ${asciiColors.border}`,
                      background: asciiColors.background,
                      color: asciiColors.foreground,
                      fontFamily: 'Consolas, monospace',
                      fontSize: 12,
                      borderRadius: 2
                    }}
                  />
                  <select
                    value={newBudget.scope}
                    onChange={(e) => setNewBudget({ ...newBudget, scope: e.target.value })}
                    style={{
                      padding: theme.spacing.sm,
                      border: `1px solid ${asciiColors.border}`,
                      background: asciiColors.background,
                      color: asciiColors.foreground,
                      fontFamily: 'Consolas, monospace',
                      fontSize: 12,
                      borderRadius: 2
                    }}
                  >
                    <option value="global">Global</option>
                    <option value="workflow">Workflow</option>
                    <option value="project">Project</option>
                  </select>
                  <input
                    type="number"
                    placeholder="Amount"
                    value={newBudget.amount || ''}
                    onChange={(e) => setNewBudget({ ...newBudget, amount: parseFloat(e.target.value) || 0 })}
                    style={{
                      padding: theme.spacing.sm,
                      border: `1px solid ${asciiColors.border}`,
                      background: asciiColors.background,
                      color: asciiColors.foreground,
                      fontFamily: 'Consolas, monospace',
                      fontSize: 12,
                      borderRadius: 2
                    }}
                  />
                  <select
                    value={newBudget.period}
                    onChange={(e) => setNewBudget({ ...newBudget, period: e.target.value })}
                    style={{
                      padding: theme.spacing.sm,
                      border: `1px solid ${asciiColors.border}`,
                      background: asciiColors.background,
                      color: asciiColors.foreground,
                      fontFamily: 'Consolas, monospace',
                      fontSize: 12,
                      borderRadius: 2
                    }}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                  <div style={{ display: 'flex', gap: theme.spacing.md }}>
                    <AsciiButton
                      label="Create"
                      onClick={handleCreateBudget}
                    />
                    <AsciiButton
                      label="Cancel"
                      onClick={() => setShowBudgetModal(false)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </AsciiPanel>
    </div>
  );
};

export default CostTracking;
