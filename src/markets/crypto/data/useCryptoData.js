// src/markets/crypto/data/useCryptoData.js
import { useState, useEffect } from 'react';
import {
  coinMarketData as mockCoinMarketData,
  fearGreedData  as mockFearGreedData,
  defiData       as mockDefiData,
  fundingData    as mockFundingData,
} from './mockCryptoData';

const SERVER = '';

export function useCryptoData() {
  const [coinMarketData, setCoinMarketData] = useState(mockCoinMarketData);
  const [fearGreedData,  setFearGreedData]  = useState(mockFearGreedData);
  const [defiData,       setDefiData]       = useState(mockDefiData);
  const [fundingData,    setFundingData]    = useState(mockFundingData);
  const [isLive,         setIsLive]         = useState(false);
  const [lastUpdated,    setLastUpdated]    = useState('Mock data — 2026');
  const [isLoading,      setIsLoading]      = useState(true);
  const [fetchedOn,      setFetchedOn]      = useState(null);
  const [isCurrent,      setIsCurrent]      = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);

    fetch(`${SERVER}/api/crypto`, { signal: controller.signal })
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(data => {
        let anyReplaced = false;
        if (data.coinMarketData?.coins?.length >= 10)       { setCoinMarketData(data.coinMarketData); anyReplaced = true; }
        if (data.fearGreedData?.history?.length >= 7)       { setFearGreedData(data.fearGreedData);   anyReplaced = true; }
        if (data.defiData?.protocols?.length >= 5)          { setDefiData(data.defiData);             anyReplaced = true; }
        if (data.fundingData?.rates?.length >= 3)           { setFundingData(data.fundingData);       anyReplaced = true; }
        setIsLive(anyReplaced);
        if (anyReplaced) setLastUpdated(data.lastUpdated || new Date().toISOString().split('T')[0]);
        if (data.fetchedOn) setFetchedOn(data.fetchedOn);
        setIsCurrent(!!data.isCurrent);
      })
      .catch(() => {})
      .finally(() => { clearTimeout(timer); setIsLoading(false); });

    return () => { clearTimeout(timer); controller.abort(); };
  }, []);

  return { coinMarketData, fearGreedData, defiData, fundingData, isLive, lastUpdated, isLoading, fetchedOn, isCurrent };
}
