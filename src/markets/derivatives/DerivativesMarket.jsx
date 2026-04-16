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
      <div className="deriv-status-bar">
        <span className={props.isLive ? 'deriv-status-live' : ''}>
          {props.isLive ? '● FETCHED · Yahoo Finance / CBOE / FRED' : '○ No data received'}
        </span>
        {props.lastUpdated && <span>Updated: {props.lastUpdated}</span>}
        {!props.isCurrent && props.fetchedOn && <span className="deriv-stale-badge">Stale · fetched {props.fetchedOn}</span>}
      </div>
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
        fetchLog={props.fetchLog}
        isLive={props.isLive}
        lastUpdated={props.lastUpdated}
      />
    </div>
  );
}

export default React.memo(DerivativesMarket);