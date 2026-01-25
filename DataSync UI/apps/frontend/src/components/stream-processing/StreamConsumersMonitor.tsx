import React, { useState, useCallback, useEffect, useRef } from 'react';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors } from '../../ui/theme/asciiTheme';
import { theme } from '../../theme/theme';
import { streamProcessingApi, type Consumer } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import SkeletonLoader from '../shared/SkeletonLoader';

const StreamConsumersMonitor: React.FC = () => {
  const [consumers, setConsumers] = useState<Consumer[]>([]);
  const [selectedConsumer, setSelectedConsumer] = useState<Consumer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [showStats, setShowStats] = useState(false);
  const isMountedRef = useRef(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchConsumers = useCallback(async () => {
    if (!isMountedRef.current) return;

    try {
      setError(null);
      const response = await streamProcessingApi.getConsumers();
      if (isMountedRef.current) {
        setConsumers(response || []);
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        if (err?.response?.status === 404) {
          setConsumers([]);
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
    fetchConsumers();

    refreshIntervalRef.current = setInterval(() => {
      fetchConsumers();
    }, 5000);

    return () => {
      isMountedRef.current = false;
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [fetchConsumers]);

  const handleConsumerSelect = useCallback((consumer: Consumer) => {
    setSelectedConsumer(consumer);
    setShowStats(false);
    setStats(null);
  }, []);

  const handleViewStats = useCallback(async (consumerId: string) => {
    try {
      const response = await streamProcessingApi.getConsumerStats(consumerId);
      setStats(response);
      setShowStats(true);
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setStats({ message: 'Stats not available - endpoint not implemented yet' });
        setShowStats(true);
        return;
      }
      setError(extractApiError(err));
    }
  }, []);

  const handleStopConsumer = useCallback(async (consumerId: string) => {
    if (!confirm('Are you sure you want to stop this consumer?')) {
      return;
    }

    try {
      await streamProcessingApi.stopConsumer(consumerId);
      await fetchConsumers();
      if (selectedConsumer?.consumerId === consumerId) {
        setSelectedConsumer(null);
      }
    } catch (err) {
      setError(extractApiError(err));
    }
  }, [selectedConsumer, fetchConsumers]);

  const formatDuration = useCallback((startedAt: string) => {
    const start = new Date(startedAt);
    const now = new Date();
    const diff = now.getTime() - start.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }, []);

  if (loading) {
    return <SkeletonLoader />;
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.spacing.lg }}>
        <div>
          <h3 style={{ fontSize: 14, marginBottom: theme.spacing.md }}>Active Consumers</h3>
          {consumers.length === 0 ? (
            <div style={{
              padding: theme.spacing.lg,
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2,
              textAlign: 'center',
              color: asciiColors.muted
            }}>
              No active consumers
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm }}>
              {consumers.map((consumer) => (
                <div
                  key={consumer.consumerId}
                  onClick={() => handleConsumerSelect(consumer)}
                  style={{
                    padding: theme.spacing.md,
                    border: `1px solid ${selectedConsumer?.consumerId === consumer.consumerId ? asciiColors.accent : asciiColors.border}`,
                    borderRadius: 2,
                    backgroundColor: selectedConsumer?.consumerId === consumer.consumerId ? asciiColors.backgroundSoft : asciiColors.background,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: theme.spacing.xs }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: asciiColors.foreground, marginBottom: theme.spacing.xs }}>
                        {consumer.consumerName || consumer.consumerId}
                      </div>
                      <div style={{ fontSize: 11, color: asciiColors.muted }}>
                        Group: {consumer.consumerGroup || 'N/A'}
                      </div>
                    </div>
                    <div style={{
                      padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
                      border: `1px solid ${consumer.status === 'ACTIVE' ? asciiColors.accent : asciiColors.border}`,
                      borderRadius: 2,
                      backgroundColor: consumer.status === 'ACTIVE' ? asciiColors.accent : 'transparent',
                      color: consumer.status === 'ACTIVE' ? '#ffffff' : asciiColors.foreground,
                      fontSize: 10,
                      textTransform: 'uppercase'
                    }}>
                      {consumer.status}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: asciiColors.muted, marginTop: theme.spacing.xs }}>
                    Started: {new Date(consumer.startedAt).toLocaleString()} ({formatDuration(consumer.startedAt)} ago)
                  </div>
                  {consumer.errorMessage && (
                    <div style={{ fontSize: 11, color: '#ff4444', marginTop: theme.spacing.xs }}>
                      Error: {consumer.errorMessage}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedConsumer && (
          <div>
            <h3 style={{ fontSize: 14, marginBottom: theme.spacing.md }}>Consumer Details</h3>
            <div style={{
              padding: theme.spacing.md,
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2,
              backgroundColor: asciiColors.backgroundSoft
            }}>
              <div style={{ marginBottom: theme.spacing.sm }}>
                <div style={{ fontSize: 11, color: asciiColors.muted, marginBottom: theme.spacing.xs }}>Consumer ID</div>
                <div style={{ fontSize: 12, color: asciiColors.foreground, fontFamily: 'Consolas, monospace' }}>
                  {selectedConsumer.consumerId}
                </div>
              </div>
              <div style={{ marginBottom: theme.spacing.sm }}>
                <div style={{ fontSize: 11, color: asciiColors.muted, marginBottom: theme.spacing.xs }}>Consumer Group</div>
                <div style={{ fontSize: 12, color: asciiColors.foreground }}>
                  {selectedConsumer.consumerGroup || 'N/A'}
                </div>
              </div>
              <div style={{ marginBottom: theme.spacing.sm }}>
                <div style={{ fontSize: 11, color: asciiColors.muted, marginBottom: theme.spacing.xs }}>Consumer Name</div>
                <div style={{ fontSize: 12, color: asciiColors.foreground }}>
                  {selectedConsumer.consumerName || 'N/A'}
                </div>
              </div>
              <div style={{ marginBottom: theme.spacing.sm }}>
                <div style={{ fontSize: 11, color: asciiColors.muted, marginBottom: theme.spacing.xs }}>Status</div>
                <div style={{ fontSize: 12, color: asciiColors.foreground, textTransform: 'uppercase' }}>
                  {selectedConsumer.status}
                </div>
              </div>
              <div style={{ marginBottom: theme.spacing.sm }}>
                <div style={{ fontSize: 11, color: asciiColors.muted, marginBottom: theme.spacing.xs }}>Started At</div>
                <div style={{ fontSize: 12, color: asciiColors.foreground }}>
                  {new Date(selectedConsumer.startedAt).toLocaleString()}
                </div>
              </div>
              {selectedConsumer.stoppedAt && (
                <div style={{ marginBottom: theme.spacing.sm }}>
                  <div style={{ fontSize: 11, color: asciiColors.muted, marginBottom: theme.spacing.xs }}>Stopped At</div>
                  <div style={{ fontSize: 12, color: asciiColors.foreground }}>
                    {new Date(selectedConsumer.stoppedAt).toLocaleString()}
                  </div>
                </div>
              )}
              {selectedConsumer.errorMessage && (
                <div style={{ marginBottom: theme.spacing.sm }}>
                  <div style={{ fontSize: 11, color: asciiColors.muted, marginBottom: theme.spacing.xs }}>Error</div>
                  <div style={{ fontSize: 12, color: '#ff4444' }}>
                    {selectedConsumer.errorMessage}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
                <AsciiButton onClick={() => handleViewStats(selectedConsumer.consumerId)}>
                  View Stats
                </AsciiButton>
                {selectedConsumer.status === 'ACTIVE' && (
                  <AsciiButton onClick={() => handleStopConsumer(selectedConsumer.consumerId)}>
                    Stop Consumer
                  </AsciiButton>
                )}
              </div>
            </div>

            {showStats && stats && (
              <div style={{
                marginTop: theme.spacing.md,
                padding: theme.spacing.md,
                border: `1px solid ${asciiColors.border}`,
                borderRadius: 2,
                backgroundColor: asciiColors.backgroundSoft
              }}>
                <h4 style={{ fontSize: 12, marginBottom: theme.spacing.sm }}>Statistics</h4>
                {stats.message ? (
                  <div style={{ fontSize: 11, color: asciiColors.muted }}>{stats.message}</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.xs }}>
                    <div style={{ fontSize: 11, color: asciiColors.foreground }}>
                      Messages Processed: {stats.messagesProcessed || 0}
                    </div>
                    <div style={{ fontSize: 11, color: asciiColors.foreground }}>
                      Messages Failed: {stats.messagesFailed || 0}
                    </div>
                    <div style={{ fontSize: 11, color: asciiColors.foreground }}>
                      Bytes Processed: {stats.bytesProcessed || 0}
                    </div>
                    <div style={{ fontSize: 11, color: asciiColors.foreground }}>
                      Average Latency: {stats.averageLatencyMs || 0}ms
                    </div>
                    <div style={{ fontSize: 11, color: asciiColors.foreground }}>
                      Errors: {stats.errors || 0}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StreamConsumersMonitor;
