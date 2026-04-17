import React from 'react';
import MarketSkeleton from '../../hub/MarketSkeleton';
import FXDashboard from './components/FXDashboard';
import { exchangeRates } from '../../utils/constants';

function getFXProps(centralData) {
  const d = centralData.data || {};
  const fallback = { USD: 1, ...exchangeRates };
  const spotRates = d.spotRates || d.frankfurterLatest || fallback;
  const prevRates = d.prevRates || d.frankfurterPrev || fallback;
  const changes = Object.keys(spotRates).reduce((acc, code) => {
    if (code === 'USD') return { ...acc, [code]: 0 };
    const prev = prevRates[code] || spotRates[code];
    acc[code] = prev ? -((spotRates[code] - prev) / prev * 100) : 0;
    return acc;
  }, {});
  return {
    spotRates,
    prevRates,
    changes,
    changes1w: d.changes1w || {},
    changes1m: d.changes1m || {},
    sparklines: d.sparklines || {},
    history: d.history || {},
    fredFxRates: d.fredFxRates,
    reer: d.reer,
    rateDifferentials: d.rateDifferentials,
    dxyHistory: d.dxyHistory,
    cotData: d.cotData || {},
    cotHistory: d.cotHistory,
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

function FXMarket({ centralData } = {}) {
  if (!centralData) return <MarketSkeleton />;
  const props = getFXProps(centralData);

  if (props.isLoading) return <MarketSkeleton />;

  return (
    <div className="fx-market">
      <div className="fx-status-bar">
        <span className={props.isLive ? 'fx-status-live' : ''}>
          {props.isLive ? '● FETCHED · Frankfurter / FRED / CBOE' : (props.error ? `○ ${props.error}` : '○ Data source temporarily unavailable')}
        </span>
        {props.lastUpdated && <span>Updated: {props.lastUpdated}</span>}
        {!props.isCurrent && props.fetchedOn && <span className="fx-stale-badge">Stale · fetched {props.fetchedOn}</span>}
      </div>
      <FXDashboard
        spotRates={props.spotRates}
        prevRates={props.prevRates}
        changes={props.changes}
        changes1w={props.changes1w}
        changes1m={props.changes1m}
        sparklines={props.sparklines}
        history={props.history}
        fredFxRates={props.fredFxRates}
        reer={props.reer}
        rateDifferentials={props.rateDifferentials}
        dxyHistory={props.dxyHistory}
        cotData={props.cotData}
        cotHistory={props.cotHistory}
        isLive={props.isLive}
        lastUpdated={props.lastUpdated}
        fetchLog={props.fetchLog}
      />
    </div>
  );
}

export default React.memo(FXMarket);