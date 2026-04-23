import { describe, it, expect } from 'vitest';

const ALERT_RULES = [
  { id: 'vix-spike', label: 'VIX Spike', severity: 'high', market: 'derivatives',
    check: (d) => { const vixSignal = d.sentiment?.riskData?.signals?.find(s => s.name === 'VIX'); const vix = vixSignal?.value; return vix != null && vix > 25 ? { triggered: true, value: vix, message: `VIX at ${vix.toFixed(1)} — elevated volatility` } : { triggered: false }; } },
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
];

describe('Alert Rules', () => {
  it('triggers VIX spike when above 25', () => {
    const data = { sentiment: { riskData: { signals: [{ name: 'VIX', value: 30 }] } } };
    const rule = ALERT_RULES.find(r => r.id === 'vix-spike');
    expect(rule.check(data).triggered).toBe(true);
  });

  it('does not trigger VIX when below threshold', () => {
    const data = { sentiment: { riskData: { signals: [{ name: 'VIX', value: 15 }] } } };
    const rule = ALERT_RULES.find(r => r.id === 'vix-spike');
    expect(rule.check(data).triggered).toBe(false);
  });

  it('triggers yield curve inversion when 10Y < 2Y', () => {
    const data = { bonds: { yieldCurveData: { US: { '10y': 3.5, '2y': 4.5 } } } };
    const rule = ALERT_RULES.find(r => r.id === 'curve-inversion');
    expect(rule.check(data).triggered).toBe(true);
  });

  it('does not trigger when curve normal', () => {
    const data = { bonds: { yieldCurveData: { US: { '10y': 4.5, '2y': 3.5 } } } };
    const rule = ALERT_RULES.find(r => r.id === 'curve-inversion');
    expect(rule.check(data).triggered).toBe(false);
  });

  it('triggers HY spread when above 400bps', () => {
    const data = { credit: { spreadData: { current: { hySpread: 450 } } } };
    const rule = ALERT_RULES.find(r => r.id === 'hy-spread-wide');
    expect(rule.check(data).triggered).toBe(true);
  });

  it('triggers extreme fear when below 25', () => {
    const data = { sentiment: { fearGreedData: { score: 20 } } };
    const rule = ALERT_RULES.find(r => r.id === 'fear-extreme');
    expect(rule.check(data).triggered).toBe(true);
  });

  it('triggers extreme greed when above 75', () => {
    const data = { sentiment: { fearGreedData: { score: 80 } } };
    const rule = ALERT_RULES.find(r => r.id === 'greed-extreme');
    expect(rule.check(data).triggered).toBe(true);
  });

  it('triggers BTC large move when > 5% drop', () => {
    const data = { crypto: { coins: [{ symbol: 'btc', change24h: -7.5 }] } };
    const rule = ALERT_RULES.find(r => r.id === 'btc-crash');
    expect(rule.check(data).triggered).toBe(true);
  });

  it('triggers BTC large move when > 5% gain', () => {
    const data = { crypto: { coins: [{ symbol: 'btc', change24h: 6.2 }] } };
    const rule = ALERT_RULES.find(r => r.id === 'btc-crash');
    expect(rule.check(data).triggered).toBe(true);
  });

  it('does not trigger for small BTC moves', () => {
    const data = { crypto: { coins: [{ symbol: 'btc', change24h: 2.0 }] } };
    const rule = ALERT_RULES.find(r => r.id === 'btc-crash');
    expect(rule.check(data).triggered).toBe(false);
  });
});