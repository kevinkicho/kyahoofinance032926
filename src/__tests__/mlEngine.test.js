import { describe, it, expect } from 'vitest';
import { TRAINING_DATA, normalizeFeatures, trainSectorModel, buildGlobalMacroEngine, predictMacroImpact } from '../utils/mlEngine.js';

describe('TRAINING_DATA', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(TRAINING_DATA)).toBe(true);
    expect(TRAINING_DATA.length).toBeGreaterThan(0);
  });

  it('each entry has required numeric fields', () => {
    for (const row of TRAINING_DATA) {
      expect(typeof row.risk).toBe('number');
      expect(typeof row.rate).toBe('number');
      expect(typeof row.inflation).toBe('number');
      expect(typeof row.ppi).toBe('number');
      expect(typeof row.gini).toBe('number');
    }
  });

  it('each entry has sector output multipliers', () => {
    const sectors = ['Technology', 'Financials', 'Energy', 'Healthcare', 'Consumer', 'Industrials'];
    for (const row of TRAINING_DATA) {
      expect(row).toHaveProperty('y');
      for (const sector of sectors) {
        expect(row.y, `${row.id} missing sector ${sector}`).toHaveProperty(sector);
        expect(typeof row.y[sector]).toBe('number');
      }
    }
  });
});

describe('normalizeFeatures', () => {
  it('returns one row per input row', () => {
    const normalized = normalizeFeatures(TRAINING_DATA);
    expect(normalized.length).toBe(TRAINING_DATA.length);
  });

  it('each row has 6 features (bias + 5 inputs)', () => {
    const normalized = normalizeFeatures(TRAINING_DATA);
    for (const row of normalized) {
      expect(row).toHaveLength(6);
    }
  });

  it('bias term (first element) is always 1', () => {
    const normalized = normalizeFeatures(TRAINING_DATA);
    for (const row of normalized) {
      expect(row[0]).toBe(1);
    }
  });

  it('all normalized values (except bias) are in [0, 1]', () => {
    const normalized = normalizeFeatures(TRAINING_DATA);
    for (const row of normalized) {
      for (let i = 1; i < row.length; i++) {
        expect(row[i]).toBeGreaterThanOrEqual(0);
        expect(row[i]).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('trainSectorModel', () => {
  const X = normalizeFeatures(TRAINING_DATA);
  const Y = TRAINING_DATA.map(d => d.y.Technology);

  it('returns an array of weights', () => {
    const weights = trainSectorModel(X, Y, 100);
    expect(Array.isArray(weights)).toBe(true);
    expect(weights).toHaveLength(6);
  });

  it('all weights are finite numbers', () => {
    const weights = trainSectorModel(X, Y, 100);
    for (const w of weights) {
      expect(typeof w).toBe('number');
      expect(isFinite(w)).toBe(true);
    }
  });

  it('returns weights array without throwing', () => {
    // Just verify it runs and returns 6 weights regardless of convergence
    const weights = trainSectorModel(X, Y, 10);
    expect(weights).toHaveLength(6);
    for (const w of weights) {
      expect(typeof w).toBe('number');
    }
  });
});

describe('buildGlobalMacroEngine', () => {
  const SECTORS = ['Technology', 'Financials', 'Energy', 'Healthcare', 'Consumer', 'Industrials'];

  it('returns an object with all six sectors', () => {
    const models = buildGlobalMacroEngine();
    for (const sector of SECTORS) {
      expect(models).toHaveProperty(sector);
    }
  });

  it('each sector model has the expected weight keys', () => {
    const models = buildGlobalMacroEngine();
    const expectedKeys = ['bias', 'w_risk', 'w_rate', 'w_inf', 'w_ppi', 'w_gini'];
    for (const sector of SECTORS) {
      for (const key of expectedKeys) {
        expect(models[sector], `${sector}.${key} missing`).toHaveProperty(key);
      }
    }
  });

  it('all weight values are numbers', () => {
    const models = buildGlobalMacroEngine();
    for (const sector of SECTORS) {
      for (const val of Object.values(models[sector])) {
        expect(typeof val).toBe('number');
      }
    }
  });
});

describe('predictMacroImpact', () => {
  const SECTORS = ['Technology', 'Financials', 'Energy', 'Healthcare', 'Consumer', 'Industrials'];

  it('returns predictions for all sectors', () => {
    const models = buildGlobalMacroEngine();
    const preds = predictMacroImpact(models, 75, 525, 3.1, 1.0, 48.5);
    for (const sector of SECTORS) {
      expect(preds).toHaveProperty(sector);
      expect(typeof preds[sector]).toBe('number');
    }
  });

  it('floors predictions at 0.1 (never negative)', () => {
    const models = buildGlobalMacroEngine();
    // Extreme input to try to force negatives
    const preds = predictMacroImpact(models, 0, 0, 0, -5, 35);
    for (const pred of Object.values(preds)) {
      expect(pred).toBeGreaterThanOrEqual(0.1);
    }
  });
});
