import React, { useState, useCallback, useMemo } from 'react';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import type { CatalogEntry } from '../../services/api';
import { catalogApi } from '../../services/api';

interface TableDetailModalProps {
  entry: CatalogEntry;
  tableStructure: any;
  loadingStructure: boolean;
  onClose: () => void;
  onSave: (entry: CatalogEntry) => void;
}

const TableDetailModal: React.FC<TableDetailModalProps> = ({
  entry,
  tableStructure,
  loadingStructure,
  onClose,
  onSave
}) => {
  const [activeTab, setActiveTab] = useState<'config' | 'dataflow'>('config');
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
              onClick={() => setActiveTab('dataflow')}
              style={{
                flex: 1,
                padding: "12px 20px",
                border: "none",
                borderBottom: activeTab === 'dataflow' ? `3px solid ${asciiColors.accent}` : `3px solid transparent`,
                backgroundColor: "transparent",
                color: activeTab === 'dataflow' ? asciiColors.accent : asciiColors.muted,
                fontSize: 12,
                fontFamily: "Consolas",
                fontWeight: activeTab === 'dataflow' ? 600 : 400,
                cursor: "pointer",
                transition: "all 0.2s ease",
                textTransform: "uppercase"
              }}
              onMouseEnter={(e) => {
                if (activeTab !== 'dataflow') {
                  e.currentTarget.style.color = asciiColors.foreground;
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== 'dataflow') {
                  e.currentTarget.style.color = asciiColors.muted;
                }
              }}
            >
              {ascii.v} Data Flow
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
              <div>
                <MappingGraph
                  table={entry}
                  tableStructure={tableStructure}
                  loading={loadingStructure}
                />
              </div>
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
    if (!tableStructure?.source?.columns || !tableStructure?.target?.columns) return [];
    return tableStructure.source.columns.map((sourceCol: any) => {
      const targetCol = tableStructure.target.columns.find(
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
    const withDifferences = mappings.filter(m => m.mapped && m.differences && 
      (m.differences.type || m.differences.nullable || m.differences.default)).length;
    return { total: mappings.length, mapped, unmapped, withDifferences };
  }, [getColumnMapping]);

  const getFilteredAndSortedColumns = (columns: any[], isSource: boolean) => {
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
    const pks = isSource ? tableStructure?.source?.primaryKeys : tableStructure?.target?.primaryKeys;
    return pks && pks.includes(colName);
  };

  const isForeignKey = (colName: string, isSource: boolean) => {
    const fks = isSource ? tableStructure?.source?.foreignKeys : tableStructure?.target?.foreignKeys;
    return fks && fks.some((fk: any) => fk.column === colName);
  };

  const isIndexed = (colName: string, isSource: boolean) => {
    const indexes = isSource ? tableStructure?.source?.indexes : tableStructure?.target?.indexes;
    return indexes && indexes.length > 0;
  };

  const getMappingColor = (mapping: any) => {
    if (!mapping.mapped) return asciiColors.foreground;
    if (mapping.differences && mapping.differences.type) return asciiColors.foreground;
    if (mapping.differences && (mapping.differences.nullable || mapping.differences.default)) return asciiColors.muted;
    return asciiColors.accent;
  };

  const exportMapping = () => {
    const mapping = getColumnMapping.map(m => ({
      sourceColumn: m.source.name,
      sourceType: m.source.type,
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
    a.download = `mapping_${table.schema_name}_${table.table_name}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div style={{ marginTop: 20 }}>
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
      </div>
    );
  }

  if (!tableStructure) {
    return (
      <div style={{ marginTop: 20 }}>
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
      </div>
    );
  }

  const sourceColumns = getFilteredAndSortedColumns(tableStructure.source?.columns || [], true);
  const targetColumns = getFilteredAndSortedColumns(tableStructure.target?.columns || [], false);
  const status = getMappingStatus;

  return (
    <div style={{ marginTop: 20 }}>
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
            <AsciiButton
              label="Export CSV"
              onClick={exportMapping}
              variant="ghost"
            />
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
                <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                  <div style={{ textAlign: "center", padding: "8px", backgroundColor: asciiColors.background, borderRadius: 2 }}>
                    <div style={{ fontSize: 20, fontWeight: 600, color: asciiColors.accent }}>{status.total}</div>
                    <div style={{ fontSize: 10, color: asciiColors.muted }}>Total Columns</div>
                  </div>
                  <div style={{ textAlign: "center", padding: "8px", backgroundColor: asciiColors.background, borderRadius: 2 }}>
                    <div style={{ fontSize: 20, fontWeight: 600, color: asciiColors.accent }}>{status.mapped}</div>
                    <div style={{ fontSize: 10, color: asciiColors.muted }}>Mapped</div>
                  </div>
                  <div style={{ textAlign: "center", padding: "8px", backgroundColor: asciiColors.background, borderRadius: 2 }}>
                    <div style={{ fontSize: 20, fontWeight: 600, color: asciiColors.foreground }}>{status.unmapped}</div>
                    <div style={{ fontSize: 10, color: asciiColors.muted }}>Unmapped</div>
                  </div>
                </div>
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
            {expandedSections.summary && tableStructure.syncInfo && (
              <div style={{ marginTop: 12, padding: "8px", backgroundColor: asciiColors.background, borderRadius: 2, fontSize: 11 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ color: asciiColors.muted }}>Last Sync:</span>
                  <span style={{ color: asciiColors.foreground }}>
                    {tableStructure.syncInfo.lastSyncTime 
                      ? new Date(tableStructure.syncInfo.lastSyncTime).toLocaleString() 
                      : 'Never'}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ color: asciiColors.muted }}>Status:</span>
                  <span style={{ color: asciiColors.accent }}>{tableStructure.syncInfo.status || 'N/A'}</span>
                </div>
                {tableStructure.source?.stats && (
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ color: asciiColors.muted }}>Source Rows:</span>
                    <span style={{ color: asciiColors.foreground }}>{tableStructure.source.stats.rowCount?.toLocaleString() || 0}</span>
                  </div>
                )}
                {tableStructure.target?.stats && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: asciiColors.muted }}>Target Rows:</span>
                    <span style={{ color: asciiColors.foreground }}>{tableStructure.target.stats.rowCount?.toLocaleString() || 0}</span>
                  </div>
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
                    Source: {table.db_engine} {expandedSections.source ? '▼' : '▶'}
                  </h3>
                  <div style={{
                    fontSize: 11,
                    color: asciiColors.muted,
                    fontFamily: "Consolas",
                    marginTop: 4
                  }}>
                    {table.schema_name}.{table.table_name}
                  </div>
                  {tableStructure.source?.stats && (
                    <div style={{ fontSize: 10, color: asciiColors.muted, marginTop: 2 }}>
                      {tableStructure.source.stats.rowCount?.toLocaleString() || 0} rows • {tableStructure.source.stats.tableSize || 'N/A'}
                    </div>
                  )}
                </div>
              </div>
              {expandedSections.source && tableStructure.source && tableStructure.source.columns ? (
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
                      {sourceColumns.map((col: any, index: number) => {
                        const mapping = getColumnMapping.find(m => m.source.name === col.name);
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
              ) : (
                <div style={{ padding: "20px", textAlign: "center", color: asciiColors.muted, fontSize: 11 }}>
                  Source structure not available
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
                const mapping = sourceCol ? getColumnMapping.find(m => m.source.name === sourceCol.name) : null;
                if (mapping && mapping.target) {
                  const sourceIndex = sourceColumns.findIndex((c: any) => c.name === mapping.source.name);
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
                    Target: PostgreSQL {expandedSections.target ? '▼' : '▶'}
                  </h3>
                  <div style={{
                    fontSize: 11,
                    color: asciiColors.muted,
                    fontFamily: "Consolas",
                    marginTop: 4
                  }}>
                    {tableStructure.target?.schema || table.schema_name}.{tableStructure.target?.table || table.table_name}
                  </div>
                  {tableStructure.target?.stats && (
                    <div style={{ fontSize: 10, color: asciiColors.muted, marginTop: 2 }}>
                      {tableStructure.target.stats.rowCount?.toLocaleString() || 0} rows • {tableStructure.target.stats.tableSize || 'N/A'}
                    </div>
                  )}
                </div>
              </div>
              {expandedSections.target && tableStructure.target && tableStructure.target.columns ? (
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
                        const isPK = isPrimaryKey(col.name, false);
                        const isFK = isForeignKey(col.name, false);
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
    </div>
  );
};

export default TableDetailModal;

