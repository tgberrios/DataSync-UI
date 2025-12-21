import { useState, useEffect, useCallback, useRef } from "react";
import EditModal from "./EditModal";
import AddTableModal from "./AddTableModal";
import CatalogTreeView from "./CatalogTreeView";
import {
  Container,
  Header,
  FiltersContainer,
  Select,
  StatusBadge,
  ErrorMessage,
  LoadingOverlay,
  SearchContainer,
  Input,
  Button,
} from "../shared/BaseComponents";
import { useTableFilters } from "../../hooks/useTableFilters";
import { catalogApi } from "../../services/api";
import type { CatalogEntry } from "../../services/api";
import { extractApiError } from "../../utils/errorHandler";
import { sanitizeSearch } from "../../utils/validation";
import styled, { keyframes } from "styled-components";
import { theme } from "../../theme/theme";

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const PaginationInfo = styled.div`
  text-align: center;
  margin-bottom: ${theme.spacing.sm};
  color: ${theme.colors.text.secondary};
  font-size: 0.9em;
  animation: ${fadeIn} 0.3s ease-out;
  font-weight: 500;
`;

const TableActions = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.md};
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md};
  background: linear-gradient(135deg, ${theme.colors.background.secondary} 0%, ${theme.colors.background.tertiary} 100%);
  border-radius: ${theme.borderRadius.md};
  border: 1px solid ${theme.colors.border.light};
  animation: ${fadeIn} 0.3s ease-out;
  box-shadow: ${theme.shadows.sm};
`;

const ExportButton = styled(Button)`
  padding: 8px 16px;
  font-size: 0.9em;
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
  border-radius: ${theme.borderRadius.md};
  transition: all ${theme.transitions.normal};
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${theme.shadows.md};
  }
`;

const SearchInput = styled(Input)`
  flex: 1;
  font-size: 14px;
  transition: all ${theme.transitions.normal};
  border: 2px solid ${theme.colors.border.light};
  
  &:focus {
    border-color: ${theme.colors.primary.main};
    box-shadow: 0 0 0 3px ${theme.colors.primary.main}15;
    outline: none;
  }
`;

const SearchButton = styled(Button)`
  padding: 10px 20px;
  font-weight: 600;
  transition: all ${theme.transitions.normal};
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${theme.shadows.md};
  }
`;

const ClearSearchButton = styled(Button)`
  padding: 10px 15px;
  transition: all ${theme.transitions.normal};
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${theme.shadows.md};
  }
`;

const FilterSelect = styled(Select)`
  padding: 10px 16px;
  font-size: 0.95em;
  font-weight: 500;
  border: 2px solid ${theme.colors.border.light};
  border-radius: ${theme.borderRadius.md};
  background: linear-gradient(135deg, ${theme.colors.background.main} 0%, ${theme.colors.background.secondary} 100%);
  color: ${theme.colors.text.primary};
  transition: all ${theme.transitions.normal};
  cursor: pointer;
  box-shadow: ${theme.shadows.sm};
  
  &:hover {
    border-color: ${theme.colors.primary.main};
    box-shadow: ${theme.shadows.md};
    transform: translateY(-2px);
  }
  
  &:focus {
    outline: none;
    border-color: ${theme.colors.primary.main};
    box-shadow: 0 0 0 3px ${theme.colors.primary.main}15;
  }
  
  option {
    background: ${theme.colors.background.main};
    color: ${theme.colors.text.primary};
    padding: 8px;
  }

  option[value=""] {
    color: ${theme.colors.text.secondary};
    font-style: italic;
    font-weight: 600;
  }
`;

const ResetButton = styled(Button)`
  padding: 10px 20px;
  font-weight: 600;
  border-radius: ${theme.borderRadius.md};
  transition: all ${theme.transitions.normal};
  background: linear-gradient(135deg, ${theme.colors.background.secondary} 0%, ${theme.colors.background.tertiary} 100%);
  border: 2px solid ${theme.colors.border.medium};
  box-shadow: ${theme.shadows.sm};
  
  &:hover {
    background: linear-gradient(135deg, ${theme.colors.primary.light}10 0%, ${theme.colors.primary.main}08 100%);
    border-color: ${theme.colors.primary.main};
    transform: translateY(-2px);
    box-shadow: ${theme.shadows.md};
  }
`;

const Tooltip = styled.div`
  position: relative;
  display: inline-block;
  overflow: visible;
  
  &:hover .tooltip-content {
    visibility: visible;
    opacity: 1;
  }
`;

const TooltipContent = styled.div`
  visibility: hidden;
  opacity: 0;
  position: absolute;
  z-index: 10000;
  bottom: calc(100% + 10px);
  left: 50%;
  transform: translateX(-50%);
  background-color: ${theme.colors.text.primary};
  color: ${theme.colors.text.white};
  text-align: left;
  border-radius: ${theme.borderRadius.sm};
  padding: 10px 14px;
  font-size: 0.85em;
  white-space: normal;
  min-width: 200px;
  max-width: 350px;
  box-shadow: ${theme.shadows.lg};
  transition: opacity ${theme.transitions.normal};
  line-height: 1.4;
  pointer-events: none;
  
  &:after {
    content: "";
    position: absolute;
    top: 100%;
    left: 50%;
    margin-left: -5px;
    border-width: 5px;
    border-style: solid;
    border-color: ${theme.colors.text.primary} transparent transparent transparent;
  }
`;

const FilterWithTooltip = styled.div`
  position: relative;
  display: inline-block;
