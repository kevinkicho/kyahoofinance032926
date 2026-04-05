import { useState, useEffect } from 'react';
import {
  sectorData    as mockSectorData,
  factorData    as mockFactorData,
  earningsData  as mockEarningsData,
  shortData     as mockShortData,
} from './mockEquityDeepDiveData';

const SERVER = '';

export function useEquityDeepDiveData() {
  const [sectorData,   setSectorData]   = useState(mockSectorData);
  const [factorData,   setFactorData]   = useState(mockFactorData);
  const [earningsData, setEarningsData] = useState(mockEarningsData);
  const [shortData,    setShortData]    = useState(mockShortData);
  const [isLive,       setIsLive]       = useState(false);
  const [lastUpdated,  setLastUpdated]  = useState('Mock data — 2026');
  const [isLoading,    setIsLoading]    = useState(true);
  const [fetchedOn,    setFetchedOn]    = useState(null);
  const [isCurrent,    setIsCurrent]    = useState(false);

  useEffect(() => {
    fetch(`${SERVER}/api/equityDeepDive`)
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(data => {
        let anyReplaced = false;
        if (data.sectorData?.sectors?.length >= 8)       { setSectorData(data.sectorData);     anyReplaced = true; }
        if (data.factorData?.stocks?.length >= 10)       { setFactorData(data.factorData);     anyReplaced = true; }
        if (data.earningsData?.upcoming?.length >= 5)    { setEarningsData(data.earningsData); anyReplaced = true; }
        if (data.shortData?.mostShorted?.length >= 10)   { setShortData(data.shortData);       anyReplaced = true; }
        setIsLive(anyReplaced);
        if (anyReplaced) setLastUpdated(data.lastUpdated || new Date().toISOString().split('T')[0]);
        if (data.fetchedOn) setFetchedOn(data.fetchedOn);
        setIsCurrent(!!data.isCurrent);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  return { sectorData, factorData, earningsData, shortData, isLive, lastUpdated, isLoading, fetchedOn, isCurrent };
}
