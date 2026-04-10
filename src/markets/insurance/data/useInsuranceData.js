import { useState, useEffect, useCallback } from 'react';
import { fetchWithRetry } from '../../../utils/fetchWithRetry';
import { useInterval } from '../../../hooks/useInterval';
import { useDataStatus } from '../../../hooks/useDataStatus';
import {
  catBondSpreads as mockCatBondSpreads,
  combinedRatioData as mockCombinedRatioData,
  reserveAdequacyData as mockReserveAdequacyData,
  reinsurancePricing,
  fredHyOasHistory as mockFredHyOasHistory,
  catLosses as mockCatLosses,
  combinedRatioHistory as mockCombinedRatioHistory,
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
  const [sectorETF, setSectorETF]                   = useState(null);
  const [catBondProxy, setCatBondProxy]             = useState(null);
  const [industryAvgCombinedRatio, setIndustryAvgCombinedRatio] = useState(null);
  const [treasury10y, setTreasury10y]               = useState(null);
  const [catLosses, setCatLosses]                   = useState(mockCatLosses);
  const [combinedRatioHistory, setCombinedRatioHistory] = useState(mockCombinedRatioHistory);

  // Status with error handling
  const { isLive, isLoading, error, lastUpdated, fetchedOn, isCurrent, handleSuccess, handleError, handleFinally } = useDataStatus();

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
        if (data.catLosses?.values?.length >= 12)    setCatLosses(data.catLosses);
        if (data.combinedRatioHistory?.values?.length >= 4) setCombinedRatioHistory(data.combinedRatioHistory);
        handleSuccess(data);
      })
      .catch((err) => handleError(err, 'Insurance'))
      .finally(() => handleFinally());
  }, [handleSuccess, handleError, handleFinally]);

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
    catLosses,
    combinedRatioHistory,
    isLive,
    lastUpdated,
    isLoading,
    error,
    fetchedOn,
    isCurrent,
  };
}
