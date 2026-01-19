import React, { useState, useMemo } from 'react';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import type { DataWarehouseEntry } from '../../services/api';

interface SchemaNode {
  name: string;
  warehouses: DataWarehouseEntry[];
}

interface TreeViewProps {
  warehouses: DataWarehouseEntry[];
  onWarehouseClick?: (warehouse: DataWarehouseEntry) => void;
  onWarehouseEdit?: (warehouse: DataWarehouseEntry) => void;
  onWarehouseBuild?: (warehouseName: string) => void;
  onWarehouseToggleActive?: (warehouseName: string, currentActive: boolean) => void;
  onWarehouseDelete?: (warehouseName: string) => void;
}

const DataWarehouseTreeView: React.FC<TreeViewProps> = ({ 
  warehouses, 
  onWarehouseClick, 
  onWarehouseEdit, 
  onWarehouseBuild, 
  onWarehouseToggleActive, 
  onWarehouseDelete
}) => {
  const [expandedSchemas, setExpandedSchemas] = useState<Set<string>>(new Set());

  const treeData = useMemo(() => {
    const schemas = new Map<string, SchemaNode>();

    warehouses.forEach(warehouse => {
      const schemaName = warehouse.target_schema || 'Other';

      if (!schemas.has(schemaName)) {
        schemas.set(schemaName, {
          name: schemaName,
          warehouses: []
        });
      }

      schemas.get(schemaName)!.warehouses.push(warehouse);
    });

    return Array.from(schemas.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [warehouses]);

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

  if (warehouses.length === 0) {
    return (
      <div style={{ 
        padding: 40, 
        textAlign: 'center', 
        color: asciiColors.muted, 
        fontFamily: 'Consolas' 
      }}>
        <div style={{ 
          fontSize: 48, 
          marginBottom: 12,
          opacity: 0.4,
          fontFamily: 'Consolas'
        }}>
          {ascii.blockFull}
        </div>
        <div style={{ 
          fontSize: 12, 
          fontFamily: 'Consolas',
          marginBottom: 4
        }}>
          No warehouses found
        </div>
        <div style={{ 
          fontSize: 11, 
          fontFamily: 'Consolas',
          color: asciiColors.muted,
          opacity: 0.7
        }}>
          Try adjusting your filters
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {treeData.map(schema => {
        const isExpanded = expandedSchemas.has(schema.name);
        return (
          <div key={schema.name} style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '10px 14px',
                cursor: 'pointer',
                backgroundColor: isExpanded ? asciiColors.backgroundSoft : 'transparent',
                borderRadius: 2,
                userSelect: 'none',
                transition: 'all 0.2s',
                border: isExpanded ? `1px solid ${asciiColors.border}` : '1px solid transparent',
                marginBottom: 4
              }}
              onClick={() => toggleSchema(schema.name)}
              onMouseEnter={(e) => {
                if (!isExpanded) {
                  e.currentTarget.style.backgroundColor = asciiColors.backgroundSoft;
                  e.currentTarget.style.borderColor = asciiColors.border;
                }
              }}
              onMouseLeave={(e) => {
                if (!isExpanded) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.borderColor = 'transparent';
                }
              }}
            >
              <span style={{ 
                marginRight: 10, 
                fontSize: 12,
                fontFamily: 'Consolas',
                transition: 'transform 0.2s',
                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                color: isExpanded ? asciiColors.accent : asciiColors.muted
              }}>
                {ascii.arrowRight}
              </span>
              <h3 style={{ 
                margin: 0,
                fontSize: 13, 
                fontFamily: 'Consolas', 
                fontWeight: 600,
                color: isExpanded ? asciiColors.accent : asciiColors.foreground,
                flex: 1,
                transition: 'color 0.2s'
              }}>
                {schema.name}
              </h3>
              <span style={{
                fontSize: 11,
                color: asciiColors.muted,
                fontFamily: 'Consolas',
                padding: '4px 8px',
                backgroundColor: isExpanded ? asciiColors.accent + '20' : asciiColors.background,
                borderRadius: 2,
                fontWeight: 500,
                transition: 'all 0.2s',
                border: `1px solid ${isExpanded ? asciiColors.accent : asciiColors.border}`
              }}>
                {schema.warehouses.length}
              </span>
            </div>

            {isExpanded && (
              <div style={{ 
                marginLeft: 24, 
                marginTop: 6, 
                marginBottom: 8,
                display: 'flex', 
                flexDirection: 'column', 
                gap: 6,
                paddingLeft: 12,
                borderLeft: `2px solid ${asciiColors.border}`
              }}>
                {schema.warehouses.map(warehouse => (
                  <div
                    key={warehouse.warehouse_name}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '10px 12px',
                      cursor: 'pointer',
                      borderRadius: 2,
                      border: `1px solid ${asciiColors.border}`,
                      backgroundColor: asciiColors.background,
                      transition: 'all 0.2s',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = asciiColors.backgroundSoft;
                      e.currentTarget.style.borderColor = asciiColors.accent;
                      e.currentTarget.style.transform = 'translateX(4px)';
                      e.currentTarget.style.boxShadow = `0 2px 8px ${asciiColors.accent}20`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = asciiColors.background;
                      e.currentTarget.style.borderColor = asciiColors.border;
                      e.currentTarget.style.transform = 'translateX(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    onClick={() => onWarehouseClick?.(warehouse)}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 12,
                        fontFamily: 'Consolas',
                        color: asciiColors.foreground,
                        fontWeight: 500,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        marginBottom: 4
                      }}>
                        {warehouse.warehouse_name}
                      </div>
                      <div style={{
                        fontSize: 11,
                        color: asciiColors.muted,
                        fontFamily: 'Consolas',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8
                      }}>
                        <span>{warehouse.schema_type.replace('_', ' ')}</span>
                        <span style={{ color: asciiColors.border }}>•</span>
                        <span style={{
                          padding: '2px 6px',
                          borderRadius: 2,
                          backgroundColor: warehouse.target_layer === 'GOLD' ? asciiColors.success + '20' :
                                         warehouse.target_layer === 'SILVER' ? asciiColors.accent + '20' :
                                         asciiColors.backgroundSoft,
                          color: warehouse.target_layer === 'GOLD' ? asciiColors.success :
                                 warehouse.target_layer === 'SILVER' ? asciiColors.accent :
                                 asciiColors.muted,
                          fontWeight: 600,
                          fontSize: 10,
                          border: `1px solid ${warehouse.target_layer === 'GOLD' ? asciiColors.success :
                                  warehouse.target_layer === 'SILVER' ? asciiColors.accent :
                                  asciiColors.border}`
                        }}>
                          {warehouse.target_layer || 'BRONZE'}
                        </span>
                        <span style={{ color: asciiColors.border }}>•</span>
                        <span>{warehouse.dimensions.length}D</span>
                        <span style={{ color: asciiColors.border }}>•</span>
                        <span>{warehouse.facts.length}F</span>
                      </div>
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      gap: 6, 
                      alignItems: 'center', 
                      marginLeft: 12,
                      paddingLeft: 12,
                      borderLeft: `1px solid ${asciiColors.border}`
                    }}>
                      <div style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        backgroundColor: warehouse.active && warehouse.enabled 
                          ? asciiColors.success 
                          : asciiColors.muted,
                        boxShadow: warehouse.active && warehouse.enabled 
                          ? `0 0 6px ${asciiColors.success}40` 
                          : 'none',
                        transition: 'all 0.2s'
                      }}
                        title={warehouse.active && warehouse.enabled ? 'Active' : 'Inactive'}
                      />
                      {warehouse.last_build_status === 'SUCCESS' && (
                        <span 
                          style={{ 
                            fontSize: 14, 
                            color: asciiColors.success, 
                            fontFamily: 'Consolas',
                            lineHeight: 1
                          }}
                          title="Last build successful"
                        >
                          ✓
                        </span>
                      )}
                      {warehouse.last_build_status === 'ERROR' && (
                        <span 
                          style={{ 
                            fontSize: 14, 
                            color: asciiColors.danger, 
                            fontFamily: 'Consolas',
                            lineHeight: 1
                          }}
                          title="Last build failed"
                        >
                          ✗
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default DataWarehouseTreeView;

