import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import styled from 'styled-components';
import {
  Container,
  LoadingOverlay,
} from '../shared/BaseComponents';
import { useTableFilters } from '../../hooks/useTableFilters';
import { columnCatalogApi } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import { sanitizeSearch } from '../../utils/validation';
import { theme } from '../../theme/theme';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import ColumnCatalogTreeView from './ColumnCatalogTreeView';



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
          COLUMN CATALOG
        </h1>
        <LoadingOverlay>Loading column catalog data...</LoadingOverlay>
      </div>
    );
  }

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
        COLUMN CATALOG
      </h1>
      
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
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
        gap: 12, 
        marginBottom: 24 
      }}>
        <AsciiPanel title="Total Columns">
          <div style={{ fontFamily: 'Consolas', fontSize: 14, fontWeight: 600, color: asciiColors.foreground }}>
            {formatNumber(metrics.total_columns)}
          </div>
        </AsciiPanel>
        <AsciiPanel title="PII Columns">
          <div style={{ fontFamily: 'Consolas', fontSize: 14, fontWeight: 600, color: asciiColors.foreground }}>
            {formatNumber(metrics.pii_columns)}
          </div>
        </AsciiPanel>
        <AsciiPanel title="PHI Columns">
          <div style={{ fontFamily: 'Consolas', fontSize: 14, fontWeight: 600, color: asciiColors.foreground }}>
            {formatNumber(metrics.phi_columns)}
          </div>
        </AsciiPanel>
        <AsciiPanel title="High Sensitivity">
          <div style={{ fontFamily: 'Consolas', fontSize: 14, fontWeight: 600, color: asciiColors.foreground }}>
            {formatNumber(metrics.high_sensitivity)}
          </div>
        </AsciiPanel>
        <AsciiPanel title="Primary Keys">
          <div style={{ fontFamily: 'Consolas', fontSize: 14, fontWeight: 600, color: asciiColors.foreground }}>
            {formatNumber(metrics.primary_keys)}
          </div>
        </AsciiPanel>
        <AsciiPanel title="Indexed Columns">
          <div style={{ fontFamily: 'Consolas', fontSize: 14, fontWeight: 600, color: asciiColors.foreground }}>
            {formatNumber(metrics.indexed_columns)}
          </div>
        </AsciiPanel>
      </div>

      <AsciiPanel title="FILTERS">
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            value={filters.schema_name as string}
            onChange={(e) => handleFilterChange('schema_name', e.target.value)}
            style={{
              padding: '4px 8px',
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2,
              fontFamily: 'Consolas',
              fontSize: 12,
              backgroundColor: asciiColors.background,
              color: asciiColors.foreground
            }}
          >
            <option value="">All Schemas</option>
            {schemas.map(schema => (
              <option key={schema} value={schema}>{schema}</option>
            ))}
          </select>
          
          <select
            value={filters.table_name as string}
            onChange={(e) => handleFilterChange('table_name', e.target.value)}
            disabled={!filters.schema_name}
            style={{
              padding: '4px 8px',
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2,
              fontFamily: 'Consolas',
              fontSize: 12,
              backgroundColor: asciiColors.background,
              color: asciiColors.foreground,
              opacity: !filters.schema_name ? 0.5 : 1
            }}
          >
            <option value="">All Tables</option>
            {tables.map(table => (
              <option key={table} value={table}>{table}</option>
            ))}
          </select>
          
          <select
            value={filters.db_engine as string}
            onChange={(e) => handleFilterChange('db_engine', e.target.value)}
            style={{
              padding: '4px 8px',
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2,
              fontFamily: 'Consolas',
              fontSize: 12,
              backgroundColor: asciiColors.background,
              color: asciiColors.foreground
            }}
          >
            <option value="">All Engines</option>
            <option value="PostgreSQL">PostgreSQL</option>
            <option value="MariaDB">MariaDB</option>
            <option value="MSSQL">MSSQL</option>
            <option value="MongoDB">MongoDB</option>
            <option value="Oracle">Oracle</option>
            <option value="DB2">DB2</option>
          </select>
          
          <select
            value={filters.data_type as string}
            onChange={(e) => handleFilterChange('data_type', e.target.value)}
            style={{
              padding: '4px 8px',
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2,
              fontFamily: 'Consolas',
              fontSize: 12,
              backgroundColor: asciiColors.background,
              color: asciiColors.foreground
            }}
          >
            <option value="">All Types</option>
            <option value="varchar">VARCHAR</option>
            <option value="integer">INTEGER</option>
            <option value="bigint">BIGINT</option>
            <option value="numeric">NUMERIC</option>
            <option value="timestamp">TIMESTAMP</option>
            <option value="boolean">BOOLEAN</option>
          </select>
          
          <select
            value={filters.sensitivity_level as string}
            onChange={(e) => handleFilterChange('sensitivity_level', e.target.value)}
            style={{
              padding: '4px 8px',
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2,
              fontFamily: 'Consolas',
              fontSize: 12,
              backgroundColor: asciiColors.background,
              color: asciiColors.foreground
            }}
          >
            <option value="">All Sensitivity</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
          </select>
          
          <select
            value={filters.contains_pii as string}
            onChange={(e) => handleFilterChange('contains_pii', e.target.value)}
            style={{
              padding: '4px 8px',
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2,
              fontFamily: 'Consolas',
              fontSize: 12,
              backgroundColor: asciiColors.background,
              color: asciiColors.foreground
            }}
          >
            <option value="">All PII</option>
            <option value="true">Has PII</option>
            <option value="false">No PII</option>
          </select>
          
          <input
            type="text"
            placeholder="Search column name..."
            value={filters.search as string}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            style={{
              flex: 1,
              minWidth: '200px',
              padding: '4px 8px',
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2,
              fontFamily: 'Consolas',
              fontSize: 12,
              backgroundColor: asciiColors.background,
              color: asciiColors.foreground
            }}
          />
          
          <AsciiButton
            label="Reset All"
            onClick={handleResetFilters}
            variant="ghost"
          />
        </div>
      </AsciiPanel>

      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 16,
        fontFamily: 'Consolas',
        fontSize: 12
      }}>
        <div style={{ color: asciiColors.muted }}>
          Total: {allColumns.length} columns
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <AsciiButton
            label="Export CSV"
            onClick={handleExportCSV}
            variant="ghost"
          />
        </div>
      </div>

      {loadingTree ? (
        <LoadingOverlay>Loading tree view...</LoadingOverlay>
      ) : (
        <ColumnCatalogTreeView 
          columns={allColumns}
          onColumnClick={(column) => toggleColumn(column.id)}
        />
      )}
    </div>
  );
};

export default ColumnCatalog;
