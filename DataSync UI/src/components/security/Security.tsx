import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import styled from 'styled-components';
import { securityApi } from '../../services/api';
import { Container, ErrorMessage } from '../shared/BaseComponents';
import { extractApiError } from '../../utils/errorHandler';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { theme } from '../../theme/theme';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import SkeletonLoader from '../shared/SkeletonLoader';

const getBadgeColor = (type: string) => {
  // Solo usamos azul marino para acentos importantes, gris para el resto
  switch (type) {
    case 'SUPERUSER': return asciiColors.accent; // Azul marino para destacar
    case 'CREATEDB': return asciiColors.accent;
    case 'CREATEROLE': return asciiColors.accent;
    case 'LOGIN': return asciiColors.accent;
    case 'ACTIVE': return asciiColors.accent;
    case 'INACTIVE': return asciiColors.muted; // Gris para inactivo
    case 'SELECT': return asciiColors.accent;
    case 'INSERT': return asciiColors.accent;
    case 'UPDATE': return asciiColors.accent;
    case 'DELETE': return asciiColors.accent;
    case 'ALL': return asciiColors.accent;
    default: return asciiColors.muted;
  }
};

/**
 * Formatea una fecha a formato legible
 */
const formatDate = (date: string) => {
  if (!date) return '-';
  return new Date(date).toLocaleString();
};

/**
 * Extrae host y puerto de una connection string
 */
const parseConnectionString = (connectionString: string): { host: string; port: string; displayName: string } => {
  if (!connectionString) {
    return { host: 'unknown', port: '', displayName: 'Unknown Connection' };
  }

  try {
    // PostgreSQL: postgresql://user:pass@host:port/db
    if (connectionString.startsWith('postgresql://') || connectionString.startsWith('postgres://')) {
      const url = new URL(connectionString);
      const host = url.hostname || 'localhost';
      const port = url.port || '5432';
      return { host, port, displayName: `${host}:${port}` };
    }
    
    // MySQL/MariaDB: mysql://user:pass@host:port/db
    if (connectionString.startsWith('mysql://') || connectionString.startsWith('mariadb://')) {
      const url = new URL(connectionString);
      const host = url.hostname || 'localhost';
      const port = url.port || '3306';
      return { host, port, displayName: `${host}:${port}` };
    }
    
    // MongoDB: mongodb://host:port/db
    if (connectionString.startsWith('mongodb://') || connectionString.startsWith('mongodb+srv://')) {
      const url = new URL(connectionString);
      const host = url.hostname || 'localhost';
      const port = url.port || '27017';
      return { host, port, displayName: `${host}:${port}` };
    }
    
    // SQL Server: Server=host,port;Database=db
    if (connectionString.includes('Server=')) {
      const serverMatch = connectionString.match(/Server=([^;,]+)/i);
      if (serverMatch) {
        const server = serverMatch[1];
        const [host, port] = server.includes(',') ? server.split(',') : [server, '1433'];
        return { host: host.trim(), port: port.trim(), displayName: `${host.trim()}:${port.trim()}` };
      }
    }
    
    // Oracle: host:port/service
    if (connectionString.includes('@')) {
      const parts = connectionString.split('@');
      if (parts.length > 1) {
        const hostPort = parts[parts.length - 1].split('/')[0];
        const [host, port] = hostPort.includes(':') ? hostPort.split(':') : [hostPort, '1521'];
        return { host: host.trim(), port: port.trim(), displayName: `${host.trim()}:${port.trim()}` };
      }
    }
    
    // Fallback: intentar extraer cualquier host:port
    const hostPortMatch = connectionString.match(/([a-zA-Z0-9.-]+):(\d+)/);
    if (hostPortMatch) {
      return { host: hostPortMatch[1], port: hostPortMatch[2], displayName: `${hostPortMatch[1]}:${hostPortMatch[2]}` };
    }
    
    // Último fallback
    return { host: 'unknown', port: '', displayName: connectionString.substring(0, 50) };
  } catch (err) {
    return { host: 'unknown', port: '', displayName: connectionString.substring(0, 50) };
  }
};

/**
 * Agrupa usuarios por nombre de usuario
 */
const groupUsersByUsername = (users: any[]) => {
  const grouped = users.reduce((acc, user) => {
    const username = user.username;
    if (!acc[username]) {
      acc[username] = {
        username,
        role_type: user.role_type,
        connections: [],
        mostRecentActivity: user.last_activity,
        statusCounts: {},
        expanded: false
      };
    }
    
    acc[username].connections.push({
      status: user.status,
      last_activity: user.last_activity,
      client_addr: user.client_addr,
      application_name: user.application_name,
      database: user.database,
      backend_start: user.backend_start,
      query_duration: user.query_duration,
      wait_event_type: user.wait_event_type,
      wait_event: user.wait_event,
      query: user.query
    });
    
    // Update most recent activity
    if (user.last_activity && (!acc[username].mostRecentActivity || 
        new Date(user.last_activity) > new Date(acc[username].mostRecentActivity))) {
      acc[username].mostRecentActivity = user.last_activity;
    }
    
    // Count statuses
    acc[username].statusCounts[user.status] = (acc[username].statusCounts[user.status] || 0) + 1;
    
    return acc;
  }, {});
  
  return Object.values(grouped);
};

/**
 * Componente para monitorear seguridad y cumplimiento
 * Muestra información de usuarios, conexiones y permisos
 */
