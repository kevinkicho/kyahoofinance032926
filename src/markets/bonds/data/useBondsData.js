import { useState, useEffect } from 'react';
import {
  yieldCurveData as mockYieldCurveData,
  creditRatingsData,
  spreadData as mockSpreadData,
  durationLadderData,
  spreadIndicators as mockSpreadIndicators,
} from './mockBondsData';

const SERVER = '';

// Mock 10yr anchors for international curve scaling
const MOCK_10Y = { DE: 2.65, JP: 0.72, GB: 4.25, IT: 4.05, FR: 3.10, AU: 4.30 };

function scaleCurve(mockCurve, live10y, mock10y) {
  if (!live10y || !mock10y || mock10y === 0) return mockCurve;
  const factor = live10y / mock10y;
  const scaled = {};
  for (const [tenor, val] of Object.entries(mockCurve)) {
    if (val == null) {
      scaled[tenor] = val;
    } else {
      scaled[tenor] = tenor === '10y' ? live10y : Math.round(val * factor * 100) / 100;
    }
  }
  return scaled;
}

function mergeYieldCurves(serverData, mock) {
  const merged = { ...mock };
  const liveUS = serverData?.US;
  if (liveUS) {
    merged.US = { ...mock.US };
    for (const [tenor, val] of Object.entries(liveUS)) {
      if (val != null) merged.US[tenor] = val;
    }
  }
  for (const cc of ['DE', 'JP', 'GB', 'IT', 'FR', 'AU']) {
    const live10y = serverData?.[cc]?.['10y'];
    if (live10y != null) {
      merged[cc] = scaleCurve(mock[cc] || {}, live10y, MOCK_10Y[cc]);
    }
  }
  return merged;
}

export function useBondsData() {
  const [yieldCurveData, setYieldCurveData]   = useState(mockYieldCurveData);
  const [spreadData, setSpreadData]           = useState(mockSpreadData);
  const [spreadIndicators, setSpreadIndicators] = useState(mockSpreadIndicators);
  const [treasuryRates, setTreasuryRates]     = useState(null);
  const [isLive, setIsLive]                   = useState(false);
  const [lastUpdated, setLastUpdated]         = useState('Mock data — Apr 2025');
  const [isLoading, setIsLoading]             = useState(true);
  const [fetchedOn, setFetchedOn]             = useState(null);
  const [isCurrent, setIsCurrent]             = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const r = await fetch(`${SERVER}/api/bonds`);
        if (!r.ok) throw new Error(r.status);
        const data = await r.json();
        if (data.yieldCurveData) setYieldCurveData(mergeYieldCurves(data.yieldCurveData, mockYieldCurveData));
        if (data.spreadData?.dates?.length === 12) setSpreadData(data.spreadData);
        if (data.spreadIndicators && Object.keys(data.spreadIndicators).length >= 3) {
          setSpreadIndicators(data.spreadIndicators);
        }
        if (data.treasuryRates && Object.values(data.treasuryRates).some(v => v != null)) {
          setTreasuryRates(data.treasuryRates);
        }
        setIsLive(true);
        setLastUpdated(data.lastUpdated || new Date().toISOString().split('T')[0]);
        if (data.fetchedOn) setFetchedOn(data.fetchedOn);
        setIsCurrent(!!data.isCurrent);
      } catch {
        // silent fallback to mock
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  return { yieldCurveData, creditRatingsData, spreadData, spreadIndicators, durationLadderData, treasuryRates, isLive, lastUpdated, isLoading, fetchedOn, isCurrent };
}
