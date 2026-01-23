import { useState, useEffect, useCallback, useRef } from "react";
import AddTableModal from "./AddTableModal";
import CatalogTreeView from "./CatalogTreeView";
import TableDetailModal from "./TableDetailModal";
import { AsciiPanel } from "../../ui/layout/AsciiPanel";
import { AsciiButton } from "../../ui/controls/AsciiButton";
import { asciiColors, ascii } from "../../ui/theme/asciiTheme";
import { useTableFilters } from "../../hooks/useTableFilters";
import { catalogApi } from "../../services/api";
import type { CatalogEntry } from "../../services/api";
import { extractApiError } from "../../utils/errorHandler";
import { sanitizeSearch } from "../../utils/validation";
import SkeletonLoader from "../shared/SkeletonLoader";


/**
 * Componente principal del Catálogo que permite gestionar y visualizar
 * todas las tablas sincronizadas en el sistema.
 *
 * @returns {JSX.Element} Componente Catalog renderizado
 */
const Catalog = () => {
  const { filters, setFilter, clearFilters } = useTableFilters({
    engine: "",
    status: "",
    active: "",
  });

  const [sortField, setSortField] = useState("active");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [availableSchemas, setAvailableSchemas] = useState<string[]>([]);
  const [availableEngines, setAvailableEngines] = useState<string[]>([]);
  const [availableStatuses, setAvailableStatuses] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<CatalogEntry | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [allEntries, setAllEntries] = useState<CatalogEntry[]>([]);
  const [loadingTree, setLoadingTree] = useState(true);
  const [tableStructure, setTableStructure] = useState<any>(null);
  const [loadingStructure, setLoadingStructure] = useState(false);
  const [showCatalogPlaybook, setShowCatalogPlaybook] = useState(false);
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [selectedSchemaForActivate, setSelectedSchemaForActivate] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  /**
   * Carga los valores únicos disponibles desde la API
   *
   * @returns {Promise<void>}
   */
  const fetchFilterOptions = useCallback(async () => {
    try {
      const [schemas, engines, statuses] = await Promise.all([
        catalogApi.getSchemas(),
        catalogApi.getEngines(),
        catalogApi.getStatuses(),
      ]);
      if (isMountedRef.current) {
        setAvailableSchemas(schemas);
        setAvailableEngines(engines);
        setAvailableStatuses(statuses);
      }
    } catch (err) {
      console.error("Error loading filter options:", err);
    }
  }, []);

  const fetchAllEntries = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    const startTime = Date.now();
    const minLoadingTime = 300;
    
    try {
      setLoadingTree(true);
      setError(null);
      const sanitizedSearch = sanitizeSearch(search, 100);
      const params = {
        page: 1,
        limit: 10000,
        engine: filters.engine as string,
        status: filters.status as string,
        active: filters.active as string,
        search: sanitizedSearch,
        sort_field: sortField,
        sort_direction: sortDirection,
      };
      
      const response = await catalogApi.getCatalogEntries(params);
      
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minLoadingTime - elapsed);
      await new Promise(resolve => setTimeout(resolve, remaining));
      
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
  }, [filters.engine, filters.status, filters.active, search, sortField, sortDirection]);

  /**
   * Maneja la creación de una nueva entrada del catálogo
   *
   * @param {Omit<CatalogEntry, 'last_sync_time' | 'updated_at'>} newEntry - Nueva entrada
   * @returns {Promise<void>}
   */
  const handleAdd = useCallback(
    async (newEntry: Omit<CatalogEntry, 'last_sync_time' | 'updated_at'>) => {
      try {
        setLoadingTree(true);
        setError(null);
        await catalogApi.createEntry(newEntry);
        await fetchAllEntries();
        setShowAddModal(false);
        alert(`Table "${newEntry.schema_name}.${newEntry.table_name}" added successfully.`);
      } catch (err) {
        setError(extractApiError(err));
      } finally {
        setLoadingTree(false);
      }
    },
    [fetchAllEntries]
  );

  /**
   * Maneja la edición de una entrada del catálogo
   *
   * @param {CatalogEntry} updatedEntry - Entrada actualizada
   * @returns {Promise<void>}
   */
  const handleEdit = useCallback(
    async (updatedEntry: CatalogEntry) => {
      try {
        setLoadingTree(true);
        await catalogApi.updateEntry(updatedEntry);
        await fetchAllEntries();
        setSelectedEntry(null);
      } catch (err) {
        setError(extractApiError(err));
      } finally {
        setLoadingTree(false);
      }
    },
    [fetchAllEntries]
  );

  /**
   * Maneja el marcado de una tabla como SKIP
   *
   * @param {CatalogEntry} entry - Entrada del catálogo a marcar como SKIP
   * @returns {Promise<void>}
   */
  const handleSkipTable = useCallback(
    async (entry: CatalogEntry) => {
      if (
        !confirm(
          `Are you sure you want to mark table "${entry.schema_name}.${entry.table_name}" as SKIP?\n\nThis will:\n- Set status to 'SKIP'\n- Set active to false (table will not be processed)\n- Reset offset to 0\n\nThis action CANNOT be undone.`
        )
      ) {
        return;
      }

      try {
        setLoadingTree(true);
        await catalogApi.skipTable(
          entry.schema_name,
          entry.table_name,
          entry.db_engine
        );
        await fetchAllEntries();
        alert(
          `Table "${entry.schema_name}.${entry.table_name}" marked as SKIP successfully.`
        );
      } catch (err) {
        setError(extractApiError(err));
      } finally {
        setLoadingTree(false);
      }
    },
    [fetchAllEntries]
  );

  /**
   * Maneja la eliminación de una entrada del catálogo
   *
   * @param {CatalogEntry} entry - Entrada del catálogo a eliminar
   * @returns {Promise<void>}
   */
  const handleDelete = useCallback(
    async (entry: CatalogEntry) => {
      if (
        !confirm(
          `Are you sure you want to DELETE table "${entry.schema_name}.${entry.table_name}" from the catalog?\n\nThis will permanently remove the entry from the catalog.\n\nThis action CANNOT be undone.`
        )
      ) {
        return;
      }

      try {
        setLoadingTree(true);
        await catalogApi.deleteEntry(
          entry.schema_name,
          entry.table_name,
          entry.db_engine
        );
        await fetchAllEntries();
        alert(
          `Table "${entry.schema_name}.${entry.table_name}" deleted successfully.`
        );
      } catch (err) {
        setError(extractApiError(err));
      } finally {
        setLoadingTree(false);
      }
    },
    [fetchAllEntries]
  );

  /**
   * Maneja la desactivación de todas las tablas de un schema
   *
   * @param {string} schemaName - Nombre del schema a desactivar
   * @returns {Promise<void>}
   */
  const handleSchemaAction = useCallback(
    async (schemaName: string) => {
      if (!schemaName || schemaName === "") return;

      if (
        !confirm(
          `Are you sure you want to deactivate ALL tables in schema "${schemaName}"?\n\nThis will change status to 'SKIPPED' and reset offsets to 0.\n\nThis action CANNOT be undone.`
        )
      ) {
        const select = document.querySelector(
          'select[data-schema-action]'
        ) as HTMLSelectElement;
        if (select) select.value = "";
        return;
      }

      try {
        setLoadingTree(true);
        const result = await catalogApi.deactivateSchema(schemaName);
        await fetchAllEntries();
        alert(
          `Schema "${schemaName}" deactivated successfully.\n${result.affectedRows} tables affected.`
        );
      } catch (err) {
        setError(extractApiError(err));
      } finally {
        setLoadingTree(false);
        const select = document.querySelector(
          'select[data-schema-action]'
        ) as HTMLSelectElement;
        if (select) select.value = "";
      }
    },
    [fetchAllEntries]
  );

  /**
   * Maneja la activación de todas las tablas de un schema
   *
   * @param {string} schemaName - Nombre del schema a activar
   * @returns {Promise<void>}
   */
  const handleActivateSchema = useCallback(
    async (schemaName: string) => {
      if (!schemaName || schemaName === "") return;
      
      setSelectedSchemaForActivate(schemaName);
      setShowActivateModal(true);
    },
    []
  );

  /**
   * Confirma y ejecuta la activación del schema
   *
   * @returns {Promise<void>}
   */
  const confirmActivateSchema = useCallback(
    async () => {
      if (!selectedSchemaForActivate) return;

      try {
        setLoadingTree(true);
        setShowActivateModal(false);
        const result = await catalogApi.activateSchema(selectedSchemaForActivate);
        await fetchAllEntries();
        alert(
          `Schema "${selectedSchemaForActivate}" activated successfully.\n${result.affectedRows} tables affected.\nAll tables set to active = TRUE and status = 'FULL_LOAD'.`
        );
      } catch (err) {
        setError(extractApiError(err));
      } finally {
        setLoadingTree(false);
        setSelectedSchemaForActivate(null);
        const select = document.querySelector(
          'select[data-activate-schema-action]'
        ) as HTMLSelectElement;
        if (select) select.value = "";
      }
    },
    [selectedSchemaForActivate, fetchAllEntries]
  );

  const handleTableClick = useCallback(async (entry: CatalogEntry) => {
    setSelectedEntry(entry);
    setLoadingStructure(true);
    setTableStructure(null);
    
    try {
      const structure = await catalogApi.getTableStructure(entry.schema_name, entry.table_name, entry.db_engine).catch(() => null);
      if (isMountedRef.current) {
        setTableStructure(structure);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(extractApiError(err));
      }
    } finally {
      if (isMountedRef.current) {
        setLoadingStructure(false);
      }
    }
  }, []);

  const handleExportCSV = useCallback(() => {
    const headers = ["Schema", "Table", "Engine", "Status", "Active", "Strategy", "Cluster"];
    const rows = allEntries.map(entry => [
      entry.schema_name,
      entry.table_name,
      entry.db_engine,
      entry.status,
      entry.active ? "Yes" : "No",
      entry.pk_strategy || "OFFSET",
      entry.cluster_name || ""
    ]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `catalog_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [allEntries]);

  /**
   * Maneja la búsqueda con debounce
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchFilterOptions();
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchFilterOptions]);

  // Cargar todas las entradas al montar y cuando cambian los filtros
  useEffect(() => {
    fetchAllEntries();
  }, [fetchAllEntries]);

  // Auto-refresh disabled - user can manually refresh if needed
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     if (isMountedRef.current) {
  //       fetchAllEntries();
  //     }
  //   }, 30000);
  //   
  //   return () => clearInterval(interval);
  // }, [fetchAllEntries]);

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
          DATALAKE CATALOG MANAGER
        </h1>
        <AsciiButton
          label="Catalog Info"
          onClick={() => setShowCatalogPlaybook(true)}
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
            placeholder="Search by schema name, table name, or cluster name..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                setSearch(searchInput);
              }
            }}
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
            onClick={() => {
              setSearch(searchInput);
            }}
            variant="primary"
          />
          {(search || searchInput) && (
            <AsciiButton
              label="Clear"
              onClick={() => {
                setSearch("");
                setSearchInput("");
              }}
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
          <select
            value={filters.engine as string}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
              setFilter("engine", e.target.value);
            }}
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
            <option value="">All Engines ({availableEngines.length})</option>
            {availableEngines.map((engine) => (
              <option key={engine} value={engine}>
                {engine}
              </option>
            ))}
          </select>

          <select
            value={filters.status as string}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
              setFilter("status", e.target.value);
            }}
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
            <option value="">All Status ({availableStatuses.length})</option>
            {availableStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <select
            value={filters.active as string}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
              setFilter("active", e.target.value);
            }}
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
            <option value="">All States</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>

          <AsciiButton
            label="Reset All"
            onClick={() => {
              clearFilters();
              setSearch("");
              setSearchInput("");
            }}
            variant="ghost"
          />

          <select
            defaultValue=""
            data-schema-action
            onChange={(e) => handleSchemaAction(e.target.value)}
            style={{
              padding: "6px 10px",
              border: "none",
              borderRadius: 2,
              fontSize: 12,
              fontFamily: "Consolas",
              backgroundColor: "transparent",
              color: asciiColors.foreground,
              cursor: "pointer",
              outline: "none",
              fontWeight: 600
            }}
          >
            <option value="">Deactivate Schema</option>
            {availableSchemas.map((schema) => (
              <option key={schema} value={schema}>
                Deactivate {schema}
              </option>
            ))}
          </select>

          <select
            defaultValue=""
            data-activate-schema-action
            onChange={(e) => handleActivateSchema(e.target.value)}
            style={{
              padding: "6px 10px",
              border: "none",
              borderRadius: 2,
              fontSize: 12,
              fontFamily: "Consolas",
              backgroundColor: "transparent",
              color: asciiColors.foreground,
              cursor: "pointer",
              outline: "none",
              fontWeight: 600
            }}
          >
            <option value="">Activate Schema</option>
            {availableSchemas.map((schema) => (
              <option key={schema} value={schema}>
                Activate {schema}
              </option>
            ))}
          </select>
        </div>
      </AsciiPanel>

      <AsciiPanel title="ACTIONS">
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 0"
        }}>
          <div style={{
            fontSize: 12,
            fontFamily: "Consolas",
            color: asciiColors.muted
          }}>
            {ascii.v} Total: {allEntries.length} entries
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <AsciiButton
              label="Add Table"
              onClick={() => setShowAddModal(true)}
              variant="primary"
            />
            <AsciiButton
              label="Export CSV"
              onClick={handleExportCSV}
              variant="ghost"
            />
          </div>
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
          <CatalogTreeView 
            entries={allEntries}
            onEntryClick={handleTableClick}
            onDelete={handleDelete}
          />
        </div>
      )}

      {selectedEntry && (
        <TableDetailModal
          entry={selectedEntry}
          tableStructure={tableStructure}
          loadingStructure={loadingStructure}
          onClose={() => setSelectedEntry(null)}
          onSave={handleEdit}
        />
      )}

      {showAddModal && (
        <AddTableModal
          onClose={() => setShowAddModal(false)}
          onSave={handleAdd}
        />
      )}

      {showActivateModal && (
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
        onClick={() => {
          setShowActivateModal(false);
          setSelectedSchemaForActivate(null);
        }}
        >
          <div style={{
            background: asciiColors.background,
            border: `2px solid ${asciiColors.success}`,
            borderRadius: 4,
            padding: 24,
            maxWidth: 500,
            width: '90%',
            fontFamily: 'Consolas',
            fontSize: 12
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              fontSize: 14,
              fontWeight: 600,
              color: asciiColors.success,
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              {ascii.blockFull} ACTIVATE SCHEMA
            </div>
            <div style={{
              color: asciiColors.foreground,
              marginBottom: 20,
              lineHeight: 1.6
            }}>
              Are you sure you want to activate ALL tables in schema <strong style={{ color: asciiColors.accent }}>"{selectedSchemaForActivate}"</strong>?
            </div>
            <div style={{
              background: asciiColors.backgroundSoft,
              padding: 12,
              borderRadius: 2,
              marginBottom: 20,
              border: `1px solid ${asciiColors.border}`
            }}>
              <div style={{ color: asciiColors.foreground, marginBottom: 8, fontWeight: 600 }}>
                This will:
              </div>
              <div style={{ color: asciiColors.foreground, marginLeft: 16 }}>
                <div style={{ marginBottom: 4 }}>• Set <strong>active = TRUE</strong> for all tables</div>
                <div style={{ marginBottom: 4 }}>• Set <strong>status = 'FULL_LOAD'</strong> for all tables</div>
                <div>• Trigger full synchronization for all tables in the schema</div>
              </div>
            </div>
            <div style={{
              display: 'flex',
              gap: 12,
              justifyContent: 'flex-end'
            }}>
              <AsciiButton
                label="Cancel"
                onClick={() => {
                  setShowActivateModal(false);
                  setSelectedSchemaForActivate(null);
                  const select = document.querySelector(
                    'select[data-activate-schema-action]'
                  ) as HTMLSelectElement;
                  if (select) select.value = "";
                }}
                variant="ghost"
              />
              <AsciiButton
                label="Activate Schema"
                onClick={confirmActivateSchema}
                variant="primary"
                style={{
                  backgroundColor: asciiColors.success,
                  borderColor: asciiColors.success,
                  color: '#ffffff'
                }}
              />
            </div>
          </div>
        </div>
      )}

      {showCatalogPlaybook && (
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
        onClick={() => setShowCatalogPlaybook(false)}
        >
          <div style={{
            width: '90%',
            maxWidth: 1000,
            maxHeight: '90vh',
            overflowY: 'auto'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <AsciiPanel title="CATALOG PLAYBOOK">
              <div style={{ padding: 16, fontFamily: 'Consolas', fontSize: 12, lineHeight: 1.6 }}>
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                    {ascii.blockFull} OVERVIEW
                  </div>
                  <div style={{ color: asciiColors.foreground, marginLeft: 16 }}>
                    The DataLake Catalog Manager tracks and synchronizes tables from multiple database engines to PostgreSQL. 
                    It manages the full lifecycle of data synchronization, from initial full loads to continuous change data capture (CDC).
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                    {ascii.blockFull} SUPPORTED DATABASE ENGINES
                  </div>
                  <div style={{ color: asciiColors.foreground, marginLeft: 16 }}>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.muted }}>├─</span> <strong>PostgreSQL:</strong> Native PostgreSQL to PostgreSQL sync
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.muted }}>├─</span> <strong>MariaDB:</strong> MySQL-compatible database sync
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.muted }}>├─</span> <strong>MSSQL:</strong> Microsoft SQL Server sync
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.muted }}>├─</span> <strong>MongoDB:</strong> NoSQL document database sync
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.muted }}>├─</span> <strong>Oracle:</strong> Oracle Database sync
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.muted }}>└─</span> <strong>DB2:</strong> IBM DB2 database sync
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                    {ascii.blockFull} SYNCHRONIZATION STATUSES
                  </div>
                  <div style={{ color: asciiColors.foreground, marginLeft: 16 }}>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.warning }}>{ascii.blockFull}</span> <strong>FULL_LOAD:</strong> Performing initial complete table synchronization
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.success }}>{ascii.blockFull}</span> <strong>SYNC:</strong> Table is in normal synchronization mode
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.accent }}>{ascii.blockFull}</span> <strong>IN_PROGRESS:</strong> Synchronization operation currently running
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.success }}>{ascii.blockFull}</span> <strong>LISTENING_CHANGES:</strong> Actively monitoring for CDC changes
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.warning }}>{ascii.blockFull}</span> <strong>RESET:</strong> Table synchronization is being reset
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                    {ascii.blockFull} PRIMARY KEY STRATEGIES
                  </div>
                  <div style={{ color: asciiColors.foreground, marginLeft: 16 }}>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.muted }}>├─</span> <strong>CDC:</strong> Change Data Capture - tracks changes using change log tables (default and recommended)
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.muted }}>├─</span> <strong>OFFSET:</strong> Legacy strategy - automatically converted to CDC
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.muted }}>└─</span> <strong>PK:</strong> Legacy strategy - automatically converted to CDC
                    </div>
                  </div>
                  <div style={{ color: asciiColors.muted, marginLeft: 16, marginTop: 8, fontSize: 11, fontStyle: 'italic' }}>
                    CDC uses change log tables (e.g., datasync_metadata.ds_change_log) to track INSERT, UPDATE, and DELETE operations, 
                    enabling efficient incremental synchronization without full table scans.
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                    {ascii.blockFull} SYNCHRONIZATION PROCESS
                  </div>
                  <div style={{ color: asciiColors.foreground, marginLeft: 16 }}>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.muted }}>├─</span> <strong>Initial Load:</strong> FULL_LOAD status performs complete table copy
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.muted }}>├─</span> <strong>CDC Setup:</strong> System creates change log tables if needed
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.muted }}>├─</span> <strong>Incremental Sync:</strong> LISTENING_CHANGES monitors change logs for updates
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.muted }}>└─</span> <strong>Data Transformation:</strong> Values are cleaned and normalized for PostgreSQL compatibility
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
                    • Use CDC strategy for efficient incremental synchronization<br/>
                    • Monitor LISTENING_CHANGES status to ensure CDC is active<br/>
                    • Review table structures before enabling synchronization<br/>
                    • Use schema-level operations for bulk management<br/>
                    • Monitor FULL_LOAD progress for large tables<br/>
                    • Reset tables (RESET status) when schema changes occur<br/>
                    • Export catalog data for documentation and auditing
                  </div>
                </div>

                <div style={{ marginTop: 16, textAlign: 'right' }}>
                  <AsciiButton
                    label="Close"
                    onClick={() => setShowCatalogPlaybook(false)}
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

export default Catalog;
