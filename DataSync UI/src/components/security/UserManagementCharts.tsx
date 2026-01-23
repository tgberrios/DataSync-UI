import { useMemo } from 'react';
import {
  Pie,
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Pie as PieChart } from 'react-chartjs-2';
import { format } from 'date-fns';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { theme } from '../../theme/theme';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';

ChartJS.register(
  CategoryScale,
  LinearScale,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

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

interface UserManagementChartsProps {
  users: User[];
  filters?: {
    role?: string;
    active?: string;
  };
}

const UserManagementCharts: React.FC<UserManagementChartsProps> = ({ users }) => {
  const metrics = useMemo(() => {
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.active).length;
    const inactiveUsers = totalUsers - activeUsers;
    
    const roleCounts = users.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const usersWithLogin = users.filter(u => u.last_login !== null).length;
    const usersNeverLoggedIn = totalUsers - usersWithLogin;
    
    const recentLogins = users.filter(u => {
      if (!u.last_login) return false;
      const loginDate = new Date(u.last_login);
      const daysSinceLogin = (Date.now() - loginDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceLogin <= 30;
    }).length;

    return {
      totalUsers,
      activeUsers,
      inactiveUsers,
      roleCounts,
      usersWithLogin,
      usersNeverLoggedIn,
      recentLogins
    };
  }, [users]);

  const roleDistributionData = useMemo(() => {
    const roles = ['admin', 'user', 'viewer', 'analytics', 'reporting'];
    const roleLabels = roles.map(r => r.toUpperCase());
    const roleData = roles.map(r => metrics.roleCounts[r] || 0);

    return {
      labels: roleLabels,
      datasets: [
        {
          data: roleData,
          backgroundColor: [
            asciiColors.accent + '80',
            asciiColors.accent + '60',
            asciiColors.muted + '80',
            asciiColors.accent + '40',
            asciiColors.accent + '50'
          ],
          borderColor: [
            asciiColors.accent,
            asciiColors.accent,
            asciiColors.muted,
            asciiColors.accent,
            asciiColors.accent
          ],
          borderWidth: 2
        }
      ]
    };
  }, [metrics.roleCounts]);

  const statusDistributionData = useMemo(() => {
    return {
      labels: ['Active', 'Inactive'],
      datasets: [
        {
          data: [metrics.activeUsers, metrics.inactiveUsers],
          backgroundColor: [
            asciiColors.accent + '80',
            asciiColors.muted + '80'
          ],
          borderColor: [
            asciiColors.accent,
            asciiColors.muted
          ],
          borderWidth: 2
        }
      ]
    };
  }, [metrics.activeUsers, metrics.inactiveUsers]);

  const loginStatusData = useMemo(() => {
    return {
      labels: ['Has Logged In', 'Never Logged In'],
      datasets: [
        {
          data: [metrics.usersWithLogin, metrics.usersNeverLoggedIn],
          backgroundColor: [
            asciiColors.accent + '80',
            asciiColors.muted + '80'
          ],
          borderColor: [
            asciiColors.accent,
            asciiColors.muted
          ],
          borderWidth: 2
        }
      ]
    };
  }, [metrics.usersWithLogin, metrics.usersNeverLoggedIn]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          font: {
            family: 'Consolas',
            size: 11
          },
          color: asciiColors.foreground,
          padding: 12,
          usePointStyle: true
        }
      },
      tooltip: {
        backgroundColor: asciiColors.background,
        titleColor: asciiColors.foreground,
        bodyColor: asciiColors.foreground,
        borderColor: asciiColors.border,
        borderWidth: 1,
        padding: 12,
        font: {
          family: 'Consolas',
          size: 11
        }
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
        gap: theme.spacing.sm, 
        marginBottom: theme.spacing.lg 
      }}>
        <AsciiPanel title="Total Users">
          <div style={{ fontFamily: 'Consolas', fontSize: 14, fontWeight: 600, color: asciiColors.foreground }}>
            {metrics.totalUsers}
          </div>
        </AsciiPanel>
        <AsciiPanel title="Active Users">
          <div style={{ fontFamily: 'Consolas', fontSize: 14, fontWeight: 600, color: asciiColors.accent }}>
            {metrics.activeUsers}
          </div>
        </AsciiPanel>
        <AsciiPanel title="Inactive Users">
          <div style={{ fontFamily: 'Consolas', fontSize: 14, fontWeight: 600, color: asciiColors.muted }}>
            {metrics.inactiveUsers}
          </div>
        </AsciiPanel>
        <AsciiPanel title="Recent Logins (30d)">
          <div style={{ fontFamily: 'Consolas', fontSize: 14, fontWeight: 600, color: asciiColors.accent }}>
            {metrics.recentLogins}
          </div>
        </AsciiPanel>
        <AsciiPanel title="Never Logged In">
          <div style={{ fontFamily: 'Consolas', fontSize: 14, fontWeight: 600, color: asciiColors.muted }}>
            {metrics.usersNeverLoggedIn}
          </div>
        </AsciiPanel>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: theme.spacing.md 
      }}>
        <AsciiPanel title="ROLE DISTRIBUTION">
          <div style={{ height: '300px', padding: theme.spacing.md }}>
            <PieChart data={roleDistributionData} options={chartOptions} />
          </div>
        </AsciiPanel>

        <AsciiPanel title="STATUS DISTRIBUTION">
          <div style={{ height: '300px', padding: theme.spacing.md }}>
            <PieChart data={statusDistributionData} options={chartOptions} />
          </div>
        </AsciiPanel>

        <AsciiPanel title="LOGIN STATUS">
          <div style={{ height: '300px', padding: theme.spacing.md }}>
            <PieChart data={loginStatusData} options={chartOptions} />
          </div>
        </AsciiPanel>
      </div>

      <AsciiPanel title="ROLE BREAKDOWN">
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: theme.spacing.sm,
          padding: theme.spacing.md
        }}>
          {Object.entries(metrics.roleCounts).map(([role, count]) => {
            const getRoleColor = (r: string) => {
              switch (r) {
                case 'admin': return asciiColors.accent;
                case 'user': return asciiColors.accent;
                case 'viewer': return asciiColors.muted;
                case 'analytics': return asciiColors.accent;
                case 'reporting': return asciiColors.accent;
                default: return asciiColors.foreground;
              }
            };

            return (
              <div key={role} style={{
                padding: theme.spacing.sm,
                background: asciiColors.backgroundSoft,
                borderRadius: 2,
                border: `1px solid ${getRoleColor(role)}`,
                fontFamily: 'Consolas',
                fontSize: 12
              }}>
                <div style={{ 
                  color: getRoleColor(role), 
                  fontWeight: 600, 
                  marginBottom: 4,
                  fontSize: 11,
                  textTransform: 'uppercase'
                }}>
                  {role}
                </div>
                <div style={{ 
                  color: asciiColors.foreground, 
                  fontSize: 16, 
                  fontWeight: 600 
                }}>
                  {count}
                </div>
                <div style={{ 
                  color: asciiColors.muted, 
                  fontSize: 10,
                  marginTop: 4
                }}>
                  {metrics.totalUsers > 0 ? ((count / metrics.totalUsers) * 100).toFixed(1) : 0}%
                </div>
              </div>
            );
          })}
        </div>
      </AsciiPanel>

      <AsciiPanel title={`USERS TABLE (${users.length} users)`}>
        <div style={{
          maxHeight: '500px',
          overflowY: 'auto',
          fontFamily: 'Consolas',
          fontSize: 12
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            border: `1px solid ${asciiColors.border}`
          }}>
            <thead style={{
              position: 'sticky',
              top: 0,
              background: asciiColors.background,
              zIndex: 10,
              borderBottom: `2px solid ${asciiColors.border}`
            }}>
              <tr>
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  fontWeight: 600,
                  color: asciiColors.accent,
                  borderRight: `1px solid ${asciiColors.border}`,
                  borderBottom: `1px solid ${asciiColors.border}`
                }}>
                  Username
                </th>
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  fontWeight: 600,
                  color: asciiColors.accent,
                  borderRight: `1px solid ${asciiColors.border}`,
                  borderBottom: `1px solid ${asciiColors.border}`
                }}>
                  Email
                </th>
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  fontWeight: 600,
                  color: asciiColors.accent,
                  borderRight: `1px solid ${asciiColors.border}`,
                  borderBottom: `1px solid ${asciiColors.border}`
                }}>
                  Role
                </th>
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  fontWeight: 600,
                  color: asciiColors.accent,
                  borderRight: `1px solid ${asciiColors.border}`,
                  borderBottom: `1px solid ${asciiColors.border}`
                }}>
                  Status
                </th>
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  fontWeight: 600,
                  color: asciiColors.accent,
                  borderRight: `1px solid ${asciiColors.border}`,
                  borderBottom: `1px solid ${asciiColors.border}`
                }}>
                  Last Login
                </th>
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  fontWeight: 600,
                  color: asciiColors.accent,
                  borderBottom: `1px solid ${asciiColors.border}`
                }}>
                  Created
                </th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{
                    padding: '40px',
                    textAlign: 'center',
                    color: asciiColors.muted,
                    fontFamily: 'Consolas',
                    fontSize: 12
                  }}>
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user, index) => {
                  const getRoleColor = (role: string) => {
                    switch (role) {
                      case 'admin': return asciiColors.accent;
                      case 'user': return asciiColors.accent;
                      case 'viewer': return asciiColors.muted;
                      case 'analytics': return asciiColors.accent;
                      case 'reporting': return asciiColors.accent;
                      default: return asciiColors.foreground;
                    }
                  };

                  return (
                    <tr
                      key={user.id}
                      style={{
                        borderBottom: `1px solid ${asciiColors.border}`,
                        transition: 'background 0.2s ease',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = asciiColors.backgroundSoft;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <td style={{
                        padding: '12px',
                        borderRight: `1px solid ${asciiColors.border}`,
                        color: asciiColors.foreground,
                        fontWeight: 600
                      }}>
                        {user.username}
                      </td>
                      <td style={{
                        padding: '12px',
                        borderRight: `1px solid ${asciiColors.border}`,
                        color: asciiColors.foreground
                      }}>
                        {user.email}
                      </td>
                      <td style={{
                        padding: '12px',
                        borderRight: `1px solid ${asciiColors.border}`
                      }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: 2,
                          fontSize: 10,
                          fontFamily: 'Consolas',
                          fontWeight: 600,
                          backgroundColor: getRoleColor(user.role) + '20',
                          color: getRoleColor(user.role),
                          border: `1px solid ${getRoleColor(user.role)}`,
                          textTransform: 'uppercase'
                        }}>
                          {user.role}
                        </span>
                      </td>
                      <td style={{
                        padding: '12px',
                        borderRight: `1px solid ${asciiColors.border}`
                      }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: 2,
                          fontSize: 10,
                          fontFamily: 'Consolas',
                          fontWeight: 600,
                          backgroundColor: asciiColors.backgroundSoft,
                          color: user.active ? asciiColors.accent : asciiColors.muted,
                          border: `1px solid ${user.active ? asciiColors.accent : asciiColors.border}`,
                          textTransform: 'uppercase'
                        }}>
                          {user.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{
                        padding: '12px',
                        borderRight: `1px solid ${asciiColors.border}`,
                        color: user.last_login ? asciiColors.foreground : asciiColors.muted,
                        fontSize: 11
                      }}>
                        {user.last_login
                          ? format(new Date(user.last_login), 'yyyy-MM-dd HH:mm')
                          : 'Never'}
                      </td>
                      <td style={{
                        padding: '12px',
                        color: asciiColors.muted,
                        fontSize: 11
                      }}>
                        {format(new Date(user.created_at), 'yyyy-MM-dd')}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </AsciiPanel>
    </div>
  );
};

export default UserManagementCharts;
