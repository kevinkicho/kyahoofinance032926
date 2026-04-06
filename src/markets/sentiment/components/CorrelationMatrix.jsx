// src/markets/sentiment/components/CorrelationMatrix.jsx
import React, { useMemo } from 'react';
import { useTheme } from '../../../hub/ThemeContext';
import './SentimentComponents.css';

function pearson(x, y) {
  const n = Math.min(x.length, y.length);
  if (n < 10) return null;
  const xs = x.slice(-n), ys = y.slice(-n);
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const xd = xs[i] - mx, yd = ys[i] - my;
    num += xd * yd;
    dx += xd * xd;
    dy += yd * yd;
  }
  const denom = Math.sqrt(dx * dy);
  return denom === 0 ? 0 : Math.round((num / denom) * 100) / 100;
}

function corrColor(v) {
  if (v == null) return 'transparent';
  if (v >= 0.7) return 'rgba(52,211,153,0.8)';
  if (v >= 0.3) return 'rgba(52,211,153,0.4)';
  if (v > -0.3) return 'rgba(148,163,184,0.2)';
  if (v > -0.7) return 'rgba(248,113,113,0.4)';
  return 'rgba(248,113,113,0.8)';
}

export default function CorrelationMatrix({ returnsData }) {
  const { colors } = useTheme();
  const assets = returnsData?.assets ?? [];

  const { labels, matrix, kpi } = useMemo(() => {
    const withData = assets.filter(a => a.dailyReturns?.length >= 10);
    const labels = withData.map(a => a.label);
    const n = withData.length;
    const matrix = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) =>
        i === j ? 1.0 : pearson(withData[i].dailyReturns, withData[j].dailyReturns)
      )
    );

    // Find most correlated and most inversely correlated pairs
    let maxCorr = -2, minCorr = 2, maxPair = '', minPair = '';
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const v = matrix[i][j];
        if (v == null) continue;
        if (v > maxCorr) { maxCorr = v; maxPair = `${labels[i]} / ${labels[j]}`; }
        if (v < minCorr) { minCorr = v; minPair = `${labels[i]} / ${labels[j]}`; }
      }
    }
    return {
      labels,
      matrix,
      kpi: n >= 2 ? { maxCorr, maxPair, minCorr, minPair, count: n, period: withData[0]?.dailyReturns?.length ?? 0 } : null,
    };
  }, [assets]);

  if (!labels.length) return <div className="sent-panel"><p style={{ color: colors.textMuted }}>No correlation data available</p></div>;

  return (
    <div className="sent-panel">
      <div className="sent-panel-header">
        <span className="sent-panel-title">Cross-Asset Correlation Matrix</span>
        <span className="sent-panel-subtitle">Pearson correlation on daily returns ({kpi?.period ?? '~90'} trading days)</span>
      </div>

      {kpi && (
        <div className="sent-kpi-strip">
          <div className="sent-kpi-pill">
            <span className="sent-kpi-label">Most Correlated</span>
            <span className="sent-kpi-value" style={{ color: '#34d399' }}>{kpi.maxCorr.toFixed(2)}</span>
            <span className="sent-kpi-sub">{kpi.maxPair}</span>
          </div>
          <div className="sent-kpi-pill">
            <span className="sent-kpi-label">Most Inverse</span>
            <span className="sent-kpi-value" style={{ color: '#f87171' }}>{kpi.minCorr.toFixed(2)}</span>
            <span className="sent-kpi-sub">{kpi.minPair}</span>
          </div>
          <div className="sent-kpi-pill">
            <span className="sent-kpi-label">Assets</span>
            <span className="sent-kpi-value">{kpi.count}</span>
            <span className="sent-kpi-sub">cross-asset pairs</span>
          </div>
          <div className="sent-kpi-pill">
            <span className="sent-kpi-label">Window</span>
            <span className="sent-kpi-value">{kpi.period}d</span>
            <span className="sent-kpi-sub">daily returns</span>
          </div>
        </div>
      )}

      <div className="sent-scroll" style={{ overflow: 'auto' }}>
        <table className="sent-table" style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th className="sent-th" style={{ position: 'sticky', left: 0, background: 'var(--bg-card)', zIndex: 1 }}></th>
              {labels.map(l => (
                <th key={l} className="sent-th" style={{ fontSize: 10, padding: '4px 6px', whiteSpace: 'nowrap' }}>{l}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {labels.map((row, i) => (
              <tr key={row}>
                <td className="sent-td" style={{ fontWeight: 600, fontSize: 10, whiteSpace: 'nowrap', position: 'sticky', left: 0, background: 'var(--bg-card)', zIndex: 1 }}>
                  {row}
                </td>
                {labels.map((col, j) => {
                  const v = matrix[i][j];
                  return (
                    <td
                      key={col}
                      className="sent-td"
                      style={{
                        textAlign: 'center',
                        fontSize: 11,
                        fontWeight: i === j ? 700 : 400,
                        background: corrColor(v),
                        padding: '5px 8px',
                        color: colors.text,
                      }}
                    >
                      {v != null ? v.toFixed(2) : '—'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="sent-panel-footer">
        Pearson r on daily % returns. Green = positive correlation, Red = negative. Data: Yahoo Finance
      </div>
    </div>
  );
}
