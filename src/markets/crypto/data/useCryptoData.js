// src/markets/crypto/data/useCryptoData.js
import { useState, useEffect, useCallback } from 'react';
import { fetchWithRetry } from '../../../utils/fetchWithRetry';
import { useInterval } from '../../../hooks/useInterval';
import { useDataStatus } from '../../../hooks/useDataStatus';
import {
  coinMarketData as mockCoinMarketData,
  fearGreedData  as mockFearGreedData,
  defiData       as mockDefiData,
  fundingData    as mockFundingData,
  onChainData    as mockOnChainData,
} from './mockCryptoData';

const SERVER = '';

export function useCryptoData(autoRefresh = false) {
  const [coinMarketData,  setCoinMarketData]  = useState(mockCoinMarketData);
  const [fearGreedData,   setFearGreedData]   = useState(mockFearGreedData);
  const [defiData,        setDefiData]        = useState(mockDefiData);
  const [fundingData,     setFundingData]     = useState(mockFundingData);
  const [onChainData,     setOnChainData]     = useState(mockOnChainData);
  const [stablecoinMcap,  setStablecoinMcap]  = useState(null);
  const [btcDominance,    setBtcDominance]    = useState(null);
  const [topExchanges,    setTopExchanges]    = useState([]);
  const [ethGas,          setEthGas]          = useState(null);

  // Status with error handling
  const { isLive, isLoading, error, lastUpdated, fetchedOn, isCurrent, handleSuccess, handleError, handleFinally } = useDataStatus();

  const refetch = useCallback(() => {
    fetchWithRetry(`${SERVER}/api/crypto`)
      .then(r => r.json())
      .then(data => {
        let anyReplaced = false;
        if (data.coinMarketData?.coins?.length >= 10)       { setCoinMarketData(data.coinMarketData); anyReplaced = true; }
        if (data.fearGreedData?.history?.length >= 7)       { setFearGreedData(data.fearGreedData);   anyReplaced = true; }
        if (data.defiData?.protocols?.length >= 5)          { setDefiData(data.defiData);             anyReplaced = true; }
        if (data.fundingData?.rates?.length >= 3)           { setFundingData(data.fundingData);       anyReplaced = true; }
        if (data.onChainData?.fees?.fastest != null)        { setOnChainData(data.onChainData);       anyReplaced = true; }
        if (data.stablecoinMcap != null)                     { setStablecoinMcap(data.stablecoinMcap);  anyReplaced = true; }
        if (data.btcDominance != null)                       { setBtcDominance(data.btcDominance);      anyReplaced = true; }
        if (Array.isArray(data.topExchanges) && data.topExchanges.length > 0) { setTopExchanges(data.topExchanges); anyReplaced = true; }
        if (data.ethGas?.average != null)                    { setEthGas(data.ethGas);                  anyReplaced = true; }
        if (anyReplaced) handleSuccess(data);
      })
      .catch((err) => handleError(err, 'Crypto'))
      .finally(() => handleFinally());
  }, [handleSuccess, handleError, handleFinally]);

  useEffect(() => { refetch(); }, [refetch]);

  useInterval(refetch, autoRefresh ? 300000 : null);

  return { coinMarketData, fearGreedData, defiData, fundingData, onChainData, stablecoinMcap, btcDominance, topExchanges, ethGas, isLive, lastUpdated, isLoading, error, fetchedOn, isCurrent };
}
