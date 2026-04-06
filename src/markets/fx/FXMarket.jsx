// src/markets/fx/FXMarket.jsx
import React, { useState } from 'react';
import { useFXData } from './data/useFXData';
import { useCOTData } from './data/useCOTData';
import RateMatrix from './components/RateMatrix';
import CarryMap from './components/CarryMap';
import DXYTracker from './components/DXYTracker';
import TopMovers from './components/TopMovers';
import './FXMarket.css';

const SUB_TABS = [
  { id: 'rate-matrix', label: 'Rate Matrix' },
  { id: 'carry-map',   label: 'Carry Map'   },
  { id: 'dxy-tracker', label: 'DXY Tracker' },
  { id: 'top-movers',  label: 'Top Movers'  },
];

function FXMarket({ autoRefresh } = {}) {
  const [activeTab, setActiveTab] = useState('rate-matrix');
  const { spotRates, prevRates, changes, changes1w, changes1m, sparklines, history, fredFxRates, reer, rateDifferentials, dxyHistory, isLive, lastUpdated, isLoading } = useFXData(autoRefresh);
  const { cotData } = useCOTData();

  return (
    <div className="fx-market">
      <div className="fx-sub-tabs" role="tablist" aria-label="Sub-tabs">
        {SUB_TABS.map(t => (
          <button
            key={t.id}
            role="tab"
            aria-selected={activeTab === t.id}
            className={`fx-sub-tab${activeTab === t.id ? ' active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="fx-status-bar">
        <span className={isLive ? 'fx-status-live' : ''}>
          {isLive ? '● Live (ECB via Frankfurter)' : '○ Static fallback'}
        </span>
        {lastUpdated && <span>Updated: {lastUpdated}</span>}
        {isLoading && <span>Loading…</span>}
      </div>
      <div className="fx-content">
        {activeTab === 'rate-matrix' && (
          <RateMatrix spotRates={spotRates} prevRates={prevRates} changes={changes} reer={reer} />
        )}
        {activeTab === 'carry-map'   && <CarryMap />}
        {activeTab === 'dxy-tracker' && (
          <DXYTracker history={history} fredFxRates={fredFxRates} dxyHistory={dxyHistory} rateDifferentials={rateDifferentials} />
        )}
        {activeTab === 'top-movers'  && <TopMovers changes={changes} changes1w={changes1w} changes1m={changes1m} sparklines={sparklines} cotData={cotData} />}
      </div>
    </div>
  );
}

export default React.memo(FXMarket);
