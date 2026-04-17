// src/__tests__/commodities/PriceDashboard.test.jsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PriceDashboard from '../../markets/commodities/components/PriceDashboard';
const priceDashboardData = [
  {
    sector: 'Energy',
    commodities: [
      { ticker: 'CL=F', name: 'WTI Crude', price: 82.14, change1d: 0.82, change1w: 1.23, change1m: -0.45, sparkline: [80, 81, 82, 81.5, 82.14] },
      { ticker: 'BZ=F', name: 'Brent Crude', price: 86.32, change1d: -0.54, change1w: 0.89, change1m: 1.12, sparkline: [85, 86, 87, 86.5, 86.32] },
      { ticker: 'NG=F', name: 'Natural Gas', price: 2.45, change1d: 1.23, change1w: -0.67, change1m: 3.45, sparkline: [2.3, 2.4, 2.5, 2.45, 2.45] },
      { ticker: 'RB=F', name: 'Gasoline', price: 2.78, change1d: -1.18, change1w: 0.34, change1m: -2.56, sparkline: [2.9, 2.8, 2.7, 2.78, 2.78] },
    ],
  },
  {
    sector: 'Metals',
    commodities: [
      { ticker: 'GC=F', name: 'Gold', price: 2345.60, change1d: 0.34, change1w: 1.56, change1m: 2.34, sparkline: [2300, 2320, 2340, 2345, 2345.60] },
      { ticker: 'SI=F', name: 'Silver', price: 28.45, change1d: -0.23, change1w: 0.89, change1m: 1.23, sparkline: [28, 28.2, 28.5, 28.45, 28.45] },
      { ticker: 'HG=F', name: 'Copper', price: 4.23, change1d: 0.67, change1w: -1.23, change1m: 0.45, sparkline: [4.2, 4.25, 4.3, 4.23, 4.23] },
      { ticker: 'PL=F', name: 'Platinum', price: 1012.30, change1d: -0.45, change1w: 0.23, change1m: -0.89, sparkline: [1020, 1015, 1010, 1012, 1012.30] },
    ],
  },
  {
    sector: 'Agriculture',
    commodities: [
      { ticker: 'ZW=F', name: 'Wheat', price: 612.50, change1d: -2.34, change1w: -1.12, change1m: -3.45, sparkline: [640, 630, 620, 612, 612.50] },
      { ticker: 'ZC=F', name: 'Corn', price: 445.25, change1d: 0.56, change1w: 1.23, change1m: -0.34, sparkline: [440, 442, 445, 445, 445.25] },
      { ticker: 'ZS=F', name: 'Soybeans', price: 1198.75, change1d: 0.89, change1w: -0.56, change1m: 1.67, sparkline: [1190, 1195, 1200, 1198, 1198.75] },
      { ticker: 'KC=F', name: 'Coffee', price: 186.40, change1d: -0.12, change1w: 2.34, change1m: 5.67, sparkline: [180, 183, 186, 186, 186.40] },
    ],
  },
];

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
    const cell = screen.getAllByText(/\+0\.82%/)[0];
    expect(cell.className).toContain('com-up');
  });

  it('applies com-down class to negative change1d value', () => {
    render(<PriceDashboard priceDashboardData={priceDashboardData} />);
    const cell = screen.getAllByText(/-1\.18%/)[0];
    expect(cell.className).toContain('com-down');
  });
});
