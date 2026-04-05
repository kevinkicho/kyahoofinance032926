// src/markets/sentiment/data/useSentimentData.js
import { useState, useEffect } from 'react';
import {
  fearGreedData as mockFearGreedData,
  cftcData      as mockCftcData,
  riskData      as mockRiskData,
  returnsData   as mockReturnsData,
} from './mockSentimentData';

const SERVER = '';

export function useSentimentData() {
  const [fearGreedData, setFearGreedData] = useState(mockFearGreedData);
  const [cftcData,      setCftcData]      = useState(mockCftcData);
  const [riskData,      setRiskData]      = useState(mockRiskData);
  const [returnsData,   setReturnsData]   = useState(mockReturnsData);
  const [isLive,        setIsLive]        = useState(false);
  const [lastUpdated,   setLastUpdated]   = useState('Mock data — 2026');
  const [isLoading,     setIsLoading]     = useState(true);
  const [fetchedOn,     setFetchedOn]     = useState(null);
  const [isCurrent,     setIsCurrent]     = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);

    fetch(`${SERVER}/api/sentiment`, { signal: controller.signal })
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(data => {
        let anyReplaced = false;
        if (data.fearGreedData?.history?.length >= 30) { setFearGreedData(data.fearGreedData); anyReplaced = true; }
        if (data.cftcData?.currencies?.length >= 4)    { setCftcData(data.cftcData);           anyReplaced = true; }
        if (data.riskData?.signals?.length >= 4)       { setRiskData(data.riskData);           anyReplaced = true; }
        if (data.returnsData?.assets?.length >= 6)     { setReturnsData(data.returnsData);     anyReplaced = true; }
        setIsLive(anyReplaced);
        if (anyReplaced) setLastUpdated(data.lastUpdated || new Date().toISOString().split('T')[0]);
        if (data.fetchedOn) setFetchedOn(data.fetchedOn);
        setIsCurrent(!!data.isCurrent);
      })
      .catch(() => {})
      .finally(() => { clearTimeout(timer); setIsLoading(false); });

    return () => { clearTimeout(timer); controller.abort(); };
  }, []);

  return { fearGreedData, cftcData, riskData, returnsData, isLive, lastUpdated, isLoading, fetchedOn, isCurrent };
}
