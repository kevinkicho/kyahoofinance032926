// src/markets/fx/FXMarket.jsx
import React from 'react';
import { useFXData } from './data/useFXData';
import { useCOTData } from './data/useCOTData';
import MarketSkeleton from '../../hub/MarketSkeleton';
import FXDashboard from './components/FXDashboard';
import './FXMarket.css';

/**
 * FXMarket - Unified FX dashboard
 * Shows all FX data in one glanceable view:
 * - KPI strip (EUR/USD, USD/JPY, GBP/USD, Strongest/Weakest, G10/EM averages)
 * - Chart grid (Top Movers, DXY Tracker, Rate Differentials, REER)
 */
function FXMarket({ autoRefresh } = {}) {
  const { spotRates, prevRates, changes, changes1w, changes1m, sparklines, history, fredFxRates, reer, rateDifferentials, dxyHistory, isLive, lastUpdated, isLoading } = useFXData(autoRefresh);
  const { cotData } = useCOTData();

  if (isLoading) return <MarketSkeleton />;

  return (
    <div className="fx-market">
      <div className="fx-status-bar">
        <span className={isLive ? 'fx-status-live' : ''}>
          {isLive ? '● Live · Frankfurter / FRED' : '○ Mock data — static'}
        </span>
        {lastUpdated && <span>Updated: {lastUpdated}</span>}
      </div>
      <FXDashboard
        spotRates={spotRates}
        prevRates={prevRates}
        changes={changes}
        changes1w={changes1w}
        changes1m={changes1m}
        sparklines={sparklines}
        history={history}
        fredFxRates={fredFxRates}
        reer={reer}
        rateDifferentials={rateDifferentials}
        dxyHistory={dxyHistory}
        cotData={cotData}
      />
    </div>
  );
}

export default React.memo(FXMarket);