`;

const StyledFiltersContainer = styled(FiltersContainer)`
  background: linear-gradient(135deg, ${theme.colors.background.secondary} 0%, ${theme.colors.background.tertiary} 100%);
  border: 1px solid ${theme.colors.border.light};
  box-shadow: ${theme.shadows.md};
  padding: ${theme.spacing.lg};
  animation: ${fadeIn} 0.3s ease-out;
`;

const SchemaActionSelect = styled(FilterSelect)`
  background: linear-gradient(135deg, ${theme.colors.primary.light}08 0%, ${theme.colors.primary.main}05 100%);
  border-color: ${theme.colors.primary.main}40;
  color: ${theme.colors.primary.main};
  font-weight: 600;
  
  &:hover {
    border-color: ${theme.colors.primary.main};
    background: linear-gradient(135deg, ${theme.colors.primary.main}15 0%, ${theme.colors.primary.light}10 100%);
    transform: translateY(-2px);
    box-shadow: ${theme.shadows.md};
  }
`;

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
    <Container>
      <Header>DataLake Catalog Manager</Header>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      <SearchContainer>
        <SearchInput
          type="text"
          placeholder="Search by schema name, table name, or cluster name..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === "Enter") {
              setSearch(searchInput);
            }
          }}
        />
        <SearchButton
          $variant="primary"
          onClick={() => {
            setSearch(searchInput);
          }}
        >
          Search
        </SearchButton>
        {(search || searchInput) && (
          <ClearSearchButton
            $variant="secondary"
            onClick={() => {
              setSearch("");
              setSearchInput("");
            }}
          >
            Clear
          </ClearSearchButton>
        )}
      </SearchContainer>

      <StyledFiltersContainer>
        <FilterWithTooltip>
          <Tooltip>
            <FilterSelect
              value={filters.engine as string}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                setFilter("engine", e.target.value);
              }}
            >
              <option value="">All Engines ({availableEngines.length})</option>
              {availableEngines.map((engine) => (
                <option key={engine} value={engine}>
                  {engine}
                </option>
              ))}
            </FilterSelect>
            <TooltipContent className="tooltip-content">
              Filter tables by database engine type. Shows only engines that exist in the catalog.
            </TooltipContent>
          </Tooltip>
        </FilterWithTooltip>

        <FilterWithTooltip>
          <Tooltip>
            <FilterSelect
              value={filters.status as string}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                setFilter("status", e.target.value);
              }}
            >
              <option value="">All Status ({availableStatuses.length})</option>
              {availableStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </FilterSelect>
            <TooltipContent className="tooltip-content">
              Filter tables by synchronization status. Shows only statuses that exist in the catalog.
            </TooltipContent>
          </Tooltip>
        </FilterWithTooltip>

        <FilterWithTooltip>
          <Tooltip>
            <FilterSelect
              value={filters.active as string}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                setFilter("active", e.target.value);
              }}
            >
              <option value="">All States</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </FilterSelect>
            <TooltipContent className="tooltip-content">
              Filter tables by active state. Active tables are processed during synchronization.
            </TooltipContent>
          </Tooltip>
        </FilterWithTooltip>

        <FilterWithTooltip>
          <Tooltip>
            <FilterSelect
              value={filters.strategy as string}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                setFilter("strategy", e.target.value);
              }}
            >
              <option value="">All Strategies ({availableStrategies.length})</option>
              {availableStrategies.map((strategy) => (
                <option key={strategy} value={strategy}>
                  {strategy === "PK" ? "Primary Key" : strategy === "OFFSET" ? "Offset" : strategy === "CDC" ? "CDC" : strategy}
                </option>
              ))}
            </FilterSelect>
            <TooltipContent className="tooltip-content">
              Filter tables by primary key strategy. Shows only strategies that exist in the catalog.
            </TooltipContent>
          </Tooltip>
        </FilterWithTooltip>

        <Tooltip>
          <ResetButton
            $variant="secondary"
            onClick={() => {
              clearFilters();
              setSearch("");
              setSearchInput("");
            }}
          >
            Reset All
          </ResetButton>
          <TooltipContent className="tooltip-content">
            Clear all filters and search terms to show all catalog entries.
          </TooltipContent>
        </Tooltip>

        <FilterWithTooltip>
          <Tooltip>
            <SchemaActionSelect
              defaultValue=""
              data-schema-action
              onChange={(e) => handleSchemaAction(e.target.value)}
            >
              <option value="">Deactivate Schema</option>
              {availableSchemas.map((schema) => (
                <option key={schema} value={schema}>
                  Deactivate {schema}
                </option>
              ))}
            </SchemaActionSelect>
            <TooltipContent className="tooltip-content">
              Deactivate all tables in a schema. This will set status to SKIP and reset offsets. This action cannot be undone.
            </TooltipContent>
          </Tooltip>
        </FilterWithTooltip>
      </StyledFiltersContainer>

      <TableActions>
        <PaginationInfo>
          Total: {allEntries.length} entries
        </PaginationInfo>
        <div style={{ display: 'flex', gap: theme.spacing.sm }}>
          <Button
            $variant="primary"
            onClick={() => setShowAddModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            Add Table
          </Button>
          <ExportButton $variant="secondary" onClick={handleExportCSV}>
            Export CSV
          </ExportButton>
        </div>
      </TableActions>

      {loadingTree ? (
        <LoadingOverlay>Loading tree view...</LoadingOverlay>
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
    </Container>
  );
};

export default Catalog;
