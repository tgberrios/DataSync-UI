import { useState } from 'react';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { schemaMigrationsApi } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';

interface CreateMigrationModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CreateMigrationModal = ({ onClose, onSuccess }: CreateMigrationModalProps) => {
  const [formData, setFormData] = useState({
    migration_name: '',
    version: '',
    description: '',
    db_engine: 'PostgreSQL',
    forward_sql: '',
    rollback_sql: '',
    connection_string: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    setIsSubmitting(true);
    try {
      await schemaMigrationsApi.create(formData);
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
              <label style={{
                display: 'block',
                fontSize: 11,
                color: asciiColors.muted,
                marginBottom: 4,
                fontFamily: 'Consolas'
              }}>
                Connection String (optional - for testing)
              </label>
              <input
                type="text"
                value={formData.connection_string}
                onChange={(e) => setFormData({ ...formData, connection_string: e.target.value })}
                placeholder="postgresql://user:pass@host:port/db"
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
              <label style={{
                display: 'block',
                fontSize: 11,
                color: asciiColors.muted,
                marginBottom: 4,
                fontFamily: 'Consolas'
              }}>
                Rollback SQL * (MANDATORY)
              </label>
              <textarea
                value={formData.rollback_sql}
                onChange={(e) => setFormData({ ...formData, rollback_sql: e.target.value })}
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

