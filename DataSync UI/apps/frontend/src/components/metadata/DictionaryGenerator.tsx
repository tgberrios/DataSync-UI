import React, { useState, useCallback, useEffect, useRef } from 'react';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors } from '../../ui/theme/asciiTheme';
import { theme } from '../../theme/theme';
import { metadataApi } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import SkeletonLoader from '../shared/SkeletonLoader';

const DictionaryGenerator: React.FC = () => {
  const [formData, setFormData] = useState({
    schema_name: '',
    table_name: '',
    overwrite_existing: false
  });
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!formData.schema_name || !formData.table_name) {
      setError("Schema and table name are required");
      return;
    }

    try {
      setGenerating(true);
      setError(null);
      const data = await metadataApi.generateDictionary({
        schema_name: formData.schema_name,
        table_name: formData.table_name,
        overwrite_existing: formData.overwrite_existing
      });
      if (isMountedRef.current) {
        setResult(data);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(extractApiError(err));
      }
    } finally {
      if (isMountedRef.current) {
        setGenerating(false);
      }
    }
  }, [formData]);

  return (
    <div>
      <h3 style={{ fontSize: 14, marginBottom: theme.spacing.md }}>Data Dictionary Generator</h3>

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
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.xs, fontSize: 12, color: asciiColors.foreground, marginBottom: theme.spacing.md }}>
          <input
            type="checkbox"
            checked={formData.overwrite_existing}
            onChange={(e) => setFormData(prev => ({ ...prev, overwrite_existing: e.target.checked }))}
            style={{ cursor: 'pointer' }}
          />
          Overwrite existing dictionary entries
        </label>
        <AsciiButton onClick={handleGenerate} disabled={generating || !formData.schema_name || !formData.table_name}>
          {generating ? 'Generating...' : 'Generate Dictionary'}
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

      {generating && <SkeletonLoader />}

      {result && !generating && (
        <div style={{
          padding: theme.spacing.md,
          border: `1px solid ${asciiColors.border}`,
          borderRadius: 2,
          backgroundColor: asciiColors.backgroundSoft
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: asciiColors.foreground, marginBottom: theme.spacing.sm }}>
            Generation Complete
          </div>
          <div style={{ fontSize: 11, color: asciiColors.muted }}>
            Entries Created: {result.entries_created || 0}
            {result.entries_updated > 0 && ` | Updated: ${result.entries_updated}`}
            {result.entries_skipped > 0 && ` | Skipped: ${result.entries_skipped}`}
          </div>
        </div>
      )}
    </div>
  );
};

export default DictionaryGenerator;
