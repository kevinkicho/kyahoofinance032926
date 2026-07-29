import React, { useState, useEffect, useRef } from 'react';
import MarketSkeleton from '../../hub/MarketSkeleton';
import FXDashboard from './components/FXDashboard';
// Static exchange-rate tables intentionally removed — empty live data must
// show "—" placeholders, never fabricated FX levels.

/**
 * Optional live FX overlay via WebSocket.
 * REST /api/fx (DataProvider) is the source of truth; WS is a best-effort
 * refresh. On App Hosting / some proxies, wss upgrade fails — do not spam
 * reconnects or log red network errors forever.
 */
function useFxWebSocket() {
  const [wsRates, setWsRates] = useState(null);
  const wsRef = useRef(null);
  const aliveRef = useRef(true);
  const attemptsRef = useRef(0);
  const timerRef = useRef(null);

  useEffect(() => {
    // Explicit opt-out (build flag) or browsers without WebSocket
    if (import.meta.env.VITE_DISABLE_FX_WS === 'true') return undefined;
    if (typeof WebSocket === 'undefined') return undefined;

    // Firebase App Hosting / Cloud Run edge often drops WS upgrades for /ws/*.
    // REST /api/fx already feeds panels — skip the connection entirely in prod hosts.
    const host = typeof window !== 'undefined' ? (window.location.hostname || '') : '';
    const isHostedEdge = /\.hosted\.app$|\.run\.app$|\.web\.app$|\.firebaseapp\.com$/i.test(host);
    if (isHostedEdge && import.meta.env.VITE_ENABLE_FX_WS !== 'true') {
      return undefined;
    }

    aliveRef.current = true;
    attemptsRef.current = 0;

    const MAX_ATTEMPTS = 2;
    const BASE_MS = 2500;
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${proto}//${window.location.host}/ws/fx`;

    function scheduleReconnect() {
      if (!aliveRef.current) return;
      if (attemptsRef.current >= MAX_ATTEMPTS) {
        // REST path already powers panels; stay quiet after cap.
        if (import.meta.env.DEV) {
          console.info('[FX] WebSocket unavailable after retries — using /api/fx only');
        }
        return;
      }
      const delay = Math.min(30_000, BASE_MS * 2 ** Math.max(0, attemptsRef.current - 1));
      timerRef.current = setTimeout(connect, delay);
    }

    function connect() {
      if (!aliveRef.current) return;
      attemptsRef.current += 1;
      let ws;
      try {
        ws = new WebSocket(url);
      } catch {
        scheduleReconnect();
        return;
      }
      wsRef.current = ws;

      ws.onopen = () => {
        // Successful open: allow future reconnects if the socket drops later.
        attemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'fx-rates' && msg.rates) {
            setWsRates(msg.rates);
          }
        } catch {
          /* ignore malformed frames */
        }
      };

      ws.onerror = () => {
        // Browser already logs the failed upgrade; avoid extra noise.
        try { ws.close(); } catch { /* ignore */ }
      };

      ws.onclose = () => {
        if (wsRef.current === ws) wsRef.current = null;
        scheduleReconnect();
      };
    }

    connect();

    return () => {
      aliveRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      try { wsRef.current?.close(); } catch { /* ignore */ }
      wsRef.current = null;
    };
  }, []);

  return wsRates;
}

