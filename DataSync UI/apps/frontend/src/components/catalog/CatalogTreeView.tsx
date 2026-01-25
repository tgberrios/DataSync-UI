import React, { useState, useMemo } from 'react';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import type { CatalogEntry } from '../../services/api';


interface SchemaNode {
  name: string;
  tables: Map<string, CatalogEntry[]>;
}

interface TreeViewProps {
  entries: CatalogEntry[];
  onEntryClick?: (entry: CatalogEntry) => void;
  onDelete?: (entry: CatalogEntry) => void;
}

const CatalogTreeView: React.FC<TreeViewProps> = ({ entries, onEntryClick, onDelete }) => {
  const [expandedSchemas, setExpandedSchemas] = useState<Set<string>>(new Set());

  const treeData = useMemo(() => {
    const schemas = new Map<string, SchemaNode>();

    entries.forEach(entry => {
      const schemaName = entry.schema_name;

      if (!schemas.has(schemaName)) {
        schemas.set(schemaName, {
          name: schemaName,
          tables: new Map()
        });
      }

      const schema = schemas.get(schemaName)!;
      const tableName = entry.table_name;

      if (!schema.tables.has(tableName)) {
        schema.tables.set(tableName, []);
      }

      schema.tables.get(tableName)!.push(entry);
    });

    return Array.from(schemas.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [entries]);

  const toggleSchema = (schemaName: string) => {
    setExpandedSchemas(prev => {
      const next = new Set(prev);
      if (next.has(schemaName)) {
        next.delete(schemaName);
      } else {
        next.add(schemaName);
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

  const renderTable = (tableName: string, tableEntries: CatalogEntry[], schemaName: string, level: number) => {
    const entry = tableEntries[0];
    const isLast = Array.from(treeData.find(s => s.name === schemaName)?.tables.keys() || []).pop() === tableName;

    const getStatusColor = (status: string) => {
      if (status === 'LISTENING_CHANGES') return asciiColors.accent;
      if (status === 'IN_PROGRESS') return asciiColors.muted;
      if (status === 'ERROR') return asciiColors.foreground;
      return asciiColors.muted;
    };

    return (
      <div 
        key={`${schemaName}.${tableName}`}
        style={{
          padding: "8px 0",
          paddingLeft: `${level * 24 + 8}px`,
          cursor: "pointer",
          borderLeft: `2px solid ${asciiColors.border}`,
          backgroundColor: asciiColors.background,
          margin: "2px 0",
          transition: "all 0.2s ease",
          fontFamily: "Consolas",
          fontSize: 12
        }}
        onClick={() => onEntryClick?.(entry)}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = asciiColors.backgroundSoft;
          e.currentTarget.style.transform = "translateX(2px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = asciiColors.background;
          e.currentTarget.style.transform = "translateX(0)";
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {renderTreeLine(level, isLast)}
          <span style={{ color: asciiColors.accent }}>{ascii.blockSemi}</span>
          <h3 style={{ 
            fontSize: 13, 
            fontWeight: 600, 
            margin: 0, 
            color: asciiColors.foreground,
            fontFamily: "Consolas"
          }}>
            {tableName}
          </h3>
          <div style={{ 
            display: "flex", 
            gap: 6, 
            alignItems: "center", 
            marginLeft: "auto",
            flexWrap: "wrap",
            fontSize: 11
          }}>
            <span style={{
              padding: "2px 8px",
              border: `1px solid ${getStatusColor(entry.status)}`,
              borderRadius: 2,
              backgroundColor: 'transparent',
              color: getStatusColor(entry.status),
              fontFamily: "Consolas",
              fontSize: 11
            }}>
              {entry.status}
            </span>
            <span style={{
              padding: "1px 6px",
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2,
              backgroundColor: 'transparent',
              color: asciiColors.muted,
              fontFamily: "Consolas",
              fontSize: 10
            }}>
              {entry.active ? "Active" : "Inactive"}
            </span>
            <span style={{
              padding: "2px 8px",
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2,
              color: asciiColors.muted,
              fontFamily: "Consolas",
              fontSize: 11
            }}>
              {entry.db_engine}
            </span>
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(entry);
                }}
                style={{
                  padding: "2px 8px",
                  border: `1px solid ${asciiColors.border}`,
                  borderRadius: 2,
                  backgroundColor: "transparent",
                  color: asciiColors.foreground,
                  fontFamily: "Consolas",
                  fontSize: 11,
                  cursor: "pointer",
                  transition: "all 0.15s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.border = `2px solid ${asciiColors.foreground}`;
                  e.currentTarget.style.backgroundColor = asciiColors.backgroundSoft;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.border = `1px solid ${asciiColors.border}`;
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderSchema = (schema: SchemaNode, level: number) => {
    const isExpanded = expandedSchemas.has(schema.name);
    const schemaIndex = treeData.findIndex(s => s.name === schema.name);
    const isLastSchema = schemaIndex === treeData.length - 1;

    return (
      <div key={schema.name} style={{ marginBottom: 2 }}>
        <div
          style={{
            padding: "12px 8px",
            paddingLeft: `${level * 24 + 8}px`,
            cursor: "pointer",
            borderLeft: `3px solid ${asciiColors.accent}`,
            backgroundColor: isExpanded ? asciiColors.backgroundSoft : asciiColors.background,
            margin: "2px 0",
            transition: "all 0.2s ease",
            fontFamily: "Consolas",
            fontSize: 13,
            fontWeight: 600
          }}
          onClick={() => toggleSchema(schema.name)}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = asciiColors.backgroundSoft;
            e.currentTarget.style.transform = "translateX(2px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = isExpanded ? asciiColors.backgroundSoft : asciiColors.background;
            e.currentTarget.style.transform = "translateX(0)";
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {renderTreeLine(level, isLastSchema)}
            <span style={{ 
              color: asciiColors.accent,
              fontSize: 12,
              fontFamily: "Consolas",
              display: "inline-block",
              width: 16,
              textAlign: "center"
            }}>
              {isExpanded ? ascii.arrowDown : ascii.arrowRight}
            </span>
            <span style={{ color: asciiColors.accent }}>{ascii.blockFull}</span>
            <h2 style={{ 
              fontSize: 14, 
              fontWeight: 600, 
              margin: 0, 
              color: asciiColors.accent,
              fontFamily: "Consolas"
            }}>
              {schema.name}
            </h2>
            <div style={{ marginLeft: "auto" }}>
              <span style={{
                padding: "2px 8px",
                border: `1px solid ${asciiColors.border}`,
                borderRadius: 2,
                color: asciiColors.muted,
                fontFamily: "Consolas",
                fontSize: 11
              }}>
                {schema.tables.size} {schema.tables.size === 1 ? 'table' : 'tables'}
              </span>
            </div>
          </div>
        </div>
        {isExpanded && (
          <div style={{
            paddingLeft: `${(level + 1) * 24 + 36}px`,
            animation: "fadeIn 0.3s ease-out"
          }}>
            {Array.from(schema.tables.entries()).map(([tableName, tableEntries]) => 
              renderTable(tableName, tableEntries, schema.name, level + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  if (treeData.length === 0) {
    return (
      <AsciiPanel title="CATALOG TREE">
        <div style={{
          padding: "60px 40px",
          textAlign: "center",
          color: asciiColors.muted,
          fontFamily: "Consolas",
          fontSize: 12
        }}>
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}>
            {ascii.blockFull}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: asciiColors.foreground }}>
            No catalog entries available
          </div>
          <div style={{ fontSize: 12, opacity: 0.7, color: asciiColors.muted }}>
            Entries will appear here once cataloged
          </div>
        </div>
      </AsciiPanel>
    );
  }

  return (
    <AsciiPanel title="CATALOG TREE">
      <div style={{
        maxHeight: 800,
        overflowY: "auto",
        overflowX: "hidden",
        padding: "8px 0"
      }}>
        {treeData.map((schema, index) => (
          <div key={schema.name} style={{ animationDelay: `${index * 0.05}s` }}>
            {renderSchema(schema, 0)}
          </div>
        ))}
      </div>
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </AsciiPanel>
  );
};

export default CatalogTreeView;

