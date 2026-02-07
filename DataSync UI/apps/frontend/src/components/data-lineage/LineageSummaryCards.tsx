import React from 'react';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';

export interface DistributionRow {
  label: string;
  count: number;
  highlight?: boolean;
}

export interface LineageSummaryCardsProps {
  distributionByStatus: DistributionRow[];
  distributionByType: DistributionRow[];
  distributionByEngine: DistributionRow[];
  totalRecords: string;
  totalBytes: string;
}

/** Optional metrics for the summary strip (same data as cards, compact line). */
export interface LineageSummaryStripMetrics {
  unique_objects?: number | string | null;
  unique_servers?: number | string | null;
  unique_databases?: number | string | null;
  unique_schemas?: number | string | null;
  unique_instances?: number | string | null;
  unique_relationship_types?: number | string | null;
  high_confidence?: number | string | null;
  low_confidence?: number | string | null;
  avg_confidence?: number | string | null;
  avg_dependency_level?: number | string | null;
  discovered_last_24h?: number | string | null;
  unique_discovery_methods?: number | string | null;
  total_executions?: number | string | null;
  avg_duration_ms?: number | string | null;
}

export interface LineageSummaryStripProps {
  distributionByStatus: DistributionRow[];
  distributionByType: DistributionRow[];
  distributionByEngine: DistributionRow[];
  totalRecords: string;
  totalBytes: string;
  metrics?: LineageSummaryStripMetrics | null;
}

/** Generic summary strip for any page: same box style, one or more lines of text. */
export const GenericSummaryStrip: React.FC<{ lines: string[] }> = ({ lines }) => (
  <div
    style={{
      padding: '12px 16px',
      backgroundColor: asciiColors.backgroundSoft,
      border: `1px solid ${asciiColors.border}`,
      borderRadius: 2,
      marginBottom: 16,
      fontFamily: 'Consolas',
      fontSize: 11,
      color: asciiColors.foreground,
      lineHeight: 1.6,
    }}
  >
    <div style={{ marginBottom: 4 }}>
      <span style={{ color: asciiColors.muted }}>Summary </span>
      <span style={{ color: asciiColors.accent }}>{ascii.blockFull}</span>
    </div>
    {lines.map((line, i) => (
      <div key={i} style={{ marginBottom: i < lines.length - 1 ? 4 : 0 }}>
        <span style={{ color: asciiColors.foreground }}>{line}</span>
      </div>
    ))}
  </div>
);

const formatCount = (n: number): string => n.toLocaleString();
const formatPct = (count: number, total: number): string =>
  total > 0 ? `${((count / total) * 100).toFixed(1)}%` : '0.0%';

/** Format large numbers as 32.9K, 1.2M for Totals card. */
export const formatTotalRecords = (n: number | null | undefined): string => {
  if (n === null || n === undefined) return 'N/A';
  const num = Number(n);
  if (isNaN(num)) return 'N/A';
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString();
};

/**
 * Single metric card in the same style as the summary cards: title with blue square,
 * separator line, value (and optional subtitle). Used for Unique Objects, Avg Confidence, etc.
 */
export const SummaryMetricCard: React.FC<{
  title: string;
  value: number | string | null | undefined;
  subtitle?: string;
}> = ({ title, value, subtitle }) => {
  const displayValue = value === null || value === undefined ? 'N/A' : typeof value === 'string' ? value : Number(value).toLocaleString();
  return (
    <div
      style={{
        padding: 16,
        backgroundColor: asciiColors.backgroundSoft,
        border: `1px solid ${asciiColors.border}`,
        borderRadius: 2,
        minWidth: 150,
        fontFamily: 'Consolas',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ color: asciiColors.accent, fontSize: 10 }}>{ascii.blockFull}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: asciiColors.foreground, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {title}
        </span>
      </div>
      <div style={{ height: 1, backgroundColor: asciiColors.border, marginBottom: 12 }} />
      <div style={{ fontSize: 24, fontWeight: 700, color: asciiColors.foreground, marginBottom: subtitle ? 4 : 0 }}>
        {displayValue}
      </div>
      {subtitle && (
        <div style={{ fontSize: 10, color: asciiColors.muted }}>
          {subtitle}
        </div>
      )}
    </div>
  );
};

