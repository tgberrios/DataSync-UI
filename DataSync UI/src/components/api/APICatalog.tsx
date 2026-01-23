import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { format } from 'date-fns';
import AddAPIModal from './AddAPIModal';
import APICatalogTreeView from './APICatalogTreeView';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { usePagination } from '../../hooks/usePagination';
import { useTableFilters } from '../../hooks/useTableFilters';
import { apiCatalogApi } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import { sanitizeSearch } from '../../utils/validation';
import SkeletonLoader from '../shared/SkeletonLoader';

interface APICatalogEntry {
  id: number;
  api_name: string;
  api_type: string;
  base_url: string;
  endpoint: string;
  http_method: string;
  auth_type: string;
  target_db_engine: string;
  target_schema: string;
  target_table: string;
  status: string;
  active: boolean;
  sync_interval: number;
  last_sync_time: string | null;
  last_sync_status: string | null;
  created_at: string;
  updated_at: string;
}

const APICatalog = () => {
  const { setPage } = usePagination(1, 20);
  const { filters, setFilter } = useTableFilters({
    api_type: '',
    target_db_engine: '',
    status: '',
    active: ''
  });
  
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [duplicateData, setDuplicateData] = useState<any>(null);
  const [allEntries, setAllEntries] = useState<APICatalogEntry[]>([]);
  const [loadingTree, setLoadingTree] = useState(true);
  const [selectedAPI, setSelectedAPI] = useState<APICatalogEntry | null>(null);
  const [executionHistory, setExecutionHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [tableStructure, setTableStructure] = useState<any>(null);
  const [loadingStructure, setLoadingStructure] = useState(false);
  const [showAPICatalogPlaybook, setShowAPICatalogPlaybook] = useState(false);
  const isMountedRef = useRef(true);


  const fetchAllEntries = useCallback(async () => {
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
      
      if (filters.api_type) params.api_type = filters.api_type;
      if (filters.target_db_engine) params.target_db_engine = filters.target_db_engine;
      if (filters.status) params.status = filters.status;
      if (filters.active) params.active = filters.active;
      
      const response = await apiCatalogApi.getAPIs(params);
      
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minLoadingTime - elapsed);
      await new Promise(resolve => setTimeout(resolve, remaining));
      
      if (isMountedRef.current) {
        const entries = response.data?.data || response.data || [];
        setAllEntries(entries);
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
  }, [filters.api_type, filters.target_db_engine, filters.status, filters.active, search]);

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
    async (newEntry: any, isEdit: boolean = false, originalApiName?: string) => {
      try {
        setError(null);
        if (isEdit && originalApiName) {
          const { api_name, ...updateData } = newEntry;
          const oldEntry = allEntries.find(e => e.api_name === originalApiName);
          await apiCatalogApi.updateAPI(originalApiName, updateData);
          await fetchAllEntries();
          setShowAddModal(false);
          setDuplicateData(null);
          
          let message = `API "${originalApiName}" updated successfully.`;
          
          if (oldEntry && (
            oldEntry.target_schema !== newEntry.target_schema || 
            oldEntry.target_table !== newEntry.target_table
          )) {
            message += `\n\nREMINDER: The target table has changed.\n` +
              `   Old table: ${oldEntry.target_schema}.${oldEntry.target_table}\n` +
              `   New table: ${newEntry.target_schema}.${newEntry.target_table}\n\n` +
              `   Consider manually deleting the old table if no longer needed:\n` +
              `   DROP TABLE IF EXISTS "${oldEntry.target_schema}"."${oldEntry.target_table}" CASCADE;`;
          }
          
          alert(message);
        } else {
          await apiCatalogApi.createAPI(newEntry);
          await fetchAllEntries();
          setShowAddModal(false);
          setDuplicateData(null);
          alert(`API "${newEntry.api_name}" added successfully.`);
        }
      } catch (err: any) {
        if (isMountedRef.current) {
          if (err.message && err.message.includes('Network Error')) {
            setError('Network error. Please check if the server is running and try again.');
          } else {
            setError(extractApiError(err));
          }
        }
      }
    },
    [fetchAllEntries, allEntries]
  );

  const handleEdit = useCallback((entry: APICatalogEntry) => {
    setDuplicateData(entry);
    setShowAddModal(true);
  }, []);

  const handleDelete = useCallback(
    async (entry: APICatalogEntry) => {
      const confirmMessage = `Are you sure you want to delete API "${entry.api_name}"?\n\n` +
        `This will delete the API from the catalog.\n\n` +
        `IMPORTANT: Remember to manually delete the target table if no longer needed:\n` +
        `   Table: ${entry.target_schema}.${entry.target_table}\n` +
        `   Database: ${entry.target_db_engine}\n` +
        `   Connection: ${entry.target_connection_string?.substring(0, 50)}...\n\n` +
        `This action cannot be undone.`;
      
      if (!confirm(confirmMessage)) {
        return;
      }

      try {
        setError(null);
        await apiCatalogApi.deleteAPI(entry.api_name);
        await fetchAllEntries();
        if (selectedAPI?.api_name === entry.api_name) {
          setSelectedAPI(null);
        }
        
        const reminderMessage = `API "${entry.api_name}" deleted successfully.\n\n` +
          `REMINDER: Don't forget to manually delete the target table if no longer needed:\n` +
          `   DROP TABLE IF EXISTS "${entry.target_schema}"."${entry.target_table}" CASCADE;\n` +
          `   (In database: ${entry.target_db_engine})`;
        
        alert(reminderMessage);
      } catch (err: any) {
        if (isMountedRef.current) {
          if (err.message && err.message.includes('Network Error')) {
            setError('Network error. Please check if the server is running and try again.');
          } else {
            setError(extractApiError(err));
          }
        }
      }
    },
    [fetchAllEntries, selectedAPI]
  );

  const handleDuplicate = useCallback((entry: APICatalogEntry) => {
    setDuplicateData(entry);
    setShowAddModal(true);
  }, []);

  const handleAPIClick = useCallback(async (entry: APICatalogEntry) => {
    setSelectedAPI(entry);
    setLoadingHistory(true);
    setLoadingStructure(true);
    setExecutionHistory([]);
    setTableStructure(null);
    
    try {
      const [history, structure] = await Promise.all([
        apiCatalogApi.getHistory(entry.api_name, 50),
        apiCatalogApi.getTableStructure(entry.api_name).catch(() => null)
      ]);
      if (isMountedRef.current) {
        setExecutionHistory(history);
        setTableStructure(structure);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(extractApiError(err));
      }
    } finally {
      if (isMountedRef.current) {
        setLoadingHistory(false);
        setLoadingStructure(false);
      }
    }
  }, []);

  if (loadingTree && allEntries.length === 0) {
    return <SkeletonLoader variant="table" />;
  }

  return (
    <div style={{ padding: "20px", fontFamily: "Consolas", fontSize: 12 }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "20px"
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
          API CATALOG
        </h1>
        <AsciiButton
          label="API Catalog Info"
          onClick={() => setShowAPICatalogPlaybook(true)}
          variant="ghost"
        />
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
            placeholder="Search by API name, endpoint, or target..."
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

      <AsciiPanel title="FILTERS">
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          padding: "8px 0"
        }}>
          <AsciiButton
            label="Add API"
            onClick={() => setShowAddModal(true)}
            variant="primary"
          />
          
          <select
            value={filters.api_type as string}
            onChange={(e) => handleFilterChange('api_type', e.target.value)}
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
            <option value="">All API Types</option>
            <option value="REST">REST</option>
            <option value="GraphQL">GraphQL</option>
            <option value="SOAP">SOAP</option>
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
            value={filters.status as string}
            onChange={(e) => handleFilterChange('status', e.target.value)}
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
            <option value="">All Statuses</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="ERROR">ERROR</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="PENDING">PENDING</option>
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
            <option value="">All</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
      </AsciiPanel>

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
          <APICatalogTreeView 
            entries={allEntries}
            onEntryClick={handleAPIClick}
            onDuplicate={handleDuplicate}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>
      )}

      {selectedAPI && (
        <ExecutionTimeline
          api={selectedAPI}
          history={executionHistory}
          loading={loadingHistory}
          tableStructure={tableStructure}
          loadingStructure={loadingStructure}
          onClose={() => setSelectedAPI(null)}
        />
      )}

      {showAddModal && (
        <AddAPIModal
          onClose={() => {
            setShowAddModal(false);
            setDuplicateData(null);
          }}
          onSave={handleAdd}
          initialData={duplicateData}
          isEdit={duplicateData && !duplicateData.api_name?.endsWith(' (Copy)')}
        />
      )}

      {showAPICatalogPlaybook && (
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
        onClick={() => setShowAPICatalogPlaybook(false)}
        >
          <div style={{
            width: '90%',
            maxWidth: 1000,
            maxHeight: '90vh',
            overflowY: 'auto'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <AsciiPanel title="API CATALOG PLAYBOOK">
              <div style={{ padding: 16, fontFamily: 'Consolas', fontSize: 12, lineHeight: 1.6 }}>
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                    {ascii.blockFull} OVERVIEW
                  </div>
                  <div style={{ color: asciiColors.foreground, marginLeft: 16 }}>
                    The API Catalog synchronizes data from REST API endpoints to target databases. APIs are polled at configured intervals 
                    and data is loaded using full load strategy (no incremental sync). Each API sync creates a timestamp column (_api_sync_at) 
                    to track when data was last synchronized.
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                    {ascii.blockFull} SUPPORTED TARGET ENGINES
                  </div>
                  <div style={{ color: asciiColors.foreground, marginLeft: 16 }}>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.muted }}>├─</span> <strong>PostgreSQL:</strong> Native PostgreSQL target
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.muted }}>├─</span> <strong>MariaDB:</strong> MySQL-compatible target
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.muted }}>├─</span> <strong>MSSQL:</strong> Microsoft SQL Server target
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.muted }}>├─</span> <strong>MongoDB:</strong> MongoDB document store target
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.muted }}>└─</span> <strong>Oracle:</strong> Oracle Database target
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                    {ascii.blockFull} SYNC PROCESS
                  </div>
                  <div style={{ color: asciiColors.foreground, marginLeft: 16 }}>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.muted }}>├─</span> <strong>Full Load:</strong> Each sync performs complete data replacement (TRUNCATE and INSERT)
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.muted }}>├─</span> <strong>Status Tracking:</strong> IN_PROGRESS during sync, SUCCESS/ERROR on completion
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.muted }}>├─</span> <strong>Timestamp Column:</strong> _api_sync_at added to track sync time
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.muted }}>└─</span> <strong>Error Handling:</strong> Failed syncs are logged with error messages
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                    {ascii.blockFull} HTTP METHODS
                  </div>
                  <div style={{ color: asciiColors.foreground, marginLeft: 16 }}>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.muted }}>├─</span> <strong>GET:</strong> Retrieve data from API endpoint
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.muted }}>├─</span> <strong>POST:</strong> Send data to API endpoint
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.muted }}>├─</span> <strong>PUT:</strong> Update data via API endpoint
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.muted }}>└─</span> <strong>DELETE:</strong> Delete data via API endpoint
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                    {ascii.blockFull} AUTHENTICATION TYPES
                  </div>
                  <div style={{ color: asciiColors.foreground, marginLeft: 16 }}>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.muted }}>├─</span> <strong>NONE:</strong> No authentication required
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.muted }}>├─</span> <strong>API_KEY:</strong> API key authentication via headers or query parameters
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.muted }}>├─</span> <strong>BASIC:</strong> HTTP Basic Authentication
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.muted }}>├─</span> <strong>BEARER:</strong> Bearer token authentication
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.muted }}>└─</span> <strong>OAUTH2:</strong> OAuth 2.0 authentication flow
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                    {ascii.blockFull} SYNC INTERVALS
                  </div>
                  <div style={{ color: asciiColors.foreground, marginLeft: 16 }}>
                    Configure how frequently the API should be polled for new data. Intervals are specified in seconds. 
                    Valid range: 5-3600 seconds (5 seconds to 1 hour). Common intervals: 60 (1 minute), 300 (5 minutes), 3600 (1 hour).
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
                    • Test API endpoints before enabling synchronization<br/>
                    • Use appropriate authentication methods (API_KEY, BEARER, OAUTH2)<br/>
                    • Set reasonable sync intervals to avoid rate limiting (5-3600 seconds)<br/>
                    • Monitor execution history for failed syncs<br/>
                    • Handle API rate limits and errors gracefully<br/>
                    • Review target table structures for data compatibility<br/>
                    • Use filters to organize APIs by type, engine, or status
                  </div>
                </div>

                <div style={{ marginTop: 16, textAlign: 'right' }}>
                  <AsciiButton
                    label="Close"
                    onClick={() => setShowAPICatalogPlaybook(false)}
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


