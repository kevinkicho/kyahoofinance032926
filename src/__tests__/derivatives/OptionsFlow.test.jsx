import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import OptionsFlow from '../../markets/derivatives/components/OptionsFlow';

const mockData = [
  { ticker: 'SPY',  strike: 520, expiry: '16 May 25', type: 'P', volume: 45200, openInterest: 12400, premium:  8.20, sentiment: 'bearish' },
  { ticker: 'NVDA', strike: 950, expiry: '20 Jun 25', type: 'C', volume: 38900, openInterest:  8200, premium: 24.50, sentiment: 'bullish' },
  { ticker: 'TLT',  strike:  90, expiry: '16 May 25', type: 'C', volume: 12400, openInterest:  6800, premium:  2.20, sentiment: 'neutral' },
];

describe('OptionsFlow', () => {
  it('renders the panel title', () => {
    render(<OptionsFlow optionsFlow={mockData} />);
    expect(screen.getByText('Options Flow')).toBeInTheDocument();
  });

  it('renders all ticker symbols', () => {
    render(<OptionsFlow optionsFlow={mockData} />);
    expect(screen.getAllByText('SPY').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('NVDA')).toBeInTheDocument();
    expect(screen.getByText('TLT')).toBeInTheDocument();
  });

  it('renders C/P type with appropriate class', () => {
    const { container } = render(<OptionsFlow optionsFlow={mockData} />);
    expect(container.querySelectorAll('.flow-put').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('.flow-call').length).toBeGreaterThan(0);
  });

  it('renders sentiment labels with correct class', () => {
    const { container } = render(<OptionsFlow optionsFlow={mockData} />);
    expect(container.querySelectorAll('.flow-bullish').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('.flow-bearish').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('.flow-neutral').length).toBeGreaterThan(0);
  });

  it('renders column headers', () => {
    render(<OptionsFlow optionsFlow={mockData} />);
    expect(screen.getByText('Volume')).toBeInTheDocument();
    expect(screen.getByText('OI')).toBeInTheDocument();
    expect(screen.getByText('Premium')).toBeInTheDocument();
  });

  it('renders KPI strip with total volume', () => {
    render(<OptionsFlow optionsFlow={mockData} />);
    expect(screen.getByText('Total Volume')).toBeInTheDocument();
  });

  it('renders Put/Call Ratio in KPI strip', () => {
    render(<OptionsFlow optionsFlow={mockData} />);
    expect(screen.getByText('Put/Call Ratio')).toBeInTheDocument();
  });

  it('renders Top Ticker in KPI strip', () => {
    render(<OptionsFlow optionsFlow={mockData} />);
    expect(screen.getByText('Top Ticker')).toBeInTheDocument();
    expect(screen.getByText('SPY')).toBeInTheDocument();
  });

  it('renders Avg Vol/OI in KPI strip', () => {
    render(<OptionsFlow optionsFlow={mockData} />);
    expect(screen.getByText('Avg Vol/OI')).toBeInTheDocument();
  });

  it('renders Call vs Put summary section', () => {
    render(<OptionsFlow optionsFlow={mockData} />);
    expect(screen.getByText('Call vs Put Volume + Sentiment Breakdown')).toBeInTheDocument();
    expect(screen.getByText('Call Volume')).toBeInTheDocument();
    expect(screen.getByText('Put Volume')).toBeInTheDocument();
  });

  it('renders sentiment breakdown in summary', () => {
    render(<OptionsFlow optionsFlow={mockData} />);
    expect(screen.getByText('Bullish')).toBeInTheDocument();
    expect(screen.getByText('Bearish')).toBeInTheDocument();
  });

  it('renders footer with explanation', () => {
    render(<OptionsFlow optionsFlow={mockData} />);
    expect(screen.getByText(/Vol\/OI > 1 = volume exceeds open interest/)).toBeInTheDocument();
  });

  it('renders strike prices with dollar formatting', () => {
    render(<OptionsFlow optionsFlow={mockData} />);
    expect(screen.getByText('$520')).toBeInTheDocument();
    expect(screen.getByText('$950')).toBeInTheDocument();
  });

  it('renders premium with dollar formatting', () => {
    render(<OptionsFlow optionsFlow={mockData} />);
    expect(screen.getByText('$8.20')).toBeInTheDocument();
    expect(screen.getByText('$24.50')).toBeInTheDocument();
  });

  it('renders expiry dates', () => {
    render(<OptionsFlow optionsFlow={mockData} />);
    expect(screen.getByText('16 May 25')).toBeInTheDocument();
    expect(screen.getByText('20 Jun 25')).toBeInTheDocument();
  });

  it('renders empty state when no data', () => {
    render(<OptionsFlow optionsFlow={[]} />);
    expect(screen.getByText('Options Flow')).toBeInTheDocument();
    expect(screen.getByText('Top Ticker')).toBeInTheDocument();
  });
});
