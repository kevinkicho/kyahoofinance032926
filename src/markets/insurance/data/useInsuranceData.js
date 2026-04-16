import { useState, useEffect, useCallback } from 'react';
import { fetchWithRetry } from '../../../utils/fetchWithRetry';
import { useInterval } from '../../../hooks/useInterval';
import { useDataStatus } from '../../../hooks/useDataStatus';
import { catBondSpreads as mockCatBond, combinedRatioData as mockCombinedRatio, reserveAdequacyData as mockReserveAdequacy, reinsurancePricing as mockReinsPricing, fredHyOasHistory as mockFredHyOas, catLosses as mockCatLosses, combinedRatioHistory as mockCombinedRatioHistory } from './mockInsuranceData';

const SERVER = '';
const HY_OAS_BASELINE = 350;

function scaleCatBondSpreads(bonds, hyOAS) {
  if (!hyOAS) return bonds;
  const factor = hyOAS / HY_OAS_BASELINE;
  return bonds.map(b => ({ ...b, spread: Math.round(b.spread * factor) }));
}

export function useInsuranceData(autoRefresh = false, refreshKey = 0, { disabled = false } = {}) {
  const [catBondSpreads, setCatBondSpreads]         = useState(mockCatBond);
  const [combinedRatioData, setCombinedRatioData]   = useState(mockCombinedRatio);
  const [reserveAdequacyData, setReserveAdequacyData] = useState(mockReserveAdequacy);
  const [reinsurancePricing, setReinsurancePricing] = useState(mockReinsPricing);
  const [reinsurers, setReinsurers]                 = useState([]);
  const [hyOAS, setHyOAS]                           = useState(null);
  const [igOAS, setIgOAS]                           = useState(null);
  const [fredHyOasHistory, setFredHyOasHistory]     = useState(mockFredHyOas);
  const [sectorETF, setSectorETF]                   = useState(null);
  const [catBondProxy, setCatBondProxy]             = useState(null);
  const [industryAvgCombinedRatio, setIndustryAvgCombinedRatio] = useState(null);
  const [treasury10y, setTreasury10y]               = useState(null);
  const [catLosses, setCatLosses]                   = useState(mockCatLosses);
  const [combinedRatioHistory, setCombinedRatioHistory] = useState(mockCombinedRatioHistory);

  // Status with error handling
  const { isLive, isLoading, error, lastUpdated, fetchedOn, isCurrent, fetchLog, logFetch, handleSuccess, handleError, handleFinally } = useDataStatus();

  const refetch = useCallback(() => {
    const t0 = Date.now();
    fetchWithRetry(`${SERVER}/api/insurance`)
      .then(r => r.json())
      .then(data => {
        if (data.combinedRatioData?.quarters?.length) setCombinedRatioData(data.combinedRatioData);
        if (data.reserveAdequacyData?.lines?.length)  setReserveAdequacyData(data.reserveAdequacyData);
        if (data.reinsurancePricing?.length)            setReinsurancePricing(data.reinsurancePricing);
        if (data.reinsurers)                           setReinsurers(data.reinsurers);
        if (data.hyOAS != null)                        setHyOAS(data.hyOAS);
        if (data.igOAS != null)                        setIgOAS(data.igOAS);
        if (data.catBondSpreads?.length)               setCatBondSpreads(scaleCatBondSpreads(data.catBondSpreads, data.hyOAS));
        else if (data.hyOAS != null)                    setCatBondSpreads(scaleCatBondSpreads(mockCatBond, data.hyOAS));
        if (data.fredHyOasHistory?.dates?.length) setFredHyOasHistory(data.fredHyOasHistory);
        if (data.sectorETF)                          setSectorETF(data.sectorETF);
        if (data.catBondProxy)                        setCatBondProxy(data.catBondProxy);
        if (data.industryAvgCombinedRatio != null)    setIndustryAvgCombinedRatio(data.industryAvgCombinedRatio);
        if (data.treasury10y != null)                 setTreasury10y(data.treasury10y);
        if (data.catLosses?.values?.length)    setCatLosses(data.catLosses);
        if (data.combinedRatioHistory?.values?.length) setCombinedRatioHistory(data.combinedRatioHistory);
        handleSuccess(data);
        logFetch({ url: '/api/insurance', status: 200, duration: Date.now() - t0, sources: {
          combinedRatioData: !!data.combinedRatioData?.quarters?.length,
          reserveAdequacyData: !!data.reserveAdequacyData?.lines?.length,
          reinsurancePricing: !!data.reinsurancePricing?.length,
          reinsurers: !!data.reinsurers,
          hyOAS: data.hyOAS != null,
          igOAS: data.igOAS != null,
          catBondSpreads: !!data.catBondSpreads?.length,
          fredHyOasHistory: !!data.fredHyOasHistory?.dates?.length,
          sectorETF: !!data.sectorETF,
          catBondProxy: !!data.catBondProxy,
          industryAvgCombinedRatio: data.industryAvgCombinedRatio != null,
          treasury10y: data.treasury10y != null,
          catLosses: !!data.catLosses?.values?.length,
          combinedRatioHistory: !!data.combinedRatioHistory?.values?.length,
        }, seriesIds: ['BAMLH0A0HYM2', 'BAMLC0A0CM', 'DGS10', 'WALCL', 'CPIAUCSL'] });
      })
      .catch((err) => {
        handleError(err, 'Insurance');
        logFetch({ url: '/api/insurance', status: 0, duration: Date.now() - t0, error: err?.message || String(err) });
      })
      .finally(() => handleFinally());
  }, [handleSuccess, handleError, handleFinally, logFetch]);

  useEffect(() => { if (!disabled) refetch(); }, [disabled]);
  useEffect(() => { if (refreshKey > 0 && !disabled) refetch(); }, [refreshKey, disabled]);

  useInterval(refetch, (!disabled && autoRefresh) ? 300000 : null);

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
    fetchLog,
    refetch,
  };
}
