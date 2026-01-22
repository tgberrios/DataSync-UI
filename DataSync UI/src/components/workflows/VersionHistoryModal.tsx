import React, { useState, useEffect, useCallback } from 'react';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors } from '../../ui/theme/asciiTheme';
import { workflowApi } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';

interface WorkflowVersion {
  version: number;
  workflow_name: string;
  description?: string;
  created_at: string;
  created_by?: string;
  is_current: boolean;
  workflow_definition?: Record<string, unknown>;
}

interface VersionHistoryModalProps {
  workflowName: string;
  onClose: () => void;
  onVersionRestored: () => void;
}

const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({ workflowName, onClose, onVersionRestored }) => {
  const [versions, setVersions] = useState<WorkflowVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isCreatingVersion, setIsCreatingVersion] = useState(false);
  const [newVersionDescription, setNewVersionDescription] = useState('');

  const loadVersions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await workflowApi.getVersions(workflowName);
      setVersions(data);
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setLoading(false);
    }
  }, [workflowName]);

  useEffect(() => {
    loadVersions();
  }, [loadVersions]);

  const handleRestore = async (version: number) => {
    if (!confirm(`Are you sure you want to restore version ${version}? This will replace the current workflow.`)) {
      return;
    }

    setIsRestoring(true);
    setError(null);
    try {
      await workflowApi.restoreVersion(workflowName, version);
      onVersionRestored();
      loadVersions();
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setIsRestoring(false);
    }
  };

  const handleCreateVersion = async () => {
    if (!newVersionDescription.trim()) {
      setError('Description is required');
      return;
    }

    setIsCreatingVersion(true);
    setError(null);
    try {
      await workflowApi.createVersion(workflowName, newVersionDescription);
      setNewVersionDescription('');
      loadVersions();
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setIsCreatingVersion(false);
    }
  };

  const handleDeleteVersion = async (version: number) => {
    if (!confirm(`Are you sure you want to delete version ${version}?`)) {
      return;
    }

    try {
      await workflowApi.deleteVersion(workflowName, version);
      loadVersions();
    } catch (err) {
      setError(extractApiError(err));
    }
  };

  return (
    <AsciiPanel
      title={`VERSION HISTORY: ${workflowName}`}
      onClose={onClose}
      style={{ width: '800px', maxWidth: '90vw', maxHeight: '90vh', overflow: 'auto' }}
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

        <div style={{ marginBottom: 16, padding: 12, backgroundColor: asciiColors.backgroundSoft, borderRadius: 2 }}>
          <h3 style={{ fontSize: 13, marginBottom: 8, color: asciiColors.accent }}>Create New Version</h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 11, color: asciiColors.muted }}>
                Description
              </label>
              <input
                type="text"
                value={newVersionDescription}
                onChange={(e) => setNewVersionDescription(e.target.value)}
                placeholder="Version description..."
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
            <AsciiButton
              label={isCreatingVersion ? "Creating..." : "Create Version"}
              onClick={handleCreateVersion}
              variant="primary"
              disabled={isCreatingVersion || !newVersionDescription.trim()}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 20, textAlign: 'center', color: asciiColors.muted }}>
            Loading versions...
          </div>
        ) : versions.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: asciiColors.muted }}>
            No versions found
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {versions.map((version) => (
              <div
                key={version.version}
                style={{
                  padding: 12,
                  border: `1px solid ${version.is_current ? asciiColors.accent : asciiColors.border}`,
                  borderRadius: 4,
                  backgroundColor: version.is_current ? asciiColors.accent + '10' : asciiColors.background,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div>
                    <strong style={{ color: asciiColors.accent }}>
                      Version {version.version}
                      {version.is_current && (
                        <span style={{ marginLeft: 8, fontSize: 10, color: asciiColors.success }}>
                          (Current)
                        </span>
                      )}
                    </strong>
                  </div>
                  <div style={{ fontSize: 11, color: asciiColors.muted }}>
                    {new Date(version.created_at).toLocaleString()}
                  </div>
                </div>
                {version.description && (
                  <div style={{ marginBottom: 8, fontSize: 11, color: asciiColors.foreground }}>
                    {version.description}
                  </div>
                )}
                {version.created_by && (
                  <div style={{ marginBottom: 8, fontSize: 11, color: asciiColors.muted }}>
                    Created by: {version.created_by}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  {!version.is_current && (
                    <AsciiButton
                      label="Restore"
                      onClick={() => handleRestore(version.version)}
                      variant="primary"
                      disabled={isRestoring}
                    />
                  )}
                  {!version.is_current && (
                    <AsciiButton
                      label="Delete"
                      onClick={() => handleDeleteVersion(version.version)}
                      variant="ghost"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', borderTop: `1px solid ${asciiColors.border}`, paddingTop: 16 }}>
          <AsciiButton
            label="Close"
            onClick={onClose}
            variant="ghost"
          />
        </div>
      </div>
    </AsciiPanel>
  );
};

export default VersionHistoryModal;
