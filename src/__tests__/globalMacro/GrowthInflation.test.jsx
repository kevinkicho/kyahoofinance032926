import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import GrowthInflation from '../../markets/globalMacro/components/GrowthInflation';
import { growthInflationData } from '../../markets/globalMacro/data/mockGlobalMacroData';

vi.mock('echarts-for-react', () => ({ default: () => <div data-testid="echarts-mock" /> }));

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
