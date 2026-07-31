import { describe, it, expect } from 'vitest';
import { syncReportToDom, setPanelCache, getPanelCache } from '../hooks/usePanelHealth';

describe('syncReportToDom', () => {
  it('never keeps status ok when tab is not mounted', () => {
    const r = syncReportToDom({
      status: 'ok',
      fetchOk: true,
      displayOk: true,
      confirmOk: true,
      elPresent: true,
    }, { mounted: false });
    expect(r.status).not.toBe('ok');
    expect(r.displayOk).toBe(false);
    expect(r.confirmOk).toBe(false);
    expect(r.status).toBe('pending');
  });

  it('demotes ok without elPresent when mounted', () => {
    const r = syncReportToDom({
      status: 'ok',
      fetchOk: true,
      displayOk: true,
      confirmOk: true,
      elPresent: false,
    }, { mounted: true });
    expect(r.status).not.toBe('ok');
  });

  it('demotes ok when any gate is false', () => {
    const r = syncReportToDom({
      status: 'ok',
      fetchOk: true,
      displayOk: false,
      confirmOk: true,
      elPresent: true,
    }, { mounted: true });
    expect(r.status).not.toBe('ok');
  });

  it('setPanelCache demotes bare string ok', () => {
    setPanelCache({ bonds: { yield: 'ok' } });
    const c = getPanelCache();
    expect(c.bonds.yield.status).not.toBe('ok');
  });
});
