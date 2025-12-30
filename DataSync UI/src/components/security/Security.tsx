import React, { useState, useEffect, useCallback, useRef } from 'react';
import styled from 'styled-components';
import { securityApi } from '../../services/api';
import { Container, LoadingOverlay, ErrorMessage } from '../shared/BaseComponents';
import { extractApiError } from '../../utils/errorHandler';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';

const getBadgeColor = (type: string) => {
  switch (type) {
    case 'SUPERUSER': return asciiColors.danger;
    case 'CREATEDB': return asciiColors.accent;
      case 'CREATEROLE': return '#6a1b9a';
    case 'LOGIN': return asciiColors.success;
    case 'ACTIVE': return asciiColors.success;
    case 'INACTIVE': return asciiColors.danger;
    case 'SELECT': return asciiColors.success;
    case 'INSERT': return asciiColors.accent;
    case 'UPDATE': return asciiColors.warning;
    case 'DELETE': return asciiColors.danger;
    case 'ALL': return asciiColors.success;
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
      application_name: user.application_name
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
    
    try {
      setLoading(true);
      setError(null);
      const response = await securityApi.getSecurityData();
      
      if (isMountedRef.current) {
        setSecurityData(response.summary);
        setActiveUsers(response.activeUsers || []);
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
    
    const interval = setInterval(fetchSecurityData, 30000);
    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchSecurityData]);

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
        SECURITY & COMPLIANCE MONITOR
      </h1>

      {loading && <LoadingOverlay>Loading security data...</LoadingOverlay>}
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

      {!loading && !error && (
        <>
          <AsciiPanel title="USER MANAGEMENT">
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: 12, 
              marginTop: 8 
            }}>
              <div style={{
                padding: 8,
                border: `1px solid ${asciiColors.border}`,
                borderRadius: 2,
                textAlign: 'center',
                fontFamily: 'Consolas',
                fontSize: 12,
                backgroundColor: asciiColors.background
              }}>
                Total Users: {securityData.users.total}
              </div>
              <div style={{
                padding: 8,
                border: `1px solid ${asciiColors.border}`,
                borderRadius: 2,
                textAlign: 'center',
                fontFamily: 'Consolas',
                fontSize: 12,
                backgroundColor: asciiColors.background
              }}>
                Active Users: {securityData.users.active}
              </div>
              <div style={{
                padding: 8,
                border: `1px solid ${asciiColors.border}`,
                borderRadius: 2,
                textAlign: 'center',
                fontFamily: 'Consolas',
                fontSize: 12,
                backgroundColor: asciiColors.background
              }}>
                Superusers: {securityData.users.superusers}
              </div>
              <div style={{
                padding: 8,
                border: `1px solid ${asciiColors.border}`,
                borderRadius: 2,
                textAlign: 'center',
                fontFamily: 'Consolas',
                fontSize: 12,
                backgroundColor: asciiColors.background
              }}>
                With Login: {securityData.users.withLogin}
              </div>
            </div>
          </AsciiPanel>

          <AsciiPanel title="CONNECTION STATUS">
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: 12, 
              marginTop: 8 
            }}>
              <div style={{
                padding: 8,
                border: `1px solid ${asciiColors.border}`,
                borderRadius: 2,
                textAlign: 'center',
                fontFamily: 'Consolas',
                fontSize: 12,
                backgroundColor: asciiColors.background
              }}>
                Current: {securityData.connections.current}
              </div>
              <div style={{
                padding: 8,
                border: `1px solid ${asciiColors.border}`,
                borderRadius: 2,
                textAlign: 'center',
                fontFamily: 'Consolas',
                fontSize: 12,
                backgroundColor: asciiColors.background
              }}>
                Max Allowed: {securityData.connections.max}
              </div>
              <div style={{
                padding: 8,
                border: `1px solid ${asciiColors.border}`,
                borderRadius: 2,
                textAlign: 'center',
                fontFamily: 'Consolas',
                fontSize: 12,
                backgroundColor: asciiColors.background
              }}>
                Idle: {securityData.connections.idle}
              </div>
              <div style={{
                padding: 8,
                border: `1px solid ${asciiColors.border}`,
                borderRadius: 2,
                textAlign: 'center',
                fontFamily: 'Consolas',
                fontSize: 12,
                backgroundColor: asciiColors.background
              }}>
                Active: {securityData.connections.active}
              </div>
            </div>
          </AsciiPanel>

          <AsciiPanel title="PERMISSIONS OVERVIEW">
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: 12, 
              marginTop: 8 
            }}>
              <div style={{
                padding: 8,
                border: `1px solid ${asciiColors.border}`,
                borderRadius: 2,
                textAlign: 'center',
                fontFamily: 'Consolas',
                fontSize: 12,
                backgroundColor: asciiColors.background
              }}>
                Total Grants: {securityData.permissions.totalGrants}
              </div>
              <div style={{
                padding: 8,
                border: `1px solid ${asciiColors.border}`,
                borderRadius: 2,
                textAlign: 'center',
                fontFamily: 'Consolas',
                fontSize: 12,
                backgroundColor: asciiColors.background
              }}>
                Schemas: {securityData.permissions.schemasWithAccess}
              </div>
              <div style={{
                padding: 8,
                border: `1px solid ${asciiColors.border}`,
                borderRadius: 2,
                textAlign: 'center',
                fontFamily: 'Consolas',
                fontSize: 12,
                backgroundColor: asciiColors.background
              }}>
                Tables: {securityData.permissions.tablesWithAccess}
              </div>
            </div>
          </AsciiPanel>

          <AsciiPanel title="ACTIVE USERS">
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
                      padding: '8px 12px',
                      textAlign: 'left',
                      borderBottom: `2px solid ${asciiColors.borderStrong}`,
                      backgroundColor: asciiColors.backgroundSoft,
                      fontFamily: 'Consolas',
                      fontSize: 13,
                      fontWeight: 600,
                      position: 'sticky',
                      top: 0,
                      zIndex: 10
                    }}>Username</th>
                    <th style={{
                      padding: '8px 12px',
                      textAlign: 'left',
                      borderBottom: `2px solid ${asciiColors.borderStrong}`,
                      backgroundColor: asciiColors.backgroundSoft,
                      fontFamily: 'Consolas',
                      fontSize: 13,
                      fontWeight: 600,
                      position: 'sticky',
                      top: 0,
                      zIndex: 10
                    }}>Role</th>
                    <th style={{
                      padding: '8px 12px',
                      textAlign: 'left',
                      borderBottom: `2px solid ${asciiColors.borderStrong}`,
                      backgroundColor: asciiColors.backgroundSoft,
                      fontFamily: 'Consolas',
                      fontSize: 13,
                      fontWeight: 600,
                      position: 'sticky',
                      top: 0,
                      zIndex: 10
                    }}>Status</th>
                    <th style={{
                      padding: '8px 12px',
                      textAlign: 'left',
                      borderBottom: `2px solid ${asciiColors.borderStrong}`,
                      backgroundColor: asciiColors.backgroundSoft,
                      fontFamily: 'Consolas',
                      fontSize: 13,
                      fontWeight: 600,
                      position: 'sticky',
                      top: 0,
                      zIndex: 10
                    }}>Last Activity</th>
                    <th style={{
                      padding: '8px 12px',
                      textAlign: 'left',
                      borderBottom: `2px solid ${asciiColors.borderStrong}`,
                      backgroundColor: asciiColors.backgroundSoft,
                      fontFamily: 'Consolas',
                      fontSize: 13,
                      fontWeight: 600,
                      position: 'sticky',
                      top: 0,
                      zIndex: 10
                    }}>Client IP</th>
                    <th style={{
                      padding: '8px 12px',
                      textAlign: 'left',
                      borderBottom: `2px solid ${asciiColors.borderStrong}`,
                      backgroundColor: asciiColors.backgroundSoft,
                      fontFamily: 'Consolas',
                      fontSize: 13,
                      fontWeight: 600,
                      position: 'sticky',
                      top: 0,
                      zIndex: 10
                    }}>Application</th>
                </tr>
              </thead>
              <tbody>
                {groupUsersByUsername(activeUsers).map((user: any, index) => {
                  const isExpanded = expandedUsers.has(user.username);
                  return (
                    <React.Fragment key={index}>
                        <tr 
                          style={{
                            cursor: 'pointer',
                            backgroundColor: isExpanded ? asciiColors.backgroundSoft : asciiColors.background,
                            transition: 'all 0.2s ease'
                          }}
                        onClick={() => toggleUserExpansion(user.username)}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = asciiColors.backgroundSoft;
                          }}
                          onMouseLeave={(e) => {
                            if (!isExpanded) {
                              e.currentTarget.style.backgroundColor = asciiColors.background;
                            }
                          }}
                        >
                          <td style={{
                            padding: '8px 12px',
                            borderBottom: `1px solid ${asciiColors.border}`,
                            fontFamily: 'Consolas',
                            fontSize: 12
                          }}>
                          {user.username}
                            <span style={{
                              backgroundColor: asciiColors.accent,
                              color: '#ffffff',
                              padding: '2px 8px',
                              borderRadius: 12,
                              fontSize: 11,
                              fontFamily: 'Consolas',
                              marginLeft: 8
                            }}>
                            {user.connections.length}
                            </span>
                          </td>
                          <td style={{
                            padding: '8px 12px',
                            borderBottom: `1px solid ${asciiColors.border}`,
                            fontFamily: 'Consolas',
                            fontSize: 12
                          }}>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: 2,
                              fontSize: 11,
                              fontFamily: 'Consolas',
                              backgroundColor: getBadgeColor(user.role_type) + '20',
                              color: getBadgeColor(user.role_type),
                              border: `1px solid ${getBadgeColor(user.role_type)}`
                            }}>
                            {user.role_type}
                            </span>
                          </td>
                          <td style={{
                            padding: '8px 12px',
                            borderBottom: `1px solid ${asciiColors.border}`,
                            fontFamily: 'Consolas',
                            fontSize: 12
                          }}>
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                            {Object.entries(user.statusCounts).map(([status, count]) => (
                                <span key={status} style={{
                                  padding: '2px 8px',
                                  borderRadius: 2,
                                  fontSize: 11,
                                  fontFamily: 'Consolas',
                                  backgroundColor: getBadgeColor(status) + '20',
                                  color: getBadgeColor(status),
                                  border: `1px solid ${getBadgeColor(status)}`
                                }}>
                                {status}: {count as number}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td style={{
                            padding: '8px 12px',
                            borderBottom: `1px solid ${asciiColors.border}`,
                            fontFamily: 'Consolas',
                            fontSize: 12
                          }}>{formatDate(user.mostRecentActivity)}</td>
                          <td style={{
                            padding: '8px 12px',
                            borderBottom: `1px solid ${asciiColors.border}`,
                            fontFamily: 'Consolas',
                            fontSize: 12
                          }}>
                          {user.connections.length > 0 ? user.connections[0].client_addr || '-' : '-'}
                          </td>
                          <td style={{
                            padding: '8px 12px',
                            borderBottom: `1px solid ${asciiColors.border}`,
                            fontFamily: 'Consolas',
                            fontSize: 12
                          }}>
                          {user.connections.length > 0 ? user.connections[0].application_name || '-' : '-'}
                          </td>
                        </tr>
                      {isExpanded && (
                          <tr style={{ backgroundColor: asciiColors.backgroundSoft }}>
                            <td colSpan={6} style={{ padding: 0, borderBottom: `1px solid ${asciiColors.border}` }}>
                              <div style={{
                                padding: '12px 16px',
                                borderLeft: `3px solid ${asciiColors.accent}`,
                                marginLeft: 16,
                                fontFamily: 'Consolas',
                                fontSize: 12
                              }}>
                                <div style={{ marginBottom: 12, fontWeight: 600, color: asciiColors.foreground }}>
                                All Connections for {user.username}
                              </div>
                              {user.connections.map((conn: any, connIndex: number) => (
                                  <div key={connIndex} style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr 1fr 1fr',
                                    gap: 12,
                                    padding: '6px 0',
                                    borderBottom: connIndex < user.connections.length - 1 ? `1px solid ${asciiColors.border}` : 'none',
                                    fontFamily: 'Consolas',
                                    fontSize: 12
                                  }}>
                                    <div>
                                      <div style={{ fontWeight: 500, color: asciiColors.muted, fontSize: 11 }}>Status:</div>
                                      <div>
                                        <span style={{
                                          padding: '2px 8px',
                                          borderRadius: 2,
                                          fontSize: 11,
                                          fontFamily: 'Consolas',
                                          backgroundColor: getBadgeColor(conn.status) + '20',
                                          color: getBadgeColor(conn.status),
                                          border: `1px solid ${getBadgeColor(conn.status)}`
                                        }}>
                                          {conn.status}
                                        </span>
                                      </div>
                                    </div>
                                    <div>
                                      <div style={{ fontWeight: 500, color: asciiColors.muted, fontSize: 11 }}>IP:</div>
                                      <div style={{ color: asciiColors.foreground }}>{conn.client_addr || '-'}</div>
                                    </div>
                                    <div>
                                      <div style={{ fontWeight: 500, color: asciiColors.muted, fontSize: 11 }}>App:</div>
                                      <div style={{ color: asciiColors.foreground }}>{conn.application_name || '-'}</div>
                                    </div>
                                    <div>
                                      <div style={{ fontWeight: 500, color: asciiColors.muted, fontSize: 11 }}>Activity:</div>
                                      <div style={{ color: asciiColors.foreground }}>{formatDate(conn.last_activity)}</div>
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

        </>
      )}
    </div>
  );
};

export default Security;
