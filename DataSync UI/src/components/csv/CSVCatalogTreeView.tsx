import React, { useState, useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import { theme } from '../../theme/theme';
import { StatusBadge } from '../shared/BaseComponents';
import type { CSVCatalogEntry } from '../../services/api';

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
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
  font-size: 0.95em;
  background: ${theme.colors.background.main};
  border: 1px solid ${theme.colors.border.light};
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.lg};
  max-height: 800px;
  overflow-y: auto;
  overflow-x: hidden;
  box-shadow: ${theme.shadows.md};
  position: relative;
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: ${theme.colors.background.secondary};
    border-radius: ${theme.borderRadius.sm};
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${theme.colors.border.medium};
    border-radius: ${theme.borderRadius.sm};
    transition: background ${theme.transitions.normal};
    
    &:hover {
      background: ${theme.colors.primary.main};
    }
  }
`;

const TreeNode = styled.div`
  user-select: none;
  animation: ${fadeIn} 0.3s ease-out;
  margin-bottom: 2px;
`;

const TreeLine = styled.span<{ $isLast?: boolean }>`
  color: ${theme.colors.border.medium};
  margin-right: 6px;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
  transition: color ${theme.transitions.normal};
`;

const TreeContent = styled.div<{ $level: number; $isExpanded?: boolean; $nodeType?: 'schema' | 'table' | 'csv' }>`
  display: flex;
  align-items: center;
  padding: ${props => props.$level === 0 ? '12px 8px' : props.$level === 1 ? '10px 8px' : '8px 8px'};
  padding-left: ${props => props.$level * 24 + 8}px;
  cursor: pointer;
  border-radius: ${theme.borderRadius.md};
  transition: all ${theme.transitions.normal};
  position: relative;
  margin: 2px 0;
  
  ${props => {
    if (props.$nodeType === 'schema') {
      return `
        background: linear-gradient(135deg, ${theme.colors.primary.light}08 0%, ${theme.colors.primary.main}05 100%);
        border-left: 3px solid ${theme.colors.primary.main};
      `;
    }
    if (props.$nodeType === 'table') {
      return `
        background: ${theme.colors.background.secondary};
        border-left: 2px solid ${theme.colors.border.medium};
      `;
    }
    return '';
  }}
  
  &:hover {
    background: ${props => {
      if (props.$nodeType === 'schema') {
        return `linear-gradient(135deg, ${theme.colors.primary.light}15 0%, ${theme.colors.primary.main}10 100%)`;
      }
      if (props.$nodeType === 'table') {
        return theme.colors.background.main;
      }
      return theme.colors.background.secondary;
    }};
    transform: translateX(2px);
  }
`;

const ExpandIconContainer = styled.span<{ $isExpanded: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  margin-right: 8px;
  transition: transform ${theme.transitions.normal};
  color: ${theme.colors.text.secondary};
  
  ${props => props.$isExpanded && `
    transform: rotate(90deg);
  `}
`;

const NodeLabel = styled.span<{ $isSchema?: boolean; $isTable?: boolean; $isCsv?: boolean }>`
  font-weight: ${props => props.$isSchema ? 600 : props.$isTable ? 500 : 400};
  color: ${props => {
    if (props.$isSchema) return theme.colors.primary.dark;
    if (props.$isTable) return theme.colors.text.primary;
    return theme.colors.text.secondary;
  }};
  margin-right: ${theme.spacing.sm};
  flex: 1;
`;

const ApiInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  flex-wrap: wrap;
`;

const CountBadge = styled.span`
  padding: 2px 8px;
  border-radius: ${theme.borderRadius.sm};
  font-size: 0.75em;
  font-weight: 500;
  background: ${theme.colors.background.secondary};
  color: ${theme.colors.text.secondary};
  border: 1px solid ${theme.colors.border.light};
`;

const ActionButton = styled.button`
  padding: 4px 8px;
  border: none;
  border-radius: ${theme.borderRadius.sm};
  background: ${theme.colors.primary.main};
  color: ${theme.colors.text.white};
  cursor: pointer;
  font-size: 0.75em;
  transition: all ${theme.transitions.normal};
  display: flex;
  align-items: center;
  gap: 4px;
  
  &:hover {
    background: ${theme.colors.primary.dark};
    transform: translateY(-1px);
    box-shadow: ${theme.shadows.sm};
  }
  
  &:active {
    transform: translateY(0);
  }
  
  svg {
    width: 12px;
    height: 12px;
  }
`;

const ExpandableContent = styled.div<{ $isExpanded: boolean; $level: number }>`
  overflow: hidden;
  animation: ${props => props.$isExpanded ? slideDown : slideUp} 0.3s ease-out;
  padding-left: ${props => props.$level * 24 + 36}px;
