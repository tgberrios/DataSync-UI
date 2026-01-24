import React, { useState, useCallback } from 'react';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors } from '../../ui/theme/asciiTheme';
import { theme } from '../../theme/theme';
import { streamProcessingApi, type StatefulState } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';

const StatefulProcessingConfig: React.FC = () => {
  const [searchKey, setSearchKey] = useState('');
  const [state, setState] = useState<StatefulState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!searchKey.trim()) {
      setState(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await streamProcessingApi.getState(searchKey);
      if (response) {
        setState(response);
        setEditValue(JSON.stringify(response.value, null, 2));
      } else {
        setState(null);
      }
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setState(null);
      } else {
        setError(extractApiError(err));
      }
    } finally {
      setLoading(false);
    }
  }, [searchKey]);

  const handleUpdateState = useCallback(async () => {
    if (!searchKey.trim() || !editValue.trim()) {
      setError('Key and value are required');
      return;
    }

    try {
      let parsedValue;
      try {
        parsedValue = JSON.parse(editValue);
      } catch {
        parsedValue = editValue;
      }

      await streamProcessingApi.updateState(searchKey, parsedValue);
      setIsEditing(false);
      await handleSearch();
    } catch (err) {
      setError(extractApiError(err));
    }
  }, [searchKey, editValue, handleSearch]);

  const handleClearState = useCallback(async () => {
    if (!searchKey.trim()) return;
    if (!confirm('Are you sure you want to clear this state?')) return;

    try {
      await streamProcessingApi.clearState(searchKey);
      setState(null);
      setSearchKey('');
      setEditValue('');
    } catch (err) {
      setError(extractApiError(err));
    }
  }, [searchKey]);

  return (
    <div>
      <div style={{ marginBottom: theme.spacing.md }}>
        <h3 style={{ fontSize: 14, marginBottom: theme.spacing.sm }}>Search State</h3>
        <div style={{ display: 'flex', gap: theme.spacing.sm }}>
          <input
            type="text"
            value={searchKey}
            onChange={(e) => setSearchKey(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Enter state key..."
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
          <AsciiButton onClick={handleSearch} disabled={loading || !searchKey.trim()}>
            {loading ? 'Searching...' : 'Search'}
          </AsciiButton>
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

      {state ? (
        <div style={{
          padding: theme.spacing.md,
          border: `1px solid ${asciiColors.border}`,
          borderRadius: 2,
          backgroundColor: asciiColors.backgroundSoft
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md }}>
            <h4 style={{ fontSize: 12, margin: 0 }}>State: {state.key}</h4>
            <div style={{ display: 'flex', gap: theme.spacing.sm }}>
              {!isEditing && (
                <AsciiButton onClick={() => setIsEditing(true)}>
                  Edit
                </AsciiButton>
              )}
              <AsciiButton onClick={handleClearState}>
                Clear
              </AsciiButton>
            </div>
          </div>

          {isEditing ? (
            <div>
              <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: 12, color: asciiColors.foreground }}>
                Value (JSON)
              </label>
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                rows={10}
                style={{
                  width: '100%',
                  padding: theme.spacing.sm,
                  border: `1px solid ${asciiColors.border}`,
                  borderRadius: 2,
                  backgroundColor: asciiColors.background,
                  color: asciiColors.foreground,
                  fontFamily: 'Consolas, monospace',
                  fontSize: 11,
                  resize: 'vertical'
                }}
              />
              <div style={{ display: 'flex', gap: theme.spacing.sm, marginTop: theme.spacing.sm }}>
                <AsciiButton onClick={handleUpdateState}>
                  Save
                </AsciiButton>
                <AsciiButton onClick={() => {
                  setIsEditing(false);
                  setEditValue(JSON.stringify(state.value, null, 2));
                }}>
                  Cancel
                </AsciiButton>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: theme.spacing.sm }}>
                <div style={{ fontSize: 11, color: asciiColors.muted, marginBottom: theme.spacing.xs }}>Value</div>
                <pre style={{
                  padding: theme.spacing.sm,
                  border: `1px solid ${asciiColors.border}`,
                  borderRadius: 2,
                  backgroundColor: asciiColors.background,
                  color: asciiColors.foreground,
                  fontSize: 11,
                  fontFamily: 'Consolas, monospace',
                  overflow: 'auto',
                  maxHeight: '300px'
                }}>
                  {JSON.stringify(state.value, null, 2)}
                </pre>
              </div>
              <div style={{ fontSize: 11, color: asciiColors.muted }}>
                Last Updated: {new Date(state.lastUpdated).toLocaleString()}
              </div>
              <div style={{ fontSize: 11, color: asciiColors.muted }}>
                Update Count: {state.updateCount}
              </div>
            </div>
          )}
        </div>
      ) : searchKey && !loading ? (
        <div style={{
          padding: theme.spacing.lg,
          border: `1px solid ${asciiColors.border}`,
          borderRadius: 2,
          textAlign: 'center',
          color: asciiColors.muted
        }}>
          State not found
        </div>
      ) : null}
    </div>
  );
};

export default StatefulProcessingConfig;
