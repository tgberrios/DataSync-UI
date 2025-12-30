import { useState, useEffect, useCallback, useRef } from 'react';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors } from '../../ui/theme/asciiTheme';
import { usePagination } from '../../hooks/usePagination';
import { useTableFilters } from '../../hooks/useTableFilters';
import { dataWarehouseApi, type DataWarehouseEntry } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import { sanitizeSearch } from '../../utils/validation';
import DataWarehouseTreeView from './DataWarehouseTreeView';
import AddDataWarehouseModal from './AddDataWarehouseModal';

const DataWarehouse = () => {
  const { setPage } = usePagination(1, 20);
  const { filters, setFilter } = useTableFilters({
    schema_type: '',
    source_db_engine: '',
    target_db_engine: '',
    active: '',
    enabled: ''
  });
  
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [allWarehouses, setAllWarehouses] = useState<DataWarehouseEntry[]>([]);
  const [loadingTree, setLoadingTree] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<DataWarehouseEntry | null>(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState<DataWarehouseEntry | null>(null);
  const isMountedRef = useRef(true);

  const fetchAllWarehouses = useCallback(async () => {
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
      
      if (filters.schema_type) params.schema_type = filters.schema_type;
      if (filters.source_db_engine) params.source_db_engine = filters.source_db_engine;
      if (filters.target_db_engine) params.target_db_engine = filters.target_db_engine;
      if (filters.active) params.active = filters.active;
      if (filters.enabled) params.enabled = filters.enabled;

      const response = await dataWarehouseApi.getWarehouses(params);
      if (isMountedRef.current) {
        setAllWarehouses(response.warehouses || []);
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
    fetchAllWarehouses();
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchAllWarehouses]);

  const handleSearch = useCallback(() => {
    setSearch(searchInput);
    setPage(1);
  }, [searchInput, setPage]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }, [handleSearch]);

  const handleDelete = useCallback(async (warehouseName: string) => {
    if (!confirm(`Are you sure you want to delete warehouse "${warehouseName}"?`)) {
      return;
    }
    try {
      await dataWarehouseApi.deleteWarehouse(warehouseName);
      fetchAllWarehouses();
    } catch (err) {
      if (isMountedRef.current) {
        setError(extractApiError(err));
      }
    }
  }, [fetchAllWarehouses]);

  const handleOpenModal = useCallback((warehouse?: DataWarehouseEntry) => {
    if (warehouse) {
      setEditingWarehouse(warehouse);
    } else {
      setEditingWarehouse(null);
    }
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingWarehouse(null);
  }, []);

  const handleSave = useCallback(() => {
    fetchAllWarehouses();
    handleCloseModal();
  }, [fetchAllWarehouses, handleCloseModal]);

  const handleToggleActive = useCallback(async (warehouseName: string, currentActive: boolean) => {
    try {
      await dataWarehouseApi.updateActive(warehouseName, !currentActive);
      fetchAllWarehouses();
    } catch (err) {
      if (isMountedRef.current) {
        setError(extractApiError(err));
      }
    }
  }, [fetchAllWarehouses]);

  const handleBuild = useCallback(async (warehouseName: string) => {
    try {
      setError(null);
      await dataWarehouseApi.buildWarehouse(warehouseName);
      fetchAllWarehouses();
      setTimeout(() => {
        fetchAllWarehouses();
      }, 2000);
    } catch (err) {
      if (isMountedRef.current) {
        setError(extractApiError(err));
      }
    }
  }, [fetchAllWarehouses]);

  const handleWarehouseClick = useCallback(async (warehouse: DataWarehouseEntry) => {
    setSelectedWarehouse(warehouse);
    setError(null);
  }, []);

  const filteredWarehouses = allWarehouses.filter(wh => {
    if (filters.schema_type && wh.schema_type !== filters.schema_type) return false;
    if (filters.source_db_engine && wh.source_db_engine !== filters.source_db_engine) return false;
    if (filters.target_db_engine && wh.target_db_engine !== filters.target_db_engine) return false;
    if (filters.active && String(wh.active) !== filters.active) return false;
    if (filters.enabled && String(wh.enabled) !== filters.enabled) return false;
    return true;
  });

  return (
    <div style={{ display: 'flex', gap: 16, height: '100%', minHeight: 'calc(100vh - 100px)' }}>
      <div style={{ flex: '0 0 400px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <AsciiPanel>
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Search warehouses..."
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: `1px solid ${asciiColors.border}`,
                  borderRadius: 2,
                  fontSize: 12,
                  fontFamily: 'Consolas',
                  backgroundColor: asciiColors.background,
                  color: asciiColors.foreground,
                  outline: 'none'
                }}
              />
              <AsciiButton label="Search" onClick={handleSearch} />
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              <select
                value={filters.schema_type}
                onChange={(e) => setFilter('schema_type', e.target.value)}
                style={{
                  flex: 1,
                  minWidth: 120,
                  padding: '6px 10px',
                  border: `1px solid ${asciiColors.border}`,
                  borderRadius: 2,
                  fontSize: 11,
                  fontFamily: 'Consolas',
                  backgroundColor: asciiColors.background,
                  color: asciiColors.foreground
                }}
              >
                <option value="">All Schemas</option>
                <option value="STAR_SCHEMA">Star Schema</option>
                <option value="SNOWFLAKE_SCHEMA">Snowflake Schema</option>
              </select>

              <select
                value={filters.source_db_engine}
                onChange={(e) => setFilter('source_db_engine', e.target.value)}
                style={{
                  flex: 1,
                  minWidth: 120,
                  padding: '6px 10px',
                  border: `1px solid ${asciiColors.border}`,
                  borderRadius: 2,
                  fontSize: 11,
                  fontFamily: 'Consolas',
                  backgroundColor: asciiColors.background,
                  color: asciiColors.foreground
                }}
              >
                <option value="">All Sources</option>
                <option value="PostgreSQL">PostgreSQL</option>
                <option value="MariaDB">MariaDB</option>
                <option value="MSSQL">MSSQL</option>
                <option value="Oracle">Oracle</option>
                <option value="MongoDB">MongoDB</option>
              </select>

              <select
                value={filters.target_db_engine}
                onChange={(e) => setFilter('target_db_engine', e.target.value)}
                style={{
                  flex: 1,
                  minWidth: 120,
                  padding: '6px 10px',
                  border: `1px solid ${asciiColors.border}`,
                  borderRadius: 2,
                  fontSize: 11,
                  fontFamily: 'Consolas',
                  backgroundColor: asciiColors.background,
                  color: asciiColors.foreground
                }}
              >
                <option value="">All Targets</option>
                <option value="PostgreSQL">PostgreSQL</option>
                <option value="Snowflake">Snowflake</option>
                <option value="BigQuery">BigQuery</option>
                <option value="Redshift">Redshift</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <AsciiButton
                label="+ New Warehouse"
                onClick={() => handleOpenModal()}
              />
            </div>
          </div>

          {error && (
            <div style={{
              padding: '12px',
              marginBottom: 12,
                backgroundColor: asciiColors.danger + '20',
                border: `1px solid ${asciiColors.danger}`,
                borderRadius: 2,
                color: asciiColors.danger,
              fontSize: 12,
              fontFamily: 'Consolas'
            }}>
              {error}
            </div>
          )}

          {loadingTree ? (
            <div style={{ padding: 20, textAlign: 'center', color: asciiColors.muted }}>
              Loading warehouses...
            </div>
          ) : (
            <DataWarehouseTreeView
              warehouses={filteredWarehouses}
              onWarehouseClick={handleWarehouseClick}
              onWarehouseEdit={handleOpenModal}
              onWarehouseBuild={handleBuild}
              onWarehouseToggleActive={handleToggleActive}
              onWarehouseDelete={handleDelete}
            />
          )}
        </AsciiPanel>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {selectedWarehouse ? (
          <>
            <AsciiPanel>
              <div style={{ marginBottom: 16 }}>
                <h2 style={{
                  margin: 0,
                  fontSize: 16,
                  fontFamily: 'Consolas',
                  color: asciiColors.foreground,
                  marginBottom: 8
                }}>
                  {selectedWarehouse.warehouse_name}
                </h2>
                {selectedWarehouse.description && (
                  <p style={{
                    margin: 0,
                    fontSize: 12,
                    color: asciiColors.muted,
                    fontFamily: 'Consolas'
                  }}>
                    {selectedWarehouse.description}
                  </p>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 11, color: asciiColors.muted, marginBottom: 4 }}>Schema Type</div>
                  <div style={{ fontSize: 12, fontFamily: 'Consolas' }}>{selectedWarehouse.schema_type}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: asciiColors.muted, marginBottom: 4 }}>Source Engine</div>
                  <div style={{ fontSize: 12, fontFamily: 'Consolas' }}>{selectedWarehouse.source_db_engine}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: asciiColors.muted, marginBottom: 4 }}>Target Engine</div>
                  <div style={{ fontSize: 12, fontFamily: 'Consolas' }}>{selectedWarehouse.target_db_engine}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: asciiColors.muted, marginBottom: 4 }}>Target Schema</div>
                  <div style={{ fontSize: 12, fontFamily: 'Consolas' }}>{selectedWarehouse.target_schema}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: asciiColors.muted, marginBottom: 4 }}>Status</div>
                  <div style={{
                    fontSize: 12,
                    fontFamily: 'Consolas',
                    color: selectedWarehouse.last_build_status === 'SUCCESS' ? asciiColors.success :
                           selectedWarehouse.last_build_status === 'ERROR' ? asciiColors.danger :
                           asciiColors.muted
                  }}>
                    {selectedWarehouse.last_build_status || 'Never built'}
                  </div>
                  {selectedWarehouse.last_build_status === 'ERROR' && selectedWarehouse.notes && (
                    <div style={{
                      marginTop: 8,
                      padding: '8px 12px',
                      backgroundColor: asciiColors.danger + '20',
                      border: `1px solid ${asciiColors.danger}`,
                      borderRadius: 2,
                      color: asciiColors.danger,
                      fontSize: 11,
                      fontFamily: 'Consolas',
                      wordBreak: 'break-word',
                    }}>
                      <strong>Error:</strong> {selectedWarehouse.notes}
                    </div>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: 11, color: asciiColors.muted, marginBottom: 4 }}>Last Build</div>
                  <div style={{ fontSize: 12, fontFamily: 'Consolas' }}>
                    {selectedWarehouse.last_build_time ? new Date(selectedWarehouse.last_build_time).toLocaleString() : 'N/A'}
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: asciiColors.muted, marginBottom: 8 }}>Dimensions: {selectedWarehouse.dimensions.length}</div>
                <div style={{ fontSize: 12, color: asciiColors.muted, marginBottom: 8 }}>Facts: {selectedWarehouse.facts.length}</div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <AsciiButton
                  label="▶ Build Now"
                  onClick={() => handleBuild(selectedWarehouse.warehouse_name)}
                />
                <AsciiButton
                  label="✎ Edit"
                  onClick={() => handleOpenModal(selectedWarehouse)}
                />
              </div>
            </AsciiPanel>

          </>
        ) : (
          <AsciiPanel>
            <div style={{ padding: 40, textAlign: 'center', color: asciiColors.muted }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
              <div style={{ fontSize: 14, fontFamily: 'Consolas', marginBottom: 8 }}>
                Select a warehouse to view details
              </div>
              <div style={{ fontSize: 12, color: asciiColors.muted }}>
                Click on a warehouse from the list to see its configuration and build history
              </div>
            </div>
          </AsciiPanel>
        )}
      </div>

      {isModalOpen && (
        <AddDataWarehouseModal
          onClose={handleCloseModal}
          onSave={handleSave}
          initialData={editingWarehouse}
        />
      )}
    </div>
  );
};

export default DataWarehouse;

