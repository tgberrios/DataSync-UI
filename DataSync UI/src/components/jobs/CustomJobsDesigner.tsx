import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { theme } from '../../theme/theme';
import { Button } from '../shared/BaseComponents';
import SourcePanel from './designer/SourcePanel';
import TransformPanel from './designer/TransformPanel';
import TargetPanel from './designer/TargetPanel';

const DesignerContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background: ${theme.colors.background.main};
`;

const DesignerHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${theme.spacing.md};
  border-bottom: 2px solid ${theme.colors.border.light};
  background: ${theme.colors.background.secondary};
`;

const DesignerTitle = styled.h2`
  margin: 0;
  font-size: 1.3em;
  color: ${theme.colors.text.primary};
`;

const DesignerContent = styled.div`
  display: flex;
  flex: 1;
  overflow: hidden;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md};
`;

const Panel = styled.div`
  flex: 1;
  border: 1px solid ${theme.colors.border.light};
  border-radius: ${theme.borderRadius.md};
  background: ${theme.colors.background.main};
  overflow-y: auto;
  display: flex;
  flex-direction: column;
`;

const PanelHeader = styled.div`
  padding: ${theme.spacing.md};
  border-bottom: 1px solid ${theme.colors.border.light};
  background: ${theme.colors.background.secondary};
  font-weight: bold;
  color: ${theme.colors.text.primary};
`;

const PanelBody = styled.div`
  flex: 1;
  padding: ${theme.spacing.md};
  overflow-y: auto;
`;

const DesignerFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${theme.spacing.md};
  border-top: 2px solid ${theme.colors.border.light};
  background: ${theme.colors.background.secondary};
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
`;

interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  default: any;
  position: number;
  selected: boolean;
  transform?: {
    type: 'map' | 'concat' | 'sum' | 'coalesce';
    target_name?: string;
    expression?: string;
    columns?: string[];
    separator?: string;
  };
}

interface DesignerData {
  query_sql: string;
  transform_config: {
    column_mapping: Record<string, string>;
    filters: Array<{column: string; op: string; value: any}>;
    column_transforms: Array<any>;
    validations: Array<any>;
  };
  metadata: {
    load_strategy: string;
    primary_keys: string[];
    scd_columns?: {
      valid_from: string;
      valid_to: string;
      is_current: string;
    };
  };
  target: {
    db_engine: string;
    connection_string: string;
    schema: string;
    table: string;
  };
}

interface CustomJobsDesignerProps {
  sourceDbEngine: string;
  sourceConnectionString: string;
  onDesignComplete: (data: DesignerData) => void;
  onBack: () => void;
}

const CustomJobsDesigner: React.FC<CustomJobsDesignerProps> = ({
  sourceDbEngine,
  sourceConnectionString,
  onDesignComplete,
  onBack,
}) => {
  const [schemas, setSchemas] = useState<string[]>([]);
  const [tables, setTables] = useState<string[]>([]);
  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [selectedSchema, setSelectedSchema] = useState<string>('');
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [loadingSchemas, setLoadingSchemas] = useState(false);
  const [loadingTables, setLoadingTables] = useState(false);
  const [loadingColumns, setLoadingColumns] = useState(false);
  const [transformations, setTransformations] = useState<any[]>([]);
  const [targetConfig, setTargetConfig] = useState({
    db_engine: 'PostgreSQL',
    connection_string: '',
    schema: '',
    table: '',
  });
  const [loadStrategy, setLoadStrategy] = useState('TRUNCATE');
  const [primaryKeys, setPrimaryKeys] = useState<string[]>([]);

  useEffect(() => {
    loadSchemas();
  }, []);

  const loadSchemas = useCallback(async () => {
    setLoadingSchemas(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/discover-schemas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({
          db_engine: sourceDbEngine,
          connection_string: sourceConnectionString,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.schemas) {
          setSchemas(data.schemas);
        }
      }
    } catch (err) {
      console.error('Error loading schemas:', err);
    } finally {
      setLoadingSchemas(false);
    }
  }, [sourceDbEngine, sourceConnectionString]);

  const loadTables = useCallback(async (schema: string) => {
    setLoadingTables(true);
    setTables([]);
    setColumns([]);
    setSelectedTable('');
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/discover-tables', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({
          db_engine: sourceDbEngine,
          connection_string: sourceConnectionString,
          schema_name: schema,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.tables) {
          setTables(data.tables);
        }
      }
    } catch (err) {
      console.error('Error loading tables:', err);
    } finally {
      setLoadingTables(false);
    }
  }, [sourceDbEngine, sourceConnectionString]);

  const loadColumns = useCallback(async (schema: string, table: string) => {
    setLoadingColumns(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/discover-columns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({
          db_engine: sourceDbEngine,
          connection_string: sourceConnectionString,
          schema_name: schema,
          table_name: table,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.columns) {
          const columnsWithSelection = data.columns.map((col: any) => ({
            ...col,
            selected: true,
          }));
          setColumns(columnsWithSelection);
        }
      }
    } catch (err) {
      console.error('Error loading columns:', err);
    } finally {
      setLoadingColumns(false);
    }
  }, [sourceDbEngine, sourceConnectionString]);

  const handleSchemaChange = useCallback((schema: string) => {
    setSelectedSchema(schema);
    if (schema) {
      loadTables(schema);
    }
  }, [loadTables]);

  const handleTableChange = useCallback((table: string) => {
    setSelectedTable(table);
    if (table && selectedSchema) {
      loadColumns(selectedSchema, table);
    }
  }, [selectedSchema, loadColumns]);

  const handleColumnToggle = useCallback((columnName: string) => {
    setColumns(prev => prev.map(col => 
      col.name === columnName ? { ...col, selected: !col.selected } : col
    ));
  }, []);

  const handleSelectAllColumns = useCallback(() => {
    setColumns(prev => prev.map(col => ({ ...col, selected: true })));
  }, []);

  const handleDeselectAllColumns = useCallback(() => {
    setColumns(prev => prev.map(col => ({ ...col, selected: false })));
  }, []);

  const generateQuerySQL = useCallback(() => {
    if (!selectedSchema || !selectedTable) return '';
    
    const selectedCols = columns.filter(col => col.selected);
    if (selectedCols.length === 0) return '';

    const columnList = selectedCols.map(col => {
      const schemaPrefix = sourceDbEngine === 'MSSQL' ? `[${selectedSchema}].[${selectedTable}]` : 
                          sourceDbEngine === 'Oracle' ? `"${selectedSchema.toUpperCase()}"."${selectedTable.toUpperCase()}"` :
                          `${selectedSchema}.${selectedTable}`;
      const colName = sourceDbEngine === 'MSSQL' ? `[${col.name}]` :
                     sourceDbEngine === 'Oracle' ? `"${col.name.toUpperCase()}"` :
                     sourceDbEngine === 'PostgreSQL' ? `"${col.name}"` :
                     `\`${col.name}\``;
      return `${schemaPrefix}.${colName}`;
    }).join(', ');

    const fromClause = sourceDbEngine === 'MSSQL' ? `[${selectedSchema}].[${selectedTable}]` :
                       sourceDbEngine === 'Oracle' ? `"${selectedSchema.toUpperCase()}"."${selectedTable.toUpperCase()}"` :
                       `${selectedSchema}.${selectedTable}`;

    return `SELECT ${columnList}\nFROM ${fromClause}`;
  }, [selectedSchema, selectedTable, columns, sourceDbEngine]);

  const generateTransformConfig = useCallback(() => {
    const selectedCols = columns.filter(col => col.selected);
    const column_mapping: Record<string, string> = {};
    
    selectedCols.forEach(col => {
      if (col.transform && col.transform.target_name) {
        column_mapping[col.transform.target_name] = col.name;
      } else {
        column_mapping[col.name] = col.name;
      }
    });

    return {
      column_mapping,
      filters: [],
      column_transforms: transformations.filter(t => t.type !== 'filter'),
      validations: [],
    };
  }, [columns, transformations]);

  const handleComplete = useCallback(() => {
    const query_sql = generateQuerySQL();
    const transform_config = generateTransformConfig();
    
    const metadata: any = {
      load_strategy: loadStrategy,
      primary_keys: primaryKeys,
    };

    if (loadStrategy === 'SCD_TYPE_2') {
      metadata.scd_columns = {
        valid_from: 'valid_from',
        valid_to: 'valid_to',
        is_current: 'is_current',
      };
    }

    onDesignComplete({
      query_sql,
      transform_config,
      metadata,
      target: targetConfig,
    });
  }, [generateQuerySQL, generateTransformConfig, loadStrategy, primaryKeys, targetConfig, onDesignComplete]);

  const canComplete = selectedSchema && selectedTable && 
                     columns.some(col => col.selected) &&
                     targetConfig.schema && targetConfig.table &&
                     targetConfig.connection_string;

  return (
    <DesignerContainer>
      <DesignerHeader>
        <DesignerTitle>📊 Custom Job Designer</DesignerTitle>
        <Button onClick={onBack} $variant="secondary">
          ← Back to Form
        </Button>
      </DesignerHeader>

      <DesignerContent>
        <Panel>
          <PanelHeader>📥 Source</PanelHeader>
          <PanelBody>
            <SourcePanel
              sourceDbEngine={sourceDbEngine}
              schemas={schemas}
              tables={tables}
              columns={columns}
              selectedSchema={selectedSchema}
              selectedTable={selectedTable}
              loadingSchemas={loadingSchemas}
              loadingTables={loadingTables}
              loadingColumns={loadingColumns}
              onSchemaChange={handleSchemaChange}
              onTableChange={handleTableChange}
              onColumnToggle={handleColumnToggle}
              onSelectAllColumns={handleSelectAllColumns}
              onDeselectAllColumns={handleDeselectAllColumns}
            />
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader>🔄 Transformations</PanelHeader>
          <PanelBody>
            <TransformPanel
              columns={columns.filter(col => col.selected)}
              transformations={transformations}
              onTransformationsChange={setTransformations}
            />
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader>📤 Target</PanelHeader>
          <PanelBody>
            <TargetPanel
              targetConfig={targetConfig}
              loadStrategy={loadStrategy}
              primaryKeys={primaryKeys}
              onTargetConfigChange={setTargetConfig}
              onLoadStrategyChange={setLoadStrategy}
              onPrimaryKeysChange={setPrimaryKeys}
            />
          </PanelBody>
        </Panel>
      </DesignerContent>

      <DesignerFooter>
        <div style={{ color: theme.colors.text.secondary, fontSize: '0.9em' }}>
          {selectedSchema && selectedTable && (
            <span>
              Source: {selectedSchema}.{selectedTable} | 
              Selected: {columns.filter(col => col.selected).length} columns
            </span>
          )}
        </div>
        <ButtonGroup>
          <Button onClick={onBack} $variant="secondary">
            Cancel
          </Button>
          <Button onClick={handleComplete} disabled={!canComplete}>
            Complete Design
          </Button>
        </ButtonGroup>
      </DesignerFooter>
    </DesignerContainer>
  );
};

export default CustomJobsDesigner;

