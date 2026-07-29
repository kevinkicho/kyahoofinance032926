import React, { useMemo } from 'react';
import BentoWrapper from '../../components/BentoWrapper';
import BentoCard from '../../components/BentoCard/BentoCard';
import MarketSkeleton from '../../hub/MarketSkeleton';
import MetricValue from '../../components/MetricValue/MetricValue';
import MarketKpiStrip from '../../components/MarketKpiStrip';
import EconomicCalendar from './components/EconomicCalendar';
import CentralBankSchedule from './components/CentralBankSchedule';
import EarningsSeason from './components/EarningsSeason';
import KeyReleases from './components/KeyReleases';
import { normalizeCalendarData } from '../../data/marketNormalizers';
import './CalendarMarket.css';


function PanelEmpty({ label }) {
  return <div className="cal-empty">{label ? `No upcoming ${label} scheduled` : 'No data available'}</div>;
}

function PartialState({ children = 'Partial snapshot' }) {
  return <span style={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 500 }}>{children}</span>;
}

/** Local YYYY-MM-DD (avoid UTC day shift from toISOString). */
function localYmd(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDaysYmd(ymd, days) {
  const [y, m, d] = String(ymd).split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return localYmd(dt);
}

function eventDate(row) {
  return row?.date || row?.reportDate || row?.nextMeeting || row?.expiry || null;
}

function eventLabel(row) {
  return row?.event || row?.name || row?.label || row?.ticker || row?.title || row?.bank || '—';
}

function isHighImpact(row) {
  const imp = row?.importance ?? row?.impact;
  if (typeof imp === 'number') return imp >= 2;
  if (typeof imp === 'string') return /high|3|red/i.test(imp);
  return false;
}

// Top-of-grid KPI strip is now a real bento panel (`kpi`); other panels
// shifted down by 2 rows. Storage key bumped accordingly.
const LAYOUT = {
  lg: [
    { i: 'kpi', x: 0, y: 0, w: 12, h: 2 },
    { i: 'economic', x: 0, y: 2, w: 8, h: 5 },
    { i: 'sidebar', x: 8, y: 2, w: 4, h: 7 },
    { i: 'cb-rates', x: 0, y: 7, w: 4, h: 3 },
    { i: 'cb-timeline', x: 4, y: 7, w: 4, h: 3 },
    { i: 'earnings', x: 0, y: 10, w: 5, h: 5 },
    { i: 'key-data', x: 5, y: 10, w: 4, h: 5 },
    { i: 'treasury', x: 9, y: 7, w: 3, h: 4 },
    { i: 'options', x: 9, y: 11, w: 3, h: 4 },
    { i: 'release-impact', x: 0, y: 15, w: 12, h: 4 },
    { i: 'catalyst-wall', x: 0, y: 19, w: 12, h: 4 },
  ]
};

function getCalendarProps(centralData) {
  const d = centralData?.data || {};
  const normalized = normalizeCalendarData(d);
  const economicEvents = normalized.values.economicEvents;
  const centralBanks = normalized.values.centralBanks;
  const earningsSeason = normalized.values.earningsSeason;
  const keyReleases = normalized.values.keyReleases;
  const hasCore = !!(
    economicEvents.length
    || centralBanks.length
    || earningsSeason.length
    || keyReleases.length
    || (normalized.values.treasuryAuctions || []).length
  );
  return {
    economicEvents,
    centralBanks,
    earningsSeason,
    keyReleases,
    treasuryAuctions: normalized.values.treasuryAuctions,
    optionsExpiry: normalized.values.optionsExpiry,
    dividendCalendar: normalized.values.dividendCalendar,
    coverage: normalized.values.coverage,
    // Prefer payload isLive; fall back to density so footers aren't "NO DATA"
    isLive: !!(centralData?.isLive || d.isLive || hasCore),
    lastUpdated: centralData?.lastUpdated,
    isLoading: centralData?.isLoading,
    fetchedOn: centralData?.fetchedOn,
    isCurrent: centralData?.isCurrent,
    isHistorical: centralData?.isHistorical,
    asOfDate: centralData?.asOfDate,
    fetchLog: centralData?.fetchLog || [],
    error: centralData?.error,
    refetch: centralData?.refetch,
    normalized,
  };
}

function CalendarMarket({ centralData } = {}) {
  // Hooks before any early return (rules of hooks)
  const props = useMemo(
    () => (centralData ? getCalendarProps(centralData) : null),
    [centralData],
  );

  const dataReady = !!(
    props?.isLive
    || props?.economicEvents?.length
    || props?.centralBanks?.length
    || props?.earningsSeason?.length
    || props?.keyReleases?.length
    || props?.treasuryAuctions?.length
    || props?.optionsExpiry?.length
  );

  const sidebarStats = useMemo(() => {
    if (!props) {
      return {
        today: '', d7: '', d30: '',
        todayCount: 0, todayHighImpact: 0, todayKeyCount: 0,
        next7EventCount: 0, next7HighImpact: 0, next7Earnings: 0, next7Keys: 0,
        next30EventCount: 0, next30HighImpact: 0,
        totalEcon: 0, totalEarn: 0, totalKeys: 0, totalCB: 0,
        nextCB: null, nextEcon: [], nextEarn: [], nextTreasury: [], nextOptions: [], nextKey: [],
        policyRates: [], byCategory: {},
      };
    }
    const today = localYmd();
    // Rolling windows (not calendar week) — FRED release calendars are sparse;
    // Mon–Sun week often has zero rows even when next CPI/NFP is days away.
    const d7 = addDaysYmd(today, 7);
    const d30 = addDaysYmd(today, 30);

    const inRange = (date, start, end) => date && date >= start && date <= end;
    const upcoming = (rows) => (rows || [])
      .map(r => ({ ...r, _date: eventDate(r) }))
      .filter(r => r._date && r._date >= today)
      .sort((a, b) => String(a._date).localeCompare(String(b._date)));

    const econ = props.economicEvents || [];
    const earn = props.earningsSeason || [];
    const keys = props.keyReleases || [];
    const treas = props.treasuryAuctions || [];
    const opts = props.optionsExpiry || [];
    const cbs = props.centralBanks || [];

    const todayEvents = econ.filter(e => eventDate(e) === today);
    const todayKeys = keys.filter(r => eventDate(r) === today);
    const next7Events = econ.filter(e => inRange(eventDate(e), today, d7));
    const next7High = next7Events.filter(isHighImpact);
    const next7Earn = earn.filter(e => inRange(eventDate(e), today, d7));
    const next7Keys = keys.filter(r => inRange(eventDate(r), today, d7));
    const next30Events = econ.filter(e => inRange(eventDate(e), today, d30));
    const next30High = next30Events.filter(isHighImpact);

    const withDays = [...cbs].map(cb => {
      let daysUntil = cb.daysUntil;
      if (daysUntil == null && cb.nextMeeting) {
        const t0 = new Date(`${today}T12:00:00`);
        const t1 = new Date(`${cb.nextMeeting}T12:00:00`);
        daysUntil = Math.round((t1 - t0) / 86400000);
      }
      return { ...cb, daysUntil };
    });
    const nextCB = withDays
      .filter(cb => cb.daysUntil != null && cb.daysUntil >= 0)
      .sort((a, b) => a.daysUntil - b.daysUntil)[0] || null;

    const nextEcon = upcoming(econ).slice(0, 6);
    const nextEarn = upcoming(earn).slice(0, 5);
    const nextTreasury = upcoming(treas).slice(0, 3);
    const nextOptions = upcoming(opts).slice(0, 3);
    const nextKey = upcoming(keys).slice(0, 4);

    // Category breakdown for next 30d macro events
    const byCategory = {};
    next30Events.forEach(e => {
      const cat = e.category || e.country || 'other';
      byCategory[cat] = (byCategory[cat] || 0) + 1;
    });

    return {
      today,
      d7,
      d30,
      todayCount: todayEvents.length,
      todayHighImpact: todayEvents.filter(isHighImpact).length,
      todayKeyCount: todayKeys.length,
      next7EventCount: next7Events.length,
      next7HighImpact: next7High.length,
      next7Earnings: next7Earn.length,
      next7Keys: next7Keys.length,
      next30EventCount: next30Events.length,
      next30HighImpact: next30High.length,
      totalEcon: econ.length,
      totalEarn: earn.length,
      totalKeys: keys.length,
      totalCB: cbs.length,
      nextCB,
      nextEcon,
      nextEarn,
      nextTreasury,
      nextOptions,
      nextKey,
      policyRates: withDays,
      byCategory,
    };
  }, [props]);

  const kpis = useMemo(() => {
    return [
      {
        label: 'Next 7d High Impact',
        value: sidebarStats.next7HighImpact,
        color: sidebarStats.next7HighImpact > 0 ? '#f87171' : 'var(--text-primary)',
        trend: null,
        sublabel: `${sidebarStats.next7EventCount} macro events`,
      },
      {
        label: 'Next CB Meeting',
        value: sidebarStats.nextCB?.daysUntil != null ? `${sidebarStats.nextCB.daysUntil}d` : '—',
        color: 'var(--text-primary)',
        trend: null,
        sublabel: sidebarStats.nextCB
          ? `${sidebarStats.nextCB.bank}${sidebarStats.nextCB.rate != null ? ` · ${sidebarStats.nextCB.rate}%` : ''}`
          : 'No Data',
      },
      {
        label: 'Earnings 7d',
        value: sidebarStats.next7Earnings,
        color: 'var(--text-primary)',
        trend: null,
        sublabel: `${sidebarStats.totalEarn} on calendar`,
      },
    ];
  }, [sidebarStats]);

  const releaseImpactRows = useMemo(() => {
    if (!props) return [];
    const today = localYmd();

    const fmtReleaseNum = (v, label = '') => {
      if (v == null || v === '') return null;
      const n = typeof v === 'number' ? v : Number(String(v).replace(/[$,%\s,]/g, ''));
      if (!Number.isFinite(n)) return String(v);
      const name = String(label || '').toLowerCase();
      // Employment level (PAYEMS) is thousands of persons
      if (name.includes('employment') && Math.abs(n) >= 1000) {
        return `${(n / 1000).toFixed(0)}k`;
      }
      if (Math.abs(n) >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 1 });
      if (Math.abs(n) >= 100) return n.toFixed(1);
      if (Math.abs(n) >= 10) return n.toFixed(2);
      return n.toFixed(2);
    };

    const normalizeRow = (row, defaults = {}) => {
      const label = row.name || row.label || row.event || defaults.label || 'Release';
      const lastPrint = row.lastPrint ?? row.previousValue ?? row.previous ?? row.actual ?? null;
      const priorPrint = row.priorPrint ?? null;
      const date = row.date;
      const released = date && date <= today;
      // For upcoming: Actual blank; Previous/Last print = latest FRED obs.
      // For released: Actual = last print when source has no separate actual.
      const actual = row.actual != null
        ? row.actual
        : (released ? lastPrint : null);
      const forecast = row.forecast ?? row.expected ?? row.consensus ?? null;
      const previous = row.previous ?? row.previousValue ?? lastPrint ?? null;
      let change = null;
      if (lastPrint != null && priorPrint != null
        && Number.isFinite(Number(lastPrint)) && Number.isFinite(Number(priorPrint))
        && Number(priorPrint) !== 0) {
        change = ((Number(lastPrint) - Number(priorPrint)) / Math.abs(Number(priorPrint))) * 100;
      } else if (lastPrint != null && priorPrint != null
        && Number.isFinite(Number(lastPrint)) && Number.isFinite(Number(priorPrint))) {
        change = Number(lastPrint) - Number(priorPrint);
      }
      return {
        date,
        label,
        category: row.category || row.country || defaults.category || 'macro',
        actual,
        forecast,
        previous,
        priorPrint,
        lastPrint,
        lastActualDate: row.lastActualDate || null,
        change,
        importance: Number(row.importance ?? defaults.importance ?? 1),
        source: row.source || defaults.source || 'Calendar',
        actualDisplay: fmtReleaseNum(actual, label),
        forecastDisplay: fmtReleaseNum(forecast, label),
        previousDisplay: fmtReleaseNum(previous, label),
        priorDisplay: fmtReleaseNum(priorPrint, label),
        changeDisplay: change == null
          ? null
          : `${change >= 0 ? '+' : ''}${Math.abs(change) >= 10 ? change.toFixed(1) : change.toFixed(2)}${priorPrint != null && Number(priorPrint) !== 0 ? '%' : ''}`,
      };
    };

    const keyRows = (props.keyReleases || []).map((row) => normalizeRow(row, {
      importance: 2,
      source: 'FRED',
      category: 'macro',
    }));
    const eventRows = (props.economicEvents || [])
      .filter((row) => {
        // Keep macro data releases; drop earnings/auctions noise from impact table
        const label = String(row.event || row.name || '');
        if (/earnings|auction/i.test(label)) return false;
        return (row.country === 'US' || row.source === 'FRED' || Number(row.importance) >= 2);
      })
      .map((row) => normalizeRow(row, { importance: 1, source: 'Calendar' }));

    const unique = new Map();
    // Prefer keyReleases (richer previous/prior) then events
    [...keyRows, ...eventRows].forEach((row) => {
      if (!row.date || !row.label) return;
      const key = `${row.date}-${row.label}`;
      const existing = unique.get(key);
      if (!existing) {
        unique.set(key, row);
        return;
      }
      // Prefer the row with more filled numeric columns / higher importance
      const score = (r) => (r.previous != null ? 4 : 0) + (r.priorPrint != null ? 2 : 0)
        + (r.actual != null ? 2 : 0) + (r.forecast != null ? 1 : 0) + (r.importance || 0);
      if (score(row) > score(existing)) unique.set(key, row);
    });

    return [...unique.values()]
      .sort((a, b) => (b.importance - a.importance) || String(a.date).localeCompare(String(b.date)))
      .slice(0, 16);
  }, [props]);

  const catalystRows = useMemo(() => {
    if (!props) return [];
    const rows = [];
    (props.economicEvents || []).forEach(row => rows.push({
      date: row.date,
      type: 'Macro',
      label: row.event || row.name || row.label || 'Economic event',
      channel: row.category || row.country || 'Rates / risk',
      detail: [row.actual != null ? `actual ${row.actual}` : null, row.forecast != null ? `forecast ${row.forecast}` : null].filter(Boolean).join(' / ') || row.source || 'calendar',
      importance: Number(row.importance ?? 1),
    }));
    (props.keyReleases || []).forEach(row => {
      const prev = row.previousValue ?? row.previous ?? row.lastPrint;
      const prior = row.priorPrint;
      rows.push({
        date: row.date,
        type: 'US Data',
        label: row.name || row.label || row.event || 'Key release',
        channel: row.category || 'Macro',
        detail: [
          prev != null ? `last ${prev}` : null,
          prior != null ? `prior ${prior}` : null,
          row.lastActualDate ? `as of ${row.lastActualDate}` : null,
        ].filter(Boolean).join(' · ') || 'scheduled release',
        importance: 2,
      });
    });
    (props.centralBanks || []).forEach(row => rows.push({
      date: row.date || row.meetingDate || row.nextMeeting,
      type: 'Central Bank',
      label: row.bank || row.name || 'Policy meeting',
      channel: 'Rates / FX',
      detail: [row.rate != null ? `rate ${row.rate}%` : null, row.daysUntil != null ? `${row.daysUntil}d` : null].filter(Boolean).join(' / ') || 'meeting',
      importance: row.daysUntil != null && row.daysUntil <= 14 ? 3 : 2,
    }));
    (props.treasuryAuctions || []).forEach(row => {
      const rawAmt = row.amount ?? row.offeringAmount;
      const n = typeof rawAmt === 'number' ? rawAmt : Number(String(rawAmt || '').replace(/[$,\s]/g, ''));
      let amtLabel = rawAmt;
      if (Number.isFinite(n)) {
        const abs = Math.abs(n);
        if (abs >= 1e12) amtLabel = `$${(abs / 1e12).toFixed(abs >= 1e13 ? 1 : 2)}T`;
        else if (abs >= 1e9) amtLabel = `$${(abs / 1e9).toFixed(abs >= 1e11 ? 0 : 1)}B`;
        else if (abs >= 1e6) amtLabel = `$${(abs / 1e6).toFixed(abs >= 1e8 ? 0 : 1)}M`;
        else if (abs >= 1e3) amtLabel = `$${(abs / 1e3).toFixed(0)}K`;
      }
      rows.push({
        date: row.date || row.auctionDate,
        type: 'Treasury',
        label: row.security || row.term || row.type || 'Auction',
        channel: 'Rates / liquidity',
        detail: [amtLabel, row.cusip].filter(Boolean).join(' / ') || 'auction',
        importance: 2,
      });
    });
    (props.earningsSeason || []).forEach(row => rows.push({
      date: row.date,
      type: 'Earnings',
      label: row.ticker || row.symbol || row.name || 'Earnings',
      channel: row.sector || 'Equities',
      detail: [row.epsEst != null ? `EPS est ${row.epsEst}` : null, row.marketCap ? `mcap ${row.marketCap}` : null].filter(Boolean).join(' / ') || 'report',
      importance: 1,
    }));
    (props.optionsExpiry || []).forEach(row => rows.push({
      date: row.date,
      type: 'Options',
      label: row.type || 'Expiry',
      channel: 'Volatility',
      detail: row.description || 'monthly expiry',
      importance: 1,
    }));
    return rows
      .filter(row => row.date && row.label)
      .sort((a, b) => (b.importance - a.importance) || String(a.date).localeCompare(String(b.date)))
      .slice(0, 18);
  }, [props]);

  if (!centralData) return <MarketSkeleton />;
  
  return (
    <div className="cal-market">
      <div className="cal-dashboard cal-dashboard--bento">
        <BentoWrapper layout={LAYOUT} storageKey="calendar-layout-v6">
          {/* KPI strip — first bento child, full-width row 0. */}
          <BentoCard
            key="kpi"
            title="Calendar Key Metrics"
            accent="calendar"
            className="cal-bento-card"
            contentClassName="cal-panel-scroll"
            source="FRED / Yahoo Finance"
            timestamp={props.lastUpdated}
            isLive={props.isLive}
            isCurrent={props.isCurrent}
            fetchedOn={props.fetchedOn}
            fetchLog={props.fetchLog}
            error={props.error}
          >
            <MarketKpiStrip kpis={kpis} bare />
          </BentoCard>
          <BentoCard
            key="sidebar"
            title="Calendar Summary"
            subtitle={dataReady
              ? `${sidebarStats.totalEcon} macro · ${sidebarStats.totalEarn} earnings · ${sidebarStats.totalCB} CBs`
              : 'Loading calendar…'}
            accent="calendar"
            className="cal-bento-card"
            contentClassName="cal-panel-scroll"
            source="FRED / Econdb / Yahoo Finance"
            timestamp={props.lastUpdated}
            isLive={props.isLive || dataReady}
            isCurrent={props.isCurrent}
            fetchedOn={props.fetchedOn}
            fetchLog={props.fetchLog}
            error={props.error}
          >
            <div className="cal-summary">
              {/* Snapshot counts */}
              <div className="cal-summary-grid">
                {[
                  { label: 'Today', value: dataReady ? sidebarStats.todayCount : null, sub: `${sidebarStats.todayHighImpact} high impact`, hot: sidebarStats.todayCount > 0 },
                  { label: 'Next 7 days', value: dataReady ? sidebarStats.next7EventCount : null, sub: `${sidebarStats.next7HighImpact} high · ${sidebarStats.next7Earnings} earns`, hot: sidebarStats.next7HighImpact > 0 },
                  { label: 'Next 30 days', value: dataReady ? sidebarStats.next30EventCount : null, sub: `${sidebarStats.next30HighImpact} high impact`, hot: false },
                  { label: 'Key releases', value: dataReady ? sidebarStats.totalKeys : null, sub: `${sidebarStats.next7Keys} in 7d`, hot: false },
                ].map(card => (
                  <div key={card.label} className={`cal-summary-chip ${card.hot ? 'is-hot' : ''}`}>
                    <span className="cal-summary-chip-label">{card.label}</span>
                    <strong className="cal-summary-chip-value">
                      {card.value == null ? '—' : card.value}
                    </strong>
                    <span className="cal-summary-chip-sub">{card.sub}</span>
                  </div>
                ))}
              </div>

              {/* Next central bank */}
              <div className="cal-sidebar-section">
                <div className="cal-sidebar-title">Next Central Bank</div>
                {sidebarStats.nextCB ? (
                  <>
                    <div className="cal-sidebar-metric">
                      <span className="cal-sidebar-metric-label">{sidebarStats.nextCB.bank}</span>
                      <span className="cal-sidebar-metric-value accent">
                        <MetricValue
                          value={sidebarStats.nextCB.daysUntil}
                          seriesKey="calNextCB"
                          timestamp={props.lastUpdated}
                          format={v => `${Math.round(v)}d`}
                        />
                      </span>
                    </div>
                    <div className="cal-sidebar-metric">
                      <span className="cal-sidebar-metric-label">Meeting</span>
                      <span className="cal-sidebar-metric-num">{sidebarStats.nextCB.nextMeeting || '—'}</span>
                    </div>
                    <div className="cal-sidebar-metric">
                      <span className="cal-sidebar-metric-label">Policy rate</span>
                      <span className="cal-sidebar-metric-num">
                        {sidebarStats.nextCB.rate != null ? `${sidebarStats.nextCB.rate}%` : '—'}
                        {sidebarStats.nextCB.previousRate != null && sidebarStats.nextCB.previousRate !== sidebarStats.nextCB.rate
                          ? ` · was ${sidebarStats.nextCB.previousRate}%`
                          : ''}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="cal-summary-empty">No upcoming CB meeting in feed</div>
                )}
              </div>

              {/* Policy rates strip */}
              {sidebarStats.policyRates.length > 0 && (
                <div className="cal-sidebar-section">
                  <div className="cal-sidebar-title">Policy Rates</div>
                  <div className="cal-summary-rates">
                    {sidebarStats.policyRates.map((cb, i) => (
                      <div key={`${cb.bank || 'cb'}-${i}`} className="cal-summary-rate-pill">
                        <span className="cal-summary-rate-bank">{cb.bank}</span>
                        <strong className="cal-summary-rate-val">
                          {cb.rate != null ? `${Number(cb.rate).toFixed(2)}%` : '—'}
                        </strong>
                        {cb.daysUntil != null && cb.daysUntil >= 0 && (
                          <span className="cal-summary-rate-meet">{cb.daysUntil}d</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Next macro events */}
              <div className="cal-sidebar-section">
                <div className="cal-sidebar-title">Next Macro Events</div>
                {sidebarStats.nextEcon.length === 0 ? (
                  <div className="cal-summary-empty">No upcoming macro events</div>
                ) : (
                  <div className="cal-summary-list">
                    {sidebarStats.nextEcon.map((e, i) => (
                      <div key={`${e._date}-${eventLabel(e)}-${i}`} className="cal-summary-row">
                        <span className="cal-summary-row-date">{e._date?.slice(5)}</span>
                        <span className="cal-summary-row-name" title={eventLabel(e)}>
                          {isHighImpact(e) && <span className="cal-summary-dot" />}
                          {eventLabel(e)}
                        </span>
                        <span className="cal-summary-row-meta">{e.country || e.category || ''}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Next earnings */}
              <div className="cal-sidebar-section">
                <div className="cal-sidebar-title">Next Earnings</div>
                {sidebarStats.nextEarn.length === 0 ? (
                  <div className="cal-summary-empty">No upcoming earnings</div>
                ) : (
                  <div className="cal-summary-list">
                    {sidebarStats.nextEarn.map((e, i) => (
                      <div key={`${e.ticker || e.name}-${e._date}-${i}`} className="cal-summary-row">
                        <span className="cal-summary-row-date">{e._date?.slice(5)}</span>
                        <span className="cal-summary-row-name">
                          <strong>{e.ticker || e.symbol || ''}</strong>
                          {e.name ? ` · ${e.name}` : ''}
                        </span>
                        <span className="cal-summary-row-meta">
                          {e.epsEst != null ? `est $${Number(e.epsEst).toFixed(2)}` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Treasury / options catalysts */}
              {(sidebarStats.nextTreasury.length > 0 || sidebarStats.nextOptions.length > 0) && (
                <div className="cal-sidebar-section" style={{ borderBottom: 'none' }}>
                  <div className="cal-sidebar-title">Other Catalysts</div>
                  <div className="cal-summary-list">
                    {sidebarStats.nextTreasury.map((t, i) => (
                      <div key={`t-${t._date}-${i}`} className="cal-summary-row">
                        <span className="cal-summary-row-date">{t._date?.slice(5)}</span>
                        <span className="cal-summary-row-name">{eventLabel(t)}</span>
                        <span className="cal-summary-row-meta">Treasury</span>
                      </div>
                    ))}
                    {sidebarStats.nextOptions.map((o, i) => (
                      <div key={`o-${o._date}-${i}`} className="cal-summary-row">
                        <span className="cal-summary-row-date">{o._date?.slice(5)}</span>
                        <span className="cal-summary-row-name">{eventLabel(o)}</span>
                        <span className="cal-summary-row-meta">Options</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </BentoCard>

          <BentoCard
            key="economic"
            title="Economic Calendar"
            subtitle={props.coverage?.low ? <>High-importance macro releases · next 30 days · <PartialState>low coverage</PartialState></> : 'High-importance macro releases · next 30 days'}
            accent="calendar"
            className="cal-bento-card"
            contentClassName="cal-panel-scroll"
            source="FRED / Econdb"
            timestamp={props.lastUpdated}
            isLive={props.isLive}
            isCurrent={props.isCurrent}
            fetchedOn={props.fetchedOn}
            fetchLog={props.fetchLog}
            error={props.error}
          >
            {props.economicEvents.length > 0
              ? <EconomicCalendar economicEvents={props.economicEvents} insideBento />
              : <PanelEmpty label="economic events" />}
          </BentoCard>

          <BentoCard
            key="cb-rates"
            title="Central Bank Rates"
            subtitle="Fed / ECB / BOE / BOJ"
            accent="calendar"
            className="cal-bento-card"
            contentClassName="cal-panel-scroll"
            source="FRED / BIS"
            timestamp={props.lastUpdated}
            isLive={props.isLive}
            isCurrent={props.isCurrent}
            fetchedOn={props.fetchedOn}
            fetchLog={props.fetchLog}
            error={props.error}
          >
            {props.centralBanks.length > 0
              ? <CentralBankSchedule centralBanks={props.centralBanks} section="rates" />
              : <PanelEmpty label="central bank rates" />}
          </BentoCard>

          <BentoCard
            key="cb-timeline"
            title="Upcoming Meetings"
            accent="calendar"
            className="cal-bento-card"
            contentClassName="cal-panel-scroll"
            source="FRED / BIS"
            timestamp={props.lastUpdated}
            isLive={props.isLive}
            isCurrent={props.isCurrent}
            fetchedOn={props.fetchedOn}
            fetchLog={props.fetchLog}
            error={props.error}
          >
            {props.centralBanks.length > 0
              ? <CentralBankSchedule centralBanks={props.centralBanks} section="timeline" />
              : <PanelEmpty label="meeting schedule" />}
          </BentoCard>

          <BentoCard
            key="earnings"
            title="Earnings Season"
            subtitle="Mega-cap earnings · next 60 days"
            accent="calendar"
            className="cal-bento-card"
            contentClassName="cal-panel-scroll"
            source="Yahoo Finance"
            timestamp={props.lastUpdated}
            isLive={props.isLive}
            isCurrent={props.isCurrent}
            fetchedOn={props.fetchedOn}
            fetchLog={props.fetchLog}
            error={props.error}
          >
            {props.earningsSeason.length > 0
              ? <EarningsSeason earningsSeason={props.earningsSeason} dividendCalendar={props.dividendCalendar} insideBento />
              : <PanelEmpty label="earnings data" />}
          </BentoCard>

          <BentoCard
            key="key-data"
            title="Key US Releases"
            subtitle="Scheduled macro data"
            accent="calendar"
            className="cal-bento-card"
            contentClassName="cal-panel-scroll"
            source="FRED / BLS"
            timestamp={props.lastUpdated}
            isLive={props.isLive}
            isCurrent={props.isCurrent}
            fetchedOn={props.fetchedOn}
            fetchLog={props.fetchLog}
            error={props.error}
          >
            {(props.keyReleases?.length > 0 || props.economicEvents?.some((e) => e.country === 'US' && e.source === 'FRED'))
              ? (
                <KeyReleases
                  keyReleases={
                    props.keyReleases?.length
                      ? props.keyReleases
                      : (props.economicEvents || [])
                        .filter((e) => e.country === 'US' && (e.source === 'FRED' || e.importance >= 2))
                        .filter((e) => !/earnings|auction/i.test(e.event || ''))
                        .map((e) => ({
                          name: e.event,
                          date: e.date,
                          category: e.category || 'macro',
                          previousValue: e.previous ?? null,
                        }))
                  }
                  section="data"
                />
              )
              : <PanelEmpty label="key releases" />}
          </BentoCard>

          <BentoCard
            key="treasury"
            title="Treasury Auctions"
            subtitle="US Treasury schedule"
            accent="calendar"
            className="cal-bento-card"
            contentClassName="cal-panel-scroll"
            source="US Treasury"
            timestamp={props.lastUpdated}
            isLive={props.isLive}
            isCurrent={props.isCurrent}
            fetchedOn={props.fetchedOn}
            fetchLog={props.fetchLog}
            error={props.error}
          >
            {props.treasuryAuctions && props.treasuryAuctions.length > 0
              ? <KeyReleases keyReleases={[]} treasuryAuctions={props.treasuryAuctions} optionsExpiry={[]} section="treasury" />
              : <PanelEmpty label="treasury auctions" />}
          </BentoCard>

          <BentoCard
            key="options"
            title="Options Expiry"
            subtitle="Monthly expiry dates"
            accent="calendar"
            className="cal-bento-card"
            contentClassName="cal-panel-scroll"
            source="CBOE / Yahoo Finance"
            timestamp={props.lastUpdated}
            isLive={props.isLive}
            isCurrent={props.isCurrent}
            fetchedOn={props.fetchedOn}
            fetchLog={props.fetchLog}
            error={props.error}
          >
            {(props.optionsExpiry && props.optionsExpiry.length > 0) ? (
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
                  {props.optionsExpiry.map((e, i) => {
                    const days = (() => {
                      if (!e.date) return null;
                      const t = new Date(`${e.date}T12:00:00Z`);
                      if (Number.isNaN(t.getTime())) return null;
                      return Math.round((t - Date.now()) / 86400000);
                    })();
                    return (
                      <tr key={`${e.date}-${i}`} className={days != null && days <= 7 ? 'cal-upcoming' : undefined}>
                        <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>{i + 1}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 600, color: '#f43f5e' }}>{e.date}</td>
                        <td style={{ fontSize: 11, color: 'var(--text-primary)', fontWeight: 500 }}>{e.type || 'Monthly Options Expiry'}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: 11, textAlign: 'right', color: days != null && days <= 7 ? '#fbbf24' : 'var(--text-muted)' }}>
                          {days == null ? '—' : days < 0 ? 'passed' : days === 0 ? 'today' : `${days}d`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="cal-empty">No upcoming options expiry dates</div>
            )}
          </BentoCard>

          <BentoCard
            key="release-impact"
            title="Release Impact Tracker"
            subtitle={`${releaseImpactRows.length} US data releases · last print from FRED (no consensus feed)`}
            accent="calendar"
            className="cal-bento-card"
            contentClassName="cal-panel-scroll"
            source="FRED release calendars + series"
            timestamp={props.lastUpdated}
            isLive={props.isLive}
            isCurrent={props.isCurrent}
            fetchedOn={props.fetchedOn}
            fetchLog={props.fetchLog}
            error={props.error}
          >
            {releaseImpactRows.length > 0 ? (
              <table className="cal-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Date</th>
                    <th style={{ textAlign: 'left' }}>Release</th>
                    <th style={{ textAlign: 'left' }}>Category</th>
                    <th style={{ textAlign: 'right' }}>Last Print</th>
                    <th style={{ textAlign: 'right' }}>Prior</th>
                    <th style={{ textAlign: 'right' }}>Chg</th>
                    <th style={{ textAlign: 'right' }}>As of</th>
                    <th style={{ textAlign: 'right' }}>Impact</th>
                  </tr>
                </thead>
                <tbody>
                  {releaseImpactRows.map((row, i) => (
                    <tr key={`${row.date}-${row.label}-${i}`}>
                      <td style={{ fontVariantNumeric: 'tabular-nums', fontFamily: 'monospace', fontSize: 11 }}>{row.date}</td>
                      <td style={{ fontWeight: 500 }}>{row.label}</td>
                      <td style={{ textTransform: 'capitalize', color: 'var(--text-muted)', fontSize: 11 }}>{row.category}</td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontFamily: 'monospace', fontWeight: 600 }}>
                        {row.previousDisplay ?? '—'}
                      </td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                        {row.priorDisplay ?? '—'}
                      </td>
                      <td style={{
                        textAlign: 'right',
                        fontVariantNumeric: 'tabular-nums',
                        fontFamily: 'monospace',
                        fontWeight: 600,
                        color: row.change == null ? 'var(--text-dim)'
                          : row.change > 0 ? '#22c55e'
                          : row.change < 0 ? '#f87171'
                          : 'var(--text-muted)',
                      }}>
                        {row.changeDisplay ?? '—'}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: 10, color: 'var(--text-muted)' }}>
                        {row.lastActualDate || '—'}
                      </td>
                      <td style={{ textAlign: 'right', color: row.importance >= 2 ? '#f87171' : 'var(--text-muted)', fontWeight: 600, fontSize: 11 }}>
                        {row.importance >= 2 ? 'High' : 'Normal'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <PanelEmpty label="release impact data" />
            )}
          </BentoCard>

          <BentoCard
            key="catalyst-wall"
            title="Market Catalyst Wall"
            subtitle={`${catalystRows.length} cross-market catalysts from current calendar snapshot`}
            accent="calendar"
            className="cal-bento-card"
            contentClassName="cal-panel-scroll"
            source="FRED / Econdb / Treasury / Yahoo Finance"
            timestamp={props.lastUpdated}
            isLive={props.isLive}
            isCurrent={props.isCurrent}
            fetchedOn={props.fetchedOn}
            fetchLog={props.fetchLog}
            error={props.error}
          >
            {catalystRows.length > 0 ? (
              <table className="cal-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Catalyst</th>
                    <th>Market Channel</th>
                    <th>Detail</th>
                    <th style={{ textAlign: 'right' }}>Impact</th>
                  </tr>
                </thead>
                <tbody>
                  {catalystRows.map((row, i) => (
                    <tr key={`${row.date}-${row.type}-${row.label}-${i}`}>
                      <td style={{ fontVariantNumeric: 'tabular-nums' }}>{row.date}</td>
                      <td>{row.type}</td>
                      <td>{row.label}</td>
                      <td>{row.channel}</td>
                      <td>{row.detail}</td>
                      <td style={{ textAlign: 'right', color: row.importance >= 3 ? '#f87171' : row.importance >= 2 ? '#f59e0b' : 'var(--text-muted)' }}>
                        {row.importance >= 3 ? 'High' : row.importance >= 2 ? 'Medium' : 'Watch'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <PanelEmpty label="market catalysts" />
            )}
          </BentoCard>
        </BentoWrapper>
      </div>
    </div>
  );
}

export default React.memo(CalendarMarket);
