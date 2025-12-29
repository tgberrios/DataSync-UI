import React, { useState } from 'react';
import styled from 'styled-components';
import { theme } from '../../../theme/theme';
import { FormGroup, Label, Select, Input } from '../../shared/BaseComponents';

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

const TagInput = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.xs};
  margin-top: ${theme.spacing.sm};
  min-height: 40px;
  padding: ${theme.spacing.sm};
  border: 1px solid ${theme.colors.border.light};
  border-radius: ${theme.borderRadius.sm};
  background: ${theme.colors.background.secondary};
`;

const Tag = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: ${theme.colors.primary.light};
  color: ${theme.colors.primary.dark};
  border-radius: ${theme.borderRadius.sm};
  font-size: 0.85em;
`;

const TagRemove = styled.button`
  background: none;
  border: none;
  color: ${theme.colors.primary.dark};
  cursor: pointer;
  font-size: 1em;
  padding: 0;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    color: ${theme.colors.status.error.text};
  }
`;

const InfoText = styled.div`
  font-size: 0.85em;
  color: ${theme.colors.text.secondary};
  margin-top: ${theme.spacing.sm};
  padding: ${theme.spacing.sm};
  background: ${theme.colors.background.secondary};
  border-radius: ${theme.borderRadius.sm};
`;

interface TargetConfig {
  db_engine: string;
  connection_string: string;
  schema: string;
  table: string;
}

interface TargetPanelProps {
  targetConfig: TargetConfig;
  loadStrategy: string;
  primaryKeys: string[];
  onTargetConfigChange: (config: TargetConfig) => void;
  onLoadStrategyChange: (strategy: string) => void;
  onPrimaryKeysChange: (keys: string[]) => void;
}

const TargetPanel: React.FC<TargetPanelProps> = ({
  targetConfig,
  loadStrategy,
  primaryKeys,
  onTargetConfigChange,
  onLoadStrategyChange,
  onPrimaryKeysChange,
}) => {
  const [pkInput, setPkInput] = useState('');

  const handleAddPrimaryKey = () => {
    const key = pkInput.trim();
    if (key && !primaryKeys.includes(key)) {
      onPrimaryKeysChange([...primaryKeys, key]);
      setPkInput('');
    }
  };

  const handleRemovePrimaryKey = (key: string) => {
    onPrimaryKeysChange(primaryKeys.filter(k => k !== key));
  };

  return (
    <>
      <PanelSection>
        <SectionTitle>Target Database</SectionTitle>
        <FormGroup>
          <Label>Target DB Engine</Label>
          <Select
            value={targetConfig.db_engine}
            onChange={(e) => onTargetConfigChange({
              ...targetConfig,
              db_engine: e.target.value
            })}
          >
            <option value="PostgreSQL">PostgreSQL</option>
            <option value="MariaDB">MariaDB</option>
            <option value="MSSQL">MSSQL</option>
            <option value="MongoDB">MongoDB</option>
            <option value="Oracle">Oracle</option>
          </Select>
        </FormGroup>

        <FormGroup>
          <Label>Target Connection String</Label>
          <Input
            value={targetConfig.connection_string}
            onChange={(e) => onTargetConfigChange({
              ...targetConfig,
              connection_string: e.target.value
            })}
            placeholder="postgresql://user:pass@host:port/db"
          />
        </FormGroup>

        <FormGroup>
          <Label>Target Schema</Label>
          <Input
            value={targetConfig.schema}
            onChange={(e) => onTargetConfigChange({
              ...targetConfig,
              schema: e.target.value
            })}
            placeholder="public"
          />
        </FormGroup>

        <FormGroup>
          <Label>Target Table</Label>
          <Input
            value={targetConfig.table}
            onChange={(e) => onTargetConfigChange({
              ...targetConfig,
              table: e.target.value
            })}
            placeholder="table_name"
          />
        </FormGroup>
      </PanelSection>

      <PanelSection>
        <SectionTitle>Load Strategy</SectionTitle>
        <FormGroup>
          <Label>Strategy</Label>
          <Select
            value={loadStrategy}
            onChange={(e) => onLoadStrategyChange(e.target.value)}
          >
            <option value="TRUNCATE">TRUNCATE (Full Load - Data Lake)</option>
            <option value="MERGE">MERGE (Upsert - Data Warehouse)</option>
            <option value="INCREMENTAL">INCREMENTAL (Append Only)</option>
            <option value="SCD_TYPE_2">SCD Type 2 (Slowly Changing Dimension)</option>
          </Select>
        </FormGroup>

        {(loadStrategy === 'MERGE' || loadStrategy === 'SCD_TYPE_2') && (
          <FormGroup>
            <Label>Primary Keys {(loadStrategy === 'MERGE' || loadStrategy === 'SCD_TYPE_2') ? '(Required)' : ''}</Label>
            <Input
              value={pkInput}
              onChange={(e) => setPkInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddPrimaryKey();
                }
              }}
              placeholder="Enter column name and press Enter"
            />
            {primaryKeys.length > 0 && (
              <TagInput>
                {primaryKeys.map((pk, idx) => (
                  <Tag key={idx}>
                    {pk}
                    <TagRemove onClick={() => handleRemovePrimaryKey(pk)}>×</TagRemove>
                  </Tag>
                ))}
              </TagInput>
            )}
          </FormGroup>
        )}

        <InfoText>
          <strong>TRUNCATE:</strong> Deletes all data and reloads<br/>
          <strong>MERGE:</strong> Updates existing rows, inserts new ones<br/>
          <strong>INCREMENTAL:</strong> Only inserts new rows<br/>
          <strong>SCD Type 2:</strong> Maintains historical versions
        </InfoText>
      </PanelSection>
    </>
  );
};

export default TargetPanel;

