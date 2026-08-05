import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readOperatorMode, writeOperatorMode } from '../hub/lib/operatorMode.js';

describe('operatorMode', () => {
  beforeEach(() => {
    localStorage.removeItem('hub-operator-mode');
    // reset query
    window.history.replaceState({}, '', '/');
  });
  afterEach(() => {
    localStorage.removeItem('hub-operator-mode');
    window.history.replaceState({}, '', '/');
  });

  it('defaults to consumer (false)', () => {
    expect(readOperatorMode()).toBe(false);
  });

  it('persists operator on', () => {
    writeOperatorMode(true);
    expect(readOperatorMode()).toBe(true);
    writeOperatorMode(false);
    expect(readOperatorMode()).toBe(false);
  });

  it('URL verify=1 forces operator', () => {
    window.history.replaceState({}, '', '/?verify=1');
    expect(readOperatorMode()).toBe(true);
  });
});
