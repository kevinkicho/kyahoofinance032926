import React from 'react';
import MarketSkeleton from '../../hub/MarketSkeleton';
import CreditDashboard from './components/CreditDashboard';
import './CreditMarket.css';

function getCreditProps(centralData) {
  const d = centralData.data || {};
  return {
    spreadData: d.spreadData,
    emBondData: d.emBondData,
    loanData: d.loanData,
    defaultData: d.defaultData,
    delinquencyRates: d.delinquencyRates,
    lendingStandards: d.lendingStandards,
    commercialPaper: d.commercialPaper,
    excessReserves: d.excessReserves,
    isLive: centralData.isLive,
    lastUpdated: centralData.lastUpdated,
    isLoading: centralData.isLoading,
    fetchedOn: centralData.fetchedOn,
    isCurrent: centralData.isCurrent,
    fetchLog: centralData.fetchLog || [],
    refetch: centralData.refetch,
  };
}

function CreditMarket({ centralData } = {}) {
  if (!centralData) return <MarketSkeleton />;
  const props = getCreditProps(centralData);

  if (props.isLoading) return <MarketSkeleton />;

  return (
    <div className="credit-market">
      <CreditDashboard
        spreadData={props.spreadData}
        emBondData={props.emBondData}
        loanData={props.loanData}
        defaultData={props.defaultData}
        delinquencyRates={props.delinquencyRates}
        lendingStandards={props.lendingStandards}
        commercialPaper={props.commercialPaper}
        excessReserves={props.excessReserves}
        isLive={props.isLive}
        lastUpdated={props.lastUpdated}
        fetchLog={props.fetchLog}
      />
    </div>
  );
}

export default React.memo(CreditMarket);
