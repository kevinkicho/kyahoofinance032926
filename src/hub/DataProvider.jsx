import React, { useState, useCallback, useRef, useEffect } from 'react';
import DataContext from './DataContext';
import { useInterval } from '../hooks/useInterval';
import { loadFromRTDB, listSnapshotDates } from './lib/rtdb';
import { passesStructuralGuard, hasNonNullData, STRUCTURAL_GUARDS } from './lib/guards';
import { computeFreshnessReport } from './lib/freshness';
import { computeAlerts, getDisabledRuleIds } from './lib/alerts';
import { saveSnapshot, createInitialMarketState, FEDERATED_MARKETS } from './lib/snapshot';

export const MARKET_ENDPOINTS = {
  analytics:         '/api/rate-limits',
  equities:          '/api/equities',
  bonds:             '/api/bonds',
  fx:                '/api/fx',
  derivatives:       '/api/derivatives',
  realEstate:        '/api/realEstate',
  insurance:         '/api/insurance',
  commodities:       '/api/commoditiesEnhanced',
  globalMacro:       '/api/globalMacro',
  watchlist:            '/api/watchlist',
  equitiesDeepDive:    '/api/equityDeepDive',
  institutional:     '/api/institutional',
  crypto:            '/api/crypto',
  credit:            '/api/credit',
  sentiment:         '/api/sentiment',
  calendar:          '/api/calendar',
  imf:               '/api/imf',
  worldbank:         '/api/worldbank',
  bls:               '/api/bls',
  eia:               '/api/eia',
  census:             '/api/census',
  bea:               '/api/bea',
  eurostat:          '/api/eurostat',
  oecd:              '/api/oecd',
  edgar:             '/api/edgar',
  universeUpdates:   '/api/universeUpdates',
  nyfed:             '/api/nyfed',
  fdic:              '/api/fdic',
  ecb:               '/api/ecb',
  treasuryTIC:       '/api/treasuryTIC',
  treasuryAuctions:  '/api/treasuryAuctions',
  treasuryDTS:       '/api/treasuryDTS',
  treasuryCost:      '/api/treasuryCost',
  fedSEP:              '/api/fed/sep',
  fedGDPNow:           '/api/fed/gdpnow',
  fedInflationNowcast: '/api/fed/inflation-nowcast',
  fedNewsSentiment:    '/api/fed/news-sentiment',
  msrb:                '/api/msrb',
  fema:                '/api/fema',
  usgs:                '/api/usgs',
  edgarInsurerRatios:  '/api/edgar/insurer-ratios',
  edgarFilingActivity: '/api/edgar/filing-activity',
  usda:                '/api/usda',
  censusTrade:         '/api/censusTrade',
  eiaPetroleum:        '/api/eiaPetroleum',
  cftcTFF:             '/api/cftcTFF',
  bisOTC:              '/api/bisOTC',
  fao:                 '/api/fao',
};

export const ALL_FETCH_IDS = Object.keys(MARKET_ENDPOINTS);

// Re-export extracted helpers to maintain backward compatibility with test suites
export { computeFreshnessReport } from './lib/freshness';
export { computeAlerts } from './lib/alerts';
export { passesStructuralGuard, STRUCTURAL_GUARDS, hasNonNullData } from './lib/guards';

const dlog = import.meta.env.DEV ? console.log.bind(console) : () => {};

function tsNow() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function maybeComputeFederated(prev, next) {
  for (const [fedId, config] of Object.entries(FEDERATED_MARKETS)) {
    const ready = config.endpoints.filter(ep => next[ep]?.data);
    const missing = config.endpoints.filter(ep => !next[ep]?.data);
    if (ready.length === 0) {
      dlog(`[DataProvider] ⏳ Federated "${fedId}" waiting for any of: [${missing.join(', ')}]`);
      continue;
    }
    const alertResult = computeAlerts(next, getDisabledRuleIds());
    const triggered = alertResult.alerts.length;
    const allReady = missing.length === 0;
    if (allReady) dlog(`[DataProvider] ✓ Federated "${fedId}" complete — ${triggered} alert(s) triggered`);
    else dlog(`[DataProvider] ◐ Federated "${fedId}" partial (${ready.length}/${config.endpoints.length}) — ${triggered} alert(s); still waiting on: [${missing.join(', ')}]`);
    let latestFetchedOn = null;
    for (const ep of config.endpoints) {
      const mkt = next[ep];
      if (mkt?.fetchedOn) {
        if (!latestFetchedOn || mkt.fetchedOn > latestFetchedOn) latestFetchedOn = mkt.fetchedOn;
      }
    }
    next[fedId] = {
      ...prev[fedId],
      data: { ...alertResult, _partial: !allReady, _missing: missing },
      isLoading: false,
      isLive: true,
      fetchedOn: latestFetchedOn,
      lastUpdated: tsNow(),
      fetchLog: [{ time: tsNow(), url: `federated:${fedId}`, status: 200, duration: 0, partial: !allReady, missing }, ...(prev[fedId]?.fetchLog || [])].slice(0, 20),
    };
  }
  return next;
}

