import React, { useState, useCallback, useEffect, useRef } from 'react';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors } from '../../ui/theme/asciiTheme';
import { theme } from '../../theme/theme';
import { performanceApi } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import SkeletonLoader from '../shared/SkeletonLoader';

const CompressionConfig: React.FC = () => {
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    schema_name: '',
    table_name: '',
    compression_algorithm: 'GZIP',
    compress_on_transfer: true,
    compress_on_storage: false,
    min_size_bytes: 1048576
  });
  const isMountedRef = useRef(true);

  const fetchConfigs = useCallback(async () => {
    if (!isMountedRef.current) return;

    try {
      setError(null);
      const response = await performanceApi.getCompressionConfig();
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
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchConfigs]);

  const handleSaveConfig = useCallback(async () => {
    try {
      await performanceApi.updateCompressionConfig(formData);
      setShowCreateModal(false);
      setFormData({
        schema_name: '',
        table_name: '',
        compression_algorithm: 'GZIP',
        compress_on_transfer: true,
        compress_on_storage: false,
        min_size_bytes: 1048576
      });
      await fetchConfigs();
    } catch (err) {
      setError(extractApiError(err));
    }
  }, [formData, fetchConfigs]);

  if (loading) {
    return <SkeletonLoader />;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md }}>
        <h3 style={{ fontSize: 14 }}>Compression Configuration</h3>
        <AsciiButton onClick={() => setShowCreateModal(true)}>
          Add Configuration
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

      {configs.length === 0 ? (
        <div style={{
          padding: theme.spacing.lg,
          border: `1px solid ${asciiColors.border}`,
          borderRadius: 2,
          textAlign: 'center',
          color: asciiColors.muted
        }}>
          No compression configurations
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm }}>
          {configs.map((config, idx) => (
            <div
              key={idx}
              style={{
                padding: theme.spacing.md,
                border: `1px solid ${asciiColors.border}`,
                borderRadius: 2,
                backgroundColor: asciiColors.backgroundSoft
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600, color: asciiColors.foreground, marginBottom: theme.spacing.xs }}>
                {config.schema_name}.{config.table_name}
              </div>
              <div style={{ fontSize: 11, color: asciiColors.muted }}>
                Algorithm: {config.compression_algorithm} | 
                Transfer: {config.compress_on_transfer ? 'Yes' : 'No'} | 
                Storage: {config.compress_on_storage ? 'Yes' : 'No'} | 
                Min Size: {(config.min_size_bytes / 1024 / 1024).toFixed(2)} MB
              </div>
            </div>
          ))}
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
            <h3 style={{ fontSize: 14, marginBottom: theme.spacing.md }}>Compression Configuration</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.spacing.md }}>
                <div>
                  <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: 12, color: asciiColors.foreground }}>
                    Schema *
                  </label>
                  <input
                    type="text"
                    value={formData.schema_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, schema_name: e.target.value }))}
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
                    Table *
                  </label>
                  <input
                    type="text"
                    value={formData.table_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, table_name: e.target.value }))}
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
                  Compression Algorithm
                </label>
                <select
                  value={formData.compression_algorithm}
                  onChange={(e) => setFormData(prev => ({ ...prev, compression_algorithm: e.target.value }))}
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
                  <option value="NONE">None</option>
                  <option value="GZIP">GZIP</option>
                  <option value="LZ4">LZ4</option>
                  <option value="SNAPPY">Snappy</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: theme.spacing.md }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.xs, fontSize: 12, color: asciiColors.foreground }}>
                  <input
                    type="checkbox"
                    checked={formData.compress_on_transfer}
                    onChange={(e) => setFormData(prev => ({ ...prev, compress_on_transfer: e.target.checked }))}
                    style={{ cursor: 'pointer' }}
                  />
                  Compress on Transfer
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.xs, fontSize: 12, color: asciiColors.foreground }}>
                  <input
                    type="checkbox"
                    checked={formData.compress_on_storage}
                    onChange={(e) => setFormData(prev => ({ ...prev, compress_on_storage: e.target.checked }))}
                    style={{ cursor: 'pointer' }}
                  />
                  Compress on Storage
                </label>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: 12, color: asciiColors.foreground }}>
                  Minimum Size (bytes)
                </label>
                <input
                  type="number"
                  value={formData.min_size_bytes}
                  onChange={(e) => setFormData(prev => ({ ...prev, min_size_bytes: parseInt(e.target.value) || 1048576 }))}
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
                  onClick={handleSaveConfig}
                  disabled={!formData.schema_name || !formData.table_name}
                >
                  Save
                </AsciiButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompressionConfig;
