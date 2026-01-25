import React, { useState, useCallback } from 'react';
import { catalogCleanerApi } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import { theme } from '../../theme/theme';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';

interface CatalogCleanerProps {
  onCleanupComplete?: () => void;
}

const CatalogCleaner: React.FC<CatalogCleanerProps> = ({ onCleanupComplete }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<any>(null);

  const fetchPreview = useCallback(async () => {
    try {
      setError(null);
      const data = await catalogCleanerApi.getPreview();
      setPreview(data.preview);
    } catch (err) {
      setError(extractApiError(err));
    }
  }, []);

  const handleCleanup = useCallback(async (operation: string) => {
    if (!confirm(`Are you sure you want to execute ${operation}?`)) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      let result;
      switch (operation) {
        case 'non-existent-tables':
          result = await catalogCleanerApi.cleanNonExistentTables();
          break;
        case 'orphaned-tables':
          result = await catalogCleanerApi.cleanOrphanedTables();
          break;
        case 'old-logs':
          result = await catalogCleanerApi.cleanOldLogs();
          break;
        case 'orphaned-governance':
          result = await catalogCleanerApi.cleanOrphanedGovernance();
          break;
        case 'orphaned-quality':
          result = await catalogCleanerApi.cleanOrphanedQuality();
          break;
        case 'orphaned-maintenance':
          result = await catalogCleanerApi.cleanOrphanedMaintenance();
          break;
        case 'orphaned-lineage':
          result = await catalogCleanerApi.cleanOrphanedLineage();
          break;
        case 'all':
          result = await catalogCleanerApi.cleanAll();
          break;
        default:
          return;
      }

      alert(`Cleanup operation "${operation}" initiated successfully.`);
      if (onCleanupComplete) {
        onCleanupComplete();
      }
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setLoading(false);
    }
  }, [onCleanupComplete]);

  return (
    <AsciiPanel title="CATALOG CLEANER">
      <div style={{ marginBottom: theme.spacing.md }}>
        <AsciiButton
          label="Preview Cleanup"
          onClick={fetchPreview}
          variant="ghost"
        />
      </div>

      {error && (
        <div style={{ 
          padding: theme.spacing.sm, 
          background: asciiColors.foreground + '20',
          border: `1px solid ${asciiColors.foreground}`,
          marginBottom: theme.spacing.md,
          color: asciiColors.foreground
        }}>
          Error: {error}
        </div>
      )}

      {preview && (
        <div style={{ 
          padding: theme.spacing.sm, 
          background: asciiColors.accent + '10',
          border: `1px solid ${asciiColors.border}`,
          marginBottom: theme.spacing.md,
          fontSize: 11
        }}>
          <div style={{ fontWeight: 600, marginBottom: theme.spacing.xs }}>Preview:</div>
          <div>Non-existent tables: {preview.non_existent_tables || 0}</div>
          <div>Orphaned tables: {preview.orphaned_tables || 0}</div>
          <div>Old logs: {preview.old_logs || 0}</div>
          <div>Orphaned governance: {preview.orphaned_governance || 0}</div>
          <div>Orphaned quality: {preview.orphaned_quality || 0}</div>
          <div>Orphaned maintenance: {preview.orphaned_maintenance || 0}</div>
          <div>Orphaned lineage: {preview.orphaned_lineage || 0}</div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.xs }}>
        <AsciiButton
          label="Clean Non-Existent Tables"
          onClick={() => handleCleanup('non-existent-tables')}
          disabled={loading}
          variant="ghost"
        />
        <AsciiButton
          label="Clean Orphaned Tables"
          onClick={() => handleCleanup('orphaned-tables')}
          disabled={loading}
          variant="ghost"
        />
        <AsciiButton
          label="Clean Old Logs"
          onClick={() => handleCleanup('old-logs')}
          disabled={loading}
          variant="ghost"
        />
        <AsciiButton
          label="Clean Orphaned Governance"
          onClick={() => handleCleanup('orphaned-governance')}
          disabled={loading}
          variant="ghost"
        />
        <AsciiButton
          label="Clean Orphaned Quality"
          onClick={() => handleCleanup('orphaned-quality')}
          disabled={loading}
          variant="ghost"
        />
        <AsciiButton
          label="Clean Orphaned Maintenance"
          onClick={() => handleCleanup('orphaned-maintenance')}
          disabled={loading}
          variant="ghost"
        />
        <AsciiButton
          label="Clean Orphaned Lineage"
          onClick={() => handleCleanup('orphaned-lineage')}
          disabled={loading}
          variant="ghost"
        />
        <AsciiButton
          label="Clean All"
          onClick={() => handleCleanup('all')}
          disabled={loading}
          variant="primary"
        />
      </div>
    </AsciiPanel>
  );
};

export default CatalogCleaner;
