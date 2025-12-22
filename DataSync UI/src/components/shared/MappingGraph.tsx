import React from 'react';
import styled from 'styled-components';
import { theme } from '../../theme/theme';
import {
  LoadingOverlay,
} from './BaseComponents';

const MappingGraphContainer = styled.div`
  margin-top: ${theme.spacing.xl};
  padding: ${theme.spacing.lg};
  background: ${theme.colors.background.secondary};
  border-radius: ${theme.borderRadius.md};
  border: 1px solid ${theme.colors.border.light};
`;

const GraphContent = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${theme.spacing.xl};
  justify-content: center;
  min-height: 400px;
`;

const SourcePanel = styled.div`
  flex: 0 0 300px;
  background: ${theme.colors.background.main};
  border: 2px solid ${theme.colors.primary.main};
  border-radius: ${theme.borderRadius.md};
  padding: ${theme.spacing.md};
  box-shadow: ${theme.shadows.md};
`;

const SourceHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: ${theme.spacing.sm};
  border-bottom: 2px solid ${theme.colors.border.medium};
  margin-bottom: ${theme.spacing.md};
`;

const SourceTitle = styled.div`
  font-weight: 600;
  color: ${theme.colors.primary.main};
  font-size: 1.1em;
`;

const SourceType = styled.div`
  font-size: 0.85em;
  color: ${theme.colors.text.secondary};
`;

const SourceInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
  font-size: 0.9em;
`;

const SourceInfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  padding: ${theme.spacing.xs} 0;
  border-bottom: 1px solid ${theme.colors.border.light};
  
  &:last-child {
    border-bottom: none;
  }
`;

const SourceInfoLabel = styled.span`
  color: ${theme.colors.text.secondary};
  font-weight: 500;
`;

const SourceInfoValue = styled.span`
  color: ${theme.colors.text.primary};
  word-break: break-all;
  text-align: right;
  max-width: 180px;
`;

const ArrowContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 80px;
  padding-top: 40px;
`;

const Arrow = styled.div`
  width: 60px;
  height: 4px;
  background: ${theme.colors.primary.main};
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    right: -8px;
    top: -6px;
    width: 0;
    height: 0;
    border-left: 12px solid ${theme.colors.primary.main};
    border-top: 8px solid transparent;
    border-bottom: 8px solid transparent;
  }
`;

const TargetPanel = styled.div`
  flex: 0 0 350px;
  background: ${theme.colors.background.main};
  border: 2px solid ${theme.colors.status.success.text};
  border-radius: ${theme.borderRadius.md};
  padding: ${theme.spacing.md};
  box-shadow: ${theme.shadows.md};
  max-height: 600px;
  overflow-y: auto;
`;

const TargetHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: ${theme.spacing.sm};
  border-bottom: 2px solid ${theme.colors.border.medium};
  margin-bottom: ${theme.spacing.md};
`;

const TargetTitle = styled.div`
  font-weight: 600;
  color: ${theme.colors.status.success.text};
  font-size: 1.1em;
`;

const TargetInfo = styled.div`
  font-size: 0.85em;
  color: ${theme.colors.text.secondary};
  margin-bottom: ${theme.spacing.sm};
`;

const ChartTitle = styled.h3`
  margin: 0 0 ${theme.spacing.md} 0;
  font-size: 1.2em;
  color: ${theme.colors.text.primary};
`;

const ColumnsTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85em;
`;

const ColumnHeader = styled.thead`
  background: ${theme.colors.background.secondary};
  position: sticky;
  top: 0;
  z-index: 10;
`;

const ColumnHeaderRow = styled.tr`
  border-bottom: 2px solid ${theme.colors.border.medium};
`;

const ColumnHeaderCell = styled.th`
  padding: ${theme.spacing.sm};
  text-align: left;
  font-weight: 600;
  color: ${theme.colors.text.primary};
  font-size: 0.9em;
  
  &:first-child {
    width: 20px;
  }
  
  &:nth-child(2) {
    width: 40%;
  }
`;

const ColumnRow = styled.tr`
  border-bottom: 1px solid ${theme.colors.border.light};
  
  &:hover {
    background: ${theme.colors.background.secondary};
  }
`;

const ColumnCell = styled.td`
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  color: ${theme.colors.text.primary};
  
  &:first-child {
    color: ${theme.colors.text.secondary};
    font-size: 0.8em;
  }
  
  &:nth-child(2) {
    font-weight: 500;
    color: ${theme.colors.primary.main};
  }
  
  &:nth-child(3) {
    color: ${theme.colors.text.secondary};
    font-family: monospace;
    font-size: 0.85em;
  }
`;

interface MappingGraphProps {
  tableStructure: any;
  loading: boolean;
  sourceTitle: string;
  sourceType: string;
  sourceInfo: Array<{ label: string; value: string }>;
}

export const MappingGraph: React.FC<MappingGraphProps> = ({ 
  tableStructure, 
  loading, 
  sourceTitle,
  sourceType,
  sourceInfo
}) => {
  return (
    <MappingGraphContainer>
      <ChartTitle>Data Flow: Source → Target</ChartTitle>
      {loading ? (
        <div style={{ textAlign: 'center', padding: theme.spacing.xxl }}>
          <LoadingOverlay>Loading table structure...</LoadingOverlay>
        </div>
      ) : !tableStructure ? (
        <div style={{ textAlign: 'center', padding: theme.spacing.xxl, color: theme.colors.text.secondary }}>
          Table structure not available. The table may not exist yet or there was an error loading it.
        </div>
      ) : (
        <GraphContent>
          <SourcePanel>
            <SourceHeader>
              <div>
                <SourceTitle>{sourceTitle}</SourceTitle>
                <SourceType>{sourceType}</SourceType>
              </div>
            </SourceHeader>
            <SourceInfo>
              {sourceInfo.map((info, index) => (
                <SourceInfoRow key={index}>
                  <SourceInfoLabel>{info.label}:</SourceInfoLabel>
                  <SourceInfoValue>{info.value}</SourceInfoValue>
                </SourceInfoRow>
              ))}
            </SourceInfo>
          </SourcePanel>
          
          <ArrowContainer>
            <Arrow />
          </ArrowContainer>
          
          <TargetPanel>
            <TargetHeader>
              <div>
                <TargetTitle>Target: {tableStructure.table}</TargetTitle>
                <TargetInfo>
                  {tableStructure.schema}.{tableStructure.table} ({tableStructure.db_engine})
                </TargetInfo>
              </div>
            </TargetHeader>
            <ColumnsTable>
              <ColumnHeader>
                <ColumnHeaderRow>
                  <ColumnHeaderCell></ColumnHeaderCell>
                  <ColumnHeaderCell>Name</ColumnHeaderCell>
                  <ColumnHeaderCell>Data Type</ColumnHeaderCell>
                </ColumnHeaderRow>
              </ColumnHeader>
              <tbody>
                {tableStructure.columns.map((col: any, index: number) => (
                  <ColumnRow key={col.name}>
                    <ColumnCell>{index + 1}</ColumnCell>
                    <ColumnCell>{col.name}</ColumnCell>
                    <ColumnCell>{col.type}</ColumnCell>
                  </ColumnRow>
                ))}
              </tbody>
            </ColumnsTable>
          </TargetPanel>
        </GraphContent>
      )}
    </MappingGraphContainer>
  );
};

