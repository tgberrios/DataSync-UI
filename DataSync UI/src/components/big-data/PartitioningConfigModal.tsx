import React, { useState, useCallback, useEffect } from 'react';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors } from '../../ui/theme/asciiTheme';
import { theme } from '../../theme/theme';
import { bigDataApi, type PartitioningConfig } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import { catalogApi, type CatalogEntry } from '../../services/api';
import CheckboxSquare from './CheckboxSquare';

interface PartitioningConfigModalProps {
  onClose: () => void;
  onSave: () => void;
  tableId?: string;
}

const PartitioningConfigModal: React.FC<PartitioningConfigModalProps> = ({ onClose, onSave, tableId }) => {
  const [formData, setFormData] = useState<PartitioningConfig>({
    enabled: true,
    autoDetect: true,
    partitionTypes: ['DATE', 'REGION'],
    dateColumnPattern: '',
    regionColumnPattern: '',
  });

  const [tables, setTables] = useState<CatalogEntry[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>(tableId || '');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [configData, tablesData] = await Promise.all([
          bigDataApi.getPartitioningConfig(selectedTable || undefined).catch((err: any) => {
            // Silently handle 404 - endpoints may not exist yet in backend
            if (err?.response?.status === 404) return null;
            console.warn('Error getting partitioning config:', err);
            return null;
          }),
          catalogApi.getCatalog({ limit: 10000 }).catch(() => ({ tables: [] })),
        ]);

        if (configData) {
          setFormData(configData.config || configData);
        }

        if (tablesData?.tables) {
          setTables(tablesData.tables);
        }
      } catch (err) {
        setError(extractApiError(err));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedTable]);

  const handleInputChange = useCallback((field: keyof PartitioningConfig, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  }, []);

  const handlePartitionTypeToggle = useCallback((type: 'DATE' | 'REGION' | 'RANGE' | 'HASH' | 'LIST') => {
    setFormData(prev => {
      const currentTypes = prev.partitionTypes || [];
      const newTypes = currentTypes.includes(type)
        ? currentTypes.filter(t => t !== type)
        : [...currentTypes, type];
      return { ...prev, partitionTypes: newTypes };
    });
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setError(null);

    try {
      await bigDataApi.updatePartitioningConfig(formData, selectedTable || undefined);
      onSave();
      onClose();
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setIsSaving(false);
    }
  }, [formData, selectedTable, onSave, onClose]);

  if (loading) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div style={{
          padding: theme.spacing.xl,
          backgroundColor: asciiColors.background,
          border: `2px solid ${asciiColors.border}`,
          borderRadius: 2,
          color: asciiColors.foreground
        }}>
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: theme.spacing.lg
    }}>
      <div style={{
        backgroundColor: asciiColors.background,
        border: `2px solid ${asciiColors.border}`,
        borderRadius: 2,
        padding: theme.spacing.xl,
        maxWidth: '700px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: theme.shadows.lg
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: theme.spacing.lg,
          borderBottom: `1px solid ${asciiColors.border}`,
          paddingBottom: theme.spacing.md
        }}>
          <h2 style={{
            fontSize: 18,
            fontWeight: 600,
            color: asciiColors.foreground,
            margin: 0
          }}>
            Partitioning Configuration
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: asciiColors.foreground,
              cursor: 'pointer',
              fontSize: 20,
              padding: theme.spacing.xs,
              lineHeight: 1
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {error && (
          <div style={{
            padding: theme.spacing.md,
            border: `1px solid ${asciiColors.border}`,
            borderRadius: 2,
            backgroundColor: asciiColors.backgroundSoft,
            color: asciiColors.foreground,
            marginBottom: theme.spacing.md
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
          {!tableId && (
            <div>
              <label style={{
                display: 'block',
                marginBottom: theme.spacing.xs,
                color: asciiColors.foreground,
                fontSize: 12,
                fontWeight: 500
              }}>
                Table (Optional - leave empty for global config)
              </label>
              <select
                value={selectedTable}
                onChange={(e) => {
                  setSelectedTable(e.target.value);
                }}
                style={{
                  width: '100%',
                  padding: theme.spacing.sm,
                  border: `1px solid ${asciiColors.border}`,
                  borderRadius: 2,
                  backgroundColor: asciiColors.background,
                  color: asciiColors.foreground,
                  fontFamily: 'Consolas, monospace',
                  fontSize: 12
                }}
              >
                <option value="">Global Configuration</option>
                {tables.map(table => (
                  <option key={`${table.schema_name}.${table.table_name}`} value={`${table.schema_name}.${table.table_name}`}>
                    {table.schema_name}.{table.table_name} ({table.db_engine})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.sm,
              color: asciiColors.foreground,
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer'
            }}>
              <CheckboxSquare
                checked={formData.enabled}
                onChange={(checked) => handleInputChange('enabled', checked)}
              />
              Enable Partitioning
            </label>
          </div>

          {formData.enabled && (
            <>
              <div>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing.sm,
                  color: asciiColors.foreground,
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={formData.autoDetect}
                    onChange={(e) => handleInputChange('autoDetect', e.target.checked)}
                    style={{
                      width: '18px',
                      height: '18px',
                      cursor: 'pointer',
                      borderRadius: 2,
                      border: `1px solid ${asciiColors.border}`,
                      appearance: 'none',
                      WebkitAppearance: 'none',
                      MozAppearance: 'none'
                    }}
                  />
                  Auto-detect Partition Columns
                </label>
                <div style={{
                  marginTop: theme.spacing.xs,
                  fontSize: 11,
                  color: asciiColors.muted
                }}>
                  Automatically detect partition columns based on naming patterns and data types
                </div>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: theme.spacing.xs,
                  color: asciiColors.foreground,
                  fontSize: 12,
                  fontWeight: 500
                }}>
                  Partition Types
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing.sm }}>
                  {(['DATE', 'REGION', 'RANGE', 'HASH', 'LIST'] as const).map(type => (
                    <label
                      key={type}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: theme.spacing.xs,
                        padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                        border: `1px solid ${asciiColors.border}`,
                        borderRadius: 2,
                        backgroundColor: formData.partitionTypes?.includes(type) ? asciiColors.backgroundSoft : 'transparent',
                        cursor: 'pointer',
                        fontSize: 11
                      }}
                    >
                      <CheckboxSquare
                        checked={formData.partitionTypes?.includes(type) || false}
                        onChange={() => handlePartitionTypeToggle(type)}
                        size={16}
                      />
                      {type}
                    </label>
                  ))}
                </div>
              </div>

              {formData.partitionTypes?.includes('DATE') && (
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: theme.spacing.xs,
                    color: asciiColors.foreground,
                    fontSize: 12,
                    fontWeight: 500
                  }}>
                    Date Column Pattern (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.dateColumnPattern || ''}
                    onChange={(e) => handleInputChange('dateColumnPattern', e.target.value)}
                    placeholder=".*_date|.*_timestamp|created_at"
                    style={{
                      width: '100%',
                      padding: theme.spacing.sm,
                      border: `1px solid ${asciiColors.border}`,
                      borderRadius: 2,
                      backgroundColor: asciiColors.background,
                      color: asciiColors.foreground,
                      fontFamily: 'Consolas, monospace',
                      fontSize: 12
                    }}
                  />
                  <div style={{
                    marginTop: theme.spacing.xs,
                    fontSize: 11,
                    color: asciiColors.muted
                  }}>
                    Regex pattern to identify date columns (e.g., .*_date|.*_timestamp)
                  </div>
                </div>
              )}

              {formData.partitionTypes?.includes('REGION') && (
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: theme.spacing.xs,
                    color: asciiColors.foreground,
                    fontSize: 12,
                    fontWeight: 500
                  }}>
                    Region Column Pattern (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.regionColumnPattern || ''}
                    onChange={(e) => handleInputChange('regionColumnPattern', e.target.value)}
                    placeholder=".*_region|.*_country|.*_location"
                    style={{
                      width: '100%',
                      padding: theme.spacing.sm,
                      border: `1px solid ${asciiColors.border}`,
                      borderRadius: 2,
                      backgroundColor: asciiColors.background,
                      color: asciiColors.foreground,
                      fontFamily: 'Consolas, monospace',
                      fontSize: 12
                    }}
                  />
                  <div style={{
                    marginTop: theme.spacing.xs,
                    fontSize: 11,
                    color: asciiColors.muted
                  }}>
                    Regex pattern to identify region columns (e.g., .*_region|.*_country)
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: theme.spacing.md,
          marginTop: theme.spacing.xl,
          paddingTop: theme.spacing.md,
          borderTop: `1px solid ${asciiColors.border}`
        }}>
          <AsciiButton onClick={onClose} disabled={isSaving}>
            Cancel
          </AsciiButton>
          <AsciiButton onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save'}
          </AsciiButton>
        </div>
      </div>
    </div>
  );
};

export default PartitioningConfigModal;
