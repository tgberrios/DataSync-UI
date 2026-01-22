import { useState, useMemo } from 'react';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import type { SchemaMigrationEntry } from '../../services/api';

interface TreeViewProps {
  migrations: SchemaMigrationEntry[];
  loading: boolean;
  onViewMigration: (migration: SchemaMigrationEntry) => void;
  onApplyMigration: (migrationName: string, environment: string) => void;
  onRollbackMigration: (migrationName: string, environment: string) => void;
  onTestMigration?: (migration: SchemaMigrationEntry) => void;
}

const SchemaMigrationsTreeView = ({
  migrations,
  loading,
  onViewMigration,
  onApplyMigration,
  onRollbackMigration,
  onTestMigration
}: TreeViewProps) => {
  const [expandedMigrations, setExpandedMigrations] = useState<Set<string>>(new Set());

  const toggleMigration = (migrationName: string) => {
    setExpandedMigrations(prev => {
      const next = new Set(prev);
      if (next.has(migrationName)) {
        next.delete(migrationName);
      } else {
        next.add(migrationName);
      }
      return next;
    });
  };

  const groupedMigrations = useMemo(() => {
    const grouped: Record<string, SchemaMigrationEntry[]> = {};
    migrations.forEach(migration => {
      const key = migration.version || 'unversioned';
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(migration);
    });
    return grouped;
  }, [migrations]);

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPLIED':
        return '✓';
      case 'PENDING':
        return '⏳';
      case 'FAILED':
        return '✗';
      case 'ROLLED_BACK':
        return '↩';
      default:
        return '?';
    }
  };

  if (loading) {
    return (
      <div style={{
        padding: 40,
        textAlign: 'center',
        color: asciiColors.muted,
        fontFamily: 'Consolas'
      }}>
        {ascii.blockSemi} Loading migrations...
      </div>
    );
  }

  if (migrations.length === 0) {
    return (
      <div style={{
        padding: 40,
        textAlign: 'center',
        color: asciiColors.muted,
        fontFamily: 'Consolas'
      }}>
        {ascii.blockSemi} No migrations found. Create your first migration to get started.
      </div>
    );
  }

  return (
    <div style={{
      border: `1px solid ${asciiColors.border}`,
      borderRadius: 2,
      background: asciiColors.backgroundSoft,
      maxHeight: '70vh',
      overflowY: 'auto'
    }}>
      {Object.entries(groupedMigrations).map(([version, versionMigrations]) => (
        <div key={version} style={{ marginBottom: 8 }}>
          <div style={{
            padding: '8px 12px',
            background: asciiColors.background,
            borderBottom: `1px solid ${asciiColors.border}`,
            fontSize: 11,
            fontWeight: 600,
            color: asciiColors.accent,
            fontFamily: 'Consolas'
          }}>
            {ascii.blockSemi} VERSION: {version} ({versionMigrations.length} migrations)
          </div>
          {versionMigrations.map((migration) => {
            const isExpanded = expandedMigrations.has(migration.migration_name);
            return (
              <div key={migration.migration_name} style={{
                borderBottom: `1px solid ${asciiColors.border}`
              }}>
                <div
                  onClick={() => toggleMigration(migration.migration_name)}
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    background: 'transparent',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = asciiColors.backgroundSoft;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <span style={{
                    fontSize: 14,
                    color: asciiColors.foreground,
                    fontFamily: 'Consolas',
                    minWidth: 20
                  }}>
                    {isExpanded ? ascii.tDown : ascii.tRight}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: asciiColors.foreground,
                      fontFamily: 'Consolas',
                      marginBottom: 4
                    }}>
                      {migration.migration_name}
                    </div>
                    <div style={{
                      fontSize: 11,
                      color: asciiColors.muted,
                      fontFamily: 'Consolas',
                      display: 'flex',
                      gap: 16,
                      flexWrap: 'wrap'
                    }}>
                      <span>Version: {migration.version}</span>
                      <span>DB: {migration.db_engine || 'N/A'}</span>
                      <span>Created: {new Date(migration.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: 2,
                      fontSize: 10,
                      fontWeight: 600,
                      background: getStatusColor(migration.status) + '40',
                      color: getStatusColor(migration.status),
                      fontFamily: 'Consolas',
                      border: `1px solid ${getStatusColor(migration.status)}`
                    }}>
                      {getStatusIcon(migration.status)} {migration.status}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewMigration(migration);
                      }}
                      style={{
                        padding: '4px 8px',
                        border: `1px solid ${asciiColors.border}`,
                        borderRadius: 2,
                        background: asciiColors.accent,
                        color: asciiColors.background,
                        cursor: 'pointer',
                        fontSize: 10,
                        fontFamily: 'Consolas',
                        fontWeight: 600
                      }}
                    >
                      VIEW
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div style={{
                    padding: '16px 16px 16px 48px',
                    background: asciiColors.background,
                    borderTop: `1px solid ${asciiColors.border}`
                  }}>
                    <div style={{
                      fontSize: 11,
                      color: asciiColors.muted,
                      fontFamily: 'Consolas',
                      marginBottom: 12,
                      lineHeight: 1.6
                    }}>
                      {migration.description || 'No description provided.'}
                    </div>

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: 12,
                      marginBottom: 12
                    }}>
                      <div>
                        <div style={{
                          fontSize: 10,
                          color: asciiColors.muted,
                          marginBottom: 4
                        }}>
                          Checksum
                        </div>
                        <div style={{
                          fontSize: 11,
                          color: asciiColors.foreground,
                          fontFamily: 'Consolas',
                          wordBreak: 'break-all'
                        }}>
                          {migration.checksum || 'N/A'}
                        </div>
                      </div>
                      <div>
                        <div style={{
                          fontSize: 10,
                          color: asciiColors.muted,
                          marginBottom: 4
                        }}>
                          Created At
                        </div>
                        <div style={{
                          fontSize: 11,
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
                          marginBottom: 4
                        }}>
                          Last Applied
                        </div>
                        <div style={{
                          fontSize: 11,
                          color: asciiColors.foreground,
                          fontFamily: 'Consolas'
                        }}>
                          {migration.last_applied_at ? new Date(migration.last_applied_at).toLocaleString() : 'Never'}
                        </div>
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      gap: 8,
                      marginTop: 12,
                      flexWrap: 'wrap'
                    }}>
                      {onTestMigration && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onTestMigration(migration);
                          }}
                          style={{
                            padding: '6px 12px',
                            border: `1px solid ${asciiColors.accent}`,
                            borderRadius: 2,
                            background: asciiColors.accent,
                            color: asciiColors.background,
                            cursor: 'pointer',
                            fontSize: 11,
                            fontFamily: 'Consolas',
                            fontWeight: 600
                          }}
                        >
                          🧪 TEST
                        </button>
                      )}
                      {migration.status !== 'APPLIED' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const env = prompt('Enter environment (dev/staging/qa/production):');
                            if (env) {
                              onApplyMigration(migration.migration_name, env);
                            }
                          }}
                          style={{
                            padding: '6px 12px',
                            border: `1px solid ${asciiColors.success}`,
                            borderRadius: 2,
                            background: asciiColors.success,
                            color: asciiColors.background,
                            cursor: 'pointer',
                            fontSize: 11,
                            fontFamily: 'Consolas',
                            fontWeight: 600
                          }}
                        >
                          ✓ APPLY
                        </button>
                      )}
                      {migration.status === 'APPLIED' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const env = prompt('Enter environment (dev/staging/qa/production):');
                            if (env) {
                              onRollbackMigration(migration.migration_name, env);
                            }
                          }}
                          style={{
                            padding: '6px 12px',
                            border: `1px solid ${asciiColors.warning}`,
                            borderRadius: 2,
                            background: asciiColors.warning,
                            color: asciiColors.background,
                            cursor: 'pointer',
                            fontSize: 11,
                            fontFamily: 'Consolas',
                            fontWeight: 600
                          }}
                        >
                          ↩ ROLLBACK
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default SchemaMigrationsTreeView;

