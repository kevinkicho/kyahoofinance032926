import React from 'react';
import MarketSkeleton from '../../hub/MarketSkeleton';
import { HousingPanel, TradePanel, TrendsHousingPanel, TrendsTradePanel, HOUSING_KEYS, ECO_KEYS, useCensusData } from './components/CensusDashboard';
import BentoWrapper from '../../components/BentoWrapper';
import DataFooter from '../../components/DataFooter/DataFooter';
import './CensusMarket.css';

const CENSUS_LAYOUT = {
  lg: [
    { i: 'housing', x: 0, y: 0, w: 6, h: 2 },
    { i: 'trade', x: 6, y: 0, w: 6, h: 2 },
    { i: 'trends-housing', x: 0, y: 2, w: 6, h: 3 },
    { i: 'trends-trade', x: 6, y: 2, w: 6, h: 3 },
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

  if (!props.isLive && kpiData.length === 0) {
    return (
      <div className="census-market">
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted, #888)' }}>
          Data source temporarily unavailable
        </div>
        <DataFooter source="US Census Bureau (via FRED)" timestamp={props.lastUpdated} isLive={props.isLive} fetchLog={props.fetchLog} error={props.error} fetchedOn={props.fetchedOn} isCurrent={props.isCurrent} />
      </div>
    );
  }

  return (
    <div className="census-market">
      <BentoWrapper layout={CENSUS_LAYOUT} storageKey="census-layout">
        <div key="housing">
          <HousingPanel kpiData={kpiData} housingKeys={HOUSING_KEYS} />
        </div>
        <div key="trade">
          <TradePanel kpiData={kpiData} ecoKeys={ECO_KEYS} />
        </div>
        <div key="trends-housing">
          <TrendsHousingPanel housingSeries={housingSeries} fetchedOn={props.fetchedOn} lastUpdated={props.lastUpdated} />
        </div>
        <div key="trends-trade">
          <TrendsTradePanel ecoSeries={ecoSeries} fetchedOn={props.fetchedOn} lastUpdated={props.lastUpdated} />
        </div>
      </BentoWrapper>
      <DataFooter source="US Census Bureau (via FRED)" timestamp={props.lastUpdated} isLive={props.isLive} fetchLog={props.fetchLog} error={props.error} fetchedOn={props.fetchedOn} isCurrent={props.isCurrent} />
    </div>
  );
}

export default React.memo(CensusMarket);