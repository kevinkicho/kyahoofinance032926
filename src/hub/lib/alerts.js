export function getDisabledRuleIds() {
  try {
    const raw = localStorage.getItem('alert-rules-enabled');
    if (!raw) return [];
    const map = JSON.parse(raw);
    return Object.entries(map).filter(([, v]) => v === false).map(([k]) => k);
  } catch { return []; }
}

export function computeAlerts(baseMarkets, disabledRuleIds) {
  const disabledSet = new Set(disabledRuleIds || []);
  const ALERT_RULES = [
    { id: 'vix-spike', label: 'VIX Spike', severity: 'high', market: 'derivatives',
      check: (d) => { 
        const vixSignal = d.sentiment?.riskData?.signals?.find(s => s.name === 'VIX'); 
        const vixDeriv = d.derivatives?.vixData?.spot;
        const vix = vixSignal?.value ?? vixDeriv; 
        return vix != null && vix > 30 ? { triggered: true, value: vix, message: `VIX at ${vix.toFixed(1)} — elevated volatility` } : { triggered: false }; 
      } },
    { id: 'curve-inversion', label: 'Yield Curve Inversion', severity: 'high', market: 'bonds',
      check: (d) => { const ycd = d.bonds?.yieldCurveData; if (!ycd) return { triggered: false }; const us = ycd.US || ycd.us; if (!us) return { triggered: false }; const t10 = us['10y'] ?? us['10Y']; const t2 = us['2y'] ?? us['2Y']; return (t10 != null && t2 != null && t10 < t2) ? { triggered: true, value: (t10 - t2).toFixed(2), message: `10Y-2Y spread at ${(t10 - t2).toFixed(2)}% — inverted` } : { triggered: false }; } },
    { id: 'hy-spread-wide', label: 'HY Spread Widening', severity: 'medium', market: 'credit',
      check: (d) => { const hy = d.credit?.spreadData?.current?.hySpread; return hy != null && hy > 400 ? { triggered: true, value: Math.round(hy), message: `HY OAS at ${Math.round(hy)}bps — stress level` } : { triggered: false }; } },
    { id: 'fear-extreme', label: 'Extreme Fear', severity: 'high', market: 'sentiment',
      check: (d) => { const fg = d.sentiment?.fearGreedData?.score ?? d.sentiment?.fearGreedData?.value; return (fg != null && fg < 25) ? { triggered: true, value: fg, message: `Fear & Greed at ${fg} — extreme fear` } : { triggered: false }; } },
    { id: 'greed-extreme', label: 'Extreme Greed', severity: 'medium', market: 'sentiment',
      check: (d) => { const fg = d.sentiment?.fearGreedData?.score ?? d.sentiment?.fearGreedData?.value; return (fg != null && fg > 75) ? { triggered: true, value: fg, message: `Fear & Greed at ${fg} — extreme greed` } : { triggered: false }; } },
    { id: 'btc-crash', label: 'BTC Large Move', severity: 'medium', market: 'crypto',
      check: (d) => { const coins = d.crypto?.coinMarketData?.coins || d.crypto?.coins; const btc = coins?.find(c => c.symbol === 'btc' || c.id === 'bitcoin'); const chg = btc?.change24h ?? btc?.price_change_percentage_24h; return (chg != null && Math.abs(chg) > 5) ? { triggered: true, value: chg.toFixed(1), message: `BTC ${chg > 0 ? '+' : ''}${chg.toFixed(1)}% in 24h` } : { triggered: false }; } },
    { id: 'gold-rally', label: 'Gold Significant Move', severity: 'low', market: 'commodities',
      check: (d) => {
        const v2 = d.commodities?.yahoo;
        if (v2) {
          const goldQuote = v2.futures?.['GC=F'];
          if (goldQuote?.change != null && Math.abs(goldQuote.change) > 3) return { triggered: true, value: goldQuote.change.toFixed(1), message: `Gold ${goldQuote.change > 0 ? '+' : ''}${goldQuote.change.toFixed(1)}% — significant move` };
        }
        const legacy = d.commodities?.priceDashboardData;
        if (legacy) {
          for (const sector of legacy) {
            const gold = sector.commodities?.find(c => c.ticker === 'GC=F');
            if (gold?.change1d != null && Math.abs(gold.change1d) > 3) return { triggered: true, value: gold.change1d.toFixed(1), message: `Gold ${gold.change1d > 0 ? '+' : ''}${gold.change1d.toFixed(1)}% — significant move` };
          }
        }
        return { triggered: false };
      } },

    { id: 'dxy-move', label: 'Dollar Strength Shift', severity: 'low', market: 'fx',
      check: (d) => {
        const dxyH = d.fx?.dxyHistory;
        if (dxyH?.values?.length >= 2) {
          const vals = dxyH.values;
          const pctChange = ((vals[vals.length - 1] - vals[vals.length - 2]) / vals[vals.length - 2]) * 100;
          if (Math.abs(pctChange) > 2) return { triggered: true, value: pctChange.toFixed(2), message: `DXY ${pctChange > 0 ? '+' : ''}${pctChange.toFixed(2)}% — dollar ${pctChange > 0 ? 'strengthening' : 'weakening'}` };
        }
        return { triggered: false };
      } },
  ];
  const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 };
  const combined = {};
  for (const [key, marketState] of Object.entries(baseMarkets)) {
    if (marketState.data) combined[key] = marketState.data;
  }
  const triggered = [];
  for (const rule of ALERT_RULES) {
    if (disabledSet.has(rule.id)) continue;
    try {
      const result = rule.check(combined);
      if (result.triggered) triggered.push({ id: rule.id, label: rule.label, severity: rule.severity, market: rule.market, value: result.value, message: result.message });
    } catch {}
  }
  triggered.sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9));
  return { alerts: triggered, rules: ALERT_RULES };
}
