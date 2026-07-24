import React from 'react';
import MarketSkeleton from '../../hub/MarketSkeleton';
import { useCurrency } from '../../hub/CurrencyContext';
import BondsDashboard from './components/BondsDashboard';
import { normalizeBondsData } from '../../data/marketNormalizers';
import './components/BondsDashboard.css';

function firstFinite(...vals) {
  for (const v of vals) {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
  }
  return null;
}

function getBondsProps(centralData) {
  const d = centralData.data || {};
  const normalized = normalizeBondsData(d);
  // No fabricated ratings/duration — empty arrays → "No data" empty states.
  // Rebuild US curve from normalized treasury rates when cache has null tenors
  // but real FRED averages (notes/bills/bonds) still exist.
  const tr = normalized.values.treasuryRates || {};
  const rawUs = d.yieldCurveData?.US || {};
  const filledUs = {
    '3m': firstFinite(rawUs['3m'], tr.US3M),
    '6m': firstFinite(rawUs['6m']),
    '1y': firstFinite(rawUs['1y']),
    '2y': firstFinite(rawUs['2y'], tr.US2Y),
    '5y': firstFinite(rawUs['5y'], tr.US5Y),
    '10y': firstFinite(rawUs['10y'], tr.US10Y),
    '30y': firstFinite(rawUs['30y'], tr.US30Y),
  };
  const yieldCurveData = {
    ...(d.yieldCurveData || {}),
    US: filledUs,
  };

  return {
    yieldCurveData,
    creditRatingsData: d.creditRatings?.countries || [],
    creditRatingsAsOf: d.creditRatings?.asOf || null,
    spreadData: normalized.values.spreadData || { dates: [], IG: [], HY: [], EM: [], BBB: [], current: {} },
    durationLadderData: d.durationLadder?.buckets || [],
    durationLadderMeta: d.durationLadder ? { asOf: d.durationLadder.asOf, total: d.durationLadder.total, avgRate: d.durationLadder.avgRate } : null,
    breakevensData: normalized.values.breakevensData,
    fredYieldHistory: normalized.series.fredYieldHistory,
    treasuryRates: tr,
    fedFundsFutures: d.fedFundsFutures || {
      m1: firstFinite(d.macroData?.fedFunds, tr.fedFunds, tr.US3M),
    },
    yieldHistory: d.yieldHistory,
    mortgageSpread: d.mortgageSpread,
    tipsYields: normalized.values.tipsYields,
    realYieldHistory: normalized.series.realYieldHistory,
    macroData: d.macroData || {},
    fedBalanceSheetHistory: d.fedBalanceSheetHistory || { dates: [], values: [] },
    m2HistoryData: d.m2HistoryData || { dates: [], values: [] },
    creditIndices: d.creditIndices || {},
    auctionData: d.auctionData || [],
    nationalDebt: d.nationalDebt,
    spreadIndicators: normalized.values.spreadIndicators,
    spreadHistory: normalized.series.spreadHistory,
    cpiComponents: d.cpiComponents || { dates: [], all: [], core: [], food: [], energy: [], latest: {} },
    debtToGdpHistory: d.debtToGdpHistory || { dates: [], values: [], latest: null },
    provenance: centralData.provenance || {},
    isLive: centralData.isLive,
    lastUpdated: centralData.lastUpdated,
    isLoading: centralData.isLoading,
    fetchedOn: centralData.fetchedOn,
    isCurrent: centralData.isCurrent,
    isHistorical: centralData.isHistorical,
    asOfDate: centralData.asOfDate,
    error: centralData.error,
    fetchLog: centralData.fetchLog || [],
    refetch: centralData.refetch,
    normalized,
  };
}

function BondsMarket({ centralData } = {}) {
  const { currency, currentSymbol, convert } = useCurrency();
  if (!centralData) return <MarketSkeleton />;
  const props = getBondsProps(centralData);
  
  return (
    // KPIs (US 10Y/2Y/Fed Funds/etc.) now live as a real bento panel
    // inside BondsDashboard's BentoWrapper, so the loose strip here is
    // gone. The two-column `--with-sidebar` grid is also dropped since
    // there's no sidebar to host.
    <div className="bonds-market" role="region" aria-label="Bonds">
      <div className="bonds-market-main">
          <BondsDashboard
            currency={currency}
            currentSymbol={currentSymbol}
            convert={convert}
            yieldCurveData={props.yieldCurveData}
            creditRatingsData={props.creditRatingsData}
            creditRatingsAsOf={props.creditRatingsAsOf}
            spreadIndicators={props.spreadIndicators}
            spreadData={props.spreadData}
            durationLadderData={props.durationLadderData}
            durationLadderMeta={props.durationLadderMeta}
            breakevensData={props.breakevensData}
            treasuryRates={props.treasuryRates}
            fredYieldHistory={props.fredYieldHistory}
            fedFundsFutures={props.fedFundsFutures}
            yieldHistory={props.yieldHistory}
            mortgageSpread={props.mortgageSpread}
            tipsYields={props.tipsYields}
            realYieldHistory={props.realYieldHistory}
            macroData={props.macroData}
            fedBalanceSheetHistory={props.fedBalanceSheetHistory}
            m2HistoryData={props.m2HistoryData}
            auctionData={props.auctionData}
            nationalDebt={props.nationalDebt}
            spreadHistory={props.spreadHistory}
            cpiComponents={props.cpiComponents}
            debtToGdpHistory={props.debtToGdpHistory}
            isLive={props.isLive}
            lastUpdated={props.lastUpdated}
            fetchLog={props.fetchLog}
            error={props.error} fetchedOn={props.fetchedOn} isCurrent={props.isCurrent}
            isHistorical={props.isHistorical} asOfDate={props.asOfDate}
            provenance={props.provenance}
          />
        </div>
    </div>
  );
}

export default React.memo(BondsMarket);
