import { useState, useEffect, useCallback } from 'react';
import { fetchWithRetry } from '../../../utils/fetchWithRetry';
import { useInterval } from '../../../hooks/useInterval';
import { useDataStatus } from '../../../hooks/useDataStatus';
import { sectorData as mockSector, factorData as mockFactor, earningsData as mockEarnings, shortData as mockShort } from './mockEquityDeepDiveData';

const SERVER = '';

export function useEquityDeepDiveData(autoRefresh = false, refreshKey = 0, { disabled = false } = {}) {
  const [sectorData,         setSectorData]         = useState(mockSector);
  const [factorData,         setFactorData]         = useState(mockFactor);
  const [earningsData,       setEarningsData]       = useState(mockEarnings);
  const [shortData,          setShortData]          = useState(mockShort);
  const [equityRiskPremium,  setEquityRiskPremium]  = useState(null);
  const [spPE,               setSpPE]               = useState(null);
  const [breadthDivergence,  setBreadthDivergence]  = useState(null);
  const [buffettIndicator,   setBuffettIndicator]   = useState(null);

  // Status with error handling
  const { isLive, isLoading, error, lastUpdated, fetchedOn, isCurrent, fetchLog, handleSuccess, handleError, handleFinally, logFetch } = useDataStatus();

  const refetch = useCallback(() => {
    const t0 = Date.now();
    fetchWithRetry(`${SERVER}/api/equityDeepDive`)
      .then(r => r.json())
      .then(data => {
        let anyReplaced = false;
        if (data.sectorData?.sectors?.length >= 8)    { setSectorData(data.sectorData);     anyReplaced = true; }
        if (data.factorData?.stocks?.length)       { setFactorData(data.factorData);     anyReplaced = true; }
        if (data.earningsData?.upcoming?.length) { setEarningsData(data.earningsData); anyReplaced = true; }
        if (data.shortData?.mostShorted?.length)   { setShortData(data.shortData);       anyReplaced = true; }
        if (data.equityRiskPremium)   setEquityRiskPremium(data.equityRiskPremium);
        if (data.spPE != null)        setSpPE(data.spPE);
        if (data.breadthDivergence)   setBreadthDivergence(data.breadthDivergence);
        if (data.buffettIndicator)    setBuffettIndicator(data.buffettIndicator);
        if (anyReplaced) handleSuccess(data);
        logFetch({ url: '/api/equityDeepDive', status: 200, duration: Date.now() - t0, sources: { sectorData: !!data.sectorData, factorData: !!data.factorData, earningsData: !!data.earningsData, shortData: !!data.shortData }, seriesIds: ['SP500', 'VIXCLS'] });
      })
      .catch((err) => { handleError(err, 'EquityDeepDive'); logFetch({ url: '/api/equityDeepDive', status: 0, duration: Date.now() - t0, error: err?.message || 'Fetch failed' }); })
      .finally(() => handleFinally());
  }, [handleSuccess, handleError, handleFinally, logFetch]);

  useEffect(() => { if (!disabled) refetch(); }, [disabled]);
  useEffect(() => { if (refreshKey > 0 && !disabled) refetch(); }, [refreshKey, disabled]);

  useInterval(refetch, (!disabled && autoRefresh) ? 300000 : null);

  return {
    sectorData, factorData, earningsData, shortData,
    equityRiskPremium, spPE, breadthDivergence, buffettIndicator,
    isLive, lastUpdated, isLoading, error, fetchedOn, isCurrent, fetchLog, refetch,
  };
}
