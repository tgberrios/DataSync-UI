import React from 'react';
import { asciiColors } from '../../ui/theme/asciiTheme';
import { theme } from '../../theme/theme';

interface QueryPerformanceEntry {
  id: number;
  performance_tier?: string;
  source_type?: string;
  operation_type?: string;
  mean_time_ms?: number;
  query_duration_ms?: number;
  query_text?: string;
  query_efficiency_score?: number;
  cache_hit_ratio?: number;
  rows_returned?: number;
  [key: string]: any;
}

interface QueryPerformanceTreeViewProps {
  queries: QueryPerformanceEntry[];
  onQueryClick?: (query: QueryPerformanceEntry) => void;
}

const getTierColor = (tier: string) => {
  switch (tier) {
    case 'EXCELLENT': return asciiColors.accent;
    case 'GOOD': return asciiColors.foreground;
    case 'FAIR': return asciiColors.muted;
    case 'POOR': return asciiColors.foreground;
    default: return asciiColors.muted;
  }
};

const formatTime = (ms?: number) => {
  if (!ms) return 'N/A';
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

const formatNumber = (num?: number) => {
  if (num === undefined || num === null) return 'N/A';
  return num.toLocaleString();
};

/**
 * List view of query performance entries (flat list, no tree expand/collapse).
 */
const QueryPerformanceTreeView: React.FC<QueryPerformanceTreeViewProps> = ({
  queries,
  onQueryClick
}) => {
  if (queries.length === 0) {
    return (
      <div style={{
        padding: theme.spacing.lg,
        textAlign: 'center',
        color: asciiColors.muted,
        fontFamily: 'Consolas',
        fontSize: 12
      }}>
        No query performance data available. Data will appear here once queries are captured.
      </div>
    );
  }

  return (
    <div style={{
      fontFamily: 'Consolas',
      fontSize: 12,
      color: asciiColors.foreground,
      display: 'flex',
      flexDirection: 'column',
      gap: 2
    }}>
      {queries.map((query, idx) => {
        const tier = query.performance_tier || 'UNKNOWN';
        const tierColor = getTierColor(tier);
        return (
          <div
            key={query.id ?? idx}
            onClick={() => onQueryClick?.(query)}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              padding: '8px 10px',
              borderLeft: `3px solid ${tierColor}`,
              backgroundColor: 'transparent',
              transition: 'all 0.15s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = asciiColors.backgroundSoft;
              e.currentTarget.style.borderLeftColor = asciiColors.accent;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderLeftColor = tierColor;
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: 2,
                  fontSize: 10,
                  fontWeight: 600,
                  border: `1px solid ${tierColor}`,
                  color: tierColor,
                  backgroundColor: 'transparent'
                }}>
                  {tier}
                </span>
                <span style={{
                  fontWeight: 600,
                  color: asciiColors.foreground,
                  fontSize: 11
                }}>
                  {query.operation_type || 'N/A'}
                </span>
                {query.source_type && (
                  <span style={{
                    padding: '2px 6px',
                    borderRadius: 2,
                    fontSize: 10,
                    fontWeight: 500,
                    border: `1px solid ${asciiColors.border}`,
                    color: asciiColors.muted,
                    backgroundColor: 'transparent'
                  }}>
                    {query.source_type}
                  </span>
                )}
                <span style={{
                  padding: '2px 6px',
                  borderRadius: 2,
                  fontSize: 10,
                  fontWeight: 500,
                  border: `1px solid ${asciiColors.accent}`,
                  color: asciiColors.accent,
                  backgroundColor: 'transparent'
                }}>
                  {formatTime(query.mean_time_ms ?? query.query_duration_ms)}
                </span>
                {query.query_efficiency_score !== undefined && (
                  <span style={{
                    padding: '2px 6px',
                    borderRadius: 2,
                    fontSize: 10,
                    fontWeight: 500,
                    border: `1px solid ${asciiColors.border}`,
                    color: asciiColors.muted,
                    backgroundColor: 'transparent'
                  }}>
                    {Number(query.query_efficiency_score).toFixed(1)}% eff
                  </span>
                )}
                {query.cache_hit_ratio !== undefined && (
                  <span style={{
                    padding: '2px 6px',
                    borderRadius: 2,
                    fontSize: 10,
                    fontWeight: 500,
                    border: `1px solid ${asciiColors.border}`,
                    color: asciiColors.muted,
                    backgroundColor: 'transparent'
                  }}>
                    {Number(query.cache_hit_ratio).toFixed(1)}% cache
                  </span>
                )}
                {query.rows_returned !== undefined && (
                  <span style={{
                    padding: '2px 6px',
                    borderRadius: 2,
                    fontSize: 10,
                    fontWeight: 500,
                    border: `1px solid ${asciiColors.border}`,
                    color: asciiColors.muted,
                    backgroundColor: 'transparent'
                  }}>
                    {formatNumber(query.rows_returned)} rows
                  </span>
                )}
              </div>
              {query.query_text && (
                <div style={{
                  fontSize: 10,
                  color: asciiColors.muted,
                  fontFamily: 'Consolas',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '100%'
                }} title={query.query_text}>
                  {query.query_text.substring(0, 100)}{query.query_text.length > 100 ? '...' : ''}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default QueryPerformanceTreeView;
