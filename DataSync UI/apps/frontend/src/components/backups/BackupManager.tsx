import { useState, useEffect, useCallback } from 'react';
import { backupsApi, type BackupEntry } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { AsciiConnectionStringSelector } from '../shared/AsciiConnectionStringSelector';
import SkeletonLoader from '../shared/SkeletonLoader';
import { Container } from '../shared/BaseComponents';
import { theme } from '../../theme/theme';
import BackupManagerTreeView from './BackupManagerTreeView';
import BackupHistoryTreeView from './BackupHistoryTreeView';

const BackupManager = () => {
  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<BackupEntry | null>(null);
  const [filters, setFilters] = useState({
    db_engine: '',
    status: '',
  });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const getConnectionStringExample = (engine: string) => {
    switch (engine) {
      case 'PostgreSQL':
        return 'postgresql://username:password@localhost:5432/database_name';
      case 'MariaDB':
        return 'mysql://username:password@localhost:3306/database_name';
      case 'MongoDB':
        return 'mongodb://username:password@localhost:27017/database_name?authSource=admin';
      case 'Oracle':
        return 'oracle://username:password@localhost:1521/XE';
      default:
        return '';
    }
  };

  const [backupForm, setBackupForm] = useState({
    backup_name: '',
    db_engine: 'PostgreSQL',
    connection_string: getConnectionStringExample('PostgreSQL'),
    database_name: '',
    selected_databases: [] as string[],
    backup_type: 'full' as 'structure' | 'data' | 'full' | 'config',
    cron_schedule: '',
    is_scheduled: false,
  });
  const [backupHistory, setBackupHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyBackupId, setHistoryBackupId] = useState<number | null>(null);
  const [availableDatabases, setAvailableDatabases] = useState<string[]>([]);
  const [connectionTested, setConnectionTested] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);

  useEffect(() => {
    if (backupForm.db_engine) {
      const example = getConnectionStringExample(backupForm.db_engine);
      const currentValue = backupForm.connection_string;
      const isExample = [
        getConnectionStringExample('PostgreSQL'),
        getConnectionStringExample('MariaDB'),
        getConnectionStringExample('MongoDB'),
        getConnectionStringExample('Oracle')
      ].includes(currentValue);
      
      if (!currentValue || isExample) {
        setBackupForm(prev => ({
          ...prev,
          connection_string: example
        }));
        setConnectionTested(false);
        setAvailableDatabases([]);
      }
    }
  }, [backupForm.db_engine]);

  const fetchBackups = useCallback(async () => {
    const startTime = Date.now();
    const minLoadingTime = 300;
    
    try {
      setLoading(true);
      setError(null);
      const params: any = { page, limit };
      if (filters.db_engine) params.db_engine = filters.db_engine;
      if (filters.status) params.status = filters.status;

      const response = await backupsApi.getAll(params);
      
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minLoadingTime - elapsed);
      await new Promise(resolve => setTimeout(resolve, remaining));
      
      setBackups(response.backups || []);
      setTotal(response.total || 0);
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    fetchBackups();
    const interval = setInterval(fetchBackups, 5000);
    return () => clearInterval(interval);
  }, [fetchBackups]);

  const handleTestConnection = useCallback(async () => {
    if (!backupForm.connection_string) {
      setError('Please enter a connection string first');
      return;
    }
    try {
      setError(null);
      setTestingConnection(true);
      await backupsApi.testConnection(backupForm.db_engine, backupForm.connection_string);
      const dbResponse = await backupsApi.discoverDatabases(backupForm.db_engine, backupForm.connection_string);
      setAvailableDatabases(dbResponse.databases || []);
      setConnectionTested(true);
    } catch (err) {
      setError(extractApiError(err));
      setAvailableDatabases([]);
      setConnectionTested(false);
    } finally {
      setTestingConnection(false);
    }
  }, [backupForm.db_engine, backupForm.connection_string]);

  const handleCreateBackup = useCallback(async () => {
    try {
      setError(null);
      
      const databasesToBackup = backupForm.is_scheduled && backupForm.selected_databases.length > 0
        ? backupForm.selected_databases
        : [backupForm.database_name].filter(Boolean);

      if (databasesToBackup.length === 0) {
        setError('Please select at least one database');
        return;
      }

      for (const dbName of databasesToBackup) {
        const backupName = backupForm.is_scheduled
          ? `${dbName}_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`
          : backupForm.backup_name || `${dbName}_backup`;

        await backupsApi.create({
          backup_name: backupName,
          db_engine: backupForm.db_engine,
          connection_string: backupForm.connection_string,
          database_name: dbName,
          backup_type: backupForm.backup_type,
          cron_schedule: backupForm.is_scheduled && backupForm.cron_schedule ? backupForm.cron_schedule : undefined,
        });
      }
      
      setIsModalOpen(false);
      setBackupForm({
        backup_name: '',
        db_engine: 'PostgreSQL',
        connection_string: '',
        database_name: '',
        selected_databases: [],
        backup_type: 'full',
        cron_schedule: '',
        is_scheduled: false,
      });
      setAvailableDatabases([]);
      setConnectionTested(false);
      fetchBackups();
    } catch (err) {
      setError(extractApiError(err));
    }
  }, [backupForm, fetchBackups]);

  const handleViewHistory = useCallback(async (backupId: number) => {
    try {
      setError(null);
      const response = await backupsApi.getHistory(backupId);
      setBackupHistory(response.history || []);
      setHistoryBackupId(backupId);
      setShowHistory(true);
    } catch (err) {
      setError(extractApiError(err));
    }
  }, []);

  const handleToggleSchedule = useCallback(async (backup: BackupEntry) => {
    try {
      setError(null);
      if (backup.is_scheduled) {
        await backupsApi.disableSchedule(backup.backup_id);
      } else {
        await backupsApi.enableSchedule(backup.backup_id);
      }
      fetchBackups();
    } catch (err) {
      setError(extractApiError(err));
    }
  }, [fetchBackups]);

  const handleDeleteBackup = useCallback(async (backupId: number) => {
    if (!confirm('Are you sure you want to delete this backup?')) {
      return;
    }
    try {
      setError(null);
      await backupsApi.delete(backupId);
      fetchBackups();
    } catch (err) {
      setError(extractApiError(err));
    }
  }, [fetchBackups]);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return asciiColors.accent;
      case 'failed':
        return asciiColors.foreground;
      case 'in_progress':
        return asciiColors.muted;
      case 'pending':
        return asciiColors.muted;
      default:
        return asciiColors.foreground;
    }
  };

  if (loading && backups.length === 0) {
    return <SkeletonLoader variant="table" />;
  }

  return (
    <Container>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
        paddingBottom: theme.spacing.md,
        borderBottom: `2px solid ${asciiColors.accent}`
      }}>
        <h1 style={{
          fontSize: 14,
          fontWeight: 600,
          margin: 0,
          color: asciiColors.foreground,
          fontFamily: 'Consolas',
          textTransform: 'uppercase'
        }}>
          <span style={{ color: asciiColors.accent, marginRight: theme.spacing.sm }}>{ascii.blockFull}</span>
          BACKUP MANAGER
        </h1>
        <AsciiButton
          label="+ CREATE BACKUP"
          onClick={() => setIsModalOpen(true)}
          variant="primary"
        />
      </div>

      {error && (
        <div style={{
          padding: theme.spacing.sm,
          marginBottom: theme.spacing.md,
          background: asciiColors.backgroundSoft,
          border: `1px solid ${asciiColors.border}`,
          borderRadius: 2,
          color: asciiColors.foreground,
          fontSize: 12,
          fontFamily: 'Consolas'
        }}>
          {error}
        </div>
      )}

      <div style={{
        display: 'flex',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.md
      }}>
        <select
          value={filters.db_engine}
          onChange={(e) => {
            setFilters(prev => ({ ...prev, db_engine: e.target.value }));
            setPage(1);
          }}
          style={{
            padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
            border: `1px solid ${asciiColors.border}`,
            borderRadius: 2,
            background: asciiColors.background,
            color: asciiColors.foreground,
            fontFamily: 'Consolas',
            fontSize: 12,
            cursor: 'pointer',
            outline: 'none',
            transition: 'border-color 0.15s ease'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = asciiColors.accent;
            e.target.style.outline = `2px solid ${asciiColors.accent}`;
            e.target.style.outlineOffset = '2px';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = asciiColors.border;
            e.target.style.outline = 'none';
          }}
        >
          <option value="">All Engines</option>
          <option value="PostgreSQL">PostgreSQL</option>
          <option value="MariaDB">MariaDB</option>
          <option value="MSSQL">MSSQL</option>
          <option value="MongoDB">MongoDB</option>
          <option value="Oracle">Oracle</option>
          <option value="DB2">DB2</option>
          <option value="Salesforce">Salesforce</option>
          <option value="SAP">SAP</option>
          <option value="Teradata">Teradata</option>
          <option value="Netezza">Netezza</option>
          <option value="Hive">Hive</option>
          <option value="Cassandra">Cassandra</option>
          <option value="DynamoDB">DynamoDB</option>
          <option value="AS400">AS/400</option>
          <option value="S3">S3</option>
          <option value="AzureBlob">Azure Blob</option>
          <option value="GCS">Google Cloud Storage</option>
          <option value="FTP">FTP</option>
          <option value="SFTP">SFTP</option>
          <option value="Email">Email</option>
          <option value="SOAP">SOAP</option>
          <option value="GraphQL">GraphQL</option>
          <option value="Excel">Excel</option>
          <option value="FixedWidth">Fixed Width</option>
          <option value="EBCDIC">EBCDIC</option>
          <option value="XML">XML</option>
          <option value="Avro">Avro</option>
          <option value="Parquet">Parquet</option>
          <option value="ORC">ORC</option>
          <option value="Compressed">Compressed</option>
        </select>

        <select
          value={filters.status}
          onChange={(e) => {
            setFilters(prev => ({ ...prev, status: e.target.value }));
            setPage(1);
          }}
          style={{
            padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
            border: `1px solid ${asciiColors.border}`,
            borderRadius: 2,
            background: asciiColors.background,
            color: asciiColors.foreground,
            fontFamily: 'Consolas',
            fontSize: 12,
            cursor: 'pointer',
            outline: 'none',
            transition: 'border-color 0.15s ease'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = asciiColors.accent;
            e.target.style.outline = `2px solid ${asciiColors.accent}`;
            e.target.style.outlineOffset = '2px';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = asciiColors.border;
            e.target.style.outline = 'none';
          }}
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {loading ? (
        <div style={{
          padding: 40,
          textAlign: 'center',
          color: asciiColors.muted,
          fontFamily: 'Consolas',
          fontSize: 12
        }}>
          Loading backups...
        </div>
      ) : backups.length === 0 ? (
        <div style={{
          padding: 40,
          textAlign: 'center',
          color: asciiColors.muted,
          fontFamily: 'Consolas',
          fontSize: 12
        }}>
          No backups found
        </div>
      ) : (
        <>
          <BackupManagerTreeView
            backups={backups}
            onViewHistory={handleViewHistory}
            onToggleSchedule={handleToggleSchedule}
            onRestore={(backupId) => {
              if (confirm('Restore this backup?')) {
                backupsApi.restore(backupId).then(() => {
                  alert('Restore operation started');
                }).catch(err => {
                  setError(extractApiError(err));
                });
              }
            }}
            onDelete={handleDeleteBackup}
            onSelect={setSelectedBackup}
          />

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: theme.spacing.md,
            paddingTop: theme.spacing.md,
            borderTop: `1px solid ${asciiColors.border}`
          }}>
            <div style={{ color: asciiColors.muted, fontSize: 11, fontFamily: 'Consolas' }}>
              Showing {((page - 1) * limit) + 1} - {Math.min(page * limit, total)} of {total}
            </div>
            <div style={{ display: 'flex', gap: theme.spacing.sm }}>
              <button
                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                disabled={page === 1}
                style={{
                  padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                  border: `1px solid ${asciiColors.border}`,
                  borderRadius: 2,
                  background: page === 1 ? asciiColors.backgroundSoft : asciiColors.background,
                  color: page === 1 ? asciiColors.muted : asciiColors.foreground,
                  cursor: page === 1 ? 'not-allowed' : 'pointer',
                  fontSize: 11,
                  fontFamily: 'Consolas'
                }}
              >
                Previous
              </button>
              <button
                onClick={() => setPage(prev => prev + 1)}
                disabled={page * limit >= total}
                style={{
                  padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                  border: `1px solid ${asciiColors.border}`,
                  borderRadius: 2,
                  background: page * limit >= total ? asciiColors.backgroundSoft : asciiColors.background,
                  color: page * limit >= total ? asciiColors.muted : asciiColors.foreground,
                  cursor: page * limit >= total ? 'not-allowed' : 'pointer',
                  fontSize: 11,
                  fontFamily: 'Consolas'
                }}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      {isModalOpen && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.7)',
              zIndex: 999
            }}
            onClick={() => setIsModalOpen(false)}
          />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: asciiColors.background,
              padding: theme.spacing.lg,
              borderRadius: 2,
              border: `2px solid ${asciiColors.accent}`,
              zIndex: 1000,
              minWidth: 500,
              maxWidth: '90vw',
              maxHeight: '90vh',
              overflowY: 'auto',
              fontFamily: 'Consolas'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <style>{`
              div[style*="overflowY"]::-webkit-scrollbar {
                width: 0px;
                display: none;
              }
              div[style*="overflowY"] {
                -ms-overflow-style: none;
                scrollbar-width: none;
              }
            `}</style>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: theme.spacing.md,
              paddingBottom: theme.spacing.sm,
              borderBottom: `2px solid ${asciiColors.border}`
            }}>
              <h2 style={{
                fontSize: 14,
                fontWeight: 600,
                color: asciiColors.accent,
                margin: 0,
                fontFamily: 'Consolas',
                textTransform: 'uppercase'
              }}>
                {ascii.blockFull} CREATE BACKUP
              </h2>
                  <button
                    onClick={() => {
                      setIsModalOpen(false);
                      setBackupForm({
                        backup_name: '',
                        db_engine: 'PostgreSQL',
                        connection_string: '',
                        database_name: '',
                        selected_databases: [],
                        backup_type: 'full',
                        cron_schedule: '',
                        is_scheduled: false,
                      });
                      setAvailableDatabases([]);
                      setConnectionTested(false);
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: asciiColors.foreground,
                      fontSize: 20,
                      cursor: 'pointer',
                      padding: `0 ${theme.spacing.sm}`,
                      fontFamily: 'Consolas'
                    }}
                  >
                    ×
                  </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
              {!backupForm.is_scheduled && (
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 600,
                    color: asciiColors.foreground,
                    marginBottom: theme.spacing.xs,
                    fontFamily: 'Consolas',
                    textTransform: 'uppercase'
                  }}>
                    {ascii.v} BACKUP NAME *
                  </label>
                  <input
                    type="text"
                    value={backupForm.backup_name}
                    onChange={(e) => setBackupForm(prev => ({ ...prev, backup_name: e.target.value }))}
                    placeholder="my_backup_2024"
                    style={{
                      width: '100%',
                      padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                      border: `1px solid ${asciiColors.border}`,
                      borderRadius: 2,
                      fontSize: 12,
                      fontFamily: 'Consolas',
                      backgroundColor: asciiColors.background,
                      color: asciiColors.foreground,
                      outline: 'none',
                      transition: 'border-color 0.15s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = asciiColors.accent;
                      e.target.style.outline = `2px solid ${asciiColors.accent}`;
                      e.target.style.outlineOffset = '2px';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = asciiColors.border;
                      e.target.style.outline = 'none';
                    }}
                  />
                </div>
              )}
              
              {backupForm.is_scheduled && (
                <div style={{
                  padding: theme.spacing.sm,
                  background: asciiColors.backgroundSoft,
                  border: `1px solid ${asciiColors.accent}`,
                  borderRadius: 2,
                  fontSize: 11,
                  color: asciiColors.muted,
                  fontFamily: 'Consolas'
                }}>
                  {ascii.blockSemi} Backup name will be auto-generated as: database_name_YYYY-MM-DDTHH-MM-SS
                </div>
              )}

              <div>
                <label style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 600,
                  color: asciiColors.foreground,
                  marginBottom: theme.spacing.xs,
                  fontFamily: 'Consolas',
                  textTransform: 'uppercase'
                }}>
                  {ascii.v} DB ENGINE *
                </label>
                <select
                  value={backupForm.db_engine}
                  onChange={(e) => setBackupForm(prev => ({ ...prev, db_engine: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                    border: `1px solid ${asciiColors.border}`,
                    borderRadius: 2,
                    fontSize: 12,
                    fontFamily: 'Consolas',
                    backgroundColor: asciiColors.background,
                    color: asciiColors.foreground,
                    cursor: 'pointer',
                    outline: 'none',
                    transition: 'border-color 0.15s ease'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = asciiColors.accent;
                    e.target.style.outline = `2px solid ${asciiColors.accent}`;
                    e.target.style.outlineOffset = '2px';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = asciiColors.border;
                    e.target.style.outline = 'none';
                  }}
                >
                  <option value="PostgreSQL">PostgreSQL</option>
                  <option value="MariaDB">MariaDB</option>
                  <option value="MSSQL">MSSQL</option>
                  <option value="MongoDB">MongoDB</option>
                  <option value="Oracle">Oracle</option>
                  <option value="DB2">DB2</option>
                  <option value="Salesforce">Salesforce</option>
                  <option value="SAP">SAP</option>
                  <option value="Teradata">Teradata</option>
                  <option value="Netezza">Netezza</option>
                  <option value="Hive">Hive</option>
                  <option value="Cassandra">Cassandra</option>
                  <option value="DynamoDB">DynamoDB</option>
                  <option value="AS400">AS/400</option>
                  <option value="S3">S3</option>
                  <option value="AzureBlob">Azure Blob</option>
                  <option value="GCS">Google Cloud Storage</option>
                  <option value="FTP">FTP</option>
                  <option value="SFTP">SFTP</option>
                  <option value="Email">Email</option>
                  <option value="SOAP">SOAP</option>
                  <option value="GraphQL">GraphQL</option>
                  <option value="Excel">Excel</option>
                  <option value="FixedWidth">Fixed Width</option>
                  <option value="EBCDIC">EBCDIC</option>
                  <option value="XML">XML</option>
                  <option value="Avro">Avro</option>
                  <option value="Parquet">Parquet</option>
                  <option value="ORC">ORC</option>
                  <option value="Compressed">Compressed</option>
                </select>
              </div>

              <div>
                <AsciiConnectionStringSelector
                  value={backupForm.connection_string}
                  onChange={(val) => {
                    setBackupForm(prev => ({ ...prev, connection_string: val }));
                    setConnectionTested(false);
                    setAvailableDatabases([]);
                  }}
                  dbEngine={backupForm.db_engine}
                  label="Connection String"
                  required
                  onTestConnection={handleTestConnection}
                  isTesting={testingConnection}
                  testResult={connectionTested ? {
                    success: true,
                    message: `Connection successful! Found ${availableDatabases.length} database(s)`
                  } : null}
                />
                {connectionTested && availableDatabases.length > 0 && (
                  <div style={{
                    marginTop: theme.spacing.sm,
                    padding: theme.spacing.sm,
                    background: asciiColors.accent + '20',
                    border: `1px solid ${asciiColors.accent}`,
                    borderRadius: 2,
                    fontSize: 11,
                    color: asciiColors.accent,
                    fontFamily: 'Consolas'
                  }}>
                    {ascii.blockSemi} Connection successful! Found {availableDatabases.length} database(s)
                  </div>
                )}
              </div>

              {connectionTested && backupForm.is_scheduled && availableDatabases.length > 0 ? (
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 600,
                    color: asciiColors.foreground,
                    marginBottom: theme.spacing.xs,
                    fontFamily: 'Consolas',
                    textTransform: 'uppercase'
                  }}>
                    {ascii.v} SELECT DATABASES TO BACKUP *
                  </label>
                  <div style={{
                    maxHeight: 200,
                    overflowY: 'auto',
                    border: `1px solid ${asciiColors.border}`,
                    borderRadius: 2,
                    padding: theme.spacing.sm,
                    background: asciiColors.background
                  }}>
                    <style>{`
                      div[style*="overflowY"]::-webkit-scrollbar {
                        width: 0px;
                        display: none;
                      }
                      div[style*="overflowY"] {
                        -ms-overflow-style: none;
                        scrollbar-width: none;
                      }
                    `}</style>
                    {availableDatabases.map((db) => (
                      <div key={db} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: theme.spacing.sm,
                        padding: `${theme.spacing.xs} 0`,
                        fontFamily: 'Consolas',
                        fontSize: 12
                      }}>
                        <input
                          type="checkbox"
                          checked={backupForm.selected_databases.includes(db)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setBackupForm(prev => ({
                                ...prev,
                                selected_databases: [...prev.selected_databases, db]
                              }));
                            } else {
                              setBackupForm(prev => ({
                                ...prev,
                                selected_databases: prev.selected_databases.filter(d => d !== db)
                              }));
                            }
                          }}
                          style={{ cursor: 'pointer' }}
                        />
                        <span style={{ color: asciiColors.foreground }}>{db}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : !backupForm.is_scheduled && (
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 600,
                    color: asciiColors.foreground,
                    marginBottom: theme.spacing.xs,
                    fontFamily: 'Consolas',
                    textTransform: 'uppercase'
                  }}>
                    {ascii.v} DATABASE NAME *
                  </label>
                  {connectionTested && availableDatabases.length > 0 ? (
                    <select
                      value={backupForm.database_name}
                      onChange={(e) => setBackupForm(prev => ({ ...prev, database_name: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                        border: `1px solid ${asciiColors.border}`,
                        borderRadius: 2,
                        fontSize: 12,
                        fontFamily: 'Consolas',
                        backgroundColor: asciiColors.background,
                        color: asciiColors.foreground,
                        cursor: 'pointer',
                        outline: 'none',
                        transition: 'border-color 0.15s ease'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = asciiColors.accent;
                        e.target.style.outline = `2px solid ${asciiColors.accent}`;
                        e.target.style.outlineOffset = '2px';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = asciiColors.border;
                        e.target.style.outline = 'none';
                      }}
                    >
                      <option value="">Select a database</option>
                      {availableDatabases.map((db) => (
                        <option key={db} value={db}>{db}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={backupForm.database_name}
                      onChange={(e) => setBackupForm(prev => ({ ...prev, database_name: e.target.value }))}
                      placeholder="mydatabase"
                      style={{
                        width: '100%',
                        padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                        border: `1px solid ${asciiColors.border}`,
                        borderRadius: 2,
                        fontSize: 12,
                        fontFamily: 'Consolas',
                        backgroundColor: asciiColors.background,
                        color: asciiColors.foreground,
                        outline: 'none',
                        transition: 'border-color 0.15s ease'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = asciiColors.accent;
                        e.target.style.outline = `2px solid ${asciiColors.accent}`;
                        e.target.style.outlineOffset = '2px';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = asciiColors.border;
                        e.target.style.outline = 'none';
                      }}
                    />
                  )}
                </div>
              )}

              <div>
                <label style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 600,
                  color: asciiColors.foreground,
                  marginBottom: theme.spacing.xs,
                  fontFamily: 'Consolas',
                  textTransform: 'uppercase'
                }}>
                  {ascii.v} BACKUP TYPE *
                </label>
                <select
                  value={backupForm.backup_type}
                  onChange={(e) => setBackupForm(prev => ({ ...prev, backup_type: e.target.value as any }))}
                  style={{
                    width: '100%',
                    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                    border: `1px solid ${asciiColors.border}`,
                    borderRadius: 2,
                    fontSize: 12,
                    fontFamily: 'Consolas',
                    backgroundColor: asciiColors.background,
                    color: asciiColors.foreground,
                    cursor: 'pointer',
                    outline: 'none',
                    transition: 'border-color 0.15s ease'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = asciiColors.accent;
                    e.target.style.outline = `2px solid ${asciiColors.accent}`;
                    e.target.style.outlineOffset = '2px';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = asciiColors.border;
                    e.target.style.outline = 'none';
                  }}
                >
                  <option value="full">Full (Structure + Data)</option>
                  <option value="structure">Structure Only</option>
                  <option value="data">Data Only</option>
                  <option value="config">Config Only</option>
                </select>
              </div>

              <div style={{
                padding: theme.spacing.sm,
                background: asciiColors.backgroundSoft,
                border: `1px solid ${asciiColors.border}`,
                borderRadius: 2
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing.sm,
                  marginBottom: theme.spacing.sm
                }}>
                  <input
                    type="checkbox"
                    checked={backupForm.is_scheduled}
                    onChange={(e) => setBackupForm(prev => ({ ...prev, is_scheduled: e.target.checked }))}
                    style={{
                      cursor: 'pointer'
                    }}
                  />
                  <label style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: asciiColors.foreground,
                    fontFamily: 'Consolas',
                    textTransform: 'uppercase',
                    cursor: 'pointer'
                  }}>
                    {ascii.v} ENABLE SCHEDULED BACKUP
                  </label>
                </div>
                {backupForm.is_scheduled && (
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: 11,
                      fontWeight: 600,
                      color: asciiColors.muted,
                      marginBottom: theme.spacing.xs,
                      fontFamily: 'Consolas'
                    }}>
                      CRON SCHEDULE (minute hour day month dow)
                    </label>
                    <input
                      type="text"
                      value={backupForm.cron_schedule}
                      onChange={(e) => setBackupForm(prev => ({ ...prev, cron_schedule: e.target.value }))}
                      placeholder="0 2 * * *"
                      style={{
                        width: '100%',
                        padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                        border: `1px solid ${asciiColors.border}`,
                        borderRadius: 2,
                        fontSize: 12,
                        fontFamily: 'Consolas',
                        backgroundColor: asciiColors.background,
                        color: asciiColors.foreground,
                        outline: 'none',
                        transition: 'border-color 0.15s ease'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = asciiColors.accent;
                        e.target.style.outline = `2px solid ${asciiColors.accent}`;
                        e.target.style.outlineOffset = '2px';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = asciiColors.border;
                        e.target.style.outline = 'none';
                      }}
                    />
                    <div style={{
                      marginTop: theme.spacing.sm,
                      fontSize: 10,
                      color: asciiColors.muted,
                      fontFamily: 'Consolas',
                      fontStyle: 'italic'
                    }}>
                      Examples: "0 2 * * *" (daily at 2 AM), "0 */6 * * *" (every 6 hours), "0 0 * * 0" (weekly on Sunday)
                    </div>
                  </div>
                )}
              </div>

              <div style={{
                display: 'flex',
                gap: 12,
                justifyContent: 'flex-end',
                marginTop: 8,
                paddingTop: 16,
                borderTop: `1px solid ${asciiColors.border}`
              }}>
                <button
                  onClick={() => setIsModalOpen(false)}
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
                  CANCEL
                </button>
                <button
                  onClick={handleCreateBackup}
                  disabled={
                    !backupForm.connection_string || 
                    (backupForm.is_scheduled 
                      ? backupForm.selected_databases.length === 0 
                      : !backupForm.database_name) ||
                    (!backupForm.is_scheduled && !backupForm.backup_name)
                  }
                  style={{
                    padding: '8px 16px',
                    border: `1px solid ${asciiColors.accent}`,
                    borderRadius: 2,
                    background: (
                      !backupForm.connection_string || 
                      (backupForm.is_scheduled 
                        ? backupForm.selected_databases.length === 0 
                        : !backupForm.database_name) ||
                      (!backupForm.is_scheduled && !backupForm.backup_name)
                    ) ? asciiColors.backgroundSoft : asciiColors.accent,
                    color: (
                      !backupForm.connection_string || 
                      (backupForm.is_scheduled 
                        ? backupForm.selected_databases.length === 0 
                        : !backupForm.database_name) ||
                      (!backupForm.is_scheduled && !backupForm.backup_name)
                    ) ? asciiColors.muted : asciiColors.background,
                    cursor: (
                      !backupForm.connection_string || 
                      (backupForm.is_scheduled 
                        ? backupForm.selected_databases.length === 0 
                        : !backupForm.database_name) ||
                      (!backupForm.is_scheduled && !backupForm.backup_name)
                    ) ? 'not-allowed' : 'pointer',
                    fontSize: 12,
                    fontFamily: 'Consolas',
                    fontWeight: 600
                  }}
                >
                  CREATE
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {selectedBackup && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.7)',
              zIndex: 999
            }}
            onClick={() => setSelectedBackup(null)}
          />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: asciiColors.background,
              padding: 24,
              borderRadius: 2,
              border: `2px solid ${asciiColors.accent}`,
              zIndex: 1000,
              minWidth: 600,
              maxWidth: '90vw',
              maxHeight: '90vh',
              overflowY: 'auto',
              fontFamily: 'Consolas'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 20,
              paddingBottom: 12,
              borderBottom: `2px solid ${asciiColors.border}`
            }}>
              <h2 style={{
                fontSize: 14,
                fontWeight: 600,
                color: asciiColors.accent,
                margin: 0,
                fontFamily: 'Consolas',
                textTransform: 'uppercase'
              }}>
                {ascii.blockFull} BACKUP DETAILS
              </h2>
              <button
                onClick={() => setSelectedBackup(null)}
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 12 }}>
              <div><strong>Name:</strong> {selectedBackup.backup_name}</div>
              <div><strong>Engine:</strong> {selectedBackup.db_engine}</div>
              <div><strong>Database:</strong> {selectedBackup.database_name}</div>
              <div><strong>Type:</strong> {selectedBackup.backup_type.toUpperCase()}</div>
              <div><strong>Status:</strong> <span style={{ color: getStatusColor(selectedBackup.status) }}>{selectedBackup.status.toUpperCase()}</span></div>
              <div><strong>Size:</strong> {formatFileSize(selectedBackup.file_size)}</div>
              <div><strong>File Path:</strong> {selectedBackup.file_path}</div>
              <div><strong>Created:</strong> {new Date(selectedBackup.created_at).toLocaleString()}</div>
              {selectedBackup.completed_at && (
                <div><strong>Completed:</strong> {new Date(selectedBackup.completed_at).toLocaleString()}</div>
              )}
              {selectedBackup.created_by && (
                <div><strong>Created By:</strong> {selectedBackup.created_by}</div>
              )}
              {selectedBackup.error_message && (
                <div style={{ color: asciiColors.foreground }}>
                  <strong>Error:</strong> {selectedBackup.error_message}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {showHistory && historyBackupId && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.7)',
              zIndex: 999
            }}
            onClick={() => {
              setShowHistory(false);
              setHistoryBackupId(null);
              setBackupHistory([]);
            }}
          />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: asciiColors.background,
              padding: 24,
              borderRadius: 2,
              border: `2px solid ${asciiColors.accent}`,
              zIndex: 1000,
              minWidth: 800,
              maxWidth: '90vw',
              maxHeight: '90vh',
              overflowY: 'auto',
              fontFamily: 'Consolas'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 20,
              paddingBottom: 12,
              borderBottom: `2px solid ${asciiColors.border}`
            }}>
              <h2 style={{
                fontSize: 14,
                fontWeight: 600,
                color: asciiColors.accent,
                margin: 0,
                fontFamily: 'Consolas',
                textTransform: 'uppercase'
              }}>
                {ascii.blockFull} BACKUP EXECUTION HISTORY
              </h2>
              <button
                onClick={() => {
                  setShowHistory(false);
                  setHistoryBackupId(null);
                  setBackupHistory([]);
                }}
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

            {backupHistory.length === 0 ? (
              <div style={{
                padding: 40,
                textAlign: 'center',
                color: asciiColors.muted,
                fontFamily: 'Consolas',
                fontSize: 12
              }}>
                No execution history found
              </div>
            ) : (
              <BackupHistoryTreeView
                history={backupHistory}
                backupName={backups.find(b => b.backup_id === historyBackupId)?.backup_name}
                backupId={historyBackupId || undefined}
              />
            )}
          </div>
        </>
      )}
    </Container>
  );
};

export default BackupManager;