const sep = ' · ';
const sepBlock = '  |  ';

/**
 * Compact summary strip (same data as cards) to show above the cards.
 * Renders 2–3 lines: Status | Engine | Totals; Types; optional metrics line.
 */
export const LineageSummaryStrip: React.FC<LineageSummaryStripProps> = ({
  distributionByStatus,
  distributionByType,
  distributionByEngine,
  totalRecords,
  totalBytes,
  metrics,
}) => {
  const statusTotal = distributionByStatus.reduce((s, r) => s + r.count, 0);
  const statusLine = distributionByStatus
    .map((r) => `${r.label} ${r.count} (${formatPct(r.count, statusTotal)})`)
    .join(sep);
  const engineTotal = distributionByEngine.reduce((s, r) => s + r.count, 0);
  const engineLine = distributionByEngine
    .map((r) => `${r.label} ${formatCount(r.count)} (${formatPct(r.count, engineTotal || 1)})`)
    .join(sep);
  const typeTotal = distributionByType.reduce((s, r) => s + r.count, 0);
  const typeLine =
    distributionByType.length > 0
      ? distributionByType.map((r) => `${r.label} ${r.count} (${formatPct(r.count, typeTotal)})`).join(sep)
      : '—';
  const line1 = [
    `Status: ${statusLine}`,
    `Engine: ${engineLine}`,
    `Records: ${totalRecords}`,
    `Bytes: ${totalBytes}`,
  ].join(sepBlock);
  const line2 = `Types: ${typeLine}`;

  const fmt = (v: number | string | null | undefined): string => {
    if (v === null || v === undefined) return '—';
    if (typeof v === 'number') return String(v);
    return String(v);
  };
  const parts: string[] = [];
  if (metrics?.unique_objects != null) parts.push(`Unique Objects ${fmt(metrics.unique_objects)}`);
  if (metrics?.unique_servers != null) parts.push(`Servers ${fmt(metrics.unique_servers)}`);
  if (metrics?.unique_databases != null) parts.push(`DBs ${fmt(metrics.unique_databases)}`);
  if (metrics?.unique_schemas != null) parts.push(`Schemas ${fmt(metrics.unique_schemas)}`);
  if (metrics?.unique_instances != null) parts.push(`Instances ${fmt(metrics.unique_instances)}`);
  if (metrics?.unique_relationship_types != null) parts.push(`Rel Types ${fmt(metrics.unique_relationship_types)}`);
  if (metrics?.high_confidence != null) parts.push(`High Conf ${fmt(metrics.high_confidence)}`);
  if (metrics?.low_confidence != null) parts.push(`Low Conf ${fmt(metrics.low_confidence)}`);
  if (metrics?.avg_confidence != null) {
    const v = metrics.avg_confidence;
    const pct = typeof v === 'number' ? `${(v * 100).toFixed(1)}%` : fmt(v);
    parts.push(`Avg Conf ${pct}`);
  }
  if (metrics?.avg_dependency_level != null) parts.push(`Avg Dep ${fmt(metrics.avg_dependency_level)}`);
  if (metrics?.discovered_last_24h != null) parts.push(`24h ${fmt(metrics.discovered_last_24h)}`);
  if (metrics?.unique_discovery_methods != null) parts.push(`Methods ${fmt(metrics.unique_discovery_methods)}`);
  if (metrics?.total_executions != null) parts.push(`Executions ${fmt(metrics.total_executions)}`);
  if (metrics?.avg_duration_ms != null) {
    const ms = Number(metrics.avg_duration_ms);
    const dur = isNaN(ms) ? fmt(metrics.avg_duration_ms) : ms < 1000 ? `${ms.toFixed(2)} ms` : `${(ms / 1000).toFixed(2)} s`;
    parts.push(`Avg Dur ${dur}`);
  }
  const line3 = parts.length > 0 ? parts.join(sep) : null;

  return (
    <div
      style={{
        padding: '12px 16px',
        backgroundColor: asciiColors.backgroundSoft,
        border: `1px solid ${asciiColors.border}`,
        borderRadius: 2,
        marginBottom: 16,
        fontFamily: 'Consolas',
        fontSize: 11,
        color: asciiColors.foreground,
        lineHeight: 1.6,
      }}
    >
      <div style={{ marginBottom: 4 }}>
        <span style={{ color: asciiColors.muted }}>Summary </span>
        <span style={{ color: asciiColors.accent }}>{ascii.blockFull}</span>
        <span style={{ color: asciiColors.foreground }}> {line1}</span>
      </div>
      <div style={{ marginBottom: line3 ? 4 : 0 }}>
        <span style={{ color: asciiColors.foreground }}>{line2}</span>
      </div>
      {line3 && (
        <div>
          <span style={{ color: asciiColors.foreground }}>{line3}</span>
        </div>
      )}
    </div>
  );
};

