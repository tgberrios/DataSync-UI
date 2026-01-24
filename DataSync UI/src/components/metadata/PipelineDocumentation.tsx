import React, { useState, useCallback, useEffect, useRef } from 'react';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors } from '../../ui/theme/asciiTheme';
import { theme } from '../../theme/theme';
import { metadataApi } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import SkeletonLoader from '../shared/SkeletonLoader';

const PipelineDocumentation: React.FC = () => {
  const [workflowName, setWorkflowName] = useState('');
  const [format, setFormat] = useState<'markdown' | 'html' | 'json'>('markdown');
  const [documentation, setDocumentation] = useState<string>('');
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
    if (!workflowName) {
      setError("Workflow name is required");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await metadataApi.getPipelineDocumentation(workflowName, format);
      if (isMountedRef.current) {
        setDocumentation(data.documentation || '');
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
  }, [workflowName, format]);

  const handleGenerate = useCallback(async () => {
    if (!workflowName) {
      setError("Workflow name is required");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await metadataApi.generatePipelineDocumentation({
        workflow_name: workflowName,
        format: format
      });
      await handleLoad();
    } catch (err) {
      if (isMountedRef.current) {
        setError(extractApiError(err));
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [workflowName, format, handleLoad]);

  return (
    <div>
      <h3 style={{ fontSize: 14, marginBottom: theme.spacing.md }}>Pipeline Documentation</h3>

      <div style={{
        padding: theme.spacing.md,
        border: `1px solid ${asciiColors.border}`,
        borderRadius: 2,
        backgroundColor: asciiColors.backgroundSoft,
        marginBottom: theme.spacing.md
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: theme.spacing.md, alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: 12, color: asciiColors.foreground }}>
              Workflow Name *
            </label>
            <input
              type="text"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
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
              Format
            </label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as 'markdown' | 'html' | 'json')}
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
              <option value="markdown">Markdown</option>
              <option value="html">HTML</option>
              <option value="json">JSON</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: theme.spacing.sm }}>
            <AsciiButton onClick={handleLoad} disabled={loading || !workflowName}>
              Load
            </AsciiButton>
            <AsciiButton onClick={handleGenerate} disabled={loading || !workflowName}>
              Generate
            </AsciiButton>
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

      {loading && <SkeletonLoader />}

      {documentation && !loading && (
        <div style={{
          padding: theme.spacing.md,
          border: `1px solid ${asciiColors.border}`,
          borderRadius: 2,
          backgroundColor: asciiColors.background,
          maxHeight: '600px',
          overflow: 'auto'
        }}>
          <pre style={{
            margin: 0,
            fontFamily: 'Consolas, monospace',
            fontSize: 11,
            color: asciiColors.foreground,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}>
            {documentation}
          </pre>
        </div>
      )}
    </div>
  );
};

export default PipelineDocumentation;
