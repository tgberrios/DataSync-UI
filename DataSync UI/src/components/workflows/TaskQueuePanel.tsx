import React, { useState, useEffect, useCallback } from 'react';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors } from '../../ui/theme/asciiTheme';
import { workflowApi } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';

interface QueuedTask {
  workflow_name: string;
  task_name: string;
  priority: number;
  queued_at: string;
  task_config?: Record<string, unknown>;
}

interface TaskQueuePanelProps {
  onClose?: () => void;
}

const TaskQueuePanel: React.FC<TaskQueuePanelProps> = ({ onClose }) => {
  const [queueSize, setQueueSize] = useState<number>(0);
  const [workerPoolSize, setWorkerPoolSize] = useState<number>(4);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadQueueInfo = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const size = await workflowApi.getTaskQueueSize();
      const poolSize = await workflowApi.getTaskQueueWorkerPoolSize();
      setQueueSize(size);
      setWorkerPoolSize(poolSize);
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQueueInfo();
    const interval = setInterval(loadQueueInfo, 5000);
    return () => clearInterval(interval);
  }, [loadQueueInfo]);

  const handleSetWorkerPoolSize = async (newSize: number) => {
    try {
      await workflowApi.setTaskQueueWorkerPoolSize(newSize);
      setWorkerPoolSize(newSize);
      loadQueueInfo();
    } catch (err) {
      setError(extractApiError(err));
    }
  };

  return (
    <AsciiPanel
      title="TASK QUEUE"
      onClose={onClose}
      style={{ width: '600px', maxWidth: '90vw' }}
    >
      <div style={{ padding: 16, fontFamily: 'Consolas', fontSize: 12 }}>
        {error && (
          <div style={{
            padding: 12,
            marginBottom: 16,
            backgroundColor: asciiColors.danger + '20',
            border: `1px solid ${asciiColors.danger}`,
            color: asciiColors.danger,
            borderRadius: 2,
          }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ padding: 20, textAlign: 'center', color: asciiColors.muted }}>
            Loading queue information...
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ padding: 12, backgroundColor: asciiColors.backgroundSoft, borderRadius: 2 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ color: asciiColors.foreground, fontWeight: 600 }}>Queue Size:</span>
                <span style={{ color: asciiColors.accent, fontSize: 16, fontWeight: 600 }}>{queueSize}</span>
              </div>
              <div style={{ fontSize: 11, color: asciiColors.muted }}>
                Tasks waiting to be processed
              </div>
            </div>

            <div style={{ padding: 12, backgroundColor: asciiColors.backgroundSoft, borderRadius: 2 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ color: asciiColors.foreground, fontWeight: 600 }}>Active Workers:</span>
                <span style={{ color: asciiColors.success, fontSize: 16, fontWeight: 600 }}>{workerPoolSize}</span>
              </div>
              <div style={{ fontSize: 11, color: asciiColors.muted, marginBottom: 12 }}>
                Number of worker threads processing tasks
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[1, 2, 4, 8, 16].map((size) => (
                  <AsciiButton
                    key={size}
                    label={`${size}`}
                    onClick={() => handleSetWorkerPoolSize(size)}
                    variant={workerPoolSize === size ? 'primary' : 'ghost'}
                    disabled={loading}
                  />
                ))}
              </div>
            </div>

            <div style={{ padding: 12, backgroundColor: asciiColors.warning + '20', borderRadius: 2, fontSize: 11, color: asciiColors.warning }}>
              Note: Task queue information refreshes every 5 seconds. Worker pool size changes take effect immediately.
            </div>
          </div>
        )}

        {onClose && (
          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', borderTop: `1px solid ${asciiColors.border}`, paddingTop: 16 }}>
            <AsciiButton
              label="Close"
              onClick={onClose}
              variant="ghost"
            />
          </div>
        )}
      </div>
    </AsciiPanel>
  );
};

export default TaskQueuePanel;
