import React, { useState, useCallback, useEffect, useRef } from 'react';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors } from '../../ui/theme/asciiTheme';
import { theme } from '../../theme/theme';
import { performanceApi } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import SkeletonLoader from '../shared/SkeletonLoader';

const CacheConfig: React.FC = () => {
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingConfig, setEditingConfig] = useState<any>(null);
  const isMountedRef = useRef(true);

  const fetchConfigs = useCallback(async () => {
    if (!isMountedRef.current) return;

    try {
      setError(null);
      const response = await performanceApi.getCacheConfig();
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

  const handleUpdateConfig = useCallback(async (config: any) => {
    try {
      await performanceApi.updateCacheConfig(config);
      setEditingConfig(null);
      await fetchConfigs();
    } catch (err) {
      setError(extractApiError(err));
    }
  }, [fetchConfigs]);

  if (loading) {
    return <SkeletonLoader />;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md }}>
        <h3 style={{ fontSize: 14 }}>Cache Configuration</h3>
        <AsciiButton onClick={() => performanceApi.clearCache()}>
          Clear All Cache
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
          No cache configurations found. Cache will use default settings.
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: asciiColors.foreground, marginBottom: theme.spacing.xs }}>
                    {config.cache_type}
                  </div>
                  <div style={{ fontSize: 11, color: asciiColors.muted }}>
                    Max Size: {config.max_size || 'N/A'} | 
                    Last Updated: {new Date(config.last_updated).toLocaleString()}
                  </div>
                </div>
                <AsciiButton onClick={() => setEditingConfig(config)}>
                  Edit
                </AsciiButton>
              </div>
            </div>
          ))}
        </div>
      )}

      {editingConfig && (
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
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: asciiColors.background,
            border: `2px solid ${asciiColors.border}`,
            borderRadius: 2,
            padding: theme.spacing.xl,
            maxWidth: '500px',
            width: '100%'
          }}>
            <h3 style={{ fontSize: 14, marginBottom: theme.spacing.md }}>Edit Cache Config</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
              <div>
                <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: 12, color: asciiColors.foreground }}>
                  Max Size
                </label>
                <input
                  type="number"
                  value={editingConfig.max_size || 1000}
                  onChange={(e) => setEditingConfig((prev: any) => ({ ...prev, max_size: parseInt(e.target.value) || 1000 }))}
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
              <div style={{ display: 'flex', gap: theme.spacing.sm, justifyContent: 'flex-end' }}>
                <AsciiButton onClick={() => setEditingConfig(null)}>
                  Cancel
                </AsciiButton>
                <AsciiButton onClick={() => handleUpdateConfig(editingConfig)}>
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

export default CacheConfig;
