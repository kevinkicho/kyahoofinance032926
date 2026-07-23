import React from 'react';
import MarketSkeleton from '../../hub/MarketSkeleton';
import CreditDashboard from './components/CreditDashboard';
import CreditKpiStrip from './components/CreditKpiStrip';
import { useCurrency } from '../../hub/CurrencyContext';
import './CreditMarket.css';

function getCreditProps(centralData) {
  const d = centralData.data || {};
  return {
    spreadData: d.spreadData,
    emBondData: d.emBondData,
    loanData: d.loanData,
    defaultData: d.defaultData,
    delinquencyRates: d.delinquencyRates,
    lendingStandards: d.lendingStandards,
    commercialPaper: d.commercialPaper,
    excessReserves: d.excessReserves,
    creditQuality: d.creditQuality,
    tedSpread: d.tedSpread,
    isLive: centralData.isLive,
    lastUpdated: centralData.lastUpdated,
    isLoading: centralData.isLoading,
    fetchedOn: centralData.fetchedOn,
    isCurrent: centralData.isCurrent,
    isHistorical: centralData.isHistorical,
    asOfDate: centralData.asOfDate,
    fetchLog: centralData.fetchLog || [],
    error: centralData.error,
    refetch: centralData.refetch,
  };
}

function CreditMarket({ centralData } = {}) {
  const { convert, currentSymbol } = useCurrency();
  if (!centralData) return <MarketSkeleton />;
  const props = getCreditProps(centralData);

  if (props.isLoading) return <MarketSkeleton />;

    // Server returns spreadData as { current: { igSpread, hySpread, ... },
    // history, etfs } — an object, not an array. Spreads are basis points.
    const cur = props.spreadData?.current || {};

    // EM KPI: prefer FRED BAMLEMCBPIOAS (spreadData.current.emSpread). Country
    // ETF yields rarely populate `.spread`, so averaging them left the KPI blank.
    const emCountries = Array.isArray(props.emBondData?.countries) ? props.emBondData.countries : [];
    const emSpreads = emCountries.map(c => c?.spread).filter(v => typeof v === 'number');
    const emSpreadAvg = emSpreads.length > 0
      ? Math.round(emSpreads.reduce((s, v) => s + v, 0) / emSpreads.length)
      : null;
    const emSpread = typeof cur.emSpread === 'number' ? cur.emSpread : emSpreadAvg;

    // Default Rate KPI: "HY Default Rate (TTM)" is proprietary/null. Fall back
    // through real FRED charge-off / distress rows so Key Metrics isn't empty.
    const rateRows = Array.isArray(props.defaultData?.rates) ? props.defaultData.rates : [];
    const pickRate = (...patterns) => {
      for (const re of patterns) {
        const hit = rateRows.find(r => re.test(r?.category) && typeof r?.value === 'number');
        if (hit) return hit.value;
      }
      const any = rateRows.find(r => typeof r?.value === 'number');
      return typeof any?.value === 'number' ? any.value : null;
    };
    const defaultRate = pickRate(
      /C&I Charge-Off|Commercial Charge-Off/i,
      /Credit Card Charge-Off/i,
      /Mortgage Charge-Off|Consumer Charge-Off/i,
      /C&I Delinquency/i,
      /HY Default/i,
      /Distress/i,
      /Loan Default/i,
    );

    const cpRate = typeof props.commercialPaper?.rate === 'number'
      ? props.commercialPaper.rate
      : (typeof props.commercialPaper?.financial3m === 'number'
        ? props.commercialPaper.financial3m
        : (typeof props.commercialPaper?.nonfinancial3m === 'number'
          ? props.commercialPaper.nonfinancial3m
          : null));

    // KPI strip becomes a real bento child rendered inside CreditDashboard.
    const kpiPanel = (
      <CreditKpiStrip
        igOas={typeof cur.igSpread === 'number' ? cur.igSpread : null}
        hyOas={typeof cur.hySpread === 'number' ? cur.hySpread : null}
        emSpread={emSpread}
        defaultRate={defaultRate}
        cpRate={cpRate}
        lastUpdated={props.lastUpdated}
        isLive={props.isLive}
        fetchLog={props.fetchLog}
        error={props.error}
        fetchedOn={props.fetchedOn}
        isCurrent={props.isCurrent}
      />
    );

    return (
      <div className="credit-market">
        <CreditDashboard
          kpiPanel={kpiPanel}
          spreadData={props.spreadData}
          emBondData={props.emBondData}
          loanData={props.loanData}
          defaultData={props.defaultData}
          delinquencyRates={props.delinquencyRates}
          lendingStandards={props.lendingStandards}
          commercialPaper={props.commercialPaper}
          excessReserves={convert(props.excessReserves)}
          creditQuality={props.creditQuality}
          tedSpread={props.tedSpread}
          isLive={props.isLive}
          lastUpdated={props.lastUpdated}
          error={props.error} fetchedOn={props.fetchedOn} isCurrent={props.isCurrent}
          isHistorical={props.isHistorical} asOfDate={props.asOfDate}
          fetchLog={props.fetchLog}
        />
      </div>
    );
}

export default React.memo(CreditMarket);
