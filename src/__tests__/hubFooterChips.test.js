import { describe, it, expect } from 'vitest';
import {
  resolveDiskCacheInfo,
  deriveFooterChip,
  buildFooterChipTooltip,
  CACHE_STATUS_KEYS,
} from '../hub/HubFooter.jsx';

describe('resolveDiskCacheInfo', () => {
  const cacheStatus = {
    today: '2026-08-04',
    status: {
      commodities: { fetchedOn: null, isCurrent: false },
      commodities_enhanced: { fetchedOn: '2026-08-04', isCurrent: true },
      equityDeepDive: { fetchedOn: '2026-08-04', isCurrent: true },
      bonds: { fetchedOn: '2026-08-03', isCurrent: false },
    },
  };

  it('maps commodities → commodities_enhanced (not hollow commodities key)', () => {
    const info = resolveDiskCacheInfo(cacheStatus, 'commodities');
    expect(info.cacheKey).toBe('commodities_enhanced');
    expect(info.isCurrent).toBe(true);
  });

  it('maps equitiesDeepDive → equityDeepDive', () => {
    const info = resolveDiskCacheInfo(cacheStatus, 'equitiesDeepDive');
    expect(info.cacheKey).toBe('equityDeepDive');
    expect(info.isCurrent).toBe(true);
  });

  it('returns bonds stale when only prior-day disk', () => {
    const info = resolveDiskCacheInfo(cacheStatus, 'bonds');
    expect(info.fetchedOn).toBe('2026-08-03');
    expect(info.isCurrent).toBe(false);
  });

  it('documents alias keys', () => {
    expect(CACHE_STATUS_KEYS.commodities).toContain('commodities_enhanced');
  });
});

describe('deriveFooterChip', () => {
  it('prefers live session over disk', () => {
    const chip = deriveFooterChip(
      'bonds',
      { data: { x: 1 }, isLive: true, isCurrent: true, fetchedOn: '2026-08-04' },
      { fetchedOn: '2026-08-04', isCurrent: true },
      '2026-08-04',
    );
    expect(chip.kind).toBe('live');
    expect(chip.short).toMatch(/Bonds/);
  });

  it('shows current for same-day cache without isLive', () => {
    const chip = deriveFooterChip(
      'derivatives',
      { data: { x: 1 }, isLive: false, isCurrent: true, fetchedOn: '2026-08-04' },
      { fetchedOn: '2026-08-04', isCurrent: true },
      '2026-08-04',
    );
    expect(chip.kind).toBe('current');
  });

  it('shows stale when only old fetch', () => {
    const chip = deriveFooterChip(
      'realEstate',
      { data: { x: 1 }, isLive: false, isCurrent: false, fetchedOn: '2026-08-01' },
      { fetchedOn: '2026-08-01', isCurrent: false },
      '2026-08-04',
    );
    expect(chip.kind).toBe('stale');
  });

  it('shows stale for explicit isStale last-good prior cache', () => {
    const chip = deriveFooterChip(
      'bonds',
      {
        data: { x: 1, _cacheSource: 'prior_day' },
        isLive: false,
        isCurrent: false,
        isStale: true,
        fetchedOn: '2026-08-02',
      },
      null,
      '2026-08-04',
    );
    expect(chip.kind).toBe('stale');
    expect(chip.short).toMatch(/08-02|stale/);
  });

  it('shows loading when fetching with no data', () => {
    const chip = deriveFooterChip(
      'bonds',
      { isLoading: true, data: null },
      null,
      '2026-08-04',
    );
    expect(chip.kind).toBe('loading');
  });

  it('shows error when failed without payload', () => {
    const chip = deriveFooterChip(
      'bonds',
      { error: 'upstream 503', data: null },
      null,
      '2026-08-04',
    );
    expect(chip.kind).toBe('error');
  });

  it('does not mark commodities empty when enhanced disk is current', () => {
    const chip = deriveFooterChip(
      'commodities',
      null,
      { fetchedOn: '2026-08-04', isCurrent: true, cacheKey: 'commodities_enhanced' },
      '2026-08-04',
    );
    expect(chip.kind).toBe('current');
  });
});

describe('buildFooterChipTooltip', () => {
  it('includes primary API and sources for bonds', () => {
    const chip = { kind: 'current', label: 'Bonds', short: 'Bonds ✓' };
    const tip = buildFooterChipTooltip({
      marketId: 'bonds',
      chip,
      marketCtx: {
        data: { yieldCurveData: {} },
        isLive: false,
        isCurrent: true,
        fetchedOn: '2026-08-04',
        fetchLog: [{ url: '/api/bonds', status: 200, time: '12:00' }],
      },
      diskInfo: { fetchedOn: '2026-08-04', isCurrent: true, cacheKey: 'bonds' },
      today: '2026-08-04',
      cacheToday: '2026-08-04',
    });
    expect(tip).toMatch(/Primary API: \/api\/bonds/);
    expect(tip).toMatch(/Dependencies:/);
    expect(tip).toMatch(/FRED|Treasury|Upstream sources/i);
    expect(tip).toMatch(/Session:/);
    expect(tip).toMatch(/Cache index/);
  });

  it('includes deps for realEstate', () => {
    const tip = buildFooterChipTooltip({
      marketId: 'realEstate',
      chip: { kind: 'stale', label: 'Real Estate', short: 'Real Estate · stale' },
      marketCtx: { data: {}, isCurrent: false, fetchedOn: '2026-08-01' },
      diskInfo: { fetchedOn: '2026-08-01', isCurrent: false, cacheKey: 'realEstate' },
      today: '2026-08-04',
    });
    expect(tip).toMatch(/\/api\/realEstate/);
    expect(tip).toMatch(/census|fema/i);
  });
});
