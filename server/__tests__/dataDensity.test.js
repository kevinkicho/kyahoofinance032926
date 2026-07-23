/**
 * Contract: critical market payloads must carry non-null density
 * (guards against hollow caches / discontinued FRED series).
 *
 * Run against a live server: DENSITY_BASE=http://localhost:3001 npm test -- dataDensity
 * Skips automatically if the server is unreachable.
 */
import { describe, it, expect, beforeAll } from 'vitest';

const BASE = process.env.DENSITY_BASE || 'http://localhost:3001';

async function getJson(path) {
  const res = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(90000) });
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return res.json();
}

let serverUp = false;
beforeAll(async () => {
  try {
    const h = await getJson('/api/health');
    serverUp = h?.status === 'ok';
  } catch {
    serverUp = false;
  }
});

function requireServer() {
  if (!serverUp) {
    // eslint-disable-next-line no-console
    console.warn(`[dataDensity] server not reachable at ${BASE} — skipping`);
  }
  return serverUp;
}

describe('API data density (live)', () => {
  it('credit: spreads + default rates + CP', async ({ skip }) => {
    if (!requireServer()) return skip();
    const d = await getJson('/api/credit');
    expect(d.spreadData?.current?.igSpread).toBeGreaterThan(0);
    expect(d.spreadData?.current?.hySpread).toBeGreaterThan(50);
    expect(d.spreadData?.current?.emSpread).not.toBeNull();
    const liveRates = (d.defaultData?.rates || []).filter((r) => r.value != null);
    expect(liveRates.length).toBeGreaterThanOrEqual(4);
    // No all-null placeholder rows
    for (const r of d.defaultData?.rates || []) {
      expect(r.value).not.toBeNull();
    }
    // Loan indices: no proprietary null shells
    for (const idx of d.loanData?.indices || []) {
      expect(idx.value, idx.name).not.toBeNull();
    }
    expect(d.commercialPaper?.rate).not.toBeNull();
  });

  it('sentiment: F&G indicators + risk flat fields + FSI', async ({ skip }) => {
    if (!requireServer()) return skip();
    const d = await getJson('/api/sentiment');
    expect(d.fearGreedData?.score).not.toBeNull();
    expect((d.fearGreedData?.indicators || []).length).toBeGreaterThanOrEqual(8);
    for (const ind of d.fearGreedData.indicators || []) {
      expect(ind.value).not.toBeNull();
    }
    expect(d.riskData?.vix).not.toBeNull();
    expect(d.riskData?.hyOas).toBeGreaterThan(50);
    expect((d.riskData?.signals || []).length).toBeGreaterThanOrEqual(6);
    for (const s of d.riskData.signals || []) {
      expect(s.value).not.toBeNull();
    }
    const fsi = d.riskData?.fsi ?? d.fsiHistory?.values?.at?.(-1);
    expect(fsi).not.toBeNull();
  });

  it('calendar: events with prints, CB rates, earnings caps', async ({ skip }) => {
    if (!requireServer()) return skip();
    const d = await getJson('/api/calendar');
    expect(d.isLive).toBe(true);
    expect((d.economicEvents || []).length).toBeGreaterThanOrEqual(5);
    const withPrint = (d.economicEvents || []).filter(
      (e) => e.lastPrint != null || e.previous != null,
    );
    expect(withPrint.length).toBeGreaterThanOrEqual(3);
    const banks = d.centralBanks || [];
    expect(banks.length).toBeGreaterThanOrEqual(3);
    for (const b of banks) {
      expect(b.rate).not.toBeNull();
      expect(Number(b.rate)).toBeGreaterThanOrEqual(0);
    }
    const boe = banks.find((b) => b.bank === 'BOE');
    expect(boe?.rate).toBeGreaterThan(1); // not stale 0.25
    const caps = (d.earningsSeason || []).filter((e) => e.marketCapB != null);
    expect(caps.length).toBeGreaterThanOrEqual(5);
  });

  it('cleveland nowcast: distinct mom + yoy', async ({ skip }) => {
    if (!requireServer()) return skip();
    const d = await getJson('/api/fed/inflation-nowcast');
    const kinds = (d.tables || []).map((t) => t.kind);
    expect(kinds).toContain('mom');
    expect(kinds).toContain('yoy');
    const yoy = (d.tables || []).find((t) => t.kind === 'yoy');
    expect(yoy?.rows?.[0]?.cpi).toBeGreaterThan(1);
  });

  it('commodities v2: precious futures prices', async ({ skip }) => {
    if (!requireServer()) return skip();
    const d = await getJson('/api/commodities/v2');
    const f = d.yahoo?.futures || {};
    for (const t of ['GC=F', 'SI=F', 'PL=F', 'PA=F']) {
      expect(f[t]?.price, t).not.toBeNull();
    }
  });

  it('insurance: cat spreads + no hollow reinsurance rows', async ({ skip }) => {
    if (!requireServer()) return skip();
    const d = await getJson('/api/insurance');
    expect(d.isLive).toBe(true);
    expect((d.catBondSpreads || []).length).toBeGreaterThanOrEqual(3);
    for (const r of d.catBondSpreads || []) {
      expect(r.spread, r.name).not.toBeNull();
    }
    for (const r of d.reinsurancePricing || []) {
      expect(r.price, r.ticker).not.toBeNull();
    }
  });

  it('derivatives: skew + vix term without empty shells', async ({ skip }) => {
    if (!requireServer()) return skip();
    const d = await getJson('/api/derivatives');
    expect(d.isLive).toBe(true);
    expect(d.skewIndex?.value ?? d.skewHistory?.values?.at?.(-1)).not.toBeNull();
    if (d.optionsFlow) {
      expect(Array.isArray(d.optionsFlow)).toBe(true);
    }
  });
});
