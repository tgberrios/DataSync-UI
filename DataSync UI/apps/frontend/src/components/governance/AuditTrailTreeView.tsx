import React, { useState, useMemo } from 'react';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { theme } from '../../theme/theme';
import type { AuditLogEntry } from '../../services/api';

interface DateNode {
  date: string;
  users: Map<string, UserNode>;
}

interface UserNode {
  username: string;
  actions: Map<string, ActionNode>;
}

interface ActionNode {
  actionType: string;
  logs: AuditLogEntry[];
}

interface AuditTrailTreeViewProps {
  logs: AuditLogEntry[];
  onViewDetails?: (log: AuditLogEntry) => void;
}

const AuditTrailTreeView: React.FC<AuditTrailTreeViewProps> = ({ 
  logs, 
  onViewDetails
}) => {
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [expandedActions, setExpandedActions] = useState<Set<string>>(new Set());

  const treeData = useMemo(() => {
    const dates = new Map<string, DateNode>();

    logs.forEach(log => {
      const date = log.created_at ? new Date(log.created_at).toLocaleDateString() : 'Unknown';
      const username = log.username || 'Unknown';
      const actionType = log.action_type || 'Unknown';

      if (!dates.has(date)) {
        dates.set(date, {
          date,
          users: new Map()
        });
      }

      const dateNode = dates.get(date)!;

      if (!dateNode.users.has(username)) {
        dateNode.users.set(username, {
          username,
          actions: new Map()
        });
      }

      const userNode = dateNode.users.get(username)!;

      if (!userNode.actions.has(actionType)) {
        userNode.actions.set(actionType, {
          actionType,
          logs: []
        });
      }

      userNode.actions.get(actionType)!.logs.push(log);
    });

    return Array.from(dates.values()).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [logs]);

  const toggleDate = (date: string) => {
    setExpandedDates(prev => {
      const next = new Set(prev);
      if (next.has(date)) {
        next.delete(date);
        const dateNode = treeData.find(d => d.date === date);
        if (dateNode) {
          dateNode.users.forEach(user => {
            const userKey = `${date}.${user.username}`;
            setExpandedUsers(prevUsers => {
              const nextUsers = new Set(prevUsers);
              nextUsers.delete(userKey);
              return nextUsers;
            });
            user.actions.forEach(action => {
              const actionKey = `${date}.${user.username}.${action.actionType}`;
              setExpandedActions(prevActions => {
                const nextActions = new Set(prevActions);
                nextActions.delete(actionKey);
                return nextActions;
              });
            });
          });
        }
      } else {
        next.add(date);
      }
      return next;
    });
  };

  const toggleUser = (date: string, username: string) => {
    const key = `${date}.${username}`;
    setExpandedUsers(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
        const dateNode = treeData.find(d => d.date === date);
        if (dateNode) {
          const userNode = dateNode.users.get(username);
          if (userNode) {
            userNode.actions.forEach(action => {
              const actionKey = `${date}.${username}.${action.actionType}`;
              setExpandedActions(prevActions => {
                const nextActions = new Set(prevActions);
                nextActions.delete(actionKey);
                return nextActions;
              });
            });
          }
        }
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const toggleAction = (date: string, username: string, actionType: string) => {
    const key = `${date}.${username}.${actionType}`;
    setExpandedActions(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
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

  const getActionTypeColor = (actionType: string) => {
    switch (actionType.toUpperCase()) {
      case 'SELECT': return asciiColors.accent;
      case 'INSERT': return asciiColors.accent;
      case 'UPDATE': return asciiColors.muted;
      case 'DELETE': return asciiColors.foreground;
      default: return asciiColors.muted;
    }
  };

  const formatDate = (date: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleString();
  };

  if (logs.length === 0) {
    return (
      <div style={{
        padding: theme.spacing.lg,
        textAlign: 'center',
        color: asciiColors.muted,
        fontFamily: 'Consolas',
        fontSize: 12
      }}>
        No audit logs found.
      </div>
    );
  }

  return (
    <div style={{
      fontFamily: "Consolas",
      fontSize: 12,
      color: asciiColors.foreground
    }}>
      {treeData.map((dateNode, dateIdx) => {
        const isDateExpanded = expandedDates.has(dateNode.date);
        const dateUsers = Array.from(dateNode.users.values());
        const isDateLast = dateIdx === treeData.length - 1;

        return (
          <div key={dateNode.date} style={{ marginBottom: 4 }}>
            {/* Date Level */}
            <div
              onClick={() => toggleDate(dateNode.date)}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "10px 8px",
                cursor: "pointer",
                borderLeft: `2px solid ${asciiColors.accent}`,
                backgroundColor: isDateExpanded ? asciiColors.backgroundSoft : asciiColors.background,
                transition: "all 0.15s ease",
                marginBottom: 2
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = asciiColors.backgroundSoft;
              }}
              onMouseLeave={(e) => {
                if (!isDateExpanded) {
                  e.currentTarget.style.backgroundColor = asciiColors.background;
                }
              }}
            >
              <span style={{
                marginRight: 8,
                color: isDateExpanded ? asciiColors.accent : asciiColors.muted,
                fontSize: 10,
                transition: "transform 0.15s ease",
                display: "inline-block",
                transform: isDateExpanded ? "rotate(90deg)" : "rotate(0deg)"
              }}>
                {ascii.arrowRight}
              </span>
              <span style={{
                fontWeight: 600,
                color: asciiColors.accent,
                fontSize: 12,
                flex: 1
              }}>
                {dateNode.date}
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
                {dateUsers.reduce((sum, u) => sum + Array.from(u.actions.values()).reduce((s, a) => s + a.logs.length, 0), 0)}
              </span>
            </div>

            {isDateExpanded && (
              <div style={{ paddingLeft: 24 }}>
                {dateUsers.map((user, userIdx) => {
                  const userKey = `${dateNode.date}.${user.username}`;
                  const isUserExpanded = expandedUsers.has(userKey);
                  const userActions = Array.from(user.actions.values());
                  const isUserLast = userIdx === dateUsers.length - 1;

                  return (
                    <div key={userKey}>
                      {/* User Level */}
                      <div
                        onClick={() => toggleUser(dateNode.date, user.username)}
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
                          border: `1px solid ${asciiColors.border}`,
                          backgroundColor: "transparent",
                          color: asciiColors.muted
                        }}>
                          {userActions.reduce((sum, a) => sum + a.logs.length, 0)}
                        </span>
                      </div>

                      {isUserExpanded && (
                        <div style={{ paddingLeft: 24 }}>
                          {userActions.map((action, actionIdx) => {
                            const actionKey = `${dateNode.date}.${user.username}.${action.actionType}`;
                            const isActionExpanded = expandedActions.has(actionKey);
                            const isActionLast = actionIdx === userActions.length - 1;

                            return (
                              <div key={actionKey}>
                                {/* Action Type Level */}
                                <div
                                  onClick={() => toggleAction(dateNode.date, user.username, action.actionType)}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    padding: "6px 8px",
                                    marginLeft: 8,
                                    marginBottom: 2,
                                    borderLeft: `1px solid ${asciiColors.border}`,
                                    backgroundColor: isActionExpanded ? asciiColors.backgroundSoft : "transparent",
                                    transition: "all 0.15s ease",
                                    cursor: "pointer"
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = asciiColors.backgroundSoft;
                                    e.currentTarget.style.borderLeftColor = asciiColors.accent;
                                  }}
                                  onMouseLeave={(e) => {
                                    if (!isActionExpanded) {
                                      e.currentTarget.style.backgroundColor = "transparent";
                                      e.currentTarget.style.borderLeftColor = asciiColors.border;
                                    }
                                  }}
                                >
                                  {renderTreeLine(2, isActionLast)}
                                  <span style={{
                                    marginRight: 8,
                                    color: isActionExpanded ? asciiColors.accent : asciiColors.muted,
                                    fontSize: 10,
                                    transition: "transform 0.15s ease",
                                    display: "inline-block",
                                    transform: isActionExpanded ? "rotate(90deg)" : "rotate(0deg)"
                                  }}>
                                    {ascii.arrowRight}
                                  </span>
                                  <span style={{
                                    padding: "2px 6px",
                                    borderRadius: 2,
                                    fontSize: 10,
                                    fontWeight: 500,
                                    border: `1px solid ${getActionTypeColor(action.actionType)}`,
                                    color: getActionTypeColor(action.actionType),
                                    backgroundColor: "transparent"
                                  }}>
                                    {action.actionType}
                                  </span>
                                  <span style={{
                                    padding: "2px 6px",
                                    borderRadius: 2,
                                    fontSize: 10,
                                    fontWeight: 500,
                                    border: `1px solid ${asciiColors.border}`,
                                    backgroundColor: "transparent",
                                    color: asciiColors.muted,
                                    marginLeft: 8
                                  }}>
                                    {action.logs.length}
                                  </span>
                                </div>

                                {isActionExpanded && (
                                  <div style={{ paddingLeft: 24 }}>
                                    {action.logs.map((log, logIdx) => {
                                      const isLogLast = logIdx === action.logs.length - 1;

                                      return (
                                        <div
                                          key={log.log_id || logIdx}
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
                                          {renderTreeLine(3, isLogLast)}
                                          <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                              <span style={{
                                                fontWeight: 500,
                                                color: asciiColors.foreground,
                                                fontSize: 11
                                              }}>
                                                {log.schema_name && log.table_name 
                                                  ? `${log.schema_name}.${log.table_name}`
                                                  : 'N/A'}
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
                                                {log.rows_affected || 0} rows
                                              </span>
                                              {log.compliance_requirement && (
                                                <span style={{
                                                  padding: "2px 6px",
                                                  borderRadius: 2,
                                                  fontSize: 10,
                                                  fontWeight: 500,
                                                  border: `1px solid ${asciiColors.border}`,
                                                  backgroundColor: "transparent",
                                                  color: asciiColors.muted
                                                }}>
                                                  {log.compliance_requirement}
                                                </span>
                                              )}
                                            </div>
                                            <div style={{ fontSize: 10, color: asciiColors.muted }}>
                                              {formatDate(log.created_at)}
                                            </div>
                                          </div>
                                          <AsciiButton
                                            label="View"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              onViewDetails?.(log);
                                            }}
                                            variant="ghost"
                                            style={{ fontSize: 10, padding: "2px 6px", marginLeft: 8 }}
                                          />
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
            )}
          </div>
        );
      })}
    </div>
  );
};

export default AuditTrailTreeView;
