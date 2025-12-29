import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Container,
  Header,
  FiltersContainer,
  Select,
  ErrorMessage,
  LoadingOverlay,
  SearchContainer,
  Input,
  Button,
  FormGroup,
  Label,
  SearchInput,
  SearchButton,
  ClearSearchButton,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalTitle,
  TextArea,
} from '../shared/BaseComponents';
import { usePagination } from '../../hooks/usePagination';
import { useTableFilters } from '../../hooks/useTableFilters';
import { customJobsApi } from '../../services/api';
import type { CustomJobEntry } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import { sanitizeSearch } from '../../utils/validation';
import styled from 'styled-components';
import { theme } from '../../theme/theme';
import CustomJobsTreeView from './CustomJobsTreeView';
import { ExecutionTimeline } from '../shared/ExecutionTimeline';
import { MappingGraph } from '../shared/MappingGraph';
import { SQLEditor } from './SQLEditor';

const ConnectionStringExample = styled.div`
  margin-top: ${theme.spacing.xs};
  padding: ${theme.spacing.sm};
  background: ${theme.colors.background.secondary};
  border-radius: ${theme.borderRadius.sm};
  border-left: 3px solid ${theme.colors.primary.main};
  font-family: monospace;
  font-size: 0.85em;
  color: ${theme.colors.text.secondary};
  white-space: pre-wrap;
  word-break: break-all;
`;

const connectionStringExamples: Record<string, string> = {
  MariaDB: 'host=localhost;user=myuser;password=mypassword;db=mydatabase;port=3306',
  MSSQL: 'DRIVER={ODBC Driver 17 for SQL Server};SERVER=localhost,1433;DATABASE=mydatabase;UID=myuser;PWD=mypassword',
  Oracle: 'host=localhost;user=myuser;password=mypassword;db=mydatabase;port=1521',
  PostgreSQL: 'postgresql://myuser:mypassword@localhost:5432/mydatabase',
  MongoDB: 'mongodb://myuser:mypassword@localhost:27017/mydatabase',
};

const HeaderContent = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5em;
  cursor: pointer;
  color: ${theme.colors.text.secondary};
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    color: ${theme.colors.text.primary};
  }
`;

const ScriptSelector = styled(Select)`
  margin-bottom: ${theme.spacing.md};
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  justify-content: flex-end;
  margin-top: ${theme.spacing.lg};
  padding-top: ${theme.spacing.md};
  border-top: 1px solid ${theme.colors.border.light};
`;


const CollapsibleSection = styled.div`
  margin-top: ${theme.spacing.lg};
  border: 1px solid ${theme.colors.border.light};
  border-radius: ${theme.borderRadius.md};
  overflow: hidden;
`;

const CollapsibleHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${theme.spacing.md};
  background: ${theme.colors.background.secondary};
  cursor: pointer;
  user-select: none;
  
  &:hover {
    background: ${theme.colors.background.tertiary};
  }
`;

const CollapsibleContent = styled.div<{ $isOpen: boolean }>`
  max-height: ${props => props.$isOpen ? '2000px' : '0'};
  overflow: hidden;
  transition: max-height 0.3s ease-in-out;
  padding: ${props => props.$isOpen ? theme.spacing.md : '0'};
  background: ${theme.colors.background.main};
`;

const SectionTitle = styled.h4`
  margin: 0;
  font-size: 1em;
  color: ${theme.colors.text.primary};
`;

const SubSection = styled.div`
  margin-top: ${theme.spacing.md};
  padding: ${theme.spacing.md};
  background: ${theme.colors.background.secondary};
  border-radius: ${theme.borderRadius.sm};
`;

const ConnectionTestResult = styled.div<{ $success: boolean }>`
  margin-top: 8px;
  padding: 8px 12px;
  border-radius: ${theme.borderRadius.sm};
  font-size: 0.9em;
  background-color: ${props => props.$success 
    ? theme.colors.status.success.bg 
    : theme.colors.status.error.bg};
  color: ${props => props.$success 
    ? theme.colors.status.success.text 
    : theme.colors.status.error.text};
  animation: fadeIn 0.3s ease-out;
`;

