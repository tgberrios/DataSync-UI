import React, { useState, useCallback } from 'react';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { dataWarehouseApi, customJobsApi, type DataWarehouseEntry, type DimensionTable, type FactTable } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';

interface AddDataWarehouseModalProps {
  onClose: () => void;
  onSave: () => void;
  initialData?: DataWarehouseEntry | null;
}

const connectionStringExamples: Record<string, string> = {
  MariaDB: 'host=localhost;user=myuser;password=mypassword;db=mydatabase;port=3306',
  MSSQL: 'DRIVER={ODBC Driver 17 for SQL Server};SERVER=localhost,1433;DATABASE=mydatabase;UID=myuser;PWD=mypassword',
  Oracle: 'host=localhost;user=myuser;password=mypassword;db=mydatabase;port=1521',
  PostgreSQL: 'postgresql://myuser:mypassword@localhost:5432/mydatabase',
  MongoDB: 'mongodb://myuser:mypassword@localhost:27017/mydatabase',
  Snowflake: 'DRIVER={Snowflake Driver};SERVER=myaccount.snowflakecomputing.com;UID=myuser;PWD=mypassword;WAREHOUSE=mywarehouse;DATABASE=mydatabase;SCHEMA=myschema',
  BigQuery: JSON.stringify({
    project_id: 'my-project-id',
    dataset_id: 'my_dataset',
    access_token: 'ya29.xxx...'
  }, null, 2),
  Redshift: 'postgresql://myuser:mypassword@mycluster.region.redshift.amazonaws.com:5439/mydatabase',
};

const connectionStringHelp: Record<string, string> = {
  PostgreSQL: 'Format: postgresql://user:password@host:port/database\nOr: host=hostname;user=username;password=password;db=database;port=5432',
  MariaDB: 'Format: host=hostname;user=username;password=password;db=database;port=3306',
  MSSQL: 'Format: DRIVER={ODBC Driver 17 for SQL Server};SERVER=hostname,port;DATABASE=database;UID=username;PWD=password',
  Oracle: 'Format: host=hostname;user=username;password=password;db=database;port=1521',
  MongoDB: 'Format: mongodb://user:password@host:port/database',
  Snowflake: 'Format: DRIVER={Snowflake Driver};SERVER=account.snowflakecomputing.com;UID=username;PWD=password;WAREHOUSE=warehouse;DATABASE=database;SCHEMA=schema\n\nNote: Requires Snowflake ODBC driver installed on the server.',
  BigQuery: 'Format: JSON object with project_id, dataset_id, and access_token\n\nExample:\n{\n  "project_id": "my-project-id",\n  "dataset_id": "my_dataset",\n  "access_token": "ya29.xxx..."\n}\n\nTo get access_token:\n1. Use gcloud CLI: gcloud auth application-default print-access-token\n2. Or use service account JSON key file path in credentials_json field',
  Redshift: 'Format: postgresql://user:password@cluster.region.redshift.amazonaws.com:5439/database\nOr: host=cluster.region.redshift.amazonaws.com;port=5439;user=username;password=password;db=database',
};

