import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SectorRotation from '../../markets/equitiesDeepDive/components/SectorRotation';
const sectorData = {
  sectors: [
    { code: 'SPY', name: 'SPY', perf1m: 2.5, perf3m: 5.0 },
    { code: 'XLK', name: 'Technology', perf1m: 4.2, perf3m: 8.5 },
    { code: 'XLV', name: 'Healthcare', perf1m: 1.8, perf3m: 3.2 },
    { code: 'XLF', name: 'Financials', perf1m: 3.1, perf3m: 6.0 },
    { code: 'XLE', name: 'Energy', perf1m: -1.2, perf3m: 2.1 },
    { code: 'XLU', name: 'Utilities', perf1m: 0.5, perf3m: 1.8 },
  ],
};

vi.mock('../../components/SafeECharts/SafeECharts', () => ({ default: (props) => <div data-testid="echarts-mock" /> }));

describe('SectorRotation', () => {
  it('renders panel title', () => {
    render(<SectorRotation sectorData={sectorData} />);
    expect(screen.getByText(/sector rotation/i)).toBeInTheDocument();
  });

  it('renders ETF performance chart title', () => {
    render(<SectorRotation sectorData={sectorData} />);
    expect(screen.getByText(/etf performance/i)).toBeInTheDocument();
  });

  it('renders rotation quadrant chart title', () => {
    render(<SectorRotation sectorData={sectorData} />);
    expect(screen.getByText(/rotation quadrant/i)).toBeInTheDocument();
  });

  it('renders 2 echarts instances', () => {
    render(<SectorRotation sectorData={sectorData} />);
    expect(screen.getAllByTestId('echarts-mock')).toHaveLength(2);
  });

  it('handles null sectorData gracefully', () => {
    expect(() => render(<SectorRotation sectorData={null} />)).not.toThrow();
  });
});
