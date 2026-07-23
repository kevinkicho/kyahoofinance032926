import { useMemo, useState } from 'react';

function fmtBn(v) {
  if (v == null || !Number.isFinite(Number(v))) return '—';
  const n = Number(v) / 1e9;
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(2)}T`;
  if (Math.abs(n) >= 100) return `$${n.toFixed(0)}B`;
  if (Math.abs(n) >= 10) return `$${n.toFixed(1)}B`;
  if (Math.abs(n) >= 1) return `$${n.toFixed(1)}B`;
  return `$${(n * 1000).toFixed(0)}M`;
}

function fmtPct(v, digits = 0, signed = false) {
  if (v == null || !Number.isFinite(Number(v))) return '—';
  const n = Number(v);
  const sign = signed && n > 0 ? '+' : '';
  return `${sign}${n.toFixed(digits)}%`;
}

function fmtX(v, digits = 1) {
  if (v == null || !Number.isFinite(Number(v))) return '—';
  return `${Number(v).toFixed(digits)}×`;
}

function gradeClass(g) {
  if (g === 'A') return 'sec-grade-a';
  if (g === 'B') return 'sec-grade-b';
  if (g === 'C') return 'sec-grade-c';
  return 'sec-grade-d';
}

function heatMargin(v) {
  if (v == null) return undefined;
  if (v >= 20) return '#22c55e';
  if (v >= 10) return '#f59e0b';
  return '#f87171';
}

function heatPos(v) {
  if (v == null) return undefined;
  return v >= 0 ? '#22c55e' : '#f87171';
}

const COLS = [
  { key: 'ticker', label: 'Tkr', cls: 'c-tkr' },
  { key: 'fy', label: 'FY', cls: 'c-fy' },
  { key: 'rev', label: 'Rev', cls: 'c-num' },
  { key: 'ni', label: 'NI', cls: 'c-num' },
  { key: 'mrg', label: 'Mrg', cls: 'c-num' },
  { key: 'roe', label: 'ROE', cls: 'c-num' },
  { key: 'gr', label: 'Gr', cls: 'c-num c-opt' },
  { key: 'de', label: 'D/E', cls: 'c-num' },
  { key: 'fcf', label: 'FCF', cls: 'c-num c-opt' },
  { key: 'grd', label: 'Q', cls: 'c-grd' },
];

export default function SecMegaCapFundamentalsPanel({ rows = [], summary = {} }) {
  const [expanded, setExpanded] = useState(null);

  const sorted = useMemo(
    () => [...rows].sort((a, b) => (b.qualityScore ?? 0) - (a.qualityScore ?? 0) || (b.revenue ?? 0) - (a.revenue ?? 0)),
    [rows],
  );

  if (!sorted.length) {
    return (
      <div className="sec-mega-empty">
        SEC EDGAR fundamentals unavailable.
      </div>
    );
  }

  const kpis = [
    { label: 'Margin', value: summary.avgMargin != null ? fmtPct(summary.avgMargin, 1) : '—', tone: 'blue' },
    { label: 'ROE', value: summary.avgRoe != null ? fmtPct(summary.avgRoe, 1) : '—', tone: 'green' },
    { label: 'ROA', value: summary.avgRoa != null ? fmtPct(summary.avgRoa, 1) : '—', tone: 'purple' },
    {
      label: 'Rev Gr',
      value: summary.avgRevGrowth != null ? fmtPct(summary.avgRevGrowth, 1, true) : '—',
      tone: (summary.avgRevGrowth ?? 0) >= 0 ? 'green' : 'red',
    },
    { label: 'D/E', value: summary.avgDe != null ? fmtX(summary.avgDe) : '—', tone: 'amber' },
    {
      label: 'Prof',
      value: summary.count ? `${summary.profitable ?? 0}/${summary.count}` : '—',
      tone: 'blue',
    },
  ];

  return (
    <div className="sec-mega-panel">
      <div className="sec-mega-kpis" role="group" aria-label="Mega-cap averages">
        {kpis.map((k) => (
          <div key={k.label} className={`sec-mega-kpi sec-mega-kpi--${k.tone}`}>
            <span className="sec-mega-kpi-label">{k.label}</span>
            <span className="sec-mega-kpi-value">{k.value}</span>
          </div>
        ))}
      </div>

      <div className="sec-mega-grid" role="table" aria-label="SEC mega-cap fundamentals">
        <div className="sec-mega-head" role="row">
          {COLS.map((c) => (
            <div key={c.key} className={`sec-mega-cell ${c.cls}`} role="columnheader">
              {c.label}
            </div>
          ))}
        </div>

        <div className="sec-mega-body">
          {sorted.map((row) => {
            const isOpen = expanded === row.ticker;
            const fy =
              row.period != null
                ? String(row.period).replace(/^20/, '')
                : '—';

            return (
              <div key={row.ticker} className={`sec-mega-entry${isOpen ? ' is-open' : ''}`}>
                <div
                  className="sec-mega-row"
                  role="row"
                  tabIndex={0}
                  onClick={() => setExpanded(isOpen ? null : row.ticker)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setExpanded(isOpen ? null : row.ticker);
                    }
                  }}
                >
                  <div className="sec-mega-cell c-tkr" role="cell">
                    <strong>{row.ticker}</strong>
                  </div>
                  <div className="sec-mega-cell c-fy sec-muted" role="cell">
                    {fy}
                  </div>
                  <div className="sec-mega-cell c-num" role="cell">
                    {fmtBn(row.revenue)}
                  </div>
                  <div
                    className="sec-mega-cell c-num"
                    role="cell"
                    style={{ color: heatPos(row.netIncome) }}
                  >
                    {fmtBn(row.netIncome)}
                  </div>
                  <div
                    className="sec-mega-cell c-num sec-emph"
                    role="cell"
                    style={{ color: heatMargin(row.margin) }}
                  >
                    {fmtPct(row.margin, 0)}
                  </div>
                  <div
                    className="sec-mega-cell c-num sec-emph"
                    role="cell"
                    style={{ color: (row.roe ?? 0) >= 20 ? '#22c55e' : undefined }}
                  >
                    {fmtPct(row.roe, 0)}
                  </div>
                  <div
                    className="sec-mega-cell c-num c-opt"
                    role="cell"
                    style={{ color: heatPos(row.revGrowth) }}
                  >
                    {fmtPct(row.revGrowth, 0, true)}
                  </div>
                  <div
                    className="sec-mega-cell c-num"
                    role="cell"
                    style={{ color: (row.debtToEquity ?? 0) > 3 ? '#f87171' : undefined }}
                  >
                    {fmtX(row.debtToEquity)}
                  </div>
                  <div
                    className="sec-mega-cell c-num c-opt"
                    role="cell"
                    style={{ color: heatPos(row.fcf) }}
                  >
                    {fmtBn(row.fcf)}
                  </div>
                  <div className={`sec-mega-cell c-grd ${gradeClass(row.quality)}`} role="cell">
                    {row.quality || '—'}
                  </div>
                </div>

                {isOpen && (
                  <div className="sec-mega-detail" role="row">
                    <div className="sec-mega-detail-item">
                      <span>Op mrg</span>
                      <strong style={{ color: heatMargin(row.operatingMargin) }}>
                        {fmtPct(row.operatingMargin, 1)}
                      </strong>
                    </div>
                    <div className="sec-mega-detail-item">
                      <span>ROA</span>
                      <strong>{fmtPct(row.roa, 1)}</strong>
                    </div>
                    <div className="sec-mega-detail-item">
                      <span>NI gr</span>
                      <strong style={{ color: heatPos(row.niGrowth) }}>
                        {fmtPct(row.niGrowth, 1, true)}
                      </strong>
                    </div>
                    <div className="sec-mega-detail-item">
                      <span>Curr</span>
                      <strong>{fmtX(row.currentRatio, 2)}</strong>
                    </div>
                    <div className="sec-mega-detail-item">
                      <span>R&amp;D</span>
                      <strong>{fmtPct(row.rdIntensity, 1)}</strong>
                    </div>
                    <div className="sec-mega-detail-item">
                      <span>FCF mrg</span>
                      <strong>{fmtPct(row.fcfMargin, 1)}</strong>
                    </div>
                    <div className="sec-mega-detail-item">
                      <span>P/E</span>
                      <strong>{row.pe != null ? fmtX(row.pe, 1) : '—'}</strong>
                    </div>
                    <div className="sec-mega-detail-item">
                      <span>P/B</span>
                      <strong>{row.pbRatio != null ? fmtX(row.pbRatio, 1) : '—'}</strong>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="sec-mega-footer">
        SEC EDGAR XBRL · click row · grade A–F (margin / ROE / growth / FCF / leverage)
      </div>
    </div>
  );
}
