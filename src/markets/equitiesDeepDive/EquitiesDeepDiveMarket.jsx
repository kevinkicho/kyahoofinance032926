import React from 'react';
import MarketSkeleton from '../../hub/MarketSkeleton';
import EquitiesDeepDiveDashboard from './components/EquitiesDeepDiveDashboard';
import './EquitiesDeepDiveMarket.css';

function getEquityDeepDiveProps(centralData, institutionalCtx) {
  const d = centralData.data || {};
  const i = institutionalCtx?.data || {
    lastUpdated: null,
    institutions: [],
    aggregateTopHoldings: [],
    recentChanges: { lastQuarter: null, bigBuys: [], bigSells: [], newPositions: [] },
  };
  return {
    sectorData: d.sectorData,
    factorData: d.factorData,
    earningsData: d.earningsData,
    shortData: d.shortData,
    equityRiskPremium: d.equityRiskPremium,
    spPE: d.spPE,
    breadthDivergence: d.breadthDivergence,
    buffettIndicator: d.buffettIndicator,
    institutionalData: { ...i, isLive: institutionalCtx?.isLive, lastUpdated: institutionalCtx?.lastUpdated, isLoading: institutionalCtx?.isLoading, error: institutionalCtx?.error, fetchedOn: institutionalCtx?.fetchedOn, isCurrent: institutionalCtx?.isCurrent, fetchLog: institutionalCtx?.fetchLog || [], refetch: institutionalCtx?.refetch },
    isLive: centralData.isLive,
    lastUpdated: centralData.lastUpdated,
    isLoading: centralData.isLoading,
    fetchedOn: centralData.fetchedOn,
    isCurrent: centralData.isCurrent,
    error: centralData.error,
    fetchLog: centralData.fetchLog || [],
    refetch: centralData.refetch,
  };
}

function EquitiesDeepDiveMarket({ centralData, institutionalData: institutionalCtx } = {}) {
  if (!centralData) return <MarketSkeleton />;
  const props = getEquityDeepDiveProps(centralData, institutionalCtx);

  if (props.isLoading) return <MarketSkeleton />;

  return (
    <div className="eqd-market">

      <EquitiesDeepDiveDashboard
        sectorData={props.sectorData}
        factorData={props.factorData}
        earningsData={props.earningsData}
        shortData={props.shortData}
        institutionalData={props.institutionalData}
        equityRiskPremium={props.equityRiskPremium}
        spPE={props.spPE}
        buffettIndicator={props.buffettIndicator}
        breadthDivergence={props.breadthDivergence}
        error={props.error} fetchedOn={props.fetchedOn} isCurrent={props.isCurrent}
        fetchLog={props.fetchLog}
        isLive={props.isLive}
        lastUpdated={props.lastUpdated}
      />
    </div>
  );
}

export default React.memo(EquitiesDeepDiveMarket);