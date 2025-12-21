import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import styled from 'styled-components';
import {
  Container,
  Header,
  ErrorMessage,
  LoadingOverlay,
  Grid,
  Value,
  Button,
  FiltersContainer,
  Select,
  Input,
} from '../shared/BaseComponents';
import { useTableFilters } from '../../hooks/useTableFilters';
import { columnCatalogApi } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import { sanitizeSearch } from '../../utils/validation';
import { theme } from '../../theme/theme';
import ColumnCatalogTreeView from './ColumnCatalogTreeView';

const MetricsGrid = styled(Grid)`
  margin-bottom: ${theme.spacing.xxl};
  animation: slideUp 0.25s ease-out;
  animation-delay: 0.1s;
  animation-fill-mode: both;
`;

const MetricCard = styled(Value)`
  padding: ${theme.spacing.md};
  min-height: 80px;
`;

const MetricLabel = styled.div`
  font-size: 0.85em;
  color: ${theme.colors.text.secondary};
  margin-bottom: ${theme.spacing.xs};
  font-weight: 500;
`;

const MetricValue = styled.div`
  font-size: 1.5em;
  font-weight: bold;
  color: ${theme.colors.text.primary};
`;

const Tooltip = styled.div`
  position: relative;
  display: inline-block;
  
  &:hover .tooltip-content {
    visibility: visible;
    opacity: 1;
  }
`;

const TooltipContent = styled.div`
  visibility: hidden;
  opacity: 0;
  position: absolute;
  z-index: 1000;
  bottom: 125%;
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

const TableActions = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.md};
  gap: ${theme.spacing.sm};
`;

const ExportButton = styled(Button)`
  padding: 8px 16px;
  font-size: 0.9em;
  display: flex;
  align-items: center;
  gap: 6px;
`;


/**
 * Column Catalog component
 * Displays detailed metadata about database columns including data types, sensitivity levels, and PII/PHI flags
 */
