import { useState, useEffect, useCallback, useRef } from 'react';
import styled from 'styled-components';
import {
  Container,
  LoadingOverlay,
} from '../shared/BaseComponents';
import { useTableFilters } from '../../hooks/useTableFilters';
import { qualityApi } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import { theme } from '../../theme/theme';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import QualityTreeView from './QualityTreeView';

const getStatusColor = (status?: string) => {
  if (!status) return asciiColors.muted;
  switch (status) {
    case 'PASSED': return asciiColors.success;
    case 'WARNING': return asciiColors.warning;
    case 'FAILED': return asciiColors.danger;
    default: return asciiColors.muted;
  }
};

const getScoreColor = (score: number) => {
  if (score >= 90) return asciiColors.success;
  if (score >= 70) return asciiColors.success;
  if (score >= 50) return asciiColors.warning;
  return asciiColors.danger;
};

const Quality = () => {
  const isMountedRef = useRef(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qualityData, setQualityData] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  const { filters, setFilter, clearFilters } = useTableFilters({
    engine: '',
    status: ''
  });

  const formatNumber = useCallback((num: number) => num.toLocaleString(), []);

  const formatDate = useCallback((date: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleString();
  }, []);

  const isInitialLoadRef = useRef(true);
  
  const fetchQualityData = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    const isInitialLoad = isInitialLoadRef.current;
    
    try {
      setError(null);
      if (isInitialLoad) {
        setLoading(true);
      }
      const response = await qualityApi.getQualityMetrics({
        page: 1,
        limit: 1000,
        search: filters.engine as string ? `engine:${filters.engine}` : undefined,
        status: filters.status as string || undefined
      });
      
      if (isMountedRef.current) {
        setQualityData(response.data || []);
        isInitialLoadRef.current = false;
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
  }, [filters.engine, filters.status]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchQualityData();
    
    const interval = setInterval(() => {
      if (isMountedRef.current) {
        fetchQualityData();
      }
    }, 30000);
    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchQualityData]);

  const handleItemClick = useCallback((item: any) => {
    setSelectedItem((prev: any) => prev?.id === item.id ? null : item);
  }, []);

  return (
    <Container>
      {loading && <LoadingOverlay>Loading quality metrics...</LoadingOverlay>}

      <h1 style={{ fontSize: 18, fontFamily: 'Consolas', marginBottom: 16, fontWeight: 600 }}>
        Data Quality Monitor
      </h1>

      {error && (
        <AsciiPanel title="ERROR">
          <div style={{ color: asciiColors.danger, fontFamily: 'Consolas', fontSize: 12 }}>
            {ascii.blockFull} {error}
          </div>
        </AsciiPanel>
      )}

      <AsciiPanel title="FILTERS">
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <select 
            value={filters.engine as string}
            onChange={(e) => {
              setFilter('engine', e.target.value);
            }}
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
            <option value="MongoDB">MongoDB</option>
            <option value="MSSQL">MSSQL</option>
            <option value="MariaDB">MariaDB</option>
            <option value="Oracle">Oracle</option>
          </select>

          <select
            value={filters.status as string}
            onChange={(e) => {
              setFilter('status', e.target.value);
            }}
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
            <option value="PASSED">Passed</option>
            <option value="WARNING">Warning</option>
            <option value="FAILED">Failed</option>
          </select>

          <AsciiButton
            label="Reset All"
            onClick={() => {
              clearFilters();
            }}
            variant="ghost"
          />
        </div>
      </AsciiPanel>

      <div style={{ display: 'grid', gridTemplateColumns: selectedItem ? '1fr 400px' : '1fr', gap: 16 }}>
        <QualityTreeView 
          items={qualityData} 
          onItemClick={handleItemClick}
        />
        
        {selectedItem && (
          <AsciiPanel title="QUALITY DETAILS">
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
                  <div style={{ color: asciiColors.muted, fontSize: 11, marginBottom: 4 }}>Schema:</div>
                  <div style={{ color: asciiColors.foreground }}>{selectedItem.schema_name || 'N/A'}</div>
                </div>
                <div>
                  <div style={{ color: asciiColors.muted, fontSize: 11, marginBottom: 4 }}>Table:</div>
                  <div style={{ color: asciiColors.foreground }}>{selectedItem.table_name || 'N/A'}</div>
                </div>
                <div>
                  <div style={{ color: asciiColors.muted, fontSize: 11, marginBottom: 4 }}>Total Rows:</div>
                  <div style={{ color: asciiColors.foreground }}>{formatNumber(selectedItem.total_rows || 0)}</div>
                </div>
                <div>
                  <div style={{ color: asciiColors.muted, fontSize: 11, marginBottom: 4 }}>Status:</div>
                  <div>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: 2,
                      fontSize: 11,
                      fontFamily: 'Consolas',
                      backgroundColor: getStatusColor(selectedItem.validation_status) + '20',
                      color: getStatusColor(selectedItem.validation_status),
                      border: `1px solid ${getStatusColor(selectedItem.validation_status)}`
                    }}>
                      {selectedItem.validation_status || 'N/A'}
                    </span>
                  </div>
                </div>
                <div>
                  <div style={{ color: asciiColors.muted, fontSize: 11, marginBottom: 4 }}>Quality Score:</div>
                  <div>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: 2,
                      fontSize: 11,
                      fontFamily: 'Consolas',
                      backgroundColor: getScoreColor(selectedItem.quality_score || 0) + '20',
                      color: getScoreColor(selectedItem.quality_score || 0),
                      border: `1px solid ${getScoreColor(selectedItem.quality_score || 0)}`
                    }}>
                      {selectedItem.quality_score || 0}%
                    </span>
                  </div>
                </div>
                <div>
                  <div style={{ color: asciiColors.muted, fontSize: 11, marginBottom: 4 }}>Last Check:</div>
                  <div style={{ color: asciiColors.foreground, fontSize: 11 }}>
                    {formatDate(selectedItem.check_timestamp)}
                  </div>
                </div>
                <div style={{ borderTop: `1px solid ${asciiColors.border}`, paddingTop: 12, marginTop: 8 }}>
                  <div style={{ color: asciiColors.muted, fontSize: 11, marginBottom: 8, fontWeight: 600 }}>Metrics:</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 11, color: asciiColors.muted }}>Missing Values</div>
                      <div style={{ fontWeight: 600, color: asciiColors.foreground }}>{formatNumber(selectedItem.null_count || 0)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: asciiColors.muted }}>Duplicates</div>
                      <div style={{ fontWeight: 600, color: asciiColors.foreground }}>{formatNumber(selectedItem.duplicate_count || 0)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: asciiColors.muted }}>Type Mismatches</div>
                      <div style={{ fontWeight: 600, color: asciiColors.foreground }}>{formatNumber(selectedItem.invalid_type_count || 0)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: asciiColors.muted }}>Range Violations</div>
                      <div style={{ fontWeight: 600, color: asciiColors.foreground }}>{formatNumber(selectedItem.out_of_range_count || 0)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: asciiColors.muted }}>Referential Issues</div>
                      <div style={{ fontWeight: 600, color: asciiColors.foreground }}>{formatNumber(selectedItem.referential_integrity_errors || 0)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: asciiColors.muted }}>Constraint Issues</div>
                      <div style={{ fontWeight: 600, color: asciiColors.foreground }}>{formatNumber(selectedItem.constraint_violation_count || 0)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </AsciiPanel>
        )}
      </div>
    </Container>
  );
};

export default Quality;
