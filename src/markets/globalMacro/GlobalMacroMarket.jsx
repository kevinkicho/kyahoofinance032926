import React from 'react';
import { useGlobalMacroData } from './data/useGlobalMacroData';
import MarketSkeleton from '../../hub/MarketSkeleton';
import GlobalMacroDashboard from './components/GlobalMacroDashboard';
import './components/GlobalMacroDashboard.css';

function GlobalMacroMarket({ autoRefresh, refreshKey } = {}) {
  const {
    scorecardData, growthInflationData, centralBankData, debtData,
    m2Growth, tradeBalance, industrialProd, consumerSentiment, yieldSpread, cfnai, oecdCli, cpiBreakdown,
    isLive, lastUpdated, isLoading, fetchedOn, isCurrent, fetchLog, refetch,
  } = useGlobalMacroData(autoRefresh, refreshKey);

  if (isLoading) return <MarketSkeleton />;

  return (
    <div className="mac-market">
      <div className="mac-status-bar">
        <span className={isLive ? 'mac-status-live' : ''}>
          {isLive ? '● FETCHED · World Bank / FRED / BLS' : '○ No data received'}
        </span>
        {lastUpdated && <span>Updated: {lastUpdated}</span>}
        {!isCurrent && fetchedOn && <span className="mac-stale-badge">Stale · fetched {fetchedOn}</span>}
      </div>
      <GlobalMacroDashboard
        scorecardData={scorecardData}
        growthInflationData={growthInflationData}
        centralBankData={centralBankData}
        debtData={debtData}
        m2Growth={m2Growth}
        tradeBalance={tradeBalance}
        industrialProd={industrialProd}
        consumerSentiment={consumerSentiment}
        yieldSpread={yieldSpread}
        cfnai={cfnai}
        oecdCli={oecdCli}
        cpiBreakdown={cpiBreakdown}
        fetchLog={fetchLog}
        isLive={isLive}
        lastUpdated={lastUpdated}
      />
    </div>
  );
}

export default React.memo(GlobalMacroMarket);