`;

const EmptyState = styled.div`
  padding: 60px 40px;
  text-align: center;
  color: ${theme.colors.text.secondary};
  animation: ${fadeIn} 0.5s ease-out;
  
  &::before {
    content: '📄';
    font-size: 3em;
    display: block;
    margin-bottom: ${theme.spacing.md};
    opacity: 0.5;
  }
`;

const IconSchema = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
    <line x1="9" y1="3" x2="9" y2="21"/>
    <line x1="3" y1="9" x2="21" y2="9"/>
  </svg>
);

const IconTable = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"/>
  </svg>
);

const IconCSV = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>
);

interface SchemaNode {
  name: string;
  tables: Map<string, TableNode>;
}

interface TableNode {
  name: string;
  csvs: CSVCatalogEntry[];
}

interface TreeViewProps {
  entries: CSVCatalogEntry[];
  onEntryClick?: (entry: CSVCatalogEntry) => void;
  onDuplicate?: (entry: CSVCatalogEntry) => void;
}

const CSVCatalogTreeView: React.FC<TreeViewProps> = ({ entries, onEntryClick, onDuplicate }) => {
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
          csvs: []
        });
      }

      schema.tables.get(tableName)!.csvs.push(entry);
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
      lines.push('│  ');
    }
    
    if (isLast) {
      lines.push('└── ');
    } else {
      lines.push('├── ');
    }
    
    return <TreeLine $isLast={isLast}>{lines.join('')}</TreeLine>;
  };

  const renderCSV = (csv: CSVCatalogEntry, level: number, isLast: boolean) => {
    return (
      <TreeNode key={csv.id}>
        <TreeContent 
          $level={level} 
          $nodeType="csv"
          onClick={() => onEntryClick?.(csv)}
        >
          {renderTreeLine(level, isLast)}
          <IconCSV />
          <NodeLabel $isCsv>{csv.csv_name}</NodeLabel>
          <ApiInfo>
            <StatusBadge $status={csv.status}>{csv.status}</StatusBadge>
            {csv.active ? (
              <CountBadge style={{ background: theme.colors.status.success.bg, color: theme.colors.status.success.text }}>
                Active
              </CountBadge>
            ) : (
              <CountBadge style={{ background: theme.colors.status.error.bg, color: theme.colors.status.error.text }}>
                Inactive
              </CountBadge>
            )}
            <CountBadge>{csv.source_type}</CountBadge>
            {onDuplicate && (
              <ActionButton
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  onDuplicate(csv);
                }}
                title="Duplicate CSV"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
                Duplicate
              </ActionButton>
            )}
          </ApiInfo>
        </TreeContent>
      </TreeNode>
    );
  };

  const renderTable = (table: TableNode, schemaName: string, level: number) => {
    const key = `${schemaName}.${table.name}`;
    const isExpanded = expandedTables.has(key);
    const schema = treeData.find(s => s.name === schemaName);
    const tableKeys = Array.from(schema?.tables.keys() || []);
    const isLast = tableKeys[tableKeys.length - 1] === table.name;

    return (
      <TreeNode key={key}>
        <TreeContent 
          $level={level} 
          $isExpanded={isExpanded}
          $nodeType="table"
          onClick={() => toggleTable(schemaName, table.name)}
        >
          {renderTreeLine(level, isLast)}
          <ExpandIconContainer $isExpanded={isExpanded}>
            {isExpanded ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="18 15 12 9 6 15"/>
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            )}
          </ExpandIconContainer>
          <IconTable />
          <NodeLabel $isTable>{table.name}</NodeLabel>
          <ApiInfo>
            <CountBadge>{table.csvs.length} {table.csvs.length === 1 ? 'CSV' : 'CSVs'}</CountBadge>
          </ApiInfo>
        </TreeContent>
        <ExpandableContent $isExpanded={isExpanded} $level={level}>
          {isExpanded && table.csvs.map((csv, index) => {
            const isLast = index === table.csvs.length - 1;
            return renderCSV(csv, level + 1, isLast);
          })}
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
            {isExpanded ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="18 15 12 9 6 15"/>
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            )}
          </ExpandIconContainer>
          <IconSchema />
          <NodeLabel $isSchema>{schema.name}</NodeLabel>
          <ApiInfo>
            <CountBadge>{schema.tables.size} {schema.tables.size === 1 ? 'table' : 'tables'}</CountBadge>
          </ApiInfo>
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
          No CSV entries available. CSV sources will appear here once configured.
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

export default CSVCatalogTreeView;

