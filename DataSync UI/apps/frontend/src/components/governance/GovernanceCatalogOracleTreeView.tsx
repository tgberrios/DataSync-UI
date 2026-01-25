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

const TreeContent = styled.div<{ $level: number; $isExpanded?: boolean; $nodeType?: 'schema' | 'object' }>`
  display: flex;
  align-items: center;
  padding: ${props => props.$level === 0 ? '8px' : '6px 8px'};
  padding-left: ${props => props.$level * 24 + 8}px;
  cursor: pointer;
  border-radius: 2px;
  transition: all 0.2s ease;
  position: relative;
  margin: 2px 0;
  font-family: Consolas;
  font-size: 12px;
  
  background: transparent;
  
  ${props => {
    if (props.$nodeType === 'schema') {
      return `
        border: 1px solid transparent;
        border-left: 3px solid ${asciiColors.accent};
        font-weight: 600;
        
        &:hover {
          background: ${asciiColors.backgroundSoft};
          border-color: ${asciiColors.accent};
          transform: translateX(4px);
        }
      `;
    }
    return `
      &:hover {
        background: ${asciiColors.backgroundSoft};
        transform: translateX(4px);
      }
    `;
  }}
`;

const ExpandIconContainer = styled.div<{ $isExpanded: boolean }>`
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
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

const NodeLabel = styled.span<{ $isSchema?: boolean }>`
  flex: 1;
  font-family: Consolas;
  font-size: ${props => props.$isSchema ? '13px' : '12px'};
  color: ${props => props.$isSchema ? asciiColors.accent : asciiColors.foreground};
  font-weight: ${props => props.$isSchema ? 600 : 500};
  margin-right: 8px;
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
  margin-left: auto;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${asciiColors.accentLight};
    border-color: ${asciiColors.accent};
    color: ${asciiColors.accent};
    transform: translateY(-1px);
  }
`;

const ExpandableContent = styled.div<{ $isExpanded: boolean; $level: number }>`
  max-height: ${props => props.$isExpanded ? '10000px' : '0'};
  overflow: hidden;
  transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
`;

const ObjectDetailsRow = styled.div<{ $level?: number }>`
  padding: 8px;
  padding-left: ${props => (props.$level || 0) * 24 + 36}px;
  margin: 2px 0;
  border-radius: 2px;
  background: transparent;
  border: 1px solid ${asciiColors.border};
  transition: all 0.2s ease;
  cursor: pointer;
  font-family: Consolas;
  font-size: 12px;
  
  &:hover {
    background: ${asciiColors.backgroundSoft};
    border-color: ${asciiColors.accent};
    transform: translateX(4px);
  }
