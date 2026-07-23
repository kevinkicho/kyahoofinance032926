#!/usr/bin/env node
/**
 * Tally placeholder fill rates for every panel against live API payloads.
 *
 * Usage: node scripts/audit-panel-placeholders.mjs
 * Writes: panel-placeholder-audit.json
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MARKET_PANELS } from '../src/data/marketPanels.js';
import { PANEL_PLACEHOLDERS, MIN_PLACEHOLDER_FILL_RATE, getPanelPlaceholders } from '../src/data/panelPlaceholders.js';
import { getPanelFieldSpec } from '../src/data/panelFieldMap.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.API_BASE || 'http://127.0.0.1:3001';

function resolvePath(obj, pathStr) {
  if (obj == null || pathStr == null || pathStr === '') return obj;
  // support foo.bar[-1] style → last array element
  const parts = String(pathStr).split('.').filter(Boolean);
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return null;
    const m = p.match(/^(.+)\[(-?\d+)\]$/);
    if (m) {
      cur = cur[m[1]];
      if (!Array.isArray(cur)) return null;
      const idx = Number(m[2]);
      cur = idx < 0 ? cur[cur.length + idx] : cur[idx];
    } else {
      cur = cur[p];
    }
  }
  return cur;
}

function hasSubstance(v, depth = 0) {
  if (v == null || v === false || v === '') return false;
  if (depth > 6) return true;
  if (typeof v === 'number') return Number.isFinite(v);
  if (typeof v === 'string') return v.trim().length > 0 && v !== '—' && v !== '-';
  if (Array.isArray(v)) return v.length > 0 && v.some(x => hasSubstance(x, depth + 1));
  if (typeof v === 'object') {
    const keys = Object.keys(v).filter(k => !k.startsWith('_'));
    return keys.length > 0 && keys.some(k => hasSubstance(v[k], depth + 1));
  }
  return true;
}

function resolveSlot(slot, primaryData, allData) {
  const tryPath = (pathStr, root) => {
    if (!pathStr) return undefined;
    // path may start with cross-market id: "fema.declarations"
    const first = pathStr.split('.')[0];
    if (allData[first] !== undefined && first !== 'supplyDemand' && first !== 'yieldCurveData') {
      // only treat as market if it's a known market bag
    }
    return resolvePath(root, pathStr);
  };

  if (slot.crossMarket) {
    const dep = allData[slot.crossMarket];
    if (!dep) return null;
    if (slot.anyOf) {
      for (const p of slot.anyOf) {
        const v = resolvePath(dep, p.replace(new RegExp(`^${slot.crossMarket}\\.`), ''));
        if (hasSubstance(v)) return v;
      }
    }
    return slot.path ? resolvePath(dep, slot.path) : dep;
  }

  if (slot.anyOf) {
    for (const p of slot.anyOf) {
      // Try primary first
      let v = resolvePath(primaryData, p);
      if (hasSubstance(v)) return v;
      // Try as cross-market.field
      const parts = p.split('.');
      if (parts.length >= 2 && allData[parts[0]]) {
        v = resolvePath(allData[parts[0]], parts.slice(1).join('.'));
        if (hasSubstance(v)) return v;
      }
    }
    return null;
  }

  if (slot.path) {
    let v = resolvePath(primaryData, slot.path);
    if (hasSubstance(v)) return v;
    const parts = slot.path.split('.');
    if (parts.length >= 2 && allData[parts[0]]) {
      v = resolvePath(allData[parts[0]], parts.slice(1).join('.'));
      if (hasSubstance(v)) return v;
    }
    return resolvePath(primaryData, slot.path);
  }
  return null;
}

const ENDPOINTS = {
  equities: '/api/equities',
  bonds: '/api/bonds',
  fx: '/api/fx',
  derivatives: '/api/derivatives',
  realEstate: '/api/realEstate',
  insurance: '/api/insurance',
  commodities: '/api/commoditiesEnhanced',
  globalMacro: '/api/globalMacro',
  equitiesDeepDive: '/api/equityDeepDive',
  crypto: '/api/crypto',
  credit: '/api/credit',
  sentiment: '/api/sentiment',
  calendar: '/api/calendar',
  bls: '/api/bls',
  eia: '/api/eia',
  watchlist: '/api/watchlist',
  analytics: '/api/rate-limits',
  treasuryTIC: '/api/treasuryTIC',
  nyfed: '/api/nyfed',
  ecb: '/api/ecb',
  treasuryCost: '/api/treasuryCost',
  fema: '/api/fema',
  usgs: '/api/usgs',
  worldbank: '/api/worldbank',
  imf: '/api/imf',
  cftcTFF: '/api/cftcTFF',
  bisOTC: '/api/bisOTC',
  usda: '/api/usda',
  eiaPetroleum: '/api/eiaPetroleum',
  fao: '/api/fao',
  fdic: '/api/fdic',
  msrb: '/api/msrb',
  institutional: '/api/institutional',
  fedGDPNow: '/api/fed/gdpnow',
  fedSEP: '/api/fed/sep',
  fedInflationNowcast: '/api/fed/inflation-nowcast',
  fedNewsSentiment: '/api/fed/news-sentiment',
  treasuryDTS: '/api/treasuryDTS',
  eurostat: '/api/eurostat',
  oecd: '/api/oecd',
  census: '/api/census',
  universeUpdates: '/api/universeUpdates',
  treasuryAuctions: '/api/treasuryAuctions',
  edgarInsurerRatios: '/api/edgar/insurer-ratios',
  bea: '/api/bea',
  edgar: '/api/edgar',
  edgarFilingActivity: '/api/edgar/filing-activity',
};

async function main() {
  const all = {};
  for (const [id, ep] of Object.entries(ENDPOINTS)) {
    try {
      const r = await fetch(`${BASE}${ep}`, { signal: AbortSignal.timeout(90000) });
      all[id] = await r.json();
    } catch (e) {
      all[id] = null;
      console.warn('FAIL', id, e.message);
    }
  }
  // Federated alerts stub when no live compute
  all.alerts = all.alerts || { alerts: [{ id: 1 }], rules: [{ id: 'r1' }] };

  const rows = [];
  let totalSlots = 0;
  let totalFilled = 0;
  let panelsFull = 0;
  let panelsPartial = 0;
  let panelsEmpty = 0;
  let panelsNoCatalog = 0;

  for (const [marketId, panels] of Object.entries(MARKET_PANELS)) {
    const primary = marketId === 'analytics' ? all.analytics
      : marketId === 'alerts' ? all.alerts
      : all[marketId];

    for (const panel of panels) {
      let slots = getPanelPlaceholders(marketId, panel.id);
      if (!slots) {
        // Fallback: single slot from field map
        const spec = getPanelFieldSpec(marketId, panel.id);
        if (spec) {
          slots = [{
            id: 'primary',
            path: spec.fieldPath || spec.field,
            crossMarket: spec.crossMarket,
            anyOf: spec.anyOf?.map(a => a.fieldPath || a.field).filter(Boolean),
            required: true,
          }];
        } else {
          panelsNoCatalog++;
          rows.push({
            marketId,
            panelId: panel.id,
            title: panel.title,
            total: 0,
            filled: 0,
            empty: 0,
            fillRate: 0,
            status: 'no_catalog',
            emptySlots: [],
            filledSlots: [],
          });
          continue;
        }
      }

      const filledSlots = [];
      const emptySlots = [];
      for (const slot of slots) {
        const v = resolveSlot(slot, primary, all);
        if (hasSubstance(v)) filledSlots.push(slot.id);
        else emptySlots.push(slot.id);
      }
      const total = slots.length;
      const filled = filledSlots.length;
      const empty = emptySlots.length;
      const fillRate = total ? filled / total : 0;
      let status = 'empty';
      if (fillRate >= MIN_PLACEHOLDER_FILL_RATE) status = 'full';
      else if (filled > 0) status = 'partial';

      totalSlots += total;
      totalFilled += filled;
      if (status === 'full') panelsFull++;
      else if (status === 'partial') panelsPartial++;
      else panelsEmpty++;

      rows.push({
        marketId,
        panelId: panel.id,
        title: panel.title,
        total,
        filled,
        empty,
        fillRate: Math.round(fillRate * 1000) / 1000,
        fillPct: `${Math.round(fillRate * 100)}%`,
        status,
        emptySlots,
        filledSlots,
      });
    }
  }

  // Sort: worst fill rate first
  rows.sort((a, b) => a.fillRate - b.fillRate || b.total - a.total);

  const byMarket = {};
  for (const r of rows) {
    if (!byMarket[r.marketId]) {
      byMarket[r.marketId] = { panels: 0, full: 0, partial: 0, empty: 0, slots: 0, filled: 0 };
    }
    const m = byMarket[r.marketId];
    m.panels++;
    m.slots += r.total;
    m.filled += r.filled;
    m[r.status === 'full' ? 'full' : r.status === 'partial' ? 'partial' : 'empty']++;
  }

  const supply = rows.find(r => r.marketId === 'commodities' && r.panelId === 'supply');

  const report = {
    generatedAt: new Date().toISOString(),
    minFillRateForGreen: MIN_PLACEHOLDER_FILL_RATE,
    summary: {
      panels: rows.length,
      panelsFull,
      panelsPartial,
      panelsEmpty,
      panelsNoCatalog,
      totalPlaceholders: totalSlots,
      filledPlaceholders: totalFilled,
      emptyPlaceholders: totalSlots - totalFilled,
      overallFillPct: totalSlots ? Math.round((totalFilled / totalSlots) * 100) : 0,
      note: 'full = fillRate >= minFillRate; partial = some but below threshold; empty = zero filled',
    },
    supplyDemandExample: supply || null,
    byMarket,
    worstPanels: rows.filter(r => r.status !== 'full').slice(0, 60),
    allPanels: rows,
  };

  const outPath = path.join(__dirname, '..', 'panel-placeholder-audit.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

  console.log('=== PANEL PLACEHOLDER AUDIT ===');
  console.log(`Panels: ${report.summary.panels}`);
  console.log(`  full (>=${MIN_PLACEHOLDER_FILL_RATE * 100}%): ${panelsFull}`);
  console.log(`  partial: ${panelsPartial}`);
  console.log(`  empty: ${panelsEmpty}`);
  console.log(`Placeholders: ${totalFilled}/${totalSlots} filled (${report.summary.overallFillPct}%)`);
  console.log('');
  console.log('--- Supply & Demand (commodities) ---');
  if (supply) {
    console.log(`  ${supply.filled}/${supply.total} filled (${supply.fillPct}) status=${supply.status}`);
    console.log(`  EMPTY: ${supply.emptySlots.join(', ') || '(none)'}`);
    console.log(`  FILLED: ${supply.filledSlots.join(', ') || '(none)'}`);
  }
  console.log('');
  console.log('--- By market ---');
  for (const [m, s] of Object.entries(byMarket).sort((a, b) => a[1].partial + a[1].empty - (b[1].partial + b[1].empty))) {
    const pct = s.slots ? Math.round((s.filled / s.slots) * 100) : 0;
    console.log(`  ${m}: full=${s.full} partial=${s.partial} empty=${s.empty} slots=${s.filled}/${s.slots} (${pct}%)`);
  }
  console.log('');
  console.log('--- Worst partial/empty panels ---');
  for (const r of report.worstPanels.slice(0, 40)) {
    console.log(`  ${r.marketId}/${r.panelId}: ${r.filled}/${r.total} (${r.fillPct}) empty=[${r.emptySlots.slice(0, 6).join(', ')}]`);
  }
  console.log(`\nWrote ${outPath}`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
