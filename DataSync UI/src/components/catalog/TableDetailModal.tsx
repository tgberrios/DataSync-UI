import React, { useState, useCallback, useRef, useMemo } from 'react';
import { format } from 'date-fns';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import type { CatalogEntry } from '../../services/api';
import { catalogApi } from '../../services/api';

interface TableDetailModalProps {
  entry: CatalogEntry;
  history: any[];
  loadingHistory: boolean;
  tableStructure: any;
  loadingStructure: boolean;
  onClose: () => void;
  onSave: (entry: CatalogEntry) => void;
}

const TableDetailModal: React.FC<TableDetailModalProps> = ({
  entry,
  history,
  loadingHistory,
  tableStructure,
  loadingStructure,
  onClose,
  onSave
}) => {
  const [activeTab, setActiveTab] = useState<'config' | 'timeline'>('config');
  const [editedEntry, setEditedEntry] = useState(entry);
  const [isClosing, setIsClosing] = useState(false);
  const [resettingCDC, setResettingCDC] = useState(false);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 150);
  }, [onClose]);

  const handleSave = useCallback(() => {
    onSave(editedEntry);
  }, [editedEntry, onSave]);

  const handleResetCDC = useCallback(async () => {
    if (!window.confirm(
      `Are you sure you want to reset CDC for ${entry.schema_name}.${entry.table_name}?\n\n` +
      `This will reset last_change_id to 0, causing all CDC changes to be reprocessed.`
    )) {
      return;
    }

    try {
      setResettingCDC(true);
      await catalogApi.resetCDC(
        entry.schema_name,
        entry.table_name,
        entry.db_engine
      );
      alert('CDC reset successfully! The system will reprocess all changes on the next sync cycle.');
    } catch (error: any) {
      alert(`Error resetting CDC: ${error.message || 'Unknown error'}`);
    } finally {
      setResettingCDC(false);
    }
  }, [entry]);

  const groupedExecutions = useMemo(() => {
    const executions: any[] = [];
    const processed = new Set<number>();
    const MAX_TIME_RANGE_MS = 24 * 60 * 60 * 1000;
    
    history.forEach((exec) => {
      if (processed.has(exec.id)) return;
      
      if (exec.status === 'IN_PROGRESS') {
        const inProgressTime = new Date(exec.start_time).getTime();
        
        const matchingFinal = history.find((e: any) => 
          !processed.has(e.id) &&
          (e.status === 'SUCCESS' || e.status === 'ERROR') &&
          new Date(e.start_time).getTime() > inProgressTime &&
          (new Date(e.start_time).getTime() - inProgressTime) <= MAX_TIME_RANGE_MS
        );
        
        if (matchingFinal) {
          const finalStartTime = new Date(exec.start_time);
          const finalEndTime = new Date(matchingFinal.end_time);
          const duration = Math.floor((finalEndTime.getTime() - finalStartTime.getTime()) / 1000);
          
          executions.push({
            ...matchingFinal,
            start_time: finalStartTime.toISOString(),
            end_time: finalEndTime.toISOString(),
            duration_seconds: duration > 0 ? duration : (matchingFinal.duration_seconds || 0),
          });
          processed.add(exec.id);
          processed.add(matchingFinal.id);
        } else {
          executions.push(exec);
          processed.add(exec.id);
        }
      } else if (exec.status === 'SUCCESS' || exec.status === 'ERROR') {
        const finalTime = new Date(exec.start_time).getTime();
        
        const matchingInProgress = history.find((e: any) => 
          !processed.has(e.id) &&
          e.status === 'IN_PROGRESS' &&
          new Date(e.start_time).getTime() < finalTime &&
          (finalTime - new Date(e.start_time).getTime()) <= MAX_TIME_RANGE_MS
        );
        
        if (matchingInProgress) {
          const finalStartTime = new Date(matchingInProgress.start_time);
          const finalEndTime = new Date(exec.end_time);
          const duration = Math.floor((finalEndTime.getTime() - finalStartTime.getTime()) / 1000);
          
          executions.push({
            ...exec,
            start_time: finalStartTime.toISOString(),
            end_time: finalEndTime.toISOString(),
            duration_seconds: duration > 0 ? duration : (exec.duration_seconds || 0),
          });
          processed.add(exec.id);
          processed.add(matchingInProgress.id);
        } else {
          executions.push(exec);
          processed.add(exec.id);
        }
      }
    });
    
    return executions.sort((a, b) => 
      new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
    );
  }, [history]);

  const maxDuration = Math.max(...groupedExecutions.map(h => h.duration_seconds || 0), 1);

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatDateTime = (dateStr: string) => {
    return format(new Date(dateStr), 'PPpp');
  };

  const getStatusColor = (status: string) => {
    if (status === 'SUCCESS') return asciiColors.accent;
    if (status === 'ERROR') return asciiColors.accent;
    if (status === 'IN_PROGRESS') return asciiColors.accentSoft;
    return asciiColors.muted;
  };

  const BarWithTooltip: React.FC<{ height: number; status: string; tooltipText: string }> = ({ height, status, tooltipText }) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
    const [arrowPosition, setArrowPosition] = useState<'top' | 'bottom'>('top');
    const barRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const statusColor = getStatusColor(status);
    
    const handleMouseEnter = () => {
      setShowTooltip(true);
      setTimeout(() => {
        if (barRef.current && tooltipRef.current) {
          const barRect = barRef.current.getBoundingClientRect();
          const tooltipRect = tooltipRef.current.getBoundingClientRect();
          const viewportHeight = window.innerHeight;
          const viewportWidth = window.innerWidth;
          const spaceAbove = barRect.top;
          const spaceBelow = viewportHeight - barRect.bottom;
          const tooltipHeight = tooltipRect.height || 120;
          const tooltipWidth = tooltipRect.width || 220;
          
          let top = barRect.top - tooltipHeight - 12;
          let left = barRect.left + barRect.width / 2;
          let arrowPos: 'top' | 'bottom' = 'top';
          
          if (spaceAbove < tooltipHeight + 20 && spaceBelow > spaceAbove) {
            top = barRect.bottom + 12;
            arrowPos = 'bottom';
          }
          
          if (left + tooltipWidth / 2 > viewportWidth - 10) {
            left = viewportWidth - tooltipWidth / 2 - 10;
          } else if (left - tooltipWidth / 2 < 10) {
            left = tooltipWidth / 2 + 10;
          }
          
          setTooltipStyle({
            position: 'fixed',
            top: `${top}px`,
            left: `${left}px`,
            transform: 'translateX(-50%)',
            zIndex: 10000
          });
          setArrowPosition(arrowPos);
        }
      }, 0);
    };
    
    return (
      <div
        ref={barRef}
        style={{
          flex: 1,
          minWidth: 20,
          height: `${height}%`,
          backgroundColor: statusColor,
          border: `2px solid ${statusColor}`,
          borderRadius: '2px 2px 0 0',
          position: 'relative',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          fontFamily: "Consolas",
          fontSize: 11
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => {
          setShowTooltip(false);
          setTooltipStyle({});
          setArrowPosition('top');
        }}
      >
        {showTooltip && (
          <div 
            ref={tooltipRef}
            style={{
              ...tooltipStyle,
              backgroundColor: asciiColors.foreground,
              color: asciiColors.background,
              padding: '8px 12px',
              borderRadius: 2,
              fontSize: 11,
              fontFamily: "Consolas",
              whiteSpace: 'pre-line',
              pointerEvents: 'none',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
              minWidth: 220,
              maxWidth: 300,
              textAlign: 'left'
            }}
          >
            {tooltipText}
            <div style={{
              position: 'absolute',
              [arrowPosition === 'top' ? 'top' : 'bottom']: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              border: '6px solid transparent',
              [arrowPosition === 'top' ? 'borderTopColor' : 'borderBottomColor']: asciiColors.foreground
            }} />
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div 
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backdropFilter: "blur(5px)",
          background: "rgba(0, 0, 0, 0.3)",
          zIndex: 999,
          animation: isClosing ? "fadeOut 0.15s ease-out" : "fadeIn 0.15s ease-in"
        }}
        onClick={handleClose}
      />
      <div 
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          animation: isClosing ? "fadeOut 0.15s ease-out" : "fadeIn 0.15s ease-in"
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            handleClose();
          }
        }}
      >
        <div 
          style={{
            background: asciiColors.background,
            borderRadius: 2,
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
            width: "90%",
            maxWidth: 1200,
            maxHeight: "90vh",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            animation: isClosing ? "slideDown 0.15s ease-out" : "slideUp 0.2s ease-out",
            border: `2px solid ${asciiColors.border}`
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{
            padding: "16px 20px",
            borderBottom: `2px solid ${asciiColors.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: asciiColors.backgroundSoft
          }}>
            <h2 style={{
              margin: 0,
              fontSize: 14,
              fontFamily: "Consolas",
              fontWeight: 600,
              color: asciiColors.foreground,
              textTransform: "uppercase"
            }}>
              <span style={{ color: asciiColors.accent, marginRight: 8 }}>{ascii.blockFull}</span>
              {entry.schema_name}.{entry.table_name}
            </h2>
            <AsciiButton
              label="Close"
              onClick={handleClose}
              variant="ghost"
            />
          </div>

          <div style={{
            display: "flex",
            borderBottom: `2px solid ${asciiColors.border}`,
            backgroundColor: asciiColors.backgroundSoft
          }}>
            <button
              onClick={() => setActiveTab('config')}
              style={{
                flex: 1,
                padding: "12px 20px",
                border: "none",
                borderBottom: activeTab === 'config' ? `3px solid ${asciiColors.accent}` : `3px solid transparent`,
                backgroundColor: "transparent",
                color: activeTab === 'config' ? asciiColors.accent : asciiColors.muted,
                fontSize: 12,
                fontFamily: "Consolas",
                fontWeight: activeTab === 'config' ? 600 : 400,
                cursor: "pointer",
                transition: "all 0.2s ease",
                textTransform: "uppercase"
              }}
              onMouseEnter={(e) => {
                if (activeTab !== 'config') {
                  e.currentTarget.style.color = asciiColors.foreground;
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== 'config') {
                  e.currentTarget.style.color = asciiColors.muted;
                }
              }}
            >
              {ascii.v} Configuration
            </button>
            <button
              onClick={() => setActiveTab('timeline')}
              style={{
                flex: 1,
                padding: "12px 20px",
                border: "none",
                borderBottom: activeTab === 'timeline' ? `3px solid ${asciiColors.accent}` : `3px solid transparent`,
                backgroundColor: "transparent",
                color: activeTab === 'timeline' ? asciiColors.accent : asciiColors.muted,
                fontSize: 12,
                fontFamily: "Consolas",
                fontWeight: activeTab === 'timeline' ? 600 : 400,
                cursor: "pointer",
                transition: "all 0.2s ease",
                textTransform: "uppercase"
              }}
              onMouseEnter={(e) => {
                if (activeTab !== 'timeline') {
                  e.currentTarget.style.color = asciiColors.foreground;
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== 'timeline') {
                  e.currentTarget.style.color = asciiColors.muted;
                }
              }}
            >
              {ascii.v} Execution Timeline
            </button>
          </div>
          
          <div style={{
            padding: "20px",
            overflowY: "auto",
            flex: 1,
            fontFamily: "Consolas",
            fontSize: 12
          }}>
            {activeTab === 'config' ? (
              <div style={{
                display: "flex",
                flexDirection: "column",
                gap: 20
              }}>
                <div>
                  <label style={{
                    display: "block",
                    marginBottom: 8,
                    fontSize: 11,
                    fontFamily: "Consolas",
                    fontWeight: 600,
                    color: asciiColors.muted,
                    textTransform: "uppercase",
                    letterSpacing: 0.5
                  }}>
                    {ascii.v} Table
                  </label>
                  <div style={{
                    padding: "10px 12px",
                    border: `1px solid ${asciiColors.border}`,
                    backgroundColor: asciiColors.backgroundSoft,
                    color: asciiColors.muted,
                    fontSize: 12,
                    fontFamily: "Consolas",
                    borderRadius: 2
                  }}>
                    {editedEntry.schema_name}.{editedEntry.table_name}
                  </div>
                </div>

                <div>
                  <label style={{
                    display: "block",
                    marginBottom: 8,
                    fontSize: 11,
                    fontFamily: "Consolas",
                    fontWeight: 600,
                    color: asciiColors.muted,
                    textTransform: "uppercase",
                    letterSpacing: 0.5
                  }}>
                    {ascii.v} Engine
                  </label>
                  <div style={{
                    padding: "10px 12px",
                    border: `1px solid ${asciiColors.border}`,
                    backgroundColor: asciiColors.backgroundSoft,
                    color: asciiColors.muted,
                    fontSize: 12,
                    fontFamily: "Consolas",
                    borderRadius: 2
                  }}>
                    {editedEntry.db_engine}
                  </div>
                </div>

                <div>
                  <label style={{
                    display: "block",
                    marginBottom: 8,
                    fontSize: 11,
                    fontFamily: "Consolas",
                    fontWeight: 600,
                    color: asciiColors.foreground,
                    textTransform: "uppercase",
                    letterSpacing: 0.5
                  }}>
                    {ascii.v} Status
                  </label>
                  <input
                    type="text"
                    value={editedEntry.status}
                    onChange={(e) => setEditedEntry({...editedEntry, status: e.target.value})}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: `1px solid ${asciiColors.border}`,
                      borderRadius: 2,
                      fontSize: 12,
                      fontFamily: "Consolas",
                      backgroundColor: asciiColors.background,
                      color: asciiColors.foreground,
                      outline: "none",
                      transition: "border-color 0.2s ease"
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = asciiColors.accent;
                      e.currentTarget.style.boxShadow = `0 0 0 2px ${asciiColors.accentLight}`;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = asciiColors.border;
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    display: "block",
                    marginBottom: 8,
                    fontSize: 11,
                    fontFamily: "Consolas",
                    fontWeight: 600,
                    color: asciiColors.foreground,
                    textTransform: "uppercase",
                    letterSpacing: 0.5
                  }}>
                    {ascii.v} Active
                  </label>
                  <select
                    value={editedEntry.active.toString()}
                    onChange={(e) => setEditedEntry({...editedEntry, active: e.target.value === 'true'})}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: `1px solid ${asciiColors.border}`,
                      borderRadius: 2,
                      fontSize: 12,
                      fontFamily: "Consolas",
                      backgroundColor: asciiColors.background,
                      color: asciiColors.foreground,
                      cursor: "pointer",
                      outline: "none",
                      transition: "border-color 0.2s ease"
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = asciiColors.accent;
                      e.currentTarget.style.boxShadow = `0 0 0 2px ${asciiColors.accentLight}`;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = asciiColors.border;
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>

                <div>
                  <label style={{
                    display: "block",
                    marginBottom: 8,
                    fontSize: 11,
                    fontFamily: "Consolas",
                    fontWeight: 600,
                    color: asciiColors.foreground,
                    textTransform: "uppercase",
                    letterSpacing: 0.5
                  }}>
                    {ascii.v} Cluster
                  </label>
                  <input
                    type="text"
                    value={editedEntry.cluster_name || ''}
                    onChange={(e) => setEditedEntry({...editedEntry, cluster_name: e.target.value})}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: `1px solid ${asciiColors.border}`,
                      borderRadius: 2,
                      fontSize: 12,
                      fontFamily: "Consolas",
                      backgroundColor: asciiColors.background,
                      color: asciiColors.foreground,
                      outline: "none",
                      transition: "border-color 0.2s ease"
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = asciiColors.accent;
                      e.currentTarget.style.boxShadow = `0 0 0 2px ${asciiColors.accentLight}`;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = asciiColors.border;
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    display: "block",
                    marginBottom: 8,
                    fontSize: 11,
                    fontFamily: "Consolas",
                    fontWeight: 600,
                    color: asciiColors.foreground,
                    textTransform: "uppercase",
                    letterSpacing: 0.5
                  }}>
                    {ascii.v} Cron Schedule
                  </label>
                  <input
                    type="text"
                    value={editedEntry.cron_schedule || ''}
                    onChange={(e) => setEditedEntry({...editedEntry, cron_schedule: e.target.value || null})}
                    placeholder="e.g., 0 */6 * * *"
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: `1px solid ${asciiColors.border}`,
                      borderRadius: 2,
                      fontSize: 12,
                      fontFamily: "Consolas",
                      backgroundColor: asciiColors.background,
                      color: asciiColors.foreground,
                      outline: "none",
                      transition: "border-color 0.2s ease"
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = asciiColors.accent;
                      e.currentTarget.style.boxShadow = `0 0 0 2px ${asciiColors.accentLight}`;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = asciiColors.border;
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  />
                  <div style={{ 
                    marginTop: 4, 
                    fontSize: 10, 
                    color: asciiColors.muted,
                    fontFamily: "Consolas",
                    lineHeight: 1.4
                  }}>
                    Format: minute hour day month day-of-week. Leave empty to disable cron scheduling.
                  </div>
                </div>

                {entry.pk_strategy === 'CDC' && (
                  <div style={{
                    padding: "16px",
                    backgroundColor: asciiColors.backgroundSoft,
                    border: `1px solid ${asciiColors.border}`,
                    borderRadius: 2,
                    marginTop: 12
                  }}>
                    <div style={{
                      fontSize: 11,
                      fontFamily: "Consolas",
                      fontWeight: 600,
                      color: asciiColors.foreground,
                      marginBottom: 12,
                      textTransform: "uppercase"
                    }}>
                      {ascii.v} CDC Management
                    </div>
                    <div style={{
                      fontSize: 11,
                      color: asciiColors.muted,
                      marginBottom: 12,
                      lineHeight: 1.5
                    }}>
                      Reset the CDC change tracking to reprocess all changes from the beginning.
                    </div>
                    <button
                      onClick={handleResetCDC}
                      disabled={resettingCDC}
                      style={{
                        border: `1px solid ${asciiColors.accent}`,
                        backgroundColor: asciiColors.background,
                        color: asciiColors.accent,
                        padding: "6px 12px",
                        fontSize: 12,
                        fontFamily: "Consolas",
                        cursor: resettingCDC ? "not-allowed" : "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        fontWeight: 500,
                        borderRadius: 2,
                        opacity: resettingCDC ? 0.5 : 1,
                        transition: "all 0.2s ease",
                        outline: "none"
                      }}
                    >
                      <span>{ascii.v}</span>
                      <span>{resettingCDC ? "Resetting..." : "Reset CDC"}</span>
                    </button>
                  </div>
                )}

                <div style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 10,
                  marginTop: 12,
                  paddingTop: 20,
                  borderTop: `1px solid ${asciiColors.border}`
                }}>
                  <AsciiButton
                    label="Cancel"
                    onClick={handleClose}
                    variant="ghost"
                  />
                  <AsciiButton
                    label="Save Changes"
                    onClick={() => {
                      handleSave();
                      handleClose();
                    }}
                    variant="primary"
                  />
                </div>
              </div>
            ) : (
              <>
                {loadingHistory ? (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '40px', 
                    color: asciiColors.muted,
                    fontFamily: "Consolas",
                    fontSize: 12
                  }}>
                    {ascii.blockFull} Loading execution history...
                  </div>
                ) : groupedExecutions.length === 0 ? (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '40px', 
                    color: asciiColors.muted,
                    fontFamily: "Consolas",
                    fontSize: 12
                  }}>
                    <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}>
                      {ascii.blockFull}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: asciiColors.foreground }}>
                      No execution history available
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>
                      No execution history available for this table.
                    </div>
                  </div>
                ) : (
                  <AsciiPanel title="EXECUTION DURATION TIMELINE">
                    <div style={{ 
                      position: 'relative', 
                      paddingLeft: '40px',
                      padding: "8px 0"
                    }}>
                      <div style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        fontSize: 11,
                        color: asciiColors.muted,
                        fontFamily: "Consolas",
                        padding: '8px 0',
                        paddingBottom: '28px'
                      }}>
                        <span>{formatDuration(maxDuration)}</span>
                        <span>{formatDuration(Math.floor(maxDuration / 2))}</span>
                        <span style={{ paddingBottom: '8px' }}>0s</span>
                      </div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'flex-end',
                        gap: 8,
                        height: 200,
                        padding: '8px 0'
                      }}>
                        {groupedExecutions.slice(0, 20).reverse().map((exec) => {
                          const height = maxDuration > 0 ? (exec.duration_seconds || 0) / maxDuration * 100 : 0;
                          const tooltipText = `${exec.status}\nDuration: ${formatDuration(exec.duration_seconds || 0)}\nStart: ${formatDateTime(exec.start_time)}\nEnd: ${formatDateTime(exec.end_time)}`;
                          return (
                            <BarWithTooltip
                              key={exec.id}
                              height={height}
                              status={exec.status}
                              tooltipText={tooltipText}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </AsciiPanel>
                )}
                
                <div style={{ marginTop: 20 }}>
                  <MappingGraph
                    table={entry}
                    tableStructure={tableStructure}
                    loading={loadingStructure}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes slideDown {
          from {
            opacity: 1;
            transform: translateY(0);
          }
          to {
            opacity: 0;
            transform: translateY(20px);
          }
        }
      `}</style>
    </>
  );
};

