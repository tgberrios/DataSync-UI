import React, { useState, useCallback, useEffect, useRef } from 'react';
import { asciiColors } from '../../ui/theme/asciiTheme';
import { theme } from '../../theme/theme';
import { performanceApi } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import SkeletonLoader from '../shared/SkeletonLoader';

const CacheStats: React.FC = () => {
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStats = useCallback(async () => {
    if (!isMountedRef.current) return;

    try {
      setError(null);
      const response = await performanceApi.getCacheStats();
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

  return (
    <div>
      <h3 style={{ fontSize: 14, marginBottom: theme.spacing.md }}>Cache Statistics</h3>

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
          No cache statistics available
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: theme.spacing.md }}>
          {stats.map((stat, idx) => (
            <div
              key={idx}
              style={{
                padding: theme.spacing.md,
                border: `1px solid ${asciiColors.border}`,
                borderRadius: 2,
                backgroundColor: asciiColors.backgroundSoft
              }}
            >
              <h4 style={{ fontSize: 12, marginBottom: theme.spacing.sm, color: asciiColors.foreground }}>
                {stat.cache_type} Cache
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.xs }}>
                <div style={{ fontSize: 11, color: asciiColors.muted }}>
                  Hit Rate: <span style={{ color: asciiColors.foreground, fontWeight: 600 }}>
                    {((stat.hit_rate || 0) * 100).toFixed(2)}%
                  </span>
                </div>
                <div style={{ fontSize: 11, color: asciiColors.muted }}>
                  Hits: <span style={{ color: asciiColors.foreground }}>{stat.total_hits || 0}</span>
                </div>
                <div style={{ fontSize: 11, color: asciiColors.muted }}>
                  Misses: <span style={{ color: asciiColors.foreground }}>{stat.total_misses || 0}</span>
                </div>
                <div style={{ fontSize: 11, color: asciiColors.muted }}>
                  Evictions: <span style={{ color: asciiColors.foreground }}>{stat.total_evictions || 0}</span>
                </div>
                <div style={{ fontSize: 11, color: asciiColors.muted }}>
                  Current Size: <span style={{ color: asciiColors.foreground }}>
                    {stat.current_size || 0} / {stat.max_size || 0}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CacheStats;
