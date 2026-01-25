import React, { useState, useMemo } from 'react';
import styled from 'styled-components';
import { theme } from '../../theme/theme';
import { asciiColors } from '../../ui/theme/asciiTheme';

const TreeContainer = styled.div`
  font-family: 'Consolas';
  font-size: 12px;
  background: ${asciiColors.background};
  border: 1px solid ${asciiColors.border};
  border-radius: 2;
  padding: ${theme.spacing.md};
  max-height: 800px;
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
  
  &::-webkit-scrollbar {
    width: 0px;
    display: none;
  }
  
  -ms-overflow-style: none;
  scrollbar-width: none;
`;

const TreeNode = styled.div`
  user-select: none;
  margin-bottom: 2px;
`;

const TreeLine = styled.span<{ $isLast?: boolean }>`
  color: ${asciiColors.muted};
  margin-right: ${theme.spacing.xs};
  font-family: 'Consolas';
  font-size: 11px;
`;

const TreeContent = styled.div<{ $level: number; $isExpanded?: boolean; $nodeType?: 'group' | 'lock' }>`
  display: flex;
  align-items: center;
  padding: ${props => props.$level === 0 ? theme.spacing.sm : theme.spacing.xs} ${theme.spacing.sm};
  padding-left: ${props => props.$level * 24 + parseInt(theme.spacing.sm)}px;
  cursor: pointer;
  border-radius: 2;
  transition: background-color 0.15s ease;
  position: relative;
  margin: 2px 0;
  
  ${props => {
    if (props.$nodeType === 'group') {
      return `
        background: ${props.$isExpanded ? asciiColors.backgroundSoft : asciiColors.background};
        border-left: 3px solid ${asciiColors.accent};
        font-weight: 600;
      `;
    }
    return `
      background: ${asciiColors.background};
      border-left: 2px solid ${asciiColors.border};
    `;
  }}
`;

