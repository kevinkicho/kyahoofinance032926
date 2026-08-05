import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  buildMarketMetaFields,
  isFirestoreMetaEnabled,
  getGcpProjectId,
  COL_DIGEST,
} from '../lib/firestoreMeta.js';

describe('firestoreMeta helpers', () => {
  const prev = { ...process.env };

  afterEach(() => {
    process.env = { ...prev };
  });

  it('buildMarketMetaFields never embeds bulk payload keys as nested objects', () => {
    const data = {
      fetchedOn: '2026-08-04',
      isLive: true,
      yieldCurveData: { US: { '10y': 4.2 } },
      fredYieldHistory: { dates: ['a'], values: [1] },
    };
    const fields = buildMarketMetaFields('bonds', data, { bytes: 12345 });
    expect(fields.marketId).toBe('bonds');
    expect(fields.fetchedOn).toBe('2026-08-04');
    expect(fields.bytes).toBe(12345);
    expect(fields.keyCount).toBeGreaterThanOrEqual(2);
    expect(fields.schemaVersion).toBe(2);
    expect(fields.digestCollection).toBe(COL_DIGEST);
    expect(fields.yieldCurveData).toBeUndefined();
    expect(typeof fields.updatedAt).toBe('string');
  });

  it('isCurrent true when fetchedOn is today', () => {
    const today = new Date().toISOString().slice(0, 10);
    const fields = buildMarketMetaFields('fx', { fetchedOn: today });
    expect(fields.isCurrent).toBe(true);
  });

  it('isFirestoreMetaEnabled respects explicit off', () => {
    process.env.FIRESTORE_MARKET_META = '0';
    delete process.env.K_SERVICE;
    expect(isFirestoreMetaEnabled()).toBe(false);
  });

  it('isFirestoreMetaEnabled true when forced on', () => {
    process.env.FIRESTORE_MARKET_META = 'true';
    expect(isFirestoreMetaEnabled()).toBe(true);
  });

  it('getGcpProjectId has fallback', () => {
    delete process.env.GOOGLE_CLOUD_PROJECT;
    delete process.env.GCLOUD_PROJECT;
    delete process.env.GCP_PROJECT;
    delete process.env.FIREBASE_PROJECT_ID;
    expect(getGcpProjectId()).toBeTruthy();
  });
});
