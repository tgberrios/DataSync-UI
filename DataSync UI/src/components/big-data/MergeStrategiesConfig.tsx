import React, { useState, useCallback, useEffect } from 'react';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors } from '../../ui/theme/asciiTheme';
import { theme } from '../../theme/theme';
import { bigDataApi, type MergeStrategyConfig } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import { catalogApi, type CatalogEntry } from '../../services/api';
import CheckboxSquare from './CheckboxSquare';

const MergeStrategiesConfig: React.FC = () => {
  const [formData, setFormData] = useState<MergeStrategyConfig>({
    defaultStrategy: 'UPSERT',
    useDistributed: false,
    enableHistoryTable: false,
    enableHybrid: false,
  });

  const [tables, setTables] = useState<CatalogEntry[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [configData, tablesData] = await Promise.all([
          bigDataApi.getMergeStrategyConfig(selectedTable || undefined).catch((err: any) => {
            // Silently handle 404 - endpoints may not exist yet in backend
            if (err?.response?.status === 404) return null;
            console.warn('Error getting merge strategy config:', err);
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

  const handleInputChange = useCallback((field: keyof MergeStrategyConfig, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setError(null);

    try {
      await bigDataApi.updateMergeStrategyConfig(formData, selectedTable || undefined);
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setIsSaving(false);
    }
  }, [formData, selectedTable]);

  if (loading) {
    return <div style={{ padding: theme.spacing.lg, color: asciiColors.foreground }}>Loading...</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: theme.spacing.lg }}>
        <h3 style={{
          fontSize: 14,
          fontWeight: 600,
          color: asciiColors.foreground,
          marginBottom: theme.spacing.sm
        }}>
          Merge Strategies Configuration
        </h3>
        <p style={{
          color: asciiColors.muted,
          fontSize: 12,
          marginBottom: theme.spacing.md
        }}>
          Configure merge strategies for data synchronization. Strategies can be set globally or per table.
        </p>
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
            onChange={(e) => setSelectedTable(e.target.value)}
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

        <div>
          <label style={{
            display: 'block',
            marginBottom: theme.spacing.xs,
            color: asciiColors.foreground,
            fontSize: 12,
            fontWeight: 500
          }}>
            Default Merge Strategy
          </label>
          <select
            value={formData.defaultStrategy || 'UPSERT'}
            onChange={(e) => handleInputChange('defaultStrategy', e.target.value)}
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
            <option value="UPSERT">UPSERT (Update or Insert)</option>
            <option value="SCD_TYPE_4">SCD Type 4 (History Table)</option>
            <option value="SCD_TYPE_6">SCD Type 6 (Hybrid)</option>
            <option value="INCREMENTAL">Incremental Merge</option>
          </select>
          <div style={{
            marginTop: theme.spacing.xs,
            fontSize: 11,
            color: asciiColors.muted
          }}>
            {formData.defaultStrategy === 'UPSERT' && 'Update existing records or insert new ones'}
            {formData.defaultStrategy === 'SCD_TYPE_4' && 'Maintain history in a separate history table'}
            {formData.defaultStrategy === 'SCD_TYPE_6' && 'Hybrid approach with current and history tracking'}
            {formData.defaultStrategy === 'INCREMENTAL' && 'Only process changed records based on timestamps or CDC'}
          </div>
        </div>

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
              checked={formData.useDistributed || false}
              onChange={(checked) => handleInputChange('useDistributed', checked)}
            />
            Use Distributed Processing (Spark)
          </label>
          <div style={{
            marginTop: theme.spacing.xs,
            fontSize: 11,
            color: asciiColors.muted
          }}>
            Use Spark for large volume merges to improve performance
          </div>
        </div>

        {(formData.defaultStrategy === 'SCD_TYPE_4' || formData.defaultStrategy === 'SCD_TYPE_6') && (
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
                checked={formData.enableHistoryTable || false}
                onChange={(checked) => handleInputChange('enableHistoryTable', checked)}
              />
              Enable History Table
            </label>
            <div style={{
              marginTop: theme.spacing.xs,
              fontSize: 11,
              color: asciiColors.muted
            }}>
              Create and maintain a separate history table for tracking changes
            </div>
          </div>
        )}

        {formData.defaultStrategy === 'SCD_TYPE_6' && (
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
                checked={formData.enableHybrid || false}
                onChange={(checked) => handleInputChange('enableHybrid', checked)}
              />
              Enable Hybrid Mode
            </label>
            <div style={{
              marginTop: theme.spacing.xs,
              fontSize: 11,
              color: asciiColors.muted
            }}>
              Use hybrid approach combining current and history tracking
            </div>
          </div>
        )}

        <div style={{
          padding: theme.spacing.md,
          border: `1px solid ${asciiColors.border}`,
          borderRadius: 2,
          backgroundColor: asciiColors.backgroundSoft
        }}>
          <h4 style={{
            fontSize: 12,
            fontWeight: 600,
            color: asciiColors.foreground,
            marginBottom: theme.spacing.xs
          }}>
            Strategy Details
          </h4>
          <div style={{
            fontFamily: 'Consolas, monospace',
            fontSize: 11,
            color: asciiColors.foreground
          }}>
            <div><strong>Strategy:</strong> {formData.defaultStrategy}</div>
            <div><strong>Distributed:</strong> {formData.useDistributed ? 'Yes' : 'No'}</div>
            {formData.enableHistoryTable && <div><strong>History Table:</strong> Enabled</div>}
            {formData.enableHybrid && <div><strong>Hybrid Mode:</strong> Enabled</div>}
          </div>
        </div>
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        marginTop: theme.spacing.xl,
        paddingTop: theme.spacing.md,
        borderTop: `1px solid ${asciiColors.border}`
      }}>
        <AsciiButton onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Configuration'}
        </AsciiButton>
      </div>
    </div>
  );
};

export default MergeStrategiesConfig;
