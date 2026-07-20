import React from 'react';
import MarketSkeleton from '../../hub/MarketSkeleton';
import BentoWrapper from '../../components/BentoWrapper';
import BentoCard from '../../components/BentoCard/BentoCard';
import DataFooter from '../../components/DataFooter/DataFooter';
import { HousingPanel, TradePanel, TrendsHousingPanel, TrendsTradePanel, useCensusData, HOUSING_KEYS, ECO_KEYS } from './components/CensusDashboard';
import './CensusMarket.css';

const CENSUS_LAYOUT = {
  lg: [
    { i: 'housing', x: 0, y: 0, w: 6, h: 3 },
    { i: 'trade', x: 6, y: 0, w: 6, h: 3 },
    { i: 'trends-housing', x: 0, y: 3, w: 6, h: 4 },
    { i: 'trends-trade', x: 6, y: 3, w: 6, h: 4 },
  ]
};

function getCensusProps(centralData) {
  const d = centralData.data || {};
  return {
    series: d.series || {},
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
  };
}

function CensusMarket({ centralData } = {}) {
  if (!centralData) return <MarketSkeleton />;
  const props = getCensusProps(centralData);

  if (props.isLoading) return <MarketSkeleton />;

  const { kpiData, housingSeries, ecoSeries } = useCensusData(props.series);

  const hasData = kpiData.length > 0 || housingSeries.length > 0 || ecoSeries.length > 0;

  if (!props.isLive && !hasData) {
    return (
      <div className="census-market">
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted, #888)' }}>
          Data source temporarily unavailable
        </div>
        <DataFooter source="US Census Bureau (via FRED)" timestamp={props.lastUpdated} isLive={props.isLive} fetchLog={props.fetchLog} error={props.error} fetchedOn={props.fetchedOn} isCurrent={props.isCurrent} isHistorical={props.isHistorical} asOfDate={props.asOfDate} />
      </div>
    );
  }

  return (
    <div className="census-market">
      <BentoWrapper layout={CENSUS_LAYOUT} storageKey="census-layout-v1">
        <BentoCard key="housing" title="Housing & Construction" accent="census" noFooter>
          <HousingPanel kpiData={kpiData} housingKeys={HOUSING_KEYS} />
        </BentoCard>
        <BentoCard key="trade" title="Trade & Consumption" accent="census" noFooter>
          <TradePanel kpiData={kpiData} ecoKeys={ECO_KEYS} />
        </BentoCard>
        <BentoCard key="trends-housing" title="Trends — Housing & Construction" accent="census" noFooter>
          <TrendsHousingPanel housingSeries={housingSeries} fetchedOn={props.fetchedOn} lastUpdated={props.lastUpdated} />
        </BentoCard>
        <BentoCard key="trends-trade" title="Trends — Trade & Consumption" accent="census" noFooter>
          <TrendsTradePanel ecoSeries={ecoSeries} fetchedOn={props.fetchedOn} lastUpdated={props.lastUpdated} />
        </BentoCard>
      </BentoWrapper>
      <DataFooter source="US Census Bureau (via FRED)" timestamp={props.lastUpdated} isLive={props.isLive} fetchLog={props.fetchLog} error={props.error} fetchedOn={props.fetchedOn} isCurrent={props.isCurrent} isHistorical={props.isHistorical} asOfDate={props.asOfDate} />
    </div>
  );
}

export default React.memo(CensusMarket);
