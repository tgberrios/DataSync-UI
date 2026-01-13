import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 60000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isLoginEndpoint = error.config?.url?.includes("/auth/login");
      if (!isLoginEndpoint) {
        const errorMessage =
          error.response?.data?.error || error.response?.data?.message || "";

        if (
          errorMessage.includes("Authentication required") ||
          errorMessage.includes("Invalid token") ||
          errorMessage.includes("Token expired")
        ) {
          localStorage.removeItem("authToken");
          localStorage.removeItem("authUser");

          if (window.location.pathname !== "/login") {
            setTimeout(() => {
              window.location.href = "/login";
            }, 100);
          }
        }
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: async (username: string, password: string) => {
    const response = await api.post("/auth/login", { username, password });
    if (response.data.token) {
      localStorage.setItem("authToken", response.data.token);
      localStorage.setItem("authUser", JSON.stringify(response.data.user));
    }
    return response.data;
  },

  logout: async () => {
    try {
      await api.post("/auth/logout");
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      localStorage.removeItem("authToken");
      localStorage.removeItem("authUser");
    }
  },

  getCurrentUser: async () => {
    const response = await api.get("/auth/me");
    return response.data.user;
  },

  changePassword: async (oldPassword: string, newPassword: string) => {
    const response = await api.post("/auth/change-password", {
      oldPassword,
      newPassword,
    });
    return response.data;
  },

  getUsers: async (params?: {
    page?: number;
    limit?: number;
    role?: string;
    active?: string;
    search?: string;
  }) => {
    const response = await api.get("/auth/users", { params });
    return response.data;
  },

  createUser: async (
    username: string,
    email: string,
    password: string,
    role?: string
  ) => {
    const response = await api.post("/auth/users", {
      username,
      email,
      password,
      role: role || "user",
    });
    return response.data;
  },

  updateUser: async (
    id: number,
    data: {
      username?: string;
      email?: string;
      role?: string;
      active?: boolean;
    }
  ) => {
    const response = await api.patch(`/auth/users/${id}`, data);
    return response.data;
  },

  deleteUser: async (id: number) => {
    const response = await api.delete(`/auth/users/${id}`);
    return response.data;
  },

  resetUserPassword: async (id: number, newPassword: string) => {
    const response = await api.post(`/auth/users/${id}/reset-password`, {
      newPassword,
    });
    return response.data;
  },
};

export const getCurrentUser = () => {
  const userStr = localStorage.getItem("authUser");
  return userStr ? JSON.parse(userStr) : null;
};

export const isAuthenticated = () => {
  return !!localStorage.getItem("authToken");
};

export interface CatalogEntry {
  schema_name: string;
  table_name: string;
  db_engine: string;
  connection_string: string;
  active: boolean;
  status: string;
  cluster_name: string;
  updated_at: string;
  pk_strategy?: string;
  cron_schedule?: string | null;
  next_sync_time?: string | null;
  last_sync_time?: string | null;
}

export interface BatchConfig {
  key: string;
  value: string;
  description: string;
  updated_at: string;
}

export interface DashboardStats {
  syncStatus: {
    progress: number;
    listeningChanges: number;
    pending: number;
    fullLoadActive: number;
    fullLoadInactive: number;
    noData: number;
    skip: number;
    errors: number;
    inProgress: number;
    currentProcess: string;
    totalData?: number;
    totalTables?: number;
    totalColumns?: number;
  };
  systemResources: {
    cpuUsage: string;
    memoryUsed: string;
    memoryTotal: string;
    memoryPercentage: string;
    rss: string;
    virtual: string;
  };
  dbHealth: {
    activeConnections: string;
    connectionPercentage: string;
    responseTime: string;
    bufferHitRate: string;
    cacheHitRate: string;
    status: string;
    uptimeSeconds: number;
    activeQueries: number;
    waitingQueries: number;
    avgQueryDuration: number;
    databaseSizeBytes: number;
    queryEfficiencyScore: number;
    longRunningQueries: number;
    blockingQueries: number;
    totalQueries24h: number;
  };
  batchConfig: BatchConfig;
  // Connection pooling removed - using direct connections now
  engineMetrics?: {
    [engine: string]: {
      recordsPerSecond: number;
      bytesTransferred: number;
      cpuUsage: number;
      memoryUsed: number;
      iops: number;
      activeTransfers: number;
    };
  };
  activeTransfersProgress?: {
    schemaName: string;
    tableName: string;
    dbEngine: string;
    tableSize: number;
    progressPercentage: number;
    status: string;
    lastSyncTime: string;
  }[];
  metricsCards?: {
    topTablesThroughput: {
      tableName: string;
      dbEngine: string;
      throughputRps: number;
      recordsTransferred: number;
    }[];
    currentIops: number;
    dataVolumeByTable: {
      tableName: string;
      dbEngine: string;
      totalBytes: number;
      transferCount: number;
    }[];
    currentThroughput: {
      avgRps: number;
      totalRecords: number;
      transferCount: number;
    };
  };
  dataProtection?: {
    masking: {
      totalPolicies: number;
      activePolicies: number;
      inactivePolicies: number;
      sensitiveColumns: number;
      protectedColumns: number;
      unprotectedColumns: number;
      coveragePercentage: number;
    };
    alerts: {
      total: number;
      open: number;
      critical: number;
      warning: number;
      info: number;
      totalRules: number;
      enabledRules: number;
    };
  };
  backups?: {
    total: number;
    scheduled: number;
    completed: number;
    failed: number;
    inProgress: number;
    totalSize: number;
    lastBackupTime: string | null;
    nextBackup: {
      name: string;
      nextRunAt: string;
      dbEngine: string;
      databaseName: string;
    } | null;
  };
  migrations?: {
    total: number;
    pending: number;
    applied: number;
    failed: number;
    lastApplied: string | null;
    byEnvironment: {
      [env: string]: {
        total: number;
        applied: number;
      };
    };
  };
  dataQuality?: {
    totalTablesChecked: number;
    passed: number;
    failed: number;
    warning: number;
    avgScore: number;
    lastCheck: string | null;
  };
  governance?: {
    totalTables: number;
    encryptedTables: number;
    maskedTables: number;
    healthyTables: number;
    warningTables: number;
    criticalTables: number;
  };
  maintenance?: {
    pending: number;
    completedToday: number;
    totalSpaceReclaimedMB: number;
    avgPerformanceImprovement: number;
  };
  dataSources?: {
    database: number;
    api: number;
    csv: number;
    sheets: number;
    warehouse: number;
    total: number;
  };
}

export interface CurrentlyProcessing {
  schema_name: string;
  table_name: string;
  db_engine: string;
  new_pk: string | null;
  status: string;
  processed_at: string;
  total_records: number;
}

