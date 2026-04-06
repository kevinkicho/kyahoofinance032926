// src/markets/calendar/components/KeyReleases.jsx
import React, { useMemo } from 'react';
import './CalendarComponents.css';

const CAT_CSS = {
  inflation:  'cal-cat-inflation',
  employment: 'cal-cat-employment',
  growth:     'cal-cat-growth',
  consumer:   'cal-cat-consumer',
  housing:    'cal-cat-housing',
  sentiment:  'cal-cat-sentiment',
};

export default function KeyReleases({ keyReleases }) {
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
    </div>
  );
}
