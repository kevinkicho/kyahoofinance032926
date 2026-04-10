import { useState, useEffect, useCallback } from 'react';
import { fetchWithRetry } from '../../../utils/fetchWithRetry';
import { useInterval } from '../../../hooks/useInterval';
import { useDataStatus } from '../../../hooks/useDataStatus';
import {
  sectorData    as mockSectorData,
  factorData    as mockFactorData,
  earningsData  as mockEarningsData,
  shortData     as mockShortData,
} from './mockEquityDeepDiveData';

const SERVER = '';

export function useEquityDeepDiveData(autoRefresh = false) {
  const [sectorData,         setSectorData]         = useState(mockSectorData);
  const [factorData,         setFactorData]         = useState(mockFactorData);
  const [earningsData,       setEarningsData]       = useState(mockEarningsData);
  const [shortData,          setShortData]          = useState(mockShortData);
  const [equityRiskPremium,  setEquityRiskPremium]  = useState(null);
  const [spPE,               setSpPE]               = useState(null);
  const [breadthDivergence,  setBreadthDivergence]  = useState(null);
  const [buffettIndicator,   setBuffettIndicator]   = useState(null);

  // Status with error handling
  const { isLive, isLoading, error, lastUpdated, fetchedOn, isCurrent, handleSuccess, handleError, handleFinally } = useDataStatus();

  const refetch = useCallback(() => {
    fetchWithRetry(`${SERVER}/api/equityDeepDive`)
      .then(r => r.json())
      .then(data => {
        let anyReplaced = false;
        if (data.sectorData?.sectors?.length >= 8)       { setSectorData(data.sectorData);     anyReplaced = true; }
        if (data.factorData?.stocks?.length >= 10)       { setFactorData(data.factorData);     anyReplaced = true; }
        if (data.earningsData?.upcoming?.length >= 5)    { setEarningsData(data.earningsData); anyReplaced = true; }
        if (data.shortData?.mostShorted?.length >= 10)   { setShortData(data.shortData);       anyReplaced = true; }
        if (data.equityRiskPremium)   setEquityRiskPremium(data.equityRiskPremium);
        if (data.spPE != null)        setSpPE(data.spPE);
        if (data.breadthDivergence)   setBreadthDivergence(data.breadthDivergence);
        if (data.buffettIndicator)    setBuffettIndicator(data.buffettIndicator);
        if (anyReplaced) handleSuccess(data);
      })
      .catch((err) => handleError(err, 'EquityDeepDive'))
      .finally(() => handleFinally());
  }, [handleSuccess, handleError, handleFinally]);

  useEffect(() => { refetch(); }, [refetch]);

  useInterval(refetch, autoRefresh ? 300000 : null);

  return {
    sectorData, factorData, earningsData, shortData,
    equityRiskPremium, spPE, breadthDivergence, buffettIndicator,
    isLive, lastUpdated, isLoading, error, fetchedOn, isCurrent,
  };
}
