import React, { useMemo } from 'react';
import MetricValue from '../../../components/MetricValue/MetricValue';
import './EquitiesDeepDiveDashboard.css';

function fmtPct(v, digits = 2) {
  if (v == null || !Number.isFinite(Number(v))) return '—';
  const n = Number(v);
  return `${n >= 0 ? '+' : ''}${n.toFixed(digits)}%`;
}

function sectorChange(s) {
  return s?.change ?? s?.perf1m ?? s?.perf1w ?? s?.perf1d ?? null;
}

function factorScore(f) {
  const v = f?.return ?? f?.value ?? f?.score;
  return v != null && Number.isFinite(Number(v)) ? Number(v) : null;
}

export default function EquitiesDeepDiveSidebar({
  sectorData,
  factorData,
  earningsData,
  shortData,
  lastUpdated,
}) {
  const sectors = useMemo(() => {
    const list = Array.isArray(sectorData) ? sectorData : [];
    return [...list]
      .map(s => ({ ...s, _change: sectorChange(s) }))
      .filter(s => s._change != null || s.name)
      .sort((a, b) => (Number(b._change) || -999) - (Number(a._change) || -999))
      .slice(0, 11);
  }, [sectorData]);

  const factors = useMemo(() => {
    const list = Array.isArray(factorData) ? factorData : [];
    return [...list]
      .map(f => ({ ...f, _score: factorScore(f) }))
      .sort((a, b) => (Number(b._score) || -999) - (Number(a._score) || -999));
  }, [factorData]);

  const maxAbsSector = useMemo(() => {
    const m = Math.max(...sectors.map(s => Math.abs(Number(s._change) || 0)), 0.01);
    return m;
  }, [sectors]);

  const bestSector = sectors[0];
  const worstSector = sectors.length ? sectors[sectors.length - 1] : null;
  const topFactor = factors[0];
  const avgSurprise = earningsData?.avgSurprise;
  const shortPct = shortData?.aggregateShortPct;

  if (!sectors.length && !factors.length && avgSurprise == null && shortPct == null) {
    return (
      <div className="eqd-summary eqd-summary-empty">
        No Equity+ summary data available
      </div>
    );
  }

  return (
    <div className="eqd-summary">
      {/* Snapshot highlight cards */}
      <div className="eqd-summary-highlights">
        <div className="eqd-summary-hi-card eqd-summary-hi-card--pos">
          <span className="eqd-summary-hi-label">Best sector</span>
          <strong className="eqd-summary-hi-value">
            {bestSector?.name || '—'}
          </strong>
          <span className="eqd-summary-hi-sub eqd-pos">
            {fmtPct(bestSector?._change)}
          </span>
        </div>
        <div className="eqd-summary-hi-card eqd-summary-hi-card--neg">
          <span className="eqd-summary-hi-label">Worst sector</span>
          <strong className="eqd-summary-hi-value">
            {worstSector?.name || '—'}
          </strong>
          <span className="eqd-summary-hi-sub eqd-neg">
            {fmtPct(worstSector?._change)}
          </span>
        </div>
        <div className="eqd-summary-hi-card eqd-summary-hi-card--accent">
          <span className="eqd-summary-hi-label">Top factor</span>
          <strong className="eqd-summary-hi-value">
            {topFactor?.name || '—'}
          </strong>
          <span className="eqd-summary-hi-sub">
            {topFactor?._score != null ? topFactor._score.toFixed(1) : '—'}
          </span>
        </div>
        <div className={`eqd-summary-hi-card ${Number(avgSurprise) >= 0 ? 'eqd-summary-hi-card--pos' : 'eqd-summary-hi-card--neg'}`}>
          <span className="eqd-summary-hi-label">Avg surprise</span>
          <strong className="eqd-summary-hi-value">
            <MetricValue
              value={avgSurprise}
              format={v => (v != null ? fmtPct(v) : '—')}
              seriesKey="earnings-surprise"
              timestamp={lastUpdated}
            />
          </strong>
          <span className="eqd-summary-hi-sub">Earnings</span>
        </div>
        <div className={`eqd-summary-hi-card ${Number(shortPct) > 5 ? 'eqd-summary-hi-card--neg' : 'eqd-summary-hi-card--pos'}`}>
          <span className="eqd-summary-hi-label">Short interest</span>
          <strong className="eqd-summary-hi-value">
            <MetricValue
              value={shortPct}
              format={v => (v != null ? `${Number(v).toFixed(2)}%` : '—')}
              seriesKey="short-interest"
              timestamp={lastUpdated}
            />
          </strong>
          <span className="eqd-summary-hi-sub">Aggregate</span>
        </div>
      </div>

      {/* Sector performance card */}
      {sectors.length > 0 && (
        <div className="eqd-summary-card">
          <div className="eqd-summary-card-head">
            <span className="eqd-summary-card-title">Sector Performance</span>
            <span className="eqd-summary-card-meta">{sectors.length} sectors</span>
          </div>
          <div className="eqd-summary-list">
            {sectors.map(s => {
              const ch = Number(s._change);
              const pos = Number.isFinite(ch) ? ch >= 0 : true;
              const pct = Number.isFinite(ch) ? (Math.abs(ch) / maxAbsSector) * 50 : 0;
              return (
                <div key={s.name || s.code} className="eqd-summary-row">
                  <span className="eqd-summary-row-label" title={s.name}>
                    {s.code && s.code !== s.name ? (
                      <>
                        <span className="eqd-summary-ticker">{s.code}</span>
                        <span className="eqd-summary-name">{s.name}</span>
                      </>
                    ) : (
                      s.name
                    )}
                  </span>
                  <div className="eqd-summary-bar-wrap">
                    <div className="eqd-summary-bar-center" />
                    <div
                      className={`eqd-summary-bar-fill ${pos ? 'is-pos' : 'is-neg'}`}
                      style={{
                        width: `${pct}%`,
                        left: pos ? '50%' : `${50 - pct}%`,
                      }}
                    />
                  </div>
                  <span className={`eqd-summary-row-val ${pos ? 'eqd-pos' : 'eqd-neg'}`}>
                    <MetricValue
                      value={s._change}
                      format={v => (v != null ? fmtPct(v) : '—')}
                      seriesKey={`sector-${s.name}`}
                      timestamp={lastUpdated}
                    />
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Factor returns card */}
      {factors.length > 0 && (
        <div className="eqd-summary-card">
          <div className="eqd-summary-card-head">
            <span className="eqd-summary-card-title">Factor Scores</span>
            <span className="eqd-summary-card-meta">0–100 composite</span>
          </div>
          <div className="eqd-summary-list">
            {factors.map(f => {
              const score = f._score;
              const width = score != null ? Math.max(0, Math.min(100, score)) : 0;
              const tone = score == null ? 'muted' : score >= 60 ? 'pos' : score >= 40 ? 'warn' : 'neg';
              return (
                <div key={f.name} className="eqd-summary-row eqd-summary-row--factor">
                  <span className="eqd-summary-row-label">{f.name}</span>
                  <div className="eqd-summary-score-track">
                    <div
                      className={`eqd-summary-score-fill is-${tone}`}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                  <span className={`eqd-summary-row-val is-${tone}`}>
                    <MetricValue
                      value={score}
                      format={v => (v != null ? Number(v).toFixed(1) : '—')}
                      seriesKey={`factor-${f.name}`}
                      timestamp={lastUpdated}
                    />
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
