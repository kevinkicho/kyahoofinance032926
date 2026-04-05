// src/markets/calendar/components/KeyReleases.jsx
import React from 'react';
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
  if (!keyReleases?.length) return null;

  return (
    <div className="cal-panel">
      <div className="cal-panel-header">
        <span className="cal-panel-title">Key US Releases</span>
        <span className="cal-panel-subtitle">Scheduled macro data releases · FRED releases/dates</span>
      </div>
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
