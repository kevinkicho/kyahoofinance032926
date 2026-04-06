// src/markets/calendar/components/EconomicCalendar.jsx
import React, { useState, useMemo } from 'react';
import { useTheme } from '../../../hub/ThemeContext';
import './CalendarComponents.css';

function countryFlag(cc) {
  if (!cc || cc.length !== 2) return '';
  return String.fromCodePoint(...[...cc.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
}

const REGION_FILTERS = [
  { id: 'all',  label: 'All',   codes: null },
  { id: 'us',   label: 'US',    codes: ['US'] },
  { id: 'eu',   label: 'Europe', codes: ['EU','DE','FR','GB','IT','ES'] },
  { id: 'asia', label: 'Asia',  codes: ['CN','JP','KR','IN','AU'] },
];

export default function EconomicCalendar({ economicEvents }) {
  const { colors } = useTheme();
  const [filter, setFilter] = useState('all');

  const kpis = useMemo(() => {
    if (!economicEvents?.length) return null;
    const total = economicEvents.length;
    const upcoming = economicEvents.filter(e => e.actual == null).length;
    const released = economicEvents.filter(e => e.actual != null).length;
    let biggestSurprise = null;
    let biggestAbs = -Infinity;
    economicEvents.forEach(e => {
      if (e.actual != null && e.expected != null) {
        const diff = e.actual - e.expected;
        if (Math.abs(diff) > biggestAbs) {
          biggestAbs = Math.abs(diff);
          biggestSurprise = { event: e.event, surprise: Math.round(diff * 100) / 100 };
        }
      }
    });
    return { total, upcoming, released, biggestSurprise };
  }, [economicEvents]);

  const filtered = useMemo(() => {
    if (!economicEvents?.length) return [];
    const f = REGION_FILTERS.find(r => r.id === filter);
    if (!f || !f.codes) return economicEvents;
    return economicEvents.filter(e => f.codes.includes(e.country));
  }, [economicEvents, filter]);

  return (
    <div className="cal-panel">
      <div className="cal-panel-header">
        <span className="cal-panel-title">Economic Calendar</span>
        <span className="cal-panel-subtitle">High-importance macro releases · next 30 days · Econdb</span>
      </div>
      {kpis && (
        <div className="cal-kpi-strip">
          <div className="cal-kpi-pill">
            <span className="cal-kpi-label">Total Events</span>
            <span className="cal-kpi-value accent">{kpis.total}</span>
          </div>
          <div className="cal-kpi-pill">
            <span className="cal-kpi-label">Upcoming</span>
            <span className="cal-kpi-value">{kpis.upcoming}</span>
          </div>
          <div className="cal-kpi-pill">
            <span className="cal-kpi-label">Released</span>
            <span className="cal-kpi-value">{kpis.released}</span>
          </div>
          {kpis.biggestSurprise && (
            <div className="cal-kpi-pill" style={{ minWidth: 160 }}>
              <span className="cal-kpi-label">Biggest Surprise</span>
              <span className="cal-kpi-value">
                {kpis.biggestSurprise.event} {kpis.biggestSurprise.surprise > 0 ? '+' : ''}{kpis.biggestSurprise.surprise}
              </span>
            </div>
          )}
        </div>
      )}
      <div className="cal-filter-bar">
        {REGION_FILTERS.map(r => (
          <button
            key={r.id}
            className={`cal-filter-pill${filter === r.id ? ' active' : ''}`}
            onClick={() => setFilter(r.id)}
          >
            {r.label}
          </button>
        ))}
      </div>
      <div style={{ overflow: 'auto', maxHeight: 480 }}>
        <table className="cal-table">
          <thead>
            <tr>
              <th>Date</th>
              <th></th>
              <th>Event</th>
              <th>Actual</th>
              <th>Expected</th>
              <th>Previous</th>
              <th>Surprise</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e, i) => {
              const surprise = e.actual != null && e.expected != null ? Math.round((e.actual - e.expected) * 100) / 100 : null;
              return (
                <tr key={i} className={e.actual != null ? 'cal-released' : 'cal-upcoming'}>
                  <td style={{ fontFamily: 'monospace', fontSize: 10, color: colors.textMuted }}>{e.date}</td>
                  <td><span className="cal-flag">{countryFlag(e.country)}</span></td>
                  <td style={{ fontWeight: 500 }}>{e.event}</td>
                  <td style={{ fontFamily: 'monospace' }}>{e.actual ?? '—'}</td>
                  <td style={{ fontFamily: 'monospace', color: colors.textSecondary }}>{e.expected ?? '—'}</td>
                  <td style={{ fontFamily: 'monospace', color: colors.textMuted }}>{e.previous ?? '—'}</td>
                  <td className={surprise > 0 ? 'cal-surprise-pos' : surprise < 0 ? 'cal-surprise-neg' : 'cal-surprise-na'}>
                    {surprise != null ? (surprise > 0 ? '+' : '') + surprise : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="cal-panel-footer">
        Released events shown at reduced opacity · Surprise = Actual − Expected
      </div>
    </div>
  );
}
