import React, { useState, useCallback, useRef, useEffect } from 'react';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { theme } from '../../theme/theme';
import StreamConfigModal from './StreamConfigModal';
import StreamConsumersMonitor from './StreamConsumersMonitor';
import WindowingConfig from './WindowingConfig';
import StatefulProcessingConfig from './StatefulProcessingConfig';
import CEPRulesConfig from './CEPRulesConfig';
import NativeCDCConfig from './NativeCDCConfig';
import StreamMonitor from './StreamMonitor';
import { streamProcessingApi, type StreamConfig } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import SkeletonLoader from '../shared/SkeletonLoader';

const StreamProcessing = () => {
  const [activeTab, setActiveTab] = useState<'config' | 'consumers' | 'windowing' | 'stateful' | 'cep' | 'cdc' | 'monitor'>('config');
  const [streamConfig, setStreamConfig] = useState<StreamConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showStreamConfigModal, setShowStreamConfigModal] = useState(false);
  const isMountedRef = useRef(true);

  const fetchConfig = useCallback(async () => {
    if (!isMountedRef.current) return;

    try {
      setLoading(true);
      setError(null);

      const config = await streamProcessingApi.getStreamConfig().catch((err: any) => {
        if (err?.response?.status === 404) return null;
        console.warn('Error getting stream config:', err);
        return null;
      });

      if (isMountedRef.current) {
        if (config) setStreamConfig(config);
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
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    fetchConfig();
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchConfig]);

  const handleStreamConfigUpdate = useCallback((config: StreamConfig) => {
    setStreamConfig(config);
    fetchConfig();
  }, [fetchConfig]);

  if (loading) {
    return <SkeletonLoader />;
  }

  return (
    <div style={{ padding: theme.spacing.lg }}>
      <AsciiPanel>
        <div style={{ marginBottom: theme.spacing.lg }}>
          <h1 style={{ 
            fontSize: 18, 
            fontWeight: 600, 
            color: asciiColors.foreground,
            marginBottom: theme.spacing.md 
          }}>
            Stream Processing
          </h1>
          <p style={{ 
            color: asciiColors.muted, 
            fontSize: 12,
            marginBottom: theme.spacing.lg 
          }}>
            Configure and monitor real-time stream processing with Kafka, RabbitMQ, and Redis Streams
          </p>

          {error && (
            <div style={{
              padding: theme.spacing.md,
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2,
              backgroundColor: asciiColors.backgroundSoft,
              color: asciiColors.foreground,
              marginBottom: theme.spacing.lg
            }}>
              {error}
            </div>
          )}

          {/* Tabs */}
          <div style={{
            display: 'flex',
            gap: theme.spacing.sm,
            marginBottom: theme.spacing.lg,
            borderBottom: `2px solid ${asciiColors.border}`,
            paddingBottom: theme.spacing.sm
          }}>
            {(['config', 'consumers', 'windowing', 'stateful', 'cep', 'cdc', 'monitor'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                  border: 'none',
                  background: activeTab === tab ? asciiColors.accent : 'transparent',
                  color: activeTab === tab ? '#ffffff' : asciiColors.foreground,
                  borderRadius: `${2} ${2} 0 0`,
                  cursor: 'pointer',
                  fontWeight: activeTab === tab ? 600 : 500,
                  transition: 'all 0.15s ease',
                  textTransform: 'capitalize',
                  fontFamily: 'Consolas, monospace',
                  fontSize: 12
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== tab) {
                    e.currentTarget.style.background = asciiColors.backgroundSoft;
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== tab) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                {tab === 'config' && 'Stream Config'}
                {tab === 'consumers' && 'Consumers'}
                {tab === 'windowing' && 'Windowing'}
                {tab === 'stateful' && 'Stateful'}
                {tab === 'cep' && 'CEP Rules'}
                {tab === 'cdc' && 'Native CDC'}
                {tab === 'monitor' && 'Monitor'}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div style={{ minHeight: '400px' }}>
            {activeTab === 'config' && (
              <div>
                <div style={{ marginBottom: theme.spacing.md }}>
                  <AsciiButton
                    onClick={() => setShowStreamConfigModal(true)}
                    style={{ marginBottom: theme.spacing.md }}
                  >
                    {streamConfig ? 'Edit Stream Configuration' : 'Configure Stream'}
                  </AsciiButton>
                </div>
                {streamConfig && (
                  <div style={{
                    padding: theme.spacing.md,
                    border: `1px solid ${asciiColors.border}`,
                    borderRadius: 2,
                    backgroundColor: asciiColors.backgroundSoft
                  }}>
                    <div style={{ fontSize: 12, color: asciiColors.foreground, marginBottom: theme.spacing.xs }}>
                      Type: {streamConfig.streamType}
                    </div>
                    {streamConfig.topic && (
                      <div style={{ fontSize: 12, color: asciiColors.foreground, marginBottom: theme.spacing.xs }}>
                        Topic: {streamConfig.topic}
                      </div>
                    )}
                    {streamConfig.queue && (
                      <div style={{ fontSize: 12, color: asciiColors.foreground, marginBottom: theme.spacing.xs }}>
                        Queue: {streamConfig.queue}
                      </div>
                    )}
                    {streamConfig.stream && (
                      <div style={{ fontSize: 12, color: asciiColors.foreground, marginBottom: theme.spacing.xs }}>
                        Stream: {streamConfig.stream}
                      </div>
                    )}
                    <div style={{ fontSize: 12, color: asciiColors.foreground, marginBottom: theme.spacing.xs }}>
                      Consumer Group: {streamConfig.consumerGroup || 'N/A'}
                    </div>
                    <div style={{ fontSize: 12, color: asciiColors.foreground }}>
                      Serialization: {streamConfig.serializationFormat}
                    </div>
                  </div>
                )}
              </div>
            )}
            {activeTab === 'consumers' && <StreamConsumersMonitor />}
            {activeTab === 'windowing' && <WindowingConfig />}
            {activeTab === 'stateful' && <StatefulProcessingConfig />}
            {activeTab === 'cep' && <CEPRulesConfig />}
            {activeTab === 'cdc' && <NativeCDCConfig />}
            {activeTab === 'monitor' && <StreamMonitor />}
          </div>

          {showStreamConfigModal && (
            <StreamConfigModal
              onClose={() => setShowStreamConfigModal(false)}
              onSave={handleStreamConfigUpdate}
              initialConfig={streamConfig}
            />
          )}
        </div>
      </AsciiPanel>
    </div>
  );
};

export default StreamProcessing;
