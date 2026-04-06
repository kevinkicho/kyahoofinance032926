// src/markets/credit/data/useCreditData.js
import { useState, useEffect } from 'react';
import { fetchWithRetry } from '../../../utils/fetchWithRetry';
import {
  spreadData   as mockSpreadData,
  emBondData   as mockEmBondData,
  loanData     as mockLoanData,
  defaultData  as mockDefaultData,
} from './mockCreditData';

const SERVER = '';

export function useCreditData() {
  const [spreadData,       setSpreadData]       = useState(mockSpreadData);
  const [emBondData,       setEmBondData]       = useState(mockEmBondData);
  const [loanData,         setLoanData]         = useState(mockLoanData);
  const [defaultData,      setDefaultData]      = useState(mockDefaultData);
  const [delinquencyRates, setDelinquencyRates] = useState(null);
  const [lendingStandards, setLendingStandards] = useState(null);
  const [commercialPaper,  setCommercialPaper]  = useState(null);
  const [excessReserves,   setExcessReserves]   = useState(null);
  const [isLive,           setIsLive]           = useState(false);
  const [lastUpdated,      setLastUpdated]      = useState('Mock data — 2026');
  const [isLoading,        setIsLoading]        = useState(true);
  const [fetchedOn,        setFetchedOn]        = useState(null);
  const [isCurrent,        setIsCurrent]        = useState(false);

  useEffect(() => {
    fetchWithRetry(`${SERVER}/api/credit`)
      .then(r => r.json())
      .then(data => {
        let anyReplaced = false;
        if (data.spreadData?.history?.dates?.length >= 6)       { setSpreadData(data.spreadData);             anyReplaced = true; }
        if (data.emBondData?.countries?.length >= 5)            { setEmBondData(data.emBondData);             anyReplaced = true; }
        if (data.loanData?.cloTranches?.length >= 4)            { setLoanData(data.loanData);                 anyReplaced = true; }
        if (data.defaultData?.rates?.length >= 3)               { setDefaultData(data.defaultData);           anyReplaced = true; }
        if (data.delinquencyRates?.dates?.length >= 4)          { setDelinquencyRates(data.delinquencyRates); anyReplaced = true; }
        if (data.lendingStandards?.dates?.length >= 4)          { setLendingStandards(data.lendingStandards); anyReplaced = true; }
        if (data.commercialPaper?.financial3m != null)          { setCommercialPaper(data.commercialPaper);   anyReplaced = true; }
        if (data.excessReserves?.dates?.length >= 6)            { setExcessReserves(data.excessReserves);     anyReplaced = true; }
        setIsLive(anyReplaced);
        if (anyReplaced) setLastUpdated(data.lastUpdated || new Date().toISOString().split('T')[0]);
        if (data.fetchedOn) setFetchedOn(data.fetchedOn);
        setIsCurrent(!!data.isCurrent);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  return { spreadData, emBondData, loanData, defaultData, delinquencyRates, lendingStandards, commercialPaper, excessReserves, isLive, lastUpdated, isLoading, fetchedOn, isCurrent };
}
