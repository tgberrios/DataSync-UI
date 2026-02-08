import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { theme } from '../../theme/theme';
import type { SchemaMigrationEntry } from '../../services/api';

interface ListViewProps {
  migrations: SchemaMigrationEntry[];
  loading: boolean;
  onViewMigration: (migration: SchemaMigrationEntry) => void;
  onApplyMigration: (migrationName: string, environment: string) => void;
  onRollbackMigration: (migrationName: string, environment: string) => void;
  onTestMigration?: (migration: SchemaMigrationEntry) => void;
}

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

const SchemaMigrationsListView = ({
  migrations,
  loading,
  onViewMigration,
  onApplyMigration,
  onRollbackMigration,
  onTestMigration
}: ListViewProps) => {
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
      background: asciiColors.background,
      maxHeight: '70vh',
      overflowX: 'auto',
      overflowY: 'auto'
    }}>
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontFamily: 'Consolas',
        fontSize: 12
      }}>
        <thead>
          <tr style={{
            background: asciiColors.backgroundSoft,
            borderBottom: `2px solid ${asciiColors.border}`
          }}>
            <th style={{
              padding: `${theme.spacing.sm} ${theme.spacing.md}`,
              textAlign: 'left',
              fontWeight: 600,
              color: asciiColors.foreground
            }}>
              Migration
            </th>
            <th style={{
              padding: `${theme.spacing.sm} ${theme.spacing.md}`,
              textAlign: 'left',
              fontWeight: 600,
              color: asciiColors.foreground
            }}>
              Version
            </th>
            <th style={{
              padding: `${theme.spacing.sm} ${theme.spacing.md}`,
              textAlign: 'left',
              fontWeight: 600,
              color: asciiColors.foreground
            }}>
              DB Engine
            </th>
            <th style={{
              padding: `${theme.spacing.sm} ${theme.spacing.md}`,
              textAlign: 'left',
              fontWeight: 600,
              color: asciiColors.foreground
            }}>
              Status
            </th>
            <th style={{
              padding: `${theme.spacing.sm} ${theme.spacing.md}`,
              textAlign: 'left',
              fontWeight: 600,
              color: asciiColors.foreground
            }}>
              Created
            </th>
            <th style={{
              padding: `${theme.spacing.sm} ${theme.spacing.md}`,
              textAlign: 'left',
              fontWeight: 600,
              color: asciiColors.foreground
            }}>
              Last applied
            </th>
            <th style={{
              padding: `${theme.spacing.sm} ${theme.spacing.md}`,
              textAlign: 'right',
              fontWeight: 600,
              color: asciiColors.foreground
            }}>
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {migrations.map((migration) => (
            <tr
              key={migration.migration_name}
              style={{
                borderBottom: `1px solid ${asciiColors.border}`,
                transition: 'background 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = asciiColors.backgroundSoft;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <td style={{
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                color: asciiColors.foreground,
                fontWeight: 600
              }}>
                {migration.migration_name}
              </td>
              <td style={{
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                color: asciiColors.muted
              }}>
                {migration.version}
              </td>
              <td style={{
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                color: asciiColors.foreground
              }}>
                {migration.db_engine || 'N/A'}
              </td>
              <td style={{
                padding: `${theme.spacing.sm} ${theme.spacing.md}`
              }}>
                <span style={{
                  padding: '4px 8px',
                  borderRadius: 2,
                  fontSize: 10,
                  fontWeight: 600,
                  background: 'transparent',
                  color: asciiColors.foreground,
                  fontFamily: 'Consolas',
                  border: `1px solid ${asciiColors.border}`
                }}>
                  {getStatusIcon(migration.status)} {migration.status}
                </span>
              </td>
              <td style={{
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                color: asciiColors.muted,
                fontSize: 11
              }}>
                {new Date(migration.created_at).toLocaleString()}
              </td>
              <td style={{
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                color: asciiColors.muted,
                fontSize: 11
              }}>
                {migration.last_applied_at
                  ? new Date(migration.last_applied_at).toLocaleString()
                  : '—'}
              </td>
              <td style={{
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                textAlign: 'right'
              }}>
                <div style={{
                  display: 'flex',
                  gap: 8,
                  justifyContent: 'flex-end',
                  flexWrap: 'wrap'
                }}>
                  <button
                    onClick={() => onViewMigration(migration)}
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
                  {onTestMigration && (
                    <button
                      onClick={() => onTestMigration(migration)}
                      style={{
                        padding: '4px 8px',
                        border: `1px solid ${asciiColors.accent}`,
                        borderRadius: 2,
                        background: 'transparent',
                        color: asciiColors.accent,
                        cursor: 'pointer',
                        fontSize: 10,
                        fontFamily: 'Consolas',
                        fontWeight: 600
                      }}
                    >
                      TEST
                    </button>
                  )}
                  {migration.status !== 'APPLIED' && (
                    <button
                      onClick={() => {
                        const env = prompt('Enter environment (dev/staging/qa/production):');
                        if (env) onApplyMigration(migration.migration_name, env);
                      }}
                      style={{
                        padding: '4px 8px',
                        border: `1px solid ${asciiColors.border}`,
                        borderRadius: 2,
                        background: 'transparent',
                        color: asciiColors.foreground,
                        cursor: 'pointer',
                        fontSize: 10,
                        fontFamily: 'Consolas',
                        fontWeight: 600
                      }}
                    >
                      APPLY
                    </button>
                  )}
                  {migration.status === 'APPLIED' && (
                    <button
                      onClick={() => {
                        const env = prompt('Enter environment (dev/staging/qa/production):');
                        if (env) onRollbackMigration(migration.migration_name, env);
                      }}
                      style={{
                        padding: '4px 8px',
                        border: `1px solid ${asciiColors.border}`,
                        borderRadius: 2,
                        background: 'transparent',
                        color: asciiColors.foreground,
                        cursor: 'pointer',
                        fontSize: 10,
                        fontFamily: 'Consolas',
                        fontWeight: 600
                      }}
                    >
                      ROLLBACK
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SchemaMigrationsListView;