interface ExecutionTimelineProps {
  api: APICatalogEntry;
  history: any[];
  loading: boolean;
  tableStructure: any;
  loadingStructure: boolean;
  onClose: () => void;
}

const ExecutionTimeline: React.FC<ExecutionTimelineProps> = ({ api, history, loading, tableStructure, loadingStructure, onClose }) => {
  const groupedExecutions = useMemo(() => {
    const executions: any[] = [];
    const processed = new Set<number>();
    const MAX_TIME_RANGE_MS = 24 * 60 * 60 * 1000;
    
    history.forEach((exec) => {
      if (processed.has(exec.id)) return;
      
      if (exec.status === 'IN_PROGRESS') {
        const inProgressTime = new Date(exec.start_time).getTime();
        
        const matchingFinal = history.find((e: any) => 
          !processed.has(e.id) &&
          (e.status === 'SUCCESS' || e.status === 'ERROR') &&
          new Date(e.start_time).getTime() > inProgressTime &&
          (new Date(e.start_time).getTime() - inProgressTime) <= MAX_TIME_RANGE_MS
        );
        
        if (matchingFinal) {
          const finalStartTime = new Date(exec.start_time);
          const finalEndTime = new Date(matchingFinal.end_time);
          const duration = Math.floor((finalEndTime.getTime() - finalStartTime.getTime()) / 1000);
          
          executions.push({
            ...matchingFinal,
            start_time: finalStartTime.toISOString(),
            end_time: finalEndTime.toISOString(),
            duration_seconds: duration > 0 ? duration : (matchingFinal.duration_seconds || 0),
          });
          processed.add(exec.id);
          processed.add(matchingFinal.id);
        } else {
          executions.push(exec);
          processed.add(exec.id);
        }
      } else if (exec.status === 'SUCCESS' || exec.status === 'ERROR') {
        const finalTime = new Date(exec.start_time).getTime();
        
        const matchingInProgress = history.find((e: any) => 
          !processed.has(e.id) &&
          e.status === 'IN_PROGRESS' &&
          new Date(e.start_time).getTime() < finalTime &&
          (finalTime - new Date(e.start_time).getTime()) <= MAX_TIME_RANGE_MS
        );
        
        if (matchingInProgress) {
          const finalStartTime = new Date(matchingInProgress.start_time);
          const finalEndTime = new Date(exec.end_time);
          const duration = Math.floor((finalEndTime.getTime() - finalStartTime.getTime()) / 1000);
          
          executions.push({
            ...exec,
            start_time: finalStartTime.toISOString(),
            end_time: finalEndTime.toISOString(),
            duration_seconds: duration > 0 ? duration : (exec.duration_seconds || 0),
          });
          processed.add(exec.id);
          processed.add(matchingInProgress.id);
        } else {
          executions.push(exec);
          processed.add(exec.id);
        }
      }
    });
    
    return executions.sort((a, b) => 
      new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
    );
  }, [history]);

  const maxDuration = Math.max(...groupedExecutions.map(h => h.duration_seconds || 0), 1);

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatDateTime = (dateStr: string) => {
    return format(new Date(dateStr), 'PPpp');
  };

  const getStatusColor = (status: string) => {
    if (status === 'SUCCESS') return asciiColors.accent;
    if (status === 'ERROR') return asciiColors.accent;
    if (status === 'IN_PROGRESS') return asciiColors.accentSoft;
    return asciiColors.muted;
  };

  const BarWithTooltip: React.FC<{ height: number; status: string; tooltipText: string }> = ({ height, status, tooltipText }) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
    const [arrowPosition, setArrowPosition] = useState<'top' | 'bottom'>('top');
    const barRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const statusColor = getStatusColor(status);
    
    const handleMouseEnter = () => {
      setShowTooltip(true);
      setTimeout(() => {
        if (barRef.current && tooltipRef.current) {
          const barRect = barRef.current.getBoundingClientRect();
          const tooltipRect = tooltipRef.current.getBoundingClientRect();
          const viewportHeight = window.innerHeight;
          const viewportWidth = window.innerWidth;
          const spaceAbove = barRect.top;
          const spaceBelow = viewportHeight - barRect.bottom;
          const tooltipHeight = tooltipRect.height || 120;
          const tooltipWidth = tooltipRect.width || 220;
          
          let top = barRect.top - tooltipHeight - 12;
          let left = barRect.left + barRect.width / 2;
          let arrowPos: 'top' | 'bottom' = 'top';
          
          if (spaceAbove < tooltipHeight + 20 && spaceBelow > spaceAbove) {
            top = barRect.bottom + 12;
            arrowPos = 'bottom';
          }
          
          if (left + tooltipWidth / 2 > viewportWidth - 10) {
            left = viewportWidth - tooltipWidth / 2 - 10;
          } else if (left - tooltipWidth / 2 < 10) {
            left = tooltipWidth / 2 + 10;
          }
          
          setTooltipStyle({
            position: 'fixed',
            top: `${top}px`,
            left: `${left}px`,
            transform: 'translateX(-50%)',
            zIndex: 10000
          });
          setArrowPosition(arrowPos);
        }
      }, 0);
    };
    
    return (
      <div
        ref={barRef}
        style={{
          flex: 1,
          minWidth: 20,
          height: `${height}%`,
          backgroundColor: statusColor,
          border: `2px solid ${statusColor}`,
          borderRadius: '2px 2px 0 0',
          position: 'relative',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          fontFamily: "Consolas",
          fontSize: 11
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => {
          setShowTooltip(false);
          setTooltipStyle({});
          setArrowPosition('top');
        }}
      >
        {showTooltip && (
          <div 
            ref={tooltipRef}
            style={{
              ...tooltipStyle,
              backgroundColor: asciiColors.foreground,
              color: asciiColors.background,
              padding: '8px 12px',
              borderRadius: 2,
              fontSize: 11,
              fontFamily: "Consolas",
              whiteSpace: 'pre-line',
              pointerEvents: 'none',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
              minWidth: 220,
              maxWidth: 300,
              textAlign: 'left'
            }}
          >
            {tooltipText}
            <div style={{
              position: 'absolute',
              [arrowPosition === 'top' ? 'top' : 'bottom']: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              borderTop: arrowPosition === 'top' ? `6px solid ${asciiColors.foreground}` : '6px solid transparent',
              borderBottom: arrowPosition === 'bottom' ? `6px solid ${asciiColors.foreground}` : '6px solid transparent',
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent'
            }} />
          </div>
        )}
      </div>
    );
  };

  return (
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
        onClick={onClose}
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
            onClose();
          }
        }}
      >
        <div 
          style={{
            background: asciiColors.background,
            borderRadius: 2,
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
            width: "90%",
            maxWidth: 1200,
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
              EXECUTION TIMELINE: {api.api_name}
            </h2>
            <AsciiButton
              label="Close"
              onClick={onClose}
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
            {loading ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '40px', 
                color: asciiColors.muted,
                fontFamily: "Consolas",
                fontSize: 12
              }}>
                {ascii.blockFull} Loading execution history...
              </div>
            ) : groupedExecutions.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '40px', 
                color: asciiColors.muted,
                fontFamily: "Consolas",
                fontSize: 12
              }}>
                <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}>
                  {ascii.blockFull}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: asciiColors.foreground }}>
                  No execution history available
                </div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  No execution history available for this API.
                </div>
              </div>
            ) : (
              <>
                <AsciiPanel title="EXECUTION DURATION TIMELINE">
                  <div style={{ 
                    position: 'relative', 
                    paddingLeft: '40px',
                    padding: "8px 0"
                  }}>
                    <div style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      fontSize: 11,
                      color: asciiColors.muted,
                      fontFamily: "Consolas",
                      padding: '8px 0',
                      paddingBottom: '28px'
                    }}>
                      <span>{formatDuration(maxDuration)}</span>
                      <span>{formatDuration(Math.floor(maxDuration / 2))}</span>
                      <span style={{ paddingBottom: '8px' }}>0s</span>
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-end',
                      gap: 8,
                      height: 200,
                      padding: '8px 0'
                    }}>
                      {groupedExecutions.slice(0, 20).reverse().map((exec) => {
                        const height = maxDuration > 0 ? (exec.duration_seconds || 0) / maxDuration * 100 : 0;
                        const tooltipText = `${exec.status}\nDuration: ${formatDuration(exec.duration_seconds || 0)}\nStart: ${formatDateTime(exec.start_time)}\nEnd: ${formatDateTime(exec.end_time)}`;
                        return (
                          <BarWithTooltip
                            key={exec.id}
                            height={height}
                            status={exec.status}
                            tooltipText={tooltipText}
                          />
                        );
                      })}
                    </div>
                  </div>
                </AsciiPanel>
                
                <div style={{ marginTop: 20 }}>
                  <MappingGraph
                    api={api}
                    tableStructure={tableStructure}
                    loading={loadingStructure}
                  />
                </div>
              </>
            )}
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
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
};

