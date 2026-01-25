import React, { useState, useEffect, useCallback } from 'react';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { theme } from '../../theme/theme';
import { monitoringApi } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import SkeletonLoader from '../shared/SkeletonLoader';

interface AggregationConfig {
  config_id: string;
  type: string;
  endpoint?: string;
  index_name?: string;
  token?: string;
  username?: string;
  password?: string;
  enabled: boolean;
  batch_size: number;
  batch_interval_seconds: number;
}

interface AggregationStatus {
  config_id: string;
  last_export?: string;
  logs_exported: number;
  logs_failed: number;
  last_error?: string;
  is_active: boolean;
}

const LogAggregationConfig = () => {
  const [configs, setConfigs] = useState<AggregationConfig[]>([]);
  const [statuses, setStatuses] = useState<Record<string, AggregationStatus>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<Partial<AggregationConfig>>({
    config_id: '',
    type: 'elasticsearch',
    enabled: true,
    batch_size: 1000,
    batch_interval_seconds: 60
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [configsData, statusData] = await Promise.all([
        monitoringApi.getLogAggregationConfig().catch(() => []),
        monitoringApi.getLogAggregationStatus().catch(() => [])
      ]);
      setConfigs(configsData || []);
      const statusMap: Record<string, AggregationStatus> = {};
      (statusData || []).forEach((status: AggregationStatus) => {
        statusMap[status.config_id] = status;
      });
      setStatuses(statusMap);
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSaveConfig = useCallback(async () => {
    try {
      if (!editingConfig.config_id || !editingConfig.type) {
        setError('Config ID and type are required');
        return;
      }
      await monitoringApi.setLogAggregationConfig(editingConfig as AggregationConfig);
      setShowConfigModal(false);
      setEditingConfig({
        config_id: '',
        type: 'elasticsearch',
        enabled: true,
        batch_size: 1000,
        batch_interval_seconds: 60
      });
      fetchData();
    } catch (err) {
      setError(extractApiError(err));
    }
  }, [editingConfig, fetchData]);

  const handleExport = useCallback(async (configId: string) => {
    try {
      await monitoringApi.exportLogs({ config_id: configId, limit: 1000 });
      fetchData();
    } catch (err) {
      setError(extractApiError(err));
    }
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading && configs.length === 0) {
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
            Log Aggregation Configuration
          </h1>
          <p style={{
            color: asciiColors.muted,
            fontSize: 12,
            marginBottom: theme.spacing.lg
          }}>
            Configure log export to Elasticsearch or Splunk
          </p>

          <div style={{ marginBottom: theme.spacing.lg }}>
            <AsciiButton
              label="Add Configuration"
              onClick={() => setShowConfigModal(true)}
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

          {configs.length === 0 ? (
            <div style={{
              padding: theme.spacing.xl,
              textAlign: 'center',
              color: asciiColors.muted,
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2
            }}>
              No log aggregation configurations. Click "Add Configuration" to create one.
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gap: theme.spacing.md
            }}>
              {configs.map((config) => {
                const status = statuses[config.config_id];

                return (
                  <div
                    key={config.config_id}
                    style={{
                      padding: theme.spacing.md,
                      border: `1px solid ${asciiColors.border}`,
                      borderRadius: 2,
                      background: asciiColors.background
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: theme.spacing.sm
                    }}>
                      <div>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{config.config_id}</span>
                        <span style={{
                          fontSize: 11,
                          color: asciiColors.muted,
                          marginLeft: theme.spacing.sm,
                          textTransform: 'uppercase'
                        }}>
                          {config.type}
                        </span>
                        <span style={{
                          fontSize: 11,
                          padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                          background: config.enabled ? asciiColors.success : asciiColors.muted,
                          color: '#ffffff',
                          marginLeft: theme.spacing.sm,
                          borderRadius: 2
                        }}>
                          {config.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <AsciiButton
                        label="Export Now"
                        onClick={() => handleExport(config.config_id)}
                      />
                    </div>
                    <div style={{ fontSize: 11, color: asciiColors.muted, marginBottom: theme.spacing.xs }}>
                      Endpoint: {config.endpoint || 'N/A'}
                    </div>
                    {config.type === 'elasticsearch' && config.index_name && (
                      <div style={{ fontSize: 11, color: asciiColors.muted, marginBottom: theme.spacing.xs }}>
                        Index: {config.index_name}
                      </div>
                    )}
                    {status && (
                      <div style={{
                        marginTop: theme.spacing.sm,
                        padding: theme.spacing.sm,
                        background: asciiColors.backgroundSoft,
                        borderRadius: 2,
                        fontSize: 11
                      }}>
                        <div>Exported: {status.logs_exported} | Failed: {status.logs_failed}</div>
                        {status.last_export && (
                          <div style={{ color: asciiColors.muted, marginTop: theme.spacing.xs }}>
                            Last export: {new Date(status.last_export).toLocaleString()}
                          </div>
                        )}
                        {status.last_error && (
                          <div style={{ color: asciiColors.error, marginTop: theme.spacing.xs }}>
                            Error: {status.last_error}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Config Modal */}
          {showConfigModal && (
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
                maxWidth: 600,
                width: '90%',
                maxHeight: '90vh',
                overflowY: 'auto'
              }}>
                <h2 style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: asciiColors.foreground,
                  marginBottom: theme.spacing.md
                }}>
                  Log Aggregation Configuration
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
                  <input
                    type="text"
                    placeholder="Config ID"
                    value={editingConfig.config_id}
                    onChange={(e) => setEditingConfig({ ...editingConfig, config_id: e.target.value })}
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
                    value={editingConfig.type}
                    onChange={(e) => setEditingConfig({ ...editingConfig, type: e.target.value })}
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
                    <option value="elasticsearch">Elasticsearch</option>
                    <option value="splunk">Splunk</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Endpoint URL"
                    value={editingConfig.endpoint || ''}
                    onChange={(e) => setEditingConfig({ ...editingConfig, endpoint: e.target.value })}
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
                  {editingConfig.type === 'elasticsearch' && (
                    <input
                      type="text"
                      placeholder="Index Name"
                      value={editingConfig.index_name || ''}
                      onChange={(e) => setEditingConfig({ ...editingConfig, index_name: e.target.value })}
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
                  )}
                  {editingConfig.type === 'splunk' && (
                    <input
                      type="text"
                      placeholder="HEC Token"
                      value={editingConfig.token || ''}
                      onChange={(e) => setEditingConfig({ ...editingConfig, token: e.target.value })}
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
                  )}
                  <input
                    type="text"
                    placeholder="Username (optional)"
                    value={editingConfig.username || ''}
                    onChange={(e) => setEditingConfig({ ...editingConfig, username: e.target.value })}
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
                    type="password"
                    placeholder="Password (optional)"
                    value={editingConfig.password || ''}
                    onChange={(e) => setEditingConfig({ ...editingConfig, password: e.target.value })}
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
                  <div style={{ display: 'flex', gap: theme.spacing.md }}>
                    <AsciiButton
                      label="Save"
                      onClick={handleSaveConfig}
                    />
                    <AsciiButton
                      label="Cancel"
                      onClick={() => setShowConfigModal(false)}
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

export default LogAggregationConfig;
