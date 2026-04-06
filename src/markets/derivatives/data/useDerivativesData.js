// src/markets/derivatives/data/useDerivativesData.js
import { useState, useEffect } from 'react';
import {
  volSurfaceData  as mockVolSurfaceData,
  vixTermStructure as mockVixTermStructure,
  optionsFlow     as mockOptionsFlow,
  fredVixHistory  as mockFredVixHistory,
} from './mockDerivativesData';

const SERVER = '';

export function useDerivativesData() {
  const [volSurfaceData,   setVolSurfaceData]   = useState(mockVolSurfaceData);
  const [vixTermStructure, setVixTermStructure] = useState(mockVixTermStructure);
  const [optionsFlow,      setOptionsFlow]      = useState(mockOptionsFlow);
  const [vixEnrichment,    setVixEnrichment]    = useState(null);
  const [volPremium,       setVolPremium]       = useState(null);
  const [fredVixHistory,   setFredVixHistory]   = useState(mockFredVixHistory);
  const [isLive,           setIsLive]           = useState(false);
  const [lastUpdated,      setLastUpdated]      = useState('Mock data — Apr 2025');
  const [isLoading,        setIsLoading]        = useState(true);
  const [fetchedOn,        setFetchedOn]        = useState(null);
  const [isCurrent,        setIsCurrent]        = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    fetch(`${SERVER}/api/derivatives`, { signal: controller.signal })
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(data => {
        if (data.vixTermStructure?.dates?.length)           setVixTermStructure(data.vixTermStructure);
        if (data.optionsFlow?.length >= 4)                  setOptionsFlow(data.optionsFlow);
        if (data.volSurfaceData?.grid?.length)              setVolSurfaceData(data.volSurfaceData);
        if (data.vixEnrichment?.vvix != null || data.vixEnrichment?.vixPercentile != null) {
          setVixEnrichment(data.vixEnrichment);
        }
        if (data.volPremium?.atm1mIV != null) setVolPremium(data.volPremium);
        if (data.fredVixHistory?.dates?.length >= 20) setFredVixHistory(data.fredVixHistory);
        setIsLive(true);
        setLastUpdated(data.lastUpdated || new Date().toISOString().split('T')[0]);
        if (data.fetchedOn) setFetchedOn(data.fetchedOn);
        setIsCurrent(!!data.isCurrent);
      })
      .catch(() => {})
      .finally(() => { clearTimeout(timer); setIsLoading(false); });
    return () => { clearTimeout(timer); controller.abort(); };
  }, []);

  return { volSurfaceData, vixTermStructure, optionsFlow, vixEnrichment, volPremium, fredVixHistory, isLive, lastUpdated, isLoading, fetchedOn, isCurrent };
}
