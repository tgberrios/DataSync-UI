import React, { useState, useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
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
  median_value?: number;
  std_deviation?: number;
  mode_value?: string;
  mode_frequency?: number;
  percentile_25?: number;
  percentile_75?: number;
  percentile_90?: number;
  percentile_95?: number;
  percentile_99?: number;
  value_distribution?: any;
  top_values?: any;
  outlier_count?: number;
  outlier_percentage?: number;
  detected_pattern?: string;
  pattern_confidence?: number;
  pattern_examples?: any;
  anomalies?: any;
  has_anomalies?: boolean;
  profiling_quality_score?: number;
  null_count?: number;
  null_percentage?: number;
  distinct_count?: number;
  distinct_percentage?: number;
  min_value?: string;
  max_value?: string;
  avg_value?: number;
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
            {column.profiling_quality_score !== undefined && column.profiling_quality_score !== null && column.profiling_quality_score > 0 && (
              <span style={{
                padding: '2px 8px',
                borderRadius: 2,
                fontSize: 11,
                fontFamily: 'Consolas',
                backgroundColor: column.profiling_quality_score >= 90 ? asciiColors.success + '20' : 
                                 column.profiling_quality_score >= 70 ? asciiColors.warning + '20' : 
                                 asciiColors.danger + '20',
                color: column.profiling_quality_score >= 90 ? asciiColors.success : 
                       column.profiling_quality_score >= 70 ? asciiColors.warning : 
                       asciiColors.danger,
                border: `1px solid ${column.profiling_quality_score >= 90 ? asciiColors.success : 
                                 column.profiling_quality_score >= 70 ? asciiColors.warning : 
                                 asciiColors.danger}`,
                marginRight: 4,
                fontWeight: 600
              }}>
                Q:{Number(column.profiling_quality_score).toFixed(0)}
              </span>
            )}
            {column.detected_pattern && (
              <span style={{
                padding: '2px 8px',
                borderRadius: 2,
                fontSize: 11,
                fontFamily: 'Consolas',
                backgroundColor: asciiColors.accent + '20',
                color: asciiColors.accent,
                border: `1px solid ${asciiColors.accent}`,
                marginRight: 4
              }}>
                {column.detected_pattern}
              </span>
            )}
            {column.has_anomalies && (
              <span style={{
                padding: '2px 8px',
                borderRadius: 2,
                fontSize: 11,
                fontFamily: 'Consolas',
                backgroundColor: asciiColors.danger + '20',
                color: asciiColors.danger,
                border: `1px solid ${asciiColors.danger}`,
                marginRight: 4
              }}>
                ANOMALIES
              </span>
            )}
          </ColumnInfo>
        </TreeContent>
        <ExpandableContent $isExpanded={isExpanded} $level={level}>
          {isExpanded && (
            <div style={{
              padding: '12px',
              margin: '4px 0 8px 0',
              fontSize: 12,
              fontFamily: 'Consolas',
              color: asciiColors.foreground,
              background: asciiColors.backgroundSoft,
              borderLeft: `3px solid ${asciiColors.accent}`,
              borderRadius: 2
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 12,
                marginBottom: 16
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <strong style={{ color: asciiColors.foreground, fontWeight: 600, minWidth: 100 }}>Engine:</strong>
                  <span>{column.db_engine || 'N/A'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <strong style={{ color: asciiColors.foreground, fontWeight: 600, minWidth: 100 }}>Position:</strong>
                  <span>{column.ordinal_position || 'N/A'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <strong style={{ color: asciiColors.foreground, fontWeight: 600, minWidth: 100 }}>Nullable:</strong>
                  <span>{column.is_nullable ? 'Yes' : 'No'}</span>
                </div>
                {column.character_maximum_length && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <strong style={{ color: asciiColors.foreground, fontWeight: 600, minWidth: 100 }}>Max Length:</strong>
                    <span>{column.character_maximum_length}</span>
                  </div>
                )}
                {column.numeric_precision && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <strong style={{ color: asciiColors.foreground, fontWeight: 600, minWidth: 100 }}>Precision:</strong>
                    <span>{column.numeric_precision}</span>
                  </div>
                )}
                {column.column_default && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <strong style={{ color: asciiColors.foreground, fontWeight: 600, minWidth: 100 }}>Default:</strong>
                    <span>{column.column_default}</span>
                  </div>
                )}
                {column.null_percentage !== undefined && column.null_percentage !== null && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <strong style={{ color: asciiColors.foreground, fontWeight: 600, minWidth: 100 }}>Null %:</strong>
                    <span>{Number(column.null_percentage).toFixed(2)}%</span>
                  </div>
                )}
                {column.distinct_percentage !== undefined && column.distinct_percentage !== null && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <strong style={{ color: asciiColors.foreground, fontWeight: 600, minWidth: 100 }}>Distinct %:</strong>
                    <span>{Number(column.distinct_percentage).toFixed(2)}%</span>
                  </div>
                )}
              </div>

              {(column.median_value !== undefined || column.std_deviation !== undefined || 
                column.percentile_25 !== undefined || column.mode_value) && (
                <div style={{
                  marginTop: 16,
                  padding: '12px',
                  background: asciiColors.background,
                  borderRadius: 2,
                  border: `1px solid ${asciiColors.border}`
                }}>
                  <div style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: asciiColors.accent,
                    marginBottom: 12,
                    paddingBottom: 6,
                    borderBottom: `1px solid ${asciiColors.border}`
                  }}>
                    {ascii.blockFull} STATISTICAL ANALYSIS
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: 10
                  }}>
                    {column.min_value && (
                      <div>
                        <div style={{ fontSize: 10, color: asciiColors.muted, marginBottom: 2 }}>Min</div>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{column.min_value}</div>
                      </div>
                    )}
                    {column.max_value && (
                      <div>
                        <div style={{ fontSize: 10, color: asciiColors.muted, marginBottom: 2 }}>Max</div>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{column.max_value}</div>
                      </div>
                    )}
                    {column.avg_value !== undefined && column.avg_value !== null && column.avg_value !== 0 && (
                      <div>
                        <div style={{ fontSize: 10, color: asciiColors.muted, marginBottom: 2 }}>Average</div>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{Number(column.avg_value).toFixed(2)}</div>
                      </div>
                    )}
                    {column.median_value !== undefined && column.median_value !== null && column.median_value !== 0 && (
                      <div>
                        <div style={{ fontSize: 10, color: asciiColors.muted, marginBottom: 2 }}>Median</div>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{Number(column.median_value).toFixed(2)}</div>
                      </div>
                    )}
                    {column.std_deviation !== undefined && column.std_deviation !== null && column.std_deviation !== 0 && (
                      <div>
                        <div style={{ fontSize: 10, color: asciiColors.muted, marginBottom: 2 }}>Std Dev</div>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{Number(column.std_deviation).toFixed(2)}</div>
                      </div>
                    )}
                    {column.mode_value && (
                      <div>
                        <div style={{ fontSize: 10, color: asciiColors.muted, marginBottom: 2 }}>Mode</div>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{column.mode_value}</div>
                        {column.mode_frequency !== undefined && column.mode_frequency !== null && (
                          <div style={{ fontSize: 10, color: asciiColors.muted, marginTop: 2 }}>
                            ({Number(column.mode_frequency).toFixed(2)}%)
                          </div>
                        )}
                      </div>
                    )}
                    {column.percentile_25 !== undefined && column.percentile_25 !== null && column.percentile_25 !== 0 && (
                      <div>
                        <div style={{ fontSize: 10, color: asciiColors.muted, marginBottom: 2 }}>P25</div>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{Number(column.percentile_25).toFixed(2)}</div>
                      </div>
                    )}
                    {column.percentile_75 !== undefined && column.percentile_75 !== null && column.percentile_75 !== 0 && (
                      <div>
                        <div style={{ fontSize: 10, color: asciiColors.muted, marginBottom: 2 }}>P75</div>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{Number(column.percentile_75).toFixed(2)}</div>
                      </div>
                    )}
                    {column.percentile_90 !== undefined && column.percentile_90 !== null && column.percentile_90 !== 0 && (
                      <div>
                        <div style={{ fontSize: 10, color: asciiColors.muted, marginBottom: 2 }}>P90</div>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{Number(column.percentile_90).toFixed(2)}</div>
                      </div>
                    )}
                    {column.percentile_95 !== undefined && column.percentile_95 !== null && column.percentile_95 !== 0 && (
                      <div>
                        <div style={{ fontSize: 10, color: asciiColors.muted, marginBottom: 2 }}>P95</div>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{Number(column.percentile_95).toFixed(2)}</div>
                      </div>
                    )}
                    {column.percentile_99 !== undefined && column.percentile_99 !== null && column.percentile_99 !== 0 && (
                      <div>
                        <div style={{ fontSize: 10, color: asciiColors.muted, marginBottom: 2 }}>P99</div>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{Number(column.percentile_99).toFixed(2)}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {column.detected_pattern && (
                <div style={{
                  marginTop: 16,
                  padding: '12px',
                  background: asciiColors.background,
                  borderRadius: 2,
                  border: `1px solid ${asciiColors.border}`
                }}>
                  <div style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: asciiColors.accent,
                    marginBottom: 12,
                    paddingBottom: 6,
                    borderBottom: `1px solid ${asciiColors.border}`
                  }}>
                    {ascii.blockSemi} DETECTED PATTERN
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <strong>Type:</strong> {column.detected_pattern}
                    {column.pattern_confidence !== undefined && column.pattern_confidence !== null && (
                      <span style={{ marginLeft: 8, color: asciiColors.muted }}>
                        ({Number(column.pattern_confidence).toFixed(1)}% confidence)
                      </span>
                    )}
                  </div>
                  {column.pattern_examples && Array.isArray(column.pattern_examples) && column.pattern_examples.length > 0 && (
                    <div>
                      <strong style={{ display: 'block', marginBottom: 4 }}>Examples:</strong>
                      <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 4
                      }}>
                        {column.pattern_examples.slice(0, 5).map((example: string, idx: number) => (
                          <span key={idx} style={{
                            padding: '2px 6px',
                            background: asciiColors.backgroundSoft,
                            borderRadius: 2,
                            fontSize: 11,
                            fontFamily: 'Consolas'
                          }}>
                            {example}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {column.top_values && Array.isArray(column.top_values) && column.top_values.length > 0 && (
                <div style={{
                  marginTop: 16,
                  padding: '12px',
                  background: asciiColors.background,
                  borderRadius: 2,
                  border: `1px solid ${asciiColors.border}`
                }}>
                  <div style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: asciiColors.accent,
                    marginBottom: 12,
                    paddingBottom: 6,
                    borderBottom: `1px solid ${asciiColors.border}`
                  }}>
                    {ascii.blockLight} TOP VALUES
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {column.top_values.slice(0, 10).map((item: any, idx: number) => (
                      <div key={idx} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '4px 8px',
                        background: idx < 3 ? asciiColors.accentLight : asciiColors.backgroundSoft,
                        borderRadius: 2
                      }}>
                        <span style={{ fontFamily: 'Consolas', fontSize: 11 }}>
                          {item.value !== undefined ? String(item.value) : 'N/A'}
                        </span>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{ fontSize: 10, color: asciiColors.muted }}>
                            {item.count || 0} times
                          </span>
                          {item.percentage !== undefined && item.percentage !== null && (
                            <span style={{
                              fontSize: 10,
                              fontWeight: 600,
                              color: asciiColors.accent
                            }}>
                              {Number(item.percentage).toFixed(2)}%
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {column.value_distribution && Array.isArray(column.value_distribution) && column.value_distribution.length > 0 && (
                <div style={{
                  marginTop: 16,
                  padding: '12px',
                  background: asciiColors.background,
                  borderRadius: 2,
                  border: `1px solid ${asciiColors.border}`
                }}>
                  <div style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: asciiColors.accent,
                    marginBottom: 12,
                    paddingBottom: 6,
                    borderBottom: `1px solid ${asciiColors.border}`
                  }}>
                    {ascii.blockSemi} VALUE DISTRIBUTION (HISTOGRAM)
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: 4,
                    marginTop: 8
                  }}>
                    {column.value_distribution.map((bin: any, idx: number) => {
                      const maxCount = Math.max(...column.value_distribution.map((b: any) => b.count || 0));
                      const barWidth = maxCount > 0 ? ((bin.count || 0) / maxCount) * 100 : 0;
                      
                      return (
                        <div key={idx} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '2px 0'
                        }}>
                          <div style={{
                            minWidth: 80,
                            fontSize: 10,
                            color: asciiColors.muted,
                            fontFamily: 'Consolas'
                          }}>
                            [{Number(bin.min || 0).toFixed(2)} - {Number(bin.max || 0).toFixed(2)}]
                          </div>
                          <div style={{
                            flex: 1,
                            height: 16,
                            background: asciiColors.backgroundSoft,
                            borderRadius: 2,
                            position: 'relative',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              width: `${barWidth}%`,
                              height: '100%',
                              background: idx % 2 === 0 
                                ? asciiColors.accent 
                                : asciiColors.accentLight,
                              borderRadius: 2,
                              transition: 'width 0.3s ease',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'flex-end',
                              paddingRight: 4
                            }}>
                              {barWidth > 15 && (
                                <span style={{
                                  fontSize: 9,
                                  color: asciiColors.foreground,
                                  fontWeight: 600
                                }}>
                                  {bin.count || 0}
                                </span>
                              )}
                            </div>
                          </div>
                          <div style={{
                            minWidth: 50,
                            fontSize: 10,
                            color: asciiColors.muted,
                            textAlign: 'right',
                            fontFamily: 'Consolas'
                          }}>
                            {bin.count || 0}
                          </div>
                          <div style={{
                            minWidth: 50,
                            fontSize: 10,
                            fontWeight: 600,
                            color: asciiColors.accent,
                            textAlign: 'right',
                            fontFamily: 'Consolas'
                          }}>
                            {bin.percentage !== undefined && bin.percentage !== null 
                              ? Number(bin.percentage).toFixed(1) + '%'
                              : '0%'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{
                    marginTop: 8,
                    paddingTop: 8,
                    borderTop: `1px solid ${asciiColors.border}`,
                    fontSize: 10,
                    color: asciiColors.muted,
                    fontFamily: 'Consolas'
                  }}>
                    Total bins: {column.value_distribution.length} | 
                    Max count: {Math.max(...column.value_distribution.map((b: any) => b.count || 0))}
                  </div>
                </div>
              )}

              {(column.has_anomalies || (column.outlier_count !== undefined && column.outlier_count > 0)) && (
                <div style={{
                  marginTop: 16,
                  padding: '12px',
                  background: asciiColors.danger + '10',
                  borderRadius: 2,
                  border: `1px solid ${asciiColors.danger}`
                }}>
                  <div style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: asciiColors.danger,
                    marginBottom: 12,
                    paddingBottom: 6,
                    borderBottom: `1px solid ${asciiColors.danger}`
                  }}>
                    {ascii.blockFull} ANOMALIES & OUTLIERS
                  </div>
                  {column.outlier_count !== undefined && column.outlier_count !== null && column.outlier_count > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <strong>Outliers detected:</strong> {column.outlier_count}
                      {column.outlier_percentage !== undefined && column.outlier_percentage !== null && (
                        <span style={{ marginLeft: 8, color: asciiColors.muted }}>
                          ({Number(column.outlier_percentage).toFixed(2)}%)
                        </span>
                      )}
                    </div>
                  )}
                  {column.anomalies && Array.isArray(column.anomalies) && column.anomalies.length > 0 && (
                    <div>
                      <strong style={{ display: 'block', marginBottom: 4 }}>Anomaly Examples:</strong>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {column.anomalies.slice(0, 5).map((anomaly: any, idx: number) => (
                          <div key={idx} style={{
                            padding: '4px 8px',
                            background: asciiColors.background,
                            borderRadius: 2,
                            fontSize: 11,
                            fontFamily: 'Consolas'
                          }}>
                            <span style={{ color: asciiColors.danger, fontWeight: 600 }}>
                              {anomaly.value !== undefined ? String(anomaly.value) : 'N/A'}
                            </span>
                            {anomaly.reason && (
                              <span style={{ marginLeft: 8, color: asciiColors.muted, fontSize: 10 }}>
                                ({anomaly.reason})
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {column.profiling_quality_score !== undefined && column.profiling_quality_score !== null && column.profiling_quality_score > 0 && (
                <div style={{
                  marginTop: 16,
                  padding: '12px',
                  background: column.profiling_quality_score >= 90 ? asciiColors.success + '10' :
                              column.profiling_quality_score >= 70 ? asciiColors.warning + '10' :
                              asciiColors.danger + '10',
                  borderRadius: 2,
                  border: `1px solid ${column.profiling_quality_score >= 90 ? asciiColors.success :
                                  column.profiling_quality_score >= 70 ? asciiColors.warning :
                                  asciiColors.danger}`
                }}>
                  <div style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: column.profiling_quality_score >= 90 ? asciiColors.success :
                           column.profiling_quality_score >= 70 ? asciiColors.warning :
                           asciiColors.danger,
                    marginBottom: 8
                  }}>
                    {ascii.blockFull} PROFILING QUALITY SCORE
                  </div>
                  <div style={{
                    fontSize: 24,
                    fontWeight: 700,
                    color: column.profiling_quality_score >= 90 ? asciiColors.success :
                           column.profiling_quality_score >= 70 ? asciiColors.warning :
                           asciiColors.danger,
                    fontFamily: 'Consolas'
                  }}>
                    {Number(column.profiling_quality_score).toFixed(1)}/100
                  </div>
                  <div style={{
                    width: '100%',
                    height: 8,
                    background: asciiColors.backgroundSoft,
                    borderRadius: 4,
                    marginTop: 8,
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${column.profiling_quality_score}%`,
                      height: '100%',
                      background: column.profiling_quality_score >= 90 ? asciiColors.success :
                                 column.profiling_quality_score >= 70 ? asciiColors.warning :
                                 asciiColors.danger,
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
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
