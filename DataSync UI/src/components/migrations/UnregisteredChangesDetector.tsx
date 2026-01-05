import { useState } from 'react';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { schemaMigrationsApi } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';

interface UnregisteredChange {
  type: 'table' | 'column' | 'index' | 'constraint';
  name: string;
  schema?: string;
  table?: string;
  details?: any;
}

interface UnregisteredChangesResult {
  unregistered_tables: UnregisteredChange[];
  unregistered_columns: UnregisteredChange[];
  unregistered_indexes: UnregisteredChange[];
  unregistered_constraints: UnregisteredChange[];
}

const UnregisteredChangesDetector = () => {
  const [selectedEnvironment, setSelectedEnvironment] = useState('dev');
  const [connectionString, setConnectionString] = useState('');
  const [scanning, setScanning] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<UnregisteredChangesResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleScan = async () => {
    try {
      setScanning(true);
      setError(null);
      const response = await schemaMigrationsApi.detectUnregistered({
        environment: selectedEnvironment,
        connection_string: connectionString || undefined
      });
      setResults(response);
      if (response.unregistered_tables.length === 0 &&
          response.unregistered_columns.length === 0 &&
          response.unregistered_indexes.length === 0 &&
          response.unregistered_constraints.length === 0) {
        alert('✅ No unregistered changes detected! Database is in sync with migration history.');
      }
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setScanning(false);
    }
  };

  const handleGenerateMigration = async () => {
    if (!results) return;
    
    const hasChanges = 
      results.unregistered_tables.length > 0 ||
      results.unregistered_columns.length > 0 ||
      results.unregistered_indexes.length > 0 ||
      results.unregistered_constraints.length > 0;

    if (!hasChanges) {
      alert('No changes to generate migration from');
      return;
    }

    const confirmMessage = `This will generate a migration from ${results.unregistered_tables.length} tables, ${results.unregistered_columns.length} columns, ${results.unregistered_indexes.length} indexes, and ${results.unregistered_constraints.length} constraints.\n\nContinue?`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      setGenerating(true);
      setError(null);
      const response = await schemaMigrationsApi.generateFromDiff({
        environment: selectedEnvironment,
        connection_string: connectionString || undefined,
        changes: results
      });
      alert(`✅ Migration "${response.migration_name}" created successfully!`);
      setResults(null);
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setGenerating(false);
    }
  };

  const totalChanges = results ? 
    results.unregistered_tables.length +
    results.unregistered_columns.length +
    results.unregistered_indexes.length +
    results.unregistered_constraints.length : 0;

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
          {ascii.blockFull} DETECT UNREGISTERED CHANGES
        </h2>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>
        <div>
          <label style={{
            display: 'block',
            fontSize: 11,
            color: asciiColors.muted,
            marginBottom: 4,
            fontFamily: 'Consolas'
          }}>
            Environment
          </label>
          <select
            value={selectedEnvironment}
            onChange={(e) => setSelectedEnvironment(e.target.value)}
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
            <option value="dev">Development</option>
            <option value="staging">Staging</option>
            <option value="production">Production</option>
          </select>
        </div>

        <div>
          <label style={{
            display: 'block',
            fontSize: 11,
            color: asciiColors.muted,
            marginBottom: 4,
            fontFamily: 'Consolas'
          }}>
            Connection String (optional - uses default if empty)
          </label>
          <input
            type="text"
            value={connectionString}
            onChange={(e) => setConnectionString(e.target.value)}
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

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={handleScan}
            disabled={scanning}
            style={{
              padding: '8px 16px',
              border: `1px solid ${asciiColors.accent}`,
              borderRadius: 2,
              background: asciiColors.accent,
              color: asciiColors.background,
              cursor: scanning ? 'not-allowed' : 'pointer',
              fontSize: 12,
              fontFamily: 'Consolas',
              fontWeight: 600,
              opacity: scanning ? 0.5 : 1
            }}
          >
            {scanning ? 'SCANNING...' : 'SCAN DATABASE'}
          </button>
          {results && totalChanges > 0 && (
            <button
              onClick={handleGenerateMigration}
              disabled={generating}
              style={{
                padding: '8px 16px',
                border: `1px solid ${asciiColors.success}`,
                borderRadius: 2,
                background: asciiColors.success,
                color: asciiColors.background,
                cursor: generating ? 'not-allowed' : 'pointer',
                fontSize: 12,
                fontFamily: 'Consolas',
                fontWeight: 600,
                opacity: generating ? 0.5 : 1
              }}
            >
              {generating ? 'GENERATING...' : 'GENERATE MIGRATION'}
            </button>
          )}
        </div>
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

      {results && (
        <div>
          <div style={{
            fontSize: 12,
            fontWeight: 600,
            color: asciiColors.foreground,
            marginBottom: 12,
            fontFamily: 'Consolas',
            padding: 8,
            background: totalChanges > 0 ? asciiColors.warning + '20' : asciiColors.success + '20',
            border: `1px solid ${totalChanges > 0 ? asciiColors.warning : asciiColors.success}`,
            borderRadius: 2
          }}>
            {totalChanges > 0 ? (
              `⚠️ Found ${totalChanges} unregistered change${totalChanges !== 1 ? 's' : ''}`
            ) : (
              '✅ No unregistered changes detected'
            )}
          </div>

          {results.unregistered_tables.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{
                fontSize: 11,
                fontWeight: 600,
                color: asciiColors.foreground,
                marginBottom: 8,
                fontFamily: 'Consolas'
              }}>
                Unregistered Tables ({results.unregistered_tables.length})
              </div>
              <div style={{
                border: `1px solid ${asciiColors.border}`,
                borderRadius: 2,
                maxHeight: 200,
                overflowY: 'auto'
              }}>
                {results.unregistered_tables.map((change, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '8px 12px',
                      borderBottom: idx < results.unregistered_tables.length - 1 ? `1px solid ${asciiColors.border}` : 'none',
                      fontSize: 10,
                      fontFamily: 'Consolas',
                      background: idx % 2 === 0 ? asciiColors.background : asciiColors.backgroundSoft
                    }}
                  >
                    <span style={{ color: asciiColors.foreground, fontWeight: 600 }}>
                      {change.schema ? `${change.schema}.` : ''}{change.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.unregistered_columns.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{
                fontSize: 11,
                fontWeight: 600,
                color: asciiColors.foreground,
                marginBottom: 8,
                fontFamily: 'Consolas'
              }}>
                Unregistered Columns ({results.unregistered_columns.length})
              </div>
              <div style={{
                border: `1px solid ${asciiColors.border}`,
                borderRadius: 2,
                maxHeight: 200,
                overflowY: 'auto'
              }}>
                {results.unregistered_columns.map((change, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '8px 12px',
                      borderBottom: idx < results.unregistered_columns.length - 1 ? `1px solid ${asciiColors.border}` : 'none',
                      fontSize: 10,
                      fontFamily: 'Consolas',
                      background: idx % 2 === 0 ? asciiColors.background : asciiColors.backgroundSoft
                    }}
                  >
                    <span style={{ color: asciiColors.foreground, fontWeight: 600 }}>
                      {change.schema ? `${change.schema}.` : ''}{change.table}.{change.name}
                    </span>
                    {change.details && (
                      <span style={{ color: asciiColors.muted, marginLeft: 8 }}>
                        ({change.details.data_type || 'N/A'})
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.unregistered_indexes.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{
                fontSize: 11,
                fontWeight: 600,
                color: asciiColors.foreground,
                marginBottom: 8,
                fontFamily: 'Consolas'
              }}>
                Unregistered Indexes ({results.unregistered_indexes.length})
              </div>
              <div style={{
                border: `1px solid ${asciiColors.border}`,
                borderRadius: 2,
                maxHeight: 200,
                overflowY: 'auto'
              }}>
                {results.unregistered_indexes.map((change, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '8px 12px',
                      borderBottom: idx < results.unregistered_indexes.length - 1 ? `1px solid ${asciiColors.border}` : 'none',
                      fontSize: 10,
                      fontFamily: 'Consolas',
                      background: idx % 2 === 0 ? asciiColors.background : asciiColors.backgroundSoft
                    }}
                  >
                    <span style={{ color: asciiColors.foreground, fontWeight: 600 }}>
                      {change.name}
                    </span>
                    {change.table && (
                      <span style={{ color: asciiColors.muted, marginLeft: 8 }}>
                        on {change.table}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.unregistered_constraints.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{
                fontSize: 11,
                fontWeight: 600,
                color: asciiColors.foreground,
                marginBottom: 8,
                fontFamily: 'Consolas'
              }}>
                Unregistered Constraints ({results.unregistered_constraints.length})
              </div>
              <div style={{
                border: `1px solid ${asciiColors.border}`,
                borderRadius: 2,
                maxHeight: 200,
                overflowY: 'auto'
              }}>
                {results.unregistered_constraints.map((change, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '8px 12px',
                      borderBottom: idx < results.unregistered_constraints.length - 1 ? `1px solid ${asciiColors.border}` : 'none',
                      fontSize: 10,
                      fontFamily: 'Consolas',
                      background: idx % 2 === 0 ? asciiColors.background : asciiColors.backgroundSoft
                    }}
                  >
                    <span style={{ color: asciiColors.foreground, fontWeight: 600 }}>
                      {change.name}
                    </span>
                    {change.table && (
                      <span style={{ color: asciiColors.muted, marginLeft: 8 }}>
                        on {change.table}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </AsciiPanel>
  );
};

export default UnregisteredChangesDetector;

