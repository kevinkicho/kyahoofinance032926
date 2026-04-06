// src/__tests__/commodities/PriceDashboard.test.jsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PriceDashboard from '../../markets/commodities/components/PriceDashboard';
import { priceDashboardData } from '../../markets/commodities/data/mockCommoditiesData';

describe('PriceDashboard', () => {
  it('renders all 3 sector group headers', () => {
    render(<PriceDashboard priceDashboardData={priceDashboardData} />);
    expect(screen.getByText(/energy/i)).toBeInTheDocument();
    expect(screen.getByText(/metals/i)).toBeInTheDocument();
    expect(screen.getByText(/agriculture/i)).toBeInTheDocument();
  });

  it('renders all 12 commodity names', () => {
    render(<PriceDashboard priceDashboardData={priceDashboardData} />);
    ['WTI Crude', 'Brent Crude', 'Natural Gas', 'Gasoline',
     'Gold', 'Silver', 'Copper', 'Platinum',
     'Wheat', 'Corn', 'Soybeans', 'Coffee'].forEach(name => {
      expect(screen.getAllByText(name).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders column headers', () => {
    render(<PriceDashboard priceDashboardData={priceDashboardData} />);
    expect(screen.getByText('1d%')).toBeInTheDocument();
    expect(screen.getByText('1w%')).toBeInTheDocument();
    expect(screen.getByText('1m%')).toBeInTheDocument();
  });

  it('applies com-up class to positive change1d value', () => {
    render(<PriceDashboard priceDashboardData={priceDashboardData} />);
    // WTI Crude has change1d: 0.82 (positive) — should have com-up class
    const cell = screen.getAllByText(/\+0\.82%/)[0];
    expect(cell.className).toContain('com-up');
  });

  it('applies com-down class to negative change1d value', () => {
    render(<PriceDashboard priceDashboardData={priceDashboardData} />);
    // Natural Gas has change1d: -1.18 (negative) — should have com-down class
    const cell = screen.getAllByText(/-1\.18%/)[0];
    expect(cell.className).toContain('com-down');
  });
});
