import React from 'react';
import MarketSkeleton from '../../hub/MarketSkeleton';
import DerivativesDashboard from './components/DerivativesDashboard';
import './components/DerivativesDashboard.css';

function getDerivativesProps(centralData) {
  const d = centralData.data || {};
  return {
    volSurfaceData: d.volSurfaceData,
    vixTermStructure: d.vixTermStructure,
    optionsFlow: d.optionsFlow,
    vixEnrichment: d.vixEnrichment,
    volPremium: d.volPremium,
    fredVixHistory: d.fredVixHistory,
    putCallRatio: d.putCallRatio,
    skewIndex: d.skewIndex,
    skewHistory: d.skewHistory,
    gammaExposure: d.gammaExposure,
    vixPercentile: d.vixPercentile,
    termSpread: d.termSpread,
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

function DerivativesMarket({ centralData } = {}) {
  if (!centralData) return <MarketSkeleton />;
  const props = getDerivativesProps(centralData);

  if (props.isLoading) return <MarketSkeleton />;

  return (
    <div className="deriv-market">

      <DerivativesDashboard
        volSurfaceData={props.volSurfaceData}
        vixTermStructure={props.vixTermStructure}
        optionsFlow={props.optionsFlow}
        vixEnrichment={props.vixEnrichment}
        volPremium={props.volPremium}
        fredVixHistory={props.fredVixHistory}
        putCallRatio={props.putCallRatio}
        skewIndex={props.skewIndex}
        skewHistory={props.skewHistory}
        gammaExposure={props.gammaExposure}
        vixPercentile={props.vixPercentile}
        termSpread={props.termSpread}
        error={props.error} fetchedOn={props.fetchedOn} isCurrent={props.isCurrent}
        fetchLog={props.fetchLog}
        isLive={props.isLive}
        lastUpdated={props.lastUpdated}
      />
    </div>
  );
}

export default React.memo(DerivativesMarket);