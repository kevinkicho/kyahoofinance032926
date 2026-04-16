import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SectorRotation from '../../markets/equitiesDeepDive/components/SectorRotation';
import { sectorData } from '../../markets/equitiesDeepDive/data/mockEquityDeepDiveData';

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
