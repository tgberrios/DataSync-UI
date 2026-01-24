import React, { useState, useCallback, useEffect, useRef } from 'react';
import { asciiColors } from '../../ui/theme/asciiTheme';
import { theme } from '../../theme/theme';
import { metadataApi } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import SkeletonLoader from '../shared/SkeletonLoader';

const TransformationLineageView: React.FC = () => {
  const [filters, setFilters] = useState({ schema: '', table: '', workflow: '' });
  const [lineageData, setLineageData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchLineage = useCallback(async () => {
    if (!isMountedRef.current) return;

    try {
      setError(null);
      const data = await metadataApi.getTransformationLineage(
        filters.schema || undefined,
        filters.table || undefined,
        filters.workflow || undefined
      );
      if (isMountedRef.current) {
        setLineageData(data || []);
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        if (err?.response?.status === 404) {
          setLineageData([]);
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
    fetchLineage();

    refreshIntervalRef.current = setInterval(() => {
      fetchLineage();
    }, 10000);

    return () => {
      isMountedRef.current = false;
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [fetchLineage]);

  if (loading) {
    return <SkeletonLoader />;
  }

  return (
    <div>
      <h3 style={{ fontSize: 14, marginBottom: theme.spacing.md }}>Transformation Lineage</h3>

      <div style={{
        padding: theme.spacing.md,
        border: `1px solid ${asciiColors.border}`,
        borderRadius: 2,
        backgroundColor: asciiColors.backgroundSoft,
        marginBottom: theme.spacing.md
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: theme.spacing.md }}>
          <div>
            <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: 12, color: asciiColors.foreground }}>
              Filter by Schema
            </label>
            <input
              type="text"
              value={filters.schema}
              onChange={(e) => setFilters(prev => ({ ...prev, schema: e.target.value }))}
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
              Filter by Table
            </label>
            <input
              type="text"
              value={filters.table}
              onChange={(e) => setFilters(prev => ({ ...prev, table: e.target.value }))}
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
              Filter by Workflow
            </label>
            <input
              type="text"
              value={filters.workflow}
              onChange={(e) => setFilters(prev => ({ ...prev, workflow: e.target.value }))}
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

      {lineageData.length === 0 ? (
        <div style={{
          padding: theme.spacing.lg,
          border: `1px solid ${asciiColors.border}`,
          borderRadius: 2,
          textAlign: 'center',
          color: asciiColors.muted
        }}>
          No transformation lineage data available
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm }}>
          {lineageData.map((trans, idx) => (
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
                {trans.transformation_type} - {trans.workflow_name || 'N/A'}
              </div>
              <div style={{ fontSize: 11, color: asciiColors.muted }}>
                Rows: {trans.rows_processed || 0} | 
                Time: {trans.execution_time_ms ? `${trans.execution_time_ms}ms` : 'N/A'} |
                Executed: {new Date(trans.executed_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TransformationLineageView;
