import { useState, useEffect, useCallback } from 'react';
import { fetchWithRetry } from '../../../utils/fetchWithRetry';
import { useInterval } from '../../../hooks/useInterval';
import {
  scorecardData       as mockScorecardData,
  growthInflationData as mockGrowthInflationData,
  centralBankData     as mockCentralBankData,
  debtData            as mockDebtData,
  cfnai               as mockCfnai,
  oecdCli             as mockOecdCli,
  cpiBreakdown        as mockCpiBreakdown,
} from './mockGlobalMacroData';

const SERVER = '';

export function useGlobalMacroData(autoRefresh = false) {
  const [scorecardData,       setScorecardData]       = useState(mockScorecardData);
  const [growthInflationData, setGrowthInflationData] = useState(mockGrowthInflationData);
  const [centralBankData,     setCentralBankData]     = useState(mockCentralBankData);
  const [debtData,            setDebtData]            = useState(mockDebtData);
  const [m2Growth,            setM2Growth]            = useState(null);
  const [tradeBalance,        setTradeBalance]        = useState(null);
  const [industrialProd,      setIndustrialProd]      = useState(null);
  const [consumerSentiment,   setConsumerSentiment]   = useState(null);
  const [yieldSpread,         setYieldSpread]         = useState(null);
  const [cfnai,               setCfnai]               = useState(mockCfnai);
  const [oecdCli,             setOecdCli]             = useState(mockOecdCli);
  const [cpiBreakdown,        setCpiBreakdown]        = useState(mockCpiBreakdown);
  const [isLive,              setIsLive]              = useState(false);
  const [lastUpdated,         setLastUpdated]         = useState('Mock data — 2023');
  const [isLoading,           setIsLoading]           = useState(true);
  const [fetchedOn,           setFetchedOn]           = useState(null);
  const [isCurrent,           setIsCurrent]           = useState(false);

  const refetch = useCallback(() => {
    fetchWithRetry(`${SERVER}/api/globalMacro`)
      .then(r => r.json())
      .then(data => {
        let anyReplaced = false;
        if (data.scorecardData?.length >= 8)                  { setScorecardData(data.scorecardData);             anyReplaced = true; }
        if (data.growthInflationData?.countries?.length >= 8) { setGrowthInflationData(data.growthInflationData); anyReplaced = true; }
        if (data.centralBankData?.current?.length >= 8)       { setCentralBankData(data.centralBankData);         anyReplaced = true; }
        if (data.debtData?.countries?.length >= 8)            { setDebtData(data.debtData);                       anyReplaced = true; }
        if (data.m2Growth?.dates?.length)          { setM2Growth(data.m2Growth);                 anyReplaced = true; }
        if (data.tradeBalance?.dates?.length)      { setTradeBalance(data.tradeBalance);         anyReplaced = true; }
        if (data.industrialProd?.dates?.length)    { setIndustrialProd(data.industrialProd);     anyReplaced = true; }
        if (data.consumerSentiment?.dates?.length) { setConsumerSentiment(data.consumerSentiment); anyReplaced = true; }
        if (data.yieldSpread?.dates?.length)       { setYieldSpread(data.yieldSpread);           anyReplaced = true; }
        if (data.cfnai?.dates?.length)              { setCfnai(data.cfnai);                      anyReplaced = true; }
        if (data.oecdCli?.countries?.length >= 5)   { setOecdCli(data.oecdCli);                   anyReplaced = true; }
        if (data.cpiBreakdown?.components?.length >= 3) { setCpiBreakdown(data.cpiBreakdown);       anyReplaced = true; }
        setIsLive(anyReplaced);
        if (anyReplaced) setLastUpdated(data.lastUpdated || new Date().toISOString().split('T')[0]);
        if (data.fetchedOn) setFetchedOn(data.fetchedOn);
        setIsCurrent(!!data.isCurrent);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  useInterval(refetch, autoRefresh ? 300000 : null);

  return {
    scorecardData, growthInflationData, centralBankData, debtData,
    m2Growth, tradeBalance, industrialProd, consumerSentiment, yieldSpread, cfnai, oecdCli, cpiBreakdown,
    isLive, lastUpdated, isLoading, fetchedOn, isCurrent,
  };
}
