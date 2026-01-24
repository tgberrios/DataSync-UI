import React, { useState, useCallback, useEffect, useRef } from 'react';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors } from '../../ui/theme/asciiTheme';
import { theme } from '../../theme/theme';
import { streamProcessingApi, type NativeCDCConfig } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import SkeletonLoader from '../shared/SkeletonLoader';

const NativeCDCConfigComponent: React.FC = () => {
  const [configs, setConfigs] = useState<NativeCDCConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedConfig, setSelectedConfig] = useState<NativeCDCConfig | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState<Partial<NativeCDCConfig>>({
    dbEngine: '',
    connectionString: '',
    cdcType: 'BINLOG',
    databaseName: '',
    tableName: '',
    position: ''
  });
  const isMountedRef = useRef(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchConfigs = useCallback(async () => {
    if (!isMountedRef.current) return;

    try {
      setError(null);
      const response = await streamProcessingApi.getNativeCDCConfig();
      if (isMountedRef.current) {
        setConfigs(response || []);
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        if (err?.response?.status === 404) {
          setConfigs([]);
          return;
        }
        setError(extractApiError(err));
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    setLoading(true);
    fetchConfigs();

    refreshIntervalRef.current = setInterval(() => {
      fetchConfigs();
    }, 10000);

    return () => {
      isMountedRef.current = false;
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [fetchConfigs]);

  const handleCreateConfig = useCallback(async () => {
    if (!formData.dbEngine || !formData.connectionString || !formData.cdcType) {
      setError('Database engine, connection string, and CDC type are required');
      return;
    }

    try {
      await streamProcessingApi.updateNativeCDCConfig(formData as NativeCDCConfig);
      setShowCreateModal(false);
      setFormData({
        dbEngine: '',
        connectionString: '',
        cdcType: 'BINLOG',
        databaseName: '',
        tableName: '',
        position: ''
      });
      await fetchConfigs();
    } catch (err) {
      setError(extractApiError(err));
    }
  }, [formData, fetchConfigs]);

  const handleStartCDC = useCallback(async (id: number) => {
    try {
      await streamProcessingApi.startNativeCDC(id);
      await fetchConfigs();
    } catch (err) {
      setError(extractApiError(err));
    }
  }, [fetchConfigs]);

  const handleStopCDC = useCallback(async (id: number) => {
    try {
      await streamProcessingApi.stopNativeCDC(id);
      await fetchConfigs();
    } catch (err) {
      setError(extractApiError(err));
    }
  }, [fetchConfigs]);

  const handleViewPosition = useCallback(async (id: number) => {
    try {
      const response = await streamProcessingApi.getCDCPosition(id);
      if (response) {
        alert(`Current Position: ${response.position || 'N/A'}`);
      }
    } catch (err) {
      setError(extractApiError(err));
    }
  }, []);

  if (loading) {
    return <SkeletonLoader />;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md }}>
        <h3 style={{ fontSize: 14 }}>Native CDC Configuration</h3>
        <AsciiButton onClick={() => setShowCreateModal(true)}>
          Add CDC Config
        </AsciiButton>
      </div>

      {error && (
        <div style={{
          padding: theme.spacing.md,
          border: `1px solid ${asciiColors.border}`,
          borderRadius: 2,
          backgroundColor: asciiColors.backgroundSoft,
          color: asciiColors.foreground,
          marginBottom: theme.spacing.md
        }}>
          {error}
        </div>
      )}

      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: theme.spacing.lg
        }}>
          <div style={{
            backgroundColor: asciiColors.background,
            border: `2px solid ${asciiColors.border}`,
            borderRadius: 2,
            padding: theme.spacing.xl,
            maxWidth: '700px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ fontSize: 14, marginBottom: theme.spacing.md }}>Add Native CDC Configuration</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
              <div>
                <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: 12, color: asciiColors.foreground }}>
                  Database Engine *
                </label>
                <select
                  value={formData.dbEngine || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, dbEngine: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: theme.spacing.sm,
                    border: `1px solid ${asciiColors.border}`,
                    borderRadius: 2,
                    backgroundColor: asciiColors.background,
                    color: asciiColors.foreground,
                    fontFamily: 'Consolas, monospace',
                    fontSize: 12
                  }}
                >
                  <option value="">Select...</option>
                  <option value="mariadb">MariaDB</option>
                  <option value="mysql">MySQL</option>
                  <option value="postgresql">PostgreSQL</option>
                  <option value="mssql">MSSQL</option>
                  <option value="oracle">Oracle</option>
                  <option value="mongodb">MongoDB</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: 12, color: asciiColors.foreground }}>
                  CDC Type *
                </label>
                <select
                  value={formData.cdcType || 'BINLOG'}
                  onChange={(e) => setFormData(prev => ({ ...prev, cdcType: e.target.value as any }))}
                  style={{
                    width: '100%',
                    padding: theme.spacing.sm,
                    border: `1px solid ${asciiColors.border}`,
                    borderRadius: 2,
                    backgroundColor: asciiColors.background,
                    color: asciiColors.foreground,
                    fontFamily: 'Consolas, monospace',
                    fontSize: 12
                  }}
                >
                  <option value="BINLOG">Binlog (MySQL/MariaDB)</option>
                  <option value="WAL">WAL (PostgreSQL)</option>
                  <option value="TRANSACTION_LOG">Transaction Log (MSSQL)</option>
                  <option value="REDO_LOG">Redo Log (Oracle)</option>
                  <option value="CHANGE_STREAMS">Change Streams (MongoDB)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: 12, color: asciiColors.foreground }}>
                  Connection String *
                </label>
                <textarea
                  value={formData.connectionString || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, connectionString: e.target.value }))}
                  rows={3}
                  placeholder="postgresql://user:password@host:port/database"
                  style={{
                    width: '100%',
                    padding: theme.spacing.sm,
                    border: `1px solid ${asciiColors.border}`,
                    borderRadius: 2,
                    backgroundColor: asciiColors.background,
                    color: asciiColors.foreground,
                    fontFamily: 'Consolas, monospace',
                    fontSize: 11
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.spacing.md }}>
                <div>
                  <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: 12, color: asciiColors.foreground }}>
                    Database Name
                  </label>
                  <input
                    type="text"
                    value={formData.databaseName || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, databaseName: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: theme.spacing.sm,
                      border: `1px solid ${asciiColors.border}`,
                      borderRadius: 2,
                      backgroundColor: asciiColors.background,
                      color: asciiColors.foreground,
                      fontFamily: 'Consolas, monospace',
                      fontSize: 12
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: 12, color: asciiColors.foreground }}>
                    Table Name
                  </label>
                  <input
                    type="text"
                    value={formData.tableName || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, tableName: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: theme.spacing.sm,
                      border: `1px solid ${asciiColors.border}`,
                      borderRadius: 2,
                      backgroundColor: asciiColors.background,
                      color: asciiColors.foreground,
                      fontFamily: 'Consolas, monospace',
                      fontSize: 12
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: 12, color: asciiColors.foreground }}>
                  Initial Position
                </label>
                <input
                  type="text"
                  value={formData.position || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
                  placeholder="0/0, binlog position, SCN, etc."
                  style={{
                    width: '100%',
                    padding: theme.spacing.sm,
                    border: `1px solid ${asciiColors.border}`,
                    borderRadius: 2,
                    backgroundColor: asciiColors.background,
                    color: asciiColors.foreground,
                    fontFamily: 'Consolas, monospace',
                    fontSize: 12
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: theme.spacing.sm, justifyContent: 'flex-end', marginTop: theme.spacing.md }}>
                <AsciiButton onClick={() => setShowCreateModal(false)}>
                  Cancel
                </AsciiButton>
                <AsciiButton onClick={handleCreateConfig}>
                  Save
                </AsciiButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {configs.length === 0 ? (
        <div style={{
          padding: theme.spacing.lg,
          border: `1px solid ${asciiColors.border}`,
          borderRadius: 2,
          textAlign: 'center',
          color: asciiColors.muted
        }}>
          No native CDC configurations
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm }}>
          {configs.map((config) => (
            <div
              key={config.id}
              onClick={() => setSelectedConfig(config)}
              style={{
                padding: theme.spacing.md,
                border: `1px solid ${selectedConfig?.id === config.id ? asciiColors.accent : asciiColors.border}`,
                borderRadius: 2,
                backgroundColor: selectedConfig?.id === config.id ? asciiColors.backgroundSoft : asciiColors.background,
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: theme.spacing.xs }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: asciiColors.foreground, marginBottom: theme.spacing.xs }}>
                    {config.dbEngine} - {config.cdcType}
                  </div>
                  <div style={{ fontSize: 11, color: asciiColors.muted }}>
                    {config.databaseName && `${config.databaseName}.`}{config.tableName || 'All tables'}
                  </div>
                </div>
                <div style={{
                  padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
                  border: `1px solid ${config.status === 'RUNNING' ? asciiColors.accent : asciiColors.border}`,
                  borderRadius: 2,
                  backgroundColor: config.status === 'RUNNING' ? asciiColors.accent : 'transparent',
                  color: config.status === 'RUNNING' ? '#ffffff' : asciiColors.foreground,
                  fontSize: 10,
                  textTransform: 'uppercase'
                }}>
                  {config.status}
                </div>
              </div>
              {config.position && (
                <div style={{ fontSize: 11, color: asciiColors.muted, marginBottom: theme.spacing.xs }}>
                  Position: {config.position}
                </div>
              )}
              {config.errorMessage && (
                <div style={{ fontSize: 11, color: '#ff4444', marginBottom: theme.spacing.xs }}>
                  Error: {config.errorMessage}
                </div>
              )}
              <div style={{ display: 'flex', gap: theme.spacing.sm, marginTop: theme.spacing.sm }}>
                {config.status === 'STOPPED' && (
                  <AsciiButton onClick={(e) => {
                    e.stopPropagation();
                    if (config.id) handleStartCDC(config.id);
                  }}>
                    Start
                  </AsciiButton>
                )}
                {config.status === 'RUNNING' && (
                  <AsciiButton onClick={(e) => {
                    e.stopPropagation();
                    if (config.id) handleStopCDC(config.id);
                  }}>
                    Stop
                  </AsciiButton>
                )}
                <AsciiButton onClick={(e) => {
                  e.stopPropagation();
                  if (config.id) handleViewPosition(config.id);
                }}>
                  View Position
                </AsciiButton>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NativeCDCConfigComponent;
