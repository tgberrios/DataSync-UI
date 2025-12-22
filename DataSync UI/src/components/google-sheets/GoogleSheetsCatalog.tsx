import { useState, useEffect, useCallback, useRef } from 'react';
import AddGoogleSheetsModal from './AddGoogleSheetsModal';
import GoogleSheetsCatalogTreeView from './GoogleSheetsCatalogTreeView';
import {
  Container,
  Header,
  FiltersContainer,
  Select,
  ErrorMessage,
  LoadingOverlay,
  SearchContainer,
  Button,
  SearchInput,
  SearchButton,
  ClearSearchButton,
} from '../shared/BaseComponents';
import { usePagination } from '../../hooks/usePagination';
import { useTableFilters } from '../../hooks/useTableFilters';
import { googleSheetsCatalogApi } from '../../services/api';
import type { GoogleSheetsCatalogEntry } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import { sanitizeSearch } from '../../utils/validation';

const GoogleSheetsCatalog = () => {
  const { setPage } = usePagination(1, 20);
  const { filters, setFilter } = useTableFilters({
    target_db_engine: '',
    status: '',
    active: ''
  });
  
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [duplicateData, setDuplicateData] = useState<GoogleSheetsCatalogEntry | null>(null);
  const [allEntries, setAllEntries] = useState<GoogleSheetsCatalogEntry[]>([]);
  const [loadingTree, setLoadingTree] = useState(false);
  const isMountedRef = useRef(true);

  const fetchAllEntries = useCallback(async () => {
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
      
      if (filters.target_db_engine) params.target_db_engine = filters.target_db_engine;
      if (filters.status) params.status = filters.status;
      if (filters.active) params.active = filters.active;
      
      const response = await googleSheetsCatalogApi.getSheets(params);
      if (isMountedRef.current) {
        setAllEntries(response.data || []);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(extractApiError(err));
      }
    } finally {
      if (isMountedRef.current) {
        setLoadingTree(false);
      }
    }
  }, [filters.target_db_engine, filters.status, filters.active, search]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchAllEntries();
    const interval = setInterval(() => {
      if (isMountedRef.current && !showAddModal) {
        fetchAllEntries();
      }
    }, 30000);
    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchAllEntries, showAddModal]);

  const handleSearch = useCallback(() => {
    setSearch(searchInput);
    setPage(1);
  }, [searchInput, setPage]);

  const handleClearSearch = useCallback(() => {
    setSearchInput('');
    setSearch('');
    setPage(1);
  }, [setPage]);

  const handleFilterChange = useCallback((key: string, value: string) => {
    setFilter(key as any, value);
    setPage(1);
  }, [setFilter, setPage]);

  const handleAdd = useCallback(
    async (newEntry: {
      sheet_name: string;
      spreadsheet_id: string;
      api_key: string;
      access_token: string;
      range: string;
      target_db_engine: string;
      target_connection_string: string;
      target_schema: string;
      target_table: string;
      sync_interval: number;
      status: string;
      active: boolean;
    }) => {
      try {
        setError(null);
        await googleSheetsCatalogApi.createSheet(newEntry);
        await fetchAllEntries();
        setShowAddModal(false);
        alert(`Google Sheets "${newEntry.sheet_name}" added successfully.`);
      } catch (err: unknown) {
        if (isMountedRef.current) {
          const error = err as { message?: string };
          if (error.message && error.message.includes('Network Error')) {
            setError('Network error. Please check if the server is running and try again.');
          } else {
            setError(extractApiError(err));
          }
        }
      }
    },
    [fetchAllEntries]
  );

  const handleToggleActive = useCallback(async (sheetName: string, currentActive: boolean) => {
    try {
      await googleSheetsCatalogApi.updateActive(sheetName, !currentActive);
      fetchAllEntries();
    } catch (err) {
      if (isMountedRef.current) {
        setError(extractApiError(err));
      }
    }
  }, [fetchAllEntries]);

  const handleDuplicate = useCallback((entry: GoogleSheetsCatalogEntry) => {
    setDuplicateData(entry);
    setShowAddModal(true);
  }, []);

  if (loadingTree && allEntries.length === 0) {
    return (
      <Container>
        <Header>Google Sheets Catalog</Header>
        <LoadingOverlay>Loading Google Sheets Catalog...</LoadingOverlay>
      </Container>
    );
  }

  return (
    <Container>
      <Header>Google Sheets Catalog</Header>
      
      {error && <ErrorMessage>{error}</ErrorMessage>}

      <SearchContainer>
        <SearchInput
          type="text"
          placeholder="Search by sheet name, spreadsheet ID, or target..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        />
        <SearchButton onClick={handleSearch}>Search</SearchButton>
        {search && (
          <ClearSearchButton onClick={handleClearSearch}>Clear</ClearSearchButton>
        )}
      </SearchContainer>

      <FiltersContainer>
        <Button
          $variant="primary"
          onClick={() => setShowAddModal(true)}
        >
          Add Google Sheet
        </Button>

        <Select
          value={filters.target_db_engine as string}
          onChange={(e) => handleFilterChange('target_db_engine', e.target.value)}
        >
          <option value="">All Target Engines</option>
          <option value="PostgreSQL">PostgreSQL</option>
          <option value="MariaDB">MariaDB</option>
          <option value="MSSQL">MSSQL</option>
          <option value="MongoDB">MongoDB</option>
          <option value="Oracle">Oracle</option>
        </Select>

        <Select
          value={filters.status as string}
          onChange={(e) => handleFilterChange('status', e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="SUCCESS">SUCCESS</option>
          <option value="ERROR">ERROR</option>
          <option value="IN_PROGRESS">IN_PROGRESS</option>
          <option value="PENDING">PENDING</option>
        </Select>

        <Select
          value={filters.active as string}
          onChange={(e) => handleFilterChange('active', e.target.value)}
        >
          <option value="">All</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </Select>
      </FiltersContainer>

      {loadingTree ? (
        <LoadingOverlay>Loading tree view...</LoadingOverlay>
      ) : (
        <GoogleSheetsCatalogTreeView 
          entries={allEntries}
          onEntryClick={(entry) => handleToggleActive(entry.sheet_name, entry.active)}
          onDuplicate={handleDuplicate}
        />
      )}

      {showAddModal && (
        <AddGoogleSheetsModal
          onClose={() => {
            setShowAddModal(false);
            setDuplicateData(null);
          }}
          onSave={handleAdd}
          initialData={duplicateData || undefined}
        />
      )}
    </Container>
  );
};

export default GoogleSheetsCatalog;

