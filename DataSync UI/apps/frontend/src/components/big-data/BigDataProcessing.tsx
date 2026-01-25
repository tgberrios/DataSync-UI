import React, { useState, useCallback, useRef, useEffect } from 'react';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { theme } from '../../theme/theme';
import SparkConfigModal from './SparkConfigModal';
import DistributedProcessingConfig from './DistributedProcessingConfig';
import PartitioningConfigModal from './PartitioningConfigModal';
import MergeStrategiesConfig from './MergeStrategiesConfig';
import DistributedJobsMonitor from './DistributedJobsMonitor';
import { bigDataApi, type SparkConfig, type DistributedProcessingConfig as DistributedConfig } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import SkeletonLoader from '../shared/SkeletonLoader';

const BigDataProcessing = () => {
  const [activeTab, setActiveTab] = useState<'spark' | 'distributed' | 'partitioning' | 'merge' | 'monitor'>('spark');
  const [sparkConfig, setSparkConfig] = useState<SparkConfig | null>(null);
  const [distributedConfig, setDistributedConfig] = useState<DistributedConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSparkModal, setShowSparkModal] = useState(false);
  const [showPartitioningModal, setShowPartitioningModal] = useState(false);
  const isMountedRef = useRef(true);

  const fetchConfigs = useCallback(async () => {
    if (!isMountedRef.current) return;

    try {
      setLoading(true);
      setError(null);

      const [sparkData, distributedData] = await Promise.all([
        bigDataApi.getSparkConfig().catch((err: any) => {
          // Silently handle 404 - endpoints may not exist yet in backend
          if (err?.response?.status === 404) return null;
          console.warn('Error getting Spark config:', err);
          return null;
        }),
        bigDataApi.getDistributedProcessingConfig().catch((err: any) => {
          // Silently handle 404 - endpoints may not exist yet in backend
          if (err?.response?.status === 404) return null;
          console.warn('Error getting distributed processing config:', err);
          return null;
        }),
      ]);

      if (isMountedRef.current) {
        if (sparkData) setSparkConfig(sparkData.config || sparkData);
        if (distributedData) setDistributedConfig(distributedData.config || distributedData);
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
    fetchConfigs();
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchConfigs]);

  const handleSparkConfigUpdate = useCallback((config: SparkConfig) => {
    setSparkConfig(config);
    fetchConfigs();
  }, [fetchConfigs]);

  const handleDistributedConfigUpdate = useCallback((config: DistributedConfig) => {
    setDistributedConfig(config);
    fetchConfigs();
  }, [fetchConfigs]);

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
            Big Data Processing
          </h1>
          <p style={{ 
            color: asciiColors.muted, 
            fontSize: 12,
            marginBottom: theme.spacing.lg 
          }}>
            Configure and monitor distributed processing, Spark integration, partitioning, and merge strategies.
          </p>
        </div>

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

        <div style={{
          display: 'flex',
          gap: theme.spacing.sm,
          marginBottom: theme.spacing.lg,
          borderBottom: `2px solid ${asciiColors.border}`,
          paddingBottom: theme.spacing.sm
        }}>
          {(['spark', 'distributed', 'partitioning', 'merge', 'monitor'] as const).map((tab) => (
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
              {tab === 'spark' && 'Spark Config'}
              {tab === 'distributed' && 'Distributed Mode'}
              {tab === 'partitioning' && 'Partitioning'}
              {tab === 'merge' && 'Merge Strategies'}
              {tab === 'monitor' && 'Job Monitor'}
            </button>
          ))}
        </div>

        <div style={{ minHeight: '400px' }}>
          {activeTab === 'spark' && (
            <div>
              <div style={{ marginBottom: theme.spacing.md }}>
                <AsciiButton
                  onClick={() => setShowSparkModal(true)}
                  style={{ marginBottom: theme.spacing.md }}
                >
                  {sparkConfig ? 'Edit Spark Configuration' : 'Configure Spark'}
                </AsciiButton>
              </div>
              {sparkConfig && (
                <div style={{
                  padding: theme.spacing.md,
                  border: `1px solid ${asciiColors.border}`,
                  borderRadius: 2,
                  backgroundColor: asciiColors.backgroundSoft
                }}>
                  <h3 style={{ 
                    fontSize: 14, 
                    fontWeight: 600, 
                    color: asciiColors.foreground,
                    marginBottom: theme.spacing.sm 
                  }}>
                    Current Configuration
                  </h3>
                  <div style={{ 
                    fontFamily: 'Consolas, monospace',
                    fontSize: 11,
                    color: asciiColors.foreground
                  }}>
                    <div><strong>Master URL:</strong> {sparkConfig.masterUrl || 'Not set'}</div>
                    <div><strong>App Name:</strong> {sparkConfig.appName || 'Not set'}</div>
                    {sparkConfig.sparkHome && <div><strong>Spark Home:</strong> {sparkConfig.sparkHome}</div>}
                    {sparkConfig.executorMemoryMB && <div><strong>Executor Memory:</strong> {sparkConfig.executorMemoryMB} MB</div>}
                    {sparkConfig.executorCores && <div><strong>Executor Cores:</strong> {sparkConfig.executorCores}</div>}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'distributed' && (
            <DistributedProcessingConfig
              config={distributedConfig}
              sparkConfig={sparkConfig}
              onUpdate={handleDistributedConfigUpdate}
            />
          )}

          {activeTab === 'partitioning' && (
            <div>
              <div style={{ marginBottom: theme.spacing.md }}>
                <AsciiButton
                  onClick={() => setShowPartitioningModal(true)}
                >
                  Configure Partitioning
                </AsciiButton>
              </div>
              <div style={{
                padding: theme.spacing.md,
                border: `1px solid ${asciiColors.border}`,
                borderRadius: 2,
                backgroundColor: asciiColors.backgroundSoft,
                color: asciiColors.muted,
                fontSize: 12
              }}>
                Configure automatic partitioning for tables. Partitioning can be set per table or globally.
              </div>
            </div>
          )}

          {activeTab === 'merge' && (
            <MergeStrategiesConfig />
          )}

          {activeTab === 'monitor' && (
            <DistributedJobsMonitor />
          )}
        </div>
      </AsciiPanel>

      {showSparkModal && (
        <SparkConfigModal
          onClose={() => setShowSparkModal(false)}
          onSave={handleSparkConfigUpdate}
          initialConfig={sparkConfig}
        />
      )}

      {showPartitioningModal && (
        <PartitioningConfigModal
          onClose={() => setShowPartitioningModal(false)}
          onSave={() => {
            setShowPartitioningModal(false);
            fetchConfigs();
          }}
        />
      )}
    </div>
  );
};

export default BigDataProcessing;
