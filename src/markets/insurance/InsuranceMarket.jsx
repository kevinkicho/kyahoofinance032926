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
 * - KPI strip (HY OAS, IG OAS, Combined Ratio, Reins Rate, Reinsurers)
 * - Chart grid (HY OAS History, Combined Ratio, Reinsurance Rates, Reserves, Cat Bonds)
 */
function InsuranceMarket({ autoRefresh } = {}) {
  const {
    catBondSpreads, combinedRatioData, reserveAdequacyData,
    reinsurancePricing, reinsurers, hyOAS, igOAS, fredHyOasHistory,
    sectorETF, catBondProxy, industryAvgCombinedRatio, treasury10y,
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
        hyOAS={hyOAS}
        igOAS={igOAS}
        fredHyOasHistory={fredHyOasHistory}
        sectorETF={sectorETF}
        catBondProxy={catBondProxy}
        industryAvgCombinedRatio={industryAvgCombinedRatio}
        treasury10y={treasury10y}
      />
    </div>
  );
}

export default React.memo(InsuranceMarket);
