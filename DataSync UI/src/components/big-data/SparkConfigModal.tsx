import React, { useState, useCallback } from 'react';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { theme } from '../../theme/theme';
import { bigDataApi, type SparkConfig } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';

interface SparkConfigModalProps {
  onClose: () => void;
  onSave: (config: SparkConfig) => void;
  initialConfig?: SparkConfig | null;
}

const SparkConfigModal: React.FC<SparkConfigModalProps> = ({ onClose, onSave, initialConfig }) => {
  const [formData, setFormData] = useState<SparkConfig>({
    masterUrl: initialConfig?.masterUrl || 'local[*]',
    appName: initialConfig?.appName || 'DataSync',
    sparkHome: initialConfig?.sparkHome || '',
    connectUrl: initialConfig?.connectUrl || '',
    executorMemoryMB: initialConfig?.executorMemoryMB || 2048,
    executorCores: initialConfig?.executorCores || 2,
    maxRetries: initialConfig?.maxRetries || 3,
    retryDelaySeconds: initialConfig?.retryDelaySeconds || 5,
    sparkConf: initialConfig?.sparkConf || {},
  });

  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [customConfigKey, setCustomConfigKey] = useState('');
  const [customConfigValue, setCustomConfigValue] = useState('');

  const handleInputChange = useCallback((field: keyof SparkConfig, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
    setTestResult(null);
  }, []);

  const handleAddCustomConfig = useCallback(() => {
    if (!customConfigKey.trim() || !customConfigValue.trim()) return;
    
    setFormData(prev => ({
      ...prev,
      sparkConf: {
        ...prev.sparkConf,
        [customConfigKey.trim()]: customConfigValue.trim()
      }
    }));
    setCustomConfigKey('');
    setCustomConfigValue('');
  }, [customConfigKey, customConfigValue]);

  const handleRemoveCustomConfig = useCallback((key: string) => {
    setFormData(prev => {
      const newConf = { ...prev.sparkConf };
      delete newConf![key];
      return { ...prev, sparkConf: newConf };
    });
  }, []);

  const handleTestConnection = useCallback(async () => {
    setIsTesting(true);
    setTestResult(null);
    setError(null);

    try {
      const result = await bigDataApi.testSparkConnection(formData);
      setTestResult({ success: result.success || false, message: result.message || 'Connection test completed' });
    } catch (err) {
      setTestResult({ success: false, message: extractApiError(err) });
    } finally {
      setIsTesting(false);
    }
  }, [formData]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setError(null);

    try {
      await bigDataApi.updateSparkConfig(formData);
      onSave(formData);
      onClose();
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setIsSaving(false);
    }
  }, [formData, onSave, onClose]);

  return (
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
      zIndex: 1000,
      padding: theme.spacing.lg
    }}>
      <div style={{
        backgroundColor: asciiColors.background,
        border: `2px solid ${asciiColors.border}`,
        borderRadius: 2,
        padding: theme.spacing.xl,
        maxWidth: '800px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: theme.shadows.lg
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: theme.spacing.lg,
          borderBottom: `1px solid ${asciiColors.border}`,
          paddingBottom: theme.spacing.md
        }}>
          <h2 style={{
            fontSize: 18,
            fontWeight: 600,
            color: asciiColors.foreground,
            margin: 0
          }}>
            Spark Configuration
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: asciiColors.foreground,
              cursor: 'pointer',
              fontSize: 20,
              padding: theme.spacing.xs,
              lineHeight: 1
            }}
            aria-label="Close"
          >
            {ascii.cross}
          </button>
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

        {testResult && (
          <div style={{
            padding: theme.spacing.md,
            border: `1px solid ${testResult.success ? asciiColors.accent : asciiColors.border}`,
            borderRadius: 2,
            backgroundColor: asciiColors.backgroundSoft,
            color: asciiColors.foreground,
            marginBottom: theme.spacing.md
          }}>
            {testResult.success ? `${ascii.checkmark} ` : `${ascii.cross} `}
            {testResult.message}
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
              Master URL *
            </label>
            <input
              type="text"
              value={formData.masterUrl}
              onChange={(e) => handleInputChange('masterUrl', e.target.value)}
              placeholder="local[*], spark://host:port, yarn, etc."
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
              Examples: local[*], spark://master:7077, yarn, mesos://master:5050
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
              Application Name *
            </label>
            <input
              type="text"
              value={formData.appName}
              onChange={(e) => handleInputChange('appName', e.target.value)}
              placeholder="DataSync"
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
            <label style={{
              display: 'block',
              marginBottom: theme.spacing.xs,
              color: asciiColors.foreground,
              fontSize: 12,
              fontWeight: 500
            }}>
              Spark Home (Optional)
            </label>
            <input
              type="text"
              value={formData.sparkHome || ''}
              onChange={(e) => handleInputChange('sparkHome', e.target.value)}
              placeholder="/opt/spark"
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
            <label style={{
              display: 'block',
              marginBottom: theme.spacing.xs,
              color: asciiColors.foreground,
              fontSize: 12,
              fontWeight: 500
            }}>
              Spark Connect URL (Optional)
            </label>
            <input
              type="text"
              value={formData.connectUrl || ''}
              onChange={(e) => handleInputChange('connectUrl', e.target.value)}
              placeholder="sc://localhost:15002"
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.spacing.md }}>
            <div>
              <label style={{
                display: 'block',
                marginBottom: theme.spacing.xs,
                color: asciiColors.foreground,
                fontSize: 12,
                fontWeight: 500
              }}>
                Executor Memory (MB)
              </label>
              <input
                type="number"
                value={formData.executorMemoryMB || 2048}
                onChange={(e) => handleInputChange('executorMemoryMB', parseInt(e.target.value) || 2048)}
                min="512"
                step="256"
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
              <label style={{
                display: 'block',
                marginBottom: theme.spacing.xs,
                color: asciiColors.foreground,
                fontSize: 12,
                fontWeight: 500
              }}>
                Executor Cores
              </label>
              <input
                type="number"
                value={formData.executorCores || 2}
                onChange={(e) => handleInputChange('executorCores', parseInt(e.target.value) || 2)}
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
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.spacing.md }}>
            <div>
              <label style={{
                display: 'block',
                marginBottom: theme.spacing.xs,
                color: asciiColors.foreground,
                fontSize: 12,
                fontWeight: 500
              }}>
                Max Retries
              </label>
              <input
                type="number"
                value={formData.maxRetries || 3}
                onChange={(e) => handleInputChange('maxRetries', parseInt(e.target.value) || 3)}
                min="0"
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
            </div>

            <div>
              <label style={{
                display: 'block',
                marginBottom: theme.spacing.xs,
                color: asciiColors.foreground,
                fontSize: 12,
                fontWeight: 500
              }}>
                Retry Delay (seconds)
              </label>
              <input
                type="number"
                value={formData.retryDelaySeconds || 5}
                onChange={(e) => handleInputChange('retryDelaySeconds', parseInt(e.target.value) || 5)}
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
              Custom Spark Configuration
            </label>
            <div style={{ display: 'flex', gap: theme.spacing.xs, marginBottom: theme.spacing.sm }}>
              <input
                type="text"
                value={customConfigKey}
                onChange={(e) => setCustomConfigKey(e.target.value)}
                placeholder="spark.sql.shuffle.partitions"
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
              <input
                type="text"
                value={customConfigValue}
                onChange={(e) => setCustomConfigValue(e.target.value)}
                placeholder="200"
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
              <AsciiButton onClick={handleAddCustomConfig} disabled={!customConfigKey.trim() || !customConfigValue.trim()}>
                Add
              </AsciiButton>
            </div>
            {formData.sparkConf && Object.keys(formData.sparkConf).length > 0 && (
              <div style={{
                padding: theme.spacing.sm,
                border: `1px solid ${asciiColors.border}`,
                borderRadius: 2,
                backgroundColor: asciiColors.backgroundSoft
              }}>
                {Object.entries(formData.sparkConf).map(([key, value]) => (
                  <div key={key} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: theme.spacing.xs,
                    marginBottom: theme.spacing.xs
                  }}>
                    <span style={{
                      fontFamily: 'Consolas, monospace',
                      fontSize: 11,
                      color: asciiColors.foreground
                    }}>
                      {key} = {value}
                    </span>
                    <button
                      onClick={() => handleRemoveCustomConfig(key)}
                      style={{
                        background: 'transparent',
                        border: `1px solid ${asciiColors.border}`,
                        color: asciiColors.foreground,
                        cursor: 'pointer',
                        padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                        borderRadius: 2,
                        fontSize: 11,
                        fontFamily: 'Consolas, monospace'
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: theme.spacing.md,
          marginTop: theme.spacing.xl,
          paddingTop: theme.spacing.md,
          borderTop: `1px solid ${asciiColors.border}`
        }}>
          <AsciiButton onClick={onClose} disabled={isSaving || isTesting}>
            Cancel
          </AsciiButton>
          <AsciiButton onClick={handleTestConnection} disabled={isSaving || isTesting}>
            {isTesting ? 'Testing...' : 'Test Connection'}
          </AsciiButton>
          <AsciiButton onClick={handleSave} disabled={isSaving || isTesting || !formData.masterUrl || !formData.appName}>
            {isSaving ? 'Saving...' : 'Save'}
          </AsciiButton>
        </div>
      </div>
    </div>
  );
};

export default SparkConfigModal;
