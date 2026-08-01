/**
 * P0 placeholder retargets: gdpnow, calendar treasury/options, insurance etfs.
 */
import { describe, it, expect } from 'vitest';
import { getPanelPlaceholders } from '../../data/panelPlaceholders.js';
import { resolvePath, placeholderValueOk } from '../../hub/lib/panelHealthUtils.js';

function scoreSlots(slots, markets, marketId) {
  const primary = markets[marketId];
  let req = 0;
  let filled = 0;
  for (const slot of slots) {
    const isReq = slot.required !== false;
    if (isReq) req++;
    let v = null;
    if (slot.crossMarket) {
      const dep = markets[slot.crossMarket];
      if (!dep) continue;
      if (slot.path) v = resolvePath(dep, slot.path);
      else if (slot.anyOf) {
        for (const p of slot.anyOf) {
          const c = resolvePath(dep, p);
          if (placeholderValueOk(c, p)) { v = c; break; }
        }
      }
    } else if (slot.anyOf) {
      for (const p of slot.anyOf) {
        const c = resolvePath(primary, p);
        if (placeholderValueOk(c, p)) { v = c; break; }
      }
    } else if (slot.path) {
      v = resolvePath(primary, slot.path);
    }
    if (placeholderValueOk(v, slot.path || slot.anyOf?.[0] || '') && isReq) filled++;
  }
  return req ? filled / req : 1;
}

describe('P0 placeholder retargets', () => {
  it('gdpnow fills from latest.gdp not currentQuarter string', () => {
    const slots = getPanelPlaceholders('globalMacro', 'gdpnow');
    const markets = {
      globalMacro: {},
      fedGDPNow: {
        currentQuarter: '26:Q3',
        latest: { date: '2026-07-30', gdp: 4.95 },
        evolution: [{ date: '2026-07-30', gdp: 4.95 }],
      },
    };
    expect(scoreSlots(slots, markets, 'globalMacro')).toBeGreaterThanOrEqual(0.85);
  });

  it('calendar treasury uses treasuryAuctions cross-market', () => {
    const slots = getPanelPlaceholders('calendar', 'treasury');
    const markets = {
      calendar: { economicEvents: [] },
      treasuryAuctions: {
        auctions: [{ cusip: 'X', highYield: 4.2 }, { cusip: 'Y', highYield: 4.1 }],
        upcoming: [{ date: '2026-08-01', type: '2Y' }],
      },
    };
    expect(scoreSlots(slots, markets, 'calendar')).toBeGreaterThanOrEqual(0.85);
  });

  it('calendar options accepts date/type expiry rows', () => {
    const slots = getPanelPlaceholders('calendar', 'options');
    const markets = {
      calendar: {
        optionsExpiry: [
          { date: '2026-08-21', type: 'Monthly' },
          { date: '2026-09-18', type: 'Monthly' },
        ],
      },
    };
    expect(scoreSlots(slots, markets, 'calendar')).toBeGreaterThanOrEqual(0.85);
  });

  it('insurance etfs accepts sectorETF array holdings', () => {
    const slots = getPanelPlaceholders('insurance', 'etfs');
    const markets = {
      insurance: {
        sectorETF: [
          { ticker: 'KIE', price: 52.1, changePct: 0.4 },
          { ticker: 'IAK', price: 110.2, changePct: -0.1 },
        ],
      },
    };
    expect(scoreSlots(slots, markets, 'insurance')).toBeGreaterThanOrEqual(0.85);
  });

  it('alerts active feed accepts empty alerts (All Clear)', () => {
    const slots = getPanelPlaceholders('alerts', 'active-alerts');
    const markets = {
      alerts: { alerts: [], rules: [{ id: 'r1', name: 'test', enabled: true }] },
    };
    expect(scoreSlots(slots, markets, 'alerts')).toBeGreaterThanOrEqual(0.85);
  });
});
