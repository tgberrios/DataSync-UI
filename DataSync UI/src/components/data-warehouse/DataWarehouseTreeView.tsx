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
      <div style={{ padding: 20, textAlign: 'center', color: asciiColors.muted }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
        <div style={{ fontSize: 12, fontFamily: 'Consolas' }}>No warehouses found</div>
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
                padding: '8px 12px',
                cursor: 'pointer',
                backgroundColor: isExpanded ? asciiColors.backgroundSoft : 'transparent',
                borderRadius: 2,
                userSelect: 'none',
                transition: 'all 0.2s'
              }}
              onClick={() => toggleSchema(schema.name)}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = asciiColors.backgroundSoft;
              }}
              onMouseLeave={(e) => {
                if (!isExpanded) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <span style={{ 
                marginRight: 8, 
                fontSize: 12,
                transition: 'transform 0.2s',
                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)'
              }}>
                {ascii.arrowRight}
              </span>
              <span style={{ 
                fontSize: 12, 
                fontFamily: 'Consolas', 
                fontWeight: 600,
                color: asciiColors.accent,
                flex: 1
              }}>
                {schema.name}
              </span>
              <span style={{
                fontSize: 10,
                color: asciiColors.muted,
                fontFamily: 'Consolas',
                padding: '2px 6px',
                backgroundColor: asciiColors.background,
                borderRadius: 2
              }}>
                {schema.warehouses.length}
              </span>
            </div>

            {isExpanded && (
              <div style={{ marginLeft: 20, marginTop: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {schema.warehouses.map(warehouse => (
                  <div
                    key={warehouse.warehouse_name}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '6px 10px',
                      cursor: 'pointer',
                      borderRadius: 2,
                      border: `1px solid ${asciiColors.border}`,
                      backgroundColor: asciiColors.background,
                      marginBottom: 2,
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = asciiColors.backgroundSoft;
                      e.currentTarget.style.borderColor = asciiColors.accent;
                      e.currentTarget.style.transform = 'translateX(2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = asciiColors.background;
                      e.currentTarget.style.borderColor = asciiColors.border;
                      e.currentTarget.style.transform = 'translateX(0)';
                    }}
                    onClick={() => onWarehouseClick?.(warehouse)}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 11,
                        fontFamily: 'Consolas',
                        color: asciiColors.foreground,
                        fontWeight: 500,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {warehouse.warehouse_name}
                      </div>
                      <div style={{
                        fontSize: 10,
                        color: asciiColors.muted,
                        fontFamily: 'Consolas',
                        marginTop: 2
                      }}>
                        {warehouse.schema_type} • {warehouse.dimensions.length}D / {warehouse.facts.length}F
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginLeft: 8 }}>
                      <div style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: warehouse.active && warehouse.enabled 
                          ? asciiColors.success 
                          : asciiColors.muted
                      }}
                        title={warehouse.active && warehouse.enabled ? 'Active' : 'Inactive'}
                      />
                      {warehouse.last_build_status === 'SUCCESS' && (
                        <span style={{ fontSize: 10, color: asciiColors.success }}>✓</span>
                      )}
                      {warehouse.last_build_status === 'ERROR' && (
                        <span style={{ fontSize: 10, color: asciiColors.danger }}>✗</span>
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

