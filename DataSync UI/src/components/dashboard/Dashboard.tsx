import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { dashboardApi, configApi } from "../../services/api";
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [barWidth, setBarWidth] = useState(40);
  
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const padding = 16;
        const percentageWidth = 60;
        const availableWidth = containerWidth - padding - percentageWidth;
        const charWidth = 8;
        const calculatedWidth = Math.max(20, Math.min(60, Math.floor(availableWidth / charWidth)));
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
        margin: "8px 0",
        width: "100%"
      }}
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


const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  useEffect(() => {
    isMountedRef.current = true;
    isInitialLoadRef.current = true;
    fetchStats();
    fetchCurrentlyProcessing(1);

    const syncStatsInterval = setInterval(fetchSyncStats, 500);
    const systemResourcesInterval = setInterval(fetchSystemResources, 10000);

    return () => {
      isMountedRef.current = false;
      clearInterval(syncStatsInterval);
      clearInterval(systemResourcesInterval);
    };
  }, [fetchStats, fetchSyncStats, fetchSystemResources]);

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
        DATASYNC REAL-TIME DASHBOARD
      </h1>

      <AsciiPanel title="SYNCHRONIZATION STATUS">
        <AsciiProgressBar progress={progressPercentage} />
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
          marginTop: 16,
          animation: "fadeInUp 0.4s ease-out"
        }}>
          <AnimatedStat
            icon={ascii.blockFull}
            label="Listening Changes"
            value={stats.syncStatus.listeningChanges || 0}
            color={asciiColors.muted}
          />
          <AnimatedStat
            icon={ascii.blockFull}
            label="Pending"
            value={stats.syncStatus.pending || 0}
            color={asciiColors.muted}
          />
          <AnimatedStat
            icon={ascii.blockFull}
            label="Active"
            value={stats.syncStatus.fullLoadActive || 0}
            color={asciiColors.muted}
          />
          <AnimatedStat
            icon={ascii.blockFull}
            label="Inactive"
            value={stats.syncStatus.fullLoadInactive || 0}
            color={asciiColors.muted}
          />
          <AnimatedStat
            icon={ascii.blockFull}
            label="No Data"
            value={stats.syncStatus.noData || 0}
            color={asciiColors.muted}
          />
          <AnimatedStat
            icon={ascii.blockFull}
            label="Skip"
            value={stats.syncStatus.skip || 0}
            color={asciiColors.muted}
          />
          <AnimatedStat
            icon={ascii.blockFull}
            label="Errors"
            value={stats.syncStatus.errors || 0}
            color={asciiColors.muted}
          />
          <AnimatedStat
            icon={ascii.blockFull}
            label="In Progress"
            value={stats.syncStatus.inProgress || 0}
            color={asciiColors.muted}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ 
              color: asciiColors.muted,
              display: "inline-block"
            }}>
              {ascii.blockFull}
            </span>
            <span>Total Tables:</span>
            <span style={{ 
              color: asciiColors.muted, 
              fontWeight: 600
            }}>
              {(stats.syncStatus.listeningChanges || 0) + (stats.syncStatus.pending || 0) + (stats.syncStatus.fullLoadActive || 0) + (stats.syncStatus.fullLoadInactive || 0) + (stats.syncStatus.noData || 0) + (stats.syncStatus.skip || 0) + (stats.syncStatus.inProgress || 0)}
            </span>
          </div>
        </div>

      </AsciiPanel>

      <AsciiPanel title="CURRENTLY PROCESSING & RECENT ACTIVITY">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            cursor: "pointer",
            marginBottom: 8,
            padding: "4px 0",
            transition: "all 0.2s ease",
            borderRadius: 2
          }}
          onClick={() => setIsProcessingExpanded(!isProcessingExpanded)}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = asciiColors.backgroundSoft;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          <span style={{ 
            color: asciiColors.accent,
            transition: "transform 0.3s ease",
            transform: isProcessingExpanded ? "rotate(90deg)" : "rotate(0deg)",
            display: "inline-block"
          }}>
            {ascii.arrowRight}
          </span>
          <span style={{ marginLeft: 4 }}>
            {processingPagination?.total || currentlyProcessing.length} {(processingPagination?.total || currentlyProcessing.length) === 1 ? "table" : "tables"}
          </span>
        </div>
        {currentlyProcessing.length === 0 ? (
          <div style={{
            padding: 16,
            color: asciiColors.muted,
            fontSize: 12,
            fontFamily: "Consolas, 'Source Code Pro', monospace",
            border: `1px dashed ${asciiColors.border}`,
            borderRadius: 2
          }}>
            {ascii.dot} No active processing detected
          </div>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {currentlyProcessing.slice(0, isProcessingExpanded ? currentlyProcessing.length : 3).map((item, index) => (
                <div
                  key={index}
                  style={{
                    border: `1px solid ${asciiColors.border}`,
                    padding: "12px 16px",
                    borderRadius: 2,
                    backgroundColor: asciiColors.backgroundSoft,
                    transition: "all 0.3s ease",
                    animation: "fadeInUp 0.4s ease-out",
                    animationDelay: `${index * 0.1}s`
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, fontFamily: "Consolas, 'Source Code Pro', monospace" }}>
                    <h3 style={{ 
                      fontSize: 13, 
                      fontWeight: 600, 
                      margin: 0,
                      fontFamily: "Consolas, 'Source Code Pro', monospace"
                    }}>
                      <span>{item.schema_name}.{item.table_name}</span>
                      <span style={{ color: asciiColors.muted, marginLeft: 4, fontSize: 12 }}>
                        [{item.db_engine}]
                      </span>
                    </h3>
                    <div style={{ 
                      fontSize: 11, 
                      color: asciiColors.muted, 
                      display: "flex", 
                      alignItems: "center", 
                      gap: 8 
                    }}>
                      <span>{ascii.blockFull} {formatNumberWithCommas(item.total_records)} records</span>
                      {item.status === "IN_PROGRESS" && (
                        <span style={{
                          color: asciiColors.accent,
                          fontWeight: 600,
                          padding: "2px 6px",
                          border: `1px solid ${asciiColors.accent}`,
                          borderRadius: 2
                        }}>
                          IN_PROGRESS
                        </span>
                      )}
                      {item.status !== "IN_PROGRESS" && (
                        <span>{item.status}</span>
                      )}
                      {item.processed_at && (
                        <span>
                          {ascii.bullet} {new Date(item.processed_at).toLocaleString()}
                        </span>
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
                marginTop: 16 
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
                <span style={{ fontSize: 12, color: asciiColors.muted, fontFamily: "Consolas, 'Source Code Pro', monospace" }}>
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
          </>
        )}
      </AsciiPanel>

      <AsciiPanel title="CONFIGURATION">
        <div style={{
          display: "flex",
          gap: 24,
          alignItems: "center",
          padding: "8px 0",
          fontFamily: "Consolas, 'Source Code Pro', monospace",
          fontSize: 12
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: asciiColors.muted }}>{ascii.v}</span>
            <span>Current Batch:</span>
            <span style={{ color: asciiColors.accent, fontWeight: 600 }}>{batchConfig.value}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: asciiColors.muted }}>{ascii.v}</span>
            <span>Last Updated:</span>
            <span style={{ color: asciiColors.foreground }}>
              {new Date(batchConfig.updated_at).toLocaleString()}
            </span>
          </div>
        </div>
      </AsciiPanel>
      <style>{globalStyles}</style>
    </div>
  );
};

export default Dashboard;
