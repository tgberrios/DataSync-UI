import { useState, useEffect, useCallback, useRef } from 'react';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { usePagination } from '../../hooks/usePagination';
import { useTableFilters } from '../../hooks/useTableFilters';
import { dataWarehouseApi, type DataWarehouseEntry } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import { sanitizeSearch } from '../../utils/validation';
import DataWarehouseTreeView from './DataWarehouseTreeView';
import AddDataWarehouseModal from './AddDataWarehouseModal';
import CleanupLayersModal from './CleanupLayersModal';

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
  const [showDataWarehousePlaybook, setShowDataWarehousePlaybook] = useState(false);
  const [showCleanupModal, setShowCleanupModal] = useState(false);
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

  const handleCleanupLayers = useCallback(async (layers: string[]) => {
    if (!selectedWarehouse) return;
    
    try {
      setError(null);
      await dataWarehouseApi.cleanupLayers(selectedWarehouse.warehouse_name, layers);
      fetchAllWarehouses();
    } catch (err) {
      if (isMountedRef.current) {
        setError(extractApiError(err));
      }
      throw err;
    }
  }, [selectedWarehouse, fetchAllWarehouses]);

  const filteredWarehouses = allWarehouses.filter(wh => {
    if (filters.schema_type && wh.schema_type !== filters.schema_type) return false;
    if (filters.source_db_engine && wh.source_db_engine !== filters.source_db_engine) return false;
    if (filters.target_db_engine && wh.target_db_engine !== filters.target_db_engine) return false;
    if (filters.active && String(wh.active) !== filters.active) return false;
    if (filters.enabled && String(wh.enabled) !== filters.enabled) return false;
    return true;
  });

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
          DATA WAREHOUSE
        </h1>
        <AsciiButton
          label="Medallion Architecture Playbook"
          onClick={() => setShowDataWarehousePlaybook(true)}
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
            placeholder="Search by warehouse name, schema, or target..."
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
              label="Add Warehouse"
              onClick={() => handleOpenModal()}
              variant="primary"
            />
            
            <select
              value={filters.schema_type}
              onChange={(e) => setFilter('schema_type', e.target.value)}
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
              <option value="">All Schemas</option>
              <option value="STAR_SCHEMA">Star Schema</option>
              <option value="SNOWFLAKE_SCHEMA">Snowflake Schema</option>
            </select>

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
              <option value="">All Targets</option>
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
              <option value="">All</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>

            <select
              value={filters.enabled}
              onChange={(e) => setFilter('enabled', e.target.value)}
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
        <div style={{ marginTop: 20, display: 'flex', gap: 20, alignItems: 'stretch' }}>
          <div style={{ flex: '0 0 400px', display: 'flex', flexDirection: 'column' }}>
            <AsciiPanel title="WAREHOUSE TREE">
              <div style={{
                minHeight: 300,
                maxHeight: 800,
                overflowY: 'auto',
                overflowX: 'hidden',
                fontFamily: "Consolas",
                fontSize: 12
              }}>
                <DataWarehouseTreeView
                  warehouses={filteredWarehouses}
                  onWarehouseClick={handleWarehouseClick}
                  onWarehouseEdit={handleOpenModal}
                  onWarehouseBuild={handleBuild}
                  onWarehouseToggleActive={handleToggleActive}
                  onWarehouseDelete={handleDelete}
                />
              </div>
            </AsciiPanel>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {selectedWarehouse ? (
              <AsciiPanel title={`WAREHOUSE DETAILS: ${selectedWarehouse.warehouse_name}`}>
                {selectedWarehouse.description && (
                  <p style={{
                    margin: 0,
                    marginBottom: 16,
                    fontSize: 12,
                    color: asciiColors.muted,
                    fontFamily: 'Consolas',
                    lineHeight: 1.5
                  }}>
                    {selectedWarehouse.description}
                  </p>
                )}

                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(2, 1fr)', 
                    gap: 16, 
                    marginBottom: 20,
                    padding: '16px',
                    backgroundColor: asciiColors.backgroundSoft,
                    borderRadius: 2,
                    border: `1px solid ${asciiColors.border}`
                  }}>
                    <div>
                      <div style={{ 
                        fontSize: 11, 
                        color: asciiColors.muted, 
                        marginBottom: 6, 
                        fontFamily: 'Consolas',
                        textTransform: 'uppercase',
                        letterSpacing: 0.5
                      }}>
                        Schema Type
                      </div>
                      <div style={{ 
                        fontSize: 12, 
                        fontFamily: 'Consolas',
                        fontWeight: 500
                      }}>
                        {selectedWarehouse.schema_type.replace('_', ' ')}
                      </div>
                    </div>
                    <div>
                      <div style={{ 
                        fontSize: 11, 
                        color: asciiColors.muted, 
                        marginBottom: 6, 
                        fontFamily: 'Consolas',
                        textTransform: 'uppercase',
                        letterSpacing: 0.5
                      }}>
                        Source Engine
                      </div>
                      <div style={{ fontSize: 12, fontFamily: 'Consolas', fontWeight: 500 }}>
                        {selectedWarehouse.source_db_engine}
                      </div>
                    </div>
                    <div>
                      <div style={{ 
                        fontSize: 11, 
                        color: asciiColors.muted, 
                        marginBottom: 6, 
                        fontFamily: 'Consolas',
                        textTransform: 'uppercase',
                        letterSpacing: 0.5
                      }}>
                        Target Engine
                      </div>
                      <div style={{ fontSize: 12, fontFamily: 'Consolas', fontWeight: 500 }}>
                        {selectedWarehouse.target_db_engine}
                      </div>
                    </div>
                    <div>
                      <div style={{ 
                        fontSize: 11, 
                        color: asciiColors.muted, 
                        marginBottom: 6, 
                        fontFamily: 'Consolas',
                        textTransform: 'uppercase',
                        letterSpacing: 0.5
                      }}>
                        Medallion Layer
                      </div>
                      <div style={{ 
                        fontSize: 12, 
                        fontFamily: 'Consolas', 
                        fontWeight: 600,
                        color: selectedWarehouse.target_layer === 'GOLD' ? asciiColors.success :
                               selectedWarehouse.target_layer === 'SILVER' ? asciiColors.accent :
                               asciiColors.muted
                      }}>
                        {selectedWarehouse.target_layer || 'BRONZE'}
                        {selectedWarehouse.target_layer === 'BRONZE' && ' (Raw Data)'}
                        {selectedWarehouse.target_layer === 'SILVER' && ' (Cleaned & Validated)'}
                        {selectedWarehouse.target_layer === 'GOLD' && ' (Business-Ready)'}
                      </div>
                    </div>
                    <div>
                      <div style={{ 
                        fontSize: 11, 
                        color: asciiColors.muted, 
                        marginBottom: 6, 
                        fontFamily: 'Consolas',
                        textTransform: 'uppercase',
                        letterSpacing: 0.5
                      }}>
                        Target Schema
                      </div>
                      <div style={{ fontSize: 12, fontFamily: 'Consolas', fontWeight: 500 }}>
                        {selectedWarehouse.target_schema}
                        {selectedWarehouse.target_layer && (
                          <span style={{ 
                            fontSize: 10, 
                            color: asciiColors.muted, 
                            marginLeft: 8 
                          }}>
                            (Layer: {selectedWarehouse.target_layer.toLowerCase()})
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <div style={{ 
                        fontSize: 11, 
                        color: asciiColors.muted, 
                        marginBottom: 6, 
                        fontFamily: 'Consolas',
                        textTransform: 'uppercase',
                        letterSpacing: 0.5
                      }}>
                        Build Status
                      </div>
                      <div style={{
                        fontSize: 12,
                        fontFamily: 'Consolas',
                        fontWeight: 500,
                        color: selectedWarehouse.last_build_status === 'SUCCESS' ? asciiColors.success :
                               selectedWarehouse.last_build_status === 'ERROR' ? asciiColors.danger :
                               asciiColors.muted,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}>
                        {selectedWarehouse.last_build_status === 'SUCCESS' && <span>✓</span>}
                        {selectedWarehouse.last_build_status === 'ERROR' && <span>✗</span>}
                        <span>{selectedWarehouse.last_build_status || 'Never built'}</span>
                      </div>
                      {selectedWarehouse.last_build_status === 'ERROR' && selectedWarehouse.notes && (
                        <div style={{
                          marginTop: 8,
                          padding: '10px 12px',
                          backgroundColor: asciiColors.danger + '20',
                          border: `1px solid ${asciiColors.danger}`,
                          borderRadius: 2,
                          color: asciiColors.danger,
                          fontSize: 11,
                          fontFamily: 'Consolas',
                          wordBreak: 'break-word',
                          lineHeight: 1.4
                        }}>
                          <strong>Error:</strong> {selectedWarehouse.notes}
                        </div>
                      )}
                    </div>
                    <div>
                      <div style={{ 
                        fontSize: 11, 
                        color: asciiColors.muted, 
                        marginBottom: 6, 
                        fontFamily: 'Consolas',
                        textTransform: 'uppercase',
                        letterSpacing: 0.5
                      }}>
                        Last Build
                      </div>
                      <div style={{ fontSize: 12, fontFamily: 'Consolas', fontWeight: 500 }}>
                        {selectedWarehouse.last_build_time 
                          ? new Date(selectedWarehouse.last_build_time).toLocaleString() 
                          : 'N/A'}
                      </div>
                    </div>
                  </div>

                  <div style={{ 
                    display: 'flex', 
                    gap: 12, 
                    marginBottom: 20,
                    padding: '12px 16px',
                    backgroundColor: asciiColors.backgroundSoft,
                    borderRadius: 2,
                    border: `1px solid ${asciiColors.border}`
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        fontSize: 11, 
                        color: asciiColors.muted, 
                        marginBottom: 4, 
                        fontFamily: 'Consolas',
                        textTransform: 'uppercase',
                        letterSpacing: 0.5
                      }}>
                        Dimensions
                      </div>
                      <div style={{ 
                        fontSize: 18, 
                        fontFamily: 'Consolas', 
                        fontWeight: 600,
                        color: asciiColors.accent
                      }}>
                        {selectedWarehouse.dimensions.length}
                      </div>
                    </div>
                    <div style={{ 
                      width: 1, 
                      backgroundColor: asciiColors.border 
                    }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        fontSize: 11, 
                        color: asciiColors.muted, 
                        marginBottom: 4, 
                        fontFamily: 'Consolas',
                        textTransform: 'uppercase',
                        letterSpacing: 0.5
                      }}>
                        Facts
                      </div>
                      <div style={{ 
                        fontSize: 18, 
                        fontFamily: 'Consolas', 
                        fontWeight: 600,
                        color: asciiColors.accent
                      }}>
                        {selectedWarehouse.facts.length}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <AsciiButton
                      label="▶ Build Now"
                      onClick={() => handleBuild(selectedWarehouse.warehouse_name)}
                    />
                    <AsciiButton
                      label="✎ Edit"
                      onClick={() => handleOpenModal(selectedWarehouse)}
                      variant="ghost"
                    />
                    {(selectedWarehouse.target_layer === 'SILVER' || selectedWarehouse.target_layer === 'GOLD') && (
                      <AsciiButton
                        label="🗑️ Cleanup Layers"
                        onClick={() => setShowCleanupModal(true)}
                        variant="ghost"
                      />
                    )}
                  </div>
              </AsciiPanel>
            ) : (
              <AsciiPanel title="WAREHOUSE DETAILS">
                <div style={{ 
                  padding: 60, 
                  textAlign: 'center', 
                  color: asciiColors.muted,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 300,
                  fontFamily: "Consolas",
                  fontSize: 12
                }}>
                  <div style={{ 
                    fontSize: 48, 
                    marginBottom: 16,
                    opacity: 0.5
                  }}>
                    {ascii.blockFull}
                  </div>
                  <div style={{ 
                    fontSize: 13, 
                    fontFamily: 'Consolas', 
                    marginBottom: 8,
                    color: asciiColors.foreground,
                    fontWeight: 600
                  }}>
                    No warehouse selected
                  </div>
                  <div style={{ 
                    fontSize: 12, 
                    color: asciiColors.muted, 
                    fontFamily: 'Consolas',
                    opacity: 0.7
                  }}>
                    Click on a warehouse from the list to see its configuration and build history
                  </div>
                </div>
              </AsciiPanel>
            )}
          </div>
        </div>
      )}

      {isModalOpen && (
        <AddDataWarehouseModal
          onClose={handleCloseModal}
          onSave={handleSave}
          initialData={editingWarehouse}
        />
      )}

      {showCleanupModal && selectedWarehouse && (
        <CleanupLayersModal
          warehouseName={selectedWarehouse.warehouse_name}
          currentLayer={(selectedWarehouse.target_layer || 'BRONZE') as 'BRONZE' | 'SILVER' | 'GOLD'}
          onClose={() => setShowCleanupModal(false)}
          onCleanup={handleCleanupLayers}
        />
      )}

      {showDataWarehousePlaybook && (
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
        onClick={() => setShowDataWarehousePlaybook(false)}
        >
          <div style={{
            width: '90%',
            maxWidth: 1000,
            maxHeight: '90vh',
            overflowY: 'auto'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <AsciiPanel title="MEDALLION ARCHITECTURE PLAYBOOK">
              <div style={{ padding: 16, fontFamily: 'Consolas', fontSize: 12, lineHeight: 1.6 }}>
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                    {ascii.blockFull} OVERVIEW
                  </div>
                  <div style={{ color: asciiColors.foreground, marginLeft: 16 }}>
                    The Medallion Architecture organizes data into three layers (Bronze, Silver, Gold) based on quality and transformation levels. 
                    Data flows automatically through these layers, with each layer applying progressively more sophisticated processing and validation.
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                    {ascii.blockFull} MEDALLION LAYERS
                  </div>
                  <div style={{ color: asciiColors.foreground, marginLeft: 16 }}>
                    <div style={{ marginBottom: 12, padding: '12px', backgroundColor: asciiColors.backgroundSoft, borderRadius: 2, border: `1px solid ${asciiColors.border}` }}>
                      <div style={{ fontWeight: 600, color: asciiColors.muted, marginBottom: 6, fontSize: 11 }}>BRONZE (Raw Data)</div>
                      <div style={{ fontSize: 11, lineHeight: 1.5 }}>
                        • <strong>Function:</strong> Copy data exactly as it appears in the source<br/>
                        • <strong>Schema:</strong> <code style={{ color: asciiColors.accent }}>{`{warehouse_name}_bronze`}</code><br/>
                        • <strong>Processing:</strong> Minimal - direct extraction from source_query<br/>
                        • <strong>Example:</strong> <code style={{ color: asciiColors.muted }}>SELECT * FROM source</code> → <code style={{ color: asciiColors.muted }}>INSERT INTO bronze.table</code>
                      </div>
                    </div>
                    <div style={{ marginBottom: 12, padding: '12px', backgroundColor: asciiColors.backgroundSoft, borderRadius: 2, border: `1px solid ${asciiColors.border}` }}>
                      <div style={{ fontWeight: 600, color: asciiColors.accent, marginBottom: 6, fontSize: 11 }}>SILVER (Cleaned & Validated)</div>
                      <div style={{ fontSize: 11, lineHeight: 1.5 }}>
                        • <strong>Function:</strong> Clean and validate data from Bronze layer<br/>
                        • <strong>Schema:</strong> <code style={{ color: asciiColors.accent }}>{`{warehouse_name}_silver`}</code><br/>
                        • <strong>Processing:</strong> Deduplication, trimming, data quality validation (quality_score ≥ 70)<br/>
                        • <strong>Example:</strong> <code style={{ color: asciiColors.muted }}>SELECT cleaned FROM bronze.table</code> → <code style={{ color: asciiColors.muted }}>INSERT INTO silver.table</code>
                      </div>
                    </div>
                    <div style={{ marginBottom: 12, padding: '12px', backgroundColor: asciiColors.backgroundSoft, borderRadius: 2, border: `1px solid ${asciiColors.border}` }}>
                      <div style={{ fontWeight: 600, color: asciiColors.success, marginBottom: 6, fontSize: 11 }}>GOLD (Business-Ready)</div>
                      <div style={{ fontSize: 11, lineHeight: 1.5 }}>
                        • <strong>Function:</strong> Transform data into business-ready analytical models<br/>
                        • <strong>Schema:</strong> <code style={{ color: asciiColors.accent }}>{`{warehouse_name}_gold`}</code><br/>
                        • <strong>Processing:</strong> Star/Snowflake schema construction, SCD Type 1/2/3, dimension and fact tables<br/>
                        • <strong>Example:</strong> <code style={{ color: asciiColors.muted }}>SELECT transformed FROM silver.table</code> → <code style={{ color: asciiColors.muted }}>INSERT INTO gold.dim_customer, gold.fact_sales</code>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                    {ascii.blockFull} AUTOMATED PROMOTION FLOW
                  </div>
                  <div style={{ color: asciiColors.foreground, marginLeft: 16 }}>
                    <div style={{ marginBottom: 16, padding: '12px', backgroundColor: asciiColors.backgroundSoft, borderRadius: 2, border: `1px solid ${asciiColors.border}` }}>
                      <div style={{ fontWeight: 600, color: asciiColors.muted, marginBottom: 8, fontSize: 11 }}>1. CREATE WAREHOUSE (BRONZE)</div>
                      <div style={{ fontSize: 11, lineHeight: 1.6, marginLeft: 8 }}>
                        <div style={{ marginBottom: 4 }}><span style={{ color: asciiColors.muted }}>└─</span> User creates warehouse with <code style={{ color: asciiColors.accent }}>target_layer = 'BRONZE'</code></div>
                        <div style={{ marginBottom: 4 }}><span style={{ color: asciiColors.muted }}>└─</span> <code style={{ color: asciiColors.accent }}>buildWarehouse()</code> → <code style={{ color: asciiColors.accent }}>buildBronzeLayer()</code></div>
                        <div style={{ marginBottom: 4 }}><span style={{ color: asciiColors.muted }}>└─</span> Data is copied raw from <code style={{ color: asciiColors.accent }}>source_query</code></div>
                        <div><span style={{ color: asciiColors.muted }}>└─</span> Saved to schema: <code style={{ color: asciiColors.accent }}>{`{warehouse_name}_bronze`}</code></div>
                      </div>
                    </div>

                    <div style={{ marginBottom: 16, padding: '12px', backgroundColor: asciiColors.backgroundSoft, borderRadius: 2, border: `1px solid ${asciiColors.border}` }}>
                      <div style={{ fontWeight: 600, color: asciiColors.accent, marginBottom: 8, fontSize: 11 }}>2. AUTOMATIC PROMOTION BRONZE → SILVER (every 60 sec)</div>
                      <div style={{ fontSize: 11, lineHeight: 1.6, marginLeft: 8 }}>
                        <div style={{ marginBottom: 4 }}><span style={{ color: asciiColors.muted }}>└─</span> <code style={{ color: asciiColors.accent }}>warehouseBuilderThread</code> checks warehouses in BRONZE</div>
                        <div style={{ marginBottom: 4 }}><span style={{ color: asciiColors.muted }}>└─</span> If <code style={{ color: asciiColors.accent }}>last_build_status = 'SUCCESS'</code>:</div>
                        <div style={{ marginBottom: 4, marginLeft: 16 }}><span style={{ color: asciiColors.muted }}>├─</span> <code style={{ color: asciiColors.accent }}>validateDataQuality()</code> checks quality ≥ 70</div>
                        <div style={{ marginBottom: 4, marginLeft: 16 }}><span style={{ color: asciiColors.muted }}>├─</span> If passes: <code style={{ color: asciiColors.accent }}>promoteToSilver()</code></div>
                        <div style={{ marginBottom: 4, marginLeft: 16 }}><span style={{ color: asciiColors.muted }}>├─</span> <code style={{ color: asciiColors.accent }}>buildWarehouse()</code> → <code style={{ color: asciiColors.accent }}>buildSilverLayer()</code></div>
                        <div style={{ marginBottom: 4, marginLeft: 16 }}><span style={{ color: asciiColors.muted }}>├─</span> Reads from <code style={{ color: asciiColors.accent }}>{`{warehouse_name}_bronze`}</code></div>
                        <div style={{ marginBottom: 4, marginLeft: 16 }}><span style={{ color: asciiColors.muted }}>├─</span> Cleans data (trim, deduplicate)</div>
                        <div style={{ marginBottom: 4, marginLeft: 16 }}><span style={{ color: asciiColors.muted }}>├─</span> Validates quality</div>
                        <div><span style={{ color: asciiColors.muted }}>└─</span> Saves to schema: <code style={{ color: asciiColors.accent }}>{`{warehouse_name}_silver`}</code></div>
                      </div>
                    </div>

                    <div style={{ marginBottom: 16, padding: '12px', backgroundColor: asciiColors.backgroundSoft, borderRadius: 2, border: `1px solid ${asciiColors.border}` }}>
                      <div style={{ fontWeight: 600, color: asciiColors.success, marginBottom: 8, fontSize: 11 }}>3. AUTOMATIC PROMOTION SILVER → GOLD (every 60 sec)</div>
                      <div style={{ fontSize: 11, lineHeight: 1.6, marginLeft: 8 }}>
                        <div style={{ marginBottom: 4 }}><span style={{ color: asciiColors.muted }}>└─</span> <code style={{ color: asciiColors.accent }}>warehouseBuilderThread</code> checks warehouses in SILVER</div>
                        <div style={{ marginBottom: 4 }}><span style={{ color: asciiColors.muted }}>└─</span> If <code style={{ color: asciiColors.accent }}>last_build_status = 'SUCCESS'</code>:</div>
                        <div style={{ marginBottom: 4, marginLeft: 16 }}><span style={{ color: asciiColors.muted }}>├─</span> <code style={{ color: asciiColors.accent }}>promoteToGold()</code></div>
                        <div style={{ marginBottom: 4, marginLeft: 16 }}><span style={{ color: asciiColors.muted }}>├─</span> <code style={{ color: asciiColors.accent }}>buildWarehouse()</code> → <code style={{ color: asciiColors.accent }}>buildGoldLayer()</code></div>
                        <div style={{ marginBottom: 4, marginLeft: 16 }}><span style={{ color: asciiColors.muted }}>├─</span> Reads from <code style={{ color: asciiColors.accent }}>{`{warehouse_name}_silver`}</code></div>
                        <div style={{ marginBottom: 4, marginLeft: 16 }}><span style={{ color: asciiColors.muted }}>├─</span> Applies transformations (Star/Snowflake Schema)</div>
                        <div style={{ marginBottom: 4, marginLeft: 16 }}><span style={{ color: asciiColors.muted }}>├─</span> Builds dimensions and facts with SCD</div>
                        <div><span style={{ color: asciiColors.muted }}>└─</span> Saves to schema: <code style={{ color: asciiColors.accent }}>{`{warehouse_name}_gold`}</code></div>
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
                      <span style={{ color: asciiColors.success }}>{ascii.blockFull}</span> <strong>Automatic Promotion:</strong> System checks and promotes warehouses every 60 seconds
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.success }}>{ascii.blockFull}</span> <strong>Quality Gates:</strong> BRONZE → SILVER requires quality_score ≥ 70
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.success }}>{ascii.blockFull}</span> <strong>Separate Schemas:</strong> Each layer has its own schema to prevent conflicts
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.success }}>{ascii.blockFull}</span> <strong>Sequential Flow:</strong> Data must flow BRONZE → SILVER → GOLD (cannot skip layers)
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.success }}>{ascii.blockFull}</span> <strong>Historical Preservation:</strong> Each layer maintains its own data snapshot
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
                    • Start with BRONZE layer to capture raw data without transformation<br/>
                    • Monitor data quality scores to ensure successful promotion to SILVER<br/>
                    • Use SILVER layer for data cleaning and validation before business transformations<br/>
                    • Design GOLD layer schemas (Star/Snowflake) based on your analytical requirements<br/>
                    • Each layer serves a specific purpose - don't skip layers in the flow<br/>
                    • Monitor promotion status in the warehouse details panel<br/>
                    • Use separate schemas per layer to maintain data lineage and auditability
                  </div>
                </div>

                <div style={{ marginTop: 16, textAlign: 'right' }}>
                  <AsciiButton
                    label="Close"
                    onClick={() => setShowDataWarehousePlaybook(false)}
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

export default DataWarehouse;

