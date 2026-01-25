import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { theme } from '../../theme/theme';

interface AlertRule {
  id: number;
  rule_name: string;
  alert_type: string;
  severity: string;
  evaluation_type?: string;
  threshold_low?: number;
  threshold_warning?: number;
  threshold_critical?: number;
  condition_expression: string;
  threshold_value?: string;
  custom_message?: string;
  db_engine?: string;
  connection_string?: string;
  query_type: string;
  check_interval: number;
  is_system_rule: boolean;
  query_template?: string;
  webhook_ids: number[];
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface SeverityNode {
  severity: string;
  engines: Map<string, EngineNode>;
}

interface EngineNode {
  engine: string;
  rules: AlertRule[];
}

interface AlertRulesTreeViewProps {
  rules: AlertRule[];
  onTest?: (rule: AlertRule) => void;
  onToggle?: (rule: AlertRule) => void;
  onEdit?: (rule: AlertRule) => void;
  onDelete?: (rule: AlertRule) => void;
}

const AlertRulesTreeView: React.FC<AlertRulesTreeViewProps> = ({ 
  rules, 
  onTest,
  onToggle,
  onEdit,
  onDelete
}) => {
  const [expandedSeverities, setExpandedSeverities] = useState<Set<string>>(new Set());
  const [expandedEngines, setExpandedEngines] = useState<Set<string>>(new Set());

  const treeData = useMemo(() => {
    const severities = new Map<string, SeverityNode>();

    rules.forEach(rule => {
      const severity = rule.severity || 'UNKNOWN';
      const engine = rule.db_engine || 'ALL';

      if (!severities.has(severity)) {
        severities.set(severity, {
          severity,
          engines: new Map()
        });
      }

      const severityNode = severities.get(severity)!;

      if (!severityNode.engines.has(engine)) {
        severityNode.engines.set(engine, {
          engine,
          rules: []
        });
      }

      severityNode.engines.get(engine)!.rules.push(rule);
    });

    return Array.from(severities.values()).sort((a, b) => {
      const order = ['CRITICAL', 'WARNING', 'INFO', 'UNKNOWN'];
      return order.indexOf(a.severity) - order.indexOf(b.severity);
    });
  }, [rules]);

  const toggleSeverity = (severity: string) => {
    setExpandedSeverities(prev => {
      const next = new Set(prev);
      if (next.has(severity)) {
        next.delete(severity);
        const severityNode = treeData.find(s => s.severity === severity);
        if (severityNode) {
          severityNode.engines.forEach(engine => {
            const engineKey = `${severity}.${engine.engine}`;
            setExpandedEngines(prevEngines => {
              const nextEngines = new Set(prevEngines);
              nextEngines.delete(engineKey);
              return nextEngines;
            });
          });
        }
      } else {
        next.add(severity);
      }
      return next;
    });
  };

  const toggleEngine = (severity: string, engine: string) => {
    const key = `${severity}.${engine}`;
    setExpandedEngines(prev => {
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

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return asciiColors.foreground;
      case 'WARNING': return asciiColors.muted;
      case 'INFO': return asciiColors.accent;
      default: return asciiColors.muted;
    }
  };

  if (rules.length === 0) {
    return (
      <div style={{
        padding: theme.spacing.lg,
        textAlign: 'center',
        color: asciiColors.muted,
        fontFamily: 'Consolas',
        fontSize: 12
      }}>
        {ascii.blockEmpty} No alert rules configured
      </div>
    );
  }

  return (
    <div style={{
      fontFamily: "Consolas",
      fontSize: 12,
      color: asciiColors.foreground
    }}>
      {treeData.map((severityNode, severityIdx) => {
        const isSeverityExpanded = expandedSeverities.has(severityNode.severity);
        const severityEngines = Array.from(severityNode.engines.values());
        const isSeverityLast = severityIdx === treeData.length - 1;

        return (
          <div key={severityNode.severity} style={{ marginBottom: 4 }}>
            {/* Severity Level */}
            <div
              onClick={() => toggleSeverity(severityNode.severity)}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "10px 8px",
                cursor: "pointer",
                borderLeft: `2px solid ${getSeverityColor(severityNode.severity)}`,
                backgroundColor: isSeverityExpanded ? asciiColors.backgroundSoft : asciiColors.background,
                transition: "all 0.15s ease",
                marginBottom: 2
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = asciiColors.backgroundSoft;
              }}
              onMouseLeave={(e) => {
                if (!isSeverityExpanded) {
                  e.currentTarget.style.backgroundColor = asciiColors.background;
                }
              }}
            >
              <span style={{
                marginRight: 8,
                color: isSeverityExpanded ? asciiColors.accent : asciiColors.muted,
                fontSize: 10,
                transition: "transform 0.15s ease",
                display: "inline-block",
                transform: isSeverityExpanded ? "rotate(90deg)" : "rotate(0deg)"
              }}>
                {ascii.arrowRight}
              </span>
              <span style={{
                padding: "2px 8px",
                borderRadius: 2,
                fontSize: 10,
                fontWeight: 600,
                border: `1px solid ${getSeverityColor(severityNode.severity)}`,
                color: getSeverityColor(severityNode.severity),
                backgroundColor: "transparent"
              }}>
                {severityNode.severity}
              </span>
              <span style={{
                padding: "2px 8px",
                borderRadius: 2,
                fontSize: 10,
                fontWeight: 500,
                border: `1px solid ${asciiColors.border}`,
                backgroundColor: asciiColors.backgroundSoft,
                color: asciiColors.foreground,
                marginLeft: 8
              }}>
                {severityEngines.reduce((sum, e) => sum + e.rules.length, 0)}
              </span>
            </div>

            {isSeverityExpanded && (
              <div style={{ paddingLeft: 24 }}>
                {severityEngines.map((engine, engineIdx) => {
                  const engineKey = `${severityNode.severity}.${engine.engine}`;
                  const isEngineExpanded = expandedEngines.has(engineKey);
                  const isEngineLast = engineIdx === severityEngines.length - 1;

                  return (
                    <div key={engineKey}>
                      {/* Engine Level */}
                      <div
                        onClick={() => toggleEngine(severityNode.severity, engine.engine)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          padding: "8px 8px",
                          marginLeft: 8,
                          marginBottom: 2,
                          borderLeft: `2px solid ${asciiColors.border}`,
                          backgroundColor: isEngineExpanded ? asciiColors.backgroundSoft : "transparent",
                          transition: "all 0.15s ease",
                          cursor: "pointer"
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = asciiColors.backgroundSoft;
                          e.currentTarget.style.borderLeftColor = asciiColors.accent;
                        }}
                        onMouseLeave={(e) => {
                          if (!isEngineExpanded) {
                            e.currentTarget.style.backgroundColor = "transparent";
                            e.currentTarget.style.borderLeftColor = asciiColors.border;
                          }
                        }}
                      >
                        {renderTreeLine(1, isEngineLast)}
                        <span style={{
                          marginRight: 8,
                          color: isEngineExpanded ? asciiColors.accent : asciiColors.muted,
                          fontSize: 10,
                          transition: "transform 0.15s ease",
                          display: "inline-block",
                          transform: isEngineExpanded ? "rotate(90deg)" : "rotate(0deg)"
                        }}>
                          {ascii.arrowRight}
                        </span>
                        <span style={{
                          fontWeight: 600,
                          color: asciiColors.foreground,
                          fontSize: 11,
                          flex: 1
                        }}>
                          {engine.engine}
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
                          {engine.rules.length}
                        </span>
                      </div>

                      {isEngineExpanded && (
                        <div style={{ paddingLeft: 24 }}>
                          {engine.rules.map((rule, ruleIdx) => {
                            const isRuleLast = ruleIdx === engine.rules.length - 1;

                            return (
                              <div
                                key={rule.id}
                                style={{
                                  display: "flex",
                                  alignItems: "flex-start",
                                  padding: "10px 8px",
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
                                {renderTreeLine(2, isRuleLast)}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                                    <span style={{
                                      fontWeight: 600,
                                      color: asciiColors.foreground,
                                      fontSize: 11
                                    }}>
                                      {rule.rule_name}
                                    </span>
                                    <span style={{
                                      padding: "2px 6px",
                                      borderRadius: 2,
                                      fontSize: 10,
                                      fontWeight: 500,
                                      border: `1px solid ${asciiColors.accent}`,
                                      color: asciiColors.accent,
                                      backgroundColor: "transparent"
                                    }}>
                                      {rule.query_type}
                                    </span>
                                    <span style={{
                                      padding: "2px 6px",
                                      borderRadius: 2,
                                      fontSize: 10,
                                      fontWeight: 500,
                                      border: `1px solid ${rule.enabled ? asciiColors.accent : asciiColors.muted}`,
                                      color: rule.enabled ? asciiColors.accent : asciiColors.muted,
                                      backgroundColor: "transparent"
                                    }}>
                                      {rule.enabled ? 'ENABLED' : 'DISABLED'}
                                    </span>
                                    {rule.is_system_rule && (
                                      <span style={{
                                        padding: "2px 6px",
                                        borderRadius: 2,
                                        fontSize: 10,
                                        fontWeight: 600,
                                        border: `1px solid ${asciiColors.accent}`,
                                        color: asciiColors.accent,
                                        backgroundColor: "transparent"
                                      }}>
                                        SYSTEM
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: 10, color: asciiColors.muted, marginBottom: 4 }}>
                                    Interval: {rule.check_interval}s
                                    {rule.threshold_value && ` | Threshold: ${rule.threshold_value}`}
                                  </div>
                                  {rule.condition_expression && (
                                    <div style={{
                                      fontSize: 10,
                                      color: asciiColors.foreground,
                                      fontFamily: 'Consolas',
                                      padding: '4px 8px',
                                      backgroundColor: asciiColors.backgroundSoft,
                                      borderRadius: 2,
                                      border: `1px solid ${asciiColors.border}`,
                                      marginBottom: 4,
                                      maxHeight: '60px',
                                      overflow: 'auto',
                                      whiteSpace: 'pre-wrap',
                                      wordBreak: 'break-all'
                                    }}>
                                      {rule.condition_expression.length > 150 
                                        ? rule.condition_expression.substring(0, 150) + '...'
                                        : rule.condition_expression}
                                    </div>
                                  )}
                                  <div style={{ fontSize: 10, color: asciiColors.muted }}>
                                    Created: {format(new Date(rule.created_at), 'yyyy-MM-dd HH:mm:ss')}
                                  </div>
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 4, marginLeft: 8 }}>
                                  <AsciiButton
                                    label="Test"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onTest?.(rule);
                                    }}
                                    variant="ghost"
                                    style={{ fontSize: 10, padding: "2px 6px" }}
                                  />
                                  {!rule.is_system_rule && (
                                    <>
                                      <AsciiButton
                                        label={rule.enabled ? "Disable" : "Enable"}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onToggle?.(rule);
                                        }}
                                        variant="ghost"
                                        style={{ fontSize: 10, padding: "2px 6px" }}
                                      />
                                      <AsciiButton
                                        label="Edit"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onEdit?.(rule);
                                        }}
                                        variant="ghost"
                                        style={{ fontSize: 10, padding: "2px 6px" }}
                                      />
                                      <AsciiButton
                                        label="Delete"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onDelete?.(rule);
                                        }}
                                        variant="ghost"
                                        style={{ fontSize: 10, padding: "2px 6px" }}
                                      />
                                    </>
                                  )}
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

export default AlertRulesTreeView;
