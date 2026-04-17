import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SectorHeatmap from '../../markets/commodities/components/SectorHeatmap';
const sectorHeatmapData = {
  commodities: [
    { ticker: 'CL=F', name: 'WTI Crude', sector: 'Energy', d1: 0.82, w1: 1.23, m1: -0.45 },
    { ticker: 'BZ=F', name: 'Brent Crude', sector: 'Energy', d1: -0.54, w1: 0.89, m1: 1.12 },
    { ticker: 'NG=F', name: 'Nat Gas', sector: 'Energy', d1: 1.23, w1: -0.67, m1: 3.45 },
    { ticker: 'RB=F', name: 'Gasoline', sector: 'Energy', d1: -1.18, w1: 0.34, m1: -2.56 },
    { ticker: 'GC=F', name: 'Gold', sector: 'Metals', d1: 0.34, w1: 1.56, m1: 5.21 },
    { ticker: 'SI=F', name: 'Silver', sector: 'Metals', d1: -0.23, w1: 0.89, m1: 1.23 },
    { ticker: 'HG=F', name: 'Copper', sector: 'Metals', d1: 0.67, w1: -1.23, m1: 0.45 },
    { ticker: 'PL=F', name: 'Platinum', sector: 'Metals', d1: -0.45, w1: 0.23, m1: -0.89 },
    { ticker: 'ZW=F', name: 'Wheat', sector: 'Agriculture', d1: -2.34, w1: -1.12, m1: -8.42 },
    { ticker: 'ZC=F', name: 'Corn', sector: 'Agriculture', d1: 0.56, w1: 1.23, m1: -0.34 },
    { ticker: 'ZS=F', name: 'Soybeans', sector: 'Agriculture', d1: 0.89, w1: -0.56, m1: 1.67 },
    { ticker: 'KC=F', name: 'Coffee', sector: 'Agriculture', d1: -0.12, w1: 2.34, m1: 5.67 },
  ],
  columns: ['1d%', '1w%', '1m%'],
};

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
