import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { applyEnvAliases, envKey } from '../lib/envAliases.js';

describe('applyEnvAliases', () => {
  const keys = ['CENSUS_API_KEY', 'CENSUS-API-KEY', 'FRED_API_KEY', 'FRED-API-KEY'];
  let backup;

  beforeEach(() => {
    backup = {};
    for (const k of keys) {
      backup[k] = process.env[k];
      delete process.env[k];
    }
  });

  afterEach(() => {
    for (const k of keys) {
      if (backup[k] === undefined) delete process.env[k];
      else process.env[k] = backup[k];
    }
  });

  it('maps CENSUS-API-KEY to CENSUS_API_KEY', () => {
    process.env['CENSUS-API-KEY'] = 'test-census-value';
    const { applied } = applyEnvAliases(process.env);
    expect(process.env.CENSUS_API_KEY).toBe('test-census-value');
    expect(applied.some((a) => a.includes('CENSUS'))).toBe(true);
  });

  it('does not overwrite existing canonical key', () => {
    process.env.CENSUS_API_KEY = 'canonical';
    process.env['CENSUS-API-KEY'] = 'hyphen';
    applyEnvAliases(process.env);
    expect(process.env.CENSUS_API_KEY).toBe('canonical');
  });

  it('envKey resolves either form', () => {
    process.env['CENSUS-API-KEY'] = 'from-hyphen';
    expect(envKey('CENSUS_API_KEY')).toBe('from-hyphen');
  });
});
