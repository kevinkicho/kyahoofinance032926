import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import YieldCurve from '../../markets/bonds/components/YieldCurve';

vi.mock('../../components/SafeECharts/SafeECharts', () => ({ default: (props) => <div data-testid="echarts-mock" /> }));

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

const mockSpreadIndicators = {
  t10y2y: 0.42,
  t10y3m: -0.15,
  t5yie: 2.31,
  t10yie: 2.28,
  dfii10: 1.92,
};

describe('YieldCurve — spreadIndicators', () => {
  it('renders T10Y-2Y spread value', () => {
    render(<YieldCurve yieldCurveData={mockData} spreadIndicators={mockSpreadIndicators} />);
    expect(screen.getByText(/10Y.{1,3}2Y/i)).toBeInTheDocument();
    expect(screen.getByText(/0\.42/)).toBeInTheDocument();
  });

  it('renders spread indicator values when spreadIndicators provided', () => {
    render(<YieldCurve yieldCurveData={mockData} spreadIndicators={mockSpreadIndicators} />);
    // KPI strip always renders 10Y-2Y label; value shows the numeric spread
    expect(screen.getAllByText(/10Y.{1,3}2Y/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/0\.42/)).toBeInTheDocument();
  });

  it('renders without spreadIndicators (graceful null handling)', () => {
    render(<YieldCurve yieldCurveData={mockData} spreadIndicators={null} />);
    expect(screen.getByText('Yield Curve')).toBeInTheDocument();
    // KPI strip always shows the 10Y-2Y label; with null spreadIndicators the value shows em-dash
    expect(screen.getAllByText(/10Y.{1,3}2Y/i).length).toBeGreaterThan(0);
  });
});