const CustomJobs = () => {
  const { setPage } = usePagination(1, 20);
  const { filters, setFilter } = useTableFilters({
    source_db_engine: '',
    target_db_engine: '',
    active: '',
    enabled: ''
  });
  
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [allJobs, setAllJobs] = useState<CustomJobEntry[]>([]);
  const [loadingTree, setLoadingTree] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<CustomJobEntry | null>(null);
  const [duplicateData, setDuplicateData] = useState<CustomJobEntry | null>(null);
  const [availableScripts, setAvailableScripts] = useState<Array<{name: string, content: string}>>([]);
  const [selectedScript, setSelectedScript] = useState<string>('');
  const [jobForm, setJobForm] = useState({
    job_name: '',
    description: '',
    source_db_engine: 'PostgreSQL',
    source_connection_string: '',
    query_sql: '',
    target_db_engine: 'PostgreSQL',
    target_connection_string: '',
    target_schema: '',
    target_table: '',
    schedule_cron: '',
    active: true,
    enabled: true,
    transform_config: {
      column_mapping: {} as Record<string, string>,
      filters: [] as Array<{column: string; op: string; value: any}>,
      column_transforms: [] as Array<{target_column: string; expression: string; columns?: string[]; separator?: string}>,
      validations: [] as Array<{column: string; rule: string; [key: string]: any}>
    },
    metadata: {
      load_strategy: 'TRUNCATE' as 'TRUNCATE',
    }
  });
  const [showLoadStrategySection, setShowLoadStrategySection] = useState(false);
  const [connectionTested, setConnectionTested] = useState(false);
  const [previewData, setPreviewData] = useState<{ columns: string[]; rows: any[]; rowCount: number } | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<CustomJobEntry | null>(null);
  const [executionHistory, setExecutionHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [tableStructure, setTableStructure] = useState<any>(null);
  const [loadingStructure, setLoadingStructure] = useState(false);
  const [sourceSchemas, setSourceSchemas] = useState<string[]>([]);
  const [sourceTables, setSourceTables] = useState<string[]>([]);
  const [sourceColumns, setSourceColumns] = useState<string[]>([]);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [datalakeConnection, setDatalakeConnection] = useState<string>('');
  const [isDataLake, setIsDataLake] = useState(false);
  const isMountedRef = useRef(true);

  const fetchAllJobs = useCallback(async () => {
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
      
      if (filters.source_db_engine) params.source_db_engine = filters.source_db_engine;
      if (filters.target_db_engine) params.target_db_engine = filters.target_db_engine;
      if (filters.active) params.active = filters.active;
      if (filters.enabled) params.enabled = filters.enabled;
      
      const response = await customJobsApi.getJobs(params);
      if (isMountedRef.current) {
        setAllJobs(response.data || []);
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
  }, [
    filters.source_db_engine, 
    filters.target_db_engine, 
    filters.active, 
    filters.enabled,
    search
  ]);

  const loadDataLakeConnection = useCallback(async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/datalake-connection', {
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.connection_string) {
          setDatalakeConnection(data.connection_string);
          // Si el formulario está abierto y no hay connection string, y es PostgreSQL, usar DataLake por defecto
          if (isModalOpen && !jobForm.source_connection_string && jobForm.source_db_engine === 'PostgreSQL' && !editingJob) {
            setJobForm(prev => ({
              ...prev,
              source_connection_string: data.connection_string
            }));
            setIsDataLake(true);
          }
        }
      }
    } catch (err) {
      console.error('Error loading DataLake connection:', err);
    }
  }, [isModalOpen, jobForm.source_connection_string, jobForm.source_db_engine, editingJob]);

  useEffect(() => {
    isMountedRef.current = true;
    loadDataLakeConnection();
    fetchAllJobs();
    const interval = setInterval(() => {
      if (isMountedRef.current) {
        fetchAllJobs();
      }
    }, 30000);
    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchAllJobs, loadDataLakeConnection]);

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

  const handleToggleActive = useCallback(async (jobName: string, currentActive: boolean) => {
    try {
      await customJobsApi.updateActive(jobName, !currentActive);
      fetchAllJobs();
    } catch (err) {
      if (isMountedRef.current) {
        setError(extractApiError(err));
      }
    }
  }, [fetchAllJobs]);

  const handleExecute = useCallback(async (jobName: string) => {
    try {
      await customJobsApi.executeJob(jobName);
      alert(`Job "${jobName}" execution triggered. Check process_log for results.`);
      fetchAllJobs();
    } catch (err) {
      if (isMountedRef.current) {
        setError(extractApiError(err));
      }
    }
  }, [fetchAllJobs]);

  const handleDelete = useCallback(async (jobName: string) => {
    if (!confirm(`Are you sure you want to delete job "${jobName}"?`)) {
      return;
    }
    try {
      await customJobsApi.deleteJob(jobName);
      fetchAllJobs();
    } catch (err) {
      if (isMountedRef.current) {
        setError(extractApiError(err));
      }
    }
  }, [fetchAllJobs]);

  const loadScripts = useCallback(async () => {
    try {
      const scripts = await customJobsApi.getScripts();
      setAvailableScripts(scripts);
    } catch (err) {
      console.error('Error loading scripts:', err);
    }
  }, []);

  const handleTestConnection = useCallback(async () => {
    if (!jobForm.source_db_engine) {
      setConnectionTestResult({ success: false, message: 'Please select a source database engine first' });
      return;
    }

    // Si es DataLake, usar datalakeConnection; de lo contrario, usar el connection string del formulario
    const connectionStringToTest = isDataLake && datalakeConnection 
      ? datalakeConnection 
      : jobForm.source_connection_string.trim();

    if (!connectionStringToTest) {
      setConnectionTestResult({ success: false, message: isDataLake ? 'DataLake connection not loaded yet. Please wait...' : 'Please enter a source connection string' });
      return;
    }

    setIsTestingConnection(true);
    setConnectionTestResult(null);

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/test-connection', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({
          db_engine: jobForm.source_db_engine,
          connection_string: connectionStringToTest,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          setConnectionTestResult({ success: false, message: 'Authentication required. Please log in again.' });
          return;
        }
        if (response.status === 0 || response.status >= 500) {
          setConnectionTestResult({ success: false, message: 'Server error. Please check if the server is running.' });
          return;
        }
      }

      let data;
      try {
        data = await response.json();
      } catch (parseErr) {
        setConnectionTestResult({ success: false, message: 'Invalid response from server' });
        return;
      }

      if (response.ok && data.success) {
        setConnectionTestResult({ success: true, message: 'Connection successful!' });
        setConnectionTested(true);
      } else {
        setConnectionTestResult({ 
          success: false, 
          message: data.error || data.message || 'Connection failed' 
        });
        setConnectionTested(false);
      }
    } catch (err: any) {
      setConnectionTestResult({ 
        success: false, 
        message: err.message || 'Error testing connection' 
      });
      setConnectionTested(false);
    } finally {
      setIsTestingConnection(false);
    }
  }, [jobForm.source_db_engine, jobForm.source_connection_string, isDataLake, datalakeConnection]);

  const handlePreviewQuery = useCallback(async () => {
    if (!jobForm.source_db_engine || !jobForm.source_connection_string.trim() || !jobForm.query_sql.trim()) {
      setPreviewError('Please fill in source DB engine, connection string, and SQL query');
      return;
    }

    setIsPreviewing(true);
    setPreviewError(null);
    setPreviewData(null);

    try {
      const connectionStringToTest = isDataLake && datalakeConnection 
        ? datalakeConnection 
        : jobForm.source_connection_string.trim();

      const result = await customJobsApi.previewQuery({
        db_engine: jobForm.source_db_engine,
        connection_string: connectionStringToTest,
        query_sql: jobForm.query_sql.trim(),
        limit: 100,
      });

      if (result.success) {
        setPreviewData({
          columns: result.columns || [],
          rows: result.rows || [],
          rowCount: result.rowCount || 0,
        });
        setSourceColumns(result.columns || []);
        setPreviewError(null);
      } else {
        setPreviewError(result.error || 'Failed to preview query');
      }
    } catch (err: any) {
      setPreviewError(err.message || 'Error previewing query');
    } finally {
      setIsPreviewing(false);
    }
  }, [jobForm.source_db_engine, jobForm.source_connection_string, jobForm.query_sql, isDataLake, datalakeConnection]);

  const handleJobClick = useCallback(async (job: CustomJobEntry) => {
    setSelectedJob(job);
    setLoadingHistory(true);
    setExecutionHistory([]);
    setTableStructure(null);
    setLoadingStructure(true);
    
    try {
      const history = await customJobsApi.getHistory(job.job_name, 50);
      setExecutionHistory(history);
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setLoadingHistory(false);
    }

    try {
      const structure = await customJobsApi.getTableStructure(job.job_name);
      setTableStructure(structure);
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setLoadingStructure(false);
    }
  }, []);

  const handleOpenModal = useCallback((job?: CustomJobEntry, isDuplicate?: boolean) => {
    if (job) {
      const transformConfig = job.transform_config || {};
      const metadata = job.metadata || {};
      // Comparar con datalakeConnection si está disponible
      const isJobDataLake = !!(datalakeConnection && job.source_connection_string === datalakeConnection);
      
      if (isDuplicate) {
        setEditingJob(null);
        setDuplicateData(job);
        setIsDataLake(isJobDataLake);
        setJobForm({
          job_name: `${job.job_name} (Copy)`,
          description: job.description || '',
          source_db_engine: job.source_db_engine,
          source_connection_string: job.source_connection_string || '',
          query_sql: job.query_sql || '',
          target_db_engine: job.target_db_engine,
          target_connection_string: job.target_connection_string || '',
          target_schema: job.target_schema || '',
          target_table: job.target_table || '',
          schedule_cron: job.schedule_cron || '',
          active: job.active,
          enabled: job.enabled,
          transform_config: {
            column_mapping: (transformConfig.column_mapping as Record<string, string>) || {},
            filters: Array.isArray(transformConfig.filters) ? transformConfig.filters : [],
            column_transforms: Array.isArray(transformConfig.column_transforms) ? transformConfig.column_transforms : [],
            validations: Array.isArray(transformConfig.validations) ? transformConfig.validations : []
          },
          metadata: {
            load_strategy: (metadata.load_strategy as any) || 'TRUNCATE',
          }
        });
      } else {
        setEditingJob(job);
        setDuplicateData(null);
        setIsDataLake(isJobDataLake);
        setJobForm({
          job_name: job.job_name,
          description: job.description || '',
          source_db_engine: job.source_db_engine,
          source_connection_string: job.source_connection_string || '',
          query_sql: job.query_sql || '',
          target_db_engine: job.target_db_engine,
          target_connection_string: job.target_connection_string || '',
          target_schema: job.target_schema || '',
          target_table: job.target_table || '',
          schedule_cron: job.schedule_cron || '',
          active: job.active,
          enabled: job.enabled,
          transform_config: {
            column_mapping: (transformConfig.column_mapping as Record<string, string>) || {},
            filters: Array.isArray(transformConfig.filters) ? transformConfig.filters : [],
            column_transforms: Array.isArray(transformConfig.column_transforms) ? transformConfig.column_transforms : [],
            validations: Array.isArray(transformConfig.validations) ? transformConfig.validations : []
          },
          metadata: {
            load_strategy: (metadata.load_strategy as any) || 'TRUNCATE',
          }
        });
      }
    } else {
      setEditingJob(null);
      setDuplicateData(null);
      // Si datalakeConnection está disponible, usarlo por defecto
      const defaultConnection = datalakeConnection || '';
      setIsDataLake(!!defaultConnection);
      setJobForm({
        job_name: '',
        description: '',
        source_db_engine: 'PostgreSQL',
        source_connection_string: defaultConnection,
        query_sql: '',
        target_db_engine: 'PostgreSQL',
        target_connection_string: '',
        target_schema: '',
        target_table: '',
        schedule_cron: '',
        active: true,
        enabled: true,
        transform_config: {
          column_mapping: {},
          filters: [],
          column_transforms: [],
          validations: []
        },
        metadata: {
          load_strategy: 'TRUNCATE',
        }
      });
    }
    setSelectedScript('');
    setShowLoadStrategySection(false);
    setConnectionTested(false);
    setConnectionTestResult(null);
    setPreviewData(null);
    setPreviewError(null);
    setSourceSchemas([]);
    setSourceTables([]);
    setSourceColumns([]);
    setIsModalOpen(true);
  }, [datalakeConnection]);

  const handleDuplicate = useCallback((job: CustomJobEntry) => {
    handleOpenModal(job, true);
  }, [handleOpenModal]);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingJob(null);
    setDuplicateData(null);
    setSelectedScript('');
    setConnectionTested(false);
    setConnectionTestResult(null);
    setIsDataLake(false);
    setPreviewData(null);
    setPreviewError(null);
  }, []);

  const handleScriptSelect = useCallback((scriptName: string) => {
    setSelectedScript(scriptName);
    const script = availableScripts.find(s => s.name === scriptName);
    if (script) {
      setJobForm(prev => ({ ...prev, query_sql: script.content }));
    }
  }, [availableScripts]);

  const handleSubmit = useCallback(async () => {
    try {
      if (!jobForm.job_name || !jobForm.target_schema || !jobForm.target_table) {
        alert('Please fill in all required fields');
        return;
      }
      
      if (jobForm.source_db_engine === 'Python' && !jobForm.query_sql.trim()) {
        alert('Please select a Python script or enter script content');
        return;
      }
      
      if (jobForm.source_db_engine !== 'Python' && !jobForm.query_sql.trim()) {
        alert('Please enter SQL query');
        return;
      }

      if (editingJob) {
        await customJobsApi.updateJob(editingJob.job_name, jobForm);
      } else {
        await customJobsApi.createJob(jobForm);
      }
      
      await fetchAllJobs();
      handleCloseModal();
    } catch (err) {
      if (isMountedRef.current) {
        setError(extractApiError(err));
      }
    }
  }, [jobForm, editingJob, fetchAllJobs, handleCloseModal]);

  useEffect(() => {
    if (isModalOpen && jobForm.source_db_engine === 'Python') {
      loadScripts();
    }
  }, [isModalOpen, jobForm.source_db_engine, loadScripts]);

  if (loadingTree && allJobs.length === 0) {
    return (
      <Container>
        <Header>Pipeline Orchestration</Header>
        <LoadingOverlay>Loading Pipeline Orchestration...</LoadingOverlay>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <HeaderContent>
          <span>■ Pipeline Orchestration</span>
          <Button onClick={() => handleOpenModal()}>
            + Add Pipeline
          </Button>
        </HeaderContent>
      </Header>
      
      {error && <ErrorMessage>{error}</ErrorMessage>}

      <SearchContainer>
        <SearchInput
          type="text"
          placeholder="Search by pipeline name, description, target schema/table..."
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
        <Select
          value={filters.source_db_engine as string}
          onChange={(e) => handleFilterChange('source_db_engine', e.target.value)}
        >
          <option value="">All Source Engines</option>
          <option value="PostgreSQL">PostgreSQL</option>
          <option value="MariaDB">MariaDB</option>
          <option value="MSSQL">MSSQL</option>
          <option value="MongoDB">MongoDB</option>
          <option value="Oracle">Oracle</option>
          <option value="Python">Python</option>
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
          value={filters.active as string}
          onChange={(e) => handleFilterChange('active', e.target.value)}
        >
          <option value="">All Active States</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </Select>

        <Select
          value={filters.enabled as string}
          onChange={(e) => handleFilterChange('enabled', e.target.value)}
        >
          <option value="">All Enabled States</option>
          <option value="true">Enabled</option>
          <option value="false">Disabled</option>
        </Select>
      </FiltersContainer>

      {loadingTree ? (
        <LoadingOverlay>Loading tree view...</LoadingOverlay>
      ) : (
        <CustomJobsTreeView 
          jobs={allJobs}
          onJobClick={handleJobClick}
          onJobEdit={(job) => handleOpenModal(job)}
          onJobExecute={handleExecute}
          onJobToggleActive={handleToggleActive}
          onJobDelete={handleDelete}
          onJobDuplicate={handleDuplicate}
        />
      )}

      <ModalOverlay $isOpen={isModalOpen} onClick={handleCloseModal}>
        <ModalContent onClick={(e) => e.stopPropagation()} style={{ position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
          <ModalHeader>
            <ModalTitle>{editingJob ? 'Edit Pipeline' : duplicateData ? 'Duplicate Pipeline' : 'Create New Pipeline'}</ModalTitle>
            <CloseButton onClick={handleCloseModal}>×</CloseButton>
          </ModalHeader>

          <FormGroup>
            <Label>Pipeline Name *</Label>
            <Input
              value={jobForm.job_name}
              onChange={(e) => setJobForm(prev => ({ ...prev, job_name: e.target.value }))}
              placeholder="Enter unique pipeline name"
              disabled={!!editingJob}
            />
          </FormGroup>

          <FormGroup>
            <Label>Description</Label>
            <Input
              value={jobForm.description}
              onChange={(e) => setJobForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Pipeline description"
            />
          </FormGroup>

          <FormGroup>
            <Label>Source DB Engine *</Label>
            <Select
              value={isDataLake ? 'DataLake' : jobForm.source_db_engine}
              onChange={async (e) => {
                const selectedEngine = e.target.value;
                if (selectedEngine === 'DataLake') {
                  // Si datalakeConnection no está cargado, cargarlo primero
                  let connectionToUse = datalakeConnection;
                  if (!connectionToUse) {
                    try {
                      const token = localStorage.getItem('authToken');
                      const response = await fetch('/api/datalake-connection', {
                        headers: {
                          ...(token && { 'Authorization': `Bearer ${token}` }),
                        },
                      });
                      if (response.ok) {
                        const data = await response.json();
                        if (data.success && data.connection_string) {
                          setDatalakeConnection(data.connection_string);
                          connectionToUse = data.connection_string;
                        }
                      }
                    } catch (err) {
                      console.error('Error loading DataLake connection:', err);
                    }
                  }
                  
                  setIsDataLake(true);
                  setJobForm(prev => ({
                    ...prev,
                    source_db_engine: 'PostgreSQL', // Internamente es PostgreSQL
                    source_connection_string: connectionToUse || prev.source_connection_string,
                    query_sql: prev.query_sql
                  }));
                  setConnectionTestResult(null);
                  setConnectionTested(false);
                } else {
                  setIsDataLake(false);
                  setJobForm(prev => ({
                    ...prev,
                    source_db_engine: selectedEngine,
                    source_connection_string: selectedEngine === 'Python' ? prev.source_connection_string : '',
                    query_sql: selectedEngine === 'Python' ? prev.query_sql : ''
                  }));
                  setSelectedScript('');
                  setConnectionTestResult(null);
                  setConnectionTested(false);
                }
              }}
            >
              <option value="DataLake">DataLake (Default)</option>
              <option value="PostgreSQL">PostgreSQL (External)</option>
              <option value="MariaDB">MariaDB</option>
              <option value="MSSQL">MSSQL</option>
              <option value="MongoDB">MongoDB</option>
              <option value="Oracle">Oracle</option>
              <option value="Python">Python</option>
            </Select>
          </FormGroup>

          {jobForm.source_db_engine !== 'Python' && (
            <FormGroup>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <Label style={{ marginBottom: 0 }}>
                  Source Connection String
                  {isDataLake && (
                    <span style={{ marginLeft: '8px', fontSize: '0.85em', color: theme.colors.text.secondary }}>
                      (DataLake - Auto-filled)
                    </span>
                  )}
                </Label>
                <Button
                  type="button"
                  $variant="secondary"
                  onClick={handleTestConnection}
                  disabled={
                    isTestingConnection || 
                    !jobForm.source_db_engine || 
                    (!isDataLake && !jobForm.source_connection_string.trim()) ||
                    (isDataLake && !datalakeConnection)
                  }
                  style={{ padding: '6px 12px', fontSize: '0.85em', minWidth: 'auto' }}
                >
                  {isTestingConnection ? 'Testing...' : 'Test Connection'}
                </Button>
              </div>
              <div style={{ position: 'relative' }}>
                <Input
                  value={jobForm.source_connection_string}
                  onChange={(e) => {
                    setJobForm(prev => ({ ...prev, source_connection_string: e.target.value }));
                    setConnectionTestResult(null);
                    setConnectionTested(false);
                    if (isDataLake && e.target.value !== datalakeConnection) {
                      setIsDataLake(false);
                    }
                  }}
                  placeholder={isDataLake ? "DataLake connection (auto-filled)" : "host=localhost port=5432 dbname=..."}
                  readOnly={isDataLake}
                  style={isDataLake ? { background: theme.colors.background.secondary, cursor: 'not-allowed', paddingRight: '80px' } : {}}
                />
                {isDataLake && (
                  <Button
                    type="button"
                    $variant="secondary"
                    onClick={() => {
                      setIsDataLake(false);
                      setJobForm(prev => ({ ...prev, source_connection_string: '' }));
                    }}
                    style={{
                      position: 'absolute',
                      right: '4px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      padding: '4px 8px',
                      fontSize: '0.75em',
                      minWidth: 'auto',
                      height: 'auto'
                    }}
                  >
                    Edit
                  </Button>
                )}
              </div>
              {connectionTestResult && (
                <ConnectionTestResult $success={connectionTestResult.success}>
                  {connectionTestResult.success ? '✓ ' : '✗ '}
                  {connectionTestResult.message}
                </ConnectionTestResult>
              )}
              {connectionTested && (
                <div style={{ marginTop: '8px', padding: '8px 12px', background: theme.colors.status.info.bg, color: theme.colors.status.info.text, borderRadius: theme.borderRadius.sm, fontSize: '0.9em' }}>
                  Connection successful! You can now write your SQL query and preview the results.
                </div>
              )}
            </FormGroup>
          )}

          {jobForm.source_db_engine === 'Python' && (
            <FormGroup>
              <Label>Select Python Script</Label>
              <ScriptSelector
                value={selectedScript}
                onChange={(e) => handleScriptSelect(e.target.value)}
              >
                <option value="">-- Select a script or write custom --</option>
                {availableScripts.map(script => (
                  <option key={script.name} value={script.name}>
                    {script.name}
                  </option>
                ))}
              </ScriptSelector>
            </FormGroup>
          )}

          {jobForm.source_db_engine !== 'Python' && (
            <FormGroup>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <Label>SQL Query *</Label>
                <Button
                  type="button"
                  $variant="secondary"
                  onClick={handlePreviewQuery}
                  disabled={isPreviewing || !jobForm.source_db_engine || !jobForm.source_connection_string.trim() || !jobForm.query_sql.trim()}
                  style={{ padding: '6px 12px', fontSize: '0.85em', minWidth: 'auto' }}
                >
                  {isPreviewing ? 'Previewing...' : 'Preview Query'}
                </Button>
              </div>
              <SQLEditor
                value={jobForm.query_sql}
                onChange={(newValue) => {
                  setJobForm(prev => ({ ...prev, query_sql: newValue }));
                  setPreviewData(null);
                  setPreviewError(null);
                }}
                placeholder="SELECT * FROM table_name WHERE condition..."
                schemas={sourceSchemas}
                tables={sourceTables}
                columns={sourceColumns}
              />
              {previewError && (
                <ErrorMessage style={{ marginTop: '8px' }}>{previewError}</ErrorMessage>
              )}
              {previewData && (
                <div style={{ marginTop: '16px', border: `1px solid ${theme.colors.border.light}`, borderRadius: theme.borderRadius.md, overflow: 'auto', maxHeight: '400px' }}>
                  <div style={{ padding: '8px 12px', background: theme.colors.background.secondary, borderBottom: `1px solid ${theme.colors.border.light}`, fontSize: '0.85em', fontWeight: 'bold' }}>
                    Preview Results ({previewData.rowCount} rows)
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85em' }}>
                    <thead>
                      <tr style={{ background: theme.colors.background.secondary }}>
                        {previewData.columns.map((col, idx) => (
                          <th key={idx} style={{ padding: '8px', textAlign: 'left', borderBottom: `1px solid ${theme.colors.border.light}`, fontWeight: 'bold' }}>
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.rows.map((row, rowIdx) => (
                        <tr key={rowIdx} style={{ borderBottom: `1px solid ${theme.colors.border.light}` }}>
                          {previewData.columns.map((col, colIdx) => (
                            <td key={colIdx} style={{ padding: '8px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {row[col] !== null && row[col] !== undefined ? String(row[col]) : 'NULL'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </FormGroup>
          )}

          {jobForm.source_db_engine === 'Python' && (
            <FormGroup>
              <Label>Python Script *</Label>
              <TextArea
                value={jobForm.query_sql}
                onChange={(e) => setJobForm(prev => ({ ...prev, query_sql: e.target.value }))}
                placeholder="import json\n\ndata = [...]\nprint(json.dumps(data))"
                style={{ minHeight: '150px', fontFamily: 'monospace', fontSize: '0.9em' }}
              />
            </FormGroup>
          )}

          <FormGroup>
            <Label>Target DB Engine *</Label>
            <Select
              value={jobForm.target_db_engine}
              onChange={(e) => setJobForm(prev => ({ ...prev, target_db_engine: e.target.value }))}
            >
              <option value="PostgreSQL">PostgreSQL</option>
              <option value="MariaDB">MariaDB</option>
              <option value="MSSQL">MSSQL</option>
              <option value="MongoDB">MongoDB</option>
              <option value="Oracle">Oracle</option>
            </Select>
          </FormGroup>

          <FormGroup>
            <Label>Target Connection String *</Label>
            <TextArea
              value={jobForm.target_connection_string}
              onChange={(e) => setJobForm(prev => ({ ...prev, target_connection_string: e.target.value }))}
              placeholder={connectionStringExamples[jobForm.target_db_engine] || "host=localhost port=5432 dbname=..."}
              rows={3}
              style={{ fontFamily: 'monospace', fontSize: '0.9em' }}
            />
            {jobForm.target_db_engine && connectionStringExamples[jobForm.target_db_engine] && (
              <ConnectionStringExample>
                Example: {connectionStringExamples[jobForm.target_db_engine]}
              </ConnectionStringExample>
            )}
          </FormGroup>

          <FormGroup>
            <Label>Target Schema *</Label>
            <Input
              value={jobForm.target_schema}
              onChange={(e) => setJobForm(prev => ({ ...prev, target_schema: e.target.value }))}
              placeholder="public"
            />
          </FormGroup>

          <FormGroup>
            <Label>Target Table *</Label>
            <Input
              value={jobForm.target_table}
              onChange={(e) => setJobForm(prev => ({ ...prev, target_table: e.target.value }))}
              placeholder="table_name"
            />
          </FormGroup>

          <FormGroup>
            <Label>Schedule Cron (optional)</Label>
            <Input
              value={jobForm.schedule_cron}
              onChange={(e) => setJobForm(prev => ({ ...prev, schedule_cron: e.target.value }))}
              placeholder="* * * * * (minute hour day month day-of-week)"
            />
          </FormGroup>

          <FormGroup>
            <Label>
              <input
                type="checkbox"
                checked={jobForm.active}
                onChange={(e) => setJobForm(prev => ({ ...prev, active: e.target.checked }))}
              />
              {' '}Active
            </Label>
          </FormGroup>

          <FormGroup>
            <Label>
              <input
                type="checkbox"
                checked={jobForm.enabled}
                onChange={(e) => setJobForm(prev => ({ ...prev, enabled: e.target.checked }))}
              />
              {' '}Enabled
            </Label>
          </FormGroup>

          <CollapsibleSection>
            <CollapsibleHeader onClick={() => setShowLoadStrategySection(!showLoadStrategySection)}>
              <SectionTitle>📊 Load Strategy (Data Warehouse)</SectionTitle>
              <span>{showLoadStrategySection ? '▼' : '▶'}</span>
            </CollapsibleHeader>
            <CollapsibleContent $isOpen={showLoadStrategySection}>
              <SubSection>
                <Label>Load Strategy</Label>
                <Select
                  value={jobForm.metadata.load_strategy}
                  onChange={(e) => {
                    setJobForm(prev => ({
                      ...prev,
                      metadata: { ...prev.metadata, load_strategy: e.target.value as any }
                    }));
                  }}
                >
                  <option value="TRUNCATE">TRUNCATE (Full Load - Data Lake)</option>
                </Select>
              </SubSection>

            </CollapsibleContent>
          </CollapsibleSection>

          <ButtonGroup>
            <Button onClick={handleCloseModal} $variant="secondary">
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingJob ? 'Update' : 'Create'}
            </Button>
          </ButtonGroup>
        </ModalContent>
      </ModalOverlay>

      {selectedJob && (
        <ExecutionTimeline
          title={`Execution Timeline: ${selectedJob.job_name}`}
          history={executionHistory}
          loading={loadingHistory}
          tableStructure={tableStructure}
          loadingStructure={loadingStructure}
          onClose={() => setSelectedJob(null)}
          renderMappingGraph={(tableStructure, loadingStructure) => (
            <MappingGraph
              sourceTitle="Source: SQL Query"
              sourceType="Pipeline Orchestration"
              sourceInfo={[
                { label: "Pipeline Name", value: selectedJob.job_name },
                { label: "Source DB Engine", value: selectedJob.source_db_engine },
                { label: "Query", value: selectedJob.query_sql?.substring(0, 100) + (selectedJob.query_sql?.length > 100 ? '...' : '') || 'N/A' },
              ]}
              tableStructure={tableStructure}
              loading={loadingStructure}
            />
          )}
        />
      )}
    </Container>
  );
};

export default CustomJobs;
