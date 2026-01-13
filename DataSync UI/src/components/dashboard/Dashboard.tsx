import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { dashboardApi, configApi, dataMaskingApi } from "../../services/api";
import type {
  DashboardStats,
  BatchConfig,
  CurrentlyProcessing,
} from "../../services/api";
import { extractApiError } from "../../utils/errorHandler";
import { AsciiPanel } from "../../ui/layout/AsciiPanel";
import { AsciiButton } from "../../ui/controls/AsciiButton";
import { asciiColors, ascii } from "../../ui/theme/asciiTheme";

const globalStyles = `
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  @keyframes slideInLeft {
    from {
      opacity: 0;
      transform: translateX(-10px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }
  @keyframes progressGlow {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.8; }
  }
  @keyframes numberPulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); }
  }
  @keyframes shimmer {
    to { left: 100%; }
  }
  @keyframes blink {
    0%, 50% { opacity: 1; }
    51%, 100% { opacity: 0; }
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  @keyframes dots {
    0%, 20% { opacity: 0; }
    50% { opacity: 1; }
    100% { opacity: 0; }
  }
  @keyframes smoothUpdate {
    0% {
      opacity: 1;
    }
    50% {
      opacity: 0.7;
    }
    100% {
      opacity: 1;
    }
  }
  @keyframes dataPulse {
    0% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.05);
    }
    100% {
      transform: scale(1);
    }
  }
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(-10px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  * {
    transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease, transform 0.2s ease;
  }
`;

const AsciiProgressBar: React.FC<{ progress: number }> = ({ progress }) => {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const [showTooltip, setShowTooltip] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [barWidth, setBarWidth] = useState(50);
  
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const padding = 32;
        const percentageWidth = 60;
        const availableWidth = containerWidth - padding - percentageWidth;
        const charWidth = 8;
        const calculatedWidth = Math.max(30, Math.min(80, Math.floor(availableWidth / charWidth)));
        setBarWidth(calculatedWidth);
      }
    };
    
    const timer = setTimeout(updateWidth, 100);
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateWidth);
    };
  }, []);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedProgress(progress);
    }, 100);
    return () => clearTimeout(timer);
  }, [progress]);
  
  const filled = Math.round((animatedProgress / 100) * barWidth);
  const empty = barWidth - filled;
  
  return (
    <div 
      ref={containerRef}
      style={{ 
        fontFamily: "Consolas, 'Source Code Pro', monospace", 
        fontSize: 12,
        color: asciiColors.foreground,
        margin: "12px 0",
        width: "100%",
        position: "relative"
      }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div style={{ display: "flex", alignItems: "center" }}>
        <span>{ascii.tl}{ascii.h.repeat(barWidth)}{ascii.tr}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center" }}>
        <span>{ascii.v}</span>
        <span style={{ 
          color: asciiColors.accent,
          fontWeight: 600,
          transition: "width 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
          display: "inline-block",
          animation: "progressGlow 2s ease-in-out infinite"
        }}>
          {ascii.blockFull.repeat(filled)}
        </span>
        <span style={{ 
          color: asciiColors.border 
        }}>
          {ascii.blockLight.repeat(empty)}
        </span>
        <span>{ascii.v}</span>
        <span style={{ 
          marginLeft: 8,
          color: asciiColors.accent,
          fontWeight: 600,
          transition: "all 0.3s ease",
          animation: "numberPulse 0.5s ease-out"
        }}>
          {Math.round(animatedProgress)}%
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center" }}>
        <span>{ascii.bl}{ascii.h.repeat(barWidth)}{ascii.br}</span>
      </div>
      {showTooltip && (
        <div style={{
          position: "absolute",
          bottom: "100%",
          left: "50%",
          transform: "translateX(-50%)",
          marginBottom: 8,
          padding: "8px 12px",
          backgroundColor: asciiColors.background,
          border: `1px solid ${asciiColors.border}`,
          borderRadius: 2,
          fontSize: 10,
          color: asciiColors.foreground,
          whiteSpace: "nowrap",
          zIndex: 1000,
          fontFamily: "Consolas, 'Source Code Pro', monospace",
          boxShadow: `0 2px 8px ${asciiColors.border}40`
        }}>
          <div style={{ color: asciiColors.accent, fontWeight: 600, marginBottom: 4 }}>
            {ascii.blockFull} DataLake Progress
          </div>
          <div style={{ color: asciiColors.muted, fontSize: 9 }}>
            Percentage of active tables that have reached LISTENING_CHANGES status
          </div>
        </div>
      )}
    </div>
  );
};

const AnimatedStat: React.FC<{
  icon: string;
  label: string;
  value: number | string;
  color: string;
  pulse?: boolean;
}> = ({ icon, label, value, color, pulse = false }) => {
  const [displayValue, setDisplayValue] = useState(typeof value === "number" ? 0 : value);
  
  useEffect(() => {
    if (typeof value === "number") {
      const duration = 800;
      const steps = 30;
      const increment = value / steps;
      let current = 0;
      const timer = setInterval(() => {
        current += increment;
        if (current >= value) {
          setDisplayValue(value);
          clearInterval(timer);
        } else {
          setDisplayValue(Math.floor(current));
        }
      }, duration / steps);
      return () => clearInterval(timer);
    } else {
      setDisplayValue(value);
    }
  }, [value]);
  
  return (
    <div style={{ 
      display: "flex", 
      alignItems: "center", 
      gap: 4,
      cursor: "default",
      fontFamily: "Consolas, 'Source Code Pro', monospace",
      fontSize: 12
    }}
    >
      <span style={{ 
        color, 
        animation: pulse ? "pulse 2s ease-in-out infinite" : "none",
        display: "inline-block"
      }}>
        {icon}
      </span>
      <span>{label}:</span>
      <span style={{ 
        color, 
        fontWeight: 600,
        transition: "color 0.3s ease"
      }}>
        {typeof displayValue === "number" ? displayValue.toLocaleString() : displayValue}
      </span>
    </div>
  );
};


