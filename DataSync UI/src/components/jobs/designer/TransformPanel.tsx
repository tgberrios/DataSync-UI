import React, { useState } from 'react';
import styled from 'styled-components';
import { theme } from '../../../theme/theme';
import { FormGroup, Label, Select, Input, Button } from '../../shared/BaseComponents';

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

const TransformList = styled.div`
  max-height: 400px;
  overflow-y: auto;
`;

const TransformItem = styled.div`
  padding: ${theme.spacing.sm};
  margin-bottom: ${theme.spacing.sm};
  background: ${theme.colors.background.secondary};
  border-radius: ${theme.borderRadius.sm};
  border: 1px solid ${theme.colors.border.light};
`;

const TransformHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.xs};
`;

const TransformType = styled.span`
  font-weight: 500;
  color: ${theme.colors.primary.main};
`;

const RemoveButton = styled.button`
  padding: 2px 8px;
  font-size: 0.8em;
  background: ${theme.colors.status.error.text};
  color: white;
  border: none;
  border-radius: ${theme.borderRadius.sm};
  cursor: pointer;

  &:hover {
    opacity: 0.8;
  }
`;

const AddButton = styled(Button)`
  width: 100%;
  margin-top: ${theme.spacing.sm};
`;

interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  default: any;
  position: number;
  selected: boolean;
}

interface TransformPanelProps {
  columns: ColumnInfo[];
  transformations: any[];
  onTransformationsChange: (transformations: any[]) => void;
}

const TransformPanel: React.FC<TransformPanelProps> = ({
  columns,
  transformations,
  onTransformationsChange,
}) => {
  const [newTransformType, setNewTransformType] = useState<string>('map');
  const [newTransformSource, setNewTransformSource] = useState<string>('');
  const [newTransformTarget, setNewTransformTarget] = useState<string>('');

  const handleAddTransform = () => {
    if (!newTransformSource || !newTransformTarget) return;

    const newTransform: any = {
      id: Date.now(),
      type: newTransformType,
      source: newTransformSource,
      target: newTransformTarget,
    };

    if (newTransformType === 'concat') {
      newTransform.separator = ' ';
      newTransform.columns = [newTransformSource];
    }

    onTransformationsChange([...transformations, newTransform]);
    setNewTransformSource('');
    setNewTransformTarget('');
  };

  const handleRemoveTransform = (id: number) => {
    onTransformationsChange(transformations.filter(t => t.id !== id));
  };

  return (
    <>
      <PanelSection>
        <SectionTitle>Column Mapping</SectionTitle>
        <FormGroup>
          <Label>Source Column</Label>
          <Select
            value={newTransformSource}
            onChange={(e) => setNewTransformSource(e.target.value)}
          >
            <option value="">Select Column</option>
            {columns.map(col => (
              <option key={col.name} value={col.name}>{col.name}</option>
            ))}
          </Select>
        </FormGroup>

        <FormGroup>
          <Label>Target Column Name</Label>
          <Input
            value={newTransformTarget}
            onChange={(e) => setNewTransformTarget(e.target.value)}
            placeholder="Enter target column name"
          />
        </FormGroup>

        <FormGroup>
          <Label>Transform Type</Label>
          <Select
            value={newTransformType}
            onChange={(e) => setNewTransformType(e.target.value)}
          >
            <option value="map">Map (Direct Copy)</option>
            <option value="concat">Concat</option>
            <option value="sum">Sum</option>
            <option value="coalesce">Coalesce</option>
          </Select>
        </FormGroup>

        <AddButton onClick={handleAddTransform}>
          + Add Transform
        </AddButton>
      </PanelSection>

      {transformations.length > 0 && (
        <PanelSection>
          <SectionTitle>Active Transformations</SectionTitle>
          <TransformList>
            {transformations.map(transform => (
              <TransformItem key={transform.id}>
                <TransformHeader>
                  <TransformType>{transform.type.toUpperCase()}</TransformType>
                  <RemoveButton onClick={() => handleRemoveTransform(transform.id)}>
                    Remove
                  </RemoveButton>
                </TransformHeader>
                <div style={{ fontSize: '0.9em', color: theme.colors.text.secondary }}>
                  {transform.source} → {transform.target}
                </div>
              </TransformItem>
            ))}
          </TransformList>
        </PanelSection>
      )}

      <PanelSection>
        <SectionTitle>Info</SectionTitle>
        <div style={{ fontSize: '0.85em', color: theme.colors.text.secondary }}>
          <p>• Map: Direct column copy</p>
          <p>• Concat: Combine multiple columns</p>
          <p>• Sum: Sum numeric columns</p>
          <p>• Coalesce: First non-null value</p>
        </div>
      </PanelSection>
    </>
  );
};

export default TransformPanel;

