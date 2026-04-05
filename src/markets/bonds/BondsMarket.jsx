import React, { useState } from 'react';
import { useBondsData } from './data/useBondsData';
import YieldCurve     from './components/YieldCurve';
import CreditMatrix   from './components/CreditMatrix';
import SpreadMonitor  from './components/SpreadMonitor';
import DurationLadder from './components/DurationLadder';
import './BondsMarket.css';

const SUB_TABS = [
  { id: 'yield-curve',     label: 'Yield Curve'    },
  { id: 'credit-matrix',   label: 'Credit Matrix'  },
  { id: 'spread-monitor',  label: 'Spread Monitor' },
  { id: 'duration-ladder', label: 'Duration Ladder' },
];

export default function BondsMarket() {
  const [activeTab, setActiveTab] = useState('yield-curve');
  const { yieldCurveData, creditRatingsData, spreadData, spreadIndicators, durationLadderData, treasuryRates, isLive, lastUpdated, isLoading, fetchedOn, isCurrent } = useBondsData();

  if (isLoading) {
    return (
      <div className="bonds-market bonds-loading">
        <div className="bonds-loading-spinner" />
        <span className="bonds-loading-text">Loading bonds data…</span>
      </div>
    );
  }

  return (
    <div className="bonds-market">
      <div className="bonds-sub-tabs">
        {SUB_TABS.map(t => (
          <button
            key={t.id}
            className={`bonds-sub-tab${activeTab === t.id ? ' active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="bonds-status-bar">
        <span className={isLive ? 'bonds-status-live' : ''}>
          {isLive ? '● Live (FRED)' : '○ Mock data — static'}
        </span>
        {lastUpdated && <span>Updated: {lastUpdated}</span>}
        {!isCurrent && fetchedOn && <span className="bonds-stale-badge">Stale · fetched {fetchedOn}</span>}
      </div>
      <div className="bonds-content">
        {activeTab === 'yield-curve'     && <YieldCurve     yieldCurveData={yieldCurveData} spreadIndicators={spreadIndicators} />}
        {activeTab === 'credit-matrix'   && <CreditMatrix   creditRatingsData={creditRatingsData} />}
        {activeTab === 'spread-monitor'  && <SpreadMonitor  spreadData={spreadData} />}
        {activeTab === 'duration-ladder' && <DurationLadder durationLadderData={durationLadderData} treasuryRates={treasuryRates} />}
      </div>
    </div>
  );
}
