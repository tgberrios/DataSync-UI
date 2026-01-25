import React, { useState, useCallback, useEffect, useRef } from 'react';
import { asciiColors } from '../../ui/theme/asciiTheme';
import { theme } from '../../theme/theme';
import { performanceApi } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import SkeletonLoader from '../shared/SkeletonLoader';

const PartitionPruningConfig: React.FC = () => {
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({ schema: '', table: '' });
  const isMountedRef = useRef(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStats = useCallback(async () => {
    if (!isMountedRef.current) return;

    try {
      setError(null);
      const response = await performanceApi.getPartitionPruningStats(
        filters.schema || undefined,
        filters.table || undefined
      );
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
  }, [filters]);

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
      <div style={{ marginBottom: theme.spacing.md }}>
        <h3 style={{ fontSize: 14, marginBottom: theme.spacing.sm }}>Partition Pruning Statistics</h3>
        <div style={{ display: 'flex', gap: theme.spacing.sm, marginBottom: theme.spacing.md }}>
          <input
            type="text"
            value={filters.schema}
            onChange={(e) => setFilters(prev => ({ ...prev, schema: e.target.value }))}
            placeholder="Filter by schema"
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
            value={filters.table}
            onChange={(e) => setFilters(prev => ({ ...prev, table: e.target.value }))}
            placeholder="Filter by table"
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

      {stats.length === 0 ? (
        <div style={{
          padding: theme.spacing.lg,
          border: `1px solid ${asciiColors.border}`,
          borderRadius: 2,
          textAlign: 'center',
          color: asciiColors.muted
        }}>
          No partition pruning statistics available
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: theme.spacing.sm }}>
                <div>
                  <div style={{ fontSize: 11, color: asciiColors.muted }}>Table</div>
                  <div style={{ fontSize: 12, color: asciiColors.foreground }}>
                    {stat.schema_name}.{stat.table_name}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: asciiColors.muted }}>Pruning Ratio</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: asciiColors.foreground }}>
                    {((stat.pruning_ratio || 0) * 100).toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: asciiColors.muted }}>Partitions Used</div>
                  <div style={{ fontSize: 12, color: asciiColors.foreground }}>
                    {stat.partitions_used} / {stat.total_partitions}
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

export default PartitionPruningConfig;
