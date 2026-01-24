import React, { useState, useCallback, useEffect, useRef } from 'react';
import { asciiColors } from '../../ui/theme/asciiTheme';
import { theme } from '../../theme/theme';
import { performanceApi } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import SkeletonLoader from '../shared/SkeletonLoader';

const MemoryMonitor: React.FC = () => {
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStats = useCallback(async () => {
    if (!isMountedRef.current) return;

    try {
      setError(null);
      const response = await performanceApi.getMemoryStats(100);
      if (isMountedRef.current) {
        setStats(response || []);
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        if (err?.response?.status === 404) {
          setStats([]);
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
    fetchStats();

    refreshIntervalRef.current = setInterval(() => {
      fetchStats();
    }, 5000);

    return () => {
      isMountedRef.current = false;
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [fetchStats]);

  if (loading) {
    return <SkeletonLoader />;
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  return (
    <div>
      <h3 style={{ fontSize: 14, marginBottom: theme.spacing.md }}>Memory Usage Monitor</h3>

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

      {stats.length === 0 ? (
        <div style={{
          padding: theme.spacing.lg,
          border: `1px solid ${asciiColors.border}`,
          borderRadius: 2,
          textAlign: 'center',
          color: asciiColors.muted
        }}>
          No memory statistics available
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm }}>
          {stats.slice(0, 20).map((stat, idx) => {
            const usagePercent = stat.limit_bytes > 0 
              ? (stat.current_usage_bytes / stat.limit_bytes) * 100 
              : 0;

            return (
              <div
                key={idx}
                style={{
                  padding: theme.spacing.md,
                  border: `1px solid ${asciiColors.border}`,
                  borderRadius: 2,
                  backgroundColor: asciiColors.backgroundSoft
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.xs }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: asciiColors.foreground }}>
                    {stat.operation_type || 'Unknown'}
                  </div>
                  <div style={{ fontSize: 11, color: asciiColors.muted }}>
                    {new Date(stat.recorded_at).toLocaleString()}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: theme.spacing.sm }}>
                  <div>
                    <div style={{ fontSize: 11, color: asciiColors.muted }}>Current</div>
                    <div style={{ fontSize: 12, color: asciiColors.foreground }}>
                      {formatBytes(stat.current_usage_bytes || 0)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: asciiColors.muted }}>Peak</div>
                    <div style={{ fontSize: 12, color: asciiColors.foreground }}>
                      {formatBytes(stat.peak_usage_bytes || 0)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: asciiColors.muted }}>Limit</div>
                    <div style={{ fontSize: 12, color: asciiColors.foreground }}>
                      {stat.limit_bytes ? formatBytes(stat.limit_bytes) : 'Unlimited'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: asciiColors.muted }}>Usage</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: usagePercent > 90 ? '#ff4444' : usagePercent > 75 ? '#ffaa00' : asciiColors.foreground }}>
                      {usagePercent.toFixed(1)}%
                    </div>
                  </div>
                </div>
                {stat.spill_count > 0 && (
                  <div style={{ fontSize: 11, color: '#ffaa00', marginTop: theme.spacing.xs }}>
                    Spills: {stat.spill_count} ({formatBytes(stat.spill_bytes || 0)})
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MemoryMonitor;
