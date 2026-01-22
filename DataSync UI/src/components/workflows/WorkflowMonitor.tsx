import React, { useState, useEffect, useCallback } from 'react';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { workflowApi, type WorkflowEntry, type WorkflowExecution, type TaskExecution } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';

interface WorkflowMonitorProps {
  workflows: WorkflowEntry[];
}

const WorkflowMonitor: React.FC<WorkflowMonitorProps> = ({ workflows }) => {
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowEntry | null>(null);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [selectedExecution, setSelectedExecution] = useState<WorkflowExecution | null>(null);
  const [taskExecutions, setTaskExecutions] = useState<TaskExecution[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedWorkflow) {
      loadExecutions(selectedWorkflow.workflow_name);
    }
  }, [selectedWorkflow]);

  useEffect(() => {
    if (selectedExecution) {
      loadTaskExecutions(selectedExecution.workflow_name, selectedExecution.execution_id);
    }
  }, [selectedExecution]);

  const loadExecutions = useCallback(async (workflowName: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await workflowApi.getExecutions(workflowName, 50);
      setExecutions(data);
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTaskExecutions = useCallback(async (workflowName: string, executionId: string) => {
    try {
      const data = await workflowApi.getTaskExecutions(workflowName, executionId);
      setTaskExecutions(data);
    } catch (err) {
      console.error('Error loading task executions:', err);
    }
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUCCESS': return asciiColors.success;
      case 'FAILED': return asciiColors.danger;
      case 'RUNNING': return asciiColors.warning;
      case 'PENDING': return asciiColors.muted;
      default: return asciiColors.foreground;
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <AsciiPanel title="SELECT WORKFLOW">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {workflows.map(workflow => (
            <button
              key={workflow.workflow_name}
              onClick={() => setSelectedWorkflow(workflow)}
              style={{
                padding: '8px 16px',
                border: `2px solid ${selectedWorkflow?.workflow_name === workflow.workflow_name ? asciiColors.accent : asciiColors.border}`,
                borderRadius: 4,
                backgroundColor: selectedWorkflow?.workflow_name === workflow.workflow_name ? asciiColors.accent + '20' : asciiColors.background,
                color: asciiColors.foreground,
                cursor: 'pointer',
                fontFamily: 'Consolas',
                fontSize: 12,
                fontWeight: selectedWorkflow?.workflow_name === workflow.workflow_name ? 600 : 400,
              }}
            >
              {workflow.workflow_name}
            </button>
          ))}
        </div>
      </AsciiPanel>

      {selectedWorkflow && (
        <>
          {error && (
            <AsciiPanel title="ERROR">
              <div style={{ padding: 12, color: asciiColors.danger }}>
                {error}
              </div>
            </AsciiPanel>
          )}

          <AsciiPanel title={`EXECUTIONS: ${selectedWorkflow.workflow_name}`}>
            {loading ? (
              <div style={{ padding: 20, textAlign: 'center', color: asciiColors.muted }}>
                Loading...
              </div>
            ) : executions.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: asciiColors.muted }}>
                No executions found
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {executions.map(execution => (
                  <div
                    key={execution.execution_id}
                    onClick={() => setSelectedExecution(execution)}
                    style={{
                      padding: 12,
                      border: `1px solid ${selectedExecution?.execution_id === execution.execution_id ? asciiColors.accent : asciiColors.border}`,
                      borderRadius: 4,
                      backgroundColor: selectedExecution?.execution_id === execution.execution_id ? asciiColors.accent + '10' : asciiColors.background,
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div>
                        <strong style={{ color: asciiColors.accent }}>{execution.execution_id}</strong>
                        <span style={{ marginLeft: 12, color: getStatusColor(execution.status), fontWeight: 600 }}>
                          {execution.status}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: asciiColors.muted }}>
                        {execution.start_time ? new Date(execution.start_time).toLocaleString() : 'N/A'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 16, fontSize: 11, color: asciiColors.muted }}>
                      <span>Duration: {formatDuration(execution.duration_seconds)}</span>
                      <span>Tasks: {execution.completed_tasks}/{execution.total_tasks}</span>
                      <span>Failed: {execution.failed_tasks}</span>
                      <span>Trigger: {execution.trigger_type}</span>
                      {execution.rollback_status && (
                        <span style={{ color: execution.rollback_status === 'COMPLETED' ? asciiColors.success : execution.rollback_status === 'FAILED' ? asciiColors.danger : asciiColors.warning }}>
                          Rollback: {execution.rollback_status}
                        </span>
                      )}
                    </div>
                    {execution.error_message && (
                      <div style={{ marginTop: 8, padding: 8, backgroundColor: asciiColors.danger + '20', borderRadius: 2, fontSize: 11, color: asciiColors.danger }}>
                        {execution.error_message}
                      </div>
                    )}
                    {execution.rollback_status && execution.rollback_status !== 'PENDING' && (
                      <div style={{ marginTop: 8, padding: 8, backgroundColor: asciiColors.warning + '20', borderRadius: 2, fontSize: 11 }}>
                        <div style={{ color: asciiColors.foreground, marginBottom: 4 }}>
                          <strong>Rollback Status:</strong> {execution.rollback_status}
                        </div>
                        {execution.rollback_started_at && (
                          <div style={{ color: asciiColors.muted, fontSize: 10 }}>
                            Started: {new Date(execution.rollback_started_at).toLocaleString()}
                          </div>
                        )}
                        {execution.rollback_completed_at && (
                          <div style={{ color: asciiColors.muted, fontSize: 10 }}>
                            Completed: {new Date(execution.rollback_completed_at).toLocaleString()}
                          </div>
                        )}
                        {execution.rollback_error_message && (
                          <div style={{ marginTop: 4, color: asciiColors.danger, fontSize: 10 }}>
                            Error: {execution.rollback_error_message}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </AsciiPanel>

          {selectedExecution && (
            <AsciiPanel title={`TASK EXECUTIONS: ${selectedExecution.execution_id}`}>
              {taskExecutions.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: asciiColors.muted }}>
                  No task executions found
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {taskExecutions.map(taskExec => (
                    <div
                      key={taskExec.id}
                      style={{
                        padding: 12,
                        border: `1px solid ${asciiColors.border}`,
                        borderRadius: 4,
                        backgroundColor: asciiColors.background,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div>
                          <strong style={{ color: asciiColors.foreground }}>{taskExec.task_name}</strong>
                          <span style={{ marginLeft: 12, color: getStatusColor(taskExec.status), fontWeight: 600 }}>
                            {taskExec.status}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: asciiColors.muted }}>
                          {taskExec.start_time ? new Date(taskExec.start_time).toLocaleString() : 'N/A'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 16, fontSize: 11, color: asciiColors.muted }}>
                        <span>Duration: {formatDuration(taskExec.duration_seconds)}</span>
                        <span>Retries: {taskExec.retry_count}</span>
                      </div>
                      {taskExec.error_message && (
                        <div style={{ marginTop: 8, padding: 8, backgroundColor: asciiColors.danger + '20', borderRadius: 2, fontSize: 11, color: asciiColors.danger }}>
                          {taskExec.error_message}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </AsciiPanel>
          )}
        </>
      )}
    </div>
  );
};

export default WorkflowMonitor;
