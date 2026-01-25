import React, { useState, useEffect, useCallback } from 'react';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { theme } from '../../theme/theme';
import { datalakeApi } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import SkeletonLoader from '../shared/SkeletonLoader';

interface Mapping {
  mapping_id: number;
  target_schema: string;
  target_table: string;
  source_system: string;
  source_connection?: string;
  source_schema?: string;
  source_table?: string;
  refresh_rate_type: string;
  refresh_schedule?: string;
  last_refresh_at?: string;
  next_refresh_at?: string;
  refresh_success_rate: number;
}

const DataLakeMapping = () => {
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sourceSystemFilter, setSourceSystemFilter] = useState<string>('');
  const [refreshTypeFilter, setRefreshTypeFilter] = useState<string>('');

  const fetchMappings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await datalakeApi.getMappings({
        source_system: sourceSystemFilter || undefined,
        refresh_rate_type: refreshTypeFilter || undefined
      });
      setMappings(data.mappings || data || []);
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setLoading(false);
    }
  }, [sourceSystemFilter, refreshTypeFilter]);

  useEffect(() => {
    fetchMappings();
  }, [fetchMappings]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleString();
  };

  const formatSuccessRate = (rate: number) => {
    return `${rate.toFixed(1)}%`;
  };

  return (
    <div style={{ padding: theme.spacing.lg }}>
      <AsciiPanel>
        <div style={{ marginBottom: theme.spacing.lg }}>
          <h1 style={{ 
            fontSize: 18, 
            fontWeight: 600, 
            color: asciiColors.foreground,
            marginBottom: theme.spacing.md 
          }}>
            DataLake Mapping
          </h1>
          <p style={{ 
            color: asciiColors.muted, 
            fontSize: 12,
            marginBottom: theme.spacing.lg 
          }}>
            Track the origin and refresh rates of all datalake tables
          </p>

          {/* Filters */}
          <div style={{
            display: 'flex',
            gap: theme.spacing.md,
            marginBottom: theme.spacing.md,
            flexWrap: 'wrap'
          }}>
            <input
              type="text"
              placeholder="Filter by source system"
              value={sourceSystemFilter}
              onChange={(e) => setSourceSystemFilter(e.target.value)}
              style={{
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                border: `1px solid ${asciiColors.border}`,
                background: asciiColors.background,
                color: asciiColors.foreground,
                fontFamily: 'Consolas, monospace',
                fontSize: 12,
                borderRadius: 2,
                minWidth: 200
              }}
            />
            <select
              value={refreshTypeFilter}
              onChange={(e) => setRefreshTypeFilter(e.target.value)}
              style={{
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                border: `1px solid ${asciiColors.border}`,
                background: asciiColors.background,
                color: asciiColors.foreground,
                fontFamily: 'Consolas, monospace',
                fontSize: 12,
                borderRadius: 2
              }}
            >
              <option value="">All Refresh Types</option>
              <option value="manual">Manual</option>
              <option value="scheduled">Scheduled</option>
              <option value="real-time">Real-time</option>
              <option value="on-demand">On-demand</option>
            </select>
            <AsciiButton onClick={fetchMappings} label="Refresh" />
          </div>

          {error && (
            <div style={{
              padding: theme.spacing.md,
              background: asciiColors.error,
              color: '#ffffff',
              marginBottom: theme.spacing.md,
              borderRadius: 2,
              fontFamily: 'Consolas, monospace',
              fontSize: 12
            }}>
              Error: {error}
            </div>
          )}

          {loading ? (
            <SkeletonLoader />
          ) : (
            <div style={{
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2,
              overflow: 'hidden'
            }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontFamily: 'Consolas, monospace',
                fontSize: 12
              }}>
                <thead>
                  <tr style={{
                    background: asciiColors.backgroundSoft,
                    borderBottom: `2px solid ${asciiColors.border}`
                  }}>
                    <th style={{ padding: theme.spacing.md, textAlign: 'left', fontWeight: 600 }}>Target Table</th>
                    <th style={{ padding: theme.spacing.md, textAlign: 'left', fontWeight: 600 }}>Source System</th>
                    <th style={{ padding: theme.spacing.md, textAlign: 'left', fontWeight: 600 }}>Source Table</th>
                    <th style={{ padding: theme.spacing.md, textAlign: 'left', fontWeight: 600 }}>Refresh Rate</th>
                    <th style={{ padding: theme.spacing.md, textAlign: 'left', fontWeight: 600 }}>Last Refresh</th>
                    <th style={{ padding: theme.spacing.md, textAlign: 'left', fontWeight: 600 }}>Next Refresh</th>
                    <th style={{ padding: theme.spacing.md, textAlign: 'left', fontWeight: 600 }}>Success Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {mappings.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: theme.spacing.lg, textAlign: 'center', color: asciiColors.muted }}>
                        No mappings found
                      </td>
                    </tr>
                  ) : (
                    mappings.map((mapping, idx) => (
                      <tr
                        key={mapping.mapping_id}
                        style={{
                          borderBottom: `1px solid ${asciiColors.border}`,
                          background: idx % 2 === 0 ? asciiColors.background : asciiColors.backgroundSoft
                        }}
                      >
                        <td style={{ padding: theme.spacing.md }}>
                          {mapping.target_schema}.{mapping.target_table}
                        </td>
                        <td style={{ padding: theme.spacing.md }}>{mapping.source_system}</td>
                        <td style={{ padding: theme.spacing.md }}>
                          {mapping.source_schema && mapping.source_table
                            ? `${mapping.source_schema}.${mapping.source_table}`
                            : 'N/A'}
                        </td>
                        <td style={{ padding: theme.spacing.md }}>
                          <span style={{
                            padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                            background: asciiColors.accent,
                            color: '#ffffff',
                            borderRadius: 2,
                            fontSize: 11
                          }}>
                            {mapping.refresh_rate_type}
                          </span>
                        </td>
                        <td style={{ padding: theme.spacing.md, color: asciiColors.muted }}>
                          {formatDate(mapping.last_refresh_at)}
                        </td>
                        <td style={{ padding: theme.spacing.md, color: asciiColors.muted }}>
                          {formatDate(mapping.next_refresh_at)}
                        </td>
                        <td style={{ padding: theme.spacing.md }}>
                          {formatSuccessRate(mapping.refresh_success_rate)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </AsciiPanel>
    </div>
  );
};

export default DataLakeMapping;
