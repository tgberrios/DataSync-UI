import { useState, useEffect, useCallback, useRef } from 'react';
import styled from 'styled-components';
import {
  Container,
  Header,
  ErrorMessage,
  LoadingOverlay,
  Button,
} from '../shared/BaseComponents';
import { logsApi, type LogEntry, type LogInfo } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import { sanitizeSearch } from '../../utils/validation';
import { theme } from '../../theme/theme';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import SkeletonLoader from '../shared/SkeletonLoader';

const Section = styled.div`
  margin-bottom: ${theme.spacing.xxl};
  padding: ${theme.spacing.lg};
  border: 1px solid ${asciiColors.border};
  border-radius: 2px;
  background-color: ${asciiColors.backgroundSoft};
  transition: all ${theme.transitions.normal};
  animation: slideUp 0.25s ease-out;
  animation-fill-mode: both;
  font-family: "Consolas";
  font-size: 12px;
  
  &:nth-child(1) { animation-delay: 0.05s; }
  &:nth-child(2) { animation-delay: 0.1s; }
`;

const SectionTitle = styled.h2`
  margin: 0;
  margin-bottom: ${theme.spacing.md};
  font-size: 14px;
  font-family: "Consolas";
  color: ${asciiColors.accent};
  border-bottom: 1px solid ${asciiColors.border};
  padding-bottom: 8px;
  font-weight: 600;
`;

const Controls = styled.div`
  display: flex;
  gap: ${theme.spacing.lg};
  margin-bottom: ${theme.spacing.lg};
  padding: ${theme.spacing.lg};
  background-color: ${asciiColors.background};
  border: 1px solid ${asciiColors.border};
  border-radius: 2px;
  flex-wrap: wrap;
  align-items: end;
  animation: slideUp 0.25s ease-out;
  animation-delay: 0.08s;
  animation-fill-mode: both;
  font-family: "Consolas";
  font-size: 12px;
`;

const ControlGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 120px;
`;

const Label = styled.label`
  font-size: 12px;
  font-weight: bold;
  color: ${asciiColors.foreground};
  font-family: "Consolas";
`;

const Select = styled.select`
  padding: 8px 12px;
  border: 1px solid ${asciiColors.border};
  border-radius: 2px;
  background-color: ${asciiColors.background};
  font-family: "Consolas";
  font-size: 12px;
  transition: all ${theme.transitions.normal};
  cursor: pointer;

  &:hover {
    border-color: rgba(10, 25, 41, 0.3);
  }

  &:focus {
    outline: none;
    border-color: ${theme.colors.primary.main};
    box-shadow: 0 0 0 3px rgba(10, 25, 41, 0.1);
  }
`;

const Input = styled.input`
  padding: 8px 12px;
  border: 1px solid ${theme.colors.border.medium};
  border-radius: ${theme.borderRadius.md};
  font-family: ${theme.fonts.primary};
  font-size: 1em;
  width: 100px;
  transition: all ${theme.transitions.normal};

  &:hover {
    border-color: rgba(10, 25, 41, 0.3);
  }

  &:focus {
    outline: none;
    border-color: ${theme.colors.primary.main};
    box-shadow: 0 0 0 3px rgba(10, 25, 41, 0.1);
    transform: translateY(-1px);
  }
`;

const LogsArea = styled.div<{ $isTransitioning?: boolean }>`
  flex: 1;
  border: 1px solid ${asciiColors.border};
  border-radius: 2px;
  background-color: ${asciiColors.background};
  color: ${asciiColors.foreground};
  overflow-y: auto;
  padding: ${theme.spacing.md};
  font-size: 11px;
  font-family: "Consolas";
  line-height: 1.6;
  max-height: 500px;
  transition: all ${theme.transitions.normal};
  animation: ${props => props.$isTransitioning ? 'pageTransition 0.2s ease-out' : 'none'};
`;

const LogLine = styled.div<{ $level: string; $category: string }>`
  margin-bottom: 2px;
  padding: 4px 0;
  border-left: 2px solid ${props => {
    switch (props.$level) {
      case 'ERROR':
      case 'CRITICAL':
        return asciiColors.danger;
      case 'WARNING':
        return asciiColors.warning;
      case 'INFO':
        return asciiColors.accent;
      case 'DEBUG':
        return asciiColors.muted;
      default:
        return asciiColors.muted;
    }
  }};
  padding-left: 8px;
  position: relative;
  transition: all 0.15s ease;
  font-family: "Consolas";
  font-size: 11px;

  &:hover {
    background-color: ${asciiColors.backgroundSoft};
    transform: translateX(2px);
  }
