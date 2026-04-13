import React from 'react';
import { useBondsData } from './data/useBondsData';
import MarketSkeleton from '../../hub/MarketSkeleton';
import BondsDashboard from './components/BondsDashboard';
import './components/BondsDashboard.css';

/**
 * BondsMarket - Unified bonds dashboard
 * Shows all bond data in one glanceable view:
 * - Yield Curve section (full-width with history charts)
 * - Macro & Real Yields section
 * - Treasury Auctions section
 */
function BondsMarket({ autoRefresh, refreshKey } = {}) {
  const {
    yieldCurveData, creditRatingsData, spreadIndicators, durationLadderData,
    breakevensData, treasuryRates, fredYieldHistory, fedFundsFutures, yieldHistory, mortgageSpread,
    tipsYields, realYieldHistory, macroData, fedBalanceSheetHistory, m2HistoryData,
    auctionData, nationalDebt,
    spreadHistory, cpiComponents, debtToGdpHistory,
    isLive, lastUpdated, isLoading, fetchedOn, isCurrent, refetch, fetchLog, provenance,
  } = useBondsData(autoRefresh, refreshKey);

  if (isLoading) return <MarketSkeleton />;

  return (
    <div className="bonds-market">
      <div className="bonds-status-bar">
        <span className={isLive ? 'bonds-status-live' : ''}>
          {isLive ? '● API connected · FRED / Treasury / World Bank' : '○ No data received'}
        </span>
        {lastUpdated && <span>Updated: {lastUpdated}</span>}
        {!isCurrent && fetchedOn && <span className="bonds-stale-badge">Stale · fetched {fetchedOn}</span>}
        <button className="bonds-refresh-btn" onClick={refetch} title="Refresh data">▶</button>
      </div>
      <BondsDashboard
        yieldCurveData={yieldCurveData}
        creditRatingsData={creditRatingsData}
        spreadIndicators={spreadIndicators}
        durationLadderData={durationLadderData}
        breakevensData={breakevensData}
        treasuryRates={treasuryRates}
        fredYieldHistory={fredYieldHistory}
        fedFundsFutures={fedFundsFutures}
        yieldHistory={yieldHistory}
        mortgageSpread={mortgageSpread}
        tipsYields={tipsYields}
        realYieldHistory={realYieldHistory}
        macroData={macroData}
        fedBalanceSheetHistory={fedBalanceSheetHistory}
        m2HistoryData={m2HistoryData}
        auctionData={auctionData}
        nationalDebt={nationalDebt}
        spreadHistory={spreadHistory}
        cpiComponents={cpiComponents}
        debtToGdpHistory={debtToGdpHistory}
        isLive={isLive}
        lastUpdated={lastUpdated}
        fetchLog={fetchLog}
        provenance={provenance}
      />
    </div>
  );
}

export default React.memo(BondsMarket);