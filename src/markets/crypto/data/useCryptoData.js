// src/markets/crypto/data/useCryptoData.js
import { useState, useEffect, useCallback } from 'react';
import { fetchWithRetry } from '../../../utils/fetchWithRetry';
import { useInterval } from '../../../hooks/useInterval';
import { useDataStatus } from '../../../hooks/useDataStatus';

const SERVER = '';

export function useCryptoData(autoRefresh = false, refreshKey = 0) {
  const [coinMarketData,  setCoinMarketData]  = useState(null);
  const [fearGreedData,   setFearGreedData]   = useState(null);
  const [defiData,        setDefiData]        = useState(null);
  const [fundingData,     setFundingData]     = useState(null);
  const [onChainData,     setOnChainData]     = useState(null);
  const [stablecoinMcap,  setStablecoinMcap]  = useState(null);
  const [btcDominance,    setBtcDominance]    = useState(null);
  const [topExchanges,    setTopExchanges]    = useState([]);
  const [ethGas,          setEthGas]          = useState(null);

  // Status with error handling
  const { isLive, isLoading, error, lastUpdated, fetchedOn, isCurrent, fetchLog, logFetch, handleSuccess, handleError, handleFinally } = useDataStatus();

  const refetch = useCallback(() => {
    const t0 = Date.now();
    fetchWithRetry(`${SERVER}/api/crypto`)
      .then(r => r.json())
      .then(data => {
        let anyReplaced = false;
        if (data.coinMarketData?.coins?.length)       { setCoinMarketData(data.coinMarketData); anyReplaced = true; }
        if (data.fearGreedData?.history?.length)       { setFearGreedData(data.fearGreedData);   anyReplaced = true; }
        if (data.defiData?.protocols?.length)          { setDefiData(data.defiData);             anyReplaced = true; }
        if (data.fundingData?.rates?.length)           { setFundingData(data.fundingData);       anyReplaced = true; }
        if (data.onChainData?.fees?.fastest != null)        { setOnChainData(data.onChainData);       anyReplaced = true; }
        if (data.stablecoinMcap != null)                     { setStablecoinMcap(data.stablecoinMcap);  anyReplaced = true; }
        if (data.btcDominance != null)                       { setBtcDominance(data.btcDominance);      anyReplaced = true; }
        if (Array.isArray(data.topExchanges) && data.topExchanges.length > 0) { setTopExchanges(data.topExchanges); anyReplaced = true; }
        if (data.ethGas?.average != null)                    { setEthGas(data.ethGas);                  anyReplaced = true; }
        if (anyReplaced) handleSuccess(data);
        logFetch({ url: '/api/crypto', status: 200, duration: Date.now() - t0, sources: { coinMarketData: !!data.coinMarketData, fearGreedData: !!data.fearGreedData, defiData: !!data.defiData, fundingData: !!data.fundingData, onChainData: !!data.onChainData, stablecoinMcap: data.stablecoinMcap != null, btcDominance: data.btcDominance != null, topExchanges: !!(data.topExchanges?.length), ethGas: !!data.ethGas }, seriesIds: ['CoinGecko BTC', 'CoinGecko ETH', 'DeFiLlama TVL', 'FearGreed Index'] });
      })
      .catch((err) => { handleError(err, 'Crypto'); logFetch({ url: '/api/crypto', status: 'error', duration: Date.now() - t0, error: err?.message }); })
      .finally(() => handleFinally());
  }, [handleSuccess, handleError, handleFinally, logFetch]);

  useEffect(() => { refetch(); }, []);
  useEffect(() => { if (refreshKey > 0) refetch(); }, [refreshKey]);

  useInterval(refetch, autoRefresh ? 300000 : null);

  return { coinMarketData, fearGreedData, defiData, fundingData, onChainData, stablecoinMcap, btcDominance, topExchanges, ethGas, isLive, lastUpdated, isLoading, error, fetchedOn, isCurrent, fetchLog, refetch };
}
