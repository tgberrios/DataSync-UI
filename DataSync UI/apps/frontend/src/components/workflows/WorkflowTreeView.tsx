import React from 'react';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { type WorkflowEntry } from '../../services/api';

interface WorkflowTreeViewProps {
  workflows: WorkflowEntry[];
  onWorkflowClick: (workflow: WorkflowEntry) => void;
  onDelete: (workflowName: string) => void;
  onEdit: (workflow: WorkflowEntry) => void;
  onToggleActive: (workflowName: string) => void;
  onToggleEnabled: (workflowName: string) => void;
  onExecute: (workflowName: string) => void;
  selectedWorkflow: WorkflowEntry | null;
}

const WorkflowTreeView: React.FC<WorkflowTreeViewProps> = ({
  workflows,
  onWorkflowClick,
  onDelete,
  onEdit,
  onToggleActive,
  onToggleEnabled,
  onExecute,
  selectedWorkflow,
}) => {
  return (
    <div style={{ fontFamily: "Consolas", fontSize: 12 }}>
      {workflows.length === 0 ? (
        <div style={{ padding: 20, textAlign: "center", color: asciiColors.muted }}>
          No workflows found
        </div>
      ) : (
        workflows.map((workflow) => {
          const isSelected = selectedWorkflow?.workflow_name === workflow.workflow_name;
          return (
            <div
              key={workflow.workflow_name}
              onClick={() => onWorkflowClick(workflow)}
              style={{
                padding: "8px 12px",
                marginBottom: 4,
                cursor: "pointer",
                backgroundColor: isSelected ? asciiColors.accent + "20" : "transparent",
                border: `1px solid ${isSelected ? asciiColors.accent : asciiColors.border}`,
                borderRadius: 2,
                color: isSelected ? asciiColors.accent : asciiColors.foreground,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = asciiColors.accent + "10";
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = "transparent";
                }
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>
                  {workflow.workflow_name}
                </div>
                <div style={{ fontSize: 10, color: asciiColors.muted, display: "flex", gap: 8 }}>
                  <span>
                    {workflow.active ? (
                      <span style={{ color: asciiColors.success }}>● Active</span>
                    ) : (
                      <span style={{ color: asciiColors.danger }}>○ Inactive</span>
                    )}
                  </span>
                  <span>
                    {workflow.enabled ? (
                      <span style={{ color: asciiColors.success }}>✓ Enabled</span>
                    ) : (
                      <span style={{ color: asciiColors.danger }}>✗ Disabled</span>
                    )}
                  </span>
                  {workflow.schedule_cron && (
                    <span style={{ color: asciiColors.muted }}>
                      {ascii.blockHalf} Scheduled
                    </span>
                  )}
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 4,
                  alignItems: "center",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => onExecute(workflow.workflow_name)}
                  style={{
                    padding: "4px 8px",
                    fontSize: 10,
                    backgroundColor: asciiColors.accent,
                    color: asciiColors.background,
                    border: "none",
                    borderRadius: 2,
                    cursor: "pointer",
                    fontFamily: "Consolas",
                  }}
                  title="Execute"
                >
                  ▶
                </button>
                <button
                  onClick={() => onEdit(workflow)}
                  style={{
                    padding: "4px 8px",
                    fontSize: 10,
                    backgroundColor: asciiColors.foreground + "20",
                    color: asciiColors.foreground,
                    border: `1px solid ${asciiColors.border}`,
                    borderRadius: 2,
                    cursor: "pointer",
                    fontFamily: "Consolas",
                  }}
                  title="Edit"
                >
                  ✎
                </button>
                <button
                  onClick={() => onDelete(workflow.workflow_name)}
                  style={{
                    padding: "4px 8px",
                    fontSize: 10,
                    backgroundColor: asciiColors.danger + "20",
                    color: asciiColors.danger,
                    border: `1px solid ${asciiColors.danger}`,
                    borderRadius: 2,
                    cursor: "pointer",
                    fontFamily: "Consolas",
                  }}
                  title="Delete"
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default WorkflowTreeView;
