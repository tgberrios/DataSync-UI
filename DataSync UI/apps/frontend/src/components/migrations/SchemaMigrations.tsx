import { useState, useEffect, useCallback, useRef } from 'react';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import SkeletonLoader from '../shared/SkeletonLoader';
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
import { Container } from '../shared/BaseComponents';
import { theme } from '../../theme/theme';

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
    
    const startTime = Date.now();
    const minLoadingTime = 300;
    
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
      
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minLoadingTime - elapsed);
      await new Promise(resolve => setTimeout(resolve, remaining));
      
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

  if (loadingTree && allMigrations.length === 0) {
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
          textTransform: 'uppercase',
          fontFamily: 'Consolas'
        }}>
          <span style={{ color: asciiColors.accent, marginRight: theme.spacing.sm }}>{ascii.blockFull}</span>
          SCHEMA MIGRATIONS
        </h1>
        <AsciiButton 
          label={`${ascii.blockSemi} CREATE MIGRATION`}
          onClick={handleCreateMigration}
        />
      </div>

      <div style={{
        display: 'flex',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.md,
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
            padding: `${theme.spacing.sm} ${theme.spacing.md}`,
            border: `1px solid ${asciiColors.border}`,
            borderRadius: 2,
            background: asciiColors.background,
            color: asciiColors.foreground,
            fontFamily: 'Consolas',
            fontSize: 12,
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
        <button
          onClick={handleSearch}
          style={{
            minWidth: 100,
            padding: `${theme.spacing.sm} ${theme.spacing.md}`,
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
            padding: `${theme.spacing.sm} ${theme.spacing.md}`,
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
            padding: `${theme.spacing.sm} ${theme.spacing.md}`,
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
            padding: `${theme.spacing.sm} ${theme.spacing.md}`,
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
          padding: theme.spacing.sm,
          marginBottom: theme.spacing.md,
          background: asciiColors.backgroundSoft,
          border: `1px solid ${asciiColors.border}`,
          borderRadius: 2,
          color: asciiColors.foreground,
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
    </Container>
  );
};

export default SchemaMigrations;

