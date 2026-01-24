import React, { useState, useCallback, useEffect, useRef } from 'react';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors } from '../../ui/theme/asciiTheme';
import { theme } from '../../theme/theme';
import { streamProcessingApi, type WindowConfig } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import SkeletonLoader from '../shared/SkeletonLoader';

const WindowingConfig: React.FC = () => {
  const [windows, setWindows] = useState<WindowConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState<Partial<WindowConfig>>({
    windowType: 'TUMBLING',
    windowSizeSeconds: 60,
    slideIntervalSeconds: 60,
    sessionTimeoutSeconds: 300
  });
  const isMountedRef = useRef(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchWindows = useCallback(async () => {
    if (!isMountedRef.current) return;

    try {
      setError(null);
      const response = await streamProcessingApi.getWindows();
      if (isMountedRef.current) {
        setWindows(response || []);
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        if (err?.response?.status === 404) {
          setWindows([]);
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
    fetchWindows();

    refreshIntervalRef.current = setInterval(() => {
      fetchWindows();
    }, 10000);

    return () => {
      isMountedRef.current = false;
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [fetchWindows]);

  const handleCreateWindow = useCallback(async () => {
    try {
      await streamProcessingApi.createWindow(formData as WindowConfig);
      setShowCreateModal(false);
      setFormData({
        windowType: 'TUMBLING',
        windowSizeSeconds: 60,
        slideIntervalSeconds: 60,
        sessionTimeoutSeconds: 300
      });
      await fetchWindows();
    } catch (err) {
      setError(extractApiError(err));
    }
  }, [formData, fetchWindows]);

  if (loading) {
    return <SkeletonLoader />;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md }}>
        <h3 style={{ fontSize: 14 }}>Active Windows</h3>
        <AsciiButton onClick={() => setShowCreateModal(true)}>
          Create Window
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

      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: asciiColors.background,
            border: `2px solid ${asciiColors.border}`,
            borderRadius: 2,
            padding: theme.spacing.xl,
            maxWidth: '600px',
            width: '100%'
          }}>
            <h3 style={{ fontSize: 14, marginBottom: theme.spacing.md }}>Create Window</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
              <div>
                <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: 12, color: asciiColors.foreground }}>
                  Window Type *
                </label>
                <select
                  value={formData.windowType || 'TUMBLING'}
                  onChange={(e) => setFormData(prev => ({ ...prev, windowType: e.target.value as any }))}
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
                  <option value="TUMBLING">Tumbling</option>
                  <option value="SLIDING">Sliding</option>
                  <option value="SESSION">Session</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: 12, color: asciiColors.foreground }}>
                  Window Size (seconds) *
                </label>
                <input
                  type="number"
                  value={formData.windowSizeSeconds || 60}
                  onChange={(e) => setFormData(prev => ({ ...prev, windowSizeSeconds: parseInt(e.target.value) || 60 }))}
                  min="1"
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

              {formData.windowType === 'SLIDING' && (
                <div>
                  <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: 12, color: asciiColors.foreground }}>
                    Slide Interval (seconds)
                  </label>
                  <input
                    type="number"
                    value={formData.slideIntervalSeconds || 60}
                    onChange={(e) => setFormData(prev => ({ ...prev, slideIntervalSeconds: parseInt(e.target.value) || 60 }))}
                    min="1"
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
              )}

              {formData.windowType === 'SESSION' && (
                <div>
                  <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: 12, color: asciiColors.foreground }}>
                    Session Timeout (seconds)
                  </label>
                  <input
                    type="number"
                    value={formData.sessionTimeoutSeconds || 300}
                    onChange={(e) => setFormData(prev => ({ ...prev, sessionTimeoutSeconds: parseInt(e.target.value) || 300 }))}
                    min="1"
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
              )}

              <div style={{ display: 'flex', gap: theme.spacing.sm, justifyContent: 'flex-end', marginTop: theme.spacing.md }}>
                <AsciiButton onClick={() => setShowCreateModal(false)}>
                  Cancel
                </AsciiButton>
                <AsciiButton onClick={handleCreateWindow}>
                  Create
                </AsciiButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {windows.length === 0 ? (
        <div style={{
          padding: theme.spacing.lg,
          border: `1px solid ${asciiColors.border}`,
          borderRadius: 2,
          textAlign: 'center',
          color: asciiColors.muted
        }}>
          No active windows
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm }}>
          {windows.map((window) => (
            <div
              key={window.windowId}
              style={{
                padding: theme.spacing.md,
                border: `1px solid ${asciiColors.border}`,
                borderRadius: 2,
                backgroundColor: asciiColors.backgroundSoft
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: theme.spacing.xs }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: asciiColors.foreground, marginBottom: theme.spacing.xs }}>
                    {window.windowId}
                  </div>
                  <div style={{ fontSize: 11, color: asciiColors.muted }}>
                    Type: {window.windowType} | Size: {window.windowSizeSeconds}s
                    {window.slideIntervalSeconds && ` | Slide: ${window.slideIntervalSeconds}s`}
                    {window.sessionTimeoutSeconds && ` | Timeout: ${window.sessionTimeoutSeconds}s`}
                  </div>
                </div>
                <div style={{
                  padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
                  border: `1px solid ${window.isClosed ? asciiColors.border : asciiColors.accent}`,
                  borderRadius: 2,
                  backgroundColor: window.isClosed ? 'transparent' : asciiColors.accent,
                  color: window.isClosed ? asciiColors.foreground : '#ffffff',
                  fontSize: 10,
                  textTransform: 'uppercase'
                }}>
                  {window.isClosed ? 'Closed' : 'Active'}
                </div>
              </div>
              {window.startTime && (
                <div style={{ fontSize: 11, color: asciiColors.muted, marginTop: theme.spacing.xs }}>
                  Start: {new Date(window.startTime).toLocaleString()}
                  {window.endTime && ` | End: ${new Date(window.endTime).toLocaleString()}`}
                </div>
              )}
              <div style={{ fontSize: 11, color: asciiColors.muted, marginTop: theme.spacing.xs }}>
                Events: {window.eventCount || 0}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WindowingConfig;
