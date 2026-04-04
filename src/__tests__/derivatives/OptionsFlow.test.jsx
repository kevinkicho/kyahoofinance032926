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
    expect(screen.getByText('SPY')).toBeInTheDocument();
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
});
