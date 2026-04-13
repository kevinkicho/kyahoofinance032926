// src/markets/equitiesDeepDive/EquitiesDeepDiveMarket.jsx
import React from 'react';
import { useEquityDeepDiveData } from './data/useEquityDeepDiveData';
import { useInstitutionalData } from './data/useInstitutionalData';
import MarketSkeleton from '../../hub/MarketSkeleton';
import EquitiesDeepDiveDashboard from './components/EquitiesDeepDiveDashboard';
import './EquitiesDeepDiveMarket.css';

// Unified dashboard - all content visible at once
function EquitiesDeepDiveMarket({ autoRefresh, refreshKey } = {}) {
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
    fetchLog,
    refetch,
  } = useEquityDeepDiveData(autoRefresh, refreshKey);

  const institutionalData = useInstitutionalData(autoRefresh, refreshKey);

  if (isLoading) return <MarketSkeleton />;

  return (
    <div className="eqd-market">
      <div className="eqd-status-bar">
        <span className={isLive ? 'eqd-status-live' : ''}>
          {isLive ? '● FETCHED · Yahoo Finance / FRED' : '○ No data received'}
        </span>
        {lastUpdated && <span>Updated: {lastUpdated}</span>}
        {!isCurrent && fetchedOn && <span className="eqd-stale-badge">Stale · fetched {fetchedOn}</span>}
      </div>
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
        fetchLog={fetchLog}
        isLive={isLive}
        lastUpdated={lastUpdated}
      />
    </div>
  );
}

export default React.memo(EquitiesDeepDiveMarket);