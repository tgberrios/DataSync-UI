import { useState, useEffect } from 'react';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { dbtApi, type DBTMacro } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';

interface DBTMacroEditorProps {
  macro?: DBTMacro | null;
  onClose: () => void;
}

const DBTMacroEditor = ({ macro, onClose }: DBTMacroEditorProps) => {
  const [formData, setFormData] = useState<DBTMacro>({
    macro_name: '',
    macro_sql: '',
    parameters: [],
    description: '',
    return_type: '',
    examples: '',
    tags: [],
    active: true,
  });

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (macro) {
      setFormData({
        macro_name: macro.macro_name || '',
        macro_sql: macro.macro_sql || '',
        parameters: macro.parameters || [],
        description: macro.description || '',
        return_type: macro.return_type || '',
        examples: macro.examples || '',
        tags: macro.tags || [],
        active: macro.active !== undefined ? macro.active : true,
      });
    }
  }, [macro]);

  const handleChange = (field: keyof DBTMacro, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleArrayChange = (field: 'tags' | 'parameters', value: string) => {
    if (field === 'tags') {
      const array = value.split(',').map(s => s.trim()).filter(s => s);
      handleChange(field, array);
    } else {
      try {
        const parsed = JSON.parse(value || '[]');
        handleChange(field, Array.isArray(parsed) ? parsed : []);
      } catch {
        handleChange(field, []);
      }
    }
  };

  const handleSave = async () => {
    if (!formData.macro_name || !formData.macro_sql) {
      setError('Macro name and SQL are required');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      if (macro) {
        await dbtApi.updateMacro(macro.macro_name, formData);
      } else {
        await dbtApi.createOrUpdateMacro(formData);
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
              {macro ? 'Edit Macro' : 'New Macro'}
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
                Macro Name *
              </label>
              <input
                type="text"
                value={formData.macro_name}
                onChange={(e) => handleChange('macro_name', e.target.value)}
                disabled={!!macro}
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
                Return Type
              </label>
              <input
                type="text"
                value={formData.return_type || ''}
                onChange={(e) => handleChange('return_type', e.target.value)}
                placeholder="VARCHAR, INTEGER, etc."
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
                Parameters (JSON array)
              </label>
              <textarea
                value={JSON.stringify(formData.parameters || [], null, 2)}
                onChange={(e) => handleArrayChange('parameters', e.target.value)}
                rows={3}
                placeholder='[{"name": "param1", "type": "string"}]'
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
                Macro SQL *
              </label>
              <textarea
                value={formData.macro_sql}
                onChange={(e) => handleChange('macro_sql', e.target.value)}
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
                placeholder="{% macro macro_name(param1, param2) %}\n  SELECT ...\n{% endmacro %}"
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ color: asciiColors.text, display: 'block', marginBottom: '5px' }}>
                Examples
              </label>
              <textarea
                value={formData.examples || ''}
                onChange={(e) => handleChange('examples', e.target.value)}
                rows={3}
                style={{
                  width: '100%',
                  padding: '8px',
                  backgroundColor: asciiColors.bg,
                  color: asciiColors.text,
                  border: `1px solid ${asciiColors.border}`,
                  fontFamily: 'monospace',
                  resize: 'vertical',
                }}
                placeholder="Usage examples..."
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

export default DBTMacroEditor;
