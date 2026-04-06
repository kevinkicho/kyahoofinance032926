// src/markets/derivatives/components/OptionsFlow.jsx
import React, { useMemo } from 'react';
import './DerivComponents.css';

function fmtVolume(v) {
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
  return String(v);
}

export default function OptionsFlow({ optionsFlow }) {
  const stats = useMemo(() => {
    const calls = optionsFlow.filter(r => r.type === 'C');
    const puts = optionsFlow.filter(r => r.type === 'P');
    const totalVol = optionsFlow.reduce((s, r) => s + r.volume, 0);
    const callVol = calls.reduce((s, r) => s + r.volume, 0);
    const putVol = puts.reduce((s, r) => s + r.volume, 0);
    const pcRatio = callVol > 0 ? Math.round((putVol / callVol) * 100) / 100 : null;
    const topTicker = optionsFlow.length ? optionsFlow.reduce((a, b) => b.volume > a.volume ? b : a).ticker : '—';
    const avgVolOI = optionsFlow.length
      ? Math.round(optionsFlow.reduce((s, r) => s + (r.openInterest > 0 ? r.volume / r.openInterest : 0), 0) / optionsFlow.length * 100) / 100
      : 0;
    const bullish = optionsFlow.filter(r => r.sentiment === 'bullish').length;
    const bearish = optionsFlow.filter(r => r.sentiment === 'bearish').length;
    const neutral = optionsFlow.filter(r => r.sentiment === 'neutral').length;
    return { totalVol, callVol, putVol, pcRatio, topTicker, avgVolOI, bullish, bearish, neutral };
  }, [optionsFlow]);

  return (
    <div className="deriv-panel">
      <div className="deriv-panel-header">
        <span className="deriv-panel-title">Options Flow</span>
        <span className="deriv-panel-subtitle">Unusual options activity · sorted by volume</span>
      </div>

      {/* KPI Strip */}
      <div className="deriv-kpi-strip">
        <div className="deriv-kpi-pill">
          <span className="deriv-kpi-label">Total Volume</span>
          <span className="deriv-kpi-value accent">{fmtVolume(stats.totalVol)}</span>
        </div>
        <div className="deriv-kpi-pill">
          <span className="deriv-kpi-label">Put/Call Ratio</span>
          <span className={`deriv-kpi-value ${stats.pcRatio != null ? (stats.pcRatio > 1 ? 'negative' : 'positive') : ''}`}>
            {stats.pcRatio != null ? stats.pcRatio.toFixed(2) : '—'}
          </span>
          <span className="deriv-kpi-sub">{stats.pcRatio != null ? (stats.pcRatio > 1 ? 'put-heavy' : 'call-heavy') : ''}</span>
        </div>
        <div className="deriv-kpi-pill">
          <span className="deriv-kpi-label">Top Ticker</span>
          <span className="deriv-kpi-value accent">{stats.topTicker}</span>
        </div>
        <div className="deriv-kpi-pill">
          <span className="deriv-kpi-label">Avg Vol/OI</span>
          <span className="deriv-kpi-value">{stats.avgVolOI.toFixed(2)}</span>
          <span className="deriv-kpi-sub">&gt;1 = unusual</span>
        </div>
      </div>

      {/* Table */}
      <div className="flow-scroll">
        <table className="flow-table">
          <thead>
            <tr>
              <th className="flow-th">Ticker</th>
              <th className="flow-th">Strike</th>
              <th className="flow-th">Expiry</th>
              <th className="flow-th">C/P</th>
              <th className="flow-th">Volume</th>
              <th className="flow-th">OI</th>
              <th className="flow-th">Vol/OI</th>
              <th className="flow-th">Premium</th>
              <th className="flow-th">Sentiment</th>
            </tr>
          </thead>
          <tbody>
            {optionsFlow.map((row, i) => {
              const volOI = row.openInterest > 0
                ? (row.volume / row.openInterest).toFixed(2)
                : '—';
              return (
                <tr key={i} className="flow-row">
                  <td className="flow-cell">{row.ticker}</td>
                  <td className="flow-cell">${row.strike}</td>
                  <td className="flow-cell">{row.expiry}</td>
                  <td className={`flow-cell ${row.type === 'C' ? 'flow-call' : 'flow-put'}`}>
                    {row.type}
                  </td>
                  <td className="flow-cell">{fmtVolume(row.volume)}</td>
                  <td className="flow-cell">{fmtVolume(row.openInterest)}</td>
                  <td className="flow-cell">{volOI}</td>
                  <td className="flow-cell">${row.premium.toFixed(2)}</td>
                  <td className={`flow-cell flow-${row.sentiment}`}>{row.sentiment}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Call vs Put summary */}
      <div className="deriv-chart-panel" style={{ flexShrink: 0, marginTop: 12 }}>
        <div className="deriv-chart-title">Call vs Put Volume + Sentiment Breakdown</div>
        <div className="deriv-summary-row">
          <div className="deriv-summary-item">
            <span className="deriv-summary-label">Call Volume</span>
            <span className="deriv-summary-value call">{fmtVolume(stats.callVol)}</span>
          </div>
          <div className="deriv-summary-divider" />
          <div className="deriv-summary-item">
            <span className="deriv-summary-label">Put Volume</span>
            <span className="deriv-summary-value put">{fmtVolume(stats.putVol)}</span>
          </div>
          <div className="deriv-summary-divider" />
          <div className="deriv-summary-item">
            <span className="deriv-summary-label">Bullish</span>
            <span className="deriv-summary-value call">{stats.bullish}</span>
          </div>
          <div className="deriv-summary-divider" />
          <div className="deriv-summary-item">
            <span className="deriv-summary-label">Bearish</span>
            <span className="deriv-summary-value put">{stats.bearish}</span>
          </div>
          {stats.neutral > 0 && (
            <>
              <div className="deriv-summary-divider" />
              <div className="deriv-summary-item">
                <span className="deriv-summary-label">Neutral</span>
                <span className="deriv-summary-value" style={{ color: 'var(--text-secondary)' }}>{stats.neutral}</span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="deriv-panel-footer">
        Vol/OI &gt; 1 = volume exceeds open interest (unusual activity) · C = call · P = put
      </div>
    </div>
  );
}
