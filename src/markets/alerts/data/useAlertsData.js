// src/markets/alerts/data/useAlertsData.js
import { useState, useEffect, useCallback } from 'react';
import { fetchWithRetry } from '../../../utils/fetchWithRetry';
import { useDataStatus } from '../../../hooks/useDataStatus';

const SERVER = '';

const ALERT_RULES = [
  {
    id: 'vix-spike',
    label: 'VIX Spike',
    severity: 'high',
    market: 'derivatives',
    description: 'Triggers when VIX exceeds 25, indicating elevated volatility',
    check: (data) => {
      const vixSignal = data.sentiment?.riskData?.signals?.find(s => s.name === 'VIX');
      const vixVal = vixSignal?.value;
      if (vixVal != null && vixVal > 25) return { triggered: true, value: vixVal, message: `VIX at ${vixVal.toFixed(1)} — elevated volatility` };
      return { triggered: false };
    },
  },
  {
    id: 'curve-inversion',
    label: 'Yield Curve Inversion',
    severity: 'high',
    market: 'bonds',
    description: 'Triggers when 10Y yield falls below 2Y yield (inverted curve)',
    check: (data) => {
      const ycd = data.bonds?.yieldCurveData;
      if (!ycd) return { triggered: false };
      const us = ycd.US || ycd.us;
      if (!us) return { triggered: false };
      const t10 = us['10y'] ?? us['10Y'];
      const t2 = us['2y'] ?? us['2Y'];
      if (t10 != null && t2 != null && t10 < t2) return { triggered: true, value: (t10 - t2).toFixed(2), message: `10Y-2Y spread at ${(t10 - t2).toFixed(2)}% — inverted` };
      return { triggered: false };
    },
  },
  {
    id: 'hy-spread-wide',
    label: 'HY Spread Widening',
    severity: 'medium',
    market: 'credit',
    description: 'Triggers when High Yield OAS exceeds 400bps, signaling credit stress',
    check: (data) => {
      const hy = data.credit?.spreadData?.current?.hySpread;
      if (hy != null && hy > 400) return { triggered: true, value: Math.round(hy), message: `HY OAS at ${Math.round(hy)}bps — stress level` };
      return { triggered: false };
    },
  },
  {
    id: 'fear-extreme',
    label: 'Extreme Fear',
    severity: 'high',
    market: 'sentiment',
    description: 'Triggers when Fear & Greed composite drops below 25',
    check: (data) => {
      const fg = data.sentiment?.fearGreedData?.score ?? data.sentiment?.fearGreedData?.value;
      if (fg != null && fg < 25) return { triggered: true, value: fg, message: `Fear & Greed at ${fg} — extreme fear` };
      return { triggered: false };
    },
  },
  {
    id: 'greed-extreme',
    label: 'Extreme Greed',
    severity: 'medium',
    market: 'sentiment',
    description: 'Triggers when Fear & Greed composite exceeds 75',
    check: (data) => {
      const fg = data.sentiment?.fearGreedData?.score ?? data.sentiment?.fearGreedData?.value;
      if (fg != null && fg > 75) return { triggered: true, value: fg, message: `Fear & Greed at ${fg} — extreme greed` };
      return { triggered: false };
    },
  },
  {
    id: 'btc-crash',
    label: 'BTC Large Move',
    severity: 'medium',
    market: 'crypto',
    description: 'Triggers when BTC moves more than 5% in 24 hours',
    check: (data) => {
      const coins = data.crypto?.coinMarketData?.coins || data.crypto?.coins;
      const btc = coins?.find(c => c.symbol === 'btc' || c.id === 'bitcoin');
      const chg = btc?.change24h ?? btc?.price_change_percentage_24h;
      if (chg != null && Math.abs(chg) > 5) return { triggered: true, value: chg.toFixed(1), message: `BTC ${chg > 0 ? '+' : ''}${chg.toFixed(1)}% in 24h` };
      return { triggered: false };
    },
  },
  {
    id: 'gold-rally',
    label: 'Gold Significant Move',
    severity: 'low',
    market: 'commodities',
    description: 'Triggers when gold moves more than 2% in a session',
    check: (data) => {
      const v2 = data.commodities?.yahoo;
      if (v2) {
        const goldQuote = v2.dbc;
        if (goldQuote?.change != null && Math.abs(goldQuote.change) > 2) return { triggered: true, value: goldQuote.change.toFixed(1), message: `Gold ${goldQuote.change > 0 ? '+' : ''}${goldQuote.change.toFixed(1)}% — significant move` };
      }
      const legacy = data.commodities?.priceDashboardData;
      if (legacy) {
        for (const sector of legacy) {
          const gold = sector.commodities?.find(c => c.ticker === 'GC=F');
          if (gold?.change1d != null && Math.abs(gold.change1d) > 2) return { triggered: true, value: gold.change1d.toFixed(1), message: `Gold ${gold.change1d > 0 ? '+' : ''}${gold.change1d.toFixed(1)}% — significant move` };
        }
      }
      return { triggered: false };
    },
  },
  {
    id: 'dxy-move',
    label: 'Dollar Strength Shift',
    severity: 'low',
    market: 'fx',
    description: 'Triggers when DXY moves more than 0.5% in a session',
    check: (data) => {
      const dxyData = data.fx?.spotRates?.find(r => r.ticker === 'DX-Y.NYB' || r.symbol === 'DX-Y.NYB');
      if (dxyData?.changePercent != null && Math.abs(dxyData.changePercent) > 0.5) return { triggered: true, value: dxyData.changePercent.toFixed(2), message: `DXY ${dxyData.changePercent > 0 ? '+' : ''}${dxyData.changePercent.toFixed(2)}% — dollar ${dxyData.changePercent > 0 ? 'strengthening' : 'weakening'}` };
      return { triggered: false };
    },
  },
];

