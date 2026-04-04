import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CatBondSpreads from '../../markets/insurance/components/CatBondSpreads';

const mockData = [
  { name: 'Kilimanjaro Re 2025-1', peril: 'US Hurricane', sponsor: 'Swiss Re',   spread: 620, rating: 'BB',  trigger: 'Indemnity',  maturity: 'Jan 2028', notional: 300, expectedLoss: 2.1 },
  { name: 'Montoya Re 2025-2',     peril: 'California EQ', sponsor: 'Allianz',   spread: 840, rating: 'B+',  trigger: 'Indemnity',  maturity: 'Apr 2028', notional: 200, expectedLoss: 3.2 },
  { name: 'Resilience Re 2024-A',  peril: 'EU Windstorm',  sponsor: 'Munich Re', spread: 390, rating: 'BB+', trigger: 'Industry Loss', maturity: 'Dec 2026', notional: 400, expectedLoss: 1.2 },
];

describe('CatBondSpreads', () => {
  it('renders the panel title', () => {
    render(<CatBondSpreads catBondSpreads={mockData} />);
    expect(screen.getByText('Cat Bond Spreads')).toBeInTheDocument();
  });

  it('renders all bond names', () => {
    render(<CatBondSpreads catBondSpreads={mockData} />);
    expect(screen.getByText('Kilimanjaro Re 2025-1')).toBeInTheDocument();
    expect(screen.getByText('Montoya Re 2025-2')).toBeInTheDocument();
    expect(screen.getByText('Resilience Re 2024-A')).toBeInTheDocument();
  });

  it('renders column headers', () => {
    render(<CatBondSpreads catBondSpreads={mockData} />);
    expect(screen.getByText('Bond')).toBeInTheDocument();
    expect(screen.getByText('Spread (bps)')).toBeInTheDocument();
    expect(screen.getByText('Rating')).toBeInTheDocument();
    expect(screen.getByText('Expected Loss %')).toBeInTheDocument();
  });

  it('applies ins-spread-high class for spread > 700', () => {
    const { container } = render(<CatBondSpreads catBondSpreads={mockData} />);
    expect(container.querySelectorAll('.ins-spread-high').length).toBeGreaterThan(0);
  });

  it('applies ins-spread-low class for spread < 500', () => {
    const { container } = render(<CatBondSpreads catBondSpreads={mockData} />);
    expect(container.querySelectorAll('.ins-spread-low').length).toBeGreaterThan(0);
  });
});
