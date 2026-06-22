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

// Top-of-grid KPI strip is now a real bento panel (`kpi`); other panels
// shifted down by 2 rows. Storage key bumped accordingly.
const LAYOUT = {
  lg: [
    { i: 'kpi', x: 0, y: 0, w: 12, h: 2 },
    { i: 'economic', x: 0, y: 2, w: 8, h: 5 },
    { i: 'sidebar', x: 8, y: 2, w: 4, h: 5 },
    { i: 'cb-rates', x: 0, y: 7, w: 4, h: 3 },
    { i: 'cb-timeline', x: 4, y: 7, w: 4, h: 3 },
    { i: 'earnings', x: 0, y: 10, w: 5, h: 5 },
    { i: 'key-data', x: 5, y: 10, w: 4, h: 5 },
    { i: 'treasury', x: 9, y: 7, w: 3, h: 4 },
    { i: 'options', x: 9, y: 11, w: 3, h: 4 },
    { i: 'release-impact', x: 0, y: 15, w: 12, h: 4 },
  ]
};

function getCalendarProps(centralData) {
    const d = centralData.data || {};
    const normalized = normalizeCalendarData(d);
    return {
      economicEvents: normalized.values.economicEvents,
      centralBanks: normalized.values.centralBanks,
      earningsSeason: normalized.values.earningsSeason,
      keyReleases: normalized.values.keyReleases,
      treasuryAuctions: normalized.values.treasuryAuctions,
      optionsExpiry: normalized.values.optionsExpiry,
      dividendCalendar: normalized.values.dividendCalendar,
      coverage: normalized.values.coverage,
      isLive: centralData.isLive,
      lastUpdated: centralData.lastUpdated,
    isLoading: centralData.isLoading,
    fetchedOn: centralData.fetchedOn,
    isCurrent: centralData.isCurrent,
    isHistorical: centralData.isHistorical,
    asOfDate: centralData.asOfDate,
    fetchLog: centralData.fetchLog || [],
    error: centralData.error,
    refetch: centralData.refetch,
    normalized,
  };
}

