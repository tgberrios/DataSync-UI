import React, { useState, useMemo } from 'react';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { theme } from '../../theme/theme';

interface Connection {
  status: string;
  last_activity?: string;
  client_addr?: string;
  application_name?: string;
  database?: string;
  backend_start?: string;
  query_duration?: number;
  wait_event_type?: string;
  wait_event?: string;
  query?: string;
}

interface UserNode {
  username: string;
  role_type: string;
  connections: Connection[];
  mostRecentActivity?: string;
  statusCounts: Record<string, number>;
}

interface ConnectionNode {
  connectionName: string;
  users: UserNode[];
}

interface SecurityActiveUsersTreeViewProps {
  users: any[];
  onUserToggle?: (username: string) => void;
  expandedUsers?: Set<string>;
}

const SecurityActiveUsersTreeView: React.FC<SecurityActiveUsersTreeViewProps> = ({ 
  users,
  onUserToggle,
  expandedUsers = new Set()
}) => {
  const [expandedConnections, setExpandedConnections] = useState<Set<string>>(new Set());

  const treeData = useMemo(() => {
    const connections = new Map<string, ConnectionNode>();

      users.forEach(user => {
      let connectionName = 'Unknown Connection';
      if (user.connection_string) {
        try {
          if (user.connection_string.startsWith('postgresql://') || user.connection_string.startsWith('postgres://')) {
            const url = new URL(user.connection_string);
            const host = url.hostname || 'localhost';
            const port = url.port || '5432';
            connectionName = `${host}:${port}`;
          } else if (user.connection_string.startsWith('mysql://') || user.connection_string.startsWith('mariadb://')) {
            const url = new URL(user.connection_string);
            const host = url.hostname || 'localhost';
            const port = url.port || '3306';
            connectionName = `${host}:${port}`;
          } else if (user.connection_string.startsWith('mongodb://') || user.connection_string.startsWith('mongodb+srv://')) {
            const url = new URL(user.connection_string);
            const host = url.hostname || 'localhost';
            const port = url.port || '27017';
            connectionName = `${host}:${port}`;
          } else if (user.connection_string.includes('Server=')) {
            const serverMatch = user.connection_string.match(/Server=([^;,]+)/i);
            if (serverMatch) {
              const server = serverMatch[1];
              const [host, port] = server.includes(',') ? server.split(',') : [server, '1433'];
              connectionName = `${host.trim()}:${port.trim()}`;
            }
          } else if (user.connection_string.includes('@')) {
            const parts = user.connection_string.split('@');
            if (parts.length > 1) {
              const hostPort = parts[parts.length - 1].split('/')[0];
              const [host, port] = hostPort.includes(':') ? hostPort.split(':') : [hostPort, '1521'];
              connectionName = `${host.trim()}:${port.trim()}`;
            }
          } else {
            const hostPortMatch = user.connection_string.match(/([a-zA-Z0-9.-]+):(\d+)/);
            if (hostPortMatch) {
              connectionName = `${hostPortMatch[1]}:${hostPortMatch[2]}`;
            } else {
              connectionName = user.connection_string.substring(0, 50);
            }
          }
        } catch (err) {
          connectionName = user.connection_string.substring(0, 50);
        }
      }

      if (!connections.has(connectionName)) {
        connections.set(connectionName, {
          connectionName,
          users: []
        });
      }

      const connection = connections.get(connectionName)!;
      const username = user.username || 'Unknown';
      
      let userNode = connection.users.find(u => u.username === username);
      if (!userNode) {
        userNode = {
          username,
          role_type: user.role_type || 'N/A',
          connections: [],
          mostRecentActivity: user.last_activity,
          statusCounts: {}
        };
        connection.users.push(userNode);
      }

      userNode.connections.push({
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

      if (user.last_activity && (!userNode.mostRecentActivity || 
          new Date(user.last_activity) > new Date(userNode.mostRecentActivity))) {
        userNode.mostRecentActivity = user.last_activity;
      }

      userNode.statusCounts[user.status] = (userNode.statusCounts[user.status] || 0) + 1;
    });

    return Array.from(connections.values()).sort((a, b) => a.connectionName.localeCompare(b.connectionName));
  }, [users]);

  const toggleConnection = (connectionName: string) => {
    setExpandedConnections(prev => {
      const next = new Set(prev);
      if (next.has(connectionName)) {
        next.delete(connectionName);
      } else {
        next.add(connectionName);
      }
      return next;
    });
  };


  const renderTreeLine = (level: number, isLast: boolean) => {
    if (level === 0) return null;
    
    const lines: string[] = [];
    for (let i = 0; i < level - 1; i++) {
      lines.push(`${ascii.v}  `);
    }
    
    if (isLast) {
      lines.push(`${ascii.bl}${ascii.h}${ascii.h} `);
    } else {
      lines.push(`${ascii.tRight}${ascii.h}${ascii.h} `);
    }
    
    return <span style={{ 
      color: asciiColors.border, 
      marginRight: 6, 
      fontFamily: "Consolas", 
      fontSize: 11 
    }}>{lines.join('')}</span>;
  };

  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'SUPERUSER': return asciiColors.accent;
      case 'CREATEDB': return asciiColors.accent;
      case 'CREATEROLE': return asciiColors.accent;
      case 'LOGIN': return asciiColors.accent;
      case 'ACTIVE': return asciiColors.accent;
      case 'INACTIVE': return asciiColors.muted;
      case 'SELECT': return asciiColors.accent;
      case 'INSERT': return asciiColors.accent;
      case 'UPDATE': return asciiColors.accent;
      case 'DELETE': return asciiColors.accent;
      case 'ALL': return asciiColors.accent;
      default: return asciiColors.muted;
    }
  };

  const formatDate = (date?: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleString();
  };

  if (users.length === 0) {
    return (
      <div style={{
        padding: theme.spacing.lg,
        textAlign: 'center',
        color: asciiColors.muted,
        fontFamily: 'Consolas',
        fontSize: 12
      }}>
        No active users found
      </div>
    );
  }

  return (
    <div style={{
      fontFamily: "Consolas",
      fontSize: 12,
      color: asciiColors.foreground
    }}>
      {treeData.map((connectionNode, connIdx) => {
        const isConnectionExpanded = expandedConnections.has(connectionNode.connectionName);
        const isConnectionLast = connIdx === treeData.length - 1;

        return (
          <div key={connectionNode.connectionName} style={{ marginBottom: 4 }}>
            {/* Connection Level */}
            <div
              onClick={() => toggleConnection(connectionNode.connectionName)}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "10px 8px",
                cursor: "pointer",
                borderLeft: `2px solid ${asciiColors.accent}`,
                backgroundColor: isConnectionExpanded ? asciiColors.backgroundSoft : asciiColors.background,
                transition: "all 0.15s ease",
                marginBottom: 2
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = asciiColors.backgroundSoft;
              }}
              onMouseLeave={(e) => {
                if (!isConnectionExpanded) {
                  e.currentTarget.style.backgroundColor = asciiColors.background;
                }
              }}
            >
              <span style={{
                marginRight: 8,
                color: isConnectionExpanded ? asciiColors.accent : asciiColors.muted,
                fontSize: 10,
                transition: "transform 0.15s ease",
                display: "inline-block",
                transform: isConnectionExpanded ? "rotate(90deg)" : "rotate(0deg)"
              }}>
                {ascii.arrowRight}
              </span>
              <span style={{
                fontWeight: 600,
                color: asciiColors.accent,
                fontSize: 12,
                flex: 1
              }}>
                {connectionNode.connectionName}
              </span>
              <span style={{
                padding: "2px 8px",
                borderRadius: 2,
                fontSize: 10,
                fontWeight: 500,
                border: `1px solid ${asciiColors.border}`,
                backgroundColor: asciiColors.backgroundSoft,
                color: asciiColors.foreground
              }}>
                {connectionNode.users.reduce((sum, u) => sum + u.connections.length, 0)}
              </span>
            </div>

            {isConnectionExpanded && (
              <div style={{ paddingLeft: 24 }}>
                {connectionNode.users.map((user, userIdx) => {
                  const isUserExpanded = expandedUsers.has(user.username);
                  const isUserLast = userIdx === connectionNode.users.length - 1;

                  return (
                    <div key={user.username}>
                      {/* User Level */}
                      <div
                        onClick={() => onUserToggle?.(user.username)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          padding: "8px 8px",
                          marginLeft: 8,
                          marginBottom: 2,
                          borderLeft: `2px solid ${asciiColors.border}`,
                          backgroundColor: isUserExpanded ? asciiColors.backgroundSoft : "transparent",
                          transition: "all 0.15s ease",
                          cursor: "pointer"
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = asciiColors.backgroundSoft;
                          e.currentTarget.style.borderLeftColor = asciiColors.accent;
                        }}
                        onMouseLeave={(e) => {
                          if (!isUserExpanded) {
                            e.currentTarget.style.backgroundColor = "transparent";
                            e.currentTarget.style.borderLeftColor = asciiColors.border;
                          }
                        }}
                      >
                        {renderTreeLine(1, isUserLast)}
                        <span style={{
                          marginRight: 8,
                          color: isUserExpanded ? asciiColors.accent : asciiColors.muted,
                          fontSize: 10,
                          transition: "transform 0.15s ease",
                          display: "inline-block",
                          transform: isUserExpanded ? "rotate(90deg)" : "rotate(0deg)"
                        }}>
                          {ascii.arrowRight}
                        </span>
                        <span style={{
                          fontWeight: 600,
                          color: asciiColors.foreground,
                          fontSize: 11,
                          flex: 1,
                          fontFamily: 'Consolas'
                        }}>
                          {user.username}
                        </span>
                        <span style={{
                          padding: "2px 6px",
                          borderRadius: 2,
                          fontSize: 10,
                          fontWeight: 500,
                          border: `1px solid ${getBadgeColor(user.role_type)}`,
                          color: getBadgeColor(user.role_type),
                          backgroundColor: "transparent",
                          marginRight: 8
                        }}>
                          {user.role_type}
                        </span>
                        <span style={{
                          padding: "2px 6px",
                          borderRadius: 2,
                          fontSize: 10,
                          fontWeight: 500,
                          border: `1px solid ${asciiColors.border}`,
                          backgroundColor: "transparent",
                          color: asciiColors.muted
                        }}>
                          {user.connections.length}
                        </span>
                      </div>

                      {isUserExpanded && (
                        <div style={{ paddingLeft: 24 }}>
                          <div style={{ marginBottom: 8, padding: "8px 8px", marginLeft: 8, fontSize: 10, color: asciiColors.muted }}>
                            Last Activity: {formatDate(user.mostRecentActivity)}
                          </div>
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8, padding: "0 8px", marginLeft: 8 }}>
                            {Object.entries(user.statusCounts).map(([status, count]) => (
                              <span key={status} style={{
                                padding: "2px 6px",
                                borderRadius: 2,
                                fontSize: 10,
                                fontFamily: 'Consolas',
                                backgroundColor: asciiColors.backgroundSoft,
                                color: getBadgeColor(status),
                                border: `1px solid ${getBadgeColor(status)}`
                              }}>
                                {status}: {count as number}
                              </span>
                            ))}
                          </div>
                          {user.connections.map((conn, connIdx) => {
                            const isConnLast = connIdx === user.connections.length - 1;

                            return (
                              <div
                                key={connIdx}
                                style={{
                                  display: "flex",
                                  alignItems: "flex-start",
                                  padding: "8px 8px",
                                  marginLeft: 8,
                                  marginBottom: 2,
                                  borderLeft: `1px solid ${asciiColors.border}`,
                                  backgroundColor: "transparent",
                                  transition: "all 0.15s ease"
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = asciiColors.backgroundSoft;
                                  e.currentTarget.style.borderLeftColor = asciiColors.accent;
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = "transparent";
                                  e.currentTarget.style.borderLeftColor = asciiColors.border;
                                }}
                              >
                                {renderTreeLine(2, isConnLast)}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                                    <span style={{
                                      padding: "2px 6px",
                                      borderRadius: 2,
                                      fontSize: 10,
                                      fontWeight: 500,
                                      border: `1px solid ${getBadgeColor(conn.status)}`,
                                      color: getBadgeColor(conn.status),
                                      backgroundColor: "transparent"
                                    }}>
                                      {conn.status}
                                    </span>
                                    {conn.client_addr && (
                                      <span style={{
                                        fontSize: 10,
                                        color: asciiColors.muted,
                                        fontFamily: 'Consolas'
                                      }}>
                                        IP: {conn.client_addr}
                                      </span>
                                    )}
                                    {conn.application_name && (
                                      <span style={{
                                        fontSize: 10,
                                        color: asciiColors.muted,
                                        fontFamily: 'Consolas'
                                      }}>
                                        App: {conn.application_name}
                                      </span>
                                    )}
                                    {conn.database && (
                                      <span style={{
                                        fontSize: 10,
                                        color: asciiColors.muted,
                                        fontFamily: 'Consolas'
                                      }}>
                                        DB: {conn.database}
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: 10, color: asciiColors.muted, fontFamily: 'Consolas' }}>
                                    Activity: {formatDate(conn.last_activity)}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default SecurityActiveUsersTreeView;
