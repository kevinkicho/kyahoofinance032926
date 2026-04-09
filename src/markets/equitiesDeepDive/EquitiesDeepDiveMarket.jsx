// src/markets/equitiesDeepDive/EquitiesDeepDiveMarket.jsx
import React from 'react';
import { useEquityDeepDiveData } from './data/useEquityDeepDiveData';
import { useInstitutionalData } from './data/useInstitutionalData';
import MarketSkeleton from '../../hub/MarketSkeleton';
import EquitiesDeepDiveDashboard from './components/EquitiesDeepDiveDashboard';
import './EquitiesDeepDiveMarket.css';

// Unified dashboard - all content visible at once
function EquitiesDeepDiveMarket({ autoRefresh } = {}) {
  const {
    sectorData,
    factorData,
    earningsData,
    shortData,
    equityRiskPremium,
    spPE,
    breadthDivergence,
    buffettIndicator,
    isLive,
    lastUpdated,
    isLoading,
    fetchedOn,
    isCurrent,
  } = useEquityDeepDiveData(autoRefresh);

  const institutionalData = useInstitutionalData(autoRefresh);

  if (isLoading) return <MarketSkeleton />;

  return (
    <div className="eq-market">
      <div className="eq-status-bar">
        <span className={isLive ? 'eq-status-live' : ''}>
          {isLive ? '● Live · Yahoo Finance' : '○ Mock data — static'}
        </span>
        {lastUpdated && <span>Updated: {lastUpdated}</span>}
        {!isCurrent && fetchedOn && <span className="eq-stale-badge">Stale · fetched {fetchedOn}</span>}
      </div>
      <div className="eq-dashboard-wrap">
        <EquitiesDeepDiveDashboard
          sectorData={sectorData}
          factorData={factorData}
          earningsData={earningsData}
          shortData={shortData}
          institutionalData={institutionalData}
          equityRiskPremium={equityRiskPremium}
          spPE={spPE}
          buffettIndicator={buffettIndicator}
          breadthDivergence={breadthDivergence}
        />
      </div>
    </div>
  );
}

export default React.memo(EquitiesDeepDiveMarket);