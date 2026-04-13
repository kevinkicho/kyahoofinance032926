// src/markets/derivatives/DerivativesMarket.jsx
import React from 'react';
import { useDerivativesData } from './data/useDerivativesData';
import MarketSkeleton from '../../hub/MarketSkeleton';
import DerivativesDashboard from './components/DerivativesDashboard';
import './components/DerivativesDashboard.css';

function DerivativesMarket({ autoRefresh, refreshKey } = {}) {
  const { volSurfaceData, vixTermStructure, optionsFlow, vixEnrichment, volPremium, fredVixHistory, putCallRatio, skewIndex, skewHistory, gammaExposure, vixPercentile, termSpread, isLive, lastUpdated, isLoading, fetchedOn, isCurrent, fetchLog, refetch } = useDerivativesData(autoRefresh, refreshKey);

  if (isLoading) return <MarketSkeleton />;

  return (
    <div className="deriv-market">
      <div className="deriv-status-bar">
        <span className={isLive ? 'deriv-status-live' : ''}>
          {isLive ? '● FETCHED · Yahoo Finance / CBOE / FRED' : '○ No data received'}
        </span>
        {lastUpdated && <span>Updated: {lastUpdated}</span>}
        {!isCurrent && fetchedOn && <span className="deriv-stale-badge">Stale · fetched {fetchedOn}</span>}
      </div>
      <DerivativesDashboard
        volSurfaceData={volSurfaceData}
        vixTermStructure={vixTermStructure}
        optionsFlow={optionsFlow}
        vixEnrichment={vixEnrichment}
        volPremium={volPremium}
        fredVixHistory={fredVixHistory}
        putCallRatio={putCallRatio}
        skewIndex={skewIndex}
        skewHistory={skewHistory}
        gammaExposure={gammaExposure}
        vixPercentile={vixPercentile}
        termSpread={termSpread}
        fetchLog={fetchLog}
        isLive={isLive}
        lastUpdated={lastUpdated}
      />
    </div>
  );
}

export default React.memo(DerivativesMarket);