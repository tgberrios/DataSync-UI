import { useState, useEffect, useCallback, useRef } from 'react';
import styled from 'styled-components';
import {
  Container,
  ErrorMessage,
  LoadingOverlay,
} from '../shared/BaseComponents';
import { useTableFilters } from '../../hooks/useTableFilters';
import { maintenanceApi } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import { theme } from '../../theme/theme';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import MaintenanceTreeView from './MaintenanceTreeView';
import CatalogCleaner from './CatalogCleaner';
import SkeletonLoader from '../shared/SkeletonLoader';


/**
 * Maintenance component
 * Displays database maintenance operations with filtering, tabs, and detailed metrics
 */
const Maintenance = () => {
  const { filters, setFilter } = useTableFilters({
    maintenance_type: '',
    status: '',
    db_engine: ''
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [maintenanceItems, setMaintenanceItems] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>({});
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'completed' | 'all' | 'cleaner'>('pending');
  const [showMaintenancePlaybook, setShowMaintenancePlaybook] = useState(false);
  const isMountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    const startTime = Date.now();
    const minLoadingTime = 300;
    
    try {
      setLoading(true);
      setError(null);
      let statusFilter = filters.status as string;
      if (!statusFilter && activeTab !== 'all') {
        statusFilter = activeTab === 'pending' ? 'PENDING' : activeTab === 'completed' ? 'COMPLETED' : '';
      }
      const [itemsData, metricsData] = await Promise.all([
        maintenanceApi.getMaintenanceItems({
          page: 1,
          limit: 1000,
          maintenance_type: filters.maintenance_type as string,
          db_engine: filters.db_engine as string,
          status: statusFilter
        }),
        maintenanceApi.getMetrics()
      ]);
      
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minLoadingTime - elapsed);
      await new Promise(resolve => setTimeout(resolve, remaining));
      
      if (isMountedRef.current) {
        setMaintenanceItems(itemsData.data || []);
        setMetrics(metricsData || {});
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(extractApiError(err));
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [filters.maintenance_type, filters.db_engine, filters.status, activeTab]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchData();
    const interval = setInterval(() => {
      if (isMountedRef.current) {
        fetchData();
      }
    }, 30000);
    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchData]);

  const handleItemClick = useCallback((item: any) => {
    setSelectedItem((prev: any) => prev?.id === item.id ? null : item);
  }, []);

  const formatBytes = useCallback((mb: number | string | null | undefined) => {
    if (mb === null || mb === undefined) return 'N/A';
    const numMb = Number(mb);
    if (isNaN(numMb)) return 'N/A';
    if (numMb < 1) return `${(numMb * 1024).toFixed(2)} KB`;
    if (numMb < 1024) return `${numMb.toFixed(2)} MB`;
    return `${(numMb / 1024).toFixed(2)} GB`;
  }, []);

  const formatDate = useCallback((date: string | null | undefined) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString();
  }, []);

  const formatDuration = useCallback((seconds: number | string | null | undefined) => {
    if (seconds === null || seconds === undefined) return 'N/A';
    const numSeconds = Number(seconds);
    if (isNaN(numSeconds)) return 'N/A';
    if (numSeconds < 60) return `${numSeconds.toFixed(2)}s`;
    if (numSeconds < 3600) return `${(numSeconds / 60).toFixed(2)}m`;
    return `${(numSeconds / 3600).toFixed(2)}h`;
  }, []);


  const handleFilterChange = useCallback((key: string, value: string) => {
    setFilter(key as any, value);
  }, [setFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return asciiColors.muted;
      case 'RUNNING': return asciiColors.accent;
      case 'COMPLETED': return asciiColors.accent;
      case 'FAILED': return asciiColors.foreground;
      case 'SKIPPED': return asciiColors.muted;
      default: return asciiColors.muted;
    }
  };

  if (loading && maintenanceItems.length === 0) {
    return <SkeletonLoader variant="list" panels={6} />;
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
          MAINTENANCE
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
        gap: theme.spacing.md, 
        marginBottom: theme.spacing.lg 
      }}>
        <AsciiPanel title="Total Pending">
          <div style={{ fontFamily: 'Consolas', fontSize: 14, fontWeight: 600, color: asciiColors.foreground }}>
            {metrics.total_pending || 0}
          </div>
        </AsciiPanel>
        <AsciiPanel title="Total Completed">
          <div style={{ fontFamily: 'Consolas', fontSize: 14, fontWeight: 600, color: asciiColors.foreground }}>
            {metrics.total_completed || 0}
          </div>
        </AsciiPanel>
        <AsciiPanel title="Total Failed">
          <div style={{ fontFamily: 'Consolas', fontSize: 14, fontWeight: 600, color: asciiColors.foreground }}>
            {metrics.total_failed || 0}
          </div>
        </AsciiPanel>
        <AsciiPanel title="Space Reclaimed">
          <div style={{ fontFamily: 'Consolas', fontSize: 14, fontWeight: 600, color: asciiColors.foreground }}>
            {formatBytes(metrics.total_space_reclaimed_mb)}
          </div>
        </AsciiPanel>
        <AsciiPanel title="Avg Impact Score">
          <div style={{ fontFamily: 'Consolas', fontSize: 14, fontWeight: 600, color: asciiColors.foreground }}>
            {metrics.avg_impact_score ? `${Number(metrics.avg_impact_score).toFixed(1)}` : 'N/A'}
          </div>
        </AsciiPanel>
        <AsciiPanel title="Objects Improved">
          <div style={{ fontFamily: 'Consolas', fontSize: 14, fontWeight: 600, color: asciiColors.foreground }}>
            {metrics.objects_improved || 0}
          </div>
        </AsciiPanel>
      </div>

      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: theme.spacing.sm, 
        marginBottom: theme.spacing.md, 
        borderBottom: `1px solid ${asciiColors.border}`, 
        paddingBottom: theme.spacing.sm 
      }}>
        <div style={{ display: 'flex', gap: theme.spacing.sm }}>
          <AsciiButton 
            label={`Pending (${metrics.total_pending || 0})`}
            onClick={() => setActiveTab('pending')}
            variant={activeTab === 'pending' ? 'primary' : 'ghost'}
          />
          <AsciiButton 
            label={`Completed (${metrics.total_completed || 0})`}
            onClick={() => setActiveTab('completed')}
            variant={activeTab === 'completed' ? 'primary' : 'ghost'}
          />
          <AsciiButton 
            label="All"
            onClick={() => setActiveTab('all')}
            variant={activeTab === 'all' ? 'primary' : 'ghost'}
          />
          <AsciiButton 
            label="Catalog Cleaner"
            onClick={() => setActiveTab('cleaner')}
            variant={activeTab === 'cleaner' ? 'primary' : 'ghost'}
          />
        </div>
        <AsciiButton
          label="Maintenance Info"
          onClick={() => setShowMaintenancePlaybook(true)}
          variant="ghost"
        />
      </div>

      {showMaintenancePlaybook && (
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
        onClick={() => setShowMaintenancePlaybook(false)}
        >
          <div style={{
            width: '90%',
            maxWidth: 1000,
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
            <AsciiPanel title="MAINTENANCE PLAYBOOK">
              <div style={{ padding: theme.spacing.md, fontFamily: 'Consolas', fontSize: 12, lineHeight: 1.6 }}>
                <div style={{ marginBottom: theme.spacing.lg }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: theme.spacing.sm, fontFamily: 'Consolas' }}>
                    {ascii.blockFull} OVERVIEW
                  </div>
                  <div style={{ color: asciiColors.foreground, marginLeft: theme.spacing.md, fontSize: 11, fontFamily: 'Consolas' }}>
                    Database maintenance operations are automated tasks that optimize database performance, reclaim storage space, 
                    and ensure data integrity. The system automatically detects maintenance needs and executes operations based on 
                    configured thresholds and schedules.
                  </div>
                </div>

                <div style={{ marginBottom: theme.spacing.lg }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: theme.spacing.sm, fontFamily: 'Consolas' }}>
                    {ascii.blockFull} MAINTENANCE TYPES
                  </div>
                  
                  <div style={{ marginLeft: theme.spacing.md }}>
                    <div style={{ marginBottom: theme.spacing.md }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.accent, marginBottom: theme.spacing.xs, fontFamily: 'Consolas' }}>
                        {ascii.blockSemi} VACUUM
                      </div>
                      <div style={{ color: asciiColors.foreground, marginLeft: theme.spacing.md, fontSize: 11, fontFamily: 'Consolas' }}>
                        Reclaims storage space by removing dead tuples (deleted or updated rows) and updating statistics. 
                        Essential for PostgreSQL to prevent table bloat and maintain query performance. Can be run in FULL mode 
                        (locks table) or regular mode (concurrent).
                      </div>
                    </div>

                    <div style={{ marginBottom: theme.spacing.md }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.accent, marginBottom: theme.spacing.xs, fontFamily: 'Consolas' }}>
                        {ascii.blockSemi} ANALYZE
                      </div>
                      <div style={{ color: asciiColors.foreground, marginLeft: theme.spacing.md, fontSize: 11, fontFamily: 'Consolas' }}>
                        Updates table statistics used by the query planner to generate optimal execution plans. Analyzes column 
                        distributions, null counts, and value frequencies. Should be run regularly after significant data changes.
                      </div>
                    </div>

                    <div style={{ marginBottom: theme.spacing.md }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.accent, marginBottom: theme.spacing.xs, fontFamily: 'Consolas' }}>
                        {ascii.blockSemi} REINDEX
                      </div>
                      <div style={{ color: asciiColors.foreground, marginLeft: theme.spacing.md, fontSize: 11, fontFamily: 'Consolas' }}>
                        Rebuilds indexes to eliminate fragmentation and improve index efficiency. Useful when indexes become 
                        bloated or fragmented over time. Can reclaim significant space and improve query performance.
                      </div>
                    </div>

                    <div style={{ marginBottom: theme.spacing.md }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.accent, marginBottom: theme.spacing.xs, fontFamily: 'Consolas' }}>
                        {ascii.blockSemi} CLUSTER
                      </div>
                      <div style={{ color: asciiColors.foreground, marginLeft: theme.spacing.md, fontSize: 11, fontFamily: 'Consolas' }}>
                        Physically reorders table data according to an index, improving sequential scan performance. 
                        Requires exclusive lock and can be time-consuming for large tables. Best used for tables with 
                        sequential access patterns.
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: theme.spacing.lg }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: theme.spacing.sm, fontFamily: 'Consolas' }}>
                    {ascii.blockFull} METRICS EXPLAINED
                  </div>
                  
                  <div style={{ marginLeft: theme.spacing.md }}>
                    <div style={{ marginBottom: theme.spacing.sm }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.foreground, marginBottom: theme.spacing.xs, fontFamily: 'Consolas' }}>
                        Impact Score (0-100)
                      </div>
                      <div style={{ color: asciiColors.foreground, marginLeft: theme.spacing.md, fontSize: 11, fontFamily: 'Consolas' }}>
                        Calculated based on space reclaimed (40%), performance improvement (40%), and fragmentation reduction (20%). 
                        Higher scores indicate more significant maintenance benefits.
                      </div>
                    </div>

                    <div style={{ marginBottom: theme.spacing.sm }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.foreground, marginBottom: theme.spacing.xs, fontFamily: 'Consolas' }}>
                        Space Reclaimed
                      </div>
                      <div style={{ color: asciiColors.foreground, marginLeft: theme.spacing.md, fontSize: 11, fontFamily: 'Consolas' }}>
                        Storage space freed up after maintenance operations. Includes dead tuples removed, index bloat eliminated, 
                        and fragmentation reduced.
                      </div>
                    </div>

                    <div style={{ marginBottom: theme.spacing.sm }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.foreground, marginBottom: theme.spacing.xs, fontFamily: 'Consolas' }}>
                        Performance Improvement
                      </div>
                      <div style={{ color: asciiColors.foreground, marginLeft: theme.spacing.md, fontSize: 11, fontFamily: 'Consolas' }}>
                        Percentage improvement in query performance after maintenance. Measured by comparing query execution times 
                        before and after maintenance operations.
                      </div>
                    </div>

                    <div style={{ marginBottom: theme.spacing.sm }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.foreground, marginBottom: theme.spacing.xs, fontFamily: 'Consolas' }}>
                        Fragmentation
                      </div>
                      <div style={{ color: asciiColors.foreground, marginLeft: theme.spacing.md, fontSize: 11, fontFamily: 'Consolas' }}>
                        Percentage of table/index space that is fragmented. Lower fragmentation means better data locality and 
                        improved sequential access performance.
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: theme.spacing.lg }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: theme.spacing.sm, fontFamily: 'Consolas' }}>
                    {ascii.blockFull} STATUS TYPES
                  </div>
                  
                  <div style={{ marginLeft: theme.spacing.md }}>
                    <div style={{ marginBottom: theme.spacing.sm }}>
                      <span style={{ color: asciiColors.muted, fontWeight: 600, fontFamily: 'Consolas' }}>PENDING</span>
                      <span style={{ color: asciiColors.foreground, marginLeft: theme.spacing.sm, fontFamily: 'Consolas' }}>Maintenance detected but not yet executed</span>
                    </div>
                    <div style={{ marginBottom: theme.spacing.sm }}>
                      <span style={{ color: asciiColors.accent, fontWeight: 600, fontFamily: 'Consolas' }}>RUNNING</span>
                      <span style={{ color: asciiColors.foreground, marginLeft: theme.spacing.sm, fontFamily: 'Consolas' }}>Maintenance operation currently in progress</span>
                    </div>
                    <div style={{ marginBottom: theme.spacing.sm }}>
                      <span style={{ color: asciiColors.accent, fontWeight: 600, fontFamily: 'Consolas' }}>COMPLETED</span>
                      <span style={{ color: asciiColors.foreground, marginLeft: theme.spacing.sm, fontFamily: 'Consolas' }}>Maintenance successfully finished</span>
                    </div>
                    <div style={{ marginBottom: theme.spacing.sm }}>
                      <span style={{ color: asciiColors.foreground, fontWeight: 600, fontFamily: 'Consolas' }}>FAILED</span>
                      <span style={{ color: asciiColors.foreground, marginLeft: theme.spacing.sm, fontFamily: 'Consolas' }}>Maintenance operation encountered an error</span>
                    </div>
                    <div style={{ marginBottom: theme.spacing.sm }}>
                      <span style={{ color: asciiColors.muted, fontWeight: 600, fontFamily: 'Consolas' }}>SKIPPED</span>
                      <span style={{ color: asciiColors.foreground, marginLeft: theme.spacing.sm, fontFamily: 'Consolas' }}>Maintenance was skipped (disabled or below threshold)</span>
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
                    Maintenance operations can be configured with auto-execute enabled/disabled, custom thresholds, and schedules. 
                    The system monitors database health and automatically detects when maintenance is needed based on fragmentation, 
                    dead tuple counts, and performance metrics.
                  </div>
                </div>

                <div style={{ marginTop: theme.spacing.md, textAlign: 'right' }}>
                  <AsciiButton
                    label="Close"
                    onClick={() => setShowMaintenancePlaybook(false)}
                    variant="ghost"
                  />
                </div>
              </div>
            </AsciiPanel>
          </div>
        </div>
      )}


      <AsciiPanel title="FILTERS">
        <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
          <select
            value={filters.maintenance_type as string}
            onChange={(e) => handleFilterChange('maintenance_type', e.target.value)}
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
            <option value="VACUUM">VACUUM</option>
            <option value="ANALYZE">ANALYZE</option>
            <option value="REINDEX">REINDEX</option>
            <option value="CLUSTER">CLUSTER</option>
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
            value={filters.status as string}
            onChange={(e) => handleFilterChange('status', e.target.value)}
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
            <option value="">All Status</option>
            <option value="PENDING">PENDING</option>
            <option value="RUNNING">RUNNING</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="FAILED">FAILED</option>
            <option value="SKIPPED">SKIPPED</option>
          </select>
        </div>
      </AsciiPanel>

      {activeTab === 'cleaner' ? (
        <CatalogCleaner onCleanupComplete={fetchData} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: selectedItem ? '1fr 400px' : '1fr', gap: theme.spacing.md }}>
          <MaintenanceTreeView 
            items={maintenanceItems} 
            onItemClick={handleItemClick}
          />
          
          {selectedItem && (
          <AsciiPanel title="MAINTENANCE DETAILS">
            <div style={{ 
              position: 'sticky', 
              top: theme.spacing.sm, 
              maxHeight: 'calc(100vh - 200px)', 
              overflowY: 'auto',
              fontFamily: 'Consolas',
              fontSize: 12
            }}>
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: theme.spacing.sm }}>
                <div>
                  <div style={{ color: asciiColors.muted, fontSize: 11, marginBottom: theme.spacing.xs, fontFamily: 'Consolas' }}>Type:</div>
                  <div>
                    <span style={{
                      padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                      borderRadius: 2,
                      fontSize: 11,
                      fontFamily: 'Consolas',
                      backgroundColor: asciiColors.backgroundSoft,
                      color: asciiColors.foreground,
                      border: `1px solid ${asciiColors.border}`
                    }}>
                      {selectedItem.maintenance_type || 'N/A'}
                    </span>
                  </div>
                </div>
                <div>
                  <div style={{ color: asciiColors.muted, fontSize: 11, marginBottom: theme.spacing.xs, fontFamily: 'Consolas' }}>Engine:</div>
                  <div style={{ color: asciiColors.foreground, fontFamily: 'Consolas' }}>{selectedItem.db_engine || 'N/A'}</div>
                </div>
                <div>
                  <div style={{ color: asciiColors.muted, fontSize: 11, marginBottom: theme.spacing.xs, fontFamily: 'Consolas' }}>Schema:</div>
                  <div style={{ color: asciiColors.foreground, fontFamily: 'Consolas' }}>{selectedItem.schema_name || 'N/A'}</div>
                </div>
                <div>
                  <div style={{ color: asciiColors.muted, fontSize: 11, marginBottom: theme.spacing.xs, fontFamily: 'Consolas' }}>Object:</div>
                  <div style={{ color: asciiColors.foreground, fontFamily: 'Consolas' }}>{selectedItem.object_name || 'N/A'}</div>
                </div>
                <div>
                  <div style={{ color: asciiColors.muted, fontSize: 11, marginBottom: theme.spacing.xs, fontFamily: 'Consolas' }}>Status:</div>
                  <div>
                    <span style={{
                      padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                      borderRadius: 2,
                      fontSize: 11,
                      fontFamily: 'Consolas',
                      backgroundColor: selectedItem.status ? getStatusColor(selectedItem.status) + '20' : asciiColors.backgroundSoft,
                      color: selectedItem.status ? getStatusColor(selectedItem.status) : asciiColors.foreground,
                      border: `1px solid ${selectedItem.status ? getStatusColor(selectedItem.status) : asciiColors.border}`
                    }}>
                      {selectedItem.status || 'N/A'}
                    </span>
                  </div>
                </div>
                <div>
                  <div style={{ color: asciiColors.muted, fontSize: 11, marginBottom: theme.spacing.xs, fontFamily: 'Consolas' }}>Priority:</div>
                  <div style={{ color: asciiColors.foreground, fontFamily: 'Consolas' }}>{selectedItem.priority || 'N/A'}</div>
                </div>
                <div>
                  <div style={{ color: asciiColors.muted, fontSize: 11, marginBottom: theme.spacing.xs, fontFamily: 'Consolas' }}>Impact Score:</div>
                  <div style={{ color: asciiColors.foreground, fontFamily: 'Consolas' }}>
                    {selectedItem.impact_score ? Number(selectedItem.impact_score).toFixed(1) : 'N/A'}
                  </div>
                </div>
                <div>
                  <div style={{ color: asciiColors.muted, fontSize: 11, marginBottom: theme.spacing.xs, fontFamily: 'Consolas' }}>Space Reclaimed:</div>
                  <div style={{ color: asciiColors.foreground, fontFamily: 'Consolas' }}>{formatBytes(selectedItem.space_reclaimed_mb)}</div>
                </div>
                <div>
                  <div style={{ color: asciiColors.muted, fontSize: 11, marginBottom: theme.spacing.xs, fontFamily: 'Consolas' }}>Duration:</div>
                  <div style={{ color: asciiColors.foreground, fontFamily: 'Consolas' }}>{formatDuration(selectedItem.maintenance_duration_seconds)}</div>
                </div>
                <div>
                  <div style={{ color: asciiColors.muted, fontSize: 11, marginBottom: theme.spacing.xs, fontFamily: 'Consolas' }}>Last Run:</div>
                  <div style={{ color: asciiColors.foreground, fontSize: 11, fontFamily: 'Consolas' }}>
                    {formatDate(selectedItem.last_maintenance_date)}
                  </div>
                </div>
                <div>
                  <div style={{ color: asciiColors.muted, fontSize: 11, marginBottom: theme.spacing.xs, fontFamily: 'Consolas' }}>Next Run:</div>
                  <div style={{ color: asciiColors.foreground, fontSize: 11, fontFamily: 'Consolas' }}>
                    {formatDate(selectedItem.next_maintenance_date)}
                  </div>
                </div>
                <div style={{ borderTop: `1px solid ${asciiColors.border}`, paddingTop: theme.spacing.sm, marginTop: theme.spacing.sm }}>
                  <div style={{ color: asciiColors.muted, fontSize: 11, marginBottom: theme.spacing.sm, fontWeight: 600, fontFamily: 'Consolas' }}>Configuration:</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.spacing.sm, marginBottom: theme.spacing.sm }}>
                    <div>
                      <div style={{ fontSize: 11, color: asciiColors.muted, fontFamily: 'Consolas' }}>Object Type</div>
                      <div style={{ fontWeight: 600, color: asciiColors.foreground, fontFamily: 'Consolas' }}>{selectedItem.object_type || 'N/A'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: asciiColors.muted, fontFamily: 'Consolas' }}>Auto Execute</div>
                      <div style={{ fontWeight: 600, color: asciiColors.foreground, fontFamily: 'Consolas' }}>{selectedItem.auto_execute ? 'Yes' : 'No'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: asciiColors.muted, fontFamily: 'Consolas' }}>Enabled</div>
                      <div style={{ fontWeight: 600, color: asciiColors.foreground, fontFamily: 'Consolas' }}>{selectedItem.enabled ? 'Yes' : 'No'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: asciiColors.muted, fontFamily: 'Consolas' }}>Maintenance Count</div>
                      <div style={{ fontWeight: 600, color: asciiColors.foreground, fontFamily: 'Consolas' }}>{selectedItem.maintenance_count || 0}</div>
                    </div>
                    {selectedItem.server_name && (
                      <div>
                        <div style={{ fontSize: 11, color: asciiColors.muted, fontFamily: 'Consolas' }}>Server Name</div>
                        <div style={{ fontWeight: 600, color: asciiColors.foreground, fontFamily: 'Consolas' }}>{selectedItem.server_name}</div>
                      </div>
                    )}
                    {selectedItem.database_name && (
                      <div>
                        <div style={{ fontSize: 11, color: asciiColors.muted, fontFamily: 'Consolas' }}>Database Name</div>
                        <div style={{ fontWeight: 600, color: asciiColors.foreground, fontFamily: 'Consolas' }}>{selectedItem.database_name}</div>
                      </div>
                    )}
                  </div>
                </div>

                {(selectedItem.fragmentation_before !== null || selectedItem.fragmentation_after !== null || 
                  selectedItem.dead_tuples_before !== null || selectedItem.dead_tuples_after !== null ||
                  selectedItem.table_size_before_mb !== null || selectedItem.table_size_after_mb !== null ||
                  selectedItem.index_size_before_mb !== null || selectedItem.index_size_after_mb !== null ||
                  selectedItem.query_performance_before !== null || selectedItem.query_performance_after !== null) && (
                  <div style={{ borderTop: `1px solid ${asciiColors.border}`, paddingTop: theme.spacing.sm, marginTop: theme.spacing.sm }}>
                    <div style={{ color: asciiColors.muted, fontSize: 11, marginBottom: theme.spacing.sm, fontWeight: 600, fontFamily: 'Consolas' }}>Before/After Metrics:</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.spacing.sm }}>
                      {selectedItem.fragmentation_before !== null && (
                        <>
                          <div>
                            <div style={{ fontSize: 11, color: asciiColors.muted, fontFamily: 'Consolas' }}>Fragmentation Before</div>
                            <div style={{ fontWeight: 600, color: asciiColors.foreground, fontFamily: 'Consolas' }}>
                              {Number(selectedItem.fragmentation_before).toFixed(2)}%
                            </div>
                          </div>
                          {selectedItem.fragmentation_after !== null && (
                            <div>
                              <div style={{ fontSize: 11, color: asciiColors.muted, fontFamily: 'Consolas' }}>Fragmentation After</div>
                              <div style={{ fontWeight: 600, color: asciiColors.accent, fontFamily: 'Consolas' }}>
                                {Number(selectedItem.fragmentation_after).toFixed(2)}%
                              </div>
                            </div>
                          )}
                        </>
                      )}
                      {selectedItem.dead_tuples_before !== null && (
                        <>
                          <div>
                            <div style={{ fontSize: 11, color: asciiColors.muted, fontFamily: 'Consolas' }}>Dead Tuples Before</div>
                            <div style={{ fontWeight: 600, color: asciiColors.foreground, fontFamily: 'Consolas' }}>
                              {Number(selectedItem.dead_tuples_before).toLocaleString()}
                            </div>
                          </div>
                          {selectedItem.dead_tuples_after !== null && (
                            <div>
                              <div style={{ fontSize: 11, color: asciiColors.muted, fontFamily: 'Consolas' }}>Dead Tuples After</div>
                              <div style={{ fontWeight: 600, color: asciiColors.accent, fontFamily: 'Consolas' }}>
                                {Number(selectedItem.dead_tuples_after).toLocaleString()}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                      {selectedItem.table_size_before_mb !== null && (
                        <>
                          <div>
                            <div style={{ fontSize: 11, color: asciiColors.muted, fontFamily: 'Consolas' }}>Table Size Before</div>
                            <div style={{ fontWeight: 600, color: asciiColors.foreground, fontFamily: 'Consolas' }}>
                              {formatBytes(selectedItem.table_size_before_mb)}
                            </div>
                          </div>
                          {selectedItem.table_size_after_mb !== null && (
                            <div>
                              <div style={{ fontSize: 11, color: asciiColors.muted, fontFamily: 'Consolas' }}>Table Size After</div>
                              <div style={{ fontWeight: 600, color: asciiColors.accent, fontFamily: 'Consolas' }}>
                                {formatBytes(selectedItem.table_size_after_mb)}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                      {selectedItem.index_size_before_mb !== null && (
                        <>
                          <div>
                            <div style={{ fontSize: 11, color: asciiColors.muted, fontFamily: 'Consolas' }}>Index Size Before</div>
                            <div style={{ fontWeight: 600, color: asciiColors.foreground, fontFamily: 'Consolas' }}>
                              {formatBytes(selectedItem.index_size_before_mb)}
                            </div>
                          </div>
                          {selectedItem.index_size_after_mb !== null && (
                            <div>
                              <div style={{ fontSize: 11, color: asciiColors.muted, fontFamily: 'Consolas' }}>Index Size After</div>
                              <div style={{ fontWeight: 600, color: asciiColors.accent, fontFamily: 'Consolas' }}>
                                {formatBytes(selectedItem.index_size_after_mb)}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                      {selectedItem.query_performance_before !== null && (
                        <>
                          <div>
                            <div style={{ fontSize: 11, color: asciiColors.muted, fontFamily: 'Consolas' }}>Query Performance Before</div>
                            <div style={{ fontWeight: 600, color: asciiColors.foreground, fontFamily: 'Consolas' }}>
                              {Number(selectedItem.query_performance_before).toFixed(2)}ms
                            </div>
                          </div>
                          {selectedItem.query_performance_after !== null && (
                            <div>
                              <div style={{ fontSize: 11, color: asciiColors.muted, fontFamily: 'Consolas' }}>Query Performance After</div>
                              <div style={{ fontWeight: 600, color: asciiColors.accent, fontFamily: 'Consolas' }}>
                                {Number(selectedItem.query_performance_after).toFixed(2)}ms
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}

                <div style={{ borderTop: `1px solid ${asciiColors.border}`, paddingTop: theme.spacing.sm, marginTop: theme.spacing.sm }}>
                  <div style={{ color: asciiColors.muted, fontSize: 11, marginBottom: theme.spacing.sm, fontWeight: 600, fontFamily: 'Consolas' }}>Timestamps:</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.spacing.sm }}>
                    {selectedItem.first_detected_date && (
                      <div>
                        <div style={{ fontSize: 11, color: asciiColors.muted, fontFamily: 'Consolas' }}>First Detected</div>
                        <div style={{ fontWeight: 600, color: asciiColors.foreground, fontSize: 11, fontFamily: 'Consolas' }}>
                          {formatDate(selectedItem.first_detected_date)}
                        </div>
                      </div>
                    )}
                    {selectedItem.last_checked_date && (
                      <div>
                        <div style={{ fontSize: 11, color: asciiColors.muted, fontFamily: 'Consolas' }}>Last Checked</div>
                        <div style={{ fontWeight: 600, color: asciiColors.foreground, fontSize: 11, fontFamily: 'Consolas' }}>
                          {formatDate(selectedItem.last_checked_date)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {selectedItem.result_message && (
                  <div style={{ borderTop: `1px solid ${asciiColors.border}`, paddingTop: theme.spacing.sm, marginTop: theme.spacing.sm }}>
                    <div style={{ color: asciiColors.muted, fontSize: 11, marginBottom: theme.spacing.sm, fontWeight: 600, fontFamily: 'Consolas' }}>Result Message:</div>
                    <div style={{ 
                      padding: theme.spacing.sm, 
                      background: asciiColors.backgroundSoft, 
                      borderRadius: 2,
                      border: `1px solid ${asciiColors.border}`,
                      fontSize: 11,
                      color: asciiColors.foreground,
                      fontFamily: 'Consolas'
                    }}>
                      {selectedItem.result_message}
                    </div>
                  </div>
                )}

                {selectedItem.error_details && (
                  <div style={{ borderTop: `1px solid ${asciiColors.border}`, paddingTop: theme.spacing.sm, marginTop: theme.spacing.sm }}>
                    <div style={{ fontSize: 11, color: asciiColors.foreground, marginBottom: theme.spacing.xs, fontWeight: 600, fontFamily: 'Consolas' }}>Error Details</div>
                    <div style={{ 
                      padding: theme.spacing.sm, 
                      background: asciiColors.backgroundSoft, 
                      borderRadius: 2,
                      border: `1px solid ${asciiColors.border}`,
                      fontSize: 11,
                      color: asciiColors.foreground,
                      fontFamily: 'Consolas'
                    }}>
                      {selectedItem.error_details}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </AsciiPanel>
        )}
        </div>
      )}
    </Container>
  );
};

export default Maintenance;
