import { useState, useEffect, useCallback } from 'react';
import { fetchWithRetry } from '../../../utils/fetchWithRetry';
import { useInterval } from '../../../hooks/useInterval';
import { useDataStatus } from '../../../hooks/useDataStatus';
import {
  yieldCurveData as mockYieldCurveData,
  creditRatingsData,
  spreadData as mockSpreadData,
  durationLadderData,
  spreadIndicators as mockSpreadIndicators,
  breakevensData as mockBreakevensData,
  fredYieldHistory as mockFredYieldHistory,
  tipsYields as mockTipsYields,
  realYieldHistory as mockRealYieldHistory,
  macroData as mockMacroData,
  fedBalanceSheetHistory as mockFedBalanceHistory,
  m2HistoryData as mockM2History,
  creditIndices as mockCreditIndices,
  auctionData as mockAuctionData,
  nationalDebt as mockNationalDebt,
  spreadHistory as mockSpreadHistory,
  cpiComponents as mockCpiComponents,
  debtToGdpHistory as mockDebtToGdpHistory,
} from './mockBondsData';

const SERVER = '';

// Mock 10yr anchors for international curve scaling
const MOCK_10Y = { DE: 2.65, JP: 0.72, GB: 4.25, IT: 4.05, FR: 3.10, AU: 4.30, CA: 3.45, CH: 1.15, SE: 2.85, ES: 3.45, NL: 2.75, BE: 3.20, AT: 3.10, FI: 2.95, PT: 3.65, GR: 4.20, IE: 3.05, DK: 2.55, NO: 3.75, NZ: 4.55 };

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
  // Scale international curves based on live 10y
  for (const cc of Object.keys(MOCK_10Y)) {
    const live10y = serverData?.[cc]?.['10y'];
    if (live10y != null) {
      merged[cc] = scaleCurve(mock[cc] || { '10y': live10y }, live10y, MOCK_10Y[cc]);
    }
  }
  return merged;
}

export function useBondsData(autoRefresh = false) {
  // Core yield data
  const [yieldCurveData, setYieldCurveData] = useState(mockYieldCurveData);
  const [spreadData, setSpreadData] = useState(mockSpreadData);
  const [spreadIndicators, setSpreadIndicators] = useState(mockSpreadIndicators);
  const [breakevensData, setBreakevensData] = useState(mockBreakevensData);
  const [fredYieldHistory, setFredYieldHistory] = useState(mockFredYieldHistory);
  const [treasuryRates, setTreasuryRates] = useState(null);
  const [fedFundsFutures, setFedFundsFutures] = useState(null);
  const [yieldHistory, setYieldHistory] = useState(null);
  const [mortgageSpread, setMortgageSpread] = useState(null);

  // New data fields
  const [tipsYields, setTipsYields] = useState(mockTipsYields);
  const [realYieldHistory, setRealYieldHistory] = useState(mockRealYieldHistory);
  const [macroData, setMacroData] = useState(mockMacroData);
  const [fedBalanceSheetHistory, setFedBalanceSheetHistory] = useState(mockFedBalanceHistory);
  const [m2HistoryData, setM2HistoryData] = useState(mockM2History);
  const [creditIndices, setCreditIndices] = useState(mockCreditIndices);
  const [auctionData, setAuctionData] = useState(mockAuctionData);
  const [nationalDebt, setNationalDebt] = useState(mockNationalDebt);

  // Additional new data
  const [spreadHistory, setSpreadHistory] = useState(mockSpreadHistory);
  const [cpiComponents, setCpiComponents] = useState(mockCpiComponents);
  const [debtToGdpHistory, setDebtToGdpHistory] = useState(mockDebtToGdpHistory);

  // Status with error handling
  const { isLive, isLoading, error, lastUpdated, fetchedOn, isCurrent, handleSuccess, handleError, handleFinally } = useDataStatus();

  const refetch = useCallback(async () => {
    try {
      const r = await fetchWithRetry(`${SERVER}/api/bonds`);
      const data = await r.json();

      // Core yield curve
      if (data.yieldCurveData) setYieldCurveData(mergeYieldCurves(data.yieldCurveData, mockYieldCurveData));
      if (data.spreadData?.dates?.length === 12) setSpreadData(data.spreadData);
      if (data.spreadIndicators && Object.keys(data.spreadIndicators).length >= 3) {
        setSpreadIndicators(data.spreadIndicators);
      }
      if (data.breakevensData?.history?.dates?.length >= 20) {
        setBreakevensData(data.breakevensData);
      }
      if (data.fredYieldHistory?.dates?.length >= 20) {
        setFredYieldHistory(data.fredYieldHistory);
      }
      if (data.treasuryRates && Object.values(data.treasuryRates).some(v => v != null)) {
        setTreasuryRates(data.treasuryRates);
      }
      if (data.fedFundsFutures && Object.values(data.fedFundsFutures).some(v => v != null)) {
        setFedFundsFutures(data.fedFundsFutures);
      }
      if (data.yieldHistory?.dates?.length >= 20) {
        setYieldHistory(data.yieldHistory);
      }
      if (data.mortgageSpread != null) {
        setMortgageSpread(data.mortgageSpread);
      }

      // New data fields
      if (data.tipsYields && Object.values(data.tipsYields).some(v => v != null)) {
        setTipsYields(data.tipsYields);
      }
      if (data.realYieldHistory?.dates?.length >= 12) {
        setRealYieldHistory(data.realYieldHistory);
      }
      if (data.macroData && Object.keys(data.macroData).length > 0) {
        setMacroData(data.macroData);
      }
      if (data.fedBalanceSheetHistory?.dates?.length >= 12) {
        setFedBalanceSheetHistory(data.fedBalanceSheetHistory);
      }
      if (data.m2HistoryData?.dates?.length >= 12) {
        setM2HistoryData(data.m2HistoryData);
      }
      if (data.creditIndices && Object.keys(data.creditIndices).length > 0) {
        setCreditIndices(data.creditIndices);
      }
      if (data.auctionData && data.auctionData.length > 0) {
        setAuctionData(data.auctionData);
      }
      if (data.nationalDebt != null) {
        setNationalDebt(data.nationalDebt);
      }

      // Additional new data
      if (data.spreadHistory?.dates?.length >= 20) {
        setSpreadHistory(data.spreadHistory);
      }
      if (data.cpiComponents?.dates?.length >= 12) {
        setCpiComponents(data.cpiComponents);
      }
      if (data.debtToGdpHistory?.dates?.length >= 10) {
        setDebtToGdpHistory(data.debtToGdpHistory);
      }

      handleSuccess(data);
    } catch (err) {
      handleError(err, 'Bonds');
    } finally {
      handleFinally();
    }
  }, [handleSuccess, handleError, handleFinally]);

  useEffect(() => { refetch(); }, [refetch]);

  useInterval(refetch, autoRefresh ? 300000 : null);

  return {
    // Core data
    yieldCurveData,
    creditRatingsData,
    spreadData,
    spreadIndicators,
    durationLadderData,
    breakevensData,
    fredYieldHistory,
    treasuryRates,
    fedFundsFutures,
    yieldHistory,
    mortgageSpread,

    // New data
    tipsYields,
    realYieldHistory,
    macroData,
    fedBalanceSheetHistory,
    m2HistoryData,
    creditIndices,
    auctionData,
    nationalDebt,

    // Additional new data
    spreadHistory,
    cpiComponents,
    debtToGdpHistory,

    // Status
    isLive,
    lastUpdated,
    isLoading,
    error,
    fetchedOn,
    isCurrent,
  };
}