const ColumnCatalog = () => {
  const { filters, setFilter, clearFilters } = useTableFilters({
    schema_name: '',
    table_name: '',
    db_engine: '',
    data_type: '',
    sensitivity_level: '',
    contains_pii: '',
    contains_phi: '',
    search: ''
  });
  
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<any>({});
  const [openColumnId, setOpenColumnId] = useState<number | null>(null);
  const [schemas, setSchemas] = useState<string[]>([]);
  const [tables, setTables] = useState<string[]>([]);
  const [allColumns, setAllColumns] = useState<any[]>([]);
  const [loadingTree, setLoadingTree] = useState(false);
  const isMountedRef = useRef(true);

  const fetchAllColumns = useCallback(async () => {
    if (!isMountedRef.current) return;
    try {
      setLoadingTree(true);
      setError(null);
      const sanitizedSearch = sanitizeSearch(filters.search as string, 100);
      const [columnsData, metricsData, schemasData] = await Promise.all([
        columnCatalogApi.getColumns({
          page: 1,
          limit: 10000,
          schema_name: filters.schema_name as string,
          table_name: filters.table_name as string,
          db_engine: filters.db_engine as string,
          data_type: filters.data_type as string,
          sensitivity_level: filters.sensitivity_level as string,
          contains_pii: filters.contains_pii as string,
          contains_phi: filters.contains_phi as string,
          search: sanitizedSearch
        }),
        columnCatalogApi.getMetrics(),
        columnCatalogApi.getSchemas()
      ]);
      if (isMountedRef.current) {
        setAllColumns(columnsData.data || []);
        setMetrics(metricsData || {});
        setSchemas(schemasData || []);
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
  }, [
    filters.schema_name,
    filters.table_name,
    filters.db_engine,
    filters.data_type,
    filters.sensitivity_level,
    filters.contains_pii,
    filters.contains_phi,
    filters.search
  ]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchAllColumns();
    const interval = setInterval(() => {
      if (isMountedRef.current) {
        fetchAllColumns();
      }
    }, 30000);
    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchAllColumns]);

  useEffect(() => {
    const fetchTables = async () => {
      if (filters.schema_name && isMountedRef.current) {
        try {
          const tablesData = await columnCatalogApi.getTables(filters.schema_name as string);
          if (isMountedRef.current) {
            setTables(tablesData || []);
          }
        } catch (err) {
          if (isMountedRef.current) {
            console.error('Error loading tables:', err);
          }
        }
      } else {
        setTables([]);
      }
    };
    fetchTables();
  }, [filters.schema_name]);

  const toggleColumn = useCallback((id: number) => {
    setOpenColumnId(prev => prev === id ? null : id);
  }, []);

  const formatNumber = useCallback((num: number | string | null | undefined) => {
    if (num === null || num === undefined) return 'N/A';
    const numVal = Number(num);
    if (isNaN(numVal)) return 'N/A';
    if (numVal >= 1000000) return `${(numVal / 1000000).toFixed(2)}M`;
    if (numVal >= 1000) return `${(numVal / 1000).toFixed(2)}K`;
    return numVal.toString();
  }, []);

  const formatPercentage = useCallback((val: number | string | null | undefined) => {
    if (val === null || val === undefined) return 'N/A';
    const numVal = Number(val);
    if (isNaN(numVal)) return 'N/A';
    return `${numVal.toFixed(2)}%`;
  }, []);

  const formatDate = useCallback((date: string | null | undefined) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString();
  }, []);

  const handleFilterChange = useCallback((key: string, value: string) => {
    setFilter(key as any, value);
    if (key === 'schema_name') {
      setFilter('table_name' as any, '');
    }
  }, [setFilter]);

  const handleResetFilters = useCallback(() => {
    clearFilters();
  }, [clearFilters]);

  const handleExportCSV = useCallback(() => {
    const headers = ["Schema", "Table", "Column", "Engine", "Data Type", "Position", "Nullable", "Sensitivity", "PII", "PHI", "Primary Key", "Foreign Key", "Unique", "Indexed"];
    const rows = allColumns.map(col => [
      col.schema_name,
      col.table_name,
      col.column_name,
      col.db_engine || "",
      col.data_type || "",
      col.ordinal_position || "",
      col.is_nullable ? "Yes" : "No",
      col.sensitivity_level || "",
      col.contains_pii ? "Yes" : "No",
      col.contains_phi ? "Yes" : "No",
      col.is_primary_key ? "Yes" : "No",
      col.is_foreign_key ? "Yes" : "No",
      col.is_unique ? "Yes" : "No",
      col.is_indexed ? "Yes" : "No"
    ]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `column_catalog_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [allColumns]);

  if (loadingTree && allColumns.length === 0) {
    return (
      <Container>
        <Header>Column Catalog</Header>
        <LoadingOverlay>Loading column catalog data...</LoadingOverlay>
      </Container>
    );
  }

  return (
    <Container>
      <Header>Column Catalog</Header>
      
      {error && <ErrorMessage>{error}</ErrorMessage>}
      
      <MetricsGrid $columns="repeat(auto-fit, minmax(180px, 1fr))">
        <Tooltip>
          <MetricCard>
            <MetricLabel>Total Columns</MetricLabel>
            <MetricValue>{formatNumber(metrics.total_columns)}</MetricValue>
          </MetricCard>
          <TooltipContent className="tooltip-content">
            Total number of columns cataloged across all schemas and tables in the system.
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <MetricCard>
            <MetricLabel>PII Columns</MetricLabel>
            <MetricValue>{formatNumber(metrics.pii_columns)}</MetricValue>
          </MetricCard>
          <TooltipContent className="tooltip-content">
            Columns containing Personally Identifiable Information (PII) such as names, emails, phone numbers, or social security numbers.
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <MetricCard>
            <MetricLabel>PHI Columns</MetricLabel>
            <MetricValue>{formatNumber(metrics.phi_columns)}</MetricValue>
          </MetricCard>
          <TooltipContent className="tooltip-content">
            Columns containing Protected Health Information (PHI) such as medical records, health conditions, or patient identifiers.
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <MetricCard>
            <MetricLabel>High Sensitivity</MetricLabel>
            <MetricValue>{formatNumber(metrics.high_sensitivity)}</MetricValue>
          </MetricCard>
          <TooltipContent className="tooltip-content">
            Columns classified with HIGH sensitivity level, indicating they contain sensitive data requiring special protection.
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <MetricCard>
            <MetricLabel>Primary Keys</MetricLabel>
            <MetricValue>{formatNumber(metrics.primary_keys)}</MetricValue>
          </MetricCard>
          <TooltipContent className="tooltip-content">
            Columns that serve as primary keys, uniquely identifying each row in their respective tables.
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <MetricCard>
            <MetricLabel>Indexed Columns</MetricLabel>
            <MetricValue>{formatNumber(metrics.indexed_columns)}</MetricValue>
          </MetricCard>
          <TooltipContent className="tooltip-content">
            Columns that have database indexes created on them, improving query performance for searches and joins.
          </TooltipContent>
        </Tooltip>
      </MetricsGrid>

      <FiltersContainer>
        <FilterWithTooltip>
          <Tooltip>
            <Select
              value={filters.schema_name as string}
              onChange={(e) => handleFilterChange('schema_name', e.target.value)}
            >
              <option value="">All Schemas</option>
              {schemas.map(schema => (
                <option key={schema} value={schema}>{schema}</option>
              ))}
            </Select>
            <TooltipContent className="tooltip-content">
              Filter columns by database schema. A schema is a logical container that groups related database objects.
            </TooltipContent>
          </Tooltip>
        </FilterWithTooltip>
        
        <FilterWithTooltip>
          <Tooltip>
            <Select
              value={filters.table_name as string}
              onChange={(e) => handleFilterChange('table_name', e.target.value)}
              disabled={!filters.schema_name}
            >
              <option value="">All Tables</option>
              {tables.map(table => (
                <option key={table} value={table}>{table}</option>
              ))}
            </Select>
            <TooltipContent className="tooltip-content">
              Filter columns by table name. Select a schema first to see available tables. A table is a collection of related data organized in rows and columns.
            </TooltipContent>
          </Tooltip>
        </FilterWithTooltip>
        
        <FilterWithTooltip>
          <Tooltip>
            <Select
              value={filters.db_engine as string}
              onChange={(e) => handleFilterChange('db_engine', e.target.value)}
            >
              <option value="">All Engines</option>
              <option value="PostgreSQL">PostgreSQL</option>
              <option value="MariaDB">MariaDB</option>
              <option value="MSSQL">MSSQL</option>
            </Select>
            <TooltipContent className="tooltip-content">
              Filter columns by database engine type. Different engines may have different data type representations and capabilities.
            </TooltipContent>
          </Tooltip>
        </FilterWithTooltip>
        
        <FilterWithTooltip>
          <Tooltip>
            <Select
              value={filters.data_type as string}
              onChange={(e) => handleFilterChange('data_type', e.target.value)}
            >
              <option value="">All Types</option>
              <option value="varchar">VARCHAR</option>
              <option value="integer">INTEGER</option>
              <option value="bigint">BIGINT</option>
              <option value="numeric">NUMERIC</option>
              <option value="timestamp">TIMESTAMP</option>
              <option value="boolean">BOOLEAN</option>
            </Select>
            <TooltipContent className="tooltip-content">
              Filter columns by their data type. Data types define what kind of data can be stored in a column (text, numbers, dates, etc.).
            </TooltipContent>
          </Tooltip>
        </FilterWithTooltip>
        
        <FilterWithTooltip>
          <Tooltip>
            <Select
              value={filters.sensitivity_level as string}
              onChange={(e) => handleFilterChange('sensitivity_level', e.target.value)}
            >
              <option value="">All Sensitivity</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </Select>
            <TooltipContent className="tooltip-content">
              Filter columns by sensitivity classification. HIGH = very sensitive (PII/PHI), MEDIUM = moderately sensitive, LOW = public or non-sensitive data.
            </TooltipContent>
          </Tooltip>
        </FilterWithTooltip>
        
        <FilterWithTooltip>
          <Tooltip>
            <Select
              value={filters.contains_pii as string}
              onChange={(e) => handleFilterChange('contains_pii', e.target.value)}
            >
              <option value="">All PII</option>
              <option value="true">Has PII</option>
              <option value="false">No PII</option>
            </Select>
            <TooltipContent className="tooltip-content">
              Filter columns that contain Personally Identifiable Information (PII). PII includes data that can identify an individual like names, emails, or IDs.
            </TooltipContent>
          </Tooltip>
        </FilterWithTooltip>
        
        <Tooltip>
          <Input
            type="text"
            placeholder="Search column name..."
            value={filters.search as string}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            style={{ flex: 1, minWidth: "200px" }}
          />
          <TooltipContent className="tooltip-content">
            Search for columns by name. This will search across all column names in the catalog.
          </TooltipContent>
        </Tooltip>
        
        <Button
          $variant="secondary"
          onClick={handleResetFilters}
          style={{ padding: "8px 16px", fontSize: "0.9em" }}
        >
          Reset All
        </Button>
      </FiltersContainer>

      <TableActions>
        <div style={{ fontSize: "0.9em", color: theme.colors.text.secondary }}>
          Total: {allColumns.length} columns
        </div>
        <div style={{ display: "flex", gap: theme.spacing.sm, alignItems: "center" }}>
          <ExportButton $variant="secondary" onClick={handleExportCSV}>
            Export CSV
          </ExportButton>
        </div>
      </TableActions>

      {loadingTree ? (
        <LoadingOverlay>Loading tree view...</LoadingOverlay>
      ) : (
        <ColumnCatalogTreeView 
          columns={allColumns}
          onColumnClick={(column) => toggleColumn(column.id)}
        />
      )}
    </Container>
  );
};

export default ColumnCatalog;
