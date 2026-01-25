import React, { useState, useCallback, useEffect, useRef } from 'react';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors } from '../../ui/theme/asciiTheme';
import { theme } from '../../theme/theme';
import { metadataApi } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import SkeletonLoader from '../shared/SkeletonLoader';

const ColumnLineageView: React.FC = () => {
  const [formData, setFormData] = useState({
    schema: '',
    table: '',
    column: ''
  });
  const [lineageData, setLineageData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleLoad = useCallback(async () => {
    if (!formData.schema || !formData.table || !formData.column) {
      setError("Schema, table, and column are required");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await metadataApi.getColumnLineage(formData.schema, formData.table, formData.column);
      if (isMountedRef.current) {
        setLineageData(data || []);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(extractApiError(err));
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [formData]);

  return (
    <div>
      <h3 style={{ fontSize: 14, marginBottom: theme.spacing.md }}>Column-Level Lineage</h3>

      <div style={{
        padding: theme.spacing.md,
        border: `1px solid ${asciiColors.border}`,
        borderRadius: 2,
        backgroundColor: asciiColors.backgroundSoft,
        marginBottom: theme.spacing.md
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: theme.spacing.md, marginBottom: theme.spacing.md }}>
          <div>
            <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: 12, color: asciiColors.foreground }}>
              Schema *
            </label>
            <input
              type="text"
              value={formData.schema}
              onChange={(e) => setFormData(prev => ({ ...prev, schema: e.target.value }))}
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
              value={formData.table}
              onChange={(e) => setFormData(prev => ({ ...prev, table: e.target.value }))}
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
              Column *
            </label>
            <input
              type="text"
              value={formData.column}
              onChange={(e) => setFormData(prev => ({ ...prev, column: e.target.value }))}
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
        <AsciiButton onClick={handleLoad} disabled={loading || !formData.schema || !formData.table || !formData.column}>
          {loading ? 'Loading...' : 'Load Lineage'}
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

      {loading && <SkeletonLoader />}

      {lineageData.length === 0 && !loading && (
        <div style={{
          padding: theme.spacing.lg,
          border: `1px solid ${asciiColors.border}`,
          borderRadius: 2,
          textAlign: 'center',
          color: asciiColors.muted
        }}>
          No column lineage data available. Load lineage for a column to view dependencies.
        </div>
      )}

      {lineageData.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm }}>
          {lineageData.map((lineage, idx) => (
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
                {lineage.source_schema}.{lineage.source_table}.{lineage.source_column} → 
                {lineage.target_schema}.{lineage.target_table}.{lineage.target_column}
              </div>
              <div style={{ fontSize: 11, color: asciiColors.muted }}>
                Type: {lineage.transformation_type} | Confidence: {(lineage.confidence_score * 100).toFixed(0)}%
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ColumnLineageView;
