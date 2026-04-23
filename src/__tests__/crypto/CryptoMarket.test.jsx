import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import CryptoMarket from '../../markets/crypto/CryptoMarket';

const mockCentralData = {
  isLoading: false,
  isLive: true,
  isCurrent: true,
  lastUpdated: '2026-04-22',
  fetchedOn: '2026-04-22',
  error: null,
  fetchLog: [],
  provenance: {},
  refetch: () => {},
  data: {
    coinMarketData: {
      coins: [
        { id: 'bitcoin', symbol: 'btc', name: 'Bitcoin', current_price: 65000, market_cap: 1200000000000, price_change_percentage_24h: 2.5 },
        { id: 'ethereum', symbol: 'eth', name: 'Ethereum', current_price: 3200, market_cap: 380000000000, price_change_percentage_24h: 1.8 },
      ],
    },
    fearGreedData: { value: 65, label: 'Greed', history: { dates: ['2026-04-20'], values: [60] } },
    defiData: { total: 150, chains: [] },
    fundingData: { rates: [] },
    onChainData: { hashrate: { history: [] }, fees: {} },
    stablecoinMcap: 150000000000,
    btcDominance: 52,
    topExchanges: [],
    ethGas: 20,
  },
};

describe('CryptoMarket', () => {
  it('renders skeleton when no centralData provided', () => {
    const { container } = render(<CryptoMarket />);
    expect(container.querySelector('.skeleton-market')).toBeTruthy();
  });

  it('renders skeleton when loading', () => {
    const { container } = render(<CryptoMarket centralData={{ isLoading: true, data: null }} />);
    expect(container.querySelector('.skeleton-market')).toBeTruthy();
  });

  it('renders fetched status when live', () => {
    render(<CryptoMarket centralData={mockCentralData} />);
    expect(screen.getByText(/Crypto/)).toBeInTheDocument();
  });

  it('renders unavailable message when not live', () => {
    const notLive = { ...mockCentralData, isLive: false };
    render(<CryptoMarket centralData={notLive} />);
    expect(screen.getAllByText(/PENDING/).length).toBeGreaterThan(0);
  });

  it('renders bitcoin price', () => {
    render(<CryptoMarket centralData={mockCentralData} />);
    expect(screen.getAllByText('$65000.00').length).toBeGreaterThan(0);
  });

  it('renders BTC dominance', () => {
    render(<CryptoMarket centralData={mockCentralData} />);
    expect(screen.getByText(/52/)).toBeInTheDocument();
  });
});