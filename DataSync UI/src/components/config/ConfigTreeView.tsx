import React, { useState, useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import { theme } from '../../theme/theme';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import type { ConfigEntry } from '../../services/api';

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

interface CategoryNode {
  name: string;
  configs: ConfigEntry[];
}

interface ConfigTreeViewProps {
  configs: ConfigEntry[];
  onConfigClick?: (config: ConfigEntry) => void;
}

const ConfigTreeView: React.FC<ConfigTreeViewProps> = ({ configs, onConfigClick }) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const treeData = useMemo(() => {
    const categories = new Map<string, CategoryNode>();
    const uncategorized: ConfigEntry[] = [];

    configs.forEach(config => {
      const keyParts = config.key.split('.');
      if (keyParts.length > 1) {
        const categoryName = keyParts[0];
        
        if (!categories.has(categoryName)) {
          categories.set(categoryName, {
            name: categoryName,
            configs: []
          });
        }
        
        categories.get(categoryName)!.configs.push(config);
      } else {
        uncategorized.push(config);
      }
    });

    const sortedCategories = Array.from(categories.values()).sort((a, b) => a.name.localeCompare(b.name));
    return { categories: sortedCategories, uncategorized };
  }, [configs]);

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryName)) {
        next.delete(categoryName);
      } else {
        next.add(categoryName);
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

  const formatDate = (date: string | null | undefined) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString();
  };

  const getValuePreview = (value: string): string => {
    if (!value) return '(empty)';
    if (value.length > 60) {
      return value.substring(0, 60) + '...';
    }
    return value;
  };

  const renderCategory = (category: CategoryNode, level: number, isLast: boolean) => {
    const isExpanded = expandedCategories.has(category.name);

    return (
      <TreeNode key={category.name}>
        <TreeContent onClick={() => toggleCategory(category.name)}>
          {renderTreeLine(level, isLast)}
          <ExpandIconContainer $isExpanded={isExpanded}>
            {isExpanded ? ascii.arrowDown : ascii.arrowRight}
          </ExpandIconContainer>
          <span style={{ marginRight: '8px', color: asciiColors.accent, fontFamily: 'Consolas' }}>
            {ascii.blockFull}
          </span>
          <NodeLabel>
            {category.name}
            <CountBadge>{category.configs.length}</CountBadge>
          </NodeLabel>
        </TreeContent>
        <ExpandableContent $isExpanded={isExpanded}>
          {isExpanded && category.configs
            .sort((a, b) => a.key.localeCompare(b.key))
            .map((config, index) => 
              renderConfig(config, category.name, level + 1, index === category.configs.length - 1)
            )}
        </ExpandableContent>
      </TreeNode>
    );
  };

  const renderConfig = (config: ConfigEntry, _categoryName: string, level: number, isLast: boolean) => {
    return (
      <TableDetailsRow
        key={config.key}
        $level={level}
        onClick={() => onConfigClick?.(config)}
      >
        {renderTreeLine(level, isLast)}
        <span style={{ marginRight: '8px', color: asciiColors.muted, fontFamily: 'Consolas' }}>
          {ascii.blockFull}
        </span>
        <span style={{ marginRight: '8px', fontWeight: 500, color: asciiColors.foreground, fontFamily: 'Consolas' }}>
          {config.key}
        </span>
        <span style={{
          padding: '2px 8px',
          borderRadius: 2,
          fontSize: 11,
          fontFamily: 'Consolas',
          backgroundColor: asciiColors.backgroundSoft,
          color: asciiColors.muted,
          border: `1px solid ${asciiColors.border}`,
          marginRight: 4
        }}>
          {getValuePreview(config.value)}
        </span>
        <span style={{ marginLeft: 'auto', color: asciiColors.muted, fontSize: 11, fontFamily: 'Consolas' }}>
          {formatDate(config.updated_at)}
        </span>
      </TableDetailsRow>
    );
  };

  if (treeData.categories.length === 0 && treeData.uncategorized.length === 0) {
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
            No configuration available
          </div>
          <div style={{ fontSize: 12, fontFamily: 'Consolas', opacity: 0.7, color: asciiColors.muted }}>
            Configuration entries will appear here once added.
          </div>
        </div>
      </TreeContainer>
    );
  }

  return (
    <TreeContainer>
      {treeData.uncategorized.map((config, index) => 
        renderConfig(config, '', 0, index === treeData.uncategorized.length - 1 && treeData.categories.length === 0)
      )}
      {treeData.categories.map((category, index) => 
        renderCategory(category, 0, index === treeData.categories.length - 1)
      )}
    </TreeContainer>
  );
};

export default ConfigTreeView;
