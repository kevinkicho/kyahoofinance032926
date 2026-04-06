import { useState, useEffect, useCallback } from 'react';
import { fetchWithRetry } from '../../../utils/fetchWithRetry';
import { useInterval } from '../../../hooks/useInterval';
import {
  catBondSpreads as mockCatBondSpreads,
  combinedRatioData as mockCombinedRatioData,
  reserveAdequacyData as mockReserveAdequacyData,
  reinsurancePricing,
  fredHyOasHistory as mockFredHyOasHistory,
} from './mockInsuranceData';

const SERVER = '';
const HY_OAS_BASELINE = 350;

function scaleCatBondSpreads(bonds, hyOAS) {
  if (!hyOAS) return bonds;
  const factor = hyOAS / HY_OAS_BASELINE;
  return bonds.map(b => ({ ...b, spread: Math.round(b.spread * factor) }));
}

export function useInsuranceData(autoRefresh = false) {
  const [catBondSpreads, setCatBondSpreads]         = useState(mockCatBondSpreads);
  const [combinedRatioData, setCombinedRatioData]   = useState(mockCombinedRatioData);
  const [reserveAdequacyData, setReserveAdequacyData] = useState(mockReserveAdequacyData);
  const [reinsurers, setReinsurers]                 = useState([]);
  const [hyOAS, setHyOAS]                           = useState(null);
  const [igOAS, setIgOAS]                           = useState(null);
  const [fredHyOasHistory, setFredHyOasHistory]     = useState(mockFredHyOasHistory);
  const [isLive, setIsLive]                         = useState(false);
  const [lastUpdated, setLastUpdated]               = useState('Mock data — Apr 2025');
  const [isLoading, setIsLoading]                   = useState(true);
  const [fetchedOn, setFetchedOn]                   = useState(null);
  const [isCurrent, setIsCurrent]                   = useState(false);
  const [sectorETF, setSectorETF]                   = useState(null);
  const [catBondProxy, setCatBondProxy]             = useState(null);
  const [industryAvgCombinedRatio, setIndustryAvgCombinedRatio] = useState(null);
  const [treasury10y, setTreasury10y]               = useState(null);

  const refetch = useCallback(() => {
    fetchWithRetry(`${SERVER}/api/insurance`)
      .then(r => r.json())
      .then(data => {
        if (data.combinedRatioData?.quarters?.length) setCombinedRatioData(data.combinedRatioData);
        if (data.reserveAdequacyData?.lines?.length)  setReserveAdequacyData(data.reserveAdequacyData);
        if (data.reinsurers)                           setReinsurers(data.reinsurers);
        if (data.hyOAS != null)                        setHyOAS(data.hyOAS);
        if (data.igOAS != null)                        setIgOAS(data.igOAS);
        setCatBondSpreads(scaleCatBondSpreads(mockCatBondSpreads, data.hyOAS));
        if (data.fredHyOasHistory?.dates?.length >= 20) setFredHyOasHistory(data.fredHyOasHistory);
        if (data.sectorETF)                          setSectorETF(data.sectorETF);
        if (data.catBondProxy)                        setCatBondProxy(data.catBondProxy);
        if (data.industryAvgCombinedRatio != null)    setIndustryAvgCombinedRatio(data.industryAvgCombinedRatio);
        if (data.treasury10y != null)                 setTreasury10y(data.treasury10y);
        setIsLive(true);
        setLastUpdated(data.lastUpdated || new Date().toISOString().split('T')[0]);
        if (data.fetchedOn) setFetchedOn(data.fetchedOn);
        setIsCurrent(!!data.isCurrent);
      })
      .catch(() => {}) // silent fallback to mock
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  useInterval(refetch, autoRefresh ? 300000 : null);

  return {
    catBondSpreads,
    combinedRatioData,
    reserveAdequacyData,
    reinsurancePricing,
    reinsurers,
    hyOAS,
    igOAS,
    fredHyOasHistory,
    sectorETF,
    catBondProxy,
    industryAvgCombinedRatio,
    treasury10y,
    isLive,
    lastUpdated,
    isLoading,
    fetchedOn,
    isCurrent,
  };
}
