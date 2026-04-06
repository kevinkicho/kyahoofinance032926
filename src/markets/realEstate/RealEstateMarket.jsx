import React, { useState } from 'react';
import { useRealEstateData } from './data/useRealEstateData';
import MarketSkeleton from '../../hub/MarketSkeleton';
import PriceIndex       from './components/PriceIndex';
import REITScreen       from './components/REITScreen';
import AffordabilityMap from './components/AffordabilityMap';
import CapRateMonitor   from './components/CapRateMonitor';
import './RealEstateMarket.css';

const SUB_TABS = [
  { id: 'price-index',       label: 'Price Index'       },
  { id: 'reit-screen',       label: 'REIT Screen'       },
  { id: 'affordability-map', label: 'Affordability Map' },
  { id: 'cap-rate-monitor',  label: 'Cap Rate Monitor'  },
];

function RealEstateMarket() {
  const [activeTab, setActiveTab] = useState('price-index');
  const {
    priceIndexData, reitData, affordabilityData, capRateData, mortgageRates,
    caseShillerData, supplyData, homeownershipRate, rentCpi, reitEtf, treasury10y,
    housingStarts, existingHomeSales, rentalVacancy, medianHomePrice,
    isLive, lastUpdated, isLoading, fetchedOn, isCurrent,
  } = useRealEstateData();

  if (isLoading) return <MarketSkeleton />;

  return (
    <div className="re-market">
      <div className="re-sub-tabs" role="tablist" aria-label="Sub-tabs">
        {SUB_TABS.map(t => (
          <button
            key={t.id}
            role="tab"
            aria-selected={activeTab === t.id}
            className={`re-sub-tab${activeTab === t.id ? ' active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="re-status-bar">
        <span className={isLive ? 're-status-live' : ''}>
          {isLive ? '● Live · Yahoo Finance / BIS / FRED' : '○ Mock data — static'}
        </span>
        {lastUpdated && <span>Updated: {lastUpdated}</span>}
        {!isCurrent && fetchedOn && <span className="re-stale-badge">Stale · fetched {fetchedOn}</span>}
      </div>
      <div className="re-content">
        {activeTab === 'price-index'       && <PriceIndex priceIndexData={priceIndexData} caseShillerData={caseShillerData} housingStarts={housingStarts} existingHomeSales={existingHomeSales} />}
        {activeTab === 'reit-screen'       && <REITScreen reitData={reitData} reitEtf={reitEtf} />}
        {activeTab === 'affordability-map' && <AffordabilityMap affordabilityData={affordabilityData} mortgageRates={mortgageRates} supplyData={supplyData} medianHomePrice={medianHomePrice} rentalVacancy={rentalVacancy} />}
        {activeTab === 'cap-rate-monitor'  && <CapRateMonitor capRateData={capRateData} reitData={reitData} treasury10y={treasury10y} homeownershipRate={homeownershipRate} rentCpi={rentCpi} />}
      </div>
    </div>
  );
}

export default React.memo(RealEstateMarket);
