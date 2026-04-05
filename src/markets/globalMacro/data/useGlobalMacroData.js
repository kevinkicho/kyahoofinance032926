import { useState, useEffect } from 'react';
import {
  scorecardData       as mockScorecardData,
  growthInflationData as mockGrowthInflationData,
  centralBankData     as mockCentralBankData,
  debtData            as mockDebtData,
} from './mockGlobalMacroData';

const SERVER = '';

export function useGlobalMacroData() {
  const [scorecardData,       setScorecardData]       = useState(mockScorecardData);
  const [growthInflationData, setGrowthInflationData] = useState(mockGrowthInflationData);
  const [centralBankData,     setCentralBankData]     = useState(mockCentralBankData);
  const [debtData,            setDebtData]            = useState(mockDebtData);
  const [isLive,              setIsLive]              = useState(false);
  const [lastUpdated,         setLastUpdated]         = useState('Mock data — 2023');
  const [isLoading,           setIsLoading]           = useState(true);
  const [fetchedOn,           setFetchedOn]           = useState(null);
  const [isCurrent,           setIsCurrent]           = useState(false);

  useEffect(() => {
    fetch(`${SERVER}/api/globalMacro`)
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(data => {
        let anyReplaced = false;
        if (data.scorecardData?.length >= 8)                  { setScorecardData(data.scorecardData);             anyReplaced = true; }
        if (data.growthInflationData?.countries?.length >= 8) { setGrowthInflationData(data.growthInflationData); anyReplaced = true; }
        if (data.centralBankData?.current?.length >= 8)       { setCentralBankData(data.centralBankData);         anyReplaced = true; }
        if (data.debtData?.countries?.length >= 8)            { setDebtData(data.debtData);                       anyReplaced = true; }
        setIsLive(anyReplaced);
        if (anyReplaced) setLastUpdated(data.lastUpdated || new Date().toISOString().split('T')[0]);
        if (data.fetchedOn) setFetchedOn(data.fetchedOn);
        setIsCurrent(!!data.isCurrent);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  return { scorecardData, growthInflationData, centralBankData, debtData, isLive, lastUpdated, isLoading, fetchedOn, isCurrent };
}
