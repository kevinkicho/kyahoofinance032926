// src/markets/crypto/data/useCryptoData.js
import { useState, useEffect } from 'react';
import { fetchWithRetry } from '../../../utils/fetchWithRetry';
import {
  coinMarketData as mockCoinMarketData,
  fearGreedData  as mockFearGreedData,
  defiData       as mockDefiData,
  fundingData    as mockFundingData,
  onChainData    as mockOnChainData,
} from './mockCryptoData';

const SERVER = '';

export function useCryptoData() {
  const [coinMarketData,  setCoinMarketData]  = useState(mockCoinMarketData);
  const [fearGreedData,   setFearGreedData]   = useState(mockFearGreedData);
  const [defiData,        setDefiData]        = useState(mockDefiData);
  const [fundingData,     setFundingData]     = useState(mockFundingData);
  const [onChainData,     setOnChainData]     = useState(mockOnChainData);
  const [stablecoinMcap,  setStablecoinMcap]  = useState(null);
  const [btcDominance,    setBtcDominance]    = useState(null);
  const [topExchanges,    setTopExchanges]    = useState([]);
  const [ethGas,          setEthGas]          = useState(null);
  const [isLive,          setIsLive]          = useState(false);
  const [lastUpdated,     setLastUpdated]     = useState('Mock data — 2026');
  const [isLoading,       setIsLoading]       = useState(true);
  const [fetchedOn,       setFetchedOn]       = useState(null);
  const [isCurrent,       setIsCurrent]       = useState(false);

  useEffect(() => {
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
        setIsLive(anyReplaced);
        if (anyReplaced) setLastUpdated(data.lastUpdated || new Date().toISOString().split('T')[0]);
        if (data.fetchedOn) setFetchedOn(data.fetchedOn);
        setIsCurrent(!!data.isCurrent);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  return { coinMarketData, fearGreedData, defiData, fundingData, onChainData, stablecoinMcap, btcDominance, topExchanges, ethGas, isLive, lastUpdated, isLoading, fetchedOn, isCurrent };
}
