import React from 'react';
import MarketSkeleton from '../../hub/MarketSkeleton';
import { useCurrency } from '../../hub/CurrencyContext';
import BondsDashboard from './components/BondsDashboard';
import { normalizeBondsData } from '../../data/marketNormalizers';
import './components/BondsDashboard.css';

const CREDIT_RATINGS_FALLBACK = [
  { country: 'US', name: 'United States',  sp: 'AA+', moodys: 'Aaa', fitch: 'AA+', region: 'Americas' },
  { country: 'DE', name: 'Germany',        sp: 'AAA', moodys: 'Aaa', fitch: 'AAA', region: 'Europe' },
  { country: 'GB', name: 'United Kingdom', sp: 'AA',  moodys: 'Aa2', fitch: 'AA-', region: 'Europe' },
  { country: 'JP', name: 'Japan',          sp: 'A+',  moodys: 'A1',  fitch: 'A',   region: 'Asia-Pacific' },
  { country: 'FR', name: 'France',         sp: 'AA-', moodys: 'Aa2', fitch: 'AA-', region: 'Europe' },
  { country: 'AU', name: 'Australia',      sp: 'AAA', moodys: 'Aaa', fitch: 'AAA', region: 'Asia-Pacific' },
  { country: 'CA', name: 'Canada',         sp: 'AAA', moodys: 'Aaa', fitch: 'AA+', region: 'Americas' },
  { country: 'IT', name: 'Italy',          sp: 'BBB', moodys: 'Baa3', fitch: 'BBB', region: 'Europe' },
  { country: 'CN', name: 'China',          sp: 'A+',  moodys: 'A1',  fitch: 'A+', region: 'Asia-Pacific' },
  { country: 'NL', name: 'Netherlands',    sp: 'AAA', moodys: 'Aaa', fitch: 'AAA', region: 'Europe' },
  { country: 'SE', name: 'Sweden',         sp: 'AAA', moodys: 'Aaa', fitch: 'AAA', region: 'Europe' },
  { country: 'CH', name: 'Switzerland',    sp: 'AAA', moodys: 'Aaa', fitch: 'AAA', region: 'Europe' },
];

const DEFAULT_DURATION = [
  { bucket: '0\u20132y', amount: null, pct: null },
  { bucket: '2\u20135y', amount: null, pct: null },
  { bucket: '5\u201310y', amount: null, pct: null },
  { bucket: '10y+',  amount: null, pct: null },
];

function getBondsProps(centralData) {
  const d = centralData.data || {};
  const normalized = normalizeBondsData(d);
  return {
    yieldCurveData: d.yieldCurveData || {},
    creditRatingsData: d.creditRatings?.countries || CREDIT_RATINGS_FALLBACK,
    creditRatingsAsOf: d.creditRatings?.asOf || null,
    spreadData: normalized.values.spreadData || { dates: [], IG: [], HY: [], EM: [], BBB: [], current: {} },
    durationLadderData: d.durationLadder?.buckets || DEFAULT_DURATION,
    durationLadderMeta: d.durationLadder ? { asOf: d.durationLadder.asOf, total: d.durationLadder.total, avgRate: d.durationLadder.avgRate } : null,
    breakevensData: normalized.values.breakevensData,
    fredYieldHistory: normalized.series.fredYieldHistory,
    treasuryRates: normalized.values.treasuryRates,
    fedFundsFutures: d.fedFundsFutures,
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
  if (props.isLoading) return <MarketSkeleton />;

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
