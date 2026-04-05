// src/markets/credit/CreditMarket.jsx
import React, { useState } from 'react';
import { useCreditData } from './data/useCreditData';
import IgHyDashboard from './components/IgHyDashboard';
import EmBonds       from './components/EmBonds';
import LoanMarket    from './components/LoanMarket';
import DefaultWatch  from './components/DefaultWatch';
import './CreditMarket.css';

const SUB_TABS = [
  { id: 'ighy',    label: 'IG / HY Dashboard' },
  { id: 'em',      label: 'EM Bonds'          },
  { id: 'loans',   label: 'Loan Market'       },
  { id: 'default', label: 'Default Watch'     },
];

export default function CreditMarket() {
  const [activeTab, setActiveTab] = useState('ighy');
  const { spreadData, emBondData, loanData, defaultData, isLive, lastUpdated, isLoading, fetchedOn, isCurrent } = useCreditData();

  if (isLoading) {
    return (
      <div className="credit-market credit-loading">
        <div className="credit-loading-spinner" />
        <span className="credit-loading-text">Loading credit data…</span>
      </div>
    );
  }

  return (
    <div className="credit-market">
      <div className="credit-sub-tabs">
        {SUB_TABS.map(t => (
          <button
            key={t.id}
            className={`credit-sub-tab${activeTab === t.id ? ' active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="credit-status-bar">
        <span className={isLive ? 'credit-status-live' : ''}>
          {isLive ? '● Live · FRED / Yahoo Finance' : '○ Mock data — static'}
        </span>
        {lastUpdated && <span>Updated: {lastUpdated}</span>}
        {!isCurrent && fetchedOn && <span className="credit-stale-badge">Stale · fetched {fetchedOn}</span>}
      </div>
      <div className="credit-content">
        {activeTab === 'ighy'    && <IgHyDashboard spreadData={spreadData} />}
        {activeTab === 'em'      && <EmBonds       emBondData={emBondData} />}
        {activeTab === 'loans'   && <LoanMarket    loanData={loanData} />}
        {activeTab === 'default' && <DefaultWatch  defaultData={defaultData} />}
      </div>
    </div>
  );
}
