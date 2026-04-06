import React, { useState } from 'react';
import { useEquityDeepDiveData } from './data/useEquityDeepDiveData';
import MarketSkeleton from '../../hub/MarketSkeleton';
import SectorRotation from './components/SectorRotation';
import FactorRankings from './components/FactorRankings';
import EarningsWatch  from './components/EarningsWatch';
import ShortInterest  from './components/ShortInterest';
import './EquitiesDeepDiveMarket.css';

const SUB_TABS = [
  { id: 'sectors',  label: 'Sector Rotation' },
  { id: 'factors',  label: 'Factor Rankings' },
  { id: 'earnings', label: 'Earnings Watch'  },
  { id: 'shorts',   label: 'Short Interest'  },
];

// snapshotDate/currency not used — equity analytics are market-session-based, not snapshot-dependent
function EquitiesDeepDiveMarket({ autoRefresh } = {}) {
  const [activeTab, setActiveTab] = useState('sectors');
  const {
    sectorData, factorData, earningsData, shortData,
    equityRiskPremium, spPE, breadthDivergence, buffettIndicator,
    isLive, lastUpdated, isLoading, fetchedOn, isCurrent,
  } = useEquityDeepDiveData(autoRefresh);

  if (isLoading) return <MarketSkeleton />;

  return (
    <div className="eq-market">
      <div className="eq-sub-tabs" role="tablist" aria-label="Sub-tabs">
        {SUB_TABS.map(t => (
          <button
            key={t.id}
            role="tab"
            aria-selected={activeTab === t.id}
            className={`eq-sub-tab${activeTab === t.id ? ' active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="eq-status-bar">
        <span className={isLive ? 'eq-status-live' : ''}>
          {isLive ? '● Live · Yahoo Finance' : '○ Mock data — static'}
        </span>
        {lastUpdated && <span>Updated: {lastUpdated}</span>}
        {!isCurrent && fetchedOn && <span className="eq-stale-badge">Stale · fetched {fetchedOn}</span>}
      </div>
      <div className="eq-content">
        {activeTab === 'sectors'  && <SectorRotation sectorData={sectorData} spPE={spPE} buffettIndicator={buffettIndicator} equityRiskPremium={equityRiskPremium} />}
        {activeTab === 'factors'  && <FactorRankings factorData={factorData} breadthDivergence={breadthDivergence} equityRiskPremium={equityRiskPremium} />}
        {activeTab === 'earnings' && <EarningsWatch  earningsData={earningsData} />}
        {activeTab === 'shorts'   && <ShortInterest  shortData={shortData} />}
      </div>
    </div>
  );
}

export default React.memo(EquitiesDeepDiveMarket);