`;

const LogTimestamp = styled.span`
  color: ${asciiColors.muted};
  margin-right: 10px;
  font-size: 11px;
  font-family: "Consolas";
`;

const LogLevel = styled.span<{ $level: string }>`
  font-weight: bold;
  margin-right: 10px;
  font-family: "Consolas";
  font-size: 11px;
  color: ${props => {
    switch (props.$level) {
      case 'ERROR':
      case 'CRITICAL':
        return asciiColors.danger;
      case 'WARNING':
        return asciiColors.warning;
      case 'INFO':
        return asciiColors.accent;
      case 'DEBUG':
        return asciiColors.muted;
      default:
        return asciiColors.foreground;
    }
  }};
`;

const LogFunction = styled.span`
  color: ${asciiColors.muted};
  margin-right: 10px;
  font-size: 11px;
  font-family: "Consolas";
`;

const LogCategory = styled.span<{ $category: string }>`
  color: ${asciiColors.muted};
  margin-right: 10px;
  font-size: 11px;
  font-weight: 500;
  font-family: "Consolas";
  background-color: ${asciiColors.backgroundSoft};
  padding: 2px 6px;
  border-radius: 2px;
  border: 1px solid ${asciiColors.border};
`;

const LogMessage = styled.span`
  color: ${asciiColors.foreground};
  font-family: "Consolas";
  font-size: 11px;
`;

const Pagination = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: ${theme.spacing.sm};
  margin-top: ${theme.spacing.md};
  padding: ${theme.spacing.md};
  background-color: ${asciiColors.backgroundSoft};
  border: 1px solid ${asciiColors.border};
  border-radius: 2px;
  font-family: "Consolas";
  font-size: 12px;
`;


const PageInfo = styled.span`
  color: ${asciiColors.muted};
  font-family: "Consolas";
  font-size: 11px;
`;

const SuccessMessage = styled.div`
  margin-top: ${theme.spacing.md};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background-color: ${asciiColors.success}20;
  border: 1px solid ${asciiColors.success};
  border-radius: 2px;
  color: ${asciiColors.success};
  text-align: center;
  font-family: "Consolas";
  font-size: 12px;
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  background-color: rgba(0, 0, 0, 0.5);
`;

const ModalContent = styled.div`
  background: ${asciiColors.background};
  padding: ${theme.spacing.xxl};
  border-radius: 2px;
  border: 2px solid ${asciiColors.border};
  max-width: 500px;
  text-align: center;
  font-family: "Consolas";
  font-size: 12px;
`;

/**
 * Logs Viewer component
 * Displays and manages application logs with filtering, pagination, and export capabilities
 */
