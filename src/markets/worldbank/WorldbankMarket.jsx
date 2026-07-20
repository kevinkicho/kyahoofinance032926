import React from 'react';
import MarketSkeleton from '../../hub/MarketSkeleton';
import BentoWrapper from '../../components/BentoWrapper';
import BentoCard from '../../components/BentoCard/BentoCard';
import DataFooter from '../../components/DataFooter/DataFooter';
import WbTradeOpenness from './WbTradeOpenness';
import WbDevScatter from './WbDevScatter';

const WB_LAYOUT = {
  lg: [
    { i: 'trade-openness', x: 0, y: 0, w: 6, h: 4 },
    { i: 'dev-scatter', x: 6, y: 0, w: 6, h: 4 },
  ]
};

function getWorldbankProps(centralData) {
  const d = centralData.data || {};
  return {
    countries: d.countries || [],
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

function WorldbankMarket({ centralData } = {}) {
  if (!centralData) return <MarketSkeleton />;
  const props = getWorldbankProps(centralData);

  if (props.isLoading) return <MarketSkeleton />;

  const hasData = props.countries.length > 0;

  if (!props.isLive && !hasData) {
    return (
      <div className="worldbank-market" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 8, flex: 1 }}>
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted, #888)' }}>
          Data source temporarily unavailable
        </div>
        <DataFooter source="World Bank" timestamp={props.lastUpdated} isLive={props.isLive} fetchLog={props.fetchLog} error={props.error} fetchedOn={props.fetchedOn} isCurrent={props.isCurrent} isHistorical={props.isHistorical} asOfDate={props.asOfDate} />
      </div>
    );
  }

  return (
    <div className="worldbank-market" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 8, flex: 1 }}>
      <BentoWrapper layout={WB_LAYOUT} storageKey="worldbank-layout-v1">
        <BentoCard key="trade-openness" title="Trade Openness (% of GDP)" accent="worldbank" noFooter>
          <WbTradeOpenness countries={props.countries} lastUpdated={props.lastUpdated} />
        </BentoCard>
        <BentoCard key="dev-scatter" title="GDP per Capita vs Growth" accent="worldbank" noFooter>
          <WbDevScatter countries={props.countries} lastUpdated={props.lastUpdated} />
        </BentoCard>
      </BentoWrapper>
      <DataFooter source="World Bank" timestamp={props.lastUpdated} isLive={props.isLive} fetchLog={props.fetchLog} error={props.error} fetchedOn={props.fetchedOn} isCurrent={props.isCurrent} isHistorical={props.isHistorical} asOfDate={props.asOfDate} />
    </div>
  );
}

export default React.memo(WorldbankMarket);
