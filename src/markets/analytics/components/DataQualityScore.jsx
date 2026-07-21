import React from 'react';

function computeQualityScore(market) {
  if (!market.fetchedOn) return 0;
  if (market.isCurrent) {
    if (market.keyCount > 5) return 100;
    if (market.keyCount > 0) return 80;
    return 60;
  }
  const age = market.ageHours ?? 99;
  if (age < 24) return 50;
  if (age < 72) return 30;
  return 10;
}

function scoreColor(score) {
  if (score >= 80) return '#22c55e';
  if (score >= 50) return '#f59e0b';
  if (score >= 25) return '#f97316';
  return '#ef4444';
}

function scoreLabel(score) {
  if (score >= 80) return 'Excellent';
  if (score >= 50) return 'Fair';
  if (score >= 25) return 'Stale';
  return 'Aged';
}

export default function DataQualityScore({ markets }) {
  if (!markets || markets.length === 0) {
    return <div className="ana-empty">No market freshness data available</div>;
  }

  const scored = markets.map(m => ({
    ...m,
    score: computeQualityScore(m),
  }));

  const avgScore = Math.round(scored.reduce((s, m) => s + m.score, 0) / scored.length);
  const currentCount = scored.filter(m => m.isCurrent).length;
  const staleCount = scored.filter(m => m.fetchedOn && !m.isCurrent).length;
  const noDataCount = scored.filter(m => !m.fetchedOn).length;

  return (
    <div className="ana-dq-panel">
      <div className="ana-stat-grid-sm" style={{ marginBottom: 10 }}>
        <div className="ana-stat" style={{ padding: '8px 12px' }}>
          <div className="ana-stat-value" style={{ color: scoreColor(avgScore) }}>{avgScore}</div>
          <div className="ana-stat-label">Avg Score</div>
        </div>
        <div className="ana-stat" style={{ padding: '8px 12px' }}>
          <div className="ana-stat-value" style={{ color: '#22c55e' }}>{currentCount}</div>
          <div className="ana-stat-label">Current</div>
        </div>
        <div className="ana-stat" style={{ padding: '8px 12px' }}>
          <div className="ana-stat-value" style={{ color: '#f59e0b' }}>{staleCount}</div>
          <div className="ana-stat-label">Stale</div>
        </div>
        <div className="ana-stat" style={{ padding: '8px 12px' }}>
          <div className="ana-stat-value" style={{ color: '#ef4444' }}>{noDataCount}</div>
          <div className="ana-stat-label">No Data</div>
        </div>
      </div>
      <table className="ana-table">
        <thead>
          <tr>
            <th>Market</th>
            <th>Score</th>
            <th>Status</th>
            <th>Fetched</th>
          </tr>
        </thead>
        <tbody>
          {scored.sort((a, b) => b.score - a.score).map(m => (
            <tr key={m.market}>
              <td style={{ textTransform: 'capitalize' }}>{m.market}</td>
              <td>
                <span style={{ color: scoreColor(m.score), fontWeight: 600 }}>{m.score}</span>
              </td>
              <td>
                <span style={{ color: scoreColor(m.score), fontSize: 10 }}>{scoreLabel(m.score)}</span>
              </td>
              <td className="ana-mono">{m.fetchedOn || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
