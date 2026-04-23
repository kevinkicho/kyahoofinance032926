import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PriceIndex from '../../markets/realEstate/components/PriceIndex';

vi.mock('../../hub/ThemeContext', () => ({
  useTheme: vi.fn(() => ({
    colors: {
      text: '#fff',
      textSecondary: '#94a3b8',
      textDim: '#64748b',
      textMuted: '#475569',
      tooltipBg: '#1e293b',
      tooltipBorder: '#334155',
      cardBg: '#1e293b',
    },
  })),
}));

vi.mock('../../components/SafeECharts/SafeECharts', () => ({ default: (props) => <div data-testid="echarts-mock" /> }));

describe('PriceIndex', () => {
  const mockPriceIndexData = {
    US: { dates: ['2023-Q1', '2023-Q2', '2023-Q3', '2023-Q4', '2024-Q1'], values: [100, 102, 101, 103, 105] },
    UK: { dates: ['2023-Q1', '2023-Q2', '2023-Q3', '2023-Q4', '2024-Q1'], values: [100, 98, 97, 99, 101] },
    DE: { dates: ['2023-Q1', '2023-Q2', '2023-Q3', '2023-Q4', '2024-Q1'], values: [100, 101, 102, 103, 104] },
  };

  const mockCaseShillerData = {
    national: { dates: ['2024-01', '2024-02', '2024-03', '2024-04'], values: [178, 179, 180, 181] },
    metros: {
      'New York': { latest: 215, yoy: 3.2 },
      'Los Angeles': { latest: 198, yoy: 2.8 },
      'Chicago': { latest: 165, yoy: 1.5 },
    },
  };

  const mockHousingStarts = {
    dates: ['2024-01', '2024-02', '2024-03', '2024-04'],
    starts: [1450, 1520, 1480, 1600],
    permits: [1550, 1620, 1580, 1700],
  };

  const mockExistingHomeSales = {
    dates: ['2024-01', '2024-02', '2024-03', '2024-04'],
    values: [4100000, 4300000, 4200000, 4500000],
  };

  it('renders the panel title', () => {
    render(<PriceIndex priceIndexData={mockPriceIndexData} />);
    expect(screen.getByText('Price Index')).toBeInTheDocument();
  });

  it('renders market count in subtitle', () => {
    render(<PriceIndex priceIndexData={mockPriceIndexData} />);
    expect(screen.getByText(/3 markets/)).toBeInTheDocument();
  });

  it('renders the BIS chart', () => {
    render(<PriceIndex priceIndexData={mockPriceIndexData} />);
    expect(screen.getByText('Global House Price Indices (BIS)')).toBeInTheDocument();
  });

  it('calculates and displays US YoY growth percentage', () => {
    render(<PriceIndex priceIndexData={mockPriceIndexData} />);
    expect(screen.getByText(/US YoY/)).toBeInTheDocument();
  });

  it('displays fastest growing market', () => {
    render(<PriceIndex priceIndexData={mockPriceIndexData} />);
    expect(screen.getByText(/Fastest Growing/)).toBeInTheDocument();
    expect(screen.getByText('US')).toBeInTheDocument();
  });

  it('renders Case-Shiller metro list when provided', () => {
    render(<PriceIndex priceIndexData={mockPriceIndexData} caseShillerData={mockCaseShillerData} />);
    expect(screen.getByText('US Metro Indices (Case-Shiller)')).toBeInTheDocument();
    expect(screen.getByText('New York')).toBeInTheDocument();
    expect(screen.getByText('Los Angeles')).toBeInTheDocument();
  });

  it('renders housing starts chart when provided', () => {
    render(<PriceIndex priceIndexData={mockPriceIndexData} housingStarts={mockHousingStarts} />);
    expect(screen.getByText('Housing Starts & Building Permits (24-Month)')).toBeInTheDocument();
  });

  it('renders existing home sales when provided', () => {
    render(<PriceIndex priceIndexData={mockPriceIndexData} existingHomeSales={mockExistingHomeSales} />);
    expect(screen.getByText('Existing Home Sales (24-Month)')).toBeInTheDocument();
  });

  it('renders KPI strip with US Index value', () => {
    render(<PriceIndex priceIndexData={mockPriceIndexData} />);
    expect(screen.getByText(/US Index/)).toBeInTheDocument();
    expect(screen.getByText('105')).toBeInTheDocument();
  });

  it('renders footer with source attribution', () => {
    render(<PriceIndex priceIndexData={mockPriceIndexData} />);
    expect(screen.getByText(/BIS Index base/)).toBeInTheDocument();
    expect(screen.getByText(/national statistical agencies/)).toBeInTheDocument();
  });
});