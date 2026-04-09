// src/markets/sentiment/data/useSentimentData.js
import { useState, useEffect, useCallback } from 'react';
import { fetchWithRetry } from '../../../utils/fetchWithRetry';
import { useInterval } from '../../../hooks/useInterval';
import {
  fearGreedData as mockFearGreedData,
  cftcData      as mockCftcData,
  riskData      as mockRiskData,
  returnsData   as mockReturnsData,
} from './mockSentimentData';

const SERVER = '';

export function useSentimentData(autoRefresh = false) {
  const [fearGreedData, setFearGreedData] = useState(mockFearGreedData);
  const [cftcData,      setCftcData]      = useState(mockCftcData);
  const [riskData,      setRiskData]      = useState(mockRiskData);
  const [returnsData,   setReturnsData]   = useState(mockReturnsData);
  const [marginDebt,    setMarginDebt]    = useState(null);
  const [consumerCredit, setConsumerCredit] = useState(null);
  const [vvixHistory,   setVvixHistory]   = useState(null);
  const [fsiHistory,    setFsiHistory]    = useState(null);
  const [isLive,        setIsLive]        = useState(false);
  const [lastUpdated,   setLastUpdated]   = useState('Mock data — 2026');
  const [isLoading,     setIsLoading]     = useState(true);
  const [fetchedOn,     setFetchedOn]     = useState(null);
  const [isCurrent,     setIsCurrent]     = useState(false);

  const refetch = useCallback(() => {
    fetchWithRetry(`${SERVER}/api/sentiment`)
      .then(r => r.json())
      .then(data => {
        let anyReplaced = false;
        if (data.fearGreedData?.history?.length >= 30) { setFearGreedData(data.fearGreedData); anyReplaced = true; }
        if (data.cftcData?.currencies?.length >= 4)    { setCftcData(data.cftcData);           anyReplaced = true; }
        if (data.riskData?.signals?.length >= 4)       { setRiskData(data.riskData);           anyReplaced = true; }
        if (data.returnsData?.assets?.length >= 6)     { setReturnsData(data.returnsData);     anyReplaced = true; }
        if (data.marginDebt?.dates?.length >= 1)       { setMarginDebt(data.marginDebt);       anyReplaced = true; }
        if (data.consumerCredit?.dates?.length >= 1)   { setConsumerCredit(data.consumerCredit); anyReplaced = true; }
        if (data.vvixHistory?.dates?.length >= 1)      { setVvixHistory(data.vvixHistory);     anyReplaced = true; }
        if (data.fsiHistory?.dates?.length >= 1)       { setFsiHistory(data.fsiHistory);       anyReplaced = true; }
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

  return { fearGreedData, cftcData, riskData, returnsData, marginDebt, consumerCredit, vvixHistory, fsiHistory, isLive, lastUpdated, isLoading, fetchedOn, isCurrent };
}