interface MappingGraphProps {
  api: APICatalogEntry;
  tableStructure: any;
  loading: boolean;
}

const MappingGraph: React.FC<MappingGraphProps> = ({ api, tableStructure, loading }) => {
  return (
    <div style={{ marginTop: 20 }}>
      <AsciiPanel title="DATA FLOW: SOURCE → TARGET">
      {loading ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px',
          color: asciiColors.muted,
          fontFamily: "Consolas",
          fontSize: 12
        }}>
          {ascii.blockFull} Loading table structure...
        </div>
      ) : !tableStructure ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px', 
          color: asciiColors.muted,
          fontFamily: "Consolas",
          fontSize: 12
        }}>
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}>
            {ascii.blockFull}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: asciiColors.foreground }}>
            Table structure not available
          </div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            The table may not exist yet or there was an error loading it.
          </div>
        </div>
      ) : (
        <div style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 24,
          justifyContent: "center",
          minHeight: 400,
          padding: "8px 0"
        }}>
          <div style={{
            flex: "0 0 300px",
            background: asciiColors.background,
            border: `2px solid ${asciiColors.accent}`,
            borderRadius: 2,
            padding: "16px",
            fontFamily: "Consolas",
            fontSize: 12
          }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingBottom: "8px",
              borderBottom: `2px solid ${asciiColors.border}`,
              marginBottom: "12px"
            }}>
              <div>
                <h3 style={{
                  fontSize: 13,
                  fontWeight: 600,
                  margin: 0,
                  color: asciiColors.accent,
                  fontFamily: "Consolas"
                }}>
                  Source: API
                </h3>
                <div style={{
                  fontSize: 11,
                  color: asciiColors.muted,
                  fontFamily: "Consolas"
                }}>
                  {api.api_type}
                </div>
              </div>
            </div>
            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              fontSize: 12
            }}>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "6px 0",
                borderBottom: `1px solid ${asciiColors.border}`
              }}>
                <span style={{ color: asciiColors.muted, fontWeight: 500, fontFamily: "Consolas" }}>
                  API Name:
                </span>
                <span style={{ 
                  color: asciiColors.foreground, 
                  wordBreak: "break-all",
                  textAlign: "right",
                  maxWidth: 180,
                  fontFamily: "Consolas"
                }}>
                  {api.api_name}
                </span>
              </div>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "6px 0",
                borderBottom: `1px solid ${asciiColors.border}`
              }}>
                <span style={{ color: asciiColors.muted, fontWeight: 500, fontFamily: "Consolas" }}>
                  Base URL:
                </span>
                <span style={{ 
                  color: asciiColors.foreground, 
                  wordBreak: "break-all",
                  textAlign: "right",
                  maxWidth: 180,
                  fontFamily: "Consolas"
                }}>
                  {api.base_url}
                </span>
              </div>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "6px 0",
                borderBottom: `1px solid ${asciiColors.border}`
              }}>
                <span style={{ color: asciiColors.muted, fontWeight: 500, fontFamily: "Consolas" }}>
                  Endpoint:
                </span>
                <span style={{ 
                  color: asciiColors.foreground, 
                  wordBreak: "break-all",
                  textAlign: "right",
                  maxWidth: 180,
                  fontFamily: "Consolas"
                }}>
                  {api.endpoint}
                </span>
              </div>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "6px 0",
                borderBottom: `1px solid ${asciiColors.border}`
              }}>
                <span style={{ color: asciiColors.muted, fontWeight: 500, fontFamily: "Consolas" }}>
                  Method:
                </span>
                <span style={{ 
                  color: asciiColors.foreground, 
                  wordBreak: "break-all",
                  textAlign: "right",
                  maxWidth: 180,
                  fontFamily: "Consolas"
                }}>
                  {api.http_method}
                </span>
              </div>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "6px 0"
              }}>
                <span style={{ color: asciiColors.muted, fontWeight: 500, fontFamily: "Consolas" }}>
                  Auth Type:
                </span>
                <span style={{ 
                  color: asciiColors.foreground, 
                  wordBreak: "break-all",
                  textAlign: "right",
                  maxWidth: 180,
                  fontFamily: "Consolas"
                }}>
                  {api.auth_type}
                </span>
              </div>
            </div>
          </div>
          
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flex: "0 0 80px",
            paddingTop: 40
          }}>
            <div style={{
              width: 60,
              height: 4,
              background: asciiColors.accent,
              position: "relative"
            }}>
              <div style={{
                position: "absolute",
                right: -8,
                top: -6,
                width: 0,
                height: 0,
                borderLeft: `12px solid ${asciiColors.accent}`,
                borderTop: "8px solid transparent",
                borderBottom: "8px solid transparent"
              }} />
            </div>
          </div>
          
          <div style={{
            flex: "0 0 350px",
            background: asciiColors.background,
            border: `2px solid ${asciiColors.accent}`,
            borderRadius: 2,
            padding: "16px",
            fontFamily: "Consolas",
            fontSize: 12,
            maxHeight: 600,
            overflowY: "auto"
          }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingBottom: "8px",
              borderBottom: `2px solid ${asciiColors.border}`,
              marginBottom: "12px"
            }}>
              <div>
                <h3 style={{
                  fontSize: 13,
                  fontWeight: 600,
                  margin: 0,
                  color: asciiColors.accent,
                  fontFamily: "Consolas"
                }}>
                  Target: {tableStructure.table}
                </h3>
                <div style={{
                  fontSize: 11,
                  color: asciiColors.muted,
                  fontFamily: "Consolas",
                  marginBottom: "8px"
                }}>
                  {tableStructure.schema}.{tableStructure.table} ({tableStructure.db_engine})
                </div>
              </div>
            </div>
            <table style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 12,
              fontFamily: "Consolas"
            }}>
              <thead style={{
                background: asciiColors.backgroundSoft,
                position: "sticky",
                top: 0,
                zIndex: 10
              }}>
                <tr style={{
                  borderBottom: `2px solid ${asciiColors.border}`
                }}>
                  <th style={{
                    padding: "8px",
                    textAlign: "left",
                    fontWeight: 600,
                    color: asciiColors.foreground,
                    fontSize: 12,
                    fontFamily: "Consolas",
                    width: 20
                  }}></th>
                  <th style={{
                    padding: "8px",
                    textAlign: "left",
                    fontWeight: 600,
                    color: asciiColors.foreground,
                    fontSize: 12,
                    fontFamily: "Consolas",
                    width: "40%"
                  }}>Name</th>
                  <th style={{
                    padding: "8px",
                    textAlign: "left",
                    fontWeight: 600,
                    color: asciiColors.foreground,
                    fontSize: 12,
                    fontFamily: "Consolas"
                  }}>Data Type</th>
                </tr>
              </thead>
              <tbody>
                {tableStructure.columns.map((col: any, index: number) => (
                  <tr 
                    key={col.name}
                    style={{
                      borderBottom: `1px solid ${asciiColors.border}`,
                      transition: "background-color 0.2s ease"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = asciiColors.backgroundSoft;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = asciiColors.background;
                    }}
                  >
                    <td style={{
                      padding: "4px 8px",
                      color: asciiColors.muted,
                      fontSize: 11,
                      fontFamily: "Consolas"
                    }}>{index + 1}</td>
                    <td style={{
                      padding: "4px 8px",
                      fontWeight: 500,
                      color: asciiColors.accent,
                      fontFamily: "Consolas"
                    }}>{col.name}</td>
                    <td style={{
                      padding: "4px 8px",
                      color: asciiColors.muted,
                      fontFamily: "Consolas",
                      fontSize: 11
                    }}>{col.type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </AsciiPanel>
    </div>
  );
};

export default APICatalog;
