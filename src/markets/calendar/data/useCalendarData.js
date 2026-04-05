// src/markets/calendar/data/useCalendarData.js
import { useState, useEffect } from 'react';
import {
  economicEvents  as mockEconomicEvents,
  centralBanks    as mockCentralBanks,
  earningsSeason  as mockEarningsSeason,
  keyReleases     as mockKeyReleases,
} from './mockCalendarData';

const SERVER = '';

export function useCalendarData() {
  const [economicEvents,  setEconomicEvents]  = useState(mockEconomicEvents);
  const [centralBanks,    setCentralBanks]    = useState(mockCentralBanks);
  const [earningsSeason,  setEarningsSeason]  = useState(mockEarningsSeason);
  const [keyReleases,     setKeyReleases]     = useState(mockKeyReleases);
  const [isLive,          setIsLive]          = useState(false);
  const [lastUpdated,     setLastUpdated]     = useState('Mock data — Apr 2026');
  const [isLoading,       setIsLoading]       = useState(true);
  const [fetchedOn,       setFetchedOn]       = useState(null);
  const [isCurrent,       setIsCurrent]       = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);

    fetch(`${SERVER}/api/calendar`, { signal: controller.signal })
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(data => {
        let anyReplaced = false;
        if (data.economicEvents?.length >= 5) { setEconomicEvents(data.economicEvents); anyReplaced = true; }
        if (data.centralBanks?.length >= 3)   { setCentralBanks(data.centralBanks);     anyReplaced = true; }
        if (data.earningsSeason?.length >= 5)  { setEarningsSeason(data.earningsSeason); anyReplaced = true; }
        if (data.keyReleases?.length >= 3)    { setKeyReleases(data.keyReleases);       anyReplaced = true; }
        setIsLive(anyReplaced);
        if (anyReplaced) setLastUpdated(data.lastUpdated || new Date().toISOString().split('T')[0]);
        if (data.fetchedOn) setFetchedOn(data.fetchedOn);
        setIsCurrent(!!data.isCurrent);
      })
      .catch(() => {})
      .finally(() => { clearTimeout(timer); setIsLoading(false); });

    return () => { clearTimeout(timer); controller.abort(); };
  }, []);

  return { economicEvents, centralBanks, earningsSeason, keyReleases, isLive, lastUpdated, isLoading, fetchedOn, isCurrent };
}
