import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import styled from 'styled-components';
import { authApi, getCurrentUser } from '../../services/api';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import RouteTransition from './RouteTransition';

const LayoutContainer = styled.div`
  display: flex;
  height: 100vh;
  overflow: hidden;
`;

const Sidebar = styled.div`
  width: 280px;
  background: ${asciiColors.background};
  color: ${asciiColors.foreground};
  padding: 16px 0;
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

const Logo = styled.h1`
  padding: 16px 20px;
  font-size: 18px;
  font-family: "Consolas, 'Source Code Pro', monospace";
  color: ${asciiColors.foreground};
  font-weight: 600;
  margin: 0;
  border-bottom: 1px solid ${asciiColors.border};
  margin-bottom: 16px;
  transition: background-color 0.12s ease-out, transform 0.12s ease-out;
  
  &:hover {
    background: ${asciiColors.backgroundSoft};
    transform: translateX(2px);
  }
`;

const UserInfo = styled.div`
  padding: 16px 20px;
  border-top: 1px solid ${asciiColors.border};
  margin-top: auto;
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
    background: ${asciiColors.danger};
    border-color: ${asciiColors.danger};
    color: #ffffff;
    transform: translateY(-1px);
  }
`;

const Layout = () => {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const [openGroups, setOpenGroups] = useState<{ [key: string]: boolean }>({
    catalog: false,
    lineage: false,
    governance: false,
    quality: false,
    operations: false,
    system: false,
  });

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
      <Sidebar>
        <Logo>
          DATASYNC
        </Logo>
        
        <NavItem to="/" end>
          ■ Dashboard
        </NavItem>

        <NavItem to="/monitor">
          ■ Monitor
        </NavItem>

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
            <NavSubItem to="/audit-trail">
              ■ Audit Trail
            </NavSubItem>
            <NavSubItem to="/security">
              ■ Security
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
            <NavSubItem to="/logs">
              ■ Logs
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

        <UserInfo>
          {currentUser && (
            <>
              <UsernameDisplay>{currentUser.username}</UsernameDisplay>
              <RoleDisplay>{currentUser.role}</RoleDisplay>
              <LogoutButton onClick={handleLogout}>
                Logout
              </LogoutButton>
            </>
          )}
        </UserInfo>
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
