import React, { useState, useMemo } from 'react';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';

interface EnrichedMappingGraphProps {
  tableStructure: any;
  loading: boolean;
  sourceTitle: string;
  sourceType: string;
  sourceInfo: Array<{ label: string; value: string }>;
  job?: any;
}

export const EnrichedMappingGraph: React.FC<EnrichedMappingGraphProps> = ({ 
  tableStructure, 
  loading, 
  sourceTitle,
  sourceType,
  sourceInfo,
  job
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<'name' | 'type' | 'position'>('position');
  const [expandedSections, setExpandedSections] = useState({
    summary: true,
    source: true,
    target: true
  });
  const [hoveredColumn, setHoveredColumn] = useState<string | null>(null);

  const toggleSection = (section: 'summary' | 'source' | 'target') => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const getColumnMapping = useMemo(() => {
    const targetCols = tableStructure?.target?.columns || tableStructure?.columns || [];
    if (!targetCols || targetCols.length === 0) return [];
    const sourceCols = tableStructure.source?.columns || [];
    return sourceCols.map((sourceCol: any) => {
      const targetCol = targetCols.find(
        (t: any) => t.name.toLowerCase() === sourceCol.name.toLowerCase()
      );
      return {
        source: sourceCol,
        target: targetCol || null,
        mapped: !!targetCol,
        differences: targetCol ? {
          type: sourceCol.type !== targetCol.type,
          nullable: sourceCol.nullable !== targetCol.nullable,
          default: sourceCol.default !== targetCol.default
        } : null
      };
    });
  }, [tableStructure]);

  const getMappingStatus = useMemo(() => {
    const mappings = getColumnMapping;
    const mapped = mappings.filter(m => m.mapped).length;
    const unmapped = mappings.length - mapped;
    return { total: mappings.length, mapped, unmapped };
  }, [getColumnMapping]);

  const getFilteredAndSortedColumns = (columns: any[]) => {
    let filtered = columns.filter((col: any) =>
      col.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      col.type.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (sortBy === 'name') {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'type') {
      filtered.sort((a, b) => a.type.localeCompare(b.type));
    }

    return filtered;
  };

  const isPrimaryKey = (colName: string, isSource: boolean) => {
    if (isSource) {
      return tableStructure?.source?.primaryKeys?.includes(colName) || false;
    }
    return tableStructure?.target?.primaryKeys?.includes(colName) || false;
  };

  const isForeignKey = (colName: string, isSource: boolean) => {
    if (isSource) {
      const fks = tableStructure?.source?.foreignKeys;
      return fks && fks.some((fk: any) => fk.column === colName);
    }
    const fks = tableStructure?.target?.foreignKeys;
    return fks && fks.some((fk: any) => fk.column === colName);
  };

  const isIndexed = (colName: string, isSource: boolean) => {
    if (isSource) {
      const indexes = tableStructure?.source?.indexes;
      return indexes && indexes.some((idx: any) => idx.columns?.includes(colName));
    }
    const indexes = tableStructure?.target?.indexes;
    return indexes && indexes.some((idx: any) => idx.columns?.includes(colName));
  };

  const getMappingColor = (mapping: any) => {
    if (!mapping.mapped) return asciiColors.foreground;
    if (mapping.differences && mapping.differences.type) return asciiColors.foreground;
    if (mapping.differences && (mapping.differences.nullable || mapping.differences.default)) return asciiColors.muted;
    return asciiColors.accent;
  };

  const exportMapping = () => {
    const mapping = getColumnMapping.map(m => ({
      sourceColumn: m.source?.name || 'N/A',
      sourceType: m.source?.type || 'N/A',
      targetColumn: m.target?.name || 'NOT MAPPED',
      targetType: m.target?.type || 'N/A',
      mapped: m.mapped,
      differences: m.differences
    }));
    const csv = [
      ['Source Column', 'Source Type', 'Target Column', 'Target Type', 'Mapped', 'Differences'].join(','),
      ...mapping.map(m => [
        m.sourceColumn,
        m.sourceType,
        m.targetColumn,
        m.targetType,
        m.mapped ? 'Yes' : 'No',
        m.differences ? JSON.stringify(m.differences) : 'None'
      ].join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mapping_${job?.job_name || 'custom_job'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <AsciiPanel title="DATA FLOW: SOURCE → TARGET">
        <div style={{ 
          textAlign: 'center', 
          padding: '40px',
          color: asciiColors.muted,
          fontFamily: "Consolas",
          fontSize: 12
        }}>
          {ascii.blockFull} Loading table structure...
        </div>
      </AsciiPanel>
    );
  }

  if (!tableStructure) {
    return (
      <AsciiPanel title="DATA FLOW: SOURCE → TARGET">
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
      </AsciiPanel>
    );
  }

  const targetCols = tableStructure.target?.columns || tableStructure.columns || [];
  const sourceCols = tableStructure.source?.columns || [];
  const targetColumns = getFilteredAndSortedColumns(targetCols);
  const sourceColumns = getFilteredAndSortedColumns(sourceCols);
  const status = getMappingStatus;

  return (
    <AsciiPanel title="DATA FLOW: SOURCE → TARGET">
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px",
          backgroundColor: asciiColors.backgroundSoft,
          borderRadius: 2,
          border: `1px solid ${asciiColors.border}`
        }}>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <input
              type="text"
              placeholder="Search columns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: "6px 10px",
                border: `1px solid ${asciiColors.border}`,
                borderRadius: 2,
                fontSize: 11,
                fontFamily: "Consolas",
                backgroundColor: asciiColors.background,
                color: asciiColors.foreground,
                outline: "none",
                width: 200
              }}
            />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'type' | 'position')}
              style={{
                padding: "6px 10px",
                border: `1px solid ${asciiColors.border}`,
                borderRadius: 2,
                fontSize: 11,
                fontFamily: "Consolas",
                backgroundColor: asciiColors.background,
                color: asciiColors.foreground,
                cursor: "pointer",
                outline: "none"
              }}
            >
              <option value="position">Sort by Position</option>
              <option value="name">Sort by Name</option>
              <option value="type">Sort by Type</option>
            </select>
          </div>
        </div>

        <div style={{
          padding: "12px",
          backgroundColor: asciiColors.backgroundSoft,
          borderRadius: 2,
          border: `1px solid ${asciiColors.border}`,
          cursor: "pointer"
        }}
        onClick={() => toggleSection('summary')}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: asciiColors.foreground, fontFamily: "Consolas" }}>
              {ascii.v} Summary {expandedSections.summary ? '▼' : '▶'}
            </div>
          </div>
          {expandedSections.summary && (
            <>
              <div style={{ marginTop: 12, padding: "10px", backgroundColor: asciiColors.background, borderRadius: 2, border: `1px solid ${asciiColors.border}` }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: asciiColors.foreground, marginBottom: 8, fontFamily: "Consolas" }}>
                  {ascii.v} Column Flags Legend
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, fontSize: 10, fontFamily: "Consolas" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 9, color: asciiColors.accent, fontWeight: 600 }}>PK</span>
                    <span style={{ color: asciiColors.muted }}>Primary Key</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 9, color: asciiColors.accent, fontWeight: 600 }}>FK</span>
                    <span style={{ color: asciiColors.muted }}>Foreign Key</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 9, color: asciiColors.accent, fontWeight: 600 }}>UQ</span>
                    <span style={{ color: asciiColors.muted }}>Unique</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 9, color: asciiColors.accent, fontWeight: 600 }}>AI</span>
                    <span style={{ color: asciiColors.muted }}>Auto Increment</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 9, color: asciiColors.accent }}>I</span>
                    <span style={{ color: asciiColors.muted }}>Indexed</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ color: asciiColors.accent }}>✓</span>
                    <span style={{ color: asciiColors.muted }}>Nullable</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ color: asciiColors.foreground }}>✗</span>
                    <span style={{ color: asciiColors.muted }}>Not Nullable</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ color: asciiColors.muted }}>D</span>
                    <span style={{ color: asciiColors.muted }}>Has Default</span>
                  </div>
                </div>
              </div>
            </>
          )}
          {expandedSections.summary && (tableStructure.target?.stats || tableStructure.stats) && (
            <div style={{ marginTop: 12, padding: "8px", backgroundColor: asciiColors.background, borderRadius: 2, fontSize: 11 }}>
              {(tableStructure.target?.stats || tableStructure.stats) && (
                <>
                  {(tableStructure.target?.stats?.rowCount !== undefined || tableStructure.stats?.rowCount !== undefined) && (
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ color: asciiColors.muted }}>Target Rows:</span>
                      <span style={{ color: asciiColors.foreground }}>{(tableStructure.target?.stats?.rowCount || tableStructure.stats?.rowCount || 0).toLocaleString()}</span>
                    </div>
                  )}
                  {(tableStructure.target?.stats?.tableSize || tableStructure.stats?.tableSize) && (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: asciiColors.muted }}>Table Size:</span>
                      <span style={{ color: asciiColors.foreground }}>{tableStructure.target?.stats?.tableSize || tableStructure.stats?.tableSize}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 24,
          justifyContent: "center",
          minHeight: 400
        }}>
          <div style={{
            flex: "0 0 350px",
            background: asciiColors.background,
            border: `2px solid ${asciiColors.accent}`,
            borderRadius: 2,
            padding: "16px",
            fontFamily: "Consolas",
            fontSize: 12,
            maxHeight: 600,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column"
          }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingBottom: "8px",
              borderBottom: `2px solid ${asciiColors.border}`,
              marginBottom: "12px",
              cursor: "pointer"
            }}
            onClick={() => toggleSection('source')}
            >
              <div>
                <h3 style={{
                  fontSize: 13,
                  fontWeight: 600,
                  margin: 0,
                  color: asciiColors.accent,
                  fontFamily: "Consolas"
                }}>
                  {sourceTitle} {expandedSections.source ? '▼' : '▶'}
                </h3>
                <div style={{
                  fontSize: 11,
                  color: asciiColors.muted,
                  fontFamily: "Consolas",
                  marginTop: 4
                }}>
                  {sourceType}
                </div>
              </div>
            </div>
            {expandedSections.source && (
              <div style={{ overflowY: "auto", flex: 1 }}>
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
                        fontFamily: "Consolas",
                        fontSize: 11
                      }}>
                        {info.value}
                      </span>
                    </div>
                  ))}
                </div>
                {sourceColumns.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: asciiColors.foreground, marginBottom: 8, fontFamily: "Consolas" }}>
                      Source Columns ({sourceColumns.length})
                    </div>
                    <table style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: 11,
                      fontFamily: "Consolas"
                    }}>
                      <thead style={{
                        background: asciiColors.backgroundSoft,
                        position: "sticky",
                        top: 0,
                        zIndex: 10
                      }}>
                        <tr style={{ borderBottom: `2px solid ${asciiColors.border}` }}>
                          <th style={{ padding: "6px 4px", textAlign: "left", fontWeight: 600, fontSize: 10, width: 20 }}>#</th>
                          <th style={{ padding: "6px 4px", textAlign: "left", fontWeight: 600, fontSize: 10, width: "35%" }}>Name</th>
                          <th style={{ padding: "6px 4px", textAlign: "left", fontWeight: 600, fontSize: 10 }}>Type</th>
                          <th style={{ padding: "6px 4px", textAlign: "center", fontWeight: 600, fontSize: 10, width: 60 }}>Flags</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sourceColumns.map((col: any, index: number) => {
                          const mapping = getColumnMapping.find(m => m.source?.name === col.name);
                          const isPK = isPrimaryKey(col.name, true) || col.isPK;
                          const isFK = isForeignKey(col.name, true) || col.isFK;
                          const isIdx = isIndexed(col.name, true);
                          const isHovered = hoveredColumn === `source-${col.name}`;
                          const mappingColor = mapping ? getMappingColor(mapping) : asciiColors.accent;
                          
                          return (
                            <tr 
                              key={col.name}
                              style={{
                                borderBottom: `1px solid ${asciiColors.border}`,
                                transition: "all 0.2s ease",
                                backgroundColor: isHovered ? asciiColors.backgroundSoft : asciiColors.background,
                                borderLeft: isHovered ? `3px solid ${mappingColor}` : '3px solid transparent'
                              }}
                              onMouseEnter={() => {
                                setHoveredColumn(`source-${col.name}`);
                                if (mapping?.target) {
                                  setHoveredColumn(`target-${mapping.target.name}`);
                                }
                              }}
                              onMouseLeave={() => setHoveredColumn(null)}
                            >
                              <td style={{ padding: "4px", color: asciiColors.muted, fontSize: 10 }}>{index + 1}</td>
                              <td style={{ padding: "4px", fontWeight: 500, color: asciiColors.accent }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                  {col.name}
                                  {isPK && <span style={{ fontSize: 9, color: asciiColors.accent, fontWeight: 600 }}>PK</span>}
                                  {isFK && <span style={{ fontSize: 9, color: asciiColors.accent, fontWeight: 600 }}>FK</span>}
                                  {col.isUnique && <span style={{ fontSize: 9, color: asciiColors.accent, fontWeight: 600 }}>UQ</span>}
                                  {col.isAutoIncrement && <span style={{ fontSize: 9, color: asciiColors.accent, fontWeight: 600 }}>AI</span>}
                                </div>
                              </td>
                              <td style={{ padding: "4px", color: asciiColors.muted, fontSize: 10 }}>{col.type}</td>
                              <td style={{ padding: "4px", textAlign: "center", fontSize: 9 }}>
                                <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                                  {col.nullable ? <span style={{ color: asciiColors.accent }}>✓</span> : <span style={{ color: asciiColors.foreground }}>✗</span>}
                                  {col.default && <span style={{ color: asciiColors.muted }} title={col.default}>D</span>}
                                  {isIdx && <span style={{ color: asciiColors.accent }}>I</span>}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flex: "0 0 80px",
            paddingTop: 40,
            position: "relative"
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
            {hoveredColumn && (() => {
              const sourceCol = sourceColumns.find((c: any) => hoveredColumn === `source-${c.name}`);
              const mapping = sourceCol ? getColumnMapping.find(m => m.source?.name === sourceCol.name) : null;
              if (mapping && mapping.target) {
                const sourceIndex = sourceColumns.findIndex((c: any) => c.name === mapping.source?.name);
                const targetIndex = targetColumns.findIndex((c: any) => c.name === mapping.target.name);
                if (sourceIndex >= 0 && targetIndex >= 0) {
                  const sourceY = sourceIndex * 28 + 100;
                  const targetY = targetIndex * 28 + 100;
                  return (
                    <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 5 }}>
                      <line
                        x1="0"
                        y1={sourceY}
                        x2="100%"
                        y2={targetY}
                        stroke={getMappingColor(mapping)}
                        strokeWidth="2"
                        strokeDasharray={mapping.differences && (mapping.differences.type || mapping.differences.nullable) ? "5,5" : "0"}
                      />
                    </svg>
                  );
                }
              }
              return null;
            })()}
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
            overflow: "hidden",
            display: "flex",
            flexDirection: "column"
          }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingBottom: "8px",
              borderBottom: `2px solid ${asciiColors.border}`,
              marginBottom: "12px",
              cursor: "pointer"
            }}
            onClick={() => toggleSection('target')}
            >
              <div>
                <h3 style={{
                  fontSize: 13,
                  fontWeight: 600,
                  margin: 0,
                  color: asciiColors.accent,
                  fontFamily: "Consolas"
                }}>
                  Target: {tableStructure.target?.table || tableStructure.table} {expandedSections.target ? '▼' : '▶'}
                </h3>
                <div style={{
                  fontSize: 11,
                  color: asciiColors.muted,
                  fontFamily: "Consolas",
                  marginTop: 4
                }}>
                  {tableStructure.target?.schema || tableStructure.schema || 'N/A'}.{tableStructure.target?.table || tableStructure.table || 'N/A'} ({tableStructure.target?.db_engine || tableStructure.db_engine || 'N/A'})
                </div>
                {(tableStructure.target?.stats || tableStructure.stats) && (
                  <div style={{ fontSize: 10, color: asciiColors.muted, marginTop: 2 }}>
                    {(tableStructure.target?.stats?.rowCount || tableStructure.stats?.rowCount || 0).toLocaleString()} rows • {tableStructure.target?.stats?.tableSize || tableStructure.stats?.tableSize || 'N/A'}
                  </div>
                )}
              </div>
            </div>
            {expandedSections.target && targetCols && targetCols.length > 0 ? (
              <div style={{ overflowY: "auto", flex: 1 }}>
                <table style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 11,
                  fontFamily: "Consolas"
                }}>
                  <thead style={{
                    background: asciiColors.backgroundSoft,
                    position: "sticky",
                    top: 0,
                    zIndex: 10
                  }}>
                    <tr style={{ borderBottom: `2px solid ${asciiColors.border}` }}>
                      <th style={{ padding: "6px 4px", textAlign: "left", fontWeight: 600, fontSize: 10, width: 20 }}>#</th>
                      <th style={{ padding: "6px 4px", textAlign: "left", fontWeight: 600, fontSize: 10, width: "35%" }}>Name</th>
                      <th style={{ padding: "6px 4px", textAlign: "left", fontWeight: 600, fontSize: 10 }}>Type</th>
                      <th style={{ padding: "6px 4px", textAlign: "center", fontWeight: 600, fontSize: 10, width: 60 }}>Flags</th>
                    </tr>
                  </thead>
                  <tbody>
                    {targetColumns.map((col: any, index: number) => {
                      const mapping = getColumnMapping.find(m => m.target?.name === col.name);
                      const isPK = isPrimaryKey(col.name, false) || col.isPK;
                      const isFK = isForeignKey(col.name, false) || col.isFK;
                      const isIdx = isIndexed(col.name, false);
                      const isHovered = hoveredColumn === `target-${col.name}`;
                      const mappingColor = mapping ? getMappingColor(mapping) : asciiColors.accent;
                      
                      return (
                        <tr 
                          key={col.name}
                          style={{
                            borderBottom: `1px solid ${asciiColors.border}`,
                            transition: "all 0.2s ease",
                            backgroundColor: isHovered ? asciiColors.backgroundSoft : asciiColors.background,
                            borderLeft: isHovered ? `3px solid ${mappingColor}` : '3px solid transparent'
                          }}
                          onMouseEnter={() => {
                            setHoveredColumn(`target-${col.name}`);
                            if (mapping?.source) {
                              setHoveredColumn(`source-${mapping.source.name}`);
                            }
                          }}
                          onMouseLeave={() => setHoveredColumn(null)}
                        >
                          <td style={{ padding: "4px", color: asciiColors.muted, fontSize: 10 }}>{index + 1}</td>
                          <td style={{ padding: "4px", fontWeight: 500, color: asciiColors.accent }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              {col.name}
                              {isPK && <span style={{ fontSize: 9, color: asciiColors.accent, fontWeight: 600 }}>PK</span>}
                              {isFK && <span style={{ fontSize: 9, color: asciiColors.accent, fontWeight: 600 }}>FK</span>}
                              {col.isUnique && <span style={{ fontSize: 9, color: asciiColors.accent, fontWeight: 600 }}>UQ</span>}
                              {col.isAutoIncrement && <span style={{ fontSize: 9, color: asciiColors.accent, fontWeight: 600 }}>AI</span>}
                            </div>
                          </td>
                          <td style={{ padding: "4px", color: asciiColors.muted, fontSize: 10 }}>{col.type}</td>
                          <td style={{ padding: "4px", textAlign: "center", fontSize: 9 }}>
                            <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                              {col.nullable ? <span style={{ color: asciiColors.accent }}>✓</span> : <span style={{ color: asciiColors.foreground }}>✗</span>}
                              {col.default && <span style={{ color: asciiColors.muted }} title={col.default}>D</span>}
                              {isIdx && <span style={{ color: asciiColors.accent }}>I</span>}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: "20px", textAlign: "center", color: asciiColors.muted, fontSize: 11 }}>
                Target structure not available
              </div>
            )}
          </div>
        </div>
      </div>
    </AsciiPanel>
  );
};
