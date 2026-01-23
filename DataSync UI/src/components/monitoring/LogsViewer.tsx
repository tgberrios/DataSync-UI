import { useState, useEffect, useCallback, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
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
  border-radius: 2;
  background-color: ${asciiColors.backgroundSoft};
  transition: background-color 0.15s ease, border-color 0.15s ease;
  font-family: 'Consolas';
  font-size: 12px;
`;

const SectionTitle = styled.h2`
  margin: 0;
  margin-bottom: ${theme.spacing.md};
  font-size: 14px;
  font-family: 'Consolas';
  color: ${asciiColors.accent};
  border-bottom: 1px solid ${asciiColors.border};
  padding-bottom: ${theme.spacing.sm};
  font-weight: 600;
`;

const Controls = styled.div`
  display: flex;
  gap: ${theme.spacing.lg};
  margin-bottom: ${theme.spacing.lg};
  padding: ${theme.spacing.lg};
  background-color: ${asciiColors.background};
  border: 1px solid ${asciiColors.border};
  border-radius: 2;
  flex-wrap: wrap;
  align-items: end;
  font-family: 'Consolas';
  font-size: 12px;
`;

const ControlGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
  min-width: 120px;
`;

const Label = styled.label`
  font-size: 12px;
  font-weight: 600;
  color: ${asciiColors.foreground};
  font-family: 'Consolas';
`;

const Select = styled.select`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border: 1px solid ${asciiColors.border};
  border-radius: 2;
  background-color: ${asciiColors.background};
  font-family: 'Consolas';
  font-size: 12px;
  transition: border-color 0.15s ease;
  cursor: pointer;
  outline: none;

  &:focus {
    border-color: ${asciiColors.accent};
    outline: 2px solid ${asciiColors.accent};
    outline-offset: 2px;
  }
`;

const Input = styled.input`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border: 1px solid ${asciiColors.border};
  border-radius: 2;
  font-family: 'Consolas';
  font-size: 12px;
  width: 100px;
  transition: border-color 0.15s ease;
  outline: none;

  &:focus {
    border-color: ${asciiColors.accent};
    outline: 2px solid ${asciiColors.accent};
    outline-offset: 2px;
  }
`;

const LogsArea = styled.div<{ $isTransitioning?: boolean }>`
  flex: 1;
  border: 1px solid ${asciiColors.border};
  border-radius: 2;
  background-color: ${asciiColors.background};
  color: ${asciiColors.foreground};
  overflow-y: auto;
  padding: ${theme.spacing.md};
  font-size: 11px;
  font-family: 'Consolas';
  line-height: 1.6;
  max-height: 500px;
  transition: background-color 0.15s ease;
  position: relative;
  
  &::-webkit-scrollbar {
    width: 0px;
    display: none;
  }
  
  -ms-overflow-style: none;
  scrollbar-width: none;
  
  /* Track scroll position to auto-scroll on new logs */
  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 1px;
  }
`;

const logEntryFadeIn = keyframes`
  0% {
    opacity: 0;
    transform: translateY(-12px) scale(0.98);
    background-color: ${asciiColors.accent}44;
    border-left-width: 4px;
  }
  30% {
    opacity: 0.7;
    background-color: ${asciiColors.backgroundSoft};
  }
  60% {
    background-color: ${asciiColors.backgroundSoft};
    border-left-width: 3px;
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
    background-color: transparent;
    border-left-width: 2px;
  }
`;

const LogLine = styled.div<{ $level: string; $category: string; $isNew?: boolean }>`
  margin-bottom: 2px;
  padding: ${theme.spacing.xs} 0;
  border-left: ${props => props.$isNew ? '3px' : '2px'} solid ${props => {
    switch (props.$level) {
      case 'ERROR':
      case 'CRITICAL':
        return asciiColors.foreground;
      case 'WARNING':
        return asciiColors.muted;
      case 'INFO':
        return asciiColors.accent;
      case 'DEBUG':
        return asciiColors.muted;
      default:
        return asciiColors.muted;
    }
  }};
  padding-left: ${theme.spacing.sm};
  position: relative;
  font-family: 'Consolas';
  font-size: 11px;
  ${props => props.$isNew ? `
    animation: ${logEntryFadeIn} 1s cubic-bezier(0.4, 0, 0.2, 1);
    will-change: opacity, transform, background-color;
  ` : `
    transition: background-color 0.15s ease;
  `}
`;

const LogTimestamp = styled.span`
  color: ${asciiColors.muted};
  margin-right: ${theme.spacing.sm};
  font-size: 11px;
  font-family: 'Consolas';
`;

const LogLevel = styled.span<{ $level: string }>`
  font-weight: 600;
  margin-right: ${theme.spacing.sm};
  font-family: 'Consolas';
  font-size: 11px;
  color: ${props => {
    switch (props.$level) {
      case 'ERROR':
      case 'CRITICAL':
        return asciiColors.foreground;
      case 'WARNING':
        return asciiColors.muted;
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
  margin-right: ${theme.spacing.sm};
  font-size: 11px;
  font-family: 'Consolas';
`;

const LogCategory = styled.span<{ $category: string }>`
  color: ${asciiColors.muted};
  margin-right: ${theme.spacing.sm};
  font-size: 11px;
  font-weight: 500;
  font-family: 'Consolas';
  background-color: ${asciiColors.backgroundSoft};
  padding: ${theme.spacing.xs} ${theme.spacing.xs};
  border-radius: 2;
  border: 1px solid ${asciiColors.border};
`;

const LogMessage = styled.span`
  color: ${asciiColors.foreground};
  font-family: 'Consolas';
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
  border-radius: 2;
  font-family: 'Consolas';
  font-size: 12px;
`;


const PageInfo = styled.span`
  color: ${asciiColors.muted};
  font-family: 'Consolas';
  font-size: 11px;
`;

const SuccessMessage = styled.div`
  margin-top: ${theme.spacing.md};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background-color: ${asciiColors.backgroundSoft};
  border: 1px solid ${asciiColors.accent};
  border-radius: 2;
  color: ${asciiColors.accent};
  text-align: center;
  font-family: 'Consolas';
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
  border-radius: 2;
  border: 2px solid ${asciiColors.border};
  max-width: 500px;
  text-align: center;
  font-family: 'Consolas';
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
  const [showLogsPlaybook, setShowLogsPlaybook] = useState(false);
  const [newLogIds, setNewLogIds] = useState<Set<number>>(new Set());
  
  const logsEndRef = useRef<HTMLDivElement>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const previousLogsRef = useRef<LogEntry[]>([]);
  const wasAtBottomRef = useRef(true);
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
        const newLogs = logsData.logs || [];
        const previousLogs = previousLogsRef.current;
        
        // Detect new logs (logs that weren't in the previous fetch)
        if (!isInitialLoad && previousLogs.length > 0) {
          const previousIds = new Set(previousLogs.map(log => log.id).filter(Boolean));
          const newIds = new Set(
            newLogs
              .filter(log => log.id && !previousIds.has(log.id))
              .map(log => log.id!)
          );
          
          if (newIds.size > 0) {
            // Force a small delay to ensure React re-renders with the new state
            requestAnimationFrame(() => {
              if (isMountedRef.current) {
                setNewLogIds(newIds);
                // Clear the "new" flag after animation completes (1s animation + buffer)
                setTimeout(() => {
                  if (isMountedRef.current) {
                    setNewLogIds(new Set());
                  }
                }, 1500);
              }
            });
            
            // Auto-scroll to bottom if user was at bottom
            if (wasAtBottomRef.current && logsEndRef.current) {
              setTimeout(() => {
                logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
              }, 100);
            }
          }
        }
        
        previousLogsRef.current = newLogs;
        setAllLogs(newLogs);
        setLogInfo(infoData);
        
        const logsPerPage = 50;
        const totalPages = Math.ceil(newLogs.length / logsPerPage);
        setTotalPages(totalPages);
        
        const startIndex = (currentPage - 1) * logsPerPage;
        const endIndex = startIndex + logsPerPage;
        setLogs(newLogs.slice(startIndex, endIndex));
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

  // Track if user is at bottom of scroll area for auto-scroll on new logs
  useEffect(() => {
    const logsArea = logsEndRef.current?.parentElement;
    if (!logsArea) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = logsArea;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 10;
      wasAtBottomRef.current = isAtBottom;
    };

    logsArea.addEventListener('scroll', handleScroll);
    // Check initial position
    handleScroll();
    
    return () => logsArea.removeEventListener('scroll', handleScroll);
  }, [logs]);

  // Track if user is at bottom of scroll area
  useEffect(() => {
    const logsArea = logsEndRef.current?.parentElement;
    if (!logsArea) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = logsArea;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 10;
      wasAtBottomRef.current = isAtBottom;
    };

    logsArea.addEventListener('scroll', handleScroll);
    return () => logsArea.removeEventListener('scroll', handleScroll);
  }, []);

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
      <Container>
        <div style={{
          width: "100%",
          minHeight: "100vh",
          padding: theme.spacing.lg,
          fontFamily: 'Consolas',
          fontSize: 12,
          color: asciiColors.foreground,
          backgroundColor: asciiColors.background,
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.lg
        }}>
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
              textTransform: "uppercase",
              fontFamily: 'Consolas'
            }}>
              <span style={{ color: asciiColors.accent, marginRight: theme.spacing.sm }}>{ascii.blockFull}</span>
              LOGS
            </h1>
          </div>
          <div style={{ marginBottom: theme.spacing.lg }}>
            <AsciiPanel title="ERROR">
              <div style={{
                padding: theme.spacing.md,
                color: asciiColors.foreground,
                fontSize: 12,
                fontFamily: 'Consolas',
                background: asciiColors.backgroundSoft,
                borderRadius: 2,
                border: `2px solid ${asciiColors.foreground}`,
                marginBottom: theme.spacing.sm
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
      </Container>
    );
  }

  return (
    <Container>
      <div style={{
        width: "100%",
        minHeight: "100vh",
        padding: theme.spacing.lg,
        fontFamily: 'Consolas',
        fontSize: 12,
        color: asciiColors.foreground,
        backgroundColor: asciiColors.background,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.lg
      }}>
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
            textTransform: "uppercase",
            fontFamily: 'Consolas'
          }}>
            <span style={{ color: asciiColors.accent, marginRight: theme.spacing.sm }}>{ascii.blockFull}</span>
            LOGS
          </h1>
          <AsciiButton
            label="Logs Info"
            onClick={() => setShowLogsPlaybook(true)}
            variant="ghost"
          />
        </div>

        {showLogsPlaybook && (
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
          onClick={() => setShowLogsPlaybook(false)}
          >
            <div style={{
              width: '90%',
              maxWidth: 1000,
              maxHeight: '90vh',
              overflowY: 'auto',
              fontFamily: 'Consolas'
            }}
            onClick={(e) => e.stopPropagation()}
            className="modal-scroll-container"
            >
              <AsciiPanel title="LOGS VIEWER PLAYBOOK">
                <div style={{ 
                  padding: theme.spacing.md, 
                  fontFamily: 'Consolas', 
                  fontSize: 12, 
                  lineHeight: 1.6 
                }}>
                  <div style={{ marginBottom: theme.spacing.lg }}>
                    <div style={{ 
                      fontSize: 14, 
                      fontWeight: 600, 
                      color: asciiColors.accent, 
                      marginBottom: theme.spacing.sm,
                      fontFamily: 'Consolas'
                    }}>
                      {ascii.blockFull} OVERVIEW
                    </div>
                    <div style={{ 
                      color: asciiColors.foreground, 
                      marginLeft: theme.spacing.md, 
                      fontFamily: 'Consolas' 
                    }}>
                      The Logs Viewer provides comprehensive access to application logs stored in the database. 
                      Monitor system activity, debug issues, filter by level and category, search through entries, 
                      and manage log retention. All logs are stored in the metadata.logs table and can be 
                      exported, filtered, and cleared as needed.
                    </div>
                  </div>

                  <div style={{ marginBottom: theme.spacing.lg }}>
                    <div style={{ 
                      fontSize: 14, 
                      fontWeight: 600, 
                      color: asciiColors.accent, 
                      marginBottom: theme.spacing.sm,
                      fontFamily: 'Consolas'
                    }}>
                      {ascii.blockFull} LOG LEVELS
                    </div>
                    
                    <div style={{ marginLeft: theme.spacing.md }}>
                      <div style={{ marginBottom: theme.spacing.sm }}>
                        <div style={{ 
                          fontSize: 13, 
                          fontWeight: 600, 
                          color: asciiColors.foreground, 
                          marginBottom: theme.spacing.xs, 
                          fontFamily: 'Consolas' 
                        }}>
                          DEBUG
                        </div>
                        <div style={{ 
                          color: asciiColors.foreground, 
                          marginLeft: theme.spacing.md, 
                          fontSize: 11, 
                          fontFamily: 'Consolas' 
                        }}>
                          Detailed diagnostic information for debugging purposes. Typically used during development 
                          and troubleshooting. Can be filtered out in production environments.
                        </div>
                      </div>

                      <div style={{ marginBottom: theme.spacing.sm }}>
                        <div style={{ 
                          fontSize: 13, 
                          fontWeight: 600, 
                          color: asciiColors.accent, 
                          marginBottom: theme.spacing.xs, 
                          fontFamily: 'Consolas' 
                        }}>
                          INFO
                        </div>
                        <div style={{ 
                          color: asciiColors.foreground, 
                          marginLeft: theme.spacing.md, 
                          fontSize: 11, 
                          fontFamily: 'Consolas' 
                        }}>
                          General informational messages about application flow and operations. Used to track 
                          normal application behavior and significant events.
                        </div>
                      </div>

                      <div style={{ marginBottom: theme.spacing.sm }}>
                        <div style={{ 
                          fontSize: 13, 
                          fontWeight: 600, 
                          color: asciiColors.muted, 
                          marginBottom: theme.spacing.xs, 
                          fontFamily: 'Consolas' 
                        }}>
                          WARNING
                        </div>
                        <div style={{ 
                          color: asciiColors.foreground, 
                          marginLeft: theme.spacing.md, 
                          fontSize: 11, 
                          fontFamily: 'Consolas' 
                        }}>
                          Warning messages indicating potential issues that don't prevent the application from 
                          functioning but should be reviewed. May indicate deprecated features or configuration issues.
                        </div>
                      </div>

                      <div style={{ marginBottom: theme.spacing.sm }}>
                        <div style={{ 
                          fontSize: 13, 
                          fontWeight: 600, 
                          color: asciiColors.foreground, 
                          marginBottom: theme.spacing.xs, 
                          fontFamily: 'Consolas' 
                        }}>
                          ERROR
                        </div>
                        <div style={{ 
                          color: asciiColors.foreground, 
                          marginLeft: theme.spacing.md, 
                          fontSize: 11, 
                          fontFamily: 'Consolas' 
                        }}>
                          Error messages indicating failures in operations that prevent specific functionality 
                          from working correctly. These require immediate attention.
                        </div>
                      </div>

                      <div style={{ marginBottom: theme.spacing.sm }}>
                        <div style={{ 
                          fontSize: 13, 
                          fontWeight: 600, 
                          color: asciiColors.foreground, 
                          marginBottom: theme.spacing.xs, 
                          fontFamily: 'Consolas' 
                        }}>
                          CRITICAL
                        </div>
                        <div style={{ 
                          color: asciiColors.foreground, 
                          marginLeft: theme.spacing.md, 
                          fontSize: 11, 
                          fontFamily: 'Consolas' 
                        }}>
                          Critical errors that may cause the application to fail or become unstable. These 
                          require immediate investigation and resolution.
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginBottom: theme.spacing.lg }}>
                    <div style={{ 
                      fontSize: 14, 
                      fontWeight: 600, 
                      color: asciiColors.accent, 
                      marginBottom: theme.spacing.sm,
                      fontFamily: 'Consolas'
                    }}>
                      {ascii.blockFull} FILTERING & SEARCH
                    </div>
                    
                    <div style={{ marginLeft: theme.spacing.md }}>
                      <div style={{ marginBottom: theme.spacing.sm }}>
                        <div style={{ 
                          fontSize: 13, 
                          fontWeight: 600, 
                          color: asciiColors.foreground, 
                          marginBottom: theme.spacing.xs, 
                          fontFamily: 'Consolas' 
                        }}>
                          Level Filter
                        </div>
                        <div style={{ 
                          color: asciiColors.foreground, 
                          marginLeft: theme.spacing.md, 
                          fontSize: 11, 
                          fontFamily: 'Consolas' 
                        }}>
                          Filter logs by severity level (DEBUG, INFO, WARNING, ERROR, CRITICAL). Select "ALL" 
                          to view all levels. Useful for focusing on specific types of issues.
                        </div>
                      </div>

                      <div style={{ marginBottom: theme.spacing.sm }}>
                        <div style={{ 
                          fontSize: 13, 
                          fontWeight: 600, 
                          color: asciiColors.foreground, 
                          marginBottom: theme.spacing.xs, 
                          fontFamily: 'Consolas' 
                        }}>
                          Category Filter
                        </div>
                        <div style={{ 
                          color: asciiColors.foreground, 
                          marginLeft: theme.spacing.md, 
                          fontSize: 11, 
                          fontFamily: 'Consolas' 
                        }}>
                          Filter logs by category (e.g., DATABASE, API, AUTH, SYNC). Categories are automatically 
                          extracted from log entries. Select "ALL" to view all categories.
                        </div>
                      </div>

                      <div style={{ marginBottom: theme.spacing.sm }}>
                        <div style={{ 
                          fontSize: 13, 
                          fontWeight: 600, 
                          color: asciiColors.foreground, 
                          marginBottom: theme.spacing.xs, 
                          fontFamily: 'Consolas' 
                        }}>
                          Function Filter
                        </div>
                        <div style={{ 
                          color: asciiColors.foreground, 
                          marginLeft: theme.spacing.md, 
                          fontSize: 11, 
                          fontFamily: 'Consolas' 
                        }}>
                          Filter logs by function name. Useful for debugging specific functions or methods. 
                          Select "ALL" to view logs from all functions.
                        </div>
                      </div>

                      <div style={{ marginBottom: theme.spacing.sm }}>
                        <div style={{ 
                          fontSize: 13, 
                          fontWeight: 600, 
                          color: asciiColors.foreground, 
                          marginBottom: theme.spacing.xs, 
                          fontFamily: 'Consolas' 
                        }}>
                          Search
                        </div>
                        <div style={{ 
                          color: asciiColors.foreground, 
                          marginLeft: theme.spacing.md, 
                          fontSize: 11, 
                          fontFamily: 'Consolas' 
                        }}>
                          Search for specific text within log messages. The search is case-sensitive and searches 
                          through the entire log message content. Use this to find specific errors or events.
                        </div>
                      </div>

                      <div style={{ marginBottom: theme.spacing.sm }}>
                        <div style={{ 
                          fontSize: 13, 
                          fontWeight: 600, 
                          color: asciiColors.foreground, 
                          marginBottom: theme.spacing.xs, 
                          fontFamily: 'Consolas' 
                        }}>
                          Date Range
                        </div>
                        <div style={{ 
                          color: asciiColors.foreground, 
                          marginLeft: theme.spacing.md, 
                          fontSize: 11, 
                          fontFamily: 'Consolas' 
                        }}>
                          Filter logs by date range using Start Date and End Date. Useful for investigating 
                          issues that occurred during specific time periods. Leave empty to include all dates.
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginBottom: theme.spacing.lg }}>
                    <div style={{ 
                      fontSize: 14, 
                      fontWeight: 600, 
                      color: asciiColors.accent, 
                      marginBottom: theme.spacing.sm,
                      fontFamily: 'Consolas'
                    }}>
                      {ascii.blockFull} LOG MANAGEMENT
                    </div>
                    
                    <div style={{ marginLeft: theme.spacing.md }}>
                      <div style={{ marginBottom: theme.spacing.sm }}>
                        <div style={{ 
                          fontSize: 13, 
                          fontWeight: 600, 
                          color: asciiColors.foreground, 
                          marginBottom: theme.spacing.xs, 
                          fontFamily: 'Consolas' 
                        }}>
                          Auto Refresh
                        </div>
                        <div style={{ 
                          color: asciiColors.foreground, 
                          marginLeft: theme.spacing.md, 
                          fontSize: 11, 
                          fontFamily: 'Consolas' 
                        }}>
                          Automatically refresh logs every 5 seconds. Useful for monitoring real-time activity. 
                          The countdown timer shows when the next refresh will occur. Disable to stop automatic updates.
                        </div>
                      </div>

                      <div style={{ marginBottom: theme.spacing.sm }}>
                        <div style={{ 
                          fontSize: 13, 
                          fontWeight: 600, 
                          color: asciiColors.foreground, 
                          marginBottom: theme.spacing.xs, 
                          fontFamily: 'Consolas' 
                        }}>
                          Auto Cleanup
                        </div>
                        <div style={{ 
                          color: asciiColors.foreground, 
                          marginLeft: theme.spacing.md, 
                          fontSize: 11, 
                          fontFamily: 'Consolas' 
                        }}>
                          Automatically clean up logs based on configured rules during fetch operations. Options include 
                          deleting DEBUG logs, removing duplicates, and deleting logs older than a specified number of days.
                        </div>
                      </div>

                      <div style={{ marginBottom: theme.spacing.sm }}>
                        <div style={{ 
                          fontSize: 13, 
                          fontWeight: 600, 
                          color: asciiColors.foreground, 
                          marginBottom: theme.spacing.xs, 
                          fontFamily: 'Consolas' 
                        }}>
                          Copy Logs
                        </div>
                        <div style={{ 
                          color: asciiColors.foreground, 
                          marginLeft: theme.spacing.md, 
                          fontSize: 11, 
                          fontFamily: 'Consolas' 
                        }}>
                          Copy all filtered logs to clipboard with header information including total entries, 
                          filters applied, file path, size, and last modified date. Useful for sharing logs 
                          with support teams or for offline analysis.
                        </div>
                      </div>

                      <div style={{ marginBottom: theme.spacing.sm }}>
                        <div style={{ 
                          fontSize: 13, 
                          fontWeight: 600, 
                          color: asciiColors.foreground, 
                          marginBottom: theme.spacing.xs, 
                          fontFamily: 'Consolas' 
                        }}>
                          Clear Logs
                        </div>
                        <div style={{ 
                          color: asciiColors.foreground, 
                          marginLeft: theme.spacing.md, 
                          fontSize: 11, 
                          fontFamily: 'Consolas' 
                        }}>
                          Truncate the entire metadata.logs table, removing all log entries permanently. 
                          This operation cannot be undone. Use with caution, especially in production environments. 
                          A confirmation dialog will appear before clearing.
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginBottom: theme.spacing.lg }}>
                    <div style={{ 
                      fontSize: 14, 
                      fontWeight: 600, 
                      color: asciiColors.accent, 
                      marginBottom: theme.spacing.sm,
                      fontFamily: 'Consolas'
                    }}>
                      {ascii.blockFull} PAGINATION
                    </div>
                    
                    <div style={{ marginLeft: theme.spacing.md }}>
                      <div style={{ 
                        color: asciiColors.foreground, 
                        fontSize: 11, 
                        fontFamily: 'Consolas' 
                      }}>
                        Logs are paginated with 50 entries per page. Use the pagination controls to navigate 
                        between pages. The "Go to Latest" button takes you to page 1 (most recent logs). 
                        You can also jump to a specific page number using the "Go to" input field.
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
                    <div style={{ 
                      fontSize: 11, 
                      fontWeight: 600, 
                      color: asciiColors.muted, 
                      marginBottom: theme.spacing.xs,
                      fontFamily: 'Consolas'
                    }}>
                      {ascii.blockSemi} Best Practices
                    </div>
                    <div style={{ 
                      fontSize: 11, 
                      color: asciiColors.foreground,
                      fontFamily: 'Consolas'
                    }}>
                      • Use filters to narrow down logs when investigating specific issues<br/>
                      • Enable auto-cleanup in production to manage log table size<br/>
                      • Regularly review and clear old logs to maintain performance<br/>
                      • Export logs before clearing for audit purposes<br/>
                      • Monitor ERROR and CRITICAL levels regularly<br/>
                      • Use date ranges to investigate time-specific issues<br/>
                      • Keep DEBUG logs disabled in production for better performance
                    </div>
                  </div>

                  <div style={{ 
                    marginTop: theme.spacing.md, 
                    textAlign: 'right' 
                  }}>
                    <AsciiButton
                      label="Close"
                      onClick={() => setShowLogsPlaybook(false)}
                      variant="ghost"
                    />
                  </div>
                </div>
              </AsciiPanel>
            </div>
          </div>
        )}
        
        {error && (
          <div style={{ marginBottom: theme.spacing.lg }}>
            <AsciiPanel title="ERROR">
              <div style={{
                padding: theme.spacing.md,
                color: asciiColors.foreground,
                fontSize: 12,
                fontFamily: 'Consolas',
                background: asciiColors.backgroundSoft,
                borderRadius: 2,
                border: `2px solid ${asciiColors.foreground}`
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
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                border: `1px solid ${asciiColors.border}`,
                borderRadius: 2,
                backgroundColor: asciiColors.background,
                textAlign: 'center',
                fontFamily: 'Consolas',
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
              color: asciiColors.accent, 
              fontFamily: 'Consolas', 
              fontSize: 12,
              padding: `${theme.spacing.sm} 0`
            }}>
              {ascii.blockFull} Logs copied to clipboard successfully!
            </div>
          </AsciiPanel>
        )}
      </AsciiPanel>

        <AsciiPanel title="LOG ENTRIES (DB)">
          <LogsArea $isTransitioning={isPageTransitioning}>
            {logs.map((log, index) => {
              const isNew = log.id ? newLogIds.has(log.id) : false;
              return (
                <LogLine 
                  key={log.id || index} 
                  $level={log.level} 
                  $category={log.category || 'SYSTEM'}
                  $isNew={isNew}
                >
                  <LogTimestamp>{log.timestamp ? formatDate(log.timestamp) : ''}</LogTimestamp>
                  <LogLevel $level={log.level}>[{(log.level || '').toUpperCase()}]</LogLevel>
                  {log.category && <LogCategory $category={log.category}>[{(log.category || '').toUpperCase()}]</LogCategory>}
                  {log.function && <LogFunction>[{log.function}]</LogFunction>}
                  <LogMessage>{log.message}</LogMessage>
                </LogLine>
              );
            })}
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
              <PageInfo style={{ color: asciiColors.muted, fontSize: 11, fontFamily: 'Consolas' }}>
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
            
            <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.xs }}>
              <span style={{ fontSize: 11, color: asciiColors.muted, fontFamily: 'Consolas' }}>Go to:</span>
              <Input
                type="number"
                min="1"
                max={totalPages}
                style={{ width: '60px', padding: `${theme.spacing.xs} ${theme.spacing.sm}`, fontSize: 11, fontFamily: 'Consolas' }}
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
                aria-label="Go to page number"
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
            fontFamily: 'Consolas',
            fontSize: 12
          }}>
            <h3 style={{ 
              margin: 0,
              marginBottom: theme.spacing.lg, 
              color: asciiColors.foreground,
              fontSize: 14,
              fontFamily: 'Consolas',
              fontWeight: 600
            }}>
              {ascii.blockFull} CLEAR LOGS CONFIRMATION
            </h3>
            <p style={{ 
              marginBottom: theme.spacing.lg, 
              lineHeight: 1.5,
              color: asciiColors.foreground,
              fontFamily: 'Consolas',
              fontSize: 12
            }}>
              This action will <strong>TRUNCATE</strong> the entire database table:
              <br />
              <br />
              {ascii.blockFull} <strong>metadata.logs</strong>
              <br />
              <br />
              All log entries will be permanently removed from the table.
              <br />
              <br />
              <strong style={{ color: asciiColors.foreground }}>This operation cannot be undone!</strong>
            </p>
            <div style={{ display: 'flex', gap: theme.spacing.md, justifyContent: 'center' }}>
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
      <style>{`
        .modal-scroll-container::-webkit-scrollbar {
          width: 0px;
          display: none;
        }
        
        .modal-scroll-container {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </Container>
  );
};

export default LogsViewer;
