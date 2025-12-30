import { useState, useEffect, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import {
  Container,
  Header,
  FiltersContainer,
  Select,
  TableContainer,
  Table,
  Th,
  Td,
  TableRow,
  Pagination,
  PageButton,
  ErrorMessage,
  LoadingOverlay,
  Input,
  Button,
  ActiveBadge,
  ActionButton,
  FormGroup,
  Label,
  SearchInput,
  SearchButton,
  ClearSearchButton,
  PaginationInfo,
  SearchContainer,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalTitle,
} from '../shared/BaseComponents';
import { usePagination } from '../../hooks/usePagination';
import { useTableFilters } from '../../hooks/useTableFilters';
import { authApi } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import { sanitizeSearch } from '../../utils/validation';
import styled from 'styled-components';
import { theme } from '../../theme/theme';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import UserManagementTreeView from './UserManagementTreeView';

const HeaderContent = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 18px;
  font-family: "Consolas";
  cursor: pointer;
  color: ${asciiColors.muted};
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    color: ${asciiColors.foreground};
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  justify-content: flex-end;
  margin-top: ${theme.spacing.lg};
  padding-top: ${theme.spacing.md};
  border-top: 1px solid ${theme.colors.border.light};
`;

const RoleBadge = styled.span<{ $role: string }>`
  padding: 4px 12px;
  border-radius: 2px;
  font-size: 11px;
  font-family: "Consolas";
  font-weight: 500;
  display: inline-block;
  background-color: ${props => {
    switch (props.$role) {
      case 'admin': return asciiColors.danger + '20';
      case 'user': return asciiColors.accent + '20';
      case 'viewer': return asciiColors.muted + '20';
      default: return asciiColors.backgroundSoft;
    }
  }};
  color: ${props => {
    switch (props.$role) {
      case 'admin': return asciiColors.danger;
      case 'user': return asciiColors.accent;
      case 'viewer': return asciiColors.muted;
      default: return asciiColors.foreground;
    }
  }};
  border: 1px solid ${props => {
    switch (props.$role) {
      case 'admin': return asciiColors.danger;
      case 'user': return asciiColors.accent;
      case 'viewer': return asciiColors.muted;
      default: return asciiColors.border;
    }
  }};
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

const UserManagement = () => {
  const { page, limit, setPage } = usePagination(1, 20);
  const { filters, setFilter } = useTableFilters({
    role: '',
    active: ''
  });
  
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [data, setData] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
    page: 1,
    limit: 20
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [passwordUserId, setPasswordUserId] = useState<number | null>(null);
  const [userForm, setUserForm] = useState({
    username: '',
    email: '',
    password: '',
    role: 'user' as 'admin' | 'user' | 'viewer',
    active: true
  });
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'tree'>('tree');
  const isMountedRef = useRef(true);

  const fetchUsers = useCallback(async () => {
    if (!isMountedRef.current) return;
    try {
      setLoading(true);
      setError(null);
      const sanitizedSearch = sanitizeSearch(search, 100);
      const params: any = {
        page: viewMode === 'tree' ? 1 : page,
        limit: viewMode === 'tree' ? 1000 : limit,
        search: sanitizedSearch
      };
      
      if (filters.role) params.role = filters.role;
      if (filters.active !== '') params.active = filters.active;
      
      const response = await authApi.getUsers(params);
      if (isMountedRef.current) {
        setData(response.data || []);
        setPagination(response.pagination || {
          total: 0,
          totalPages: 0,
          page: 1,
          limit: 20
        });
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(extractApiError(err));
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [page, limit, filters.role, filters.active, search, viewMode]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchUsers();
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchUsers]);

  const handleSearch = useCallback(() => {
    setSearch(searchInput);
    setPage(1);
  }, [searchInput, setPage]);

  const handleClearSearch = useCallback(() => {
    setSearchInput('');
    setSearch('');
    setPage(1);
  }, [setPage]);

  const handleFilterChange = useCallback((key: string, value: string) => {
    setFilter(key as any, value);
    setPage(1);
  }, [setFilter, setPage]);

  const handleOpenModal = useCallback((user?: User) => {
    if (user) {
      setEditingUser(user);
      setUserForm({
        username: user.username,
        email: user.email,
        password: '',
        role: user.role,
        active: user.active
      });
    } else {
      setEditingUser(null);
      setUserForm({
        username: '',
        email: '',
        password: '',
        role: 'user',
        active: true
      });
    }
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingUser(null);
  }, []);

  const handleSave = useCallback(async () => {
    try {
      if (editingUser) {
        await authApi.updateUser(editingUser.id, {
          username: userForm.username,
          email: userForm.email,
          role: userForm.role,
          active: userForm.active
        });
      } else {
        if (!userForm.password || userForm.password.length < 8) {
          setError('Password must be at least 8 characters long');
          return;
        }
        await authApi.createUser(
          userForm.username,
          userForm.email,
          userForm.password,
          userForm.role
        );
      }
      handleCloseModal();
      fetchUsers();
    } catch (err) {
      setError(extractApiError(err));
    }
  }, [editingUser, userForm, handleCloseModal, fetchUsers]);

  const handleDelete = useCallback(async (userId: number, username: string) => {
    if (!confirm(`Are you sure you want to delete user "${username}"?`)) {
      return;
    }
    try {
      await authApi.deleteUser(userId);
      fetchUsers();
    } catch (err) {
      if (isMountedRef.current) {
        setError(extractApiError(err));
      }
    }
  }, [fetchUsers]);

  const handleToggleActive = useCallback(async (userId: number, currentActive: boolean) => {
    try {
      await authApi.updateUser(userId, { active: !currentActive });
      fetchUsers();
    } catch (err) {
      if (isMountedRef.current) {
        setError(extractApiError(err));
      }
    }
  }, [fetchUsers]);

  const handleOpenPasswordModal = useCallback((userId: number) => {
    setPasswordUserId(userId);
    setNewPassword('');
    setConfirmPassword('');
    setIsPasswordModalOpen(true);
  }, []);

  const handleClosePasswordModal = useCallback(() => {
    setIsPasswordModalOpen(false);
    setPasswordUserId(null);
    setNewPassword('');
    setConfirmPassword('');
  }, []);

  const handleResetPassword = useCallback(async () => {
    if (!passwordUserId) return;
    
    if (!newPassword || newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    try {
      await authApi.resetUserPassword(passwordUserId, newPassword);
      handleClosePasswordModal();
      alert('Password reset successfully');
    } catch (err) {
      setError(extractApiError(err));
    }
  }, [passwordUserId, newPassword, confirmPassword, handleClosePasswordModal]);

  return (
    <div style={{
      width: "100%",
      minHeight: "100vh",
      padding: "24px 32px",
      fontFamily: "Consolas",
      fontSize: 12,
      color: asciiColors.foreground,
      backgroundColor: asciiColors.background,
      display: "flex",
      flexDirection: "column",
      gap: 20
    }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        width: "100%",
        marginBottom: 16,
        padding: "12px 8px",
        borderBottom: `2px solid ${asciiColors.border}`
      }}>
        <h1 style={{
          fontSize: 18,
          fontFamily: "Consolas",
          fontWeight: 600,
          margin: 0
        }}>
          USER MANAGEMENT
        </h1>
        <AsciiButton 
          label={`${ascii.blockFull} Add User`}
          onClick={() => handleOpenModal()}
          variant="primary"
        />
      </div>

      {loading && (
        <div style={{
          padding: theme.spacing.lg,
          textAlign: "center",
          fontFamily: "Consolas",
          fontSize: 12,
          color: asciiColors.muted
        }}>
          {ascii.blockFull} Loading users...
        </div>
      )}
      {error && (
        <AsciiPanel title="ERROR">
          <div style={{ 
            color: asciiColors.danger, 
            fontFamily: "Consolas", 
            fontSize: 12,
            padding: "8px 0"
          }}>
            {ascii.blockFull} {error}
          </div>
        </AsciiPanel>
      )}

      <AsciiPanel title="FILTERS">
        <div style={{
          display: "flex",
          gap: theme.spacing.md,
          flexWrap: "wrap",
          alignItems: "end",
          fontFamily: "Consolas",
          fontSize: 12
        }}>
          <div style={{ display: "flex", gap: theme.spacing.sm, alignItems: "center" }}>
            <input
              type="text"
              placeholder="Search by username or email..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              style={{
                padding: "8px 12px",
                border: `1px solid ${asciiColors.border}`,
                borderRadius: 2,
                backgroundColor: asciiColors.background,
                color: asciiColors.foreground,
                fontFamily: "Consolas",
                fontSize: 12,
                minWidth: "200px"
              }}
            />
            <AsciiButton label="Search" onClick={handleSearch} variant="primary" />
            {search && (
              <AsciiButton label="Clear" onClick={handleClearSearch} variant="ghost" />
            )}
          </div>

          <select
            value={filters.role}
            onChange={(e) => handleFilterChange('role', e.target.value)}
            style={{
              padding: "8px 12px",
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2,
              backgroundColor: asciiColors.background,
              color: asciiColors.foreground,
              fontFamily: "Consolas",
              fontSize: 12
            }}
          >
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="user">User</option>
            <option value="viewer">Viewer</option>
          </select>

          <select
            value={filters.active}
            onChange={(e) => handleFilterChange('active', e.target.value)}
            style={{
              padding: "8px 12px",
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2,
              backgroundColor: asciiColors.background,
              color: asciiColors.foreground,
              fontFamily: "Consolas",
              fontSize: 12
            }}
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
      </AsciiPanel>

      <div style={{ 
        display: 'flex', 
        justifyContent: 'flex-end', 
        marginBottom: theme.spacing.md,
        fontFamily: "Consolas",
        fontSize: 12
      }}>
        <div style={{ display: 'flex', gap: theme.spacing.sm }}>
          <AsciiButton
            label="Tree View"
            onClick={() => setViewMode('tree')}
            variant={viewMode === 'tree' ? 'primary' : 'ghost'}
          />
          <AsciiButton
            label="Table View"
            onClick={() => setViewMode('table')}
            variant={viewMode === 'table' ? 'primary' : 'ghost'}
          />
        </div>
      </div>

      {viewMode === 'tree' ? (
        <div style={{ display: 'grid', gridTemplateColumns: selectedUser ? '1fr 400px' : '1fr', gap: theme.spacing.lg }}>
          <UserManagementTreeView 
            users={data} 
            onUserClick={(user) => setSelectedUser(prev => prev?.id === user.id ? null : user)}
          />
          
          {selectedUser && (
            <AsciiPanel title="USER DETAILS">
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr', 
                gap: theme.spacing.md,
                fontFamily: "Consolas",
                fontSize: 12
              }}>
                <div>
                  <strong style={{ color: asciiColors.muted, fontSize: 11, fontFamily: "Consolas" }}>Username:</strong>
                  <div style={{ 
                    color: asciiColors.foreground, 
                    fontSize: 12, 
                    marginTop: '4px',
                    fontFamily: "Consolas",
                    padding: theme.spacing.sm,
                    background: asciiColors.backgroundSoft,
                    borderRadius: 2,
                    border: `1px solid ${asciiColors.border}`
                  }}>
                    {selectedUser.username}
                  </div>
                </div>
                <div>
                  <strong style={{ color: asciiColors.muted, fontSize: 11, fontFamily: "Consolas" }}>Email:</strong>
                  <div style={{ 
                    color: asciiColors.foreground, 
                    fontSize: 12, 
                    marginTop: '4px',
                    fontFamily: "Consolas",
                    padding: theme.spacing.sm,
                    background: asciiColors.backgroundSoft,
                    borderRadius: 2,
                    border: `1px solid ${asciiColors.border}`
                  }}>
                    {selectedUser.email}
                  </div>
                </div>
                <div>
                  <strong style={{ color: asciiColors.muted, fontSize: 11, fontFamily: "Consolas" }}>Role:</strong>
                  <div style={{ marginTop: '4px' }}>
                    <RoleBadge $role={selectedUser.role}>{selectedUser.role}</RoleBadge>
                  </div>
                </div>
                <div>
                  <strong style={{ color: asciiColors.muted, fontSize: 11, fontFamily: "Consolas" }}>Status:</strong>
                  <div style={{ marginTop: '4px' }}>
                    <ActiveBadge $active={selectedUser.active}>
                      {selectedUser.active ? 'Active' : 'Inactive'}
                    </ActiveBadge>
                  </div>
                </div>
                <div>
                  <strong style={{ color: asciiColors.muted, fontSize: 11, fontFamily: "Consolas" }}>Created:</strong>
                  <div style={{ 
                    color: asciiColors.foreground, 
                    fontSize: 12, 
                    marginTop: '4px',
                    fontFamily: "Consolas"
                  }}>
                    {format(new Date(selectedUser.created_at), 'yyyy-MM-dd HH:mm')}
                  </div>
                </div>
                <div>
                  <strong style={{ color: asciiColors.muted, fontSize: 11, fontFamily: "Consolas" }}>Last Login:</strong>
                  <div style={{ 
                    color: asciiColors.foreground, 
                    fontSize: 12, 
                    marginTop: '4px',
                    fontFamily: "Consolas"
                  }}>
                    {selectedUser.last_login
                      ? format(new Date(selectedUser.last_login), 'yyyy-MM-dd HH:mm')
                      : 'Never'}
                  </div>
                </div>
                <div style={{ 
                  marginTop: theme.spacing.md, 
                  paddingTop: theme.spacing.md, 
                  borderTop: `1px solid ${asciiColors.border}` 
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm }}>
                    <AsciiButton 
                      label="Edit User"
                      onClick={() => {
                        handleOpenModal(selectedUser);
                        setSelectedUser(null);
                      }}
                      variant="primary"
                    />
                    <AsciiButton
                      label={selectedUser.active ? 'Deactivate' : 'Activate'}
                      onClick={() => {
                        handleToggleActive(selectedUser.id, selectedUser.active);
                        setSelectedUser(null);
                      }}
                      variant="ghost"
                    />
                    <AsciiButton
                      label="Reset Password"
                      onClick={() => {
                        handleOpenPasswordModal(selectedUser.id);
                        setSelectedUser(null);
                      }}
                      variant="ghost"
                    />
                    <AsciiButton
                      label="Delete User"
                      onClick={() => {
                        handleDelete(selectedUser.id, selectedUser.username);
                        setSelectedUser(null);
                      }}
                      variant="ghost"
                    />
                  </div>
                </div>
              </div>
            </AsciiPanel>
          )}
        </div>
      ) : (
        <>
          <AsciiPanel title="USERS TABLE">
            <TableContainer>
              <Table>
          <thead>
            <tr>
              <Th>Username</Th>
              <Th>Email</Th>
              <Th>Role</Th>
              <Th>Status</Th>
              <Th>Created</Th>
              <Th>Last Login</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {data.map((user) => (
              <TableRow key={user.id}>
                <Td>{user.username}</Td>
                <Td>{user.email}</Td>
                <Td>
                  <RoleBadge $role={user.role}>{user.role}</RoleBadge>
                </Td>
                <Td>
                  <ActiveBadge $active={user.active}>
                    {user.active ? 'Active' : 'Inactive'}
                  </ActiveBadge>
                </Td>
                <Td>{format(new Date(user.created_at), 'yyyy-MM-dd HH:mm')}</Td>
                <Td>
                  {user.last_login
                    ? format(new Date(user.last_login), 'yyyy-MM-dd HH:mm')
                    : 'Never'}
                </Td>
                <Td>
                  <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
                    <AsciiButton label="Edit" onClick={() => handleOpenModal(user)} variant="ghost" />
                    <AsciiButton
                      label={user.active ? 'Deactivate' : 'Activate'}
                      onClick={() => handleToggleActive(user.id, user.active)}
                      variant="ghost"
                    />
                    <AsciiButton
                      label="Reset Pwd"
                      onClick={() => handleOpenPasswordModal(user.id)}
                      variant="ghost"
                    />
                    <AsciiButton
                      label="Delete"
                      onClick={() => handleDelete(user.id, user.username)}
                      variant="ghost"
                    />
                  </div>
                </Td>
              </TableRow>
            ))}
          </tbody>
              </Table>
            </TableContainer>

            <div style={{
              padding: theme.spacing.md,
              fontFamily: "Consolas",
              fontSize: 11,
              color: asciiColors.muted,
              textAlign: "center"
            }}>
              Showing {data.length > 0 ? (page - 1) * limit + 1 : 0} to{' '}
              {Math.min(page * limit, pagination.total)} of {pagination.total} users
            </div>
          </AsciiPanel>

      {pagination.totalPages > 1 && (
        <Pagination>
          <AsciiButton
            label="Previous"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            variant="ghost"
          />
          <span style={{ fontFamily: "Consolas", fontSize: 12, color: asciiColors.foreground }}>
            Page {page} of {pagination.totalPages}
          </span>
          <AsciiButton
            label="Next"
            disabled={page === pagination.totalPages}
            onClick={() => setPage(page + 1)}
            variant="ghost"
          />
          </Pagination>
        )}
        </>
      )}

      {isModalOpen && (
        <ModalOverlay $isOpen={isModalOpen} onClick={handleCloseModal}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle style={{ fontFamily: "Consolas", fontSize: 14 }}>
                {editingUser ? 'Edit User' : 'Create User'}
              </ModalTitle>
              <CloseButton onClick={handleCloseModal}>×</CloseButton>
            </ModalHeader>
            <FormGroup>
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                type="text"
                value={userForm.username}
                onChange={(e) =>
                  setUserForm({ ...userForm, username: e.target.value })
                }
                required
                disabled={!!editingUser}
              />
            </FormGroup>
            <FormGroup>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={userForm.email}
                onChange={(e) =>
                  setUserForm({ ...userForm, email: e.target.value })
                }
                required
              />
            </FormGroup>
            {!editingUser && (
              <FormGroup>
                <Label htmlFor="password">Password * (min 8 characters)</Label>
                <Input
                  id="password"
                  type="password"
                  value={userForm.password}
                  onChange={(e) =>
                    setUserForm({ ...userForm, password: e.target.value })
                  }
                  required
                />
              </FormGroup>
            )}
            <FormGroup>
              <Label htmlFor="role">Role *</Label>
              <Select
                id="role"
                value={userForm.role}
                onChange={(e) =>
                  setUserForm({
                    ...userForm,
                    role: e.target.value as 'admin' | 'user' | 'viewer',
                  })
                }
              >
                <option value="viewer">Viewer</option>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </Select>
            </FormGroup>
            <FormGroup>
              <Label>
                <input
                  type="checkbox"
                  checked={userForm.active}
                  onChange={(e) =>
                    setUserForm({ ...userForm, active: e.target.checked })
                  }
                />{' '}
                Active
              </Label>
            </FormGroup>
            <ButtonGroup>
              <AsciiButton label="Cancel" onClick={handleCloseModal} variant="ghost" />
              <AsciiButton 
                label={editingUser ? 'Update' : 'Create'}
                onClick={handleSave}
                variant="primary"
              />
            </ButtonGroup>
          </ModalContent>
        </ModalOverlay>
      )}

      {isPasswordModalOpen && (
        <ModalOverlay $isOpen={isPasswordModalOpen} onClick={handleClosePasswordModal}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle style={{ fontFamily: "Consolas", fontSize: 14 }}>Reset Password</ModalTitle>
              <CloseButton onClick={handleClosePasswordModal}>×</CloseButton>
            </ModalHeader>
            <FormGroup>
              <Label htmlFor="newPassword">New Password * (min 8 characters)</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </FormGroup>
            <FormGroup>
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </FormGroup>
            <ButtonGroup>
              <AsciiButton label="Cancel" onClick={handleClosePasswordModal} variant="ghost" />
              <AsciiButton 
                label="Reset Password"
                onClick={handleResetPassword}
                variant="primary"
              />
            </ButtonGroup>
          </ModalContent>
        </ModalOverlay>
      )}
    </div>
  );
};

export default UserManagement;

