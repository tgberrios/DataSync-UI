import { useState, useEffect } from 'react';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { dbtApi, type DBTModel, type DBTTest } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';

interface DBTModelEditorProps {
  model?: DBTModel | null;
  onClose: () => void;
}

const DBTModelEditor = ({ model, onClose }: DBTModelEditorProps) => {
  const [formData, setFormData] = useState<DBTModel>({
    model_name: '',
    model_type: 'sql',
    materialization: 'table',
    schema_name: '',
    database_name: '',
    sql_content: '',
    config: {},
    description: '',
    tags: [],
    depends_on: [],
    columns: [],
    tests: [],
    documentation: '',
    metadata: {},
    version: 1,
    active: true,
  });

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [tests, setTests] = useState<DBTTest[]>([]);
  const [editingTest, setEditingTest] = useState<DBTTest | null>(null);
  const [showTestForm, setShowTestForm] = useState(false);

  useEffect(() => {
    if (model) {
      setFormData({
        model_name: model.model_name || '',
        model_type: model.model_type || 'sql',
        materialization: model.materialization || 'table',
        schema_name: model.schema_name || '',
        database_name: model.database_name || '',
        sql_content: model.sql_content || '',
        config: model.config || {},
        description: model.description || '',
        tags: model.tags || [],
        depends_on: model.depends_on || [],
        columns: model.columns || [],
        tests: model.tests || [],
        documentation: model.documentation || '',
        metadata: model.metadata || {},
        version: model.version || 1,
        active: model.active !== undefined ? model.active : true,
      });
      loadTests();
    }
  }, [model]);

  const loadTests = async () => {
    if (!model?.model_name) return;
    try {
      const modelTests = await dbtApi.getTests(model.model_name);
      setTests(modelTests);
    } catch (err) {
      console.error('Error loading tests:', err);
    }
  };

  const handleChange = (field: keyof DBTModel, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleArrayChange = (field: 'tags' | 'depends_on', value: string) => {
    const array = value.split(',').map(s => s.trim()).filter(s => s);
    handleChange(field, array);
  };

  const handleSave = async () => {
    if (!formData.model_name || !formData.sql_content || !formData.schema_name) {
      setError('Model name, SQL content, and schema name are required');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await dbtApi.createOrUpdateModel(formData);
      onClose();
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTest = async (test: Omit<DBTTest, 'model_name'>) => {
    if (!model?.model_name) return;
    try {
      if (editingTest) {
        await dbtApi.updateTest(model.model_name, editingTest.test_name, test);
      } else {
        await dbtApi.createTest(model.model_name, test);
      }
      await loadTests();
      setShowTestForm(false);
      setEditingTest(null);
    } catch (err) {
      setError(extractApiError(err));
    }
  };

  const handleDeleteTest = async (testName: string) => {
    if (!model?.model_name || !confirm(`Delete test "${testName}"?`)) return;
    try {
      await dbtApi.deleteTest(model.model_name, testName);
      await loadTests();
    } catch (err) {
      setError(extractApiError(err));
    }
  };


  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <AsciiPanel style={{ width: '90%', maxWidth: '1200px', maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h2 style={{ color: asciiColors.cyan, margin: 0 }}>
              {model ? 'Edit Model' : 'New Model'}
            </h2>
            <AsciiButton 
              label="Close" 
              onClick={onClose} 
              variant="ghost"
            />
          </div>

          {error && (
            <div style={{ color: asciiColors.red, marginBottom: '15px', padding: '10px', border: `1px solid ${asciiColors.red}` }}>
              {error}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
            <div>
              <label style={{ color: asciiColors.text, display: 'block', marginBottom: '5px' }}>
                Model Name *
              </label>
              <input
                type="text"
                value={formData.model_name}
                onChange={(e) => handleChange('model_name', e.target.value)}
                disabled={!!model}
                style={{
                  width: '100%',
                  padding: '8px',
                  backgroundColor: asciiColors.bg,
                  color: asciiColors.text,
                  border: `1px solid ${asciiColors.border}`,
                  fontFamily: 'monospace',
                }}
              />
            </div>

            <div>
              <label style={{ color: asciiColors.text, display: 'block', marginBottom: '5px' }}>
                Schema Name *
              </label>
              <input
                type="text"
                value={formData.schema_name}
                onChange={(e) => handleChange('schema_name', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  backgroundColor: asciiColors.bg,
                  color: asciiColors.text,
                  border: `1px solid ${asciiColors.border}`,
                  fontFamily: 'monospace',
                }}
              />
            </div>

            <div>
              <label style={{ color: asciiColors.text, display: 'block', marginBottom: '5px' }}>
                Materialization
              </label>
              <select
                value={formData.materialization}
                onChange={(e) => handleChange('materialization', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  backgroundColor: asciiColors.bg,
                  color: asciiColors.text,
                  border: `1px solid ${asciiColors.border}`,
                  fontFamily: 'monospace',
                }}
              >
                <option value="table">Table</option>
                <option value="view">View</option>
                <option value="incremental">Incremental</option>
                <option value="ephemeral">Ephemeral</option>
              </select>
            </div>

            <div>
              <label style={{ color: asciiColors.text, display: 'block', marginBottom: '5px' }}>
                Database Name (optional)
              </label>
              <input
                type="text"
                value={formData.database_name || ''}
                onChange={(e) => handleChange('database_name', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  backgroundColor: asciiColors.bg,
                  color: asciiColors.text,
                  border: `1px solid ${asciiColors.border}`,
                  fontFamily: 'monospace',
                }}
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ color: asciiColors.text, display: 'block', marginBottom: '5px' }}>
                Description
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={2}
                style={{
                  width: '100%',
                  padding: '8px',
                  backgroundColor: asciiColors.bg,
                  color: asciiColors.text,
                  border: `1px solid ${asciiColors.border}`,
                  fontFamily: 'monospace',
                  resize: 'vertical',
                }}
              />
            </div>

            <div>
              <label style={{ color: asciiColors.text, display: 'block', marginBottom: '5px' }}>
                Tags (comma-separated)
              </label>
              <input
                type="text"
                value={formData.tags?.join(', ') || ''}
                onChange={(e) => handleArrayChange('tags', e.target.value)}
                placeholder="tag1, tag2, tag3"
                style={{
                  width: '100%',
                  padding: '8px',
                  backgroundColor: asciiColors.bg,
                  color: asciiColors.text,
                  border: `1px solid ${asciiColors.border}`,
                  fontFamily: 'monospace',
                }}
              />
            </div>

            <div>
              <label style={{ color: asciiColors.text, display: 'block', marginBottom: '5px' }}>
                Depends On (comma-separated model names)
              </label>
              <input
                type="text"
                value={formData.depends_on?.join(', ') || ''}
                onChange={(e) => handleArrayChange('depends_on', e.target.value)}
                placeholder="model1, model2"
                style={{
                  width: '100%',
                  padding: '8px',
                  backgroundColor: asciiColors.bg,
                  color: asciiColors.text,
                  border: `1px solid ${asciiColors.border}`,
                  fontFamily: 'monospace',
                }}
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ color: asciiColors.text, display: 'block', marginBottom: '5px' }}>
                SQL Content *
              </label>
              <textarea
                value={formData.sql_content}
                onChange={(e) => handleChange('sql_content', e.target.value)}
                rows={15}
                style={{
                  width: '100%',
                  padding: '8px',
                  backgroundColor: asciiColors.bg,
                  color: asciiColors.text,
                  border: `1px solid ${asciiColors.border}`,
                  fontFamily: 'monospace',
                  resize: 'vertical',
                }}
                placeholder="SELECT * FROM {{ ref('other_model') }}"
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ color: asciiColors.text, display: 'block', marginBottom: '5px' }}>
                Documentation (Markdown)
              </label>
              <textarea
                value={formData.documentation || ''}
                onChange={(e) => handleChange('documentation', e.target.value)}
                rows={5}
                style={{
                  width: '100%',
                  padding: '8px',
                  backgroundColor: asciiColors.bg,
                  color: asciiColors.text,
                  border: `1px solid ${asciiColors.border}`,
                  fontFamily: 'monospace',
                  resize: 'vertical',
                }}
              />
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <label style={{ color: asciiColors.text, display: 'flex', alignItems: 'center', gap: '5px' }}>
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => handleChange('active', e.target.checked)}
                />
                Active
              </label>
            </div>

            {model && (
              <div style={{ gridColumn: '1 / -1', marginTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h3 style={{ color: asciiColors.cyan, margin: 0 }}>Tests</h3>
                  <AsciiButton
                    label="Add Test"
                    onClick={() => {
                      setEditingTest(null);
                      setShowTestForm(true);
                    }}
                    variant="ghost"
                  />
                </div>

                {tests.length > 0 && (
                  <div style={{ marginBottom: '15px' }}>
                    {tests.map((test) => (
                      <div
                        key={test.id || test.test_name}
                        style={{
                          padding: '10px',
                          marginBottom: '10px',
                          border: `1px solid ${asciiColors.border}`,
                          backgroundColor: asciiColors.bg,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <div style={{ color: asciiColors.text, fontWeight: 'bold' }}>
                            {test.test_name}
                          </div>
                          <div style={{ color: asciiColors.muted, fontSize: '12px' }}>
                            Type: {test.test_type} | Column: {test.column_name || 'N/A'} | Severity: {test.severity || 'error'}
                          </div>
                          {test.description && (
                            <div style={{ color: asciiColors.text, fontSize: '12px', marginTop: '5px' }}>
                              {test.description}
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <AsciiButton
                            label="Edit"
                            onClick={() => {
                              setEditingTest(test);
                              setShowTestForm(true);
                            }}
                            variant="ghost"
                          />
                          <AsciiButton
                            label="Delete"
                            onClick={() => handleDeleteTest(test.test_name)}
                            variant="ghost"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {showTestForm && (
                  <TestForm
                    test={editingTest}
                    onSave={handleSaveTest}
                    onCancel={() => {
                      setShowTestForm(false);
                      setEditingTest(null);
                    }}
                    modelName={model?.model_name}
                  />
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <AsciiButton
              label={saving ? ascii.loading : "Save"}
              onClick={handleSave}
              disabled={saving}
            />
          </div>
        </div>
      </AsciiPanel>
    </div>
  );
};

interface TestFormProps {
  test: DBTTest | null;
  onSave: (test: Omit<DBTTest, 'model_name'>) => void;
  onCancel: () => void;
  modelName?: string;
}

const TestForm = ({ test, onSave, onCancel, modelName }: TestFormProps) => {
  const [formData, setFormData] = useState({
    test_name: test?.test_name || '',
    test_type: test?.test_type || 'not_null',
    column_name: test?.column_name || '',
    test_config: test?.test_config || {},
    test_sql: test?.test_sql || '',
    description: test?.description || '',
    severity: test?.severity || 'error',
    active: test?.active !== undefined ? test.active : true,
  });

  const [showTestTypesPlaybook, setShowTestTypesPlaybook] = useState(false);
  const [testingQuery, setTestingQuery] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; failure_count?: number; status?: string; error?: string } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.test_name || !formData.test_type) {
      return;
    }
    onSave(formData);
  };

  const needsColumnName = () => {
    return ['not_null', 'unique', 'relationships', 'accepted_values'].includes(formData.test_type);
  };

  const handleTestQuery = async () => {
    if (!formData.test_sql || !modelName) {
      setTestResult({
        success: false,
        message: 'Test SQL and model name are required'
      });
      return;
    }

    try {
      setTestingQuery(true);
      setTestResult(null);
      const result = await dbtApi.testQuery(modelName, {
        test_sql: formData.test_sql,
        test_type: formData.test_type,
        column_name: formData.column_name,
        test_config: formData.test_config
      });
      setTestResult(result);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Error testing query',
        error: err.message
      });
    } finally {
      setTestingQuery(false);
    }
  };

  return (
    <div
      style={{
        padding: '15px',
        border: `1px solid ${asciiColors.border}`,
        backgroundColor: asciiColors.bg,
        marginTop: '10px',
      }}
    >
      <h4 style={{ color: asciiColors.cyan, marginTop: 0, marginBottom: '15px' }}>
        {test ? 'Edit Test' : 'New Test'}
      </h4>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
          <div>
            <label style={{ color: asciiColors.text, display: 'block', marginBottom: '5px', fontSize: '12px' }}>
              Test Name *
            </label>
            <input
              type="text"
              value={formData.test_name}
              onChange={(e) => setFormData({ ...formData, test_name: e.target.value })}
              disabled={!!test}
              style={{
                width: '100%',
                padding: '6px',
                backgroundColor: asciiColors.bg,
                color: asciiColors.text,
                border: `1px solid ${asciiColors.border}`,
                fontFamily: 'monospace',
                fontSize: '12px',
              }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
              <label style={{ color: asciiColors.text, display: 'block', fontSize: '12px' }}>
                Test Type *
              </label>
              <AsciiButton
                label="Test Types Guide"
                onClick={() => setShowTestTypesPlaybook(true)}
                variant="ghost"
                style={{ fontSize: '10px', padding: '2px 6px' }}
              />
            </div>
            <select
              value={formData.test_type}
              onChange={(e) => setFormData({ ...formData, test_type: e.target.value })}
              style={{
                width: '100%',
                padding: '6px',
                backgroundColor: asciiColors.bg,
                color: asciiColors.text,
                border: `1px solid ${asciiColors.border}`,
                fontFamily: 'monospace',
                fontSize: '12px',
              }}
            >
              <option value="not_null">Not Null</option>
              <option value="unique">Unique</option>
              <option value="relationships">Relationships</option>
              <option value="accepted_values">Accepted Values</option>
              <option value="custom">Custom</option>
              <option value="expression">Expression</option>
            </select>
          </div>

          {needsColumnName() && (
            <div>
              <label style={{ color: asciiColors.text, display: 'block', marginBottom: '5px', fontSize: '12px' }}>
                Column Name {['not_null', 'unique', 'relationships', 'accepted_values'].includes(formData.test_type) ? '*' : ''}
              </label>
              <input
                type="text"
                value={formData.column_name}
                onChange={(e) => setFormData({ ...formData, column_name: e.target.value })}
                placeholder="Required for this test type"
                style={{
                  width: '100%',
                  padding: '6px',
                  backgroundColor: asciiColors.bg,
                  color: asciiColors.text,
                  border: `1px solid ${asciiColors.border}`,
                  fontFamily: 'monospace',
                  fontSize: '12px',
                }}
              />
            </div>
          )}

          <div>
            <label style={{ color: asciiColors.text, display: 'block', marginBottom: '5px', fontSize: '12px' }}>
              Severity
            </label>
            <select
              value={formData.severity}
              onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
              style={{
                width: '100%',
                padding: '6px',
                backgroundColor: asciiColors.bg,
                color: asciiColors.text,
                border: `1px solid ${asciiColors.border}`,
                fontFamily: 'monospace',
                fontSize: '12px',
              }}
            >
              <option value="error">Error</option>
              <option value="warn">Warning</option>
            </select>
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ color: asciiColors.text, display: 'block', marginBottom: '5px', fontSize: '12px' }}>
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              style={{
                width: '100%',
                padding: '6px',
                backgroundColor: asciiColors.bg,
                color: asciiColors.text,
                border: `1px solid ${asciiColors.border}`,
                fontFamily: 'monospace',
                fontSize: '12px',
                resize: 'vertical',
              }}
            />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
              <label style={{ color: asciiColors.text, display: 'block', fontSize: '12px' }}>
                Test SQL {formData.test_type === 'custom' || formData.test_type === 'expression' ? '*' : '(optional)'}
              </label>
              {formData.test_sql && modelName && (
                <AsciiButton
                  label={testingQuery ? ascii.loading : "Test Query"}
                  onClick={handleTestQuery}
                  disabled={testingQuery || !formData.test_sql}
                  variant="ghost"
                  style={{ fontSize: '10px', padding: '2px 6px' }}
                />
              )}
            </div>
            <textarea
              value={formData.test_sql}
              onChange={(e) => {
                setFormData({ ...formData, test_sql: e.target.value });
                setTestResult(null);
              }}
              rows={3}
              placeholder={formData.test_type === 'custom' || formData.test_type === 'expression' 
                ? "SELECT COUNT(*) FROM schema.table_name WHERE condition" 
                : "Auto-generated based on test type (optional override)"}
              style={{
                width: '100%',
                padding: '6px',
                backgroundColor: asciiColors.bg,
                color: asciiColors.text,
                border: `1px solid ${asciiColors.border}`,
                fontFamily: 'monospace',
                fontSize: '12px',
                resize: 'vertical',
              }}
            />
            {testResult && (
              <div style={{
                marginTop: '5px',
                padding: '8px',
                backgroundColor: testResult.success && testResult.status === 'pass' 
                  ? asciiColors.backgroundSoft 
                  : asciiColors.bg,
                border: `1px solid ${testResult.success && testResult.status === 'pass' 
                  ? asciiColors.success 
                  : testResult.error 
                    ? asciiColors.red 
                    : asciiColors.warning}`,
                color: testResult.success && testResult.status === 'pass' 
                  ? asciiColors.success 
                  : testResult.error 
                    ? asciiColors.red 
                    : asciiColors.warning,
                fontSize: '11px',
              }}>
                {testResult.message}
                {testResult.failure_count !== undefined && (
                  <div style={{ marginTop: '5px', fontSize: '10px', color: asciiColors.muted }}>
                    Failure count: {testResult.failure_count}
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '5px', justifyContent: 'flex-end' }}>
            <AsciiButton
              label="Cancel"
              onClick={onCancel}
              variant="ghost"
            />
            <AsciiButton
              label="Save"
              onClick={handleSubmit}
              disabled={!formData.test_name || !formData.test_type || (needsColumnName() && !formData.column_name)}
            />
          </div>
        </div>
      </form>

      {showTestTypesPlaybook && (
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
          zIndex: 2000
        }}
        onClick={() => setShowTestTypesPlaybook(false)}
        >
          <div style={{
            width: '90%',
            maxWidth: 900,
            maxHeight: '90vh',
            overflowY: 'auto'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <AsciiPanel title="DBT TEST TYPES GUIDE">
              <div style={{ padding: 16, fontFamily: 'Consolas', fontSize: 12, lineHeight: 1.6 }}>
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                    {ascii.blockFull} OVERVIEW
                  </div>
                  <div style={{ color: asciiColors.foreground, marginLeft: 16 }}>
                    DBT tests validate data quality by checking that your data meets specified conditions. 
                    Tests return a count of failing rows - if the count is 0, the test passes.
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                    {ascii.blockFull} TEST TYPES
                  </div>
                  
                  <div style={{ color: asciiColors.foreground, marginLeft: 16 }}>
                    <div style={{ marginBottom: 16, padding: '12px', backgroundColor: asciiColors.backgroundSoft, borderRadius: 2, border: `1px solid ${asciiColors.border}` }}>
                      <div style={{ fontWeight: 600, color: asciiColors.accent, marginBottom: 6, fontSize: 11 }}>NOT_NULL</div>
                      <div style={{ fontSize: 11, lineHeight: 1.5, marginBottom: 8 }}>
                        Validates that a column contains no NULL values.
                      </div>
                      <div style={{ fontSize: 10, color: asciiColors.muted, marginBottom: 4 }}>Required: column_name</div>
                      <div style={{ fontSize: 10, fontFamily: 'monospace', backgroundColor: asciiColors.bg, padding: '6px', borderRadius: 2 }}>
                        SELECT COUNT(*) FROM schema.table WHERE column_name IS NULL
                      </div>
                      <div style={{ fontSize: 10, color: asciiColors.muted, marginTop: 6 }}>
                        Pass: Returns 0 (no NULLs found)
                      </div>
                    </div>

                    <div style={{ marginBottom: 16, padding: '12px', backgroundColor: asciiColors.backgroundSoft, borderRadius: 2, border: `1px solid ${asciiColors.border}` }}>
                      <div style={{ fontWeight: 600, color: asciiColors.accent, marginBottom: 6, fontSize: 11 }}>UNIQUE</div>
                      <div style={{ fontSize: 11, lineHeight: 1.5, marginBottom: 8 }}>
                        Validates that all values in a column are unique (no duplicates).
                      </div>
                      <div style={{ fontSize: 10, color: asciiColors.muted, marginBottom: 4 }}>Required: column_name</div>
                      <div style={{ fontSize: 10, fontFamily: 'monospace', backgroundColor: asciiColors.bg, padding: '6px', borderRadius: 2 }}>
                        SELECT COUNT(*) FROM (SELECT column_name, COUNT(*) FROM schema.table GROUP BY column_name HAVING COUNT(*) &gt; 1)
                      </div>
                      <div style={{ fontSize: 10, color: asciiColors.muted, marginTop: 6 }}>
                        Pass: Returns 0 (no duplicates found)
                      </div>
                    </div>

                    <div style={{ marginBottom: 16, padding: '12px', backgroundColor: asciiColors.backgroundSoft, borderRadius: 2, border: `1px solid ${asciiColors.border}` }}>
                      <div style={{ fontWeight: 600, color: asciiColors.accent, marginBottom: 6, fontSize: 11 }}>RELATIONSHIPS</div>
                      <div style={{ fontSize: 11, lineHeight: 1.5, marginBottom: 8 }}>
                        Validates foreign key relationships between tables. Checks that values in a column exist in a referenced table.
                      </div>
                      <div style={{ fontSize: 10, color: asciiColors.muted, marginBottom: 4 }}>Required: column_name, test_config: {"{"}"to": "schema.ref_table", "field": "ref_column"{"}"}</div>
                      <div style={{ fontSize: 10, fontFamily: 'monospace', backgroundColor: asciiColors.bg, padding: '6px', borderRadius: 2 }}>
                        SELECT COUNT(*) FROM schema.table t1 LEFT JOIN schema.ref_table t2 ON t1.column_name = t2.ref_column WHERE t2.ref_column IS NULL
                      </div>
                      <div style={{ fontSize: 10, color: asciiColors.muted, marginTop: 6 }}>
                        Pass: Returns 0 (all values have matching references)
                      </div>
                    </div>

                    <div style={{ marginBottom: 16, padding: '12px', backgroundColor: asciiColors.backgroundSoft, borderRadius: 2, border: `1px solid ${asciiColors.border}` }}>
                      <div style={{ fontWeight: 600, color: asciiColors.accent, marginBottom: 6, fontSize: 11 }}>ACCEPTED_VALUES</div>
                      <div style={{ fontSize: 11, lineHeight: 1.5, marginBottom: 8 }}>
                        Validates that column values are within a specified list of accepted values.
                      </div>
                      <div style={{ fontSize: 10, color: asciiColors.muted, marginBottom: 4 }}>Required: column_name, test_config: {"{"}"values": ["value1", "value2", "value3"]{"}"}</div>
                      <div style={{ fontSize: 10, fontFamily: 'monospace', backgroundColor: asciiColors.bg, padding: '6px', borderRadius: 2 }}>
                        SELECT COUNT(*) FROM schema.table WHERE column_name NOT IN ('value1', 'value2', 'value3')
                      </div>
                      <div style={{ fontSize: 10, color: asciiColors.muted, marginTop: 6 }}>
                        Pass: Returns 0 (all values are in accepted list)
                      </div>
                    </div>

                    <div style={{ marginBottom: 16, padding: '12px', backgroundColor: asciiColors.backgroundSoft, borderRadius: 2, border: `1px solid ${asciiColors.border}` }}>
                      <div style={{ fontWeight: 600, color: asciiColors.accent, marginBottom: 6, fontSize: 11 }}>CUSTOM</div>
                      <div style={{ fontSize: 11, lineHeight: 1.5, marginBottom: 8 }}>
                        Execute a custom SQL query. The query should return a count of failing rows.
                      </div>
                      <div style={{ fontSize: 10, color: asciiColors.muted, marginBottom: 4 }}>Required: test_sql</div>
                      <div style={{ fontSize: 10, fontFamily: 'monospace', backgroundColor: asciiColors.bg, padding: '6px', borderRadius: 2 }}>
                        Your custom SQL query that returns COUNT(*) of failing rows
                      </div>
                      <div style={{ fontSize: 10, color: asciiColors.muted, marginTop: 6 }}>
                        Pass: Returns 0 (no failures)
                      </div>
                    </div>

                    <div style={{ marginBottom: 16, padding: '12px', backgroundColor: asciiColors.backgroundSoft, borderRadius: 2, border: `1px solid ${asciiColors.border}` }}>
                      <div style={{ fontWeight: 600, color: asciiColors.accent, marginBottom: 6, fontSize: 11 }}>EXPRESSION</div>
                      <div style={{ fontSize: 11, lineHeight: 1.5, marginBottom: 8 }}>
                        Execute a SQL expression test. Similar to custom but typically used for boolean expressions.
                      </div>
                      <div style={{ fontSize: 10, color: asciiColors.muted, marginBottom: 4 }}>Required: test_sql</div>
                      <div style={{ fontSize: 10, fontFamily: 'monospace', backgroundColor: asciiColors.bg, padding: '6px', borderRadius: 2 }}>
                        SELECT COUNT(*) FROM schema.table WHERE NOT (your_expression)
                      </div>
                      <div style={{ fontSize: 10, color: asciiColors.muted, marginTop: 6 }}>
                        Pass: Returns 0 (expression is true for all rows)
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                    {ascii.blockFull} SEVERITY
                  </div>
                  <div style={{ color: asciiColors.foreground, marginLeft: 16 }}>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.red }}>{ascii.blockFull}</span> <strong>Error:</strong> Test failure stops the build process
                    </div>
                    <div>
                      <span style={{ color: asciiColors.yellow }}>{ascii.blockFull}</span> <strong>Warning:</strong> Test failure logs a warning but allows build to continue
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
                    {ascii.blockSemi} Best Practices
                  </div>
                  <div style={{ fontSize: 11, color: asciiColors.foreground, lineHeight: 1.6 }}>
                    • Use not_null for critical columns that must always have values<br/>
                    • Use unique for primary keys and business keys<br/>
                    • Use relationships to validate referential integrity<br/>
                    • Use accepted_values for enumerated fields (status, type, etc.)<br/>
                    • Use custom/expression for complex business rules<br/>
                    • Test critical columns with error severity, less critical with warn<br/>
                    • Write descriptive test names that explain what is being validated<br/>
                    • Use the "Test Query" button to validate SQL before saving
                  </div>
                </div>

                <div style={{ marginTop: 16, textAlign: 'right' }}>
                  <AsciiButton
                    label="Close"
                    onClick={() => setShowTestTypesPlaybook(false)}
                    variant="ghost"
                  />
                </div>
              </div>
            </AsciiPanel>
          </div>
        </div>
      )}
    </div>
  );
};

export default DBTModelEditor;
