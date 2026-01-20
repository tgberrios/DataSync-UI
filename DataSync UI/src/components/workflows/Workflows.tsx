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
            label={viewMode === 'list' ? '📊 Monitor' : '📋 List'}
            onClick={() => setViewMode(viewMode === 'list' ? 'monitor' : 'list')}
            variant="ghost"
          />
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: 20 }}>
          <AsciiPanel title="ERROR">
            <div style={{
              padding: "12px",
              color: asciiColors.danger,
              fontSize: 12,
              fontFamily: "Consolas"
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
                        color: selectedWorkflow.active ? asciiColors.success : asciiColors.danger
                      }}>
                        {selectedWorkflow.active ? "Active" : "Inactive"}
                      </span>
                      {" / "}
                      <span style={{
                        color: selectedWorkflow.enabled ? asciiColors.success : asciiColors.danger
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
                            ? asciiColors.success
                            : selectedWorkflow.last_execution_status === "FAILED"
                            ? asciiColors.danger
                            : asciiColors.warning
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
                    <div style={{ marginTop: 24, display: "flex", gap: 8 }}>
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
    </div>
  );
};

export default Workflows;
