// src/markets/derivatives/data/useDerivativesData.js
import { useState, useEffect, useCallback } from 'react';
import { fetchWithRetry } from '../../../utils/fetchWithRetry';
import { useInterval } from '../../../hooks/useInterval';
import { useDataStatus } from '../../../hooks/useDataStatus';

const SERVER = '';

export function useDerivativesData(autoRefresh = false, refreshKey = 0) {
  const [volSurfaceData,   setVolSurfaceData]   = useState(null);
  const [vixTermStructure, setVixTermStructure] = useState(null);
  const [optionsFlow,      setOptionsFlow]      = useState(null);
  const [vixEnrichment,    setVixEnrichment]    = useState(null);
  const [volPremium,       setVolPremium]       = useState(null);
  const [fredVixHistory,   setFredVixHistory]   = useState(null);
  const [putCallRatio,     setPutCallRatio]     = useState(null);
  const [skewIndex,        setSkewIndex]        = useState(null);
  const [skewHistory,      setSkewHistory]      = useState(null);
  const [gammaExposure,    setGammaExposure]    = useState(null);
  const [vixPercentile,    setVixPercentile]    = useState(null);
  const [termSpread,       setTermSpread]       = useState(null);

  // Status with error handling
  const { isLive, isLoading, error, lastUpdated, fetchedOn, isCurrent, fetchLog, handleSuccess, handleError, handleFinally, logFetch } = useDataStatus();

  const refetch = useCallback(() => {
    const t0 = Date.now();
    fetchWithRetry(`${SERVER}/api/derivatives`)
      .then(r => r.json())
      .then(data => {
        if (data.vixTermStructure?.dates?.length)           setVixTermStructure(data.vixTermStructure);
        if (data.optionsFlow?.length)                  setOptionsFlow(data.optionsFlow);
        if (data.volSurfaceData?.grid?.length)              setVolSurfaceData(data.volSurfaceData);
        if (data.vixEnrichment?.vvix != null || data.vixEnrichment?.vixPercentile != null) {
          setVixEnrichment(data.vixEnrichment);
        }
        if (data.volPremium?.atm1mIV != null) setVolPremium(data.volPremium);
        if (data.fredVixHistory?.dates?.length) setFredVixHistory(data.fredVixHistory);
        if (data.putCallRatio != null)              setPutCallRatio(data.putCallRatio);
        if (data.skewIndex?.value != null)          setSkewIndex(data.skewIndex);
        if (data.skewHistory?.dates?.length)  setSkewHistory(data.skewHistory);
        if (data.gammaExposure?.total != null)      setGammaExposure(data.gammaExposure);
        if (data.vixPercentile != null)             setVixPercentile(data.vixPercentile);
        if (data.termSpread?.value != null)         setTermSpread(data.termSpread);
        handleSuccess(data);
        logFetch({ url: '/api/derivatives', status: 200, duration: Date.now() - t0, sources: { vixTermStructure: !!data.vixTermStructure?.dates?.length, optionsFlow: !!data.optionsFlow?.length, volSurfaceData: !!data.volSurfaceData?.grid?.length, fredVixHistory: !!data.fredVixHistory?.dates?.length }, seriesIds: ['VIXCLS', 'CBOEVIX', 'SKEW', 'GVZCLS'] });
      })
      .catch((err) => { handleError(err, 'Derivatives'); logFetch({ url: '/api/derivatives', status: 0, duration: Date.now() - t0, error: err?.message || 'Fetch failed' }); })
      .finally(() => handleFinally());
  }, [handleSuccess, handleError, handleFinally, logFetch]);

  useEffect(() => { refetch(); }, []);
  useEffect(() => { if (refreshKey > 0) refetch(); }, [refreshKey]);

  useInterval(refetch, autoRefresh ? 300000 : null);

  return { volSurfaceData, vixTermStructure, optionsFlow, vixEnrichment, volPremium, fredVixHistory, putCallRatio, skewIndex, skewHistory, gammaExposure, vixPercentile, termSpread, isLive, lastUpdated, isLoading, error, fetchedOn, isCurrent, fetchLog, refetch };
}
