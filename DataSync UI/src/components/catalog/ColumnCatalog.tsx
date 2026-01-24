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
import ColumnCatalogCharts from './ColumnCatalogCharts';



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
  const [showMetricsPlaybook, setShowMetricsPlaybook] = useState(false);
  const [activeView, setActiveView] = useState<'list' | 'charts'>('list');
  const isMountedRef = useRef(true);

  const fetchAllColumns = useCallback(async () => {
    if (!isMountedRef.current) return;
    try {
      setLoadingTree(true);
      setError(null);
      const sanitizedSearch = sanitizeSearch(filters.search as string, 100);
      const [columnsData, metricsData, schemasData] = await Promise.all([
        columnCatalogApi.getColumns({
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
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: theme.spacing.lg,
          paddingBottom: theme.spacing.md,
          borderBottom: `2px solid ${asciiColors.accent}`
        }}>
          <h1 style={{
            fontSize: 14,
            fontWeight: 600,
            margin: 0,
            color: asciiColors.foreground,
            textTransform: 'uppercase',
            fontFamily: 'Consolas'
          }}>
            <span style={{ color: asciiColors.accent, marginRight: theme.spacing.sm }}>{ascii.blockFull}</span>
            COLUMN CATALOG
          </h1>
        </div>
        <LoadingOverlay>Loading column catalog data...</LoadingOverlay>
      </Container>
    );
  }

  return (
    <Container>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
        paddingBottom: theme.spacing.md,
        borderBottom: `2px solid ${asciiColors.accent}`
      }}>
        <h1 style={{
          fontSize: 14,
          fontWeight: 600,
          margin: 0,
          color: asciiColors.foreground,
          textTransform: 'uppercase',
          fontFamily: 'Consolas'
        }}>
          <span style={{ color: asciiColors.accent, marginRight: theme.spacing.sm }}>{ascii.blockFull}</span>
          COLUMN CATALOG
        </h1>
      </div>
      
      {error && (
        <div style={{ marginBottom: theme.spacing.md }}>
          <AsciiPanel title="ERROR">
            <div style={{
              padding: theme.spacing.sm,
              color: asciiColors.foreground,
              fontSize: 12,
              fontFamily: 'Consolas',
              backgroundColor: asciiColors.backgroundSoft,
              borderRadius: 2
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

      {showMetricsPlaybook && (
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
        onClick={() => setShowMetricsPlaybook(false)}
        >
          <div style={{
            width: '90%',
            maxWidth: 900,
            maxHeight: '90vh',
            overflowY: 'auto'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <style>{`
              div[style*="overflowY"]::-webkit-scrollbar {
                width: 0px;
                display: none;
              }
              div[style*="overflowY"] {
                -ms-overflow-style: none;
                scrollbar-width: none;
              }
            `}</style>
            <AsciiPanel title="METRICS PLAYBOOK">
          <div style={{ padding: theme.spacing.md, fontFamily: 'Consolas', fontSize: 12, lineHeight: 1.6 }}>
            <div style={{ marginBottom: theme.spacing.md }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.accent, marginBottom: theme.spacing.sm, fontFamily: 'Consolas' }}>
                {ascii.blockFull} Total Columns
              </div>
              <div style={{ color: asciiColors.foreground, marginLeft: theme.spacing.md, fontSize: 11, fontFamily: 'Consolas' }}>
                Total number of columns cataloged across all schemas, tables, and database engines in the system.
              </div>
            </div>

            <div style={{ marginBottom: theme.spacing.md }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.foreground, marginBottom: theme.spacing.sm, fontFamily: 'Consolas' }}>
                {ascii.blockFull} PII Columns
              </div>
              <div style={{ color: asciiColors.foreground, marginLeft: theme.spacing.md, fontSize: 11, fontFamily: 'Consolas' }}>
                Columns containing Personally Identifiable Information (PII) such as names, emails, phone numbers, SSNs, etc. 
                Detected through pattern matching and confidence scoring.
              </div>
            </div>

            <div style={{ marginBottom: theme.spacing.md }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.foreground, marginBottom: theme.spacing.sm, fontFamily: 'Consolas' }}>
                {ascii.blockFull} PHI Columns
              </div>
              <div style={{ color: asciiColors.foreground, marginLeft: theme.spacing.md, fontSize: 11, fontFamily: 'Consolas' }}>
                Columns containing Protected Health Information (PHI) such as medical records, patient IDs, diagnoses, etc. 
                Subject to HIPAA regulations and requires special handling.
              </div>
            </div>

            <div style={{ marginBottom: theme.spacing.md }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.muted, marginBottom: theme.spacing.sm, fontFamily: 'Consolas' }}>
                {ascii.blockFull} High Sensitivity
              </div>
              <div style={{ color: asciiColors.foreground, marginLeft: theme.spacing.md, fontSize: 11, fontFamily: 'Consolas' }}>
                Columns marked with HIGH sensitivity level, indicating they contain sensitive data requiring enhanced security measures, 
                access controls, and compliance monitoring.
              </div>
            </div>

            <div style={{ marginBottom: theme.spacing.md }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.accent, marginBottom: theme.spacing.sm, fontFamily: 'Consolas' }}>
                {ascii.blockFull} Primary Keys
              </div>
              <div style={{ color: asciiColors.foreground, marginLeft: theme.spacing.md, fontSize: 11, fontFamily: 'Consolas' }}>
                Columns defined as primary keys in their respective tables. Primary keys uniquely identify each row and are 
                essential for data integrity and relationship mapping.
              </div>
            </div>

            <div style={{ marginBottom: theme.spacing.md }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.accent, marginBottom: theme.spacing.sm, fontFamily: 'Consolas' }}>
                {ascii.blockFull} Indexed Columns
              </div>
              <div style={{ color: asciiColors.foreground, marginLeft: theme.spacing.md, fontSize: 11, fontFamily: 'Consolas' }}>
                Columns that have database indexes created on them. Indexed columns improve query performance but may require 
                additional storage and maintenance overhead.
              </div>
            </div>

            <div style={{ 
              marginTop: theme.spacing.lg, 
              padding: theme.spacing.md, 
              background: asciiColors.background, 
              borderRadius: 2,
              border: `1px solid ${asciiColors.accent}`
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.accent, marginBottom: theme.spacing.sm, paddingBottom: theme.spacing.xs, borderBottom: `1px solid ${asciiColors.border}`, fontFamily: 'Consolas' }}>
                {ascii.blockFull} PROFILING QUALITY SCORE
              </div>
              <div style={{ fontSize: 11, color: asciiColors.foreground, lineHeight: 1.6, fontFamily: 'Consolas' }}>
                <div style={{ marginBottom: theme.spacing.sm }}>
                  <strong>What is it?</strong><br/>
                  The Profiling Quality Score (0-100) measures how comprehensively a column has been analyzed and profiled. 
                  Higher scores indicate more complete data profiling with richer statistical insights.
                </div>
                <div style={{ marginBottom: theme.spacing.sm }}>
                  <strong>How is it calculated?</strong><br/>
                  The score is computed based on multiple factors:
                </div>
                <div style={{ marginLeft: theme.spacing.md, marginBottom: theme.spacing.sm }}>
                  <div style={{ marginBottom: theme.spacing.xs }}>• <strong>Basic Statistics (20 points):</strong> Min, Max, Average, Null count, Distinct count</div>
                  <div style={{ marginBottom: theme.spacing.xs }}>• <strong>Advanced Statistics (25 points):</strong> Median, Std Deviation, Mode, Percentiles (P25, P75, P90, P95, P99)</div>
                  <div style={{ marginBottom: theme.spacing.xs }}>• <strong>Distribution Analysis (20 points):</strong> Value distribution histogram, Top values frequency</div>
                  <div style={{ marginBottom: theme.spacing.xs }}>• <strong>Pattern Detection (15 points):</strong> Detected data patterns (EMAIL, PHONE, DATE, UUID, etc.)</div>
                  <div style={{ marginBottom: theme.spacing.xs }}>• <strong>Anomaly Detection (10 points):</strong> Outlier detection and anomaly identification</div>
                  <div style={{ marginBottom: theme.spacing.xs }}>• <strong>Data Quality (10 points):</strong> Completeness, consistency, and data quality metrics</div>
                </div>
                <div style={{ marginBottom: theme.spacing.sm }}>
                  <strong>Score Interpretation:</strong>
                </div>
                <div style={{ marginLeft: theme.spacing.md, marginBottom: theme.spacing.sm }}>
                  <div style={{ marginBottom: theme.spacing.xs }}>• <strong style={{ color: asciiColors.accent }}>90-100:</strong> Excellent - Comprehensive profiling with all metrics available</div>
                  <div style={{ marginBottom: theme.spacing.xs }}>• <strong style={{ color: asciiColors.muted }}>70-89:</strong> Good - Most profiling metrics available, minor gaps</div>
                  <div style={{ marginBottom: theme.spacing.xs }}>• <strong style={{ color: asciiColors.foreground }}>0-69:</strong> Needs Improvement - Limited profiling, basic statistics only</div>
                </div>
                <div style={{ marginTop: theme.spacing.md, marginBottom: theme.spacing.sm }}>
                  <strong>Benefits of High Scores:</strong>
                </div>
                <div style={{ marginLeft: theme.spacing.md, marginBottom: theme.spacing.sm }}>
                  <div style={{ marginBottom: theme.spacing.xs }}>• <strong>Better Data Understanding:</strong> Complete statistical insights help identify data quality issues, outliers, and patterns early</div>
                  <div style={{ marginBottom: theme.spacing.xs }}>• <strong>Improved Decision Making:</strong> Rich metadata enables better schema design, query optimization, and data modeling decisions</div>
                  <div style={{ marginBottom: theme.spacing.xs }}>• <strong>Enhanced Data Governance:</strong> Comprehensive profiling supports compliance, data lineage tracking, and regulatory reporting</div>
                  <div style={{ marginBottom: theme.spacing.xs }}>• <strong>Optimized Performance:</strong> Distribution analysis and pattern detection help optimize indexes, partitions, and query strategies</div>
                  <div style={{ marginBottom: theme.spacing.xs }}>• <strong>Risk Mitigation:</strong> Anomaly detection and quality metrics enable proactive identification of data issues before they impact operations</div>
                  <div style={{ marginBottom: theme.spacing.xs }}>• <strong>Cost Efficiency:</strong> Better data understanding reduces storage costs, improves query performance, and minimizes data processing errors</div>
                </div>
                <div style={{ marginTop: theme.spacing.sm, padding: theme.spacing.sm, background: asciiColors.backgroundSoft, borderRadius: 2, fontSize: 10, color: asciiColors.muted, fontFamily: 'Consolas' }}>
                  {ascii.blockSemi} Tip: Re-run profiling analysis to improve scores for columns with low quality scores.
                </div>
              </div>
            </div>

            <div style={{ 
              marginTop: theme.spacing.md, 
              padding: theme.spacing.sm, 
              background: asciiColors.backgroundSoft, 
              borderRadius: 2,
              border: `1px solid ${asciiColors.border}`
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: asciiColors.muted, marginBottom: theme.spacing.xs, fontFamily: 'Consolas' }}>
                {ascii.blockSemi} Note
              </div>
              <div style={{ fontSize: 11, color: asciiColors.foreground, fontFamily: 'Consolas' }}>
                These metrics are calculated in real-time from the column_catalog table and reflect the current state of your data catalog.
              </div>
            </div>

            <div style={{ marginTop: theme.spacing.md, textAlign: 'right' }}>
              <AsciiButton
                label="Close"
                onClick={() => setShowMetricsPlaybook(false)}
                variant="ghost"
              />
            </div>
          </div>
          </AsciiPanel>
          </div>
        </div>
      )}

      <AsciiPanel title="FILTERS">
        <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            value={filters.schema_name as string}
            onChange={(e) => handleFilterChange('schema_name', e.target.value)}
            style={{
              padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2,
              fontFamily: 'Consolas',
              fontSize: 12,
              backgroundColor: asciiColors.background,
              color: asciiColors.foreground,
              cursor: 'pointer',
              outline: 'none',
              transition: 'border-color 0.15s ease'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = asciiColors.accent;
              e.target.style.outline = `2px solid ${asciiColors.accent}`;
              e.target.style.outlineOffset = '2px';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = asciiColors.border;
              e.target.style.outline = 'none';
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
              padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2,
              fontFamily: 'Consolas',
              fontSize: 12,
              backgroundColor: asciiColors.background,
              color: asciiColors.foreground,
              opacity: !filters.schema_name ? 0.5 : 1,
              cursor: !filters.schema_name ? 'not-allowed' : 'pointer',
              outline: 'none',
              transition: 'border-color 0.15s ease'
            }}
            onFocus={(e) => {
              if (filters.schema_name) {
                e.target.style.borderColor = asciiColors.accent;
                e.target.style.outline = `2px solid ${asciiColors.accent}`;
                e.target.style.outlineOffset = '2px';
              }
            }}
            onBlur={(e) => {
              e.target.style.borderColor = asciiColors.border;
              e.target.style.outline = 'none';
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
              padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2,
              fontFamily: 'Consolas',
              fontSize: 12,
              backgroundColor: asciiColors.background,
              color: asciiColors.foreground,
              cursor: 'pointer',
              outline: 'none',
              transition: 'border-color 0.15s ease'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = asciiColors.accent;
              e.target.style.outline = `2px solid ${asciiColors.accent}`;
              e.target.style.outlineOffset = '2px';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = asciiColors.border;
              e.target.style.outline = 'none';
            }}
          >
            <option value="">All Engines</option>
            <option value="PostgreSQL">PostgreSQL</option>
            <option value="MariaDB">MariaDB</option>
            <option value="MSSQL">MSSQL</option>
            <option value="MongoDB">MongoDB</option>
            <option value="Oracle">Oracle</option>
            <option value="DB2">DB2</option>
            <option value="Salesforce">Salesforce</option>
            <option value="SAP">SAP</option>
            <option value="Teradata">Teradata</option>
            <option value="Netezza">Netezza</option>
            <option value="Hive">Hive</option>
            <option value="Cassandra">Cassandra</option>
            <option value="DynamoDB">DynamoDB</option>
            <option value="AS400">AS/400</option>
            <option value="S3">S3</option>
            <option value="AzureBlob">Azure Blob</option>
            <option value="GCS">Google Cloud Storage</option>
            <option value="FTP">FTP</option>
            <option value="SFTP">SFTP</option>
            <option value="Email">Email</option>
            <option value="SOAP">SOAP</option>
            <option value="GraphQL">GraphQL</option>
            <option value="Excel">Excel</option>
            <option value="FixedWidth">Fixed Width</option>
            <option value="EBCDIC">EBCDIC</option>
            <option value="XML">XML</option>
            <option value="Avro">Avro</option>
            <option value="Parquet">Parquet</option>
            <option value="ORC">ORC</option>
            <option value="Compressed">Compressed</option>
          </select>
          
          <select
            value={filters.data_type as string}
            onChange={(e) => handleFilterChange('data_type', e.target.value)}
            style={{
              padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2,
              fontFamily: 'Consolas',
              fontSize: 12,
              backgroundColor: asciiColors.background,
              color: asciiColors.foreground,
              cursor: 'pointer',
              outline: 'none',
              transition: 'border-color 0.15s ease'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = asciiColors.accent;
              e.target.style.outline = `2px solid ${asciiColors.accent}`;
              e.target.style.outlineOffset = '2px';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = asciiColors.border;
              e.target.style.outline = 'none';
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
              padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2,
              fontFamily: 'Consolas',
              fontSize: 12,
              backgroundColor: asciiColors.background,
              color: asciiColors.foreground,
              cursor: 'pointer',
              outline: 'none',
              transition: 'border-color 0.15s ease'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = asciiColors.accent;
              e.target.style.outline = `2px solid ${asciiColors.accent}`;
              e.target.style.outlineOffset = '2px';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = asciiColors.border;
              e.target.style.outline = 'none';
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
              padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2,
              fontFamily: 'Consolas',
              fontSize: 12,
              backgroundColor: asciiColors.background,
              color: asciiColors.foreground,
              cursor: 'pointer',
              outline: 'none',
              transition: 'border-color 0.15s ease'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = asciiColors.accent;
              e.target.style.outline = `2px solid ${asciiColors.accent}`;
              e.target.style.outlineOffset = '2px';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = asciiColors.border;
              e.target.style.outline = 'none';
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
              padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2,
              fontFamily: 'Consolas',
              fontSize: 12,
              backgroundColor: asciiColors.background,
              color: asciiColors.foreground,
              outline: 'none',
              transition: 'border-color 0.15s ease'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = asciiColors.accent;
              e.target.style.outline = `2px solid ${asciiColors.accent}`;
              e.target.style.outlineOffset = '2px';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = asciiColors.border;
              e.target.style.outline = 'none';
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
        justifyContent: 'flex-end', 
        alignItems: 'center', 
        marginBottom: theme.spacing.lg,
        marginTop: theme.spacing.sm,
        fontFamily: 'Consolas',
        fontSize: 12,
        gap: theme.spacing.lg
      }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <AsciiButton
            label={activeView === 'list' ? 'Show Charts' : 'Show List'}
            onClick={() => setActiveView(activeView === 'list' ? 'charts' : 'list')}
            variant={activeView === 'charts' ? 'primary' : 'ghost'}
          />
          <AsciiButton
            label="Metrics Info"
            onClick={() => setShowMetricsPlaybook(true)}
            variant="ghost"
          />
          <AsciiButton
            label="Export CSV"
            onClick={handleExportCSV}
            variant="ghost"
          />
        </div>
      </div>

      {activeView === 'charts' && (
        <ColumnCatalogCharts />
      )}

      {activeView === 'list' && loadingTree ? (
        <LoadingOverlay>Loading tree view...</LoadingOverlay>
      ) : activeView === 'list' ? (
        <ColumnCatalogTreeView 
          columns={allColumns}
          onColumnClick={(column) => toggleColumn(column.id)}
        />
      ) : null}
    </Container>
  );
};

export default ColumnCatalog;
