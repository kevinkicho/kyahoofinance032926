/**
 * Shared data integrity and structural guard validators for market APIs.
 * This mirrors the validation checks implemented in the frontend DataProvider.jsx.
 */

export const STRUCTURAL_GUARDS: Record<string, (d: any) => boolean> = {
  bonds:          d => { const yd = d.yieldCurveData; if (!yd || typeof yd !== 'object') return false; return Object.values(yd).filter((v: any) => v && typeof v === 'object' && Object.values(v).some(x => x != null)).length >= 3; },
  commodities:    d => Array.isArray(d.cotData) ? d.cotData.length >= 2 : true,
  sentiment:      d => Array.isArray(d.currencies) ? d.currencies.length >= 4 : true,
  globalMacro:    d => Array.isArray(d.scorecardData) ? d.scorecardData.length >= 8 : true,
  credit:         d => d.spreadData?.history?.dates?.length >= 6 && d.commercialPaper?.rate != null,
  crypto:         d => Array.isArray(d.coins) ? d.coins.length >= 10 : true,
  equities:       d => Array.isArray(d.stocks) ? d.stocks.length >= 1 : true,
  equitiesDeepDive: d => Array.isArray(d.sectors) ? d.sectors.length >= 8 : true,
  calendar:       d => {
    const events = Array.isArray(d.economicEvents) && d.economicEvents.length >= 5;
    const earnings = Array.isArray(d.earningsSeason) && d.earningsSeason.length >= 2;
    const banks = Array.isArray(d.centralBanks) && d.centralBanks.length >= 2;
    return events || earnings || banks;
  },
  derivatives:    d => d.vixTermStructure?.values?.length >= 2,
  insurance:      d => Array.isArray(d.combinedRatioData) ? d.combinedRatioData.length >= 2 : true,
  realEstate:     d => Array.isArray(d.reitData) ? d.reitData.length >= 2 : true,
  fx:             d => Array.isArray(d.fredFxRates) ? d.fredFxRates.length >= 2 : true,
  imf:            d => Array.isArray(d.countries) ? d.countries.length >= 5 : true,
  worldbank:      d => Array.isArray(d.countries) ? d.countries.length >= 5 : true,
  bls:            d => d.series && Object.values(d.series).some((s: any) => s._source),
  eia:            d => d.electricity?.residential != null || d.co2Emissions?.total != null,
  census:         d => d.series && Object.values(d.series).some((s: any) => s._source),
};

export function hasNonNullData(d: any, id: string): boolean {
  if (!d || typeof d !== 'object') return false;
  let nonNull = 0;
  for (const [k, v] of Object.entries(d)) {
    if (k.startsWith('_') || k === 'lastUpdated' || k === 'fetchedOn' || k === 'isCurrent' || k === 'isLive' || k === 'countryCount') continue;
    if (v != null && v !== false) {
      if (typeof v === 'object') {
        if (Array.isArray(v)) {
          if (v.length > 0) nonNull++;
        } else {
          const childValues = Object.values(v);
          if (childValues.length > 0 && childValues.some(x => x != null && x !== false)) {
            let hadSource = false;
            for (const cv of childValues) {
              if (cv != null && cv !== false && typeof cv === 'object' && !Array.isArray(cv) && (cv as any)._source === true) {
                nonNull++;
                hadSource = true;
              }
            }
            if (!hadSource) nonNull++;
          }
        }
      } else {
        nonNull++;
      }
    }
  }
  return nonNull >= 2;
}

export function validateMarketData(id: string, data: any): { ok: boolean; error?: string } {
  if (!data) return { ok: false, error: 'Empty response (null or undefined)' };
  
  const hasData = hasNonNullData(data, id);
  if (!hasData) {
    return { ok: false, error: 'No non-null data keys (failed hasNonNullData)' };
  }
  
  const guard = STRUCTURAL_GUARDS[id];
  if (guard) {
    try {
      const passed = guard(data);
      if (!passed) {
        return { ok: false, error: 'Failed structural guard check' };
      }
    } catch (e: any) {
      return { ok: false, error: `Error evaluating structural guard: ${e.message}` };
    }
  }
  
  return { ok: true };
}
