import { useState, useEffect, useCallback } from 'react';
import { fetchWithRetry } from '../../../utils/fetchWithRetry';
import { useInterval } from '../../../hooks/useInterval';
import { useDataStatus } from '../../../hooks/useDataStatus';
import { yieldCurveData as mockYieldCurve, spreadData as mockSpread, breakevensData as mockBreakevens, fredYieldHistory as mockFredYield, durationLadderData as mockDurationLadder } from './mockBondsData';

const SERVER = '';

const has = (v) => v != null && v !== false;

export function useBondsData(autoRefresh = false, refreshKey = 0, { disabled = false } = {}) {
  const [yieldCurveData, setYieldCurveData] = useState(null);
  const [spreadData, setSpreadData] = useState(null);
  const [spreadIndicators, setSpreadIndicators] = useState(null);
  const [breakevensData, setBreakevensData] = useState(null);
  const [fredYieldHistory, setFredYieldHistory] = useState(null);
  const [treasuryRates, setTreasuryRates] = useState(null);
  const [fedFundsFutures, setFedFundsFutures] = useState(null);
  const [yieldHistory, setYieldHistory] = useState(null);
  const [mortgageSpread, setMortgageSpread] = useState(null);
  const [tipsYields, setTipsYields] = useState(null);
  const [realYieldHistory, setRealYieldHistory] = useState(null);
  const [macroData, setMacroData] = useState(null);
  const [fedBalanceSheetHistory, setFedBalanceSheetHistory] = useState(null);
  const [m2HistoryData, setM2HistoryData] = useState(null);
  const [creditIndices, setCreditIndices] = useState(null);
  const [auctionData, setAuctionData] = useState(null);
  const [nationalDebt, setNationalDebt] = useState(null);
  const [spreadHistory, setSpreadHistory] = useState(null);
  const [cpiComponents, setCpiComponents] = useState(null);
  const [debtToGdpHistory, setDebtToGdpHistory] = useState(null);

  const [provenance, setProvenance] = useState({});

  const { isLive, isLoading, error, lastUpdated, fetchedOn, isCurrent, fetchLog, handleSuccess, handleError, handleFinally, logFetch } = useDataStatus();

  const refetch = useCallback(async () => {
    const t0 = performance.now();
    const url = `${SERVER}/api/bonds`;
    try {
      const r = await fetchWithRetry(url);
      const data = await r.json();
      const dur = Math.round(performance.now() - t0);

      const prov = {};
      if (data.yieldCurveData && Object.keys(data.yieldCurveData).length > 0) {
        const merged = { ...mockYieldCurve };
        for (const [cc, liveCurve] of Object.entries(data.yieldCurveData)) {
          if (!liveCurve || typeof liveCurve !== 'object') continue;
          const mockCurve = mockYieldCurve[cc];
          const liveTenors = Object.keys(liveCurve);
          if (mockCurve && liveTenors.length > 0 && liveTenors.length < Object.keys(mockCurve).length) {
            const anchorKey = liveTenors[0];
            const anchorLive = liveCurve[anchorKey];
            const anchorMock = mockCurve[anchorKey];
            if (anchorLive != null && anchorMock != null && anchorMock !== 0) {
              const scale = anchorLive / anchorMock;
              merged[cc] = { ...mockCurve };
              for (const [tenor, val] of Object.entries(mockCurve)) {
                merged[cc][tenor] = liveCurve[tenor] != null ? liveCurve[tenor] : +(val * scale).toFixed(2);
              }
              continue;
            }
          }
          merged[cc] = { ...mockCurve, ...liveCurve };
        }
        setYieldCurveData(merged);
        prov.yieldCurve = 'live';
      }
      if (data.spreadData?.dates?.length >= 6) { setSpreadData(data.spreadData); prov.spreadData = 'live'; }
      if (data.spreadIndicators && Object.keys(data.spreadIndicators).length > 0) { setSpreadIndicators(data.spreadIndicators); prov.spreadIndicators = 'live'; }
      if (data.breakevensData?.history?.dates?.length >= 20) { setBreakevensData(data.breakevensData); prov.breakevens = 'live'; }
      if (data.fredYieldHistory?.dates?.length > 0) { setFredYieldHistory(data.fredYieldHistory); prov.fredHistory = 'live'; }
      if (data.treasuryRates) { setTreasuryRates(data.treasuryRates); prov.treasuryRates = 'live'; }
      if (data.fedFundsFutures && Object.keys(data.fedFundsFutures).length > 0) { setFedFundsFutures(data.fedFundsFutures); }
      if (data.yieldHistory?.dates?.length > 0) { setYieldHistory(data.yieldHistory); }
      if (data.mortgageSpread != null) { setMortgageSpread(data.mortgageSpread); }
      if (data.tipsYields && Object.values(data.tipsYields).some(v => v != null)) { setTipsYields(data.tipsYields); prov.tipsYields = 'live'; }
      if (data.realYieldHistory?.dates?.length > 0) { setRealYieldHistory(data.realYieldHistory); prov.realYieldHistory = 'live'; }
      if (data.macroData && Object.keys(data.macroData).length > 0) { setMacroData(data.macroData); prov.macroData = 'live'; }
      if (data.fedBalanceSheetHistory?.dates?.length > 0) { setFedBalanceSheetHistory(data.fedBalanceSheetHistory); prov.fedBalanceSheet = 'live'; }
      if (data.m2HistoryData?.dates?.length > 0) { setM2HistoryData(data.m2HistoryData); prov.m2Data = 'live'; }
      if (data.creditIndices && Object.keys(data.creditIndices).length > 0) { setCreditIndices(data.creditIndices); prov.creditIndices = 'live'; }
      if (data.auctionData && data.auctionData.length > 0) { setAuctionData(data.auctionData); prov.auctionData = 'live'; }
      if (data.nationalDebt != null) { setNationalDebt(data.nationalDebt); prov.nationalDebt = 'live'; }
      if (data.spreadHistory?.dates?.length > 0) { setSpreadHistory(data.spreadHistory); prov.spreadHistory = 'live'; }
      if (data.cpiComponents?.dates?.length > 0) { setCpiComponents(data.cpiComponents); prov.cpiComponents = 'live'; }
      if (data.debtToGdpHistory?.dates?.length > 0) { setDebtToGdpHistory(data.debtToGdpHistory); prov.debtToGdp = 'live'; }

      setProvenance(prev => ({ ...prev, ...prov }));
      handleSuccess(data);
      logFetch({ url, status: r.status, duration: dur, sources: data._sources, seriesIds: ['DGS10', 'DGS2', 'DGS30', 'T10Y2Y', 'T10Y3M', 'DFII5', 'DFII10', 'DFII30', 'WALCL', 'M2SL', 'UNRATE', 'GDP', 'PCEPI', 'GFDEBTN', 'CPIAUCSL', 'CPILFESL', 'CPIFABSL', 'CPIENGSL', 'MORTGAGE30US', 'T5YIE', 'T10YIE', 'T5YIFR'] });
    } catch (err) {
      handleError(err, 'Bonds');
      logFetch({ url, status: 0, duration: Math.round(performance.now() - t0), error: err?.message || 'Fetch failed' });
    } finally {
      handleFinally();
    }
  }, [handleSuccess, handleError, handleFinally, logFetch]);

  useEffect(() => { if (!disabled) refetch(); }, [disabled]);
  useEffect(() => { if (refreshKey > 0 && !disabled) refetch(); }, [refreshKey, disabled]);

  useInterval(refetch, (!disabled && autoRefresh) ? 300000 : null);

  return {
    yieldCurveData: yieldCurveData || mockYieldCurve,
    creditRatingsData: [
      { country: 'US', name: 'United States', sp: 'AA+', moodys: 'Aaa', fitch: 'AA+', region: 'Americas' },
      { country: 'DE', name: 'Germany', sp: 'AAA', moodys: 'Aaa', fitch: 'AAA', region: 'Europe' },
      { country: 'GB', name: 'United Kingdom', sp: 'AA', moodys: 'Aa3', fitch: 'AA-', region: 'Europe' },
      { country: 'JP', name: 'Japan', sp: 'A+', moodys: 'A1', fitch: 'A', region: 'Asia-Pacific' },
      { country: 'FR', name: 'France', sp: 'AA-', moodys: 'Aa2', fitch: 'AA-', region: 'Europe' },
      { country: 'AU', name: 'Australia', sp: 'AAA', moodys: 'Aaa', fitch: 'AAA', region: 'Asia-Pacific' },
      { country: 'CA', name: 'Canada', sp: 'AAA', moodys: 'Aaa', fitch: 'AA+', region: 'Americas' },
      { country: 'IT', name: 'Italy', sp: 'BBB', moodys: 'Baa3', fitch: 'BBB', region: 'Europe' },
      { country: 'CN', name: 'China', sp: 'A+', moodys: 'A1', fitch: 'A+', region: 'Asia-Pacific' },
      { country: 'NL', name: 'Netherlands', sp: 'AAA', moodys: 'Aaa', fitch: 'AAA', region: 'Europe' },
      { country: 'SE', name: 'Sweden', sp: 'AAA', moodys: 'Aaa', fitch: 'AAA', region: 'Europe' },
      { country: 'CH', name: 'Switzerland', sp: 'AAA', moodys: 'Aaa', fitch: 'AAA', region: 'Europe' },
    ],
    spreadData: spreadData || mockSpread,
    spreadIndicators: spreadIndicators || {},
    durationLadderData: mockDurationLadder,
    breakevensData: breakevensData || mockBreakevens,
    fredYieldHistory: fredYieldHistory || mockFredYield,
    treasuryRates,
    fedFundsFutures,
    yieldHistory,
    mortgageSpread,
    tipsYields: tipsYields || {},
    realYieldHistory: realYieldHistory || { dates: [], d5y: [], d10y: [] },
    macroData: macroData || {},
    fedBalanceSheetHistory: fedBalanceSheetHistory || { dates: [], values: [] },
    m2HistoryData: m2HistoryData || { dates: [], values: [] },
    creditIndices: creditIndices || {},
    auctionData: auctionData || [],
    nationalDebt,
    spreadHistory: spreadHistory || { dates: [], t10y2y: [], t10y3m: [], t5y30y: [], latest: {} },
    cpiComponents: cpiComponents || { dates: [], all: [], core: [], food: [], energy: [], latest: {} },
    debtToGdpHistory: debtToGdpHistory || { dates: [], values: [], latest: null },
    provenance,
    isLive,
    lastUpdated,
    isLoading,
    error,
    fetchedOn,
    isCurrent,
    refetch,
    fetchLog,
  };
}