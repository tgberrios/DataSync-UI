import { useState, useEffect, useCallback, useRef } from 'react';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { usePagination } from '../../hooks/usePagination';
import { useTableFilters } from '../../hooks/useTableFilters';
import { customJobsApi } from '../../services/api';
import type { CustomJobEntry } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import { sanitizeSearch } from '../../utils/validation';
import SkeletonLoader from '../shared/SkeletonLoader';
import CustomJobsTreeView from './CustomJobsTreeView';
import { EnrichedMappingGraph } from '../shared/EnrichedMappingGraph';
import { SQLEditor } from './SQLEditor';
import { VisualPipelineEditor } from './visual-editor/VisualPipelineEditor';
import { generateSQL } from './visual-editor/utils/sqlGenerator';
import { generateTransformConfig } from './visual-editor/utils/configGenerator';
import { parseSQLToGraph } from './visual-editor/utils/sqlParser';
import type { PipelineGraph } from './visual-editor/types';

const connectionStringExamples: Record<string, string> = {
  MariaDB: 'host=localhost;user=myuser;password=mypassword;db=mydatabase;port=3306',
  MSSQL: 'DRIVER={ODBC Driver 17 for SQL Server};SERVER=localhost,1433;DATABASE=mydatabase;UID=myuser;PWD=mypassword',
  Oracle: 'host=localhost;user=myuser;password=mypassword;db=mydatabase;port=1521',
  PostgreSQL: 'postgresql://myuser:mypassword@localhost:5432/mydatabase',
  MongoDB: 'mongodb://myuser:mypassword@localhost:27017/mydatabase',
};

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
  const [loadingTree, setLoadingTree] = useState(true);
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
  const [tableStructure, setTableStructure] = useState<any>(null);
  const [loadingStructure, setLoadingStructure] = useState(false);
  const [sourceSchemas, setSourceSchemas] = useState<string[]>([]);
  const [sourceTables, setSourceTables] = useState<string[]>([]);
  const [sourceColumns, setSourceColumns] = useState<string[]>([]);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [datalakeConnection, setDatalakeConnection] = useState<string>('');
  const [isDataLake, setIsDataLake] = useState(false);
  const [editorMode, setEditorMode] = useState<'sql' | 'visual'>('sql');
  const [pipelineGraph, setPipelineGraph] = useState<PipelineGraph>({ nodes: [], edges: [] });
  const [showCustomJobsPlaybook, setShowCustomJobsPlaybook] = useState(false);
  const isMountedRef = useRef(true);

  const fetchAllJobs = useCallback(async () => {
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
      
      if (filters.source_db_engine) params.source_db_engine = filters.source_db_engine;
      if (filters.target_db_engine) params.target_db_engine = filters.target_db_engine;
      if (filters.active) params.active = filters.active;
      if (filters.enabled) params.enabled = filters.enabled;
      
      const response = await customJobsApi.getJobs(params);
      
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minLoadingTime - elapsed);
      await new Promise(resolve => setTimeout(resolve, remaining));
      
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

  const handleReboot = useCallback(async (jobName: string) => {
    const job = allJobs.find(j => j.job_name === jobName);
    if (!job) return;

    const confirmMessage = `⚠️ WARNING: This will DROP the table "${job.target_schema}.${job.target_table}" and ALL its data will be PERMANENTLY DELETED!\n\n` +
      `The table will be automatically recreated on the next job execution.\n\n` +
      `Are you absolutely sure you want to continue?`;

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const result = await customJobsApi.rebootTable(jobName);
      alert(`✅ ${result.message || 'Table dropped successfully. It will be recreated on next execution.'}`);
      fetchAllJobs();
    } catch (err) {
      if (isMountedRef.current) {
        setError(extractApiError(err));
      }
    }
  }, [allJobs, fetchAllJobs]);

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
    setTableStructure(null);
    setLoadingStructure(true);

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

      let finalQuerySql = jobForm.query_sql;
      let finalTransformConfig = jobForm.transform_config;

      if (editorMode === 'visual') {
        if (pipelineGraph.nodes.length === 0) {
          alert('Please add at least one component to the visual pipeline');
          return;
        }

        try {
          finalQuerySql = generateSQL(pipelineGraph);
          finalTransformConfig = {
            ...jobForm.transform_config,
            ...generateTransformConfig(pipelineGraph)
          };
        } catch (err: any) {
          alert(`Error generating SQL from pipeline: ${err.message}`);
          return;
        }
      } else {
        if (jobForm.source_db_engine === 'Python' && !jobForm.query_sql.trim()) {
          alert('Please select a Python script or enter script content');
          return;
        }
        
        if (jobForm.source_db_engine !== 'Python' && !jobForm.query_sql.trim()) {
          alert('Please enter SQL query');
          return;
        }
      }

      const jobData = {
        ...jobForm,
        query_sql: finalQuerySql,
        transform_config: finalTransformConfig
      };

      if (editingJob) {
        await customJobsApi.updateJob(editingJob.job_name, jobData);
      } else {
        await customJobsApi.createJob(jobData);
      }
      
      await fetchAllJobs();
      handleCloseModal();
    } catch (err) {
      if (isMountedRef.current) {
        setError(extractApiError(err));
      }
    }
  }, [jobForm, editingJob, fetchAllJobs, handleCloseModal, editorMode, pipelineGraph]);

  useEffect(() => {
    if (isModalOpen && jobForm.source_db_engine === 'Python') {
      loadScripts();
    }
  }, [isModalOpen, jobForm.source_db_engine, loadScripts]);


  if (loadingTree && allJobs.length === 0) {
    return <SkeletonLoader variant="table" />;
  }

  return (
    <div style={{ padding: "20px", fontFamily: "Consolas", fontSize: 12 }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20
      }}>
        <h1 style={{
          fontSize: 14,
          fontWeight: 600,
          margin: 0,
          color: asciiColors.foreground,
          textTransform: "uppercase",
          fontFamily: "Consolas"
        }}>
          <span style={{ color: asciiColors.accent, marginRight: 8 }}>{ascii.blockFull}</span>
          PIPELINE ORCHESTRATION
        </h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <AsciiButton
            label="Custom Jobs Info"
            onClick={() => setShowCustomJobsPlaybook(true)}
            variant="ghost"
          />
          <AsciiButton
            label="+ Add Pipeline"
            onClick={() => handleOpenModal()}
            variant="primary"
          />
        </div>
      </div>
      
      {error && (
        <div style={{ marginBottom: 20 }}>
          <AsciiPanel title="ERROR">
            <div style={{
              padding: "12px",
              color: asciiColors.danger,
              fontSize: 12,
              fontFamily: "Consolas"
            }}>
              {error}
            </div>
          </AsciiPanel>
        </div>
      )}

      <AsciiPanel title="SEARCH">
        <div style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          padding: "8px 0"
        }}>
          <input
            type="text"
            placeholder="Search by pipeline name, description, target schema/table..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            style={{
              flex: 1,
              padding: "6px 10px",
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2,
              fontSize: 12,
              fontFamily: "Consolas",
              backgroundColor: asciiColors.background,
              color: asciiColors.foreground,
              outline: "none"
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = asciiColors.accent;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = asciiColors.border;
            }}
          />
          <AsciiButton
            label="Search"
            onClick={handleSearch}
            variant="primary"
          />
          {search && (
            <AsciiButton
              label="Clear"
              onClick={handleClearSearch}
              variant="ghost"
            />
          )}
        </div>
      </AsciiPanel>

      <div style={{ marginTop: 20 }}>
        <AsciiPanel title="FILTERS">
          <div style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            padding: "8px 0"
          }}>
            <select
              value={filters.source_db_engine as string}
              onChange={(e) => handleFilterChange('source_db_engine', e.target.value)}
              style={{
                padding: "6px 10px",
                border: `1px solid ${asciiColors.border}`,
                borderRadius: 2,
                fontSize: 12,
                fontFamily: "Consolas",
                backgroundColor: asciiColors.background,
                color: asciiColors.foreground,
                cursor: "pointer",
                outline: "none"
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = asciiColors.accent;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = asciiColors.border;
              }}
            >
              <option value="">All Source Engines</option>
              <option value="PostgreSQL">PostgreSQL</option>
              <option value="MariaDB">MariaDB</option>
              <option value="MSSQL">MSSQL</option>
              <option value="MongoDB">MongoDB</option>
              <option value="Oracle">Oracle</option>
              <option value="Python">Python</option>
            </select>

            <select
              value={filters.target_db_engine as string}
              onChange={(e) => handleFilterChange('target_db_engine', e.target.value)}
              style={{
                padding: "6px 10px",
                border: `1px solid ${asciiColors.border}`,
                borderRadius: 2,
                fontSize: 12,
                fontFamily: "Consolas",
                backgroundColor: asciiColors.background,
                color: asciiColors.foreground,
                cursor: "pointer",
                outline: "none"
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = asciiColors.accent;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = asciiColors.border;
              }}
            >
              <option value="">All Target Engines</option>
              <option value="PostgreSQL">PostgreSQL</option>
              <option value="MariaDB">MariaDB</option>
              <option value="MSSQL">MSSQL</option>
              <option value="MongoDB">MongoDB</option>
              <option value="Oracle">Oracle</option>
            </select>

            <select
              value={filters.active as string}
              onChange={(e) => handleFilterChange('active', e.target.value)}
              style={{
                padding: "6px 10px",
                border: `1px solid ${asciiColors.border}`,
                borderRadius: 2,
                fontSize: 12,
                fontFamily: "Consolas",
                backgroundColor: asciiColors.background,
                color: asciiColors.foreground,
                cursor: "pointer",
                outline: "none"
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = asciiColors.accent;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = asciiColors.border;
              }}
            >
              <option value="">All Active States</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>

            <select
              value={filters.enabled as string}
              onChange={(e) => handleFilterChange('enabled', e.target.value)}
              style={{
                padding: "6px 10px",
                border: `1px solid ${asciiColors.border}`,
                borderRadius: 2,
                fontSize: 12,
                fontFamily: "Consolas",
                backgroundColor: asciiColors.background,
                color: asciiColors.foreground,
                cursor: "pointer",
                outline: "none"
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = asciiColors.accent;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = asciiColors.border;
              }}
            >
              <option value="">All Enabled States</option>
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </select>
          </div>
        </AsciiPanel>
      </div>

      {loadingTree ? (
        <div style={{ marginTop: 20 }}>
          <AsciiPanel title="LOADING">
            <div style={{
              padding: "40px",
              textAlign: "center",
              fontSize: 12,
              fontFamily: "Consolas",
              color: asciiColors.muted
            }}>
              {ascii.blockFull} Loading tree view...
            </div>
          </AsciiPanel>
        </div>
      ) : (
        <div style={{ marginTop: 20 }}>
          <CustomJobsTreeView 
            jobs={allJobs}
            onJobClick={handleJobClick}
            onJobEdit={(job) => handleOpenModal(job)}
            onJobExecute={handleExecute}
            onJobToggleActive={handleToggleActive}
            onJobDelete={handleDelete}
            onJobDuplicate={handleDuplicate}
            onJobReboot={handleReboot}
          />
        </div>
      )}

      {isModalOpen && (
        <>
          <div 
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backdropFilter: "blur(5px)",
              background: "rgba(0, 0, 0, 0.3)",
              zIndex: 999,
              animation: "fadeIn 0.15s ease-in"
            }}
            onClick={handleCloseModal}
          />
          <div 
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 1000,
              animation: "fadeIn 0.15s ease-in"
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                handleCloseModal();
              }
            }}
          >
            <div 
              style={{
                background: asciiColors.background,
                padding: "24px",
                borderRadius: 2,
                width: "90vw",
                height: "90vh",
                maxHeight: "90vh",
                overflowY: "auto",
                fontFamily: "Consolas",
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
                animation: "slideUp 0.2s ease-out",
                border: `2px solid ${asciiColors.border}`
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{
                borderBottom: `2px solid ${asciiColors.border}`,
                paddingBottom: "8px",
                marginBottom: "20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}>
                <h2 style={{
                  fontSize: 14,
                  fontWeight: 600,
                  margin: 0,
                  fontFamily: "Consolas",
                  color: asciiColors.foreground,
                  textTransform: "uppercase"
                }}>
                  <span style={{ color: asciiColors.accent, marginRight: 8 }}>{ascii.blockFull}</span>
                  {editingJob ? 'EDIT PIPELINE' : duplicateData ? 'DUPLICATE PIPELINE' : 'CREATE NEW PIPELINE'}
                </h2>
                <button
                  onClick={handleCloseModal}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: 20,
                    cursor: "pointer",
                    color: asciiColors.muted,
                    padding: 0,
                    width: 30,
                    height: 30,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "Consolas"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = asciiColors.foreground;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = asciiColors.muted;
                  }}
                >
                  ×
                </button>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  color: asciiColors.foreground,
                  marginBottom: 6,
                  fontFamily: "Consolas",
                  textTransform: "uppercase"
                }}>
                  {ascii.v} PIPELINE NAME *
                </label>
                <input
                  value={jobForm.job_name}
                  onChange={(e) => setJobForm(prev => ({ ...prev, job_name: e.target.value }))}
                  placeholder="Enter unique pipeline name"
                  disabled={!!editingJob}
                  style={{
                    width: "100%",
                    padding: "6px 10px",
                    border: `1px solid ${asciiColors.border}`,
                    borderRadius: 2,
                    fontSize: 12,
                    fontFamily: "Consolas",
                    backgroundColor: editingJob ? asciiColors.backgroundSoft : asciiColors.background,
                    color: asciiColors.foreground,
                    outline: "none",
                    cursor: editingJob ? "not-allowed" : "text"
                  }}
                  onFocus={(e) => {
                    if (!editingJob) {
                      e.currentTarget.style.borderColor = asciiColors.accent;
                    }
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = asciiColors.border;
                  }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  color: asciiColors.foreground,
                  marginBottom: 6,
                  fontFamily: "Consolas",
                  textTransform: "uppercase"
                }}>
                  {ascii.v} DESCRIPTION
                </label>
                <input
                  value={jobForm.description}
                  onChange={(e) => setJobForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Pipeline description"
                  style={{
                    width: "100%",
                    padding: "6px 10px",
                    border: `1px solid ${asciiColors.border}`,
                    borderRadius: 2,
                    fontSize: 12,
                    fontFamily: "Consolas",
                    backgroundColor: asciiColors.background,
                    color: asciiColors.foreground,
                    outline: "none"
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = asciiColors.accent;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = asciiColors.border;
                  }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  color: asciiColors.foreground,
                  marginBottom: 6,
                  fontFamily: "Consolas",
                  textTransform: "uppercase"
                }}>
                  {ascii.v} SOURCE DB ENGINE *
                </label>
                <select
                  value={isDataLake ? 'DataLake' : jobForm.source_db_engine}
                  onChange={async (e) => {
                    const selectedEngine = e.target.value;
                    if (selectedEngine === 'DataLake') {
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
                        source_db_engine: 'PostgreSQL',
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
                  style={{
                    width: "100%",
                    padding: "6px 10px",
                    border: `1px solid ${asciiColors.border}`,
                    borderRadius: 2,
                    fontSize: 12,
                    fontFamily: "Consolas",
                    backgroundColor: asciiColors.background,
                    color: asciiColors.foreground,
                    cursor: "pointer",
                    outline: "none"
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = asciiColors.accent;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = asciiColors.border;
                  }}
                >
                  <option value="DataLake">DataLake (Default)</option>
                  <option value="PostgreSQL">PostgreSQL (External)</option>
                  <option value="MariaDB">MariaDB</option>
                  <option value="MSSQL">MSSQL</option>
                  <option value="MongoDB">MongoDB</option>
                  <option value="Oracle">Oracle</option>
                  <option value="Python">Python</option>
                </select>
              </div>

              {jobForm.source_db_engine !== 'Python' && editorMode === 'sql' && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <label style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: asciiColors.foreground,
                      fontFamily: "Consolas",
                      textTransform: "uppercase"
                    }}>
                      {ascii.v} SOURCE CONNECTION STRING
                      {isDataLake && (
                        <span style={{ marginLeft: 8, fontSize: 11, color: asciiColors.muted, fontFamily: "Consolas" }}>
                          (DataLake - Auto-filled)
                        </span>
                      )}
                    </label>
                    <AsciiButton
                      label={isTestingConnection ? 'Testing...' : 'Test Connection'}
                      onClick={handleTestConnection}
                      variant="ghost"
                      disabled={
                        isTestingConnection || 
                        !jobForm.source_db_engine || 
                        (!isDataLake && !jobForm.source_connection_string.trim()) ||
                        (isDataLake && !datalakeConnection)
                      }
                    />
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
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
                      style={{
                        width: "100%",
                        padding: "6px 10px",
                        paddingRight: isDataLake ? '80px' : '10px',
                        border: `1px solid ${asciiColors.border}`,
                        borderRadius: 2,
                        fontSize: 12,
                        fontFamily: "Consolas",
                        backgroundColor: isDataLake ? asciiColors.backgroundSoft : asciiColors.background,
                        color: asciiColors.foreground,
                        outline: "none",
                        cursor: isDataLake ? "not-allowed" : "text"
                      }}
                      onFocus={(e) => {
                        if (!isDataLake) {
                          e.currentTarget.style.borderColor = asciiColors.accent;
                        }
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = asciiColors.border;
                      }}
                    />
                    {isDataLake && (
                      <button
                        type="button"
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
                          fontSize: 11,
                          border: `1px solid ${asciiColors.border}`,
                          borderRadius: 2,
                          fontFamily: "Consolas",
                          backgroundColor: asciiColors.background,
                          color: asciiColors.foreground,
                          cursor: "pointer",
                          outline: "none"
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = asciiColors.backgroundSoft;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = asciiColors.background;
                        }}
                      >
                        Edit
                      </button>
                    )}
                  </div>
                  {connectionTestResult && (
                    <div style={{
                      marginTop: 8,
                      padding: "8px 12px",
                      borderRadius: 2,
                      fontSize: 12,
                      fontFamily: "Consolas",
                      backgroundColor: connectionTestResult.success ? asciiColors.success : asciiColors.danger,
                      color: asciiColors.background
                    }}>
                      {connectionTestResult.success ? '✓ ' : '✗ '}
                      {connectionTestResult.message}
                    </div>
                  )}
                  {connectionTested && (
                    <div style={{
                      marginTop: 8,
                      padding: "8px 12px",
                      background: asciiColors.accentSoft + "20",
                      color: asciiColors.accent,
                      borderRadius: 2,
                      fontSize: 12,
                      fontFamily: "Consolas",
                      border: `1px solid ${asciiColors.accent}`
                    }}>
                      Connection successful! You can now write your SQL query and preview the results.
                    </div>
                  )}
                </div>
              )}

              {jobForm.source_db_engine === 'Python' && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 600,
                    color: asciiColors.foreground,
                    marginBottom: 6,
                    fontFamily: "Consolas",
                    textTransform: "uppercase"
                  }}>
                    {ascii.v} SELECT PYTHON SCRIPT
                  </label>
                  <select
                    value={selectedScript}
                    onChange={(e) => handleScriptSelect(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "6px 10px",
                      border: `1px solid ${asciiColors.border}`,
                      borderRadius: 2,
                      fontSize: 12,
                      fontFamily: "Consolas",
                      backgroundColor: asciiColors.background,
                      color: asciiColors.foreground,
                      cursor: "pointer",
                      outline: "none",
                      marginBottom: 12
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = asciiColors.accent;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = asciiColors.border;
                    }}
                  >
                    <option value="">-- Select a script or write custom --</option>
                    {availableScripts.map(script => (
                      <option key={script.name} value={script.name}>
                        {script.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {jobForm.source_db_engine !== 'Python' && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <label style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: asciiColors.foreground,
                      fontFamily: "Consolas",
                      textTransform: "uppercase"
                    }}>
                      {ascii.v} {editorMode === 'visual' ? 'VISUAL PIPELINE' : 'SQL QUERY'} *
                    </label>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: 4, border: `1px solid ${asciiColors.border}`, borderRadius: 2, padding: 2 }}>
                        <button
                          onClick={() => setEditorMode('sql')}
                          style={{
                            padding: '4px 12px',
                            border: 'none',
                            borderRadius: 2,
                            background: editorMode === 'sql' ? asciiColors.accent : 'transparent',
                            color: editorMode === 'sql' ? asciiColors.background : asciiColors.foreground,
                            cursor: 'pointer',
                            fontSize: 11,
                            fontFamily: 'Consolas',
                            fontWeight: editorMode === 'sql' ? 600 : 400
                          }}
                        >
                          SQL
                        </button>
                        <button
                          onClick={() => setEditorMode('visual')}
                          style={{
                            padding: '4px 12px',
                            border: 'none',
                            borderRadius: 2,
                            background: editorMode === 'visual' ? asciiColors.accent : 'transparent',
                            color: editorMode === 'visual' ? asciiColors.background : asciiColors.foreground,
                            cursor: 'pointer',
                            fontSize: 11,
                            fontFamily: 'Consolas',
                            fontWeight: editorMode === 'visual' ? 600 : 400
                          }}
                        >
                          VISUAL
                        </button>
                      </div>
                      {editorMode === 'sql' && (
                        <AsciiButton
                          label={isPreviewing ? 'Previewing...' : 'Preview Query'}
                          onClick={handlePreviewQuery}
                          variant="ghost"
                          disabled={isPreviewing || !jobForm.source_db_engine || !jobForm.source_connection_string.trim() || !jobForm.query_sql.trim()}
                        />
                      )}
                    </div>
                  </div>
                  {editorMode === 'sql' ? (
                    <>
                      <SQLEditor
                        value={jobForm.query_sql}
                        onChange={(newValue) => {
                          setJobForm(prev => ({ ...prev, query_sql: newValue }));
                          setPreviewData(null);
                          setPreviewError(null);
                          
                          if (newValue.trim()) {
                            try {
                              const graph = parseSQLToGraph(newValue);
                              setPipelineGraph(graph);
                            } catch (err) {
                              console.error('Error parsing SQL to graph:', err);
                            }
                          }
                        }}
                        placeholder="SELECT * FROM table_name WHERE condition..."
                        schemas={sourceSchemas}
                        tables={sourceTables}
                        columns={sourceColumns}
                      />
                      
                      {previewData && (
                        <div style={{ marginTop: 16 }}>
                          <div style={{
                            border: `1px solid ${asciiColors.border}`,
                            borderRadius: 2,
                            overflow: 'auto',
                            maxHeight: '400px',
                            fontFamily: "Consolas"
                          }}>
                            <div style={{
                              padding: '8px 12px',
                              background: asciiColors.backgroundSoft,
                              borderBottom: `1px solid ${asciiColors.border}`,
                              fontSize: 12,
                              fontWeight: 600,
                              fontFamily: "Consolas",
                              color: asciiColors.foreground
                            }}>
                              Preview Results ({previewData.rowCount} rows)
                            </div>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: "Consolas" }}>
                              <thead>
                                <tr style={{ background: asciiColors.backgroundSoft }}>
                                  {previewData.columns.map((col, idx) => (
                                    <th key={idx} style={{
                                      padding: '8px',
                                      textAlign: 'left',
                                      borderBottom: `1px solid ${asciiColors.border}`,
                                      fontWeight: 600,
                                      fontFamily: "Consolas",
                                      color: asciiColors.foreground
                                    }}>
                                      {col}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {previewData.rows.map((row, rowIdx) => (
                                  <tr key={rowIdx} style={{ borderBottom: `1px solid ${asciiColors.border}` }}>
                                    {previewData.columns.map((col, colIdx) => (
                                      <td key={colIdx} style={{
                                        padding: '8px',
                                        maxWidth: '200px',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        fontFamily: "Consolas",
                                        fontSize: 11,
                                        color: asciiColors.foreground
                                      }}>
                                        {row[col] !== null && row[col] !== undefined ? String(row[col]) : 'NULL'}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {!previewData && jobForm.query_sql.trim() && pipelineGraph.nodes.length > 0 && (
                        <div style={{ marginTop: 16 }}>
                          <div style={{
                            padding: 12,
                            background: asciiColors.backgroundSoft,
                            border: `1px solid ${asciiColors.border}`,
                            borderRadius: 2,
                            maxHeight: '400px',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column'
                          }}>
                            <div style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: asciiColors.accent,
                              marginBottom: 8,
                              fontFamily: 'Consolas',
                              flexShrink: 0
                            }}>
                              {ascii.blockSemi} VISUAL PREVIEW (Auto-generated from SQL)
                            </div>
                            <div style={{
                              border: `1px solid ${asciiColors.border}`,
                              borderRadius: 2,
                              background: asciiColors.background,
                              height: 300,
                              minHeight: 300,
                              maxHeight: 300,
                              overflow: 'hidden',
                              position: 'relative',
                              flexShrink: 0
                            }}>
                              <VisualPipelineEditor
                                initialGraph={pipelineGraph}
                                onGraphChange={setPipelineGraph}
                                sourceConnectionString={jobForm.source_connection_string}
                                sourceDbEngine={jobForm.source_db_engine}
                                targetConnectionString={jobForm.target_connection_string}
                                targetDbEngine={jobForm.target_db_engine}
                                targetSchema={jobForm.target_schema}
                                targetTable={jobForm.target_table}
                              />
                            </div>
                            <div style={{
                              marginTop: 8,
                              fontSize: 10,
                              color: asciiColors.muted,
                              fontFamily: 'Consolas',
                              fontStyle: 'italic',
                              flexShrink: 0
                            }}>
                              Note: This is a read-only preview. Switch to VISUAL mode to edit the pipeline.
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{
                      border: `1px solid ${asciiColors.border}`,
                      borderRadius: 2,
                      background: asciiColors.backgroundSoft,
                      minHeight: 500
                    }}>
                      <VisualPipelineEditor
                        initialGraph={pipelineGraph}
                        onGraphChange={setPipelineGraph}
                        sourceConnectionString={jobForm.source_connection_string}
                        sourceDbEngine={jobForm.source_db_engine}
                        targetConnectionString={jobForm.target_connection_string}
                        targetDbEngine={jobForm.target_db_engine}
                        targetSchema={jobForm.target_schema}
                        targetTable={jobForm.target_table}
                      />
                    </div>
                  )}
                  {previewError && (
                    <div style={{
                      marginTop: 8,
                      padding: 12,
                      color: asciiColors.danger,
                      background: asciiColors.danger + "20",
                      borderRadius: 2,
                      fontSize: 12,
                      fontFamily: "Consolas",
                      border: `1px solid ${asciiColors.danger}`
                    }}>
                      {previewError}
                    </div>
                  )}
                </div>
              )}

              {jobForm.source_db_engine === 'Python' && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 600,
                    color: asciiColors.foreground,
                    marginBottom: 6,
                    fontFamily: "Consolas",
                    textTransform: "uppercase"
                  }}>
                    {ascii.v} PYTHON SCRIPT *
                  </label>
                  <textarea
                    value={jobForm.query_sql}
                    onChange={(e) => setJobForm(prev => ({ ...prev, query_sql: e.target.value }))}
                    placeholder="import json\n\ndata = [...]\nprint(json.dumps(data))"
                    style={{
                      width: "100%",
                      minHeight: 150,
                      padding: "8px 12px",
                      border: `1px solid ${asciiColors.border}`,
                      borderRadius: 2,
                      fontSize: 12,
                      fontFamily: "Consolas",
                      backgroundColor: asciiColors.background,
                      color: asciiColors.foreground,
                      outline: "none",
                      resize: "vertical"
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = asciiColors.accent;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = asciiColors.border;
                    }}
                  />
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <label style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  color: asciiColors.foreground,
                  marginBottom: 6,
                  fontFamily: "Consolas",
                  textTransform: "uppercase"
                }}>
                  {ascii.v} TARGET DB ENGINE *
                </label>
                <select
                  value={jobForm.target_db_engine}
                  onChange={(e) => setJobForm(prev => ({ ...prev, target_db_engine: e.target.value }))}
                  style={{
                    width: "100%",
                    padding: "6px 10px",
                    border: `1px solid ${asciiColors.border}`,
                    borderRadius: 2,
                    fontSize: 12,
                    fontFamily: "Consolas",
                    backgroundColor: asciiColors.background,
                    color: asciiColors.foreground,
                    cursor: "pointer",
                    outline: "none"
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = asciiColors.accent;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = asciiColors.border;
                  }}
                >
                  <option value="PostgreSQL">PostgreSQL</option>
                  <option value="MariaDB">MariaDB</option>
                  <option value="MSSQL">MSSQL</option>
                  <option value="MongoDB">MongoDB</option>
                  <option value="Oracle">Oracle</option>
                </select>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  color: asciiColors.foreground,
                  marginBottom: 6,
                  fontFamily: "Consolas",
                  textTransform: "uppercase"
                }}>
                  {ascii.v} TARGET CONNECTION STRING *
                </label>
                <textarea
                  value={jobForm.target_connection_string}
                  onChange={(e) => setJobForm(prev => ({ ...prev, target_connection_string: e.target.value }))}
                  placeholder={connectionStringExamples[jobForm.target_db_engine] || "host=localhost port=5432 dbname=..."}
                  rows={3}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: `1px solid ${asciiColors.border}`,
                    borderRadius: 2,
                    fontSize: 12,
                    fontFamily: "Consolas",
                    backgroundColor: asciiColors.background,
                    color: asciiColors.foreground,
                    outline: "none",
                    resize: "vertical"
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = asciiColors.accent;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = asciiColors.border;
                  }}
                />
                {jobForm.target_db_engine && connectionStringExamples[jobForm.target_db_engine] && (
                  <div style={{
                    marginTop: 8,
                    padding: 8,
                    background: asciiColors.backgroundSoft,
                    borderRadius: 2,
                    borderLeft: `3px solid ${asciiColors.accent}`,
                    fontFamily: "Consolas",
                    fontSize: 11,
                    color: asciiColors.muted,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all"
                  }}>
                    Example: {connectionStringExamples[jobForm.target_db_engine]}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  color: asciiColors.foreground,
                  marginBottom: 6,
                  fontFamily: "Consolas",
                  textTransform: "uppercase"
                }}>
                  {ascii.v} TARGET SCHEMA *
                </label>
                <input
                  value={jobForm.target_schema}
                  onChange={(e) => setJobForm(prev => ({ ...prev, target_schema: e.target.value }))}
                  placeholder="public"
                  style={{
                    width: "100%",
                    padding: "6px 10px",
                    border: `1px solid ${asciiColors.border}`,
                    borderRadius: 2,
                    fontSize: 12,
                    fontFamily: "Consolas",
                    backgroundColor: asciiColors.background,
                    color: asciiColors.foreground,
                    outline: "none"
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = asciiColors.accent;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = asciiColors.border;
                  }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  color: asciiColors.foreground,
                  marginBottom: 6,
                  fontFamily: "Consolas",
                  textTransform: "uppercase"
                }}>
                  {ascii.v} TARGET TABLE *
                </label>
                <input
                  value={jobForm.target_table}
                  onChange={(e) => setJobForm(prev => ({ ...prev, target_table: e.target.value }))}
                  placeholder="table_name"
                  style={{
                    width: "100%",
                    padding: "6px 10px",
                    border: `1px solid ${asciiColors.border}`,
                    borderRadius: 2,
                    fontSize: 12,
                    fontFamily: "Consolas",
                    backgroundColor: asciiColors.background,
                    color: asciiColors.foreground,
                    outline: "none"
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = asciiColors.accent;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = asciiColors.border;
                  }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  color: asciiColors.foreground,
                  marginBottom: 6,
                  fontFamily: "Consolas",
                  textTransform: "uppercase"
                }}>
                  {ascii.v} EXECUTION MODE
                </label>
                <input
                  value={jobForm.schedule_cron}
                  onChange={(e) => setJobForm(prev => ({ ...prev, schedule_cron: e.target.value }))}
                  placeholder="Leave empty for Manual execution, or enter Cron: * * * * *"
                  style={{
                    width: "100%",
                    padding: "6px 10px",
                    border: `1px solid ${asciiColors.border}`,
                    borderRadius: 2,
                    fontSize: 12,
                    fontFamily: "Consolas",
                    backgroundColor: asciiColors.background,
                    color: asciiColors.foreground,
                    outline: "none"
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = asciiColors.accent;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = asciiColors.border;
                  }}
                />
                <div style={{
                  marginTop: 8,
                  padding: "8px 12px",
                  borderRadius: 2,
                  fontSize: 11,
                  fontFamily: "Consolas",
                  backgroundColor: jobForm.schedule_cron ? asciiColors.accentSoft + "20" : asciiColors.backgroundSoft,
                  border: `1px solid ${jobForm.schedule_cron ? asciiColors.accent : asciiColors.border}`,
                  color: jobForm.schedule_cron ? asciiColors.accent : asciiColors.muted
                }}>
                  {jobForm.schedule_cron ? (
                    <>
                      <span style={{ color: asciiColors.accent, fontWeight: 600 }}>✓ AUTOMATIC:</span> This job will run automatically on schedule ({jobForm.schedule_cron})
                    </>
                  ) : (
                    <>
                      <span style={{ color: asciiColors.muted, fontWeight: 600 }}>ℹ MANUAL:</span> This job will only run when manually triggered via the Execute button
                    </>
                  )}
                </div>
                {jobForm.schedule_cron && (
                  <div style={{
                    marginTop: 6,
                    padding: "6px 10px",
                    borderRadius: 2,
                    fontSize: 10,
                    fontFamily: "Consolas",
                    backgroundColor: asciiColors.backgroundSoft,
                    color: asciiColors.muted,
                    borderLeft: `3px solid ${asciiColors.accent}`
                  }}>
                    Cron format: minute hour day month day-of-week (e.g., "0 2 * * *" = daily at 2 AM)
                  </div>
                )}
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={jobForm.active}
                    onChange={(e) => setJobForm(prev => ({ ...prev, active: e.target.checked }))}
                    style={{
                      width: 18,
                      height: 18,
                      cursor: "pointer"
                    }}
                  />
                  <label style={{
                    margin: 0,
                    cursor: "pointer",
                    fontSize: 12,
                    fontFamily: "Consolas",
                    color: asciiColors.foreground
                  }}>
                    Active
                  </label>
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={jobForm.enabled}
                    onChange={(e) => setJobForm(prev => ({ ...prev, enabled: e.target.checked }))}
                    style={{
                      width: 18,
                      height: 18,
                      cursor: "pointer"
                    }}
                  />
                  <label style={{
                    margin: 0,
                    cursor: "pointer",
                    fontSize: 12,
                    fontFamily: "Consolas",
                    color: asciiColors.foreground
                  }}>
                    Enabled
                  </label>
                </div>
              </div>

              <div style={{
                marginTop: 20,
                border: `1px solid ${asciiColors.border}`,
                borderRadius: 2,
                overflow: 'hidden',
                fontFamily: "Consolas"
              }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: 12,
                    background: asciiColors.backgroundSoft,
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                  onClick={() => setShowLoadStrategySection(!showLoadStrategySection)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = asciiColors.background;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = asciiColors.backgroundSoft;
                  }}
                >
                  <h4 style={{
                    margin: 0,
                    fontSize: 12,
                    color: asciiColors.foreground,
                    fontFamily: "Consolas",
                    fontWeight: 600
                  }}>
                    {ascii.blockFull} LOAD STRATEGY (DATA WAREHOUSE)
                  </h4>
                  <span style={{ color: asciiColors.muted, fontFamily: "Consolas" }}>
                    {showLoadStrategySection ? '▼' : '▶'}
                  </span>
                </div>
                {showLoadStrategySection && (
                  <div style={{
                    padding: 12,
                    background: asciiColors.background
                  }}>
                    <div style={{
                      marginTop: 12,
                      padding: 12,
                      background: asciiColors.backgroundSoft,
                      borderRadius: 2
                    }}>
                      <label style={{
                        display: "block",
                        fontSize: 12,
                        fontWeight: 600,
                        color: asciiColors.foreground,
                        marginBottom: 6,
                        fontFamily: "Consolas",
                        textTransform: "uppercase"
                      }}>
                        {ascii.v} LOAD STRATEGY
                      </label>
                      <select
                        value={jobForm.metadata.load_strategy}
                        onChange={(e) => {
                          setJobForm(prev => ({
                            ...prev,
                            metadata: { ...prev.metadata, load_strategy: e.target.value as any }
                          }));
                        }}
                        style={{
                          width: "100%",
                          padding: "6px 10px",
                          border: `1px solid ${asciiColors.border}`,
                          borderRadius: 2,
                          fontSize: 12,
                          fontFamily: "Consolas",
                          backgroundColor: asciiColors.background,
                          color: asciiColors.foreground,
                          cursor: "pointer",
                          outline: "none"
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = asciiColors.accent;
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = asciiColors.border;
                        }}
                      >
                        <option value="TRUNCATE">TRUNCATE (Full Load - Data Lake)</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                marginTop: 20,
                paddingTop: 16,
                borderTop: `1px solid ${asciiColors.border}`
              }}>
                <AsciiButton
                  label="Cancel"
                  onClick={handleCloseModal}
                  variant="ghost"
                />
                <button
                  type="button"
                  onClick={handleSubmit}
                  style={{
                    padding: "6px 16px",
                    border: `1px solid ${asciiColors.accent}`,
                    borderRadius: 2,
                    fontSize: 12,
                    fontFamily: "Consolas",
                    backgroundColor: asciiColors.accent,
                    color: asciiColors.background,
                    cursor: "pointer",
                    fontWeight: 600,
                    outline: "none"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = asciiColors.accentSoft;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = asciiColors.accent;
                  }}
                >
                  {editingJob ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes slideUp {
              from {
                opacity: 0;
                transform: translateY(20px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
          `}</style>
        </>
      )}

      {selectedJob && (
        <>
          <div 
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backdropFilter: "blur(5px)",
              background: "rgba(0, 0, 0, 0.3)",
              zIndex: 999,
              animation: "fadeIn 0.2s ease-in"
            }}
            onClick={() => setSelectedJob(null)}
          />
          <div 
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
              animation: "fadeIn 0.2s ease-in"
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setSelectedJob(null);
              }
            }}
          >
            <div 
              style={{
                background: asciiColors.background,
                borderRadius: 2,
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
                width: "90%",
                maxWidth: 1400,
                maxHeight: "90vh",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                animation: "slideIn 0.3s ease-out",
                border: `2px solid ${asciiColors.border}`
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{
                padding: "16px 20px",
                borderBottom: `2px solid ${asciiColors.border}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: asciiColors.backgroundSoft
              }}>
                <h2 style={{
                  margin: 0,
                  fontSize: 14,
                  fontFamily: "Consolas",
                  fontWeight: 600,
                  color: asciiColors.foreground,
                  textTransform: "uppercase"
                }}>
                  <span style={{ color: asciiColors.accent, marginRight: 8 }}>{ascii.blockFull}</span>
                  DATA FLOW: {selectedJob.job_name}
                </h2>
                <AsciiButton
                  label="Close"
                  onClick={() => setSelectedJob(null)}
                  variant="ghost"
                />
              </div>
              
              <div style={{
                padding: "20px",
                overflowY: "auto",
                flex: 1,
                fontFamily: "Consolas",
                fontSize: 12
              }}>
                <EnrichedMappingGraph
                  sourceTitle="Source: SQL Query"
                  sourceType="Pipeline Orchestration"
                  sourceInfo={[
                    { label: "Pipeline Name", value: selectedJob.job_name },
                    { label: "Source DB Engine", value: selectedJob.source_db_engine },
                    { label: "Query", value: selectedJob.query_sql?.substring(0, 150) + (selectedJob.query_sql?.length > 150 ? '...' : '') || 'N/A' },
                  ]}
                  tableStructure={tableStructure}
                  loading={loadingStructure}
                  job={selectedJob}
                />
              </div>
            </div>
          </div>
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes slideIn {
              from {
                transform: translateY(20px);
                opacity: 0;
              }
              to {
                transform: translateY(0);
                opacity: 1;
              }
            }
          `}</style>
        </>
      )}

      {showCustomJobsPlaybook && (
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
        }}
        onClick={() => setShowCustomJobsPlaybook(false)}
        >
          <div style={{
            width: '90%',
            maxWidth: 1000,
            maxHeight: '90vh',
            overflowY: 'auto'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <AsciiPanel title="CUSTOM JOBS PLAYBOOK">
              <div style={{ padding: 16, fontFamily: 'Consolas', fontSize: 12, lineHeight: 1.6 }}>
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                    {ascii.blockFull} OVERVIEW
                  </div>
                  <div style={{ color: asciiColors.foreground, marginLeft: 16 }}>
                    Custom Jobs execute SQL queries from source databases and load results into target databases. They support complex ETL workflows 
                    with custom transformations, column mappings, filters, and validations. Jobs can be scheduled using cron expressions.
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                    {ascii.blockFull} SUPPORTED ENGINES
                  </div>
                  <div style={{ color: asciiColors.foreground, marginLeft: 16 }}>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.muted }}>├─</span> <strong>Source:</strong> PostgreSQL, MariaDB, MSSQL, MongoDB, Oracle, DB2
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.muted }}>└─</span> <strong>Target:</strong> PostgreSQL, MariaDB, MSSQL, MongoDB, Oracle, DB2
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                    {ascii.blockFull} EXECUTION MODES
                  </div>
                  <div style={{ color: asciiColors.foreground, marginLeft: 16 }}>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.muted }}>├─</span> <strong>SQL Editor:</strong> Write custom SQL queries for data extraction
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.muted }}>└─</span> <strong>Visual Pipeline:</strong> Build ETL pipelines using drag-and-drop components
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                    {ascii.blockFull} TRANSFORMATION FEATURES
                  </div>
                  <div style={{ color: asciiColors.foreground, marginLeft: 16 }}>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.muted }}>├─</span> <strong>Column Mapping:</strong> Map source columns to target columns
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.muted }}>├─</span> <strong>Filters:</strong> Apply WHERE conditions to filter source data
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.muted }}>├─</span> <strong>Column Transforms:</strong> Apply expressions and transformations to columns
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.muted }}>└─</span> <strong>Validations:</strong> Validate data quality before loading
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                    {ascii.blockFull} LOAD STRATEGIES
                  </div>
                  <div style={{ color: asciiColors.foreground, marginLeft: 16 }}>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.muted }}>├─</span> <strong>TRUNCATE:</strong> Delete all existing data before loading new data
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.muted }}>├─</span> <strong>APPEND:</strong> Add new data to existing data without deleting
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.muted }}>└─</span> <strong>UPSERT:</strong> Update existing records or insert new ones based on keys
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                    {ascii.blockFull} CRON SCHEDULING
                  </div>
                  <div style={{ color: asciiColors.foreground, marginLeft: 16 }}>
                    Jobs can be scheduled using standard cron expressions. Examples: "0 * * * *" (every hour), 
                    "0 0 * * *" (daily at midnight), "0 0 * * 0" (weekly on Sunday).
                  </div>
                </div>

                <div style={{ 
                  marginTop: 16, 
                  padding: 12, 
                  background: asciiColors.backgroundSoft, 
                  borderRadius: 2,
                  border: `1px solid ${asciiColors.border}`
                }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: asciiColors.muted, marginBottom: 4 }}>
                    {ascii.blockSemi} Best Practices
                  </div>
                  <div style={{ fontSize: 11, color: asciiColors.foreground }}>
                    • Test SQL queries using the preview feature before saving<br/>
                    • Use connection testing to verify database connectivity<br/>
                    • Choose appropriate load strategies based on your use case<br/>
                    • Set up cron schedules for regular data synchronization<br/>
                    • Monitor execution history for job failures<br/>
                    • Use visual pipeline editor for complex transformations<br/>
                    • Review target table structures to ensure compatibility
                  </div>
                </div>

                <div style={{ marginTop: 16, textAlign: 'right' }}>
                  <AsciiButton
                    label="Close"
                    onClick={() => setShowCustomJobsPlaybook(false)}
                    variant="ghost"
                  />
                </div>
              </div>
            </AsciiPanel>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomJobs;
