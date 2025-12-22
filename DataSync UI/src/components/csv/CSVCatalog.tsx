import { useState, useEffect, useCallback, useRef } from 'react';
import AddCSVModal from './AddCSVModal';
import CSVCatalogTreeView from './CSVCatalogTreeView';
import { ExecutionTimeline } from '../shared/ExecutionTimeline';
import { MappingGraph } from '../shared/MappingGraph';
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
import { csvCatalogApi } from '../../services/api';
import type { CSVCatalogEntry } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import { sanitizeSearch } from '../../utils/validation';

const CSVCatalog = () => {
  const { setPage } = usePagination(1, 20);
  const { filters, setFilter } = useTableFilters({
    source_type: '',
    target_db_engine: '',
    status: '',
    active: ''
  });
  
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [duplicateData, setDuplicateData] = useState<any>(null);
  const [allEntries, setAllEntries] = useState<CSVCatalogEntry[]>([]);
  const [loadingTree, setLoadingTree] = useState(false);
  const [selectedCSV, setSelectedCSV] = useState<CSVCatalogEntry | null>(null);
  const [executionHistory, setExecutionHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [tableStructure, setTableStructure] = useState<any>(null);
  const [loadingStructure, setLoadingStructure] = useState(false);
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
    async (newEntry: {
      csv_name: string;
      source_type: string;
      source_path: string;
      has_header: boolean;
      delimiter: string;
      skip_rows: number;
      skip_empty_rows: boolean;
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
        await csvCatalogApi.createCSV(newEntry);
        await fetchAllEntries();
        setShowAddModal(false);
        alert(`CSV "${newEntry.csv_name}" added successfully.`);
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


  const handleDuplicate = useCallback((entry: CSVCatalogEntry) => {
    setDuplicateData(entry);
    setShowAddModal(true);
  }, []);

  const handleCSVClick = useCallback(async (entry: CSVCatalogEntry) => {
    setSelectedCSV(entry);
    setLoadingHistory(true);
    setLoadingStructure(true);
    
    try {
      const [history, structure] = await Promise.all([
        csvCatalogApi.getHistory(entry.csv_name),
        csvCatalogApi.getTableStructure(entry.csv_name).catch(() => null)
      ]);
      
      if (isMountedRef.current) {
        setExecutionHistory(history);
        setTableStructure(structure);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(extractApiError(err));
        setExecutionHistory([]);
        setTableStructure(null);
      }
    } finally {
      if (isMountedRef.current) {
        setLoadingHistory(false);
        setLoadingStructure(false);
      }
    }
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
          onEntryClick={(entry: CSVCatalogEntry) => handleCSVClick(entry)}
          onDuplicate={handleDuplicate}
        />
      )}

      {selectedCSV && (
        <ExecutionTimeline
          title={`Execution Timeline: ${selectedCSV.csv_name}`}
          history={executionHistory}
          loading={loadingHistory}
          tableStructure={tableStructure}
          loadingStructure={loadingStructure}
          onClose={() => {
            setSelectedCSV(null);
            setExecutionHistory([]);
            setTableStructure(null);
          }}
          renderMappingGraph={(tableStructure: any, loadingStructure: boolean) => (
            <MappingGraph
              tableStructure={tableStructure}
              loading={loadingStructure}
              sourceTitle="Source: CSV"
              sourceType={selectedCSV.source_type}
              sourceInfo={[
                { label: 'CSV Name', value: selectedCSV.csv_name },
                { label: 'Source Path', value: selectedCSV.source_path },
                { label: 'Source Type', value: selectedCSV.source_type },
                { label: 'Delimiter', value: selectedCSV.delimiter || ',' },
                { label: 'Has Header', value: selectedCSV.has_header ? 'Yes' : 'No' },
                { label: 'Skip Rows', value: String(selectedCSV.skip_rows || 0) },
              ]}
            />
          )}
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

