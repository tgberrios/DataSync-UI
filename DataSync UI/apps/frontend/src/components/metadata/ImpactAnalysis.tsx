import React, { useState, useCallback, useEffect, useRef } from 'react';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors } from '../../ui/theme/asciiTheme';
import { theme } from '../../theme/theme';
import { metadataApi } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import SkeletonLoader from '../shared/SkeletonLoader';

const ImpactAnalysis: React.FC = () => {
  const [formData, setFormData] = useState({
    schema_name: '',
    table_name: '',
    column_name: '',
    change_type: 'drop_table'
  });
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!formData.schema_name || !formData.table_name) {
      setError("Schema and table name are required");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await metadataApi.analyzeImpact({
        schema_name: formData.schema_name,
        table_name: formData.table_name,
        column_name: formData.column_name || undefined,
        change_type: formData.change_type
      });
      if (isMountedRef.current) {
        setAnalysisResult(result);
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
      <h3 style={{ fontSize: 14, marginBottom: theme.spacing.md }}>Impact Analysis</h3>

      <div style={{
        padding: theme.spacing.md,
        border: `1px solid ${asciiColors.border}`,
        borderRadius: 2,
        backgroundColor: asciiColors.backgroundSoft,
        marginBottom: theme.spacing.md
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: theme.spacing.md, marginBottom: theme.spacing.md }}>
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
          <div>
            <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: 12, color: asciiColors.foreground }}>
              Column (optional)
            </label>
            <input
              type="text"
              value={formData.column_name}
              onChange={(e) => setFormData(prev => ({ ...prev, column_name: e.target.value }))}
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
              Change Type
            </label>
            <select
              value={formData.change_type}
              onChange={(e) => setFormData(prev => ({ ...prev, change_type: e.target.value }))}
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
              <option value="drop_table">Drop Table</option>
              <option value="rename_table">Rename Table</option>
              <option value="alter_column">Alter Column</option>
              <option value="drop_column">Drop Column</option>
              <option value="add_column">Add Column</option>
            </select>
          </div>
        </div>
        <AsciiButton onClick={handleAnalyze} disabled={loading || !formData.schema_name || !formData.table_name}>
          {loading ? 'Analyzing...' : 'Analyze Impact'}
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

      {analysisResult && !loading && (
        <div style={{
          padding: theme.spacing.md,
          border: `1px solid ${asciiColors.border}`,
          borderRadius: 2,
          backgroundColor: asciiColors.backgroundSoft
        }}>
          <h4 style={{ fontSize: 12, marginBottom: theme.spacing.sm }}>Analysis Results</h4>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: theme.spacing.md, marginBottom: theme.spacing.md }}>
            <div>
              <div style={{ fontSize: 11, color: asciiColors.muted, marginBottom: theme.spacing.xs }}>Downstream Impact</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.foreground }}>
                {analysisResult.downstream_impact?.total_count || 0} resources affected
              </div>
              {analysisResult.downstream_impact?.affected_tables && analysisResult.downstream_impact.affected_tables.length > 0 && (
                <div style={{ fontSize: 11, color: asciiColors.muted, marginTop: theme.spacing.xs }}>
                  Tables: {analysisResult.downstream_impact.affected_tables.join(', ')}
                </div>
              )}
              {analysisResult.downstream_impact?.affected_workflows && analysisResult.downstream_impact.affected_workflows.length > 0 && (
                <div style={{ fontSize: 11, color: asciiColors.muted, marginTop: theme.spacing.xs }}>
                  Workflows: {analysisResult.downstream_impact.affected_workflows.join(', ')}
                </div>
              )}
            </div>
            <div>
              <div style={{ fontSize: 11, color: asciiColors.muted, marginBottom: theme.spacing.xs }}>Upstream Impact</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.foreground }}>
                {analysisResult.upstream_impact?.total_count || 0} dependencies
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImpactAnalysis;