function CalendarMarket({ centralData } = {}) {
  if (!centralData) return <MarketSkeleton />;
  const props = getCalendarProps(centralData);

  if (props.isLoading) return <MarketSkeleton />;

  const dataReady = props.isLive || props.economicEvents.length || props.centralBanks.length || props.earningsSeason.length || props.keyReleases.length;

  const sidebarStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const dayOfWeek = now.getDay();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const weekStartStr = weekStart.toISOString().split('T')[0];
    const weekEndStr = weekEnd.toISOString().split('T')[0];

    const todayEvents = (props.economicEvents || []).filter(e => e.date === today);
    const todayHighImpact = todayEvents.filter(e => (e.importance || 0) >= 2);
    const weekEvents = (props.economicEvents || []).filter(e => e.date >= weekStartStr && e.date <= weekEndStr);
    const weekHighImpact = weekEvents.filter(e => (e.importance || 0) >= 2);
    const weekEarnings = (props.earningsSeason || []).filter(e => e.date >= weekStartStr && e.date <= weekEndStr);
    const nextCB = (props.centralBanks || [])
      .filter(cb => cb.daysUntil != null && cb.daysUntil >= 0)
      .sort((a, b) => a.daysUntil - b.daysUntil)[0] || null;

    return {
      todayCount: todayEvents.length,
      todayHighImpact: todayHighImpact.length,
      weekEventCount: weekEvents.length,
      weekHighImpact: weekHighImpact.length,
      weekEarnings: weekEarnings.length,
      nextCB,
    };
  }, [props.economicEvents, props.centralBanks, props.earningsSeason]);

  const kpis = useMemo(() => {
    return [
      { label: 'Today High Impact', value: sidebarStats.todayHighImpact, color: sidebarStats.todayHighImpact > 0 ? '#f87171' : 'var(--text-primary)', trend: null, sublabel: 'Events' },
      { label: 'Next CB Meeting', value: sidebarStats.nextCB?.daysUntil != null ? `${sidebarStats.nextCB.daysUntil}d` : '—', color: 'var(--text-primary)', trend: null, sublabel: sidebarStats.nextCB?.bank || 'No Data' },
      { label: 'Earnings This Week', value: sidebarStats.weekEarnings, color: 'var(--text-primary)', trend: null, sublabel: 'Companies' },
    ];
  }, [sidebarStats]);

  const releaseImpactRows = useMemo(() => {
    const keyRows = (props.keyReleases || []).map(row => ({
      date: row.date,
      label: row.name || row.label || row.event || 'Key release',
      category: row.category || 'macro',
      actual: row.actual ?? null,
      forecast: row.forecast ?? null,
      previous: row.previous ?? row.previousValue ?? null,
      importance: 2,
      source: 'FRED',
    }));
    const eventRows = (props.economicEvents || []).map(row => ({
      date: row.date,
      label: row.event || row.name || row.label || 'Economic event',
      category: row.category || row.country || 'macro',
      actual: row.actual ?? null,
      forecast: row.forecast ?? null,
      previous: row.previous ?? row.previousValue ?? null,
      importance: Number(row.importance ?? 1),
      source: row.source || row.country || 'Calendar',
    }));
    const unique = new Map();
    [...keyRows, ...eventRows].forEach(row => {
      if (!row.date || !row.label) return;
      const key = `${row.date}-${row.label}`;
      if (!unique.has(key) || row.importance > unique.get(key).importance) unique.set(key, row);
    });
    return [...unique.values()]
      .sort((a, b) => (b.importance - a.importance) || String(a.date).localeCompare(String(b.date)))
      .slice(0, 14);
  }, [props.keyReleases, props.economicEvents]);

  return (
    <div className="cal-market">
      <div className="cal-dashboard cal-dashboard--bento">
        <BentoWrapper layout={LAYOUT} storageKey="calendar-layout-v3">
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
            accent="calendar"
            className="cal-bento-card"
            contentClassName="cal-panel-scroll"
            source="FRED / Econdb / Yahoo Finance"
            timestamp={props.lastUpdated}
            isLive={props.isLive}
            isCurrent={props.isCurrent}
            fetchedOn={props.fetchedOn}
            fetchLog={props.fetchLog}
            error={props.error}
          >
            <>
              <div className="cal-sidebar-section">
                <div className="cal-sidebar-title">Today</div>
                <div className="cal-sidebar-metric">
                  <span className="cal-sidebar-metric-label">Events</span>
                  <span className="cal-sidebar-metric-value" style={{ color: sidebarStats.todayCount > 0 ? '#f43f5e' : 'var(--text-secondary)' }}>
                    {(sidebarStats.todayCount > 0 || dataReady) ? sidebarStats.todayCount : '—'}
                  </span>
                </div>
                <div className="cal-sidebar-metric">
                  <span className="cal-sidebar-metric-label">Key Releases</span>
                  <span className="cal-sidebar-metric-value">
                    {(props.keyReleases || []).filter(r => r.date === new Date().toISOString().split('T')[0]).length || (dataReady ? '0' : '—')}
                  </span>
                </div>
              </div>

              <div className="cal-sidebar-section">
                <div className="cal-sidebar-title">This Week</div>
                <div className="cal-sidebar-metric">
                  <span className="cal-sidebar-metric-label">Events</span>
                  <span className="cal-sidebar-metric-value">
                    {(sidebarStats.weekEventCount > 0 || dataReady) ? sidebarStats.weekEventCount : '—'}
                  </span>
                </div>
                <div className="cal-sidebar-metric">
                  <span className="cal-sidebar-metric-label">High Impact</span>
                  <span className="cal-sidebar-metric-value" style={{ color: sidebarStats.weekHighImpact > 0 ? '#f87171' : 'var(--text-secondary)' }}>
                    {(sidebarStats.weekHighImpact > 0 || dataReady) ? sidebarStats.weekHighImpact : '—'}
                  </span>
                </div>
                <div className="cal-sidebar-metric">
                  <span className="cal-sidebar-metric-label">Earnings</span>
                  <span className="cal-sidebar-metric-value">
                    {(sidebarStats.weekEarnings > 0 || dataReady) ? sidebarStats.weekEarnings : '—'}
                  </span>
                </div>
              </div>

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
                      <span className="cal-sidebar-metric-label">Rate</span>
                      <span className="cal-sidebar-metric-num">
                        {sidebarStats.nextCB.rate != null ? `${sidebarStats.nextCB.rate}%` : '—'}
                      </span>
                    </div>
                    {sidebarStats.nextCB.previousRate != null && (
                      <div className="cal-sidebar-metric">
                        <span className="cal-sidebar-metric-label">Previous</span>
                        <span className="cal-sidebar-metric-num" style={{ color: 'var(--text-muted)' }}>
                          {sidebarStats.nextCB.previousRate}%
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="cal-sidebar-metric">
                    <span className="cal-sidebar-metric-label">—</span>
                    <span className="cal-sidebar-metric-value">No data</span>
                  </div>
                )}
              </div>

              {(props.centralBanks || []).length > 0 && (
                <div className="cal-sidebar-section" style={{ borderBottom: 'none' }}>
                  <div className="cal-sidebar-title">Policy Rates</div>
                  {props.centralBanks.map(cb => (
                    <div key={cb.bank} className="cal-sidebar-metric">
                      <span className="cal-sidebar-metric-label">{cb.bank}</span>
                      <span className="cal-sidebar-metric-num" style={{ color: cb.rate != null ? '#f43f5e' : 'var(--text-muted)' }}>
                        {cb.rate != null ? `${cb.rate}%` : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
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
            {props.keyReleases.length > 0
              ? <KeyReleases keyReleases={props.keyReleases} section="data" />
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
              <div className="cal-options-grid">
                {props.optionsExpiry.map((e, i) => (
                  <div key={i} className="cal-options-card">
                    <span className="cal-options-date">{e.date}</span>
                    <span className="cal-options-type">{e.type}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="cal-empty">No upcoming options expiry dates</div>
            )}
          </BentoCard>

          <BentoCard
            key="release-impact"
            title="Release Impact Tracker"
            subtitle={`${releaseImpactRows.length} high-priority releases · actual / forecast / previous when available`}
            accent="calendar"
            className="cal-bento-card"
            contentClassName="cal-panel-scroll"
            source="FRED / Econdb / BLS"
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
                    <th>Date</th>
                    <th>Release</th>
                    <th>Category</th>
                    <th style={{ textAlign: 'right' }}>Actual</th>
                    <th style={{ textAlign: 'right' }}>Forecast</th>
                    <th style={{ textAlign: 'right' }}>Previous</th>
                    <th style={{ textAlign: 'right' }}>Impact</th>
                  </tr>
                </thead>
                <tbody>
                  {releaseImpactRows.map((row, i) => (
                    <tr key={`${row.date}-${row.label}-${i}`}>
                      <td style={{ fontVariantNumeric: 'tabular-nums' }}>{row.date}</td>
                      <td>{row.label}</td>
                      <td>{row.category}</td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{row.actual ?? '—'}</td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{row.forecast ?? '—'}</td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{row.previous ?? '—'}</td>
                      <td style={{ textAlign: 'right', color: row.importance >= 2 ? '#f87171' : 'var(--text-muted)' }}>
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
        </BentoWrapper>
      </div>
    </div>
  );
}

export default React.memo(CalendarMarket);
