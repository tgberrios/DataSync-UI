import React, { useState, useCallback, useEffect } from 'react';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors } from '../../ui/theme/asciiTheme';
import { theme } from '../../theme/theme';
import { bigDataApi, type DistributedProcessingConfig as DistributedConfig, type SparkConfig } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';

interface DistributedProcessingConfigProps {
  config: DistributedConfig | null;
  sparkConfig: SparkConfig | null;
  onUpdate: (config: DistributedConfig) => void;
}

const DistributedProcessingConfig: React.FC<DistributedProcessingConfigProps> = ({ config, sparkConfig, onUpdate }) => {
  const [formData, setFormData] = useState<DistributedConfig>({
    distributedThresholdRows: config?.distributedThresholdRows || 1000000,
    distributedThresholdSizeMB: config?.distributedThresholdSizeMB || 100,
    broadcastJoinThresholdMB: config?.broadcastJoinThresholdMB || 10,
    forceMode: config?.forceMode || 'AUTO',
    complexityScore: config?.complexityScore || 0,
    sparkConfig: config?.sparkConfig || sparkConfig || undefined,
  });

  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [sparkAvailable, setSparkAvailable] = useState(false);

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      distributedThresholdRows: config?.distributedThresholdRows || 1000000,
      distributedThresholdSizeMB: config?.distributedThresholdSizeMB || 100,
      broadcastJoinThresholdMB: config?.broadcastJoinThresholdMB || 10,
      forceMode: config?.forceMode || 'AUTO',
      complexityScore: config?.complexityScore || 0,
      sparkConfig: config?.sparkConfig || sparkConfig || undefined,
    }));
  }, [config, sparkConfig]);

  useEffect(() => {
    const checkSpark = async () => {
      try {
        const stats = await bigDataApi.getDistributedProcessingStats();
        setSparkAvailable(stats.sparkAvailable || false);
      } catch (err: any) {
        // Silently handle 404 - endpoints may not exist yet in backend
        if (err?.response?.status === 404) {
          setSparkAvailable(false);
          return;
        }
        console.warn('Error checking Spark availability:', err);
        setSparkAvailable(false);
      }
    };
    checkSpark();
  }, []);

  const handleInputChange = useCallback((field: keyof DistributedConfig, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setError(null);

    try {
      await bigDataApi.updateDistributedProcessingConfig(formData);
      onUpdate(formData);
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setIsSaving(false);
    }
  }, [formData, onUpdate]);

  return (
    <div>
      <div style={{ marginBottom: theme.spacing.lg }}>
        <h3 style={{
          fontSize: 14,
          fontWeight: 600,
          color: asciiColors.foreground,
          marginBottom: theme.spacing.sm
        }}>
          Processing Mode Selection
        </h3>
        <p style={{
          color: asciiColors.muted,
          fontSize: 12,
          marginBottom: theme.spacing.md
        }}>
          Configure automatic decision between local and distributed processing based on data size and complexity.
        </p>
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

      {!sparkAvailable && (
        <div style={{
          padding: theme.spacing.md,
          border: `1px solid ${asciiColors.border}`,
          borderRadius: 2,
          backgroundColor: asciiColors.backgroundSoft,
          color: asciiColors.foreground,
          marginBottom: theme.spacing.md
        }}>
          Spark is not available. Configure Spark first to enable distributed processing.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
        <div>
          <label style={{
            display: 'block',
            marginBottom: theme.spacing.xs,
            color: asciiColors.foreground,
            fontSize: 12,
            fontWeight: 500
          }}>
            Force Mode
          </label>
          <select
            value={formData.forceMode || 'AUTO'}
            onChange={(e) => handleInputChange('forceMode', e.target.value as 'AUTO' | 'LOCAL_ONLY' | 'DISTRIBUTED_ONLY')}
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
            <option value="AUTO">Auto (Automatic decision)</option>
            <option value="LOCAL_ONLY">Local Only (Force local processing)</option>
            <option value="DISTRIBUTED_ONLY">Distributed Only (Force distributed processing)</option>
          </select>
          <div style={{
            marginTop: theme.spacing.xs,
            fontSize: 11,
            color: asciiColors.muted
          }}>
            {formData.forceMode === 'AUTO' && 'Automatically choose based on thresholds'}
            {formData.forceMode === 'LOCAL_ONLY' && 'Always use local thread pools'}
            {formData.forceMode === 'DISTRIBUTED_ONLY' && 'Always use Spark (if available)'}
          </div>
        </div>

        {formData.forceMode === 'AUTO' && (
          <>
            <div>
              <label style={{
                display: 'block',
                marginBottom: theme.spacing.xs,
                color: asciiColors.foreground,
                fontSize: 12,
                fontWeight: 500
              }}>
                Distributed Threshold (Rows)
              </label>
              <input
                type="number"
                value={formData.distributedThresholdRows || 1000000}
                onChange={(e) => handleInputChange('distributedThresholdRows', parseInt(e.target.value) || 1000000)}
                min="1000"
                step="10000"
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
              <div style={{
                marginTop: theme.spacing.xs,
                fontSize: 11,
                color: asciiColors.muted
              }}>
                Use distributed processing when estimated rows exceed this threshold
              </div>
            </div>

            <div>
              <label style={{
                display: 'block',
                marginBottom: theme.spacing.xs,
                color: asciiColors.foreground,
                fontSize: 12,
                fontWeight: 500
              }}>
                Distributed Threshold (Size MB)
              </label>
              <input
                type="number"
                value={formData.distributedThresholdSizeMB || 100}
                onChange={(e) => handleInputChange('distributedThresholdSizeMB', parseInt(e.target.value) || 100)}
                min="1"
                step="10"
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
              <div style={{
                marginTop: theme.spacing.xs,
                fontSize: 11,
                color: asciiColors.muted
              }}>
                Use distributed processing when estimated size exceeds this threshold (MB)
              </div>
            </div>

            <div>
              <label style={{
                display: 'block',
                marginBottom: theme.spacing.xs,
                color: asciiColors.foreground,
                fontSize: 12,
                fontWeight: 500
              }}>
                Broadcast Join Threshold (MB)
              </label>
              <input
                type="number"
                value={formData.broadcastJoinThresholdMB || 10}
                onChange={(e) => handleInputChange('broadcastJoinThresholdMB', parseInt(e.target.value) || 10)}
                min="1"
                step="1"
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
              <div style={{
                marginTop: theme.spacing.xs,
                fontSize: 11,
                color: asciiColors.muted
              }}>
                Use broadcast join when smaller table size is below this threshold (MB)
              </div>
            </div>
          </>
        )}

        <div style={{
          padding: theme.spacing.md,
          border: `1px solid ${asciiColors.border}`,
          borderRadius: 2,
          backgroundColor: asciiColors.backgroundSoft
        }}>
          <h4 style={{
            fontSize: 12,
            fontWeight: 600,
            color: asciiColors.foreground,
            marginBottom: theme.spacing.xs
          }}>
            Current Configuration Summary
          </h4>
          <div style={{
            fontFamily: 'Consolas, monospace',
            fontSize: 11,
            color: asciiColors.foreground
          }}>
            <div>Mode: {formData.forceMode}</div>
            {formData.forceMode === 'AUTO' && (
              <>
                <div>Row Threshold: {formData.distributedThresholdRows?.toLocaleString()} rows</div>
                <div>Size Threshold: {formData.distributedThresholdSizeMB} MB</div>
                <div>Broadcast Join Threshold: {formData.broadcastJoinThresholdMB} MB</div>
              </>
            )}
            <div>Spark Available: {sparkAvailable ? 'Yes' : 'No'}</div>
          </div>
        </div>
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        marginTop: theme.spacing.xl,
        paddingTop: theme.spacing.md,
        borderTop: `1px solid ${asciiColors.border}`
      }}>
        <AsciiButton onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Configuration'}
        </AsciiButton>
      </div>
    </div>
  );
};

export default DistributedProcessingConfig;
