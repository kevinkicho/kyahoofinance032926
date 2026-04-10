// src/markets/derivatives/DerivativesMarket.jsx
import React from 'react';
import { useDerivativesData } from './data/useDerivativesData';
import MarketSkeleton from '../../hub/MarketSkeleton';
import DerivativesDashboard from './components/DerivativesDashboard';
import './DerivativesMarket.css';

/**
 * DerivativesMarket - Unified derivatives dashboard
 * Shows all derivatives data in one glanceable view:
 * - KPI strip (VIX Spot, Contango, VVIX, Put/Call, ATM IV)
 * - Chart grid (VIX Term Structure, VIX 1Y, Vol Surface, Options Flow)
 */
function DerivativesMarket({ autoRefresh } = {}) {
  const { volSurfaceData, vixTermStructure, optionsFlow, vixEnrichment, volPremium, fredVixHistory, putCallRatio, skewIndex, skewHistory, gammaExposure, vixPercentile, termSpread, isLive, lastUpdated, isLoading, fetchedOn, isCurrent } = useDerivativesData(autoRefresh);

  if (isLoading) return <MarketSkeleton />;

  return (
    <div className="deriv-market">
      <div className="deriv-status-bar">
        <span className={isLive ? 'deriv-status-live' : ''}>
          {isLive ? '● Live · Yahoo Finance / CBOE' : '○ Mock data — static'}
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
      />
    </div>
  );
}

export default React.memo(DerivativesMarket);
