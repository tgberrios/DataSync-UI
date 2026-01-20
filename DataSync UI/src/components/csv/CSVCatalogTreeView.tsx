import React, { useState, useMemo } from 'react';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import type { CSVCatalogEntry } from '../../services/api';


interface SchemaNode {
  name: string;
  tables: Map<string, TableNode>;
}

interface TableNode {
  name: string;
  csvs: CSVCatalogEntry[];
}

interface TreeViewProps {
  entries: CSVCatalogEntry[];
  onEntryClick?: (entry: CSVCatalogEntry) => void;
  onDuplicate?: (entry: CSVCatalogEntry) => void;
}

const CSVCatalogTreeView: React.FC<TreeViewProps> = ({ entries, onEntryClick, onDuplicate }) => {
  const [expandedSchemas, setExpandedSchemas] = useState<Set<string>>(new Set());
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());

  const treeData = useMemo(() => {
    const schemas = new Map<string, SchemaNode>();

    entries.forEach(entry => {
      const schemaName = entry.target_schema || 'Other';
      const tableName = entry.target_table || 'Other';

      if (!schemas.has(schemaName)) {
        schemas.set(schemaName, {
          name: schemaName,
          tables: new Map()
        });
      }

      const schema = schemas.get(schemaName)!;

      if (!schema.tables.has(tableName)) {
        schema.tables.set(tableName, {
          name: tableName,
          csvs: []
        });
      }

      schema.tables.get(tableName)!.csvs.push(entry);
    });

    return Array.from(schemas.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [entries]);

  const toggleSchema = (schemaName: string) => {
    setExpandedSchemas(prev => {
      const next = new Set(prev);
      if (next.has(schemaName)) {
        next.delete(schemaName);
        const schema = treeData.find(s => s.name === schemaName);
        if (schema) {
          schema.tables.forEach(table => {
            const key = `${schemaName}.${table.name}`;
            setExpandedTables(prevTables => {
              const nextTables = new Set(prevTables);
              nextTables.delete(key);
              return nextTables;
            });
          });
        }
      } else {
        next.add(schemaName);
      }
      return next;
    });
  };

  const toggleTable = (schemaName: string, tableName: string) => {
    const key = `${schemaName}.${tableName}`;
    setExpandedTables(prev => {
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
      lines.push('│  ');
    }
    
    if (isLast) {
      lines.push('└── ');
    } else {
      lines.push('├── ');
    }
    
    return (
      <span style={{
        color: asciiColors.muted,
        marginRight: 6,
        fontFamily: "Consolas",
        fontSize: 11
      }}>
        {lines.join('')}
      </span>
    );
  };

  const getStatusColor = (status: string) => {
    if (status === 'SUCCESS') return asciiColors.success;
    if (status === 'ERROR') return asciiColors.danger;
    if (status === 'IN_PROGRESS') return asciiColors.warning;
    return asciiColors.muted;
  };

  const renderCSV = (csv: CSVCatalogEntry, level: number, isLast: boolean) => {
    return (
      <div key={csv.id} style={{ marginBottom: 2, userSelect: 'none' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '8px',
            paddingLeft: `${level * 24 + 8}px`,
            cursor: 'pointer',
            borderRadius: 2,
            transition: 'all 0.2s ease',
            position: 'relative',
            margin: '2px 0',
            borderLeft: `1px solid ${asciiColors.border}`,
            fontFamily: "Consolas",
            fontSize: 12
          }}
          onClick={() => onEntryClick?.(csv)}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = asciiColors.backgroundSoft;
            e.currentTarget.style.transform = 'translateX(2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = asciiColors.background;
            e.currentTarget.style.transform = 'translateX(0)';
          }}
        >
          {renderTreeLine(level, isLast)}
          <span style={{ marginRight: 8, color: asciiColors.accent, fontFamily: "Consolas" }}>
            {ascii.dot}
          </span>
          <span style={{
            fontWeight: 400,
            color: asciiColors.foreground,
            marginRight: 8,
            flex: 1,
            fontFamily: "Consolas",
            fontSize: 12
          }}>
            {csv.csv_name}
          </span>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flexWrap: 'wrap'
          }}>
            <span style={{
              padding: '2px 8px',
              borderRadius: 2,
              fontSize: 11,
              fontWeight: 500,
              backgroundColor: getStatusColor(csv.status),
              color: asciiColors.background,
              fontFamily: "Consolas",
              border: `1px solid ${getStatusColor(csv.status)}`
            }}>
              {csv.status}
            </span>
            {csv.active ? (
              <span style={{
                padding: '2px 8px',
                borderRadius: 2,
                fontSize: 11,
                fontWeight: 500,
                backgroundColor: asciiColors.success,
                color: asciiColors.background,
                fontFamily: "Consolas",
                border: `1px solid ${asciiColors.success}`
              }}>
                Active
              </span>
            ) : (
              <span style={{
                padding: '2px 8px',
                borderRadius: 2,
                fontSize: 11,
                fontWeight: 500,
                backgroundColor: asciiColors.danger,
                color: asciiColors.background,
                fontFamily: "Consolas",
                border: `1px solid ${asciiColors.danger}`
              }}>
                Inactive
              </span>
            )}
            <span style={{
              padding: '2px 8px',
              borderRadius: 2,
              fontSize: 11,
              fontWeight: 500,
              backgroundColor: asciiColors.backgroundSoft,
              color: asciiColors.muted,
              fontFamily: "Consolas",
              border: `1px solid ${asciiColors.border}`
            }}>
              {csv.source_type}
            </span>
            {onDuplicate && (
              <div onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                <AsciiButton
                  label="Duplicate"
                  onClick={() => onDuplicate(csv)}
                  variant="primary"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderTable = (table: TableNode, schemaName: string, level: number) => {
    const key = `${schemaName}.${table.name}`;
    const isExpanded = expandedTables.has(key);
    const schema = treeData.find(s => s.name === schemaName);
    const tableKeys = Array.from(schema?.tables.keys() || []);
    const isLast = tableKeys[tableKeys.length - 1] === table.name;

    return (
      <div key={key} style={{ marginBottom: 2, userSelect: 'none' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '10px 8px',
            paddingLeft: `${level * 24 + 8}px`,
            cursor: 'pointer',
            borderRadius: 2,
            transition: 'all 0.2s ease',
            position: 'relative',
            margin: '2px 0',
            background: 'transparent',
            borderLeft: `2px solid ${asciiColors.border}`,
            fontFamily: "Consolas",
            fontSize: 13
          }}
          onClick={() => toggleTable(schemaName, table.name)}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = asciiColors.backgroundSoft;
            e.currentTarget.style.transform = 'translateX(2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.transform = 'translateX(0)';
          }}
        >
          {renderTreeLine(level, isLast)}
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 16,
            height: 16,
            marginRight: 8,
            color: asciiColors.muted,
            fontFamily: "Consolas",
            fontSize: 12
          }}>
            {isExpanded ? ascii.arrowDown : ascii.arrowRight}
          </span>
          <span style={{ marginRight: 8, color: asciiColors.accent, fontFamily: "Consolas" }}>
            {ascii.blockSemi}
          </span>
          <span style={{
            fontWeight: 500,
            color: asciiColors.foreground,
            marginRight: 8,
            flex: 1,
            fontFamily: "Consolas",
            fontSize: 13
          }}>
            {table.name}
          </span>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}>
            <span style={{
              padding: '2px 8px',
              borderRadius: 2,
              fontSize: 11,
              fontWeight: 500,
              backgroundColor: asciiColors.backgroundSoft,
              color: asciiColors.muted,
              fontFamily: "Consolas",
              border: `1px solid ${asciiColors.border}`
            }}>
              {table.csvs.length} {table.csvs.length === 1 ? 'CSV' : 'CSVs'}
            </span>
          </div>
        </div>
        {isExpanded && (
          <div style={{
            paddingLeft: `${level * 24 + 36}px`,
            overflow: 'hidden'
          }}>
            {table.csvs.map((csv, index) => {
              const isLast = index === table.csvs.length - 1;
              return renderCSV(csv, level + 1, isLast);
            })}
          </div>
        )}
      </div>
    );
  };

  const renderSchema = (schema: SchemaNode, level: number) => {
    const isExpanded = expandedSchemas.has(schema.name);
    const schemaIndex = treeData.findIndex(s => s.name === schema.name);
    const isLastSchema = schemaIndex === treeData.length - 1;

    return (
      <div key={schema.name} style={{ marginBottom: 2, userSelect: 'none' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px 8px',
            paddingLeft: `${level * 24 + 8}px`,
            cursor: 'pointer',
            borderRadius: 2,
            transition: 'all 0.2s ease',
            position: 'relative',
            margin: '2px 0',
            background: 'transparent',
            borderLeft: `3px solid ${asciiColors.accent}`,
            fontFamily: "Consolas",
            fontSize: 14
          }}
          onClick={() => toggleSchema(schema.name)}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = `linear-gradient(135deg, ${asciiColors.accentSoft}20 0%, ${asciiColors.accent}12 100%)`;
            e.currentTarget.style.transform = 'translateX(2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.transform = 'translateX(0)';
          }}
        >
          {renderTreeLine(level, isLastSchema)}
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 16,
            height: 16,
            marginRight: 8,
            color: asciiColors.muted,
            fontFamily: "Consolas",
            fontSize: 12
          }}>
            {isExpanded ? ascii.arrowDown : ascii.arrowRight}
          </span>
          <span style={{ marginRight: 8, color: asciiColors.accent, fontFamily: "Consolas" }}>
            {ascii.blockFull}
          </span>
          <span style={{
            fontWeight: 600,
            color: asciiColors.accent,
            marginRight: 8,
            flex: 1,
            fontFamily: "Consolas",
            fontSize: 14
          }}>
            {schema.name}
          </span>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}>
            <span style={{
              padding: '2px 8px',
              borderRadius: 2,
              fontSize: 11,
              fontWeight: 500,
              backgroundColor: asciiColors.backgroundSoft,
              color: asciiColors.muted,
              fontFamily: "Consolas",
              border: `1px solid ${asciiColors.border}`
            }}>
              {schema.tables.size} {schema.tables.size === 1 ? 'table' : 'tables'}
            </span>
          </div>
        </div>
        {isExpanded && (
          <div style={{
            paddingLeft: `${level * 24 + 36}px`,
            overflow: 'hidden'
          }}>
            {Array.from(schema.tables.values()).map((table) => 
              renderTable(table, schema.name, level + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  if (treeData.length === 0) {
    return (
      <AsciiPanel title="CSV CATALOG TREE">
        <div style={{
          padding: '60px 40px',
          textAlign: 'center',
          color: asciiColors.muted,
          fontFamily: "Consolas",
          fontSize: 12
        }}>
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}>
            {ascii.blockFull}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: asciiColors.foreground }}>
            No CSV entries available
          </div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            CSV sources will appear here once configured.
          </div>
        </div>
      </AsciiPanel>
    );
  }

  return (
    <AsciiPanel title="CSV CATALOG TREE">
      <div style={{
        maxHeight: 800,
        overflowY: 'auto',
        overflowX: 'hidden',
        fontFamily: "Consolas",
        fontSize: 12
      }}>
        {treeData.map((schema, index) => (
          <div key={schema.name} style={{ animationDelay: `${index * 0.05}s` }}>
            {renderSchema(schema, 0)}
          </div>
        ))}
      </div>
    </AsciiPanel>
  );
};

export default CSVCatalogTreeView;

