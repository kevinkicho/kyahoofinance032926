// src/markets/calendar/CalendarMarket.jsx
import React from 'react';
import { useCalendarData } from './data/useCalendarData';
import BentoWrapper from '../../components/BentoWrapper';
import MarketSkeleton from '../../hub/MarketSkeleton';
import EconomicCalendar from './components/EconomicCalendar';
import CentralBankSchedule from './components/CentralBankSchedule';
import EarningsSeason from './components/EarningsSeason';
import KeyReleases from './components/KeyReleases';
import DataFooter from '../../components/DataFooter/DataFooter';
import './CalendarMarket.css';

const stopDrag = (e) => e.stopPropagation();

function PanelEmpty({ label }) {
  return <div className="cal-empty cal-empty--loading">{label ? `Loading ${label}…` : 'Loading data…'}</div>;
}

const LAYOUT = {
  lg: [
    { i: 'economic', x: 0, y: 0, w: 8, h: 5 },
    { i: 'cb-rates', x: 8, y: 0, w: 4, h: 3 },
    { i: 'cb-timeline', x: 8, y: 3, w: 4, h: 2 },
    { i: 'earnings', x: 0, y: 5, w: 8, h: 5 },
    { i: 'key-data', x: 8, y: 5, w: 4, h: 5 },
    { i: 'treasury', x: 0, y: 10, w: 6, h: 4 },
    { i: 'options', x: 6, y: 10, w: 6, h: 4 },
  ]
};

function CalendarMarket({ autoRefresh, refreshKey } = {}) {
  const {
    economicEvents, centralBanks, earningsSeason, keyReleases,
    treasuryAuctions, optionsExpiry, dividendCalendar,
    isLive, lastUpdated, isLoading, fetchedOn, isCurrent, fetchLog, refetch,
  } = useCalendarData(autoRefresh, refreshKey);

  if (isLoading) return <MarketSkeleton />;

  const dataReady = isLive || economicEvents.length || centralBanks.length || earningsSeason.length || keyReleases.length;

  return (
    <div className="cal-market">

      <div className="cal-dashboard cal-dashboard--bento">
        <BentoWrapper layout={LAYOUT} storageKey="calendar-layout">
          <div key="economic" className="cal-bento-card">
            <div className="cal-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">Economic Calendar</span>
              <span className="bento-panel-subtitle">High-importance macro releases · next 30 days</span>
            </div>
            <div className="bento-panel-content cal-panel-scroll" onMouseDown={stopDrag}>
              {economicEvents.length > 0
                ? <EconomicCalendar economicEvents={economicEvents} insideBento />
                : <PanelEmpty label="economic events" />}
            </div>
            <DataFooter source="Econdb / FRED" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} />
          </div>

          <div key="cb-rates" className="cal-bento-card">
            <div className="cal-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">Central Bank Rates</span>
              <span className="bento-panel-subtitle">Fed / ECB / BOE / BOJ</span>
            </div>
            <div className="bento-panel-content cal-panel-scroll" onMouseDown={stopDrag}>
              {centralBanks.length > 0
                ? <CentralBankSchedule centralBanks={centralBanks} section="rates" />
                : <PanelEmpty label="central bank rates" />}
            </div>
            <DataFooter source="FRED / BIS" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} />
          </div>

          <div key="cb-timeline" className="cal-bento-card">
            <div className="cal-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">Upcoming Meetings</span>
            </div>
            <div className="bento-panel-content cal-panel-scroll" onMouseDown={stopDrag}>
              {centralBanks.length > 0
                ? <CentralBankSchedule centralBanks={centralBanks} section="timeline" />
                : <PanelEmpty label="meeting schedule" />}
            </div>
            <DataFooter source="FRED / BIS" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} />
          </div>

          <div key="earnings" className="cal-bento-card">
            <div className="cal-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">Earnings Season</span>
              <span className="bento-panel-subtitle">Mega-cap earnings · next 60 days</span>
            </div>
            <div className="bento-panel-content cal-panel-scroll" onMouseDown={stopDrag}>
              {earningsSeason.length > 0
                ? <EarningsSeason earningsSeason={earningsSeason} dividendCalendar={dividendCalendar} insideBento />
                : <PanelEmpty label="earnings data" />}
            </div>
            <DataFooter source="Yahoo Finance" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} />
          </div>

          <div key="key-data" className="cal-bento-card">
            <div className="cal-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">Key US Releases</span>
              <span className="bento-panel-subtitle">Scheduled macro data</span>
            </div>
            <div className="bento-panel-content cal-panel-scroll" onMouseDown={stopDrag}>
              {keyReleases.length > 0
                ? <KeyReleases keyReleases={keyReleases} section="data" />
                : <PanelEmpty label="key releases" />}
            </div>
            <DataFooter source="FRED / BLS" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} />
          </div>

          <div key="treasury" className="cal-bento-card">
            <div className="cal-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">Treasury Auctions</span>
              <span className="bento-panel-subtitle">US Treasury schedule</span>
            </div>
            <div className="bento-panel-content cal-panel-scroll" onMouseDown={stopDrag}>
              {treasuryAuctions && treasuryAuctions.length > 0
                ? <KeyReleases keyReleases={[]} treasuryAuctions={treasuryAuctions} optionsExpiry={[]} section="treasury" />
                : <PanelEmpty label="treasury auctions" />}
            </div>
            <DataFooter source="US Treasury" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} />
          </div>

          <div key="options" className="cal-bento-card">
            <div className="cal-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">Options Expiry</span>
              <span className="bento-panel-subtitle">Monthly expiry dates</span>
            </div>
            <div className="bento-panel-content cal-panel-scroll" onMouseDown={stopDrag}>
              {(optionsExpiry && optionsExpiry.length > 0) ? (
                <div className="cal-options-grid">
                  {optionsExpiry.map((e, i) => (
                    <div key={i} className="cal-options-card">
                      <span className="cal-options-date">{e.date}</span>
                      <span className="cal-options-type">{e.type}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="cal-empty">No upcoming options expiry dates</div>
              )}
            </div>
            <DataFooter source="CBOE / Yahoo Finance" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} />
          </div>
        </BentoWrapper>
      </div>
    </div>
  );
}

export default React.memo(CalendarMarket);