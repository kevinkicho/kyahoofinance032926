import React, { useMemo } from 'react';
import './InsComponents.css';

function spreadClass(spread) {
  if (spread > 700) return 'ins-spread-high';
  if (spread >= 500) return 'ins-spread-mid';
  return 'ins-spread-low';
}

export default function CatBondSpreads({ catBondSpreads, catBondProxy }) {
  const stats = useMemo(() => {
    const avgSpread = catBondSpreads.reduce((s, b) => s + b.spread, 0) / catBondSpreads.length;
    const highest = catBondSpreads.reduce((a, b) => b.spread > a.spread ? b : a);
    const totalNotional = catBondSpreads.reduce((s, b) => s + b.notional, 0);
    const avgEL = catBondSpreads.reduce((s, b) => s + b.expectedLoss, 0) / catBondSpreads.length;

    // Avg spread by peril
    const perilMap = {};
    catBondSpreads.forEach(b => {
      if (!perilMap[b.peril]) perilMap[b.peril] = { sum: 0, count: 0 };
      perilMap[b.peril].sum += b.spread;
      perilMap[b.peril].count += 1;
    });
    const perilBars = Object.entries(perilMap)
      .map(([peril, { sum, count }]) => ({ peril, avg: Math.round(sum / count) }))
      .sort((a, b) => b.avg - a.avg);
    const maxPerilSpread = perilBars[0]?.avg ?? 1;

    return { avgSpread, highest, totalNotional, avgEL, perilBars, maxPerilSpread };
  }, [catBondSpreads]);

  return (
    <div className="ins-panel">
      <div className="ins-panel-header">
        <span className="ins-panel-title">Cat Bond Spreads</span>
        <span className="ins-panel-subtitle">Catastrophe bond market · spread over risk-free rate (bps)</span>
      </div>

      {/* KPI Strip */}
      <div className="ins-kpi-strip">
        <div className="ins-kpi-pill">
          <span className="ins-kpi-label">Avg Spread</span>
          <span className="ins-kpi-value accent">{Math.round(stats.avgSpread)} bps</span>
        </div>
        <div className="ins-kpi-pill">
          <span className="ins-kpi-label">Highest Spread</span>
          <span className="ins-kpi-value" style={{ color: '#ef4444' }}>{stats.highest.spread} bps</span>
          <span className="ins-kpi-sub">{stats.highest.name}</span>
        </div>
        <div className="ins-kpi-pill">
          <span className="ins-kpi-label">Total Notional</span>
          <span className="ins-kpi-value">${stats.totalNotional.toLocaleString()}M</span>
        </div>
        <div className="ins-kpi-pill">
          <span className="ins-kpi-label">Avg Expected Loss</span>
          <span className="ins-kpi-value">{stats.avgEL.toFixed(1)}%</span>
        </div>
        {catBondProxy && (
          <div className="ins-kpi-pill">
            <span className="ins-kpi-label">ILS Proxy ({catBondProxy.ticker})</span>
            <span className="ins-kpi-value">${catBondProxy.price?.toFixed(2)}</span>
            <span className="ins-kpi-sub" style={{ color: catBondProxy.changePct >= 0 ? '#22c55e' : '#ef4444' }}>
              {catBondProxy.changePct >= 0 ? '+' : ''}{catBondProxy.changePct?.toFixed(2)}%
            </span>
          </div>
        )}
      </div>

      {/* Main: table (wide) + spread by peril (narrow) */}
      <div className="ins-wide-narrow">
        <div className="ins-scroll">
          <table className="ins-table">
            <thead>
              <tr>
                <th className="ins-th">Bond</th>
                <th className="ins-th">Peril</th>
                <th className="ins-th">Sponsor</th>
                <th className="ins-th">Spread (bps)</th>
                <th className="ins-th">Rating</th>
                <th className="ins-th">Trigger</th>
                <th className="ins-th">Maturity</th>
                <th className="ins-th">Notional ($M)</th>
                <th className="ins-th">Expected Loss %</th>
              </tr>
            </thead>
            <tbody>
              {catBondSpreads.map((row, i) => (
                <tr key={i} className="ins-row">
                  <td className="ins-cell">{row.name}</td>
                  <td className="ins-cell">{row.peril}</td>
                  <td className="ins-cell">{row.sponsor}</td>
                  <td className={`ins-cell ${spreadClass(row.spread)}`}>{row.spread}</td>
                  <td className="ins-cell">{row.rating}</td>
                  <td className="ins-cell">{row.trigger}</td>
                  <td className="ins-cell">{row.maturity}</td>
                  <td className="ins-cell">{row.notional}</td>
                  <td className="ins-cell">{row.expectedLoss.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="ins-chart-panel">
          <div className="ins-chart-title">Avg Spread by Peril (bps)</div>
          <div className="ins-bar-list" style={{ marginTop: 4 }}>
            {stats.perilBars.map(({ peril, avg }) => {
              const pct = (avg / stats.maxPerilSpread) * 100;
              const color = avg > 700 ? '#ef4444' : avg >= 500 ? '#f59e0b' : '#0ea5e9';
              return (
                <div key={peril} className="ins-bar-row">
                  <span className="ins-bar-name">{peril}</span>
                  <div className="ins-bar-wrap">
                    <div className="ins-bar-fill" style={{ width: `${pct}%`, background: color }} />
                  </div>
                  <span className="ins-bar-val" style={{ color }}>{avg}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="ins-panel-footer">
        bps = basis points above risk-free · Indemnity = actual losses trigger · Parametric = index/model trigger
      </div>
    </div>
  );
}
