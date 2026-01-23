import React, { useState, useMemo } from 'react';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { theme } from '../../theme/theme';
import type { EncryptionPolicy } from '../../services/api';

interface SchemaNode {
  name: string;
  tables: Map<string, TableNode>;
}

interface TableNode {
  name: string;
  columns: Map<string, ColumnNode>;
}

interface ColumnNode {
  name: string;
  policies: EncryptionPolicy[];
}

interface DataEncryptionTreeViewProps {
  policies: EncryptionPolicy[];
  onEdit?: (policy: EncryptionPolicy) => void;
  onDelete?: (policyId: number) => void;
  onEncrypt?: (policy: EncryptionPolicy) => void;
  onRotateKey?: (policy: EncryptionPolicy) => void;
}

const DataEncryptionTreeView: React.FC<DataEncryptionTreeViewProps> = ({ 
  policies, 
  onEdit, 
  onDelete, 
  onEncrypt,
  onRotateKey
}) => {
  const [expandedSchemas, setExpandedSchemas] = useState<Set<string>>(new Set());
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [expandedColumns, setExpandedColumns] = useState<Set<string>>(new Set());

  const treeData = useMemo(() => {
    const schemas = new Map<string, SchemaNode>();

    policies.forEach(policy => {
      const schemaName = policy.schema_name || 'Other';
      const tableName = policy.table_name || 'Other';
      const columnName = policy.column_name || 'Other';

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
          columns: new Map()
        });
      }

      const table = schema.tables.get(tableName)!;

      if (!table.columns.has(columnName)) {
        table.columns.set(columnName, {
          name: columnName,
          policies: []
        });
      }

      table.columns.get(columnName)!.policies.push(policy);
    });

    return Array.from(schemas.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [policies]);

  const toggleSchema = (schemaName: string) => {
    setExpandedSchemas(prev => {
      const next = new Set(prev);
      if (next.has(schemaName)) {
        next.delete(schemaName);
        const schema = treeData.find(s => s.name === schemaName);
        if (schema) {
          schema.tables.forEach(table => {
            const tableKey = `${schemaName}.${table.name}`;
            setExpandedTables(prevTables => {
              const nextTables = new Set(prevTables);
              nextTables.delete(tableKey);
              return nextTables;
            });
            table.columns.forEach(column => {
              const columnKey = `${schemaName}.${table.name}.${column.name}`;
              setExpandedColumns(prevColumns => {
                const nextColumns = new Set(prevColumns);
                nextColumns.delete(columnKey);
                return nextColumns;
              });
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
        const schema = treeData.find(s => s.name === schemaName);
        if (schema) {
          const table = schema.tables.get(tableName);
          if (table) {
            table.columns.forEach(column => {
              const columnKey = `${schemaName}.${tableName}.${column.name}`;
              setExpandedColumns(prevColumns => {
                const nextColumns = new Set(prevColumns);
                nextColumns.delete(columnKey);
                return nextColumns;
              });
            });
          }
        }
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const toggleColumn = (schemaName: string, tableName: string, columnName: string) => {
    const key = `${schemaName}.${tableName}.${columnName}`;
    setExpandedColumns(prev => {
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

  const formatDate = (date: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleString();
  };

  if (policies.length === 0) {
    return (
      <div style={{
        padding: theme.spacing.lg,
        textAlign: 'center',
        color: asciiColors.muted,
        fontFamily: 'Consolas',
        fontSize: 12
      }}>
        No encryption policies found. Create one to get started.
      </div>
    );
  }

  return (
    <div style={{
      fontFamily: "Consolas",
      fontSize: 12,
      color: asciiColors.foreground
    }}>
      {treeData.map((schema, schemaIdx) => {
        const isSchemaExpanded = expandedSchemas.has(schema.name);
        const schemaTables = Array.from(schema.tables.values());
        const isSchemaLast = schemaIdx === treeData.length - 1;

        return (
          <div key={schema.name} style={{ marginBottom: 4 }}>
            {/* Schema Level */}
            <div
              onClick={() => toggleSchema(schema.name)}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "10px 8px",
                cursor: "pointer",
                borderLeft: `2px solid ${asciiColors.accent}`,
                backgroundColor: isSchemaExpanded ? asciiColors.backgroundSoft : asciiColors.background,
                transition: "all 0.15s ease",
                marginBottom: 2
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = asciiColors.backgroundSoft;
              }}
              onMouseLeave={(e) => {
                if (!isSchemaExpanded) {
                  e.currentTarget.style.backgroundColor = asciiColors.background;
                }
              }}
            >
              <span style={{
                marginRight: 8,
                color: isSchemaExpanded ? asciiColors.accent : asciiColors.muted,
                fontSize: 10,
                transition: "transform 0.15s ease",
                display: "inline-block",
                transform: isSchemaExpanded ? "rotate(90deg)" : "rotate(0deg)"
              }}>
                {ascii.arrowRight}
              </span>
              <span style={{
                fontWeight: 600,
                color: asciiColors.accent,
                fontSize: 12,
                flex: 1
              }}>
                {schema.name}
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
                {schemaTables.reduce((sum, t) => sum + Array.from(t.columns.values()).reduce((s, c) => s + c.policies.length, 0), 0)}
              </span>
            </div>

            {isSchemaExpanded && (
              <div style={{ paddingLeft: 24 }}>
                {schemaTables.map((table, tableIdx) => {
                  const tableKey = `${schema.name}.${table.name}`;
                  const isTableExpanded = expandedTables.has(tableKey);
                  const tableColumns = Array.from(table.columns.values());
                  const isTableLast = tableIdx === schemaTables.length - 1;

                  return (
                    <div key={tableKey}>
                      {/* Table Level */}
                      <div
                        onClick={() => toggleTable(schema.name, table.name)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          padding: "8px 8px",
                          marginLeft: 8,
                          marginBottom: 2,
                          borderLeft: `2px solid ${asciiColors.border}`,
                          backgroundColor: isTableExpanded ? asciiColors.backgroundSoft : "transparent",
                          transition: "all 0.15s ease",
                          cursor: "pointer"
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = asciiColors.backgroundSoft;
                          e.currentTarget.style.borderLeftColor = asciiColors.accent;
                        }}
                        onMouseLeave={(e) => {
                          if (!isTableExpanded) {
                            e.currentTarget.style.backgroundColor = "transparent";
                            e.currentTarget.style.borderLeftColor = asciiColors.border;
                          }
                        }}
                      >
                        {renderTreeLine(1, isTableLast)}
                        <span style={{
                          marginRight: 8,
                          color: isTableExpanded ? asciiColors.accent : asciiColors.muted,
                          fontSize: 10,
                          transition: "transform 0.15s ease",
                          display: "inline-block",
                          transform: isTableExpanded ? "rotate(90deg)" : "rotate(0deg)"
                        }}>
                          {ascii.arrowRight}
                        </span>
                        <span style={{
                          fontWeight: 600,
                          color: asciiColors.foreground,
                          fontSize: 11,
                          flex: 1
                        }}>
                          {table.name}
                        </span>
                        <span style={{
                          padding: "2px 6px",
                          borderRadius: 2,
                          fontSize: 10,
                          fontWeight: 500,
                          border: `1px solid ${asciiColors.border}`,
                          backgroundColor: "transparent",
                          color: asciiColors.muted
                        }}>
                          {tableColumns.reduce((sum, c) => sum + c.policies.length, 0)}
                        </span>
                      </div>

                      {isTableExpanded && (
                        <div style={{ paddingLeft: 24 }}>
                          {tableColumns.map((column, colIdx) => {
                            const columnKey = `${schema.name}.${table.name}.${column.name}`;
                            const isColumnExpanded = expandedColumns.has(columnKey);
                            const isColumnLast = colIdx === tableColumns.length - 1;

                            return (
                              <div key={columnKey}>
                                {/* Column Level */}
                                <div
                                  onClick={() => toggleColumn(schema.name, table.name, column.name)}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    padding: "6px 8px",
                                    marginLeft: 8,
                                    marginBottom: 2,
                                    borderLeft: `1px solid ${asciiColors.border}`,
                                    backgroundColor: isColumnExpanded ? asciiColors.backgroundSoft : "transparent",
                                    transition: "all 0.15s ease",
                                    cursor: "pointer"
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = asciiColors.backgroundSoft;
                                    e.currentTarget.style.borderLeftColor = asciiColors.accent;
                                  }}
                                  onMouseLeave={(e) => {
                                    if (!isColumnExpanded) {
                                      e.currentTarget.style.backgroundColor = "transparent";
                                      e.currentTarget.style.borderLeftColor = asciiColors.border;
                                    }
                                  }}
                                >
                                  {renderTreeLine(2, isColumnLast)}
                                  <span style={{
                                    marginRight: 8,
                                    color: isColumnExpanded ? asciiColors.accent : asciiColors.muted,
                                    fontSize: 10,
                                    transition: "transform 0.15s ease",
                                    display: "inline-block",
                                    transform: isColumnExpanded ? "rotate(90deg)" : "rotate(0deg)"
                                  }}>
                                    {ascii.arrowRight}
                                  </span>
                                  <span style={{
                                    fontWeight: 500,
                                    color: asciiColors.accent,
                                    fontSize: 11,
                                    flex: 1
                                  }}>
                                    {column.name}
                                  </span>
                                  <span style={{
                                    padding: "2px 6px",
                                    borderRadius: 2,
                                    fontSize: 10,
                                    fontWeight: 500,
                                    border: `1px solid ${asciiColors.border}`,
                                    backgroundColor: "transparent",
                                    color: asciiColors.muted
                                  }}>
                                    {column.policies.length}
                                  </span>
                                </div>

                                {isColumnExpanded && (
                                  <div style={{ paddingLeft: 24 }}>
                                    {column.policies.map((policy, policyIdx) => {
                                      const isPolicyLast = policyIdx === column.policies.length - 1;

                                      return (
                                        <div
                                          key={policy.policy_id || policyIdx}
                                          style={{
                                            display: "flex",
                                            alignItems: "flex-start",
                                            padding: "8px 8px",
                                            marginLeft: 8,
                                            marginBottom: 2,
                                            borderLeft: `1px solid ${asciiColors.border}`,
                                            backgroundColor: "transparent",
                                            transition: "all 0.15s ease"
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
                                          {renderTreeLine(3, isPolicyLast)}
                                          <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                              <span style={{
                                                fontWeight: 600,
                                                color: asciiColors.foreground,
                                                fontSize: 11
                                              }}>
                                                {policy.policy_name}
                                              </span>
                                              <span style={{
                                                padding: "2px 6px",
                                                borderRadius: 2,
                                                fontSize: 10,
                                                fontWeight: 500,
                                                border: `1px solid ${asciiColors.accent}`,
                                                color: asciiColors.accent,
                                                backgroundColor: "transparent"
                                              }}>
                                                {policy.encryption_algorithm}
                                              </span>
                                              <span style={{
                                                padding: "2px 6px",
                                                borderRadius: 2,
                                                fontSize: 10,
                                                fontWeight: 500,
                                                border: `1px solid ${policy.active ? asciiColors.accent : asciiColors.muted}`,
                                                color: policy.active ? asciiColors.accent : asciiColors.muted,
                                                backgroundColor: "transparent"
                                              }}>
                                                {policy.active ? 'ACTIVE' : 'INACTIVE'}
                                              </span>
                                            </div>
                                            <div style={{ fontSize: 10, color: asciiColors.muted, marginBottom: 4 }}>
                                              Key ID: <code style={{ color: asciiColors.foreground }}>{policy.key_id}</code>
                                            </div>
                                            <div style={{ fontSize: 10, color: asciiColors.muted }}>
                                              Last Rotated: {formatDate(policy.last_rotated_at || '')}
                                            </div>
                                          </div>
                                          <div style={{ display: "flex", gap: 4, marginLeft: 8 }}>
                                            <AsciiButton
                                              label="Edit"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                onEdit?.(policy);
                                              }}
                                              variant="ghost"
                                              style={{ fontSize: 10, padding: "2px 6px" }}
                                            />
                                            <AsciiButton
                                              label="Encrypt"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                onEncrypt?.(policy);
                                              }}
                                              variant="ghost"
                                              style={{ fontSize: 10, padding: "2px 6px" }}
                                            />
                                            <AsciiButton
                                              label="Rotate"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                onRotateKey?.(policy);
                                              }}
                                              variant="ghost"
                                              style={{ fontSize: 10, padding: "2px 6px" }}
                                            />
                                            {policy.policy_id && (
                                              <AsciiButton
                                                label="Delete"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  onDelete?.(policy.policy_id!);
                                                }}
                                                variant="ghost"
                                                style={{ fontSize: 10, padding: "2px 6px" }}
                                              />
                                            )}
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
                      )}
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

export default DataEncryptionTreeView;
