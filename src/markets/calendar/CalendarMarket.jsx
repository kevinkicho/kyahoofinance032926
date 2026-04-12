// src/markets/calendar/CalendarMarket.jsx
import React, { useState } from 'react';
import { useCalendarData } from './data/useCalendarData';
import BentoWrapper from '../../components/BentoWrapper';
import MarketSkeleton from '../../hub/MarketSkeleton';
import EconomicCalendar from './components/EconomicCalendar';
import CentralBankSchedule from './components/CentralBankSchedule';
import EarningsSeason from './components/EarningsSeason';
import KeyReleases from './components/KeyReleases';
import './CalendarMarket.css';

const stopDrag = (e) => e.stopPropagation();

const SUB_TABS = [
  { id: 'economic',      label: 'Economic Calendar'  },
  { id: 'central-banks', label: 'Central Banks'      },
  { id: 'earnings',      label: 'Earnings Season'    },
  { id: 'releases',      label: 'Key Releases'       },
];

const LAYOUTS = {
  economic: {
    lg: [
      { i: 'events-table', x: 0, y: 0, w: 12, h: 5 },
    ]
  },
  'central-banks': {
    lg: [
      { i: 'cb-rates', x: 0, y: 0, w: 6, h: 3 },
      { i: 'cb-timeline', x: 6, y: 0, w: 6, h: 3 },
    ]
  },
  earnings: {
    lg: [
      { i: 'earnings-calendar', x: 0, y: 0, w: 12, h: 5 },
    ]
  },
  releases: {
    lg: [
      { i: 'key-data', x: 0, y: 0, w: 6, h: 5 },
      { i: 'treasury', x: 6, y: 0, w: 6, h: 5 },
    ]
  },
};

function CalendarMarket({ autoRefresh } = {}) {
  const [activeTab, setActiveTab] = useState('economic');
  const {
    economicEvents, centralBanks, earningsSeason, keyReleases,
    treasuryAuctions, optionsExpiry, dividendCalendar,
    isLive, lastUpdated, isLoading, fetchedOn, isCurrent,
  } = useCalendarData(autoRefresh);

  if (isLoading) return <MarketSkeleton />;

  const layout = LAYOUTS[activeTab] || LAYOUTS.economic;

  const renderBentoCards = () => {
    switch (activeTab) {
      case 'economic':
        return (
          <div key="events-table" className="cal-bento-card">
            <div className="cal-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">Economic Calendar</span>
              <span className="bento-panel-subtitle">High-importance macro releases · next 30 days · Econdb</span>
            </div>
            <div className="bento-panel-content cal-panel-scroll" onMouseDown={stopDrag}>
              <EconomicCalendar economicEvents={economicEvents} insideBento />
            </div>
          </div>
        );
      case 'central-banks':
        return (
          <>
            <div key="cb-rates" className="cal-bento-card">
              <div className="cal-panel-title-row bento-panel-title-row">
                <span className="bento-panel-title">Central Bank Rates</span>
                <span className="bento-panel-subtitle">Policy rate decisions · Fed / ECB / BOE / BOJ · FRED</span>
              </div>
              <div className="bento-panel-content cal-panel-scroll" onMouseDown={stopDrag}>
                <CentralBankSchedule centralBanks={centralBanks} section="rates" />
              </div>
            </div>
            <div key="cb-timeline" className="cal-bento-card">
              <div className="cal-panel-title-row bento-panel-title-row">
                <span className="bento-panel-title">Upcoming Meetings</span>
                <span className="bento-panel-subtitle">Next scheduled decisions</span>
              </div>
              <div className="bento-panel-content cal-panel-scroll" onMouseDown={stopDrag}>
                <CentralBankSchedule centralBanks={centralBanks} section="timeline" />
              </div>
            </div>
          </>
        );
      case 'earnings':
        return (
          <div key="earnings-calendar" className="cal-bento-card">
            <div className="cal-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">Earnings Season</span>
              <span className="bento-panel-subtitle">Mega-cap earnings dates · next 60 days · Yahoo Finance</span>
            </div>
            <div className="bento-panel-content cal-panel-scroll" onMouseDown={stopDrag}>
              <EarningsSeason earningsSeason={earningsSeason} dividendCalendar={dividendCalendar} insideBento />
            </div>
          </div>
        );
      case 'releases':
        return (
          <>
            <div key="key-data" className="cal-bento-card">
              <div className="cal-panel-title-row bento-panel-title-row">
                <span className="bento-panel-title">Key US Releases</span>
                <span className="bento-panel-subtitle">Scheduled macro data · FRED releases</span>
              </div>
              <div className="bento-panel-content cal-panel-scroll" onMouseDown={stopDrag}>
                <KeyReleases keyReleases={keyReleases} section="data" />
              </div>
            </div>
            <div key="treasury" className="cal-bento-card">
              <div className="cal-panel-title-row bento-panel-title-row">
                <span className="bento-panel-title">Treasury Auctions & Options</span>
                <span className="bento-panel-subtitle">US Treasury & options expiry</span>
              </div>
              <div className="bento-panel-content cal-panel-scroll" onMouseDown={stopDrag}>
                <KeyReleases keyReleases={[]} treasuryAuctions={treasuryAuctions} optionsExpiry={optionsExpiry} section="treasury" />
              </div>
            </div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="cal-market">
      <div className="cal-sub-tabs" role="tablist" aria-label="Sub-tabs">
        {SUB_TABS.map(t => (
          <button
            key={t.id}
            role="tab"
            aria-selected={activeTab === t.id}
            className={`cal-sub-tab${activeTab === t.id ? ' active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="cal-status-bar">
        <span className={isLive ? 'cal-status-live' : ''}>
          {isLive ? '● Live · Econdb / FRED / Yahoo Finance' : '○ Mock data — static'}
        </span>
        {lastUpdated && <span>Updated: {lastUpdated}</span>}
        {!isCurrent && fetchedOn && <span className="cal-stale-badge">Stale · fetched {fetchedOn}</span>}
      </div>
      <div className="cal-dashboard cal-dashboard--bento">
        <BentoWrapper layout={layout} storageKey={`calendar-${activeTab}-layout`}>
          {renderBentoCards()}
        </BentoWrapper>
      </div>
    </div>
  );
}

export default React.memo(CalendarMarket);