import { useState, useEffect } from 'react';
import {
  volSurfaceData  as mockVolSurfaceData,
  vixTermStructure as mockVixTermStructure,
  optionsFlow     as mockOptionsFlow,
  fearGreedData   as mockFearGreedData,
} from './mockDerivativesData';

const SERVER = '';

export function useDerivativesData() {
  const [volSurfaceData,   setVolSurfaceData]   = useState(mockVolSurfaceData);
  const [vixTermStructure, setVixTermStructure] = useState(mockVixTermStructure);
  const [optionsFlow,      setOptionsFlow]      = useState(mockOptionsFlow);
  const [fearGreedData,    setFearGreedData]    = useState(mockFearGreedData);
  const [vixEnrichment,    setVixEnrichment]    = useState(null);
  const [isLive,           setIsLive]           = useState(false);
  const [lastUpdated,      setLastUpdated]      = useState('Mock data — Apr 2025');
  const [isLoading,        setIsLoading]        = useState(true);

  useEffect(() => {
    fetch(`${SERVER}/api/derivatives`)
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(data => {
        if (data.vixTermStructure?.dates?.length)         setVixTermStructure(data.vixTermStructure);
        if (data.optionsFlow?.length >= 4)                setOptionsFlow(data.optionsFlow);
        if (data.fearGreedData?.indicators?.length === 7) setFearGreedData(data.fearGreedData);
        if (data.volSurfaceData?.grid?.length)            setVolSurfaceData(data.volSurfaceData);
        if (data.vixEnrichment?.vvix != null || data.vixEnrichment?.vixPercentile != null) {
          setVixEnrichment(data.vixEnrichment);
        }
        setIsLive(true);
        setLastUpdated(data.lastUpdated || new Date().toISOString().split('T')[0]);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  return { volSurfaceData, vixTermStructure, optionsFlow, fearGreedData, vixEnrichment, isLive, lastUpdated, isLoading };
}