const Security = () => {
  const isMountedRef = useRef(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [securityData, setSecurityData] = useState<any>({
    users: {
      total: 0,
      active: 0,
      superusers: 0,
      withLogin: 0
    },
    connections: {
      current: 0,
      max: 0,
      idle: 0,
      active: 0
    },
    permissions: {
      totalGrants: 0,
      schemasWithAccess: 0,
      tablesWithAccess: 0
    }
  });
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [showSecurityPlaybook, setShowSecurityPlaybook] = useState(false);
  const [postgresData, setPostgresData] = useState<any>(null);
  const [otherDatabases, setOtherDatabases] = useState<any>({});
  const [availableConnections, setAvailableConnections] = useState<any>({});
  const [ddlAuditStats, setDdlAuditStats] = useState<any[]>([]);
  const [recentDDLChanges, setRecentDDLChanges] = useState<any[]>([]);
  const [securityAlerts, setSecurityAlerts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string>('');
  const [connectionsData, setConnectionsData] = useState<any[]>([]);

  /**
   * Alterna la expansión de un usuario
   */
  const toggleUserExpansion = useCallback((username: string) => {
    setExpandedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(username)) {
        newSet.delete(username);
      } else {
        newSet.add(username);
      }
      return newSet;
    });
  }, []);

  /**
   * Obtiene los datos de seguridad desde la API
   */
  const fetchSecurityData = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    const startTime = Date.now();
    const minLoadingTime = 300;
    
    try {
      setLoading(true);
      setError(null);
      const response = await securityApi.getSecurityData();
      
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minLoadingTime - elapsed);
      await new Promise(resolve => setTimeout(resolve, remaining));
      
      if (isMountedRef.current) {
        setSecurityData(response.summary || response.postgres?.summary || response);
        setActiveUsers(response.activeUsers || response.postgres?.activeUsers || []);
        setPostgresData(response.postgres || null);
        setOtherDatabases(response.otherDatabases || {});
        setAvailableConnections(response.availableConnections || {});
        setDdlAuditStats(response.ddlAuditStats || []);
        setRecentDDLChanges(response.recentDDLChanges || []);
        setSecurityAlerts(response.securityAlerts || []);
        
        // Organizar datos por conexión para los tabs
        const connections: any[] = [];
        
        // Agregar PostgreSQL (metadata database)
        if (response.postgres) {
          connections.push({
            id: 'postgres-metadata',
            tabName: `datalake - PostgreSQL`,
            engine: 'PostgreSQL',
            connectionString: 'metadata',
            connectionStringMasked: 'metadata',
            security: response.postgres,
            ddlStats: response.ddlAuditStats?.find((s: any) => s.db_engine === 'PostgreSQL') || null,
            ddlChanges: response.recentDDLChanges?.filter((c: any) => c.db_engine === 'PostgreSQL') || [],
            alerts: response.securityAlerts?.filter((a: any) => a.db_engine === 'PostgreSQL') || []
          });
        }
        
        // Agregar otras conexiones desde available_connections
        if (response.availableConnections) {
          Object.entries(response.availableConnections).forEach(([engine, engineData]: [string, any]) => {
            if (engine !== 'PostgreSQL' && engineData.connections) {
              engineData.connections.forEach((conn: any) => {
                const connInfo = parseConnectionString(conn.connection_string);
                const connectionId = `${connInfo.host}-${connInfo.port}-${engine}`.replace(/[^a-zA-Z0-9-]/g, '-');
                
                // Buscar datos de seguridad para esta conexión
                const securityData = response.otherDatabases?.[engine]?.find((db: any) => 
                  db.connection_string === conn.connection_string
                )?.security || null;
                
                connections.push({
                  id: connectionId,
                  tabName: `${connInfo.displayName} - ${engine}`,
                  engine: engine,
                  connectionString: conn.connection_string,
                  connectionStringMasked: conn.connection_string_masked || conn.connection_string,
                  security: securityData,
                  ddlStats: response.ddlAuditStats?.find((s: any) => 
                    s.db_engine === engine && s.connection_string === conn.connection_string
                  ) || response.ddlAuditStats?.find((s: any) => s.db_engine === engine) || null,
                  ddlChanges: response.recentDDLChanges?.filter((c: any) => 
                    c.db_engine === engine && c.connection_string === conn.connection_string
                  ) || response.recentDDLChanges?.filter((c: any) => c.db_engine === engine) || [],
                  alerts: response.securityAlerts?.filter((a: any) => 
                    a.db_engine === engine && a.connection_string === conn.connection_string
                  ) || response.securityAlerts?.filter((a: any) => a.db_engine === engine) || []
                });
              });
            }
          });
        }
        
        setConnectionsData(connections);
        // Por defecto abrir datalake (postgres-metadata)
        if (connections.length > 0 && !activeTab) {
          const datalakeConnection = connections.find(c => c.id === 'postgres-metadata');
          setActiveTab(datalakeConnection ? datalakeConnection.id : connections[0].id);
        }
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
    fetchSecurityData();
    
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchSecurityData]);

  const connectionUsagePercent = useMemo(() => {
    if (!securityData.connections.max || securityData.connections.max === 0) return 0;
    return ((securityData.connections.current / securityData.connections.max) * 100).toFixed(1);
  }, [securityData.connections]);

  if (loading && (!securityData || Object.keys(securityData).length === 0)) {
    return <SkeletonLoader variant="table" />;
  }

  return (
    <Container>
      <div style={{ 
        padding: theme.spacing.lg, 
        fontFamily: 'Consolas', 
        fontSize: 12,
        background: asciiColors.background,
        maxWidth: '100%',
        margin: '0 auto'
      }}>
        {/* Header estilo ASCII monocromático */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: theme.spacing.xl,
          paddingBottom: theme.spacing.md,
          borderBottom: `2px solid ${asciiColors.accent}`
        }}>
          <h1 style={{
            fontSize: 14,
            fontWeight: 600,
            margin: 0,
            color: asciiColors.foreground,
            textTransform: "uppercase",
            fontFamily: 'Consolas',
            letterSpacing: '0.5px'
          }}>
            <span style={{ color: asciiColors.accent, marginRight: theme.spacing.sm }}>{ascii.blockFull}</span>
            SECURITY & COMPLIANCE MONITOR
          </h1>
          {!loading && !error && connectionsData.length > 0 && (
            <div style={{ 
              fontSize: 11, 
              color: asciiColors.muted,
              fontFamily: 'Consolas',
              fontWeight: 500,
              padding: `${theme.spacing.xs} ${theme.spacing.md}`,
              background: asciiColors.backgroundSoft,
              borderRadius: 2,
              border: `1px solid ${asciiColors.border}`
            }}>
              {connectionsData.length} {connectionsData.length === 1 ? 'connection' : 'connections'} available
            </div>
          )}
        </div>
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

      {!loading && !error && (
        <>
          {/* Botón de ayuda alineado a la derecha */}
          <div style={{ 
            marginBottom: theme.spacing.lg, 
            display: 'flex', 
            justifyContent: 'flex-end',
            alignItems: 'center'
          }}>
            <AsciiButton
              label="Security Info"
              onClick={() => setShowSecurityPlaybook(true)}
              variant="ghost"
            />
          </div>

          {/* Layout con lista lateral sticky y contenido principal */}
          {connectionsData.length > 0 && activeTab && (
            <div style={{ 
              display: 'grid',
              gridTemplateColumns: '280px 1fr',
              gap: theme.spacing.xl,
              alignItems: 'flex-start'
            }}>
              {/* Lista lateral de conexiones - Sticky para mejor UX */}
              <div style={{ 
                position: 'sticky',
                top: theme.spacing.lg,
                maxHeight: 'calc(100vh - 120px)',
                overflowY: 'auto',
                overflowX: 'hidden'
              }}>
                <AsciiPanel title="CONNECTIONS">
                  <div style={{ 
                    marginTop: theme.spacing.sm,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: theme.spacing.xs
                  }}>
                    {connectionsData.map((conn) => (
                      <button
                        key={conn.id}
                        onClick={() => setActiveTab(conn.id)}
                        aria-label={`Select connection ${conn.tabName}`}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setActiveTab(conn.id);
                          }
                        }}
                        style={{
                          padding: theme.spacing.md,
                          fontFamily: 'Consolas',
                          fontSize: 11,
                          fontWeight: activeTab === conn.id ? 600 : 400,
                          color: activeTab === conn.id ? asciiColors.foreground : asciiColors.muted,
                          background: activeTab === conn.id ? asciiColors.backgroundSoft : 'transparent',
                          border: activeTab === conn.id ? `2px solid ${asciiColors.accent}` : `1px solid ${asciiColors.border}`,
                          borderRadius: 2,
                          cursor: 'pointer',
                          transition: 'border-color 0.15s ease, background-color 0.15s ease',
                          wordBreak: 'break-word',
                          textAlign: 'left',
                          width: '100%',
                          outline: 'none',
                          outlineOffset: 0
                        }}
                        onMouseDown={(e) => {
                          // Prevenir outline cuando se hace click
                          e.currentTarget.style.outline = 'none';
                        }}
                        onFocus={(e) => {
                          // Solo mostrar outline si no está activo
                          if (activeTab !== conn.id) {
                            e.currentTarget.style.outline = `2px solid ${asciiColors.accent}`;
                            e.currentTarget.style.outlineOffset = '2px';
                          } else {
                            // Asegurar que no hay outline si está activo
                            e.currentTarget.style.outline = 'none';
                            e.currentTarget.style.outlineOffset = 0;
                          }
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.outline = 'none';
                          e.currentTarget.style.outlineOffset = 0;
                        }}
                      >
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          marginBottom: conn.ddlStats && conn.ddlStats.drop_operations > 0 ? theme.spacing.xs : 0
                        }}>
                          <span style={{ lineHeight: 1.4 }}>{conn.tabName}</span>
                          {activeTab === conn.id && (
                            <span style={{ color: asciiColors.accent, fontSize: 12, marginLeft: theme.spacing.xs }}>▶</span>
                          )}
                        </div>
                        {conn.ddlStats && conn.ddlStats.drop_operations > 0 && (
                          <div style={{ 
                            fontSize: 9, 
                            color: asciiColors.foreground,
                            fontWeight: 600,
                            padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                            background: asciiColors.backgroundSoft,
                            borderRadius: 2,
                            border: `2px solid ${asciiColors.foreground}`,
                            marginTop: theme.spacing.xs,
                            fontFamily: 'Consolas'
                          }}>
                            {ascii.blockSemi} {conn.ddlStats.drop_operations} DROP ops
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </AsciiPanel>
              </div>

              {/* Contenido de la conexión activa - Grid layout mejorado */}
              <div style={{ 
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: theme.spacing.lg
              }}>
                {(() => {
                  const activeConnection = connectionsData.find(c => c.id === activeTab);
                  if (!activeConnection) return null;
            
                  const connSecurity = activeConnection.security || {};
                  const connUsers = connSecurity.users || {};
                  const connConnections = connSecurity.connections || {};
                  const connPermissions = connSecurity.permissions || {};
                  const connActiveUsers = connSecurity.activeUsers || activeUsers;
                  const connectionUsagePercent = connConnections.max && connConnections.max > 0 
                    ? ((connConnections.current / connConnections.max) * 100).toFixed(1) 
                    : '0';
                  
                  return (
                    <>
                      {/* Header de la conexión estilo ASCII */}
                      <AsciiPanel title={`${activeConnection.tabName}`}>
                        <div style={{ 
                          padding: theme.spacing.md, 
                          fontSize: 11, 
                          fontFamily: 'Consolas' 
                        }}>
                          <div style={{ 
                            display: 'grid',
                            gridTemplateColumns: 'auto 1fr',
                            gap: `${theme.spacing.xs} ${theme.spacing.md}`,
                            marginBottom: theme.spacing.sm
                          }}>
                            <span style={{ color: asciiColors.muted, fontWeight: 500, fontFamily: 'Consolas' }}>Engine:</span>
                            <span style={{ color: asciiColors.foreground, fontWeight: 600, fontFamily: 'Consolas' }}>{activeConnection.engine}</span>
                            <span style={{ color: asciiColors.muted, fontWeight: 500, fontFamily: 'Consolas' }}>Connection:</span>
                            <span style={{ color: asciiColors.foreground, wordBreak: 'break-all', fontSize: 10, fontFamily: 'Consolas' }}>
                              {activeConnection.connectionStringMasked}
                            </span>
                          </div>
                          {activeConnection.ddlStats && (
                            <div style={{ 
                              marginTop: theme.spacing.md, 
                              padding: theme.spacing.md, 
                              background: asciiColors.backgroundSoft, 
                              borderRadius: 2,
                              border: `1px solid ${asciiColors.border}`
                            }}>
                              <div style={{ 
                                fontSize: 11, 
                                fontWeight: 600, 
                                color: asciiColors.accent, 
                                marginBottom: theme.spacing.sm,
                                fontFamily: 'Consolas',
                                paddingBottom: 4,
                                borderBottom: `2px solid ${asciiColors.accent}`
                              }}>
                                DDL Activity (Last 30 days)
                              </div>
                              <div style={{ 
                                display: 'grid', 
                                gridTemplateColumns: 'repeat(3, 1fr)', 
                                gap: theme.spacing.md 
                              }}>
                                <div>
                                  <div style={{ 
                                    fontSize: 9, 
                                    color: asciiColors.muted,
                                    fontFamily: 'Consolas',
                                    marginBottom: theme.spacing.xs
                                  }}>Total Changes</div>
                                  <div style={{ 
                                    fontSize: 16, 
                                    fontWeight: 600, 
                                    color: asciiColors.foreground,
                                    fontFamily: 'Consolas'
                                  }}>
                                    {activeConnection.ddlStats.total_changes || 0}
                                  </div>
                                </div>
                                <div>
                                  <div style={{ 
                                    fontSize: 9, 
                                    color: asciiColors.muted,
                                    fontFamily: 'Consolas',
                                    marginBottom: theme.spacing.xs
                                  }}>DROP Operations</div>
                                  <div style={{ 
                                    fontSize: 16, 
                                    fontWeight: 600, 
                                    color: asciiColors.foreground,
                                    fontFamily: 'Consolas'
                                  }}>
                                    {activeConnection.ddlStats.drop_operations || 0}
                                  </div>
                                </div>
                                <div>
                                  <div style={{ 
                                    fontSize: 9, 
                                    color: asciiColors.muted,
                                    fontFamily: 'Consolas',
                                    marginBottom: theme.spacing.xs
                                  }}>Risk Level</div>
                                  <div>
                                    <span style={{
                                      padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                                      borderRadius: 2,
                                      fontSize: 10,
                                      fontFamily: 'Consolas',
                                      fontWeight: 600,
                                      backgroundColor: asciiColors.backgroundSoft,
                                      color: (activeConnection.ddlStats.risk_level === 'HIGH_RISK' ? asciiColors.foreground :
                                              activeConnection.ddlStats.risk_level === 'MEDIUM_RISK' ? asciiColors.muted :
                                              activeConnection.ddlStats.risk_level === 'ELEVATED_ACTIVITY' ? asciiColors.accent : asciiColors.accent),
                                      border: `2px solid ${activeConnection.ddlStats.risk_level === 'HIGH_RISK' ? asciiColors.foreground :
                                               activeConnection.ddlStats.risk_level === 'MEDIUM_RISK' ? asciiColors.muted :
                                               activeConnection.ddlStats.risk_level === 'ELEVATED_ACTIVITY' ? asciiColors.accent : asciiColors.accent}`
                                    }}>
                                      {activeConnection.ddlStats.risk_level || 'NORMAL'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </AsciiPanel>

                {/* Alertas de seguridad para esta conexión */}
                {activeConnection.alerts && activeConnection.alerts.length > 0 && (
                  <AsciiPanel title="SECURITY ALERTS">
                    <div style={{ marginTop: theme.spacing.sm }}>
                      {activeConnection.alerts.map((alert: any, idx: number) => (
                        <div key={idx} style={{ 
                          marginBottom: theme.spacing.md, 
                          padding: theme.spacing.md, 
                          background: asciiColors.backgroundSoft,
                          border: `2px solid ${asciiColors.foreground}`,
                          borderRadius: 2
                        }}>
                          <div style={{ 
                            fontSize: 12, 
                            fontWeight: 600, 
                            color: asciiColors.foreground, 
                            marginBottom: theme.spacing.sm,
                            fontFamily: 'Consolas'
                          }}>
                            {ascii.blockFull} {alert.severity}: {alert.message}
                          </div>
                          <div style={{ 
                            fontSize: 11, 
                            color: asciiColors.foreground, 
                            marginLeft: theme.spacing.lg,
                            fontFamily: 'Consolas'
                          }}>
                            <div>Executed by: {alert.executed_by}</div>
                            <div>Time: {formatDate(alert.execution_timestamp)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </AsciiPanel>
                )}

                      {/* Métricas agrupadas en grid de 3 columnas para mejor uso del espacio */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: theme.spacing.lg
                      }}>
                        {/* USER MANAGEMENT */}
                        <AsciiPanel title="USER MANAGEMENT">
                          <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: '1fr 1fr',
                            gap: theme.spacing.sm, 
                            marginTop: theme.spacing.sm 
                          }}>
                            <div style={{
                              padding: theme.spacing.sm,
                              background: asciiColors.backgroundSoft,
                              borderRadius: 2,
                              border: `1px solid ${asciiColors.border}`,
                              transition: 'border-color 0.15s ease'
                            }}>
                              <div style={{ fontSize: 9, color: asciiColors.muted, marginBottom: theme.spacing.xs, fontFamily: 'Consolas' }}>Total</div>
                              <div style={{ 
                                fontFamily: 'Consolas', 
                                fontSize: 18, 
                                fontWeight: 600, 
                                color: asciiColors.foreground 
                              }}>
                                {connUsers.total || 0}
                              </div>
                            </div>
                            <div style={{
                              padding: theme.spacing.sm,
                              background: asciiColors.backgroundSoft,
                              borderRadius: 2,
                              border: `1px solid ${asciiColors.border}`,
                              transition: 'border-color 0.15s ease'
                            }}>
                              <div style={{ fontSize: 9, color: asciiColors.muted, marginBottom: theme.spacing.xs, fontFamily: 'Consolas' }}>Active</div>
                              <div style={{ 
                                fontFamily: 'Consolas', 
                                fontSize: 18, 
                                fontWeight: 600, 
                                color: asciiColors.foreground 
                              }}>
                                {connUsers.active || 0}
                              </div>
                            </div>
                            <div style={{
                              padding: theme.spacing.sm,
                              background: asciiColors.backgroundSoft,
                              borderRadius: 2,
                              border: `1px solid ${asciiColors.border}`,
                              transition: 'border-color 0.15s ease'
                            }}>
                              <div style={{ fontSize: 9, color: asciiColors.muted, marginBottom: theme.spacing.xs, fontFamily: 'Consolas' }}>Superusers</div>
                              <div style={{ 
                                fontFamily: 'Consolas', 
                                fontSize: 18, 
                                fontWeight: 600, 
                                color: asciiColors.foreground 
                              }}>
                                {connUsers.superusers || 0}
                              </div>
                            </div>
                            <div style={{
                              padding: theme.spacing.sm,
                              background: asciiColors.backgroundSoft,
                              borderRadius: 2,
                              border: `1px solid ${asciiColors.border}`,
                              transition: 'border-color 0.15s ease'
                            }}>
                              <div style={{ fontSize: 9, color: asciiColors.muted, marginBottom: theme.spacing.xs, fontFamily: 'Consolas' }}>With Login</div>
                              <div style={{ 
                                fontFamily: 'Consolas', 
                                fontSize: 18, 
                                fontWeight: 600, 
                                color: asciiColors.foreground 
                              }}>
                                {connUsers.withLogin || 0}
                              </div>
                            </div>
                          </div>
                        </AsciiPanel>

                        {/* CONNECTION STATUS */}
                        {connConnections.current !== undefined && (
                          <AsciiPanel title="CONNECTION STATUS">
                            <div style={{ 
                              display: 'grid', 
                              gridTemplateColumns: '1fr 1fr',
                              gap: theme.spacing.sm, 
                              marginTop: theme.spacing.sm 
                            }}>
                              <div style={{
                                padding: theme.spacing.sm,
                                background: asciiColors.backgroundSoft,
                                borderRadius: 2,
                                border: `1px solid ${asciiColors.border}`,
                                transition: 'border-color 0.15s ease'
                              }}>
                                <div style={{ fontSize: 9, color: asciiColors.muted, marginBottom: theme.spacing.xs, fontFamily: 'Consolas' }}>Current</div>
                                <div style={{ 
                                  fontFamily: 'Consolas', 
                                  fontSize: 18, 
                                  fontWeight: 600, 
                                  color: asciiColors.foreground 
                                }}>
                                  {connConnections.current || 0}
                                </div>
                                <div style={{ fontSize: 9, color: asciiColors.muted, marginTop: theme.spacing.xs, fontFamily: 'Consolas' }}>
                                  / {connConnections.max || 0} max
                                </div>
                              </div>
                              <div style={{
                                padding: theme.spacing.sm,
                                background: asciiColors.backgroundSoft,
                                borderRadius: 2,
                                border: `1px solid ${asciiColors.border}`,
                                transition: 'border-color 0.15s ease'
                              }}>
                                <div style={{ fontSize: 9, color: asciiColors.muted, marginBottom: theme.spacing.xs, fontFamily: 'Consolas' }}>Usage</div>
                                <div style={{ 
                                  fontFamily: 'Consolas', 
                                  fontSize: 18, 
                                  fontWeight: 600, 
                                  color: asciiColors.foreground 
                                }}>
                                  {connectionUsagePercent}%
                                </div>
                              </div>
                              <div style={{
                                padding: theme.spacing.sm,
                                background: asciiColors.backgroundSoft,
                                borderRadius: 2,
                                border: `1px solid ${asciiColors.border}`,
                                transition: 'border-color 0.15s ease'
                              }}>
                                <div style={{ fontSize: 9, color: asciiColors.muted, marginBottom: theme.spacing.xs, fontFamily: 'Consolas' }}>Idle</div>
                                <div style={{ 
                                  fontFamily: 'Consolas', 
                                  fontSize: 18, 
                                  fontWeight: 600, 
                                  color: asciiColors.muted 
                                }}>
                                  {connConnections.idle || 0}
                                </div>
                              </div>
                              <div style={{
                                padding: theme.spacing.sm,
                                background: asciiColors.backgroundSoft,
                                borderRadius: 2,
                                border: `1px solid ${asciiColors.border}`,
                                transition: 'border-color 0.15s ease'
                              }}>
                                <div style={{ fontSize: 9, color: asciiColors.muted, marginBottom: theme.spacing.xs, fontFamily: 'Consolas' }}>Active</div>
                                <div style={{ 
                                  fontFamily: 'Consolas', 
                                  fontSize: 18, 
                                  fontWeight: 600, 
                                  color: asciiColors.foreground 
                                }}>
                                  {connConnections.active || 0}
                                </div>
                              </div>
                            </div>
                          </AsciiPanel>
                        )}

                        {/* PERMISSIONS OVERVIEW */}
                        {connPermissions.totalGrants !== undefined && (
                          <AsciiPanel title="PERMISSIONS">
                            <div style={{ 
                              display: 'flex',
                              flexDirection: 'column',
                              gap: theme.spacing.sm, 
                              marginTop: theme.spacing.sm 
                            }}>
                              <div style={{
                                padding: theme.spacing.sm,
                                background: asciiColors.backgroundSoft,
                                borderRadius: 2,
                                border: `1px solid ${asciiColors.border}`
                              }}>
                                <div style={{ fontSize: 9, color: asciiColors.muted, marginBottom: theme.spacing.xs, fontFamily: 'Consolas' }}>Total Grants</div>
                                <div style={{ 
                                  fontFamily: 'Consolas', 
                                  fontSize: 18, 
                                  fontWeight: 600, 
                                  color: asciiColors.foreground 
                                }}>
                                  {connPermissions.totalGrants || 0}
                                </div>
                              </div>
                              <div style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: theme.spacing.sm
                              }}>
                                <div style={{
                                  padding: theme.spacing.sm,
                                  background: asciiColors.backgroundSoft,
                                  borderRadius: 2,
                                  border: `1px solid ${asciiColors.border}`
                                }}>
                                  <div style={{ fontSize: 9, color: asciiColors.muted, marginBottom: theme.spacing.xs, fontFamily: 'Consolas' }}>Schemas</div>
                                  <div style={{ 
                                    fontFamily: 'Consolas', 
                                    fontSize: 16, 
                                    fontWeight: 600, 
                                    color: asciiColors.foreground 
                                  }}>
                                    {connPermissions.schemasWithAccess || 0}
                                  </div>
                                </div>
                                <div style={{
                                  padding: theme.spacing.sm,
                                  background: asciiColors.backgroundSoft,
                                  borderRadius: 2,
                                  border: `1px solid ${asciiColors.border}`
                                }}>
                                  <div style={{ fontSize: 9, color: asciiColors.muted, marginBottom: theme.spacing.xs, fontFamily: 'Consolas' }}>Tables</div>
                                  <div style={{ 
                                    fontFamily: 'Consolas', 
                                    fontSize: 16, 
                                    fontWeight: 600, 
                                    color: asciiColors.foreground 
                                  }}>
                                    {connPermissions.tablesWithAccess || 0}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </AsciiPanel>
                        )}
                      </div>

                {/* ACTIVE USERS */}
                {connActiveUsers && connActiveUsers.length > 0 && (
                  <AsciiPanel title="ACTIVE USERS">
                    <div style={{ 
                      marginTop: theme.spacing.sm, 
                      overflowX: 'auto',
                      borderRadius: 2,
                      border: `1px solid ${asciiColors.border}`
                    }}>
                      <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontFamily: 'Consolas',
                        fontSize: 12
                      }}>
                        <thead>
                          <tr>
                            <th style={{
                              padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                              textAlign: 'left',
                              borderBottom: `2px solid ${asciiColors.borderStrong}`,
                              backgroundColor: asciiColors.backgroundSoft,
                              fontFamily: 'Consolas',
                              fontSize: 12,
                              fontWeight: 600,
                              color: asciiColors.foreground
                            }}>Username</th>
                            <th style={{
                              padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                              textAlign: 'left',
                              borderBottom: `2px solid ${asciiColors.borderStrong}`,
                              backgroundColor: asciiColors.backgroundSoft,
                              fontFamily: 'Consolas',
                              fontSize: 12,
                              fontWeight: 600,
                              color: asciiColors.foreground
                            }}>Role</th>
                            <th style={{
                              padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                              textAlign: 'left',
                              borderBottom: `2px solid ${asciiColors.borderStrong}`,
                              backgroundColor: asciiColors.backgroundSoft,
                              fontFamily: 'Consolas',
                              fontSize: 12,
                              fontWeight: 600,
                              color: asciiColors.foreground
                            }}>Status</th>
                            <th style={{
                              padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                              textAlign: 'left',
                              borderBottom: `2px solid ${asciiColors.borderStrong}`,
                              backgroundColor: asciiColors.backgroundSoft,
                              fontFamily: 'Consolas',
                              fontSize: 12,
                              fontWeight: 600,
                              color: asciiColors.foreground
                            }}>Last Activity</th>
                          </tr>
                        </thead>
                        <tbody>
                          {groupUsersByUsername(connActiveUsers).slice(0, 20).map((user: any, index) => {
                            const isExpanded = expandedUsers.has(user.username);
                            return (
                              <React.Fragment key={index}>
                                <tr 
                                  style={{
                                    cursor: 'pointer',
                                    backgroundColor: isExpanded ? asciiColors.backgroundSoft : asciiColors.background,
                                    transition: 'background-color 0.15s ease'
                                  }}
                                  onClick={() => toggleUserExpansion(user.username)}
                                >
                                  <td style={{
                            padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                            borderBottom: `1px solid ${asciiColors.border}`,
                            fontFamily: 'Consolas',
                            fontSize: 12,
                            color: asciiColors.foreground
                                  }}>
                                    {user.username}
                                    <span style={{
                                      backgroundColor: asciiColors.accent,
                                      color: '#ffffff',
                                      padding: '2px 8px',
                                      borderRadius: 12,
                                      fontSize: 11,
                                      fontFamily: theme.fonts.primary,
                                      marginLeft: 8
                                    }}>
                                      {user.connections.length}
                                    </span>
                                  </td>
                                  <td style={{
                            padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                            borderBottom: `1px solid ${asciiColors.border}`,
                            fontFamily: 'Consolas',
                            fontSize: 12,
                            color: asciiColors.foreground
                                  }}>
                                    <span style={{
                                      padding: '2px 8px',
                                      borderRadius: 2,
                                      fontSize: 11,
                                      fontFamily: 'Consolas',
                                      backgroundColor: asciiColors.backgroundSoft,
                                      color: getBadgeColor(user.role_type),
                                      border: `1px solid ${getBadgeColor(user.role_type)}`
                                    }}>
                                      {user.role_type}
                                    </span>
                                  </td>
                                  <td style={{
                            padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                            borderBottom: `1px solid ${asciiColors.border}`,
                            fontFamily: 'Consolas',
                            fontSize: 12,
                            color: asciiColors.foreground
                                  }}>
                                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                                      {Object.entries(user.statusCounts).map(([status, count]) => (
                                        <span key={status} style={{
                                          padding: '2px 8px',
                                          borderRadius: 2,
                                          fontSize: 11,
                                          fontFamily: 'Consolas',
                                          backgroundColor: asciiColors.backgroundSoft,
                                          color: getBadgeColor(status),
                                          border: `1px solid ${getBadgeColor(status)}`
                                        }}>
                                          {status}: {count as number}
                                        </span>
                                      ))}
                                    </div>
                                  </td>
                                  <td style={{
                            padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                            borderBottom: `1px solid ${asciiColors.border}`,
                            fontFamily: 'Consolas',
                            fontSize: 12,
                            color: asciiColors.foreground
                                  }}>{formatDate(user.mostRecentActivity)}</td>
                                </tr>
                                {isExpanded && (
                                  <tr style={{ backgroundColor: asciiColors.backgroundSoft }}>
                                    <td colSpan={4} style={{ padding: 0, borderBottom: `1px solid ${asciiColors.border}` }}>
                                      <div style={{
                                        padding: '12px 16px',
                                        borderLeft: `3px solid ${asciiColors.accent}`,
                                        marginLeft: 16,
                                        fontFamily: 'Consolas',
                                        fontSize: 12
                                      }}>
                                        <div style={{ marginBottom: 12, fontWeight: 600, color: asciiColors.foreground, fontFamily: 'Consolas' }}>
                                          All Connections for {user.username}
                                        </div>
                                        {user.connections.map((conn: any, connIndex: number) => (
                                          <div key={connIndex} style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 8,
                                            padding: '8px 0',
                                            borderBottom: connIndex < user.connections.length - 1 ? `1px solid ${asciiColors.border}` : 'none',
                                            fontFamily: 'Consolas',
                                            fontSize: 12
                                          }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
                                              <div>
                                                <div style={{ fontWeight: 500, color: asciiColors.muted, fontSize: 11, fontFamily: 'Consolas' }}>Status:</div>
                                                <div>
                                                  <span style={{
                                                    padding: '2px 8px',
                                                    borderRadius: 2,
                                                    fontSize: 11,
                                                    fontFamily: 'Consolas',
                                                    backgroundColor: asciiColors.backgroundSoft,
                                                    color: getBadgeColor(conn.status),
                                                    border: `1px solid ${getBadgeColor(conn.status)}`
                                                  }}>
                                                    {conn.status}
                                                  </span>
                                                </div>
                                              </div>
                                              <div>
                                                <div style={{ fontWeight: 500, color: asciiColors.muted, fontSize: 11, fontFamily: 'Consolas' }}>IP:</div>
                                                <div style={{ color: asciiColors.foreground, fontSize: 11, fontFamily: 'Consolas' }}>{conn.client_addr || '-'}</div>
                                              </div>
                                              <div>
                                                <div style={{ fontWeight: 500, color: asciiColors.muted, fontSize: 11, fontFamily: 'Consolas' }}>App:</div>
                                                <div style={{ color: asciiColors.foreground, fontSize: 11, fontFamily: 'Consolas' }}>{conn.application_name || '-'}</div>
                                              </div>
                                              <div>
                                                <div style={{ fontWeight: 500, color: asciiColors.muted, fontSize: 11, fontFamily: 'Consolas' }}>Activity:</div>
                                                <div style={{ color: asciiColors.foreground, fontSize: 11, fontFamily: 'Consolas' }}>{formatDate(conn.last_activity)}</div>
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </AsciiPanel>
                )}

                {/* DDL Changes para esta conexión */}
                {activeConnection.ddlChanges && activeConnection.ddlChanges.length > 0 && (
                  <AsciiPanel title="RECENT DDL CHANGES (LAST 7 DAYS)">
                    <div style={{ marginTop: 8, overflowX: 'auto' }}>
                      <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontFamily: 'Consolas',
                        fontSize: 12
                      }}>
                        <thead>
                          <tr>
                            <th style={{
                              padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                              textAlign: 'left',
                              borderBottom: `2px solid ${asciiColors.borderStrong}`,
                              backgroundColor: asciiColors.backgroundSoft,
                              fontFamily: 'Consolas',
                              fontSize: 12,
                              fontWeight: 600,
                              color: asciiColors.foreground
                            }}>Timestamp</th>
                            <th style={{
                              padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                              textAlign: 'left',
                              borderBottom: `2px solid ${asciiColors.borderStrong}`,
                              backgroundColor: asciiColors.backgroundSoft,
                              fontFamily: 'Consolas',
                              fontSize: 12,
                              fontWeight: 600,
                              color: asciiColors.foreground
                            }}>Type</th>
                            <th style={{
                              padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                              textAlign: 'left',
                              borderBottom: `2px solid ${asciiColors.borderStrong}`,
                              backgroundColor: asciiColors.backgroundSoft,
                              fontFamily: 'Consolas',
                              fontSize: 12,
                              fontWeight: 600,
                              color: asciiColors.foreground
                            }}>Object</th>
                            <th style={{
                              padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                              textAlign: 'left',
                              borderBottom: `2px solid ${asciiColors.borderStrong}`,
                              backgroundColor: asciiColors.backgroundSoft,
                              fontFamily: 'Consolas',
                              fontSize: 12,
                              fontWeight: 600,
                              color: asciiColors.foreground
                            }}>Executed By</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeConnection.ddlChanges.slice(0, 20).map((change: any, idx: number) => {
                            // Solo usamos azul marino para acentos, gris para el resto
                            const changeColor = change.change_type === 'DROP' ? asciiColors.foreground :
                                               change.change_type === 'ALTER' ? asciiColors.accent :
                                               asciiColors.accent;
                            return (
                              <tr key={idx} style={{
                                backgroundColor: idx % 2 === 0 ? asciiColors.background : asciiColors.backgroundSoft
                              }}>
                                <td style={{ padding: `${theme.spacing.sm} ${theme.spacing.md}`, borderBottom: `1px solid ${asciiColors.border}`, fontSize: 11, fontFamily: 'Consolas', color: asciiColors.foreground }}>
                                  {formatDate(change.execution_timestamp)}
                                </td>
                                <td style={{ padding: `${theme.spacing.sm} ${theme.spacing.md}`, borderBottom: `1px solid ${asciiColors.border}`, fontFamily: 'Consolas' }}>
                                  <span style={{
                                    padding: '2px 8px',
                                    borderRadius: 2,
                                    fontSize: 11,
                                    fontFamily: 'Consolas',
                                    backgroundColor: asciiColors.backgroundSoft,
                                    color: changeColor,
                                    border: `1px solid ${changeColor}`
                                  }}>
                                    {change.change_type}
                                  </span>
                                </td>
                                <td style={{ padding: `${theme.spacing.sm} ${theme.spacing.md}`, borderBottom: `1px solid ${asciiColors.border}`, fontFamily: 'Consolas', fontSize: 11, color: asciiColors.foreground }}>
                                  {change.schema_name}.{change.object_name} ({change.object_type})
                                </td>
                                <td style={{ padding: `${theme.spacing.sm} ${theme.spacing.md}`, borderBottom: `1px solid ${asciiColors.border}`, fontFamily: 'Consolas', fontSize: 11, color: asciiColors.foreground }}>
                                  {change.executed_by}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </AsciiPanel>
                )}
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {showSecurityPlaybook && (
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
            onClick={() => setShowSecurityPlaybook(false)}
            >
              <div style={{
                width: '90%',
                maxWidth: 1000,
                maxHeight: '90vh',
                overflowY: 'auto'
              }}
              onClick={(e) => e.stopPropagation()}
              >
                <AsciiPanel title="SECURITY & COMPLIANCE PLAYBOOK">
                  <div style={{ padding: 16, fontFamily: 'Consolas', fontSize: 12, lineHeight: 1.6 }}>
                    <div style={{ marginBottom: 24 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                        {ascii.blockFull} OVERVIEW
                      </div>
                      <div style={{ color: asciiColors.foreground, marginLeft: 16 }}>
                        Security & Compliance Monitor provides real-time visibility into database security posture, 
                        user access patterns, connection management, and permission structures. This dashboard helps 
                        identify security risks, monitor compliance, and ensure proper access controls.
                      </div>
                    </div>

                    <div style={{ marginBottom: 24 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                        {ascii.blockFull} USER MANAGEMENT METRICS
                      </div>
                      
                      <div style={{ marginLeft: 16 }}>
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.foreground, marginBottom: 4 }}>
                            Total Users
                          </div>
                          <div style={{ color: asciiColors.foreground, marginLeft: 16, fontSize: 11 }}>
                            Total number of database roles/users defined in the system. Includes both login and non-login roles.
                          </div>
                        </div>

                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.success, marginBottom: 4 }}>
                            Active Users
                          </div>
                          <div style={{ color: asciiColors.foreground, marginLeft: 16, fontSize: 11 }}>
                            Number of distinct users with current active database connections. Monitors who is currently 
                            accessing the database.
                          </div>
                        </div>

                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.danger, marginBottom: 4 }}>
                            Superusers
                          </div>
                          <div style={{ color: asciiColors.foreground, marginLeft: 16, fontSize: 11 }}>
                            Users with SUPERUSER privileges. Superusers have unrestricted access to all database objects 
                            and can bypass all permission checks. Should be limited to administrative accounts only.
                          </div>
                        </div>

                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.accent, marginBottom: 4 }}>
                            With Login
                          </div>
                          <div style={{ color: asciiColors.foreground, marginLeft: 16, fontSize: 11 }}>
                            Number of roles that have LOGIN privilege, allowing them to connect to the database. 
                            Non-login roles are typically used for group permissions.
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={{ marginBottom: 24 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                        {ascii.blockFull} CONNECTION STATUS METRICS
                      </div>
                      
                      <div style={{ marginLeft: 16 }}>
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.foreground, marginBottom: 4 }}>
                            Current Connections
                          </div>
                          <div style={{ color: asciiColors.foreground, marginLeft: 16, fontSize: 11 }}>
                            Number of active database connections currently established. Each connection consumes server resources.
                          </div>
                        </div>

                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.foreground, marginBottom: 4 }}>
                            Max Allowed
                          </div>
                          <div style={{ color: asciiColors.foreground, marginLeft: 16, fontSize: 11 }}>
                            Maximum number of concurrent connections allowed by the database server configuration. 
                            Exceeding this limit will reject new connection attempts.
                          </div>
                        </div>

                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.warning, marginBottom: 4 }}>
                            Idle Connections
                          </div>
                          <div style={{ color: asciiColors.foreground, marginLeft: 16, fontSize: 11 }}>
                            Connections that are established but not currently executing queries. High idle connection counts 
                            may indicate connection pool inefficiencies or application issues.
                          </div>
                        </div>

                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.success, marginBottom: 4 }}>
                            Active Connections
                          </div>
                          <div style={{ color: asciiColors.foreground, marginLeft: 16, fontSize: 11 }}>
                            Connections currently executing queries or transactions. Active connections indicate database workload.
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={{ marginBottom: 24 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                        {ascii.blockFull} PERMISSIONS OVERVIEW
                      </div>
                      
                      <div style={{ marginLeft: 16 }}>
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.foreground, marginBottom: 4 }}>
                            Total Grants
                          </div>
                          <div style={{ color: asciiColors.foreground, marginLeft: 16, fontSize: 11 }}>
                            Total number of privilege grants (SELECT, INSERT, UPDATE, DELETE, etc.) across all tables and schemas. 
                            Represents the complexity of the permission structure.
                          </div>
                        </div>

                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.foreground, marginBottom: 4 }}>
                            Schemas With Access
                          </div>
                          <div style={{ color: asciiColors.foreground, marginLeft: 16, fontSize: 11 }}>
                            Number of distinct database schemas where users have been granted permissions. 
                            Helps identify scope of access across the database.
                          </div>
                        </div>

                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.foreground, marginBottom: 4 }}>
                            Tables With Access
                          </div>
                          <div style={{ color: asciiColors.foreground, marginLeft: 16, fontSize: 11 }}>
                            Number of distinct tables where users have been granted permissions. 
                            Indicates the breadth of data access across the database.
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={{ marginBottom: 24 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                        {ascii.blockFull} ROLE TYPES
                      </div>
                      
                      <div style={{ marginLeft: 16 }}>
                        <div style={{ marginBottom: 8 }}>
                          <span style={{ color: asciiColors.danger, fontWeight: 600 }}>SUPERUSER</span>
                          <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
                            Unrestricted access to all database objects, can bypass all permission checks
                          </span>
                        </div>
                        <div style={{ marginBottom: 8 }}>
                          <span style={{ color: asciiColors.accent, fontWeight: 600 }}>CREATEDB</span>
                          <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
                            Can create new databases
                          </span>
                        </div>
                        <div style={{ marginBottom: 8 }}>
                          <span style={{ color: '#6a1b9a', fontWeight: 600 }}>CREATEROLE</span>
                          <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
                            Can create new roles and manage role memberships
                          </span>
                        </div>
                        <div style={{ marginBottom: 8 }}>
                          <span style={{ color: asciiColors.success, fontWeight: 600 }}>LOGIN</span>
                          <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
                            Can connect to the database
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ marginBottom: 24 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                        {ascii.blockFull} CONNECTION STATUSES
                      </div>
                      
                      <div style={{ marginLeft: 16 }}>
                        <div style={{ marginBottom: 8 }}>
                          <span style={{ color: asciiColors.success, fontWeight: 600 }}>ACTIVE</span>
                          <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
                            Connection is currently executing a query or transaction
                          </span>
                        </div>
                        <div style={{ marginBottom: 8 }}>
                          <span style={{ color: asciiColors.warning, fontWeight: 600 }}>IDLE</span>
                          <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
                            Connection is established but not executing any query
                          </span>
                        </div>
                        <div style={{ marginBottom: 8 }}>
                          <span style={{ color: asciiColors.danger, fontWeight: 600 }}>INACTIVE</span>
                          <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
                            Connection is not active or has been terminated
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
                        {ascii.blockSemi} Security Best Practices
                      </div>
                      <div style={{ fontSize: 11, color: asciiColors.foreground }}>
                        • Limit SUPERUSER accounts to essential administrative roles only<br/>
                        • Monitor connection usage to prevent resource exhaustion<br/>
                        • Regularly audit permissions to ensure least-privilege access<br/>
                        • Review active connections for suspicious activity<br/>
                        • Use connection pooling to manage database connections efficiently
                      </div>
                    </div>

                    <div style={{ marginTop: 16, textAlign: 'right' }}>
                      <AsciiButton
                        label="Close"
                        onClick={() => setShowSecurityPlaybook(false)}
                        variant="ghost"
                      />
                    </div>
                  </div>
                </AsciiPanel>
              </div>
            </div>
          )}
        </>
      )}
      </div>
    </Container>
  );
};

export default Security;
