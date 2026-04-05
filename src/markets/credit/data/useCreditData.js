// src/markets/credit/data/useCreditData.js
import { useState, useEffect } from 'react';
import {
  spreadData   as mockSpreadData,
  emBondData   as mockEmBondData,
  loanData     as mockLoanData,
  defaultData  as mockDefaultData,
} from './mockCreditData';

const SERVER = '';

export function useCreditData() {
  const [spreadData,  setSpreadData]  = useState(mockSpreadData);
  const [emBondData,  setEmBondData]  = useState(mockEmBondData);
  const [loanData,    setLoanData]    = useState(mockLoanData);
  const [defaultData, setDefaultData] = useState(mockDefaultData);
  const [isLive,      setIsLive]      = useState(false);
  const [lastUpdated, setLastUpdated] = useState('Mock data — 2026');
  const [isLoading,   setIsLoading]   = useState(true);
  const [fetchedOn,   setFetchedOn]   = useState(null);
  const [isCurrent,   setIsCurrent]   = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);

    fetch(`${SERVER}/api/credit`, { signal: controller.signal })
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(data => {
        let anyReplaced = false;
        if (data.spreadData?.history?.dates?.length >= 6)  { setSpreadData(data.spreadData);   anyReplaced = true; }
        if (data.emBondData?.countries?.length >= 5)        { setEmBondData(data.emBondData);   anyReplaced = true; }
        if (data.loanData?.cloTranches?.length >= 4)        { setLoanData(data.loanData);       anyReplaced = true; }
        if (data.defaultData?.rates?.length >= 3)           { setDefaultData(data.defaultData); anyReplaced = true; }
        setIsLive(anyReplaced);
        if (anyReplaced) setLastUpdated(data.lastUpdated || new Date().toISOString().split('T')[0]);
        if (data.fetchedOn) setFetchedOn(data.fetchedOn);
        setIsCurrent(!!data.isCurrent);
      })
      .catch(() => {})
      .finally(() => { clearTimeout(timer); setIsLoading(false); });

    return () => { clearTimeout(timer); controller.abort(); };
  }, []);

  return { spreadData, emBondData, loanData, defaultData, isLive, lastUpdated, isLoading, fetchedOn, isCurrent };
}
