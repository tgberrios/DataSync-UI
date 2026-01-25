import { useState } from 'react';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { schemaMigrationsApi } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import type { SchemaMigrationEntry } from '../../services/api';

interface TestMigrationModalProps {
  migration: SchemaMigrationEntry;
  onClose: () => void;
  onTestSuccess?: () => void;
}

const TestMigrationModal = ({ migration, onClose, onTestSuccess }: TestMigrationModalProps) => {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [testSchema, setTestSchema] = useState('');

  const handleTest = async () => {
    try {
      setTesting(true);
      setError(null);
      setTestResult(null);
      
      const response = await schemaMigrationsApi.testMigration(migration.migration_name, {
        environment: 'test',
        test_schema_prefix: '_migration_test_'
      });
      
      setTestResult(response);
      setTestSchema(response.test_schema || '');
      
      if (response.success) {
        if (onTestSuccess) {
          onTestSuccess();
        }
        alert('✅ Migration test passed! You can now apply it to production.');
      } else {
        alert(`❌ Migration test failed: ${response.errors?.join(', ') || 'Unknown error'}`);
      }
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setTesting(false);
    }
  };

  const handleCleanup = async () => {
    if (!testSchema) return;
    
    try {
      await schemaMigrationsApi.cleanupTestSchema(testSchema);
      setTestSchema('');
      setTestResult(null);
      alert('✅ Test schema cleaned up successfully');
    } catch (err) {
      setError(extractApiError(err));
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
        maxWidth: 700,
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
              {ascii.blockFull} TEST MIGRATION
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{
            padding: 12,
            background: asciiColors.backgroundSoft,
            borderRadius: 2,
            border: `1px solid ${asciiColors.border}`,
            fontSize: 11,
            fontFamily: 'Consolas',
            lineHeight: 1.6
          }}>
            <div style={{ fontWeight: 600, marginBottom: 8, color: asciiColors.foreground }}>
              {ascii.blockSemi} How it works:
            </div>
            <ul style={{ margin: 0, paddingLeft: 20, color: asciiColors.muted }}>
              <li>Creates a temporary test schema</li>
              <li>Executes the forward SQL in the test schema</li>
              <li>Validates that the migration works correctly</li>
              <li>Tests the rollback SQL</li>
              <li>Cleans up the test schema automatically</li>
            </ul>
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

          {testResult && (
            <div style={{
              padding: 12,
              background: testResult.success ? asciiColors.success + '20' : asciiColors.danger + '20',
              border: `1px solid ${testResult.success ? asciiColors.success : asciiColors.danger}`,
              borderRadius: 2,
              fontSize: 11,
              fontFamily: 'Consolas'
            }}>
              <div style={{
                fontWeight: 600,
                marginBottom: 8,
                color: testResult.success ? asciiColors.success : asciiColors.danger
              }}>
                {testResult.success ? '✓ TEST PASSED' : '✗ TEST FAILED'}
              </div>
              {testResult.test_schema && (
                <div style={{ color: asciiColors.muted, marginBottom: 4 }}>
                  Test Schema: {testResult.test_schema}
                </div>
              )}
              {testResult.execution_time_ms && (
                <div style={{ color: asciiColors.muted, marginBottom: 4 }}>
                  Execution Time: {testResult.execution_time_ms}ms
                </div>
              )}
              {testResult.errors && testResult.errors.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4, color: asciiColors.danger }}>
                    Errors:
                  </div>
                  {testResult.errors.map((err: string, idx: number) => (
                    <div key={idx} style={{ color: asciiColors.danger, marginLeft: 12 }}>
                      • {err}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            {testSchema && (
              <button
                onClick={handleCleanup}
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
                CLEANUP TEST SCHEMA
              </button>
            )}
            <button
              onClick={handleTest}
              disabled={testing}
              style={{
                padding: '8px 16px',
                border: `1px solid ${asciiColors.accent}`,
                borderRadius: 2,
                background: asciiColors.accent,
                color: asciiColors.background,
                cursor: testing ? 'not-allowed' : 'pointer',
                fontSize: 12,
                fontFamily: 'Consolas',
                fontWeight: 600,
                opacity: testing ? 0.5 : 1
              }}
            >
              {testing ? 'TESTING...' : 'RUN TEST'}
            </button>
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px',
                border: `1px solid ${asciiColors.border}`,
                borderRadius: 2,
                background: asciiColors.backgroundSoft,
                color: asciiColors.foreground,
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

export default TestMigrationModal;

