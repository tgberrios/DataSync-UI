import React from 'react';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';


interface MappingGraphProps {
  tableStructure: any;
  loading: boolean;
  sourceTitle: string;
  sourceType: string;
  sourceInfo: Array<{ label: string; value: string }>;
}

export const MappingGraph: React.FC<MappingGraphProps> = ({ 
  tableStructure, 
  loading, 
  sourceTitle,
  sourceType,
  sourceInfo
}) => {
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
                    {sourceTitle}
                  </h3>
                  <div style={{
                    fontSize: 11,
                    color: asciiColors.muted,
                    fontFamily: "Consolas"
                  }}>
                    {sourceType}
                  </div>
                </div>
              </div>
              <div style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                fontSize: 12
              }}>
                {sourceInfo.map((info, index) => (
                  <div 
                    key={index}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "6px 0",
                      borderBottom: index < sourceInfo.length - 1 ? `1px solid ${asciiColors.border}` : 'none'
                    }}
                  >
                    <span style={{ color: asciiColors.muted, fontWeight: 500, fontFamily: "Consolas" }}>
                      {info.label}:
                    </span>
                    <span style={{ 
                      color: asciiColors.foreground, 
                      wordBreak: "break-all",
                      textAlign: "right",
                      maxWidth: 180,
                      fontFamily: "Consolas"
                    }}>
                      {info.value}
                    </span>
                  </div>
                ))}
              </div>
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
                    Target: {tableStructure.table}
                  </h3>
                  <div style={{
                    fontSize: 11,
                    color: asciiColors.muted,
                    fontFamily: "Consolas",
                    marginBottom: "8px"
                  }}>
                    {tableStructure.schema}.{tableStructure.table} ({tableStructure.db_engine})
                  </div>
                </div>
              </div>
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
                  {tableStructure.columns.map((col: any, index: number) => (
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
            </div>
          </div>
        )}
      </AsciiPanel>
    </div>
  );
};

