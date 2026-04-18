import React from 'react';
import MarketSkeleton from '../../hub/MarketSkeleton';
import BondsDashboard from './components/BondsDashboard';
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
  return {
    yieldCurveData: d.yieldCurveData || {},
    creditRatingsData: d.creditRatings?.countries || CREDIT_RATINGS_FALLBACK,
    creditRatingsAsOf: d.creditRatings?.asOf || null,
    spreadData: d.spreadData || { dates: [], IG: [], HY: [], EM: [], BBB: [] },
    spreadIndicators: d.spreadIndicators || {},
    durationLadderData: d.durationLadder?.buckets || DEFAULT_DURATION,
    durationLadderMeta: d.durationLadder ? { asOf: d.durationLadder.asOf, total: d.durationLadder.total, avgRate: d.durationLadder.avgRate } : null,
    breakevensData: d.breakevensData || { current: {}, history: { dates: [], be5y: [], be10y: [], forward5y5y: [] } },
    fredYieldHistory: d.fredYieldHistory || { dates: [], values: [] },
    treasuryRates: d.treasuryRates,
    fedFundsFutures: d.fedFundsFutures,
    yieldHistory: d.yieldHistory,
    mortgageSpread: d.mortgageSpread,
    tipsYields: d.tipsYields || {},
    realYieldHistory: d.realYieldHistory || { dates: [], d5y: [], d10y: [] },
    macroData: d.macroData || {},
    fedBalanceSheetHistory: d.fedBalanceSheetHistory || { dates: [], values: [] },
    m2HistoryData: d.m2HistoryData || { dates: [], values: [] },
    creditIndices: d.creditIndices || {},
    auctionData: d.auctionData || [],
    nationalDebt: d.nationalDebt,
    spreadHistory: d.spreadHistory || { dates: [], t10y2y: [], t10y3m: [], t5y30y: [], latest: {} },
    cpiComponents: d.cpiComponents || { dates: [], all: [], core: [], food: [], energy: [], latest: {} },
    debtToGdpHistory: d.debtToGdpHistory || { dates: [], values: [], latest: null },
    provenance: centralData.provenance || {},
    isLive: centralData.isLive,
    lastUpdated: centralData.lastUpdated,
    isLoading: centralData.isLoading,
    fetchedOn: centralData.fetchedOn,
    isCurrent: centralData.isCurrent,
    error: centralData.error,
    fetchLog: centralData.fetchLog || [],
    refetch: centralData.refetch,
  };
}

function BondsMarket({ centralData } = {}) {
  if (!centralData) return <MarketSkeleton />;
  const props = getBondsProps(centralData);
  if (props.isLoading) return <MarketSkeleton />;

  return (
    <div className="bonds-market">

      <BondsDashboard
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
        provenance={props.provenance}
      />
    </div>
  );
}

export default React.memo(BondsMarket);