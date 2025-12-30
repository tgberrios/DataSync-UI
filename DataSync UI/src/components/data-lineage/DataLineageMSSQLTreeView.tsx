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

const getConfidenceColor = (score: number | string | null | undefined) => {
  if (score === null || score === undefined) return asciiColors.muted;
  const numScore = Number(score);
  if (isNaN(numScore)) return asciiColors.muted;
  if (numScore >= 0.8) return asciiColors.success;
  if (numScore >= 0.5) return asciiColors.warning;
  return asciiColors.danger;
};

interface LineageEdge {
  id: number;
  object_name: string;
  object_type: string;
  target_object_name: string;
  target_object_type: string;
  relationship_type: string;
  server_name?: string;
  instance_name?: string;
  database_name?: string;
  confidence_score?: number;
  discovery_method?: string;
  column_name?: string;
  target_column_name?: string;
  [key: string]: any;
}

interface SourceNode {
  name: string;
  type: string;
  relationships: LineageEdge[];
}

interface TreeViewProps {
  edges: LineageEdge[];
  onEdgeClick?: (edge: LineageEdge) => void;
}

const DataLineageMSSQLTreeView: React.FC<TreeViewProps> = ({ edges, onEdgeClick }) => {
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());
  const [expandedRelationships, setExpandedRelationships] = useState<Set<number>>(new Set());

  const treeData = useMemo(() => {
    const sources = new Map<string, SourceNode>();

    edges.forEach(edge => {
      const sourceKey = `${edge.object_name}::${edge.object_type}`;
      if (!sources.has(sourceKey)) {
        sources.set(sourceKey, {
          name: edge.object_name || 'Unknown',
          type: edge.object_type || 'Unknown',
          relationships: []
        });
      }
      sources.get(sourceKey)!.relationships.push(edge);
    });

    return Array.from(sources.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [edges]);

  const toggleSource = (sourceKey: string) => {
    setExpandedSources(prev => {
      const next = new Set(prev);
      if (next.has(sourceKey)) {
        next.delete(sourceKey);
      } else {
        next.add(sourceKey);
      }
      return next;
    });
  };

  const toggleRelationship = (edgeId: number) => {
    setExpandedRelationships(prev => {
      const next = new Set(prev);
      if (next.has(edgeId)) {
        next.delete(edgeId);
      } else {
        next.add(edgeId);
      }
      return next;
    });
  };

  const formatConfidence = (score: number | string | null | undefined) => {
    if (score === null || score === undefined) return 'N/A';
    const numScore = Number(score);
    if (isNaN(numScore)) return 'N/A';
    return `${(numScore * 100).toFixed(1)}%`;
  };

  const getConfidenceLevel = (score: number | string | null | undefined): number => {
    if (score === null || score === undefined) return 2;
    const numScore = Number(score);
    if (isNaN(numScore)) return 2;
    if (numScore >= 0.8) return 0;
    if (numScore >= 0.5) return 1;
    return 2;
  };

  const renderTreeLine = (level: number, isLast: boolean) => {
    if (level === 0) return null;
    const lines: string[] = [];
    for (let i = 0; i < level - 1; i++) {
      lines.push('│  ');
    }
    lines.push(isLast ? '└─ ' : '├─ ');
    return <span style={{ color: asciiColors.muted, marginRight: 6, fontFamily: 'Consolas', fontSize: 12 }}>{lines.join('')}</span>;
  };

  const renderTarget = (edge: LineageEdge, level: number, isLast: boolean) => {
    const isExpanded = expandedRelationships.has(edge.id);

    return (
      <TreeNode key={edge.id}>
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: level === 0 ? '8px' : '6px 8px',
            paddingLeft: `${level * 24 + 8}px`,
            cursor: 'pointer',
            borderRadius: 2,
            transition: 'all 0.2s ease',
            margin: '2px 0',
            fontFamily: 'Consolas',
            fontSize: 12,
            backgroundColor: asciiColors.background,
            border: '1px solid transparent'
          }}
          onClick={() => {
            toggleRelationship(edge.id);
            onEdgeClick?.(edge);
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = asciiColors.backgroundSoft;
            e.currentTarget.style.transform = 'translateX(4px)';
            e.currentTarget.style.borderColor = asciiColors.accent;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = asciiColors.background;
            e.currentTarget.style.transform = 'translateX(0)';
            e.currentTarget.style.borderColor = 'transparent';
          }}
        >
          {renderTreeLine(level, isLast)}
          <span style={{ marginRight: '8px', color: asciiColors.muted, fontFamily: 'Consolas' }}>
            {ascii.blockFull}
          </span>
          <span style={{ 
            fontWeight: 400, 
            color: asciiColors.foreground, 
            fontSize: 12,
            fontFamily: 'Consolas',
            flex: 1
          }}>
            {edge.target_object_name || 'Unknown'}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto', flexWrap: 'wrap' }}>
            <span style={{
              padding: '2px 8px',
              borderRadius: 2,
              fontSize: 11,
              fontFamily: 'Consolas',
              backgroundColor: asciiColors.backgroundSoft,
              color: asciiColors.foreground,
              border: `1px solid ${asciiColors.border}`
            }}>
              {edge.target_object_type || 'N/A'}
            </span>
            {edge.target_column_name && (
              <span style={{
                padding: '2px 8px',
                borderRadius: 2,
                fontSize: 11,
                fontFamily: 'Consolas',
                backgroundColor: asciiColors.backgroundSoft,
                color: asciiColors.foreground,
                border: `1px solid ${asciiColors.border}`
              }}>
                Column: {edge.target_column_name}
              </span>
            )}
          </div>
        </div>
        <div style={{
          overflow: 'hidden',
          maxHeight: isExpanded ? '1000px' : '0',
          transition: 'max-height 0.3s ease-out',
          paddingLeft: `${level * 24 + 36}px`
        }}>
          {isExpanded && (
            <div style={{
              padding: 8,
              margin: '4px 0',
              background: asciiColors.background,
              borderRadius: 2,
              border: `1px solid ${asciiColors.border}`,
              fontSize: 11,
              fontFamily: 'Consolas'
            }}>
              <div style={{ marginBottom: 4, fontFamily: 'Consolas' }}>
                <strong style={{ color: asciiColors.foreground }}>Server:</strong> <span style={{ color: asciiColors.muted }}>{edge.server_name || 'N/A'}</span>
              </div>
              {edge.instance_name && (
                <div style={{ marginBottom: 4, fontFamily: 'Consolas' }}>
                  <strong style={{ color: asciiColors.foreground }}>Instance:</strong> <span style={{ color: asciiColors.muted }}>{edge.instance_name}</span>
                </div>
              )}
              {edge.database_name && (
                <div style={{ marginBottom: 4, fontFamily: 'Consolas' }}>
                  <strong style={{ color: asciiColors.foreground }}>Database:</strong> <span style={{ color: asciiColors.muted }}>{edge.database_name}</span>
                </div>
              )}
              <div style={{ marginBottom: 4, fontFamily: 'Consolas' }}>
                <strong style={{ color: asciiColors.foreground }}>Confidence:</strong>{' '}
                <span style={{
                  padding: '2px 8px',
                  borderRadius: 2,
                  fontSize: 11,
                  fontFamily: 'Consolas',
                  backgroundColor: getConfidenceColor(edge.confidence_score) + '20',
                  color: getConfidenceColor(edge.confidence_score),
                  border: `1px solid ${getConfidenceColor(edge.confidence_score)}`
                }}>
                  {formatConfidence(edge.confidence_score)}
                </span>
              </div>
              {edge.discovery_method && (
                <div style={{ fontFamily: 'Consolas' }}>
                  <strong style={{ color: asciiColors.foreground }}>Method:</strong> <span style={{ color: asciiColors.muted }}>{edge.discovery_method}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </TreeNode>
    );
  };

  const renderRelationship = (edge: LineageEdge, level: number, isLast: boolean) => {
    return (
      <TreeNode key={`rel-${edge.id}`}>
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '6px 8px',
            paddingLeft: `${level * 24 + 8}px`,
            borderRadius: 2,
            transition: 'all 0.2s ease',
            margin: '2px 0',
            fontFamily: 'Consolas',
            fontSize: 12,
            backgroundColor: asciiColors.background,
            border: '1px solid transparent'
          }}
        >
          {renderTreeLine(level, false)}
          <span style={{ marginRight: '8px', color: asciiColors.accent, fontFamily: 'Consolas', fontSize: 12 }}>
            {ascii.arrowRight}
          </span>
          <span style={{ 
            fontWeight: 500, 
            color: asciiColors.muted, 
            fontSize: 12,
            fontFamily: 'Consolas',
            flex: 1
          }}>
            {edge.relationship_type || 'Unknown'}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
            <span style={{
              padding: '2px 8px',
              borderRadius: 2,
              fontSize: 11,
              fontFamily: 'Consolas',
              backgroundColor: getConfidenceColor(edge.confidence_score) + '20',
              color: getConfidenceColor(edge.confidence_score),
              border: `1px solid ${getConfidenceColor(edge.confidence_score)}`
            }}>
              {formatConfidence(edge.confidence_score)}
            </span>
          </div>
        </div>
        {renderTarget(edge, level + 1, isLast)}
      </TreeNode>
    );
  };

  const renderSource = (source: SourceNode, level: number, isLast: boolean) => {
    const sourceKey = `${source.name}::${source.type}`;
    const isExpanded = expandedSources.has(sourceKey);

    return (
      <TreeNode key={sourceKey}>
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: level === 0 ? '8px' : '6px 8px',
            paddingLeft: `${level * 24 + 8}px`,
            cursor: 'pointer',
            borderRadius: 2,
            transition: 'all 0.2s ease',
            margin: '2px 0',
            fontFamily: 'Consolas',
            fontSize: 12,
            backgroundColor: asciiColors.accentLight,
            border: `1px solid ${asciiColors.border}`,
            borderLeft: `3px solid ${asciiColors.accent}`
          }}
          onClick={() => toggleSource(sourceKey)}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = asciiColors.accentLight;
            e.currentTarget.style.transform = 'translateX(4px)';
            e.currentTarget.style.borderColor = asciiColors.accent;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = asciiColors.accentLight;
            e.currentTarget.style.transform = 'translateX(0)';
          }}
        >
          {renderTreeLine(level, isLast)}
          <div style={{
            width: 16,
            height: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 8,
            borderRadius: 2,
            background: isExpanded ? asciiColors.accent : asciiColors.backgroundSoft,
            color: isExpanded ? '#ffffff' : asciiColors.accent,
            fontSize: 10,
            fontWeight: 'bold',
            fontFamily: 'Consolas',
            flexShrink: 0
          }}>
            {isExpanded ? ascii.arrowDown : ascii.arrowRight}
          </div>
          <span style={{ marginRight: '8px', color: asciiColors.accent, fontFamily: 'Consolas' }}>
            {ascii.blockFull}
          </span>
          <span style={{ 
            fontWeight: 600, 
            color: asciiColors.accent, 
            fontSize: 13,
            fontFamily: 'Consolas',
            flex: 1
          }}>
            {source.name}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto', flexWrap: 'wrap' }}>
            <span style={{
              padding: '2px 8px',
              borderRadius: 2,
              fontSize: 11,
              fontFamily: 'Consolas',
              backgroundColor: asciiColors.backgroundSoft,
              color: asciiColors.foreground,
              border: `1px solid ${asciiColors.border}`
            }}>
              {source.type}
            </span>
            <span style={{
              padding: '2px 8px',
              borderRadius: 2,
              fontSize: 11,
              fontWeight: 600,
              fontFamily: 'Consolas',
              backgroundColor: asciiColors.accent,
              color: '#ffffff',
              border: `1px solid ${asciiColors.accent}`
            }}>
              {source.relationships.length} {source.relationships.length === 1 ? 'relationship' : 'relationships'}
            </span>
          </div>
        </div>
        <div style={{
          overflow: 'hidden',
          maxHeight: isExpanded ? '10000px' : '0',
          transition: 'max-height 0.3s ease-out',
          paddingLeft: `${level * 24 + 36}px`
        }}>
          {isExpanded && source.relationships.map((edge, index) => 
            renderRelationship(edge, level + 1, index === source.relationships.length - 1)
          )}
        </div>
      </TreeNode>
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
            {ascii.arrowRight}
          </div>
          <div style={{ fontSize: 13, fontFamily: 'Consolas', fontWeight: 600, marginBottom: 8, color: asciiColors.foreground }}>
            No lineage data available
          </div>
          <div style={{ fontSize: 12, fontFamily: 'Consolas', opacity: 0.7, color: asciiColors.muted }}>
            Lineage relationships will appear here once extracted.
          </div>
        </div>
      </TreeContainer>
    );
  }

  return (
    <TreeContainer>
      {treeData.map((source, index) => 
        renderSource(source, 0, index === treeData.length - 1)
      )}
    </TreeContainer>
  );
};

export default DataLineageMSSQLTreeView;