`;

const getStatusColor = (status?: string) => {
  if (!status) return asciiColors.muted;
  switch (status) {
    case 'HEALTHY':
    case 'EXCELLENT': return asciiColors.success;
    case 'WARNING': return asciiColors.warning;
    case 'CRITICAL': return asciiColors.danger;
    case 'REAL_TIME':
    case 'HIGH': return asciiColors.accent;
    case 'MEDIUM': return asciiColors.accentSoft;
    case 'LOW':
    case 'RARE': return asciiColors.muted;
    default: return asciiColors.muted;
  }
};

interface GovernanceItem {
  id: number;
  server_name?: string;
  database_name?: string;
  schema_name?: string;
  object_name?: string;
  object_type?: string;
  health_status?: string;
  access_frequency?: string;
  row_count?: number;
  table_size_mb?: number;
  [key: string]: any;
}

interface SchemaNode {
  name: string;
  objects: GovernanceItem[];
}

interface GovernanceCatalogOracleTreeViewProps {
  items: GovernanceItem[];
  onItemClick?: (item: GovernanceItem) => void;
}

const GovernanceCatalogOracleTreeView: React.FC<GovernanceCatalogOracleTreeViewProps> = ({ items, onItemClick }) => {
  const [expandedSchemas, setExpandedSchemas] = useState<Set<string>>(new Set());

  const treeData = useMemo(() => {
    const schemas = new Map<string, SchemaNode>();

    items.forEach(item => {
      const schemaKey = item.schema_name || 'default';
      if (!schemas.has(schemaKey)) {
        schemas.set(schemaKey, {
          name: schemaKey,
          objects: []
        });
      }
      schemas.get(schemaKey)!.objects.push(item);
    });

    return Array.from(schemas.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

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
      lines.push('│  ');
    }
    lines.push(isLast ? '└─ ' : '├─ ');
    return <TreeLine $isLast={isLast}>{lines.join('')}</TreeLine>;
  };

  const formatNumber = (value: number | string | null | undefined) => {
    if (value === null || value === undefined) return 'N/A';
    const num = Number(value);
    if (isNaN(num)) return 'N/A';
    return num.toLocaleString();
  };

  const formatBytes = (mb: number | string | null | undefined) => {
    if (mb === null || mb === undefined) return 'N/A';
    const num = Number(mb);
    if (isNaN(num)) return 'N/A';
    if (num < 1) return `${(num * 1024).toFixed(2)} KB`;
    return `${num.toFixed(2)} MB`;
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
          <CountBadge>{schema.objects.length} {schema.objects.length === 1 ? 'object' : 'objects'}</CountBadge>
        </TreeContent>
        <ExpandableContent $isExpanded={isExpanded} $level={level}>
          {isExpanded && schema.objects.map((item, index) => 
            renderObject(item, schema.name, level + 1, index === schema.objects.length - 1)
          )}
        </ExpandableContent>
      </TreeNode>
    );
  };

  const renderObject = (item: GovernanceItem, _schemaName: string, level: number, isLast: boolean) => {
    return (
      <ObjectDetailsRow
        key={item.id}
        $level={level}
        onClick={() => onItemClick?.(item)}
      >
        {renderTreeLine(level, isLast)}
        <span style={{ marginRight: '8px', color: asciiColors.muted, fontFamily: 'Consolas' }}>
          {ascii.blockFull}
        </span>
        <span style={{ marginRight: '8px', fontWeight: 500, color: asciiColors.foreground, fontFamily: 'Consolas' }}>
          {item.object_name || 'N/A'}
        </span>
        {item.object_type && (
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
            {item.object_type}
          </span>
        )}
        {item.health_status && (
          <span style={{
            padding: '2px 8px',
            borderRadius: 2,
            fontSize: 11,
            fontFamily: 'Consolas',
            backgroundColor: getStatusColor(item.health_status) + '20',
            color: getStatusColor(item.health_status),
            border: `1px solid ${getStatusColor(item.health_status)}`,
            marginRight: 4
          }}>
            {item.health_status}
          </span>
        )}
        {item.access_frequency && (
          <span style={{
            padding: '2px 8px',
            borderRadius: 2,
            fontSize: 11,
            fontFamily: 'Consolas',
            backgroundColor: getStatusColor(item.access_frequency) + '20',
            color: getStatusColor(item.access_frequency),
            border: `1px solid ${getStatusColor(item.access_frequency)}`,
            marginRight: 4
          }}>
            {item.access_frequency}
          </span>
        )}
        <span style={{ marginLeft: 'auto', color: asciiColors.muted, fontSize: 11, fontFamily: 'Consolas' }}>
          {formatNumber(item.row_count)} rows {ascii.bullet} {formatBytes(item.table_size_mb)}
        </span>
      </ObjectDetailsRow>
    );
  };

  if (treeData.length === 0) {
    return (
      <TreeContainer>
        <div style={{ 
          padding: '60px 40px', 
          textAlign: 'center', 
          color: asciiColors.muted,
          fontFamily: 'Consolas'
        }}>
          <div style={{ fontSize: 48, marginBottom: 16, fontFamily: 'Consolas', opacity: 0.5 }}>
            {ascii.blockFull}
          </div>
          <div style={{ fontSize: 13, fontFamily: 'Consolas', fontWeight: 600, marginBottom: 8, color: asciiColors.foreground }}>
            No governance data available
          </div>
          <div style={{ fontSize: 12, fontFamily: 'Consolas', opacity: 0.7, color: asciiColors.muted }}>
            Data will appear here once collected.
          </div>
        </div>
      </TreeContainer>
    );
  }

  return (
    <TreeContainer>
      {treeData.map((schema) => 
        renderSchema(schema, 0)
      )}
    </TreeContainer>
  );
};

export default GovernanceCatalogOracleTreeView;

