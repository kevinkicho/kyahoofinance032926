// src/markets/calendar/components/EconomicCalendar.jsx
import React, { useState, useMemo } from 'react';
import { useTheme } from '../../../hub/ThemeContext';
import MetricValue from '../../../components/MetricValue/MetricValue';
import '../CalendarMarket.css';

function countryFlag(cc) {
  if (!cc || cc.length !== 2) return '';
  try {
    return String.fromCodePoint(...[...cc.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
  } catch {
    return cc;
  }
}

const REGION_FILTERS = [
  { id: 'all',  label: 'All',    codes: null },
  { id: 'us',   label: 'US',     codes: ['US'] },
  { id: 'eu',   label: 'Europe', codes: ['EU', 'DE', 'FR', 'GB', 'IT', 'ES', 'EA'] },
  { id: 'asia', label: 'Asia',   codes: ['CN', 'JP', 'KR', 'IN', 'AU'] },
];

/** Format macro prints for readability (levels, k persons, indexes). */
function formatPrint(v, eventName = '') {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/[$,%\s,]/g, ''));
  if (!Number.isFinite(n)) return String(v);
  const name = String(eventName || '').toLowerCase();
  // PAYEMS employment level is in thousands of persons
  if ((name.includes('employment') || name.includes('nonfarm') || name.includes('payroll')) && Math.abs(n) >= 1000) {
    return `${(n / 1000).toFixed(0)}k`;
  }
  if (Math.abs(n) >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 1 });
  if (Math.abs(n) >= 100) return n.toFixed(1);
  if (Math.abs(n) >= 10) return n.toFixed(2);
  return n.toFixed(2);
}

function rowPrints(e) {
  const lastPrint = e.lastPrint ?? e.previous ?? e.previousValue ?? null;
  const priorPrint = e.priorPrint ?? null;
  const expected = e.expected ?? e.consensus ?? e.forecast ?? null;
  // Prefer explicit actual; for released FRED rows server sets actual = lastPrint
  const actual = e.actual ?? null;
  let change = null;
  if (lastPrint != null && priorPrint != null
    && Number.isFinite(Number(lastPrint)) && Number.isFinite(Number(priorPrint))) {
    const a = Number(lastPrint);
    const b = Number(priorPrint);
    if (b !== 0) change = ((a - b) / Math.abs(b)) * 100;
    else change = a - b;
  }
  const surprise = actual != null && expected != null
    && Number.isFinite(Number(actual)) && Number.isFinite(Number(expected))
    ? Number(actual) - Number(expected)
    : null;
  return {
    lastPrint,
    priorPrint,
    expected,
    actual,
    change,
    surprise,
    released: actual != null,
  };
}

