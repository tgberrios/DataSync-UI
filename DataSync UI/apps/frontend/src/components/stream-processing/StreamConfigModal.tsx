import React, { useState, useCallback } from 'react';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { theme } from '../../theme/theme';
import { streamProcessingApi, type StreamConfig } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';

interface StreamConfigModalProps {
  onClose: () => void;
  onSave: (config: StreamConfig) => void;
  initialConfig?: StreamConfig | null;
}

const StreamConfigModal: React.FC<StreamConfigModalProps> = ({ onClose, onSave, initialConfig }) => {
  const [formData, setFormData] = useState<StreamConfig>({
    streamType: initialConfig?.streamType || 'KAFKA',
    topic: initialConfig?.topic || '',
    queue: initialConfig?.queue || '',
    stream: initialConfig?.stream || '',
    consumerGroup: initialConfig?.consumerGroup || '',
    consumerName: initialConfig?.consumerName || '',
    serializationFormat: initialConfig?.serializationFormat || 'JSON',
    schemaRegistryUrl: initialConfig?.schemaRegistryUrl || '',
    engineConfig: initialConfig?.engineConfig || {},
  });

  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleInputChange = useCallback((field: keyof StreamConfig, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
    setTestResult(null);
  }, []);

  const handleTestConnection = useCallback(async () => {
    setIsTesting(true);
    setTestResult(null);
    setError(null);

    try {
      const result = await streamProcessingApi.testConnection(formData);
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
      await streamProcessingApi.updateStreamConfig(formData);
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
            Stream Configuration
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
              Stream Type *
            </label>
            <select
              value={formData.streamType}
              onChange={(e) => handleInputChange('streamType', e.target.value as 'KAFKA' | 'RABBITMQ' | 'REDIS_STREAMS')}
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
              <option value="KAFKA">Kafka</option>
              <option value="RABBITMQ">RabbitMQ</option>
              <option value="REDIS_STREAMS">Redis Streams</option>
            </select>
          </div>

          {formData.streamType === 'KAFKA' && (
            <>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: theme.spacing.xs,
                  color: asciiColors.foreground,
                  fontSize: 12,
                  fontWeight: 500
                }}>
                  Topic *
                </label>
                <input
                  type="text"
                  value={formData.topic || ''}
                  onChange={(e) => handleInputChange('topic', e.target.value)}
                  placeholder="my-topic"
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
                  Brokers (in engineConfig)
                </label>
                <input
                  type="text"
                  value={(formData.engineConfig as any)?.brokers || ''}
                  onChange={(e) => handleInputChange('engineConfig', {
                    ...formData.engineConfig,
                    brokers: e.target.value
                  })}
                  placeholder="localhost:9092,localhost:9093"
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
            </>
          )}

          {formData.streamType === 'RABBITMQ' && (
            <>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: theme.spacing.xs,
                  color: asciiColors.foreground,
                  fontSize: 12,
                  fontWeight: 500
                }}>
                  Queue *
                </label>
                <input
                  type="text"
                  value={formData.queue || ''}
                  onChange={(e) => handleInputChange('queue', e.target.value)}
                  placeholder="my-queue"
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
                    Host
                  </label>
                  <input
                    type="text"
                    value={(formData.engineConfig as any)?.host || 'localhost'}
                    onChange={(e) => handleInputChange('engineConfig', {
                      ...formData.engineConfig,
                      host: e.target.value
                    })}
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
                    Port
                  </label>
                  <input
                    type="number"
                    value={(formData.engineConfig as any)?.port || 5672}
                    onChange={(e) => handleInputChange('engineConfig', {
                      ...formData.engineConfig,
                      port: parseInt(e.target.value) || 5672
                    })}
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
            </>
          )}

          {formData.streamType === 'REDIS_STREAMS' && (
            <>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: theme.spacing.xs,
                  color: asciiColors.foreground,
                  fontSize: 12,
                  fontWeight: 500
                }}>
                  Stream Name *
                </label>
                <input
                  type="text"
                  value={formData.stream || ''}
                  onChange={(e) => handleInputChange('stream', e.target.value)}
                  placeholder="my-stream"
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
                    Host
                  </label>
                  <input
                    type="text"
                    value={(formData.engineConfig as any)?.host || 'localhost'}
                    onChange={(e) => handleInputChange('engineConfig', {
                      ...formData.engineConfig,
                      host: e.target.value
                    })}
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
                    Port
                  </label>
                  <input
                    type="number"
                    value={(formData.engineConfig as any)?.port || 6379}
                    onChange={(e) => handleInputChange('engineConfig', {
                      ...formData.engineConfig,
                      port: parseInt(e.target.value) || 6379
                    })}
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
            </>
          )}

          <div>
            <label style={{
              display: 'block',
              marginBottom: theme.spacing.xs,
              color: asciiColors.foreground,
              fontSize: 12,
              fontWeight: 500
            }}>
              Consumer Group
            </label>
            <input
              type="text"
              value={formData.consumerGroup}
              onChange={(e) => handleInputChange('consumerGroup', e.target.value)}
              placeholder="my-consumer-group"
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
              Consumer Name
            </label>
            <input
              type="text"
              value={formData.consumerName}
              onChange={(e) => handleInputChange('consumerName', e.target.value)}
              placeholder="consumer-1"
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
              Serialization Format
            </label>
            <select
              value={formData.serializationFormat}
              onChange={(e) => handleInputChange('serializationFormat', e.target.value as any)}
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
              <option value="JSON">JSON</option>
              <option value="AVRO">Avro</option>
              <option value="PROTOBUF">Protobuf</option>
              <option value="JSON_SCHEMA">JSON Schema</option>
            </select>
          </div>

          {(formData.serializationFormat === 'AVRO' || formData.serializationFormat === 'PROTOBUF' || formData.serializationFormat === 'JSON_SCHEMA') && (
            <div>
              <label style={{
                display: 'block',
                marginBottom: theme.spacing.xs,
                color: asciiColors.foreground,
                fontSize: 12,
                fontWeight: 500
              }}>
                Schema Registry URL
              </label>
              <input
                type="text"
                value={formData.schemaRegistryUrl || ''}
                onChange={(e) => handleInputChange('schemaRegistryUrl', e.target.value)}
                placeholder="http://localhost:8081"
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
          <AsciiButton 
            onClick={handleSave} 
            disabled={isSaving || isTesting || 
              (formData.streamType === 'KAFKA' && !formData.topic) ||
              (formData.streamType === 'RABBITMQ' && !formData.queue) ||
              (formData.streamType === 'REDIS_STREAMS' && !formData.stream)}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </AsciiButton>
        </div>
      </div>
    </div>
  );
};

export default StreamConfigModal;
