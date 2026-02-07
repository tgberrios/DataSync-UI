import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  const [showCostPlaybook, setShowCostPlaybook] = useState(false);
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
    const amount = budget?.amount;
    const spend = budget?.current_spend;
    if (amount == null || amount === 0 || spend == null) return 0;
    return (spend / amount) * 100;
  };

  const formatCurrency = (n: number | null | undefined) =>
    n != null && !Number.isNaN(n) ? n.toFixed(2) : '0.00';
  const formatPercent = (n: number | null | undefined) =>
    n != null && !Number.isNaN(n) ? n.toFixed(1) : '0';

  if (loading && !summary) {
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
            COST TRACKING
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
              Track costs by operation and workflow, manage budgets and alerts
            </p>
            <AsciiButton
              label="Playbook & How to use"
              onClick={() => setShowCostPlaybook(true)}
              variant="ghost"
            />
          </div>

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

          {showCostPlaybook && createPortal(
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
              onClick={() => setShowCostPlaybook(false)}
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
                <AsciiPanel title="COST TRACKING - PLAYBOOK & HOW TO USE" animated={false}>
                  <div style={{ padding: 16, fontFamily: 'Consolas', fontSize: 12, lineHeight: 1.6 }}>
                    <div style={{ marginBottom: 24 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                        {ascii.blockFull} OVERVIEW
                      </div>
                      <div style={{ color: asciiColors.foreground, marginLeft: 16 }}>
                        Cost Tracking shows estimated spend for compute, storage, and network over a selected period.
                        You can define budgets (global, per workflow, or per project) and get alerts when spend approaches
                        or exceeds your limits. Use this view to control costs and plan capacity.
                      </div>
                    </div>

                    <div style={{ marginBottom: 24 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                        {ascii.blockFull} HOW TO USE
                      </div>
                      <div style={{ marginLeft: 16 }}>
                        <div style={{ marginBottom: 10 }}>
                          <span style={{ color: asciiColors.accent, fontWeight: 600 }}>1. View cost summary</span>
                          <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
                            Use the period dropdown (7, 30, or 90 days) to see total cost, compute, storage, network, and operation count for that range.
                          </span>
                        </div>
                        <div style={{ marginBottom: 10 }}>
                          <span style={{ color: asciiColors.accent, fontWeight: 600 }}>2. Create budgets</span>
                          <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
                            Click &quot;Create Budget&quot; to set a budget: choose scope (global, workflow, project), amount, period (daily/weekly/monthly), and alert threshold. You get notified when spend reaches the threshold.
                          </span>
                        </div>
                        <div style={{ marginBottom: 10 }}>
                          <span style={{ color: asciiColors.accent, fontWeight: 600 }}>3. Monitor budgets</span>
                          <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
                            Each budget shows current spend vs limit and a usage bar. When usage exceeds the alert threshold, the bar and border highlight so you can act before overspending.
                          </span>
                        </div>
                        <div style={{ marginBottom: 10 }}>
                          <span style={{ color: asciiColors.accent, fontWeight: 600 }}>4. Refresh data</span>
                          <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
                            Use &quot;Refresh&quot; to reload the cost summary and budget list from the backend.
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
                          <span style={{ color: asciiColors.accent, fontWeight: 600 }}>Compute / Storage / Network</span>
                          <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
                            Costs are estimated from resource utilization (CPU, memory, I/O, network). Values depend on the DataSync monitoring pipeline and may be approximations.
                          </span>
                        </div>
                        <div style={{ marginBottom: 8 }}>
                          <span style={{ color: asciiColors.accent, fontWeight: 600 }}>Budget scope</span>
                          <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
                            Global applies to all spend; workflow and project let you cap costs for specific workflows or projects.
                          </span>
                        </div>
                        <div style={{ marginBottom: 8 }}>
                          <span style={{ color: asciiColors.accent, fontWeight: 600 }}>Alert threshold</span>
                          <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
                            Percentage of the budget at which you want to be warned (e.g. 80% = alert when spend reaches 80% of the limit).
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
                        • Set budgets for critical workflows or projects to avoid cost surprises.<br/>
                        • Use 7-day view to spot recent spikes; use 30/90-day for trends and planning.<br/>
                        • Combine with Resource Tracking and Bottleneck Detection to link cost to utilization and optimize before scaling.<br/>
                        • If costs show as zero, ensure the DataSync binary is running with monitoring and that resource metrics are being collected.
                      </div>
                    </div>

                    <div style={{ marginTop: 16, textAlign: 'right' }}>
                      <AsciiButton
                        label="Close"
                        onClick={() => setShowCostPlaybook(false)}
                        variant="ghost"
                      />
                    </div>
                  </div>
                </AsciiPanel>
              </div>
            </div>,
            document.body
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
                    ${formatCurrency(summary.total_cost)}
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
                    ${formatCurrency(summary.compute_cost)}
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
                    ${formatCurrency(summary.storage_cost)}
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
                    ${formatCurrency(summary.network_cost)}
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
                    {summary.operation_count != null ? summary.operation_count : '—'}
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
                          {formatPercent(usagePercent)}%
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
                        ${formatCurrency(budget.current_spend)} / ${formatCurrency(budget.amount)}
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
