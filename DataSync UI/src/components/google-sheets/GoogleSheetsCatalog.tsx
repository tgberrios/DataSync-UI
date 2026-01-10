import { useState, useEffect, useCallback, useRef } from 'react';
import AddGoogleSheetsModal from './AddGoogleSheetsModal';
import GoogleSheetsCatalogTreeView from './GoogleSheetsCatalogTreeView';
import { ExecutionTimeline } from '../shared/ExecutionTimeline';
import { MappingGraph } from '../shared/MappingGraph';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
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
  const [selectedSheet, setSelectedSheet] = useState<GoogleSheetsCatalogEntry | null>(null);
  const [executionHistory, setExecutionHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [tableStructure, setTableStructure] = useState<any>(null);
  const [loadingStructure, setLoadingStructure] = useState(false);
  const [showGoogleSheetsPlaybook, setShowGoogleSheetsPlaybook] = useState(false);
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


  const handleDuplicate = useCallback((entry: GoogleSheetsCatalogEntry) => {
    setDuplicateData(entry);
    setShowAddModal(true);
  }, []);

  const handleSheetClick = useCallback(async (entry: GoogleSheetsCatalogEntry) => {
    setSelectedSheet(entry);
    setLoadingHistory(true);
    setLoadingStructure(true);
    
    try {
      const [history, structure] = await Promise.all([
        googleSheetsCatalogApi.getHistory(entry.sheet_name),
        googleSheetsCatalogApi.getTableStructure(entry.sheet_name).catch(() => null)
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
      <div style={{ padding: "20px", fontFamily: "Consolas", fontSize: 12 }}>
        <h1 style={{
          fontSize: 14,
          fontWeight: 600,
          margin: "0 0 20px 0",
          color: asciiColors.foreground,
          textTransform: "uppercase",
          fontFamily: "Consolas"
        }}>
          <span style={{ color: asciiColors.accent, marginRight: 8 }}>{ascii.blockFull}</span>
          GOOGLE SHEETS CATALOG
        </h1>
        <AsciiPanel title="LOADING">
          <div style={{
            padding: "40px",
            textAlign: "center",
            fontSize: 12,
            fontFamily: "Consolas",
            color: asciiColors.muted
          }}>
            {ascii.blockFull} Loading Google Sheets Catalog...
          </div>
        </AsciiPanel>
      </div>
    );
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
          GOOGLE SHEETS CATALOG
        </h1>
        <AsciiButton
          label="Google Sheets Info"
          onClick={() => setShowGoogleSheetsPlaybook(true)}
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
            placeholder="Search by sheet name, spreadsheet ID, or target..."
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
              label="Add Google Sheet"
              onClick={() => setShowAddModal(true)}
              variant="primary"
            />

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
          <GoogleSheetsCatalogTreeView 
            entries={allEntries}
            onEntryClick={(entry) => handleSheetClick(entry)}
            onDuplicate={handleDuplicate}
          />
        </div>
      )}

      {selectedSheet && (
        <ExecutionTimeline
          title={`Execution Timeline: ${selectedSheet.sheet_name}`}
          history={executionHistory}
          loading={loadingHistory}
          tableStructure={tableStructure}
          loadingStructure={loadingStructure}
          onClose={() => {
            setSelectedSheet(null);
            setExecutionHistory([]);
            setTableStructure(null);
          }}
          renderMappingGraph={(tableStructure: any, loadingStructure: boolean) => (
            <MappingGraph
              tableStructure={tableStructure}
              loading={loadingStructure}
              sourceTitle="Source: Google Sheets"
              sourceType="Google Sheets"
              sourceInfo={[
                { label: 'Sheet Name', value: selectedSheet.sheet_name },
                { label: 'Spreadsheet ID', value: selectedSheet.spreadsheet_id },
                { label: 'Range', value: selectedSheet.range || 'Default' },
                { label: 'Auth Type', value: selectedSheet.api_key ? 'API Key' : selectedSheet.access_token ? 'OAuth' : 'None' },
              ]}
            />
          )}
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

      {showGoogleSheetsPlaybook && (
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
        onClick={() => setShowGoogleSheetsPlaybook(false)}
        >
          <div style={{
            width: '90%',
            maxWidth: 1000,
            maxHeight: '90vh',
            overflowY: 'auto'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <AsciiPanel title="GOOGLE SHEETS CATALOG PLAYBOOK">
              <div style={{ padding: 16, fontFamily: 'Consolas', fontSize: 12, lineHeight: 1.6 }}>
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                    {ascii.blockFull} OVERVIEW
                  </div>
                  <div style={{ color: asciiColors.foreground, marginLeft: 16 }}>
                    The Google Sheets Catalog synchronizes data from Google Sheets spreadsheets to target databases. Sheets are processed 
                    using full load strategy (no incremental sync). Each sync performs complete data replacement (TRUNCATE and INSERT) 
                    to ensure data consistency.
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

                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                    {ascii.blockFull} AUTHENTICATION
                  </div>
                  <div style={{ color: asciiColors.foreground, marginLeft: 16 }}>
                    To connect Google Sheets, you need to authenticate with Google using OAuth 2.0. The system will guide you 
                    through the authentication process and securely store your credentials for automatic synchronization.
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
                    • Ensure Google Sheets have consistent structure and formatting<br/>
                    • Use named ranges for better data organization<br/>
                    • Monitor execution history for sync errors<br/>
                    • Keep Google Sheets credentials secure and up-to-date<br/>
                    • Each sync performs full load (TRUNCATE and INSERT) - no incremental updates<br/>
                    • Use column mapping to handle schema differences<br/>
                    • Test with small sheets before syncing large datasets
                  </div>
                </div>

                <div style={{ marginTop: 16, textAlign: 'right' }}>
                  <AsciiButton
                    label="Close"
                    onClick={() => setShowGoogleSheetsPlaybook(false)}
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

export default GoogleSheetsCatalog;

