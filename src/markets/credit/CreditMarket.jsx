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
    // history, etfs } — an object, not an array. The previous .find()/.map()
    // shape was leftover from an older API contract and crashed the panel.
    // Spreads are basis points, so currency conversion doesn't apply.
    const cur = props.spreadData?.current || {};

    // Derive scalars the KPI strip expects from the actual server shape:
    // - emBondData: server returns `{countries:[{spread},...], regions, noYahoo}`
    //   so compute the average spread across countries that have one.
    // - defaultData: server returns `{rates:[{category,value,...}], ...}`
    //   so pluck the HY default rate from the rates array.
    const emCountries = Array.isArray(props.emBondData?.countries) ? props.emBondData.countries : [];
    const emSpreads = emCountries.map(c => c?.spread).filter(v => typeof v === 'number');
    const emSpreadAvg = emSpreads.length > 0
      ? Math.round(emSpreads.reduce((s, v) => s + v, 0) / emSpreads.length)
      : null;
    const hyDefault = Array.isArray(props.defaultData?.rates)
      ? props.defaultData.rates.find(r => /HY Default/i.test(r?.category))?.value
      : null;

    // KPI strip becomes a real bento child rendered inside CreditDashboard.
    // Pass it via the `kpiPanel` prop. CreditKpiStrip is reused unchanged
    // (it already renders a MarketKpiStrip with seriesKeys).
    const kpiPanel = (
      <CreditKpiStrip
        igOas={cur.igSpread}
        hyOas={cur.hySpread}
        emSpread={emSpreadAvg}
        defaultRate={typeof hyDefault === 'number' ? hyDefault : null}
        cpRate={props.commercialPaper?.rate}
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