const AsciiTabs: React.FC<{
  tabs: { id: string; label: string; icon?: string }[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}> = ({ tabs, activeTab, onTabChange }) => {
  return (
    <div style={{
      display: "flex",
      gap: 2,
      borderBottom: `2px solid ${asciiColors.border}`,
      marginBottom: 16,
      fontFamily: "Consolas, 'Source Code Pro', monospace",
      fontSize: 11
    }}>
      {tabs.map((tab, index) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              padding: "8px 16px",
              backgroundColor: isActive ? asciiColors.backgroundSoft : "transparent",
              border: "none",
              borderBottom: isActive ? `2px solid ${asciiColors.accent}` : "2px solid transparent",
              color: isActive ? asciiColors.accent : asciiColors.muted,
              fontWeight: isActive ? 600 : 400,
              cursor: "pointer",
              transition: "all 0.2s ease",
              fontFamily: "Consolas, 'Source Code Pro', monospace",
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: -2,
              display: "flex",
              alignItems: "center",
              gap: 6
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = asciiColors.foreground;
                e.currentTarget.style.backgroundColor = asciiColors.backgroundSoft;
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = asciiColors.muted;
                e.currentTarget.style.backgroundColor = "transparent";
              }
            }}
          >
            {tab.icon && <span>{tab.icon}</span>}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};

const MetricRow: React.FC<{
  label: string;
  value: number | string;
  color: string;
  icon?: string;
  size?: "normal" | "large";
  tooltip?: string;
}> = ({ label, value, color, icon = ascii.blockFull, size = "normal", tooltip }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  return (
    <div 
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: size === "large" ? "10px 12px" : "8px 12px",
        backgroundColor: asciiColors.backgroundSoft,
        border: `1px solid ${asciiColors.border}`,
        borderRadius: 2,
        marginBottom: 4,
        transition: "all 0.2s ease",
        fontFamily: "Consolas, 'Source Code Pro', monospace",
        fontSize: size === "large" ? 12 : 11,
        position: "relative",
        cursor: tooltip ? "help" : "default"
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = color;
        e.currentTarget.style.backgroundColor = `${color}15`;
        if (tooltip) setShowTooltip(true);
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = asciiColors.border;
        e.currentTarget.style.backgroundColor = asciiColors.backgroundSoft;
        if (tooltip) setShowTooltip(false);
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color, fontSize: size === "large" ? 14 : 12 }}>{icon}</span>
        <span style={{ color: asciiColors.foreground }}>{label}</span>
      </div>
      <span style={{ 
        color, 
        fontWeight: 600,
        fontSize: size === "large" ? 13 : 12
      }}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </span>
      {showTooltip && tooltip && (
        <div style={{
          position: "absolute",
          bottom: "100%",
          left: "50%",
          transform: "translateX(-50%)",
          marginBottom: 8,
          padding: "8px 12px",
          backgroundColor: asciiColors.background,
          border: `1px solid ${asciiColors.border}`,
          borderRadius: 2,
          fontSize: 10,
          color: asciiColors.foreground,
          whiteSpace: "nowrap",
          zIndex: 1000,
          fontFamily: "Consolas, 'Source Code Pro', monospace",
          boxShadow: `0 2px 8px ${asciiColors.border}40`,
          maxWidth: "300px",
          whiteSpace: "normal",
          textAlign: "left"
        }}>
          <div style={{ color: asciiColors.accent, fontWeight: 600, marginBottom: 4 }}>
            {ascii.blockFull} {label}
          </div>
          <div style={{ color: asciiColors.muted, fontSize: 9, lineHeight: 1.4 }}>
            {tooltip}
          </div>
        </div>
      )}
    </div>
  );
};

const SectionHeader: React.FC<{
  title: string;
  subtitle?: string;
}> = ({ title, subtitle }) => {
  return (
    <div style={{
      marginBottom: 12,
      paddingBottom: 8,
      borderBottom: `1px solid ${asciiColors.border}`
    }}>
      <div style={{
        fontSize: 12,
        fontWeight: 600,
        color: asciiColors.foreground,
        textTransform: "uppercase",
        letterSpacing: "0.5px",
        fontFamily: "Consolas, 'Source Code Pro', monospace"
      }}>
        {title}
      </div>
      {subtitle && (
        <div style={{
          fontSize: 10,
          color: asciiColors.muted,
          marginTop: 2,
          fontFamily: "Consolas, 'Source Code Pro', monospace"
        }}>
          {subtitle}
        </div>
      )}
    </div>
  );
};

