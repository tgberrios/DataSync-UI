import React, { useState, useCallback, useRef, useEffect } from 'react';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { type WorkflowTask, type WorkflowDependency } from '../../services/api';

interface WorkflowDAGBuilderProps {
  tasks: WorkflowTask[];
  dependencies: WorkflowDependency[];
  onUpdate: (tasks: WorkflowTask[], dependencies: WorkflowDependency[]) => void;
  availableCustomJobs: Array<{ job_name: string }>;
  availableWarehouses: Array<{ warehouse_name: string }>;
  availableVaults: Array<{ vault_name: string }>;
}

interface TaskNode {
  id: string;
  task: WorkflowTask;
  x: number;
  y: number;
}

const WorkflowDAGBuilder: React.FC<WorkflowDAGBuilderProps> = ({
  tasks,
  dependencies,
  onUpdate,
  availableCustomJobs,
  availableWarehouses,
  availableVaults,
}) => {
  const [nodes, setNodes] = useState<TaskNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<WorkflowTask | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const taskNodes: TaskNode[] = tasks.map((task, index) => ({
      id: task.task_name,
      task,
      x: task.position_x || (index % 4) * 200 + 100,
      y: task.position_y || Math.floor(index / 4) * 150 + 100,
    }));
    setNodes(taskNodes);
  }, [tasks]);

  const handleAddTask = useCallback(() => {
    const newTask: WorkflowTask = {
      workflow_name: '',
      task_name: `task_${Date.now()}`,
      task_type: 'CUSTOM_JOB',
      task_reference: '',
      description: '',
      task_config: {},
      retry_policy: { max_retries: 3, retry_delay_seconds: 60 },
      position_x: 100,
      position_y: 100,
      metadata: {},
      priority: 0,
      condition_type: 'ALWAYS',
      condition_expression: '',
      parent_condition_task_name: '',
      loop_type: null,
      loop_config: {},
    };
    setEditingTask(newTask);
    setShowTaskModal(true);
  }, []);

  const handleSaveTask = useCallback((task: WorkflowTask) => {
    const updatedTasks = [...tasks];
    const existingIndex = updatedTasks.findIndex(t => t.task_name === task.task_name);
    
    if (existingIndex >= 0) {
      updatedTasks[existingIndex] = task;
    } else {
      updatedTasks.push(task);
    }

    onUpdate(updatedTasks, dependencies);
    setShowTaskModal(false);
    setEditingTask(null);
  }, [tasks, dependencies, onUpdate]);

  const handleDeleteTask = useCallback((taskName: string) => {
    if (!confirm(`Delete task "${taskName}"?`)) return;
    
    const updatedTasks = tasks.filter(t => t.task_name !== taskName);
    const updatedDependencies = dependencies.filter(
      d => d.upstream_task_name !== taskName && d.downstream_task_name !== taskName
    );
    
    onUpdate(updatedTasks, updatedDependencies);
  }, [tasks, dependencies, onUpdate]);

  const handleNodeMouseDown = useCallback((nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedNode(nodeId);
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - node.x,
        y: e.clientY - node.y,
      });
    }
  }, [nodes]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && selectedNode) {
      const node = nodes.find(n => n.id === selectedNode);
      if (node) {
        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;
        
        const updatedNodes = nodes.map(n =>
          n.id === selectedNode ? { ...n, x: newX, y: newY } : n
        );
        setNodes(updatedNodes);

        const updatedTasks = tasks.map(t => {
          if (t.task_name === selectedNode) {
            return { ...t, position_x: newX, position_y: newY };
          }
          return t;
        });
        onUpdate(updatedTasks, dependencies);
      }
    }
  }, [isDragging, selectedNode, dragOffset, nodes, tasks, dependencies, onUpdate]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const getTaskTypeColor = (taskType: string) => {
    switch (taskType) {
      case 'CUSTOM_JOB': return asciiColors.accent;
      case 'DATA_WAREHOUSE': return asciiColors.success;
      case 'DATA_VAULT': return asciiColors.warning;
      default: return asciiColors.foreground;
    }
  };

  const getTaskTypeLabel = (taskType: string) => {
    switch (taskType) {
      case 'CUSTOM_JOB': return 'JOB';
      case 'DATA_WAREHOUSE': return 'DW';
      case 'DATA_VAULT': return 'DV';
      default: return taskType;
    }
  };

  const getConditionLabel = (task: WorkflowTask) => {
    if (task.condition_type === 'IF') return 'IF';
    if (task.condition_type === 'ELSE_IF') return 'ELSE IF';
    if (task.condition_type === 'ELSE') return 'ELSE';
    return '';
  };

  const getPriorityLabel = (task: WorkflowTask) => {
    if (task.priority && task.priority > 0) return `P${task.priority}`;
    return '';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <strong style={{ color: asciiColors.accent }}>Tasks:</strong> {tasks.length} |{' '}
          <strong style={{ color: asciiColors.accent }}>Dependencies:</strong> {dependencies.length}
        </div>
        <AsciiButton
          label="+ Add Task"
          onClick={handleAddTask}
          variant="primary"
        />
      </div>

      <div
        ref={canvasRef}
        style={{
          position: 'relative',
          width: '100%',
          height: '600px',
          border: `2px solid ${asciiColors.border}`,
          borderRadius: 4,
          backgroundColor: asciiColors.background,
          overflow: 'auto',
          cursor: isDragging ? 'grabbing' : 'default',
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {nodes.map((node) => {
          const upstreamDeps = dependencies.filter(d => d.downstream_task_name === node.id);
          const downstreamDeps = dependencies.filter(d => d.upstream_task_name === node.id);
          
          return (
            <div key={node.id}>
              {upstreamDeps.map((dep, idx) => {
                const upstreamNode = nodes.find(n => n.id === dep.upstream_task_name);
                if (!upstreamNode) return null;
                
                const dx = node.x - upstreamNode.x;
                const dy = node.y - upstreamNode.y;
                const length = Math.sqrt(dx * dx + dy * dy);
                const angle = Math.atan2(dy, dx) * 180 / Math.PI;
                
                return (
                  <div
                    key={`${dep.upstream_task_name}-${node.id}-${idx}`}
                    style={{
                      position: 'absolute',
                      left: upstreamNode.x + 60,
                      top: upstreamNode.y + 30,
                      width: length - 120,
                      height: 2,
                      backgroundColor: asciiColors.border,
                      transformOrigin: '0 50%',
                      transform: `rotate(${angle}deg)`,
                      zIndex: 1,
                    }}
                  />
                );
              })}
              
              <div
                style={{
                  position: 'absolute',
                  left: node.x,
                  top: node.y,
                  width: 120,
                  minHeight: 60,
                  padding: 12,
                  backgroundColor: selectedNode === node.id ? asciiColors.accent + '20' : asciiColors.background,
                  border: `2px solid ${selectedNode === node.id ? asciiColors.accent : getTaskTypeColor(node.task.task_type)}`,
                  borderRadius: 4,
                  cursor: 'grab',
                  zIndex: 2,
                  fontFamily: 'Consolas',
                  fontSize: 11,
                }}
                onMouseDown={(e) => handleNodeMouseDown(node.id, e)}
                onDoubleClick={() => {
                  setEditingTask(node.task);
                  setShowTaskModal(true);
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 6,
                }}>
                  <div style={{
                    padding: '2px 6px',
                    backgroundColor: getTaskTypeColor(node.task.task_type),
                    color: asciiColors.background,
                    borderRadius: 2,
                    fontSize: 9,
                    fontWeight: 600,
                  }}>
                    {getTaskTypeLabel(node.task.task_type)}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTask(node.task.task_name);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: asciiColors.danger,
                      cursor: 'pointer',
                      fontSize: 12,
                      padding: 0,
                      width: 16,
                      height: 16,
                    }}
                  >
                    ✕
                  </button>
                </div>
                <div style={{
                  fontWeight: 600,
                  color: asciiColors.foreground,
                  marginBottom: 4,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {node.task.task_name}
                </div>
                <div style={{
                  fontSize: 10,
                  color: asciiColors.muted,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {node.task.task_reference || 'No reference'}
                </div>
                {(getConditionLabel(node.task) || getPriorityLabel(node.task)) && (
                  <div style={{
                    marginTop: 4,
                    fontSize: 8,
                    color: asciiColors.accent,
                    display: 'flex',
                    gap: 4,
                  }}>
                    {getConditionLabel(node.task) && (
                      <span style={{
                        padding: '1px 4px',
                        backgroundColor: asciiColors.accentLight,
                        borderRadius: 2,
                      }}>
                        {getConditionLabel(node.task)}
                      </span>
                    )}
                    {getPriorityLabel(node.task) && (
                      <span style={{
                        padding: '1px 4px',
                        backgroundColor: asciiColors.warning,
                        borderRadius: 2,
                      }}>
                        {getPriorityLabel(node.task)}
                      </span>
                    )}
                  </div>
                )}
                <div style={{
                  marginTop: 6,
                  fontSize: 9,
                  color: asciiColors.muted,
                }}>
                  ↑ {upstreamDeps.length} | ↓ {downstreamDeps.length}
                </div>
              </div>
            </div>
          );
        })}

        {nodes.length === 0 && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            color: asciiColors.muted,
          }}>
            <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.4 }}>
              {ascii.blockFull}
            </div>
            <div>No tasks yet. Click "Add Task" to get started.</div>
          </div>
        )}
      </div>

      {showTaskModal && editingTask && (
        <TaskModal
          task={editingTask}
          onSave={handleSaveTask}
          onClose={() => {
            setShowTaskModal(false);
            setEditingTask(null);
          }}
          availableCustomJobs={availableCustomJobs}
          availableWarehouses={availableWarehouses}
          availableVaults={availableVaults}
        />
      )}
    </div>
  );
};

