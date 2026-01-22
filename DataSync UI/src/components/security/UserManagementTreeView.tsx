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
  font-family: "Consolas";
  font-size: 12px;
  background: ${asciiColors.background};
  border: 1px solid ${asciiColors.border};
  border-radius: 2px;
  padding: ${theme.spacing.lg};
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
    transition: background ${theme.transitions.normal};
    
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

const TreeContent = styled.div<{ $level: number; $isExpanded?: boolean; $nodeType?: 'role' | 'user' }>`
  display: flex;
  align-items: center;
  padding: ${props => props.$level === 0 ? '12px 8px' : '10px 8px'};
  padding-left: ${props => props.$level * 24 + 8}px;
  border-radius: 2px;
  transition: all ${theme.transitions.normal};
  cursor: pointer;
  position: relative;
  margin: 2px 0;
  font-family: "Consolas";
  font-size: 12px;
  
  background: transparent;
  
  ${props => {
    if (props.$nodeType === 'role') {
      return `
        border-left: 2px solid ${asciiColors.accent};
        font-weight: 600;
      `;
    }
    return `
      border-left: 1px solid ${asciiColors.border};
    `;
  }}
  
  &:hover {
    background: ${props => {
      if (props.$nodeType === 'role') {
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
  width: 20px;
  height: 20px;
  margin-right: 8px;
  border-radius: 2px;
  background: ${props => props.$isExpanded 
    ? asciiColors.accent
    : asciiColors.backgroundSoft
  };
  color: ${props => props.$isExpanded ? "#ffffff" : asciiColors.accent};
  font-size: 12px;
  font-weight: bold;
  font-family: "Consolas";
  transition: all ${theme.transitions.normal};
  flex-shrink: 0;
  
  &:hover {
    transform: scale(1.1);
  }
`;

const NodeLabel = styled.span<{ $isRole?: boolean }>`
  font-weight: ${props => props.$isRole ? '700' : '500'};
  font-size: ${props => props.$isRole ? '13px' : '12px'};
  font-family: "Consolas";
  color: ${props => props.$isRole ? asciiColors.accent : asciiColors.foreground};
  margin-right: 12px;
  transition: color ${theme.transitions.normal};
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const CountBadge = styled.span`
  padding: 4px 10px;
  border-radius: 2px;
  font-size: 11px;
  font-weight: 500;
  font-family: "Consolas";
  background: ${asciiColors.backgroundSoft};
  color: ${asciiColors.muted};
  border: 1px solid ${asciiColors.border};
  margin-left: auto;
  transition: all ${theme.transitions.normal};
  
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
  font-family: "Consolas";
  margin-right: 4px;
  font-size: 12px;
`;

const UserItemRow = styled.div<{ $level: number; $isSelected?: boolean; $isActive?: boolean }>`
  padding: 12px 8px;
  padding-left: ${props => props.$level * 24 + 36}px;
  margin: 2px 0;
  border-radius: 2px;
  background: ${props => props.$isSelected ? asciiColors.accentLight : asciiColors.background};
  border-left: 2px solid ${props => props.$isActive ? asciiColors.success : asciiColors.border};
  transition: all ${theme.transitions.normal};
  cursor: pointer;
  animation: ${fadeIn} 0.3s ease-out;
  font-family: "Consolas";
  font-size: 12px;
  
  &:hover {
    background: ${asciiColors.backgroundSoft};
    border-left-width: 3px;
    transform: translateX(4px);
  }
`;

const Badge = styled.span<{ $role?: string; $active?: boolean }>`
  padding: 4px 12px;
  border-radius: 2px;
  font-size: 11px;
  font-weight: 600;
  font-family: "Consolas";
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: all ${theme.transitions.normal};
  border: 1px solid;
  
  ${props => {
    if (props.$role) {
      switch (props.$role) {
        case 'admin':
          return `
            background: ${asciiColors.danger}20;
            color: ${asciiColors.danger};
            border-color: ${asciiColors.danger};
          `;
        case 'user':
          return `
            background: ${asciiColors.accent}20;
            color: ${asciiColors.accent};
            border-color: ${asciiColors.accent};
          `;
        case 'viewer':
          return `
            background: ${asciiColors.muted}20;
            color: ${asciiColors.muted};
            border-color: ${asciiColors.muted};
          `;
        default:
          return `
            background: ${asciiColors.backgroundSoft};
            color: ${asciiColors.foreground};
            border-color: ${asciiColors.border};
          `;
      }
    }
    if (props.$active !== undefined) {
      return props.$active
        ? `
            background: ${asciiColors.success}20;
            color: ${asciiColors.success};
            border-color: ${asciiColors.success};
          `
        : `
            background: ${asciiColors.backgroundSoft};
            color: ${asciiColors.muted};
            border-color: ${asciiColors.border};
          `;
    }
    return `
      background: ${asciiColors.backgroundSoft};
      color: ${asciiColors.foreground};
      border-color: ${asciiColors.border};
    `;
  }}
  
  &:hover {
    transform: translateY(-1px);
  }
