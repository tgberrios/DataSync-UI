import { useState, useEffect, useCallback, useRef } from "react";
import EditModal from "./EditModal";
import AddTableModal from "./AddTableModal";
import CatalogTreeView from "./CatalogTreeView";
import { AsciiPanel } from "../../ui/layout/AsciiPanel";
import { AsciiButton } from "../../ui/controls/AsciiButton";
import { asciiColors, ascii } from "../../ui/theme/asciiTheme";
import { useTableFilters } from "../../hooks/useTableFilters";
import { catalogApi } from "../../services/api";
import type { CatalogEntry } from "../../services/api";
import { extractApiError } from "../../utils/errorHandler";
import { sanitizeSearch } from "../../utils/validation";


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
    strategy: "",
  });

  const [sortField, setSortField] = useState("active");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [availableSchemas, setAvailableSchemas] = useState<string[]>([]);
  const [availableEngines, setAvailableEngines] = useState<string[]>([]);
  const [availableStatuses, setAvailableStatuses] = useState<string[]>([]);
  const [availableStrategies, setAvailableStrategies] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<CatalogEntry | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [allEntries, setAllEntries] = useState<CatalogEntry[]>([]);
  const [loadingTree, setLoadingTree] = useState(false);
  const isMountedRef = useRef(true);

  /**
   * Carga los valores únicos disponibles desde la API
   *
   * @returns {Promise<void>}
   */
  const fetchFilterOptions = useCallback(async () => {
    try {
      const [schemas, engines, statuses, strategies] = await Promise.all([
        catalogApi.getSchemas(),
        catalogApi.getEngines(),
        catalogApi.getStatuses(),
        catalogApi.getStrategies(),
      ]);
      if (isMountedRef.current) {
        setAvailableSchemas(schemas);
        setAvailableEngines(engines);
        setAvailableStatuses(statuses);
        setAvailableStrategies(strategies);
      }
    } catch (err) {
      console.error("Error loading filter options:", err);
    }
  }, []);

  const fetchAllEntries = useCallback(async () => {
    if (!isMountedRef.current) return;
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

  // Configurar el intervalo de actualización
  useEffect(() => {
    const interval = setInterval(() => {
      if (isMountedRef.current) {
        fetchAllEntries();
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [fetchAllEntries]);


  return (
    <div style={{
      width: "100%",
      minHeight: "100vh",
      padding: "24px 32px",
      fontFamily: "Consolas",
      fontSize: 12,
      color: asciiColors.foreground,
      backgroundColor: asciiColors.background,
      display: "flex",
      flexDirection: "column",
      gap: 20
    }}>
      <h1 style={{
        fontSize: 18,
        fontWeight: 600,
        margin: 0,
        marginBottom: 16,
        padding: "12px 8px",
        borderBottom: `2px solid ${asciiColors.border}`,
        fontFamily: "Consolas"
      }}>
        DATALAKE CATALOG MANAGER
      </h1>

      {error && (
        <AsciiPanel title="ERROR">
          <div style={{ 
            color: asciiColors.danger, 
            fontSize: 12,
            fontFamily: "Consolas",
            padding: "8px 0"
          }}>
            {ascii.blockFull} {error}
          </div>
        </AsciiPanel>
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

          <select
            value={filters.strategy as string}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
              setFilter("strategy", e.target.value);
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
            <option value="">All Strategies ({availableStrategies.length})</option>
            {availableStrategies.map((strategy) => (
              <option key={strategy} value={strategy}>
                {strategy === "PK" ? "Primary Key" : strategy === "OFFSET" ? "Offset" : strategy === "CDC" ? "CDC" : strategy}
              </option>
            ))}
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
              border: `1px solid ${asciiColors.accent}`,
              borderRadius: 2,
              fontSize: 12,
              fontFamily: "Consolas",
              backgroundColor: asciiColors.accentLight,
              color: asciiColors.accent,
              cursor: "pointer",
              outline: "none",
              fontWeight: 600
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = asciiColors.accent;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = asciiColors.accent;
            }}
          >
            <option value="">Deactivate Schema</option>
            {availableSchemas.map((schema) => (
              <option key={schema} value={schema}>
                Deactivate {schema}
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
      ) : (
        <CatalogTreeView 
          entries={allEntries}
          onEntryClick={(entry) => setSelectedEntry(entry)}
        />
      )}

      {selectedEntry && (
        <EditModal
          entry={selectedEntry}
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
    </div>
  );
};

export default Catalog;
