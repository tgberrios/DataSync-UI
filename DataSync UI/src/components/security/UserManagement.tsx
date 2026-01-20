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
import SkeletonLoader from '../shared/SkeletonLoader';

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
  const [showUserManagementPlaybook, setShowUserManagementPlaybook] = useState(false);
  const isMountedRef = useRef(true);

  const fetchUsers = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    const startTime = Date.now();
    const minLoadingTime = 300;
    
    try {
      setLoading(true);
      setError(null);
      const sanitizedSearch = sanitizeSearch(search, 100);
      const params: any = {
        page: 1,
        limit: 1000,
        search: sanitizedSearch
      };
      
      if (filters.role) params.role = filters.role;
      if (filters.active !== '') params.active = filters.active;
      
      const response = await authApi.getUsers(params);
      
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minLoadingTime - elapsed);
      await new Promise(resolve => setTimeout(resolve, remaining));
      
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
    }, [filters.role, filters.active, search]);

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

  if (loading && data.length === 0) {
    return <SkeletonLoader variant="table" />;
  }

  return (
    <div style={{
      width: "100%",
      minHeight: "100vh",
      padding: "20px",
      fontFamily: "Consolas",
      fontSize: 12,
      color: asciiColors.foreground,
      backgroundColor: asciiColors.background,
      display: "flex",
      flexDirection: "column",
      gap: 20
    }}>
      <h1 style={{
        fontSize: 14,
        fontWeight: 600,
        margin: "0 0 20px 0",
        color: asciiColors.foreground,
        textTransform: "uppercase",
        fontFamily: "Consolas"
      }}>
        <span style={{ color: asciiColors.accent, marginRight: 8 }}>{ascii.blockFull}</span>
        USER MANAGEMENT
      </h1>

      {showUserManagementPlaybook && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}
        onClick={() => setShowUserManagementPlaybook(false)}
        >
          <div style={{
            width: '90%',
            maxWidth: 1000,
            maxHeight: '90vh',
            overflowY: 'auto'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <AsciiPanel title="USER MANAGEMENT PLAYBOOK">
              <div style={{ padding: 16, fontFamily: 'Consolas', fontSize: 12, lineHeight: 1.6 }}>
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                    {ascii.blockFull} OVERVIEW
                  </div>
                  <div style={{ color: asciiColors.foreground, marginLeft: 16 }}>
                    User Management provides centralized control over system access and permissions. 
                    Create, edit, and manage user accounts with different role-based access levels. 
                    Monitor user activity, track login history, and maintain security through proper 
                    access control.
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                    {ascii.blockFull} USER ROLES
                  </div>
                  
                  <div style={{ marginLeft: 16 }}>
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.danger, marginBottom: 4 }}>
                        Admin
                      </div>
                      <div style={{ color: asciiColors.foreground, marginLeft: 16, fontSize: 11 }}>
                        Full system access with all privileges. Can create, edit, and delete users, 
                        manage all system configurations, access all data sources, and perform 
                        administrative operations. Use sparingly and only for trusted administrators.
                      </div>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.accent, marginBottom: 4 }}>
                        User
                      </div>
                      <div style={{ color: asciiColors.foreground, marginLeft: 16, fontSize: 11 }}>
                        Standard user with access to create and manage data pipelines, view catalogs, 
                        and perform data operations. Can create custom jobs, manage their own configurations, 
                        and access most system features except user management and critical system settings.
                      </div>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.muted, marginBottom: 4 }}>
                        Viewer
                      </div>
                      <div style={{ color: asciiColors.foreground, marginLeft: 16, fontSize: 11 }}>
                        Read-only access to view catalogs, lineage, governance data, and reports. 
                        Cannot create or modify any configurations, jobs, or data. Ideal for 
                        stakeholders who need visibility without modification capabilities.
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                    {ascii.blockFull} USER STATUS
                  </div>
                  
                  <div style={{ marginLeft: 16 }}>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.success, fontWeight: 600 }}>Active</span>
                      <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
                        User account is enabled and can log in to the system
                      </span>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.muted, fontWeight: 600 }}>Inactive</span>
                      <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
                        User account is disabled and cannot log in. Useful for temporarily 
                        suspending access without deleting the account.
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                    {ascii.blockFull} USER MANAGEMENT FEATURES
                  </div>
                  
                  <div style={{ marginLeft: 16 }}>
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.foreground, marginBottom: 4 }}>
                        Create User
                      </div>
                      <div style={{ color: asciiColors.foreground, marginLeft: 16, fontSize: 11 }}>
                        Create new user accounts with username, email, password, and role assignment. 
                        Passwords must be at least 8 characters long. Username and email must be unique.
                      </div>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.foreground, marginBottom: 4 }}>
                        Edit User
                      </div>
                      <div style={{ color: asciiColors.foreground, marginLeft: 16, fontSize: 11 }}>
                        Update user information including email, role, and active status. 
                        Username cannot be changed after creation. Password changes require 
                        the Reset Password function.
                      </div>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.foreground, marginBottom: 4 }}>
                        Reset Password
                      </div>
                      <div style={{ color: asciiColors.foreground, marginLeft: 16, fontSize: 11 }}>
                        Administrators can reset user passwords. The new password must be at least 
                        8 characters long and must be confirmed. Users will need to use the new 
                        password on their next login.
                      </div>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.foreground, marginBottom: 4 }}>
                        Activate/Deactivate
                      </div>
                      <div style={{ color: asciiColors.foreground, marginLeft: 16, fontSize: 11 }}>
                        Quickly enable or disable user accounts without deleting them. 
                        Deactivated users cannot log in but their data and configurations are preserved.
                      </div>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.danger, marginBottom: 4 }}>
                        Delete User
                      </div>
                      <div style={{ color: asciiColors.foreground, marginLeft: 16, fontSize: 11 }}>
                        Permanently remove a user account from the system. This action cannot be undone. 
                        Consider deactivating users instead if you may need to restore access later.
                      </div>
                    </div>
                  </div>
                </div>


                <div style={{ 
                  marginTop: 16, 
                  padding: 12, 
                  background: asciiColors.backgroundSoft, 
                  borderRadius: 2,
                  border: `1px solid ${asciiColors.border}`
                }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: asciiColors.muted, marginBottom: 4 }}>
                    {ascii.blockSemi} Security Best Practices
                  </div>
                  <div style={{ fontSize: 11, color: asciiColors.foreground }}>
                    • Limit admin accounts to essential personnel only<br/>
                    • Use strong passwords (minimum 8 characters, recommend 12+)<br/>
                    • Regularly review and audit user accounts<br/>
                    • Deactivate unused accounts instead of deleting them<br/>
                    • Monitor last login times to identify inactive accounts<br/>
                    • Use role-based access control to enforce least privilege<br/>
                    • Regularly rotate passwords for sensitive accounts
                  </div>
                </div>

                <div style={{ marginTop: 16, textAlign: 'right' }}>
                  <AsciiButton
                    label="Close"
                    onClick={() => setShowUserManagementPlaybook(false)}
                    variant="ghost"
                  />
                </div>
              </div>
            </AsciiPanel>
          </div>
        </div>
      )}

      {error && (
        <div style={{ marginBottom: 20 }}>
          <AsciiPanel title="ERROR">
            <div style={{
              padding: "12px",
              color: asciiColors.danger,
              fontSize: 12,
              fontFamily: "Consolas"
            }}>
              {error}
            </div>
          </AsciiPanel>
        </div>
      )}

      <AsciiPanel title="SEARCH">
        <div style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          padding: "8px 0"
        }}>
          <input
            type="text"
            placeholder="Search by username or email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            style={{
              flex: 1,
              padding: "6px 10px",
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2,
              fontSize: 12,
              fontFamily: "Consolas",
              backgroundColor: asciiColors.background,
              color: asciiColors.foreground,
              outline: "none",
              transition: "border-color 0.2s, box-shadow 0.2s"
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = asciiColors.accent;
              e.currentTarget.style.boxShadow = `0 0 0 2px ${asciiColors.accent}20`;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = asciiColors.border;
              e.currentTarget.style.boxShadow = "none";
            }}
          />
          <AsciiButton label="Search" onClick={handleSearch} variant="primary" />
          {search && (
            <AsciiButton label="Clear" onClick={handleClearSearch} variant="ghost" />
          )}
        </div>
      </AsciiPanel>

      <div style={{ marginTop: 20 }}>
        <AsciiPanel title="FILTERS & ACTIONS">
          <div style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            padding: "12px 0",
            alignItems: "center"
          }}>
            <AsciiButton 
              label="Add User"
              onClick={() => handleOpenModal()}
              variant="primary"
            />
            <select
              value={filters.role}
              onChange={(e) => handleFilterChange('role', e.target.value)}
              style={{
                padding: "6px 10px",
                border: `1px solid ${asciiColors.border}`,
                borderRadius: 2,
                fontSize: 12,
                fontFamily: "Consolas",
                backgroundColor: asciiColors.background,
                color: asciiColors.foreground,
                cursor: "pointer",
                outline: "none",
                transition: "border-color 0.2s"
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = asciiColors.accent;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = asciiColors.border;
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
                padding: "6px 10px",
                border: `1px solid ${asciiColors.border}`,
                borderRadius: 2,
                fontSize: 12,
                fontFamily: "Consolas",
                backgroundColor: asciiColors.background,
                color: asciiColors.foreground,
                cursor: "pointer",
                outline: "none",
                transition: "border-color 0.2s"
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = asciiColors.accent;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = asciiColors.border;
              }}
            >
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
            <AsciiButton
              label="User Management Info"
              onClick={() => setShowUserManagementPlaybook(true)}
              variant="ghost"
            />
          </div>
        </AsciiPanel>
      </div>

      {loading ? (
        <div style={{ marginTop: 20 }}>
          <AsciiPanel title="LOADING">
            <div style={{
              padding: "40px",
              textAlign: "center",
              fontSize: 12,
              fontFamily: "Consolas",
              color: asciiColors.muted
            }}>
              {ascii.blockFull} Loading users...
            </div>
          </AsciiPanel>
        </div>
      ) : (
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
                  <strong style={{ color: asciiColors.accent, fontSize: 11, fontFamily: "Consolas", fontWeight: 600 }}>Username:</strong>
                  <div style={{ 
                    color: asciiColors.foreground, 
                    fontSize: 12, 
                    marginTop: '6px',
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
                  <strong style={{ color: asciiColors.accent, fontSize: 11, fontFamily: "Consolas", fontWeight: 600 }}>Email:</strong>
                  <div style={{ 
                    color: asciiColors.foreground, 
                    fontSize: 12, 
                    marginTop: '6px',
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
                  <strong style={{ color: asciiColors.accent, fontSize: 11, fontFamily: "Consolas", fontWeight: 600 }}>Role:</strong>
                  <div style={{ marginTop: '6px' }}>
                    <RoleBadge $role={selectedUser.role}>{selectedUser.role.toUpperCase()}</RoleBadge>
                  </div>
                </div>
                <div>
                  <strong style={{ color: asciiColors.accent, fontSize: 11, fontFamily: "Consolas", fontWeight: 600 }}>Status:</strong>
                  <div style={{ marginTop: '6px' }}>
                    <ActiveBadge $active={selectedUser.active}>
                      {selectedUser.active ? 'ACTIVE' : 'INACTIVE'}
                    </ActiveBadge>
                  </div>
                </div>
                <div style={{ 
                  marginTop: theme.spacing.md, 
                  paddingTop: theme.spacing.md, 
                  borderTop: `1px solid ${asciiColors.border}` 
                }}>
                  <strong style={{ color: asciiColors.muted, fontSize: 11, fontFamily: "Consolas", fontWeight: 600 }}>Account Information:</strong>
                  <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div>
                      <span style={{ color: asciiColors.muted, fontSize: 10 }}>Created:</span>{' '}
                      <span style={{ color: asciiColors.foreground, fontSize: 11 }}>
                        {format(new Date(selectedUser.created_at), 'yyyy-MM-dd HH:mm:ss')}
                      </span>
                    </div>
                    {selectedUser.updated_at && selectedUser.updated_at !== selectedUser.created_at && (
                      <div>
                        <span style={{ color: asciiColors.muted, fontSize: 10 }}>Updated:</span>{' '}
                        <span style={{ color: asciiColors.foreground, fontSize: 11 }}>
                          {format(new Date(selectedUser.updated_at), 'yyyy-MM-dd HH:mm:ss')}
                        </span>
                      </div>
                    )}
                    <div>
                      <span style={{ color: asciiColors.muted, fontSize: 10 }}>Last Login:</span>{' '}
                      <span style={{ 
                        color: selectedUser.last_login ? asciiColors.foreground : asciiColors.muted, 
                        fontSize: 11 
                      }}>
                        {selectedUser.last_login
                          ? format(new Date(selectedUser.last_login), 'yyyy-MM-dd HH:mm:ss')
                          : 'Never'}
                      </span>
                    </div>
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

