import { useState, useEffect } from 'react';
import { fetchWithRetry } from '../../../utils/fetchWithRetry';
import {
  sectorData    as mockSectorData,
  factorData    as mockFactorData,
  earningsData  as mockEarningsData,
  shortData     as mockShortData,
} from './mockEquityDeepDiveData';

const SERVER = '';

export function useEquityDeepDiveData() {
  const [sectorData,         setSectorData]         = useState(mockSectorData);
  const [factorData,         setFactorData]         = useState(mockFactorData);
  const [earningsData,       setEarningsData]       = useState(mockEarningsData);
  const [shortData,          setShortData]          = useState(mockShortData);
  const [equityRiskPremium,  setEquityRiskPremium]  = useState(null);
  const [spPE,               setSpPE]               = useState(null);
  const [breadthDivergence,  setBreadthDivergence]  = useState(null);
  const [buffettIndicator,   setBuffettIndicator]   = useState(null);
  const [isLive,             setIsLive]             = useState(false);
  const [lastUpdated,        setLastUpdated]        = useState('Mock data — 2026');
  const [isLoading,          setIsLoading]          = useState(true);
  const [fetchedOn,          setFetchedOn]          = useState(null);
  const [isCurrent,          setIsCurrent]          = useState(false);

  useEffect(() => {
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
        setIsLive(anyReplaced);
        if (anyReplaced) setLastUpdated(data.lastUpdated || new Date().toISOString().split('T')[0]);
        if (data.fetchedOn) setFetchedOn(data.fetchedOn);
        setIsCurrent(!!data.isCurrent);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  return {
    sectorData, factorData, earningsData, shortData,
    equityRiskPremium, spPE, breadthDivergence, buffettIndicator,
    isLive, lastUpdated, isLoading, fetchedOn, isCurrent,
  };
}
