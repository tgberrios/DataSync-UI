import React, { useState, useMemo } from 'react';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { theme } from '../../theme/theme';
import type { RLSPolicy } from '../../services/api';

interface SchemaNode {
  name: string;
  tables: Map<string, TableNode>;
}

interface TableNode {
  name: string;
  policies: RLSPolicy[];
}

interface RowLevelSecurityTreeViewProps {
  policies: RLSPolicy[];
  onEdit?: (policy: RLSPolicy) => void;
  onDelete?: (policyId: number) => void;
}

const RowLevelSecurityTreeView: React.FC<RowLevelSecurityTreeViewProps> = ({ 
  policies, 
  onEdit, 
  onDelete
}) => {
  const [expandedSchemas, setExpandedSchemas] = useState<Set<string>>(new Set());
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());

  const treeData = useMemo(() => {
    const schemas = new Map<string, SchemaNode>();

    policies.forEach(policy => {
      const schemaName = policy.schema_name || 'Other';
      const tableName = policy.table_name || 'Other';

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
          policies: []
        });
      }

      schema.tables.get(tableName)!.policies.push(policy);
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

  if (policies.length === 0) {
    return (
      <div style={{
        padding: theme.spacing.lg,
        textAlign: 'center',
        color: asciiColors.muted,
        fontFamily: 'Consolas',
        fontSize: 12
      }}>
        No RLS policies found. Create one to get started.
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
                {schemaTables.reduce((sum, t) => sum + t.policies.length, 0)}
              </span>
            </div>

            {isSchemaExpanded && (
              <div style={{ paddingLeft: 24 }}>
                {schemaTables.map((table, tableIdx) => {
                  const tableKey = `${schema.name}.${table.name}`;
                  const isTableExpanded = expandedTables.has(tableKey);
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
                          {table.policies.length}
                        </span>
                      </div>

                      {isTableExpanded && (
                        <div style={{ paddingLeft: 24 }}>
                          {table.policies.map((policy, policyIdx) => {
                            const isPolicyLast = policyIdx === table.policies.length - 1;

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
                                {renderTreeLine(2, isPolicyLast)}
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
                                      {policy.policy_type}
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
                                    Expression:
                                  </div>
                                  <code style={{ 
                                    color: asciiColors.foreground, 
                                    fontSize: 10,
                                    fontFamily: 'Consolas',
                                    display: 'block',
                                    padding: '4px 8px',
                                    backgroundColor: asciiColors.backgroundSoft,
                                    borderRadius: 2,
                                    border: `1px solid ${asciiColors.border}`,
                                    wordBreak: 'break-word',
                                    whiteSpace: 'pre-wrap'
                                  }}>
                                    {policy.policy_expression}
                                  </code>
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
  );
};

export default RowLevelSecurityTreeView;
