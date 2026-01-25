import React, { useState, useCallback, useEffect, useRef } from 'react';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors } from '../../ui/theme/asciiTheme';
import { theme } from '../../theme/theme';
import { performanceApi } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import SkeletonLoader from '../shared/SkeletonLoader';

const PartitioningConfig: React.FC = () => {
  const [config, setConfig] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    schema_name: '',
    table_name: '',
    partition_name: '',
    partition_column: '',
    partition_type: 'DATE',
    partition_value: '',
    partition_format: 'year-month-day'
  });
  const isMountedRef = useRef(true);

  const fetchConfig = useCallback(async () => {
    if (!isMountedRef.current || !formData.schema_name || !formData.table_name) return;

    try {
      setError(null);
      const [configData, statsData] = await Promise.all([
        performanceApi.getPartitioningConfig(formData.schema_name, formData.table_name),
        performanceApi.getPartitioningStats(formData.schema_name, formData.table_name)
      ]);
      if (isMountedRef.current) {
        setConfig(configData);
        setStats(statsData);
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        if (err?.response?.status === 404) {
          setConfig(null);
          setStats({ total_partitions: 0, total_rows: 0, total_size_bytes: 0 });
          return;
        }
        setError(extractApiError(err));
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [formData.schema_name, formData.table_name]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleCreatePartition = useCallback(async () => {
    try {
      await performanceApi.createPartition(formData);
      setShowCreateModal(false);
      await fetchConfig();
    } catch (err) {
      setError(extractApiError(err));
    }
  }, [formData, fetchConfig]);

  if (loading && !formData.schema_name) {
    return <SkeletonLoader />;
  }

  return (
    <div>
      <div style={{ marginBottom: theme.spacing.md }}>
        <h3 style={{ fontSize: 14, marginBottom: theme.spacing.sm }}>Dynamic Partitioning Configuration</h3>
        <div style={{ display: 'flex', gap: theme.spacing.sm, marginBottom: theme.spacing.md }}>
          <input
            type="text"
            value={formData.schema_name}
            onChange={(e) => setFormData(prev => ({ ...prev, schema_name: e.target.value }))}
            placeholder="Schema name"
            style={{
              flex: 1,
              padding: theme.spacing.sm,
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2,
              backgroundColor: asciiColors.background,
              color: asciiColors.foreground,
              fontFamily: 'Consolas, monospace',
              fontSize: 12
            }}
          />
          <input
            type="text"
            value={formData.table_name}
            onChange={(e) => setFormData(prev => ({ ...prev, table_name: e.target.value }))}
            placeholder="Table name"
            style={{
              flex: 1,
              padding: theme.spacing.sm,
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2,
              backgroundColor: asciiColors.background,
              color: asciiColors.foreground,
              fontFamily: 'Consolas, monospace',
              fontSize: 12
            }}
          />
          <AsciiButton onClick={fetchConfig} disabled={!formData.schema_name || !formData.table_name}>
            Load
          </AsciiButton>
          <AsciiButton onClick={() => setShowCreateModal(true)}>
            Create Partition
          </AsciiButton>
        </div>
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

      {stats && (
        <div style={{
          padding: theme.spacing.md,
          border: `1px solid ${asciiColors.border}`,
          borderRadius: 2,
          backgroundColor: asciiColors.backgroundSoft,
          marginBottom: theme.spacing.md
        }}>
          <h4 style={{ fontSize: 12, marginBottom: theme.spacing.sm }}>Partitioning Statistics</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: theme.spacing.sm }}>
            <div>
              <div style={{ fontSize: 11, color: asciiColors.muted }}>Total Partitions</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.foreground }}>
                {stats.total_partitions || 0}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: asciiColors.muted }}>Total Rows</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.foreground }}>
                {stats.total_rows || 0}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: asciiColors.muted }}>Total Size</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.foreground }}>
                {stats.total_size_bytes ? `${(stats.total_size_bytes / 1024 / 1024).toFixed(2)} MB` : '0 MB'}
              </div>
            </div>
          </div>
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
            maxWidth: '600px',
            width: '100%'
          }}>
            <h3 style={{ fontSize: 14, marginBottom: theme.spacing.md }}>Create Partition</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
              <div>
                <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: 12, color: asciiColors.foreground }}>
                  Partition Name *
                </label>
                <input
                  type="text"
                  value={formData.partition_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, partition_name: e.target.value }))}
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
                  Partition Column *
                </label>
                <input
                  type="text"
                  value={formData.partition_column}
                  onChange={(e) => setFormData(prev => ({ ...prev, partition_column: e.target.value }))}
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
                  Partition Type *
                </label>
                <select
                  value={formData.partition_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, partition_type: e.target.value }))}
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
                  <option value="DATE">DATE</option>
                  <option value="RANGE">RANGE</option>
                  <option value="LIST">LIST</option>
                  <option value="HASH">HASH</option>
                  <option value="REGION">REGION</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: 12, color: asciiColors.foreground }}>
                  Partition Value
                </label>
                <input
                  type="text"
                  value={formData.partition_value}
                  onChange={(e) => setFormData(prev => ({ ...prev, partition_value: e.target.value }))}
                  placeholder="2024-01-01"
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
                <AsciiButton 
                  onClick={handleCreatePartition}
                  disabled={!formData.partition_name || !formData.partition_column}
                >
                  Create
                </AsciiButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartitioningConfig;
