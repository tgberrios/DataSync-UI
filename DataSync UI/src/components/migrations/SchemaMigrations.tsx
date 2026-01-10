import { useState, useEffect, useCallback, useRef } from 'react';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { usePagination } from '../../hooks/usePagination';
import { useTableFilters } from '../../hooks/useTableFilters';
import { schemaMigrationsApi } from '../../services/api';
import type { SchemaMigrationEntry } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import { sanitizeSearch } from '../../utils/validation';
import SchemaMigrationsTreeView from './SchemaMigrationsTreeView';
import CreateMigrationModal from './CreateMigrationModal';
import MigrationDetailsModal from './MigrationDetailsModal';
import MigrationIntegrityDashboard from './MigrationIntegrityDashboard';
import MigrationChainView from './MigrationChainView';
import UnregisteredChangesDetector from './UnregisteredChangesDetector';
import TestMigrationModal from './TestMigrationModal';

const SchemaMigrations = () => {
  const { setPage } = usePagination(1, 20);
  const { filters, setFilter } = useTableFilters({
    status: '',
    environment: '',
    db_engine: ''
  });
  
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [allMigrations, setAllMigrations] = useState<SchemaMigrationEntry[]>([]);
  const [loadingTree, setLoadingTree] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedMigration, setSelectedMigration] = useState<SchemaMigrationEntry | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'migrations' | 'chain' | 'detector' | 'dashboard'>('migrations');
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchAllMigrations = useCallback(async () => {
    if (!isMountedRef.current) return;
    try {
      setLoadingTree(true);
      setError(null);
      const sanitizedSearch = sanitizeSearch(search, 100);
      const params: any = {
        page: 1,
        limit: 10000,
        search: sanitizedSearch
      };
      
      if (filters.status) params.status = filters.status;
      if (filters.environment) params.environment = filters.environment;
      if (filters.db_engine) params.db_engine = filters.db_engine;
      
      const response = await schemaMigrationsApi.getAll(params);
      const migrationsArray = response.migrations || [];
      
      if (isMountedRef.current) {
        setAllMigrations(migrationsArray);
      }
    } catch (err) {
      console.error('Error in fetchAllMigrations:', err);
      if (isMountedRef.current) {
        setError(extractApiError(err));
      }
    } finally {
      if (isMountedRef.current) {
        setLoadingTree(false);
      }
    }
  }, [search, filters]);

  useEffect(() => {
    fetchAllMigrations();
  }, [fetchAllMigrations]);

  const handleSearch = useCallback(() => {
    setSearch(searchInput);
    setPage(1);
  }, [searchInput, setPage]);

  const handleCreateMigration = useCallback(() => {
    setIsCreateModalOpen(true);
  }, []);

  const handleMigrationCreated = useCallback(() => {
    setIsCreateModalOpen(false);
    fetchAllMigrations();
  }, [fetchAllMigrations]);

  const handleViewMigration = useCallback((migration: SchemaMigrationEntry) => {
    setSelectedMigration(migration);
    setIsDetailsModalOpen(true);
  }, []);

  const handleTestMigration = useCallback((migration: SchemaMigrationEntry) => {
    setSelectedMigration(migration);
    setIsTestModalOpen(true);
  }, []);

  const handleApplyMigration = useCallback(async (migrationName: string, environment: string) => {
    try {
      await schemaMigrationsApi.apply(migrationName, environment);
      alert('✅ Migration applied successfully');
      fetchAllMigrations();
      if (selectedMigration?.migration_name === migrationName) {
        setIsDetailsModalOpen(false);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(extractApiError(err));
      }
    }
  }, [fetchAllMigrations, selectedMigration]);

  const handleRollbackMigration = useCallback(async (migrationName: string, environment: string) => {
    const confirmMessage = `⚠️ WARNING: This will rollback migration "${migrationName}" in environment "${environment}".\n\n` +
      `This action cannot be undone. Are you absolutely sure?`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      await schemaMigrationsApi.rollback(migrationName, environment);
      alert('✅ Migration rolled back successfully');
      fetchAllMigrations();
      if (selectedMigration?.migration_name === migrationName) {
        setIsDetailsModalOpen(false);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(extractApiError(err));
      }
    }
  }, [fetchAllMigrations, selectedMigration]);

  return (
    <div style={{ padding: '20px', minHeight: '100vh', background: asciiColors.background }}>
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
            <h1 style={{
              fontSize: 24,
              fontWeight: 700,
              color: asciiColors.accent,
              margin: 0,
              fontFamily: 'Consolas'
            }}>
              {ascii.blockFull} SCHEMA MIGRATIONS
            </h1>
            <p style={{
              fontSize: 12,
              color: asciiColors.muted,
              margin: '4px 0 0 0',
              fontFamily: 'Consolas'
            }}>
              Version control and deployment for database schemas
            </p>
          </div>
          <AsciiButton 
            label={`${ascii.blockSemi} CREATE MIGRATION`}
            onClick={handleCreateMigration}
          />
        </div>

        <div style={{
          display: 'flex',
          gap: 12,
          marginBottom: 16,
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search migrations..."
            style={{
              flex: 1,
              minWidth: 200,
              padding: '8px 12px',
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2,
              background: asciiColors.backgroundSoft,
              color: asciiColors.foreground,
              fontFamily: 'Consolas',
              fontSize: 12
            }}
          />
          <button
            onClick={handleSearch}
            style={{
              minWidth: 100,
              padding: '8px 12px',
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
            SEARCH
          </button>

          <select
            value={filters.status as string}
            onChange={(e) => {
              setFilter('status', e.target.value);
              setPage(1);
            }}
            style={{
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
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="APPLIED">Applied</option>
            <option value="FAILED">Failed</option>
            <option value="ROLLED_BACK">Rolled Back</option>
          </select>

          <select
            value={filters.environment as string}
            onChange={(e) => {
              setFilter('environment', e.target.value);
              setPage(1);
            }}
            style={{
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
            <option value="">All Environments</option>
            <option value="dev">Development</option>
            <option value="staging">Staging</option>
            <option value="qa">QA</option>
            <option value="production">Production</option>
          </select>

          <select
            value={filters.db_engine as string}
            onChange={(e) => {
              setFilter('db_engine', e.target.value);
              setPage(1);
            }}
            style={{
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
            <option value="">All DB Engines</option>
            <option value="PostgreSQL">PostgreSQL</option>
            <option value="MariaDB">MariaDB</option>
            <option value="MSSQL">MSSQL</option>
            <option value="Oracle">Oracle</option>
            <option value="MongoDB">MongoDB</option>
          </select>
        </div>

        {error && (
          <div style={{
            padding: 12,
            marginBottom: 16,
            background: asciiColors.danger + '20',
            border: `1px solid ${asciiColors.danger}`,
            borderRadius: 2,
            color: asciiColors.danger,
            fontSize: 12,
            fontFamily: 'Consolas'
          }}>
            {ascii.blockFull} ERROR: {error}
          </div>
        )}

        <SchemaMigrationsTreeView
          migrations={allMigrations}
          loading={loadingTree}
          onViewMigration={handleViewMigration}
          onApplyMigration={handleApplyMigration}
          onRollbackMigration={handleRollbackMigration}
          onTestMigration={handleTestMigration}
        />
      </AsciiPanel>

      {isCreateModalOpen && (
        <CreateMigrationModal
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={handleMigrationCreated}
        />
      )}

      {isDetailsModalOpen && selectedMigration && (
        <MigrationDetailsModal
          migration={selectedMigration}
          onClose={() => {
            setIsDetailsModalOpen(false);
            setSelectedMigration(null);
          }}
          onApply={handleApplyMigration}
          onRollback={handleRollbackMigration}
          onTest={handleTestMigration}
        />
      )}

      {isTestModalOpen && selectedMigration && (
        <TestMigrationModal
          migration={selectedMigration}
          onClose={() => {
            setIsTestModalOpen(false);
            setSelectedMigration(null);
          }}
          onTestSuccess={() => {
            setIsTestModalOpen(false);
            fetchAllMigrations();
          }}
        />
      )}
    </div>
  );
};

export default SchemaMigrations;