const AddDataWarehouseModal: React.FC<AddDataWarehouseModalProps> = ({ onClose, onSave, initialData }) => {
  const defaultSourceEngine = initialData?.source_db_engine || 'PostgreSQL';
  const defaultTargetEngine = initialData?.target_db_engine || 'PostgreSQL';
  
  const [formData, setFormData] = useState({
    warehouse_name: initialData?.warehouse_name || '',
    description: initialData?.description || '',
    schema_type: (initialData?.schema_type || 'STAR_SCHEMA') as 'STAR_SCHEMA' | 'SNOWFLAKE_SCHEMA',
    source_db_engine: defaultSourceEngine,
    source_connection_string: initialData?.source_connection_string || connectionStringExamples[defaultSourceEngine] || '',
    target_db_engine: defaultTargetEngine,
    target_connection_string: initialData?.target_connection_string || connectionStringExamples[defaultTargetEngine] || '',
    target_schema: initialData?.target_schema || '',
    schedule_cron: initialData?.schedule_cron || '',
    active: initialData?.active !== undefined ? initialData.active : true,
    enabled: initialData?.enabled !== undefined ? initialData.enabled : true,
    metadata: initialData?.metadata || {},
  });

  const [dimensions, setDimensions] = useState<DimensionTable[]>(
    initialData?.dimensions || []
  );
  const [facts, setFacts] = useState<FactTable[]>(
    initialData?.facts || []
  );

  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'dimensions' | 'facts'>('basic');
  const [isTestingSourceConnection, setIsTestingSourceConnection] = useState(false);
  const [sourceConnectionTestResult, setSourceConnectionTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTestingTargetConnection, setIsTestingTargetConnection] = useState(false);
  const [targetConnectionTestResult, setTargetConnectionTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showSchemaGuide, setShowSchemaGuide] = useState(false);
  const [testingQueryIndex, setTestingQueryIndex] = useState<{ type: 'dimension' | 'fact'; index: number } | null>(null);
  const [queryTestResults, setQueryTestResults] = useState<Record<string, { success: boolean; message: string; data?: any }>>({});
  const [showConnectionHelp, setShowConnectionHelp] = useState(false);

  const handleAddDimension = useCallback(() => {
    const newDimension: DimensionTable = {
      dimension_name: '',
      target_schema: formData.target_schema || '',
      target_table: '',
      scd_type: 'TYPE_1',
      source_query: '',
      business_keys: [],
      valid_from_column: 'valid_from',
      valid_to_column: 'valid_to',
      is_current_column: 'is_current',
      index_columns: [],
      partition_column: '',
    };
    setDimensions([...dimensions, newDimension]);
  }, [dimensions, formData.target_schema]);

  const handleUpdateDimension = useCallback((index: number, field: keyof DimensionTable, value: any) => {
    setDimensions(prev => {
      const updated = [...prev];
      if (field === 'business_keys' || field === 'index_columns') {
        updated[index] = { ...updated[index], [field]: typeof value === 'string' ? value.split(',').map(s => s.trim()).filter(s => s) : value };
      } else {
        updated[index] = { ...updated[index], [field]: value };
      }
      return updated;
    });
  }, []);

  const handleRemoveDimension = useCallback((index: number) => {
    setDimensions(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleAddFact = useCallback(() => {
    const newFact: FactTable = {
      fact_name: '',
      target_schema: formData.target_schema || '',
      target_table: '',
      source_query: '',
      dimension_keys: [],
      measures: [],
      index_columns: [],
      partition_column: '',
    };
    setFacts([...facts, newFact]);
  }, [facts, formData.target_schema]);

  const handleUpdateFact = useCallback((index: number, field: keyof FactTable, value: any) => {
    setFacts(prev => {
      const updated = [...prev];
      if (field === 'dimension_keys' || field === 'measures' || field === 'index_columns') {
        updated[index] = { ...updated[index], [field]: typeof value === 'string' ? value.split(',').map(s => s.trim()).filter(s => s) : value };
      } else {
        updated[index] = { ...updated[index], [field]: value };
      }
      return updated;
    });
  }, []);

  const handleRemoveFact = useCallback((index: number) => {
    setFacts(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleSourceEngineChange = useCallback((engine: string) => {
    const example = connectionStringExamples[engine] || '';
    setFormData(prev => {
      const currentValue = prev.source_connection_string.trim();
      const previousExample = connectionStringExamples[prev.source_db_engine] || '';
      const shouldUpdate = !currentValue || currentValue === previousExample;
      return {
        ...prev,
        source_db_engine: engine,
        source_connection_string: shouldUpdate ? example : currentValue,
      };
    });
    setSourceConnectionTestResult(null);
  }, []);

  const handleTargetEngineChange = useCallback((engine: string) => {
    const example = connectionStringExamples[engine] || '';
    setFormData(prev => {
      const currentValue = prev.target_connection_string.trim();
      const previousExample = connectionStringExamples[prev.target_db_engine] || '';
      const shouldUpdate = !currentValue || currentValue === previousExample;
      return {
        ...prev,
        target_db_engine: engine,
        target_connection_string: shouldUpdate ? example : currentValue,
      };
    });
    setTargetConnectionTestResult(null);
  }, []);

  const handleTestSourceConnection = useCallback(async () => {
    if (!formData.source_db_engine) {
      setSourceConnectionTestResult({ success: false, message: 'Please select a source database engine first' });
      return;
    }

    if (!formData.source_connection_string.trim()) {
      setSourceConnectionTestResult({ success: false, message: 'Please enter a source connection string' });
      return;
    }

    setIsTestingSourceConnection(true);
    setSourceConnectionTestResult(null);

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/test-connection', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({
          db_engine: formData.source_db_engine,
          connection_string: formData.source_connection_string.trim(),
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          setSourceConnectionTestResult({ success: false, message: 'Authentication required. Please log in again.' });
          return;
        }
        if (response.status === 0 || response.status >= 500) {
          setSourceConnectionTestResult({ success: false, message: 'Server error. Please check if the server is running.' });
          return;
        }
      }

      let data;
      try {
        data = await response.json();
      } catch (parseErr) {
        setSourceConnectionTestResult({ success: false, message: 'Invalid response from server' });
        return;
      }

      if (response.ok && data.success) {
        setSourceConnectionTestResult({ success: true, message: 'Connection successful!' });
      } else {
        setSourceConnectionTestResult({ 
          success: false, 
          message: data.error || data.message || 'Connection failed' 
        });
      }
    } catch (err: any) {
      setSourceConnectionTestResult({ 
        success: false, 
        message: err.message || 'Error testing connection' 
      });
    } finally {
      setIsTestingSourceConnection(false);
    }
  }, [formData.source_db_engine, formData.source_connection_string]);

  const handleTestSourceQuery = useCallback(async (type: 'dimension' | 'fact', index: number) => {
    const item = type === 'dimension' ? dimensions[index] : facts[index];
    if (!item.source_query.trim()) {
      setQueryTestResults(prev => ({
        ...prev,
        [`${type}-${index}`]: { success: false, message: 'Please enter a source query' }
      }));
      return;
    }

    if (!formData.source_db_engine || !formData.source_connection_string.trim()) {
      setQueryTestResults(prev => ({
        ...prev,
        [`${type}-${index}`]: { success: false, message: 'Please configure source connection first' }
      }));
      return;
    }

    setTestingQueryIndex({ type, index });
    const key = `${type}-${index}`;
    setQueryTestResults(prev => ({ ...prev, [key]: { success: false, message: 'Testing...' } }));

    try {
      const result = await customJobsApi.previewQuery({
        db_engine: formData.source_db_engine,
        connection_string: formData.source_connection_string.trim(),
        query_sql: item.source_query.trim(),
        limit: 10,
      });

      if (result.success) {
        setQueryTestResults(prev => ({
          ...prev,
          [key]: {
            success: true,
            message: `Query successful! Found ${result.rowCount || 0} rows. Columns: ${(result.columns || []).join(', ')}`,
            data: result
          }
        }));
      } else {
        setQueryTestResults(prev => ({
          ...prev,
          [key]: { success: false, message: result.error || 'Query failed' }
        }));
      }
    } catch (err: any) {
      setQueryTestResults(prev => ({
        ...prev,
        [key]: { success: false, message: err.message || 'Error testing query' }
      }));
    } finally {
      setTestingQueryIndex(null);
    }
  }, [dimensions, facts, formData.source_db_engine, formData.source_connection_string]);

  const handleTestTargetConnection = useCallback(async () => {
    if (!formData.target_db_engine) {
      setTargetConnectionTestResult({ success: false, message: 'Please select a target database engine first' });
      return;
    }

    if (!formData.target_connection_string.trim()) {
      setTargetConnectionTestResult({ success: false, message: 'Please enter a target connection string' });
      return;
    }

    setIsTestingTargetConnection(true);
    setTargetConnectionTestResult(null);

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/test-connection', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({
          db_engine: formData.target_db_engine,
          connection_string: formData.target_connection_string.trim(),
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          setTargetConnectionTestResult({ success: false, message: 'Authentication required. Please log in again.' });
          return;
        }
        if (response.status === 0 || response.status >= 500) {
          setTargetConnectionTestResult({ success: false, message: 'Server error. Please check if the server is running.' });
          return;
        }
      }

      let data;
      try {
        data = await response.json();
      } catch (parseErr) {
        setTargetConnectionTestResult({ success: false, message: 'Invalid response from server' });
        return;
      }

      if (response.ok && data.success) {
        setTargetConnectionTestResult({ success: true, message: 'Connection successful!' });
      } else {
        setTargetConnectionTestResult({ 
          success: false, 
          message: data.error || data.message || 'Connection failed' 
        });
      }
    } catch (err: any) {
      setTargetConnectionTestResult({ 
        success: false, 
        message: err.message || 'Error testing connection' 
      });
    } finally {
      setIsTestingTargetConnection(false);
    }
  }, [formData.target_db_engine, formData.target_connection_string]);

  const handleSubmit = useCallback(async () => {
    setError(null);

    if (!formData.warehouse_name.trim()) {
      setError('Warehouse name is required');
      return;
    }

    if (!formData.target_schema.trim()) {
      setError('Target schema is required');
      return;
    }

    if (dimensions.length === 0 && facts.length === 0) {
      setError('At least one dimension or fact table is required');
      return;
    }

    for (const dim of dimensions) {
      if (!dim.dimension_name.trim()) {
        setError(`Dimension name is required for all dimensions`);
        return;
      }
      if (!dim.source_query.trim()) {
        setError(`Source query is required for dimension: ${dim.dimension_name}`);
        return;
      }
      if (dim.scd_type === 'TYPE_2') {
        if (!dim.valid_from_column || !dim.valid_to_column || !dim.is_current_column) {
          setError(`SCD Type 2 requires valid_from, valid_to, and is_current columns for dimension: ${dim.dimension_name}`);
          return;
        }
        if (dim.business_keys.length === 0) {
          setError(`Business keys are required for SCD Type 2 dimension: ${dim.dimension_name}`);
          return;
        }
      }
    }

    for (const fact of facts) {
      if (!fact.fact_name.trim()) {
        setError(`Fact name is required for all facts`);
        return;
      }
      if (!fact.source_query.trim()) {
        setError(`Source query is required for fact: ${fact.fact_name}`);
        return;
      }
    }

    setIsSaving(true);
    try {
      const warehouseData = {
        ...formData,
        dimensions,
        facts,
        notes: initialData?.notes || null,
      };

      if (initialData) {
        await dataWarehouseApi.updateWarehouse(initialData.warehouse_name, warehouseData);
      } else {
        await dataWarehouseApi.createWarehouse(warehouseData);
      }

      onSave();
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setIsSaving(false);
    }
  }, [formData, dimensions, facts, initialData, onSave]);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 20,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        style={{
          backgroundColor: asciiColors.background,
          border: `2px solid ${asciiColors.border}`,
          borderRadius: 4,
          width: '90%',
          maxWidth: 1200,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '18px 24px',
            borderBottom: `2px solid ${asciiColors.border}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: asciiColors.backgroundSoft,
          }}
        >
          <h2 style={{
            margin: 0,
            fontSize: 14,
            fontFamily: 'Consolas',
            color: asciiColors.foreground,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <span>{initialData ? ascii.blockFull : '+'}</span>
            <span>{initialData ? 'Edit Data Warehouse' : 'Create Data Warehouse'}</span>
          </h2>
          <AsciiButton label="×" onClick={onClose} variant="ghost" />
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <div style={{
            width: 220,
            borderRight: `1px solid ${asciiColors.border}`,
            backgroundColor: asciiColors.backgroundSoft,
            padding: '16px 0',
            display: 'flex',
            flexDirection: 'column',
            gap: 4
          }}>
            <div
              style={{
                padding: '12px 20px',
                cursor: 'pointer',
                backgroundColor: activeTab === 'basic' ? asciiColors.background : 'transparent',
                borderLeft: activeTab === 'basic' ? `4px solid ${asciiColors.accent}` : '4px solid transparent',
                fontSize: 12,
                fontFamily: 'Consolas',
                color: activeTab === 'basic' ? asciiColors.accent : asciiColors.foreground,
                fontWeight: activeTab === 'basic' ? 600 : 400,
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
              onClick={() => setActiveTab('basic')}
              onMouseEnter={(e) => {
                if (activeTab !== 'basic') {
                  e.currentTarget.style.backgroundColor = asciiColors.background;
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== 'basic') {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <span>{ascii.blockFull}</span>
              <span>Basic Info</span>
            </div>
            <div
              style={{
                padding: '12px 20px',
                cursor: 'pointer',
                backgroundColor: activeTab === 'dimensions' ? asciiColors.background : 'transparent',
                borderLeft: activeTab === 'dimensions' ? `4px solid ${asciiColors.accent}` : '4px solid transparent',
                fontSize: 12,
                fontFamily: 'Consolas',
                color: activeTab === 'dimensions' ? asciiColors.accent : asciiColors.foreground,
                fontWeight: activeTab === 'dimensions' ? 600 : 400,
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
              onClick={() => setActiveTab('dimensions')}
              onMouseEnter={(e) => {
                if (activeTab !== 'dimensions') {
                  e.currentTarget.style.backgroundColor = asciiColors.background;
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== 'dimensions') {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>{ascii.blockFull}</span>
                <span>Dimensions</span>
              </div>
              <span style={{
                fontSize: 11,
                padding: '2px 8px',
                backgroundColor: activeTab === 'dimensions' ? asciiColors.accent + '20' : asciiColors.background,
                borderRadius: 10,
                fontWeight: 500
              }}>
                {dimensions.length}
              </span>
            </div>
            <div
              style={{
                padding: '12px 20px',
                cursor: 'pointer',
                backgroundColor: activeTab === 'facts' ? asciiColors.background : 'transparent',
                borderLeft: activeTab === 'facts' ? `4px solid ${asciiColors.accent}` : '4px solid transparent',
                fontSize: 12,
                fontFamily: 'Consolas',
                color: activeTab === 'facts' ? asciiColors.accent : asciiColors.foreground,
                fontWeight: activeTab === 'facts' ? 600 : 400,
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
              onClick={() => setActiveTab('facts')}
              onMouseEnter={(e) => {
                if (activeTab !== 'facts') {
                  e.currentTarget.style.backgroundColor = asciiColors.background;
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== 'facts') {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>{ascii.blockFull}</span>
                <span>Facts</span>
              </div>
              <span style={{
                fontSize: 11,
                padding: '2px 8px',
                backgroundColor: activeTab === 'facts' ? asciiColors.accent + '20' : asciiColors.background,
                borderRadius: 10,
                fontWeight: 500
              }}>
                {facts.length}
              </span>
            </div>
          </div>

          <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
            {error && (
              <div style={{
                padding: '14px 16px',
                marginBottom: 20,
                backgroundColor: asciiColors.danger + '20',
                border: `1px solid ${asciiColors.danger}`,
                borderRadius: 2,
                color: asciiColors.danger,
                fontSize: 12,
                fontFamily: 'Consolas',
                display: 'flex',
                alignItems: 'center',
                gap: 10
              }}>
                <span style={{ fontSize: 16 }}>!</span>
                <span>{error}</span>
              </div>
            )}

            {activeTab === 'basic' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: 11,
                    fontWeight: 600,
                    color: asciiColors.foreground,
                    marginBottom: 8,
                    fontFamily: 'Consolas',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5
                  }}>
                    Warehouse Name *
                  </label>
                  <input
                    type="text"
                    value={formData.warehouse_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, warehouse_name: e.target.value }))}
                    placeholder="my_warehouse"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: `1px solid ${asciiColors.border}`,
                      borderRadius: 2,
                      fontSize: 12,
                      fontFamily: 'Consolas',
                      backgroundColor: asciiColors.background,
                      color: asciiColors.foreground,
                      outline: 'none',
                      transition: 'border-color 0.2s, box-shadow 0.2s'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = asciiColors.accent;
                      e.currentTarget.style.boxShadow = `0 0 0 2px ${asciiColors.accent}20`;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = asciiColors.border;
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: 11,
                    fontWeight: 600,
                    color: asciiColors.foreground,
                    marginBottom: 6,
                    fontFamily: 'Consolas',
                    textTransform: 'uppercase',
                  }}>
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Description of the data warehouse"
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: `1px solid ${asciiColors.border}`,
                      borderRadius: 2,
                      fontSize: 12,
                      fontFamily: 'Consolas',
                      backgroundColor: asciiColors.background,
                      color: asciiColors.foreground,
                      outline: 'none',
                      resize: 'vertical',
                    }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label style={{
                      display: 'block',
                      fontSize: 11,
                      fontWeight: 600,
                      color: asciiColors.foreground,
                      fontFamily: 'Consolas',
                      textTransform: 'uppercase',
                    }}>
                      Schema Type *
                    </label>
                    <AsciiButton
                      label={showSchemaGuide ? 'Hide Guide' : 'Show Guide'}
                      onClick={() => setShowSchemaGuide(!showSchemaGuide)}
                      variant="ghost"
                    />
                  </div>
                  {showSchemaGuide && (
                    <div style={{
                      marginBottom: 16,
                      padding: 16,
                      backgroundColor: asciiColors.backgroundSoft,
                      border: `1px solid ${asciiColors.border}`,
                      borderRadius: 2,
                      fontSize: 11,
                      fontFamily: 'Consolas',
                    }}>
                      <h3 style={{ margin: '0 0 12px 0', fontSize: 13, color: asciiColors.accent, fontFamily: 'Consolas' }}>
                        Data Warehouse Schema Guide
                      </h3>
                      
                      <div style={{ marginBottom: 16 }}>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: 13, color: asciiColors.foreground, fontFamily: 'Consolas', fontWeight: 600 }}>
                          What are Dimensions?
                        </h3>
                        <p style={{ margin: '0 0 8px 0', color: asciiColors.muted, lineHeight: 1.6 }}>
                          Dimensions are descriptive attributes that provide context for analysis. They are things you <strong>cannot measure</strong> directly, but use to group, filter, and categorize your data.
                        </p>
                        <div style={{ padding: '8px 12px', backgroundColor: asciiColors.background, borderRadius: 2, marginTop: 8 }}>
                          <strong style={{ color: asciiColors.accent }}>Examples:</strong> Customer, Product, Date, Store, Region
                        </div>
                      </div>

                      <div style={{ marginBottom: 16 }}>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: 13, color: asciiColors.foreground, fontFamily: 'Consolas', fontWeight: 600 }}>
                          What are Facts?
                        </h3>
                        <p style={{ margin: '0 0 8px 0', color: asciiColors.muted, lineHeight: 1.6 }}>
                          Facts are numeric measures and business metrics. They are things you <strong>can measure</strong> - values that can be summed, averaged, counted, etc.
                        </p>
                        <div style={{ padding: '8px 12px', backgroundColor: asciiColors.background, borderRadius: 2, marginTop: 8 }}>
                          <strong style={{ color: asciiColors.accent }}>Examples:</strong> Sales Amount, Quantity, Profit, Revenue, Cost
                        </div>
                      </div>

                      <div style={{ marginBottom: 16 }}>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: 13, color: asciiColors.foreground, fontFamily: 'Consolas', fontWeight: 600 }}>
                          Star Schema *
                        </h3>
                        <div style={{ 
                          padding: 12, 
                          backgroundColor: asciiColors.background, 
                          borderRadius: 2, 
                          fontFamily: 'Consolas',
                          fontSize: 10,
                          lineHeight: 1.8,
                          marginTop: 8
                        }}>
                          <div style={{ color: asciiColors.accent, marginBottom: 8 }}>Fact_Sales (Center)</div>
                          <div style={{ marginLeft: 20, color: asciiColors.foreground }}>
                            ├─ Dim_Customer (customer_id, name, city, country)<br/>
                            ├─ Dim_Product (product_id, name, category, brand)<br/>
                            ├─ Dim_Date (date_key, date, month, year)<br/>
                            └─ Measures: sales_amount, quantity, profit
                          </div>
                        </div>
                        <p style={{ margin: '8px 0 0 0', color: asciiColors.muted, fontSize: 10, lineHeight: 1.5 }}>
                          <strong>Characteristics:</strong> Simple, flat dimensions. Fast queries. Some data redundancy in dimensions.
                        </p>
                      </div>

                      <div>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: 13, color: asciiColors.foreground, fontFamily: 'Consolas', fontWeight: 600 }}>
                          Snowflake Schema *
                        </h3>
                        <div style={{ 
                          padding: 12, 
                          backgroundColor: asciiColors.background, 
                          borderRadius: 2, 
                          fontFamily: 'Consolas',
                          fontSize: 10,
                          lineHeight: 1.8,
                          marginTop: 8
                        }}>
                          <div style={{ color: asciiColors.accent, marginBottom: 8 }}>Fact_Sales (Center)</div>
                          <div style={{ marginLeft: 20, color: asciiColors.foreground }}>
                            ├─ Dim_Customer → Dim_City → Dim_Country<br/>
                            ├─ Dim_Product → Dim_Category → Dim_Brand<br/>
                            ├─ Dim_Date → Dim_Month → Dim_Quarter → Dim_Year<br/>
                            └─ Measures: sales_amount, quantity, profit
                          </div>
                        </div>
                        <p style={{ margin: '8px 0 0 0', color: asciiColors.muted, fontSize: 10, lineHeight: 1.5 }}>
                          <strong>Characteristics:</strong> Normalized dimensions with hierarchies. Less storage, but more complex queries. Better for large datasets.
                        </p>
                      </div>

                      <div style={{ 
                        marginTop: 16, 
                        padding: 12, 
                        backgroundColor: asciiColors.accentLight, 
                        borderRadius: 2,
                        border: `1px solid ${asciiColors.accent}`,
                      }}>
                        <strong style={{ color: asciiColors.accent, display: 'block', marginBottom: 4 }}>
                          Quick Example:
                        </strong>
                        <div style={{ color: asciiColors.foreground, fontSize: 10, lineHeight: 1.6 }}>
                          "How much did we sell (Fact) by customer (Dimension) in January (Dimension)?"<br/>
                          The <strong>Fact</strong> contains the numbers (sales amount), the <strong>Dimensions</strong> provide the context (who, when).
                        </div>
                      </div>
                    </div>
                  )}
                  <select
                    value={formData.schema_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, schema_type: e.target.value as 'STAR_SCHEMA' | 'SNOWFLAKE_SCHEMA' }))}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: `1px solid ${asciiColors.border}`,
                      borderRadius: 2,
                      fontSize: 12,
                      fontFamily: 'Consolas',
                      backgroundColor: asciiColors.background,
                      color: asciiColors.foreground,
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    <option value="STAR_SCHEMA">Star Schema *</option>
                    <option value="SNOWFLAKE_SCHEMA">Snowflake Schema *</option>
                  </select>
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: 11,
                    fontWeight: 600,
                    color: asciiColors.foreground,
                    marginBottom: 6,
                    fontFamily: 'Consolas',
                    textTransform: 'uppercase',
                  }}>
                    Source DB Engine *
                  </label>
                  <select
                    value={formData.source_db_engine}
                    onChange={(e) => handleSourceEngineChange(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: `1px solid ${asciiColors.border}`,
                      borderRadius: 2,
                      fontSize: 12,
                      fontFamily: 'Consolas',
                      backgroundColor: asciiColors.background,
                      color: asciiColors.foreground,
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    <option value="PostgreSQL">PostgreSQL</option>
                    <option value="MariaDB">MariaDB</option>
                    <option value="MSSQL">MSSQL</option>
                    <option value="Oracle">Oracle</option>
                    <option value="MongoDB">MongoDB</option>
                  </select>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label style={{
                      display: 'block',
                      fontSize: 11,
                      fontWeight: 600,
                      color: asciiColors.foreground,
                      fontFamily: 'Consolas',
                      textTransform: 'uppercase',
                    }}>
                      Source Connection String *
                    </label>
                    <AsciiButton
                      label={isTestingSourceConnection ? 'Testing...' : 'Test Connection'}
                      onClick={handleTestSourceConnection}
                      variant="ghost"
                      disabled={isTestingSourceConnection || !formData.source_db_engine || !formData.source_connection_string.trim()}
                    />
                  </div>
                  {sourceConnectionTestResult && (
                    <div style={{
                      padding: '8px 12px',
                      marginBottom: 8,
                      backgroundColor: sourceConnectionTestResult.success ? asciiColors.success + '20' : asciiColors.danger + '20',
                      border: `1px solid ${sourceConnectionTestResult.success ? asciiColors.success : asciiColors.danger}`,
                      borderRadius: 2,
                      color: sourceConnectionTestResult.success ? asciiColors.success : asciiColors.danger,
                      fontSize: 11,
                      fontFamily: 'Consolas',
                    }}>
                      {sourceConnectionTestResult.success ? '[OK] ' : '[ERR] '}
                      {sourceConnectionTestResult.message}
                    </div>
                  )}
                  <textarea
                    value={formData.source_connection_string}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, source_connection_string: e.target.value }));
                      setSourceConnectionTestResult(null);
                    }}
                    rows={2}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: `1px solid ${asciiColors.border}`,
                      borderRadius: 2,
                      fontSize: 12,
                      fontFamily: 'Consolas',
                      backgroundColor: asciiColors.background,
                      color: asciiColors.foreground,
                      outline: 'none',
                      resize: 'vertical',
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: 11,
                    fontWeight: 600,
                    color: asciiColors.foreground,
                    marginBottom: 6,
                    fontFamily: 'Consolas',
                    textTransform: 'uppercase',
                  }}>
                    Target DB Engine *
                  </label>
                  <select
                    value={formData.target_db_engine}
                    onChange={(e) => handleTargetEngineChange(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: `1px solid ${asciiColors.border}`,
                      borderRadius: 2,
                      fontSize: 12,
                      fontFamily: 'Consolas',
                      backgroundColor: asciiColors.background,
                      color: asciiColors.foreground,
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    <option value="PostgreSQL">PostgreSQL</option>
                    <option value="Snowflake">Snowflake</option>
                    <option value="BigQuery">BigQuery</option>
                    <option value="Redshift">Redshift</option>
                  </select>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <label style={{
                        display: 'block',
                        fontSize: 11,
                        fontWeight: 600,
                        color: asciiColors.foreground,
                        fontFamily: 'Consolas',
                        textTransform: 'uppercase',
                      }}>
                        Target Connection String *
                      </label>
                      <button
                        onClick={() => setShowConnectionHelp(!showConnectionHelp)}
                        style={{
                          border: `1px solid ${asciiColors.border}`,
                          backgroundColor: asciiColors.background,
                          color: asciiColors.foreground,
                          padding: '2px 6px',
                          fontSize: 10,
                          fontFamily: 'Consolas',
                          cursor: 'pointer',
                          borderRadius: 2,
                          minWidth: '24px',
                          height: '20px',
                        }}
                      >
                        ?
                      </button>
                    </div>
                    <AsciiButton
                      label={isTestingTargetConnection ? 'Testing...' : 'Test Connection'}
                      onClick={handleTestTargetConnection}
                      variant="ghost"
                      disabled={isTestingTargetConnection || !formData.target_db_engine || !formData.target_connection_string.trim()}
                    />
                  </div>
                  {showConnectionHelp && formData.target_db_engine && connectionStringHelp[formData.target_db_engine] && (
                    <div style={{
                      padding: '12px',
                      marginBottom: 8,
                      backgroundColor: asciiColors.background,
                      border: `1px solid ${asciiColors.border}`,
                      borderRadius: 2,
                      fontSize: 11,
                      fontFamily: 'Consolas',
                      color: asciiColors.foreground,
                      whiteSpace: 'pre-wrap',
                      maxHeight: '200px',
                      overflowY: 'auto',
                    }}>
                      <div style={{ fontWeight: 600, marginBottom: 8, color: asciiColors.accent }}>
                        {formData.target_db_engine} Connection Format:
                      </div>
                      {connectionStringHelp[formData.target_db_engine]}
                    </div>
                  )}
                  {targetConnectionTestResult && (
                    <div style={{
                      padding: '8px 12px',
                      marginBottom: 8,
                      backgroundColor: targetConnectionTestResult.success ? asciiColors.success + '20' : asciiColors.danger + '20',
                      border: `1px solid ${targetConnectionTestResult.success ? asciiColors.success : asciiColors.danger}`,
                      borderRadius: 2,
                      color: targetConnectionTestResult.success ? asciiColors.success : asciiColors.danger,
                      fontSize: 11,
                      fontFamily: 'Consolas',
                    }}>
                      {targetConnectionTestResult.success ? '[OK] ' : '[ERR] '}
                      {targetConnectionTestResult.message}
                    </div>
                  )}
                  <textarea
                    value={formData.target_connection_string}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, target_connection_string: e.target.value }));
                      setTargetConnectionTestResult(null);
                    }}
                    rows={2}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: `1px solid ${asciiColors.border}`,
                      borderRadius: 2,
                      fontSize: 12,
                      fontFamily: 'Consolas',
                      backgroundColor: asciiColors.background,
                      color: asciiColors.foreground,
                      outline: 'none',
                      resize: 'vertical',
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: 11,
                    fontWeight: 600,
                    color: asciiColors.foreground,
                    marginBottom: 6,
                    fontFamily: 'Consolas',
                    textTransform: 'uppercase',
                  }}>
                    Target Schema *
                  </label>
                  <input
                    type="text"
                    value={formData.target_schema}
                    onChange={(e) => {
                      const newSchema = e.target.value;
                      setFormData(prev => ({ ...prev, target_schema: newSchema }));
                      setDimensions(prev => prev.map(dim => ({ ...dim, target_schema: newSchema })));
                      setFacts(prev => prev.map(fact => ({ ...fact, target_schema: newSchema })));
                    }}
                    placeholder="warehouse_schema"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: `1px solid ${asciiColors.border}`,
                      borderRadius: 2,
                      fontSize: 12,
                      fontFamily: 'Consolas',
                      backgroundColor: asciiColors.background,
                      color: asciiColors.foreground,
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: 11,
                    fontWeight: 600,
                    color: asciiColors.foreground,
                    marginBottom: 6,
                    fontFamily: 'Consolas',
                    textTransform: 'uppercase',
                  }}>
                    Schedule (Cron)
                  </label>
                  <input
                    type="text"
                    value={formData.schedule_cron}
                    onChange={(e) => setFormData(prev => ({ ...prev, schedule_cron: e.target.value }))}
                    placeholder="Leave empty for manual execution, or enter Cron: * * * * *"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: `1px solid ${asciiColors.border}`,
                      borderRadius: 2,
                      fontSize: 12,
                      fontFamily: 'Consolas',
                      backgroundColor: asciiColors.background,
                      color: asciiColors.foreground,
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                      style={{ width: 18, height: 18, cursor: 'pointer' }}
                    />
                    <label style={{ fontSize: 12, fontFamily: 'Consolas', color: asciiColors.foreground, cursor: 'pointer' }}>
                      Active
                    </label>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={formData.enabled}
                      onChange={(e) => setFormData(prev => ({ ...prev, enabled: e.target.checked }))}
                      style={{ width: 18, height: 18, cursor: 'pointer' }}
                    />
                    <label style={{ fontSize: 12, fontFamily: 'Consolas', color: asciiColors.foreground, cursor: 'pointer' }}>
                      Enabled
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'dimensions' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: 13, fontFamily: 'Consolas', color: asciiColors.foreground }}>
                    Dimensions
                  </h3>
                  <AsciiButton label="+ Add Dimension" onClick={handleAddDimension} />
                </div>

                {dimensions.length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center', color: asciiColors.muted }}>
                    <div style={{ fontSize: 32, marginBottom: 8, fontFamily: 'Consolas' }}>{ascii.blockFull}</div>
                    <div style={{ fontSize: 12, fontFamily: 'Consolas' }}>No dimensions defined</div>
                    <div style={{ fontSize: 11, marginTop: 4 }}>Click "Add Dimension" to create one</div>
                  </div>
                ) : (
                  dimensions.map((dim, index) => (
                    <div
                      key={index}
                      style={{
                        border: `1px solid ${asciiColors.border}`,
                        borderRadius: 2,
                        padding: 16,
                        backgroundColor: asciiColors.backgroundSoft,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <h3 style={{ margin: 0, fontSize: 13, fontFamily: 'Consolas', color: asciiColors.accent }}>
                          Dimension {index + 1}
                        </h3>
                        <AsciiButton
                          label="[X] Remove"
                          onClick={() => handleRemoveDimension(index)}
                          variant="ghost"
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div>
                          <label style={{ display: 'block', fontSize: 11, color: asciiColors.muted, marginBottom: 4, fontFamily: 'Consolas' }}>
                            Dimension Name *
                          </label>
                          <input
                            type="text"
                            value={dim.dimension_name}
                            onChange={(e) => handleUpdateDimension(index, 'dimension_name', e.target.value)}
                            placeholder="dim_customer"
                            style={{
                              width: '100%',
                              padding: '6px 10px',
                              border: `1px solid ${asciiColors.border}`,
                              borderRadius: 2,
                              fontSize: 12,
                              fontFamily: 'Consolas',
                              backgroundColor: asciiColors.background,
                              color: asciiColors.foreground,
                              outline: 'none',
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: 11, color: asciiColors.muted, marginBottom: 4, fontFamily: 'Consolas' }}>
                            Target Table *
                          </label>
                          <input
                            type="text"
                            value={dim.target_table}
                            onChange={(e) => handleUpdateDimension(index, 'target_table', e.target.value)}
                            placeholder="dim_customer"
                            style={{
                              width: '100%',
                              padding: '6px 10px',
                              border: `1px solid ${asciiColors.border}`,
                              borderRadius: 2,
                              fontSize: 12,
                              fontFamily: 'Consolas',
                              backgroundColor: asciiColors.background,
                              color: asciiColors.foreground,
                              outline: 'none',
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: 11, color: asciiColors.muted, marginBottom: 4, fontFamily: 'Consolas' }}>
                            SCD Type *
                          </label>
                          <select
                            value={dim.scd_type}
                            onChange={(e) => handleUpdateDimension(index, 'scd_type', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '6px 10px',
                              border: `1px solid ${asciiColors.border}`,
                              borderRadius: 2,
                              fontSize: 12,
                              fontFamily: 'Consolas',
                              backgroundColor: asciiColors.background,
                              color: asciiColors.foreground,
                              cursor: 'pointer',
                              outline: 'none',
                            }}
                          >
                            <option value="TYPE_1">Type 1 (Overwrite)</option>
                            <option value="TYPE_2">Type 2 (Historical)</option>
                            <option value="TYPE_3">Type 3 (Previous Value)</option>
                          </select>
                        </div>

                        {dim.scd_type === 'TYPE_2' && (
                          <>
                            <div>
                              <label style={{ display: 'block', fontSize: 11, color: asciiColors.muted, marginBottom: 4, fontFamily: 'Consolas' }}>
                                Business Keys (comma-separated) *
                              </label>
                              <input
                                type="text"
                                value={dim.business_keys.join(', ')}
                                onChange={(e) => handleUpdateDimension(index, 'business_keys', e.target.value)}
                                placeholder="customer_id, order_id"
                                style={{
                                  width: '100%',
                                  padding: '6px 10px',
                                  border: `1px solid ${asciiColors.border}`,
                                  borderRadius: 2,
                                  fontSize: 12,
                                  fontFamily: 'Consolas',
                                  backgroundColor: asciiColors.background,
                                  color: asciiColors.foreground,
                                  outline: 'none',
                                }}
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: 11, color: asciiColors.muted, marginBottom: 4, fontFamily: 'Consolas' }}>
                                Valid From Column
                              </label>
                              <input
                                type="text"
                                value={dim.valid_from_column}
                                onChange={(e) => handleUpdateDimension(index, 'valid_from_column', e.target.value)}
                                placeholder="valid_from"
                                style={{
                                  width: '100%',
                                  padding: '6px 10px',
                                  border: `1px solid ${asciiColors.border}`,
                                  borderRadius: 2,
                                  fontSize: 12,
                                  fontFamily: 'Consolas',
                                  backgroundColor: asciiColors.background,
                                  color: asciiColors.foreground,
                                  outline: 'none',
                                }}
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: 11, color: asciiColors.muted, marginBottom: 4, fontFamily: 'Consolas' }}>
                                Valid To Column
                              </label>
                              <input
                                type="text"
                                value={dim.valid_to_column}
                                onChange={(e) => handleUpdateDimension(index, 'valid_to_column', e.target.value)}
                                placeholder="valid_to"
                                style={{
                                  width: '100%',
                                  padding: '6px 10px',
                                  border: `1px solid ${asciiColors.border}`,
                                  borderRadius: 2,
                                  fontSize: 12,
                                  fontFamily: 'Consolas',
                                  backgroundColor: asciiColors.background,
                                  color: asciiColors.foreground,
                                  outline: 'none',
                                }}
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: 11, color: asciiColors.muted, marginBottom: 4, fontFamily: 'Consolas' }}>
                                Is Current Column
                              </label>
                              <input
                                type="text"
                                value={dim.is_current_column}
                                onChange={(e) => handleUpdateDimension(index, 'is_current_column', e.target.value)}
                                placeholder="is_current"
                                style={{
                                  width: '100%',
                                  padding: '6px 10px',
                                  border: `1px solid ${asciiColors.border}`,
                                  borderRadius: 2,
                                  fontSize: 12,
                                  fontFamily: 'Consolas',
                                  backgroundColor: asciiColors.background,
                                  color: asciiColors.foreground,
                                  outline: 'none',
                                }}
                              />
                            </div>
                          </>
                        )}

                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <label style={{ display: 'block', fontSize: 11, color: asciiColors.muted, fontFamily: 'Consolas' }}>
                              Source Query (SQL) *
                            </label>
                            <AsciiButton
                              label={testingQueryIndex?.type === 'dimension' && testingQueryIndex?.index === index ? 'Testing...' : 'Test Query'}
                              onClick={() => handleTestSourceQuery('dimension', index)}
                              variant="ghost"
                              disabled={
                                (testingQueryIndex?.type === 'dimension' && testingQueryIndex?.index === index) ||
                                !dim.source_query.trim() ||
                                !formData.source_db_engine ||
                                !formData.source_connection_string.trim()
                              }
                            />
                          </div>
                          {queryTestResults[`dimension-${index}`] && (
                            <div style={{
                              padding: '8px 12px',
                              marginBottom: 8,
                              backgroundColor: queryTestResults[`dimension-${index}`].success ? asciiColors.success + '20' : asciiColors.danger + '20',
                              border: `1px solid ${queryTestResults[`dimension-${index}`].success ? asciiColors.success : asciiColors.danger}`,
                              borderRadius: 2,
                              color: queryTestResults[`dimension-${index}`].success ? asciiColors.success : asciiColors.danger,
                              fontSize: 11,
                              fontFamily: 'Consolas',
                            }}>
                              {queryTestResults[`dimension-${index}`].success ? '[OK] ' : '[ERR] '}
                              {queryTestResults[`dimension-${index}`].message}
                            </div>
                          )}
                          <textarea
                            value={dim.source_query}
                            onChange={(e) => {
                              handleUpdateDimension(index, 'source_query', e.target.value);
                              const key = `dimension-${index}`;
                              if (queryTestResults[key]) {
                                setQueryTestResults(prev => {
                                  const newResults = { ...prev };
                                  delete newResults[key];
                                  return newResults;
                                });
                              }
                            }}
                            placeholder="SELECT * FROM source_table WHERE ..."
                            rows={6}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              border: `1px solid ${asciiColors.border}`,
                              borderRadius: 2,
                              fontSize: 12,
                              fontFamily: 'Consolas',
                              backgroundColor: asciiColors.background,
                              color: asciiColors.foreground,
                              outline: 'none',
                              resize: 'vertical',
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: 11, color: asciiColors.muted, marginBottom: 4, fontFamily: 'Consolas' }}>
                            Index Columns (comma-separated, optional)
                          </label>
                          <input
                            type="text"
                            value={dim.index_columns.join(', ')}
                            onChange={(e) => handleUpdateDimension(index, 'index_columns', e.target.value)}
                            placeholder="customer_id, order_date"
                            style={{
                              width: '100%',
                              padding: '6px 10px',
                              border: `1px solid ${asciiColors.border}`,
                              borderRadius: 2,
                              fontSize: 12,
                              fontFamily: 'Consolas',
                              backgroundColor: asciiColors.background,
                              color: asciiColors.foreground,
                              outline: 'none',
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: 11, color: asciiColors.muted, marginBottom: 4, fontFamily: 'Consolas' }}>
                            Partition Column (optional)
                          </label>
                          <input
                            type="text"
                            value={dim.partition_column}
                            onChange={(e) => handleUpdateDimension(index, 'partition_column', e.target.value)}
                            placeholder="created_date"
                            style={{
                              width: '100%',
                              padding: '6px 10px',
                              border: `1px solid ${asciiColors.border}`,
                              borderRadius: 2,
                              fontSize: 12,
                              fontFamily: 'Consolas',
                              backgroundColor: asciiColors.background,
                              color: asciiColors.foreground,
                              outline: 'none',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'facts' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: 13, fontFamily: 'Consolas', color: asciiColors.foreground }}>
                    Fact Tables
                  </h3>
                  <AsciiButton label="+ Add Fact Table" onClick={handleAddFact} />
                </div>

                {facts.length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center', color: asciiColors.muted }}>
                    <div style={{ fontSize: 32, marginBottom: 8, fontFamily: 'Consolas' }}>{ascii.blockFull}</div>
                    <div style={{ fontSize: 12, fontFamily: 'Consolas' }}>No fact tables defined</div>
                    <div style={{ fontSize: 11, marginTop: 4 }}>Click "Add Fact Table" to create one</div>
                  </div>
                ) : (
                  facts.map((fact, index) => (
                    <div
                      key={index}
                      style={{
                        border: `1px solid ${asciiColors.border}`,
                        borderRadius: 2,
                        padding: 16,
                        backgroundColor: asciiColors.backgroundSoft,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <h3 style={{ margin: 0, fontSize: 13, fontFamily: 'Consolas', color: asciiColors.accent }}>
                          Fact Table {index + 1}
                        </h3>
                        <AsciiButton
                          label="[X] Remove"
                          onClick={() => handleRemoveFact(index)}
                          variant="ghost"
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div>
                          <label style={{ display: 'block', fontSize: 11, color: asciiColors.muted, marginBottom: 4, fontFamily: 'Consolas' }}>
                            Fact Name *
                          </label>
                          <input
                            type="text"
                            value={fact.fact_name}
                            onChange={(e) => handleUpdateFact(index, 'fact_name', e.target.value)}
                            placeholder="fact_sales"
                            style={{
                              width: '100%',
                              padding: '6px 10px',
                              border: `1px solid ${asciiColors.border}`,
                              borderRadius: 2,
                              fontSize: 12,
                              fontFamily: 'Consolas',
                              backgroundColor: asciiColors.background,
                              color: asciiColors.foreground,
                              outline: 'none',
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: 11, color: asciiColors.muted, marginBottom: 4, fontFamily: 'Consolas' }}>
                            Target Table *
                          </label>
                          <input
                            type="text"
                            value={fact.target_table}
                            onChange={(e) => handleUpdateFact(index, 'target_table', e.target.value)}
                            placeholder="fact_sales"
                            style={{
                              width: '100%',
                              padding: '6px 10px',
                              border: `1px solid ${asciiColors.border}`,
                              borderRadius: 2,
                              fontSize: 12,
                              fontFamily: 'Consolas',
                              backgroundColor: asciiColors.background,
                              color: asciiColors.foreground,
                              outline: 'none',
                            }}
                          />
                        </div>

                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <label style={{ display: 'block', fontSize: 11, color: asciiColors.muted, fontFamily: 'Consolas' }}>
                              Source Query (SQL) *
                            </label>
                            <AsciiButton
                              label={testingQueryIndex?.type === 'fact' && testingQueryIndex?.index === index ? 'Testing...' : 'Test Query'}
                              onClick={() => handleTestSourceQuery('fact', index)}
                              variant="ghost"
                              disabled={
                                (testingQueryIndex?.type === 'fact' && testingQueryIndex?.index === index) ||
                                !fact.source_query.trim() ||
                                !formData.source_db_engine ||
                                !formData.source_connection_string.trim()
                              }
                            />
                          </div>
                          {queryTestResults[`fact-${index}`] && (
                            <div style={{
                              padding: '8px 12px',
                              marginBottom: 8,
                              backgroundColor: queryTestResults[`fact-${index}`].success ? asciiColors.success + '20' : asciiColors.danger + '20',
                              border: `1px solid ${queryTestResults[`fact-${index}`].success ? asciiColors.success : asciiColors.danger}`,
                              borderRadius: 2,
                              color: queryTestResults[`fact-${index}`].success ? asciiColors.success : asciiColors.danger,
                              fontSize: 11,
                              fontFamily: 'Consolas',
                            }}>
                              {queryTestResults[`fact-${index}`].success ? '[OK] ' : '[ERR] '}
                              {queryTestResults[`fact-${index}`].message}
                            </div>
                          )}
                          <textarea
                            value={fact.source_query}
                            onChange={(e) => {
                              handleUpdateFact(index, 'source_query', e.target.value);
                              const key = `fact-${index}`;
                              if (queryTestResults[key]) {
                                setQueryTestResults(prev => {
                                  const newResults = { ...prev };
                                  delete newResults[key];
                                  return newResults;
                                });
                              }
                            }}
                            placeholder="SELECT d1.dim_key, d2.dim_key, SUM(amount) as total_amount FROM ..."
                            rows={8}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              border: `1px solid ${asciiColors.border}`,
                              borderRadius: 2,
                              fontSize: 12,
                              fontFamily: 'Consolas',
                              backgroundColor: asciiColors.background,
                              color: asciiColors.foreground,
                              outline: 'none',
                              resize: 'vertical',
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: 11, color: asciiColors.muted, marginBottom: 4, fontFamily: 'Consolas' }}>
                            Dimension Keys (comma-separated, optional)
                          </label>
                          <input
                            type="text"
                            value={fact.dimension_keys.join(', ')}
                            onChange={(e) => handleUpdateFact(index, 'dimension_keys', e.target.value)}
                            placeholder="customer_key, product_key, date_key"
                            style={{
                              width: '100%',
                              padding: '6px 10px',
                              border: `1px solid ${asciiColors.border}`,
                              borderRadius: 2,
                              fontSize: 12,
                              fontFamily: 'Consolas',
                              backgroundColor: asciiColors.background,
                              color: asciiColors.foreground,
                              outline: 'none',
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: 11, color: asciiColors.muted, marginBottom: 4, fontFamily: 'Consolas' }}>
                            Measures (comma-separated, optional)
                          </label>
                          <input
                            type="text"
                            value={fact.measures.join(', ')}
                            onChange={(e) => handleUpdateFact(index, 'measures', e.target.value)}
                            placeholder="total_amount, quantity, discount"
                            style={{
                              width: '100%',
                              padding: '6px 10px',
                              border: `1px solid ${asciiColors.border}`,
                              borderRadius: 2,
                              fontSize: 12,
                              fontFamily: 'Consolas',
                              backgroundColor: asciiColors.background,
                              color: asciiColors.foreground,
                              outline: 'none',
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: 11, color: asciiColors.muted, marginBottom: 4, fontFamily: 'Consolas' }}>
                            Index Columns (comma-separated, optional)
                          </label>
                          <input
                            type="text"
                            value={fact.index_columns.join(', ')}
                            onChange={(e) => handleUpdateFact(index, 'index_columns', e.target.value)}
                            placeholder="customer_key, date_key"
                            style={{
                              width: '100%',
                              padding: '6px 10px',
                              border: `1px solid ${asciiColors.border}`,
                              borderRadius: 2,
                              fontSize: 12,
                              fontFamily: 'Consolas',
                              backgroundColor: asciiColors.background,
                              color: asciiColors.foreground,
                              outline: 'none',
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: 11, color: asciiColors.muted, marginBottom: 4, fontFamily: 'Consolas' }}>
                            Partition Column (optional)
                          </label>
                          <input
                            type="text"
                            value={fact.partition_column}
                            onChange={(e) => handleUpdateFact(index, 'partition_column', e.target.value)}
                            placeholder="sale_date"
                            style={{
                              width: '100%',
                              padding: '6px 10px',
                              border: `1px solid ${asciiColors.border}`,
                              borderRadius: 2,
                              fontSize: 12,
                              fontFamily: 'Consolas',
                              backgroundColor: asciiColors.background,
                              color: asciiColors.foreground,
                              outline: 'none',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            padding: '18px 24px',
            borderTop: `2px solid ${asciiColors.border}`,
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 12,
            backgroundColor: asciiColors.backgroundSoft,
          }}
        >
          <AsciiButton label="Cancel" onClick={onClose} variant="ghost" />
          <AsciiButton
            label={isSaving ? 'Saving...' : initialData ? 'Update' : 'Create'}
            onClick={handleSubmit}
            disabled={isSaving}
          />
        </div>
      </div>
    </div>
  );
};

export default AddDataWarehouseModal;

