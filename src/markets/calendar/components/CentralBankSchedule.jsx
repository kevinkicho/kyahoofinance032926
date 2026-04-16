// src/markets/calendar/components/CentralBankSchedule.jsx
import React from 'react';
import '../CalendarMarket.css';
import MetricValue from '../../../components/MetricValue/MetricValue';

const BANK_FLAGS = { Fed: '\u{1F1FA}\u{1F1F8}', ECB: '\u{1F1EA}\u{1F1FA}', BOE: '\u{1F1EC}\u{1F1E7}', BOJ: '\u{1F1EF}\u{1F1F5}' };
const BANK_DOTS  = { Fed: 'cal-dot-fed', ECB: 'cal-dot-ecb', BOE: 'cal-dot-boe', BOJ: 'cal-dot-boj' };

const ALL_MEETINGS = {
  Fed: ['2026-01-28','2026-03-18','2026-05-06','2026-06-17','2026-07-29','2026-09-16','2026-11-04','2026-12-16'],
  ECB: ['2026-01-22','2026-03-05','2026-04-16','2026-06-04','2026-07-16','2026-09-10','2026-10-29','2026-12-17'],
  BOE: ['2026-02-05','2026-03-19','2026-05-07','2026-06-18','2026-08-06','2026-09-17','2026-11-05','2026-12-17'],
  BOJ: ['2026-01-22','2026-03-12','2026-04-30','2026-06-18','2026-07-16','2026-09-17','2026-10-29','2026-12-17'],
};

function decisionBadge(rate, previousRate) {
  if (previousRate == null || rate == null) return null;
  const diff = Math.round((rate - previousRate) * 100);
  if (diff > 0) return <span className="cal-cb-decision cal-cb-hike">HIKE +{diff}bp</span>;
  if (diff < 0) return <span className="cal-cb-decision cal-cb-cut">CUT {diff}bp</span>;
  return <span className="cal-cb-decision cal-cb-hold">HOLD</span>;
}

export default function CentralBankSchedule({ centralBanks, section }) {
  if (!centralBanks?.length) return <div className="cal-empty">No central bank data available</div>;

  const today = new Date().toISOString().split('T')[0];

  const timelineEntries = [];
  Object.entries(ALL_MEETINGS).forEach(([bank, dates]) => {
    dates.filter(d => d >= today).slice(0, 3).forEach(d => {
      timelineEntries.push({ bank, date: d });
    });
  });
  timelineEntries.sort((a, b) => a.date.localeCompare(b.date));

  if (section === 'rates') {
    return (
      <div className="cal-cb-grid">
        {centralBanks.map(cb => (
          <div key={cb.bank} className="cal-cb-card">
            <div className="cal-cb-bank">{BANK_FLAGS[cb.bank] || ''} {cb.bank}</div>
            <div className="cal-cb-rate"><MetricValue seriesKey={cb.bank === 'Fed' ? 'fedRate' : cb.bank === 'ECB' ? 'ecbRate' : cb.bank === 'BOE' ? 'boeRate' : 'bojRate'} value={cb.rate} format={v => v != null ? v.toFixed(2) : '—'} />%</div>
            <div className="cal-cb-next">Next: {cb.nextMeeting}</div>
            <div className="cal-cb-countdown">{cb.daysUntil != null ? `${cb.daysUntil} days` : ''}</div>
            {decisionBadge(cb.rate, cb.previousRate)}
          </div>
        ))}
      </div>
    );
  }

  if (section === 'timeline') {
    return (
      <div className="cal-timeline">
        <div className="cal-timeline-title">Upcoming Meetings</div>
        {timelineEntries.slice(0, 12).map((e, i) => (
          <div key={i} className="cal-timeline-row">
            <span className={`cal-timeline-dot ${BANK_DOTS[e.bank] || ''}`} />
            <span style={{ minWidth: 80, fontFamily: 'monospace' }}>{e.date}</span>
            <span>{e.bank}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="cal-panel">
      <div className="cal-panel-header">
        <span className="cal-panel-title">Central Bank Schedule</span>
        <span className="cal-panel-subtitle">Policy rate decisions · Fed / ECB / BOE / BOJ · FRED live rates</span>
      </div>
      <div className="cal-cb-grid">
        {centralBanks.map(cb => (
          <div key={cb.bank} className="cal-cb-card">
            <div className="cal-cb-bank">{BANK_FLAGS[cb.bank] || ''} {cb.bank}</div>
            <div className="cal-cb-rate"><MetricValue seriesKey={cb.bank === 'Fed' ? 'fedRate' : cb.bank === 'ECB' ? 'ecbRate' : cb.bank === 'BOE' ? 'boeRate' : 'bojRate'} value={cb.rate} format={v => v != null ? v.toFixed(2) : '—'} />%</div>
            <div className="cal-cb-next">Next: {cb.nextMeeting}</div>
            <div className="cal-cb-countdown">{cb.daysUntil != null ? `${cb.daysUntil} days` : ''}</div>
            {decisionBadge(cb.rate, cb.previousRate)}
          </div>
        ))}
      </div>
      <div className="cal-timeline">
        <div className="cal-timeline-title">Upcoming Meetings</div>
        {timelineEntries.slice(0, 12).map((e, i) => (
          <div key={i} className="cal-timeline-row">
            <span className={`cal-timeline-dot ${BANK_DOTS[e.bank] || ''}`} />
            <span style={{ minWidth: 80, fontFamily: 'monospace' }}>{e.date}</span>
            <span>{e.bank}</span>
          </div>
        ))}
      </div>
      <div className="cal-panel-footer">
        Dates from 2026 published schedules · Rates from FRED (BOJ rate approximate)
      </div>
    </div>
  );
}