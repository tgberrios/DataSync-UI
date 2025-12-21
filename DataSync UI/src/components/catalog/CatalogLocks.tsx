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
  Button,
} from '../shared/BaseComponents';
import { catalogLocksApi } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import { theme } from '../../theme/theme';

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
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
  animation: ${slideUp} 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  animation-delay: 0.1s;
  animation-fill-mode: both;
`;

const MetricCard = styled(Value)<{ $index?: number }>`
  padding: ${theme.spacing.lg};
  min-height: 100px;
  background: linear-gradient(135deg, ${theme.colors.background.main} 0%, ${theme.colors.background.secondary} 100%);
  border: 2px solid ${theme.colors.border.light};
  border-left: 4px solid ${theme.colors.primary.main};
  border-radius: ${theme.borderRadius.lg};
  box-shadow: ${theme.shadows.md};
  transition: all ${theme.transitions.normal};
  animation: ${fadeIn} 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  animation-delay: ${props => (props.$index || 0) * 0.1}s;
  animation-fill-mode: both;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s;
  }
  
  &:hover {
    transform: translateY(-4px) scale(1.02);
    box-shadow: ${theme.shadows.xl};
    border-color: ${theme.colors.primary.main};
    border-left-color: ${theme.colors.primary.dark};
    
    &::before {
      left: 100%;
    }
  }
`;

const MetricLabel = styled.div`
  font-size: 0.9em;
  color: ${theme.colors.text.secondary};
  margin-bottom: ${theme.spacing.sm};
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const MetricValue = styled.div`
  font-size: 2.2em;
  font-weight: 700;
  color: ${theme.colors.primary.main};
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
  background: linear-gradient(135deg, ${theme.colors.primary.main} 0%, ${theme.colors.primary.light} 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const ActionBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.lg};
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md};
  background: linear-gradient(135deg, ${theme.colors.background.secondary} 0%, ${theme.colors.background.tertiary} 100%);
  border-radius: ${theme.borderRadius.md};
  border: 1px solid ${theme.colors.border.light};
  border-left: 4px solid ${theme.colors.primary.main};
  box-shadow: ${theme.shadows.sm};
  animation: ${slideUp} 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  animation-delay: 0.15s;
  animation-fill-mode: both;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
  transition: all ${theme.transitions.normal};
  
  &:hover {
    box-shadow: ${theme.shadows.md};
    transform: translateY(-1px);
  }
`;

const DangerButton = styled(Button)`
  background: linear-gradient(135deg, ${theme.colors.status.error.bg} 0%, ${theme.colors.status.error.text}15 100%);
  color: ${theme.colors.status.error.text};
  border-color: ${theme.colors.status.error.text};
  font-weight: 600;
  padding: 10px 20px;
  border-radius: ${theme.borderRadius.md};
  transition: all ${theme.transitions.normal};
  box-shadow: ${theme.shadows.sm};
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s;
  }
  
  &:hover:not(:disabled) {
    background: linear-gradient(135deg, #ffcdd2 0%, ${theme.colors.status.error.bg} 100%);
    border-color: ${theme.colors.status.error.text};
    transform: translateY(-2px) scale(1.02);
    box-shadow: ${theme.shadows.lg};
    
    &::before {
      left: 100%;
    }
  }
  
  &:active:not(:disabled) {
    transform: translateY(0) scale(0.98);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const TableActions = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.md};
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md};
  background: linear-gradient(135deg, ${theme.colors.background.secondary} 0%, ${theme.colors.background.tertiary} 100%);
  border-radius: ${theme.borderRadius.md};
  border: 1px solid ${theme.colors.border.light};
  box-shadow: ${theme.shadows.sm};
  animation: ${fadeIn} 0.3s ease-out;
`;

const ExportButton = styled(Button)`
  padding: 8px 16px;
  font-size: 0.9em;
  display: flex;
  align-items: center;
  gap: 6px;
`;


const SuccessMessage = styled.div`
  background: linear-gradient(135deg, ${theme.colors.status.success.bg} 0%, ${theme.colors.status.success.text}15 100%);
  color: ${theme.colors.status.success.text};
  padding: ${theme.spacing.md};
  border-radius: ${theme.borderRadius.md};
  margin-bottom: ${theme.spacing.lg};
  border: 2px solid ${theme.colors.status.success.text}30;
  box-shadow: ${theme.shadows.md};
  animation: ${slideUp} 0.3s ease-out;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
  
  &::before {
    content: '[+]';
    font-size: 1.2em;
    font-weight: bold;
  }
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
      <Container>
        <Header>Catalog Locks Monitor</Header>
        <LoadingOverlay>Loading catalog locks...</LoadingOverlay>
      </Container>
    );
  }

  const expiredLocks = locks.filter(lock => {
    if (!lock.expires_at) return false;
    return new Date(lock.expires_at) < new Date();
  });

  return (
    <Container>
      <Header>Catalog Locks Monitor</Header>
      
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {success && <SuccessMessage>{success}</SuccessMessage>}
      
      <MetricsGrid $columns="repeat(auto-fit, minmax(200px, 1fr))">
        <MetricCard $index={0}>
          <MetricLabel>
            <span>[#]</span>
            Total Locks
          </MetricLabel>
          <MetricValue>{metrics.total_locks || 0}</MetricValue>
        </MetricCard>
        <MetricCard $index={1}>
          <MetricLabel>
            <span>[+]</span>
            Active Locks
          </MetricLabel>
          <MetricValue>{metrics.active_locks || 0}</MetricValue>
        </MetricCard>
        <MetricCard $index={2}>
          <MetricLabel>
            <span>[!]</span>
            Expired Locks
          </MetricLabel>
          <MetricValue>{metrics.expired_locks || 0}</MetricValue>
        </MetricCard>
        <MetricCard $index={3}>
          <MetricLabel>
            <span>[H]</span>
            Unique Hosts
          </MetricLabel>
          <MetricValue>{metrics.unique_hosts || 0}</MetricValue>
        </MetricCard>
      </MetricsGrid>

      <ActionBar>
        <div style={{ fontSize: '0.9em', color: theme.colors.text.secondary }}>
          Locks are used to prevent race conditions during catalog operations. Expired locks are automatically cleaned.
        </div>
        <DangerButton onClick={handleCleanExpired} disabled={expiredLocks.length === 0}>
          Clean Expired ({expiredLocks.length})
        </DangerButton>
      </ActionBar>

      <TableActions>
        <div style={{ fontSize: "0.9em", color: theme.colors.text.secondary }}>
          Total: {locks.length} lock${locks.length !== 1 ? 's' : ''}
        </div>
        <div style={{ display: 'flex', gap: theme.spacing.sm }}>
          <ExportButton $variant="secondary" onClick={handleExportCSV}>
            Export CSV
          </ExportButton>
        </div>
      </TableActions>

      <CatalogLocksTreeView 
        locks={locks}
        onLockClick={(lock) => handleUnlock(lock.lock_name)}
      />
    </Container>
  );
};

export default CatalogLocks;
