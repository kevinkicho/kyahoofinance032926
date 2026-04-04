import React from 'react';
import { MARKETS } from './markets.config';
import { currencySymbols } from '../utils/constants';
import './MarketTabBar.css';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'HKD', 'INR', 'CAD', 'AUD', 'BRL'];

export default function MarketTabBar({ activeMarket, setActiveMarket, currency, setCurrency }) {
  return (
    <div className="market-tab-bar">
      <nav className="market-tabs">
        {MARKETS.map(m => (
          <button
            key={m.id}
            className={`market-tab${activeMarket === m.id ? ' active' : ''}`}
            onClick={() => setActiveMarket(m.id)}
          >
            <span className="market-tab-icon">{m.icon}</span>
            <span className="market-tab-label">{m.label}</span>
          </button>
        ))}
      </nav>
      <div className="hub-currency-picker">
        <label className="hub-currency-label">Currency</label>
        <select
          className="hub-currency-select"
          value={currency}
          onChange={e => setCurrency(e.target.value)}
        >
          {CURRENCIES.map(c => (
            <option key={c} value={c}>{currencySymbols[c] || c} {c}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
