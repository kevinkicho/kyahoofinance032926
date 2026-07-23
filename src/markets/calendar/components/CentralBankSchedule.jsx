// src/markets/calendar/components/CentralBankSchedule.jsx
import React, { useMemo } from 'react';
import '../CalendarMarket.css';
import MetricValue from '../../../components/MetricValue/MetricValue';

const BANK_FLAGS = { Fed: '\u{1F1FA}\u{1F1F8}', ECB: '\u{1F1EA}\u{1F1FA}', BOE: '\u{1F1EC}\u{1F1E7}', BOJ: '\u{1F1EF}\u{1F1F5}' };
const BANK_DOTS  = { Fed: 'cal-dot-fed', ECB: 'cal-dot-ecb', BOE: 'cal-dot-boe', BOJ: 'cal-dot-boj' };
const BANK_SERIES_KEY = {
  Fed: 'fedRate',
  ECB: 'ecbRate',
  BOE: 'boeRate',
  BOJ: 'bojRate',
};

const ALL_MEETINGS = {
  Fed: ['2026-01-28','2026-03-18','2026-05-06','2026-06-17','2026-07-29','2026-09-16','2026-11-04','2026-12-16'],
  ECB: ['2026-01-22','2026-03-05','2026-04-16','2026-06-04','2026-07-16','2026-09-10','2026-10-29','2026-12-17'],
  BOE: ['2026-02-05','2026-03-19','2026-05-07','2026-06-18','2026-08-06','2026-09-17','2026-11-05','2026-12-17'],
  BOJ: ['2026-01-22','2026-03-12','2026-04-30','2026-06-18','2026-07-16','2026-09-17','2026-10-29','2026-12-17'],
};

function asNum(v) {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  return null;
}

function fmtPct(v, digits = 2) {
  const n = asNum(v);
  if (n == null) return '—';
  return `${n.toFixed(digits)}%`;
}

function decisionBadge(rate, previousRate) {
  const r = asNum(rate);
  const p = asNum(previousRate);
  if (r == null || p == null) return null;
  const diffBp = Math.round((r - p) * 100);
  if (diffBp > 0) return <span className="cal-cb-decision cal-cb-hike">HIKE +{diffBp}bp</span>;
  if (diffBp < 0) return <span className="cal-cb-decision cal-cb-cut">CUT {diffBp}bp</span>;
  return <span className="cal-cb-decision cal-cb-hold">HOLD</span>;
}

function RateDisplay({ cb }) {
  const rate = asNum(cb.rate);
  const low = asNum(cb.rateLow);
  const seriesKey = BANK_SERIES_KEY[cb.bank] || 'fedRate';

  // Fed target range: low–high when both present
  if (cb.bank === 'Fed' && low != null && rate != null && low !== rate) {
    return (
      <div className="cal-cb-rate">
        <MetricValue
          seriesKey={seriesKey}
          value={rate}
          format={() => `${low.toFixed(2)}–${rate.toFixed(2)}%`}
        />
      </div>
    );
  }

  return (
    <div className="cal-cb-rate">
      {rate == null ? (
        <span className="cal-cb-rate-missing">—</span>
      ) : (
        <MetricValue
          seriesKey={seriesKey}
          value={rate}
          format={(v) => {
            const n = asNum(v);
            return n == null ? '—' : `${n.toFixed(2)}%`;
          }}
        />
      )}
    </div>
  );
}

