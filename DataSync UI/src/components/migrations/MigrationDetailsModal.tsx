import { useState, useEffect } from 'react';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { schemaMigrationsApi } from '../../services/api';
import type { SchemaMigrationEntry } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';

interface MigrationDetailsModalProps {
  migration: SchemaMigrationEntry;
  onClose: () => void;
  onApply: (migrationName: string, environment: string) => void;
  onRollback: (migrationName: string, environment: string) => void;
  onTest?: (migration: SchemaMigrationEntry) => void;
}

const MigrationDetailsModal = ({
  migration,
  onClose,
  onApply,
  onRollback,
  onTest
}: MigrationDetailsModalProps) => {
  const [executionHistory, setExecutionHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedEnvironment, setSelectedEnvironment] = useState('dev');
  const [error, setError] = useState<string | null>(null);
  const [isAppliedToSelectedEnv, setIsAppliedToSelectedEnv] = useState(false);

  useEffect(() => {
    fetchExecutionHistory();
  }, [migration.migration_name]);

  useEffect(() => {
    checkIfAppliedToEnvironment();
  }, [selectedEnvironment, executionHistory]);

  const fetchExecutionHistory = async () => {
    try {
      setLoadingHistory(true);
      const response = await schemaMigrationsApi.getHistory(migration.migration_name);
      setExecutionHistory(response.history || []);
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setLoadingHistory(false);
    }
  };

  const checkIfAppliedToEnvironment = () => {
    const appliedToEnv = executionHistory.some(
      entry => entry.environment === selectedEnvironment && entry.status === 'APPLIED'
    );
    setIsAppliedToSelectedEnv(appliedToEnv);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPLIED':
        return asciiColors.success;
      case 'PENDING':
        return asciiColors.warning;
      case 'FAILED':
        return asciiColors.danger;
      case 'ROLLED_BACK':
        return asciiColors.muted;
      default:
        return asciiColors.foreground;
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        width: '90%',
        maxWidth: 1000,
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
      <AsciiPanel>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
          paddingBottom: 16,
          borderBottom: `2px solid ${asciiColors.border}`
        }}>
          <div>
            <h2 style={{
              fontSize: 18,
              fontWeight: 700,
              color: asciiColors.accent,
              margin: 0,
              fontFamily: 'Consolas'
            }}>
              {ascii.blockFull} MIGRATION DETAILS
            </h2>
            <p style={{
              fontSize: 11,
              color: asciiColors.muted,
              margin: '4px 0 0 0',
              fontFamily: 'Consolas'
            }}>
              {migration.migration_name}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: asciiColors.foreground,
              fontSize: 20,
              cursor: 'pointer',
              padding: '0 8px'
            }}
          >
            ×
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 16
          }}>
            <div>
              <div style={{
                fontSize: 10,
                color: asciiColors.muted,
                marginBottom: 4,
                fontFamily: 'Consolas'
              }}>
                Version
              </div>
              <div style={{
                fontSize: 12,
                color: asciiColors.foreground,
                fontFamily: 'Consolas',
                fontWeight: 600
              }}>
                {migration.version}
              </div>
            </div>
            <div>
              <div style={{
                fontSize: 10,
                color: asciiColors.muted,
                marginBottom: 4,
                fontFamily: 'Consolas'
              }}>
                Status
              </div>
              <div style={{
                fontSize: 12,
                color: getStatusColor(migration.status),
                fontFamily: 'Consolas',
                fontWeight: 600
              }}>
                {migration.status}
              </div>
            </div>
            <div>
              <div style={{
                fontSize: 10,
                color: asciiColors.muted,
                marginBottom: 4,
                fontFamily: 'Consolas'
              }}>
                DB Engine
              </div>
              <div style={{
                fontSize: 12,
                color: asciiColors.foreground,
                fontFamily: 'Consolas',
                fontWeight: 600
              }}>
                {migration.db_engine || 'N/A'}
              </div>
            </div>
            <div>
              <div style={{
                fontSize: 10,
                color: asciiColors.muted,
                marginBottom: 4,
                fontFamily: 'Consolas'
              }}>
                Created At
              </div>
              <div style={{
                fontSize: 12,
                color: asciiColors.foreground,
                fontFamily: 'Consolas'
              }}>
                {new Date(migration.created_at).toLocaleString()}
              </div>
            </div>
            <div>
              <div style={{
                fontSize: 10,
                color: asciiColors.muted,
                marginBottom: 4,
                fontFamily: 'Consolas'
              }}>
                Last Applied
              </div>
              <div style={{
                fontSize: 12,
                color: asciiColors.foreground,
                fontFamily: 'Consolas'
              }}>
                {migration.last_applied_at ? new Date(migration.last_applied_at).toLocaleString() : 'Never'}
              </div>
            </div>
            <div>
              <div style={{
                fontSize: 10,
                color: asciiColors.muted,
                marginBottom: 4,
                fontFamily: 'Consolas'
              }}>
                Checksum
              </div>
              <div style={{
                fontSize: 10,
                color: asciiColors.foreground,
                fontFamily: 'Consolas',
                wordBreak: 'break-all'
              }}>
                {migration.checksum || 'N/A'}
              </div>
            </div>
          </div>

          {migration.description && (
            <div>
              <div style={{
                fontSize: 11,
                color: asciiColors.muted,
                marginBottom: 8,
                fontFamily: 'Consolas',
                fontWeight: 600
              }}>
                {ascii.blockSemi} DESCRIPTION
              </div>
              <div style={{
                padding: 12,
                background: asciiColors.backgroundSoft,
                borderRadius: 2,
                border: `1px solid ${asciiColors.border}`,
                fontSize: 12,
                color: asciiColors.foreground,
                fontFamily: 'Consolas',
                lineHeight: 1.6
              }}>
                {migration.description}
              </div>
            </div>
          )}

          <div>
            <div style={{
              fontSize: 11,
              color: asciiColors.muted,
              marginBottom: 8,
              fontFamily: 'Consolas',
              fontWeight: 600
            }}>
              {ascii.blockSemi} FORWARD SQL
            </div>
            <pre style={{
              padding: 12,
              background: asciiColors.backgroundSoft,
              borderRadius: 2,
              border: `1px solid ${asciiColors.border}`,
              fontSize: 11,
              color: asciiColors.foreground,
              fontFamily: 'Consolas',
              overflowX: 'auto',
              margin: 0,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}>
              {migration.forward_sql || 'N/A'}
            </pre>
          </div>

          {migration.rollback_sql && (
            <div>
              <div style={{
                fontSize: 11,
                color: asciiColors.muted,
                marginBottom: 8,
                fontFamily: 'Consolas',
                fontWeight: 600
              }}>
                {ascii.blockSemi} ROLLBACK SQL
              </div>
              <pre style={{
                padding: 12,
                background: asciiColors.backgroundSoft,
                borderRadius: 2,
                border: `1px solid ${asciiColors.border}`,
                fontSize: 11,
                color: asciiColors.foreground,
                fontFamily: 'Consolas',
                overflowX: 'auto',
                margin: 0,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {migration.rollback_sql}
              </pre>
            </div>
          )}

          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12
            }}>
              <div style={{
                fontSize: 11,
                color: asciiColors.muted,
                fontFamily: 'Consolas',
                fontWeight: 600
              }}>
                {ascii.blockSemi} ACTIONS
              </div>
              <select
                value={selectedEnvironment}
                onChange={(e) => setSelectedEnvironment(e.target.value)}
                style={{
                  padding: '6px 12px',
                  border: `1px solid ${asciiColors.border}`,
                  borderRadius: 2,
                  background: asciiColors.backgroundSoft,
                  color: asciiColors.foreground,
                  fontFamily: 'Consolas',
                  fontSize: 11,
                  cursor: 'pointer'
                }}
              >
                <option value="dev">Development</option>
                <option value="staging">Staging</option>
                <option value="qa">QA</option>
                <option value="production">Production</option>
              </select>
            </div>
            <div style={{
              display: 'flex',
              gap: 12
            }}>
              {onTest && (
                <button
                  onClick={() => onTest(migration)}
                  style={{
                    padding: '8px 16px',
                    border: `1px solid ${asciiColors.accent}`,
                    borderRadius: 2,
                    background: asciiColors.accent,
                    color: asciiColors.background,
                    cursor: 'pointer',
                    fontSize: 12,
                    fontFamily: 'Consolas',
                    fontWeight: 600
                  }}
                >
                  🧪 TEST MIGRATION
                </button>
              )}
              {!isAppliedToSelectedEnv && (
                <button
                  onClick={() => onApply(migration.migration_name, selectedEnvironment)}
                  style={{
                    padding: '8px 16px',
                    border: `1px solid ${asciiColors.success}`,
                    borderRadius: 2,
                    background: asciiColors.success,
                    color: asciiColors.background,
                    cursor: 'pointer',
                    fontSize: 12,
                    fontFamily: 'Consolas',
                    fontWeight: 600
                  }}
                >
                  ✓ APPLY TO {selectedEnvironment.toUpperCase()}
                </button>
              )}
              {isAppliedToSelectedEnv && migration.rollback_sql && (
                <button
                  onClick={() => onRollback(migration.migration_name, selectedEnvironment)}
                  style={{
                    padding: '8px 16px',
                    border: `1px solid ${asciiColors.warning}`,
                    borderRadius: 2,
                    background: asciiColors.warning,
                    color: asciiColors.background,
                    cursor: 'pointer',
                    fontSize: 12,
                    fontFamily: 'Consolas',
                    fontWeight: 600
                  }}
                >
                  ↩ ROLLBACK FROM {selectedEnvironment.toUpperCase()}
                </button>
              )}
            </div>
          </div>

          <div>
            <div style={{
              fontSize: 11,
              color: asciiColors.muted,
              marginBottom: 8,
              fontFamily: 'Consolas',
              fontWeight: 600
            }}>
              {ascii.blockSemi} EXECUTION HISTORY
            </div>
            {loadingHistory ? (
              <div style={{
                padding: 20,
                textAlign: 'center',
                color: asciiColors.muted,
                fontFamily: 'Consolas'
              }}>
                Loading history...
              </div>
            ) : executionHistory.length === 0 ? (
              <div style={{
                padding: 20,
                textAlign: 'center',
                color: asciiColors.muted,
                fontFamily: 'Consolas'
              }}>
                No execution history available
              </div>
            ) : (
              <div style={{
                border: `1px solid ${asciiColors.border}`,
                borderRadius: 2,
                overflow: 'hidden'
              }}>
                {executionHistory.map((entry, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '12px 16px',
                      borderBottom: idx < executionHistory.length - 1 ? `1px solid ${asciiColors.border}` : 'none',
                      background: idx % 2 === 0 ? asciiColors.background : asciiColors.backgroundSoft
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 4
                    }}>
                      <div style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: asciiColors.foreground,
                        fontFamily: 'Consolas'
                      }}>
                        {entry.environment || 'N/A'} - {entry.status || 'N/A'}
                      </div>
                      <div style={{
                        fontSize: 10,
                        color: asciiColors.muted,
                        fontFamily: 'Consolas'
                      }}>
                        {entry.executed_at ? new Date(entry.executed_at).toLocaleString() : 'N/A'}
                      </div>
                    </div>
                    {entry.error_message && (
                      <div style={{
                        fontSize: 10,
                        color: asciiColors.danger,
                        fontFamily: 'Consolas',
                        marginTop: 4,
                        padding: 8,
                        background: asciiColors.danger + '20',
                        borderRadius: 2
                      }}>
                        {entry.error_message}
                      </div>
                    )}
                    {entry.execution_time_ms && (
                      <div style={{
                        fontSize: 10,
                        color: asciiColors.muted,
                        fontFamily: 'Consolas',
                        marginTop: 4
                      }}>
                        Execution time: {entry.execution_time_ms}ms
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div style={{
              padding: 12,
              background: asciiColors.danger + '20',
              border: `1px solid ${asciiColors.danger}`,
              borderRadius: 2,
              color: asciiColors.danger,
              fontSize: 11,
              fontFamily: 'Consolas'
            }}>
              {ascii.blockFull} ERROR: {error}
            </div>
          )}

          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginTop: 8
          }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px',
                border: `1px solid ${asciiColors.border}`,
                borderRadius: 2,
                background: asciiColors.accent,
                color: asciiColors.background,
                cursor: 'pointer',
                fontSize: 12,
                fontFamily: 'Consolas',
                fontWeight: 600
              }}
            >
              CLOSE
            </button>
          </div>
        </div>
      </AsciiPanel>
      </div>
    </div>
  );
};

export default MigrationDetailsModal;

