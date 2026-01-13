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
import QualityCharts from './QualityCharts';

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
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qualityData, setQualityData] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [showQualityPlaybook, setShowQualityPlaybook] = useState(false);
  const [activeView, setActiveView] = useState<'list' | 'charts'>('list');
  const fetchingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

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
  
  const fetchQualityData = useCallback(async (isBackgroundRefresh = false) => {
    if (!isMountedRef.current) return;
    
    const isInitialLoad = isInitialLoadRef.current && !isBackgroundRefresh;
    
    if (fetchingRef.current) {
      if (isBackgroundRefresh) {
        return;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    }
    
    abortControllerRef.current = new AbortController();
    fetchingRef.current = true;
    
    try {
      if (isInitialLoad) {
        setError(null);
        setLoading(true);
      } else if (isBackgroundRefresh) {
        setRefreshing(true);
      }
      
      const params: any = {
        page: 1,
        limit: 1000
      };
      
      if (filters.engine as string) {
        params.engine = filters.engine;
      }
      
      if (filters.status as string) {
        params.status = filters.status;
      }
      
      const response = await qualityApi.getQualityMetrics(params, abortControllerRef.current.signal);
      
      if (isMountedRef.current && !abortControllerRef.current.signal.aborted) {
        const data = response?.data?.data || response?.data || response || [];
        setQualityData(Array.isArray(data) ? data : []);
        isInitialLoadRef.current = false;
        setError(null);
      }
    } catch (err: any) {
      if (isMountedRef.current && !abortControllerRef.current?.signal.aborted) {
        const isCanceled = err.name === 'CanceledError' || 
                          err.name === 'AbortError' || 
                          err.code === 'ERR_CANCELED' ||
                          err.message?.includes('aborted') || 
                          err.message?.includes('canceled');
        
        if (isCanceled) {
          return;
        }
        
        const errorMessage = extractApiError(err);
        setError(errorMessage);
        if (errorMessage && !errorMessage.includes('cancelled') && !errorMessage.includes('canceled')) {
          console.error('Error fetching quality data:', err);
        }
      }
    } finally {
      if (isMountedRef.current) {
        fetchingRef.current = false;
        if (isInitialLoad) {
          setLoading(false);
        }
        if (isBackgroundRefresh) {
          setRefreshing(false);
        }
      }
    }
  }, [filters.engine, filters.status]);

  useEffect(() => {
    isMountedRef.current = true;
    isInitialLoadRef.current = true;
    fetchQualityData();
    
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [filters.engine, filters.status]);

  useEffect(() => {
    if (isInitialLoadRef.current || loading) {
      return;
    }

    const intervalId = setInterval(() => {
      if (isMountedRef.current && !fetchingRef.current && !isInitialLoadRef.current) {
        fetchQualityData(true);
      }
    }, 30000);

    return () => {
      clearInterval(intervalId);
    };
  }, [loading]);

  const handleItemClick = useCallback((item: any) => {
    setSelectedItem((prev: any) => prev?.id === item.id ? null : item);
  }, []);

  return (
    <div style={{ padding: "20px", fontFamily: "Consolas", fontSize: 12 }}>
      {loading && <LoadingOverlay>Loading quality metrics...</LoadingOverlay>}

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
          DATA QUALITY MONITOR
        </h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {refreshing && (
            <span style={{ 
              fontSize: 11, 
              color: asciiColors.muted,
              fontFamily: 'Consolas'
            }}>
              Refreshing...
            </span>
          )}
          <AsciiButton
            label={activeView === 'list' ? 'Show Charts' : 'Show List'}
            onClick={() => setActiveView(activeView === 'list' ? 'charts' : 'list')}
            variant={activeView === 'charts' ? 'primary' : 'ghost'}
          />
          <AsciiButton
            label="Quality Info"
            onClick={() => setShowQualityPlaybook(true)}
            variant="ghost"
          />
          <AsciiButton
            label="Refresh"
            onClick={() => fetchQualityData(true)}
            variant="ghost"
            disabled={fetchingRef.current}
          />
        </div>
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

      {showQualityPlaybook && (
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
          zIndex: 10000
        }}
        onClick={() => setShowQualityPlaybook(false)}
        >
          <div style={{
            width: '90%',
            maxWidth: 1000,
            maxHeight: '90vh',
            overflowY: 'auto'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <AsciiPanel title="DATA QUALITY PLAYBOOK">
              <div style={{ padding: 16, fontFamily: 'Consolas', fontSize: 12, lineHeight: 1.6 }}>
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                    {ascii.blockFull} OVERVIEW
                  </div>
                  <div style={{ color: asciiColors.foreground, marginLeft: 16 }}>
                    Data Quality monitoring validates tables by collecting comprehensive quality metrics including data types, null counts, 
                    duplicates, and constraint violations. The system automatically calculates a quality score (0-100) and determines 
                    validation status (PASSED, WARNING, FAILED) based on the collected metrics.
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                    {ascii.blockFull} QUALITY CHECKS
                  </div>
                  
                  <div style={{ marginLeft: 16 }}>
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.success, marginBottom: 6 }}>
                        {ascii.blockSemi} DATA TYPE VALIDATION
                      </div>
                        <div style={{ color: asciiColors.foreground, marginLeft: 16 }}>
                          Checks if actual data types match expected types from information_schema. Uses PostgreSQL system catalogs 
                          (pg_attribute, pg_class, pg_type) to verify type consistency. For large tables (&gt;1M rows), uses 5% TABLESAMPLE 
                          for performance. Updates invalid_type_count and type_mismatch_details JSON with column-level issues.
                        </div>
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.success, marginBottom: 6 }}>
                        {ascii.blockSemi} NULL COUNT CHECK
                      </div>
                      <div style={{ color: asciiColors.foreground, marginLeft: 16 }}>
                        Efficiently counts NULL values across all columns using FILTER clauses in a single query (instead of N+1 queries). 
                        Processes columns in batches of 50 for tables with many columns. Updates total_rows and null_count metrics.
                      </div>
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.success, marginBottom: 6 }}>
                        {ascii.blockSemi} DUPLICATE DETECTION
                      </div>
                        <div style={{ color: asciiColors.foreground, marginLeft: 16 }}>
                          Detects duplicate rows by comparing total row count with distinct ctid count. For large tables (&gt;1M rows), 
                          uses 10% TABLESAMPLE and adjusts the count by multiplying by 10. Updates duplicate_count metric.
                        </div>
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.success, marginBottom: 6 }}>
                        {ascii.blockSemi} CONSTRAINT VALIDATION
                      </div>
                      <div style={{ color: asciiColors.foreground, marginLeft: 16 }}>
                        Checks foreign key constraints for violations by identifying orphaned rows (rows with foreign key values that 
                        don't exist in referenced tables). Queries information_schema.referential_constraints to find all foreign keys, 
                        then validates each one. Updates referential_integrity_errors and integrity_check_details JSON with violation details.
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                    {ascii.blockFull} QUALITY SCORE CALCULATION
                  </div>
                  
                  <div style={{ marginLeft: 16 }}>
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.foreground, marginBottom: 4 }}>
                        Score Formula (0-100)
                      </div>
                      <div style={{ color: asciiColors.foreground, marginLeft: 16, fontSize: 11 }}>
                        Starts at 100.0 and applies weighted deductions:
                      </div>
                      <div style={{ color: asciiColors.foreground, marginLeft: 32, fontSize: 11, marginTop: 4 }}>
                        • Null percentage: -20 points (proportional to total rows)<br/>
                        • Duplicate percentage: -20 points (proportional to total rows)<br/>
                        • Invalid type count: -30 points (proportional to total rows)<br/>
                        • Referential integrity errors: -30 points (proportional to total rows)
                      </div>
                      <div style={{ color: asciiColors.foreground, marginLeft: 16, fontSize: 11, marginTop: 8 }}>
                        Final score is clamped between 0.0 and 100.0. Higher scores indicate better data quality.
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                    {ascii.blockFull} VALIDATION STATUS
                  </div>
                  
                  <div style={{ marginLeft: 16 }}>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.success, fontWeight: 600 }}>PASSED</span>
                      <span style={{ color: asciiColors.foreground, marginLeft: 8 }}>Quality score &gt;= 90.0 - Excellent data quality</span>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.warning, fontWeight: 600 }}>WARNING</span>
                      <span style={{ color: asciiColors.foreground, marginLeft: 8 }}>Quality score &gt;= 70.0 and &lt; 90.0 - Acceptable but needs attention</span>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.danger, fontWeight: 600 }}>FAILED</span>
                      <span style={{ color: asciiColors.foreground, marginLeft: 8 }}>Quality score &lt; 70.0 - Poor data quality, requires immediate action</span>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                    {ascii.blockFull} METRICS EXPLAINED
                  </div>
                  
                  <div style={{ marginLeft: 16 }}>
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.foreground, marginBottom: 4 }}>
                        Total Rows
                      </div>
                      <div style={{ color: asciiColors.foreground, marginLeft: 16, fontSize: 11 }}>
                        Total number of rows in the table. Used as denominator for calculating percentages in quality score.
                      </div>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.foreground, marginBottom: 4 }}>
                        Null Count
                      </div>
                      <div style={{ color: asciiColors.foreground, marginLeft: 16, fontSize: 11 }}>
                        Total number of NULL values across all columns. High null counts indicate data completeness issues.
                      </div>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.foreground, marginBottom: 4 }}>
                        Duplicate Count
                      </div>
                      <div style={{ color: asciiColors.foreground, marginLeft: 16, fontSize: 11 }}>
                        Number of duplicate rows detected. Duplicates can cause data integrity and analysis issues.
                      </div>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.foreground, marginBottom: 4 }}>
                        Invalid Type Count
                      </div>
                      <div style={{ color: asciiColors.foreground, marginLeft: 16, fontSize: 11 }}>
                        Number of columns with type mismatches. Type_mismatch_details JSON contains column-level information.
                      </div>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.foreground, marginBottom: 4 }}>
                        Referential Integrity Errors
                      </div>
                      <div style={{ color: asciiColors.foreground, marginLeft: 16, fontSize: 11 }}>
                        Number of foreign key constraint violations (orphaned rows). Integrity_check_details JSON contains constraint-level details.
                      </div>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.foreground, marginBottom: 4 }}>
                        Check Duration (ms)
                      </div>
                      <div style={{ color: asciiColors.foreground, marginLeft: 16, fontSize: 11 }}>
                        Time taken to complete the quality check in milliseconds. Includes all validation steps.
                      </div>
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
                    {ascii.blockSemi} Note
                  </div>
                    <div style={{ fontSize: 11, color: asciiColors.foreground }}>
                      Quality checks use sampling for large tables (&gt;1M rows) to improve performance. The system stores metrics in 
                      metadata.data_quality table and retrieves the latest check for each schema/table/engine combination using 
                      DISTINCT ON with ORDER BY check_timestamp DESC.
                    </div>
                </div>

                <div style={{ marginTop: 16, textAlign: 'right' }}>
                  <AsciiButton
                    label="Close"
                    onClick={() => setShowQualityPlaybook(false)}
                    variant="ghost"
                  />
                </div>
              </div>
            </AsciiPanel>
          </div>
        </div>
      )}

      {activeView === 'list' ? (
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
      ) : (
        <QualityCharts 
          selectedTable={selectedItem ? {
            schema_name: selectedItem.schema_name,
            table_name: selectedItem.table_name,
            source_db_engine: selectedItem.source_db_engine
          } : null}
        />
      )}
    </div>
  );
};

export default Quality;