interface MappingGraphProps {
  table: CatalogEntry;
  tableStructure: any;
  loading: boolean;
}

const MappingGraph: React.FC<MappingGraphProps> = ({ table, tableStructure, loading }) => {
  return (
    <div style={{ marginTop: 20 }}>
      <AsciiPanel title="DATA FLOW: SOURCE → TARGET">
      {loading ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px',
          color: asciiColors.muted,
          fontFamily: "Consolas",
          fontSize: 12
        }}>
          {ascii.blockFull} Loading table structure...
        </div>
      ) : !tableStructure ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px', 
          color: asciiColors.muted,
          fontFamily: "Consolas",
          fontSize: 12
        }}>
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}>
            {ascii.blockFull}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: asciiColors.foreground }}>
            Table structure not available
          </div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            The table may not exist yet or there was an error loading it.
          </div>
        </div>
      ) : (
        <div style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 24,
          justifyContent: "center",
          minHeight: 400,
          padding: "8px 0"
        }}>
          <div style={{
            flex: "0 0 300px",
            background: asciiColors.background,
            border: `2px solid ${asciiColors.accent}`,
            borderRadius: 2,
            padding: "16px",
            fontFamily: "Consolas",
            fontSize: 12
          }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingBottom: "8px",
              borderBottom: `2px solid ${asciiColors.border}`,
              marginBottom: "12px"
            }}>
              <div>
                <h3 style={{
                  fontSize: 13,
                  fontWeight: 600,
                  margin: 0,
                  color: asciiColors.accent,
                  fontFamily: "Consolas"
                }}>
                  Source: {table.db_engine}
                </h3>
                <div style={{
                  fontSize: 11,
                  color: asciiColors.muted,
                  fontFamily: "Consolas",
                  marginTop: 4
                }}>
                  {table.schema_name}.{table.table_name}
                </div>
              </div>
            </div>
            {tableStructure.source && tableStructure.source.columns ? (
              <table style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 12,
                fontFamily: "Consolas"
              }}>
                <thead style={{
                  background: asciiColors.backgroundSoft,
                  position: "sticky",
                  top: 0,
                  zIndex: 10
                }}>
                  <tr style={{
                    borderBottom: `2px solid ${asciiColors.border}`
                  }}>
                    <th style={{
                      padding: "8px",
                      textAlign: "left",
                      fontWeight: 600,
                      color: asciiColors.foreground,
                      fontSize: 12,
                      fontFamily: "Consolas",
                      width: 20
                    }}></th>
                    <th style={{
                      padding: "8px",
                      textAlign: "left",
                      fontWeight: 600,
                      color: asciiColors.foreground,
                      fontSize: 12,
                      fontFamily: "Consolas",
                      width: "40%"
                    }}>Name</th>
                    <th style={{
                      padding: "8px",
                      textAlign: "left",
                      fontWeight: 600,
                      color: asciiColors.foreground,
                      fontSize: 12,
                      fontFamily: "Consolas"
                    }}>Data Type</th>
                  </tr>
                </thead>
                <tbody>
                  {tableStructure.source.columns.map((col: any, index: number) => (
                    <tr 
                      key={col.name}
                      style={{
                        borderBottom: `1px solid ${asciiColors.border}`,
                        transition: "background-color 0.2s ease"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = asciiColors.backgroundSoft;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = asciiColors.background;
                      }}
                    >
                      <td style={{
                        padding: "4px 8px",
                        color: asciiColors.muted,
                        fontSize: 11,
                        fontFamily: "Consolas"
                      }}>{index + 1}</td>
                      <td style={{
                        padding: "4px 8px",
                        fontWeight: 500,
                        color: asciiColors.accent,
                        fontFamily: "Consolas"
                      }}>{col.name}</td>
                      <td style={{
                        padding: "4px 8px",
                        color: asciiColors.muted,
                        fontFamily: "Consolas",
                        fontSize: 11
                      }}>{col.type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{
                padding: "20px",
                textAlign: "center",
                color: asciiColors.muted,
                fontSize: 11,
                fontFamily: "Consolas"
              }}>
                Source structure not available
              </div>
            )}
          </div>
          
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flex: "0 0 80px",
            paddingTop: 40
          }}>
            <div style={{
              width: 60,
              height: 4,
              background: asciiColors.accent,
              position: "relative"
            }}>
              <div style={{
                position: "absolute",
                right: -8,
                top: -6,
                width: 0,
                height: 0,
                borderLeft: `12px solid ${asciiColors.accent}`,
                borderTop: "8px solid transparent",
                borderBottom: "8px solid transparent"
              }} />
            </div>
          </div>
          
          <div style={{
            flex: "0 0 350px",
            background: asciiColors.background,
            border: `2px solid ${asciiColors.accent}`,
            borderRadius: 2,
            padding: "16px",
            fontFamily: "Consolas",
            fontSize: 12,
            maxHeight: 600,
            overflowY: "auto"
          }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingBottom: "8px",
              borderBottom: `2px solid ${asciiColors.border}`,
              marginBottom: "12px"
            }}>
              <div>
                <h3 style={{
                  fontSize: 13,
                  fontWeight: 600,
                  margin: 0,
                  color: asciiColors.accent,
                  fontFamily: "Consolas"
                }}>
                  Target: {tableStructure.target?.table || table.table_name}
                </h3>
                <div style={{
                  fontSize: 11,
                  color: asciiColors.muted,
                  fontFamily: "Consolas",
                  marginBottom: "8px"
                }}>
                  {tableStructure.target?.schema || table.schema_name}.{tableStructure.target?.table || table.table_name} (PostgreSQL)
                </div>
              </div>
            </div>
            {tableStructure.target && tableStructure.target.columns ? (
              <table style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 12,
                fontFamily: "Consolas"
              }}>
                <thead style={{
                  background: asciiColors.backgroundSoft,
                  position: "sticky",
                  top: 0,
                  zIndex: 10
                }}>
                  <tr style={{
                    borderBottom: `2px solid ${asciiColors.border}`
                  }}>
                    <th style={{
                      padding: "8px",
                      textAlign: "left",
                      fontWeight: 600,
                      color: asciiColors.foreground,
                      fontSize: 12,
                      fontFamily: "Consolas",
                      width: 20
                    }}></th>
                    <th style={{
                      padding: "8px",
                      textAlign: "left",
                      fontWeight: 600,
                      color: asciiColors.foreground,
                      fontSize: 12,
                      fontFamily: "Consolas",
                      width: "40%"
                    }}>Name</th>
                    <th style={{
                      padding: "8px",
                      textAlign: "left",
                      fontWeight: 600,
                      color: asciiColors.foreground,
                      fontSize: 12,
                      fontFamily: "Consolas"
                    }}>Data Type</th>
                  </tr>
                </thead>
                <tbody>
                  {tableStructure.target.columns.map((col: any, index: number) => (
                    <tr 
                      key={col.name}
                      style={{
                        borderBottom: `1px solid ${asciiColors.border}`,
                        transition: "background-color 0.2s ease"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = asciiColors.backgroundSoft;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = asciiColors.background;
                      }}
                    >
                      <td style={{
                        padding: "4px 8px",
                        color: asciiColors.muted,
                        fontSize: 11,
                        fontFamily: "Consolas"
                      }}>{index + 1}</td>
                      <td style={{
                        padding: "4px 8px",
                        fontWeight: 500,
                        color: asciiColors.accent,
                        fontFamily: "Consolas"
                      }}>{col.name}</td>
                      <td style={{
                        padding: "4px 8px",
                        color: asciiColors.muted,
                        fontFamily: "Consolas",
                        fontSize: 11
                      }}>{col.type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{
                padding: "20px",
                textAlign: "center",
                color: asciiColors.muted,
                fontSize: 11,
                fontFamily: "Consolas"
              }}>
                Target structure not available
              </div>
            )}
          </div>
        </div>
      )}
      </AsciiPanel>
    </div>
  );
};

export default TableDetailModal;

