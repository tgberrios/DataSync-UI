import { useState, useEffect } from 'react';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { dbtApi, type DBTSource } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';

interface DBTSourceEditorProps {
  source?: DBTSource | null;
  onClose: () => void;
}

const DBTSourceEditor = ({ source, onClose }: DBTSourceEditorProps) => {
  const [formData, setFormData] = useState<DBTSource>({
    source_name: '',
    source_type: 'table',
    database_name: '',
    schema_name: '',
    table_name: '',
    connection_string: '',
    description: '',
    columns: [],
    freshness_config: {},
    metadata: {},
    active: true,
  });

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (source) {
      setFormData({
        source_name: source.source_name || '',
        source_type: source.source_type || 'table',
        database_name: source.database_name || '',
        schema_name: source.schema_name || '',
        table_name: source.table_name || '',
        connection_string: source.connection_string || '',
        description: source.description || '',
        columns: source.columns || [],
        freshness_config: source.freshness_config || {},
        metadata: source.metadata || {},
        active: source.active !== undefined ? source.active : true,
      });
    }
  }, [source]);

  const handleChange = (field: keyof DBTSource, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.source_name || !formData.source_type || !formData.schema_name || !formData.table_name) {
      setError('Source name, type, schema name, and table name are required');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      if (source) {
        await dbtApi.updateSource(
          source.source_name,
          source.schema_name,
          source.table_name,
          formData
        );
      } else {
        await dbtApi.createOrUpdateSource(formData);
      }
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
      <AsciiPanel style={{ width: '90%', maxWidth: '1000px', maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h2 style={{ color: asciiColors.cyan, margin: 0 }}>
              {source ? 'Edit Source' : 'New Source'}
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
                Source Name *
              </label>
              <input
                type="text"
                value={formData.source_name}
                onChange={(e) => handleChange('source_name', e.target.value)}
                disabled={!!source}
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
                Source Type *
              </label>
              <select
                value={formData.source_type}
                onChange={(e) => handleChange('source_type', e.target.value)}
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
                <option value="query">Query</option>
                <option value="api">API</option>
              </select>
            </div>

            <div>
              <label style={{ color: asciiColors.text, display: 'block', marginBottom: '5px' }}>
                Schema Name *
              </label>
              <input
                type="text"
                value={formData.schema_name}
                onChange={(e) => handleChange('schema_name', e.target.value)}
                disabled={!!source}
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
                Table Name *
              </label>
              <input
                type="text"
                value={formData.table_name}
                onChange={(e) => handleChange('table_name', e.target.value)}
                disabled={!!source}
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
                Database Name
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

            <div>
              <label style={{ color: asciiColors.text, display: 'block', marginBottom: '5px' }}>
                Connection String
              </label>
              <input
                type="text"
                value={formData.connection_string || ''}
                onChange={(e) => handleChange('connection_string', e.target.value)}
                placeholder="postgresql://user:pass@host:port/db"
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

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ color: asciiColors.text, display: 'block', marginBottom: '5px' }}>
                Columns (JSON array)
              </label>
              <textarea
                value={JSON.stringify(formData.columns || [], null, 2)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value || '[]');
                    handleChange('columns', Array.isArray(parsed) ? parsed : []);
                  } catch {
                    handleChange('columns', []);
                  }
                }}
                rows={5}
                placeholder='[{"name": "column1", "type": "VARCHAR", "description": "..."}]'
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

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ color: asciiColors.text, display: 'block', marginBottom: '5px' }}>
                Freshness Config (JSON object)
              </label>
              <textarea
                value={JSON.stringify(formData.freshness_config || {}, null, 2)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value || '{}');
                    handleChange('freshness_config', typeof parsed === 'object' ? parsed : {});
                  } catch {
                    handleChange('freshness_config', {});
                  }
                }}
                rows={3}
                placeholder='{"warn_after": {"count": 12, "period": "hour"}, "error_after": {"count": 24, "period": "hour"}}'
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

export default DBTSourceEditor;
