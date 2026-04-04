import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import REITScreen from '../../markets/realEstate/components/REITScreen';

const mockData = [
  { ticker: 'PLD',  name: 'Prologis',         sector: 'Industrial', dividendYield: 3.2, pFFO: 18.4, ytdReturn:  8.2, marketCap: 102 },
  { ticker: 'BXP',  name: 'Boston Properties', sector: 'Office',     dividendYield: 6.8, pFFO:  9.4, ytdReturn: -8.5, marketCap:  11 },
  { ticker: 'WELL', name: 'Welltower',         sector: 'Healthcare', dividendYield: 2.4, pFFO: 24.2, ytdReturn: 12.3, marketCap:  58 },
];

describe('REITScreen', () => {
  it('renders the panel title', () => {
    render(<REITScreen reitData={mockData} />);
    expect(screen.getByText('REIT Screen')).toBeInTheDocument();
  });

  it('renders all ticker symbols', () => {
    render(<REITScreen reitData={mockData} />);
    expect(screen.getByText('PLD')).toBeInTheDocument();
    expect(screen.getByText('BXP')).toBeInTheDocument();
    expect(screen.getByText('WELL')).toBeInTheDocument();
  });

  it('renders column headers', () => {
    render(<REITScreen reitData={mockData} />);
    expect(screen.getByText('Yield')).toBeInTheDocument();
    expect(screen.getByText('P/FFO')).toBeInTheDocument();
    expect(screen.getByText('YTD')).toBeInTheDocument();
  });

  it('shows positive YTD return in green', () => {
    const { container } = render(<REITScreen reitData={mockData} />);
    const positiveCells = container.querySelectorAll('.reit-positive');
    expect(positiveCells.length).toBeGreaterThan(0);
  });

  it('shows negative YTD return in red', () => {
    const { container } = render(<REITScreen reitData={mockData} />);
    const negativeCells = container.querySelectorAll('.reit-negative');
    expect(negativeCells.length).toBeGreaterThan(0);
  });
});
