// src/markets/calendar/CalendarMarket.jsx
import React, { useState } from 'react';
import { useCalendarData } from './data/useCalendarData';
import EconomicCalendar    from './components/EconomicCalendar';
import CentralBankSchedule from './components/CentralBankSchedule';
import EarningsSeason      from './components/EarningsSeason';
import KeyReleases         from './components/KeyReleases';
import './CalendarMarket.css';

const SUB_TABS = [
  { id: 'economic',      label: 'Economic Calendar'  },
  { id: 'central-banks', label: 'Central Banks'      },
  { id: 'earnings',      label: 'Earnings Season'    },
  { id: 'releases',      label: 'Key Releases'       },
];

function CalendarMarket() {
  const [activeTab, setActiveTab] = useState('economic');
  const { economicEvents, centralBanks, earningsSeason, keyReleases, isLive, lastUpdated, isLoading, fetchedOn, isCurrent } = useCalendarData();

  if (isLoading) {
    return (
      <div className="cal-market cal-loading">
        <div className="cal-loading-spinner" />
        <span className="cal-loading-text">Loading calendar data…</span>
      </div>
    );
  }

  return (
    <div className="cal-market">
      <div className="cal-sub-tabs">
        {SUB_TABS.map(t => (
          <button
            key={t.id}
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
      <div className="cal-content">
        {activeTab === 'economic'      && <EconomicCalendar    economicEvents={economicEvents} />}
        {activeTab === 'central-banks' && <CentralBankSchedule centralBanks={centralBanks} />}
        {activeTab === 'earnings'      && <EarningsSeason      earningsSeason={earningsSeason} />}
        {activeTab === 'releases'      && <KeyReleases         keyReleases={keyReleases} />}
      </div>
    </div>
  );
}

export default React.memo(CalendarMarket);
