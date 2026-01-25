import { useState, useEffect } from 'react';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { ConnectionStringSelector } from '../shared/ConnectionStringSelector';
import { schemaMigrationsApi, backupsApi } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';

interface CreateMigrationModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const getConnectionStringExample = (engine: string) => {
  switch (engine) {
    case 'PostgreSQL':
      return 'postgresql://username:password@localhost:5432/database_name';
    case 'MariaDB':
      return 'mysql://username:password@localhost:3306/database_name';
    case 'MSSQL':
      return 'mssql://username:password@localhost:1433/database_name';
    case 'MongoDB':
      return 'mongodb://username:password@localhost:27017/database_name?authSource=admin';
    case 'Oracle':
      return 'oracle://username:password@localhost:1521/XE';
    default:
      return 'postgresql://username:password@localhost:5432/database_name';
  }
};

const CreateMigrationModal = ({ onClose, onSuccess }: CreateMigrationModalProps) => {
  const [formData, setFormData] = useState({
    migration_name: '',
    version: '',
    description: '',
    db_engine: 'PostgreSQL',
    forward_sql: '',
    rollback_sql: '',
    environment_connections: {
      dev: '',
      staging: '',
      qa: '',
      production: getConnectionStringExample('PostgreSQL')
    }
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testingConnection, setTestingConnection] = useState<{ env: string; testing: boolean }>({ env: '', testing: false });
  const [testingSQL, setTestingSQL] = useState(false);
  const [connectionTestResults, setConnectionTestResults] = useState<Record<string, { success: boolean; message: string }>>({});
  const [sqlTestResult, setSqlTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [sqlTestEnvironment, setSqlTestEnvironment] = useState('production');

  useEffect(() => {
    const currentExample = getConnectionStringExample(formData.db_engine);
    const previousExamples = [
      'postgresql://username:password@localhost:5432/database_name',
      'mysql://username:password@localhost:3306/database_name',
      'mssql://username:password@localhost:1433/database_name',
      'mongodb://username:password@localhost:27017/database_name?authSource=admin',
      'oracle://username:password@localhost:1521/XE'
    ];
    
    setFormData(prev => {
      const updated = { ...prev.environment_connections };
      if (!updated.production || previousExamples.includes(updated.production)) {
        updated.production = currentExample;
      }
      return { ...prev, environment_connections: updated };
    });
  }, [formData.db_engine]);

  const handleTestConnection = async (env: string) => {
    const connectionString = formData.environment_connections[env as keyof typeof formData.environment_connections];
    if (!connectionString || connectionString.trim() === '') {
      setConnectionTestResults(prev => ({ ...prev, [env]: { success: false, message: 'Connection string is required' } }));
      return;
    }

    setTestingConnection({ env, testing: true });
    setConnectionTestResults(prev => ({ ...prev, [env]: null as any }));
    setError(null);

    try {
      await backupsApi.testConnection(formData.db_engine, connectionString);
      setConnectionTestResults(prev => ({ ...prev, [env]: { success: true, message: 'Connection successful!' } }));
    } catch (err) {
      setConnectionTestResults(prev => ({ ...prev, [env]: { success: false, message: extractApiError(err) } }));
    } finally {
      setTestingConnection({ env: '', testing: false });
    }
  };

  const handleTestSQL = async () => {
    if (!formData.forward_sql || formData.forward_sql.trim() === '') {
      setSqlTestResult({ success: false, message: 'Forward SQL is required' });
      return;
    }

    if (!formData.rollback_sql || formData.rollback_sql.trim() === '') {
      setSqlTestResult({ success: false, message: 'Rollback SQL is required' });
      return;
    }

    const connectionString = formData.environment_connections[sqlTestEnvironment as keyof typeof formData.environment_connections];
    if (!connectionString || connectionString.trim() === '') {
      setSqlTestResult({ success: false, message: `Connection string for ${sqlTestEnvironment} is required` });
      return;
    }

    setTestingSQL(true);
    setSqlTestResult(null);
    setError(null);

    try {
      const result = await schemaMigrationsApi.testSQL({
        db_engine: formData.db_engine,
        connection_string: connectionString,
        forward_sql: formData.forward_sql,
        rollback_sql: formData.rollback_sql,
      });

      setSqlTestResult({
        success: result.success,
        message: result.message || (result.success
          ? 'SQL test successful! Forward and rollback executed correctly.'
          : result.errors?.join('; ') || 'SQL test failed'),
      });
    } catch (err) {
      setSqlTestResult({ success: false, message: extractApiError(err) });
    } finally {
      setTestingSQL(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.migration_name || !formData.version || !formData.forward_sql) {
      setError('Migration name, version, and forward SQL are required');
      return;
    }

    if (!formData.rollback_sql || formData.rollback_sql.trim() === '') {
      setError('Rollback SQL is MANDATORY. Every migration must have a rollback strategy.');
      return;
    }

    if (!formData.environment_connections.production || formData.environment_connections.production.trim() === '') {
      setError('Production Connection String is MANDATORY.');
      return;
    }

    setIsSubmitting(true);
    try {
      const cleanConnections: Record<string, string> = {};
      Object.entries(formData.environment_connections).forEach(([env, conn]) => {
        if (conn && conn.trim() !== '') {
          cleanConnections[env] = conn.trim();
        }
      });

      await schemaMigrationsApi.create({
        ...formData,
        environment_connections: cleanConnections
      });
      onSuccess();
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setIsSubmitting(false);
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
        maxWidth: 800,
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
          <h2 style={{
            fontSize: 18,
            fontWeight: 700,
            color: asciiColors.accent,
            margin: 0,
            fontFamily: 'Consolas'
          }}>
            {ascii.blockFull} CREATE MIGRATION
          </h2>
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

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: 11,
                color: asciiColors.muted,
                marginBottom: 4,
                fontFamily: 'Consolas'
              }}>
                Migration Name *
              </label>
              <input
                type="text"
                value={formData.migration_name}
                onChange={(e) => setFormData({ ...formData, migration_name: e.target.value })}
                placeholder="e.g., add_user_email_column"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: `1px solid ${asciiColors.border}`,
                  borderRadius: 2,
                  background: asciiColors.backgroundSoft,
                  color: asciiColors.foreground,
                  fontFamily: 'Consolas',
                  fontSize: 12
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: 11,
                  color: asciiColors.muted,
                  marginBottom: 4,
                  fontFamily: 'Consolas'
                }}>
                  Version *
                </label>
                <input
                  type="text"
                  value={formData.version}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                  placeholder="e.g., 1.0.0"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: `1px solid ${asciiColors.border}`,
                    borderRadius: 2,
                    background: asciiColors.backgroundSoft,
                    color: asciiColors.foreground,
                    fontFamily: 'Consolas',
                    fontSize: 12
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: 11,
                  color: asciiColors.muted,
                  marginBottom: 4,
                  fontFamily: 'Consolas'
                }}>
                  DB Engine
                </label>
                <select
                  value={formData.db_engine}
                  onChange={(e) => setFormData({ ...formData, db_engine: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: `1px solid ${asciiColors.border}`,
                    borderRadius: 2,
                    background: asciiColors.backgroundSoft,
                    color: asciiColors.foreground,
                    fontFamily: 'Consolas',
                    fontSize: 12,
                    cursor: 'pointer'
                  }}
                >
                  <option value="PostgreSQL">PostgreSQL</option>
                  <option value="MariaDB">MariaDB</option>
                  <option value="MSSQL">MSSQL</option>
                  <option value="Oracle">Oracle</option>
                  <option value="MongoDB">MongoDB</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: 11,
                color: asciiColors.muted,
                marginBottom: 4,
                fontFamily: 'Consolas'
              }}>
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe what this migration does..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: `1px solid ${asciiColors.border}`,
                  borderRadius: 2,
                  background: asciiColors.backgroundSoft,
                  color: asciiColors.foreground,
                  fontFamily: 'Consolas',
                  fontSize: 12,
                  resize: 'vertical'
                }}
              />
            </div>

            <div>
              <div style={{
                fontSize: 11,
                color: asciiColors.muted,
                marginBottom: 12,
                fontFamily: 'Consolas',
                fontWeight: 600
              }}>
                {ascii.blockSemi} ENVIRONMENT CONNECTION STRINGS
              </div>
              {(['dev', 'staging', 'qa', 'production'] as const).map((env) => {
                const isRequired = env === 'production';
                const connectionString = formData.environment_connections[env];
                const testResult = connectionTestResults[env];
                const isTesting = testingConnection.testing && testingConnection.env === env;

                return (
                  <div key={env} style={{ marginBottom: 16 }}>
                    <ConnectionStringSelector
                      value={connectionString}
                      onChange={(val) => {
                        setFormData(prev => ({
                          ...prev,
                          environment_connections: {
                            ...prev.environment_connections,
                            [env]: val
                          }
                        }));
                        setConnectionTestResults(prev => ({ ...prev, [env]: undefined as any }));
                      }}
                      dbEngine={formData.db_engine}
                      label={`${env.charAt(0).toUpperCase() + env.slice(1)} Connection`}
                      required={isRequired}
                      onTestConnection={() => handleTestConnection(env)}
                      isTesting={isTesting}
                      testResult={testResult || null}
                    />
                  </div>
                );
              })}
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: 11,
                color: asciiColors.muted,
                marginBottom: 4,
                fontFamily: 'Consolas'
              }}>
                Forward SQL *
              </label>
              <textarea
                value={formData.forward_sql}
                onChange={(e) => setFormData({ ...formData, forward_sql: e.target.value })}
                placeholder="ALTER TABLE users ADD COLUMN email VARCHAR(255);"
                rows={8}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: `1px solid ${asciiColors.border}`,
                  borderRadius: 2,
                  background: asciiColors.backgroundSoft,
                  color: asciiColors.foreground,
                  fontFamily: 'Consolas',
                  fontSize: 11,
                  resize: 'vertical'
                }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <label style={{
                  display: 'block',
                  fontSize: 11,
                  color: asciiColors.muted,
                  fontFamily: 'Consolas'
                }}>
                  Rollback SQL * (MANDATORY)
                </label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <select
                    value={sqlTestEnvironment}
                    onChange={(e) => setSqlTestEnvironment(e.target.value)}
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
                    <option value="dev">Test on Dev</option>
                    <option value="staging">Test on Staging</option>
                    <option value="qa">Test on QA</option>
                    <option value="production">Test on Production</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleTestSQL}
                    disabled={testingSQL || !formData.forward_sql || !formData.rollback_sql || !formData.environment_connections[sqlTestEnvironment as keyof typeof formData.environment_connections]}
                    style={{
                      padding: '6px 12px',
                      border: `1px solid ${asciiColors.accent}`,
                      borderRadius: 2,
                      background: asciiColors.accent,
                      color: asciiColors.background,
                      cursor: (testingSQL || !formData.forward_sql || !formData.rollback_sql || !formData.environment_connections[sqlTestEnvironment as keyof typeof formData.environment_connections]) ? 'not-allowed' : 'pointer',
                      fontSize: 11,
                      fontFamily: 'Consolas',
                      fontWeight: 600,
                      opacity: (testingSQL || !formData.forward_sql || !formData.rollback_sql || !formData.environment_connections[sqlTestEnvironment as keyof typeof formData.environment_connections]) ? 0.5 : 1
                    }}
                  >
                    {testingSQL ? 'TESTING...' : 'TEST SQL'}
                  </button>
                </div>
              </div>
              <textarea
                value={formData.rollback_sql}
                onChange={(e) => {
                  setFormData({ ...formData, rollback_sql: e.target.value });
                  setSqlTestResult(null);
                }}
                placeholder="ALTER TABLE users DROP COLUMN email;"
                rows={8}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: `1px solid ${asciiColors.border}`,
                  borderRadius: 2,
                  background: asciiColors.backgroundSoft,
                  color: asciiColors.foreground,
                  fontFamily: 'Consolas',
                  fontSize: 11,
                  resize: 'vertical'
                }}
              />
              {sqlTestResult && (
                <div style={{
                  marginTop: 8,
                  padding: 8,
                  background: sqlTestResult.success ? (asciiColors.success + '20') : (asciiColors.danger + '20'),
                  border: `1px solid ${sqlTestResult.success ? asciiColors.success : asciiColors.danger}`,
                  borderRadius: 2,
                  color: sqlTestResult.success ? asciiColors.success : asciiColors.danger,
                  fontSize: 11,
                  fontFamily: 'Consolas'
                }}>
                  {sqlTestResult.success ? '✓ ' : '✗ '}
                  {sqlTestResult.message}
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
              gap: 12,
              justifyContent: 'flex-end',
              marginTop: 8
            }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '8px 16px',
                  border: `1px solid ${asciiColors.muted}`,
                  borderRadius: 2,
                  background: asciiColors.muted,
                  color: asciiColors.background,
                  cursor: 'pointer',
                  fontSize: 12,
                  fontFamily: 'Consolas',
                  fontWeight: 600
                }}
              >
                CANCEL
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  padding: '8px 16px',
                  border: `1px solid ${asciiColors.accent}`,
                  borderRadius: 2,
                  background: asciiColors.accent,
                  color: asciiColors.background,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  fontSize: 12,
                  fontFamily: 'Consolas',
                  fontWeight: 600,
                  opacity: isSubmitting ? 0.5 : 1
                }}
              >
                {isSubmitting ? 'CREATING...' : 'CREATE MIGRATION'}
              </button>
            </div>
          </div>
        </form>
      </AsciiPanel>
      </div>
    </div>
  );
};

export default CreateMigrationModal;

