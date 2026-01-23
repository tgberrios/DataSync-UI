import React, { useState, useMemo } from 'react';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
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

interface TierNode {
  tier: string;
  queries: QueryPerformanceEntry[];
}

interface QueryPerformanceTreeViewProps {
  queries: QueryPerformanceEntry[];
  onQueryClick?: (query: QueryPerformanceEntry) => void;
}

const QueryPerformanceTreeView: React.FC<QueryPerformanceTreeViewProps> = ({ 
  queries, 
  onQueryClick
}) => {
  const [expandedTiers, setExpandedTiers] = useState<Set<string>>(new Set());

  const treeData = useMemo(() => {
    const tiers = new Map<string, TierNode>();

    queries.forEach(query => {
      const tier = query.performance_tier || 'UNKNOWN';

      if (!tiers.has(tier)) {
        tiers.set(tier, {
          tier,
          queries: []
        });
      }

      tiers.get(tier)!.queries.push(query);
    });

    return Array.from(tiers.values()).sort((a, b) => {
      const order = ['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'UNKNOWN'];
      return order.indexOf(a.tier) - order.indexOf(b.tier);
    });
  }, [queries]);

  const toggleTier = (tier: string) => {
    setExpandedTiers(prev => {
      const next = new Set(prev);
      if (next.has(tier)) {
        next.delete(tier);
      } else {
        next.add(tier);
      }
      return next;
    });
  };

  const renderTreeLine = (level: number, isLast: boolean) => {
    if (level === 0) return null;
    
    const lines: string[] = [];
    for (let i = 0; i < level - 1; i++) {
      lines.push(`${ascii.v}  `);
    }
    
    if (isLast) {
      lines.push(`${ascii.bl}${ascii.h}${ascii.h} `);
    } else {
      lines.push(`${ascii.tRight}${ascii.h}${ascii.h} `);
    }
    
    return <span style={{ 
      color: asciiColors.border, 
      marginRight: 6, 
      fontFamily: "Consolas", 
      fontSize: 11 
    }}>{lines.join('')}</span>;
  };

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
      fontFamily: "Consolas",
      fontSize: 12,
      color: asciiColors.foreground
    }}>
      {treeData.map((tierNode, tierIdx) => {
        const isTierExpanded = expandedTiers.has(tierNode.tier);
        const isTierLast = tierIdx === treeData.length - 1;

        return (
          <div key={tierNode.tier} style={{ marginBottom: 4 }}>
            {/* Tier Level */}
            <div
              onClick={() => toggleTier(tierNode.tier)}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "10px 8px",
                cursor: "pointer",
                borderLeft: `2px solid ${getTierColor(tierNode.tier)}`,
                backgroundColor: isTierExpanded ? asciiColors.backgroundSoft : asciiColors.background,
                transition: "all 0.15s ease",
                marginBottom: 2
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = asciiColors.backgroundSoft;
              }}
              onMouseLeave={(e) => {
                if (!isTierExpanded) {
                  e.currentTarget.style.backgroundColor = asciiColors.background;
                }
              }}
            >
              <span style={{
                marginRight: 8,
                color: isTierExpanded ? asciiColors.accent : asciiColors.muted,
                fontSize: 10,
                transition: "transform 0.15s ease",
                display: "inline-block",
                transform: isTierExpanded ? "rotate(90deg)" : "rotate(0deg)"
              }}>
                {ascii.arrowRight}
              </span>
              <span style={{
                padding: "2px 8px",
                borderRadius: 2,
                fontSize: 10,
                fontWeight: 600,
                border: `1px solid ${getTierColor(tierNode.tier)}`,
                color: getTierColor(tierNode.tier),
                backgroundColor: "transparent"
              }}>
                {tierNode.tier}
              </span>
              <span style={{
                padding: "2px 8px",
                borderRadius: 2,
                fontSize: 10,
                fontWeight: 500,
                border: `1px solid ${asciiColors.border}`,
                backgroundColor: asciiColors.backgroundSoft,
                color: asciiColors.foreground,
                marginLeft: 8
              }}>
                {tierNode.queries.length}
              </span>
            </div>

            {isTierExpanded && (
              <div style={{ paddingLeft: 24 }}>
                {tierNode.queries.map((query, queryIdx) => {
                  const isQueryLast = queryIdx === tierNode.queries.length - 1;

                  return (
                    <div
                      key={query.id || queryIdx}
                      onClick={() => onQueryClick?.(query)}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        padding: "8px 8px",
                        marginLeft: 8,
                        marginBottom: 2,
                        borderLeft: `1px solid ${asciiColors.border}`,
                        backgroundColor: "transparent",
                        transition: "all 0.15s ease",
                        cursor: "pointer"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = asciiColors.backgroundSoft;
                        e.currentTarget.style.borderLeftColor = asciiColors.accent;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                        e.currentTarget.style.borderLeftColor = asciiColors.border;
                      }}
                    >
                      {renderTreeLine(1, isQueryLast)}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                          <span style={{
                            fontWeight: 600,
                            color: asciiColors.foreground,
                            fontSize: 11
                          }}>
                            {query.operation_type || 'N/A'}
                          </span>
                          {query.source_type && (
                            <span style={{
                              padding: "2px 6px",
                              borderRadius: 2,
                              fontSize: 10,
                              fontWeight: 500,
                              border: `1px solid ${asciiColors.border}`,
                              color: asciiColors.muted,
                              backgroundColor: "transparent"
                            }}>
                              {query.source_type}
                            </span>
                          )}
                          <span style={{
                            padding: "2px 6px",
                            borderRadius: 2,
                            fontSize: 10,
                            fontWeight: 500,
                            border: `1px solid ${asciiColors.accent}`,
                            color: asciiColors.accent,
                            backgroundColor: "transparent"
                          }}>
                            {formatTime(query.mean_time_ms || query.query_duration_ms)}
                          </span>
                          {query.query_efficiency_score !== undefined && (
                            <span style={{
                              padding: "2px 6px",
                              borderRadius: 2,
                              fontSize: 10,
                              fontWeight: 500,
                              border: `1px solid ${asciiColors.border}`,
                              color: asciiColors.muted,
                              backgroundColor: "transparent"
                            }}>
                              {Number(query.query_efficiency_score).toFixed(1)}% eff
                            </span>
                          )}
                          {query.cache_hit_ratio !== undefined && (
                            <span style={{
                              padding: "2px 6px",
                              borderRadius: 2,
                              fontSize: 10,
                              fontWeight: 500,
                              border: `1px solid ${asciiColors.border}`,
                              color: asciiColors.muted,
                              backgroundColor: "transparent"
                            }}>
                              {Number(query.cache_hit_ratio).toFixed(1)}% cache
                            </span>
                          )}
                          <span style={{
                            padding: "2px 6px",
                            borderRadius: 2,
                            fontSize: 10,
                            fontWeight: 500,
                            border: `1px solid ${asciiColors.border}`,
                            color: asciiColors.muted,
                            backgroundColor: "transparent"
                          }}>
                            {formatNumber(query.rows_returned)} rows
                          </span>
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
            )}
          </div>
        );
      })}
    </div>
  );
};

export default QueryPerformanceTreeView;
