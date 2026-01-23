import React, { useState, useMemo } from 'react';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { theme } from '../../theme/theme';
import type { BackupEntry } from '../../services/api';

interface EngineNode {
  engine: string;
  backups: BackupEntry[];
}

interface BackupManagerTreeViewProps {
  backups: BackupEntry[];
  onViewHistory?: (backupId: number) => void;
  onToggleSchedule?: (backup: BackupEntry) => void;
  onRestore?: (backupId: number) => void;
  onDelete?: (backupId: number) => void;
  onSelect?: (backup: BackupEntry) => void;
}

const BackupManagerTreeView: React.FC<BackupManagerTreeViewProps> = ({ 
  backups, 
  onViewHistory,
  onToggleSchedule,
  onRestore,
  onDelete,
  onSelect
}) => {
  const [expandedEngines, setExpandedEngines] = useState<Set<string>>(new Set());

  const treeData = useMemo(() => {
    const engines = new Map<string, EngineNode>();

    backups.forEach(backup => {
      const engine = backup.db_engine || 'Other';

      if (!engines.has(engine)) {
        engines.set(engine, {
          engine,
          backups: []
        });
      }

      engines.get(engine)!.backups.push(backup);
    });

    return Array.from(engines.values()).sort((a, b) => a.engine.localeCompare(b.engine));
  }, [backups]);

  const toggleEngine = (engine: string) => {
    setExpandedEngines(prev => {
      const next = new Set(prev);
      if (next.has(engine)) {
        next.delete(engine);
      } else {
        next.add(engine);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return asciiColors.accent;
      case 'failed':
        return asciiColors.foreground;
      case 'in_progress':
        return asciiColors.muted;
      case 'pending':
        return asciiColors.muted;
      default:
        return asciiColors.foreground;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  if (backups.length === 0) {
    return (
      <div style={{
        padding: theme.spacing.lg,
        textAlign: 'center',
        color: asciiColors.muted,
        fontFamily: 'Consolas',
        fontSize: 12
      }}>
        {ascii.blockEmpty} No backups found
      </div>
    );
  }

  return (
    <div style={{
      fontFamily: "Consolas",
      fontSize: 12,
      color: asciiColors.foreground
    }}>
      {treeData.map((engineNode, engineIdx) => {
        const isEngineExpanded = expandedEngines.has(engineNode.engine);
        const isEngineLast = engineIdx === treeData.length - 1;

        return (
          <div key={engineNode.engine} style={{ marginBottom: 4 }}>
            {/* Engine Level */}
            <div
              onClick={() => toggleEngine(engineNode.engine)}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "10px 8px",
                cursor: "pointer",
                borderLeft: `2px solid ${asciiColors.accent}`,
                backgroundColor: isEngineExpanded ? asciiColors.backgroundSoft : asciiColors.background,
                transition: "all 0.15s ease",
                marginBottom: 2
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = asciiColors.backgroundSoft;
              }}
              onMouseLeave={(e) => {
                if (!isEngineExpanded) {
                  e.currentTarget.style.backgroundColor = asciiColors.background;
                }
              }}
            >
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
                color: asciiColors.accent,
                fontSize: 12,
                flex: 1
              }}>
                {engineNode.engine}
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
                {engineNode.backups.length}
              </span>
            </div>

            {isEngineExpanded && (
              <div style={{ paddingLeft: 24 }}>
                {engineNode.backups.map((backup, backupIdx) => {
                  const isBackupLast = backupIdx === engineNode.backups.length - 1;

                  return (
                    <div
                      key={backup.backup_id}
                      onClick={() => onSelect?.(backup)}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        padding: "10px 8px",
                        marginLeft: 8,
                        marginBottom: 2,
                        borderLeft: `1px solid ${asciiColors.border}`,
                        backgroundColor: "transparent",
                        transition: "all 0.15s ease",
                        cursor: "pointer"
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
                      {renderTreeLine(1, isBackupLast)}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                          <span style={{
                            fontWeight: 600,
                            color: asciiColors.foreground,
                            fontSize: 11
                          }}>
                            {backup.backup_name}
                          </span>
                          <span style={{
                            padding: "2px 6px",
                            borderRadius: 2,
                            fontSize: 10,
                            fontWeight: 500,
                            border: `1px solid ${getStatusColor(backup.status)}`,
                            color: getStatusColor(backup.status),
                            backgroundColor: "transparent"
                          }}>
                            {backup.status.toUpperCase()}
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
                            {backup.backup_type.toUpperCase()}
                          </span>
                          {backup.is_scheduled && (
                            <span style={{
                              padding: "2px 6px",
                              borderRadius: 2,
                              fontSize: 10,
                              fontWeight: 500,
                              border: `1px solid ${asciiColors.accent}`,
                              color: asciiColors.accent,
                              backgroundColor: "transparent"
                            }}>
                              SCHEDULED
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 10, color: asciiColors.muted, marginBottom: 4 }}>
                          Database: {backup.database_name} | Size: {formatFileSize(backup.file_size)}
                        </div>
                        <div style={{ fontSize: 10, color: asciiColors.muted, marginBottom: 4 }}>
                          Created: {new Date(backup.created_at).toLocaleString()}
                          {backup.next_run_at && ` | Next: ${new Date(backup.next_run_at).toLocaleString()}`}
                        </div>
                        {backup.cron_schedule && (
                          <div style={{ fontSize: 10, color: asciiColors.muted }}>
                            Schedule: {backup.cron_schedule}
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginLeft: 8 }}>
                        <AsciiButton
                          label="History"
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewHistory?.(backup.backup_id);
                          }}
                          variant="ghost"
                          style={{ fontSize: 10, padding: "2px 6px" }}
                        />
                        {backup.cron_schedule && (
                          <AsciiButton
                            label={backup.is_scheduled ? "Disable" : "Enable"}
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleSchedule?.(backup);
                            }}
                            variant="ghost"
                            style={{ fontSize: 10, padding: "2px 6px" }}
                          />
                        )}
                        {backup.status === 'completed' && (
                          <AsciiButton
                            label="Restore"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRestore?.(backup.backup_id);
                            }}
                            variant="ghost"
                            style={{ fontSize: 10, padding: "2px 6px" }}
                          />
                        )}
                        <AsciiButton
                          label="Delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete?.(backup.backup_id);
                          }}
                          variant="ghost"
                          style={{ fontSize: 10, padding: "2px 6px" }}
                        />
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
  );
};

export default BackupManagerTreeView;
