import React from 'react';
import MarketSkeleton from '../../hub/MarketSkeleton';
import GlobalMacroDashboard from './components/GlobalMacroDashboard';
import GlobalMacroKpiStrip from './components/GlobalMacroKpiStrip';
import { useCurrency } from '../../hub/CurrencyContext';
import { useMarketData } from '../../hub/DataContext';
import './components/GlobalMacroDashboard.css';
import '../imf/ImfDashboard.css';
import '../worldbank/WorldBankDashboard.css';

function getGlobalMacroProps(centralData) {
  const d = centralData.data || {};
  return {
    scorecardData: d.scorecardData,
    growthInflationData: d.growthInflationData,
    centralBankData: d.centralBankData,
    debtData: d.debtData,
    m2Growth: d.m2Growth,
    tradeBalance: d.tradeBalance,
    industrialProd: d.industrialProd,
    consumerSentiment: d.consumerSentiment,
    yieldSpread: d.yieldSpread,
    cfnai: d.cfnai,
    oecdCli: d.oecdCli,
    cpiBreakdown: d.cpiBreakdown,
    isLive: centralData.isLive,
    lastUpdated: centralData.lastUpdated,
    isLoading: centralData.isLoading,
    fetchedOn: centralData.fetchedOn,
    isCurrent: centralData.isCurrent,
    fetchLog: centralData.fetchLog || [],
    error: centralData.error,
    refetch: centralData.refetch,
  };
}

function GlobalMacroMarket({ centralData } = {}) {
  const { convert, currentSymbol } = useCurrency();
  const imfCtx = useMarketData('imf');
  const wbCtx = useMarketData('worldbank');
  if (!centralData) return <MarketSkeleton />;
  const props = getGlobalMacroProps(centralData);

  if (props.isLoading) return <MarketSkeleton />;

  // KPI strip becomes a real bento child rendered inside the dashboard's
  // BentoWrapper (passed as `kpiSidebar`).
  const kpiSidebar = (
    <GlobalMacroKpiStrip
      scorecardData={props.scorecardData}
      centralBankData={props.centralBankData}
      lastUpdated={props.lastUpdated}
      isLive={props.isLive}
      fetchLog={props.fetchLog}
      error={props.error}
      fetchedOn={props.fetchedOn}
      isCurrent={props.isCurrent}
    />
  );

  return (
    <div className="mac-market">
      <GlobalMacroDashboard
        kpiSidebar={kpiSidebar}
        convert={convert}
        currentSymbol={currentSymbol}
        scorecardData={props.scorecardData}
        growthInflationData={props.growthInflationData}
        centralBankData={props.centralBankData}
        debtData={props.debtData}
        m2Growth={props.m2Growth}
        tradeBalance={props.tradeBalance}
        industrialProd={props.industrialProd}
        consumerSentiment={props.consumerSentiment}
        yieldSpread={props.yieldSpread}
        cfnai={props.cfnai}
        oecdCli={props.oecdCli}
        cpiBreakdown={props.cpiBreakdown}
        imfData={imfCtx?.data}
        wbData={wbCtx?.data}
        fetchLog={props.fetchLog}
        isLive={props.isLive}
        lastUpdated={props.lastUpdated}
        error={props.error}
        fetchedOn={props.fetchedOn}
        isCurrent={props.isCurrent}
      />
    </div>
  );
}

export default React.memo(GlobalMacroMarket);
