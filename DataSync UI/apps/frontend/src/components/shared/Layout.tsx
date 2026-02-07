import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useState, useCallback } from 'react';
import styled from 'styled-components';
import { authApi, getCurrentUser } from '../../services/api';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import RouteTransition from './RouteTransition';

const SIDEBAR_STORAGE_KEY = 'datasync_sidebar_collapsed';

const LayoutContainer = styled.div`
  display: flex;
  height: 100vh;
  overflow: hidden;
`;

const Sidebar = styled.div<{ $collapsed?: boolean }>`
  width: ${props => (props.$collapsed ? '44px' : '280px')};
  min-width: ${props => (props.$collapsed ? '44px' : '280px')};
  background: ${asciiColors.background};
  color: ${asciiColors.foreground};
  padding: ${props => (props.$collapsed ? '0' : '16px 0')};
  border-right: 2px solid ${asciiColors.border};
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  font-family: "Consolas, 'Source Code Pro', monospace";
  font-size: 12px;
  height: 100vh;
  position: sticky;
  top: 0;
  transition: width 0.15s ease, min-width 0.15s ease, padding 0.15s ease;

  &::-webkit-scrollbar {
    width: 0px;
    background: transparent;
  }

  scrollbar-width: none;
  -ms-overflow-style: none;
`;

const MainContent = styled.div`
  flex: 1;
  background-color: white;
  overflow-y: auto;
  overflow-x: hidden;
  animation: fadeIn 0.15s ease-out;
  height: 100vh;
  
  &::-webkit-scrollbar {
    width: 0px;
    background: transparent;
  }
  
  scrollbar-width: none;
  -ms-overflow-style: none;
`;

const NavItem = styled(NavLink)`
  display: flex;
  align-items: center;
  padding: 10px 20px;
  color: ${asciiColors.muted};
  text-decoration: none;
  font-size: 12px;
  font-family: "Consolas, 'Source Code Pro', monospace";
  border-left: 2px solid transparent;
  transition: background-color 0.12s ease-out, color 0.12s ease-out, transform 0.12s ease-out, border-left-color 0.12s ease-out;
  position: relative;
  
  &:hover {
    background: ${asciiColors.backgroundSoft};
    color: ${asciiColors.foreground};
    transform: translateX(2px);
    border-left-color: ${asciiColors.accent};
  }
  
  &.active {
    background: ${asciiColors.backgroundSoft};
    color: ${asciiColors.accent};
    border-left-color: ${asciiColors.accent};
    font-weight: 600;
  }
`;

const NavSubItem = styled(NavLink)`
  display: flex;
  align-items: center;
  padding: 8px 20px 8px 36px;
  color: ${asciiColors.muted};
  text-decoration: none;
  font-size: 11px;
  font-family: "Consolas, 'Source Code Pro', monospace";
  border-left: 2px solid transparent;
  transition: background-color 0.12s ease-out, color 0.12s ease-out, transform 0.12s ease-out, border-left-color 0.12s ease-out;
  position: relative;
  
  &:hover {
    background: ${asciiColors.backgroundSoft};
    color: ${asciiColors.foreground};
    transform: translateX(2px);
    border-left-color: ${asciiColors.accent};
  }
  
  &.active {
    background: ${asciiColors.backgroundSoft};
    color: ${asciiColors.accent};
    border-left-color: ${asciiColors.accent};
    font-weight: 600;
  }
`;

const NavGroup = styled.div`
  margin-bottom: 5px;
`;

const NavGroupHeader = styled.h2<{ $isOpen: boolean }>`
  display: flex;
  align-items: center;
  padding: 10px 20px;
  color: ${asciiColors.foreground};
  font-size: 14px;
  font-family: "Consolas, 'Source Code Pro', monospace";
  font-weight: 600;
  margin: 0;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.12s ease-out, border-left-color 0.12s ease-out;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-left: 2px solid transparent;
  
  &:hover {
    background: ${asciiColors.backgroundSoft};
    border-left-color: ${asciiColors.accent};
  }
  
  &::before {
    content: '${props => props.$isOpen ? ascii.arrowDown : ascii.arrowRight}';
    margin-right: 8px;
    font-size: 12px;
    transition: transform 0.12s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    transform: ${props => props.$isOpen ? 'rotate(90deg)' : 'rotate(0deg)'};
    display: inline-block;
    will-change: transform;
  }
`;

const NavGroupContent = styled.div<{ $isOpen: boolean }>`
  display: block;
  max-height: ${props => props.$isOpen ? '2000px' : '0'};
  overflow: hidden;
  transition: max-height 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.12s ease-out;
  opacity: ${props => props.$isOpen ? '1' : '0'};
  will-change: max-height, opacity;
`;

