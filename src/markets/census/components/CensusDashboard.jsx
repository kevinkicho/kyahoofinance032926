import React, { useMemo } from 'react';

const SERIES_ORDER = ['housingStarts', 'buildingPermits', 'newHomeSales', 'constructionSpending', 'retailSales', 'durableGoods', 'tradeBalance'];

const FORMAT = {
  housingStarts: v => v != null ? v.toLocaleString() : '—',
  buildingPermits: v => v != null ? v.toLocaleString() : '—',
  newHomeSales: v => v != null ? v.toLocaleString() : '—',
  constructionSpending: v => v != null ? `$${(v / 1000).toFixed(0)}B` : '—',
  retailSales: v => v != null ? `$${(v / 1000).toFixed(0)}B` : '—',
  durableGoods: v => v != null ? `$${(v / 1000).toFixed(0)}B` : '—',
  tradeBalance: v => v != null ? `$${(v / 1000).toFixed(1)}B` : '—',
};

function computeChange(key, series) {
  if (!series?.latest?.value || !series?.previous?.value) return null;
  const diff = series.latest.value - series.previous.value;
  const pct = series.previous.value !== 0 ? (diff / Math.abs(series.previous.value)) * 100 : 0;
  return { pct: pct.toFixed(1), direction: diff >= 0 ? '+' : '' };
}

const CHANGE_DIRECTION = {
  housingStarts: v => v > 0 ? 'positive' : 'negative',
  buildingPermits: v => v > 0 ? 'positive' : 'negative',
  newHomeSales: v => v > 0 ? 'positive' : 'negative',
  constructionSpending: v => v > 0 ? 'positive' : 'negative',
  retailSales: v => v > 0 ? 'positive' : 'negative',
  durableGoods: v => v > 0 ? 'positive' : 'negative',
  tradeBalance: v => v > 0 ? 'positive' : 'negative',
};

function MiniSparkline({ values, width = 200, height = 60, color = '#ab47bc' }) {
  if (!values?.length || values.length < 2) return null;
  const vals = values.filter(v => v != null);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const step = width / (vals.length - 1);
  const points = vals.map((v, i) => `${i * step},${height - ((v - min) / range) * (height - 4) - 2}`).join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={points} />
    </svg>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export default function CensusDashboard({ series, isLive }) {
  const kpiData = useMemo(() => {
    return SERIES_ORDER
      .map(key => {
        const s = series[key];
        if (!s?._source) return null;
        const change = computeChange(key, s);
        const changeClass = change ? CHANGE_DIRECTION[key]?.(parseFloat(change.pct)) || 'negative' : '';
        return { key, ...s, change, changeClass };
      })
      .filter(Boolean);
  }, [series]);

  const housingKeys = ['housingStarts', 'buildingPermits', 'newHomeSales', 'constructionSpending'];
  const ecoKeys = ['retailSales', 'durableGoods', 'tradeBalance'];

  const housingSeries = useMemo(() => {
    return housingKeys.filter(key => series[key]?._source && series[key]?.history?.values?.length >= 3).map(key => ({ key, ...series[key] }));
  }, [series]);

  const ecoSeries = useMemo(() => {
    return ecoKeys.filter(key => series[key]?._source && series[key]?.history?.values?.length >= 3).map(key => ({ key, ...series[key] }));
  }, [series]);

  if (!isLive && kpiData.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted, #888)' }}>
        Data source temporarily unavailable
      </div>
    );
  }

  return (
    <div className="census-dashboard">
      <div className="census-section-title">Housing & Construction</div>
      <div className="census-kpi-grid">
        {kpiData.filter(k => housingKeys.includes(k.key)).map(k => (
          <div key={k.key} className="census-kpi-card">
            <span className="census-kpi-label">{k.label}</span>
            <span className="census-kpi-value">
              {FORMAT[k.key]?.(k.latest?.value) ?? '—'}
              {k.unit && <span className="census-kpi-unit"> {k.unit}</span>}
            </span>
            {k.change && (
              <span className={`census-kpi-change ${k.changeClass}`}>
                {k.change.direction}{k.change.pct}% MoM
              </span>
            )}
            <span className="census-kpi-unit">{formatDate(k.latest?.date)}</span>
          </div>
        ))}
      </div>

      <div className="census-section-title">Trade & Consumption</div>
      <div className="census-kpi-grid">
        {kpiData.filter(k => ecoKeys.includes(k.key)).map(k => (
          <div key={k.key} className="census-kpi-card">
            <span className="census-kpi-label">{k.label}</span>
            <span className="census-kpi-value">
              {FORMAT[k.key]?.(k.latest?.value) ?? '—'}
              {k.unit && <span className="census-kpi-unit"> {k.unit}</span>}
            </span>
            {k.change && (
              <span className={`census-kpi-change ${k.changeClass}`}>
                {k.change.direction}{k.change.pct}% MoM
              </span>
            )}
            <span className="census-kpi-unit">{formatDate(k.latest?.date)}</span>
          </div>
        ))}
      </div>

      <div className="census-section-title">Trends (3-Year Monthly)</div>
      <div className="census-chart-row">
        {housingSeries.map(cs => (
          <div key={cs.key} className="census-mini-chart">
            <h4>{cs.label} ({cs.unit})</h4>
            <MiniSparkline values={cs.history.values} color="#ab47bc" />
          </div>
        ))}
      </div>
      <div className="census-chart-row">
        {ecoSeries.map(cs => (
          <div key={cs.key} className="census-mini-chart">
            <h4>{cs.label} ({cs.unit})</h4>
            <MiniSparkline values={cs.history.values} color="#26c6da" />
          </div>
        ))}
      </div>
    </div>
  );
}