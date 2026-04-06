// src/App.jsx
import React from 'react';
import './index.css';
import { ThemeProvider } from './hub/ThemeContext';
import HubLayout from './hub/HubLayout';
import { MARKETS } from './hub/markets.config';
import EquitiesMarket        from './markets/equities/EquitiesMarket';
import BondsMarket           from './markets/bonds/BondsMarket';
import FXMarket              from './markets/fx/FXMarket';
import DerivativesMarket     from './markets/derivatives/DerivativesMarket';
import RealEstateMarket      from './markets/realEstate/RealEstateMarket';
import InsuranceMarket       from './markets/insurance/InsuranceMarket';
import CommoditiesMarket     from './markets/commodities/CommoditiesMarket';
import GlobalMacroMarket     from './markets/globalMacro/GlobalMacroMarket';
import EquitiesDeepDiveMarket from './markets/equitiesDeepDive/EquitiesDeepDiveMarket';
import CryptoMarket          from './markets/crypto/CryptoMarket';
import CreditMarket          from './markets/credit/CreditMarket';
import SentimentMarket       from './markets/sentiment/SentimentMarket';
import CalendarMarket        from './markets/calendar/CalendarMarket';

const MARKET_COMPONENTS = {
  equities:          EquitiesMarket,
  bonds:             BondsMarket,
  fx:                FXMarket,
  derivatives:       DerivativesMarket,
  realEstate:        RealEstateMarket,
  insurance:         InsuranceMarket,
  commodities:       CommoditiesMarket,
  globalMacro:       GlobalMacroMarket,
  equitiesDeepDive:  EquitiesDeepDiveMarket,
  crypto:            CryptoMarket,
  credit:            CreditMarket,
  sentiment:         SentimentMarket,
  calendar:          CalendarMarket,
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '40px', color: '#f87171', fontFamily: 'monospace', background: 'var(--bg-primary)', minHeight: '100vh' }}>
          <h2 style={{ marginBottom: 12 }}>Something went wrong</h2>
          <pre style={{ fontSize: 13, whiteSpace: 'pre-wrap', color: 'var(--text-secondary)' }}>
            {this.state.error.message}
            {'\n\n'}
            {this.state.error.stack}
          </pre>
          <button
            onClick={() => this.setState({ error: null })}
            style={{ marginTop: 20, padding: '8px 16px', background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: 6, cursor: 'pointer' }}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function PopoutView({ marketId }) {
  const marketMeta = MARKETS.find(m => m.id === marketId);
  const MarketComponent = MARKET_COMPONENTS[marketId];
  const label = marketMeta ? marketMeta.label : marketId;
  const icon = marketMeta ? marketMeta.icon : '';

  React.useEffect(() => {
    document.title = label + ' — Market Hub';
  }, [label]);

  if (!MarketComponent) {
    return (
      <div style={{ padding: 40, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
        Unknown market: {marketId}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-primary)' }}>
      {/* Popout header bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        height: 44,
        flexShrink: 0,
        background: 'var(--bg-deep)',
        borderBottom: '1px solid var(--border-subtle)',
      }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>{icon}</span>
          {label}
          <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-dim)', marginLeft: 4 }}>— Pop-out View</span>
        </span>
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: 12,
            color: '#3b82f6',
            textDecoration: 'none',
            border: '1px solid #3b82f6',
            borderRadius: 6,
            padding: '4px 10px',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.12)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        >
          &#8617; Return to Hub
        </a>
      </div>
      {/* Market content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <MarketComponent />
      </div>
    </div>
  );
}

export default function App() {
  const popoutId = new URLSearchParams(window.location.search).get('popout');
  const isValidPopout = popoutId && MARKET_COMPONENTS[popoutId];

  if (isValidPopout) {
    return (
      <ThemeProvider>
        <ErrorBoundary>
          <PopoutView marketId={popoutId} />
        </ErrorBoundary>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <ErrorBoundary>
        <HubLayout />
      </ErrorBoundary>
    </ThemeProvider>
  );
}
