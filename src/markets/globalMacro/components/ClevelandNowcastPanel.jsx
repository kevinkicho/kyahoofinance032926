import React, { useMemo } from 'react';
import { useTheme } from '../../../hub/ThemeContext';
import MetricValue from '../../../components/MetricValue/MetricValue';
import { clevelandHeadline } from './MacroLiveChips';

const KIND_META = {
  mom: { title: 'Month-over-Month', short: 'MoM', periodLabel: 'Month', unit: 'm/m %' },
  yoy: { title: 'Year-over-Year', short: 'YoY', periodLabel: 'Month', unit: 'y/y %' },
  quarterly: { title: 'Quarterly (annualized)', short: 'QoQ', periodLabel: 'Quarter', unit: 'q/q %' },
};

const SERIES = [
  { key: 'cpi', label: 'CPI', seriesKey: 'cpi' },
  { key: 'coreCpi', label: 'Core CPI', seriesKey: 'coreCpi' },
  { key: 'pce', label: 'PCE', seriesKey: 'pce' },
  { key: 'corePce', label: 'Core PCE', seriesKey: 'corePce' },
];

/** Color by distance from Fed-relevant reference (YoY ~2%, MoM ~0.17%, QoQ ~2%). */
function heatClass(value, kind) {
  if (value == null || !Number.isFinite(Number(value))) return 'is-muted';
  const v = Number(value);
  if (kind === 'mom') {
    if (v <= 0.1) return 'is-cool';
    if (v <= 0.25) return 'is-ok';
    if (v <= 0.4) return 'is-warm';
    return 'is-hot';
  }
  // yoy + quarterly annualized — 2% target band
  if (v < 1.5) return 'is-cool';
  if (v <= 2.5) return 'is-ok';
  if (v <= 3.5) return 'is-warm';
  return 'is-hot';
}

function fmtPct(v, digits = 2) {
  if (v == null || !Number.isFinite(Number(v))) return '—';
  return `${Number(v).toFixed(digits)}%`;
}

function pickTable(tables, kind) {
  return (tables || []).find((t) => t.kind === kind) || null;
}

function latestRow(table) {
  return table?.rows?.[0] || null;
}

/** Infer kind for legacy caches that tagged every monthly table as "mom". */
function normalizeTables(rawTables) {
  const tables = Array.isArray(rawTables) ? rawTables : [];
  const yoyCount = tables.filter((t) => t.kind === 'yoy').length;
  const momTables = tables.filter((t) => t.kind === 'mom');
  if (yoyCount > 0 || momTables.length <= 1) return tables;

  // Two+ "mom" entries and no yoy: the second monthly table is YoY
  // (Cleveland page order is always MoM → YoY → quarterly).
  let momSeen = 0;
  return tables.map((t) => {
    if (t.kind !== 'mom') return t;
    momSeen += 1;
    if (momSeen === 1) return t;
    if (momSeen === 2) return { ...t, kind: 'yoy' };
    return t;
  });
}

export default function ClevelandNowcastPanel({ data, lastUpdated }) {
  const { colors } = useTheme();
  const tables = useMemo(() => normalizeTables(data?.tables), [data?.tables]);

  const yoy = useMemo(() => pickTable(tables, 'yoy'), [tables]);
  const mom = useMemo(() => pickTable(tables, 'mom'), [tables]);
  const qtr = useMemo(() => pickTable(tables, 'quarterly'), [tables]);

  const yoyLatest = latestRow(yoy) || data?.byKind?.yoy || null;
  // Prefer true MoM; if only YoY-scale values landed in latest, still surface them.
  const momLatest = latestRow(mom) || data?.byKind?.mom || null;
  const qtrLatest = latestRow(qtr) || data?.byKind?.quarterly || null;
  // Headline KPIs: YoY first, then byKind/latest from API. Leftover isLive latest bag stays empty.
  const headline = clevelandHeadline(yoyLatest) || clevelandHeadline(data?.byKind?.yoy) || clevelandHeadline(data?.latest);
  const updated = headline?.updated || momLatest?.updated || qtrLatest?.updated || null;
  const period = headline?.period || momLatest?.period || qtrLatest?.period || null;

  if (!tables.length && !headline) {
    return (
      <div className="mac-cleve-empty">
        Cleveland Fed inflation nowcast unavailable.
      </div>
    );
  }

  const ordered = [mom, yoy, qtr].filter(Boolean);

  return (
    <div className="mac-cleve">
      {/* Headline YoY KPIs */}
      <div className="mac-cleve-header">
        <div className="mac-cleve-header-meta">
          <span className="mac-cleve-badge">Nowcast</span>
          {period && <span className="mac-cleve-period">{period}</span>}
          {updated && <span className="mac-cleve-updated">Updated {updated}</span>}
        </div>
        <div className="mac-cleve-kpi-strip">
          {SERIES.map(({ key, label, seriesKey }) => {
            const val = headline?.[key];
            const momVal = momLatest?.[key];
            return (
              <div key={key} className={`mac-cleve-kpi ${heatClass(val, 'yoy')}`}>
                <span className="mac-cleve-kpi-label">{label}</span>
                <span className="mac-cleve-kpi-value">
                  <MetricValue
                    value={val}
                    seriesKey={seriesKey}
                    timestamp={lastUpdated}
                    format={(v) => fmtPct(v, 2)}
                  />
                </span>
                <span className="mac-cleve-kpi-sub">
                  YoY
                  {momVal != null && (
                    <span className={`mac-cleve-mom-chip ${heatClass(momVal, 'mom')}`}>
                      {fmtPct(momVal, 2)} MoM
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
        {qtrLatest && (
          <div className="mac-cleve-qtr-strip">
            <span className="mac-cleve-qtr-label">{qtrLatest.period || 'Quarter'} · ann.</span>
            {SERIES.map(({ key, label }) => (
              <span key={key} className={`mac-cleve-qtr-pill ${heatClass(qtrLatest[key], 'quarterly')}`}>
                <span className="mac-cleve-qtr-name">{label}</span>
                <span className="mac-cleve-qtr-val">{fmtPct(qtrLatest[key], 2)}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Detail tables */}
      <div className={`mac-cleve-tables mac-cleve-tables--${Math.min(3, ordered.length)}`}>
        {ordered.map((tbl) => {
          const meta = KIND_META[tbl.kind] || KIND_META.mom;
          const rows = (tbl.rows || []).slice(0, 6);
          return (
            <div key={tbl.kind || meta.title} className="mac-cleve-card">
              <div className="mac-cleve-card-head">
                <span className="mac-cleve-card-title">{meta.title}</span>
                <span className="mac-cleve-card-unit">{meta.unit}</span>
              </div>
              <table className="mac-cleve-table">
                <thead>
                  <tr>
                    <th>{meta.periodLabel}</th>
                    {SERIES.map((s) => (
                      <th key={s.key}>{s.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, j) => (
                    <tr key={`${r.period}-${j}`} className={j === 0 ? 'is-latest' : undefined}>
                      <td className="mac-cleve-period-cell">
                        {r.period}
                        {j === 0 && <span className="mac-cleve-latest-dot" title="Latest" />}
                      </td>
                      {SERIES.map((s) => (
                        <td key={s.key} className={`mac-cleve-num ${heatClass(r[s.key], tbl.kind)}`}>
                          {fmtPct(r[s.key], 2)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>

      <div className="mac-cleve-footer" style={{ color: colors.textDim }}>
        Source: Cleveland Fed Inflation Nowcasting · colors vs ~2% YoY / ~0.2% MoM reference bands
      </div>
    </div>
  );
}