`;

const EmptyState = styled.div`
  padding: 60px 40px;
  text-align: center;
  color: ${asciiColors.muted};
  animation: ${fadeIn} 0.5s ease-out;
  font-family: "Consolas";
  font-size: 12px;
`;

const EmptyStateIcon = styled.div`
  font-size: 24px;
  margin-bottom: ${theme.spacing.md};
  animation: ${fadeIn} 0.5s ease-out;
  font-family: "Consolas";
  opacity: 0.5;
`;

const EmptyStateTitle = styled.div`
  font-size: 14px;
  font-family: "Consolas";
  font-weight: 600;
  margin-bottom: ${theme.spacing.sm};
  color: ${asciiColors.foreground};
`;

const EmptyStateText = styled.div`
  font-size: 11px;
  font-family: "Consolas";
  opacity: 0.7;
  color: ${asciiColors.muted};
`;

interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'user' | 'viewer';
  active: boolean;
  created_at: string;
  updated_at: string;
  last_login: string | null;
}

interface RoleNode {
  name: string;
  users: User[];
}

interface UserManagementTreeViewProps {
  users: User[];
  onUserClick?: (user: User) => void;
}

const UserManagementTreeView: React.FC<UserManagementTreeViewProps> = ({ users, onUserClick }) => {
  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set());

  const treeData = useMemo(() => {
    const roles = new Map<string, RoleNode>();
    const roleOrder = ['admin', 'user', 'viewer'];

    users.forEach(user => {
      const roleKey = user.role || 'user';
      
      if (!roles.has(roleKey)) {
        roles.set(roleKey, {
          name: roleKey,
          users: []
        });
      }
      
      roles.get(roleKey)!.users.push(user);
    });

    return Array.from(roles.values()).sort((a, b) => {
      const aIndex = roleOrder.indexOf(a.name);
      const bIndex = roleOrder.indexOf(b.name);
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [users]);

  const toggleRole = (roleName: string) => {
    setExpandedRoles(prev => {
      const next = new Set(prev);
      if (next.has(roleName)) {
        next.delete(roleName);
      } else {
        next.add(roleName);
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

  const formatDate = (date: string | null | undefined) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleString();
  };

  const renderRole = (role: RoleNode, level: number, isLast: boolean) => {
    const isExpanded = expandedRoles.has(role.name);

    return (
      <TreeNode key={role.name}>
        <TreeContent 
          $level={level} 
          $isExpanded={isExpanded}
          $nodeType="role"
          onClick={() => toggleRole(role.name)}
        >
          {renderTreeLine(level, isLast)}
          <ExpandIconContainer $isExpanded={isExpanded}>
            {isExpanded ? ascii.arrowDown : ascii.arrowRight}
          </ExpandIconContainer>
          <Badge $role={role.name}>{role.name.toUpperCase()}</Badge>
          <NodeLabel $isRole>
            {role.name}
          </NodeLabel>
          <CountBadge>{role.users.length}</CountBadge>
        </TreeContent>
        <ExpandableContent $isExpanded={isExpanded} $level={level}>
          {isExpanded && role.users
            .sort((a, b) => a.username.localeCompare(b.username))
            .map((user, index) => 
              renderUser(user, level + 1, index === role.users.length - 1)
            )}
        </ExpandableContent>
      </TreeNode>
    );
  };

  const renderUser = (user: User, level: number, isLast: boolean) => {
    return (
      <UserItemRow
        key={user.id}
        $level={level}
        $isActive={user.active}
        onClick={() => onUserClick?.(user)}
      >
        {renderTreeLine(level, isLast)}
        <span style={{ 
          marginRight: '8px', 
          fontFamily: "Consolas",
          fontSize: 12,
          color: asciiColors.accent 
        }}>
          {ascii.blockFull}
        </span>
        <span style={{ 
          marginRight: '8px', 
          fontWeight: 600, 
          fontFamily: "Consolas",
          fontSize: 12,
          color: asciiColors.foreground 
        }}>
          {user.username}
        </span>
        <span style={{ 
          marginRight: '8px', 
          fontFamily: "Consolas",
          fontSize: 11,
          color: asciiColors.muted 
        }}>
          {user.email}
        </span>
        <Badge $active={user.active}>
          {user.active ? 'Active' : 'Inactive'}
        </Badge>
        <span style={{ 
          marginLeft: 'auto', 
          fontFamily: "Consolas",
          fontSize: 11,
          color: asciiColors.muted, 
          display: 'flex', 
          gap: '8px', 
          alignItems: 'center' 
        }}>
          <span>Last login: {formatDate(user.last_login)}</span>
        </span>
      </UserItemRow>
    );
  };

  if (treeData.length === 0) {
    return (
      <TreeContainer>
        <EmptyState>
          <EmptyStateIcon>{ascii.blockFull}</EmptyStateIcon>
          <EmptyStateTitle>No users available</EmptyStateTitle>
          <EmptyStateText>Users will appear here once added.</EmptyStateText>
        </EmptyState>
      </TreeContainer>
    );
  }

  return (
    <TreeContainer>
      {treeData.map((role, index) => 
        renderRole(role, 0, index === treeData.length - 1)
      )}
    </TreeContainer>
  );
};

export default UserManagementTreeView;

