import React, { useState } from 'react';
import { useRealEstateData } from './data/useRealEstateData';
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

export default function RealEstateMarket() {
  const [activeTab, setActiveTab] = useState('price-index');
  const { priceIndexData, reitData, affordabilityData, capRateData, isLive, lastUpdated } = useRealEstateData();

  return (
    <div className="re-market">
      <div className="re-sub-tabs">
        {SUB_TABS.map(t => (
          <button
            key={t.id}
            className={`re-sub-tab${activeTab === t.id ? ' active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="re-status-bar">
        <span className={isLive ? 're-status-live' : ''}>
          {isLive ? '● Live' : '○ Mock data — static'}
        </span>
        {lastUpdated && <span>Updated: {lastUpdated}</span>}
      </div>
      <div className="re-content">
        {activeTab === 'price-index'       && <PriceIndex       priceIndexData={priceIndexData} />}
        {activeTab === 'reit-screen'       && <REITScreen       reitData={reitData} />}
        {activeTab === 'affordability-map' && <AffordabilityMap affordabilityData={affordabilityData} />}
        {activeTab === 'cap-rate-monitor'  && <CapRateMonitor   capRateData={capRateData} />}
      </div>
    </div>
  );
}
