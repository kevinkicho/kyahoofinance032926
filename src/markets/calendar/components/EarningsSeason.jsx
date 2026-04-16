// src/markets/calendar/components/EarningsSeason.jsx
import React, { useMemo } from 'react';
import { useTheme } from '../../../hub/ThemeContext';
import MetricValue from '../../../components/MetricValue/MetricValue';
import '../CalendarMarket.css';

function weekLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  const mon = new Date(d); mon.setDate(d.getDate() - ((day + 6) % 7));
  const fri = new Date(mon); fri.setDate(mon.getDate() + 4);
  const fmt = d2 => `${d2.toLocaleString('en-US', { month: 'short' })} ${d2.getDate()}`;
  return `${fmt(mon)}–${fmt(fri)}`;
}

function isCurrentWeek(dateStr) {
  const now = new Date();
  const d = new Date(dateStr + 'T00:00:00');
  const nowMon = new Date(now); nowMon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const dMon = new Date(d); dMon.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return nowMon.toISOString().split('T')[0] === dMon.toISOString().split('T')[0];
}

export default function EarningsSeason({ earningsSeason, dividendCalendar, insideBento }) {
  const { colors } = useTheme();

  const sortedDividends = useMemo(() => {
    if (!dividendCalendar?.length) return [];
    return [...dividendCalendar].sort((a, b) => (a.exDate ?? '').localeCompare(b.exDate ?? ''));
  }, [dividendCalendar]);

  const kpis = useMemo(() => {
    if (!earningsSeason?.length) return null;
    const total = earningsSeason.length;
    const thisWeek = earningsSeason.filter(e => isCurrentWeek(e.date)).length;
    let largestMktCap = null;
    let largestCapVal = -Infinity;
    earningsSeason.forEach(e => {
      if (e.marketCapB != null && e.marketCapB > largestCapVal) {
        largestCapVal = e.marketCapB;
        largestMktCap = { ticker: e.ticker, marketCapB: e.marketCapB };
      }
    });
    const epsVals = earningsSeason.map(e => e.epsEst).filter(v => v != null);
    const avgEps = epsVals.length ? epsVals.reduce((a, b) => a + b, 0) / epsVals.length : null;
    return { total, thisWeek, largestMktCap, avgEps };
  }, [earningsSeason]);

  const grouped = useMemo(() => {
    if (!earningsSeason?.length) return [];
    const groups = {};
    earningsSeason.forEach(e => {
      const wk = weekLabel(e.date);
      if (!groups[wk]) groups[wk] = { label: wk, isCurrent: isCurrentWeek(e.date), entries: [] };
      groups[wk].entries.push(e);
    });
    return Object.values(groups);
  }, [earningsSeason]);

  const inner = (
    <>
      {kpis && (
        <div className="cal-kpi-strip">
          <div className="cal-kpi-pill">
            <span className="cal-kpi-label">Total Reports</span>
            <span className="cal-kpi-value accent"><MetricValue value={kpis.total} seriesKey="earnTotalReports" format={v => `${v}`} /></span>
          </div>
          <div className="cal-kpi-pill">
            <span className="cal-kpi-label">This Week</span>
            <span className="cal-kpi-value"><MetricValue value={kpis.thisWeek} seriesKey="earnTotalReports" format={v => `${v}`} /></span>
          </div>
          {kpis.largestMktCap && (
            <div className="cal-kpi-pill" style={{ minWidth: 120 }}>
              <span className="cal-kpi-label">Largest Mkt Cap</span>
              <span className="cal-kpi-value">{kpis.largestMktCap.ticker} <MetricValue value={kpis.largestMktCap.marketCapB} seriesKey="earnMktCap" format={v => `$${v}B`} /></span>
            </div>
          )}
          {kpis.avgEps != null && (
            <div className="cal-kpi-pill">
              <span className="cal-kpi-label">Avg EPS Est</span>
              <span className="cal-kpi-value"><MetricValue value={kpis.avgEps} seriesKey="earnAvgEps" format={v => `$${v.toFixed(2)}`} /></span>
            </div>
          )}
        </div>
      )}
      {grouped.map(g => (
        <div key={g.label} className="cal-week-group">
          <div className={`cal-week-header${g.isCurrent ? ' cal-week-current' : ''}`}>
            {g.isCurrent ? '\u25B8 ' : ''}{g.label}
          </div>
          <table className="cal-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Ticker</th>
                <th>Company</th>
                <th>EPS Est</th>
                <th>Prior EPS</th>
                <th>Mkt Cap ($B)</th>
              </tr>
            </thead>
            <tbody>
              {g.entries.map((e, i) => (
                <tr key={i}>
                  <td style={{ fontFamily: 'monospace', fontSize: 10, color: colors.textMuted }}>{e.date}</td>
                  <td style={{ fontWeight: 700, color: '#f43f5e' }}>{e.ticker}</td>
                  <td>{e.name}</td>
                  <td style={{ fontFamily: 'monospace' }}><MetricValue value={e.epsEst} seriesKey="earnEpsEst" format={v => v != null ? `$${v.toFixed(2)}` : '—'} /></td>
                  <td style={{ fontFamily: 'monospace', color: colors.textMuted }}><MetricValue value={e.epsPrev} seriesKey="earnEpsPrev" format={v => v != null ? `$${v.toFixed(2)}` : '—'} /></td>
                  <td style={{ fontFamily: 'monospace', color: colors.textSecondary }}><MetricValue value={e.marketCapB} seriesKey="earnMktCap" format={v => v != null ? `$${v.toLocaleString()}` : '—'} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      <div className="cal-panel-footer">
        30 mega-cap stocks tracked · EPS estimates from Yahoo Finance earningsTrend
      </div>

      {sortedDividends.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <div className="cal-panel-header" style={{ padding: '8px 14px' }}>
            <span className="cal-panel-title">Dividend Calendar</span>
            <span className="cal-panel-subtitle">Upcoming ex-dividend dates · major stocks</span>
          </div>
          <table className="cal-table">
            <thead>
              <tr>
                <th>Ticker</th>
                <th>Ex-Date</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {sortedDividends.map((d, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 700, fontSize: 11, color: '#f43f5e' }}>{d.ticker}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 11, color: colors.textMuted }}>{d.exDate}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 11, color: '#34d399' }}>
                    <MetricValue value={d.amount != null ? Number(d.amount) : null} seriesKey="divAmount" format={v => v != null ? `$${v.toFixed(4)}` : '—'} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );

  if (insideBento) return inner;

  return (
    <div className="cal-panel">
      <div className="cal-panel-header">
        <span className="cal-panel-title">Earnings Season</span>
        <span className="cal-panel-subtitle">Mega-cap earnings dates · next 60 days · Yahoo Finance calendarEvents</span>
      </div>
      {inner}
    </div>
  );
}