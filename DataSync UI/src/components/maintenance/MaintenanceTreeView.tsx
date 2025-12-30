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

const TreeContent = styled.div<{ $level: number; $isExpanded?: boolean; $nodeType?: 'database' | 'schema' | 'item' }>`
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
  
  ${props => {
    if (props.$nodeType === 'database') {
      return `
        background: ${asciiColors.accentLight};
        border-left: 3px solid ${asciiColors.accent};
        font-weight: 600;
      `;
    }
    if (props.$nodeType === 'schema') {
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
      if (props.$nodeType === 'database') {
        return asciiColors.accentLight;
      }
      return asciiColors.backgroundSoft;
    }};
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

const NodeLabel = styled.span<{ $isDatabase?: boolean; $isSchema?: boolean }>`
  font-weight: ${props => props.$isDatabase ? '700' : props.$isSchema ? '600' : '500'};
  font-size: ${props => props.$isDatabase ? '13px' : props.$isSchema ? '12px' : '12px'};
  font-family: Consolas;
  color: ${props => {
    if (props.$isDatabase) return asciiColors.accent;
    if (props.$isSchema) return asciiColors.foreground;
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
  background: ${asciiColors.background};
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
    case 'PENDING': return asciiColors.warning;
    case 'RUNNING': return asciiColors.accent;
    case 'COMPLETED': return asciiColors.success;
    case 'FAILED': return asciiColors.danger;
    case 'SKIPPED': return asciiColors.muted;
    default: return asciiColors.muted;
  }
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

interface MaintenanceItem {
  id: number;
  maintenance_type?: string;
  db_engine?: string;
  schema_name?: string;
  object_name?: string;
  object_type?: string;
  status?: string;
  priority?: string;
  impact_score?: number;
  space_reclaimed_mb?: number;
  maintenance_duration_seconds?: number;
  last_maintenance_date?: string;
  next_maintenance_date?: string;
  auto_execute?: boolean;
  enabled?: boolean;
  maintenance_count?: number;
  performance_improvement_pct?: number;
  first_detected_date?: string;
  last_checked_date?: string;
  result_message?: string;
  error_details?: string;
  fragmentation_before?: number;
  dead_tuples_before?: number;
  table_size_before_mb?: number;
  index_size_before_mb?: number;
  fragmentation_after?: number;
  dead_tuples_after?: number;
  table_size_after_mb?: number;
  index_size_after_mb?: number;
}

interface SchemaNode {
  name: string;
  items: MaintenanceItem[];
}

interface DatabaseNode {
  name: string;
  schemas: Map<string, SchemaNode>;
}

interface MaintenanceTreeViewProps {
  items: MaintenanceItem[];
  onItemClick?: (item: MaintenanceItem) => void;
}

const MaintenanceTreeView: React.FC<MaintenanceTreeViewProps> = ({ items, onItemClick }) => {
  const [expandedDatabases, setExpandedDatabases] = useState<Set<string>>(new Set());
  const [expandedSchemas, setExpandedSchemas] = useState<Set<string>>(new Set());

  const treeData = useMemo(() => {
    const databases = new Map<string, DatabaseNode>();

    items.forEach(item => {
      const dbKey = item.db_engine || 'Unknown';
      const schemaKey = item.schema_name || 'default';
      
      if (!databases.has(dbKey)) {
        databases.set(dbKey, {
          name: dbKey,
          schemas: new Map()
        });
      }
      
      const db = databases.get(dbKey)!;
      if (!db.schemas.has(schemaKey)) {
        db.schemas.set(schemaKey, {
          name: schemaKey,
          items: []
        });
      }
      
      db.schemas.get(schemaKey)!.items.push(item);
    });

    return Array.from(databases.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  const toggleDatabase = (dbName: string) => {
    setExpandedDatabases(prev => {
      const next = new Set(prev);
      if (next.has(dbName)) {
        next.delete(dbName);
      } else {
        next.add(dbName);
      }
      return next;
    });
  };

  const toggleSchema = (dbName: string, schemaName: string) => {
    const key = `${dbName}:${schemaName}`;
    setExpandedSchemas(prev => {
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
      lines.push('│  ');
    }
    lines.push(isLast ? '└─ ' : '├─ ');
    return <TreeLine>{lines.join('')}</TreeLine>;
  };

  const formatBytes = (mb: number | string | null | undefined) => {
    if (mb === null || mb === undefined) return 'N/A';
    const numMb = Number(mb);
    if (isNaN(numMb)) return 'N/A';
    if (numMb < 1) return `${(numMb * 1024).toFixed(2)} KB`;
    if (numMb < 1024) return `${numMb.toFixed(2)} MB`;
    return `${(numMb / 1024).toFixed(2)} GB`;
  };

  const formatDuration = (seconds: number | string | null | undefined) => {
    if (seconds === null || seconds === undefined) return 'N/A';
    const numSeconds = Number(seconds);
    if (isNaN(numSeconds)) return 'N/A';
    if (numSeconds < 60) return `${numSeconds.toFixed(2)}s`;
    if (numSeconds < 3600) return `${(numSeconds / 60).toFixed(2)}m`;
    return `${(numSeconds / 3600).toFixed(2)}h`;
  };

  const renderDatabase = (database: DatabaseNode, level: number) => {
    const isExpanded = expandedDatabases.has(database.name);
    const totalItems = Array.from(database.schemas.values()).reduce((sum, schema) => sum + schema.items.length, 0);

    return (
      <TreeNode key={database.name}>
        <TreeContent 
          $level={level} 
          $isExpanded={isExpanded}
          $nodeType="database"
          onClick={() => toggleDatabase(database.name)}
        >
          {renderTreeLine(level, false)}
          <ExpandIconContainer $isExpanded={isExpanded}>
            {isExpanded ? ascii.arrowDown : ascii.arrowRight}
          </ExpandIconContainer>
          <span style={{ marginRight: '8px', color: asciiColors.accent, fontFamily: 'Consolas' }}>
            {ascii.blockFull}
          </span>
          <NodeLabel $isDatabase>
            {database.name}
          </NodeLabel>
          <CountBadge>{totalItems}</CountBadge>
        </TreeContent>
        <ExpandableContent $isExpanded={isExpanded} $level={level}>
          {isExpanded && Array.from(database.schemas.values())
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((schema, idx, arr) => 
              renderSchema(schema, database.name, level + 1, idx === arr.length - 1)
            )}
        </ExpandableContent>
      </TreeNode>
    );
  };

  const renderSchema = (schema: SchemaNode, dbName: string, level: number, isLast: boolean) => {
    const key = `${dbName}:${schema.name}`;
    const isExpanded = expandedSchemas.has(key);

    return (
      <TreeNode key={key}>
        <TreeContent 
          $level={level} 
          $isExpanded={isExpanded}
          $nodeType="schema"
          onClick={() => toggleSchema(dbName, schema.name)}
        >
          {renderTreeLine(level, isLast)}
          <ExpandIconContainer $isExpanded={isExpanded}>
            {isExpanded ? ascii.arrowDown : ascii.arrowRight}
          </ExpandIconContainer>
          <span style={{ marginRight: '8px', color: asciiColors.foreground, fontFamily: 'Consolas' }}>
            {ascii.blockFull}
          </span>
          <NodeLabel $isSchema>
            {schema.name}
          </NodeLabel>
          <CountBadge>{schema.items.length}</CountBadge>
        </TreeContent>
        <ExpandableContent $isExpanded={isExpanded} $level={level}>
          {isExpanded && schema.items.map((item, index) => 
            renderItem(item, level + 1, index === schema.items.length - 1)
          )}
        </ExpandableContent>
      </TreeNode>
    );
  };

  const renderItem = (item: MaintenanceItem, level: number, isLast: boolean) => {
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
        {item.maintenance_type && (
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
            {item.maintenance_type}
          </span>
        )}
        {item.status && (
          <span style={{
            padding: '2px 8px',
            borderRadius: 2,
            fontSize: 11,
            fontFamily: 'Consolas',
            backgroundColor: getStatusColor(item.status) + '20',
            color: getStatusColor(item.status),
            border: `1px solid ${getStatusColor(item.status)}`,
            marginRight: 4
          }}>
            {item.status}
          </span>
        )}
        {item.error_details && (
          <span 
            title={item.error_details}
            style={{ 
              marginLeft: '8px', 
              color: asciiColors.danger, 
              fontSize: 11,
              fontFamily: 'Consolas',
              padding: '2px 6px',
              background: asciiColors.backgroundSoft,
              borderRadius: 2,
              border: `1px solid ${asciiColors.danger}`,
              maxWidth: '200px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {ascii.blockFull} {item.error_details}
          </span>
        )}
        <span style={{ marginLeft: 'auto', color: asciiColors.muted, fontSize: 11, fontFamily: 'Consolas', display: 'flex', gap: '8px', alignItems: 'center' }}>
          {item.impact_score && (
            <span>Impact: {Number(item.impact_score).toFixed(1)}</span>
          )}
          {item.space_reclaimed_mb && (
            <span>{ascii.bullet} {formatBytes(item.space_reclaimed_mb)}</span>
          )}
          {item.maintenance_duration_seconds && (
            <span>{ascii.bullet} {formatDuration(item.maintenance_duration_seconds)}</span>
          )}
        </span>
      </ObjectDetailsRow>
    );
  };

  if (treeData.length === 0) {
    return (
      <TreeContainer>
        <EmptyState>
          <EmptyStateIcon>{ascii.blockFull}</EmptyStateIcon>
          <EmptyStateTitle>No maintenance data available</EmptyStateTitle>
          <EmptyStateText>Maintenance operations will appear here once detected.</EmptyStateText>
        </EmptyState>
      </TreeContainer>
    );
  }

  return (
    <TreeContainer>
      {treeData.map((database) => 
        renderDatabase(database, 0)
      )}
    </TreeContainer>
  );
};

export default MaintenanceTreeView;

