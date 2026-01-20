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
    opacity: 0;
    max-height: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    max-height: 10000px;
    transform: translateY(0);
  }
`;

const slideUp = keyframes`
  from {
    opacity: 1;
    max-height: 10000px;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    max-height: 0;
    transform: translateY(-10px);
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
  animation: ${fadeIn} 0.3s ease-out;
  
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
  animation: ${fadeIn} 0.3s ease-out;
  animation-fill-mode: both;
  
  &:nth-child(1) { animation-delay: 0.05s; }
  &:nth-child(2) { animation-delay: 0.1s; }
  &:nth-child(3) { animation-delay: 0.15s; }
  &:nth-child(4) { animation-delay: 0.2s; }
  &:nth-child(5) { animation-delay: 0.25s; }
`;

const TreeContent = styled.div<{ $level: number; $isExpanded?: boolean; $nodeType?: 'schema' | 'table' }>`
  display: flex;
  align-items: center;
  padding: ${props => props.$level === 0 ? '8px' : '6px 8px'};
  padding-left: ${props => props.$level * 24 + 8}px;
  border-radius: 2px;
  transition: all 0.2s ease;
  cursor: pointer;
  position: relative;
  margin: 2px 0;
  font-family: Consolas;
  font-size: 12px;
  background: transparent;
  
  ${props => {
    if (props.$nodeType === 'schema') {
      return `
        border-left: 3px solid ${asciiColors.accent};
        font-weight: 600;
      `;
    }
    return `
      border-left: 1px solid ${asciiColors.border};
    `;
  }}
  
  &:hover {
    background: ${asciiColors.backgroundSoft};
    transform: translateX(2px);
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

const NodeLabel = styled.span<{ $isSchema?: boolean }>`
  font-weight: ${props => props.$isSchema ? '700' : '500'};
  font-size: ${props => props.$isSchema ? '13px' : '12px'};
  font-family: Consolas;
  color: ${props => {
    if (props.$isSchema) return asciiColors.accent;
    return asciiColors.foreground;
  }};
  margin-right: 12px;
  transition: color 0.2s ease;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  overflow: hidden;
  animation: ${props => props.$isExpanded ? slideDown : slideUp} 0.3s ease-out;
  padding-left: ${props => props.$level * 24 + 36}px;
`;

const TreeLine = styled.span`
  color: ${asciiColors.muted};
  font-family: Consolas;
  margin-right: 4px;
  font-size: 12px;
`;

const ObjectDetailsRow = styled.div<{ $level: number }>`
  padding: 8px;
  padding-left: ${props => props.$level * 24 + 36}px;
  margin: 2px 0;
  border-radius: 2px;
  background: transparent;
  border: 1px solid ${asciiColors.border};
  transition: all 0.2s ease;
  cursor: pointer;
  animation: ${fadeIn} 0.3s ease-out;
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
    case 'PASSED':
    case 'EXCELLENT': return asciiColors.success;
    case 'WARNING': return asciiColors.warning;
    case 'FAILED':
    case 'CRITICAL': return asciiColors.danger;
    default: return asciiColors.muted;
  }
};

const getScoreColor = (score: number) => {
  if (score >= 90) return asciiColors.success;
  if (score >= 70) return asciiColors.success;
  if (score >= 50) return asciiColors.warning;
  return asciiColors.danger;
};

const EmptyState = styled.div`
  padding: 60px 40px;
  text-align: center;
  color: ${asciiColors.muted};
  animation: ${fadeIn} 0.5s ease-out;
  font-family: Consolas;
`;

const EmptyStateIcon = styled.div`
  font-size: 48px;
  margin-bottom: 16px;
  animation: ${fadeIn} 0.5s ease-out;
  font-family: Consolas;
  opacity: 0.5;
`;

const EmptyStateTitle = styled.div`
  font-size: 13px;
  font-family: Consolas;
  font-weight: 600;
  margin-bottom: 8px;
  color: ${asciiColors.foreground};
`;

const EmptyStateText = styled.div`
  font-size: 12px;
  font-family: Consolas;
  opacity: 0.7;
  color: ${asciiColors.muted};
`;

interface QualityItem {
  id: number;
  schema_name?: string;
  table_name?: string;
  source_db_engine?: string;
  validation_status?: string;
  quality_score?: number;
  total_rows?: number;
  null_count?: number;
  duplicate_count?: number;
  invalid_type_count?: number;
  out_of_range_count?: number;
  referential_integrity_errors?: number;
  constraint_violation_count?: number;
  check_timestamp?: string;
  check_duration_ms?: number;
  type_mismatch_details?: any;
  integrity_check_details?: any;
  error_details?: string;
}

interface SchemaNode {
  name: string;
  tables: QualityItem[];
}

interface QualityTreeViewProps {
  items: QualityItem[];
  onItemClick?: (item: QualityItem) => void;
}

const QualityTreeView: React.FC<QualityTreeViewProps> = ({ items, onItemClick }) => {
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
    return <TreeLine>{lines.join('')}</TreeLine>;
  };

  const formatNumber = (value: number | string | null | undefined) => {
    if (value === null || value === undefined) return 'N/A';
    const num = Number(value);
    if (isNaN(num)) return 'N/A';
    return num.toLocaleString();
  };

  const formatDate = (date: string | null | undefined) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString();
  };

  const renderSchema = (schema: SchemaNode, level: number) => {
    const isExpanded = expandedSchemas.has(schema.name);
    const isLast = false;

    return (
      <TreeNode key={schema.name}>
        <TreeContent 
          $level={level} 
          $isExpanded={isExpanded}
          $nodeType="schema"
          onClick={() => toggleSchema(schema.name)}
        >
          {renderTreeLine(level, isLast)}
          <ExpandIconContainer $isExpanded={isExpanded}>
            {isExpanded ? ascii.arrowDown : ascii.arrowRight}
          </ExpandIconContainer>
          <span style={{ marginRight: '8px', color: asciiColors.accent, fontFamily: 'Consolas' }}>
            {ascii.blockFull}
          </span>
          <NodeLabel $isSchema>
            {schema.name}
          </NodeLabel>
          <CountBadge>{schema.tables.length}</CountBadge>
        </TreeContent>
        <ExpandableContent $isExpanded={isExpanded} $level={level}>
          {isExpanded && schema.tables.map((item, index) => 
            renderTable(item, schema.name, level + 1, index === schema.tables.length - 1)
          )}
        </ExpandableContent>
      </TreeNode>
    );
  };

  const renderTable = (item: QualityItem, _schemaName: string, level: number, isLast: boolean) => {
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
          {item.table_name || 'N/A'}
        </span>
        {item.source_db_engine && (
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
            {item.source_db_engine}
          </span>
        )}
        {item.validation_status && (
          <span style={{
            padding: '2px 8px',
            borderRadius: 2,
            fontSize: 11,
            fontFamily: 'Consolas',
            backgroundColor: getStatusColor(item.validation_status) + '20',
            color: getStatusColor(item.validation_status),
            border: `1px solid ${getStatusColor(item.validation_status)}`,
            marginRight: 4
          }}>
            {item.validation_status}
          </span>
        )}
        {item.quality_score !== undefined && (
          <span style={{
            padding: '2px 8px',
            borderRadius: 2,
            fontSize: 11,
            fontFamily: 'Consolas',
            backgroundColor: getScoreColor(item.quality_score) + '20',
            color: getScoreColor(item.quality_score),
            border: `1px solid ${getScoreColor(item.quality_score)}`,
            marginRight: 4
          }}>
            {item.quality_score}%
          </span>
        )}
        <span style={{ marginLeft: 'auto', color: asciiColors.muted, fontSize: 11, fontFamily: 'Consolas' }}>
          {formatNumber(item.total_rows)} rows {ascii.bullet} {formatDate(item.check_timestamp)}
        </span>
      </ObjectDetailsRow>
    );
  };

  if (treeData.length === 0) {
    return (
      <TreeContainer>
        <EmptyState>
          <EmptyStateIcon>{ascii.blockFull}</EmptyStateIcon>
          <EmptyStateTitle>No quality data available</EmptyStateTitle>
          <EmptyStateText>Data will appear here once collected.</EmptyStateText>
        </EmptyState>
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

export default QualityTreeView;

