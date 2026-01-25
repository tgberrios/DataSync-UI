import React, { useState, useCallback, useEffect, useRef } from 'react';
import { asciiColors } from '../../ui/theme/asciiTheme';
import { theme } from '../../theme/theme';
import { performanceApi } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import SkeletonLoader from '../shared/SkeletonLoader';

const JoinOptimizationConfig: React.FC = () => {
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStats = useCallback(async () => {
    if (!isMountedRef.current) return;

    try {
      setError(null);
      const response = await performanceApi.getJoinOptimizationStats(50);
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
    }, 10000);

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
      <h3 style={{ fontSize: 14, marginBottom: theme.spacing.md }}>Join Optimization Statistics</h3>

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
          No join optimization statistics available
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm }}>
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: theme.spacing.sm }}>
                <div>
                  <div style={{ fontSize: 11, color: asciiColors.muted }}>Left Table</div>
                  <div style={{ fontSize: 12, color: asciiColors.foreground }}>
                    {stat.left_table}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: asciiColors.muted }}>Right Table</div>
                  <div style={{ fontSize: 12, color: asciiColors.foreground }}>
                    {stat.right_table}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: asciiColors.muted }}>Algorithm</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: asciiColors.foreground }}>
                    {stat.join_algorithm}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: asciiColors.muted }}>Result Rows</div>
                  <div style={{ fontSize: 12, color: asciiColors.foreground }}>
                    {stat.result_rows || 'N/A'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: asciiColors.muted }}>Execution Time</div>
                  <div style={{ fontSize: 12, color: asciiColors.foreground }}>
                    {stat.execution_time_ms ? `${stat.execution_time_ms}ms` : 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default JoinOptimizationConfig;
