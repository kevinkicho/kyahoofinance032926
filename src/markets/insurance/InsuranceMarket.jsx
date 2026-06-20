import React from 'react';
import MarketSkeleton from '../../hub/MarketSkeleton';
import InsuranceDashboard from './components/InsuranceDashboard';
import DataFooter from '../../components/DataFooter/DataFooter';
import { useCurrency } from '../../hub/CurrencyContext';
import './components/InsuranceDashboard.css';

// catBondSpreads from the server is now a heterogeneous list (one entry is
// the ILS ETF daily change in %, others are HY/IG credit spreads in %). The
// previous HY-OAS scale-factor assumed all entries were synthetic cat-bond
// spreads in bps and mangled the values when the server contract changed
// (factor ~0.008 against a 350-bps baseline → all spreads rounded to 0%).
// Pass entries through unchanged; let the dashboard format each as %.
function scaleCatBondSpreads(bonds /* , hyOAS */) {
  return bonds;
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
    isHistorical: centralData.isHistorical,
    asOfDate: centralData.asOfDate,
    fetchLog: centralData.fetchLog || [],
    error: centralData.error,
    refetch: centralData.refetch,
  };
}

function InsuranceMarket({ centralData } = {}) {
  const { currency, convert, currentSymbol } = useCurrency();
  if (!centralData) return <MarketSkeleton />;
  const props = getInsuranceProps(centralData);

  if (props.isLoading) return <MarketSkeleton />;

  return (
    <div className="ins-market">
      <InsuranceDashboard
        currency={currency}
        currentSymbol={currentSymbol}
        convert={convert}
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
        error={props.error}
        fetchedOn={props.fetchedOn}
        isCurrent={props.isCurrent}
        isHistorical={props.isHistorical}
        asOfDate={props.asOfDate}
        isLive={props.isLive}
        lastUpdated={props.lastUpdated}
        fetchLog={props.fetchLog}
      />
      <DataFooter source="Yahoo Finance / FRED" timestamp={props.lastUpdated} isLive={props.isLive} fetchLog={props.fetchLog} error={props.error} fetchedOn={props.fetchedOn} isCurrent={props.isCurrent} isHistorical={props.isHistorical} asOfDate={props.asOfDate} />
    </div>
  );
}

export default React.memo(InsuranceMarket);
