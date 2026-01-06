import React, { useState, useRef, useMemo } from 'react';
import { format } from 'date-fns';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import type { CatalogEntry } from '../../services/api';

interface ExecutionTimelineProps {
  table: CatalogEntry;
  history: any[];
  loading: boolean;
  tableStructure: any;
  loadingStructure: boolean;
  onClose: () => void;
}

const ExecutionTimeline: React.FC<ExecutionTimelineProps> = ({ 
  table, 
  history, 
  loading, 
  tableStructure, 
  loadingStructure, 
  onClose 
}) => {
  const groupedExecutions = useMemo(() => {
    return history.map((session: any) => ({
      ...session,
      start_time: session.start_time instanceof Date ? session.start_time.toISOString() : session.start_time,
      end_time: session.end_time instanceof Date ? session.end_time.toISOString() : session.end_time,
    })).sort((a, b) => 
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
    if (status === 'LISTENING_CHANGES') return asciiColors.accent;
    if (status === 'ERROR') return asciiColors.red || '#ff4444';
    if (status === 'IN_PROGRESS') return asciiColors.accentSoft;
    if (status === 'FULL_LOAD') return asciiColors.accent;
    if (status === 'NO_DATA') return asciiColors.muted;
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
          animation: "fadeIn 0.2s ease-in"
        }}
        onClick={onClose}
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
          animation: "fadeIn 0.2s ease-in"
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
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
            animation: "slideIn 0.3s ease-out",
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
              EXECUTION TIMELINE: {table.schema_name}.{table.table_name}
            </h2>
            <AsciiButton
              label="Close"
              onClick={onClose}
              variant="ghost"
            />
          </div>
          
          <div style={{
            padding: "20px",
            overflowY: "auto",
            flex: 1,
            fontFamily: "Consolas",
            fontSize: 12
          }}>
            {loading ? (
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
              <>
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
                        const statusFlow = exec.status_flow ? exec.status_flow.join(' → ') : exec.status;
                        const tooltipText = `Status: ${exec.status}\nFlow: ${statusFlow}\nDuration: ${formatDuration(exec.duration_seconds || 0)}\nRows: ${exec.total_rows_processed || 0}\nStart: ${formatDateTime(exec.start_time)}\nEnd: ${formatDateTime(exec.end_time)}${exec.error_message ? `\nError: ${exec.error_message}` : ''}`;
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
                
                <div style={{ marginTop: 20 }}>
                  <MappingGraph
                    table={table}
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
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
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

export default ExecutionTimeline;

