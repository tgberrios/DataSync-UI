import { useState, useEffect, useCallback, useRef } from 'react';
import AddCSVModal from './AddCSVModal';
import CSVCatalogTreeView from './CSVCatalogTreeView';
import { ExecutionTimeline } from '../shared/ExecutionTimeline';
import { MappingGraph } from '../shared/MappingGraph';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { usePagination } from '../../hooks/usePagination';
import { useTableFilters } from '../../hooks/useTableFilters';
import { csvCatalogApi } from '../../services/api';
import type { CSVCatalogEntry } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import { sanitizeSearch } from '../../utils/validation';
import SkeletonLoader from '../shared/SkeletonLoader';

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
  const [loadingTree, setLoadingTree] = useState(true);
  const [selectedCSV, setSelectedCSV] = useState<CSVCatalogEntry | null>(null);
  const [executionHistory, setExecutionHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [tableStructure, setTableStructure] = useState<any>(null);
  const [loadingStructure, setLoadingStructure] = useState(false);
  const [showCSVCatalogPlaybook, setShowCSVCatalogPlaybook] = useState(false);
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
      
      if (filters.source_type) params.source_type = filters.source_type;
      if (filters.target_db_engine) params.target_db_engine = filters.target_db_engine;
      if (filters.status) params.status = filters.status;
      if (filters.active) params.active = filters.active;
      
      const response = await csvCatalogApi.getCSVs(params);
      
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
  }, [filters.source_type, filters.target_db_engine, filters.status, filters.active, search]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchAllEntries();
    // Auto-refresh disabled - user can manually refresh if needed
    // const interval = setInterval(() => {
    //   if (isMountedRef.current && !showAddModal) {
    //     fetchAllEntries();
    //   }
    // }, 30000);
    return () => {
      isMountedRef.current = false;
      // clearInterval(interval);
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
    }, isEdit: boolean = false, originalCsvName?: string) => {
      try {
        setError(null);
        if (isEdit && originalCsvName) {
          const { csv_name, ...updateData } = newEntry;
          const oldEntry = allEntries.find(e => e.csv_name === originalCsvName);
          await csvCatalogApi.updateCSV(originalCsvName, updateData);
          await fetchAllEntries();
          setShowAddModal(false);
          setDuplicateData(null);
          
          let message = `CSV "${originalCsvName}" updated successfully.`;
          
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
          await csvCatalogApi.createCSV(newEntry);
          await fetchAllEntries();
          setShowAddModal(false);
          setDuplicateData(null);
          alert(`CSV "${newEntry.csv_name}" added successfully.`);
        }
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
    [fetchAllEntries, allEntries]
  );

  const handleEdit = useCallback((entry: CSVCatalogEntry) => {
    setDuplicateData(entry);
    setShowAddModal(true);
  }, []);

  const handleDelete = useCallback(
    async (entry: CSVCatalogEntry) => {
      const confirmMessage = `Are you sure you want to delete CSV "${entry.csv_name}"?\n\n` +
        `This will delete the CSV from the catalog.\n\n` +
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
        await csvCatalogApi.deleteCSV(entry.csv_name);
        await fetchAllEntries();
        if (selectedCSV?.csv_name === entry.csv_name) {
          setSelectedCSV(null);
        }
        
        const reminderMessage = `CSV "${entry.csv_name}" deleted successfully.\n\n` +
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
    [fetchAllEntries, selectedCSV]
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
          CSV CATALOG
        </h1>
        <AsciiButton
          label="CSV Catalog Info"
          onClick={() => setShowCSVCatalogPlaybook(true)}
          variant="ghost"
        />
      </div>
      
      {error && (
        <div style={{ marginBottom: 20 }}>
          <AsciiPanel title="ERROR">
            <div style={{
              padding: "12px",
              color: asciiColors.foreground,
              fontSize: 12,
              fontFamily: "Consolas",
              border: `2px solid ${asciiColors.foreground}`
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
            placeholder="Search by CSV name, source path, or target..."
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
          <AsciiButton
            label="Add CSV"
            onClick={() => setShowAddModal(true)}
            variant="primary"
          />
          
          <select
            value={filters.source_type as string}
            onChange={(e) => handleFilterChange('source_type', e.target.value)}
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
            <option value="">All Source Types</option>
            <option value="FILEPATH">File Path</option>
            <option value="URL">URL</option>
            <option value="ENDPOINT">Endpoint</option>
            <option value="UPLOADED_FILE">Uploaded File</option>
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
          <CSVCatalogTreeView 
            entries={allEntries}
            onEntryClick={(entry: CSVCatalogEntry) => handleCSVClick(entry)}
            onDuplicate={handleDuplicate}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>
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
          onSave={(entry, isEdit, originalCsvName) => handleAdd(entry, isEdit, originalCsvName)}
          initialData={duplicateData}
        />
      )}

      {showCSVCatalogPlaybook && (
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
        onClick={() => setShowCSVCatalogPlaybook(false)}
        >
          <div style={{
            width: '90%',
            maxWidth: 1000,
            maxHeight: '90vh',
            overflowY: 'auto'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <AsciiPanel title="CSV CATALOG PLAYBOOK">
              <div style={{ padding: 16, fontFamily: 'Consolas', fontSize: 12, lineHeight: 1.6 }}>
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                    {ascii.blockFull} OVERVIEW
                  </div>
                  <div style={{ color: asciiColors.foreground, marginLeft: 16 }}>
                    The CSV Catalog synchronizes data from CSV files to target databases. CSVs are processed using full load strategy 
                    (no incremental sync). Each CSV sync performs complete data replacement (TRUNCATE and INSERT) to ensure data consistency.
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                    {ascii.blockFull} SOURCE TYPES
                  </div>
                  <div style={{ color: asciiColors.foreground, marginLeft: 16 }}>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.muted }}>├─</span> <strong>LOCAL:</strong> CSV files stored on the local file system
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.muted }}>├─</span> <strong>S3:</strong> CSV files stored in Amazon S3 buckets
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.muted }}>├─</span> <strong>GCS:</strong> CSV files stored in Google Cloud Storage
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.muted }}>└─</span> <strong>AZURE:</strong> CSV files stored in Azure Blob Storage
                    </div>
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
                      <span style={{ color: asciiColors.muted }}>├─</span> <strong>Data Transformation:</strong> Values are cleaned and normalized for target database compatibility
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.muted }}>└─</span> <strong>Error Handling:</strong> Failed syncs are logged with error messages
                    </div>
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
                    • Ensure CSV files have consistent structure and encoding (UTF-8 recommended)<br/>
                    • Use column mapping to handle differences between CSV and target schema<br/>
                    • Monitor execution history for import errors and data quality issues<br/>
                    • Test with small files before processing large datasets<br/>
                    • Each sync performs full load (TRUNCATE and INSERT) - no incremental updates<br/>
                    • Use filters to organize CSVs by source type, engine, or status<br/>
                    • Review target table structures to ensure data compatibility
                  </div>
                </div>

                <div style={{ marginTop: 16, textAlign: 'right' }}>
                  <AsciiButton
                    label="Close"
                    onClick={() => setShowCSVCatalogPlaybook(false)}
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

export default CSVCatalog;

