import React from 'react';
import { useBondsData } from './data/useBondsData';
import MarketSkeleton from '../../hub/MarketSkeleton';
import BondsDashboard from './components/BondsDashboard';
import './BondsMarket.css';

/**
 * BondsMarket - Unified bonds dashboard
 * Shows all bond data in one glanceable view:
 * - KPI strip (10Y-2Y Spread, Fed Funds, 10Y Treasury, IG Spread, 5Y Breakeven)
 * - Chart grid (Yield Curve, Credit Spreads, Duration Ladder, Breakevens, Mortgage)
 */
function BondsMarket({ autoRefresh } = {}) {
  const { yieldCurveData, creditRatingsData, spreadData, spreadIndicators, durationLadderData, breakevensData, treasuryRates, fredYieldHistory, fedFundsFutures, yieldHistory, mortgageSpread, isLive, lastUpdated, isLoading, fetchedOn, isCurrent } = useBondsData(autoRefresh);

  if (isLoading) return <MarketSkeleton />;

  return (
    <div className="bonds-market">
      <div className="bonds-status-bar">
        <span className={isLive ? 'bonds-status-live' : ''}>
          {isLive ? '● Live · FRED / Treasury' : '○ Mock data — static'}
        </span>
        {lastUpdated && <span>Updated: {lastUpdated}</span>}
        {!isCurrent && fetchedOn && <span className="bonds-stale-badge">Stale · fetched {fetchedOn}</span>}
      </div>
      <BondsDashboard
        yieldCurveData={yieldCurveData}
        creditRatingsData={creditRatingsData}
        spreadData={spreadData}
        spreadIndicators={spreadIndicators}
        durationLadderData={durationLadderData}
        breakevensData={breakevensData}
        treasuryRates={treasuryRates}
        fredYieldHistory={fredYieldHistory}
        fedFundsFutures={fedFundsFutures}
        yieldHistory={yieldHistory}
        mortgageSpread={mortgageSpread}
      />
    </div>
  );
}

export default React.memo(BondsMarket);
