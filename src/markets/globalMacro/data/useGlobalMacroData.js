import { useState, useEffect, useCallback } from 'react';
import { fetchWithRetry } from '../../../utils/fetchWithRetry';
import { useInterval } from '../../../hooks/useInterval';
import { useDataStatus } from '../../../hooks/useDataStatus';
import { scorecardData as mockScorecard, growthInflationData as mockGrowthInflation, centralBankData as mockCentralBank, debtData as mockDebt, cfnai as mockCfnai, oecdCli as mockOecdCli, cpiBreakdown as mockCpiBreakdown } from './mockGlobalMacroData';

const SERVER = '';

export function useGlobalMacroData(autoRefresh = false, refreshKey = 0, { disabled = false } = {}) {
  const [scorecardData,       setScorecardData]       = useState(mockScorecard);
  const [growthInflationData, setGrowthInflationData] = useState(mockGrowthInflation);
  const [centralBankData,     setCentralBankData]     = useState(mockCentralBank);
  const [debtData,            setDebtData]            = useState(mockDebt);
  const [m2Growth,            setM2Growth]            = useState(null);
  const [tradeBalance,        setTradeBalance]        = useState(null);
  const [industrialProd,      setIndustrialProd]      = useState(null);
  const [consumerSentiment,   setConsumerSentiment]   = useState(null);
  const [yieldSpread,         setYieldSpread]         = useState(null);
  const [cfnai,               setCfnai]               = useState(mockCfnai);
  const [oecdCli,             setOecdCli]             = useState(mockOecdCli);
  const [cpiBreakdown,        setCpiBreakdown]        = useState(mockCpiBreakdown);

  // Status with error handling
  const { isLive, isLoading, error, lastUpdated, fetchedOn, isCurrent, fetchLog, handleSuccess, handleError, handleFinally, logFetch } = useDataStatus();

  const refetch = useCallback(() => {
    const t0 = Date.now();
    fetchWithRetry(`${SERVER}/api/globalMacro`)
      .then(r => r.json())
      .then(data => {
        let anyReplaced = false;
        if (data.scorecardData?.length >= 8)                  { setScorecardData(data.scorecardData);             anyReplaced = true; }
        if (data.growthInflationData?.countries?.length) { setGrowthInflationData(data.growthInflationData); anyReplaced = true; }
        if (data.centralBankData?.current?.length)       { setCentralBankData(data.centralBankData);         anyReplaced = true; }
        if (data.debtData?.countries?.length)            { setDebtData(data.debtData);                       anyReplaced = true; }
        if (data.m2Growth?.dates?.length)          { setM2Growth(data.m2Growth);                 anyReplaced = true; }
        if (data.tradeBalance?.dates?.length)      { setTradeBalance(data.tradeBalance);         anyReplaced = true; }
        if (data.industrialProd?.dates?.length)    { setIndustrialProd(data.industrialProd);     anyReplaced = true; }
        if (data.consumerSentiment?.dates?.length) { setConsumerSentiment(data.consumerSentiment); anyReplaced = true; }
        if (data.yieldSpread?.dates?.length)       { setYieldSpread(data.yieldSpread);           anyReplaced = true; }
        if (data.cfnai?.dates?.length)              { setCfnai(data.cfnai);                      anyReplaced = true; }
        if (data.oecdCli?.countries?.length)   { setOecdCli(data.oecdCli);                   anyReplaced = true; }
        if (data.cpiBreakdown?.components?.length) { setCpiBreakdown(data.cpiBreakdown);       anyReplaced = true; }
        if (anyReplaced) handleSuccess(data);
        logFetch({ url: '/api/globalMacro', status: 200, duration: Date.now() - t0, sources: { scorecardData: !!data.scorecardData, growthInflationData: !!data.growthInflationData, centralBankData: !!data.centralBankData, debtData: !!data.debtData }, seriesIds: ['NYGMNQXDC', 'CPIAUCSL', 'FEDFUNDS', 'GDP', 'M2SL'] });
      })
      .catch((err) => { handleError(err, 'GlobalMacro'); logFetch({ url: '/api/globalMacro', status: 0, duration: Date.now() - t0, error: err?.message || 'Fetch failed' }); })
      .finally(() => handleFinally());
  }, [handleSuccess, handleError, handleFinally, logFetch]);

  useEffect(() => { if (!disabled) refetch(); }, [disabled]);
  useEffect(() => { if (refreshKey > 0 && !disabled) refetch(); }, [refreshKey, disabled]);

  useInterval(refetch, (!disabled && autoRefresh) ? 300000 : null);

  return {
    scorecardData, growthInflationData, centralBankData, debtData,
    m2Growth, tradeBalance, industrialProd, consumerSentiment, yieldSpread, cfnai, oecdCli, cpiBreakdown,
    isLive, lastUpdated, isLoading, error, fetchedOn, isCurrent, fetchLog, refetch,
  };
}
