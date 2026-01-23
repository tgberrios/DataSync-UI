import React, { useState, useMemo } from 'react';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';


interface APICatalogEntry {
  id: number;
  api_name: string;
  api_type: string;
  base_url: string;
  endpoint: string;
  http_method: string;
  auth_type: string;
  target_db_engine: string;
  target_schema: string;
  target_table: string;
  status: string;
  active: boolean;
  sync_interval: number;
  last_sync_time: string | null;
  last_sync_status: string | null;
  created_at: string;
  updated_at: string;
  [key: string]: any;
}

interface SchemaNode {
  name: string;
  tables: Map<string, TableNode>;
}

interface TableNode {
  name: string;
  apis: APICatalogEntry[];
}

interface TreeViewProps {
  entries: APICatalogEntry[];
  onEntryClick?: (entry: APICatalogEntry) => void;
  onDuplicate?: (entry: APICatalogEntry) => void;
  onEdit?: (entry: APICatalogEntry) => void;
  onDelete?: (entry: APICatalogEntry) => void;
}

const APICatalogTreeView: React.FC<TreeViewProps> = ({ entries, onEntryClick, onDuplicate, onEdit, onDelete }) => {
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
          apis: []
        });
      }

      schema.tables.get(tableName)!.apis.push(entry);
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
    if (status === 'SUCCESS') return asciiColors.success;
    if (status === 'ERROR') return asciiColors.danger;
    if (status === 'IN_PROGRESS') return asciiColors.warning;
    return asciiColors.muted;
  };

  const renderAPI = (api: APICatalogEntry, level: number, isLast: boolean) => {
    return (
      <div 
        key={api.id}
        style={{
          padding: "6px 0",
          paddingLeft: `${level * 24 + 8}px`,
          cursor: "pointer",
          borderLeft: `1px solid ${asciiColors.border}`,
          backgroundColor: asciiColors.background,
          margin: "2px 0",
          transition: "all 0.2s ease",
          fontFamily: "Consolas",
          fontSize: 12
        }}
        onClick={() => onEntryClick?.(api)}
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
          <span style={{ color: asciiColors.muted, fontSize: 10 }}>{ascii.dot}</span>
          <span style={{ 
            fontSize: 12, 
            fontWeight: 500, 
            margin: 0, 
            color: asciiColors.muted,
            fontFamily: "Consolas"
          }}>
            {api.api_name}
          </span>
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
              border: `1px solid ${getStatusColor(api.status)}`,
              borderRadius: 2,
              color: getStatusColor(api.status),
              fontFamily: "Consolas",
              fontSize: 11
            }}>
              {api.status}
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
              {api.active ? "Active" : "Inactive"}
            </span>
            <span style={{
              padding: "2px 8px",
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2,
              color: asciiColors.muted,
              fontFamily: "Consolas",
              fontSize: 11
            }}>
              {api.http_method}
            </span>
            <span style={{
              padding: "2px 8px",
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2,
              color: asciiColors.muted,
              fontFamily: "Consolas",
              fontSize: 11
            }}>
              {api.api_type}
            </span>
            <div style={{ display: "flex", gap: 4 }} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
              {onEdit && (
                <AsciiButton
                  label="Edit"
                  onClick={() => onEdit(api)}
                  variant="ghost"
                />
              )}
              {onDelete && (
                <AsciiButton
                  label="Delete"
                  onClick={() => onDelete(api)}
                  variant="ghost"
                />
              )}
              {onDuplicate && (
                <AsciiButton
                  label="Duplicate"
                  onClick={() => onDuplicate(api)}
                  variant="primary"
                />
              )}
            </div>
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
      <div key={key} style={{ marginBottom: 2 }}>
        <div
          style={{
            padding: "10px 8px",
            paddingLeft: `${level * 24 + 8}px`,
            cursor: "pointer",
            borderLeft: `2px solid ${asciiColors.border}`,
            backgroundColor: asciiColors.background,
            margin: "2px 0",
            transition: "all 0.2s ease",
            fontFamily: "Consolas",
            fontSize: 12
          }}
          onClick={() => toggleTable(schemaName, table.name)}
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
            <span style={{ color: asciiColors.accent }}>{ascii.blockSemi}</span>
            <h3 style={{ 
              fontSize: 13, 
              fontWeight: 600, 
              margin: 0, 
              color: asciiColors.foreground,
              fontFamily: "Consolas"
            }}>
              {table.name}
            </h3>
            <div style={{ marginLeft: "auto" }}>
              <span style={{
                padding: "2px 8px",
                border: `1px solid ${asciiColors.border}`,
                borderRadius: 2,
                color: asciiColors.muted,
                fontFamily: "Consolas",
                fontSize: 11
              }}>
                {table.apis.length} {table.apis.length === 1 ? 'API' : 'APIs'}
              </span>
            </div>
          </div>
        </div>
        {isExpanded && (
          <div style={{
            paddingLeft: `${(level + 1) * 24 + 36}px`,
            animation: "fadeIn 0.3s ease-out"
          }}>
            {table.apis.map((api, index) => {
              const isLast = index === table.apis.length - 1;
              return renderAPI(api, level + 1, isLast);
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
      <div key={schema.name} style={{ marginBottom: 2 }}>
        <div
          style={{
            padding: "12px 8px",
            paddingLeft: `${level * 24 + 8}px`,
            cursor: "pointer",
            borderLeft: `3px solid ${asciiColors.accent}`,
            backgroundColor: isExpanded ? asciiColors.accentLight : asciiColors.background,
            margin: "2px 0",
            transition: "all 0.2s ease",
            fontFamily: "Consolas",
            fontSize: 13,
            fontWeight: 600
          }}
          onClick={() => toggleSchema(schema.name)}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = asciiColors.accentLight;
            e.currentTarget.style.transform = "translateX(2px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = isExpanded ? asciiColors.accentLight : asciiColors.background;
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
      <AsciiPanel title="API CATALOG TREE">
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
            No API entries available
          </div>
          <div style={{ fontSize: 12, opacity: 0.7, color: asciiColors.muted }}>
            APIs will appear here once configured
          </div>
        </div>
      </AsciiPanel>
    );
  }

  return (
    <AsciiPanel title="API CATALOG TREE">
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

export default APICatalogTreeView;

