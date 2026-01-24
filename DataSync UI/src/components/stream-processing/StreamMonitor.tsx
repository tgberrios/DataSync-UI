import React, { useState, useCallback, useEffect, useRef } from 'react';
import { asciiColors } from '../../ui/theme/asciiTheme';
import { theme } from '../../theme/theme';
import { streamProcessingApi } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import SkeletonLoader from '../shared/SkeletonLoader';

const StreamMonitor: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStats = useCallback(async () => {
    if (!isMountedRef.current) return;

    try {
      setError(null);
      const response = await streamProcessingApi.getStats();
      if (isMountedRef.current) {
        setStats(response);
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        if (err?.response?.status === 404) {
          setStats(null);
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

  if (!stats) {
    return (
      <div style={{
        padding: theme.spacing.lg,
        border: `1px solid ${asciiColors.border}`,
        borderRadius: 2,
        textAlign: 'center',
        color: asciiColors.muted
      }}>
        No statistics available
      </div>
    );
  }

  return (
    <div>
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: theme.spacing.md }}>
        {/* Consumers Stats */}
        <div style={{
          padding: theme.spacing.md,
          border: `1px solid ${asciiColors.border}`,
          borderRadius: 2,
          backgroundColor: asciiColors.backgroundSoft
        }}>
          <h4 style={{ fontSize: 12, marginBottom: theme.spacing.sm, color: asciiColors.foreground }}>Consumers</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.xs }}>
            <div style={{ fontSize: 11, color: asciiColors.muted }}>
              Active: <span style={{ color: asciiColors.foreground, fontWeight: 600 }}>
                {stats.consumers?.active || 0}
              </span>
            </div>
            <div style={{ fontSize: 11, color: asciiColors.muted }}>
              Stopped: <span style={{ color: asciiColors.foreground, fontWeight: 600 }}>
                {stats.consumers?.stopped || 0}
              </span>
            </div>
          </div>
        </div>

        {/* CEP Stats */}
        <div style={{
          padding: theme.spacing.md,
          border: `1px solid ${asciiColors.border}`,
          borderRadius: 2,
          backgroundColor: asciiColors.backgroundSoft
        }}>
          <h4 style={{ fontSize: 12, marginBottom: theme.spacing.sm, color: asciiColors.foreground }}>CEP</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.xs }}>
            <div style={{ fontSize: 11, color: asciiColors.muted }}>
              Active Rules: <span style={{ color: asciiColors.foreground, fontWeight: 600 }}>
                {stats.cep?.activeRules || 0}
              </span>
            </div>
            <div style={{ fontSize: 11, color: asciiColors.muted }}>
              Matches (24h): <span style={{ color: asciiColors.foreground, fontWeight: 600 }}>
                {stats.cep?.matchesLast24h || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Native CDC Stats */}
        <div style={{
          padding: theme.spacing.md,
          border: `1px solid ${asciiColors.border}`,
          borderRadius: 2,
          backgroundColor: asciiColors.backgroundSoft
        }}>
          <h4 style={{ fontSize: 12, marginBottom: theme.spacing.sm, color: asciiColors.foreground }}>Native CDC</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.xs }}>
            <div style={{ fontSize: 11, color: asciiColors.muted }}>
              Running: <span style={{ color: asciiColors.foreground, fontWeight: 600 }}>
                {stats.nativeCDC?.running || 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div style={{
        marginTop: theme.spacing.lg,
        padding: theme.spacing.md,
        border: `1px solid ${asciiColors.border}`,
        borderRadius: 2,
        backgroundColor: asciiColors.backgroundSoft
      }}>
        <h4 style={{ fontSize: 12, marginBottom: theme.spacing.sm, color: asciiColors.foreground }}>System Status</h4>
        <div style={{ fontSize: 11, color: asciiColors.muted }}>
          Last updated: {new Date().toLocaleString()}
        </div>
        <div style={{ fontSize: 11, color: asciiColors.muted, marginTop: theme.spacing.xs }}>
          Auto-refresh: Every 5 seconds
        </div>
      </div>
    </div>
  );
};

export default StreamMonitor;
