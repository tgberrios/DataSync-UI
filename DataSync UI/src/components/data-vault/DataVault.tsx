import { useState, useEffect, useCallback, useRef } from 'react';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { usePagination } from '../../hooks/usePagination';
import { useTableFilters } from '../../hooks/useTableFilters';
import { dataVaultApi, type DataVaultEntry } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import { sanitizeSearch } from '../../utils/validation';
import SkeletonLoader from '../shared/SkeletonLoader';
import DataVaultTreeView from './DataVaultTreeView';
import AddDataVaultModal from './AddDataVaultModal';

const DataVault = () => {
  const { setPage } = usePagination(1, 20);
  const { filters, setFilter } = useTableFilters({
    source_db_engine: '',
    target_db_engine: '',
    active: ''
  });
  
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [allVaults, setAllVaults] = useState<DataVaultEntry[]>([]);
  const [loadingTree, setLoadingTree] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVault, setEditingVault] = useState<DataVaultEntry | null>(null);
  const [selectedVault, setSelectedVault] = useState<DataVaultEntry | null>(null);
  const [showDataVaultPlaybook, setShowDataVaultPlaybook] = useState(false);
  const isMountedRef = useRef(true);

  const fetchAllVaults = useCallback(async () => {
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

      const response = await dataVaultApi.getVaults(params);
      
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minLoadingTime - elapsed);
      await new Promise(resolve => setTimeout(resolve, remaining));
      
      if (isMountedRef.current) {
        setAllVaults(response.data || []);
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
  }, [search, filters]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchAllVaults();
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchAllVaults]);

  const handleSearch = useCallback(() => {
    setSearch(searchInput);
    setPage(1);
  }, [searchInput, setPage]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }, [handleSearch]);

  const handleDelete = useCallback(async (vaultName: string) => {
    if (!confirm(`Are you sure you want to delete vault "${vaultName}"?`)) {
      return;
    }
    try {
      await dataVaultApi.deleteVault(vaultName);
      fetchAllVaults();
    } catch (err) {
      if (isMountedRef.current) {
        setError(extractApiError(err));
      }
    }
  }, [fetchAllVaults]);

  const handleOpenModal = useCallback((vault?: DataVaultEntry) => {
    if (vault) {
      setEditingVault(vault);
    } else {
      setEditingVault(null);
    }
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingVault(null);
  }, []);

  const handleSave = useCallback(() => {
    fetchAllVaults();
    handleCloseModal();
  }, [fetchAllVaults, handleCloseModal]);

  const handleBuild = useCallback(async (vaultName: string) => {
    try {
      setError(null);
      await dataVaultApi.buildVault(vaultName);
      fetchAllVaults();
      setTimeout(() => {
        fetchAllVaults();
      }, 2000);
    } catch (err) {
      if (isMountedRef.current) {
        setError(extractApiError(err));
      }
    }
  }, [fetchAllVaults]);

  const handleVaultClick = useCallback(async (vault: DataVaultEntry) => {
    setSelectedVault(vault);
    setError(null);
  }, []);

  const filteredVaults = allVaults.filter(v => {
    if (filters.source_db_engine && v.source_db_engine !== filters.source_db_engine) return false;
    if (filters.target_db_engine && v.target_db_engine !== filters.target_db_engine) return false;
    if (filters.active && String(v.active) !== filters.active) return false;
    return true;
  });

  if (loadingTree && allVaults.length === 0) {
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
          DATA VAULT 2.0
        </h1>
        <AsciiButton
          label="Data Vault 2.0 Playbook"
          onClick={() => setShowDataVaultPlaybook(true)}
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
            placeholder="Search by vault name, schema, or target..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyPress={handleKeyPress}
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
              onClick={() => {
                setSearchInput('');
                setSearch('');
                setPage(1);
              }}
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
              label="Add Vault"
              onClick={() => handleOpenModal()}
              variant="primary"
            />
            
            <select
              value={filters.source_db_engine}
              onChange={(e) => setFilter('source_db_engine', e.target.value)}
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
            </select>

            <select
              value={filters.target_db_engine}
              onChange={(e) => setFilter('target_db_engine', e.target.value)}
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
              <option value="Snowflake">Snowflake</option>
              <option value="BigQuery">BigQuery</option>
              <option value="Redshift">Redshift</option>
            </select>

            <select
              value={filters.active}
              onChange={(e) => setFilter('active', e.target.value)}
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
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </AsciiPanel>
      </div>

      <div style={{ marginTop: 20, display: "flex", gap: 20 }}>
        <div style={{ flex: 1 }}>
          <AsciiPanel title="VAULTS" style={{ minHeight: 400 }}>
            {loadingTree ? (
              <div style={{
                padding: "20px",
                textAlign: "center",
                color: asciiColors.muted,
                fontSize: 12
              }}>
                Loading vaults...
              </div>
            ) : filteredVaults.length === 0 ? (
              <div style={{
                padding: "20px",
                textAlign: "center",
                color: asciiColors.muted,
                fontSize: 12
              }}>
                No vaults found
              </div>
            ) : (
              <DataVaultTreeView
                vaults={filteredVaults}
                onVaultClick={handleVaultClick}
                onEdit={handleOpenModal}
                onDelete={handleDelete}
                onBuild={handleBuild}
                selectedVault={selectedVault}
              />
            )}
          </AsciiPanel>
        </div>

        {selectedVault && (
          <div style={{ flex: 1 }}>
            <AsciiPanel title={`VAULT: ${selectedVault.vault_name}`}>
              <div style={{
                padding: "12px",
                fontSize: 11,
                fontFamily: "Consolas",
                lineHeight: 1.6,
                color: asciiColors.foreground
              }}>
                <div style={{ marginBottom: 12 }}>
                  <strong style={{ color: asciiColors.accent }}>Description:</strong> {selectedVault.description || 'N/A'}
                </div>
                <div style={{ marginBottom: 12 }}>
                  <strong style={{ color: asciiColors.accent }}>Source Engine:</strong> {selectedVault.source_db_engine}
                </div>
                <div style={{ marginBottom: 12 }}>
                  <strong style={{ color: asciiColors.accent }}>Target Engine:</strong> {selectedVault.target_db_engine}
                </div>
                <div style={{ marginBottom: 12 }}>
                  <strong style={{ color: asciiColors.accent }}>Target Schema:</strong> {selectedVault.target_schema}
                </div>
                <div style={{ marginBottom: 12 }}>
                  <strong style={{ color: asciiColors.accent }}>Hubs:</strong> {selectedVault.hubs?.length || 0}
                </div>
                <div style={{ marginBottom: 12 }}>
                  <strong style={{ color: asciiColors.accent }}>Links:</strong> {selectedVault.links?.length || 0}
                </div>
                <div style={{ marginBottom: 12 }}>
                  <strong style={{ color: asciiColors.accent }}>Satellites:</strong> {selectedVault.satellites?.length || 0}
                </div>
                <div style={{ marginBottom: 12 }}>
                  <strong style={{ color: asciiColors.accent }}>Point-in-Time Tables:</strong> {selectedVault.point_in_time_tables?.length || 0}
                </div>
                <div style={{ marginBottom: 12 }}>
                  <strong style={{ color: asciiColors.accent }}>Bridge Tables:</strong> {selectedVault.bridge_tables?.length || 0}
                </div>
                <div style={{ marginBottom: 12 }}>
                  <strong style={{ color: asciiColors.accent }}>Status:</strong>{' '}
                  <span style={{
                    color: selectedVault.active ? asciiColors.success : asciiColors.danger,
                    fontWeight: 600
                  }}>
                    {selectedVault.active ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                  {selectedVault.last_build_status && (
                    <>
                      {' | '}
                      <strong style={{ color: asciiColors.accent }}>Last Build:</strong>{' '}
                      <span style={{
                        color: selectedVault.last_build_status === 'SUCCESS' ? asciiColors.success : asciiColors.danger,
                        fontWeight: 600
                      }}>
                        {selectedVault.last_build_status}
                      </span>
                    </>
                  )}
                </div>
                {selectedVault.last_build_time && (
                  <div style={{ marginBottom: 12 }}>
                    <strong style={{ color: asciiColors.accent }}>Last Build Time:</strong> {new Date(selectedVault.last_build_time).toLocaleString()}
                  </div>
                )}
                <div style={{ marginTop: 20, display: "flex", gap: 8 }}>
                  <AsciiButton
                    label="Edit"
                    onClick={() => handleOpenModal(selectedVault)}
                    variant="primary"
                  />
                  <AsciiButton
                    label="Build"
                    onClick={() => handleBuild(selectedVault.vault_name)}
                    variant="primary"
                  />
                </div>
              </div>
            </AsciiPanel>
          </div>
        )}
      </div>

      {isModalOpen && (
        <AddDataVaultModal
          vault={editingVault}
          onClose={handleCloseModal}
          onSave={handleSave}
        />
      )}

      {showDataVaultPlaybook && (
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
        onClick={() => setShowDataVaultPlaybook(false)}
        >
          <div style={{
            width: '90%',
            maxWidth: 1000,
            maxHeight: '90vh',
            overflowY: 'auto'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <AsciiPanel title="DATA VAULT 2.0 PLAYBOOK">
              <div style={{ padding: 16, fontFamily: 'Consolas', fontSize: 12, lineHeight: 1.6 }}>
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                    {ascii.blockFull} OVERVIEW
                  </div>
                  <div style={{ color: asciiColors.foreground, marginLeft: 16 }}>
                    Data Vault 2.0 is a data modeling methodology designed for building scalable, flexible, and auditable data warehouses. 
                    It separates business keys (Hubs), relationships (Links), and descriptive attributes (Satellites) into distinct tables, 
                    enabling parallel loading, historical tracking, and easy schema evolution without impacting existing data.
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                    {ascii.blockFull} CORE COMPONENTS
                  </div>
                  <div style={{ color: asciiColors.foreground, marginLeft: 16 }}>
                    <div style={{ marginBottom: 12, padding: '12px', backgroundColor: asciiColors.backgroundSoft, borderRadius: 2, border: `1px solid ${asciiColors.border}` }}>
                      <div style={{ fontWeight: 600, color: asciiColors.accent, marginBottom: 6, fontSize: 11 }}>HUBS (Business Entities)</div>
                      <div style={{ fontSize: 11, lineHeight: 1.5 }}>
                        • <strong>Purpose:</strong> Store unique business keys that identify core business entities<br/>
                        • <strong>Structure:</strong> hub_key (hash of business keys), business_keys[], load_date, record_source<br/>
                        • <strong>Example:</strong> Customer Hub with business_key = customer_id<br/>
                        • <strong>Key Feature:</strong> One row per unique business key, regardless of how many times it appears in source
                      </div>
                    </div>
                    <div style={{ marginBottom: 12, padding: '12px', backgroundColor: asciiColors.backgroundSoft, borderRadius: 2, border: `1px solid ${asciiColors.border}` }}>
                      <div style={{ fontWeight: 600, color: asciiColors.accent, marginBottom: 6, fontSize: 11 }}>LINKS (Relationships)</div>
                      <div style={{ fontSize: 11, lineHeight: 1.5 }}>
                        • <strong>Purpose:</strong> Represent many-to-many relationships between hubs<br/>
                        • <strong>Structure:</strong> link_key (hash), hub_references[], load_date, record_source<br/>
                        • <strong>Example:</strong> Order-Product Link connecting Customer Hub and Product Hub<br/>
                        • <strong>Key Feature:</strong> Enables flexible relationship modeling without denormalization
                      </div>
                    </div>
                    <div style={{ marginBottom: 12, padding: '12px', backgroundColor: asciiColors.backgroundSoft, borderRadius: 2, border: `1px solid ${asciiColors.border}` }}>
                      <div style={{ fontWeight: 600, color: asciiColors.accent, marginBottom: 6, fontSize: 11 }}>SATELLITES (Descriptive Attributes)</div>
                      <div style={{ fontSize: 11, lineHeight: 1.5 }}>
                        • <strong>Purpose:</strong> Store descriptive attributes and historical changes for hubs or links<br/>
                        • <strong>Structure:</strong> parent_key (hub_key or link_key), descriptive_attributes[], load_date, load_end_date (if historized), record_source<br/>
                        • <strong>Example:</strong> Customer Satellite with name, email, address, phone (changes tracked over time)<br/>
                        • <strong>Key Feature:</strong> Full history preservation - every change creates a new row with load_date
                      </div>
                    </div>
                    <div style={{ marginBottom: 12, padding: '12px', backgroundColor: asciiColors.backgroundSoft, borderRadius: 2, border: `1px solid ${asciiColors.border}` }}>
                      <div style={{ fontWeight: 600, color: asciiColors.success, marginBottom: 6, fontSize: 11 }}>POINT-IN-TIME (PIT) TABLES</div>
                      <div style={{ fontSize: 11, lineHeight: 1.5 }}>
                        • <strong>Purpose:</strong> Provide efficient temporal snapshots for querying historical data at specific points in time<br/>
                        • <strong>Structure:</strong> hub_key, snapshot_date, satellite_load_dates[]<br/>
                        • <strong>Example:</strong> Customer PIT showing which satellite version was active on each date<br/>
                        • <strong>Key Feature:</strong> Pre-calculated snapshots eliminate complex temporal joins in queries
                      </div>
                    </div>
                    <div style={{ marginBottom: 12, padding: '12px', backgroundColor: asciiColors.backgroundSoft, borderRadius: 2, border: `1px solid ${asciiColors.border}` }}>
                      <div style={{ fontWeight: 600, color: asciiColors.success, marginBottom: 6, fontSize: 11 }}>BRIDGE TABLES</div>
                      <div style={{ fontSize: 11, lineHeight: 1.5 }}>
                        • <strong>Purpose:</strong> Optimize queries by pre-joining hubs with multiple links<br/>
                        • <strong>Structure:</strong> hub_key, snapshot_date, link_keys[]<br/>
                        • <strong>Example:</strong> Customer Bridge connecting Customer Hub to Order Link, Payment Link, etc.<br/>
                        • <strong>Key Feature:</strong> Reduces join complexity for analytical queries spanning multiple relationships
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                    {ascii.blockFull} BUILD PROCESS
                  </div>
                  <div style={{ color: asciiColors.foreground, marginLeft: 16 }}>
                    <div style={{ marginBottom: 16, padding: '12px', backgroundColor: asciiColors.backgroundSoft, borderRadius: 2, border: `1px solid ${asciiColors.border}` }}>
                      <div style={{ fontWeight: 600, color: asciiColors.muted, marginBottom: 8, fontSize: 11 }}>1. BUILD HUBS</div>
                      <div style={{ fontSize: 11, lineHeight: 1.6, marginLeft: 8 }}>
                        <div style={{ marginBottom: 4 }}><span style={{ color: asciiColors.muted }}>└─</span> Execute <code style={{ color: asciiColors.accent }}>source_query</code> from source database</div>
                        <div style={{ marginBottom: 4 }}><span style={{ color: asciiColors.muted }}>└─</span> Extract <code style={{ color: asciiColors.accent }}>business_keys</code> from each row</div>
                        <div style={{ marginBottom: 4 }}><span style={{ color: asciiColors.muted }}>└─</span> Generate <code style={{ color: asciiColors.accent }}>hub_key</code> (hash of business keys)</div>
                        <div style={{ marginBottom: 4 }}><span style={{ color: asciiColors.muted }}>└─</span> Insert into hub table: <code style={{ color: asciiColors.accent }}>{`{target_schema}.{hub_table}`}</code></div>
                        <div><span style={{ color: asciiColors.muted }}>└─</span> Only new business keys are inserted (no updates)</div>
                      </div>
                    </div>

                    <div style={{ marginBottom: 16, padding: '12px', backgroundColor: asciiColors.backgroundSoft, borderRadius: 2, border: `1px solid ${asciiColors.border}` }}>
                      <div style={{ fontWeight: 600, color: asciiColors.accent, marginBottom: 8, fontSize: 11 }}>2. BUILD LINKS</div>
                      <div style={{ fontSize: 11, lineHeight: 1.6, marginLeft: 8 }}>
                        <div style={{ marginBottom: 4 }}><span style={{ color: asciiColors.muted }}>└─</span> Execute <code style={{ color: asciiColors.accent }}>source_query</code> to get relationship data</div>
                        <div style={{ marginBottom: 4 }}><span style={{ color: asciiColors.muted }}>└─</span> Resolve <code style={{ color: asciiColors.accent }}>hub_references</code> to get hub_keys from parent hubs</div>
                        <div style={{ marginBottom: 4 }}><span style={{ color: asciiColors.muted }}>└─</span> Generate <code style={{ color: asciiColors.accent }}>link_key</code> (hash of referenced hub_keys)</div>
                        <div style={{ marginBottom: 4 }}><span style={{ color: asciiColors.muted }}>└─</span> Insert into link table: <code style={{ color: asciiColors.accent }}>{`{target_schema}.{link_table}`}</code></div>
                        <div><span style={{ color: asciiColors.muted }}>└─</span> Links are append-only (new relationships create new rows)</div>
                      </div>
                    </div>

                    <div style={{ marginBottom: 16, padding: '12px', backgroundColor: asciiColors.backgroundSoft, borderRadius: 2, border: `1px solid ${asciiColors.border}` }}>
                      <div style={{ fontWeight: 600, color: asciiColors.accent, marginBottom: 8, fontSize: 11 }}>3. BUILD SATELLITES</div>
                      <div style={{ fontSize: 11, lineHeight: 1.6, marginLeft: 8 }}>
                        <div style={{ marginBottom: 4 }}><span style={{ color: asciiColors.muted }}>└─</span> Execute <code style={{ color: asciiColors.accent }}>source_query</code> to get descriptive attributes</div>
                        <div style={{ marginBottom: 4 }}><span style={{ color: asciiColors.muted }}>└─</span> Resolve <code style={{ color: asciiColors.accent }}>parent_hub_name</code> or <code style={{ color: asciiColors.accent }}>parent_link_name</code> to get parent_key</div>
                        <div style={{ marginBottom: 4 }}><span style={{ color: asciiColors.muted }}>└─</span> Extract <code style={{ color: asciiColors.accent }}>descriptive_attributes</code> from source</div>
                        <div style={{ marginBottom: 4 }}><span style={{ color: asciiColors.muted }}>└─</span> If <code style={{ color: asciiColors.accent }}>is_historized = true</code>: Set load_end_date on previous row, insert new row</div>
                        <div style={{ marginBottom: 4 }}><span style={{ color: asciiColors.muted }}>└─</span> If <code style={{ color: asciiColors.accent }}>is_historized = false</code>: Update existing row or insert new</div>
                        <div><span style={{ color: asciiColors.muted }}>└─</span> Insert into satellite table: <code style={{ color: asciiColors.accent }}>{`{target_schema}.{satellite_table}`}</code></div>
                      </div>
                    </div>

                    <div style={{ marginBottom: 16, padding: '12px', backgroundColor: asciiColors.backgroundSoft, borderRadius: 2, border: `1px solid ${asciiColors.border}` }}>
                      <div style={{ fontWeight: 600, color: asciiColors.success, marginBottom: 8, fontSize: 11 }}>4. BUILD POINT-IN-TIME TABLES</div>
                      <div style={{ fontSize: 11, lineHeight: 1.6, marginLeft: 8 }}>
                        <div style={{ marginBottom: 4 }}><span style={{ color: asciiColors.muted }}>└─</span> Query all hub_keys from parent <code style={{ color: asciiColors.accent }}>hub_name</code></div>
                        <div style={{ marginBottom: 4 }}><span style={{ color: asciiColors.muted }}>└─</span> For each hub_key, query referenced <code style={{ color: asciiColors.accent }}>satellite_names</code> to get load_dates</div>
                        <div style={{ marginBottom: 4 }}><span style={{ color: asciiColors.muted }}>└─</span> Generate snapshot rows with <code style={{ color: asciiColors.accent }}>snapshot_date</code> and satellite load_dates</div>
                        <div><span style={{ color: asciiColors.muted }}>└─</span> Insert into PIT table: <code style={{ color: asciiColors.accent }}>{`{target_schema}.{pit_table}`}</code></div>
                      </div>
                    </div>

                    <div style={{ marginBottom: 16, padding: '12px', backgroundColor: asciiColors.backgroundSoft, borderRadius: 2, border: `1px solid ${asciiColors.border}` }}>
                      <div style={{ fontWeight: 600, color: asciiColors.success, marginBottom: 8, fontSize: 11 }}>5. BUILD BRIDGE TABLES</div>
                      <div style={{ fontSize: 11, lineHeight: 1.6, marginLeft: 8 }}>
                        <div style={{ marginBottom: 4 }}><span style={{ color: asciiColors.muted }}>└─</span> Query all hub_keys from parent <code style={{ color: asciiColors.accent }}>hub_name</code></div>
                        <div style={{ marginBottom: 4 }}><span style={{ color: asciiColors.muted }}>└─</span> For each hub_key, query referenced <code style={{ color: asciiColors.accent }}>link_names</code> to get link_keys</div>
                        <div style={{ marginBottom: 4 }}><span style={{ color: asciiColors.muted }}>└─</span> Generate snapshot rows with <code style={{ color: asciiColors.accent }}>snapshot_date</code> and link_keys</div>
                        <div><span style={{ color: asciiColors.muted }}>└─</span> Insert into bridge table: <code style={{ color: asciiColors.accent }}>{`{target_schema}.{bridge_table}`}</code></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                    {ascii.blockFull} KEY FEATURES
                  </div>
                  <div style={{ color: asciiColors.foreground, marginLeft: 16 }}>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.success }}>{ascii.blockFull}</span> <strong>Parallel Loading:</strong> Hubs, Links, and Satellites can be loaded independently and in parallel
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.success }}>{ascii.blockFull}</span> <strong>Historical Tracking:</strong> Satellites preserve complete history with load_date and load_end_date
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.success }}>{ascii.blockFull}</span> <strong>Schema Evolution:</strong> Add new satellites without modifying existing hubs or links
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.success }}>{ascii.blockFull}</span> <strong>Audit Trail:</strong> Every row includes load_date and record_source for full traceability
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.success }}>{ascii.blockFull}</span> <strong>Hash Keys:</strong> Business keys are hashed to create surrogate keys (hub_key, link_key) for performance
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.success }}>{ascii.blockFull}</span> <strong>No Updates:</strong> Hubs and Links are append-only; only Satellites can be updated (if not historized)
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
                  <div style={{ fontSize: 11, color: asciiColors.foreground, lineHeight: 1.6 }}>
                    • Start with Hubs - identify core business entities and their business keys<br/>
                    • Use Links for many-to-many relationships between hubs<br/>
                    • Create separate Satellites for different rate-of-change attributes (fast vs. slow changing)<br/>
                    • Enable historization (is_historized = true) for Satellites that track changes over time<br/>
                    • Use PIT tables to optimize queries that need historical snapshots<br/>
                    • Use Bridge tables to pre-join hubs with multiple links for analytical queries<br/>
                    • Keep business keys consistent across all source systems<br/>
                    • Use descriptive names for hubs, links, and satellites that reflect business terminology<br/>
                    • Monitor build status and last_build_time to ensure data freshness
                  </div>
                </div>

                <div style={{ marginTop: 16, textAlign: 'right' }}>
                  <AsciiButton
                    label="Close"
                    onClick={() => setShowDataVaultPlaybook(false)}
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

export default DataVault;