const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 };

const ENDPOINTS = [
  { key: 'sentiment',   url: `${SERVER}/api/sentiment` },
  { key: 'bonds',       url: `${SERVER}/api/bonds` },
  { key: 'credit',      url: `${SERVER}/api/credit` },
  { key: 'crypto',      url: `${SERVER}/api/crypto` },
  { key: 'commodities', url: `${SERVER}/api/commodities` },
  { key: 'fx',          url: `${SERVER}/api/fx` },
];

export function useAlertsData(autoRefresh = false, refreshKey = 0, { disabled = false } = {}) {
  const [alerts, setAlerts]       = useState([]);

  // Status with error handling
  const { isLoading, error, fetchedOn, fetchLog, lastUpdated, handleFinally, setFetchedOn, logFetch } = useDataStatus();

  const fetchData = useCallback(() => {
    const promises = ENDPOINTS.map(ep =>
      fetchWithRetry(ep.url, { retries: 1, timeout: 8000 })
        .then(r => r.json())
        .then(data => ({ key: ep.key, data, ok: true }))
        .catch(() => ({ key: ep.key, data: null, ok: false }))
    );

    Promise.allSettled(promises).then(results => {
      const combined = {};
      let anyLive = false;
      let latestFetchedOn = null;

      for (const result of results) {
        const val = result.status === 'fulfilled' ? result.value : { key: null, data: null, ok: false };
        if (val.ok && val.data) {
          combined[val.key] = val.data;
          anyLive = true;
          if (val.data.fetchedOn) {
            if (!latestFetchedOn || val.data.fetchedOn > latestFetchedOn) latestFetchedOn = val.data.fetchedOn;
          }
        }
      }

      const triggered = [];
      for (const rule of ALERT_RULES) {
        try {
          const result = rule.check(combined);
          if (result.triggered) {
            triggered.push({
              id: rule.id,
              label: rule.label,
              severity: rule.severity,
              market: rule.market,
              value: result.value,
              message: result.message,
            });
          }
        } catch {
        }
      }

      triggered.sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9));

      setAlerts(triggered);
      if (latestFetchedOn) setFetchedOn(latestFetchedOn);
      handleFinally();
    });
  }, [handleFinally, setFetchedOn]);

  useEffect(() => { if (!disabled) fetchData(); }, [disabled]);
  useEffect(() => { if (refreshKey > 0 && !disabled) fetchData(); }, [refreshKey, disabled]);

  return { alerts, rules: ALERT_RULES, isLoading, error, fetchedOn, fetchLog, lastUpdated, refetch: fetchData };
}
