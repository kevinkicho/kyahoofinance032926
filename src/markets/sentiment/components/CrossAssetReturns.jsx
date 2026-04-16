// src/markets/sentiment/components/CrossAssetReturns.jsx
import React, { useMemo } from 'react';
import { useTheme } from '../../../hub/ThemeContext';
import MetricValue from '../../../components/MetricValue/MetricValue';
import './SentimentComponents.css';

function retColor(v, cardBg = '#1e293b') {
  if (v == null) return cardBg;
  if (v >  5)  return 'rgba(124,58,237,0.85)';
  if (v >  2)  return 'rgba(52,211,153,0.75)';
  if (v >  0)  return 'rgba(52,211,153,0.35)';
  if (v > -2)  return 'rgba(248,113,113,0.35)';
  if (v > -5)  return 'rgba(248,113,113,0.65)';
  return 'rgba(239,68,68,0.85)';
}

function fmtRet(v) {
  if (v == null) return '—';
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
}

const CATEGORY_ORDER = ['US Equity', 'Global', 'Fixed Income', 'Real Assets', 'Crypto'];

export default function CrossAssetReturns({ returnsData }) {
  if (!returnsData) return null;
  const { colors } = useTheme();
  const { assets = [], asOf } = returnsData;

  // Group by category in defined order
  const grouped = CATEGORY_ORDER.map(cat => ({
    category: cat,
    assets: assets.filter(a => a.category === cat),
  })).filter(g => g.assets.length > 0);

  const kpi = useMemo(() => {
    const with1m = assets.filter(a => a.ret1m != null);
    const with1d = assets.filter(a => a.ret1d != null);
    if (!with1m.length) return null;
    const best1m = with1m.reduce((a, b) => (b.ret1m > a.ret1m ? b : a), with1m[0]);
    const worst1m = with1m.reduce((a, b) => (b.ret1m < a.ret1m ? b : a), with1m[0]);
    const best1d = with1d.length
      ? with1d.reduce((a, b) => (b.ret1d > a.ret1d ? b : a), with1d[0])
      : null;
    const pos1mCount = with1m.filter(a => a.ret1m > 0).length;
    return { best1m, worst1m, best1d, pos1mCount, total: with1m.length };
  }, [assets]);

  return (
    <div className="sent-panel">
      <div className="sent-panel-header">
        <span className="sent-panel-title">Cross-Asset Returns</span>
        <span className="sent-panel-subtitle">
          Total return by timeframe · Yahoo Finance
          {asOf && <> · as of {asOf}</>}
        </span>
      </div>
      {kpi && (
        <div className="sent-kpi-strip">
          <div className="sent-kpi-pill">
            <span className="sent-kpi-label">Best 1M</span>
            <span className="sent-kpi-value accent">
              {kpi.best1m.label} {kpi.best1m.ret1m >= 0 ? '+' : ''}{kpi.best1m.ret1m.toFixed(2)}%
            </span>
          </div>
          <div className="sent-kpi-pill">
            <span className="sent-kpi-label">Worst 1M</span>
            <span className="sent-kpi-value">{kpi.worst1m.label} {kpi.worst1m.ret1m.toFixed(2)}%</span>
          </div>
          {kpi.best1d && (
            <div className="sent-kpi-pill">
              <span className="sent-kpi-label">Best 1D</span>
              <span className="sent-kpi-value">
                {kpi.best1d.label} {kpi.best1d.ret1d >= 0 ? '+' : ''}{kpi.best1d.ret1d.toFixed(2)}%
              </span>
            </div>
          )}
          <div className="sent-kpi-pill">
            <span className="sent-kpi-label"># Positive 1M</span>
            <span className="sent-kpi-value">{kpi.pos1mCount}/{kpi.total}</span>
          </div>
        </div>
      )}
      <div className="sent-scroll">
        <table className="sent-returns-table">
          <thead>
            <tr>
              <th className="sent-returns-th" style={{ textAlign: 'left' }}>Asset</th>
              <th className="sent-returns-th">1 Day</th>
              <th className="sent-returns-th">1 Week</th>
              <th className="sent-returns-th">1 Month</th>
              <th className="sent-returns-th">3 Month</th>
            </tr>
          </thead>
          <tbody>
            {grouped.map(({ category, assets: catAssets }) => (
              <React.Fragment key={category}>
                <tr className="sent-category-sep">
                  <td colSpan={5}>{category}</td>
                </tr>
                {catAssets.map(a => (
                  <tr key={a.ticker} className="sent-returns-row">
                    <td className="sent-returns-td">
                      <strong>{a.label}</strong>
                      <span style={{ fontSize: 9, color: colors.textMuted, marginLeft: 6 }}>{a.ticker}</span>
                    </td>
                    {[a.ret1d, a.ret1w, a.ret1m, a.ret3m].map((v, i) => (
                      <td
                        key={i}
                        className="sent-returns-td"
                        style={{ background: retColor(v, colors.cardBg), color: v == null ? colors.textDim : v >= 0 ? colors.text : '#fca5a5' }}
                      >
                        <MetricValue value={v} seriesKey="crossAssetReturnPct" format={v2 => v2 != null ? `${v2 >= 0 ? '+' : ''}${v2.toFixed(2)}%` : '—'} />
                      </td>
                    ))}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