export const dashboardApi = {
  getDashboardStats: async () => {
    try {
      const response = await api.get<DashboardStats>("/dashboard/stats");
      return response.data;
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      if (axios.isAxiosError(error) && error.response) {
        console.error("Server error details:", error.response.data);
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },
  getCurrentlyProcessing: async (page: number = 1) => {
    try {
      const response = await api.get<{
        data: CurrentlyProcessing[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
          hasNext: boolean;
          hasPrev: boolean;
        };
      }>(`/dashboard/currently-processing?page=${page}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching currently processing tables:", error);
      if (axios.isAxiosError(error) && error.response) {
        console.error("Server error details:", error.response.data);
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },
  getSystemLogs: async (limit: number = 60) => {
    try {
      const response = await api.get<{
        logs: Array<{
          timestamp: string;
          cpuUsage: number;
          memoryPercentage: number;
          network: number;
          throughput: number;
        }>;
      }>(`/dashboard/system-logs?limit=${limit}`);
      return response.data.logs;
    } catch (error) {
      console.error("Error fetching system logs:", error);
      if (axios.isAxiosError(error) && error.response) {
        console.error("Server error details:", error.response.data);
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },
};

export interface ConfigEntry {
  key: string;
  value: string;
  description: string | null;
  updated_at: string;
}

export const configApi = {
  getConfigs: async () => {
    try {
      const response = await api.get<ConfigEntry[]>("/config");
      return response.data;
    } catch (error) {
      console.error("Error fetching configurations:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  createConfig: async (config: ConfigEntry) => {
    try {
      const response = await api.post<ConfigEntry>("/config", config);
      return response.data;
    } catch (error) {
      console.error("Error creating configuration:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  updateConfig: async (config: ConfigEntry) => {
    try {
      const response = await api.put<ConfigEntry>(
        `/config/${config.key}`,
        config
      );
      return response.data;
    } catch (error) {
      console.error("Error updating configuration:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  deleteConfig: async (key: string) => {
    try {
      const response = await api.delete(`/config/${key}`);
      return response.data;
    } catch (error) {
      console.error("Error deleting configuration:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  getBatchConfig: async () => {
    try {
      const response = await api.get<BatchConfig>("/config/batch");
      return response.data;
    } catch (error) {
      console.error("Error fetching batch configuration:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },
};

export const governanceApi = {
  getGovernanceData: async (params: {
    page?: number;
    limit?: number;
    engine?: string;
    category?: string;
    health?: string;
    domain?: string;
    sensitivity?: string;
  }) => {
    try {
      const response = await api.get("/governance/data", { params });
      return response.data;
    } catch (error) {
      console.error("Error fetching governance data:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },
  getGovernanceMetrics: async () => {
    try {
      const response = await api.get("/governance/metrics");
      return response.data;
    } catch (error) {
      console.error("Error fetching governance metrics:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },
};

export const qualityApi = {
  getQualityMetrics: async (params: {
    page?: number;
    limit?: number;
    engine?: string;
    status?: string;
    minScore?: number;
    maxScore?: number;
  }, signal?: AbortSignal) => {
    try {
      const response = await api.get("/quality/metrics", { 
        params,
        signal,
        timeout: 30000
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ERR_CANCELED' || error.name === 'CanceledError' || error.message?.includes('canceled')) {
          const cancelError = new Error("Request cancelled");
          cancelError.name = 'CanceledError';
          throw cancelError;
        }
        if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
          throw new Error("Request timeout - the server is taking too long to respond");
        }
        if (error.name === 'AbortError' || error.message?.includes('aborted')) {
          const abortError = new Error("Request cancelled");
          abortError.name = 'AbortError';
          throw abortError;
        }
        if (error.response) {
          throw new Error(
            error.response.data.details ||
              error.response.data.error ||
              error.message
          );
        }
      }
      throw error;
    }
  },

  getQualityHistory: async (params: {
    schema?: string;
    table?: string;
    engine?: string;
    days?: number;
    limit?: number;
  }, signal?: AbortSignal) => {
    try {
      const response = await api.get("/quality/history", {
        params,
        signal,
        timeout: 30000
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ERR_CANCELED' || error.name === 'CanceledError' || error.message?.includes('canceled')) {
          const cancelError = new Error("Request cancelled");
          cancelError.name = 'CanceledError';
          throw cancelError;
        }
        if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
          throw new Error("Request timeout - the server is taking too long to respond");
        }
        if (error.response) {
          throw new Error(
            error.response.data.details ||
              error.response.data.error ||
              error.message
          );
        }
      }
      throw error;
    }
  },

  getQualityStats: async (params: {
    days?: number;
    engine?: string;
  }, signal?: AbortSignal) => {
    try {
      const response = await api.get("/quality/stats", {
        params,
        signal,
        timeout: 30000
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ERR_CANCELED' || error.name === 'CanceledError' || error.message?.includes('canceled')) {
          const cancelError = new Error("Request cancelled");
          cancelError.name = 'CanceledError';
          throw cancelError;
        }
        if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
          throw new Error("Request timeout - the server is taking too long to respond");
        }
        if (error.response) {
          throw new Error(
            error.response.data.details ||
              error.response.data.error ||
              error.message
          );
        }
      }
      throw error;
    }
  },
};

export const monitorApi = {
  getActiveQueries: async () => {
    try {
      const response = await api.get("/monitor/queries");
      return response.data;
    } catch (error) {
      console.error("Error fetching active queries:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  getProcessingLogs: async (
    page: number = 1,
    limit: number = 20,
    strategy?: string
  ) => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (strategy) params.set("strategy", strategy);
      const response = await api.get(
        `/monitor/processing-logs?${params.toString()}`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching processing logs:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  getProcessingStats: async () => {
    try {
      const response = await api.get("/monitor/processing-logs/stats");
      return response.data;
    } catch (error) {
      console.error("Error fetching processing stats:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  cleanupOldProcessingLogs: async () => {
    try {
      const response = await api.post("/monitor/processing-logs/cleanup");
      return response.data;
    } catch (error) {
      console.error("Error cleaning up old processing logs:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  getTransferMetrics: async (params: {
    page?: number;
    limit?: number;
    schema_name?: string;
    table_name?: string;
    db_engine?: string;
    status?: string;
    transfer_type?: string;
    days?: number;
  }) => {
    try {
      const response = await api.get("/monitor/transfer-metrics", { params });
      return response.data;
    } catch (error) {
      console.error("Error fetching transfer metrics:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  getTransferMetricsStats: async (params?: { days?: number }) => {
    try {
      const response = await api.get("/monitor/transfer-metrics/stats", {
        params,
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching transfer metrics stats:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },
};

export const catalogApi = {
  // Obtener entradas del catálogo con paginación, filtros y búsqueda
  getCatalogEntries: async (
    params: {
      page?: number;
      limit?: number;
      engine?: string;
      status?: string;
      active?: string;
      search?: string;
      sort_field?: string;
      sort_direction?: string;
    } = {}
  ) => {
    try {
      const response = await api.get("/catalog", { params });
      return response.data;
    } catch (error) {
      console.error("Error fetching catalog:", error);
      throw error;
    }
  },

  // Actualizar el estado activo de una entrada
  updateEntryStatus: async (
    schema_name: string,
    table_name: string,
    db_engine: string,
    active: boolean
  ) => {
    try {
      const s = schema_name.toLowerCase();
      const t = table_name.toLowerCase();
      const response = await api.patch<CatalogEntry>("/catalog/status", {
        schema_name: s,
        table_name: t,
        db_engine,
        active,
      });
      return response.data;
    } catch (error) {
      console.error("Error updating status:", error);
      throw error;
    }
  },

  // Forzar una sincronización completa
  triggerFullSync: async (
    schema_name: string,
    table_name: string,
    db_engine: string
  ) => {
    try {
      const s = schema_name.toLowerCase();
      const t = table_name.toLowerCase();
      const response = await api.post<CatalogEntry>("/catalog/sync", {
        schema_name: s,
        table_name: t,
        db_engine,
      });
      return response.data;
    } catch (error) {
      console.error("Error triggering sync:", error);
      throw error;
    }
  },

  // Resetear CDC (last_change_id a 0)
  resetCDC: async (
    schema_name: string,
    table_name: string,
    db_engine: string
  ) => {
    try {
      const response = await api.post("/catalog/reset-cdc", {
        schema_name,
        table_name,
        db_engine,
      });
      return response.data;
    } catch (error) {
      console.error("Error resetting CDC:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  // Crear una nueva entrada del catálogo
  createEntry: async (
    entry: Omit<CatalogEntry, "last_sync_time" | "updated_at">
  ) => {
    try {
      const response = await api.post<CatalogEntry>("/catalog", entry);
      return response.data;
    } catch (error) {
      console.error("Error creating entry:", error);
      throw error;
    }
  },

  // Actualizar una entrada del catálogo
  updateEntry: async (entry: CatalogEntry) => {
    try {
      const response = await api.put<CatalogEntry>("/catalog", entry);
      return response.data;
    } catch (error) {
      console.error("Error updating entry:", error);
      throw error;
    }
  },

  // Obtener todos los schemas únicos
  getSchemas: async () => {
    try {
      const response = await api.get<string[]>("/catalog/schemas");
      return response.data;
    } catch (error) {
      console.error("Error fetching schemas:", error);
      throw error;
    }
  },

  // Obtener todos los engines únicos
  getEngines: async () => {
    try {
      const response = await api.get<string[]>("/catalog/engines");
      return response.data;
    } catch (error) {
      console.error("Error fetching engines:", error);
      throw error;
    }
  },

  // Obtener todos los status únicos
  getStatuses: async () => {
    try {
      const response = await api.get<string[]>("/catalog/statuses");
      return response.data;
    } catch (error) {
      console.error("Error fetching statuses:", error);
      throw error;
    }
  },

  // Obtener todas las strategies únicas
  getStrategies: async () => {
    try {
      const response = await api.get<string[]>("/catalog/strategies");
      return response.data;
    } catch (error) {
      console.error("Error fetching strategies:", error);
      throw error;
    }
  },

  // Marcar tabla como SKIP
  skipTable: async (
    schema_name: string,
    table_name: string,
    db_engine: string
  ) => {
    try {
      const s = schema_name.toLowerCase();
      const t = table_name.toLowerCase();
      const response = await api.patch<{
        message: string;
        affectedRows: number;
        entry: CatalogEntry;
      }>("/catalog/skip-table", {
        schema_name: s,
        table_name: t,
        db_engine,
      });
      return response.data;
    } catch (error) {
      console.error("Error skipping table:", error);
      throw error;
    }
  },

  // Desactivar schema completo
  deactivateSchema: async (schema_name: string) => {
    try {
      const s = schema_name.toLowerCase();
      const response = await api.patch<{
        message: string;
        affectedRows: number;
        rows: CatalogEntry[];
      }>("/catalog/deactivate-schema", { schema_name: s });
      return response.data;
    } catch (error) {
      console.error("Error deactivating schema:", error);
      throw error;
    }
  },

  // Obtener historial de ejecuciones de una tabla
  getExecutionHistory: async (
    schema_name: string,
    table_name: string,
    db_engine: string,
    limit: number = 50
  ) => {
    try {
      const response = await api.get("/catalog/execution-history", {
        params: { schema_name, table_name, db_engine, limit },
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching execution history:", error);
      throw error;
    }
  },

  // Obtener estructura de tabla (source y target)
  getTableStructure: async (
    schema_name: string,
    table_name: string,
    db_engine: string
  ) => {
    try {
      const response = await api.get("/catalog/table-structure", {
        params: { schema_name, table_name, db_engine },
      });
      return response.data;
    } catch (error) {
      console.error("❌ [API] Error fetching table structure:");
      console.error("   Parameters:", { schema_name, table_name, db_engine });
      
      if (axios.isAxiosError(error)) {
        console.error("   Status:", error.response?.status || "N/A");
        console.error("   Status Text:", error.response?.statusText || "N/A");
        console.error("   URL:", error.config?.url || "N/A");
        console.error("   Method:", error.config?.method?.toUpperCase() || "N/A");
        
        if (error.response?.data) {
          console.error("   Response Data:", error.response.data);
          if (error.response.data.error) {
            console.error("   Error Message:", error.response.data.error);
          }
          if (error.response.data.details) {
            console.error("   Error Details:", error.response.data.details);
          }
        }
        
        if (error.message) {
          console.error("   Axios Error Message:", error.message);
        }
        
        if (error.stack) {
          console.error("   Stack Trace:", error.stack);
        }
      } else {
        console.error("   Non-Axios Error:", error);
        if (error instanceof Error) {
          console.error("   Error Message:", error.message);
          console.error("   Stack Trace:", error.stack);
        }
      }
      
      throw error;
    }
  },
};

// Interfaces para logs
export interface LogEntry {
  id?: number;
  timestamp: string;
  level: string;
  category?: string;
  function: string;
  message: string;
  raw: string;
  parsed?: boolean;
}

export interface LogsResponse {
  logs: LogEntry[];
  totalLines: number;
  filePath: string;
  lastModified: string;
  filters?: {
    level: string;
    category: string;
    function?: string;
    search: string;
    startDate: string;
    endDate: string;
  };
}

export interface LogInfo {
  exists: boolean;
  filePath?: string;
  size?: number;
  totalLines?: number;
  lastModified?: string;
  created?: string;
  message?: string;
}

export interface LogStats {
  total: number;
  byLevel: Record<string, number>;
  byCategory: Record<string, number>;
  byFunction: Record<string, number>;
  recent: Array<{
    timestamp: string;
    level: string;
    category: string;
    function: string;
  }>;
}

export interface LogStatsResponse {
  stats: LogStats;
  generatedAt: string;
}

export const logsApi = {
  getLevels: async () => {
    const response = await api.get<string[]>("/logs/levels");
    return response.data;
  },
  getCategories: async () => {
    const response = await api.get<string[]>("/logs/categories");
    return response.data;
  },
  getFunctions: async () => {
    const response = await api.get<string[]>("/logs/functions");
    return response.data;
  },
  getLogs: async (
    params: {
      lines?: number;
      level?: string;
      category?: string;
      function?: string;
      search?: string;
      startDate?: string;
      endDate?: string;
    } = {}
  ) => {
    try {
      const response = await api.get<LogsResponse>("/logs", { params });
      return response.data;
    } catch (error) {
      console.error("Error fetching logs:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  getLogInfo: async () => {
    try {
      const response = await api.get<LogInfo>("/logs/info");
      return response.data;
    } catch (error) {
      console.error("Error fetching log info:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  clearLogs: async () => {
    try {
      const response = await api.delete("/logs");
      return response.data;
    } catch (error) {
      console.error("Error clearing logs:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  getLogStats: async () => {
    try {
      const response = await api.get<LogStatsResponse>("/logs/stats");
      return response.data;
    } catch (error) {
      console.error("Error fetching log stats:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  // Error logs API
  getErrorLogs: async (
    params: {
      lines?: number;
      category?: string;
      search?: string;
      startDate?: string;
      endDate?: string;
    } = {}
  ) => {
    try {
      const response = await api.get<LogsResponse>("/logs/errors", { params });
      return response.data;
    } catch (error) {
      console.error("Error fetching error logs:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  getErrorLogInfo: async () => {
    try {
      const response = await api.get<LogInfo>("/logs/errors/info");
      return response.data;
    } catch (error) {
      console.error("Error fetching error log info:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },
};

export const securityApi = {
  getSecurityData: async () => {
    try {
      const response = await api.get("/security/data");
      return response.data;
    } catch (error) {
      console.error("Error fetching security data:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },
};

export const queryPerformanceApi = {
  getQueries: async (params: {
    page?: number;
    limit?: number;
    performance_tier?: string;
    operation_type?: string;
    source_type?: string;
    search?: string;
  }) => {
    try {
      const response = await api.get("/query-performance/queries", { params });
      return response.data;
    } catch (error) {
      console.error("Error fetching query performance data:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  getMetrics: async () => {
    try {
      const response = await api.get("/query-performance/metrics");
      return response.data;
    } catch (error) {
      console.error("Error fetching query performance metrics:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },
};

export const maintenanceApi = {
  getMaintenanceItems: async (params: {
    page?: number;
    limit?: number;
    maintenance_type?: string;
    status?: string;
    db_engine?: string;
  }) => {
    try {
      const response = await api.get("/maintenance/items", { params });
      return response.data;
    } catch (error) {
      console.error("Error fetching maintenance data:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  getMetrics: async () => {
    try {
      const response = await api.get("/maintenance/metrics");
      return response.data;
    } catch (error) {
      console.error("Error fetching maintenance metrics:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },
};

export const columnCatalogApi = {
  getColumns: async (params: {
    page?: number;
    limit?: number;
    schema_name?: string;
    table_name?: string;
    db_engine?: string;
    data_type?: string;
    sensitivity_level?: string;
    contains_pii?: string;
    contains_phi?: string;
    search?: string;
  }) => {
    try {
      const response = await api.get("/column-catalog/columns", { params });
      return response.data;
    } catch (error) {
      console.error("Error fetching column catalog data:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  getMetrics: async () => {
    try {
      const response = await api.get("/column-catalog/metrics");
      return response.data;
    } catch (error) {
      console.error("Error fetching column catalog metrics:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  getSchemas: async () => {
    try {
      const response = await api.get("/column-catalog/schemas");
      return response.data;
    } catch (error) {
      console.error("Error fetching schemas:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  getTables: async (schemaName: string) => {
    try {
      const response = await api.get(
        `/column-catalog/tables/${encodeURIComponent(schemaName)}`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching tables:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },
};

export const catalogLocksApi = {
  getLocks: async () => {
    try {
      const response = await api.get("/catalog-locks/locks");
      return response.data;
    } catch (error) {
      console.error("Error fetching catalog locks:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  getMetrics: async () => {
    try {
      const response = await api.get("/catalog-locks/metrics");
      return response.data;
    } catch (error) {
      console.error("Error fetching catalog locks metrics:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  unlock: async (lockName: string) => {
    try {
      const response = await api.delete(
        `/catalog-locks/locks/${encodeURIComponent(lockName)}`
      );
      return response.data;
    } catch (error) {
      console.error("Error unlocking lock:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  cleanExpired: async () => {
    try {
      const response = await api.post("/catalog-locks/clean-expired");
      return response.data;
    } catch (error) {
      console.error("Error cleaning expired locks:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },
};

export const dataLineageApi = {
  getMariaDBLineage: async (params: {
    page?: number;
    limit?: number;
    server_name?: string;
    database_name?: string;
    object_type?: string;
    relationship_type?: string;
    search?: string;
  }) => {
    try {
      const response = await api.get("/data-lineage/mariadb", { params });
      return response.data;
    } catch (error) {
      console.error("Error fetching MariaDB lineage data:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  getMariaDBMetrics: async () => {
    try {
      const response = await api.get("/data-lineage/mariadb/metrics");
      return response.data;
    } catch (error) {
      console.error("Error fetching MariaDB lineage metrics:", error);
      if (axios.isAxiosError(error) && error.response) {
        console.error("API: MariaDB metrics error response:", error.response);
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  getMariaDBServers: async () => {
    try {
      const response = await api.get("/data-lineage/mariadb/servers");
      return response.data;
    } catch (error) {
      console.error("Error fetching MariaDB servers:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  getMariaDBDatabases: async (serverName: string) => {
    try {
      const response = await api.get(
        `/data-lineage/mariadb/databases/${encodeURIComponent(serverName)}`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching MariaDB databases:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },
};

export const dataLineageMSSQLApi = {
  getMSSQLLineage: async (params: {
    page?: number;
    limit?: number;
    server_name?: string;
    instance_name?: string;
    database_name?: string;
    object_type?: string;
    relationship_type?: string;
    search?: string;
  }) => {
    try {
      const response = await api.get("/data-lineage/mssql", { params });
      return response.data;
    } catch (error) {
      console.error("Error fetching MSSQL lineage data:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  getMSSQLMetrics: async () => {
    try {
      const response = await api.get("/data-lineage/mssql/metrics");
      return response.data;
    } catch (error) {
      console.error("Error fetching MSSQL lineage metrics:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  getMSSQLServers: async () => {
    try {
      const response = await api.get("/data-lineage/mssql/servers");
      return response.data;
    } catch (error) {
      console.error("Error fetching MSSQL servers:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  getMSSQLInstances: async (serverName: string) => {
    try {
      const response = await api.get(
        `/data-lineage/mssql/instances/${encodeURIComponent(serverName)}`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching MSSQL instances:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  getMSSQLDatabases: async (serverName: string, instanceName: string) => {
    try {
      const response = await api.get(
        `/data-lineage/mssql/databases/${encodeURIComponent(
          serverName
        )}/${encodeURIComponent(instanceName)}`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching MSSQL databases:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },
};

export const dataLineageMongoDBApi = {
  getMongoDBLineage: async (params: {
    page?: number;
    limit?: number;
    server_name?: string;
    database_name?: string;
    relationship_type?: string;
    search?: string;
  }) => {
    try {
      const response = await api.get("/data-lineage/mongodb", { params });
      return response.data;
    } catch (error) {
      console.error("Error fetching MongoDB lineage data:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  getMongoDBMetrics: async () => {
    try {
      const response = await api.get("/data-lineage/mongodb/metrics");
      return response.data;
    } catch (error) {
      console.error("Error fetching MongoDB lineage metrics:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  getMongoDBServers: async () => {
    try {
      const response = await api.get("/data-lineage/mongodb/servers");
      return response.data;
    } catch (error) {
      console.error("Error fetching MongoDB servers:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  getMongoDBDatabases: async (serverName: string) => {
    try {
      const response = await api.get(
        `/data-lineage/mongodb/databases/${encodeURIComponent(serverName)}`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching MongoDB databases:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },
};

export const governanceCatalogApi = {
  getMariaDBItems: async (params: {
    page?: number;
    limit?: number;
    server_name?: string;
    database_name?: string;
    health_status?: string;
    access_frequency?: string;
    search?: string;
  }) => {
    try {
      const response = await api.get("/governance-catalog/mariadb", { params });
      return response.data;
    } catch (error) {
      console.error("Error fetching MariaDB governance catalog:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  getMariaDBMetrics: async () => {
    try {
      const response = await api.get("/governance-catalog/mariadb/metrics");
      return response.data;
    } catch (error) {
      console.error("Error fetching MariaDB governance metrics:", error);
      if (axios.isAxiosError(error) && error.response) {
        console.error("API: MariaDB metrics error response:", error.response);
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  getMariaDBServers: async () => {
    try {
      const response = await api.get("/governance-catalog/mariadb/servers");
      return response.data;
    } catch (error) {
      console.error("Error fetching MariaDB servers:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  getMariaDBDatabases: async (serverName: string) => {
    try {
      const response = await api.get(
        `/governance-catalog/mariadb/databases/${encodeURIComponent(
          serverName
        )}`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching MariaDB databases:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  getMSSQLItems: async (params: {
    page?: number;
    limit?: number;
    server_name?: string;
    database_name?: string;
    object_type?: string;
    health_status?: string;
    access_frequency?: string;
    search?: string;
  }) => {
    try {
      const response = await api.get("/governance-catalog/mssql", { params });
      return response.data;
    } catch (error) {
      console.error("Error fetching MSSQL governance catalog:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  getMSSQLMetrics: async () => {
    try {
      const response = await api.get("/governance-catalog/mssql/metrics");
      return response.data;
    } catch (error) {
      console.error("Error fetching MSSQL governance metrics:", error);
      if (axios.isAxiosError(error) && error.response) {
        console.error("API: MSSQL metrics error response:", error.response);
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  getMSSQLServers: async () => {
    try {
      const response = await api.get("/governance-catalog/mssql/servers");
      return response.data;
    } catch (error) {
      console.error("Error fetching MSSQL servers:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  getMSSQLDatabases: async (serverName: string) => {
    try {
      const response = await api.get(
        `/governance-catalog/mssql/databases/${encodeURIComponent(serverName)}`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching MSSQL databases:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },
};

export const governanceCatalogMongoDBApi = {
  getMongoDBItems: async (params: {
    page?: number;
    limit?: number;
    server_name?: string;
    database_name?: string;
    health_status?: string;
    access_frequency?: string;
    search?: string;
  }) => {
    try {
      const response = await api.get("/governance-catalog/mongodb", { params });
      return response.data;
    } catch (error) {
      console.error("Error fetching MongoDB governance catalog:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  getMongoDBMetrics: async () => {
    try {
      const response = await api.get("/governance-catalog/mongodb/metrics");
      return response.data;
    } catch (error) {
      console.error("Error fetching MongoDB governance metrics:", error);
      if (axios.isAxiosError(error) && error.response) {
        console.error("API: MongoDB metrics error response:", error.response);
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  getMongoDBServers: async () => {
    try {
      const response = await api.get("/governance-catalog/mongodb/servers");
      return response.data;
    } catch (error) {
      console.error("Error fetching MongoDB servers:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  getMongoDBDatabases: async (serverName: string) => {
    try {
      const response = await api.get(
        `/governance-catalog/mongodb/databases/${encodeURIComponent(
          serverName
        )}`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching MongoDB databases:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },
};

export const dataLineageOracleApi = {
  getOracleLineage: async (params: {
    page?: number;
    limit?: number;
    server_name?: string;
    schema_name?: string;
    relationship_type?: string;
    search?: string;
  }) => {
    try {
      const response = await api.get("/data-lineage/oracle", { params });
      return response.data;
    } catch (error) {
      console.error("Error fetching Oracle lineage data:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  getOracleMetrics: async () => {
    try {
      const response = await api.get("/data-lineage/oracle/metrics");
      return response.data;
    } catch (error) {
      console.error("Error fetching Oracle lineage metrics:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  getOracleServers: async () => {
    try {
      const response = await api.get("/data-lineage/oracle/servers");
      return response.data;
    } catch (error) {
      console.error("Error fetching Oracle servers:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  getOracleSchemas: async (serverName: string) => {
    try {
      const response = await api.get(
        `/data-lineage/oracle/schemas/${encodeURIComponent(serverName)}`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching Oracle schemas:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },
};

export const governanceCatalogOracleApi = {
  getOracleItems: async (params: {
    page?: number;
    limit?: number;
    server_name?: string;
    schema_name?: string;
    health_status?: string;
    access_frequency?: string;
    search?: string;
  }) => {
    try {
      const response = await api.get("/governance-catalog/oracle", { params });
      return response.data;
    } catch (error) {
      console.error("Error fetching Oracle governance catalog:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  getOracleMetrics: async () => {
    try {
      const response = await api.get("/governance-catalog/oracle/metrics");
      return response.data;
    } catch (error) {
      console.error("Error fetching Oracle governance metrics:", error);
      if (axios.isAxiosError(error) && error.response) {
        console.error("API: Oracle metrics error response:", error.response);
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  getOracleServers: async () => {
    try {
      const response = await api.get("/governance-catalog/oracle/servers");
      return response.data;
    } catch (error) {
      console.error("Error fetching Oracle servers:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  getOracleSchemas: async (serverName: string) => {
    try {
      const response = await api.get(
        `/governance-catalog/oracle/schemas/${encodeURIComponent(serverName)}`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching Oracle schemas:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },
};

export const apiCatalogApi = {
  getAPIs: async (params: {
    page?: number;
    limit?: number;
    api_type?: string;
    target_db_engine?: string;
    status?: string;
    active?: string;
    search?: string;
  }) => {
    try {
      const response = await api.get("/api-catalog", { params });
      return response.data;
    } catch (error) {
      console.error("Error fetching API catalog:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  createAPI: async (entry: {
    api_name: string;
    api_type: string;
    base_url: string;
    endpoint: string;
    http_method: string;
    auth_type: string;
    auth_config: Record<string, unknown>;
    target_db_engine: string;
    target_connection_string: string;
    target_schema: string;
    target_table: string;
    request_body?: string | null;
    request_headers: Record<string, unknown>;
    query_params: Record<string, unknown>;
    sync_interval: number;
    status: string;
    active: boolean;
  }) => {
    try {
      const response = await api.post("/api-catalog", entry);
      return response.data;
    } catch (error) {
      console.error("Error creating API:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  updateActive: async (apiName: string, active: boolean) => {
    try {
      const response = await api.patch("/api-catalog/active", {
        api_name: apiName,
        active: active,
      });
      return response.data;
    } catch (error) {
      console.error("Error updating API active status:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  getMetrics: async () => {
    try {
      const response = await api.get("/api-catalog/metrics");
      return response.data;
    } catch (error) {
      console.error("Error fetching API catalog metrics:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  previewAPI: async (params: {
    base_url: string;
    endpoint: string;
    http_method?: string;
    auth_type?: string;
    auth_config?: Record<string, unknown> | string;
    request_headers?: Record<string, unknown> | string;
    query_params?: Record<string, unknown> | string;
  }) => {
    try {
      const response = await api.post("/api-catalog/preview", params);
      return response.data;
    } catch (error) {
      console.error("Error previewing API:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  getHistory: async (apiName: string, limit: number = 50) => {
    try {
      const response = await api.get(
        `/api-catalog/${encodeURIComponent(apiName)}/history`,
        {
          params: { limit },
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching API history:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  getTableStructure: async (apiName: string) => {
    try {
      const response = await api.get(
        `/api-catalog/${encodeURIComponent(apiName)}/table-structure`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching table structure:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },
};

export interface CustomJobEntry {
  id: number;
  job_name: string;
  description: string | null;
  source_db_engine: string;
  source_connection_string: string;
  query_sql: string;
  target_db_engine: string;
  target_connection_string: string;
  target_schema: string;
  target_table: string;
  schedule_cron: string | null;
  active: boolean;
  enabled: boolean;
  transform_config: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export const customJobsApi = {
  previewQuery: async (params: {
    db_engine: string;
    connection_string: string;
    query_sql: string;
    limit?: number;
  }) => {
    try {
      const response = await api.post("/custom-jobs/preview-query", params);
      return response.data;
    } catch (error) {
      console.error("Error previewing query:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },
  getHistory: async (jobName: string, limit: number = 50) => {
    try {
      const response = await api.get(`/custom-jobs/${jobName}/history`, {
        params: { limit },
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching job history:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },
  getTableStructure: async (jobName: string) => {
    try {
      const response = await api.get(`/custom-jobs/${jobName}/table-structure`);
      return response.data;
    } catch (error) {
      console.error("Error fetching table structure:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },
  discoverColumns: async (
    db_engine: string,
    connection_string: string,
    schema_name: string,
    table_name: string
  ) => {
    try {
      const response = await api.post("/discover-columns", {
        db_engine,
        connection_string,
        schema_name,
        table_name,
      });
      return response.data;
    } catch (error) {
      console.error("Error discovering columns:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },
  getJobs: async (params: {
    page?: number;
    limit?: number;
    source_db_engine?: string;
    target_db_engine?: string;
    active?: string;
    enabled?: string;
    search?: string;
  }) => {
    try {
      const response = await api.get("/custom-jobs", { params });
      return response.data;
    } catch (error) {
      console.error("Error fetching custom jobs:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  updateActive: async (jobName: string, active: boolean) => {
    try {
      const response = await api.patch(`/custom-jobs/${jobName}/active`, {
        active,
      });
      return response.data;
    } catch (error) {
      console.error(`Error updating job active status for ${jobName}:`, error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  executeJob: async (jobName: string) => {
    try {
      const response = await api.post(`/custom-jobs/${jobName}/execute`);
      return response.data;
    } catch (error) {
      console.error(`Error executing job ${jobName}:`, error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  getJobResults: async (jobName: string) => {
    try {
      const response = await api.get(`/custom-jobs/${jobName}/results`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching job results for ${jobName}:`, error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  getJobHistory: async (jobName: string) => {
    try {
      const response = await api.get(`/custom-jobs/${jobName}/history`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching job history for ${jobName}:`, error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  deleteJob: async (jobName: string) => {
    try {
      const response = await api.delete(`/custom-jobs/${jobName}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting job ${jobName}:`, error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  rebootTable: async (jobName: string) => {
    try {
      const response = await api.post(`/custom-jobs/${jobName}/reboot-table`);
      return response.data;
    } catch (error) {
      console.error(`Error rebooting table for job ${jobName}:`, error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  getScripts: async () => {
    try {
      const response = await api.get("/custom-jobs/scripts");
      return response.data;
    } catch (error) {
      console.error("Error fetching Python scripts:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  createJob: async (jobData: any) => {
    try {
      const response = await api.post("/custom-jobs", jobData);
      return response.data;
    } catch (error) {
      console.error("Error creating custom job:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  updateJob: async (jobName: string, jobData: any) => {
    try {
      const response = await api.put(`/custom-jobs/${jobName}`, jobData);
      return response.data;
    } catch (error) {
      console.error(`Error updating custom job ${jobName}:`, error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },
};

export interface CSVCatalogEntry {
  id: number;
  csv_name: string;
  source_type: string;
  source_path: string;
  has_header: boolean;
  delimiter: string;
  skip_rows: number;
  skip_empty_rows: boolean;
  target_db_engine: string;
  target_connection_string: string;
  target_schema: string;
  target_table: string;
  sync_interval: number;
  status: string;
  active: boolean;
  last_sync_time: string | null;
  last_sync_status: string | null;
  created_at: string;
  updated_at: string;
}

export interface GoogleSheetsCatalogEntry {
  id: number;
  sheet_name: string;
  spreadsheet_id: string;
  api_key: string;
  access_token: string;
  range: string;
  target_db_engine: string;
  target_connection_string: string;
  target_schema: string;
  target_table: string;
  sync_interval: number;
  status: string;
  active: boolean;
  last_sync_time: string | null;
  last_sync_status: string | null;
  created_at: string;
  updated_at: string;
}

export const csvCatalogApi = {
  getCSVs: async (params: {
    page?: number;
    limit?: number;
    source_type?: string;
    target_db_engine?: string;
    status?: string;
    active?: string;
    search?: string;
  }) => {
    try {
      const response = await api.get("/csv-catalog", { params });
      return response.data;
    } catch (error) {
      console.error("Error fetching CSV catalog:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  createCSV: async (entry: {
    csv_name: string;
    source_type: string;
    source_path: string;
    has_header: boolean;
    delimiter: string;
    skip_rows: number;
    skip_empty_rows: boolean;
    target_db_engine: string;
    target_connection_string: string;
    target_schema: string;
    target_table: string;
    sync_interval: number;
    status: string;
    active: boolean;
  }) => {
    try {
      const response = await api.post("/csv-catalog", entry);
      return response.data;
    } catch (error) {
      console.error("Error creating CSV entry:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  updateActive: async (csvName: string, active: boolean) => {
    try {
      const response = await api.patch("/csv-catalog/active", {
        csv_name: csvName,
        active: active,
      });
      return response.data;
    } catch (error) {
      console.error("Error updating CSV active status:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  getMetrics: async () => {
    try {
      const response = await api.get("/csv-catalog/metrics");
      return response.data;
    } catch (error) {
      console.error("Error fetching CSV catalog metrics:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  uploadCSV: async (
    file: File
  ): Promise<{ filePath: string; fileName: string; size: number }> => {
    try {
      const formData = new FormData();
      formData.append("csvFile", file);

      const response = await api.post("/csv-catalog/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 0, // Sin timeout para archivos grandes
      });
      return response.data;
    } catch (error) {
      console.error("Error uploading CSV file:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  getHistory: async (csvName: string, limit: number = 50) => {
    try {
      const response = await api.get(
        `/csv-catalog/${encodeURIComponent(csvName)}/history`,
        {
          params: { limit },
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching CSV history:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  getTableStructure: async (csvName: string) => {
    try {
      const response = await api.get(
        `/csv-catalog/${encodeURIComponent(csvName)}/table-structure`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching table structure:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },
};

export const googleSheetsCatalogApi = {
  getSheets: async (params: {
    page?: number;
    limit?: number;
    target_db_engine?: string;
    status?: string;
    active?: string;
    search?: string;
  }) => {
    try {
      const response = await api.get("/google-sheets-catalog", { params });
      return response.data;
    } catch (error) {
      console.error("Error fetching Google Sheets catalog:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  createSheet: async (entry: {
    sheet_name: string;
    spreadsheet_id: string;
    api_key: string;
    access_token: string;
    range: string;
    target_db_engine: string;
    target_connection_string: string;
    target_schema: string;
    target_table: string;
    sync_interval: number;
    status: string;
    active: boolean;
  }) => {
    try {
      const response = await api.post("/google-sheets-catalog", entry);
      return response.data;
    } catch (error) {
      console.error("Error creating Google Sheets entry:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  updateActive: async (sheetName: string, active: boolean) => {
    try {
      const response = await api.patch("/google-sheets-catalog/active", {
        sheet_name: sheetName,
        active: active,
      });
      return response.data;
    } catch (error) {
      console.error("Error updating Google Sheets active status:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  getMetrics: async () => {
    try {
      const response = await api.get("/google-sheets-catalog/metrics");
      return response.data;
    } catch (error) {
      console.error("Error fetching Google Sheets catalog metrics:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  getHistory: async (sheetName: string, limit: number = 50) => {
    try {
      const response = await api.get(
        `/google-sheets-catalog/${encodeURIComponent(sheetName)}/history`,
        {
          params: { limit },
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching Google Sheets history:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  getTableStructure: async (sheetName: string) => {
    try {
      const response = await api.get(
        `/google-sheets-catalog/${encodeURIComponent(
          sheetName
        )}/table-structure`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching table structure:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },
};

export interface DimensionTable {
  dimension_name: string;
  target_schema: string;
  target_table: string;
  scd_type: "TYPE_1" | "TYPE_2" | "TYPE_3";
  source_query: string;
  business_keys: string[];
  valid_from_column: string;
  valid_to_column: string;
  is_current_column: string;
  index_columns: string[];
  partition_column: string;
}

export interface FactTable {
  fact_name: string;
  target_schema: string;
  target_table: string;
  source_query: string;
  dimension_keys: string[];
  measures: string[];
  index_columns: string[];
  partition_column: string;
}

export interface DataWarehouseEntry {
  id: number;
  warehouse_name: string;
  description: string | null;
  schema_type: "STAR_SCHEMA" | "SNOWFLAKE_SCHEMA";
  source_db_engine: string;
  source_connection_string: string;
  target_db_engine: string;
  target_connection_string: string;
  target_schema: string;
  dimensions: DimensionTable[];
  facts: FactTable[];
  schedule_cron: string | null;
  active: boolean;
  enabled: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  last_build_time: string | null;
  last_build_status: string | null;
  notes: string | null;
}

export const dataWarehouseApi = {
  getWarehouses: async (params: {
    page?: number;
    limit?: number;
    schema_type?: string;
    source_db_engine?: string;
    target_db_engine?: string;
    active?: string;
    enabled?: string;
    search?: string;
  }) => {
    try {
      const response = await api.get("/data-warehouse", { params });
      return response.data;
    } catch (error) {
      console.error("Error fetching data warehouses:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  getWarehouse: async (warehouseName: string) => {
    try {
      const response = await api.get(
        `/data-warehouse/${encodeURIComponent(warehouseName)}`
      );
      return response.data;
    } catch (error) {
      console.error(`Error fetching warehouse ${warehouseName}:`, error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  createWarehouse: async (
    warehouseData: Omit<
      DataWarehouseEntry,
      | "id"
      | "created_at"
      | "updated_at"
      | "last_build_time"
      | "last_build_status"
    >
  ) => {
    try {
      const response = await api.post("/data-warehouse", warehouseData);
      return response.data;
    } catch (error) {
      console.error("Error creating warehouse:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  updateWarehouse: async (
    warehouseName: string,
    warehouseData: Partial<DataWarehouseEntry>
  ) => {
    try {
      const response = await api.put(
        `/data-warehouse/${encodeURIComponent(warehouseName)}`,
        warehouseData
      );
      return response.data;
    } catch (error) {
      console.error(`Error updating warehouse ${warehouseName}:`, error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  deleteWarehouse: async (warehouseName: string) => {
    try {
      const response = await api.delete(
        `/data-warehouse/${encodeURIComponent(warehouseName)}`
      );
      return response.data;
    } catch (error) {
      console.error(`Error deleting warehouse ${warehouseName}:`, error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  updateActive: async (warehouseName: string, active: boolean) => {
    try {
      const response = await api.patch(
        `/data-warehouse/${encodeURIComponent(warehouseName)}/active`,
        {
          active,
        }
      );
      return response.data;
    } catch (error) {
      console.error(
        `Error updating warehouse active status for ${warehouseName}:`,
        error
      );
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  buildWarehouse: async (warehouseName: string) => {
    try {
      const response = await api.post(
        `/data-warehouse/${encodeURIComponent(warehouseName)}/build`
      );
      return response.data;
    } catch (error) {
      console.error(`Error building warehouse ${warehouseName}:`, error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  getBuildHistory: async (warehouseName: string, limit: number = 50) => {
    try {
      const response = await api.get(
        `/data-warehouse/${encodeURIComponent(warehouseName)}/history`,
        {
          params: { limit },
        }
      );
      return response.data;
    } catch (error) {
      console.error(
        `Error fetching warehouse build history for ${warehouseName}:`,
        error
      );
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },
};

export interface SchemaMigrationEntry {
  id: number;
  migration_name: string;
  version: string;
  description?: string;
  db_engine: string;
  forward_sql: string;
  rollback_sql?: string;
  checksum: string;
  status: string;
  created_at: string;
  last_applied_at?: string;
  applied_by?: string;
  connection_string?: string;
  environment_connections?: Record<string, string>;
}

export const schemaMigrationsApi = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    environment?: string;
    db_engine?: string;
  }) => {
    try {
      const response = await api.get("/schema-migrations", { params });
      return response.data;
    } catch (error) {
      console.error("Error fetching schema migrations:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  get: async (migrationName: string) => {
    try {
      const response = await api.get(
        `/schema-migrations/${encodeURIComponent(migrationName)}`
      );
      return response.data;
    } catch (error) {
      console.error(`Error fetching migration ${migrationName}:`, error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  create: async (migrationData: {
    migration_name: string;
    version: string;
    description?: string;
    db_engine: string;
    forward_sql: string;
    rollback_sql?: string;
    connection_string?: string;
    environment_connections?: Record<string, string>;
  }) => {
    try {
      const response = await api.post("/schema-migrations", migrationData);
      return response.data;
    } catch (error) {
      console.error("Error creating migration:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  apply: async (migrationName: string, environment: string) => {
    try {
      const response = await api.post(
        `/schema-migrations/${encodeURIComponent(migrationName)}/apply`,
        { environment }
      );
      return response.data;
    } catch (error) {
      console.error(`Error applying migration ${migrationName}:`, error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  rollback: async (migrationName: string, environment: string) => {
    try {
      const response = await api.post(
        `/schema-migrations/${encodeURIComponent(migrationName)}/rollback`,
        { environment }
      );
      return response.data;
    } catch (error) {
      console.error(`Error rolling back migration ${migrationName}:`, error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  getHistory: async (migrationName: string) => {
    try {
      const response = await api.get(
        `/schema-migrations/${encodeURIComponent(migrationName)}/history`
      );
      return response.data;
    } catch (error) {
      console.error(
        `Error fetching migration history for ${migrationName}:`,
        error
      );
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  delete: async (migrationName: string) => {
    try {
      const response = await api.delete(
        `/schema-migrations/${encodeURIComponent(migrationName)}`
      );
      return response.data;
    } catch (error) {
      console.error(`Error deleting migration ${migrationName}:`, error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  getChain: async (environment: string) => {
    try {
      const response = await api.get(`/schema-migrations/chain/${environment}`);
      return response.data;
    } catch (error) {
      console.error(
        `Error fetching migration chain for ${environment}:`,
        error
      );
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  validateChain: async (environment: string) => {
    try {
      const response = await api.post(`/schema-migrations/chain/validate`, {
        environment,
      });
      return response.data;
    } catch (error) {
      console.error(`Error validating chain for ${environment}:`, error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  detectUnregistered: async (params: {
    environment: string;
    connection_string?: string;
  }) => {
    try {
      const response = await api.post(
        `/schema-migrations/detect-unregistered`,
        params
      );
      return response.data;
    } catch (error) {
      console.error("Error detecting unregistered changes:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  generateFromDiff: async (params: {
    environment: string;
    connection_string?: string;
    changes: any;
  }) => {
    try {
      const response = await api.post(
        `/schema-migrations/generate-from-diff`,
        params
      );
      return response.data;
    } catch (error) {
      console.error("Error generating migration from diff:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  testMigration: async (
    migrationName: string,
    params: {
      environment: string;
      test_schema_prefix?: string;
    }
  ) => {
    try {
      const response = await api.post(
        `/schema-migrations/${encodeURIComponent(migrationName)}/test`,
        params
      );
      return response.data;
    } catch (error) {
      console.error(`Error testing migration ${migrationName}:`, error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  cleanupTestSchema: async (testSchema: string) => {
    try {
      const response = await api.delete(
        `/schema-migrations/test/${encodeURIComponent(testSchema)}`
      );
      return response.data;
    } catch (error) {
      console.error(`Error cleaning up test schema ${testSchema}:`, error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  testSQL: async (params: {
    db_engine: string;
    connection_string: string;
    forward_sql: string;
    rollback_sql: string;
  }) => {
    try {
      const response = await api.post("/schema-migrations/test-sql", params);
      return response.data;
    } catch (error) {
      console.error("Error testing SQL:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  integrityCheck: async () => {
    try {
      const response = await api.get(`/schema-migrations/integrity-check`);
      return response.data;
    } catch (error) {
      console.error("Error checking integrity:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },
};

export interface BackupEntry {
  backup_id: number;
  backup_name: string;
  db_engine: string;
  connection_string?: string;
  database_name: string;
  backup_type: "structure" | "data" | "full" | "config";
  file_path: string;
  file_size?: number;
  status: "pending" | "in_progress" | "completed" | "failed";
  error_message?: string;
  created_at: string;
  created_by?: string;
  completed_at?: string;
  metadata?: Record<string, any>;
  cron_schedule?: string;
  is_scheduled?: boolean;
  next_run_at?: string;
  last_run_at?: string;
  run_count?: number;
}

export const backupsApi = {
  getAll: async (params?: {
    db_engine?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) => {
    try {
      const response = await api.get("/backups", { params });
      return response.data;
    } catch (error) {
      console.error("Error fetching backups:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  get: async (id: number) => {
    try {
      const response = await api.get(`/backups/${id}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching backup:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  create: async (backup: {
    backup_name: string;
    db_engine: string;
    connection_string: string;
    database_name: string;
    backup_type: "structure" | "data" | "full" | "config";
    cron_schedule?: string;
  }) => {
    try {
      const response = await api.post("/backups/create", backup);
      return response.data;
    } catch (error) {
      console.error("Error creating backup:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  restore: async (
    id: number,
    target?: {
      target_connection_string?: string;
      target_database_name?: string;
    }
  ) => {
    try {
      const response = await api.post(`/backups/${id}/restore`, target || {});
      return response.data;
    } catch (error) {
      console.error("Error restoring backup:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  delete: async (id: number) => {
    try {
      const response = await api.delete(`/backups/${id}`);
      return response.data;
    } catch (error) {
      console.error("Error deleting backup:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  getMSSQLBackups: async (connectionId: string) => {
    try {
      const response = await api.get(`/backups/mssql/${connectionId}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching MSSQL backups:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  getHistory: async (id: number, limit: number = 50) => {
    try {
      const response = await api.get(`/backups/${id}/history`, {
        params: { limit },
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching backup history:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  updateSchedule: async (
    id: number,
    cron_schedule: string | null,
    is_scheduled: boolean
  ) => {
    try {
      const response = await api.put(`/backups/${id}/schedule`, {
        cron_schedule,
        is_scheduled,
      });
      return response.data;
    } catch (error) {
      console.error("Error updating backup schedule:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  enableSchedule: async (id: number) => {
    try {
      const response = await api.post(`/backups/${id}/enable-schedule`);
      return response.data;
    } catch (error) {
      console.error("Error enabling backup schedule:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  disableSchedule: async (id: number) => {
    try {
      const response = await api.post(`/backups/${id}/disable-schedule`);
      return response.data;
    } catch (error) {
      console.error("Error disabling backup schedule:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  testConnection: async (db_engine: string, connection_string: string) => {
    try {
      const response = await api.post("/test-connection", {
        db_engine,
        connection_string,
      });
      return response.data;
    } catch (error) {
      console.error("Error testing connection:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  discoverDatabases: async (db_engine: string, connection_string: string) => {
    try {
      const response = await api.post("/discover-databases", {
        db_engine,
        connection_string,
      });
      return response.data;
    } catch (error) {
      console.error("Error discovering databases:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },
};

export interface MaskingPolicy {
  policy_id?: number;
  policy_name: string;
  schema_name: string;
  table_name: string;
  column_name: string;
  masking_type: string;
  masking_function?: string;
  masking_params?: Record<string, any>;
  role_whitelist?: string[];
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

export const dataMaskingApi = {
  getAll: async (params?: {
    schema_name?: string;
    table_name?: string;
    masking_type?: string;
    active?: boolean;
    page?: number;
    limit?: number;
  }) => {
    try {
      const response = await api.get("/data-masking/policies", { params });
      return response.data;
    } catch (error) {
      console.error("Error fetching masking policies:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  get: async (policyId: number) => {
    try {
      const response = await api.get(`/data-masking/policies/${policyId}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching masking policy:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  create: async (policy: MaskingPolicy) => {
    try {
      const response = await api.post("/data-masking/policies", policy);
      return response.data;
    } catch (error) {
      console.error("Error creating masking policy:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  update: async (policyId: number, policy: MaskingPolicy) => {
    try {
      const response = await api.put(`/data-masking/policies/${policyId}`, policy);
      return response.data;
    } catch (error) {
      console.error("Error updating masking policy:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  delete: async (policyId: number) => {
    try {
      const response = await api.delete(`/data-masking/policies/${policyId}`);
      return response.data;
    } catch (error) {
      console.error("Error deleting masking policy:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  analyzeSensitiveColumns: async (schemaName: string, tableName: string) => {
    try {
      const response = await api.post("/data-masking/analyze", {
        schema_name: schemaName,
        table_name: tableName,
      });
      return response.data;
    } catch (error) {
      console.error("Error analyzing sensitive columns:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  createMaskedView: async (schemaName: string, tableName: string) => {
    try {
      const response = await api.post("/data-masking/create-view", {
        schema_name: schemaName,
        table_name: tableName,
      });
      return response.data;
    } catch (error) {
      console.error("Error creating masked view:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  batchAnalyze: async (params: {
    database_name?: string;
    database_names?: string[];
    schema_name?: string;
    masking_type?: string;
    auto_activate?: boolean;
    min_confidence?: number;
  }) => {
    try {
      const response = await api.post("/data-masking/batch-analyze", params);
      return response.data;
    } catch (error) {
      console.error("Error in batch analyze:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  deactivateAll: async () => {
    try {
      const response = await api.post("/data-masking/deactivate-all");
      return response.data;
    } catch (error) {
      console.error("Error deactivating all masking policies:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  getStatus: async (schemaName?: string) => {
    try {
      const response = await api.get("/data-masking/status", {
        params: schemaName ? { schema_name: schemaName } : {},
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching masking status:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  getAvailableDatabases: async () => {
    try {
      const response = await api.get("/data-masking/databases");
      return response.data;
    } catch (error) {
      console.error("Error fetching available databases:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  getSensitiveColumns: async (schemaName?: string) => {
    try {
      const response = await api.get("/data-masking/sensitive-columns", {
        params: schemaName ? { schema_name: schemaName } : {},
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching sensitive columns:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },

  getUnprotectedColumns: async (schemaName?: string) => {
    try {
      const response = await api.get("/data-masking/unprotected-columns", {
        params: schemaName ? { schema_name: schemaName } : {},
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching unprotected columns:", error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.details ||
            error.response.data.error ||
            error.message
        );
      }
      throw error;
    }
  },
};
