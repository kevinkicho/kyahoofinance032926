// src/markets/sentiment/data/useSentimentData.js
import { useState, useEffect, useCallback } from 'react';
import { fetchWithRetry } from '../../../utils/fetchWithRetry';
import { useInterval } from '../../../hooks/useInterval';
import { useDataStatus } from '../../../hooks/useDataStatus';

const SERVER = '';

export function useSentimentData(autoRefresh = false, refreshKey = 0) {
  const [fearGreedData, setFearGreedData] = useState(null);
  const [cftcData,      setCftcData]      = useState(null);
  const [riskData,      setRiskData]      = useState(null);
  const [returnsData,   setReturnsData]   = useState(null);
  const [marginDebt,    setMarginDebt]    = useState(null);
  const [consumerCredit, setConsumerCredit] = useState(null);
  const [vvixHistory,   setVvixHistory]   = useState(null);
  const [fsiHistory,    setFsiHistory]    = useState(null);

  // Status with error handling
  const { isLive, isLoading, error, lastUpdated, fetchedOn, isCurrent, fetchLog, handleSuccess, handleError, handleFinally, logFetch } = useDataStatus();

  const refetch = useCallback(() => {
    const t0 = Date.now();
    fetchWithRetry(`${SERVER}/api/sentiment`)
      .then(r => r.json())
      .then(data => {
        let anyReplaced = false;
        if (data.fearGreedData?.history?.length) { setFearGreedData(data.fearGreedData); anyReplaced = true; }
        if (data.cftcData?.currencies?.length)    { setCftcData(data.cftcData);           anyReplaced = true; }
        if (data.riskData?.signals?.length)       { setRiskData(data.riskData);           anyReplaced = true; }
        if (data.returnsData?.assets?.length)     { setReturnsData(data.returnsData);     anyReplaced = true; }
        if (data.marginDebt?.dates?.length >= 1)       { setMarginDebt(data.marginDebt);       anyReplaced = true; }
        if (data.consumerCredit?.dates?.length >= 1)   { setConsumerCredit(data.consumerCredit); anyReplaced = true; }
        if (data.vvixHistory?.dates?.length >= 1)      { setVvixHistory(data.vvixHistory);     anyReplaced = true; }
        if (data.fsiHistory?.dates?.length >= 1)       { setFsiHistory(data.fsiHistory);       anyReplaced = true; }
        if (anyReplaced) {
          handleSuccess(data);
        }
        logFetch({ url: '/api/sentiment', status: 200, duration: Date.now() - t0, sources: { fearGreedData: !!data.fearGreedData, cftcData: !!data.cftcData, riskData: !!data.riskData, marginDebt: !!data.marginDebt, consumerCredit: !!data.consumerCredit, fsiHistory: !!data.fsiHistory }, seriesIds: ['ANEURI', 'CFTC_SHRT', 'DEFLEQ', 'BAMLH0A0HYM2'] });
      })
      .catch((err) => { handleError(err, 'Sentiment'); logFetch({ url: '/api/sentiment', status: 0, duration: Date.now() - t0, error: err?.message || 'Fetch failed' }); })
      .finally(() => handleFinally());
  }, [handleSuccess, handleError, handleFinally, logFetch]);

  useEffect(() => { refetch(); }, []);
  useEffect(() => { if (refreshKey > 0) refetch(); }, [refreshKey]);

  useInterval(refetch, autoRefresh ? 300000 : null);

  return { fearGreedData, cftcData, riskData, returnsData, marginDebt, consumerCredit, vvixHistory, fsiHistory, isLive, lastUpdated, isLoading, error, fetchedOn, isCurrent, fetchLog, refetch };
}
