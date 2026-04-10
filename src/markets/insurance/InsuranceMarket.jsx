import React from 'react';
import { useInsuranceData } from './data/useInsuranceData';
import MarketSkeleton from '../../hub/MarketSkeleton';
import InsuranceDashboard from './components/InsuranceDashboard';
import './InsuranceMarket.css';

function fmtChangePct(v) {
  if (v == null) return '';
  return v >= 0 ? `+${v.toFixed(2)}%` : `${v.toFixed(2)}%`;
}

/**
 * InsuranceMarket - Unified insurance dashboard
 * Shows all insurance data in one glanceable view:
 * - Combined Ratio, Reinsurers, Reinsurance Rates, Reserve Adequacy
 * - Chart grid (HY OAS History, Combined Ratio, Reinsurance Rates, Reserves, Cat Bonds)
 */
function InsuranceMarket({ autoRefresh } = {}) {
  const {
    catBondSpreads, combinedRatioData, reserveAdequacyData,
    reinsurancePricing, reinsurers, fredHyOasHistory,
    sectorETF, catBondProxy, industryAvgCombinedRatio, treasury10y,
    catLosses, combinedRatioHistory,
    isLive, lastUpdated, isLoading, fetchedOn, isCurrent,
  } = useInsuranceData(autoRefresh);

  if (isLoading) return <MarketSkeleton />;

  return (
    <div className="ins-market">
      <div className="ins-status-bar">
        <span className={isLive ? 'ins-status-live' : ''}>
          {isLive ? '● Live · Yahoo Finance / FRED' : '○ Mock data — static'}
        </span>
        {lastUpdated && <span>Updated: {lastUpdated}</span>}
        {!isCurrent && fetchedOn && <span className="ins-stale-badge">Stale · fetched {fetchedOn}</span>}
      </div>
      <InsuranceDashboard
        catBondSpreads={catBondSpreads}
        combinedRatioData={combinedRatioData}
        reserveAdequacyData={reserveAdequacyData}
        reinsurancePricing={reinsurancePricing}
        reinsurers={reinsurers}
        fredHyOasHistory={fredHyOasHistory}
        sectorETF={sectorETF}
        catBondProxy={catBondProxy}
        industryAvgCombinedRatio={industryAvgCombinedRatio}
        treasury10y={treasury10y}
        catLosses={catLosses}
        combinedRatioHistory={combinedRatioHistory}
      />
    </div>
  );
}

export default React.memo(InsuranceMarket);
