/**
 * Server recovery planner — local fallback (no Ollama required).
 */
import { describe, it, expect } from 'vitest';
import { localPlanFromObservation } from '../routes/agentRecover.js';

describe('localPlanFromObservation', () => {
  it('plans deps then empty markets', () => {
    const plan = localPlanFromObservation({
      waitingDeps: ['imf'],
      markets: [
        { marketId: 'fx', isTab: true, symptom: 'waiting_cross', panelsFetchFail: 2, hasError: false },
        { marketId: 'equities', isTab: true, symptom: 'empty_market', panelsFetchFail: 4, hasError: true },
      ],
      summary: { incompletePanelCount: 6, marketsEmpty: 1 },
    }, { maxFetchesPerCycle: 6 });

    expect(plan.stop).toBe(false);
    expect(plan.actions.some((a) => a.tool === 'refetch_deps')).toBe(true);
    expect(plan.actions.some((a) => a.tool === 'refetch_market' && a.marketId === 'equities')).toBe(true);
  });

  it('noop when clean', () => {
    const plan = localPlanFromObservation({
      waitingDeps: [],
      markets: [{ marketId: 'bonds', isTab: true, symptom: 'ok', panelsFetchFail: 0 }],
      summary: { incompletePanelCount: 0, marketsEmpty: 0 },
    });
    expect(plan.stop).toBe(true);
    expect(plan.actions[0].tool).toBe('noop');
  });
});
