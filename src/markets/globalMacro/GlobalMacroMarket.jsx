import React from 'react';
import { useGlobalMacroData } from './data/useGlobalMacroData';
import MarketSkeleton from '../../hub/MarketSkeleton';
import GlobalMacroDashboard from './components/GlobalMacroDashboard';
import './GlobalMacroMarket.css';

/**
 * GlobalMacroMarket - Unified macro dashboard
 * Shows all global macro data in a single glanceable view:
 * - KPI strip with aggregated global metrics
 * - Compact scorecard table (clickable for details)
 * - Chart grid with GDP, CPI, Rates, Debt, Activity, CLI
 * - Country detail panel on click
 */
function GlobalMacroMarket({ autoRefresh } = {}) {
  const {
    scorecardData, growthInflationData, centralBankData, debtData,
    m2Growth, tradeBalance, industrialProd, consumerSentiment, yieldSpread, cfnai, oecdCli, cpiBreakdown,
    isLive, lastUpdated, isLoading, fetchedOn, isCurrent,
  } = useGlobalMacroData(autoRefresh);

  if (isLoading) return <MarketSkeleton />;

  return (
    <div className="mac-market">
      {/* Status Bar */}
      <div className="mac-status-bar">
        <span className={isLive ? 'mac-status-live' : ''}>
          {isLive ? '● Live · World Bank / FRED / BLS' : '○ Mock data — static'}
        </span>
        {lastUpdated && <span>Updated: {lastUpdated}</span>}
        {!isCurrent && fetchedOn && <span className="mac-stale-badge">Stale · fetched {fetchedOn}</span>}
      </div>

      {/* Unified Dashboard - all data visible at once */}
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
      />
    </div>
  );
}

export default React.memo(GlobalMacroMarket);