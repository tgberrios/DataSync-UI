import { useState, useEffect, useCallback, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import CatalogLocksTreeView from './CatalogLocksTreeView';
import {
  Container,
  Header,
  ErrorMessage,
  LoadingOverlay,
  Grid,
  Value,
} from '../shared/BaseComponents';
import { catalogLocksApi } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import { theme } from '../../theme/theme';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import SkeletonLoader from '../shared/SkeletonLoader';

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const slideUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const pulse = keyframes`
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
`;

const MetricsGrid = styled(Grid)`
  margin-bottom: ${theme.spacing.xxl};
  font-family: "Consolas";
  animation: ${slideUp} 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  animation-delay: 0.1s;
  animation-fill-mode: both;
`;

const MetricCard = styled(Value)<{ $index?: number }>`
  padding: ${theme.spacing.lg};
  min-height: 100px;
  background: ${asciiColors.backgroundSoft};
  border: 1px solid ${asciiColors.border};
  border-left: 2px solid ${asciiColors.accent};
  border-radius: 2px;
  transition: all ${theme.transitions.normal};
  animation: ${fadeIn} 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  animation-delay: ${props => (props.$index || 0) * 0.1}s;
  animation-fill-mode: both;
  position: relative;
  font-family: "Consolas";
  font-size: 12px;
`;

const MetricLabel = styled.div`
  font-size: 11px;
  color: ${asciiColors.muted};
  margin-bottom: ${theme.spacing.sm};
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-family: "Consolas";
  display: flex;
  align-items: center;
  gap: 6px;
`;

const MetricValue = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: ${asciiColors.accent};
  font-family: "Consolas";
`;





/**
 * Catalog Locks Monitor component
 * Displays and manages database locks used to prevent race conditions during catalog operations
 */
const CatalogLocks = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [locks, setLocks] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>({});
  const [showCatalogLocksPlaybook, setShowCatalogLocksPlaybook] = useState(false);
  const isMountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    const startTime = Date.now();
    const minLoadingTime = 300;
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      const [locksData, metricsData] = await Promise.all([
        catalogLocksApi.getLocks(),
        catalogLocksApi.getMetrics()
      ]);
      
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minLoadingTime - elapsed);
      await new Promise(resolve => setTimeout(resolve, remaining));
      
      if (isMountedRef.current) {
        setLocks(locksData || []);
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
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    fetchData();
    const interval = setInterval(() => {
      if (isMountedRef.current) {
        fetchData();
      }
    }, 5000);
    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchData]);

  const handleUnlock = useCallback(async (lockName: string) => {
    if (!confirm(`Are you sure you want to force unlock "${lockName}"? This may interrupt operations.`)) {
      return;
    }

    try {
      if (!isMountedRef.current) return;
      setError(null);
      setSuccess(null);
      await catalogLocksApi.unlock(lockName);
      if (isMountedRef.current) {
        setSuccess(`Lock "${lockName}" has been released successfully`);
        await fetchData();
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(extractApiError(err));
      }
    }
  }, [fetchData]);

  const handleCleanExpired = useCallback(async () => {
    try {
      if (!isMountedRef.current) return;
      setError(null);
      setSuccess(null);
      const result = await catalogLocksApi.cleanExpired();
      if (isMountedRef.current) {
        setSuccess(result.message || 'Expired locks cleaned successfully');
        await fetchData();
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(extractApiError(err));
      }
    }
  }, [fetchData]);

  const getLockStatus = useCallback((expiresAt: string) => {
    if (!expiresAt) return { status: 'unknown', label: 'Unknown' };
    const expires = new Date(expiresAt);
    const now = new Date();
    const diffMs = expires.getTime() - now.getTime();
    const diffMins = diffMs / (1000 * 60);

    if (diffMs < 0) {
      return { status: 'expired', label: 'Expired' };
    } else if (diffMins < 5) {
      return { status: 'warning', label: 'Expiring Soon' };
    } else {
      return { status: 'active', label: 'Active' };
    }
  }, []);

  const formatTimeRemaining = useCallback((expiresAt: string) => {
    if (!expiresAt) return 'N/A';
    const expires = new Date(expiresAt);
    const now = new Date();
    const diffMs = expires.getTime() - now.getTime();

    if (diffMs < 0) {
      const expiredMs = Math.abs(diffMs);
      const expiredMins = Math.floor(expiredMs / (1000 * 60));
      return `Expired ${expiredMins}m ago`;
    }

    const mins = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${mins % 60}m`;
    return `${mins}m`;
  }, []);

  const formatDate = useCallback((date: string | null | undefined) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString();
  }, []);

  const handleExportCSV = useCallback(() => {
    const headers = ["Lock Name", "Acquired By", "Acquired At", "Expires At", "Status", "Time Remaining"];
    const rows = locks.map(lock => {
      const status = getLockStatus(lock.expires_at);
      return [
        lock.lock_name,
        lock.acquired_by || "",
        formatDate(lock.acquired_at),
        formatDate(lock.expires_at),
        status.label,
        formatTimeRemaining(lock.expires_at)
      ];
    });
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `catalog_locks_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [locks, getLockStatus, formatDate, formatTimeRemaining]);

  if (loading && locks.length === 0) {
    return <SkeletonLoader variant="table" />;
  }

  const expiredLocks = locks.filter(lock => {
    if (!lock.expires_at) return false;
    return new Date(lock.expires_at) < new Date();
  });

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
          CATALOG LOCKS
        </h1>
        <AsciiButton
          label="Catalog Locks Info"
          onClick={() => setShowCatalogLocksPlaybook(true)}
          variant="ghost"
        />
      </div>

      {showCatalogLocksPlaybook && (
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
        onClick={() => setShowCatalogLocksPlaybook(false)}
        >
          <div style={{
            width: '90%',
            maxWidth: 1000,
            maxHeight: '90vh',
            overflowY: 'auto'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <AsciiPanel title="CATALOG LOCKS PLAYBOOK">
              <div style={{ padding: 16, fontFamily: 'Consolas', fontSize: 12, lineHeight: 1.6 }}>
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                    {ascii.blockFull} OVERVIEW
                  </div>
                  <div style={{ color: asciiColors.foreground, marginLeft: 16 }}>
                    Catalog Locks are a critical mechanism to prevent race conditions and ensure data consistency 
                    during catalog operations. When multiple processes or instances attempt to modify the catalog 
                    simultaneously, locks prevent conflicts by allowing only one operation to proceed at a time. 
                    This ensures catalog integrity and prevents data corruption.
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                    {ascii.blockFull} HOW LOCKS WORK
                  </div>
                  
                  <div style={{ marginLeft: 16 }}>
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.foreground, marginBottom: 4 }}>
                        Lock Acquisition
                      </div>
                      <div style={{ color: asciiColors.foreground, marginLeft: 16, fontSize: 11 }}>
                        When a catalog operation begins, the system attempts to acquire a lock with a unique name 
                        (e.g., "catalog_sync_postgresql"). The lock is stored in the database with an expiration time. 
                        If another process already holds an active lock, the operation will wait or retry based on 
                        configuration settings.
                      </div>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.foreground, marginBottom: 4 }}>
                        Lock Expiration
                      </div>
                      <div style={{ color: asciiColors.foreground, marginLeft: 16, fontSize: 11 }}>
                        Each lock has an expiration timestamp. If a process crashes or fails to release a lock, 
                        it will automatically expire after the timeout period (typically 5 minutes). Expired locks 
                        can be manually cleaned or are automatically removed by the system.
                      </div>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.foreground, marginBottom: 4 }}>
                        Lock Release
                      </div>
                      <div style={{ color: asciiColors.foreground, marginLeft: 16, fontSize: 11 }}>
                        When an operation completes successfully, the lock is automatically released. This allows 
                        other waiting operations to proceed. If an operation fails, the lock should still be released 
                        to prevent blocking other processes.
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                    {ascii.blockFull} LOCK STATUSES
                  </div>
                  
                  <div style={{ marginLeft: 16 }}>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.success, fontWeight: 600 }}>Active</span>
                      <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
                        Lock is currently held and has not expired. The associated operation is either in progress 
                        or recently completed but the lock hasn't been released yet.
                      </span>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.warning, fontWeight: 600 }}>Expiring Soon</span>
                      <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
                        Lock will expire within 5 minutes. This may indicate a long-running operation or a process 
                        that hasn't properly released the lock. Monitor these locks closely.
                      </span>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.danger, fontWeight: 600 }}>Expired</span>
                      <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
                        Lock has passed its expiration time. These locks should be cleaned to free up resources. 
                        Expired locks typically indicate a crashed process or an operation that failed to release properly.
                      </span>
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
                        Total Locks
                      </div>
                      <div style={{ color: asciiColors.foreground, marginLeft: 16, fontSize: 11 }}>
                        Total number of lock records in the system, including both active and expired locks. 
                        This gives you an overview of lock activity.
                      </div>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.success, marginBottom: 4 }}>
                        Active Locks
                      </div>
                      <div style={{ color: asciiColors.foreground, marginLeft: 16, fontSize: 11 }}>
                        Number of locks that are currently active (not expired). These locks are actively preventing 
                        concurrent operations on the same catalog resources.
                      </div>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.danger, marginBottom: 4 }}>
                        Expired Locks
                      </div>
                      <div style={{ color: asciiColors.foreground, marginLeft: 16, fontSize: 11 }}>
                        Number of locks that have passed their expiration time. These should be cleaned periodically 
                        to maintain system health. High numbers of expired locks may indicate process failures.
                      </div>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.accent, marginBottom: 4 }}>
                        Unique Hosts
                      </div>
                      <div style={{ color: asciiColors.foreground, marginLeft: 16, fontSize: 11 }}>
                        Number of distinct hostnames that have acquired locks. This helps identify how many different 
                        systems or instances are accessing the catalog.
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                    {ascii.blockFull} LOCK INFORMATION
                  </div>
                  
                  <div style={{ marginLeft: 16 }}>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.accent, fontWeight: 600 }}>Lock Name</span>
                      <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
                        Unique identifier for the lock, typically indicating the operation type (e.g., "catalog_sync_postgresql")
                      </span>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.accent, fontWeight: 600 }}>Acquired By</span>
                      <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
                        Hostname or identifier of the system/process that acquired the lock
                      </span>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.accent, fontWeight: 600 }}>Acquired At</span>
                      <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
                        Timestamp when the lock was successfully acquired
                      </span>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.accent, fontWeight: 600 }}>Expires At</span>
                      <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
                        Timestamp when the lock will automatically expire if not released
                      </span>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.accent, fontWeight: 600 }}>Session ID</span>
                      <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
                        Unique session identifier for the process that holds the lock
                      </span>
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
                    {ascii.blockSemi} Best Practices
                  </div>
                  <div style={{ fontSize: 11, color: asciiColors.foreground }}>
                    • Monitor expired locks regularly and clean them to prevent resource buildup<br/>
                    • If a lock appears stuck, verify the process is still running before force-unlocking<br/>
                    • High numbers of active locks may indicate contention - review operation frequency<br/>
                    • Use appropriate lock timeouts based on expected operation duration<br/>
                    • Force-unlock only when absolutely necessary, as it may interrupt active operations<br/>
                    • Review lock patterns to identify potential optimization opportunities
                  </div>
                </div>

                <div style={{ marginTop: 16, textAlign: 'right' }}>
                  <AsciiButton
                    label="Close"
                    onClick={() => setShowCatalogLocksPlaybook(false)}
                    variant="ghost"
                  />
                </div>
              </div>
            </AsciiPanel>
          </div>
        </div>
      )}
      
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
      {success && (
        <AsciiPanel title="SUCCESS">
          <div style={{ 
            color: asciiColors.success, 
            fontFamily: "Consolas", 
            fontSize: 12,
            padding: "8px 0"
          }}>
            {ascii.blockFull} {success}
          </div>
        </AsciiPanel>
      )}
      
      <AsciiPanel title="METRICS">
        <MetricsGrid $columns="repeat(auto-fit, minmax(200px, 1fr))">
          <MetricCard $index={0}>
            <MetricLabel>
              <span>{ascii.blockFull}</span>
              Total Locks
            </MetricLabel>
            <MetricValue>{metrics.total_locks || 0}</MetricValue>
          </MetricCard>
          <MetricCard $index={1}>
            <MetricLabel>
              <span>{ascii.blockFull}</span>
              Active Locks
            </MetricLabel>
            <MetricValue>{metrics.active_locks || 0}</MetricValue>
          </MetricCard>
          <MetricCard $index={2}>
            <MetricLabel>
              <span>{ascii.blockFull}</span>
              Expired Locks
            </MetricLabel>
            <MetricValue>{metrics.expired_locks || 0}</MetricValue>
          </MetricCard>
          <MetricCard $index={3}>
            <MetricLabel>
              <span>{ascii.blockFull}</span>
              Unique Hosts
            </MetricLabel>
            <MetricValue>{metrics.unique_hosts || 0}</MetricValue>
          </MetricCard>
        </MetricsGrid>
      </AsciiPanel>

      <AsciiPanel title="ACTIONS">
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: theme.spacing.md,
          background: asciiColors.backgroundSoft,
          border: `1px solid ${asciiColors.border}`,
          borderRadius: 2,
          fontFamily: "Consolas",
          fontSize: 12
        }}>
          <div style={{ fontSize: 11, color: asciiColors.muted, fontFamily: "Consolas" }}>
            {ascii.dot} Locks are used to prevent race conditions during catalog operations. Expired locks are automatically cleaned.
          </div>
          <AsciiButton 
            label={`Clean Expired (${expiredLocks.length})`}
            onClick={handleCleanExpired} 
            disabled={expiredLocks.length === 0}
            variant="ghost"
          />
        </div>
      </AsciiPanel>

      <AsciiPanel title="LOCKS">
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: theme.spacing.md,
          background: asciiColors.backgroundSoft,
          border: `1px solid ${asciiColors.border}`,
          borderRadius: 2,
          marginBottom: theme.spacing.md,
          fontFamily: "Consolas",
          fontSize: 12
        }}>
          <div style={{ fontSize: 11, color: asciiColors.muted, fontFamily: "Consolas" }}>
            Total: {locks.length} lock${locks.length !== 1 ? 's' : ''}
          </div>
          <div style={{ display: 'flex', gap: theme.spacing.sm }}>
            <AsciiButton 
              label="Export CSV"
              onClick={handleExportCSV}
              variant="ghost"
            />
          </div>
        </div>

        <CatalogLocksTreeView 
          locks={locks}
          onLockClick={(lock) => handleUnlock(lock.lock_name)}
        />
      </AsciiPanel>
    </div>
  );
};

export default CatalogLocks;
