import React from 'react';
import MarketSkeleton from '../../hub/MarketSkeleton';
import GlobalMacroDashboard from './components/GlobalMacroDashboard';
import GlobalMacroKpiStrip from './components/GlobalMacroKpiStrip';
import { useCurrency } from '../../hub/CurrencyContext';
import { useMarketData } from '../../hub/DataContext';
import { normalizeGlobalMacroData } from '../../data/marketNormalizers';
import './components/GlobalMacroDashboard.css';

function getGlobalMacroProps(centralData) {
  const d = centralData.data || {};
  const normalized = normalizeGlobalMacroData(d);
  const values = normalized.values;
  return {
    // Always an array so the dashboard never bails with return null
    scorecardData: Array.isArray(values.scorecardData) ? values.scorecardData : [],
    growthInflationData: values.growthInflationData,
    centralBankData: values.centralBankData,
    debtData: values.debtData,
    m2Growth: values.m2Growth,
    tradeBalance: values.tradeBalance,
    industrialProd: values.industrialProd,
    consumerSentiment: values.consumerSentiment,
    yieldSpread: values.yieldSpread,
    cfnai: values.cfnai,
    oecdCli: values.oecdCli,
    oecdCliDetail: values.oecdCliDetail,
    cpiBreakdown: values.cpiBreakdown,
    isLive: centralData.isLive,
    lastUpdated: centralData.lastUpdated,
    isLoading: centralData.isLoading,
    fetchedOn: centralData.fetchedOn,
    isCurrent: centralData.isCurrent,
    isHistorical: centralData.isHistorical,
    asOfDate: centralData.asOfDate,
    fetchLog: centralData.fetchLog || [],
    error: centralData.error,
    refetch: centralData.refetch,
  };
}

function GlobalMacroMarket({ centralData } = {}) {
  const { convert, currentSymbol } = useCurrency();
  const imfCtx = useMarketData('imf');
  const wbCtx = useMarketData('worldbank');
  const ecbCtx = useMarketData('ecb');
  const dtsCtx = useMarketData('treasuryDTS');
  const sepCtx = useMarketData('fedSEP');
  const gdpNowCtx = useMarketData('fedGDPNow');
  const cleveCtx = useMarketData('fedInflationNowcast');
  const beaCtx = useMarketData('bea');
  const eurostatCtx = useMarketData('eurostat');
  const oecdCtx = useMarketData('oecd');
  if (!centralData) return <MarketSkeleton />;
  const props = getGlobalMacroProps(centralData);

  
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
      isHistorical={props.isHistorical}
      asOfDate={props.asOfDate}
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
        oecdCliDetail={props.oecdCliDetail}
        cpiBreakdown={props.cpiBreakdown}
        imfData={imfCtx?.data}
        wbData={wbCtx?.data}
        ecbData={ecbCtx?.data}
        ecbLastUpdated={ecbCtx?.lastUpdated}
        dtsData={dtsCtx?.data}
        dtsLastUpdated={dtsCtx?.lastUpdated}
        sepData={sepCtx?.data}
        sepLastUpdated={sepCtx?.lastUpdated}
        gdpNowData={gdpNowCtx?.data}
        gdpNowLastUpdated={gdpNowCtx?.lastUpdated}
        cleveData={cleveCtx?.data}
        cleveLastUpdated={cleveCtx?.lastUpdated}
        beaData={beaCtx?.data}
        beaLastUpdated={beaCtx?.lastUpdated}
        beaCtx={beaCtx}
        eurostatData={eurostatCtx?.data}
        eurostatLastUpdated={eurostatCtx?.lastUpdated}
        eurostatCtx={eurostatCtx}
        oecdData={oecdCtx?.data}
        oecdLastUpdated={oecdCtx?.lastUpdated}
        oecdCtx={oecdCtx}
        fetchLog={props.fetchLog}
        isLive={props.isLive}
        lastUpdated={props.lastUpdated}
        error={props.error}
        fetchedOn={props.fetchedOn}
        isCurrent={props.isCurrent}
        isHistorical={props.isHistorical}
        asOfDate={props.asOfDate}
      />
    </div>
  );
}

export default React.memo(GlobalMacroMarket);