function getFXProps(centralData) {
  const d = centralData.data || {};
  const liveSpotRates = d.spotRates || d.frankfurterLatest || null;
  const livePrevRates = d.prevRates || d.frankfurterPrev || null;
  // Never invent FX levels. When the API is down, panels render empty states.
  const isUsingFallbackRates = false;
  const spotRates = liveSpotRates || {};
  const prevRates = livePrevRates || {};
  // Prefer server-computed 1d changes; otherwise derive from spot vs prev.
  const changes = d.changes1d && typeof d.changes1d === 'object'
    ? d.changes1d
    : Object.keys(spotRates).reduce((acc, code) => {
      if (code === 'USD') { acc[code] = 0; return acc; }
      const prev = prevRates[code];
      if (prev && spotRates[code]) acc[code] = -((spotRates[code] - prev) / prev * 100);
      return acc;
    }, {});

  // The Frankfurter API returns history as { "2026-05-22": { CAD: 1.39, ... }, ... }
  // keyed by date. The CurrencyCorrelationMatrix component expects history keyed by
  // currency code with array values: { EUR: [rate1, rate2, ...], GBP: [...], ... }.
  // Transform the date→currency structure into currency→array so the correlation
  // panel can compute 30-day correlations correctly.
  const rawHistory = d.history || {};
  let history = rawHistory;
  if (rawHistory && typeof rawHistory === 'object' && !Array.isArray(rawHistory)) {
    const sampleKey = Object.keys(rawHistory)[0];
    const sampleVal = sampleKey ? rawHistory[sampleKey] : null;
    // Detect date-keyed structure: keys look like dates and values are currency→rate objects
    const isDateKeyed = sampleKey && /^\d{4}-\d{2}-\d{2}$/.test(sampleKey)
      && sampleVal && typeof sampleVal === 'object' && !Array.isArray(sampleVal);
    if (isDateKeyed) {
      const sortedDates = Object.keys(rawHistory).sort();
      const currencySet = new Set();
      for (const dt of sortedDates) {
        if (rawHistory[dt] && typeof rawHistory[dt] === 'object') {
          Object.keys(rawHistory[dt]).forEach(c => currencySet.add(c));
        }
      }
      history = {};
      for (const ccy of currencySet) {
        history[ccy] = sortedDates.map(dt => rawHistory[dt]?.[ccy] ?? null).filter(v => v != null);
      }
    }
  }

  return {
    spotRates,
    prevRates,
    changes,
    changes1w: d.changes1w || {},
    changes1m: d.changes1m || {},
    sparklines: d.sparklines || {},
    history,
    fredFxRates: d.fredFxRates,
    reer: d.reer,
    rateDifferentials: d.rateDifferentials,
    dxyHistory: d.dxyHistory,
    cotData: d.cotData || {},
    cotHistory: d.cotHistory,
    isLive: centralData.isLive,
    isUsingFallbackRates,
    lastUpdated: centralData.lastUpdated,
    isLoading: centralData.isLoading,
    fetchedOn: centralData.fetchedOn,
    isCurrent: centralData.isCurrent,
    isHistorical: centralData.isHistorical,
    asOfDate: centralData.asOfDate,
    error: centralData.error,
    fetchLog: centralData.fetchLog || [],
    refetch: centralData.refetch,
  };
}

function FXMarket({ centralData } = {}) {
  const wsRates = useFxWebSocket();

  if (!centralData) return <MarketSkeleton />;
  const props = getFXProps(centralData);

  
  const mergedSpotRates = wsRates ? { ...props.spotRates, ...wsRates } : props.spotRates;

  return (
    <div className="fx-market" role="region" aria-label="FX">
      <div className="fx-market-main">
        <FXDashboard
          spotRates={mergedSpotRates}
          prevRates={props.prevRates}
          changes={props.changes}
          changes1w={props.changes1w}
          changes1m={props.changes1m}
          sparklines={props.sparklines}
          history={props.history}
          fredFxRates={props.fredFxRates}
          reer={props.reer}
          rateDifferentials={props.rateDifferentials}
          dxyHistory={props.dxyHistory}
          cotData={props.cotData}
          cotHistory={props.cotHistory}
          isLive={props.isLive}
          isUsingFallbackRates={props.isUsingFallbackRates}
          lastUpdated={props.lastUpdated}
          fetchLog={props.fetchLog}
          error={props.error} fetchedOn={props.fetchedOn} isCurrent={props.isCurrent}
          isHistorical={props.isHistorical} asOfDate={props.asOfDate}
        />
      </div>
    </div>
  );
}

export default React.memo(FXMarket);
