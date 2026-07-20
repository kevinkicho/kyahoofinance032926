import React from 'react';
import MarketSkeleton from '../../hub/MarketSkeleton';
import BentoWrapper from '../../components/BentoWrapper';
import BentoCard from '../../components/BentoCard/BentoCard';
import DataFooter from '../../components/DataFooter/DataFooter';
import ImfReserves from './ImfReserves';
import ImfCofier from './ImfCofier';

const IMF_LAYOUT = {
  lg: [
    { i: 'reserves', x: 0, y: 0, w: 6, h: 4 },
    { i: 'cofer', x: 6, y: 0, w: 6, h: 4 },
  ]
};

function getImfProps(centralData) {
  const d = centralData.data || {};
  return {
    countries: d.countries || [],
    ifsReserves: d.ifsReserves || {},
    cofer: d.cofer || {},
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

function ImfMarket({ centralData } = {}) {
  if (!centralData) return <MarketSkeleton />;
  const props = getImfProps(centralData);

  if (props.isLoading) return <MarketSkeleton />;

  const hasData = props.countries.length > 0 || Object.keys(props.cofer).length > 0;

  if (!props.isLive && !hasData) {
    return (
      <div className="imf-market" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 8, flex: 1 }}>
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted, #888)' }}>
          Data source temporarily unavailable
        </div>
        <DataFooter source="International Monetary Fund" timestamp={props.lastUpdated} isLive={props.isLive} fetchLog={props.fetchLog} error={props.error} fetchedOn={props.fetchedOn} isCurrent={props.isCurrent} isHistorical={props.isHistorical} asOfDate={props.asOfDate} />
      </div>
    );
  }

  return (
    <div className="imf-market" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 8, flex: 1 }}>
      <BentoWrapper layout={IMF_LAYOUT} storageKey="imf-layout-v1">
        <BentoCard key="reserves" title="International Reserves" accent="imf" noFooter>
          <ImfReserves countries={props.countries} ifsReserves={props.ifsReserves} lastUpdated={props.lastUpdated} />
        </BentoCard>
        <BentoCard key="cofer" title="Currency Composition of Reserves (COFER)" accent="imf" noFooter>
          <ImfCofier cofer={props.cofer} lastUpdated={props.lastUpdated} />
        </BentoCard>
      </BentoWrapper>
      <DataFooter source="International Monetary Fund" timestamp={props.lastUpdated} isLive={props.isLive} fetchLog={props.fetchLog} error={props.error} fetchedOn={props.fetchedOn} isCurrent={props.isCurrent} isHistorical={props.isHistorical} asOfDate={props.asOfDate} />
    </div>
  );
}

export default React.memo(ImfMarket);
