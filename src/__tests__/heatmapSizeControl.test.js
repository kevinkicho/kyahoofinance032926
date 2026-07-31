import { describe, it, expect } from 'vitest';
import {
  applySizeControlToTree,
  pruneChildren,
  getDensityPreset,
  DENSITY_PRESETS,
} from '../components/HeatmapView/heatmapSizeControl';

describe('heatmapSizeControl', () => {
  it('exposes density presets', () => {
    expect(DENSITY_PRESETS.auto).toBeDefined();
    expect(getDensityPreset('sparse').maxLeavesPerParent).toBeLessThan(
      getDensityPreset('dense').maxLeavesPerParent,
    );
  });

  it('keeps large leaves and rolls small ones into Other', () => {
    // More leaves than minKeep so tiny share names can roll into Other
    const children = [
      { name: 'BIG', marketCap: 1000, value: 1000, metricValue: 1000 },
      { name: 'MID', marketCap: 100, value: 100, metricValue: 100 },
      ...Array.from({ length: 12 }, (_, i) => ({
        name: `TINY${i}`,
        marketCap: 0.01,
        value: 0.01,
        metricValue: 0.01,
      })),
    ];
    const { children: next, stats } = pruneChildren(children, getDensityPreset('auto'));
    const names = next.map((n) => n.name);
    expect(names).toContain('BIG');
    expect(names.some((n) => String(n).startsWith('Other'))).toBe(true);
    expect(stats.rolled).toBeGreaterThan(0);
    const other = next.find((n) => n.isOtherBucket);
    expect(other.otherTickers.length).toBe(stats.rolled);
  });

  it('sparse mode rolls more names than dense', () => {
    const children = Array.from({ length: 30 }, (_, i) => ({
      name: `T${i}`,
      marketCap: 100 - i * 3,
      value: 100 - i * 3,
      metricValue: 100 - i * 3,
    }));
    const sparse = pruneChildren(children, getDensityPreset('sparse'));
    const dense = pruneChildren(children, getDensityPreset('dense'));
    expect(sparse.stats.rolled).toBeGreaterThanOrEqual(dense.stats.rolled);
  });

  it('applySizeControlToTree works on region forest', () => {
    const tree = [
      {
        name: 'USA',
        children: [
          { name: 'AAPL', marketCap: 3000, value: 3000, metricValue: 3000 },
          { name: 'SMALL', marketCap: 0.05, value: 0.05, metricValue: 0.05 },
        ],
      },
    ];
    const { tree: out, stats } = applySizeControlToTree(tree, 'auto');
    expect(out[0].children.some((c) => c.name === 'AAPL')).toBe(true);
    expect(stats.totalLeaves).toBe(2);
  });

  it('never drops every leaf (always keeps minKeep)', () => {
    const children = Array.from({ length: 5 }, (_, i) => ({
      name: `EQ${i}`,
      marketCap: 1,
      value: 1,
      metricValue: 1,
    }));
    const { children: next } = pruneChildren(children, getDensityPreset('sparse'));
    const named = next.filter((n) => !n.isOtherBucket);
    expect(named.length).toBeGreaterThanOrEqual(getDensityPreset('sparse').minKeepPerParent);
  });
});
