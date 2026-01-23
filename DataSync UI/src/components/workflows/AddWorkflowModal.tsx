import React, { useState, useCallback, useEffect } from 'react';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { workflowApi, type WorkflowEntry, type WorkflowTask, type WorkflowDependency } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import WorkflowDAGBuilder from './WorkflowDAGBuilder';
import { customJobsApi, dataWarehouseApi, dataVaultApi } from '../../services/api';

interface AddWorkflowModalProps {
  onClose: () => void;
  onSave: () => void;
  workflow?: WorkflowEntry | null;
}

const AddWorkflowModal: React.FC<AddWorkflowModalProps> = ({ onClose, onSave, workflow }) => {
  const [formData, setFormData] = useState({
    workflow_name: workflow?.workflow_name || '',
    description: workflow?.description || '',
    schedule_cron: workflow?.schedule_cron || '',
    active: workflow?.active !== undefined ? workflow.active : true,
    enabled: workflow?.enabled !== undefined ? workflow.enabled : true,
    retry_policy: workflow?.retry_policy || {
      max_retries: 3,
      retry_delay_seconds: 60,
      retry_backoff_multiplier: 2,
    },
    sla_config: workflow?.sla_config || {
      max_execution_time_seconds: 3600,
      alert_on_sla_breach: true,
    },
    rollback_config: workflow?.rollback_config || {
      enabled: false,
      on_failure: true,
      on_timeout: false,
      max_rollback_depth: 10,
    },
    metadata: workflow?.metadata || {},
  });

  const [tasks, setTasks] = useState<WorkflowTask[]>(workflow?.tasks || []);
  const [dependencies, setDependencies] = useState<WorkflowDependency[]>(workflow?.dependencies || []);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'dag' | 'events' | 'data-driven'>('basic');
  const [eventTrigger, setEventTrigger] = useState({
    event_type: 'FILE_ARRIVAL' as 'FILE_ARRIVAL' | 'API_CALL' | 'DATABASE_CHANGE' | 'SCHEDULE' | 'MANUAL',
    event_config: '{}',
    active: true,
  });
  const [dataDrivenSchedule, setDataDrivenSchedule] = useState({
    query: '',
    connection_string: '',
    condition_field: '',
    condition_value: '',
    check_interval_seconds: 30,
    active: false,
  });
  const [availableCustomJobs, setAvailableCustomJobs] = useState<Array<{ job_name: string }>>([]);
  const [availableWarehouses, setAvailableWarehouses] = useState<Array<{ warehouse_name: string }>>([]);
  const [availableVaults, setAvailableVaults] = useState<Array<{ vault_name: string }>>([]);
  const [availableWorkflows, setAvailableWorkflows] = useState<Array<{ workflow_name: string }>>([]);

  useEffect(() => {
    const loadReferences = async () => {
      try {
        const [jobsRes, warehousesRes, vaultsRes, workflowsRes] = await Promise.all([
          customJobsApi.getJobs({ page: 1, limit: 1000 }),
          dataWarehouseApi.getWarehouses({ page: 1, limit: 1000 }),
          dataVaultApi.getVaults({ page: 1, limit: 1000 }),
          workflowApi.getWorkflows({ page: 1, limit: 1000 }),
        ]);
        setAvailableCustomJobs(jobsRes.data || []);
        setAvailableWarehouses(warehousesRes.data || []);
        setAvailableVaults(vaultsRes.data || []);
        setAvailableWorkflows(workflowsRes.data?.filter((w: any) => w.workflow_name !== workflow?.workflow_name) || []);
      } catch (err) {
        console.error('Error loading references:', err);
      }
    };
    loadReferences();
  }, [workflow]);

  const handleSave = useCallback(async () => {
    if (!formData.workflow_name.trim()) {
      setError('Workflow name is required');
      return;
    }

    if (tasks.length === 0) {
      setError('At least one task is required');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const workflowData = {
        ...formData,
        tasks,
        dependencies,
      };

      if (workflow) {
        await workflowApi.updateWorkflow(workflow.workflow_name, workflowData);
      } else {
        await workflowApi.createWorkflow(workflowData);
      }

      onSave();
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setIsSaving(false);
    }
  }, [formData, tasks, dependencies, workflow, onSave]);

  const handleDAGUpdate = useCallback((updatedTasks: WorkflowTask[], updatedDependencies: WorkflowDependency[]) => {
    setTasks(updatedTasks);
    setDependencies(updatedDependencies);
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '2.5vh 2.5vw'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        style={{
          width: '95vw',
          height: '95vh',
          maxWidth: '95vw',
          maxHeight: '95vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: asciiColors.background,
          border: `2px solid ${asciiColors.border}`,
          borderRadius: 4,
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 16px',
            borderBottom: `2px solid ${asciiColors.border}`,
            backgroundColor: asciiColors.backgroundSoft
          }}
        >
          <h2
            style={{
              fontSize: 14,
              fontFamily: 'Consolas',
              color: asciiColors.foreground,
              margin: 0,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: 0.5
            }}
          >
            <span style={{ color: asciiColors.accent }}>{ascii.tl}</span>
            {ascii.h.repeat(2)}
            {workflow ? `EDIT WORKFLOW: ${workflow.workflow_name}` : 'ADD WORKFLOW'}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: asciiColors.foreground,
              fontSize: 18,
              cursor: 'pointer',
              padding: '4px 8px',
              fontFamily: 'Consolas',
              lineHeight: 1
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = asciiColors.danger;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = asciiColors.foreground;
            }}
          >
            ×
          </button>
        </div>
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: 16,
            fontFamily: 'Consolas',
            fontSize: 12
          }}
        >
        {error && (
          <div style={{
            padding: 12,
            marginBottom: 16,
            backgroundColor: asciiColors.danger + '20',
            border: `1px solid ${asciiColors.danger}`,
            color: asciiColors.danger,
            borderRadius: 2,
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginBottom: 16, borderBottom: `1px solid ${asciiColors.border}`, paddingBottom: 8, flexWrap: 'wrap' }}>
          <AsciiButton
            label="Basic Info"
            onClick={() => setActiveTab('basic')}
            variant={activeTab === 'basic' ? 'primary' : 'ghost'}
          />
          <AsciiButton
            label="DAG Builder"
            onClick={() => setActiveTab('dag')}
            variant={activeTab === 'dag' ? 'primary' : 'ghost'}
          />
          <AsciiButton
            label="Event Triggers"
            onClick={() => setActiveTab('events')}
            variant={activeTab === 'events' ? 'primary' : 'ghost'}
          />
          <AsciiButton
            label="Data-Driven"
            onClick={() => setActiveTab('data-driven')}
            variant={activeTab === 'data-driven' ? 'primary' : 'ghost'}
          />
        </div>

        {activeTab === 'basic' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 6, color: asciiColors.foreground, fontWeight: 600 }}>
                Workflow Name *
              </label>
              <input
                type="text"
                value={formData.workflow_name}
                onChange={(e) => setFormData({ ...formData, workflow_name: e.target.value })}
                disabled={!!workflow}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: `1px solid ${asciiColors.border}`,
                  borderRadius: 2,
                  fontSize: 12,
                  fontFamily: 'Consolas',
                  backgroundColor: workflow ? asciiColors.backgroundSoft : asciiColors.background,
                  color: asciiColors.foreground,
                  outline: 'none',
                }}
                placeholder="my_workflow"
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 6, color: asciiColors.foreground, fontWeight: 600 }}>
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: `1px solid ${asciiColors.border}`,
                  borderRadius: 2,
                  fontSize: 12,
                  fontFamily: 'Consolas',
                  backgroundColor: asciiColors.background,
                  color: asciiColors.foreground,
                  outline: 'none',
                  resize: 'vertical',
                }}
                placeholder="Workflow description..."
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 6, color: asciiColors.foreground, fontWeight: 600 }}>
                Schedule (Cron)
              </label>
              <input
                type="text"
                value={formData.schedule_cron}
                onChange={(e) => setFormData({ ...formData, schedule_cron: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: `1px solid ${asciiColors.border}`,
                  borderRadius: 2,
                  fontSize: 12,
                  fontFamily: 'Consolas',
                  backgroundColor: asciiColors.background,
                  color: asciiColors.foreground,
                  outline: 'none',
                }}
                placeholder="0 0 * * * (leave empty for manual execution)"
              />
              <div style={{ fontSize: 10, color: asciiColors.muted, marginTop: 4 }}>
                Format: minute hour day month day-of-week (e.g., "0 0 * * *" for daily at midnight)
              </div>
            </div>

            <div style={{ display: 'flex', gap: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  style={{ cursor: 'pointer' }}
                />
                <span style={{ color: asciiColors.foreground }}>Active</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.enabled}
                  onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                  style={{ cursor: 'pointer' }}
                />
                <span style={{ color: asciiColors.foreground }}>Enabled</span>
              </label>
            </div>

            <div style={{ borderTop: `1px solid ${asciiColors.border}`, paddingTop: 16 }}>
              <h3 style={{ fontSize: 13, marginBottom: 12, color: asciiColors.accent }}>Retry Policy</h3>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 11, color: asciiColors.muted }}>
                    Max Retries
                  </label>
                  <input
                    type="number"
                    value={formData.retry_policy.max_retries}
                    onChange={(e) => setFormData({
                      ...formData,
                      retry_policy: { ...formData.retry_policy, max_retries: parseInt(e.target.value) || 3 }
                    })}
                    min={0}
                    max={10}
                    style={{
                      width: 100,
                      padding: '6px 10px',
                      border: `1px solid ${asciiColors.border}`,
                      borderRadius: 2,
                      fontSize: 12,
                      fontFamily: 'Consolas',
                      backgroundColor: asciiColors.background,
                      color: asciiColors.foreground,
                      outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 11, color: asciiColors.muted }}>
                    Retry Delay (seconds)
                  </label>
                  <input
                    type="number"
                    value={formData.retry_policy.retry_delay_seconds}
                    onChange={(e) => setFormData({
                      ...formData,
                      retry_policy: { ...formData.retry_policy, retry_delay_seconds: parseInt(e.target.value) || 60 }
                    })}
                    min={1}
                    style={{
                      width: 100,
                      padding: '6px 10px',
                      border: `1px solid ${asciiColors.border}`,
                      borderRadius: 2,
                      fontSize: 12,
                      fontFamily: 'Consolas',
                      backgroundColor: asciiColors.background,
                      color: asciiColors.foreground,
                      outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 11, color: asciiColors.muted }}>
                    Backoff Multiplier
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.retry_policy.retry_backoff_multiplier}
                    onChange={(e) => setFormData({
                      ...formData,
                      retry_policy: { ...formData.retry_policy, retry_backoff_multiplier: parseFloat(e.target.value) || 2 }
                    })}
                    min={1}
                    max={10}
                    style={{
                      width: 100,
                      padding: '6px 10px',
                      border: `1px solid ${asciiColors.border}`,
                      borderRadius: 2,
                      fontSize: 12,
                      fontFamily: 'Consolas',
                      backgroundColor: asciiColors.background,
                      color: asciiColors.foreground,
                      outline: 'none',
                    }}
                  />
                </div>
              </div>
            </div>

            <div style={{ borderTop: `1px solid ${asciiColors.border}`, paddingTop: 16 }}>
              <h3 style={{ fontSize: 13, marginBottom: 12, color: asciiColors.accent }}>SLA Configuration</h3>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 11, color: asciiColors.muted }}>
                    Max Execution Time (seconds)
                  </label>
                  <input
                    type="number"
                    value={formData.sla_config.max_execution_time_seconds}
                    onChange={(e) => setFormData({
                      ...formData,
                      sla_config: { ...formData.sla_config, max_execution_time_seconds: parseInt(e.target.value) || 3600 }
                    })}
                    min={1}
                    style={{
                      width: 150,
                      padding: '6px 10px',
                      border: `1px solid ${asciiColors.border}`,
                      borderRadius: 2,
                      fontSize: 12,
                      fontFamily: 'Consolas',
                      backgroundColor: asciiColors.background,
                      color: asciiColors.foreground,
                      outline: 'none',
                    }}
                  />
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 24 }}>
                  <input
                    type="checkbox"
                    checked={formData.sla_config.alert_on_sla_breach}
                    onChange={(e) => setFormData({
                      ...formData,
                      sla_config: { ...formData.sla_config, alert_on_sla_breach: e.target.checked }
                    })}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ color: asciiColors.foreground }}>Alert on SLA Breach</span>
                </label>
              </div>
            </div>

            <div style={{ borderTop: `1px solid ${asciiColors.border}`, paddingTop: 16 }}>
              <h3 style={{ fontSize: 13, marginBottom: 12, color: asciiColors.accent }}>Rollback Configuration</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.rollback_config.enabled}
                    onChange={(e) => setFormData({
                      ...formData,
                      rollback_config: { ...formData.rollback_config, enabled: e.target.checked }
                    })}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ color: asciiColors.foreground }}>Enable Rollback</span>
                </label>
                {formData.rollback_config.enabled && (
                  <>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={formData.rollback_config.on_failure}
                        onChange={(e) => setFormData({
                          ...formData,
                          rollback_config: { ...formData.rollback_config, on_failure: e.target.checked }
                        })}
                        style={{ cursor: 'pointer' }}
                      />
                      <span style={{ color: asciiColors.foreground }}>Rollback on Failure</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={formData.rollback_config.on_timeout}
                        onChange={(e) => setFormData({
                          ...formData,
                          rollback_config: { ...formData.rollback_config, on_timeout: e.target.checked }
                        })}
                        style={{ cursor: 'pointer' }}
                      />
                      <span style={{ color: asciiColors.foreground }}>Rollback on Timeout</span>
                    </label>
                    <div>
                      <label style={{ display: 'block', marginBottom: 6, fontSize: 11, color: asciiColors.muted }}>
                        Max Rollback Depth
                      </label>
                      <input
                        type="number"
                        value={formData.rollback_config.max_rollback_depth}
                        onChange={(e) => setFormData({
                          ...formData,
                          rollback_config: { ...formData.rollback_config, max_rollback_depth: parseInt(e.target.value) || 10 }
                        })}
                        min={1}
                        max={100}
                        style={{
                          width: 100,
                          padding: '6px 10px',
                          border: `1px solid ${asciiColors.border}`,
                          borderRadius: 2,
                          fontSize: 12,
                          fontFamily: 'Consolas',
                          backgroundColor: asciiColors.background,
                          color: asciiColors.foreground,
                          outline: 'none',
                        }}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'dag' && (
          <WorkflowDAGBuilder
            tasks={tasks}
            dependencies={dependencies}
            onUpdate={handleDAGUpdate}
            availableCustomJobs={availableCustomJobs}
            availableWarehouses={availableWarehouses}
            availableVaults={availableVaults}
          />
        )}

        {activeTab === 'events' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 6, color: asciiColors.foreground, fontWeight: 600 }}>
                Event Type
              </label>
              <select
                value={eventTrigger.event_type}
                onChange={(e) => setEventTrigger({ ...eventTrigger, event_type: e.target.value as any })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: `1px solid ${asciiColors.border}`,
                  borderRadius: 2,
                  fontSize: 12,
                  fontFamily: 'Consolas',
                  backgroundColor: asciiColors.background,
                  color: asciiColors.foreground,
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="FILE_ARRIVAL">File Arrival</option>
                <option value="API_CALL">API Call</option>
                <option value="DATABASE_CHANGE">Database Change</option>
                <option value="SCHEDULE">Schedule</option>
                <option value="MANUAL">Manual</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 6, color: asciiColors.foreground, fontWeight: 600 }}>
                Event Config (JSON)
              </label>
              <textarea
                value={eventTrigger.event_config}
                onChange={(e) => setEventTrigger({ ...eventTrigger, event_config: e.target.value })}
                rows={6}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: `1px solid ${asciiColors.border}`,
                  borderRadius: 2,
                  fontSize: 12,
                  fontFamily: 'Consolas',
                  backgroundColor: asciiColors.background,
                  color: asciiColors.foreground,
                  outline: 'none',
                  resize: 'vertical',
                }}
                placeholder='{"file_path": "/path/to/file"}'
              />
              <div style={{ fontSize: 10, color: asciiColors.muted, marginTop: 4 }}>
                JSON configuration for the event trigger
              </div>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={eventTrigger.active}
                onChange={(e) => setEventTrigger({ ...eventTrigger, active: e.target.checked })}
                style={{ cursor: 'pointer' }}
              />
              <span style={{ color: asciiColors.foreground }}>Active</span>
            </label>

            <div style={{ padding: 12, backgroundColor: asciiColors.warning + '20', borderRadius: 2, fontSize: 11, color: asciiColors.warning }}>
              Note: Event triggers need to be registered separately after saving the workflow.
            </div>
          </div>
        )}

        {activeTab === 'data-driven' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 6, color: asciiColors.foreground, fontWeight: 600 }}>
                SQL Query
              </label>
              <textarea
                value={dataDrivenSchedule.query}
                onChange={(e) => setDataDrivenSchedule({ ...dataDrivenSchedule, query: e.target.value })}
                rows={4}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: `1px solid ${asciiColors.border}`,
                  borderRadius: 2,
                  fontSize: 12,
                  fontFamily: 'Consolas',
                  backgroundColor: asciiColors.background,
                  color: asciiColors.foreground,
                  outline: 'none',
                  resize: 'vertical',
                }}
                placeholder="SELECT * FROM table WHERE condition = 'value'"
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 6, color: asciiColors.foreground, fontWeight: 600 }}>
                Connection String
              </label>
              <input
                type="text"
                value={dataDrivenSchedule.connection_string}
                onChange={(e) => setDataDrivenSchedule({ ...dataDrivenSchedule, connection_string: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: `1px solid ${asciiColors.border}`,
                  borderRadius: 2,
                  fontSize: 12,
                  fontFamily: 'Consolas',
                  backgroundColor: asciiColors.background,
                  color: asciiColors.foreground,
                  outline: 'none',
                }}
                placeholder="postgresql://user:pass@host:port/db"
              />
            </div>

            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: 6, color: asciiColors.foreground, fontWeight: 600 }}>
                  Condition Field
                </label>
                <input
                  type="text"
                  value={dataDrivenSchedule.condition_field}
                  onChange={(e) => setDataDrivenSchedule({ ...dataDrivenSchedule, condition_field: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: `1px solid ${asciiColors.border}`,
                    borderRadius: 2,
                    fontSize: 12,
                    fontFamily: 'Consolas',
                    backgroundColor: asciiColors.background,
                    color: asciiColors.foreground,
                    outline: 'none',
                  }}
                  placeholder="status"
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: 6, color: asciiColors.foreground, fontWeight: 600 }}>
                  Condition Value
                </label>
                <input
                  type="text"
                  value={dataDrivenSchedule.condition_value}
                  onChange={(e) => setDataDrivenSchedule({ ...dataDrivenSchedule, condition_value: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: `1px solid ${asciiColors.border}`,
                    borderRadius: 2,
                    fontSize: 12,
                    fontFamily: 'Consolas',
                    backgroundColor: asciiColors.background,
                    color: asciiColors.foreground,
                    outline: 'none',
                  }}
                  placeholder="ready"
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 6, color: asciiColors.foreground, fontWeight: 600 }}>
                Check Interval (seconds)
              </label>
              <input
                type="number"
                value={dataDrivenSchedule.check_interval_seconds}
                onChange={(e) => setDataDrivenSchedule({ ...dataDrivenSchedule, check_interval_seconds: parseInt(e.target.value) || 30 })}
                min={1}
                style={{
                  width: 150,
                  padding: '8px 12px',
                  border: `1px solid ${asciiColors.border}`,
                  borderRadius: 2,
                  fontSize: 12,
                  fontFamily: 'Consolas',
                  backgroundColor: asciiColors.background,
                  color: asciiColors.foreground,
                  outline: 'none',
                }}
              />
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={dataDrivenSchedule.active}
                onChange={(e) => setDataDrivenSchedule({ ...dataDrivenSchedule, active: e.target.checked })}
                style={{ cursor: 'pointer' }}
              />
              <span style={{ color: asciiColors.foreground }}>Active</span>
            </label>

            <div style={{ padding: 12, backgroundColor: asciiColors.warning + '20', borderRadius: 2, fontSize: 11, color: asciiColors.warning }}>
              Note: Data-driven schedules need to be registered separately after saving the workflow.
            </div>
          </div>
        )}

        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: `1px solid ${asciiColors.border}`, paddingTop: 16 }}>
          <AsciiButton
            label="Cancel"
            onClick={onClose}
            variant="ghost"
            disabled={isSaving}
          />
          <AsciiButton
            label={isSaving ? "Saving..." : "Save"}
            onClick={handleSave}
            variant="primary"
            disabled={isSaving}
          />
        </div>
        </div>
      </div>
    </div>
  );
};

export default AddWorkflowModal;
