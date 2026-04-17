import React, { useMemo } from 'react';

const SERIES_ORDER = ['unemployment', 'laborParticipation', 'employmentPop', 'nonfarmPayrolls', 'avgHourlyEarnings', 'avgWeeklyHours', 'cpi', 'ppi', 'jobOpenings', 'unemployedPersons'];

const FORMAT = {
  unemployment: v => v?.toFixed(1),
  laborParticipation: v => v?.toFixed(1),
  employmentPop: v => v?.toFixed(1),
  nonfarmPayrolls: v => v != null ? (v >= 1000 ? `${(v / 1000).toFixed(1)}M` : v.toLocaleString()) : '—',
  avgHourlyEarnings: v => v != null ? `$${v.toFixed(2)}` : '—',
  avgWeeklyHours: v => v?.toFixed(1),
  cpi: v => v?.toFixed(1),
  ppi: v => v?.toFixed(1),
  jobOpenings: v => v != null ? `${(v / 1000).toFixed(1)}M` : '—',
  unemployedPersons: v => v != null ? `${(v / 1000).toFixed(1)}M` : '—',
};

const CHANGE_COLORS = {
  unemployment: v => v > 0 ? 'negative' : 'positive',
  laborParticipation: v => v > 0 ? 'positive' : 'negative',
  employmentPop: v => v > 0 ? 'positive' : 'negative',
  nonfarmPayrolls: v => v > 0 ? 'positive' : 'negative',
  avgHourlyEarnings: v => v > 0 ? 'negative' : 'positive',
  avgWeeklyHours: v => v > 0 ? 'positive' : 'negative',
  cpi: v => v > 0 ? 'negative' : 'positive',
  ppi: v => v > 0 ? 'negative' : 'positive',
  jobOpenings: v => v > 0 ? 'positive' : 'negative',
  unemployedPersons: v => v > 0 ? 'negative' : 'positive',
};

function computeChange(key, series) {
  if (!series?.latest?.value || !series?.previous?.value) return null;
  const diff = series.latest.value - series.previous.value;
  const pct = series.previous.value !== 0 ? (diff / Math.abs(series.previous.value)) * 100 : 0;
  const isAbsolute = ['nonfarmPayrolls', 'jobOpenings', 'unemployedPersons'].includes(key);
  if (isAbsolute) {
    const v = diff >= 1000 ? `${(diff / 1000).toFixed(0)}K` : diff.toFixed(0);
    return { diff: v, pct: pct.toFixed(1), direction: diff >= 0 ? '+' : '' };
  }
  return { diff: null, pct: pct.toFixed(1), direction: diff >= 0 ? '+' : '' };
}

function MiniSparkline({ data, width = 200, height = 60, color = '#42a5f5' }) {
  if (!data?.values?.length) return null;
  const vals = data.values.filter(v => v != null);
  if (vals.length < 2) return null;
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

export default function BlsDashboard({ series, isLive }) {
  const kpiData = useMemo(() => {
    return SERIES_ORDER
      .map(key => {
        const s = series[key];
        if (!s?._source) return null;
        const change = computeChange(key, s);
        const changeClass = change ? CHANGE_COLORS[key]?.(parseFloat(change.pct)) || 'negative' : '';
        return { key, ...s, change, changeClass };
      })
      .filter(Boolean);
  }, [series]);

  const chartSeries = useMemo(() => {
    return SERIES_ORDER
      .filter(key => series[key]?._source && series[key]?.history?.values?.length >= 3)
      .map(key => ({ key, ...series[key] }));
  }, [series]);

  if (!isLive && kpiData.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted, #888)' }}>
        Data source temporarily unavailable
      </div>
    );
  }

  return (
    <div className="bls-dashboard">
      <div className="bls-section-title">Key Labor Market Indicators</div>
      <div className="bls-kpi-grid">
        {kpiData.map(k => (
          <div key={k.key} className="bls-kpi-card">
            <span className="bls-kpi-label">{k.label}</span>
            <span className="bls-kpi-value">
              {FORMAT[k.key]?.(k.latest?.value) ?? '—'}
              {k.unit && k.unit !== '%' && k.unit !== '$' && k.unit !== 'index' && <span className="bls-kpi-unit"> {k.unit}</span>}
            </span>
            {k.change && (
              <span className={`bls-kpi-change ${k.changeClass}`}>
                {k.change.direction}{k.change.pct}%
                {k.change.diff !== null && ` (${k.change.direction}${k.change.diff})`}
              </span>
            )}
            <span className="bls-kpi-unit">{k.latest?.period} {k.latest?.year}</span>
          </div>
        ))}
      </div>

      <div className="bls-section-title">Trends (3-Year)</div>
      <div className="bls-chart-row">
        {chartSeries.slice(0, Math.ceil(chartSeries.length / 2)).map(cs => (
          <div key={cs.key} className="bls-mini-chart">
            <h4>{cs.label} ({cs.unit})</h4>
            <MiniSparkline data={cs.history} color={cs.key === 'unemployment' ? '#ef5350' : '#42a5f5'} />
          </div>
        ))}
      </div>
      <div className="bls-chart-row">
        {chartSeries.slice(Math.ceil(chartSeries.length / 2)).map(cs => (
          <div key={cs.key} className="bls-mini-chart">
            <h4>{cs.label} ({cs.unit})</h4>
            <MiniSparkline data={cs.history} color={cs.key === 'cpi' || cs.key === 'ppi' ? '#ffa726' : '#66bb6a'} />
          </div>
        ))}
      </div>
    </div>
  );
}