// src/markets/derivatives/data/useDerivativesData.js
import { useState, useEffect, useCallback } from 'react';
import { fetchWithRetry } from '../../../utils/fetchWithRetry';
import { useInterval } from '../../../hooks/useInterval';
import { useDataStatus } from '../../../hooks/useDataStatus';
import {
  volSurfaceData  as mockVolSurfaceData,
  vixTermStructure as mockVixTermStructure,
  optionsFlow     as mockOptionsFlow,
  fredVixHistory  as mockFredVixHistory,
  skewHistory     as mockSkewHistory,
  gammaExposure   as mockGammaExposure,
} from './mockDerivativesData';

const SERVER = '';

export function useDerivativesData(autoRefresh = false) {
  const [volSurfaceData,   setVolSurfaceData]   = useState(mockVolSurfaceData);
  const [vixTermStructure, setVixTermStructure] = useState(mockVixTermStructure);
  const [optionsFlow,      setOptionsFlow]      = useState(mockOptionsFlow);
  const [vixEnrichment,    setVixEnrichment]    = useState(null);
  const [volPremium,       setVolPremium]       = useState(null);
  const [fredVixHistory,   setFredVixHistory]   = useState(mockFredVixHistory);
  const [putCallRatio,     setPutCallRatio]     = useState(null);
  const [skewIndex,        setSkewIndex]        = useState(null);
  const [skewHistory,      setSkewHistory]      = useState(mockSkewHistory);
  const [gammaExposure,    setGammaExposure]    = useState(mockGammaExposure);
  const [vixPercentile,    setVixPercentile]    = useState(null);
  const [termSpread,       setTermSpread]       = useState(null);

  // Status with error handling
  const { isLive, isLoading, error, lastUpdated, fetchedOn, isCurrent, handleSuccess, handleError, handleFinally } = useDataStatus();

  const refetch = useCallback(() => {
    fetchWithRetry(`${SERVER}/api/derivatives`)
      .then(r => r.json())
      .then(data => {
        if (data.vixTermStructure?.dates?.length)           setVixTermStructure(data.vixTermStructure);
        if (data.optionsFlow?.length >= 4)                  setOptionsFlow(data.optionsFlow);
        if (data.volSurfaceData?.grid?.length)              setVolSurfaceData(data.volSurfaceData);
        if (data.vixEnrichment?.vvix != null || data.vixEnrichment?.vixPercentile != null) {
          setVixEnrichment(data.vixEnrichment);
        }
        if (data.volPremium?.atm1mIV != null) setVolPremium(data.volPremium);
        if (data.fredVixHistory?.dates?.length >= 20) setFredVixHistory(data.fredVixHistory);
        if (data.putCallRatio != null)              setPutCallRatio(data.putCallRatio);
        if (data.skewIndex?.value != null)          setSkewIndex(data.skewIndex);
        if (data.skewHistory?.dates?.length >= 20)  setSkewHistory(data.skewHistory);
        if (data.gammaExposure?.total != null)      setGammaExposure(data.gammaExposure);
        if (data.vixPercentile != null)             setVixPercentile(data.vixPercentile);
        if (data.termSpread?.value != null)         setTermSpread(data.termSpread);
        handleSuccess(data);
      })
      .catch((err) => handleError(err, 'Derivatives'))
      .finally(() => handleFinally());
  }, [handleSuccess, handleError, handleFinally]);

  useEffect(() => { refetch(); }, [refetch]);

  useInterval(refetch, autoRefresh ? 300000 : null);

  return { volSurfaceData, vixTermStructure, optionsFlow, vixEnrichment, volPremium, fredVixHistory, putCallRatio, skewIndex, skewHistory, gammaExposure, vixPercentile, termSpread, isLive, lastUpdated, isLoading, error, fetchedOn, isCurrent };
}