/**
 * Renders a single distribution card (Status, Type, or Engine) with title,
 * separator line, and rows with colored square, label left, count (pct%) right.
 */
const DistributionCard: React.FC<{
  title: string;
  rows: DistributionRow[];
  showSeparator?: boolean;
}> = ({ title, rows, showSeparator = true }) => {
  const total = rows.reduce((s, r) => s + r.count, 0);
  return (
    <div
      style={{
        padding: 16,
        backgroundColor: asciiColors.backgroundSoft,
        border: `1px solid ${asciiColors.border}`,
        borderRadius: 2,
        minWidth: 180,
        fontFamily: 'Consolas',
        flex: 1,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: showSeparator ? 10 : 12,
        }}
      >
        <span style={{ color: asciiColors.accent, fontSize: 10 }}>{ascii.blockFull}</span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: asciiColors.foreground,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}
        >
          {title}
        </span>
      </div>
      {showSeparator && (
        <div
          style={{
            height: 1,
            backgroundColor: asciiColors.border,
            marginBottom: 12,
          }}
        />
      )}
      {rows.map((row, idx) => {
        const pct = formatPct(row.count, total);
        const isHighlight = row.highlight ?? false;
        const color = isHighlight ? asciiColors.accent : (idx === 0 ? asciiColors.foreground : asciiColors.muted);
        return (
          <div
            key={row.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 6,
              fontSize: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color, fontSize: 10 }}>{ascii.blockFull}</span>
              <span style={{ color: isHighlight ? asciiColors.accent : asciiColors.foreground }}>
                {row.label}
              </span>
            </div>
            <span style={{ color: isHighlight ? asciiColors.accent : asciiColors.foreground, fontWeight: 500 }}>
              {formatCount(row.count)} ({pct})
            </span>
          </div>
        );
      })}
    </div>
  );
};

/**
 * Summary cards for data lineage pages: Distribution by Status, by Type, by Engine, and Totals.
 * Matches the dashboard card layout: light gray cards, blue accent, list rows with count (pct%).
 */
