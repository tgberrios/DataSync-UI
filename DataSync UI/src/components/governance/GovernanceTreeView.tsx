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
  margin: 4px 0;
`;

const TreeContent = styled.div`
  display: flex;
  align-items: center;
  padding: 8px;
  border-radius: 2px;
  transition: all 0.2s ease;
  cursor: pointer;
  font-family: Consolas;
  font-size: 12px;
  background: transparent;
  
  &:hover {
    background: ${asciiColors.backgroundSoft};
  }
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

const NodeLabel = styled.span`
  font-weight: 500;
  font-family: Consolas;
  font-size: 13px;
  color: ${asciiColors.accent};
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const CountBadge = styled.span`
  background: ${asciiColors.backgroundSoft};
  color: ${asciiColors.foreground};
  padding: 2px 8px;
  border-radius: 2px;
  font-size: 11px;
  font-weight: 500;
  font-family: Consolas;
  border: 1px solid ${asciiColors.border};
  transition: all 0.2s ease;
  
  &:hover {
    background: ${asciiColors.accentLight};
    border-color: ${asciiColors.accent};
    color: ${asciiColors.accent};
    transform: translateY(-1px);
  }
`;

const ExpandableContent = styled.div<{ $isExpanded: boolean }>`
  max-height: ${props => props.$isExpanded ? '10000px' : '0'};
  overflow: hidden;
  transition: max-height 0.3s ease-out;
  margin-left: 28px;
`;

const TableDetailsRow = styled.div<{ $level?: number }>`
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
    case 'CRITICAL':
    case 'EMERGENCY': return asciiColors.danger;
    default: return asciiColors.muted;
  }
};

const getScoreColor = (score: number) => {
  if (score >= 90) return asciiColors.success;
  if (score >= 70) return asciiColors.accent;
  if (score >= 50) return asciiColors.warning;
  return asciiColors.danger;
};

const EmptyStateIcon = styled.div`
  font-size: 3em;
  margin-bottom: ${theme.spacing.md};
  animation: ${fadeIn} 0.5s ease-out;
  font-family: "Consolas, 'Source Code Pro', monospace";
  opacity: 0.5;
`;

const EmptyStateTitle = styled.div`
  font-size: 1.1em;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
  font-weight: 500;
  margin-bottom: ${theme.spacing.sm};
`;

const EmptyStateText = styled.div`
  font-size: 0.9em;
  opacity: 0.7;
`;

interface GovernanceItem {
  id: number;
  schema_name?: string;
  table_name?: string;
  inferred_source_engine?: string;
  data_category?: string;
  business_domain?: string;
  health_status?: string;
  sensitivity_level?: string;
  data_quality_score?: number;
  table_size_mb?: number;
  total_rows?: number;
  access_frequency?: string;
}

interface SchemaNode {
  name: string;
  tables: GovernanceItem[];
}

interface GovernanceTreeViewProps {
  items: GovernanceItem[];
  onItemClick?: (item: GovernanceItem) => void;
}

const GovernanceTreeView: React.FC<GovernanceTreeViewProps> = ({ items, onItemClick }) => {
  const [expandedSchemas, setExpandedSchemas] = useState<Set<string>>(new Set());

  const treeData = useMemo(() => {
    const schemas = new Map<string, SchemaNode>();

    items.forEach(item => {
      const schemaKey = item.schema_name || 'default';
      if (!schemas.has(schemaKey)) {
        schemas.set(schemaKey, {
          name: schemaKey,
          tables: []
        });
      }
      schemas.get(schemaKey)!.tables.push(item);
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
    return <span style={{ color: asciiColors.muted, fontFamily: 'Consolas', fontSize: 12 }}>{lines.join('')}</span>;
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
    const isLast = false;

    return (
      <TreeNode key={schema.name}>
        <TreeContent onClick={() => toggleSchema(schema.name)}>
          {renderTreeLine(level, isLast)}
          <ExpandIconContainer $isExpanded={isExpanded}>
            {isExpanded ? ascii.arrowDown : ascii.arrowRight}
          </ExpandIconContainer>
          <span style={{ marginRight: '8px', color: asciiColors.accent, fontFamily: 'Consolas' }}>
            {ascii.blockFull}
          </span>
          <NodeLabel>
            {schema.name}
            <CountBadge>{schema.tables.length}</CountBadge>
          </NodeLabel>
        </TreeContent>
        <ExpandableContent $isExpanded={isExpanded}>
          {isExpanded && schema.tables.map((item, index) => 
            renderTable(item, schema.name, level + 1, index === schema.tables.length - 1)
          )}
        </ExpandableContent>
      </TreeNode>
    );
  };

  const renderTable = (item: GovernanceItem, _schemaName: string, level: number, isLast: boolean) => {
    return (
      <TableDetailsRow
        key={item.id}
        $level={level}
        onClick={() => onItemClick?.(item)}
      >
        {renderTreeLine(level, isLast)}
        <span style={{ marginRight: '8px', color: asciiColors.muted, fontFamily: 'Consolas' }}>
          {ascii.blockFull}
        </span>
        <span style={{ marginRight: '8px', fontWeight: 500, color: asciiColors.foreground, fontFamily: 'Consolas' }}>
          {item.table_name || 'N/A'}
        </span>
        {item.inferred_source_engine && (
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
            {item.inferred_source_engine}
          </span>
        )}
        {item.data_category && (
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
            {item.data_category}
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
        {item.sensitivity_level && (
          <span style={{
            padding: '2px 8px',
            borderRadius: 2,
            fontSize: 11,
            fontFamily: 'Consolas',
            backgroundColor: getStatusColor(item.sensitivity_level) + '20',
            color: getStatusColor(item.sensitivity_level),
            border: `1px solid ${getStatusColor(item.sensitivity_level)}`,
            marginRight: 4
          }}>
            {item.sensitivity_level}
          </span>
        )}
        {item.data_quality_score !== undefined && (
          <span style={{
            padding: '2px 8px',
            borderRadius: 2,
            fontSize: 11,
            fontFamily: 'Consolas',
            backgroundColor: getScoreColor(item.data_quality_score) + '20',
            color: getScoreColor(item.data_quality_score),
            border: `1px solid ${getScoreColor(item.data_quality_score)}`,
            marginRight: 4
          }}>
            {item.data_quality_score}%
          </span>
        )}
        <span style={{ marginLeft: 'auto', color: asciiColors.muted, fontSize: 11, fontFamily: 'Consolas' }}>
          {formatNumber(item.total_rows)} rows {ascii.bullet} {formatBytes(item.table_size_mb)}
        </span>
      </TableDetailsRow>
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

export default GovernanceTreeView;

