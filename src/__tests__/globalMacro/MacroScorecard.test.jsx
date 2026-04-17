import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MacroScorecard from '../../markets/globalMacro/components/MacroScorecard';
const scorecardData = [
  { code: 'US', name: 'United States', flag: '🇺🇸', region: 'G7', gdp: 2.5, cpi: 3.4, rate: 5.25, unemp: 3.7, debt: 123.3 },
  { code: 'EA', name: 'Euro Area', flag: '🇪🇺', region: 'G7', gdp: 0.4, cpi: 5.4, rate: 4.50, unemp: 6.5, debt: 91.2 },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', region: 'G7', gdp: 0.1, cpi: 6.7, rate: 5.25, unemp: 4.2, debt: 101.9 },
  { code: 'JP', name: 'Japan', flag: '🇯🇵', region: 'G7', gdp: 1.9, cpi: 3.2, rate: -0.10, unemp: 2.6, debt: 261.3 },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', region: 'G7', gdp: 1.1, cpi: 3.9, rate: 4.75, unemp: 5.8, debt: 106.5 },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', region: 'G7', gdp: 2.0, cpi: 5.6, rate: 4.10, unemp: 3.8, debt: 52.1 },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪', region: 'G7', gdp: -0.1, cpi: 6.2, rate: 3.50, unemp: 7.8, debt: 35.6 },
  { code: 'CN', name: 'China', flag: '🇨🇳', region: 'EM', gdp: 5.2, cpi: 0.2, rate: 3.45, unemp: 5.2, debt: 77.1 },
  { code: 'IN', name: 'India', flag: '🇮🇳', region: 'EM', gdp: 8.2, cpi: 5.4, rate: 6.50, unemp: 7.8, debt: 82.3 },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷', region: 'EM', gdp: 2.9, cpi: 4.6, rate: 10.50, unemp: 8.1, debt: 73.5 },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷', region: 'EM', gdp: 1.4, cpi: 3.6, rate: 3.50, unemp: 2.7, debt: 54.3 },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽', region: 'EM', gdp: 3.2, cpi: 4.8, rate: 11.25, unemp: 2.8, debt: 53.8 },
];

describe('MacroScorecard', () => {
  it('renders panel title', () => {
    render(<MacroScorecard scorecardData={scorecardData} />);
    expect(screen.getByText(/macro scorecard/i)).toBeInTheDocument();
  });

  it('renders all 5 column headers', () => {
    render(<MacroScorecard scorecardData={scorecardData} />);
    expect(screen.getAllByText(/gdp/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/cpi inflation/i)).toBeInTheDocument();
    expect(screen.getByText(/policy rate/i)).toBeInTheDocument();
    expect(screen.getByText(/unemp/i)).toBeInTheDocument();
    expect(screen.getAllByText(/debt/i).length).toBeGreaterThan(0);
  });

  it('renders all 12 country names', () => {
    render(<MacroScorecard scorecardData={scorecardData} />);
    ['United States','Euro Area','United Kingdom','Japan','Canada',
     'China','India','Brazil','South Korea','Australia','Mexico','Sweden'].forEach(name => {
      expect(screen.getAllByText(name).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('applies mac-heat-dg to India GDP (8.2 > 3)', () => {
    const { container } = render(<MacroScorecard scorecardData={scorecardData} />);
    expect(container.querySelectorAll('.mac-heat-dg').length).toBeGreaterThan(0);
  });

  it('applies mac-heat-dr to UK CPI (6.7 > 6)', () => {
    const { container } = render(<MacroScorecard scorecardData={scorecardData} />);
    expect(container.querySelectorAll('.mac-heat-dr').length).toBeGreaterThan(0);
  });

  it('applies mac-heat-dr to Japan debt (261.3 > 120)', () => {
    const { container } = render(<MacroScorecard scorecardData={scorecardData} />);
    expect(container.querySelectorAll('.mac-heat-dr').length).toBeGreaterThan(0);
  });
});
