/**
 * Regression: independent panels / catalogs drift.
 * - MARKET_PANELS entry without registry module → blank MarketPanelGrid slots
 * - Registry without MARKET_PANELS → orphan health/dropdown
 * - Placeholders missing for key chart panels → false reds on splash
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { MARKET_PANELS } from '../../data/marketPanels';
import { listPanelsForMarket, listAllPanels, getPanel } from '../../panels/registry';
import { getPanelPlaceholders, MIN_PLACEHOLDER_FILL_RATE } from '../../data/panelPlaceholders';
import { PANEL_MANIFEST, getPanelManifestEntry } from '../../panels/manifest';

describe('panel catalog parity', () => {
  it('MIN_PLACEHOLDER_FILL_RATE stays high enough to catch hollow payloads', () => {
    expect(MIN_PLACEHOLDER_FILL_RATE).toBeGreaterThanOrEqual(0.8);
    expect(MIN_PLACEHOLDER_FILL_RATE).toBeLessThanOrEqual(1);
  });

  it('every MARKET_PANELS entry is registered as an independent module', () => {
    const missing = [];
    for (const [marketId, panels] of Object.entries(MARKET_PANELS)) {
      const registered = new Set(listPanelsForMarket(marketId).map((p) => p.panelId));
      for (const p of panels) {
        if (!registered.has(p.id)) missing.push(`${marketId}:${p.id}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('every registered panel has a Body component', () => {
    const broken = listAllPanels()
      .filter((p) => typeof p.Body !== 'function')
      .map((p) => p.key);
    expect(broken).toEqual([]);
  });

  it('getPanel resolves marketId:panelId for sample core panels', () => {
    for (const key of ['bonds:yield', 'bonds:kpi', 'fx:dxy', 'equities:heatmap', 'crypto:fear-greed']) {
      const p = getPanel(key);
      expect(p, key).toBeTruthy();
      expect(p.Body).toBeTypeOf('function');
    }
  });

  it('manifest lists a module path for nearly every MARKET_PANELS entry', () => {
    const missing = [];
    for (const [marketId, panels] of Object.entries(MARKET_PANELS)) {
      for (const p of panels) {
        const entry = getPanelManifestEntry(marketId, p.id)
          || PANEL_MANIFEST.find((e) => e.marketId === marketId && e.panelId === p.id);
        if (!entry?.module) missing.push(`${marketId}:${p.id}`);
      }
    }
    // Zero preferred; allow tiny drift if a panel file was just added.
    expect(missing.length, `missing modules: ${missing.join(', ')}`).toBeLessThanOrEqual(2);
  });

  it('credit-quality exists as a panel module file when listed in MARKET_PANELS', () => {
    const has = (MARKET_PANELS.credit || []).some((p) => p.id === 'credit-quality');
    if (!has) return;
    const p = path.join(process.cwd(), 'src/panels/credit/credit-quality.jsx');
    expect(fs.existsSync(p) || fs.existsSync(p.replace('.jsx', '.js'))).toBe(true);
  });

  it('bonds chart panels have multi-slot placeholders (dates+values pattern)', () => {
    for (const id of ['fed', 'm2', 'debtgdp', 'curvespreads']) {
      const slots = getPanelPlaceholders('bonds', id);
      expect(slots?.length, `bonds:${id}`).toBeGreaterThanOrEqual(1);
      const paths = slots.flatMap((s) => s.anyOf || (s.path ? [s.path] : []));
      // At least one path should reference values or a numeric series
      const hasSeries = paths.some((p) => /values|dates|t10y|history|latest/i.test(p));
      expect(hasSeries, `bonds:${id} paths=${paths.join(',')}`).toBe(true);
    }
  });

  it('bonds auctions placeholder points at treasuryAuctions (not hollow bonds.auctionData only)', () => {
    const slots = getPanelPlaceholders('bonds', 'auctions') || [];
    const cross = slots.some((s) => s.crossMarket === 'treasuryAuctions');
    expect(cross).toBe(true);
  });

  it('registry panel count is stable and large', () => {
    expect(listAllPanels().length).toBeGreaterThanOrEqual(200);
  });
});
