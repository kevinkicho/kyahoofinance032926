import { describe, it, expect } from 'vitest';
import { syncReportToDom, setPanelCache, getPanelCache } from '../hooks/usePanelHealth';

describe('syncReportToDom / splash cache', () => {
  it('never keeps status ok when tab is not visible', () => {
    const r = syncReportToDom({
      status: 'ok',
      fetchOk: true,
      displayOk: true,
      confirmOk: true,
      elPresent: true,
    }, { mounted: false });
    expect(r.status).not.toBe('ok');
    expect(r.status).toBe('pending');
  });

  it('keeps pending when inactive and fetchOk with former missing status', () => {
    const r = syncReportToDom({
      status: 'missing',
      fetchOk: true,
      displayOk: false,
      confirmOk: false,
      elPresent: false,
      fetchDetail: 'field has data',
    }, { mounted: false });
    expect(r.status).toBe('pending');
    expect(r.fetchOk).toBe(true);
  });

  it('is red when inactive and fetch failed with payload', () => {
    const r = syncReportToDom({
      status: 'null',
      fetchOk: false,
      displayOk: false,
      confirmOk: false,
      elPresent: false,
      fetchDetail: 'placeholders 0/3 required',
      fetchedOn: '2026-07-30',
    }, { mounted: false });
    // derivePanelSignal: marketHasPayload inferred from fetchDetail/fetchedOn
    expect(r.status).toBe('null');
    expect(r.fetchOk).toBe(false);
  });

  it('setPanelCache never keeps splash green', () => {
    setPanelCache({
      bonds: {
        yield: {
          status: 'ok',
          fetchOk: true,
          displayOk: true,
          confirmOk: true,
          elPresent: true,
        },
      },
    });
    const c = getPanelCache();
    expect(c.bonds.yield.status).toBe('pending');
    expect(c.bonds.yield.displayOk).toBe(false);
    expect(c.bonds.yield.confirmOk).toBe(false);
    expect(c.bonds.yield.fetchOk).toBe(true);
  });

  it('setPanelCache demotes bare string ok', () => {
    setPanelCache({ bonds: { yield: 'ok' } });
    const c = getPanelCache();
    expect(c.bonds.yield.status).not.toBe('ok');
  });
});
