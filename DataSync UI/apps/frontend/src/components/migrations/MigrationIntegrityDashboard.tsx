import { useState, useEffect } from 'react';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { schemaMigrationsApi } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';

interface IntegrityStatus {
  chain_valid: boolean;
  unregistered_changes: number;
  migrations_without_rollback: number;
  last_migration_applied: string | null;
  most_updated_environment: string;
  total_migrations: number;
  pending_tests: number;
}

const MigrationIntegrityDashboard = () => {
  const [integrityStatus, setIntegrityStatus] = useState<IntegrityStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchIntegrity = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await schemaMigrationsApi.integrityCheck();
      setIntegrityStatus(response);
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrity();
    const interval = setInterval(fetchIntegrity, 30000);
    return () => clearInterval(interval);
  }, []);

  const getOverallStatus = () => {
    if (!integrityStatus) return 'UNKNOWN';
    if (integrityStatus.chain_valid && 
        integrityStatus.unregistered_changes === 0 && 
        integrityStatus.migrations_without_rollback === 0) {
      return 'HEALTHY';
    }
    return 'ISSUES';
  };

  const overallStatus = getOverallStatus();
  const statusColor = overallStatus === 'HEALTHY' ? asciiColors.success : 
                     overallStatus === 'ISSUES' ? asciiColors.warning : asciiColors.muted;

  return (
    <AsciiPanel>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingBottom: 16,
        borderBottom: `2px solid ${asciiColors.border}`
      }}>
        <h2 style={{
          fontSize: 16,
          fontWeight: 700,
          color: asciiColors.accent,
          margin: 0,
          fontFamily: 'Consolas'
        }}>
          {ascii.blockFull} INTEGRITY DASHBOARD
        </h2>
        <button
          onClick={fetchIntegrity}
          disabled={loading}
          style={{
            padding: '6px 12px',
            border: `1px solid ${asciiColors.border}`,
            borderRadius: 2,
            background: asciiColors.backgroundSoft,
            color: asciiColors.foreground,
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: 11,
            fontFamily: 'Consolas',
            fontWeight: 600,
            opacity: loading ? 0.5 : 1
          }}
        >
          {loading ? 'REFRESHING...' : 'REFRESH'}
        </button>
      </div>

      {error && (
        <div style={{
          padding: 12,
          marginBottom: 16,
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

      {loading ? (
        <div style={{
          padding: 40,
          textAlign: 'center',
          color: asciiColors.muted,
          fontFamily: 'Consolas'
        }}>
          {ascii.blockSemi} Loading integrity status...
        </div>
      ) : integrityStatus ? (
        <div>
          <div style={{
            padding: 16,
            marginBottom: 20,
            background: statusColor + '20',
            border: `2px solid ${statusColor}`,
            borderRadius: 2,
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: 18,
              fontWeight: 700,
              color: statusColor,
              fontFamily: 'Consolas',
              marginBottom: 4
            }}>
              {overallStatus === 'HEALTHY' ? '✓' : overallStatus === 'ISSUES' ? '⚠' : '?'} {overallStatus}
            </div>
            <div style={{
              fontSize: 11,
              color: asciiColors.muted,
              fontFamily: 'Consolas'
            }}>
              Overall System Status
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 16,
            marginBottom: 20
          }}>
            <div style={{
              padding: 12,
              background: asciiColors.backgroundSoft,
              borderRadius: 2,
              border: `1px solid ${asciiColors.border}`
            }}>
              <div style={{
                fontSize: 10,
                color: asciiColors.muted,
                marginBottom: 4,
                fontFamily: 'Consolas'
              }}>
                Chain Status
              </div>
              <div style={{
                fontSize: 14,
                fontWeight: 600,
                color: integrityStatus.chain_valid ? asciiColors.success : asciiColors.danger,
                fontFamily: 'Consolas'
              }}>
                {integrityStatus.chain_valid ? '✓ VALID' : '✗ BROKEN'}
              </div>
            </div>

            <div style={{
              padding: 12,
              background: asciiColors.backgroundSoft,
              borderRadius: 2,
              border: `1px solid ${asciiColors.border}`
            }}>
              <div style={{
                fontSize: 10,
                color: asciiColors.muted,
                marginBottom: 4,
                fontFamily: 'Consolas'
              }}>
                Unregistered Changes
              </div>
              <div style={{
                fontSize: 14,
                fontWeight: 600,
                color: integrityStatus.unregistered_changes === 0 ? asciiColors.success : asciiColors.warning,
                fontFamily: 'Consolas'
              }}>
                {integrityStatus.unregistered_changes}
              </div>
            </div>

            <div style={{
              padding: 12,
              background: asciiColors.backgroundSoft,
              borderRadius: 2,
              border: `1px solid ${asciiColors.border}`
            }}>
              <div style={{
                fontSize: 10,
                color: asciiColors.muted,
                marginBottom: 4,
                fontFamily: 'Consolas'
              }}>
                Missing Rollback
              </div>
              <div style={{
                fontSize: 14,
                fontWeight: 600,
                color: integrityStatus.migrations_without_rollback === 0 ? asciiColors.success : asciiColors.danger,
                fontFamily: 'Consolas'
              }}>
                {integrityStatus.migrations_without_rollback}
              </div>
            </div>

            <div style={{
              padding: 12,
              background: asciiColors.backgroundSoft,
              borderRadius: 2,
              border: `1px solid ${asciiColors.border}`
            }}>
              <div style={{
                fontSize: 10,
                color: asciiColors.muted,
                marginBottom: 4,
                fontFamily: 'Consolas'
              }}>
                Total Migrations
              </div>
              <div style={{
                fontSize: 14,
                fontWeight: 600,
                color: asciiColors.foreground,
                fontFamily: 'Consolas'
              }}>
                {integrityStatus.total_migrations}
              </div>
            </div>

            <div style={{
              padding: 12,
              background: asciiColors.backgroundSoft,
              borderRadius: 2,
              border: `1px solid ${asciiColors.border}`
            }}>
              <div style={{
                fontSize: 10,
                color: asciiColors.muted,
                marginBottom: 4,
                fontFamily: 'Consolas'
              }}>
                Pending Tests
              </div>
              <div style={{
                fontSize: 14,
                fontWeight: 600,
                color: integrityStatus.pending_tests === 0 ? asciiColors.success : asciiColors.warning,
                fontFamily: 'Consolas'
              }}>
                {integrityStatus.pending_tests}
              </div>
            </div>
          </div>

          <div style={{
            padding: 12,
            background: asciiColors.backgroundSoft,
            borderRadius: 2,
            border: `1px solid ${asciiColors.border}`,
            fontSize: 11,
            fontFamily: 'Consolas'
          }}>
            <div style={{ color: asciiColors.muted, marginBottom: 4 }}>
              Last Migration Applied:
            </div>
            <div style={{ color: asciiColors.foreground, fontWeight: 600 }}>
              {integrityStatus.last_migration_applied || 'None'}
            </div>
            <div style={{ color: asciiColors.muted, marginTop: 8, marginBottom: 4 }}>
              Most Updated Environment:
            </div>
            <div style={{ color: asciiColors.foreground, fontWeight: 600 }}>
              {integrityStatus.most_updated_environment || 'N/A'}
            </div>
          </div>
        </div>
      ) : null}
    </AsciiPanel>
  );
};

export default MigrationIntegrityDashboard;

