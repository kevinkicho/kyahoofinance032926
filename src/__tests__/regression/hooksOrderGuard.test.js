/**
 * Regression: early return before hooks crashes React when a market mounts
 * empty (splash) then re-renders with data.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function assertHooksBeforeEmptyReturn(relPath, exportNeedle, emptyReturnRe) {
  const file = path.join(root, relPath);
  const src = fs.readFileSync(file, 'utf8');
  const idx = src.indexOf(exportNeedle);
  expect(idx, relPath).toBeGreaterThanOrEqual(0);
  const body = src.slice(idx);
  const earlyEmpty = body.search(emptyReturnRe);
  const lastHook = Math.max(
    body.lastIndexOf('useMemo('),
    body.lastIndexOf('useState('),
    body.lastIndexOf('useCallback('),
    body.lastIndexOf('useEffect('),
  );
  if (lastHook < 0) return; // no hooks — N/A
  if (earlyEmpty >= 0) {
    expect(earlyEmpty, `${relPath}: empty-state return must come after hooks`).toBeGreaterThan(lastHook);
  }
}

describe('hooks order guard', () => {
  it('BlsDashboard runs all hooks before empty-state early return', () => {
    assertHooksBeforeEmptyReturn(
      'markets/bls/components/BlsDashboard.jsx',
      'export default function BlsDashboard',
      /if\s*\(\s*!isLive\s*&&[\s\S]*?return\s*\(/,
    );
  });

  it('EiaMarket does not early-return before panelCtx useMemo', () => {
    const file = path.join(root, 'markets/eia/EiaMarket.jsx');
    const src = fs.readFileSync(file, 'utf8');
    const fn = src.indexOf('function EiaMarket');
    const body = src.slice(fn, src.indexOf('export default', fn));
    // No skeleton early-return before useMemo (hooks must be unconditional).
    const skeletonBeforeMemo = /if\s*\(\s*!centralData\s*\)\s*return[\s\S]*?useMemo\s*\(/.test(body);
    expect(skeletonBeforeMemo).toBe(false);
    expect(body).toMatch(/useMemo\s*\(/);
  });

  it('CftcPositioning runs hooks before empty-state early return', () => {
    assertHooksBeforeEmptyReturn(
      'markets/sentiment/components/CftcPositioning.jsx',
      'export default function CftcPositioning',
      /if\s*\(\s*!cftcData\s*\)\s*return\s*null/,
    );
  });

  it('FearGreed runs hooks before empty-state early return', () => {
    assertHooksBeforeEmptyReturn(
      'markets/sentiment/components/FearGreed.jsx',
      'export default function FearGreed',
      /if\s*\(\s*!fearGreedData\s*\)\s*return\s*null/,
    );
  });

  it('AffordabilityMap runs hooks before empty-state early return', () => {
    assertHooksBeforeEmptyReturn(
      'markets/realEstate/components/AffordabilityMap.jsx',
      'export default function AffordabilityMap',
      /if\s*\(\s*!affordabilityData\s*\)\s*return\s*null/,
    );
  });
});
