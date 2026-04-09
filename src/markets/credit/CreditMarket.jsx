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
function CreditMarket({ autoRefresh } = {}) {
  const { spreadData, emBondData, loanData, defaultData, delinquencyRates, lendingStandards, commercialPaper, excessReserves, isLive, lastUpdated, isLoading, fetchedOn, isCurrent } = useCreditData(autoRefresh);

  if (isLoading) return <MarketSkeleton />;

  return (
    <div className="credit-market">
      <div className="credit-status-bar">
        <span className={isLive ? 'credit-status-live' : ''}>
          {isLive ? '● Live · FRED / Yahoo Finance' : '○ Mock data — static'}
        </span>
        {lastUpdated && <span>Updated: {lastUpdated}</span>}
        {!isCurrent && fetchedOn && <span className="credit-stale-badge">Stale · fetched {fetchedOn}</span>}
      </div>
      <CreditDashboard
        spreadData={spreadData}
        emBondData={emBondData}
        loanData={loanData}
        defaultData={defaultData}
        delinquencyRates={delinquencyRates}
        lendingStandards={lendingStandards}
        commercialPaper={commercialPaper}
        excessReserves={excessReserves}
      />
    </div>
  );
}

export default React.memo(CreditMarket);
