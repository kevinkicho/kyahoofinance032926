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

function fmtChangePct(v) {
  if (v == null) return '';
  return v >= 0 ? `+${v.toFixed(2)}%` : `${v.toFixed(2)}%`;
}

export default function InsuranceMarket() {
  const [activeTab, setActiveTab] = useState('cat-bond-spreads');
  const {
    catBondSpreads, combinedRatioData, reserveAdequacyData,
    reinsurancePricing, reinsurers, hyOAS, igOAS,
    isLive, lastUpdated, isLoading, fetchedOn, isCurrent,
  } = useInsuranceData();

  if (isLoading) {
    return (
      <div className="ins-market ins-loading">
        <div className="ins-loading-spinner" />
        <span className="ins-loading-text">Loading insurance data…</span>
      </div>
    );
  }

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
          {isLive ? '● Live · Yahoo Finance / FRED' : '○ Mock data — static'}
        </span>
        {lastUpdated && <span>Updated: {lastUpdated}</span>}
        {!isCurrent && fetchedOn && <span className="ins-stale-badge">Stale · fetched {fetchedOn}</span>}
        {hyOAS  != null && <span className="ins-status-spread">HY OAS: <strong>{hyOAS.toFixed(0)} bps</strong></span>}
        {igOAS  != null && <span className="ins-status-spread">IG OAS: <strong>{igOAS.toFixed(0)} bps</strong></span>}
        {reinsurers.map(r => (
          <span key={r.ticker} className={`ins-status-reinsurer ${r.changePct >= 0 ? 'ins-change-up' : 'ins-change-down'}`}>
            {r.ticker} {fmtChangePct(r.changePct)}
          </span>
        ))}
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