const LineageSummaryCards: React.FC<LineageSummaryCardsProps> = ({
  distributionByStatus,
  distributionByType,
  distributionByEngine,
  totalRecords,
  totalBytes,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        gap: 16,
        flexWrap: 'wrap',
        marginBottom: 24,
        padding: 16,
        backgroundColor: asciiColors.background,
        border: `1px solid ${asciiColors.border}`,
        borderRadius: 2,
      }}
    >
      <DistributionCard title="Distribution by Status" rows={distributionByStatus} />
      <DistributionCard title="Distribution by Type" rows={distributionByType} />
      <DistributionCard title="Distribution by Engine" rows={distributionByEngine} />
      <div
        style={{
          padding: 16,
          backgroundColor: asciiColors.backgroundSoft,
          border: `1px solid ${asciiColors.border}`,
          borderRadius: 2,
          minWidth: 180,
          fontFamily: 'Consolas',
          flex: 1,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 12,
          }}
        >
          <span style={{ color: asciiColors.accent, fontSize: 10 }}>{ascii.blockFull}</span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: asciiColors.foreground,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            Totals
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8,
            fontSize: 12,
          }}
        >
          <span style={{ color: asciiColors.foreground }}>
            <span style={{ color: asciiColors.border, marginRight: 8 }}>{ascii.v}</span>
            Total Records
          </span>
          <span style={{ color: asciiColors.accent, fontWeight: 600 }}>{totalRecords}</span>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 12,
          }}
        >
          <span style={{ color: asciiColors.foreground }}>
            <span style={{ color: asciiColors.border, marginRight: 8 }}>{ascii.v}</span>
            Total Bytes
          </span>
          <span style={{ color: asciiColors.accent, fontWeight: 600 }}>{totalBytes}</span>
        </div>
      </div>
    </div>
  );
};

/**
 * Single metric row for the metrics dashboard (label, value, optional subtitle).
 */
export interface MetricsDashboardRow {
  label: string;
  value: number | string | null | undefined;
  subtitle?: string;
}

/**
 * One card in the metrics dashboard (title + rows with label/value/subtitle).
 */
export interface MetricsDashboardCard {
  title: string;
  rows: MetricsDashboardRow[];
}

/**
 * Dashboard / panel de resumen for lineage metrics: same container and card style as
 * LineageSummaryCards, with multiple cards showing Unique Objects, Confidence, Discovery, etc.
 */
const MetricRowCard: React.FC<{ title: string; rows: MetricsDashboardRow[] }> = ({ title, rows }) => {
  const fmt = (v: number | string | null | undefined): string => {
    if (v === null || v === undefined) return 'N/A';
    if (typeof v === 'number') return Number.isInteger(v) ? v.toLocaleString() : String(v);
    return String(v);
  };
  return (
    <div
      style={{
        padding: 16,
        backgroundColor: asciiColors.backgroundSoft,
        border: `1px solid ${asciiColors.border}`,
        borderRadius: 2,
        minWidth: 160,
        fontFamily: 'Consolas',
        flex: 1,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ color: asciiColors.accent, fontSize: 10 }}>{ascii.blockFull}</span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: asciiColors.foreground,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}
        >
          {title}
        </span>
      </div>
      <div style={{ height: 1, backgroundColor: asciiColors.border, marginBottom: 12 }} />
      {rows.map((row) => (
        <div key={row.label} style={{ marginBottom: 8 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 12,
            }}
          >
            <span style={{ color: asciiColors.foreground }}>
              <span style={{ color: asciiColors.border, marginRight: 8 }}>{ascii.v}</span>
              {row.label}
            </span>
            <span style={{ color: asciiColors.accent, fontWeight: 600 }}>{fmt(row.value)}</span>
          </div>
          {row.subtitle && (
            <div style={{ fontSize: 10, color: asciiColors.muted, marginTop: 2, marginLeft: 16 }}>
              {row.subtitle}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export const LineageMetricsDashboard: React.FC<{ cards: MetricsDashboardCard[] }> = ({ cards }) => (
  <div
    style={{
      display: 'flex',
      gap: 16,
      flexWrap: 'wrap',
      marginBottom: 24,
      padding: 16,
      backgroundColor: asciiColors.background,
      border: `1px solid ${asciiColors.border}`,
      borderRadius: 2,
    }}
  >
    {cards.map((card) => (
      <MetricRowCard key={card.title} title={card.title} rows={card.rows} />
    ))}
  </div>
);

export default LineageSummaryCards;
