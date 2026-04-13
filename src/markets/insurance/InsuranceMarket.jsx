import React from 'react';
import { useInsuranceData } from './data/useInsuranceData';
import MarketSkeleton from '../../hub/MarketSkeleton';
import InsuranceDashboard from './components/InsuranceDashboard';
import './components/InsuranceDashboard.css';

function fmtChangePct(v) {
  if (v == null) return '';
  return v >= 0 ? `+${v.toFixed(2)}%` : `${v.toFixed(2)}%`;
}

function InsuranceMarket({ autoRefresh, refreshKey } = {}) {
  const {
    catBondSpreads, combinedRatioData, reserveAdequacyData,
    reinsurancePricing, reinsurers, fredHyOasHistory,
    sectorETF, catBondProxy, industryAvgCombinedRatio, treasury10y,
    catLosses, combinedRatioHistory,
    isLive, lastUpdated, isLoading, fetchedOn, isCurrent, fetchLog, refetch,
  } = useInsuranceData(autoRefresh, refreshKey);

  if (isLoading) return <MarketSkeleton />;

  return (
    <div className="ins-market">
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
        isLive={isLive}
        lastUpdated={lastUpdated}
        fetchLog={fetchLog}
      />
    </div>
  );
}

export default React.memo(InsuranceMarket);