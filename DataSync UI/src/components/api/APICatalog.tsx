import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { format } from 'date-fns';
import styled, { keyframes } from 'styled-components';
import AddAPIModal from './AddAPIModal';
import APICatalogTreeView from './APICatalogTreeView';
import {
  Container,
  Header,
  FiltersContainer,
  Select,
  StatusBadge,
  ErrorMessage,
  LoadingOverlay,
  SearchContainer,
  Button,
  SearchInput,
  SearchButton,
  ClearSearchButton,
} from '../shared/BaseComponents';
import { usePagination } from '../../hooks/usePagination';
import { useTableFilters } from '../../hooks/useTableFilters';
import { apiCatalogApi } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import { sanitizeSearch } from '../../utils/validation';
import { theme } from '../../theme/theme';

interface APICatalogEntry {
  id: number;
  api_name: string;
  api_type: string;
  base_url: string;
  endpoint: string;
  http_method: string;
  auth_type: string;
  target_db_engine: string;
  target_schema: string;
  target_table: string;
  status: string;
  active: boolean;
  sync_interval: number;
  last_sync_time: string | null;
  last_sync_status: string | null;
  created_at: string;
  updated_at: string;
}

const APICatalog = () => {
  const { setPage } = usePagination(1, 20);
  const { filters, setFilter } = useTableFilters({
    api_type: '',
    target_db_engine: '',
    status: '',
    active: ''
  });
  
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [duplicateData, setDuplicateData] = useState<any>(null);
  const [allEntries, setAllEntries] = useState<APICatalogEntry[]>([]);
  const [loadingTree, setLoadingTree] = useState(false);
  const [selectedAPI, setSelectedAPI] = useState<APICatalogEntry | null>(null);
  const [executionHistory, setExecutionHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const isMountedRef = useRef(true);


  const fetchAllEntries = useCallback(async () => {
    if (!isMountedRef.current) return;
    try {
      setLoadingTree(true);
      setError(null);
      const sanitizedSearch = sanitizeSearch(search, 100);
      const params: any = {
        page: 1,
        limit: 10000,
        search: sanitizedSearch
      };
      
      if (filters.api_type) params.api_type = filters.api_type;
      if (filters.target_db_engine) params.target_db_engine = filters.target_db_engine;
      if (filters.status) params.status = filters.status;
      if (filters.active) params.active = filters.active;
      
      const response = await apiCatalogApi.getAPIs(params);
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
  }, [filters.api_type, filters.target_db_engine, filters.status, filters.active, search]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchAllEntries();
    const interval = setInterval(() => {
      if (isMountedRef.current && !showAddModal) {
        fetchAllEntries();
      }
    }, 30000);
    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchAllEntries, showAddModal]);

  const handleSearch = useCallback(() => {
    setSearch(searchInput);
    setPage(1);
  }, [searchInput, setPage]);

  const handleClearSearch = useCallback(() => {
    setSearchInput('');
    setSearch('');
    setPage(1);
  }, [setPage]);

  const handleFilterChange = useCallback((key: string, value: string) => {
    setFilter(key as any, value);
    setPage(1);
  }, [setFilter, setPage]);

  const handleAdd = useCallback(
    async (newEntry: any) => {
      try {
        setError(null);
        await apiCatalogApi.createAPI(newEntry);
        await fetchAllEntries();
        setShowAddModal(false);
        alert(`API "${newEntry.api_name}" added successfully.`);
      } catch (err: any) {
        if (isMountedRef.current) {
          if (err.message && err.message.includes('Network Error')) {
            setError('Network error. Please check if the server is running and try again.');
          } else {
            setError(extractApiError(err));
          }
        }
      }
    },
    [fetchAllEntries]
  );

  const handleDuplicate = useCallback((entry: APICatalogEntry) => {
    setDuplicateData(entry);
    setShowAddModal(true);
  }, []);

  const handleAPIClick = useCallback(async (entry: APICatalogEntry) => {
    setSelectedAPI(entry);
    setLoadingHistory(true);
    setExecutionHistory([]);
    
    try {
      const history = await apiCatalogApi.getHistory(entry.api_name, 50);
      if (isMountedRef.current) {
        setExecutionHistory(history);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(extractApiError(err));
      }
    } finally {
      if (isMountedRef.current) {
        setLoadingHistory(false);
      }
    }
  }, []);

  if (loadingTree && allEntries.length === 0) {
    return (
      <Container>
        <Header>API Catalog</Header>
        <LoadingOverlay>Loading API Catalog...</LoadingOverlay>
      </Container>
    );
  }

  return (
    <Container>
      <Header>API Catalog</Header>
      
      {error && <ErrorMessage>{error}</ErrorMessage>}

      <SearchContainer>
        <SearchInput
          type="text"
          placeholder="Search by API name, endpoint, or target..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        />
        <SearchButton onClick={handleSearch}>Search</SearchButton>
        {search && (
          <ClearSearchButton onClick={handleClearSearch}>Clear</ClearSearchButton>
        )}
      </SearchContainer>

      <FiltersContainer>
        <Button
          $variant="primary"
          onClick={() => setShowAddModal(true)}
        >
          Add API
        </Button>
        
        <Select
          value={filters.api_type as string}
          onChange={(e) => handleFilterChange('api_type', e.target.value)}
        >
          <option value="">All API Types</option>
          <option value="REST">REST</option>
          <option value="GraphQL">GraphQL</option>
          <option value="SOAP">SOAP</option>
        </Select>

        <Select
          value={filters.target_db_engine as string}
          onChange={(e) => handleFilterChange('target_db_engine', e.target.value)}
        >
          <option value="">All Target Engines</option>
          <option value="PostgreSQL">PostgreSQL</option>
          <option value="MariaDB">MariaDB</option>
          <option value="MSSQL">MSSQL</option>
          <option value="MongoDB">MongoDB</option>
          <option value="Oracle">Oracle</option>
        </Select>

        <Select
          value={filters.status as string}
          onChange={(e) => handleFilterChange('status', e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="SUCCESS">SUCCESS</option>
          <option value="ERROR">ERROR</option>
          <option value="IN_PROGRESS">IN_PROGRESS</option>
          <option value="PENDING">PENDING</option>
        </Select>

        <Select
          value={filters.active as string}
          onChange={(e) => handleFilterChange('active', e.target.value)}
        >
          <option value="">All</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </Select>
      </FiltersContainer>

      {loadingTree ? (
        <LoadingOverlay>Loading tree view...</LoadingOverlay>
      ) : (
        <APICatalogTreeView 
          entries={allEntries}
          onEntryClick={handleAPIClick}
          onDuplicate={handleDuplicate}
        />
      )}

      {selectedAPI && (
        <ExecutionTimeline
          api={selectedAPI}
          history={executionHistory}
          loading={loadingHistory}
          onClose={() => setSelectedAPI(null)}
        />
      )}

      {showAddModal && (
        <AddAPIModal
          onClose={() => {
            setShowAddModal(false);
            setDuplicateData(null);
          }}
          onSave={handleAdd}
          initialData={duplicateData}
        />
      )}
    </Container>
  );
};

const slideIn = keyframes`
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
`;

const TimelineOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: ${theme.zIndex.overlay};
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.2s ease-in;
`;

const TimelineContainer = styled.div`
  background: ${theme.colors.background.main};
  border-radius: ${theme.borderRadius.lg};
  box-shadow: ${theme.shadows.xl};
  width: 90%;
  max-width: 1200px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: ${slideIn} 0.3s ease-out;
`;

const TimelineHeader = styled.div`
  padding: ${theme.spacing.lg};
  border-bottom: 2px solid ${theme.colors.border.light};
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: ${theme.colors.gradient.primary};
`;

const TimelineTitle = styled.h2`
  margin: 0;
  font-size: 1.5em;
  color: ${theme.colors.text.primary};
`;

const CloseButton = styled.button`
  background: ${theme.colors.primary.main};
  color: ${theme.colors.text.white};
  border: none;
  border-radius: ${theme.borderRadius.md};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  cursor: pointer;
  font-size: 0.9em;
  transition: all ${theme.transitions.normal};
  
  &:hover {
    background: ${theme.colors.primary.dark};
    transform: translateY(-1px);
    box-shadow: ${theme.shadows.sm};
  }
`;

const TimelineContent = styled.div`
  padding: ${theme.spacing.lg};
  overflow-y: auto;
  flex: 1;
`;

const ChartContainer = styled.div`
  margin-bottom: ${theme.spacing.xl};
  padding: ${theme.spacing.lg};
  background: ${theme.colors.background.secondary};
  border-radius: ${theme.borderRadius.md};
  border: 1px solid ${theme.colors.border.light};
`;

const ChartTitle = styled.h3`
  margin: 0 0 ${theme.spacing.md} 0;
  font-size: 1.2em;
  color: ${theme.colors.text.primary};
`;

const ChartBars = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 8px;
  height: 200px;
  padding: ${theme.spacing.md} 0;
  position: relative;
`;

const Tooltip = styled.div<{ $visible: boolean }>`
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%) translateY(-8px);
  background: ${theme.colors.background.dark};
  color: ${theme.colors.text.white};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border-radius: ${theme.borderRadius.md};
  font-size: 0.85em;
  white-space: pre-line;
  z-index: 1000;
  pointer-events: none;
  opacity: ${props => props.$visible ? 1 : 0};
  transition: opacity ${theme.transitions.normal};
  box-shadow: ${theme.shadows.lg};
  min-width: 200px;
  text-align: left;
  
  &::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 6px solid transparent;
    border-top-color: ${theme.colors.background.dark};
  }
`;

const ChartBar = styled.div<{ $height: number; $status: string }>`
  flex: 1;
  min-width: 20px;
  height: ${props => props.$height}%;
  background: ${props => {
    if (props.$status === 'SUCCESS') return theme.colors.status.success.bg;
    if (props.$status === 'ERROR') return theme.colors.status.error.bg;
    if (props.$status === 'IN_PROGRESS') return theme.colors.status.info.bg;
    return theme.colors.status.skip.bg;
  }};
  border: 2px solid ${props => {
    if (props.$status === 'SUCCESS') return theme.colors.status.success.text;
    if (props.$status === 'ERROR') return theme.colors.status.error.text;
    if (props.$status === 'IN_PROGRESS') return theme.colors.status.info.text;
    return theme.colors.status.skip.text;
  }};
  border-radius: ${theme.borderRadius.sm} ${theme.borderRadius.sm} 0 0;
  position: relative;
  cursor: pointer;
  transition: all ${theme.transitions.normal};
  
  &:hover {
    transform: scaleY(1.05);
    box-shadow: ${theme.shadows.md};
    z-index: 10;
  }
  
  &::after {
    content: '▶';
    position: absolute;
    bottom: -20px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 0.7em;
    color: ${theme.colors.text.secondary};
  }
`;

const ChartYAxis = styled.div`
  position: absolute;
  left: -40px;
  top: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  font-size: 0.85em;
  color: ${theme.colors.text.secondary};
  padding: ${theme.spacing.md} 0;
`;

const ExecutionList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

const ExecutionItem = styled.div<{ $status: string }>`
  padding: ${theme.spacing.md};
  border-radius: ${theme.borderRadius.md};
  border-left: 4px solid ${props => {
    if (props.$status === 'SUCCESS') return theme.colors.status.success.text;
    if (props.$status === 'ERROR') return theme.colors.status.error.text;
    if (props.$status === 'IN_PROGRESS') return theme.colors.status.info.text;
    return theme.colors.status.skip.text;
  }};
  background: ${props => {
    if (props.$status === 'SUCCESS') return theme.colors.status.success.bg;
    if (props.$status === 'ERROR') return theme.colors.status.error.bg;
    if (props.$status === 'IN_PROGRESS') return theme.colors.status.info.bg;
    return theme.colors.status.skip.bg;
  }};
  transition: all ${theme.transitions.normal};
  
  &:hover {
    transform: translateX(4px);
    box-shadow: ${theme.shadows.sm};
  }
`;

const ExecutionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.sm};
`;

const ExecutionTime = styled.div`
  font-size: 0.9em;
  color: ${theme.colors.text.secondary};
`;

const ExecutionDetails = styled.div`
  font-size: 0.85em;
  color: ${theme.colors.text.secondary};
  margin-top: ${theme.spacing.xs};
`;

interface ExecutionTimelineProps {
  api: APICatalogEntry;
  history: any[];
  loading: boolean;
  onClose: () => void;
}

const ExecutionTimeline: React.FC<ExecutionTimelineProps> = ({ api, history, loading, onClose }) => {
  const groupedExecutions = useMemo(() => {
    const executions: any[] = [];
    const processed = new Set<number>();
    const MAX_TIME_RANGE_MS = 24 * 60 * 60 * 1000;
    
    history.forEach((exec) => {
      if (processed.has(exec.id)) return;
      
      if (exec.status === 'IN_PROGRESS') {
        const inProgressTime = new Date(exec.start_time).getTime();
        
        const matchingFinal = history.find((e: any) => 
          !processed.has(e.id) &&
          (e.status === 'SUCCESS' || e.status === 'ERROR') &&
          new Date(e.start_time).getTime() > inProgressTime &&
          (new Date(e.start_time).getTime() - inProgressTime) <= MAX_TIME_RANGE_MS
        );
        
        if (matchingFinal) {
          const finalStartTime = new Date(exec.start_time);
          const finalEndTime = new Date(matchingFinal.end_time);
          const duration = Math.floor((finalEndTime.getTime() - finalStartTime.getTime()) / 1000);
          
          executions.push({
            ...matchingFinal,
            start_time: finalStartTime.toISOString(),
            end_time: finalEndTime.toISOString(),
            duration_seconds: duration > 0 ? duration : (matchingFinal.duration_seconds || 0),
          });
          processed.add(exec.id);
          processed.add(matchingFinal.id);
        } else {
          executions.push(exec);
          processed.add(exec.id);
        }
      } else if (exec.status === 'SUCCESS' || exec.status === 'ERROR') {
        const finalTime = new Date(exec.start_time).getTime();
        
        const matchingInProgress = history.find((e: any) => 
          !processed.has(e.id) &&
          e.status === 'IN_PROGRESS' &&
          new Date(e.start_time).getTime() < finalTime &&
          (finalTime - new Date(e.start_time).getTime()) <= MAX_TIME_RANGE_MS
        );
        
        if (matchingInProgress) {
          const finalStartTime = new Date(matchingInProgress.start_time);
          const finalEndTime = new Date(exec.end_time);
          const duration = Math.floor((finalEndTime.getTime() - finalStartTime.getTime()) / 1000);
          
          executions.push({
            ...exec,
            start_time: finalStartTime.toISOString(),
            end_time: finalEndTime.toISOString(),
            duration_seconds: duration > 0 ? duration : (exec.duration_seconds || 0),
          });
          processed.add(exec.id);
          processed.add(matchingInProgress.id);
        } else {
          executions.push(exec);
          processed.add(exec.id);
        }
      }
    });
    
    return executions.sort((a, b) => 
      new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
    );
  }, [history]);

  const maxDuration = Math.max(...groupedExecutions.map(h => h.duration_seconds || 0), 1);

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatDateTime = (dateStr: string) => {
    return format(new Date(dateStr), 'PPpp');
  };

  const BarWithTooltip: React.FC<{ height: number; status: string; tooltipText: string }> = ({ height, status, tooltipText }) => {
    const [showTooltip, setShowTooltip] = useState(false);
    return (
      <ChartBar
        $height={height}
        $status={status}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <Tooltip $visible={showTooltip}>
          {tooltipText}
        </Tooltip>
      </ChartBar>
    );
  };

  return (
    <TimelineOverlay onClick={onClose}>
      <TimelineContainer onClick={(e) => e.stopPropagation()}>
        <TimelineHeader>
          <TimelineTitle>Execution Timeline: {api.api_name}</TimelineTitle>
          <CloseButton onClick={onClose}>Close</CloseButton>
        </TimelineHeader>
        <TimelineContent>
          {loading ? (
            <LoadingOverlay>Loading execution history...</LoadingOverlay>
          ) : groupedExecutions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: theme.spacing.xxl, color: theme.colors.text.secondary }}>
              No execution history available for this API.
            </div>
          ) : (
            <>
              <ChartContainer>
                <ChartTitle>Execution Duration Timeline</ChartTitle>
                <div style={{ position: 'relative', paddingLeft: '40px' }}>
                  <ChartYAxis>
                    <span>{formatDuration(maxDuration)}</span>
                    <span>{formatDuration(Math.floor(maxDuration / 2))}</span>
                    <span>0s</span>
                  </ChartYAxis>
                  <ChartBars>
                    {groupedExecutions.slice(0, 20).reverse().map((exec) => {
                      const height = maxDuration > 0 ? (exec.duration_seconds || 0) / maxDuration * 100 : 0;
                      const tooltipText = `${exec.status}\nDuration: ${formatDuration(exec.duration_seconds || 0)}\nStart: ${formatDateTime(exec.start_time)}\nEnd: ${formatDateTime(exec.end_time)}`;
                      return (
                        <BarWithTooltip
                          key={exec.id}
                          height={height}
                          status={exec.status}
                          tooltipText={tooltipText}
                        />
                      );
                    })}
                  </ChartBars>
                </div>
              </ChartContainer>
              
              <ChartTitle>Execution History</ChartTitle>
              <ExecutionList>
                {groupedExecutions.map((exec) => {
                  return (
                    <ExecutionItem key={exec.id} $status={exec.status}>
                      <ExecutionHeader>
                        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
                          <StatusBadge $status={exec.status}>{exec.status}</StatusBadge>
                          <span style={{ fontWeight: 600 }}>{formatDateTime(exec.start_time)}</span>
                        </div>
                        <ExecutionTime>{formatDuration(exec.duration_seconds || 0)}</ExecutionTime>
                      </ExecutionHeader>
                      <ExecutionDetails>
                        <div>Start: {formatDateTime(exec.start_time)}</div>
                        <div>End: {formatDateTime(exec.end_time)}</div>
                        {exec.total_rows_processed > 0 && (
                          <div style={{ marginTop: theme.spacing.xs }}>
                            Rows processed: {exec.total_rows_processed.toLocaleString()}
                          </div>
                        )}
                        {exec.error_message && (
                          <div style={{ color: theme.colors.status.error.text, marginTop: theme.spacing.xs }}>
                            Error: {exec.error_message}
                          </div>
                        )}
                      </ExecutionDetails>
                    </ExecutionItem>
                  );
                })}
              </ExecutionList>
            </>
          )}
        </TimelineContent>
      </TimelineContainer>
    </TimelineOverlay>
  );
};

export default APICatalog;
