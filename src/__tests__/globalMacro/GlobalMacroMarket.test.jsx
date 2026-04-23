import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import GlobalMacroMarket from '../../markets/globalMacro/GlobalMacroMarket';

vi.mock('../../components/SafeECharts/SafeECharts', () => ({ default: (props) => <div data-testid="echarts-mock" /> }));

const mockCentralData = {
  isLoading: false,
  isLive: false,
  isCurrent: false,
  lastUpdated: null,
  fetchedOn: null,
  error: null,
  fetchLog: [],
  provenance: {},
  refetch: () => {},
  data: {
    scorecardData: [
      { code: 'US', name: 'United States', flag: '🇺🇸', region: 'G7', gdp: 2.5, cpi: 3.2, rate: 5.33, unemp: 3.7, debt: 121 },
      { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', region: 'G7', gdp: 0.5, cpi: 4.0, rate: 5.25, unemp: 4.2, debt: 101 },
      { code: 'JP', name: 'Japan', flag: '🇯🇵', region: 'G7', gdp: 1.9, cpi: 3.3, rate: -0.10, unemp: 2.6, debt: 254 },
      { code: 'DE', name: 'Germany', flag: '🇩🇪', region: 'G7', gdp: -0.3, cpi: 2.9, rate: 4.50, unemp: 3.1, debt: 64 },
      { code: 'CA', name: 'Canada', flag: '🇨🇦', region: 'G7', gdp: 1.1, cpi: 3.8, rate: 5.00, unemp: 5.8, debt: 106 },
      { code: 'FR', name: 'France', flag: '🇫🇷', region: 'G7', gdp: 0.7, cpi: 4.2, rate: 4.50, unemp: 7.3, debt: 112 },
      { code: 'IT', name: 'Italy', flag: '🇮🇹', region: 'G7', gdp: 0.8, cpi: 5.5, rate: 4.50, unemp: 7.5, debt: 137 },
      { code: 'CN', name: 'China', flag: '🇨🇳', region: 'EM', gdp: 5.2, cpi: 0.2, rate: 3.45, unemp: 5.3, debt: 83 },
      { code: 'IN', name: 'India', flag: '🇮🇳', region: 'EM', gdp: 7.8, cpi: 5.1, rate: 6.50, unemp: 7.8, debt: 83 },
      { code: 'BR', name: 'Brazil', flag: '🇧🇷', region: 'EM', gdp: 2.9, cpi: 4.5, rate: 10.50, unemp: 7.8, debt: 74 },
      { code: 'KR', name: 'South Korea', flag: '🇰🇷', region: 'EM', gdp: 1.4, cpi: 3.5, rate: 3.50, unemp: 2.7, debt: 54 },
      { code: 'AU', name: 'Australia', flag: '🇦🇺', region: 'G7', gdp: 2.0, cpi: 3.6, rate: 4.35, unemp: 3.8, debt: 51 },
    ],
    centralBankData: {
      current: [
        { code: 'US', name: 'Fed', flag: '🇺🇸', rate: 5.33 },
        { code: 'GB', name: 'BoE', flag: '🇬🇧', rate: 5.25 },
        { code: 'JP', name: 'BoJ', flag: '🇯🇵', rate: -0.10 },
      ],
    },
  },
};

describe('GlobalMacroMarket', () => {
  it('renders unified dashboard with status bar', () => {
    render(<GlobalMacroMarket centralData={mockCentralData} />);
    expect(screen.getAllByText(/PENDING|NO DATA/i).length).toBeGreaterThan(0);
  });

  it('shows KPI strip with global metrics', () => {
    render(<GlobalMacroMarket centralData={mockCentralData} />);
    expect(screen.getByText('G7 GDP')).toBeInTheDocument();
    expect(screen.getByText('Global CPI')).toBeInTheDocument();
  });

  it('shows compact scorecard table with countries', () => {
    render(<GlobalMacroMarket centralData={mockCentralData} />);
    expect(screen.getByText('GDP')).toBeInTheDocument();
    expect(screen.getByText('CPI')).toBeInTheDocument();
  });

  it('shows chart panels with GDP, CPI, Rates, Debt', () => {
    render(<GlobalMacroMarket centralData={mockCentralData} />);
    expect(screen.getByText('GDP Growth')).toBeInTheDocument();
    expect(screen.getByText('CPI Inflation')).toBeInTheDocument();
    expect(screen.getByText('Policy Rates')).toBeInTheDocument();
    expect(screen.getByText('Debt / GDP')).toBeInTheDocument();
  });

  it('shows economic activity panel with CFNAI and OECD CLI', () => {
    render(<GlobalMacroMarket centralData={mockCentralData} />);
    expect(screen.getByText('Economic Activity')).toBeInTheDocument();
    expect(screen.getByText('OECD Leading Indicators')).toBeInTheDocument();
  });

  it('shows no data received status when not live', () => {
    render(<GlobalMacroMarket centralData={mockCentralData} />);
    expect(screen.getAllByText(/PENDING|NO DATA/i).length).toBeGreaterThan(0);
  });

  it('shows clickable scorecard rows', () => {
    render(<GlobalMacroMarket centralData={mockCentralData} />);
    const scorecardRows = document.querySelectorAll('.mac-scorecard-row');
    expect(scorecardRows.length).toBeGreaterThan(0);
  });
});