interface TaskModalProps {
  task: WorkflowTask;
  onSave: (task: WorkflowTask) => void;
  onClose: () => void;
  availableCustomJobs: Array<{ job_name: string }>;
  availableWarehouses: Array<{ warehouse_name: string }>;
  availableVaults: Array<{ vault_name: string }>;
}

const TaskModal: React.FC<TaskModalProps> = ({
  task,
  onSave,
  onClose,
  availableCustomJobs,
  availableWarehouses,
  availableVaults,
}) => {
  const [formData, setFormData] = useState<WorkflowTask>(task);

  const handleSave = () => {
    if (!formData.task_name.trim()) {
      alert('Task name is required');
      return;
    }
    if (!formData.task_reference.trim()) {
      alert('Task reference is required');
      return;
    }
    onSave(formData);
  };

  const getAvailableReferences = () => {
    switch (formData.task_type) {
      case 'CUSTOM_JOB':
        return availableCustomJobs.map(j => j.job_name);
      case 'DATA_WAREHOUSE':
        return availableWarehouses.map(w => w.warehouse_name);
      case 'DATA_VAULT':
        return availableVaults.map(v => v.vault_name);
      default:
        return [];
    }
  };

  return (
    <div style={{
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
    }}>
      <div style={{
        backgroundColor: asciiColors.background,
        border: `2px solid ${asciiColors.border}`,
        borderRadius: 4,
        padding: 24,
        width: '500px',
        maxWidth: '90vw',
        maxHeight: '90vh',
        overflow: 'auto',
      }}>
        <h3 style={{ marginTop: 0, marginBottom: 16, color: asciiColors.accent }}>
          {task.task_name ? 'Edit Task' : 'Add Task'}
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 11, color: asciiColors.muted }}>
              Task Name *
            </label>
            <input
              type="text"
              value={formData.task_name}
              onChange={(e) => setFormData({ ...formData, task_name: e.target.value })}
              style={{
                width: '100%',
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
              Task Type *
            </label>
            <select
              value={formData.task_type}
              onChange={(e) => setFormData({ ...formData, task_type: e.target.value as any, task_reference: '' })}
              style={{
                width: '100%',
                padding: '6px 10px',
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
              <option value="CUSTOM_JOB">Custom Job</option>
              <option value="DATA_WAREHOUSE">Data Warehouse</option>
              <option value="DATA_VAULT">Data Vault</option>
              <option value="SYNC">Sync</option>
              <option value="API_CALL">API Call</option>
              <option value="SCRIPT">Script</option>
              <option value="SUB_WORKFLOW">Sub-Workflow</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 11, color: asciiColors.muted }}>
              Reference *
            </label>
            {getAvailableReferences().length > 0 ? (
              <select
                value={formData.task_reference}
                onChange={(e) => setFormData({ ...formData, task_reference: e.target.value })}
                style={{
                  width: '100%',
                  padding: '6px 10px',
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
                <option value="">Select...</option>
                {getAvailableReferences().map(ref => (
                  <option key={ref} value={ref}>{ref}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={formData.task_reference}
                onChange={(e) => setFormData({ ...formData, task_reference: e.target.value })}
                placeholder="Enter reference name"
                style={{
                  width: '100%',
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
            )}
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 11, color: asciiColors.muted }}>
              Description
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              style={{
                width: '100%',
                padding: '6px 10px',
                border: `1px solid ${asciiColors.border}`,
                borderRadius: 2,
                fontSize: 12,
                fontFamily: 'Consolas',
                backgroundColor: asciiColors.background,
                color: asciiColors.foreground,
                outline: 'none',
                resize: 'vertical',
              }}
            />
          </div>
        </div>

        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <AsciiButton label="Cancel" onClick={onClose} variant="ghost" />
          <AsciiButton label="Save" onClick={handleSave} variant="primary" />
        </div>
      </div>
    </div>
  );
};

export default WorkflowDAGBuilder;
