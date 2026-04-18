import React from 'react';
import MarketSkeleton from '../../hub/MarketSkeleton';
import InsuranceDashboard from './components/InsuranceDashboard';
import './components/InsuranceDashboard.css';

const HY_OAS_BASELINE = 350;
function scaleCatBondSpreads(bonds, hyOAS) {
  if (!hyOAS) return bonds;
  const factor = hyOAS / HY_OAS_BASELINE;
  return bonds.map(b => ({ ...b, spread: Math.round(b.spread * factor) }));
}

function getInsuranceProps(centralData) {
  const d = centralData.data || {};
  return {
    catBondSpreads: d.catBondSpreads ? scaleCatBondSpreads(d.catBondSpreads, d.hyOAS) : null,
    combinedRatioData: d.combinedRatioData,
    reserveAdequacyData: d.reserveAdequacyData,
    reinsurancePricing: d.reinsurancePricing,
    reinsurers: d.reinsurers || [],
    hyOAS: d.hyOAS,
    igOAS: d.igOAS,
    fredHyOasHistory: d.fredHyOasHistory,
    sectorETF: d.sectorETF,
    catBondProxy: d.catBondProxy,
    industryAvgCombinedRatio: d.industryAvgCombinedRatio,
    treasury10y: d.treasury10y,
    catLosses: d.catLosses,
    combinedRatioHistory: d.combinedRatioHistory,
    isLive: centralData.isLive,
    lastUpdated: centralData.lastUpdated,
    isLoading: centralData.isLoading,
    fetchedOn: centralData.fetchedOn,
    isCurrent: centralData.isCurrent,
    fetchLog: centralData.fetchLog || [],
    error: centralData.error,
    refetch: centralData.refetch,
  };
}

function InsuranceMarket({ centralData } = {}) {
  if (!centralData) return <MarketSkeleton />;
  const props = getInsuranceProps(centralData);

  if (props.isLoading) return <MarketSkeleton />;

  return (
    <div className="ins-market">

      <InsuranceDashboard
        catBondSpreads={props.catBondSpreads}
        combinedRatioData={props.combinedRatioData}
        reserveAdequacyData={props.reserveAdequacyData}
        reinsurancePricing={props.reinsurancePricing}
        reinsurers={props.reinsurers}
        fredHyOasHistory={props.fredHyOasHistory}
        sectorETF={props.sectorETF}
        catBondProxy={props.catBondProxy}
        industryAvgCombinedRatio={props.industryAvgCombinedRatio}
        treasury10y={props.treasury10y}
        catLosses={props.catLosses}
        combinedRatioHistory={props.combinedRatioHistory}
        error={props.error} fetchedOn={props.fetchedOn} isCurrent={props.isCurrent}
        isLive={props.isLive}
        lastUpdated={props.lastUpdated}
        fetchLog={props.fetchLog}
      />
    </div>
  );
}

export default React.memo(InsuranceMarket);