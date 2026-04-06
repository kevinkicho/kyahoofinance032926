// src/markets/credit/CreditMarket.jsx
import React, { useState } from 'react';
import { useCreditData } from './data/useCreditData';
import MarketSkeleton from '../../hub/MarketSkeleton';
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

function CreditMarket() {
  const [activeTab, setActiveTab] = useState('ighy');
  const { spreadData, emBondData, loanData, defaultData, delinquencyRates, lendingStandards, commercialPaper, excessReserves, isLive, lastUpdated, isLoading, fetchedOn, isCurrent } = useCreditData();

  if (isLoading) return <MarketSkeleton />;

  return (
    <div className="credit-market">
      <div className="credit-sub-tabs" role="tablist" aria-label="Sub-tabs">
        {SUB_TABS.map(t => (
          <button
            key={t.id}
            role="tab"
            aria-selected={activeTab === t.id}
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
        {activeTab === 'ighy'    && <IgHyDashboard spreadData={spreadData} commercialPaper={commercialPaper} />}
        {activeTab === 'em'      && <EmBonds       emBondData={emBondData} />}
        {activeTab === 'loans'   && <LoanMarket    loanData={loanData} excessReserves={excessReserves} />}
        {activeTab === 'default' && <DefaultWatch  defaultData={defaultData} delinquencyRates={delinquencyRates} lendingStandards={lendingStandards} />}
      </div>
    </div>
  );
}

export default React.memo(CreditMarket);
