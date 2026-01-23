import { useState, useEffect } from 'react';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { dbtApi, type DBTModel } from '../../services/api';
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
    }
  }, [model]);

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

export default DBTModelEditor;
