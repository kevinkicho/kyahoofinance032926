// src/markets/sentiment/data/useSentimentData.js
import { useState, useEffect, useCallback } from 'react';
import { fetchWithRetry } from '../../../utils/fetchWithRetry';
import { useInterval } from '../../../hooks/useInterval';
import { useDataStatus } from '../../../hooks/useDataStatus';
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

  // Status with error handling
  const { isLive, isLoading, error, lastUpdated, fetchedOn, isCurrent, handleSuccess, handleError, handleFinally, setIsLive, setLastUpdated } = useDataStatus();

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
        if (anyReplaced) {
          handleSuccess(data);
        }
      })
      .catch((err) => handleError(err, 'Sentiment'))
      .finally(() => handleFinally());
  }, [handleSuccess, handleError, handleFinally]);

  useEffect(() => { refetch(); }, [refetch]);

  useInterval(refetch, autoRefresh ? 300000 : null);

  return { fearGreedData, cftcData, riskData, returnsData, marginDebt, consumerCredit, vvixHistory, fsiHistory, isLive, lastUpdated, isLoading, error, fetchedOn, isCurrent };
}
