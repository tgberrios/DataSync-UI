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
  const [activeTab, setActiveTab] = useState<'pending' | 'completed' | 'all'>('pending');
  const isMountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    if (!isMountedRef.current) return;
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
      case 'PENDING': return asciiColors.warning;
      case 'RUNNING': return asciiColors.accent;
      case 'COMPLETED': return asciiColors.success;
      case 'FAILED': return asciiColors.danger;
      case 'SKIPPED': return asciiColors.muted;
      default: return asciiColors.muted;
    }
  };

  if (loading && maintenanceItems.length === 0) {
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
          MAINTENANCE
        </h1>
        <LoadingOverlay>Loading maintenance data...</LoadingOverlay>
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
        MAINTENANCE
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
        gap: 8, 
        marginBottom: 16, 
        borderBottom: `1px solid ${asciiColors.border}`, 
        paddingBottom: 8 
      }}>
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
      </div>

      <AsciiPanel title="FILTERS">
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <select
            value={filters.maintenance_type as string}
            onChange={(e) => handleFilterChange('maintenance_type', e.target.value)}
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
            <option value="VACUUM">VACUUM</option>
            <option value="ANALYZE">ANALYZE</option>
            <option value="REINDEX">REINDEX</option>
            <option value="CLUSTER">CLUSTER</option>
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
          </select>
          
          <select
            value={filters.status as string}
            onChange={(e) => handleFilterChange('status', e.target.value)}
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
            <option value="">All Status</option>
            <option value="PENDING">PENDING</option>
            <option value="RUNNING">RUNNING</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="FAILED">FAILED</option>
            <option value="SKIPPED">SKIPPED</option>
          </select>
        </div>
      </AsciiPanel>

      <div style={{ display: 'grid', gridTemplateColumns: selectedItem ? '1fr 400px' : '1fr', gap: 16 }}>
        <MaintenanceTreeView 
          items={maintenanceItems} 
          onItemClick={handleItemClick}
        />
        
        {selectedItem && (
          <AsciiPanel title="MAINTENANCE DETAILS">
            <div style={{ 
              position: 'sticky', 
              top: 8, 
              maxHeight: 'calc(100vh - 200px)', 
              overflowY: 'auto',
              fontFamily: 'Consolas',
              fontSize: 12
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
                <div>
                  <div style={{ color: asciiColors.muted, fontSize: 11, marginBottom: 4 }}>Type:</div>
                  <div>
                    <span style={{
                      padding: '2px 8px',
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
                  <div style={{ color: asciiColors.muted, fontSize: 11, marginBottom: 4 }}>Engine:</div>
                  <div style={{ color: asciiColors.foreground }}>{selectedItem.db_engine || 'N/A'}</div>
                </div>
                <div>
                  <div style={{ color: asciiColors.muted, fontSize: 11, marginBottom: 4 }}>Schema:</div>
                  <div style={{ color: asciiColors.foreground }}>{selectedItem.schema_name || 'N/A'}</div>
                </div>
                <div>
                  <div style={{ color: asciiColors.muted, fontSize: 11, marginBottom: 4 }}>Object:</div>
                  <div style={{ color: asciiColors.foreground }}>{selectedItem.object_name || 'N/A'}</div>
                </div>
                <div>
                  <div style={{ color: asciiColors.muted, fontSize: 11, marginBottom: 4 }}>Status:</div>
                  <div>
                    <span style={{
                      padding: '2px 8px',
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
                  <div style={{ color: asciiColors.muted, fontSize: 11, marginBottom: 4 }}>Priority:</div>
                  <div style={{ color: asciiColors.foreground }}>{selectedItem.priority || 'N/A'}</div>
                </div>
                <div>
                  <div style={{ color: asciiColors.muted, fontSize: 11, marginBottom: 4 }}>Impact Score:</div>
                  <div style={{ color: asciiColors.foreground }}>
                    {selectedItem.impact_score ? Number(selectedItem.impact_score).toFixed(1) : 'N/A'}
                  </div>
                </div>
                <div>
                  <div style={{ color: asciiColors.muted, fontSize: 11, marginBottom: 4 }}>Space Reclaimed:</div>
                  <div style={{ color: asciiColors.foreground }}>{formatBytes(selectedItem.space_reclaimed_mb)}</div>
                </div>
                <div>
                  <div style={{ color: asciiColors.muted, fontSize: 11, marginBottom: 4 }}>Duration:</div>
                  <div style={{ color: asciiColors.foreground }}>{formatDuration(selectedItem.maintenance_duration_seconds)}</div>
                </div>
                <div>
                  <div style={{ color: asciiColors.muted, fontSize: 11, marginBottom: 4 }}>Last Run:</div>
                  <div style={{ color: asciiColors.foreground, fontSize: 11 }}>
                    {formatDate(selectedItem.last_maintenance_date)}
                  </div>
                </div>
                <div>
                  <div style={{ color: asciiColors.muted, fontSize: 11, marginBottom: 4 }}>Next Run:</div>
                  <div style={{ color: asciiColors.foreground, fontSize: 11 }}>
                    {formatDate(selectedItem.next_maintenance_date)}
                  </div>
                </div>
                <div style={{ borderTop: `1px solid ${asciiColors.border}`, paddingTop: 12, marginTop: 8 }}>
                  <div style={{ color: asciiColors.muted, fontSize: 11, marginBottom: 8, fontWeight: 600 }}>Additional Info:</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 11, color: asciiColors.muted }}>Object Type</div>
                      <div style={{ fontWeight: 600, color: asciiColors.foreground }}>{selectedItem.object_type || 'N/A'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: asciiColors.muted }}>Auto Execute</div>
                      <div style={{ fontWeight: 600, color: asciiColors.foreground }}>{selectedItem.auto_execute ? 'Yes' : 'No'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: asciiColors.muted }}>Enabled</div>
                      <div style={{ fontWeight: 600, color: asciiColors.foreground }}>{selectedItem.enabled ? 'Yes' : 'No'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: asciiColors.muted }}>Maintenance Count</div>
                      <div style={{ fontWeight: 600, color: asciiColors.foreground }}>{selectedItem.maintenance_count || 0}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: asciiColors.muted }}>Performance Improvement</div>
                      <div style={{ fontWeight: 600, color: asciiColors.foreground }}>
                        {selectedItem.performance_improvement_pct ? `${Number(selectedItem.performance_improvement_pct).toFixed(2)}%` : 'N/A'}
                      </div>
                    </div>
                    {selectedItem.error_details && (
                      <div>
                        <div style={{ fontSize: 11, color: asciiColors.danger }}>Error Details</div>
                        <div style={{ fontWeight: 600, color: asciiColors.danger, fontSize: 11 }}>
                          {ascii.blockFull} {selectedItem.error_details}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </AsciiPanel>
        )}
      </div>
    </div>
  );
};

export default Maintenance;
