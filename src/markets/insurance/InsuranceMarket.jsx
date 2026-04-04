import React, { useState } from 'react';
import { useInsuranceData } from './data/useInsuranceData';
import CatBondSpreads       from './components/CatBondSpreads';
import CombinedRatioMonitor from './components/CombinedRatioMonitor';
import ReserveAdequacy      from './components/ReserveAdequacy';
import ReinsurancePricing   from './components/ReinsurancePricing';
import './InsuranceMarket.css';

const SUB_TABS = [
  { id: 'cat-bond-spreads',    label: 'Cat Bond Spreads'    },
  { id: 'combined-ratio',      label: 'Combined Ratio'      },
  { id: 'reserve-adequacy',    label: 'Reserve Adequacy'    },
  { id: 'reinsurance-pricing', label: 'Reinsurance Pricing' },
];

export default function InsuranceMarket() {
  const [activeTab, setActiveTab] = useState('cat-bond-spreads');
  const { catBondSpreads, combinedRatioData, reserveAdequacyData, reinsurancePricing, isLive, lastUpdated } = useInsuranceData();

  return (
    <div className="ins-market">
      <div className="ins-sub-tabs">
        {SUB_TABS.map(t => (
          <button
            key={t.id}
            className={`ins-sub-tab${activeTab === t.id ? ' active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="ins-status-bar">
        <span className={isLive ? 'ins-status-live' : ''}>
          {isLive ? '● Live' : '○ Mock data — static'}
        </span>
        {lastUpdated && <span>Updated: {lastUpdated}</span>}
      </div>
      <div className="ins-content">
        {activeTab === 'cat-bond-spreads'    && <CatBondSpreads       catBondSpreads={catBondSpreads} />}
        {activeTab === 'combined-ratio'      && <CombinedRatioMonitor combinedRatioData={combinedRatioData} />}
        {activeTab === 'reserve-adequacy'    && <ReserveAdequacy      reserveAdequacyData={reserveAdequacyData} />}
        {activeTab === 'reinsurance-pricing' && <ReinsurancePricing   reinsurancePricing={reinsurancePricing} />}
      </div>
    </div>
  );
}
