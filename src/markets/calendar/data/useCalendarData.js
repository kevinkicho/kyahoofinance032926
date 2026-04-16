// src/markets/calendar/data/useCalendarData.js
import { useState, useEffect, useCallback } from 'react';
import { fetchWithRetry } from '../../../utils/fetchWithRetry';
import { useInterval } from '../../../hooks/useInterval';
import { useDataStatus } from '../../../hooks/useDataStatus';
import { economicEvents as mockEconomicEvents, centralBanks as mockCentralBanks, earningsSeason as mockEarningsSeason, keyReleases as mockKeyReleases } from './mockCalendarData';

const SERVER = '';

export function useCalendarData(autoRefresh = false, refreshKey = 0, { disabled = false } = {}) {
  const [economicEvents,    setEconomicEvents]    = useState(mockEconomicEvents);
  const [centralBanks,      setCentralBanks]      = useState(mockCentralBanks);
  const [earningsSeason,    setEarningsSeason]    = useState(mockEarningsSeason);
  const [keyReleases,       setKeyReleases]       = useState(mockKeyReleases);
  const [treasuryAuctions,  setTreasuryAuctions]  = useState([]);
  const [optionsExpiry,     setOptionsExpiry]     = useState([]);
  const [dividendCalendar,  setDividendCalendar]  = useState([]);

  // Status with error handling
  const { isLive, isLoading, error, lastUpdated, fetchedOn, isCurrent, fetchLog, handleSuccess, handleError, handleFinally, logFetch } = useDataStatus();

  const refetch = useCallback(() => {
    const t0 = Date.now();
    fetchWithRetry(`${SERVER}/api/calendar`)
      .then(r => r.json())
      .then(data => {
        let anyReplaced = false;
        if (data.economicEvents?.length >= 5)   { setEconomicEvents(data.economicEvents);   anyReplaced = true; }
        if (data.centralBanks?.length)     { setCentralBanks(data.centralBanks);       anyReplaced = true; }
        if (data.earningsSeason?.length)   { setEarningsSeason(data.earningsSeason);   anyReplaced = true; }
        if (data.keyReleases?.length)      { setKeyReleases(data.keyReleases);         anyReplaced = true; }
        if (data.treasuryAuctions?.length >= 1) { setTreasuryAuctions(data.treasuryAuctions); anyReplaced = true; }
        if (data.optionsExpiry?.length >= 1)    { setOptionsExpiry(data.optionsExpiry);     anyReplaced = true; }
        if (data.dividendCalendar?.length >= 1) { setDividendCalendar(data.dividendCalendar); anyReplaced = true; }
        if (anyReplaced) handleSuccess(data);
        logFetch({ url: '/api/calendar', status: 200, duration: Date.now() - t0, sources: { economicEvents: !!data.economicEvents?.length, centralBanks: !!data.centralBanks?.length, earningsSeason: !!data.earningsSeason?.length, keyReleases: !!data.keyReleases?.length }, seriesIds: [] });
      })
      .catch((err) => { handleError(err, 'Calendar'); logFetch({ url: '/api/calendar', status: 0, duration: Date.now() - t0, error: err?.message || 'Fetch failed' }); })
      .finally(() => handleFinally());
  }, [handleSuccess, handleError, handleFinally, logFetch]);

  useEffect(() => { if (!disabled) refetch(); }, [disabled]);
  useEffect(() => { if (refreshKey > 0 && !disabled) refetch(); }, [refreshKey, disabled]);

  useInterval(refetch, (!disabled && autoRefresh) ? 300000 : null);

  return {
    economicEvents, centralBanks, earningsSeason, keyReleases,
    treasuryAuctions, optionsExpiry, dividendCalendar,
    isLive, lastUpdated, isLoading, error, fetchedOn, isCurrent, fetchLog, refetch,
  };
}
