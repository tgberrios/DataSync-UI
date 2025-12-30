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
  const isMountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    if (!isMountedRef.current) return;
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      const [locksData, metricsData] = await Promise.all([
        catalogLocksApi.getLocks(),
        catalogLocksApi.getMetrics()
      ]);
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
    return (
      <div style={{
        width: "100%",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Consolas",
        fontSize: 12,
        color: asciiColors.foreground,
        backgroundColor: asciiColors.background,
        gap: 12
      }}>
        <div style={{
          fontSize: 24,
          animation: "spin 1s linear infinite"
        }}>
          {ascii.blockFull}
        </div>
        <div style={{
          display: "flex",
          gap: 4,
          alignItems: "center"
        }}>
          <span>Loading catalog locks</span>
          <span style={{ animation: "dots 1.5s steps(4, end) infinite" }}>
            {ascii.dot.repeat(3)}
          </span>
        </div>
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes dots {
            0%, 20% { opacity: 0; }
            50% { opacity: 1; }
            100% { opacity: 0; }
          }
        `}</style>
      </div>
    );
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
      <h1 style={{
        fontSize: 14,
        fontWeight: 600,
        margin: "0 0 20px 0",
        color: asciiColors.foreground,
        textTransform: "uppercase",
        fontFamily: "Consolas"
      }}>
        <span style={{ color: asciiColors.accent, marginRight: 8 }}>{ascii.blockFull}</span>
        CATALOG LOCKS
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
