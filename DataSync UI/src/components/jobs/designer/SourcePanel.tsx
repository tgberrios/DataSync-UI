import React from 'react';
import styled from 'styled-components';
import { theme } from '../../../theme/theme';
import { FormGroup, Label, Select, LoadingOverlay } from '../../shared/BaseComponents';

const PanelSection = styled.div`
  margin-bottom: ${theme.spacing.lg};
`;

const SectionTitle = styled.h3`
  font-size: 1em;
  color: ${theme.colors.text.primary};
  margin-bottom: ${theme.spacing.sm};
  padding-bottom: ${theme.spacing.xs};
  border-bottom: 1px solid ${theme.colors.border.light};
`;

const ColumnList = styled.div`
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid ${theme.colors.border.light};
  border-radius: ${theme.borderRadius.sm};
  padding: ${theme.spacing.sm};
`;

const ColumnItem = styled.div`
  display: flex;
  align-items: center;
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  margin-bottom: ${theme.spacing.xs};
  background: ${theme.colors.background.secondary};
  border-radius: ${theme.borderRadius.sm};
  cursor: pointer;
  transition: all ${theme.transitions.fast};

  &:hover {
    background: ${theme.colors.background.tertiary};
    transform: translateX(4px);
  }
`;

const Checkbox = styled.input`
  margin-right: ${theme.spacing.sm};
  cursor: pointer;
`;

const ColumnInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const ColumnName = styled.span`
  font-weight: 500;
  color: ${theme.colors.text.primary};
  font-size: 0.95em;
`;

const ColumnType = styled.span`
  font-size: 0.8em;
  color: ${theme.colors.text.secondary};
  margin-top: 2px;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: ${theme.spacing.xs};
  margin-bottom: ${theme.spacing.sm};
`;

const ActionButton = styled.button`
  padding: 4px 8px;
  font-size: 0.85em;
  background: ${theme.colors.primary.main};
  color: white;
  border: none;
  border-radius: ${theme.borderRadius.sm};
  cursor: pointer;
  transition: all ${theme.transitions.fast};

  &:hover {
    background: ${theme.colors.primary.dark};
  }
`;

interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  default: any;
  position: number;
  selected: boolean;
}

interface SourcePanelProps {
  sourceDbEngine: string;
  schemas: string[];
  tables: string[];
  columns: ColumnInfo[];
  selectedSchema: string;
  selectedTable: string;
  loadingSchemas: boolean;
  loadingTables: boolean;
  loadingColumns: boolean;
  onSchemaChange: (schema: string) => void;
  onTableChange: (table: string) => void;
  onColumnToggle: (columnName: string) => void;
  onSelectAllColumns: () => void;
  onDeselectAllColumns: () => void;
}

const SourcePanel: React.FC<SourcePanelProps> = ({
  sourceDbEngine,
  schemas,
  tables,
  columns,
  selectedSchema,
  selectedTable,
  loadingSchemas,
  loadingTables,
  loadingColumns,
  onSchemaChange,
  onTableChange,
  onColumnToggle,
  onSelectAllColumns,
  onDeselectAllColumns,
}) => {
  return (
    <>
      <PanelSection>
        <SectionTitle>Database: {sourceDbEngine}</SectionTitle>
        <FormGroup>
          <Label>Schema</Label>
          {loadingSchemas ? (
            <LoadingOverlay>Loading schemas...</LoadingOverlay>
          ) : (
            <Select
              value={selectedSchema}
              onChange={(e) => onSchemaChange(e.target.value)}
            >
              <option value="">Select Schema</option>
              {schemas.map(schema => (
                <option key={schema} value={schema}>{schema}</option>
              ))}
            </Select>
          )}
        </FormGroup>
      </PanelSection>

      {selectedSchema && (
        <PanelSection>
          <SectionTitle>Tables</SectionTitle>
          <FormGroup>
            <Label>Table</Label>
            {loadingTables ? (
              <LoadingOverlay>Loading tables...</LoadingOverlay>
            ) : (
              <Select
                value={selectedTable}
                onChange={(e) => onTableChange(e.target.value)}
              >
                <option value="">Select Table</option>
                {tables.map(table => (
                  <option key={table} value={table}>{table}</option>
                ))}
              </Select>
            )}
          </FormGroup>
        </PanelSection>
      )}

      {selectedTable && (
        <PanelSection>
          <SectionTitle>
            Columns ({columns.filter(col => col.selected).length}/{columns.length} selected)
          </SectionTitle>
          <ActionButtons>
            <ActionButton onClick={onSelectAllColumns}>
              Select All
            </ActionButton>
            <ActionButton onClick={onDeselectAllColumns}>
              Deselect All
            </ActionButton>
          </ActionButtons>
          {loadingColumns ? (
            <LoadingOverlay>Loading columns...</LoadingOverlay>
          ) : (
            <ColumnList>
              {columns.map(column => (
                <ColumnItem
                  key={column.name}
                  onClick={() => onColumnToggle(column.name)}
                >
                  <Checkbox
                    type="checkbox"
                    checked={column.selected}
                    onChange={() => onColumnToggle(column.name)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <ColumnInfo>
                    <ColumnName>{column.name}</ColumnName>
                    <ColumnType>
                      {column.type} {column.nullable ? '(nullable)' : '(not null)'}
                    </ColumnType>
                  </ColumnInfo>
                </ColumnItem>
              ))}
            </ColumnList>
          )}
        </PanelSection>
      )}
    </>
  );
};

export default SourcePanel;

