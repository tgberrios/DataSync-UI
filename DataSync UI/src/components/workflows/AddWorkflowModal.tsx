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
    metadata: workflow?.metadata || {},
  });

  const [tasks, setTasks] = useState<WorkflowTask[]>(workflow?.tasks || []);
  const [dependencies, setDependencies] = useState<WorkflowDependency[]>(workflow?.dependencies || []);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'dag'>('basic');
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
    <AsciiPanel
      title={workflow ? `EDIT WORKFLOW: ${workflow.workflow_name}` : 'ADD WORKFLOW'}
      onClose={onClose}
      style={{ width: '90vw', maxWidth: '1400px', maxHeight: '90vh', overflow: 'auto' }}
    >
      <div style={{ padding: 16, fontFamily: 'Consolas', fontSize: 12 }}>
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

        <div style={{ display: 'flex', gap: 8, marginBottom: 16, borderBottom: `1px solid ${asciiColors.border}`, paddingBottom: 8 }}>
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
    </AsciiPanel>
  );
};

export default AddWorkflowModal;