const LogsViewer = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logInfo, setLogInfo] = useState<LogInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lines, setLines] = useState(10000);
  const [level, setLevel] = useState('ALL');
  const [category, setCategory] = useState('ALL');
  const [search, setSearch] = useState('');
  const [func, setFunc] = useState('ALL');
  const [categoriesList, setCategoriesList] = useState<string[]>(['ALL']);
  const [functionsList, setFunctionsList] = useState<string[]>(['ALL']);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [autoCleanup, setAutoCleanup] = useState(process.env.NODE_ENV === 'production');
  const [deleteDebug, setDeleteDebug] = useState(process.env.NODE_ENV === 'production');
  const [deleteDuplicates, setDeleteDuplicates] = useState(false);
  const [deleteOlderThan, setDeleteOlderThan] = useState<number | undefined>(undefined);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [refreshCountdown, setRefreshCountdown] = useState(5);
  const [isCopying, setIsCopying] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isPageTransitioning, setIsPageTransitioning] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [allLogs, setAllLogs] = useState<LogEntry[]>([]);
  
  const logsEndRef = useRef<HTMLDivElement>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  const isInitialLoadRef = useRef(true);
  
  const fetchLogs = useCallback(async () => {
    if (!isMountedRef.current) return;
    const isInitialLoad = isInitialLoadRef.current;
    
    const startTime = Date.now();
    const minLoadingTime = 300;
    
    try {
      setIsRefreshing(true);
      setError(null);
      if (isInitialLoad) {
        setLoading(true);
      }
      const sanitizedSearch = sanitizeSearch(search, 200);
      
      const [logsData, infoData] = await Promise.all([
        logsApi.getLogs({ 
          lines, 
          level, 
          category,
          function: func,
          search: sanitizedSearch,
          startDate,
          endDate,
          autoCleanup: autoCleanup || undefined,
          deleteDebug: deleteDebug || undefined,
          deleteDuplicates: deleteDuplicates || undefined,
          deleteOlderThan: deleteOlderThan || undefined
        }),
        logsApi.getLogInfo()
      ]);
      
      if (isInitialLoad) {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, minLoadingTime - elapsed);
        await new Promise(resolve => setTimeout(resolve, remaining));
      }
      
      if (isMountedRef.current) {
        setAllLogs(logsData.logs || []);
        setLogInfo(infoData);
        
        const logsPerPage = 50;
        const totalPages = Math.ceil((logsData.logs || []).length / logsPerPage);
        setTotalPages(totalPages);
        
        const startIndex = (currentPage - 1) * logsPerPage;
        const endIndex = startIndex + logsPerPage;
        setLogs((logsData.logs || []).slice(startIndex, endIndex));
        isInitialLoadRef.current = false;
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(extractApiError(err));
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [lines, level, category, func, search, startDate, endDate, currentPage, autoCleanup, deleteDebug, deleteDuplicates, deleteOlderThan]);

  useEffect(() => {
    const loadFilters = async () => {
      try {
        if (!isMountedRef.current) return;
        const [cats, funcs] = await Promise.all([
          logsApi.getCategories(),
          logsApi.getFunctions(),
        ]);
        if (isMountedRef.current) {
          setCategoriesList(['ALL', ...(cats || []).filter(Boolean)]);
          setFunctionsList(['ALL', ...(funcs || []).filter(Boolean)]);
        }
      } catch (err) {
        if (isMountedRef.current) {
          console.error('Error loading filters:', err);
        }
      }
    };
    loadFilters();
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    fetchLogs();
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchLogs]);

  useEffect(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    if (autoRefresh && isMountedRef.current) {
      setRefreshCountdown(5);
      
      countdownIntervalRef.current = setInterval(() => {
        if (isMountedRef.current) {
          setRefreshCountdown(prev => {
            if (prev <= 1) {
              return 5;
            }
            return prev - 1;
          });
        }
      }, 1000);

      const refreshInterval = setInterval(() => {
        if (isMountedRef.current) {
          fetchLogs();
          setCurrentPage(1);
          setRefreshCountdown(5);
        }
      }, 5000);

      return () => {
        clearInterval(refreshInterval);
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
      };
    } else {
      setRefreshCountdown(5);
    }
  }, [autoRefresh, fetchLogs]);

  useEffect(() => {
    if (allLogs.length > 0 && isMountedRef.current) {
      const logsPerPage = 50;
      const totalPages = Math.ceil(allLogs.length / logsPerPage);
      setTotalPages(totalPages);
      const startIndex = (currentPage - 1) * logsPerPage;
      const endIndex = startIndex + logsPerPage;
      setLogs(allLogs.slice(startIndex, endIndex));
    }
  }, [allLogs, currentPage]);

  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  const scrollToBottom = useCallback(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const goToPage = useCallback((pageNum: number) => {
    if (pageNum >= 1 && pageNum <= totalPages && pageNum !== currentPage) {
      setIsPageTransitioning(true);
      setTimeout(() => {
        setCurrentPage(pageNum);
        const logsPerPage = 50;
        const startIndex = (pageNum - 1) * logsPerPage;
        const endIndex = startIndex + logsPerPage;
        setLogs(allLogs.slice(startIndex, endIndex));
        setTimeout(() => setIsPageTransitioning(false), 200);
      }, 50);
    }
  }, [totalPages, currentPage, allLogs]);

  const goToFirstPage = useCallback(() => goToPage(1), [goToPage]);
  const goToLastPage = useCallback(() => goToPage(totalPages), [goToPage, totalPages]);
  const goToPreviousPage = useCallback(() => goToPage(currentPage - 1), [goToPage, currentPage]);
  const goToNextPage = useCallback(() => goToPage(currentPage + 1), [goToPage, currentPage]);

  const handleClearLogs = useCallback(async () => {
    try {
      if (!isMountedRef.current) return;
      setIsClearing(true);
      setError(null);
      
      await logsApi.clearLogs();
      
      if (isMountedRef.current) {
        setShowClearDialog(false);
        setCurrentPage(1);
        await fetchLogs();
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(extractApiError(err));
      }
    } finally {
      if (isMountedRef.current) {
        setIsClearing(false);
      }
    }
  }, [fetchLogs]);

  const clearFilters = useCallback(() => {
    setLines(10000);
    setLevel('ALL');
    setCategory('ALL');
    setSearch('');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  }, []);

  const handleCopyAllLogs = useCallback(async () => {
    try {
      if (!isMountedRef.current) return;
      setIsCopying(true);
      setCopySuccess(false);
      
      const allLogsData = await logsApi.getLogs({ 
        lines: 10000, 
        level, 
        category,
        search: sanitizeSearch(search, 200),
        startDate,
        endDate
      });
      
      const logsText = (allLogsData.logs || []).map(log => {
        const timestamp = log.timestamp;
        const levelStr = `[${log.level}]`;
        const funcStr = log.function ? `[${log.function}]` : '';
        const message = log.message;
        return `${timestamp} ${levelStr} ${funcStr} ${message}`.trim();
      }).join('\n');
      
      const header = `DataSync Logs - ${new Date().toLocaleString()}\n` +
                    `Total Entries: ${(allLogsData.logs || []).length}\n` +
                    `Level Filter: ${level}\n` +
                    `Category Filter: ${category}\n` +
                    `File: ${logInfo?.filePath || 'Unknown'}\n` +
                    `Size: ${logInfo ? formatFileSize(logInfo.size || 0) : 'Unknown'}\n` +
                    `Last Modified: ${logInfo?.lastModified ? formatDate(logInfo.lastModified) : 'Unknown'}\n` +
                    `${'='.repeat(80)}\n\n`;
      
      const fullText = header + logsText;
      
      await navigator.clipboard.writeText(fullText);
      
      if (isMountedRef.current) {
        setCopySuccess(true);
        setTimeout(() => {
          if (isMountedRef.current) {
            setCopySuccess(false);
          }
        }, 3000);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(extractApiError(err));
      }
    } finally {
      if (isMountedRef.current) {
        setIsCopying(false);
      }
    }
  }, [level, category, search, startDate, endDate, logInfo]);

  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleString();
  }, []);

  if (loading) {
    return <SkeletonLoader variant="table" />;
  }

  if (error && logs.length === 0) {
    return (
      <div style={{
        width: "100%",
        minHeight: "100vh",
        padding: "20px",
        fontFamily: "Consolas",
        fontSize: 12,
        color: asciiColors.foreground,
        backgroundColor: asciiColors.background,
        display: "flex",
        flexDirection: "column",
        gap: 20
      }}>
        <h1 style={{
          fontSize: 14,
          fontWeight: 600,
          margin: "0 0 20px 0",
          color: asciiColors.foreground,
          textTransform: "uppercase",
          fontFamily: "Consolas"
        }}>
          <span style={{ color: asciiColors.accent, marginRight: 8 }}>{ascii.blockFull}</span>
          LOGS
        </h1>
        <div style={{ marginBottom: 20 }}>
          <AsciiPanel title="ERROR">
            <div style={{
              padding: "12px",
              color: asciiColors.danger,
              fontSize: 12,
              fontFamily: "Consolas",
              marginBottom: 12
            }}>
              Error loading logs: {error}
            </div>
            <AsciiButton 
              label="Retry"
              onClick={fetchLogs}
              variant="primary"
            />
          </AsciiPanel>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      width: "100%",
      minHeight: "100vh",
      padding: "20px",
      fontFamily: "Consolas",
      fontSize: 12,
      color: asciiColors.foreground,
      backgroundColor: asciiColors.background,
      display: "flex",
      flexDirection: "column",
      gap: 20
    }}>
      <h1 style={{
        fontSize: 14,
        fontWeight: 600,
        margin: "0 0 20px 0",
        color: asciiColors.foreground,
        textTransform: "uppercase",
        fontFamily: "Consolas"
      }}>
        <span style={{ color: asciiColors.accent, marginRight: 8 }}>{ascii.blockFull}</span>
        LOGS
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
      
      <AsciiPanel title="LOG CONTROLS">
        <Controls>
          <ControlGroup>
            <Label>Lines to show:</Label>
            <Input
              type="number"
              value={lines}
              onChange={(e) => setLines(Math.max(10, parseInt(e.target.value) || 10000))}
              min="10"
              max="100000"
            />
          </ControlGroup>
          
          <ControlGroup>
            <Label>Log Level:</Label>
            <Select value={level} onChange={(e) => setLevel(e.target.value)}>
              <option value="ALL">All Levels</option>
              <option value="DEBUG">DEBUG</option>
              <option value="INFO">INFO</option>
              <option value="WARNING">WARNING</option>
              <option value="ERROR">ERROR</option>
              <option value="CRITICAL">CRITICAL</option>
            </Select>
          </ControlGroup>
          
          <ControlGroup>
            <Label>Category:</Label>
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              {categoriesList.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
          </ControlGroup>

          <ControlGroup>
            <Label>Function:</Label>
            <Select value={func} onChange={(e) => setFunc(e.target.value)}>
              {functionsList.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </Select>
          </ControlGroup>
          
          <ControlGroup>
            <Label>Search:</Label>
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search in logs..."
              style={{ width: '150px' }}
            />
          </ControlGroup>
          
          <ControlGroup>
            <Label>Start Date:</Label>
            <Input
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ width: '180px' }}
            />
          </ControlGroup>
          
          <ControlGroup>
            <Label>End Date:</Label>
            <Input
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ width: '180px' }}
            />
          </ControlGroup>
          
          <ControlGroup>
            <Label>Auto Refresh:</Label>
            <AsciiButton
              label={autoRefresh ? 'ON' : 'OFF'}
              onClick={() => setAutoRefresh(!autoRefresh)}
              variant={autoRefresh ? 'primary' : 'ghost'}
            />
          </ControlGroup>
          
          {autoRefresh && (
            <ControlGroup>
              <Label>Next Refresh:</Label>
              <div style={{
                padding: '8px 12px',
                border: `1px solid ${asciiColors.border}`,
                borderRadius: 2,
                backgroundColor: asciiColors.background,
                textAlign: 'center',
                fontFamily: "Consolas",
                fontSize: 12,
                color: asciiColors.foreground,
                minWidth: '60px'
              }}>
                {refreshCountdown}s
              </div>
            </ControlGroup>
          )}

          <ControlGroup>
            <Label>Auto Cleanup:</Label>
            <AsciiButton
              label={autoCleanup ? 'ON' : 'OFF'}
              onClick={() => setAutoCleanup(!autoCleanup)}
              variant={autoCleanup ? 'primary' : 'ghost'}
            />
          </ControlGroup>

          {autoCleanup && (
            <>
              <ControlGroup>
                <Label>Delete DEBUG:</Label>
                <AsciiButton
                  label={deleteDebug ? 'YES' : 'NO'}
                  onClick={() => setDeleteDebug(!deleteDebug)}
                  variant={deleteDebug ? 'primary' : 'ghost'}
                />
              </ControlGroup>

              <ControlGroup>
                <Label>Delete Duplicates:</Label>
                <AsciiButton
                  label={deleteDuplicates ? 'YES' : 'NO'}
                  onClick={() => setDeleteDuplicates(!deleteDuplicates)}
                  variant={deleteDuplicates ? 'primary' : 'ghost'}
                />
              </ControlGroup>

              <ControlGroup>
                <Label>Delete Older (days):</Label>
                <Input
                  type="number"
                  value={deleteOlderThan || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDeleteOlderThan(val ? parseInt(val) : undefined);
                  }}
                  placeholder="Optional"
                  min="1"
                  style={{ width: '100px' }}
                />
              </ControlGroup>
            </>
          )}
          
          <AsciiButton 
            label={isRefreshing ? 'Refreshing...' : 'Refresh Now'}
            onClick={fetchLogs} 
            disabled={isRefreshing}
            variant="primary"
          />
          
          <AsciiButton 
            label="Clear Filters"
            onClick={clearFilters}
            variant="ghost"
          />
          
          <AsciiButton 
            label="Scroll to Bottom"
            onClick={scrollToBottom}
            variant="ghost"
          />
          
          <AsciiButton 
            label="Go to Latest"
            onClick={() => goToPage(1)}
            variant="ghost"
          />
          
          <AsciiButton 
            label={isCopying ? 'Copying...' : 'Copy Logs'}
            onClick={handleCopyAllLogs}
            disabled={isCopying || isRefreshing}
            variant="ghost"
          />
          
          <AsciiButton 
            label={isClearing ? 'Clearing...' : 'Clear Logs'}
            onClick={() => setShowClearDialog(true)}
            disabled={isClearing || isRefreshing}
            variant="ghost"
          />
        </Controls>
        
        {copySuccess && (
          <AsciiPanel title="SUCCESS">
            <div style={{ 
              color: asciiColors.success, 
              fontFamily: "Consolas", 
              fontSize: 12,
              padding: "8px 0"
            }}>
              {ascii.blockFull} Logs copied to clipboard successfully!
            </div>
          </AsciiPanel>
        )}
      </AsciiPanel>

      <AsciiPanel title="LOG ENTRIES (DB)">
        <LogsArea $isTransitioning={isPageTransitioning}>
          {logs.map((log, index) => (
            <LogLine key={log.id || index} $level={log.level} $category={log.category || 'SYSTEM'}>
              <LogTimestamp>{log.timestamp ? formatDate(log.timestamp) : ''}</LogTimestamp>
              <LogLevel $level={log.level}>[{(log.level || '').toUpperCase()}]</LogLevel>
              {log.category && <LogCategory $category={log.category}>[{(log.category || '').toUpperCase()}]</LogCategory>}
              {log.function && <LogFunction>[{log.function}]</LogFunction>}
              <LogMessage>{log.message}</LogMessage>
            </LogLine>
          ))}
          <div ref={logsEndRef} />
        </LogsArea>
        
        {totalPages > 1 && (
          <Pagination>
            <AsciiButton 
              label="««"
              onClick={goToFirstPage} 
              disabled={currentPage === 1}
              variant="ghost"
            />
            <AsciiButton 
              label="«"
              onClick={goToPreviousPage} 
              disabled={currentPage === 1}
              variant="ghost"
            />
            
            {Array.from({ length: Math.min(20, totalPages) }, (_, i) => {
              const startPage = Math.max(1, currentPage - 9);
              const page = startPage + i;
              if (page > totalPages) return null;
              
              return (
                <AsciiButton
                  key={page}
                  label={page.toString()}
                  onClick={() => goToPage(page)}
                  variant={currentPage === page ? 'primary' : 'ghost'}
                />
              );
            })}
            
            {totalPages > 20 && currentPage < totalPages - 9 && (
              <PageInfo style={{ color: asciiColors.muted, fontSize: 11, fontFamily: "Consolas" }}>
                ...
              </PageInfo>
            )}
            
            <AsciiButton 
              label="»"
              onClick={goToNextPage} 
              disabled={currentPage === totalPages}
              variant="ghost"
            />
            <AsciiButton 
              label="»»"
              onClick={goToLastPage} 
              disabled={currentPage === totalPages}
              variant="ghost"
            />
            
            <PageInfo>
              Page {currentPage} of {totalPages}
            </PageInfo>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ fontSize: 11, color: asciiColors.muted, fontFamily: "Consolas" }}>Go to:</span>
              <Input
                type="number"
                min="1"
                max={totalPages}
                style={{ width: '60px', padding: '4px 8px', fontSize: 11, fontFamily: "Consolas" }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    const targetPage = parseInt((e.target as HTMLInputElement).value);
                    if (targetPage >= 1 && targetPage <= totalPages) {
                      goToPage(targetPage);
                      (e.target as HTMLInputElement).value = '';
                    }
                  }
                }}
                placeholder={currentPage.toString()}
              />
            </div>
          </Pagination>
        )}
      </AsciiPanel>

      {showClearDialog && (
        <ModalOverlay>
          <ModalContent style={{
            background: asciiColors.background,
            padding: theme.spacing.xxl,
            borderRadius: 2,
            border: `2px solid ${asciiColors.border}`,
            maxWidth: 500,
            textAlign: 'center',
            fontFamily: "Consolas",
            fontSize: 12
          }}>
            <h3 style={{ 
              margin: 0,
              marginBottom: 20, 
              color: asciiColors.danger,
              fontSize: 14,
              fontFamily: "Consolas",
              fontWeight: 600
            }}>
              {ascii.blockFull} CLEAR LOGS CONFIRMATION
            </h3>
            <p style={{ 
              marginBottom: 25, 
              lineHeight: 1.5,
              color: asciiColors.foreground,
              fontFamily: "Consolas",
              fontSize: 12
            }}>
              This action will TRUNCATE the database table:
              <br />
              {ascii.dot} metadata.logs (all log entries will be removed)
              <br />
              <strong>This operation cannot be undone!</strong>
            </p>
            <div style={{ display: 'flex', gap: 15, justifyContent: 'center' }}>
              <AsciiButton
                label="Cancel"
                onClick={() => setShowClearDialog(false)}
                disabled={isClearing}
                variant="ghost"
              />
              <AsciiButton
                label={isClearing ? 'Clearing...' : 'Clear Logs'}
                onClick={handleClearLogs}
                disabled={isClearing}
                variant="ghost"
              />
            </div>
          </ModalContent>
        </ModalOverlay>
      )}
    </div>
  );
};

export default LogsViewer;
