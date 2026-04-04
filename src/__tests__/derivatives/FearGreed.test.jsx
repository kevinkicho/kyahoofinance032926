import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import FearGreed from '../../markets/derivatives/components/FearGreed';

const mockData = {
  score: 38,
  label: 'Fear',
  indicators: [
    { name: 'VIX Level',        value: 18.4, score: 35, label: 'Fear'         },
    { name: 'Put/Call Ratio',   value:  1.18, score: 28, label: 'Fear'         },
    { name: 'Market Momentum',  value: -2.4, score: 32, label: 'Fear'         },
    { name: 'Safe Haven Demand',value:  3.8, score: 25, label: 'Extreme Fear' },
    { name: 'Junk Bond Demand', value:  1.2, score: 52, label: 'Neutral'      },
    { name: 'Market Breadth',   value: 42.1, score: 41, label: 'Fear'         },
    { name: 'Stock Price Str.', value: 18.0, score: 55, label: 'Neutral'      },
  ],
};

describe('FearGreed', () => {
  it('renders the panel title', () => {
    render(<FearGreed fearGreedData={mockData} />);
    expect(screen.getByText('Fear & Greed')).toBeInTheDocument();
  });

  it('renders the composite score', () => {
    render(<FearGreed fearGreedData={mockData} />);
    expect(screen.getByText('38')).toBeInTheDocument();
  });

  it('renders the composite label', () => {
    render(<FearGreed fearGreedData={mockData} />);
    expect(screen.getAllByText('Fear').length).toBeGreaterThanOrEqual(1);
  });

  it('renders all 7 indicator names', () => {
    render(<FearGreed fearGreedData={mockData} />);
    expect(screen.getByText('VIX Level')).toBeInTheDocument();
    expect(screen.getByText('Put/Call Ratio')).toBeInTheDocument();
    expect(screen.getByText('Junk Bond Demand')).toBeInTheDocument();
  });

  it('renders 7 indicator bars', () => {
    const { container } = render(<FearGreed fearGreedData={mockData} />);
    expect(container.querySelectorAll('.fg-row-bar').length).toBe(7);
  });
});
