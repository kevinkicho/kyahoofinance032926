// src/markets/calendar/components/KeyReleases.jsx
import React, { useMemo } from 'react';
import { useTheme } from '../../../hub/ThemeContext';
import MetricValue from '../../../components/MetricValue/MetricValue';
import '../CalendarMarket.css';

const CAT_CSS = {
  inflation:  'cal-cat-inflation',
  employment: 'cal-cat-employment',
  growth:     'cal-cat-growth',
  consumer:   'cal-cat-consumer',
  housing:    'cal-cat-housing',
  sentiment:  'cal-cat-sentiment',
};

/** Format large dollar amounts as $1.2M / $21B / $1.1T (handles string inputs). */
function formatCompactMoney(raw) {
  if (raw == null || raw === '') return '—';
  const n = typeof raw === 'number' ? raw : Number(String(raw).replace(/[$,\s]/g, ''));
  if (!Number.isFinite(n)) return String(raw);
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  const fmt = (v, suffix) => {
    const rounded = v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2);
    return `${sign}$${rounded.replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1')}${suffix}`;
  };
  if (abs >= 1e12) return fmt(abs / 1e12, 'T');
  if (abs >= 1e9) return fmt(abs / 1e9, 'B');
  if (abs >= 1e6) return fmt(abs / 1e6, 'M');
  if (abs >= 1e3) return fmt(abs / 1e3, 'K');
  return `${sign}$${abs.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default function KeyReleases({ keyReleases, treasuryAuctions, optionsExpiry, section }) {
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

  if (section === 'data') {
    if (!keyReleases?.length) {
      return (
        <div className="cal-panel-footer" style={{ padding: 16, color: 'var(--text-muted)' }}>
          No upcoming key US releases in the current window.
        </div>
      );
    }
    return (
      <>
        {kpis && (
          <div className="cal-kpi-strip">
            <div className="cal-kpi-pill">
              <span className="cal-kpi-label">Total Releases</span>
              <span className="cal-kpi-value accent"><MetricValue value={kpis.total} seriesKey="krTotalReleases" format={v => `${v}`} /></span>
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
              <span className="cal-kpi-value"><MetricValue value={kpis.numCategories} seriesKey="krCategoryCount" format={v => `${v}`} /></span>
            </div>
          </div>
        )}
        <div className="cal-release-list">
          {keyReleases.map((r, i) => (
            <div key={`${r.date}-${r.name}-${i}`} className="cal-release-item">
              <span className="cal-release-date">{r.date}</span>
              <span className="cal-release-name">
                {r.name}
                {r.category && (
                  <span className={`cal-cat-badge ${CAT_CSS[r.category] || ''}`}>{r.category}</span>
                )}
              </span>
              {r.previousValue != null && (
                <span className="cal-release-prev">
                  Prev:{' '}
                  <MetricValue
                    value={r.previousValue}
                    seriesKey="krPreviousValue"
                    format={(v) => (v != null ? `${typeof v === 'number' ? (Math.abs(v) >= 100 ? v.toLocaleString(undefined, { maximumFractionDigits: 1 }) : v.toFixed(2)) : v}` : '—')}
                  />
                </span>
              )}
            </div>
          ))}
        </div>
        <div className="cal-panel-footer">
          FRED release calendars · previous print from primary series · {keyReleases.length} upcoming
        </div>
      </>
    );
  }

  if (section === 'treasury') {
    return (
      <>
        {treasuryAuctions?.length > 0 && (
          <>
            <div className="cal-panel-header">
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
                    <td style={{ fontFamily: 'monospace', fontSize: 11, color: '#34d399', fontWeight: 600, textAlign: 'right' }}>
                      <MetricValue value={a.amount} seriesKey="treasAuctionAmount" format={formatCompactMoney} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
        {optionsExpiry?.length > 0 && (
          <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '8px 0' }}>
            <div style={{ marginBottom: 8, padding: '0 4px' }}>
              <span className="cal-panel-title">Options Expiry</span>
              <span className="cal-panel-subtitle" style={{ marginLeft: 8 }}>Next monthly expiry dates</span>
            </div>
            <table className="cal-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>#</th>
                  <th style={{ textAlign: 'left' }}>Date</th>
                  <th style={{ textAlign: 'left' }}>Type</th>
                  <th style={{ textAlign: 'right' }}>Days</th>
                </tr>
              </thead>
              <tbody>
                {optionsExpiry.map((e, i) => {
                  const days = (() => {
                    if (!e.date) return null;
                    const t = new Date(`${e.date}T12:00:00Z`);
                    if (Number.isNaN(t.getTime())) return null;
                    return Math.round((t - Date.now()) / 86400000);
                  })();
                  return (
                    <tr key={`${e.date}-${i}`}>
                      <td style={{ fontFamily: 'monospace', fontSize: 11, color: colors.textMuted }}>{i + 1}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 600, color: '#f43f5e' }}>{e.date}</td>
                      <td style={{ fontSize: 11, color: 'var(--text-primary)', fontWeight: 500 }}>{e.type || 'Monthly Options Expiry'}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 11, textAlign: 'right', color: days != null && days <= 7 ? '#fbbf24' : colors.textMuted }}>
                        {days == null ? '—' : days < 0 ? 'passed' : days === 0 ? 'today' : `${days}d`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </>
    );
  }

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
            <span className="cal-kpi-value accent"><MetricValue value={kpis.total} seriesKey="krTotalReleases" format={v => `${v}`} /></span>
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
            <span className="cal-kpi-value"><MetricValue value={kpis.numCategories} seriesKey="krCategoryCount" format={v => `${v}`} /></span>
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
            {r.previousValue != null && <span className="cal-release-prev">Prev: <MetricValue value={r.previousValue} seriesKey="krPreviousValue" format={v => v != null ? `${v}` : '—'} /></span>}
            </div>
          ))}
        </div>
        <div className="cal-panel-footer">
        Dates from FRED release schedule · Previous values shown where available · {keyReleases.length <= 1 ? 'Partial source coverage in current snapshot' : 'No consensus forecasts (proprietary)'}
      </div>

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
                  <td style={{ fontFamily: 'monospace', fontSize: 11, color: '#34d399', fontWeight: 600, textAlign: 'right' }}>
                    <MetricValue value={a.amount} seriesKey="treasAuctionAmount" format={formatCompactMoney} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {optionsExpiry?.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '8px 0' }}>
          <div className="cal-panel-header" style={{ padding: '8px 14px' }}>
            <span className="cal-panel-title">Options Expiry</span>
            <span className="cal-panel-subtitle">Next monthly expiry dates</span>
          </div>
          <table className="cal-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>#</th>
                <th style={{ textAlign: 'left' }}>Date</th>
                <th style={{ textAlign: 'left' }}>Type</th>
                <th style={{ textAlign: 'right' }}>Days</th>
              </tr>
            </thead>
            <tbody>
              {optionsExpiry.map((e, i) => {
                const days = (() => {
                  if (!e.date) return null;
                  const t = new Date(`${e.date}T12:00:00Z`);
                  if (Number.isNaN(t.getTime())) return null;
                  return Math.round((t - Date.now()) / 86400000);
                })();
                return (
                  <tr key={`${e.date}-${i}`}>
                    <td style={{ fontFamily: 'monospace', fontSize: 11, color: colors.textMuted }}>{i + 1}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 600, color: '#f43f5e' }}>{e.date}</td>
                    <td style={{ fontSize: 11, color: 'var(--text-primary)', fontWeight: 500 }}>{e.type || 'Monthly Options Expiry'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 11, textAlign: 'right', color: days != null && days <= 7 ? '#fbbf24' : colors.textMuted }}>
                      {days == null ? '—' : days < 0 ? 'passed' : days === 0 ? 'today' : `${days}d`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