export default function CentralBankSchedule({ centralBanks, section }) {
  const banks = useMemo(() => {
    return (centralBanks || []).map((cb) => {
      let daysUntil = asNum(cb.daysUntil);
      if (daysUntil == null && cb.nextMeeting) {
        const today = new Date();
        today.setHours(12, 0, 0, 0);
        const meet = new Date(`${cb.nextMeeting}T12:00:00`);
        daysUntil = Math.round((meet - today) / 86400000);
      }
      return {
        ...cb,
        rate: asNum(cb.rate),
        rateLow: asNum(cb.rateLow),
        previousRate: asNum(cb.previousRate),
        daysUntil,
      };
    });
  }, [centralBanks]);

  if (!banks.length) return <div className="cal-empty">No central bank data available</div>;

  const today = (() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  })();

  const byBank = Object.fromEntries(banks.map(cb => [cb.bank, cb]));
  const timelineEntries = banks
    .filter(cb => cb.nextMeeting)
    .map(cb => ({ ...cb, date: cb.nextMeeting }));
  Object.entries(ALL_MEETINGS).forEach(([bank, dates]) => {
    dates.filter(d => d >= today).slice(0, 3).forEach(d => {
      if (!timelineEntries.some(e => e.bank === bank && e.date === d)) {
        timelineEntries.push({ ...(byBank[bank] || {}), bank, date: d });
      }
    });
  });
  timelineEntries.sort((a, b) => String(a.date).localeCompare(String(b.date)));

  if (section === 'rates') {
    return (
      <div className="cal-cb-grid">
        {banks.map(cb => (
          <div key={cb.bank} className="cal-cb-card">
            <div className="cal-cb-bank">
              <span className="cal-cb-flag">{BANK_FLAGS[cb.bank] || ''}</span>
              <span>{cb.bank}</span>
            </div>
            <RateDisplay cb={cb} />
            <div className="cal-cb-meta-row">
              <span className="cal-cb-meta-label">Previous</span>
              <span className="cal-cb-meta-val">{fmtPct(cb.previousRate)}</span>
            </div>
            {cb.previousRate != null && cb.rate != null && (
              <div className="cal-cb-meta-row">
                <span className="cal-cb-meta-label">Δ</span>
                <span className="cal-cb-meta-val">
                  {(() => {
                    const bp = Math.round((cb.rate - cb.previousRate) * 100);
                    return `${bp >= 0 ? '+' : ''}${bp} bp`;
                  })()}
                </span>
              </div>
            )}
            <div className="cal-cb-next">Next: {cb.nextMeeting || '—'}</div>
            <div className="cal-cb-countdown">
              {cb.daysUntil != null ? `${cb.daysUntil} day${cb.daysUntil === 1 ? '' : 's'}` : ''}
            </div>
            {cb.rateLabel && (
              <div className="cal-cb-series" title={cb.rateSeries || ''}>
                {cb.rateLabel}
                {cb.rateAsOf ? ` · as of ${cb.rateAsOf}` : ''}
              </div>
            )}
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
          <div key={`${e.bank}-${e.date}-${i}`} className="cal-timeline-row">
            <span className={`cal-timeline-dot ${BANK_DOTS[e.bank] || ''}`} />
            <span className="cal-timeline-date">{e.date}</span>
            <span className="cal-timeline-bank">{e.bank}</span>
            <span className="cal-timeline-rate">{fmtPct(e.rate)}</span>
            {e.daysUntil != null && e.daysUntil >= 0 && (
              <span className="cal-timeline-days">{e.daysUntil}d</span>
            )}
            {decisionBadge(e.rate, e.previousRate)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="cal-panel">
      <div className="cal-panel-header">
        <span className="cal-panel-title">Central Bank Schedule</span>
        <span className="cal-panel-subtitle">Policy rates · Fed / ECB / BOE / BOJ · FRED</span>
      </div>
      <div className="cal-cb-grid">
        {banks.map(cb => (
          <div key={cb.bank} className="cal-cb-card">
            <div className="cal-cb-bank">{BANK_FLAGS[cb.bank] || ''} {cb.bank}</div>
            <RateDisplay cb={cb} />
            <div className="cal-cb-next">Next: {cb.nextMeeting}</div>
            <div className="cal-cb-countdown">{cb.daysUntil != null ? `${cb.daysUntil} days` : ''}</div>
            {decisionBadge(cb.rate, cb.previousRate)}
          </div>
        ))}
      </div>
      <div className="cal-timeline">
        <div className="cal-timeline-title">Upcoming Meetings</div>
        {timelineEntries.slice(0, 12).map((e, i) => (
          <div key={`${e.bank}-${e.date}-${i}`} className="cal-timeline-row">
            <span className={`cal-timeline-dot ${BANK_DOTS[e.bank] || ''}`} />
            <span className="cal-timeline-date">{e.date}</span>
            <span className="cal-timeline-bank">{e.bank}</span>
            <span className="cal-timeline-rate">{fmtPct(e.rate)}</span>
          </div>
        ))}
      </div>
      <div className="cal-panel-footer">
        Rates from FRED · BoE via SONIA · BOJ via OECD immediate rates
      </div>
    </div>
  );
}
