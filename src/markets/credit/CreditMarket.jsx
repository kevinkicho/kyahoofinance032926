// src/markets/credit/CreditMarket.jsx
import React from 'react';
import { useCreditData } from './data/useCreditData';
import MarketSkeleton from '../../hub/MarketSkeleton';
import CreditDashboard from './components/CreditDashboard';
import './CreditMarket.css';

/**
 * CreditMarket - Unified credit dashboard
 * Shows all credit data in one glanceable view:
 * - KPI strip (IG OAS, HY OAS, EM Spread, Default Rate, CP Rate)
 * - Chart grid (Credit Spreads, Spread Summary, EM Bonds, Loan Market, Default Watch, Delinquencies)
 */
function CreditMarket({ autoRefresh, refreshKey } = {}) {
  const { spreadData, emBondData, loanData, defaultData, delinquencyRates, lendingStandards, commercialPaper, excessReserves, isLive, lastUpdated, isLoading, fetchedOn, isCurrent, fetchLog, refetch } = useCreditData(autoRefresh, refreshKey);

  if (isLoading) return <MarketSkeleton />;

  return (
    <div className="credit-market">
      <CreditDashboard
        spreadData={spreadData}
        emBondData={emBondData}
        loanData={loanData}
        defaultData={defaultData}
        delinquencyRates={delinquencyRates}
        lendingStandards={lendingStandards}
        commercialPaper={commercialPaper}
        excessReserves={excessReserves}
        isLive={isLive}
        lastUpdated={lastUpdated}
        fetchLog={fetchLog}
      />
    </div>
  );
}

export default React.memo(CreditMarket);
