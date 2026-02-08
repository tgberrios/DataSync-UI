import React from 'react';
import styled from 'styled-components';
import { theme } from '../../theme/theme';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';

const ListContainer = styled.div`
  font-family: "Consolas";
  font-size: 12px;
  background: ${asciiColors.background};
  border: 1px solid ${asciiColors.border};
  border-radius: 2px;
  padding: ${theme.spacing.lg};
  max-height: 800px;
  overflow-y: auto;
  overflow-x: hidden;
  transition: border-color 0.15s ease;
`;

const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`;

const ListItem = styled.li<{ $isSelected?: boolean }>`
  padding: 12px 14px;
  margin: 2px 0;
  border-radius: 2px;
  border-left: 2px solid ${props => props.$isSelected ? asciiColors.accent : asciiColors.border};
  background: ${props => props.$isSelected ? asciiColors.backgroundSoft : 'transparent'};
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease;
  font-family: 'Consolas';
  font-size: 12px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};

  &:hover {
    background: ${asciiColors.backgroundSoft};
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
  border: 1px solid;
  flex-shrink: 0;

  ${props => {
    if (props.$role) {
      switch (props.$role) {
        case 'admin':
        case 'user':
        case 'analytics':
        case 'reporting':
          return `
            background: ${asciiColors.backgroundSoft};
            color: ${asciiColors.accent};
            border-color: ${asciiColors.accent};
          `;
        case 'viewer':
          return `
            background: ${asciiColors.backgroundSoft};
            color: ${asciiColors.muted};
            border-color: ${asciiColors.border};
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
            background: ${asciiColors.backgroundSoft};
            color: ${asciiColors.accent};
            border-color: ${asciiColors.accent};
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
`;

const EmptyState = styled.div`
  padding: 60px 40px;
  text-align: center;
  color: ${asciiColors.muted};
  font-family: "Consolas";
  font-size: 12px;
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
  role: 'admin' | 'user' | 'viewer' | 'analytics' | 'reporting';
  active: boolean;
  created_at: string;
  updated_at: string;
  last_login: string | null;
}

interface UserManagementListViewProps {
  users: User[];
  selectedUser: User | null;
  onUserClick?: (user: User) => void;
}

const formatDate = (date: string | null | undefined) => {
  if (!date) return 'Never';
  return new Date(date).toLocaleString();
};

const UserManagementListView: React.FC<UserManagementListViewProps> = ({
  users,
  selectedUser,
  onUserClick
}) => {
  const sortedUsers = React.useMemo(
    () => [...users].sort((a, b) => a.username.localeCompare(b.username)),
    [users]
  );

  if (sortedUsers.length === 0) {
    return (
      <ListContainer>
        <EmptyState>
          <div style={{ marginBottom: theme.spacing.md, opacity: 0.5 }}>{ascii.blockFull}</div>
          <EmptyStateTitle>No users available</EmptyStateTitle>
          <EmptyStateText>Users will appear here once added.</EmptyStateText>
        </EmptyState>
      </ListContainer>
    );
  }

  return (
    <ListContainer>
      <List role="list" aria-label="User list">
        {sortedUsers.map((user) => (
          <ListItem
            key={user.id}
            $isSelected={selectedUser?.id === user.id}
            onClick={() => onUserClick?.(user)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onUserClick?.(user);
              }
            }}
            tabIndex={0}
            role="button"
            aria-pressed={selectedUser?.id === user.id}
            aria-label={`${user.username}, ${user.role}, ${user.active ? 'active' : 'inactive'}`}
          >
            <span style={{ color: asciiColors.accent, fontFamily: 'Consolas' }}>{ascii.blockFull}</span>
            <Badge $role={user.role}>{user.role.toUpperCase()}</Badge>
            <span style={{ fontWeight: 600, color: asciiColors.foreground }}>{user.username}</span>
            <span style={{ fontSize: 11, color: asciiColors.muted }}>{user.email}</span>
            <Badge $active={user.active}>{user.active ? 'Active' : 'Inactive'}</Badge>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: asciiColors.muted }}>
              Last login: {formatDate(user.last_login)}
            </span>
          </ListItem>
        ))}
      </List>
    </ListContainer>
  );
};

export default UserManagementListView;
