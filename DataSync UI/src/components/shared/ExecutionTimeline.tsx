import React, { useState, useMemo, useRef } from 'react';
import { format } from 'date-fns';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';


interface ExecutionTimelineProps {
  title: string;
  history: any[];
  loading: boolean;
  tableStructure: any;
  loadingStructure: boolean;
  onClose: () => void;
  renderMappingGraph: (tableStructure: any, loadingStructure: boolean) => React.ReactNode;
}

export const ExecutionTimeline: React.FC<ExecutionTimelineProps> = ({ 
  title, 
  history, 
  loading, 
  tableStructure, 
  loadingStructure,
  onClose,
  renderMappingGraph
}) => {
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
          e.id !== exec.id &&
          (e.status === 'SUCCESS' || e.status === 'ERROR') &&
          new Date(e.start_time).getTime() > inProgressTime &&
          (new Date(e.start_time).getTime() - inProgressTime) <= MAX_TIME_RANGE_MS
        );
        
        if (matchingFinal) {
          const finalStartTime = new Date(exec.start_time);
          const finalEndTime = new Date(matchingFinal.end_time);
          const duration = Math.floor((finalEndTime.getTime() - finalStartTime.getTime()) / 1000);
          
          const inProgressEndTime = new Date(matchingFinal.start_time);
          const inProgressDuration = Math.floor((inProgressEndTime.getTime() - finalStartTime.getTime()) / 1000);
          const finalDuration = matchingFinal.duration_seconds || 0;
          
          executions.push({
            ...matchingFinal,
            id: exec.id,
            start_time: finalStartTime.toISOString(),
            end_time: finalEndTime.toISOString(),
            duration_seconds: duration > 0 ? duration : (matchingFinal.duration_seconds || 0),
            in_progress: {
              start_time: exec.start_time,
              end_time: matchingFinal.start_time,
              duration_seconds: inProgressDuration > 0 ? inProgressDuration : 0
            },
            final_status: matchingFinal.status,
            status_flow: ['IN_PROGRESS', matchingFinal.status],
            final_duration: finalDuration
          });
          processed.add(exec.id);
          processed.add(matchingFinal.id);
        } else {
          executions.push({
            ...exec,
            status_flow: ['IN_PROGRESS'],
            final_status: 'IN_PROGRESS'
          });
          processed.add(exec.id);
        }
      } else if (exec.status === 'SUCCESS' || exec.status === 'ERROR') {
        const finalTime = new Date(exec.start_time).getTime();
        
        const matchingInProgress = history.find((e: any) => 
          !processed.has(e.id) &&
          e.id !== exec.id &&
          e.status === 'IN_PROGRESS' &&
          new Date(e.start_time).getTime() < finalTime &&
          (finalTime - new Date(e.start_time).getTime()) <= MAX_TIME_RANGE_MS
        );
        
        if (matchingInProgress) {
          const finalStartTime = new Date(matchingInProgress.start_time);
          const finalEndTime = new Date(exec.end_time);
          const duration = Math.floor((finalEndTime.getTime() - finalStartTime.getTime()) / 1000);
          
          const inProgressEndTime = new Date(exec.start_time);
          const inProgressDuration = Math.floor((inProgressEndTime.getTime() - finalStartTime.getTime()) / 1000);
          const finalDuration = exec.duration_seconds || 0;
          
          executions.push({
            ...exec,
            start_time: finalStartTime.toISOString(),
            end_time: finalEndTime.toISOString(),
            duration_seconds: duration > 0 ? duration : (exec.duration_seconds || 0),
            in_progress: {
              start_time: matchingInProgress.start_time,
              end_time: exec.start_time,
              duration_seconds: inProgressDuration > 0 ? inProgressDuration : 0
            },
            final_status: exec.status,
            status_flow: ['IN_PROGRESS', exec.status],
            final_duration: finalDuration
          });
          processed.add(exec.id);
          processed.add(matchingInProgress.id);
        } else {
          executions.push({
            ...exec,
            status_flow: [exec.status],
            final_status: exec.status
          });
          processed.add(exec.id);
        }
      } else {
        executions.push({
          ...exec,
          status_flow: [exec.status],
          final_status: exec.status
        });
        processed.add(exec.id);
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

  const SegmentedBarWithTooltip: React.FC<{ 
    height: number; 
    exec: any;
    tooltipText: string;
  }> = ({ height, exec, tooltipText }) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
    const [arrowPosition, setArrowPosition] = useState<'top' | 'bottom'>('top');
    const barRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    
    const inProgressColor = asciiColors.accentSoft;
    const finalColor = exec.final_status === 'SUCCESS' ? asciiColors.accent : 
                      exec.final_status === 'ERROR' ? asciiColors.foreground : 
                      asciiColors.muted;
    
    const totalDuration = exec.duration_seconds || 1;
    const inProgressDuration = exec.in_progress?.duration_seconds || 0;
    const finalDuration = exec.final_duration || (exec.in_progress ? Math.max(0, totalDuration - inProgressDuration) : totalDuration);
    
    let inProgressHeightPercent = 0;
    let finalHeightPercent = 100;
    
    if (exec.in_progress && totalDuration > 0) {
      const totalParts = inProgressDuration + finalDuration;
      if (totalParts > 0) {
        inProgressHeightPercent = (inProgressDuration / totalParts) * 100;
        finalHeightPercent = (finalDuration / totalParts) * 100;
      } else {
        inProgressHeightPercent = 50;
        finalHeightPercent = 50;
      }
    }
    
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
    
    const minHeight = Math.max(height, 2);
    
    return (
      <div
        ref={barRef}
        style={{
          flex: 1,
          minWidth: 20,
          height: `${minHeight}%`,
          minHeight: '4px',
          position: 'relative',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          fontFamily: "Consolas",
          fontSize: 11,
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '2px 2px 0 0',
          overflow: 'hidden'
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => {
          setShowTooltip(false);
          setTooltipStyle({});
          setArrowPosition('top');
        }}
      >
        {exec.in_progress && inProgressHeightPercent > 0 && (
          <div style={{
            height: `${inProgressHeightPercent}%`,
            backgroundColor: inProgressColor,
            border: `2px solid ${inProgressColor}`,
            borderBottom: 'none',
            minHeight: inProgressHeightPercent < 5 ? '5%' : undefined
          }} />
        )}
        <div style={{
          height: exec.in_progress ? `${finalHeightPercent}%` : '100%',
          backgroundColor: finalColor,
          border: `2px solid ${finalColor}`,
          borderTop: exec.in_progress ? 'none' : undefined,
          borderRadius: exec.in_progress ? '0' : '2px 2px 0 0',
          minHeight: finalHeightPercent < 5 ? '5%' : undefined
        }} />
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
              borderTop: arrowPosition === 'top' ? `6px solid ${asciiColors.foreground}` : '6px solid transparent',
              borderBottom: arrowPosition === 'bottom' ? `6px solid ${asciiColors.foreground}` : '6px solid transparent',
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent'
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
              {title}
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
                  No execution history available.
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
                        const duration = exec.duration_seconds || 0;
                        let height = 0;
                        if (maxDuration > 0 && duration > 0) {
                          height = (duration / maxDuration) * 100;
                        } else if (duration > 0) {
                          height = 1;
                        } else {
                          height = 1;
                        }
                        height = Math.max(height, 2);
                        
                        let tooltipText = '';
                        if (exec.in_progress) {
                          const statusFlow = exec.status_flow ? exec.status_flow.join(' → ') : exec.final_status;
                          tooltipText = `Status Flow: ${statusFlow}\n\n`;
                          tooltipText += `IN_PROGRESS:\n`;
                          tooltipText += `  Duration: ${formatDuration(exec.in_progress.duration_seconds || 0)}\n`;
                          tooltipText += `  Start: ${formatDateTime(exec.in_progress.start_time)}\n`;
                          tooltipText += `  End: ${formatDateTime(exec.in_progress.end_time)}\n\n`;
                          tooltipText += `${exec.final_status}:\n`;
                          tooltipText += `  Duration: ${formatDuration(exec.final_duration || 0)}\n`;
                          tooltipText += `  Start: ${formatDateTime(exec.start_time)}\n`;
                          tooltipText += `  End: ${formatDateTime(exec.end_time)}\n\n`;
                          tooltipText += `Total Duration: ${formatDuration(exec.duration_seconds || 0)}\n`;
                          tooltipText += `Rows Processed: ${exec.total_rows_processed || 0}`;
                          if (exec.error_message) {
                            tooltipText += `\nError: ${exec.error_message}`;
                          }
                        } else {
                          tooltipText = `Status: ${exec.final_status || exec.status}\n`;
                          tooltipText += `Duration: ${formatDuration(exec.duration_seconds || 0)}\n`;
                          tooltipText += `Start: ${formatDateTime(exec.start_time)}\n`;
                          tooltipText += `End: ${formatDateTime(exec.end_time)}`;
                          if (exec.total_rows_processed) {
                            tooltipText += `\nRows Processed: ${exec.total_rows_processed}`;
                          }
                          if (exec.error_message) {
                            tooltipText += `\nError: ${exec.error_message}`;
                          }
                        }
                        
                        return (
                          <SegmentedBarWithTooltip
                            key={exec.id}
                            height={height}
                            exec={exec}
                            tooltipText={tooltipText}
                          />
                        );
                      })}
                    </div>
                  </div>
                </AsciiPanel>
                
                <div style={{ marginTop: 20 }}>
                  {renderMappingGraph(tableStructure, loadingStructure)}
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