const formatUptime = (seconds: number): string => {
  if (!seconds || seconds === 0) return "0s";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
};

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [batchConfig, setBatchConfig] = useState<BatchConfig>({
    key: "chunk_size",
    value: "25000",
    description: "Tamaño de lote para procesamiento de datos",
    updated_at: new Date().toISOString(),
  });
  const [currentlyProcessing, setCurrentlyProcessing] =
    useState<CurrentlyProcessing[]>([]);
  const [processingPagination, setProcessingPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  } | null>(null);
  const [processingPage, setProcessingPage] = useState(1);
  const [isProcessingExpanded, setIsProcessingExpanded] = useState(false);
  const isMountedRef = useRef(true);
  const isInitialLoadRef = useRef(true);
  const [sensitiveColumnsList, setSensitiveColumnsList] = useState<any[]>([]);
  const [unprotectedColumnsList, setUnprotectedColumnsList] = useState<any[]>([]);
  const fetchingSensitiveRef = useRef(false);
  const fetchingUnprotectedRef = useRef(false);

  const [stats, setStats] = useState<DashboardStats>({
    syncStatus: {
      progress: 75,
      listeningChanges: 6,
      pending: 0,
      fullLoadActive: 0,
      fullLoadInactive: 0,
      noData: 3,
      skip: 0,
      errors: 0,
      inProgress: 0,
      currentProcess: "dbo.test_performance (NO_DATA)",
    },
    systemResources: {
      cpuUsage: "0.0",
      memoryUsed: "12.90",
      memoryTotal: "30.54",
      memoryPercentage: "42.2",
      rss: "12.90",
      virtual: "19.35",
    },
    dbHealth: {
      activeConnections: "1/100",
      connectionPercentage: "0.0",
      responseTime: "< 1ms",
      bufferHitRate: "0.0",
      cacheHitRate: "0.0",
      status: "Healthy",
      uptimeSeconds: 0,
      activeQueries: 0,
      waitingQueries: 0,
      avgQueryDuration: 0,
      databaseSizeBytes: 0,
      queryEfficiencyScore: 0,
      longRunningQueries: 0,
      blockingQueries: 0,
      totalQueries24h: 0,
    },
    batchConfig: {
      key: "chunk_size",
      value: "25000",
      description: "Tamaño de lote para procesamiento de datos",
      updated_at: new Date().toISOString(),
    },
  });

  /**
   * Formatea un número con separadores de miles
   *
   * @param {number} num - Número a formatear
   * @returns {string} Número formateado con comas
   */
  const formatNumberWithCommas = useCallback((num: number): string => {
    return num.toLocaleString("en-US");
  }, []);

  /**
   * Calcula el porcentaje de progreso basado en tablas escuchando cambios vs activas
   *
   * @returns {number} Porcentaje de progreso (0-100)
   */
  const progressPercentage = useMemo(() => {
    if (
      !stats.syncStatus.fullLoadActive ||
      stats.syncStatus.fullLoadActive === 0
    ) {
      return 0;
    }
    const listening = stats.syncStatus.listeningChanges || 0;
    const active = stats.syncStatus.fullLoadActive || 0;
    return Math.min(100, Math.round((listening / active) * 100));
  }, [
    stats.syncStatus.listeningChanges,
    stats.syncStatus.fullLoadActive,
  ]);


  const fetchStats = useCallback(async () => {
    try {
      if (!isMountedRef.current) return;
      if (isInitialLoadRef.current) {
        setLoading(true);
        setError(null);
      }
      const [dashboardData, batchData] = await Promise.all([
        dashboardApi.getDashboardStats(),
        configApi.getBatchConfig(),
      ]);
      if (isMountedRef.current) {
        setStats(dashboardData);
        setBatchConfig(batchData);
        if (isInitialLoadRef.current) {
          isInitialLoadRef.current = false;
        }
        setError(null);
      }
    } catch (err) {
      if (isMountedRef.current) {
        if (isInitialLoadRef.current) {
          setError(extractApiError(err));
        } else {
          console.error("Error fetching dashboard stats:", err);
        }
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const fetchSyncStats = useCallback(async () => {
    try {
      if (!isMountedRef.current) return;
      const dashboardData = await dashboardApi.getDashboardStats();
      if (isMountedRef.current) {
        setStats((prev) => ({
          ...prev,
          syncStatus: dashboardData.syncStatus,
        }));
      }
    } catch (err) {
      if (isMountedRef.current) {
        console.error("Error fetching sync stats:", err);
      }
    }
  }, []);

  const fetchSystemResources = useCallback(async () => {
    try {
      if (!isMountedRef.current) return;
      const dashboardData = await dashboardApi.getDashboardStats();
      if (isMountedRef.current) {
        setStats((prev) => ({
          ...prev,
          systemResources: dashboardData.systemResources,
        }));
      }
    } catch (err) {
      if (isMountedRef.current) {
        console.error("Error fetching system resources:", err);
      }
    }
  }, []);

  const fetchDbHealth = useCallback(async () => {
    try {
      if (!isMountedRef.current) return;
      const dashboardData = await dashboardApi.getDashboardStats();
      if (isMountedRef.current) {
        setStats((prev) => ({
          ...prev,
          dbHealth: dashboardData.dbHealth,
          syncStatus: {
            ...prev.syncStatus,
            ...dashboardData.syncStatus,
          },
        }));
      }
    } catch (err) {
      if (isMountedRef.current) {
        console.error("Error fetching db health:", err);
      }
    }
  }, []);

  /**
   * Obtiene la tabla que se está procesando actualmente
   *
   * @returns {Promise<void>}
   */
  const fetchCurrentlyProcessing = useCallback(async (page: number = 1) => {
    try {
      if (!isMountedRef.current) return;
      const response = await dashboardApi.getCurrentlyProcessing(page);
      if (isMountedRef.current) {
        setCurrentlyProcessing(response.data);
        setProcessingPagination(response.pagination);
      }
    } catch (err) {
      if (isMountedRef.current) {
        console.error("Error fetching currently processing tables:", err);
      }
    }
  }, []);

  /**
   * Maneja el reintento de carga de datos después de un error
   *
   * @returns {Promise<void>}
   */
  const handleRetry = useCallback(async () => {
    setError(null);
    await fetchStats();
  }, [fetchStats]);

  /**
   * Carga los datos de sensitive columns y unprotected columns para calcular métricas correctas
   */
  const fetchMaskingData = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    if (!fetchingSensitiveRef.current) {
      fetchingSensitiveRef.current = true;
      try {
        const sensitiveResponse = await dataMaskingApi.getSensitiveColumns();
        if (isMountedRef.current) {
          setSensitiveColumnsList(sensitiveResponse.columns || []);
        }
      } catch (err) {
        if (isMountedRef.current) {
          console.error("Error fetching sensitive columns:", err);
          setSensitiveColumnsList([{ _error: true }]);
        }
      } finally {
        fetchingSensitiveRef.current = false;
      }
    }
    
    if (!fetchingUnprotectedRef.current) {
      fetchingUnprotectedRef.current = true;
      try {
        const unprotectedResponse = await dataMaskingApi.getUnprotectedColumns();
        if (isMountedRef.current) {
          setUnprotectedColumnsList(unprotectedResponse.columns || []);
        }
      } catch (err) {
        if (isMountedRef.current) {
          console.error("Error fetching unprotected columns:", err);
          setUnprotectedColumnsList([{ _error: true }]);
        }
      } finally {
        fetchingUnprotectedRef.current = false;
      }
    }
  }, []);

  /**
   * Calcula las métricas correctas de masking basadas en los datos reales
   */
  const maskingMetrics = useMemo(() => {
    const realSensitive = sensitiveColumnsList.filter(item => !item._error).length;
    const realUnprotected = unprotectedColumnsList.filter(item => !item._error).length;
    const realProtected = realSensitive > 0 ? realSensitive - realUnprotected : 0;
    const realCoverage = realSensitive > 0 ? (realProtected / realSensitive) * 100 : 0;
    
    return {
      sensitiveColumns: realSensitive || (stats.dataProtection?.masking?.sensitiveColumns || 0),
      protected: realProtected,
      unprotected: realUnprotected,
      coverage: realCoverage || (stats.dataProtection?.masking?.coveragePercentage || 0),
    };
  }, [sensitiveColumnsList, unprotectedColumnsList, stats.dataProtection]);

  useEffect(() => {
    isMountedRef.current = true;
    isInitialLoadRef.current = true;
    fetchStats();
    fetchCurrentlyProcessing(1);
    fetchMaskingData();

    const syncStatsInterval = setInterval(fetchSyncStats, 500);
    const systemResourcesInterval = setInterval(fetchSystemResources, 10000);
    const dbHealthInterval = setInterval(fetchDbHealth, 1000);
    const maskingDataInterval = setInterval(fetchMaskingData, 30000);

    return () => {
      isMountedRef.current = false;
      clearInterval(syncStatsInterval);
      clearInterval(systemResourcesInterval);
      clearInterval(dbHealthInterval);
      clearInterval(maskingDataInterval);
    };
  }, [fetchStats, fetchSyncStats, fetchSystemResources, fetchDbHealth, fetchMaskingData]);

  useEffect(() => {
    if (isProcessingExpanded) {
      fetchCurrentlyProcessing(processingPage);
    } else {
      setProcessingPage(1);
      fetchCurrentlyProcessing(1);
    }
  }, [processingPage, isProcessingExpanded, fetchCurrentlyProcessing]);

  if (loading) {
    return (
      <>
        <div style={{
          width: "100%",
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Consolas, 'Source Code Pro', monospace",
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
            <span>Loading</span>
            <span style={{ animation: "dots 1.5s steps(4, end) infinite" }}>
              {ascii.dot.repeat(3)}
            </span>
          </div>
        </div>
        <style>{globalStyles}</style>
      </>
    );
  }

  if (error) {
    return (
      <div style={{
        width: "100%",
        height: "100vh",
        padding: 20,
        fontFamily: "Consolas, 'Source Code Pro', monospace",
        fontSize: 12,
        color: asciiColors.foreground,
        backgroundColor: asciiColors.background
      }}>
        <AsciiPanel title="ERROR">
          <div style={{ marginBottom: 10 }}>
            <span style={{ color: asciiColors.danger, fontWeight: 600 }}>
              {ascii.blockFull} Error al cargar datos:
            </span>
          </div>
          <div style={{ marginBottom: 10, color: asciiColors.muted }}>
            {error}
          </div>
          <AsciiButton label="Reintentar" onClick={handleRetry} />
        </AsciiPanel>
      </div>
    );
  }

  return (
    <div style={{ 
      padding: "24px", 
      fontFamily: "Consolas", 
      fontSize: 12,
      maxWidth: "1400px",
      margin: "0 auto"
    }}>
      <div style={{
        marginBottom: 24
      }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12
        }}>
          <h1 style={{
            fontSize: 16,
            fontWeight: 600,
            margin: 0,
            color: asciiColors.foreground,
            textTransform: "uppercase",
            fontFamily: "Consolas",
            letterSpacing: "1px"
          }}>
            <span style={{ color: asciiColors.accent, marginRight: 10 }}>{ascii.blockFull}</span>
            DATASYNC REAL-TIME DASHBOARD
          </h1>
          <div style={{
            fontSize: 10,
            color: asciiColors.muted,
            fontFamily: "Consolas, 'Source Code Pro', monospace"
          }}>
            {new Date().toLocaleString()}
          </div>
        </div>
        <AsciiProgressBar progress={progressPercentage} />
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 16,
        marginBottom: 24
      }}>
        <AsciiPanel title="SYNC STATUS">
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <MetricRow
              label="Listening Changes"
              value={stats.syncStatus.listeningChanges || 0}
              color={asciiColors.success}
              tooltip="Tables actively monitoring for changes using CDC (Change Data Capture). These tables are in real-time sync mode and listening to transaction logs."
            />
            <MetricRow
              label="Pending"
              value={stats.syncStatus.pending || 0}
              color={stats.syncStatus.pending > 0 ? asciiColors.warning : asciiColors.muted}
              tooltip="Active tables that have not yet started synchronization. They are queued and waiting to begin the initial FULL_LOAD process."
            />
            <MetricRow
              label="In Progress"
              value={stats.syncStatus.inProgress || 0}
              color={stats.syncStatus.inProgress > 0 ? asciiColors.warning : asciiColors.muted}
              tooltip="Tables currently being processed. This includes tables in FULL_LOAD (initial data transfer) or SYNC operations actively transferring data."
            />
            <MetricRow
              label="Errors"
              value={stats.syncStatus.errors || 0}
              color={stats.syncStatus.errors > 0 ? asciiColors.danger : asciiColors.muted}
              tooltip="Tables that encountered errors during synchronization. These require attention and may need manual intervention or configuration fixes."
            />
          </div>
        </AsciiPanel>

        <AsciiPanel title="SYSTEM OVERVIEW">
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <MetricRow
              label="Total Tables"
              value={stats.syncStatus.totalTables || 0}
              color={asciiColors.accent}
              size="large"
            />
            <MetricRow
              label="Total Columns"
              value={stats.syncStatus.totalColumns?.toLocaleString() || "0"}
              color={asciiColors.accent}
            />
            <MetricRow
              label="Active Connections"
              value={stats.dbHealth.activeConnections}
              color={asciiColors.accent}
            />
            <MetricRow
              label="Database Size"
              value={`${(stats.dbHealth.databaseSizeBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`}
              color={asciiColors.accent}
              tooltip="Total size of the DataLake PostgreSQL database including all tables, indexes, and metadata. This represents the complete storage footprint of synchronized data."
            />
          </div>
        </AsciiPanel>

        <AsciiPanel title="RESOURCES">
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <MetricRow
              label="CPU Usage"
              value={`${stats.systemResources.cpuUsage}%`}
              color={parseFloat(stats.systemResources.cpuUsage) > 80 ? asciiColors.danger : parseFloat(stats.systemResources.cpuUsage) > 60 ? asciiColors.warning : asciiColors.success}
            />
            <MetricRow
              label="Memory"
              value={`${stats.systemResources.memoryUsed} / ${stats.systemResources.memoryTotal} GB`}
              color={parseFloat(stats.systemResources.memoryPercentage) > 80 ? asciiColors.danger : parseFloat(stats.systemResources.memoryPercentage) > 60 ? asciiColors.warning : asciiColors.success}
            />
            <MetricRow
              label="Cache Hit Rate"
              value={`${stats.dbHealth.cacheHitRate}%`}
              color={parseFloat(stats.dbHealth.cacheHitRate) > 90 ? asciiColors.success : parseFloat(stats.dbHealth.cacheHitRate) > 70 ? asciiColors.warning : asciiColors.danger}
              tooltip="Percentage of index block reads served from PostgreSQL shared buffers cache vs disk. Higher values (90%+) indicate excellent cache performance and reduced I/O."
            />
            <MetricRow
              label="Query Efficiency"
              value={stats.dbHealth.queryEfficiencyScore.toFixed(1)}
              color={stats.dbHealth.queryEfficiencyScore >= 80 ? asciiColors.success : stats.dbHealth.queryEfficiencyScore >= 60 ? asciiColors.warning : asciiColors.danger}
              tooltip="Overall query performance score (0-100) based on execution time, cache hit ratio, and I/O efficiency. Scores above 80 indicate excellent query performance."
            />
          </div>
        </AsciiPanel>

        <AsciiPanel title="HEALTH STATUS">
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <MetricRow
              label="DB Status"
              value={stats.dbHealth.status}
              color={stats.dbHealth.status === "Healthy" ? asciiColors.success : asciiColors.warning}
            />
            <MetricRow
              label="Long Running"
              value={stats.dbHealth.longRunningQueries}
              color={stats.dbHealth.longRunningQueries > 0 ? asciiColors.warning : asciiColors.muted}
            />
            <MetricRow
              label="Blocking"
              value={stats.dbHealth.blockingQueries}
              color={stats.dbHealth.blockingQueries > 0 ? asciiColors.danger : asciiColors.muted}
            />
            <MetricRow
              label="Queries (24h)"
              value={stats.dbHealth.totalQueries24h.toLocaleString()}
              color={asciiColors.accent}
            />
          </div>
        </AsciiPanel>
      </div>

      <AsciiPanel title="SYSTEM METRICS">
        <AsciiTabs
          tabs={[
            { id: "overview", label: "Overview", icon: ascii.blockFull },
            { id: "protection", label: "Security", icon: ascii.blockFull },
            { id: "operations", label: "Operations", icon: ascii.blockFull },
            { id: "quality", label: "Quality", icon: ascii.blockFull },
            { id: "performance", label: "Performance", icon: ascii.blockFull },
            { id: "sources", label: "Sources", icon: ascii.blockFull },
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {activeTab === "overview" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
            <div>
              <SectionHeader title="Detailed Sync Status" />
              <MetricRow
                label="Active"
                value={stats.syncStatus.fullLoadActive || 0}
                color={asciiColors.accent}
              />
              <MetricRow
                label="Inactive"
                value={stats.syncStatus.fullLoadInactive || 0}
                color={asciiColors.muted}
              />
              <MetricRow
                label="No Data"
                value={stats.syncStatus.noData || 0}
                color={asciiColors.muted}
              />
              <MetricRow
                label="Skip"
                value={stats.syncStatus.skip || 0}
                color={asciiColors.muted}
              />
            </div>
            <div>
              <SectionHeader title="Database Health" />
              <MetricRow
                label="Uptime"
                value={formatUptime(stats.dbHealth.uptimeSeconds)}
                color={asciiColors.accent}
              />
              <MetricRow
                label="Active Queries"
                value={stats.dbHealth.activeQueries}
                color={stats.dbHealth.activeQueries > 10 ? asciiColors.warning : asciiColors.accent}
              />
            <MetricRow
              label="Waiting Queries"
              value={stats.dbHealth.waitingQueries}
              color={stats.dbHealth.waitingQueries > 0 ? asciiColors.danger : asciiColors.muted}
              tooltip="Number of queries currently waiting for locks or resources. High values indicate potential blocking issues or resource contention that may impact performance."
            />
            <MetricRow
              label="Avg Query Duration"
              value={`${stats.dbHealth.avgQueryDuration.toFixed(2)}s`}
              color={stats.dbHealth.avgQueryDuration > 1 ? asciiColors.warning : asciiColors.success}
              tooltip="Average execution time for currently active queries. Lower values indicate better query performance. Values above 1 second may indicate optimization opportunities."
            />
            </div>
          </div>
        )}

        {activeTab === "protection" && stats.dataProtection && (
          <div>
            <SectionHeader title="Data Masking" />
            <MetricRow
              label="Total Policies"
              value={stats.dataProtection.masking.totalPolicies}
              color={asciiColors.accent}
            />
            <MetricRow
              label="Active Policies"
              value={stats.dataProtection.masking.activePolicies}
              color={asciiColors.success}
            />
            <MetricRow
              label="Sensitive Columns"
              value={maskingMetrics.sensitiveColumns}
              color={asciiColors.warning}
            />
            <MetricRow
              label="Coverage"
              value={`${maskingMetrics.coverage.toFixed(1)}%`}
              color={maskingMetrics.coverage >= 90 ? asciiColors.success : maskingMetrics.coverage >= 50 ? asciiColors.warning : asciiColors.danger}
              size="large"
            />
            <SectionHeader title="Alerts" subtitle="System alerts and monitoring rules" />
            <MetricRow
              label="Open Alerts"
              value={stats.dataProtection.alerts.open}
              color={stats.dataProtection.alerts.critical > 0 ? asciiColors.danger : stats.dataProtection.alerts.open > 0 ? asciiColors.warning : asciiColors.muted}
            />
            <MetricRow
              label="Critical Alerts"
              value={stats.dataProtection.alerts.critical}
              color={stats.dataProtection.alerts.critical > 0 ? asciiColors.danger : asciiColors.muted}
            />
            <MetricRow
              label="Enabled Rules"
              value={stats.dataProtection.alerts.enabledRules}
              color={asciiColors.accent}
            />
          </div>
        )}

        {activeTab === "operations" && (
          <div>
            {stats.backups && (
              <>
                <SectionHeader title="Backups" />
                <MetricRow
                  label="Scheduled"
                  value={stats.backups.scheduled}
                  color={asciiColors.accent}
                />
                <MetricRow
                  label="Completed"
                  value={stats.backups.completed}
                  color={asciiColors.success}
                />
                <MetricRow
                  label="Failed"
                  value={stats.backups.failed}
                  color={stats.backups.failed > 0 ? asciiColors.danger : asciiColors.muted}
                />
                <MetricRow
                  label="In Progress"
                  value={stats.backups.inProgress}
                  color={stats.backups.inProgress > 0 ? asciiColors.warning : asciiColors.muted}
                />
                {stats.backups.nextBackup && (
                  <div style={{
                    marginTop: 12,
                    padding: "10px 12px",
                    backgroundColor: asciiColors.backgroundSoft,
                    border: `1px solid ${asciiColors.border}`,
                    borderRadius: 2,
                    fontSize: 11,
                    color: asciiColors.muted,
                    fontFamily: "Consolas, 'Source Code Pro', monospace"
                  }}>
                    <span style={{ color: asciiColors.accent }}>{ascii.bullet}</span> Next Backup: <strong>{stats.backups.nextBackup.name}</strong> @ {new Date(stats.backups.nextBackup.nextRunAt).toLocaleString()}
                  </div>
                )}
              </>
            )}
            {stats.migrations && (
              <>
                <SectionHeader title="Schema Migrations" subtitle="Database schema change management" />
                <MetricRow
                  label="Total Migrations"
                  value={stats.migrations.total}
                  color={asciiColors.accent}
                />
                <MetricRow
                  label="Pending"
                  value={stats.migrations.pending}
                  color={stats.migrations.pending > 0 ? asciiColors.warning : asciiColors.muted}
                />
                <MetricRow
                  label="Applied"
                  value={stats.migrations.applied}
                  color={asciiColors.success}
                />
                <MetricRow
                  label="Failed"
                  value={stats.migrations.failed}
                  color={stats.migrations.failed > 0 ? asciiColors.danger : asciiColors.muted}
                />
              </>
            )}
          </div>
        )}

        {activeTab === "quality" && stats.dataQuality && (
          <div>
            <SectionHeader title="Data Quality Metrics" />
            <MetricRow
              label="Average Score"
              value={stats.dataQuality.avgScore.toFixed(1)}
              color={stats.dataQuality.avgScore >= 90 ? asciiColors.success : stats.dataQuality.avgScore >= 70 ? asciiColors.warning : asciiColors.danger}
              size="large"
            />
            <MetricRow
              label="Passed Checks"
              value={stats.dataQuality.passed}
              color={asciiColors.success}
            />
            <MetricRow
              label="Failed Checks"
              value={stats.dataQuality.failed}
              color={stats.dataQuality.failed > 0 ? asciiColors.danger : asciiColors.muted}
            />
            <MetricRow
              label="Warning Checks"
              value={stats.dataQuality.warning}
              color={stats.dataQuality.warning > 0 ? asciiColors.warning : asciiColors.muted}
            />
            {stats.governance && (
              <>
                <SectionHeader title="Governance Status" subtitle="Data governance and compliance" />
                <MetricRow
                  label="Total Tables"
                  value={stats.governance.totalTables}
                  color={asciiColors.accent}
                />
                <MetricRow
                  label="Healthy Tables"
                  value={stats.governance.healthyTables}
                  color={asciiColors.success}
                />
                <MetricRow
                  label="Warning Tables"
                  value={stats.governance.warningTables}
                  color={stats.governance.warningTables > 0 ? asciiColors.warning : asciiColors.muted}
                />
                <MetricRow
                  label="Critical Tables"
                  value={stats.governance.criticalTables}
                  color={stats.governance.criticalTables > 0 ? asciiColors.danger : asciiColors.muted}
                />
              </>
            )}
          </div>
        )}

        {activeTab === "performance" && stats.maintenance && (
          <div>
            <SectionHeader title="Maintenance" />
            <MetricRow
              label="Pending Tasks"
              value={stats.maintenance.pending}
              color={stats.maintenance.pending > 0 ? asciiColors.warning : asciiColors.muted}
            />
            <MetricRow
              label="Completed Today"
              value={stats.maintenance.completedToday}
              color={asciiColors.success}
            />
            <MetricRow
              label="Space Reclaimed"
              value={`${stats.maintenance.totalSpaceReclaimedMB.toFixed(0)} MB`}
              color={asciiColors.accent}
            />
            <MetricRow
              label="Performance Improvement"
              value={`${stats.maintenance.avgPerformanceImprovement.toFixed(1)}%`}
              color={stats.maintenance.avgPerformanceImprovement > 0 ? asciiColors.success : asciiColors.muted}
            />
            <SectionHeader title="Query Performance" subtitle="Database query efficiency metrics" />
            <MetricRow
              label="Long Running Queries"
              value={stats.dbHealth.longRunningQueries}
              color={stats.dbHealth.longRunningQueries > 0 ? asciiColors.warning : asciiColors.muted}
            />
            <MetricRow
              label="Blocking Queries"
              value={stats.dbHealth.blockingQueries}
              color={stats.dbHealth.blockingQueries > 0 ? asciiColors.danger : asciiColors.muted}
            />
            <MetricRow
              label="Efficiency Score"
              value={stats.dbHealth.queryEfficiencyScore.toFixed(1)}
              color={stats.dbHealth.queryEfficiencyScore >= 80 ? asciiColors.success : stats.dbHealth.queryEfficiencyScore >= 60 ? asciiColors.warning : asciiColors.danger}
              size="large"
            />
            <MetricRow
              label="Queries (24h)"
              value={stats.dbHealth.totalQueries24h.toLocaleString()}
              color={asciiColors.accent}
            />
          </div>
        )}

        {activeTab === "sources" && stats.dataSources && (
          <div>
            <SectionHeader title="Data Sources" subtitle="All configured data source types" />
            <MetricRow
              label="Database Sources"
              value={stats.dataSources.database}
              color={asciiColors.accent}
            />
            <MetricRow
              label="API Sources"
              value={stats.dataSources.api}
              color={asciiColors.accent}
            />
            <MetricRow
              label="CSV Sources"
              value={stats.dataSources.csv}
              color={asciiColors.accent}
            />
            <MetricRow
              label="Google Sheets"
              value={stats.dataSources.sheets}
              color={asciiColors.accent}
            />
            <MetricRow
              label="Data Warehouses"
              value={stats.dataSources.warehouse}
              color={asciiColors.accent}
            />
            <MetricRow
              label="Total Sources"
              value={stats.dataSources.total}
              color={asciiColors.foreground}
              size="large"
            />
          </div>
        )}
      </AsciiPanel>

      <div style={{ marginTop: 24 }}>
        <AsciiPanel title="CURRENTLY PROCESSING & RECENT ACTIVITY">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              cursor: "pointer",
              marginBottom: 12,
              padding: "8px 12px",
              backgroundColor: asciiColors.backgroundSoft,
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2,
              transition: "all 0.2s ease"
            }}
            onClick={() => setIsProcessingExpanded(!isProcessingExpanded)}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = asciiColors.accent;
              e.currentTarget.style.backgroundColor = `${asciiColors.accent}15`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = asciiColors.border;
              e.currentTarget.style.backgroundColor = asciiColors.backgroundSoft;
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ 
                color: asciiColors.accent,
                transition: "transform 0.3s ease",
                transform: isProcessingExpanded ? "rotate(90deg)" : "rotate(0deg)",
                display: "inline-block",
                fontSize: 12
              }}>
                {ascii.arrowRight}
              </span>
              <span style={{ 
                fontFamily: "Consolas, 'Source Code Pro', monospace",
                fontSize: 12,
                fontWeight: 600,
                color: asciiColors.foreground
              }}>
                {processingPagination?.total || currentlyProcessing.length} {(processingPagination?.total || currentlyProcessing.length) === 1 ? "table" : "tables"} processing
              </span>
            </div>
            {currentlyProcessing.length > 0 && (
              <div style={{
                fontSize: 10,
                color: asciiColors.muted,
                fontFamily: "Consolas, 'Source Code Pro', monospace"
              }}>
                Click to {isProcessingExpanded ? "collapse" : "expand"}
              </div>
            )}
          </div>
          {currentlyProcessing.length === 0 ? (
            <div style={{
              padding: 20,
              color: asciiColors.muted,
              fontSize: 11,
              fontFamily: "Consolas, 'Source Code Pro', monospace",
              border: `1px dashed ${asciiColors.border}`,
              borderRadius: 2,
              textAlign: "center"
            }}>
              <div style={{ marginBottom: 4 }}>{ascii.dot}</div>
              <div>No active processing detected</div>
              <div style={{ fontSize: 9, marginTop: 4, opacity: 0.7 }}>
                Tables will appear here when synchronization is in progress
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {currentlyProcessing.slice(0, isProcessingExpanded ? currentlyProcessing.length : 5).map((item, index) => (
                  <div
                    key={index}
                    style={{
                      border: `1px solid ${asciiColors.border}`,
                      padding: "12px 14px",
                      borderRadius: 2,
                      backgroundColor: asciiColors.backgroundSoft,
                      transition: "all 0.3s ease",
                      animation: "fadeInUp 0.4s ease-out",
                      animationDelay: `${index * 0.05}s`,
                      fontFamily: "Consolas, 'Source Code Pro', monospace"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = asciiColors.accent;
                      e.currentTarget.style.backgroundColor = `${asciiColors.accent}10`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = asciiColors.border;
                      e.currentTarget.style.backgroundColor = asciiColors.backgroundSoft;
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ 
                          fontSize: 12, 
                          fontWeight: 600, 
                          marginBottom: 6,
                          color: asciiColors.foreground,
                          display: "flex",
                          alignItems: "center",
                          gap: 6
                        }}>
                          <span style={{ color: asciiColors.accent }}>{ascii.blockFull}</span>
                          <span style={{ 
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap"
                          }}>
                            {item.schema_name}.{item.table_name}
                          </span>
                          <span style={{ 
                            color: asciiColors.muted, 
                            fontSize: 10,
                            fontWeight: 400,
                            padding: "2px 6px",
                            backgroundColor: `${asciiColors.muted}20`,
                            borderRadius: 2
                          }}>
                            {item.db_engine}
                          </span>
                        </div>
                        <div style={{ 
                          fontSize: 10, 
                          color: asciiColors.muted, 
                          display: "flex", 
                          alignItems: "center", 
                          gap: 12,
                          flexWrap: "wrap"
                        }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <span>{ascii.bullet}</span>
                            <span>{formatNumberWithCommas(item.total_records)} records</span>
                          </span>
                          {item.processed_at && (
                            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <span>{ascii.bullet}</span>
                              <span>{new Date(item.processed_at).toLocaleString()}</span>
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center" }}>
                        {item.status === "IN_PROGRESS" ? (
                          <div style={{
                            color: asciiColors.accent,
                            fontWeight: 600,
                            padding: "4px 10px",
                            border: `1px solid ${asciiColors.accent}`,
                            borderRadius: 2,
                            fontSize: 10,
                            backgroundColor: `${asciiColors.accent}15`,
                            textTransform: "uppercase",
                            letterSpacing: "0.5px"
                          }}>
                            {ascii.blockFull} IN_PROGRESS
                          </div>
                        ) : (
                          <div style={{
                            color: asciiColors.muted,
                            fontSize: 10,
                            padding: "4px 10px",
                            border: `1px solid ${asciiColors.border}`,
                            borderRadius: 2,
                            textTransform: "uppercase"
                          }}>
                            {item.status}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {isProcessingExpanded && processingPagination && processingPagination.totalPages > 1 && (
                <div style={{ 
                  display: "flex", 
                  justifyContent: "center", 
                  alignItems: "center", 
                  gap: 12, 
                  marginTop: 16,
                  paddingTop: 16,
                  borderTop: `1px solid ${asciiColors.border}`
                }}>
                  <AsciiButton
                    label="Prev"
                    onClick={() => {
                      const newPage = Math.max(1, processingPage - 1);
                      setProcessingPage(newPage);
                    }}
                    disabled={!processingPagination.hasPrev}
                    variant="ghost"
                  />
                  <span style={{ fontSize: 11, color: asciiColors.muted, fontFamily: "Consolas, 'Source Code Pro', monospace" }}>
                    {ascii.v} Page {processingPagination.page} of {processingPagination.totalPages} {ascii.v}
                  </span>
                  <AsciiButton
                    label="Next"
                    onClick={() => {
                      const newPage = Math.min(processingPagination.totalPages, processingPage + 1);
                      setProcessingPage(newPage);
                    }}
                    disabled={!processingPagination.hasNext}
                    variant="ghost"
                  />
                </div>
              )}
              {!isProcessingExpanded && currentlyProcessing.length > 5 && (
                <div style={{
                  marginTop: 8,
                  padding: "8px",
                  textAlign: "center",
                  fontSize: 10,
                  color: asciiColors.muted,
                  fontFamily: "Consolas, 'Source Code Pro', monospace"
                }}>
                  {ascii.bullet} Showing 5 of {currentlyProcessing.length} tables. Click header to view all.
                </div>
              )}
            </>
          )}
        </AsciiPanel>
      </div>

      <div style={{ marginTop: 24 }}>
        <AsciiPanel title="CONFIGURATION">
          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: 8
          }}>
            <div
              style={{
                border: `1px solid ${asciiColors.border}`,
                padding: "14px 16px",
                borderRadius: 2,
                backgroundColor: asciiColors.backgroundSoft,
                transition: "all 0.3s ease",
                fontFamily: "Consolas, 'Source Code Pro', monospace"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = asciiColors.accent;
                e.currentTarget.style.backgroundColor = `${asciiColors.accent}10`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = asciiColors.border;
                e.currentTarget.style.backgroundColor = asciiColors.backgroundSoft;
              }}
            >
              <div style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                alignItems: "center",
                gap: 12
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    fontSize: 11, 
                    color: asciiColors.muted, 
                    marginBottom: 6,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px"
                  }}>
                    Batch Configuration
                  </div>
                  <div style={{ 
                    fontSize: 12, 
                    fontWeight: 600, 
                    color: asciiColors.foreground,
                    marginBottom: 4
                  }}>
                    <span style={{ color: asciiColors.accent }}>{ascii.blockFull}</span>{" "}
                    Current Batch Size: <span style={{ color: asciiColors.accent }}>{batchConfig.value}</span>
                  </div>
                  {batchConfig.description && (
                    <div style={{ 
                      fontSize: 10, 
                      color: asciiColors.muted,
                      marginTop: 4
                    }}>
                      {batchConfig.description}
                    </div>
                  )}
                </div>
                <div style={{ 
                  display: "flex", 
                  flexDirection: "column", 
                  alignItems: "flex-end",
                  gap: 4
                }}>
                  <div style={{
                    fontSize: 10,
                    color: asciiColors.muted,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px"
                  }}>
                    Last Updated
                  </div>
                  <div style={{
                    fontSize: 11,
                    color: asciiColors.foreground,
                    fontWeight: 500,
                    display: "flex",
                    alignItems: "center",
                    gap: 4
                  }}>
                    <span>{ascii.bullet}</span>
                    <span>{new Date(batchConfig.updated_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
            <div style={{
              padding: "8px 12px",
              fontSize: 10,
              color: asciiColors.muted,
              fontFamily: "Consolas, 'Source Code Pro', monospace",
              border: `1px dashed ${asciiColors.border}`,
              borderRadius: 2,
              backgroundColor: `${asciiColors.muted}05`
            }}>
              <span style={{ color: asciiColors.accent }}>{ascii.bullet}</span>{" "}
              Batch size determines how many records are processed per transaction. Larger batches improve throughput but require more memory.
            </div>
          </div>
        </AsciiPanel>
      </div>
      <style>{globalStyles}</style>
    </div>
  );
};

export default Dashboard;
