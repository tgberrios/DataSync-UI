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
    </div>
  );
};

export default DataVault;
