import { useState, useEffect, useCallback, useRef } from 'react';
import AddCSVModal from './AddCSVModal';
import CSVCatalogTreeView from './CSVCatalogTreeView';
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
import { csvCatalogApi, CSVCatalogEntry } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import { sanitizeSearch } from '../../utils/validation';

const CSVCatalog = () => {
  const { page, limit, setPage } = usePagination(1, 20);
  const { filters, setFilter } = useTableFilters({
    source_type: '',
    target_db_engine: '',
    status: '',
    active: ''
  });
  
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [data, setData] = useState<CSVCatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [duplicateData, setDuplicateData] = useState<any>(null);
  const [allEntries, setAllEntries] = useState<CSVCatalogEntry[]>([]);
  const [loadingTree, setLoadingTree] = useState(false);
  const isMountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    if (!isMountedRef.current) return;
    try {
      setLoading(true);
      setError(null);
      const sanitizedSearch = sanitizeSearch(search, 100);
      const params: any = {
        page,
        limit,
        search: sanitizedSearch
      };
      
      if (filters.source_type) params.source_type = filters.source_type;
      if (filters.target_db_engine) params.target_db_engine = filters.target_db_engine;
      if (filters.status) params.status = filters.status;
      if (filters.active) params.active = filters.active;
      
      const response = await csvCatalogApi.getCSVs(params);
      if (isMountedRef.current) {
        setData(response.data);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(extractApiError(err));
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [
    page, 
    limit, 
    filters.source_type, 
    filters.target_db_engine, 
    filters.status, 
    filters.active, 
    search
  ]);

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
      
      if (filters.source_type) params.source_type = filters.source_type;
      if (filters.target_db_engine) params.target_db_engine = filters.target_db_engine;
      if (filters.status) params.status = filters.status;
      if (filters.active) params.active = filters.active;
      
      const response = await csvCatalogApi.getCSVs(params);
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
  }, [filters.source_type, filters.target_db_engine, filters.status, filters.active, search]);

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
    async (newEntry: any) => {
      try {
        setLoading(true);
        setError(null);
        await csvCatalogApi.createCSV(newEntry);
        await fetchAllEntries();
        setShowAddModal(false);
        alert(`CSV "${newEntry.csv_name}" added successfully.`);
      } catch (err: any) {
        if (isMountedRef.current) {
          if (err.message && err.message.includes('Network Error')) {
            setError('Network error. Please check if the server is running and try again.');
          } else {
            setError(extractApiError(err));
          }
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    },
    [fetchAllEntries]
  );

  const handleToggleActive = useCallback(async (csvName: string, currentActive: boolean) => {
    try {
      await csvCatalogApi.updateActive(csvName, !currentActive);
      fetchAllEntries();
    } catch (err) {
      if (isMountedRef.current) {
        setError(extractApiError(err));
      }
    }
  }, [fetchAllEntries]);

  const handleDuplicate = useCallback((entry: CSVCatalogEntry) => {
    setDuplicateData(entry);
    setShowAddModal(true);
  }, []);

  if (loadingTree && allEntries.length === 0) {
    return (
      <Container>
        <Header>CSV Catalog</Header>
        <LoadingOverlay>Loading CSV Catalog...</LoadingOverlay>
      </Container>
    );
  }

  return (
    <Container>
      <Header>CSV Catalog</Header>
      
      {error && <ErrorMessage>{error}</ErrorMessage>}

      <SearchContainer>
        <SearchInput
          type="text"
          placeholder="Search by CSV name, source path, or target..."
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
          Add CSV
        </Button>
        
        <Select
          value={filters.source_type as string}
          onChange={(e) => handleFilterChange('source_type', e.target.value)}
        >
          <option value="">All Source Types</option>
          <option value="FILEPATH">File Path</option>
          <option value="URL">URL</option>
          <option value="ENDPOINT">Endpoint</option>
          <option value="UPLOADED_FILE">Uploaded File</option>
        </Select>

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
        <CSVCatalogTreeView 
          entries={allEntries}
          onEntryClick={(entry) => handleToggleActive(entry.csv_name, entry.active)}
          onDuplicate={handleDuplicate}
        />
      )}

      {showAddModal && (
        <AddCSVModal
          onClose={() => {
            setShowAddModal(false);
            setDuplicateData(null);
          }}
          onSave={handleAdd}
          initialData={duplicateData}
        />
      )}
    </Container>
  );
};

export default CSVCatalog;

