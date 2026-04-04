import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import YieldCurve from '../../markets/bonds/components/YieldCurve';

vi.mock('echarts-for-react', () => ({ default: () => <div data-testid="echarts-mock" /> }));

const mockData = {
  US: { '3m': 5.25, '6m': 5.10, '1y': 4.85, '2y': 4.60, '5y': 4.35, '10y': 4.20, '30y': 4.40 },
  DE: { '3m': 3.80, '6m': 3.70, '1y': 3.50, '2y': 3.20, '5y': 2.85, '10y': 2.65, '30y': 2.90 },
};

describe('YieldCurve', () => {
  it('renders panel title', () => {
    render(<YieldCurve yieldCurveData={mockData} />);
    expect(screen.getByText('Yield Curve')).toBeInTheDocument();
  });

  it('renders the echarts chart', () => {
    render(<YieldCurve yieldCurveData={mockData} />);
    expect(screen.getByTestId('echarts-mock')).toBeInTheDocument();
  });

  it('renders country count in subtitle', () => {
    render(<YieldCurve yieldCurveData={mockData} />);
    expect(screen.getByText(/2 countries/i)).toBeInTheDocument();
  });

  it('renders tenor axis labels in footer', () => {
    render(<YieldCurve yieldCurveData={mockData} />);
    expect(screen.getByText(/3m.*30y/i)).toBeInTheDocument();
  });
});
