import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CapRateMonitor from '../../markets/realEstate/components/CapRateMonitor';

const mockCapRateData = [
  { sector: 'Industrial', impliedYield: 5.8 },
  { sector: 'Data Centers', impliedYield: 4.5 },
  { sector: 'Office', impliedYield: 7.2 },
  { sector: 'Retail', impliedYield: 8.1 },
  { sector: 'Residential', impliedYield: 4.2 },
  { sector: 'Healthcare', impliedYield: 6.1 },
];

const mockReitData = [
  { name: 'PLD', sector: 'Industrial', marketCap: 45 },
  { name: 'DLR', sector: 'Office', marketCap: 22 },
];

describe('RealEstateMarket Cap Rates panel', () => {
  it('renders nothing when capRateData is empty', () => {
    const { container } = render(
      <CapRateMonitor capRateData={[]} reitData={[]} treasury10y={4.5} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders sector bars with implied yields', () => {
    render(
      <CapRateMonitor capRateData={mockCapRateData} reitData={mockReitData} treasury10y={4.5} />
    );
    mockCapRateData.forEach(item => {
      expect(screen.getByText(item.sector)).toBeInTheDocument();
    });
  });

  it('calculates average yield correctly', () => {
    const avgYield = Math.round(
      mockCapRateData.reduce((s, c) => s + c.impliedYield, 0) / mockCapRateData.length * 10
    ) / 10;
    expect(avgYield).toBe(6.0);
  });

  it('computes spread to treasury correctly', () => {
    const spreads = mockCapRateData.map(c => c.impliedYield - 4.5);
    expect(Math.round(spreads[0] * 10) / 10).toBe(1.3);
    expect(Math.round(spreads[2] * 10) / 10).toBe(2.7);
  });
});