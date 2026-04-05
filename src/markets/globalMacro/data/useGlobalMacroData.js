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

  useEffect(() => {
    fetch(`${SERVER}/api/globalMacro`)
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(data => {
        if (data.scorecardData?.length >= 8)                           setScorecardData(data.scorecardData);
        if (data.growthInflationData?.countries?.length >= 8)          setGrowthInflationData(data.growthInflationData);
        if (data.centralBankData?.current?.length >= 8)                setCentralBankData(data.centralBankData);
        if (data.debtData?.countries?.length >= 8)                     setDebtData(data.debtData);
        setIsLive(true);
        setLastUpdated(data.lastUpdated || new Date().toISOString().split('T')[0]);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  return { scorecardData, growthInflationData, centralBankData, debtData, isLive, lastUpdated, isLoading };
}
