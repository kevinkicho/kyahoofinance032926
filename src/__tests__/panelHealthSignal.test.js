import { describe, it, expect } from 'vitest';
import {
  derivePanelSignal,
  findScopedPanelEl,
} from '../hub/lib/panelHealthSignal';

describe('derivePanelSignal', () => {
  it('loading while market fetching and no fetchOk', () => {
    const s = derivePanelSignal(
      { status: 'loading', fetchOk: false, displayOk: false, confirmOk: false },
      { tabVisible: false, marketLoading: true },
    );
    expect(s.kind).toBe('loading');
    expect(s.color).toBe('loading');
  });

  it('closed tab + fetchOk → pending grey, never red', () => {
    const s = derivePanelSignal(
      {
        status: 'null',
        fetchOk: true,
        displayOk: false,
        confirmOk: false,
        elPresent: false,
        displayDetail: 'panel not in DOM',
      },
      { tabVisible: false, marketLoading: false, marketHasPayload: true },
    );
    expect(s.kind).toBe('pending');
    expect(s.color).toBe('pending');
    expect(s.tooltip).toMatch(/open this tab/i);
  });

  it('closed tab + fetch failed after payload → red', () => {
    const s = derivePanelSignal(
      {
        status: 'null',
        fetchOk: false,
        displayOk: false,
        confirmOk: false,
        fetchDetail: 'placeholders 0/4 required',
      },
      { tabVisible: false, marketLoading: false, marketHasPayload: true },
    );
    expect(s.kind).toBe('failed');
    expect(s.color).toBe('null');
  });

  it('closed tab + no payload yet → pending not red', () => {
    const s = derivePanelSignal(
      {
        status: 'pending',
        fetchOk: false,
        fetchDetail: 'market payload not fetched',
      },
      { tabVisible: false, marketLoading: false, marketHasPayload: false },
    );
    expect(s.kind).toBe('pending');
  });

  it('open tab + all gates → verified green', () => {
    const s = derivePanelSignal(
      {
        status: 'ok',
        fetchOk: true,
        displayOk: true,
        confirmOk: true,
        elPresent: true,
      },
      { tabVisible: true, marketLoading: false, marketHasPayload: true },
    );
    expect(s.kind).toBe('verified');
    expect(s.color).toBe('ok');
  });

  it('open tab + fetchOk + still painting → pending not red', () => {
    const s = derivePanelSignal(
      {
        status: 'pending',
        fetchOk: true,
        displayOk: false,
        confirmOk: false,
        elPresent: true,
        displayDetail: 'no stamped metrics / chart series / dense table values',
      },
      { tabVisible: true, marketLoading: false, marketHasPayload: true },
    );
    expect(s.kind).toBe('pending');
    expect(s.color).toBe('pending');
  });

  it('open tab + fetchOk + empty shell → failed red', () => {
    const s = derivePanelSignal(
      {
        status: 'null',
        fetchOk: true,
        displayOk: false,
        confirmOk: false,
        elPresent: true,
        displayDetail: 'panel disabled / empty shell',
      },
      { tabVisible: true, marketLoading: false, marketHasPayload: true },
    );
    expect(s.kind).toBe('failed');
    expect(s.color).toBe('null');
  });

  it('waiting for cross-market dep is pending not red', () => {
    const s = derivePanelSignal(
      {
        status: 'pending',
        fetchOk: false,
        fetchDetail: 'waiting for cross-market: treasuryTIC',
      },
      { tabVisible: true, marketLoading: false, marketHasPayload: true },
    );
    expect(s.kind).toBe('pending');
    expect(s.color).toBe('pending');
  });

  it('splash-style false green demoted when closed', () => {
    // Even if report claims ok/display/confirm from splash DOM:
    const s = derivePanelSignal(
      {
        status: 'ok',
        fetchOk: true,
        displayOk: true,
        confirmOk: true,
        elPresent: true,
      },
      { tabVisible: false, marketLoading: false, marketHasPayload: true },
    );
    expect(s.kind).toBe('pending');
    expect(s.color).not.toBe('ok');
  });
});

describe('findScopedPanelEl', () => {
  it('does not steal another market panel when hub roots exist', () => {
    const root = document.createElement('div');
    root.innerHTML = `
      <div data-market-id="equities"><div data-panel-key="kpi">EQ</div></div>
    `;
    document.body.appendChild(root);
    // bonds never mounted — must not return equities kpi
    expect(findScopedPanelEl('bonds', 'kpi', document)).toBeNull();
    expect(findScopedPanelEl('equities', 'kpi', document)?.textContent).toBe('EQ');
    root.remove();
  });
});
