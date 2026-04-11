// src/markets/fx/FXMarket.jsx
import React from 'react';
import { useFXData } from './data/useFXData';
import { useCOTData } from './data/useCOTData';
import MarketSkeleton from '../../hub/MarketSkeleton';
import FXDashboard from './components/FXDashboard';

function FXMarket({ autoRefresh } = {}) {
  const { spotRates, prevRates, changes, changes1w, changes1m, sparklines, history, fredFxRates, reer, rateDifferentials, dxyHistory, cotHistory, isLive, lastUpdated, isLoading } = useFXData(autoRefresh);
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
        cotHistory={cotHistory}
      />
    </div>
  );
}

export default React.memo(FXMarket);