const SidebarHeader = styled.div<{ $collapsed?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: ${props => (props.$collapsed ? 'center' : 'flex-start')};
  border-bottom: ${props => (props.$collapsed ? 'none' : `1px solid ${asciiColors.border}`)};
  margin-bottom: ${props => (props.$collapsed ? '0' : '16px')};
  padding-top: ${props => (props.$collapsed ? '14px' : '0')};
  padding-bottom: ${props => (props.$collapsed ? '14px' : '0')};
  flex-shrink: 0;
`;

const Logo = styled.h1`
  flex: 1;
  padding: 16px 20px;
  font-size: 18px;
  font-family: "Consolas, 'Source Code Pro', monospace";
  color: ${asciiColors.foreground};
  font-weight: 600;
  margin: 0;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: background-color 0.12s ease-out, transform 0.12s ease-out;

  &:hover {
    background: ${asciiColors.backgroundSoft};
    transform: translateX(2px);
  }
`;

const SIDEBAR_HAMBURGER = '☰';

const SidebarToggle = styled.button<{ $collapsed?: boolean }>`
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  margin-right: ${props => (props.$collapsed ? 0 : '12px')};
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${asciiColors.background};
  border: 1px solid ${asciiColors.border};
  color: ${asciiColors.foreground};
  cursor: pointer;
  border-radius: 2px;
  font-size: 18px;
  line-height: 1;
  font-family: "Consolas, 'Source Code Pro', monospace";
  transition: background-color 0.12s ease-out, border-color 0.12s ease-out, color 0.12s ease-out;

  &:hover {
    background: ${asciiColors.backgroundSoft};
    border-color: ${asciiColors.accent};
    color: ${asciiColors.accent};
  }

  &:focus-visible {
    outline: 2px solid ${asciiColors.accent};
    outline-offset: 2px;
  }
`;

const SidebarNav = styled.div<{ $visible?: boolean }>`
  flex: ${props => (props.$visible ? 1 : 0)};
  min-height: 0;
  overflow: hidden;
  opacity: ${props => (props.$visible ? 1 : 0)};
  pointer-events: ${props => (props.$visible ? 'auto' : 'none')};
  transition: opacity 0.15s ease, flex 0.15s ease;
`;

const UserInfo = styled.div`
  padding: 16px 20px;
  border-top: 1px solid ${asciiColors.border};
  margin-top: auto;
  flex-shrink: 0;
`;

const UsernameDisplay = styled.div`
  font-size: 12px;
  font-family: "Consolas, 'Source Code Pro', monospace";
  font-weight: 600;
  color: ${asciiColors.foreground};
  margin-bottom: 6px;
  letter-spacing: 0.5px;
`;

const RoleDisplay = styled.div`
  font-size: 11px;
  font-family: "Consolas, 'Source Code Pro', monospace";
  font-weight: 500;
  color: ${asciiColors.accent};
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const LogoutButton = styled.button`
  width: 100%;
  padding: 8px 12px;
  margin-top: 8px;
  background: ${asciiColors.background};
  border: 1px solid ${asciiColors.border};
  color: ${asciiColors.foreground};
  cursor: pointer;
  border-radius: 2px;
  font-size: 11px;
  font-family: "Consolas, 'Source Code Pro', monospace";
  transition: background-color 0.12s ease-out, border-color 0.12s ease-out, color 0.12s ease-out, transform 0.12s ease-out;

  &:hover {
    background: ${asciiColors.backgroundSoft};
    border-color: ${asciiColors.foreground};
    color: ${asciiColors.foreground};
    transform: translateY(-1px);
  }
`;

const getStoredSidebarCollapsed = (): boolean => {
  try {
    return localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
};

const Layout = () => {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(getStoredSidebarCollapsed);
  const [openGroups, setOpenGroups] = useState<{ [key: string]: boolean }>({
    catalog: false,
    lineage: false,
    governance: false,
    quality: false,
    operations: false,
    system: false,
    monitoring: false,
    maintenance: false,
  });

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const handleSidebarKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleSidebar();
      }
    },
    [toggleSidebar]
  );

  const toggleGroup = (group: string) => {
    setOpenGroups(prev => ({
      ...prev,
      [group]: !prev[group]
    }));
  };

  const handleLogout = async () => {
    await authApi.logout();
    navigate('/login');
  };

  return (
    <LayoutContainer>
      <Sidebar $collapsed={sidebarCollapsed}>
        <SidebarHeader $collapsed={sidebarCollapsed}>
          {!sidebarCollapsed && (
            <Logo title="DataSync">DATASYNC</Logo>
          )}
          <SidebarToggle
            type="button"
            $collapsed={sidebarCollapsed}
            onClick={toggleSidebar}
            aria-label={sidebarCollapsed ? 'Abrir menú' : 'Cerrar menú'}
            aria-expanded={!sidebarCollapsed}
            onKeyDown={handleSidebarKeyDown}
            title={sidebarCollapsed ? 'Abrir menú' : 'Cerrar menú'}
          >
            {sidebarCollapsed ? SIDEBAR_HAMBURGER : '◀'}
          </SidebarToggle>
        </SidebarHeader>

        <SidebarNav $visible={!sidebarCollapsed} aria-hidden={sidebarCollapsed}>
          <NavItem to="/" end>
            ■ Dashboard
          </NavItem>

        <NavGroup>
          <NavGroupHeader 
            $isOpen={openGroups.monitoring || false} 
            onClick={() => toggleGroup('monitoring')}
          >
            Monitoring & Observability
          </NavGroupHeader>
          <NavGroupContent $isOpen={openGroups.monitoring || false}>
            <NavSubItem to="/monitor">
              ■ Unified Monitor
            </NavSubItem>
            <NavSubItem to="/query-performance">
              ■ Query Performance
            </NavSubItem>
            <NavSubItem to="/monitoring/tracing">
              ■ Distributed Tracing
            </NavSubItem>
            <NavSubItem to="/monitoring/apm">
              ■ APM Dashboard
            </NavSubItem>
            <NavSubItem to="/monitoring/costs">
              ■ Cost Tracking
            </NavSubItem>
            <NavSubItem to="/monitoring/log-aggregation">
              ■ Log Aggregation
            </NavSubItem>
            <NavSubItem to="/logs">
              ■ Logs Viewer
            </NavSubItem>
          </NavGroupContent>
        </NavGroup>

        <NavGroup>
          <NavGroupHeader 
            $isOpen={openGroups.catalog} 
            onClick={() => toggleGroup('catalog')}
          >
            Data Integration
          </NavGroupHeader>
          <NavGroupContent $isOpen={openGroups.catalog}>
            <NavSubItem to="/catalog">
              ■ Data Integration - DataLake
            </NavSubItem>
            <NavSubItem to="/api-catalog">
              ■ Data Integration - API
            </NavSubItem>
            <NavSubItem to="/csv-catalog">
              ■ Data Integration - CSV
            </NavSubItem>
            <NavSubItem to="/google-sheets-catalog">
              ■ Data Integration - Google Sheets
            </NavSubItem>
            <NavSubItem to="/custom-jobs">
              ■ Data Integration - Pipeline Orchestration
            </NavSubItem>
            <NavSubItem to="/data-warehouse">
              ■ Data Integration - Data Warehouse
            </NavSubItem>
            <NavSubItem to="/data-vault">
              ■ Data Integration - Data Vault 2.0
            </NavSubItem>
            <NavSubItem to="/big-data">
              ■ Big Data Processing
            </NavSubItem>
            <NavSubItem to="/stream-processing">
              ■ Stream Processing
            </NavSubItem>
            <NavSubItem to="/performance">
              ■ Performance Optimization
            </NavSubItem>
            <NavSubItem to="/metadata">
              ■ Metadata & Documentation
            </NavSubItem>
            <NavSubItem to="/workflows">
              ■ Data Integration - Workflow Orchestration (DAGs)
            </NavSubItem>
            <NavSubItem to="/event-triggers">
              ■ Data Integration - Event Triggers
            </NavSubItem>
            <NavSubItem to="/transformations">
              ■ Data Integration - Transformations
            </NavSubItem>
            <NavSubItem to="/dbt-models">
              ■ Data Integration - dbt Models
            </NavSubItem>
            <NavSubItem to="/datalake-mapping">
              ■ DataLake Mapping
            </NavSubItem>
            <NavSubItem to="/unused-objects">
              ■ Unused Objects
            </NavSubItem>
          </NavGroupContent>
        </NavGroup>

        <NavGroup>
          <NavGroupHeader 
            $isOpen={openGroups.lineage} 
            onClick={() => toggleGroup('lineage')}
          >
            Lineage
          </NavGroupHeader>
          <NavGroupContent $isOpen={openGroups.lineage}>
            <NavSubItem to="/data-lineage-mariadb">
              ■ Lineage MariaDB
            </NavSubItem>
            <NavSubItem to="/data-lineage-mssql">
              ■ Lineage MSSQL
            </NavSubItem>
            <NavSubItem to="/data-lineage-mongodb">
              ■ Lineage MongoDB
            </NavSubItem>
            <NavSubItem to="/data-lineage-oracle">
              ■ Lineage Oracle
            </NavSubItem>
          </NavGroupContent>
        </NavGroup>

        <NavGroup>
          <NavGroupHeader 
            $isOpen={openGroups.governance} 
            onClick={() => toggleGroup('governance')}
          >
            Governance
          </NavGroupHeader>
          <NavGroupContent $isOpen={openGroups.governance}>
            <NavSubItem to="/column-catalog">
              ■ Governance Columns
            </NavSubItem>
            <NavSubItem to="/governance-catalog-mariadb">
              ■ Gov Catalog MariaDB
            </NavSubItem>
            <NavSubItem to="/governance-catalog-mssql">
              ■ Gov Catalog MSSQL
            </NavSubItem>
            <NavSubItem to="/governance-catalog-mongodb">
              ■ Gov Catalog MongoDB
            </NavSubItem>
            <NavSubItem to="/governance-catalog-oracle">
              ■ Gov Catalog Oracle
            </NavSubItem>
            <NavSubItem to="/governance">
              ■ Governance
            </NavSubItem>
            <NavSubItem to="/business-glossary">
              ■ Business Glossary
            </NavSubItem>
            <NavSubItem to="/compliance-manager">
              ■ Compliance Manager
            </NavSubItem>
            <NavSubItem to="/data-retention">
              ■ Data Retention
            </NavSubItem>
            <NavSubItem to="/data-classifier">
              ■ Data Classifier
            </NavSubItem>
            <NavSubItem to="/schema-change-auditor">
              ■ Schema Change Auditor
            </NavSubItem>
          </NavGroupContent>
        </NavGroup>

        <NavGroup>
          <NavGroupHeader 
            $isOpen={openGroups.quality} 
            onClick={() => toggleGroup('quality')}
          >
            Quality
          </NavGroupHeader>
          <NavGroupContent $isOpen={openGroups.quality}>
            <NavSubItem to="/quality">
              ■ Quality
            </NavSubItem>
          </NavGroupContent>
        </NavGroup>


        <NavGroup>
          <NavGroupHeader 
            $isOpen={openGroups.operations} 
            onClick={() => toggleGroup('operations')}
          >
            Operations
          </NavGroupHeader>
          <NavGroupContent $isOpen={openGroups.operations}>
            <NavSubItem to="/maintenance">
              ■ Maintenance
            </NavSubItem>
            <NavSubItem to="/schema-migrations">
              ■ Schema Migrations
            </NavSubItem>
            <NavSubItem to="/backups">
              ■ Backup Manager
            </NavSubItem>
            <NavSubItem to="/data-masking">
              ■ Data Masking
            </NavSubItem>
            <NavSubItem to="/data-encryption">
              ■ Column Encryption
            </NavSubItem>
            <NavSubItem to="/row-level-security">
              ■ Row-Level Security
            </NavSubItem>
            <NavSubItem to="/security-advanced">
              ■ Security Advanced
            </NavSubItem>
            <NavSubItem to="/audit-trail">
              ■ Audit Trail
            </NavSubItem>
            <NavSubItem to="/security">
              ■ Security
            </NavSubItem>
            <NavSubItem to="/cdc-cleanup">
              ■ CDC Cleanup
            </NavSubItem>
          </NavGroupContent>
        </NavGroup>

        <NavGroup>
          <NavGroupHeader 
            $isOpen={openGroups.system} 
            onClick={() => toggleGroup('system')}
          >
            System
          </NavGroupHeader>
          <NavGroupContent $isOpen={openGroups.system}>
            <NavSubItem to="/catalog-locks">
              ■ Locks
            </NavSubItem>
            <NavSubItem to="/config">
              ■ Config
            </NavSubItem>
            <NavSubItem to="/user-management">
              ■ User Management
            </NavSubItem>
            <NavSubItem to="/webhooks">
              ■ Webhooks & Notifications
            </NavSubItem>
          </NavGroupContent>
        </NavGroup>
        </SidebarNav>

        {!sidebarCollapsed && (
          <UserInfo>
            {currentUser && (
              <>
                <UsernameDisplay>{currentUser.username}</UsernameDisplay>
                <RoleDisplay>{currentUser.role}</RoleDisplay>
                <LogoutButton onClick={handleLogout} type="button" aria-label="Cerrar sesión">
                  Logout
                </LogoutButton>
              </>
            )}
          </UserInfo>
        )}
      </Sidebar>
      <MainContent>
        <RouteTransition minDelay={750}>
          <Outlet />
        </RouteTransition>
      </MainContent>
    </LayoutContainer>
  );
};

export default Layout;
