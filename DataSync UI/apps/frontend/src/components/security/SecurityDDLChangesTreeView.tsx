import React, { useState, useMemo } from 'react';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { theme } from '../../theme/theme';

interface DDLChange {
  execution_timestamp: string;
  change_type: string;
  schema_name: string;
  object_name: string;
  object_type: string;
  executed_by: string;
}

interface DateNode {
  date: string;
  changeTypes: Map<string, ChangeTypeNode>;
}

interface ChangeTypeNode {
  changeType: string;
  changes: DDLChange[];
}

interface SecurityDDLChangesTreeViewProps {
  changes: DDLChange[];
}

const SecurityDDLChangesTreeView: React.FC<SecurityDDLChangesTreeViewProps> = ({ 
  changes
}) => {
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [expandedChangeTypes, setExpandedChangeTypes] = useState<Set<string>>(new Set());

  const treeData = useMemo(() => {
    const dates = new Map<string, DateNode>();

    changes.forEach(change => {
      const date = change.execution_timestamp 
        ? new Date(change.execution_timestamp).toLocaleDateString() 
        : 'Unknown';
      const changeType = change.change_type || 'Unknown';

      if (!dates.has(date)) {
        dates.set(date, {
          date,
          changeTypes: new Map()
        });
      }

      const dateNode = dates.get(date)!;

      if (!dateNode.changeTypes.has(changeType)) {
        dateNode.changeTypes.set(changeType, {
          changeType,
          changes: []
        });
      }

      dateNode.changeTypes.get(changeType)!.changes.push(change);
    });

    return Array.from(dates.values()).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [changes]);

  const toggleDate = (date: string) => {
    setExpandedDates(prev => {
      const next = new Set(prev);
      if (next.has(date)) {
        next.delete(date);
        const dateNode = treeData.find(d => d.date === date);
        if (dateNode) {
          dateNode.changeTypes.forEach(changeType => {
            const changeTypeKey = `${date}.${changeType.changeType}`;
            setExpandedChangeTypes(prevTypes => {
              const nextTypes = new Set(prevTypes);
              nextTypes.delete(changeTypeKey);
              return nextTypes;
            });
          });
        }
      } else {
        next.add(date);
      }
      return next;
    });
  };

  const toggleChangeType = (date: string, changeType: string) => {
    const key = `${date}.${changeType}`;
    setExpandedChangeTypes(prev => {
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

  const getChangeTypeColor = (changeType: string) => {
    switch (changeType) {
      case 'DROP': return asciiColors.foreground;
      case 'ALTER': return asciiColors.accent;
      case 'CREATE': return asciiColors.accent;
      default: return asciiColors.accent;
    }
  };

  const formatDate = (date: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleString();
  };

  if (changes.length === 0) {
    return (
      <div style={{
        padding: theme.spacing.lg,
        textAlign: 'center',
        color: asciiColors.muted,
        fontFamily: 'Consolas',
        fontSize: 12
      }}>
        No DDL changes found
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
        const dateChangeTypes = Array.from(dateNode.changeTypes.values());
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
                {dateChangeTypes.reduce((sum, ct) => sum + ct.changes.length, 0)}
              </span>
            </div>

            {isDateExpanded && (
              <div style={{ paddingLeft: 24 }}>
                {dateChangeTypes.map((changeTypeNode, typeIdx) => {
                  const changeTypeKey = `${dateNode.date}.${changeTypeNode.changeType}`;
                  const isChangeTypeExpanded = expandedChangeTypes.has(changeTypeKey);
                  const isChangeTypeLast = typeIdx === dateChangeTypes.length - 1;

                  return (
                    <div key={changeTypeKey}>
                      {/* Change Type Level */}
                      <div
                        onClick={() => toggleChangeType(dateNode.date, changeTypeNode.changeType)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          padding: "8px 8px",
                          marginLeft: 8,
                          marginBottom: 2,
                          borderLeft: `2px solid ${asciiColors.border}`,
                          backgroundColor: isChangeTypeExpanded ? asciiColors.backgroundSoft : "transparent",
                          transition: "all 0.15s ease",
                          cursor: "pointer"
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = asciiColors.backgroundSoft;
                          e.currentTarget.style.borderLeftColor = asciiColors.accent;
                        }}
                        onMouseLeave={(e) => {
                          if (!isChangeTypeExpanded) {
                            e.currentTarget.style.backgroundColor = "transparent";
                            e.currentTarget.style.borderLeftColor = asciiColors.border;
                          }
                        }}
                      >
                        {renderTreeLine(1, isChangeTypeLast)}
                        <span style={{
                          marginRight: 8,
                          color: isChangeTypeExpanded ? asciiColors.accent : asciiColors.muted,
                          fontSize: 10,
                          transition: "transform 0.15s ease",
                          display: "inline-block",
                          transform: isChangeTypeExpanded ? "rotate(90deg)" : "rotate(0deg)"
                        }}>
                          {ascii.arrowRight}
                        </span>
                        <span style={{
                          padding: "2px 6px",
                          borderRadius: 2,
                          fontSize: 10,
                          fontWeight: 600,
                          border: `1px solid ${getChangeTypeColor(changeTypeNode.changeType)}`,
                          color: getChangeTypeColor(changeTypeNode.changeType),
                          backgroundColor: "transparent"
                        }}>
                          {changeTypeNode.changeType}
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
                          {changeTypeNode.changes.length}
                        </span>
                      </div>

                      {isChangeTypeExpanded && (
                        <div style={{ paddingLeft: 24 }}>
                          {changeTypeNode.changes.map((change, changeIdx) => {
                            const isChangeLast = changeIdx === changeTypeNode.changes.length - 1;

                            return (
                              <div
                                key={changeIdx}
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
                                {renderTreeLine(2, isChangeLast)}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                                    <span style={{
                                      fontWeight: 500,
                                      color: asciiColors.foreground,
                                      fontSize: 11,
                                      fontFamily: 'Consolas'
                                    }}>
                                      {change.schema_name}.{change.object_name}
                                    </span>
                                    <span style={{
                                      padding: "2px 6px",
                                      borderRadius: 2,
                                      fontSize: 10,
                                      fontWeight: 500,
                                      border: `1px solid ${asciiColors.border}`,
                                      color: asciiColors.muted,
                                      backgroundColor: "transparent"
                                    }}>
                                      {change.object_type}
                                    </span>
                                    <span style={{
                                      fontSize: 10,
                                      color: asciiColors.muted,
                                      fontFamily: 'Consolas'
                                    }}>
                                      by {change.executed_by}
                                    </span>
                                  </div>
                                  <div style={{ fontSize: 10, color: asciiColors.muted, fontFamily: 'Consolas' }}>
                                    {formatDate(change.execution_timestamp)}
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

export default SecurityDDLChangesTreeView;
