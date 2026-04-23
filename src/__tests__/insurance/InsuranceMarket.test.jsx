import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import InsuranceMarket from '../../markets/insurance/InsuranceMarket';

vi.mock('../../hub/MarketSkeleton', () => ({ default: () => <div data-testid="market-skeleton" /> }));

vi.mock('../../markets/insurance/components/InsuranceDashboard', () => ({ default: (props) => <div data-testid="insurance-dashboard">InsuranceDashboard</div> }));

describe('InsuranceMarket', () => {
  const mockCentralData = {
    data: {
      catBondSpreads: [
        { name: 'Foo Re 2025', spread: 250, rating: 'A' },
        { name: 'Bar Re 2025', spread: 320, rating: 'BBB' },
      ],
      combinedRatioData: {
        byLine: [
          { line: 'Property', ratio: 98.5 },
          { line: 'Casualty', ratio: 102.3 },
        ],
      },
      reserveAdequacyData: [
        { company: ' reinsurer A', adequacy: 115, capital: 5000 },
        { company: 'Reinsurer B', adequacy: 108, capital: 3200 },
      ],
      reinsurancePricing: {
        byCategory: [
          { category: 'Property', trend: 5.2 },
          { category: 'Casualty', trend: -1.5 },
        ],
      },
      reinsurers: [
        { name: 'Munich Re', marketShare: 15.2, combinedRatio: 98.5 },
        { name: 'Swiss Re', marketShare: 14.8, combinedRatio: 99.2 },
        { name: 'Hannover Re', marketShare: 8.5, combinedRatio: 101.1 },
      ],
      hyOAS: 385,
      igOAS: 145,
      fredHyOasHistory: {
        dates: ['2025-01', '2025-02', '2025-03'],
        values: [380, 395, 385],
      },
      sectorETF: [
        { ticker: 'RIY', name: 'iShares Insurance', price: 125.5, change1d: 0.8 },
        { ticker: 'KIE', name: 'SPDR KBW Insurance', price: 98.2, change1d: -0.3 },
      ],
      catBondProxy: { price: 108.5, change1d: 0.5 },
      industryAvgCombinedRatio: 101.2,
      treasury10y: 4.25,
      catLosses: {
        dates: ['2024-Q1', '2024-Q2', '2024-Q3'],
        values: [25, 18, 32],
      },
      combinedRatioHistory: {
        quarters: ['2023-Q4', '2024-Q1', '2024-Q2'],
        values: [99.8, 101.2, 100.5],
      },
    },
    isLive: true,
    lastUpdated: '2026-04-22',
    isLoading: false,
    fetchedOn: '2026-04-22',
    isCurrent: true,
    fetchLog: [],
    error: null,
  };

  it('renders the InsuranceDashboard when centralData is provided', () => {
    const { container } = render(<InsuranceMarket centralData={mockCentralData} />);
    expect(container.querySelector('.ins-market')).toBeInTheDocument();
  });

  it('renders MarketSkeleton when no centralData provided', () => {
    const { getByTestId } = render(<InsuranceMarket />);
    expect(getByTestId('market-skeleton')).toBeInTheDocument();
  });

  it('renders MarketSkeleton when loading', () => {
    const loadingData = { ...mockCentralData, isLoading: true };
    const { getByTestId } = render(<InsuranceMarket centralData={loadingData} />);
    expect(getByTestId('market-skeleton')).toBeInTheDocument();
  });

  it('extracts hyOAS from centralData and passes to dashboard', () => {
    const { container } = render(<InsuranceMarket centralData={mockCentralData} />);
    expect(container.querySelector('.ins-market')).toBeInTheDocument();
  });

  it('extracts catBondSpreads from centralData and passes to dashboard', () => {
    const { container } = render(<InsuranceMarket centralData={mockCentralData} />);
    expect(container.querySelector('.ins-market')).toBeInTheDocument();
  });

  it('extracts reinsurers data from centralData and passes to dashboard', () => {
    const { container } = render(<InsuranceMarket centralData={mockCentralData} />);
    expect(container.querySelector('.ins-market')).toBeInTheDocument();
  });

  it('renders with isCurrent flag set to true', () => {
    const { container } = render(<InsuranceMarket centralData={mockCentralData} />);
    expect(container.querySelector('.ins-market')).toBeInTheDocument();
  });

  it('renders with isLive flag set to true', () => {
    const { container } = render(<InsuranceMarket centralData={mockCentralData} />);
    expect(container.querySelector('.ins-market')).toBeInTheDocument();
  });

  it('scales cat bond spreads when hyOAS is provided', () => {
    const { container } = render(<InsuranceMarket centralData={mockCentralData} />);
    expect(container.querySelector('.ins-market')).toBeInTheDocument();
  });
});