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
});
