// src/markets/credit/data/useCreditData.js
import { useState, useEffect, useCallback } from 'react';
import { fetchWithRetry } from '../../../utils/fetchWithRetry';
import { useInterval } from '../../../hooks/useInterval';
import { useDataStatus } from '../../../hooks/useDataStatus';
const SERVER = '';

export function useCreditData(autoRefresh = false, refreshKey = 0) {
  const [spreadData,       setSpreadData]       = useState(null);
  const [emBondData,       setEmBondData]       = useState(null);
  const [loanData,         setLoanData]         = useState(null);
  const [defaultData,      setDefaultData]      = useState(null);
  const [delinquencyRates, setDelinquencyRates] = useState(null);
  const [lendingStandards, setLendingStandards] = useState(null);
  const [commercialPaper,  setCommercialPaper]  = useState(null);
  const [excessReserves,   setExcessReserves]   = useState(null);

  const { isLive, isLoading, error, lastUpdated, fetchedOn, isCurrent, fetchLog, logFetch, handleSuccess, handleError, handleFinally } = useDataStatus();

  const refetch = useCallback(() => {
    const t0 = Date.now();
    fetchWithRetry(`${SERVER}/api/credit`)
      .then(r => r.json())
      .then(data => {
        let anyReplaced = false;
        if (data.spreadData?.history?.dates?.length)       { setSpreadData(data.spreadData);             anyReplaced = true; }
        if (data.emBondData?.countries?.length)            { setEmBondData(data.emBondData);             anyReplaced = true; }
        if (data.loanData?.cloTranches?.length)            { setLoanData(data.loanData);                 anyReplaced = true; }
        if (data.defaultData?.rates?.length)               { setDefaultData(data.defaultData);           anyReplaced = true; }
        if (data.delinquencyRates?.dates?.length)          { setDelinquencyRates(data.delinquencyRates); anyReplaced = true; }
        if (data.lendingStandards?.dates?.length)          { setLendingStandards(data.lendingStandards); anyReplaced = true; }
        if (data.commercialPaper?.financial3m != null)          { setCommercialPaper(data.commercialPaper);   anyReplaced = true; }
        if (data.excessReserves?.dates?.length)            { setExcessReserves(data.excessReserves);     anyReplaced = true; }
        if (anyReplaced) handleSuccess(data);
        logFetch({ url: '/api/credit', status: 200, duration: Date.now() - t0, sources: { spreadData: true, emBondData: true, loanData: true, defaultData: true, delinquencyRates: true, lendingStandards: true, commercialPaper: true, excessReserves: true }, seriesIds: ['BAMLH0A0HYM2', 'BAMLC0A0CM', 'BAMLC0A4CBB', 'BAMLEMCBPIOAS', 'CPN3M', 'DRSFRWBS'] });
      })
      .catch((err) => {
        handleError(err, 'Credit');
        logFetch({ url: '/api/credit', status: 0, duration: Date.now() - t0, error: err?.message || 'Fetch failed', sources: null });
      })
      .finally(() => handleFinally());
  }, [handleSuccess, handleError, handleFinally, logFetch]);

  useEffect(() => { refetch(); }, []);
  useEffect(() => { if (refreshKey > 0) refetch(); }, [refreshKey]);

  useInterval(refetch, autoRefresh ? 300000 : null);

  return { spreadData, emBondData, loanData, defaultData, delinquencyRates, lendingStandards, commercialPaper, excessReserves, isLive, lastUpdated, isLoading, error, fetchedOn, isCurrent, fetchLog, refetch };
}
