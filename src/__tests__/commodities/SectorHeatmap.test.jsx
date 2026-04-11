import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SectorHeatmap from '../../markets/commodities/components/SectorHeatmap';
import { sectorHeatmapData } from '../../markets/commodities/data/mockCommoditiesData';

describe('SectorHeatmap', () => {
  it('renders KPI strip with best/worst today', () => {
    render(<SectorHeatmap sectorHeatmapData={sectorHeatmapData} />);
    expect(screen.getByText('Best Today')).toBeInTheDocument();
    expect(screen.getByText('Worst Today')).toBeInTheDocument();
  });

  it('renders all 12 commodity names', () => {
    render(<SectorHeatmap sectorHeatmapData={sectorHeatmapData} />);
    ['WTI Crude', 'Brent Crude', 'Nat Gas', 'Gasoline',
     'Gold', 'Silver', 'Copper', 'Platinum',
     'Wheat', 'Corn', 'Soybeans', 'Coffee'].forEach(name => {
      expect(screen.getAllByText(name).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders column headers 1d%, 1w%, 1m%', () => {
    render(<SectorHeatmap sectorHeatmapData={sectorHeatmapData} />);
    sectorHeatmapData.columns.forEach(col => {
      expect(screen.getByText(col)).toBeInTheDocument();
    });
  });

  it('applies com-heat-dg class to strongly positive value (Gold m1: +5.21)', () => {
    const { container } = render(<SectorHeatmap sectorHeatmapData={sectorHeatmapData} />);
    expect(container.querySelectorAll('.com-heat-dg').length).toBeGreaterThan(0);
  });

  it('applies com-heat-dr class to strongly negative value (Wheat m1: -8.42)', () => {
    const { container } = render(<SectorHeatmap sectorHeatmapData={sectorHeatmapData} />);
    expect(container.querySelectorAll('.com-heat-dr').length).toBeGreaterThan(0);
  });
});
