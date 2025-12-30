import React, { useState, useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import { theme } from '../../theme/theme';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const slideDown = keyframes`
  from {
    max-height: 0;
    opacity: 0;
  }
  to {
    max-height: 1000px;
    opacity: 1;
  }
`;

const slideUp = keyframes`
  from {
    max-height: 1000px;
    opacity: 1;
  }
  to {
    max-height: 0;
    opacity: 0;
  }
`;

const TreeContainer = styled.div`
  font-family: Consolas;
  font-size: 12px;
  background: ${asciiColors.background};
  border: 1px solid ${asciiColors.border};
  border-radius: 2px;
  padding: 16px;
  max-height: 800px;
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: ${asciiColors.backgroundSoft};
    border-radius: 2px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${asciiColors.border};
    border-radius: 2px;
    transition: background 0.2s ease;
    
    &:hover {
      background: ${asciiColors.accent};
    }
  }
`;

const TreeNode = styled.div`
  user-select: none;
  animation: ${fadeIn} 0.3s ease-out;
  margin-bottom: 2px;
`;

const TreeLine = styled.span<{ $isLast?: boolean }>`
  color: ${asciiColors.muted};
  margin-right: 6px;
  font-family: Consolas;
  font-size: 12px;
  transition: color 0.2s ease;
`;

const TreeContent = styled.div<{ $level: number; $isExpanded?: boolean; $nodeType?: 'schema' | 'table' | 'column' }>`
  display: flex;
  align-items: center;
  padding: ${props => props.$level === 0 ? '8px' : props.$level === 1 ? '6px 8px' : '6px 8px'};
  padding-left: ${props => props.$level * 24 + 8}px;
  cursor: pointer;
  border-radius: 2px;
  transition: all 0.2s ease;
  position: relative;
  margin: 2px 0;
  font-family: Consolas;
  font-size: 12px;
  
  ${props => {
    if (props.$nodeType === 'schema') {
      return `
        background: ${asciiColors.accentLight};
        border-left: 3px solid ${asciiColors.accent};
        font-weight: 600;
      `;
    }
    if (props.$nodeType === 'table') {
      return `
        background: ${asciiColors.backgroundSoft};
        border-left: 2px solid ${asciiColors.border};
      `;
    }
    return `
      border-left: 1px solid ${asciiColors.border};
    `;
  }}
  
  &:hover {
    background: ${props => {
      if (props.$nodeType === 'schema') {
        return asciiColors.accentLight;
      }
      return asciiColors.backgroundSoft;
    }};
    transform: translateX(2px);
  }
  
  &:active {
    transform: translateX(1px) scale(0.99);
  }
`;

const ExpandIconContainer = styled.div<{ $isExpanded: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  margin-right: 8px;
  border-radius: 2px;
  background: ${props => props.$isExpanded ? asciiColors.accent : asciiColors.backgroundSoft};
  color: ${props => props.$isExpanded ? '#ffffff' : asciiColors.accent};
  font-size: 10px;
  font-weight: bold;
  font-family: Consolas;
  transition: all 0.2s ease;
  flex-shrink: 0;
  
  &:hover {
    transform: scale(1.1);
  }
`;

const NodeLabel = styled.span<{ $isSchema?: boolean; $isTable?: boolean; $isColumn?: boolean }>`
  font-weight: ${props => props.$isSchema ? '700' : props.$isTable ? '600' : '500'};
  font-size: ${props => props.$isSchema ? '13px' : props.$isTable ? '12px' : '12px'};
  font-family: Consolas;
  color: ${props => {
    if (props.$isSchema) return asciiColors.accent;
    if (props.$isTable) return asciiColors.foreground;
    return asciiColors.foreground;
  }};
  margin-right: 12px;
  transition: color 0.2s ease;
  letter-spacing: ${props => props.$isSchema ? '0.3px' : '0'};
`;

const ColumnInfo = styled.div`
  display: inline-flex;
  gap: 6px;
  align-items: center;
  margin-left: auto;
  flex-wrap: wrap;
  font-size: 11px;
  font-family: Consolas;
`;

const CountBadge = styled.span`
  padding: 2px 8px;
  border-radius: 2px;
  font-size: 11px;
  font-weight: 500;
  font-family: Consolas;
  background: ${asciiColors.backgroundSoft};
  color: ${asciiColors.foreground};
  border: 1px solid ${asciiColors.border};
  transition: all 0.2s ease;
  
  &:hover {
    background: ${asciiColors.accentLight};
    border-color: ${asciiColors.accent};
    color: ${asciiColors.accent};
    transform: translateY(-1px);
  }
`;

const getBadgeColor = (type?: string, level?: string, flag?: boolean) => {
  if (type) {
    switch (type) {
      case 'PK': return asciiColors.accent;
      case 'FK': return asciiColors.warning;
      case 'UQ': return asciiColors.success;
      case 'IDX': return asciiColors.accent;
      default: return asciiColors.muted;
    }
  }
  if (level) {
    switch (level) {
      case 'HIGH': return asciiColors.danger;
      case 'MEDIUM': return asciiColors.warning;
      case 'LOW': return asciiColors.success;
      default: return asciiColors.muted;
    }
  }
  if (flag !== undefined) {
    return flag ? asciiColors.danger : asciiColors.success;
  }
  return asciiColors.muted;
};

const ExpandableContent = styled.div<{ $isExpanded: boolean; $level: number }>`
  overflow: hidden;
  animation: ${props => props.$isExpanded ? slideDown : slideUp} 0.3s ease-out;
  padding-left: ${props => props.$level * 24 + 36}px;
`;

const EmptyState = styled.div`
  padding: 60px 40px;
  text-align: center;
  color: ${asciiColors.muted};
  animation: ${fadeIn} 0.5s ease-out;
  font-family: Consolas;
`;


interface Column {
  id: number;
  schema_name: string;
  table_name: string;
  column_name: string;
  db_engine?: string;
  data_type?: string;
  ordinal_position?: number;
  is_nullable?: boolean;
  sensitivity_level?: string;
  contains_pii?: boolean;
  contains_phi?: boolean;
  is_primary_key?: boolean;
  is_foreign_key?: boolean;
  is_unique?: boolean;
  is_indexed?: boolean;
  [key: string]: any;
}

interface SchemaNode {
  name: string;
  tables: Map<string, TableNode>;
}

interface TableNode {
  name: string;
  columns: Column[];
}

interface TreeViewProps {
  columns: Column[];
  onColumnClick?: (column: Column) => void;
}

const ColumnCatalogTreeView: React.FC<TreeViewProps> = ({ columns, onColumnClick }) => {
  const [expandedSchemas, setExpandedSchemas] = useState<Set<string>>(new Set());
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [expandedColumns, setExpandedColumns] = useState<Set<number>>(new Set());

  const treeData = useMemo(() => {
    const schemas = new Map<string, SchemaNode>();

    columns.forEach(column => {
      const schemaName = column.schema_name;
      const tableName = column.table_name;

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
          columns: []
        });
      }

      const table = schema.tables.get(tableName)!;
      table.columns.push(column);
    });

    schemas.forEach(schema => {
      schema.tables.forEach(table => {
        table.columns.sort((a, b) => (a.ordinal_position || 0) - (b.ordinal_position || 0));
      });
    });

    return Array.from(schemas.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [columns]);

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

  const toggleColumn = (columnId: number) => {
    setExpandedColumns(prev => {
      const next = new Set(prev);
      if (next.has(columnId)) {
        next.delete(columnId);
      } else {
        next.add(columnId);
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
    
    return <TreeLine>{lines.join('')}</TreeLine>;
  };

  const renderColumn = (column: Column, schemaName: string, tableName: string, level: number) => {
    const columnId = column.id;
    const isExpanded = expandedColumns.has(columnId);
    const table = treeData.find(s => s.name === schemaName)?.tables.get(tableName);
    const columnIndex = table?.columns.findIndex(c => c.id === columnId) ?? -1;
    const isLastColumn = columnIndex === (table?.columns.length ?? 0) - 1;

    return (
      <TreeNode key={columnId}>
        <TreeContent 
          $level={level} 
          $isExpanded={isExpanded}
          $nodeType="column"
          onClick={() => {
            toggleColumn(columnId);
            onColumnClick?.(column);
          }}
        >
          {renderTreeLine(level, isLastColumn)}
          <ExpandIconContainer $isExpanded={isExpanded}>
            {isExpanded ? ascii.arrowDown : ascii.arrowRight}
          </ExpandIconContainer>
          <span style={{ marginRight: '8px', color: asciiColors.muted, fontFamily: 'Consolas' }}>
            {ascii.blockFull}
          </span>
          <NodeLabel $isColumn>{column.column_name}</NodeLabel>
          <ColumnInfo>
            {column.data_type && (
              <span style={{
                padding: '2px 8px',
                borderRadius: 2,
                fontSize: 11,
                fontFamily: 'Consolas',
                backgroundColor: asciiColors.backgroundSoft,
                color: asciiColors.foreground,
                border: `1px solid ${asciiColors.border}`,
                marginRight: 4
              }}>
                {column.data_type}
              </span>
            )}
            {column.sensitivity_level && (
              <span style={{
                padding: '2px 8px',
                borderRadius: 2,
                fontSize: 11,
                fontFamily: 'Consolas',
                backgroundColor: getBadgeColor(undefined, column.sensitivity_level) + '20',
                color: getBadgeColor(undefined, column.sensitivity_level),
                border: `1px solid ${getBadgeColor(undefined, column.sensitivity_level)}`,
                marginRight: 4
              }}>
                {column.sensitivity_level}
              </span>
            )}
            {column.contains_pii && (
              <span style={{
                padding: '2px 8px',
                borderRadius: 2,
                fontSize: 11,
                fontFamily: 'Consolas',
                backgroundColor: getBadgeColor(undefined, undefined, true) + '20',
                color: getBadgeColor(undefined, undefined, true),
                border: `1px solid ${getBadgeColor(undefined, undefined, true)}`,
                marginRight: 4
              }}>
                PII
              </span>
            )}
            {column.contains_phi && (
              <span style={{
                padding: '2px 8px',
                borderRadius: 2,
                fontSize: 11,
                fontFamily: 'Consolas',
                backgroundColor: getBadgeColor(undefined, undefined, true) + '20',
                color: getBadgeColor(undefined, undefined, true),
                border: `1px solid ${getBadgeColor(undefined, undefined, true)}`,
                marginRight: 4
              }}>
                PHI
              </span>
            )}
            {column.is_primary_key && (
              <span style={{
                padding: '2px 8px',
                borderRadius: 2,
                fontSize: 11,
                fontFamily: 'Consolas',
                backgroundColor: getBadgeColor('PK') + '20',
                color: getBadgeColor('PK'),
                border: `1px solid ${getBadgeColor('PK')}`,
                marginRight: 4
              }}>
                PK
              </span>
            )}
            {column.is_foreign_key && (
              <span style={{
                padding: '2px 8px',
                borderRadius: 2,
                fontSize: 11,
                fontFamily: 'Consolas',
                backgroundColor: getBadgeColor('FK') + '20',
                color: getBadgeColor('FK'),
                border: `1px solid ${getBadgeColor('FK')}`,
                marginRight: 4
              }}>
                FK
              </span>
            )}
            {column.is_unique && (
              <span style={{
                padding: '2px 8px',
                borderRadius: 2,
                fontSize: 11,
                fontFamily: 'Consolas',
                backgroundColor: getBadgeColor('UQ') + '20',
                color: getBadgeColor('UQ'),
                border: `1px solid ${getBadgeColor('UQ')}`,
                marginRight: 4
              }}>
                UQ
              </span>
            )}
            {column.is_indexed && (
              <span style={{
                padding: '2px 8px',
                borderRadius: 2,
                fontSize: 11,
                fontFamily: 'Consolas',
                backgroundColor: getBadgeColor('IDX') + '20',
                color: getBadgeColor('IDX'),
                border: `1px solid ${getBadgeColor('IDX')}`,
                marginRight: 4
              }}>
                IDX
              </span>
            )}
          </ColumnInfo>
        </TreeContent>
        <ExpandableContent $isExpanded={isExpanded} $level={level}>
          {isExpanded && (
            <div style={{
              padding: '8px 12px',
              margin: '4px 0 8px 0',
              fontSize: 12,
              fontFamily: 'Consolas',
              color: asciiColors.foreground,
              background: asciiColors.backgroundSoft,
              borderLeft: `3px solid ${asciiColors.accent}`,
              borderRadius: 2,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 12
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <strong style={{ color: asciiColors.foreground, fontWeight: 600, minWidth: 80 }}>Engine:</strong>
                <span>{column.db_engine || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <strong style={{ color: asciiColors.foreground, fontWeight: 600, minWidth: 80 }}>Position:</strong>
                <span>{column.ordinal_position || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <strong style={{ color: asciiColors.foreground, fontWeight: 600, minWidth: 80 }}>Nullable:</strong>
                <span>{column.is_nullable ? 'Yes' : 'No'}</span>
              </div>
              {column.character_maximum_length && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <strong style={{ color: asciiColors.foreground, fontWeight: 600, minWidth: 80 }}>Max Length:</strong>
                  <span>{column.character_maximum_length}</span>
                </div>
              )}
              {column.numeric_precision && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <strong style={{ color: asciiColors.foreground, fontWeight: 600, minWidth: 80 }}>Precision:</strong>
                  <span>{column.numeric_precision}</span>
                </div>
              )}
              {column.column_default && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <strong style={{ color: asciiColors.foreground, fontWeight: 600, minWidth: 80 }}>Default:</strong>
                  <span>{column.column_default}</span>
                </div>
              )}
            </div>
          )}
        </ExpandableContent>
      </TreeNode>
    );
  };

  const renderTable = (table: TableNode, schemaName: string, level: number) => {
    const tableKey = `${schemaName}.${table.name}`;
    const isExpanded = expandedTables.has(tableKey);
    const schema = treeData.find(s => s.name === schemaName);
    const tableIndex = schema ? Array.from(schema.tables.keys()).indexOf(table.name) : -1;
    const isLastTable = tableIndex === (schema?.tables.size ?? 0) - 1;

    return (
      <TreeNode key={tableKey}>
        <TreeContent 
          $level={level} 
          $isExpanded={isExpanded}
          $nodeType="table"
          onClick={() => toggleTable(schemaName, table.name)}
        >
          {renderTreeLine(level, isLastTable)}
          <ExpandIconContainer $isExpanded={isExpanded}>
            {isExpanded ? ascii.arrowDown : ascii.arrowRight}
          </ExpandIconContainer>
          <span style={{ marginRight: '8px', color: asciiColors.foreground, fontFamily: 'Consolas' }}>
            {ascii.blockFull}
          </span>
          <NodeLabel $isTable>{table.name}</NodeLabel>
          <ColumnInfo>
            <CountBadge>{table.columns.length} {table.columns.length === 1 ? 'column' : 'columns'}</CountBadge>
          </ColumnInfo>
        </TreeContent>
        <ExpandableContent $isExpanded={isExpanded} $level={level}>
          {isExpanded && table.columns.map((column) => 
            renderColumn(column, schemaName, table.name, level + 1)
          )}
        </ExpandableContent>
      </TreeNode>
    );
  };

  const renderSchema = (schema: SchemaNode, level: number) => {
    const isExpanded = expandedSchemas.has(schema.name);
    const schemaIndex = treeData.findIndex(s => s.name === schema.name);
    const isLastSchema = schemaIndex === treeData.length - 1;

    return (
      <TreeNode key={schema.name}>
        <TreeContent 
          $level={level} 
          $isExpanded={isExpanded}
          $nodeType="schema"
          onClick={() => toggleSchema(schema.name)}
        >
          {renderTreeLine(level, isLastSchema)}
          <ExpandIconContainer $isExpanded={isExpanded}>
            {isExpanded ? ascii.arrowDown : ascii.arrowRight}
          </ExpandIconContainer>
          <span style={{ marginRight: '8px', color: asciiColors.accent, fontFamily: 'Consolas' }}>
            {ascii.blockFull}
          </span>
          <NodeLabel $isSchema>{schema.name}</NodeLabel>
          <ColumnInfo>
            <CountBadge>{schema.tables.size} {schema.tables.size === 1 ? 'table' : 'tables'}</CountBadge>
          </ColumnInfo>
        </TreeContent>
        <ExpandableContent $isExpanded={isExpanded} $level={level}>
          {isExpanded && Array.from(schema.tables.values()).map((table) => 
            renderTable(table, schema.name, level + 1)
          )}
        </ExpandableContent>
      </TreeNode>
    );
  };

  if (treeData.length === 0) {
    return (
      <TreeContainer>
        <EmptyState>
          <div style={{ fontSize: 48, marginBottom: 16, fontFamily: 'Consolas', opacity: 0.5 }}>
            {ascii.blockFull}
          </div>
          <div style={{ fontSize: 13, fontFamily: 'Consolas', fontWeight: 600, marginBottom: 8, color: asciiColors.foreground }}>
            No column data available
          </div>
          <div style={{ fontSize: 12, fontFamily: 'Consolas', opacity: 0.7, color: asciiColors.muted }}>
            Columns will appear here once cataloged.
          </div>
        </EmptyState>
      </TreeContainer>
    );
  }

  return (
    <TreeContainer>
      {treeData.map((schema, index) => (
        <div key={schema.name} style={{ animationDelay: `${index * 0.05}s` }}>
          {renderSchema(schema, 0)}
        </div>
      ))}
    </TreeContainer>
  );
};

export default ColumnCatalogTreeView;