export default function EconomicCalendar({ economicEvents, insideBento }) {
  const { colors } = useTheme();
  const [filter, setFilter] = useState('all');

  const kpis = useMemo(() => {
    if (!economicEvents?.length) return null;
    const total = economicEvents.length;
    const rows = economicEvents.map(rowPrints);
    const upcoming = rows.filter(r => !r.released).length;
    const released = rows.filter(r => r.released).length;
    const withPrint = economicEvents.filter(e => (e.lastPrint ?? e.previous) != null).length;
    let biggestMove = null;
    let biggestAbs = -Infinity;
    economicEvents.forEach((e) => {
      const { lastPrint, priorPrint, change } = rowPrints(e);
      if (change == null) return;
      if (Math.abs(change) > biggestAbs) {
        biggestAbs = Math.abs(change);
        biggestMove = { event: e.event, change, lastPrint, priorPrint };
      }
    });
    return { total, upcoming, released, withPrint, biggestMove };
  }, [economicEvents]);

  const filtered = useMemo(() => {
    if (!economicEvents?.length) return [];
    const f = REGION_FILTERS.find(r => r.id === filter);
    let list = !f || !f.codes
      ? [...economicEvents]
      : economicEvents.filter(e => f.codes.includes(e.country));
    return list.sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
  }, [economicEvents, filter]);

  const inner = (
    <>
      {kpis && (
        <div className="cal-kpi-strip">
          <div className="cal-kpi-pill">
            <span className="cal-kpi-label">Total</span>
            <span className="cal-kpi-value accent">{kpis.total}</span>
          </div>
          <div className="cal-kpi-pill">
            <span className="cal-kpi-label">Upcoming</span>
            <span className="cal-kpi-value">{kpis.upcoming}</span>
          </div>
          <div className="cal-kpi-pill">
            <span className="cal-kpi-label">With last print</span>
            <span className="cal-kpi-value">{kpis.withPrint}</span>
          </div>
          {kpis.biggestMove && (
            <div className="cal-kpi-pill" style={{ minWidth: 140 }}>
              <span className="cal-kpi-label">Biggest Δ (last vs prior)</span>
              <span className="cal-kpi-value" style={{ color: kpis.biggestMove.change >= 0 ? '#4ade80' : '#f87171' }}>
                {kpis.biggestMove.event}{' '}
                {kpis.biggestMove.change >= 0 ? '+' : ''}
                {kpis.biggestMove.change.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      )}
      <div className="cal-filter-bar">
        {REGION_FILTERS.map(r => (
          <button
            key={r.id}
            type="button"
            className={`cal-filter-pill${filter === r.id ? ' active' : ''}`}
            onClick={() => setFilter(r.id)}
          >
            {r.label}
          </button>
        ))}
      </div>
      <div className="cal-econ-table-wrap">
        <table className="cal-table cal-econ-table">
          <thead>
            <tr>
              <th className="cal-th-date">Date</th>
              <th className="cal-th-flag" />
              <th className="cal-th-event">Event</th>
              <th className="cal-th-status">Status</th>
              <th className="cal-th-num">Last Print</th>
              <th className="cal-th-num">Prior</th>
              <th className="cal-th-num">Δ</th>
              <th className="cal-th-num">Consensus</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="cal-econ-empty">No events in this region filter</td>
              </tr>
            ) : filtered.map((e, i) => {
              const { lastPrint, priorPrint, expected, actual, change, released } = rowPrints(e);
              const status = released ? 'Released' : 'Upcoming';
              const statusCls = released ? 'is-released' : 'is-upcoming';
              const deltaCls = change == null ? '' : change > 0 ? 'cal-surprise-pos' : change < 0 ? 'cal-surprise-neg' : '';
              return (
                <tr key={`${e.date}-${e.event}-${i}`} className={released ? 'cal-released' : 'cal-upcoming'}>
                  <td className="cal-td-date">{e.date || '—'}</td>
                  <td className="cal-td-flag">
                    <span className="cal-flag" title={e.country}>{countryFlag(e.country) || e.country || ''}</span>
                  </td>
                  <td className="cal-td-event">
                    <span className="cal-event-name">{e.event || '—'}</span>
                    {(e.category || e.source) && (
                      <span className="cal-event-meta">
                        {e.category || ''}{e.category && e.source ? ' · ' : ''}{e.source || ''}
                        {e.lastActualDate ? ` · as of ${e.lastActualDate}` : ''}
                      </span>
                    )}
                  </td>
                  <td className="cal-td-status">
                    <span className={`cal-status-pill ${statusCls}`}>{status}</span>
                  </td>
                  <td className="cal-td-num">
                    <MetricValue
                      value={lastPrint}
                      seriesKey="ecoPrevious"
                      format={v => formatPrint(v, e.event) ?? '—'}
                    />
                  </td>
                  <td className="cal-td-num cal-td-muted">
                    <MetricValue
                      value={priorPrint}
                      seriesKey="ecoPrevious"
                      format={v => formatPrint(v, e.event) ?? '—'}
                    />
                  </td>
                  <td className={`cal-td-num ${deltaCls}`}>
                    {change == null
                      ? '—'
                      : `${change >= 0 ? '+' : ''}${Number(change).toFixed(2)}%`}
                  </td>
                  <td className="cal-td-num cal-td-muted">
                    {/* FRED has no consensus/forecast — blank unless Econdb etc. provides it */}
                    {expected != null
                      ? (
                        <MetricValue
                          value={expected}
                          seriesKey="ecoExpected"
                          format={v => formatPrint(v, e.event) ?? '—'}
                        />
                      )
                      : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="cal-panel-footer">
        Last Print = latest FRED observation · Prior = previous obs · Δ = last vs prior · Consensus when available (not on FRED)
      </div>
    </>
  );

  if (insideBento) return inner;

  return (
    <div className="cal-panel">
      <div className="cal-panel-header">
        <span className="cal-panel-title">Economic Calendar</span>
        <span className="cal-panel-subtitle">High-importance macro releases · next 30 days · FRED + Econdb</span>
      </div>
      {inner}
    </div>
  );
}
