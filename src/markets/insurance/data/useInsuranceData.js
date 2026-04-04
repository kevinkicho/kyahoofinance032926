import { useState, useEffect } from 'react';
import {
  catBondSpreads as mockCatBondSpreads,
  combinedRatioData as mockCombinedRatioData,
  reserveAdequacyData as mockReserveAdequacyData,
  reinsurancePricing,
} from './mockInsuranceData';

const SERVER = 'http://localhost:3001';
const HY_OAS_BASELINE = 350;

function scaleCatBondSpreads(bonds, hyOAS) {
  if (!hyOAS) return bonds;
  const factor = hyOAS / HY_OAS_BASELINE;
  return bonds.map(b => ({ ...b, spread: Math.round(b.spread * factor) }));
}

export function useInsuranceData() {
  const [catBondSpreads, setCatBondSpreads]         = useState(mockCatBondSpreads);
  const [combinedRatioData, setCombinedRatioData]   = useState(mockCombinedRatioData);
  const [reserveAdequacyData, setReserveAdequacyData] = useState(mockReserveAdequacyData);
  const [reinsurers, setReinsurers]                 = useState([]);
  const [hyOAS, setHyOAS]                           = useState(null);
  const [igOAS, setIgOAS]                           = useState(null);
  const [isLive, setIsLive]                         = useState(false);
  const [lastUpdated, setLastUpdated]               = useState('Mock data — Apr 2025');
  const [isLoading, setIsLoading]                   = useState(true);

  useEffect(() => {
    fetch(`${SERVER}/api/insurance`)
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(data => {
        if (data.combinedRatioData?.quarters?.length) setCombinedRatioData(data.combinedRatioData);
        if (data.reserveAdequacyData?.lines?.length)  setReserveAdequacyData(data.reserveAdequacyData);
        if (data.reinsurers)                           setReinsurers(data.reinsurers);
        if (data.hyOAS != null)                        setHyOAS(data.hyOAS);
        if (data.igOAS != null)                        setIgOAS(data.igOAS);
        setCatBondSpreads(scaleCatBondSpreads(mockCatBondSpreads, data.hyOAS));
        setIsLive(true);
        setLastUpdated(data.lastUpdated || new Date().toISOString().split('T')[0]);
      })
      .catch(() => {}) // silent fallback to mock
      .finally(() => setIsLoading(false));
  }, []);

  return {
    catBondSpreads,
    combinedRatioData,
    reserveAdequacyData,
    reinsurancePricing,
    reinsurers,
    hyOAS,
    igOAS,
    isLive,
    lastUpdated,
    isLoading,
  };
}