export function DataProvider({ children, autoRefresh = false, refreshKey = 0 }) {
  const [markets, setMarkets] = useState(createInitialMarketState);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [historicalDate, setHistoricalDate] = useState(null);
  const mountedRef = useRef(true);
  const fetchingRef = useRef(false);
  const pendingFetchRef = useRef(null);
  const fetchGenerationRef = useRef(0);
  const marketsRef = useRef(markets);
  const historicalDateRef = useRef(historicalDate);

  useEffect(() => { marketsRef.current = markets; }, [markets]);
  useEffect(() => { historicalDateRef.current = historicalDate; }, [historicalDate]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchAllMarkets = useCallback(async () => {
    if (fetchingRef.current) {
      pendingFetchRef.current = true;
      dlog('[DataProvider] Fetch already in progress — queueing follow-up');
      return;
    }
    fetchingRef.current = true;

    const completeFetch = () => {
      fetchingRef.current = false;
      const pending = pendingFetchRef.current;
      pendingFetchRef.current = null;
      if (pending) {
        setTimeout(() => fetchAllMarkets(), 0);
      }
    };

    const ids = ALL_FETCH_IDS;
    const effectiveDate = historicalDateRef.current;
    const fetchGeneration = fetchGenerationRef.current;

    setGlobalLoading(true);

    const rtdbSeeds = await Promise.all(
      ids.map(async (id) => {
        const seed = await loadFromRTDB(id, effectiveDate);
        return seed ? { id, seed } : null;
      })
    );

    if (fetchGeneration !== fetchGenerationRef.current || effectiveDate !== historicalDateRef.current) {
      dlog('[DataProvider] Discarding stale fetch wave before applying RTDB seeds.');
      completeFetch();
      setGlobalLoading(false);
      return;
    }

    const seededIds = new Set(
      rtdbSeeds.filter(Boolean).filter(s => {
        if (!hasNonNullData(s.seed.data, s.id)) return false;
        return passesStructuralGuard(s.id, s.seed.data);
      }).map(s => s.id)
    );

    setMarkets(prev => {
      const next = { ...prev };
      for (const item of rtdbSeeds) {
        if (item && MARKET_ENDPOINTS[item.id] && seededIds.has(item.id)) {
          const { seed } = item;
          const seedLog = {
            time: seed.fetchedAt || tsNow(),
            url: MARKET_ENDPOINTS[item.id] ? `${MARKET_ENDPOINTS[item.id]} (RTDB Snapshot)` : 'RTDB Snapshot',
            status: 200,
            duration: 0,
            requestId: 'RTDB',
            sources: seed.data?._sources || null
          };
          next[item.id] = {
            ...next[item.id],
            data: seed.data || next[item.id]?.data,
            lastUpdated: seed.fetchedAt || next[item.id]?.lastUpdated,
            fetchedOn: seed.fetchedAt || next[item.id]?.fetchedOn,
            isLive: seed.isLive ?? next[item.id]?.isLive,
            isCurrent: !effectiveDate,
            isHistorical: !!effectiveDate,
            asOfDate: effectiveDate || null,
            isLoading: false,
            error: null,
            fetchLog: [seedLog, ...(next[item.id]?.fetchLog || [])].slice(0, 20),
          };
        }
      }
      for (const id of ids) {
        if (MARKET_ENDPOINTS[id] && !seededIds.has(id)) {
          next[id] = {
            ...next[id],
            data: null,
            isLoading: false,
            error: next[id]?.error || 'No RTDB snapshot available',
          };
        }
      }
      return maybeComputeFederated(prev, next);
    });

    dlog(`[DataProvider] ✅ RTDB seed complete — ${seededIds.size}/${ids.length} markets loaded`);
    completeFetch();
    setGlobalLoading(false);
  }, []);

  const applySnapshotMode = useCallback(async (date = null) => {
    const ids = ALL_FETCH_IDS;
    const modeGeneration = fetchGenerationRef.current;
    setGlobalLoading(true);

    const rtdbSeeds = await Promise.all(
      ids.map(async (id) => {
        const seed = await loadFromRTDB(id, date);
        return seed ? { id, seed } : null;
      })
    );

    if (modeGeneration !== fetchGenerationRef.current || date !== historicalDateRef.current) return;

    const seededIds = new Set(
      rtdbSeeds.filter(Boolean).filter(s => {
        if (!hasNonNullData(s.seed.data, s.id)) return false;
        return passesStructuralGuard(s.id, s.seed.data);
      }).map(s => s.id)
    );

    setMarkets(prev => {
      const next = { ...prev };
      for (const id of ids) {
        if (!next[id]) continue;
        const item = rtdbSeeds.find(s => s?.id === id);
        const hasSeed = item && seededIds.has(id);
        if (hasSeed) {
          const { seed } = item;
          const fetchedAt = seed.fetchedAt || seed.data?.fetchedOn || seed.data?.lastUpdated || tsNow();
          next[id] = {
            ...next[id],
            data: seed.data,
            isLoading: false,
            isLive: !date,
            isCurrent: !date,
            isHistorical: !!date,
            asOfDate: date || null,
            lastUpdated: fetchedAt,
            fetchedOn: fetchedAt,
            error: null,
            fetchLog: [{
              time: fetchedAt,
              url: `${MARKET_ENDPOINTS[id]} (RTDB Snapshot)`,
              status: 200,
              duration: 0,
              requestId: 'RTDB',
              sources: seed.data?._sources || null,
            }, ...(next[id]?.fetchLog || [])].slice(0, 20),
          };
        } else if (date) {
          next[id] = {
            ...next[id],
            data: null,
            isLoading: false,
            isLive: false,
            isCurrent: false,
            isHistorical: true,
            asOfDate: date,
            lastUpdated: null,
            fetchedOn: null,
            error: `No historical snapshot for ${date}`,
          };
        } else {
          next[id] = { ...next[id], isLoading: false, isHistorical: false, asOfDate: null };
        }
      }
      return next;
    });

    setGlobalLoading(false);
  }, []);

  const refetchAll = useCallback(() => { fetchAllMarkets(); }, [fetchAllMarkets]);
  const refetchLatestSnapshots = useCallback(() => { fetchAllMarkets(); }, [fetchAllMarkets]);

  const refetchSingle = useCallback(async (marketId) => {
    if (FEDERATED_MARKETS[marketId]) {
      const config = FEDERATED_MARKETS[marketId];
      const combined = {};
      let latestFetchedOn = null;
      for (const ep of config.endpoints) {
        const mkt = marketsRef.current[ep];
        if (mkt?.data) {
          combined[ep] = mkt.data;
          if (mkt.fetchedOn && (!latestFetchedOn || mkt.fetchedOn > latestFetchedOn)) latestFetchedOn = mkt.fetchedOn;
        }
      }
      if (Object.keys(combined).length === 0) return;
      if (marketId === 'alerts') {
        const alertResult = computeAlerts(marketsRef.current, getDisabledRuleIds());
        setMarkets(prev => ({
          ...prev,
          [marketId]: { ...prev[marketId], data: alertResult, isLoading: false, isLive: true, lastUpdated: tsNow(), fetchedOn: latestFetchedOn, fetchLog: [{ time: tsNow(), url: 'federated:alerts', status: 200, duration: 0 }, ...(prev[marketId]?.fetchLog || [])].slice(0, 20) },
        }));
      }
      return;
    }

    setMarkets(prev => {
      const next = { ...prev };
      next[marketId] = { ...next[marketId], isLoading: true };
      return next;
    });

    const seed = await loadFromRTDB(marketId, historicalDateRef.current);
    setMarkets(prev => {
      const next = { ...prev };
      if (seed && hasNonNullData(seed.data, marketId) && passesStructuralGuard(marketId, seed.data)) {
        const fetchedAt = seed.fetchedAt || tsNow();
        next[marketId] = {
          ...next[marketId],
          data: seed.data,
          isLoading: false,
          isLive: seed.isLive,
          isCurrent: !historicalDateRef.current,
          lastUpdated: fetchedAt,
          fetchedOn: fetchedAt,
          error: null,
          fetchLog: [{
            time: fetchedAt,
            url: `${MARKET_ENDPOINTS[marketId]} (RTDB Snapshot)`,
            status: 200,
            duration: 0,
            requestId: 'RTDB',
            sources: seed.data?._sources || null,
          }, ...(next[marketId]?.fetchLog || [])].slice(0, 20),
        };
      } else {
        next[marketId] = {
          ...next[marketId],
          isLoading: false,
          error: 'No RTDB snapshot available',
        };
      }
      return maybeComputeFederated(prev, next);
    });
  }, []);

  const didInitialFetchRef = useRef(false);
  const didObserveHistoricalDateRef = useRef(false);
  useEffect(() => {
    if (didInitialFetchRef.current) return;
    didInitialFetchRef.current = true;
    fetchAllMarkets();
  }, [fetchAllMarkets]);

  useEffect(() => {
    if (!didObserveHistoricalDateRef.current) {
      didObserveHistoricalDateRef.current = true;
      return;
    }
    fetchGenerationRef.current += 1;
    pendingFetchRef.current = null;
    if (historicalDate) {
      applySnapshotMode(historicalDate);
    } else {
      applySnapshotMode(null);
      fetchAllMarkets();
    }
  }, [historicalDate, fetchAllMarkets, applySnapshotMode]);

  useEffect(() => {
    if (refreshKey > 0) fetchAllMarkets();
  }, [refreshKey, fetchAllMarkets]);
  useInterval(refetchAll, autoRefresh ? 300000 : null);

  const saveTimerRef = useRef(null);
  useEffect(() => {
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveSnapshot(markets), 500);
    return () => clearTimeout(saveTimerRef.current);
  }, [markets]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      try {
        const slim = {};
        let entryCount = 0;
        for (const [id, m] of Object.entries(marketsRef.current)) {
          if (m?.data && entryCount < 50) {
            slim[id] = {
              data: m.data,
              lastUpdated: m.lastUpdated,
              fetchedOn: m.fetchedOn,
              isLive: m.isLive,
              isCurrent: m.isCurrent,
              provenance: m.provenance,
            };
            entryCount++;
          }
        }
        localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(slim));
      } catch {}
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const marketWrappersRef = useRef({});
  const getMarket = useCallback((marketId) => {
    const m = markets[marketId];
    const prevWrapper = marketWrappersRef.current[marketId];
    if (
      prevWrapper &&
      prevWrapper._rawMarket === m &&
      prevWrapper._historicalDate === historicalDate
    ) {
      return prevWrapper;
    }

    const base = !m
      ? { data: null, isLoading: false, isLive: false, lastUpdated: null, fetchedOn: null, isCurrent: false, isHistorical: !!historicalDate, asOfDate: historicalDate, error: null, fetchLog: [], refetch: (params) => refetchSingle(marketId, params), provenance: {} }
      : { ...m, refetch: (params) => refetchSingle(marketId, params) };
    if (historicalDate) {
      base.isHistorical = base.isHistorical ?? true;
      base.asOfDate = base.asOfDate || historicalDate;
    } else {
      base.isHistorical = base.isHistorical ?? false;
      base.asOfDate = base.asOfDate || null;
    }

    base._rawMarket = m;
    base._historicalDate = historicalDate;
    marketWrappersRef.current[marketId] = base;
    return base;
  }, [markets, refetchSingle, historicalDate]);

  const loadHistorical = useCallback(async (date) => {
    if (!date) return null;
    const histSeeds = await Promise.all(
      ALL_FETCH_IDS.map(async (id) => {
        const seed = await loadFromRTDB(id, date);
        return seed ? { id, seed } : null;
      })
    );
    const hist = {};
    for (const item of histSeeds) {
      if (item) hist[item.id] = item.seed;
    }
    return hist;
  }, []);

  const auditFreshness = useCallback(() => computeFreshnessReport(markets, new Date()), [markets]);

  const value = React.useMemo(() => ({ 
    markets, 
    globalLoading, 
    getMarket, 
    refetchAll, 
    refetchLatestSnapshots,
    refetchSingle, 
    auditFreshness, 
    loadHistorical, 
    listSnapshotDates,
    historicalDate,
    setHistoricalDate,
    isHistorical: !!historicalDate,
    asOfDate: historicalDate
  }), [markets, globalLoading, getMarket, refetchAll, refetchLatestSnapshots, refetchSingle, auditFreshness, loadHistorical, listSnapshotDates, historicalDate, setHistoricalDate]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
