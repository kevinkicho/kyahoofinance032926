import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PriceIndex from '../../markets/realEstate/components/PriceIndex';

vi.mock('../../components/SafeECharts/SafeECharts', () => ({ default: (props) => <div data-testid="echarts-mock" /> }));

const mockData = {
  US: { dates: ['Q1 22', 'Q2 22', 'Q3 22'], values: [200, 210, 205] },
  UK: { dates: ['Q1 22', 'Q2 22', 'Q3 22'], values: [175, 180, 176] },
};

describe('PriceIndex', () => {
  it('renders the panel title', () => {
    render(<PriceIndex priceIndexData={mockData} />);
    expect(screen.getByText('Price Index')).toBeInTheDocument();
  });

  it('renders the echarts chart', () => {
    render(<PriceIndex priceIndexData={mockData} />);
    expect(screen.getByTestId('echarts-mock')).toBeInTheDocument();
  });

  it('renders market count in subtitle', () => {
    render(<PriceIndex priceIndexData={mockData} />);
    expect(screen.getByText(/2 markets/i)).toBeInTheDocument();
  });

  it('renders baseline note in footer', () => {
    render(<PriceIndex priceIndexData={mockData} />);
    expect(screen.getByText(/Index base = 100/)).toBeInTheDocument();
  });
});
