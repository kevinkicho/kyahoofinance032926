import { describe, it, expect } from 'vitest';
import {
  normalizeBondsData,
  normalizeCommoditiesData,
  normalizeRealEstateData,
  normalizeCalendarData,
  normalizeSeriesPayload,
  fieldStatus,
} from '../data/marketNormalizers';

describe('market normalizers', () => {
  it('derives bond tenors and curve spreads from yieldCurveData.US', () => {
    const n = normalizeBondsData({
      yieldCurveData: { US: { '3m': 3.8, '2y': 4.2, '10y': 4.5 } },
      spreadData: { dates: ['Jun'], IG: [74], HY: [263] },
      tipsYields: { '5y': 1.96 },
      _sources: { 'US Treasury Yields': 'true' },
    });
    expect(n.values.treasuryRates.US10Y).toBe(4.5);
    expect(n.values.treasuryRates.US2Y).toBe(4.2);
    expect(n.values.spreadIndicators.t10y2y).toBeCloseTo(0.3);
    expect(n.values.spreadData.current.igSpread).toBe(74);
    expect(n.availability.us10y).toBe('ok');
  });

  it('normalizes commodities enhanced supply/demand and gold fallback', () => {
    const n = normalizeCommoditiesData({
      eia: {
        crude_stocks: { value: 450, history: [{ date: '2026-01-01', value: 440 }] },
        natgas_storage: { value: 2600, history: [{ date: '2026-01-01', value: 2500 }] },
      },
      yahoo: { futures: { 'GC=F': { price: 4172.9 }, 'CL=F': { price: 84.65 } } },
      _sources: { eia: 'true', yahoo: 'true' },
    });
    expect(n.values.supplyDemandData.crudeStocks.values).toEqual([440]);
    expect(n.values.goldLatest).toBe(4172.9);
    expect(n.values.goldOilRatio.ratio).toBeCloseTo(49.3, 1);
  });

  it('does not remount-crash when leftover EIA history bags are isLive-only', () => {
    const leftover = {
      isLive: true,
      yahoo: { futures: { 'CL=F': { price: 84.65 }, 'GC=F': { price: 4172.9 } } },
      eia: {
        wti_price: { value: 84.65 },
        crude_stocks: { history: { isLive: true } },
        natgas_storage: { history: { isLive: true } },
        crude_production: { isLive: true },
        gasoline_stocks: { history: { isLive: true }, value: 230 },
      },
    };
    expect(() => normalizeCommoditiesData(leftover)).not.toThrow();
    const n = normalizeCommoditiesData(leftover);
    expect(n.values.supplyDemandData.crudeStocks.values).toEqual([]);
    expect(n.values.supplyDemandData.natGasStorage.values).toEqual([]);
    expect(n.values.supplyDemandData.gasolineStocks.latest).toBe(230);
    expect(n.values.wtiLatest).toBe(84.65);
    const realSibling = normalizeCommoditiesData({
      isLive: true,
      eia: {
        crude_stocks: { value: 450, history: [{ date: '2026-01-01', value: 440 }] },
        natgas_storage: { history: { isLive: true } },
      },
    });
    expect(realSibling.values.supplyDemandData.crudeStocks.values).toEqual([440]);
    expect(realSibling.values.supplyDemandData.natGasStorage.values).toEqual([]);
  });

  it('converts real-estate cap-rate basis points to percent display values', () => {
    const n = normalizeRealEstateData(
      { capRateData: [{ sector: 'Gaming', impliedYield: 685 }] },
      { commodities: { yahoo: { futures: { 'GC=F': { price: 4000 } } } } }
    );
    expect(n.values.capRateData[0].impliedYieldPct).toBe(6.85);
    expect(n.values.commoditiesData.gold).toBe(4000);
  });

  it('treats sparse calendar data as renderable partial coverage', () => {
    const n = normalizeCalendarData({ economicEvents: [{ date: '2026-06-25', event: 'GDP' }] });
    expect(n.values.economicEvents).toHaveLength(1);
    expect(n.values.coverage.low).toBe(true);
    expect(n.availability.economicEvents).toBe('ok');
  });

  it('normalizes BLS/Census style series payloads', () => {
    const n = normalizeSeriesPayload({
      series: {
        cpi: { _source: true, latest: { value: 325.25 }, history: { dates: ['2026-05'], values: [325.25] }, unit: 'index' },
      },
    });
    expect(n.values.cpi.latest).toBe(325.25);
    expect(n.availability.cpi).toBe('ok');
  });

  it('reports source-unavailable separately from missing', () => {
    expect(fieldStatus(null)).toBe('missing');
    expect(fieldStatus(1, 'false')).toBe('sourceUnavailable');
  });
});

