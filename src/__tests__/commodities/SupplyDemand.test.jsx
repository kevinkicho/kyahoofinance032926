// src/__tests__/commodities/SupplyDemand.test.jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SupplyDemand from '../../markets/commodities/components/SupplyDemand';
const supplyDemandData = {
  crudeStocks:     { periods: ['2024-01', '2024-02', '2024-03', '2024-04'], values: [440, 435, 430, 428], avg5yr: 450 },
  natGasStorage:   { periods: ['2024-01', '2024-02', '2024-03', '2024-04'], values: [2500, 2450, 2400, 2380], avg5yr: 2600 },
  crudeProduction: { periods: ['2024-01', '2024-02', '2024-03', '2024-04'], values: [13.1, 13.2, 13.3, 13.2] },
};

vi.mock('../../components/SafeECharts/SafeECharts', () => ({ default: (props) => <div data-testid="echarts-mock" /> }));

describe('SupplyDemand', () => {
  it('renders panel title', () => {
    render(<SupplyDemand supplyDemandData={supplyDemandData} />);
    expect(screen.getByText(/supply & demand/i)).toBeInTheDocument();
  });

  it('renders crude oil stocks panel', () => {
    render(<SupplyDemand supplyDemandData={supplyDemandData} />);
    expect(screen.getByText(/crude oil/i)).toBeInTheDocument();
  });

  it('renders natural gas storage panel', () => {
    render(<SupplyDemand supplyDemandData={supplyDemandData} />);
    expect(screen.getByText(/natural gas/i)).toBeInTheDocument();
  });

  it('renders crude production panel', () => {
    render(<SupplyDemand supplyDemandData={supplyDemandData} />);
    expect(screen.getAllByText(/production/i).length).toBeGreaterThanOrEqual(1);
  });

  it('renders 3 echarts instances', () => {
    render(<SupplyDemand supplyDemandData={supplyDemandData} />);
    expect(screen.getAllByTestId('echarts-mock')).toHaveLength(3);
  });

  it('handles null supplyDemandData gracefully', () => {
    const nullData = {
      crudeStocks:     { periods: [], values: [], avg5yr: null },
      natGasStorage:   { periods: [], values: [], avg5yr: null },
      crudeProduction: { periods: [], values: [] },
    };
    expect(() => render(<SupplyDemand supplyDemandData={nullData} />)).not.toThrow();
  });
});
