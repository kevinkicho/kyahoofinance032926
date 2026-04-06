// src/markets/calendar/components/KeyReleases.jsx
import React, { useMemo } from 'react';
import { useTheme } from '../../../hub/ThemeContext';
import './CalendarComponents.css';

const CAT_CSS = {
  inflation:  'cal-cat-inflation',
  employment: 'cal-cat-employment',
  growth:     'cal-cat-growth',
  consumer:   'cal-cat-consumer',
  housing:    'cal-cat-housing',
  sentiment:  'cal-cat-sentiment',
};

export default function KeyReleases({ keyReleases, treasuryAuctions, optionsExpiry }) {
  const { colors } = useTheme();
  const kpis = useMemo(() => {
    if (!keyReleases?.length) return null;
    const total = keyReleases.length;
    const nextRelease = keyReleases[0]?.date ?? null;
    const catCounts = {};
    keyReleases.forEach(r => {
      if (r.category) catCounts[r.category] = (catCounts[r.category] || 0) + 1;
    });
    const cats = Object.keys(catCounts);
    const topCat = cats.length ? cats.reduce((a, b) => catCounts[a] >= catCounts[b] ? a : b) : null;
    const topCatLabel = topCat ? topCat.charAt(0).toUpperCase() + topCat.slice(1) : null;
    const numCategories = cats.length;
    return { total, nextRelease, topCatLabel, numCategories };
  }, [keyReleases]);

  if (!keyReleases?.length) return null;

  return (
    <div className="cal-panel">
      <div className="cal-panel-header">
        <span className="cal-panel-title">Key US Releases</span>
        <span className="cal-panel-subtitle">Scheduled macro data releases · FRED releases/dates</span>
      </div>
      {kpis && (
        <div className="cal-kpi-strip">
          <div className="cal-kpi-pill">
            <span className="cal-kpi-label">Total Releases</span>
            <span className="cal-kpi-value accent">{kpis.total}</span>
          </div>
          {kpis.nextRelease && (
            <div className="cal-kpi-pill" style={{ minWidth: 100 }}>
              <span className="cal-kpi-label">Next Release</span>
              <span className="cal-kpi-value">{kpis.nextRelease}</span>
            </div>
          )}
          {kpis.topCatLabel && (
            <div className="cal-kpi-pill" style={{ minWidth: 100 }}>
              <span className="cal-kpi-label">Top Category</span>
              <span className="cal-kpi-value">{kpis.topCatLabel}</span>
            </div>
          )}
          <div className="cal-kpi-pill">
            <span className="cal-kpi-label"># Categories</span>
            <span className="cal-kpi-value">{kpis.numCategories}</span>
          </div>
        </div>
      )}
      <div className="cal-release-list">
        {keyReleases.map((r, i) => (
          <div key={i} className="cal-release-item">
            <span className="cal-release-date">{r.date}</span>
            <span className="cal-release-name">
              {r.name}
              <span className={`cal-cat-badge ${CAT_CSS[r.category] || ''}`}>{r.category}</span>
            </span>
            {r.previousValue && <span className="cal-release-prev">Prev: {r.previousValue}</span>}
          </div>
        ))}
      </div>
      <div className="cal-panel-footer">
        Dates from FRED release schedule · Previous values shown where available · No consensus forecasts (proprietary)
      </div>

      {/* ── Treasury Auctions ─────────────────────────────────────────────── */}
      {treasuryAuctions?.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <div className="cal-panel-header" style={{ padding: '8px 14px' }}>
            <span className="cal-panel-title">Treasury Auctions</span>
            <span className="cal-panel-subtitle">Upcoming US Treasury auction schedule</span>
          </div>
          <table className="cal-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Security Type</th>
                <th>Offering Amount</th>
              </tr>
            </thead>
            <tbody>
              {treasuryAuctions.map((a, i) => (
                <tr key={i}>
                  <td style={{ fontFamily: 'monospace', fontSize: 11, color: colors.textMuted }}>{a.date}</td>
                  <td style={{ fontSize: 11, color: 'var(--text-primary)', fontWeight: 500 }}>{a.type}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 11, color: '#34d399' }}>{a.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Options Expiry ────────────────────────────────────────────────── */}
      {optionsExpiry?.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '8px 14px' }}>
          <div style={{ marginBottom: 8 }}>
            <span className="cal-panel-title">Options Expiry</span>
            <span className="cal-panel-subtitle" style={{ marginLeft: 8 }}>Next monthly expiry dates</span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {optionsExpiry.map((e, i) => (
              <div key={i} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                borderRadius: 8, padding: '5px 14px', minWidth: 90,
              }}>
                <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#f43f5e' }}>{e.date}</span>
                <span style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{e.type}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
