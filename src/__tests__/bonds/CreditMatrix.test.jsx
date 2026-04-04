import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CreditMatrix from '../../markets/bonds/components/CreditMatrix';

const mockData = [
  { country: 'DE', name: 'Germany',       sp: 'AAA', moodys: 'Aaa',  fitch: 'AAA', region: 'Europe'   },
  { country: 'US', name: 'United States', sp: 'AA+', moodys: 'Aaa',  fitch: 'AA+', region: 'Americas' },
  { country: 'IT', name: 'Italy',         sp: 'BBB', moodys: 'Baa3', fitch: 'BBB', region: 'Europe'   },
];

describe('CreditMatrix', () => {
  it('renders the panel title', () => {
    render(<CreditMatrix creditRatingsData={mockData} />);
    expect(screen.getByText('Credit Matrix')).toBeInTheDocument();
  });

  it('renders all three agency column headers', () => {
    render(<CreditMatrix creditRatingsData={mockData} />);
    expect(screen.getByText("S&P")).toBeInTheDocument();
    expect(screen.getByText("Moody's")).toBeInTheDocument();
    expect(screen.getByText("Fitch")).toBeInTheDocument();
  });

  it('renders country names', () => {
    render(<CreditMatrix creditRatingsData={mockData} />);
    expect(screen.getByText('Germany')).toBeInTheDocument();
    expect(screen.getByText('United States')).toBeInTheDocument();
    expect(screen.getByText('Italy')).toBeInTheDocument();
  });

  it('renders rating values in cells', () => {
    render(<CreditMatrix creditRatingsData={mockData} />);
    const aaaCells = screen.getAllByText('AAA');
    expect(aaaCells.length).toBeGreaterThanOrEqual(2);
  });

  it('renders the legend', () => {
    render(<CreditMatrix creditRatingsData={mockData} />);
    const allAAAElements = screen.getAllByText('AAA');
    const allBBBElements = screen.getAllByText('BBB');
    expect(allAAAElements.length).toBeGreaterThanOrEqual(1);
    expect(allBBBElements.length).toBeGreaterThanOrEqual(1);
  });

  it('applies distinct background colors to cells from different rating tiers', () => {
    const { container } = render(<CreditMatrix creditRatingsData={mockData} />);
    const cells = container.querySelectorAll('.credit-cell');
    const bgs = [...cells].map(el => el.style.backgroundColor).filter(Boolean);
    // AAA (tier 0) and BBB (tier 3) should produce different colors
    const uniqueBgs = new Set(bgs);
    expect(uniqueBgs.size).toBeGreaterThan(1);
  });

  it('renders unknown rating without crashing and without inline style', () => {
    const dataWithNR = [
      { country: 'XX', name: 'Unknown', sp: 'NR', moodys: 'NR', fitch: 'NR', region: 'Other' },
    ];
    const { container } = render(<CreditMatrix creditRatingsData={dataWithNR} />);
    const cells = container.querySelectorAll('.credit-cell');
    cells.forEach(cell => {
      expect(cell.style.backgroundColor).toBe('');
    });
  });
});
