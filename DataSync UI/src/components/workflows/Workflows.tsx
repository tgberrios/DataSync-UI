import { useState, useEffect, useCallback, useRef } from 'react';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { usePagination } from '../../hooks/usePagination';
import { useTableFilters } from '../../hooks/useTableFilters';
import { workflowApi, type WorkflowEntry } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import { sanitizeSearch } from '../../utils/validation';
import SkeletonLoader from '../shared/SkeletonLoader';
import WorkflowTreeView from './WorkflowTreeView';
import AddWorkflowModal from './AddWorkflowModal';
import WorkflowMonitor from './WorkflowMonitor';
import BackfillModal from './BackfillModal';
import VersionHistoryModal from './VersionHistoryModal';
import TaskQueuePanel from './TaskQueuePanel';

const Workflows = () => {
  const { setPage } = usePagination(1, 20);
  const { filters, setFilter } = useTableFilters({
    active: '',
    enabled: ''
  });

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [allWorkflows, setAllWorkflows] = useState<WorkflowEntry[]>([]);
  const [loadingTree, setLoadingTree] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<WorkflowEntry | null>(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowEntry | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'monitor'>('list');
  const [isBackfillModalOpen, setIsBackfillModalOpen] = useState(false);
  const [isVersionHistoryModalOpen, setIsVersionHistoryModalOpen] = useState(false);
  const [isTaskQueuePanelOpen, setIsTaskQueuePanelOpen] = useState(false);
  const [showWorkflowPlaybook, setShowWorkflowPlaybook] = useState(false);
  const isMountedRef = useRef(true);

  const fetchAllWorkflows = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    const startTime = Date.now();
    const minLoadingTime = 300;
    
    try {
      setLoadingTree(true);
      setError(null);
      const sanitizedSearch = sanitizeSearch(search, 100);
      const params: any = {
        page: 1,
        limit: 10000,
        search: sanitizedSearch
      };

      if (filters.active) params.active = filters.active;
      if (filters.enabled) params.enabled = filters.enabled;

      const response = await workflowApi.getWorkflows(params);
      
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minLoadingTime - elapsed);
      await new Promise(resolve => setTimeout(resolve, remaining));
      
      if (isMountedRef.current) {
        setAllWorkflows(response.data || []);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(extractApiError(err));
      }
    } finally {
      if (isMountedRef.current) {
        setLoadingTree(false);
      }
    }
  }, [search, filters]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchAllWorkflows();
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchAllWorkflows]);

  const handleSearch = useCallback(() => {
    setSearch(searchInput);
    setPage(1);
  }, [searchInput, setPage]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }, [handleSearch]);

  const handleDelete = useCallback(async (workflowName: string) => {
    if (!confirm(`Are you sure you want to delete workflow "${workflowName}"?`)) {
      return;
    }
    try {
      await workflowApi.deleteWorkflow(workflowName);
      fetchAllWorkflows();
    } catch (err) {
      if (isMountedRef.current) {
        setError(extractApiError(err));
      }
    }
  }, [fetchAllWorkflows]);

  const handleOpenModal = useCallback((workflow?: WorkflowEntry) => {
    if (workflow) {
      setEditingWorkflow(workflow);
    } else {
      setEditingWorkflow(null);
    }
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingWorkflow(null);
  }, []);

  const handleSave = useCallback(() => {
    fetchAllWorkflows();
    handleCloseModal();
  }, [fetchAllWorkflows, handleCloseModal]);

  const handleToggleActive = useCallback(async (workflowName: string) => {
    try {
      await workflowApi.toggleActive(workflowName);
      fetchAllWorkflows();
    } catch (err) {
      if (isMountedRef.current) {
        setError(extractApiError(err));
      }
    }
  }, [fetchAllWorkflows]);

  const handleToggleEnabled = useCallback(async (workflowName: string) => {
    try {
      await workflowApi.toggleEnabled(workflowName);
      fetchAllWorkflows();
    } catch (err) {
      if (isMountedRef.current) {
        setError(extractApiError(err));
      }
    }
  }, [fetchAllWorkflows]);

  const handleExecute = useCallback(async (workflowName: string) => {
    try {
      setError(null);
      await workflowApi.executeWorkflow(workflowName);
      fetchAllWorkflows();
      setTimeout(() => {
        fetchAllWorkflows();
      }, 2000);
    } catch (err) {
      if (isMountedRef.current) {
        setError(extractApiError(err));
      }
    }
  }, [fetchAllWorkflows]);

  const handleWorkflowClick = useCallback(async (workflow: WorkflowEntry) => {
    setSelectedWorkflow(workflow);
    setError(null);
  }, []);

  const filteredWorkflows = allWorkflows.filter(workflow => {
    if (filters.active && String(workflow.active) !== filters.active) return false;
    if (filters.enabled && String(workflow.enabled) !== filters.enabled) return false;
    return true;
  });

  if (loadingTree && allWorkflows.length === 0) {
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
        <h1 style={{
          fontSize: 14,
          fontWeight: 600,
          margin: 0,
          color: asciiColors.foreground,
          textTransform: "uppercase",
          fontFamily: "Consolas"
        }}>
          <span style={{ color: asciiColors.accent, marginRight: 8 }}>{ascii.blockFull}</span>
          WORKFLOW ORCHESTRATION (DAGs)
        </h1>
        <div style={{ display: "flex", gap: 8 }}>
          <AsciiButton
            label="Workflow Playbook"
            onClick={() => setShowWorkflowPlaybook(true)}
            variant="ghost"
          />
          <AsciiButton
            label={viewMode === 'list' ? 'Monitor' : 'List'}
            onClick={() => setViewMode(viewMode === 'list' ? 'monitor' : 'list')}
            variant="ghost"
          />
          <AsciiButton
            label="Task Queue"
            onClick={() => setIsTaskQueuePanelOpen(true)}
            variant="ghost"
          />
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: 20 }}>
          <AsciiPanel title="ERROR">
            <div style={{
              padding: "12px",
              color: asciiColors.foreground,
              fontSize: 12,
              fontFamily: "Consolas",
              border: `2px solid ${asciiColors.foreground}`
            }}>
              {error}
            </div>
          </AsciiPanel>
        </div>
      )}

      {viewMode === 'list' ? (
        <>
          <AsciiPanel title="SEARCH">
            <div style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              padding: "8px 0"
            }}>
              <input
                type="text"
                placeholder="Search by workflow name or description..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyPress={handleKeyPress}
                style={{
                  flex: 1,
                  padding: "6px 10px",
                  border: `1px solid ${asciiColors.border}`,
                  borderRadius: 2,
                  fontSize: 12,
                  fontFamily: "Consolas",
                  backgroundColor: asciiColors.background,
                  color: asciiColors.foreground,
                  outline: "none"
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = asciiColors.accent;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = asciiColors.border;
                }}
              />
              <AsciiButton
                label="Search"
                onClick={handleSearch}
                variant="primary"
              />
              {search && (
                <AsciiButton
                  label="Clear"
                  onClick={() => {
                    setSearchInput('');
                    setSearch('');
                    setPage(1);
                  }}
                  variant="ghost"
                />
              )}
            </div>
          </AsciiPanel>

          <div style={{ marginTop: 20 }}>
            <AsciiPanel title="FILTERS">
              <div style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 12,
                padding: "8px 0"
              }}>
                <AsciiButton
                  label="Add Workflow"
                  onClick={() => handleOpenModal()}
                  variant="primary"
                />

                <select
                  value={filters.active}
                  onChange={(e) => setFilter('active', e.target.value)}
                  style={{
                    padding: "6px 10px",
                    border: `1px solid ${asciiColors.border}`,
                    borderRadius: 2,
                    fontSize: 12,
                    fontFamily: "Consolas",
                    backgroundColor: asciiColors.background,
                    color: asciiColors.foreground,
                    cursor: "pointer",
                    outline: "none"
                  }}
                >
                  <option value="">All Status</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>

                <select
                  value={filters.enabled}
                  onChange={(e) => setFilter('enabled', e.target.value)}
                  style={{
                    padding: "6px 10px",
                    border: `1px solid ${asciiColors.border}`,
                    borderRadius: 2,
                    fontSize: 12,
                    fontFamily: "Consolas",
                    backgroundColor: asciiColors.background,
                    color: asciiColors.foreground,
                    cursor: "pointer",
                    outline: "none"
                  }}
                >
                  <option value="">All Enabled</option>
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
                </select>
              </div>
            </AsciiPanel>
          </div>

          <div style={{ marginTop: 20, display: "flex", gap: 20 }}>
            <div style={{ flex: "0 0 300px" }}>
              <AsciiPanel title="WORKFLOWS" style={{ minHeight: "400px" }}>
                {loadingTree ? (
                  <div style={{ padding: 20, textAlign: "center", color: asciiColors.muted }}>
                    Loading...
                  </div>
                ) : (
                  <WorkflowTreeView
                    workflows={filteredWorkflows}
                    onWorkflowClick={handleWorkflowClick}
                    onDelete={handleDelete}
                    onEdit={handleOpenModal}
                    onToggleActive={handleToggleActive}
                    onToggleEnabled={handleToggleEnabled}
                    onExecute={handleExecute}
                    selectedWorkflow={selectedWorkflow}
                  />
                )}
              </AsciiPanel>
            </div>

            {selectedWorkflow && (
              <div style={{ flex: 1 }}>
                <AsciiPanel title={`WORKFLOW: ${selectedWorkflow.workflow_name}`}>
                  <div style={{ padding: 16, fontFamily: "Consolas", fontSize: 12, lineHeight: 1.6 }}>
                    <div style={{ marginBottom: 12 }}>
                      <strong style={{ color: asciiColors.accent }}>Description:</strong>{" "}
                      <span style={{ color: asciiColors.foreground }}>
                        {selectedWorkflow.description || "No description"}
                      </span>
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <strong style={{ color: asciiColors.accent }}>Schedule:</strong>{" "}
                      <span style={{ color: asciiColors.foreground }}>
                        {selectedWorkflow.schedule_cron || "Manual"}
                      </span>
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <strong style={{ color: asciiColors.accent }}>Status:</strong>{" "}
                      <span style={{
                        color: selectedWorkflow.active ? asciiColors.accent : asciiColors.foreground
                      }}>
                        {selectedWorkflow.active ? "Active" : "Inactive"}
                      </span>
                      {" / "}
                      <span style={{
                        color: selectedWorkflow.enabled ? asciiColors.accent : asciiColors.foreground
                      }}>
                        {selectedWorkflow.enabled ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                    {selectedWorkflow.last_execution_time && (
                      <div style={{ marginBottom: 12 }}>
                        <strong style={{ color: asciiColors.accent }}>Last Execution:</strong>{" "}
                        <span style={{ color: asciiColors.foreground }}>
                          {new Date(selectedWorkflow.last_execution_time).toLocaleString()}
                        </span>
                        {" - "}
                        <span style={{
                          color: selectedWorkflow.last_execution_status === "SUCCESS"
                            ? asciiColors.accent
                            : selectedWorkflow.last_execution_status === "FAILED"
                            ? asciiColors.foreground
                            : asciiColors.muted
                        }}>
                          {selectedWorkflow.last_execution_status || "Unknown"}
                        </span>
                      </div>
                    )}
                    <div style={{ marginTop: 20 }}>
                      <strong style={{ color: asciiColors.accent }}>Tasks:</strong>{" "}
                      <span style={{ color: asciiColors.foreground }}>
                        {selectedWorkflow.tasks?.length || 0}
                      </span>
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <strong style={{ color: asciiColors.accent }}>Dependencies:</strong>{" "}
                      <span style={{ color: asciiColors.foreground }}>
                        {selectedWorkflow.dependencies?.length || 0}
                      </span>
                    </div>
                    <div style={{ marginTop: 24, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <AsciiButton
                        label="Edit"
                        onClick={() => handleOpenModal(selectedWorkflow)}
                        variant="primary"
                      />
                      <AsciiButton
                        label="Execute"
                        onClick={() => handleExecute(selectedWorkflow.workflow_name)}
                        variant="primary"
                      />
                      <AsciiButton
                        label="Backfill"
                        onClick={() => setIsBackfillModalOpen(true)}
                        variant="primary"
                      />
                      <AsciiButton
                        label="Version History"
                        onClick={() => setIsVersionHistoryModalOpen(true)}
                        variant="ghost"
                      />
                      <AsciiButton
                        label={selectedWorkflow.active ? "Deactivate" : "Activate"}
                        onClick={() => handleToggleActive(selectedWorkflow.workflow_name)}
                        variant="ghost"
                      />
                      <AsciiButton
                        label={selectedWorkflow.enabled ? "Disable" : "Enable"}
                        onClick={() => handleToggleEnabled(selectedWorkflow.workflow_name)}
                        variant="ghost"
                      />
                    </div>
                  </div>
                </AsciiPanel>
              </div>
            )}
          </div>
        </>
      ) : (
        <WorkflowMonitor workflows={allWorkflows} />
      )}

      {isModalOpen && (
        <AddWorkflowModal
          workflow={editingWorkflow}
          onClose={handleCloseModal}
          onSave={handleSave}
        />
      )}

      {isBackfillModalOpen && selectedWorkflow && (
        <BackfillModal
          workflowName={selectedWorkflow.workflow_name}
          onClose={() => setIsBackfillModalOpen(false)}
          onSuccess={fetchAllWorkflows}
        />
      )}

      {isVersionHistoryModalOpen && selectedWorkflow && (
        <VersionHistoryModal
          workflowName={selectedWorkflow.workflow_name}
          onClose={() => setIsVersionHistoryModalOpen(false)}
          onVersionRestored={fetchAllWorkflows}
        />
      )}

      {isTaskQueuePanelOpen && (
        <TaskQueuePanel
          onClose={() => setIsTaskQueuePanelOpen(false)}
        />
      )}

      {showWorkflowPlaybook && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}
        onClick={() => setShowWorkflowPlaybook(false)}
        >
          <div style={{
            width: '90%',
            maxWidth: 1000,
            maxHeight: '90vh',
            overflowY: 'auto'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <AsciiPanel title="WORKFLOW ORCHESTRATION PLAYBOOK">
              <div style={{ padding: 16, fontFamily: 'Consolas', fontSize: 12, lineHeight: 1.6 }}>
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                    {ascii.blockFull} OVERVIEW
                  </div>
                  <div style={{ color: asciiColors.foreground, marginLeft: 16 }}>
                    Workflows are Directed Acyclic Graphs (DAGs) that orchestrate and automate complex data pipelines. 
                    They enable you to chain together multiple tasks (Custom Jobs, Data Warehouses, Data Vaults, Syncs, API Calls, Scripts) 
                    with dependencies, retry policies, SLA monitoring, and rollback capabilities. Workflows can be triggered manually, 
                    scheduled via cron, or invoked via API/events.
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                    {ascii.blockFull} KEY CONCEPTS
                  </div>
                  <div style={{ color: asciiColors.foreground, marginLeft: 16 }}>
                    <div style={{ marginBottom: 12, padding: '12px', backgroundColor: asciiColors.backgroundSoft, borderRadius: 2, border: `1px solid ${asciiColors.border}` }}>
                      <div style={{ fontWeight: 600, color: asciiColors.accent, marginBottom: 6, fontSize: 11 }}>TASKS</div>
                      <div style={{ fontSize: 11, lineHeight: 1.5 }}>
                        • <strong>Task Types:</strong> CUSTOM_JOB, DATA_WAREHOUSE, DATA_VAULT, SYNC, API_CALL, SCRIPT, SUB_WORKFLOW<br/>
                        • <strong>Task Reference:</strong> Name of the job/warehouse/vault/etc. to execute<br/>
                        • <strong>Task Config:</strong> JSON configuration specific to task type<br/>
                        • <strong>Priority:</strong> Higher priority tasks execute first when multiple are ready
                      </div>
                    </div>
                    <div style={{ marginBottom: 12, padding: '12px', backgroundColor: asciiColors.backgroundSoft, borderRadius: 2, border: `1px solid ${asciiColors.border}` }}>
                      <div style={{ fontWeight: 600, color: asciiColors.accent, marginBottom: 6, fontSize: 11 }}>DEPENDENCIES</div>
                      <div style={{ fontSize: 11, lineHeight: 1.5 }}>
                        • <strong>Upstream Task:</strong> Task that must complete before downstream task runs<br/>
                        • <strong>Downstream Task:</strong> Task that waits for upstream task(s)<br/>
                        • <strong>Dependency Types:</strong> SUCCESS (must succeed), COMPLETION (any status), SKIP_ON_FAILURE (skip if upstream fails)<br/>
                        • <strong>Conditional Execution:</strong> Tasks can have IF/ELSE conditions based on upstream task outputs
                      </div>
                    </div>
                    <div style={{ marginBottom: 12, padding: '12px', backgroundColor: asciiColors.backgroundSoft, borderRadius: 2, border: `1px solid ${asciiColors.border}` }}>
                      <div style={{ fontWeight: 600, color: asciiColors.accent, marginBottom: 6, fontSize: 11 }}>RETRY & SLA</div>
                      <div style={{ fontSize: 11, lineHeight: 1.5 }}>
                        • <strong>Retry Policy:</strong> max_retries, retry_delay_seconds, retry_backoff_multiplier<br/>
                        • <strong>SLA Config:</strong> max_execution_time_seconds, alert_on_sla_breach<br/>
                        • <strong>Rollback:</strong> Automatic rollback on failure/timeout (configurable depth)
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                    {ascii.blockFull} EXECUTION PROCESS
                  </div>
                  <div style={{ color: asciiColors.foreground, marginLeft: 16 }}>
                    <div style={{ marginBottom: 16, padding: '12px', backgroundColor: asciiColors.backgroundSoft, borderRadius: 2, border: `1px solid ${asciiColors.border}` }}>
                      <div style={{ fontWeight: 600, color: asciiColors.muted, marginBottom: 8, fontSize: 11 }}>1. WORKFLOW TRIGGER</div>
                      <div style={{ fontSize: 11, lineHeight: 1.6, marginLeft: 8 }}>
                        <div style={{ marginBottom: 4 }}><span style={{ color: asciiColors.muted }}>└─</span> <strong>Scheduled:</strong> Cron expression triggers workflow at specified times</div>
                        <div style={{ marginBottom: 4 }}><span style={{ color: asciiColors.muted }}>└─</span> <strong>Manual:</strong> User clicks "Execute" button</div>
                        <div style={{ marginBottom: 4 }}><span style={{ color: asciiColors.muted }}>└─</span> <strong>API:</strong> External system calls workflow execution endpoint</div>
                        <div><span style={{ color: asciiColors.muted }}>└─</span> <strong>Event:</strong> Workflow triggered by data/event conditions</div>
                      </div>
                    </div>

                    <div style={{ marginBottom: 16, padding: '12px', backgroundColor: asciiColors.backgroundSoft, borderRadius: 2, border: `1px solid ${asciiColors.border}` }}>
                      <div style={{ fontWeight: 600, color: asciiColors.accent, marginBottom: 8, fontSize: 11 }}>2. DEPENDENCY RESOLUTION</div>
                      <div style={{ fontSize: 11, lineHeight: 1.6, marginLeft: 8 }}>
                        <div style={{ marginBottom: 4 }}><span style={{ color: asciiColors.muted }}>└─</span> Build dependency graph from workflow dependencies</div>
                        <div style={{ marginBottom: 4 }}><span style={{ color: asciiColors.muted }}>└─</span> Identify ready tasks (all upstream dependencies met)</div>
                        <div style={{ marginBottom: 4 }}><span style={{ color: asciiColors.muted }}>└─</span> Sort ready tasks by priority (higher priority first)</div>
                        <div><span style={{ color: asciiColors.muted }}>└─</span> Evaluate conditional expressions (IF/ELSE) based on upstream outputs</div>
                      </div>
                    </div>

                    <div style={{ marginBottom: 16, padding: '12px', backgroundColor: asciiColors.backgroundSoft, borderRadius: 2, border: `1px solid ${asciiColors.border}` }}>
                      <div style={{ fontWeight: 600, color: asciiColors.accent, marginBottom: 8, fontSize: 11 }}>3. TASK EXECUTION</div>
                      <div style={{ fontSize: 11, lineHeight: 1.6, marginLeft: 8 }}>
                        <div style={{ marginBottom: 4 }}><span style={{ color: asciiColors.muted }}>└─</span> Execute ready tasks in parallel (when possible)</div>
                        <div style={{ marginBottom: 4 }}><span style={{ color: asciiColors.muted }}>└─</span> Monitor task execution status (PENDING → RUNNING → SUCCESS/FAILED)</div>
                        <div style={{ marginBottom: 4 }}><span style={{ color: asciiColors.muted }}>└─</span> On failure: Retry based on retry_policy (exponential backoff)</div>
                        <div style={{ marginBottom: 4 }}><span style={{ color: asciiColors.muted }}>└─</span> Check SLA: Alert if execution exceeds max_execution_time_seconds</div>
                        <div><span style={{ color: asciiColors.muted }}>└─</span> Store task outputs for downstream task condition evaluation</div>
                      </div>
                    </div>

                    <div style={{ marginBottom: 16, padding: '12px', backgroundColor: asciiColors.backgroundSoft, borderRadius: 2, border: `1px solid ${asciiColors.border}` }}>
                      <div style={{ fontWeight: 600, color: asciiColors.accent, marginBottom: 8, fontSize: 11 }}>4. WORKFLOW COMPLETION</div>
                      <div style={{ fontSize: 11, lineHeight: 1.6, marginLeft: 8 }}>
                        <div style={{ marginBottom: 4 }}><span style={{ color: asciiColors.muted }}>└─</span> Continue until all tasks complete or workflow fails</div>
                        <div style={{ marginBottom: 4 }}><span style={{ color: asciiColors.muted }}>└─</span> On critical failure: Trigger rollback (if enabled)</div>
                        <div style={{ marginBottom: 4 }}><span style={{ color: asciiColors.muted }}>└─</span> Update workflow execution status and metrics</div>
                        <div><span style={{ color: asciiColors.muted }}>└─</span> Store execution history for monitoring and debugging</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                    {ascii.blockFull} KEY FEATURES
                  </div>
                  <div style={{ color: asciiColors.foreground, marginLeft: 16 }}>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.accent }}>{ascii.blockFull}</span> <strong>DAG Execution:</strong> Automatic dependency resolution and parallel execution
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.accent }}>{ascii.blockFull}</span> <strong>Retry Logic:</strong> Configurable retry policies with exponential backoff
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.accent }}>{ascii.blockFull}</span> <strong>SLA Monitoring:</strong> Track execution time and alert on breaches
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.accent }}>{ascii.blockFull}</span> <strong>Rollback:</strong> Automatic rollback on failure with configurable depth
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.accent }}>{ascii.blockFull}</span> <strong>Conditional Logic:</strong> IF/ELSE conditions based on task outputs
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.accent }}>{ascii.blockFull}</span> <strong>Version History:</strong> Track workflow changes and restore previous versions
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.accent }}>{ascii.blockFull}</span> <strong>Backfill:</strong> Re-run workflows for historical date ranges
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
                  <div style={{ fontSize: 11, color: asciiColors.foreground, lineHeight: 1.6 }}>
                    • Design workflows with clear dependencies and minimal complexity<br/>
                    • Use appropriate retry policies for transient failures (network, temporary locks)<br/>
                    • Set realistic SLA timeouts based on expected execution duration<br/>
                    • Enable rollback for critical workflows that modify production data<br/>
                    • Use conditional logic to handle different execution paths based on data conditions<br/>
                    • Monitor workflow execution history to identify bottlenecks and failures<br/>
                    • Use SUB_WORKFLOW tasks to modularize complex workflows<br/>
                    • Schedule workflows during off-peak hours for resource-intensive operations<br/>
                    • Test workflows in development before deploying to production
                  </div>
                </div>

                <div style={{ marginTop: 16, textAlign: 'right' }}>
                  <AsciiButton
                    label="Close"
                    onClick={() => setShowWorkflowPlaybook(false)}
                    variant="ghost"
                  />
                </div>
              </div>
            </AsciiPanel>
          </div>
        </div>
      )}
    </div>
  );
};

export default Workflows;