const ExpandIconContainer = styled.div<{ $isExpanded: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  margin-right: ${theme.spacing.sm};
  border-radius: 2;
  background: ${props => props.$isExpanded 
    ? asciiColors.accent
    : asciiColors.backgroundSoft
  };
  color: ${props => props.$isExpanded ? asciiColors.background : asciiColors.accent};
  font-size: 11px;
  font-weight: bold;
  transition: background-color 0.15s ease, color 0.15s ease;
  flex-shrink: 0;
  font-family: 'Consolas';
  
  svg {
    transition: transform 0.15s ease;
    transform: ${props => props.$isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)'};
  }
`;

const NodeLabel = styled.span<{ $isGroup?: boolean }>`
  font-weight: ${props => props.$isGroup ? '700' : '600'};
  font-size: ${props => props.$isGroup ? '13px' : '12px'};
  color: ${props => {
    if (props.$isGroup) return asciiColors.accent;
    return asciiColors.foreground;
  }};
  margin-right: ${theme.spacing.sm};
  font-family: 'Consolas';
`;

const LockInfo = styled.div`
  display: inline-flex;
  gap: ${theme.spacing.xs};
  align-items: center;
  margin-left: auto;
  flex-wrap: wrap;
  font-size: 11px;
  font-family: 'Consolas';
`;

const CountBadge = styled.span<{ $status?: 'active' | 'warning' | 'expired' | 'default' }>`
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border-radius: 2;
  font-size: 11px;
  font-weight: 500;
  font-family: 'Consolas';
  background: ${props => {
    if (props.$status === 'expired') return asciiColors.backgroundSoft;
    if (props.$status === 'warning') return asciiColors.backgroundSoft;
    if (props.$status === 'active') return asciiColors.backgroundSoft;
    return asciiColors.backgroundSoft;
  }};
  color: ${props => {
    if (props.$status === 'expired') return asciiColors.foreground;
    if (props.$status === 'warning') return asciiColors.muted;
    if (props.$status === 'active') return asciiColors.accent;
    return asciiColors.muted;
  }};
  border: 1px solid ${props => {
    if (props.$status === 'expired') return asciiColors.border;
    if (props.$status === 'warning') return asciiColors.border;
    if (props.$status === 'active') return asciiColors.accent;
    return asciiColors.border;
  }};
  transition: background-color 0.15s ease;
`;

const ExpandableContent = styled.div<{ $isExpanded: boolean; $level: number }>`
  overflow: hidden;
  padding-left: ${props => props.$level * 24 + 36}px;
  transition: opacity 0.15s ease;
  opacity: ${props => props.$isExpanded ? 1 : 0};
  display: ${props => props.$isExpanded ? 'block' : 'none'};
`;

const EmptyState = styled.div`
  padding: ${theme.spacing.xxl} ${theme.spacing.xl};
  text-align: center;
  color: ${asciiColors.muted};
  font-family: 'Consolas';
  font-size: 12px;
  
  &::before {
    content: '█';
    font-size: 3em;
    display: block;
    margin-bottom: ${theme.spacing.md};
    opacity: 0.5;
    font-family: 'Consolas';
  }
`;

const IconGroup = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
    <line x1="9" y1="3" x2="9" y2="21"/>
    <line x1="3" y1="9" x2="21" y2="9"/>
  </svg>
);

const IconLock = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

interface Lock {
  lock_name: string;
  acquired_by?: string;
  acquired_at?: string;
  expires_at?: string;
  [key: string]: any;
}

interface GroupNode {
  name: string;
  locks: Lock[];
}

interface TreeViewProps {
  locks: Lock[];
  onLockClick?: (lock: Lock) => void;
}

const CatalogLocksTreeView: React.FC<TreeViewProps> = ({ locks, onLockClick }) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const treeData = useMemo(() => {
    // Intentar agrupar por prefijo común (ej: "schema.table" -> agrupar por "schema")
    const groups = new Map<string, GroupNode>();
    const ungrouped: Lock[] = [];

    locks.forEach(lock => {
      const parts = lock.lock_name.split('.');
      if (parts.length >= 2) {
        // Si tiene formato schema.table, agrupar por schema
        const groupName = parts[0];
        if (!groups.has(groupName)) {
          groups.set(groupName, {
            name: groupName,
            locks: []
          });
        }
        groups.get(groupName)!.locks.push(lock);
      } else {
        // Si no tiene formato claro, poner en "ungrouped"
        ungrouped.push(lock);
      }
    });

    const result: GroupNode[] = Array.from(groups.values()).sort((a, b) => a.name.localeCompare(b.name));
    if (ungrouped.length > 0) {
      result.push({
        name: 'Other',
        locks: ungrouped
      });
    }

    return result;
  }, [locks]);

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupName)) {
        next.delete(groupName);
      } else {
        next.add(groupName);
      }
      return next;
    });
  };

  const getLockStatus = (expiresAt?: string) => {
    if (!expiresAt) return { status: 'unknown', label: 'Unknown' };
    const expires = new Date(expiresAt);
    const now = new Date();
    const diffMs = expires.getTime() - now.getTime();
    const diffMins = diffMs / (1000 * 60);

    if (diffMs < 0) {
      return { status: 'expired', label: 'Expired' };
    } else if (diffMins < 5) {
      return { status: 'warning', label: 'Expiring Soon' };
    } else {
      return { status: 'active', label: 'Active' };
    }
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

  const renderLock = (lock: Lock, level: number, isLast: boolean) => {
    const status = getLockStatus(lock.expires_at);

    return (
      <TreeNode key={lock.lock_name}>
        <TreeContent 
          $level={level} 
          $nodeType="lock"
          onClick={() => onLockClick?.(lock)}
        >
          {renderTreeLine(level, isLast)}
          <IconLock />
          <NodeLabel>{lock.lock_name}</NodeLabel>
          <LockInfo>
            <CountBadge $status={status.status as 'active' | 'warning' | 'expired'}>
              {status.label}
            </CountBadge>
            {lock.acquired_by && (
              <CountBadge $status="default">{lock.acquired_by}</CountBadge>
            )}
          </LockInfo>
        </TreeContent>
      </TreeNode>
    );
  };

  const renderGroup = (group: GroupNode, level: number) => {
    const isExpanded = expandedGroups.has(group.name);
    const groupIndex = treeData.findIndex(g => g.name === group.name);
    const isLastGroup = groupIndex === treeData.length - 1;

    return (
      <TreeNode key={group.name}>
        <TreeContent 
          $level={level} 
          $isExpanded={isExpanded}
          $nodeType="group"
          onClick={() => toggleGroup(group.name)}
        >
          {renderTreeLine(level, isLastGroup)}
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
          <IconGroup />
          <NodeLabel $isGroup>{group.name}</NodeLabel>
          <LockInfo>
            <CountBadge $status="default">{group.locks.length} {group.locks.length === 1 ? 'lock' : 'locks'}</CountBadge>
          </LockInfo>
        </TreeContent>
        <ExpandableContent $isExpanded={isExpanded} $level={level}>
          {isExpanded && group.locks.map((lock, index) => {
            const isLast = index === group.locks.length - 1;
            return renderLock(lock, level + 1, isLast);
          })}
        </ExpandableContent>
      </TreeNode>
    );
  };

  if (treeData.length === 0) {
    return (
      <TreeContainer>
        <EmptyState>
          No active locks. Locks will appear here when catalog operations are running.
        </EmptyState>
      </TreeContainer>
    );
  }

  return (
    <TreeContainer>
      {treeData.map((group) => (
        <div key={group.name}>
          {renderGroup(group, 0)}
        </div>
      ))}
    </TreeContainer>
  );
};

export default CatalogLocksTreeView;

