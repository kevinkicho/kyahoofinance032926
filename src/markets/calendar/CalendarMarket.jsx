import React from 'react';
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
  return <div className="cal-empty cal-empty--loading">{label ? `Press ▶ to fetch ${label}` : 'Press ▶ to load data'}</div>;
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

function getCalendarProps(centralData) {
  const d = centralData.data || {};
  return {
    economicEvents: d.economicEvents || [],
    centralBanks: d.centralBanks || [],
    earningsSeason: d.earningsSeason || [],
    keyReleases: d.keyReleases || [],
    treasuryAuctions: d.treasuryAuctions || [],
    optionsExpiry: d.optionsExpiry || [],
    dividendCalendar: d.dividendCalendar || [],
    isLive: centralData.isLive,
    lastUpdated: centralData.lastUpdated,
    isLoading: centralData.isLoading,
    fetchedOn: centralData.fetchedOn,
    isCurrent: centralData.isCurrent,
    fetchLog: centralData.fetchLog || [],
    error: centralData.error,
    refetch: centralData.refetch,
  };
}

function CalendarMarket({ centralData } = {}) {
  if (!centralData) return <MarketSkeleton />;
  const props = getCalendarProps(centralData);

  if (props.isLoading) return <MarketSkeleton />;

  const dataReady = props.isLive || props.economicEvents.length || props.centralBanks.length || props.earningsSeason.length || props.keyReleases.length;

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
              {props.economicEvents.length > 0
                ? <EconomicCalendar economicEvents={props.economicEvents} insideBento />
                : <PanelEmpty label="economic events" />}
            </div>
            <DataFooter source="Econdb / FRED" timestamp={props.lastUpdated} isLive={props.isLive} fetchLog={props.fetchLog} error={props.error} fetchedOn={props.fetchedOn} isCurrent={props.isCurrent} />
          </div>

          <div key="cb-rates" className="cal-bento-card">
            <div className="cal-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">Central Bank Rates</span>
              <span className="bento-panel-subtitle">Fed / ECB / BOE / BOJ</span>
            </div>
            <div className="bento-panel-content cal-panel-scroll" onMouseDown={stopDrag}>
              {props.centralBanks.length > 0
                ? <CentralBankSchedule centralBanks={props.centralBanks} section="rates" />
                : <PanelEmpty label="central bank rates" />}
            </div>
            <DataFooter source="FRED / BIS" timestamp={props.lastUpdated} isLive={props.isLive} fetchLog={props.fetchLog} error={props.error} fetchedOn={props.fetchedOn} isCurrent={props.isCurrent} />
          </div>

          <div key="cb-timeline" className="cal-bento-card">
            <div className="cal-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">Upcoming Meetings</span>
            </div>
            <div className="bento-panel-content cal-panel-scroll" onMouseDown={stopDrag}>
              {props.centralBanks.length > 0
                ? <CentralBankSchedule centralBanks={props.centralBanks} section="timeline" />
                : <PanelEmpty label="meeting schedule" />}
            </div>
            <DataFooter source="FRED / BIS" timestamp={props.lastUpdated} isLive={props.isLive} fetchLog={props.fetchLog} error={props.error} fetchedOn={props.fetchedOn} isCurrent={props.isCurrent} />
          </div>

          <div key="earnings" className="cal-bento-card">
            <div className="cal-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">Earnings Season</span>
              <span className="bento-panel-subtitle">Mega-cap earnings · next 60 days</span>
            </div>
            <div className="bento-panel-content cal-panel-scroll" onMouseDown={stopDrag}>
              {props.earningsSeason.length > 0
                ? <EarningsSeason earningsSeason={props.earningsSeason} dividendCalendar={props.dividendCalendar} insideBento />
                : <PanelEmpty label="earnings data" />}
            </div>
            <DataFooter source="Yahoo Finance" timestamp={props.lastUpdated} isLive={props.isLive} fetchLog={props.fetchLog} error={props.error} fetchedOn={props.fetchedOn} isCurrent={props.isCurrent} />
          </div>

          <div key="key-data" className="cal-bento-card">
            <div className="cal-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">Key US Releases</span>
              <span className="bento-panel-subtitle">Scheduled macro data</span>
            </div>
            <div className="bento-panel-content cal-panel-scroll" onMouseDown={stopDrag}>
              {props.keyReleases.length > 0
                ? <KeyReleases keyReleases={props.keyReleases} section="data" />
                : <PanelEmpty label="key releases" />}
            </div>
            <DataFooter source="FRED / BLS" timestamp={props.lastUpdated} isLive={props.isLive} fetchLog={props.fetchLog} error={props.error} fetchedOn={props.fetchedOn} isCurrent={props.isCurrent} />
          </div>

          <div key="treasury" className="cal-bento-card">
            <div className="cal-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">Treasury Auctions</span>
              <span className="bento-panel-subtitle">US Treasury schedule</span>
            </div>
            <div className="bento-panel-content cal-panel-scroll" onMouseDown={stopDrag}>
              {props.treasuryAuctions && props.treasuryAuctions.length > 0
                ? <KeyReleases keyReleases={[]} treasuryAuctions={props.treasuryAuctions} optionsExpiry={[]} section="treasury" />
                : <PanelEmpty label="treasury auctions" />}
            </div>
            <DataFooter source="US Treasury" timestamp={props.lastUpdated} isLive={props.isLive} fetchLog={props.fetchLog} error={props.error} fetchedOn={props.fetchedOn} isCurrent={props.isCurrent} />
          </div>

          <div key="options" className="cal-bento-card">
            <div className="cal-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">Options Expiry</span>
              <span className="bento-panel-subtitle">Monthly expiry dates</span>
            </div>
            <div className="bento-panel-content cal-panel-scroll" onMouseDown={stopDrag}>
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
            </div>
            <DataFooter source="CBOE / Yahoo Finance" timestamp={props.lastUpdated} isLive={props.isLive} fetchLog={props.fetchLog} error={props.error} fetchedOn={props.fetchedOn} isCurrent={props.isCurrent} />
          </div>
        </BentoWrapper>
      </div>
    </div>
  );
}

export default React.memo(CalendarMarket);