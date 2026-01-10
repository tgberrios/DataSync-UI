import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import styled from 'styled-components';
import { securityApi } from '../../services/api';
import { Container, LoadingOverlay, ErrorMessage } from '../shared/BaseComponents';
import { extractApiError } from '../../utils/errorHandler';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';

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

  const connectionUsagePercent = useMemo(() => {
    if (!securityData.connections.max || securityData.connections.max === 0) return 0;
    return ((securityData.connections.current / securityData.connections.max) * 100).toFixed(1);
  }, [securityData.connections]);

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
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
            <AsciiButton
              label="Security Info"
              onClick={() => setShowSecurityPlaybook(true)}
              variant="ghost"
            />
          </div>

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

          <AsciiPanel title="USER MANAGEMENT">
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
              gap: 12, 
              marginTop: 8 
            }}>
              <AsciiPanel title="Total Users">
                <div style={{ fontFamily: 'Consolas', fontSize: 14, fontWeight: 600, color: asciiColors.foreground }}>
                  {securityData.users.total || 0}
                </div>
              </AsciiPanel>
              <AsciiPanel title="Active Users">
                <div style={{ fontFamily: 'Consolas', fontSize: 14, fontWeight: 600, color: asciiColors.success }}>
                  {securityData.users.active || 0}
                </div>
              </AsciiPanel>
              <AsciiPanel title="Superusers">
                <div style={{ fontFamily: 'Consolas', fontSize: 14, fontWeight: 600, color: asciiColors.danger }}>
                  {securityData.users.superusers || 0}
                </div>
              </AsciiPanel>
              <AsciiPanel title="With Login">
                <div style={{ fontFamily: 'Consolas', fontSize: 14, fontWeight: 600, color: asciiColors.accent }}>
                  {securityData.users.withLogin || 0}
                </div>
              </AsciiPanel>
              <AsciiPanel title="Inactive Users">
                <div style={{ fontFamily: 'Consolas', fontSize: 14, fontWeight: 600, color: asciiColors.muted }}>
                  {(securityData.users.total || 0) - (securityData.users.active || 0)}
                </div>
              </AsciiPanel>
              <AsciiPanel title="Non-Login Roles">
                <div style={{ fontFamily: 'Consolas', fontSize: 14, fontWeight: 600, color: asciiColors.muted }}>
                  {(securityData.users.total || 0) - (securityData.users.withLogin || 0)}
                </div>
              </AsciiPanel>
            </div>
          </AsciiPanel>

          <AsciiPanel title="CONNECTION STATUS">
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
              gap: 12, 
              marginTop: 8 
            }}>
              <AsciiPanel title="Current">
                <div style={{ fontFamily: 'Consolas', fontSize: 14, fontWeight: 600, color: asciiColors.foreground }}>
                  {securityData.connections.current || 0}
                </div>
              </AsciiPanel>
              <AsciiPanel title="Max Allowed">
                <div style={{ fontFamily: 'Consolas', fontSize: 14, fontWeight: 600, color: asciiColors.foreground }}>
                  {securityData.connections.max || 0}
                </div>
              </AsciiPanel>
              <AsciiPanel title="Usage">
                <div style={{ fontFamily: 'Consolas', fontSize: 14, fontWeight: 600, 
                  color: Number(connectionUsagePercent) > 80 ? asciiColors.danger : 
                         Number(connectionUsagePercent) > 60 ? asciiColors.warning : asciiColors.success }}>
                  {connectionUsagePercent}%
                </div>
              </AsciiPanel>
              <AsciiPanel title="Idle">
                <div style={{ fontFamily: 'Consolas', fontSize: 14, fontWeight: 600, color: asciiColors.warning }}>
                  {securityData.connections.idle || 0}
                </div>
              </AsciiPanel>
              <AsciiPanel title="Active">
                <div style={{ fontFamily: 'Consolas', fontSize: 14, fontWeight: 600, color: asciiColors.success }}>
                  {securityData.connections.active || 0}
                </div>
              </AsciiPanel>
              <AsciiPanel title="Available">
                <div style={{ fontFamily: 'Consolas', fontSize: 14, fontWeight: 600, color: asciiColors.accent }}>
                  {(securityData.connections.max || 0) - (securityData.connections.current || 0)}
                </div>
              </AsciiPanel>
            </div>
          </AsciiPanel>

          <AsciiPanel title="PERMISSIONS OVERVIEW">
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
              gap: 12, 
              marginTop: 8 
            }}>
              <AsciiPanel title="Total Grants">
                <div style={{ fontFamily: 'Consolas', fontSize: 14, fontWeight: 600, color: asciiColors.foreground }}>
                  {securityData.permissions.totalGrants || 0}
                </div>
              </AsciiPanel>
              <AsciiPanel title="Schemas">
                <div style={{ fontFamily: 'Consolas', fontSize: 14, fontWeight: 600, color: asciiColors.accent }}>
                  {securityData.permissions.schemasWithAccess || 0}
                </div>
              </AsciiPanel>
              <AsciiPanel title="Tables">
                <div style={{ fontFamily: 'Consolas', fontSize: 14, fontWeight: 600, color: asciiColors.accent }}>
                  {securityData.permissions.tablesWithAccess || 0}
                </div>
              </AsciiPanel>
              <AsciiPanel title="Avg Grants/Table">
                <div style={{ fontFamily: 'Consolas', fontSize: 14, fontWeight: 600, color: asciiColors.foreground }}>
                  {securityData.permissions.tablesWithAccess > 0 
                    ? ((securityData.permissions.totalGrants || 0) / securityData.permissions.tablesWithAccess).toFixed(1)
                    : '0'}
                </div>
              </AsciiPanel>
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
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 8,
                                    padding: '8px 0',
                                    borderBottom: connIndex < user.connections.length - 1 ? `1px solid ${asciiColors.border}` : 'none',
                                    fontFamily: 'Consolas',
                                    fontSize: 12
                                  }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr', gap: 12 }}>
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
                                        <div style={{ color: asciiColors.foreground, fontSize: 11 }}>{conn.client_addr || '-'}</div>
                                      </div>
                                      <div>
                                        <div style={{ fontWeight: 500, color: asciiColors.muted, fontSize: 11 }}>App:</div>
                                        <div style={{ color: asciiColors.foreground, fontSize: 11 }}>{conn.application_name || '-'}</div>
                                      </div>
                                      {conn.database && (
                                        <div>
                                          <div style={{ fontWeight: 500, color: asciiColors.muted, fontSize: 11 }}>Database:</div>
                                          <div style={{ color: asciiColors.foreground, fontSize: 11 }}>{conn.database}</div>
                                        </div>
                                      )}
                                      {conn.backend_start && (
                                        <div>
                                          <div style={{ fontWeight: 500, color: asciiColors.muted, fontSize: 11 }}>Backend Start:</div>
                                          <div style={{ color: asciiColors.foreground, fontSize: 11 }}>{formatDate(conn.backend_start)}</div>
                                        </div>
                                      )}
                                      <div>
                                        <div style={{ fontWeight: 500, color: asciiColors.muted, fontSize: 11 }}>Activity:</div>
                                        <div style={{ color: asciiColors.foreground, fontSize: 11 }}>{formatDate(conn.last_activity)}</div>
                                      </div>
                                    </div>
                                    {(conn.query_duration || conn.wait_event_type || conn.query) && (
                                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 4 }}>
                                        {conn.query_duration && (
                                          <div>
                                            <div style={{ fontWeight: 500, color: asciiColors.muted, fontSize: 11 }}>Query Duration:</div>
                                            <div style={{ color: asciiColors.foreground, fontSize: 11 }}>
                                              {Number(conn.query_duration) > 1000 
                                                ? `${(Number(conn.query_duration) / 1000).toFixed(2)}s`
                                                : `${Number(conn.query_duration).toFixed(0)}ms`}
                                            </div>
                                          </div>
                                        )}
                                        {conn.wait_event_type && (
                                          <div>
                                            <div style={{ fontWeight: 500, color: asciiColors.muted, fontSize: 11 }}>Wait Event:</div>
                                            <div style={{ color: asciiColors.foreground, fontSize: 11 }}>
                                              {conn.wait_event_type}
                                              {conn.wait_event && ` (${conn.wait_event})`}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    {conn.query && (
                                      <div style={{ marginTop: 8 }}>
                                        <div style={{ fontWeight: 500, color: asciiColors.muted, fontSize: 11, marginBottom: 4 }}>Query:</div>
                                        <div style={{ 
                                          padding: 8, 
                                          background: asciiColors.background, 
                                          borderRadius: 2,
                                          border: `1px solid ${asciiColors.border}`,
                                          fontSize: 11,
                                          color: asciiColors.foreground,
                                          fontFamily: 'Consolas',
                                          maxHeight: 150,
                                          overflowY: 'auto',
                                          whiteSpace: 'pre-wrap',
                                          wordBreak: 'break-word'
                                        }}>
                                          {conn.query.length > 500 ? conn.query.substring(0, 500) + '...' : conn.query}
                                        </div>
                                      </div>
                                    )}
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
