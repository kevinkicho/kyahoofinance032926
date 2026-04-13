// src/markets/fx/FXMarket.jsx
import React from 'react';
import { useFXData } from './data/useFXData';
import { useCOTData } from './data/useCOTData';
import MarketSkeleton from '../../hub/MarketSkeleton';
import FXDashboard from './components/FXDashboard';

function FXMarket({ autoRefresh, refreshKey } = {}) {
  const { spotRates, prevRates, changes, changes1w, changes1m, sparklines, history, fredFxRates, reer, rateDifferentials, dxyHistory, cotHistory, isLive, lastUpdated, isLoading, fetchLog, refetch } = useFXData(autoRefresh, refreshKey);
  const { cotData } = useCOTData();

  if (isLoading) return <MarketSkeleton />;

  return (
    <div className="fx-market">
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
        isLive={isLive}
        lastUpdated={lastUpdated}
        fetchLog={fetchLog}
      />
    </div>
  );
}

export default React.memo(FXMarket);