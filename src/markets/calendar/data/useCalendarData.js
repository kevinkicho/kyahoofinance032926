// src/markets/calendar/data/useCalendarData.js
import { useState, useEffect } from 'react';
import { fetchWithRetry } from '../../../utils/fetchWithRetry';
import {
  economicEvents  as mockEconomicEvents,
  centralBanks    as mockCentralBanks,
  earningsSeason  as mockEarningsSeason,
  keyReleases     as mockKeyReleases,
} from './mockCalendarData';

const SERVER = '';

export function useCalendarData() {
  const [economicEvents,    setEconomicEvents]    = useState(mockEconomicEvents);
  const [centralBanks,      setCentralBanks]      = useState(mockCentralBanks);
  const [earningsSeason,    setEarningsSeason]    = useState(mockEarningsSeason);
  const [keyReleases,       setKeyReleases]       = useState(mockKeyReleases);
  const [treasuryAuctions,  setTreasuryAuctions]  = useState([]);
  const [optionsExpiry,     setOptionsExpiry]     = useState([]);
  const [dividendCalendar,  setDividendCalendar]  = useState([]);
  const [isLive,            setIsLive]            = useState(false);
  const [lastUpdated,       setLastUpdated]       = useState('Mock data — Apr 2026');
  const [isLoading,         setIsLoading]         = useState(true);
  const [fetchedOn,         setFetchedOn]         = useState(null);
  const [isCurrent,         setIsCurrent]         = useState(false);

  useEffect(() => {
    fetchWithRetry(`${SERVER}/api/calendar`)
      .then(r => r.json())
      .then(data => {
        let anyReplaced = false;
        if (data.economicEvents?.length >= 5)   { setEconomicEvents(data.economicEvents);   anyReplaced = true; }
        if (data.centralBanks?.length >= 3)     { setCentralBanks(data.centralBanks);       anyReplaced = true; }
        if (data.earningsSeason?.length >= 5)   { setEarningsSeason(data.earningsSeason);   anyReplaced = true; }
        if (data.keyReleases?.length >= 3)      { setKeyReleases(data.keyReleases);         anyReplaced = true; }
        if (data.treasuryAuctions?.length >= 1) { setTreasuryAuctions(data.treasuryAuctions); anyReplaced = true; }
        if (data.optionsExpiry?.length >= 1)    { setOptionsExpiry(data.optionsExpiry);     anyReplaced = true; }
        if (data.dividendCalendar?.length >= 1) { setDividendCalendar(data.dividendCalendar); anyReplaced = true; }
        setIsLive(anyReplaced);
        if (anyReplaced) setLastUpdated(data.lastUpdated || new Date().toISOString().split('T')[0]);
        if (data.fetchedOn) setFetchedOn(data.fetchedOn);
        setIsCurrent(!!data.isCurrent);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  return {
    economicEvents, centralBanks, earningsSeason, keyReleases,
    treasuryAuctions, optionsExpiry, dividendCalendar,
    isLive, lastUpdated, isLoading, fetchedOn, isCurrent,
  };
}
