/**
 * Flash/splash presentation honesty — green means true UI, not bridge-only.
 */
import { describe, it, expect } from 'vitest';
import {
  panelChipKind,
  marketSplashKind,
  marketPanelTallies,
  countStatuses,
} from '../hub/lib/panelHealthEval.js';

describe('panelChipKind', () => {
  it('maps true UI to ui (full green)', () => {
    expect(panelChipKind({
      status: 'ok',
      fetchOk: true,
      displayOk: true,
      confirmOk: true,
      uiOk: true,
      bridgeOnly: false,
      healthQuality: 'ui',
    })).toBe('ui');
  });

  it('never paints bridge-only as ui', () => {
    expect(panelChipKind({
      status: 'ok',
      fetchOk: true,
      displayOk: true,
      confirmOk: true,
      uiOk: false,
      bridgeOnly: true,
      healthQuality: 'bridge',
    })).toBe('bridge');
  });

  it('treats healthQuality bridge as bridge even if bridgeOnly missing', () => {
    expect(panelChipKind({
      status: 'ok',
      uiOk: false,
      healthQuality: 'bridge',
    })).toBe('bridge');
  });

  it('maps fetch fail to null (red)', () => {
    expect(panelChipKind({
      status: 'null',
      fetchOk: false,
      displayOk: false,
      confirmOk: false,
    })).toBe('null');
  });

  it('maps fetch ok without display to pending (grey)', () => {
    expect(panelChipKind({
      status: 'pending',
      fetchOk: true,
      displayOk: false,
      confirmOk: false,
    })).toBe('pending');
  });

  it('uses market loading when report missing', () => {
    expect(panelChipKind(null, 'loading')).toBe('loading');
    expect(panelChipKind(undefined, 'pending')).toBe('pending');
  });
});

describe('marketSplashKind', () => {
  it('does not go full green from payload-only load status', () => {
    // Classic false signal: ctx.data set → marketStatus ok, but panels incomplete.
    const kind = marketSplashKind({
      marketLoadStatus: 'ok',
      panelIds: ['a', 'b', 'c'],
      reports: {
        a: { status: 'null', fetchOk: false },
        b: { status: 'pending', fetchOk: true },
        c: { status: 'ok', uiOk: false, bridgeOnly: true, healthQuality: 'bridge' },
      },
    });
    expect(kind).not.toBe('ok');
    expect(kind).toBe('partial');
  });

  it('is ok only when every panel is true UI', () => {
    expect(marketSplashKind({
      marketLoadStatus: 'ok',
      panelIds: ['a', 'b'],
      reports: {
        a: { status: 'ok', uiOk: true, healthQuality: 'ui' },
        b: { status: 'ok', uiOk: true, healthQuality: 'ui' },
      },
    })).toBe('ok');
  });

  it('is bridge when all operational but some bridge-only', () => {
    expect(marketSplashKind({
      marketLoadStatus: 'ok',
      panelIds: ['a', 'b'],
      reports: {
        a: { status: 'ok', uiOk: true, healthQuality: 'ui' },
        b: { status: 'ok', uiOk: false, bridgeOnly: true, healthQuality: 'bridge' },
      },
    })).toBe('bridge');
  });

  it('stays loading while market is loading', () => {
    expect(marketSplashKind({
      marketLoadStatus: 'loading',
      panelIds: ['a'],
      reports: {},
    })).toBe('loading');
  });
});

describe('marketPanelTallies + countStatuses alignment', () => {
  it('tallies split ui vs bridge', () => {
    const reports = {
      a: { status: 'ok', uiOk: true, healthQuality: 'ui' },
      b: { status: 'ok', uiOk: false, bridgeOnly: true, healthQuality: 'bridge' },
      c: { status: 'null', fetchOk: false },
    };
    expect(marketPanelTallies(reports, ['a', 'b', 'c'])).toEqual({
      total: 3,
      ui: 1,
      bridge: 1,
      bad: 1,
      loading: 0,
      dataReady: 2, // L1: ui + bridge both imply data ready
      operationalOk: 2,
    });
  });

  it('countStatuses still reports operational ok separately from ui', () => {
    const byMarket = {
      equities: {
        heatmap: {
          status: 'ok',
          uiOk: false,
          bridgeOnly: true,
          healthQuality: 'bridge',
          fetchOk: true,
          displayOk: true,
          confirmOk: true,
        },
        list: {
          status: 'ok',
          uiOk: true,
          healthQuality: 'ui',
          fetchOk: true,
          displayOk: true,
          confirmOk: true,
        },
        bad: {
          status: 'null',
          fetchOk: false,
          displayOk: false,
          confirmOk: false,
        },
      },
    };
    const c = countStatuses(byMarket);
    expect(c.ok).toBe(2);
    expect(c.okUi).toBe(1);
    expect(c.okBridge).toBe(1);
    expect(c.bad).toBe(1);
    expect(c.fetchFail).toBe(1);
  });
});
