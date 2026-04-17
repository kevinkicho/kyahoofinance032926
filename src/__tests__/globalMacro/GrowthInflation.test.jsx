import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import GrowthInflation from '../../markets/globalMacro/components/GrowthInflation';
const growthInflationData = {
  year: '2023',
  countries: [
    { code: 'US', name: 'United States', flag: '🇺🇸', gdp: 2.5, cpi: 3.4 },
    { code: 'EA', name: 'Euro Area', flag: '🇪🇺', gdp: 0.4, cpi: 5.4 },
    { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', gdp: 0.1, cpi: 6.7 },
    { code: 'JP', name: 'Japan', flag: '🇯🇵', gdp: 1.9, cpi: 3.2 },
    { code: 'CA', name: 'Canada', flag: '🇨🇦', gdp: 1.1, cpi: 3.9 },
    { code: 'AU', name: 'Australia', flag: '🇦🇺', gdp: 2.0, cpi: 5.6 },
    { code: 'SE', name: 'Sweden', flag: '🇸🇪', gdp: -0.1, cpi: 6.2 },
    { code: 'CN', name: 'China', flag: '🇨🇳', gdp: 5.2, cpi: 0.2 },
    { code: 'IN', name: 'India', flag: '🇮🇳', gdp: 8.2, cpi: 5.4 },
    { code: 'BR', name: 'Brazil', flag: '🇧🇷', gdp: 2.9, cpi: 4.6 },
    { code: 'KR', name: 'South Korea', flag: '🇰🇷', gdp: 1.4, cpi: 3.6 },
    { code: 'MX', name: 'Mexico', flag: '🇲🇽', gdp: 3.2, cpi: 4.8 },
  ],
};

vi.mock('../../components/SafeECharts/SafeECharts', () => ({ default: (props) => <div data-testid="echarts-mock" /> }));

describe('GrowthInflation', () => {
  it('renders panel title', () => {
    render(<GrowthInflation growthInflationData={growthInflationData} />);
    expect(screen.getByText(/growth & inflation/i)).toBeInTheDocument();
  });

  it('renders year in subtitle', () => {
    render(<GrowthInflation growthInflationData={growthInflationData} />);
    expect(screen.getByText(/2023/)).toBeInTheDocument();
  });

  it('renders GDP chart panel title', () => {
    render(<GrowthInflation growthInflationData={growthInflationData} />);
    expect(screen.getByText(/gdp growth/i)).toBeInTheDocument();
  });

  it('renders CPI chart panel title', () => {
    render(<GrowthInflation growthInflationData={growthInflationData} />);
    expect(screen.getByText(/cpi inflation/i)).toBeInTheDocument();
  });

  it('renders 2 echarts instances', () => {
    render(<GrowthInflation growthInflationData={growthInflationData} />);
    expect(screen.getAllByTestId('echarts-mock')).toHaveLength(2);
  });
});
