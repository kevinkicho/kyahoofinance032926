import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import CentralBankRates from '../../markets/globalMacro/components/CentralBankRates';
const centralBankData = {
  current: [
    { code: 'US', name: 'United States', flag: '🇺🇸', rate: 5.25 },
    { code: 'EA', name: 'Euro Area', flag: '🇪🇺', rate: 4.50 },
    { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', rate: 5.25 },
    { code: 'JP', name: 'Japan', flag: '🇯🇵', rate: -0.10 },
    { code: 'CA', name: 'Canada', flag: '🇨🇦', rate: 4.75 },
    { code: 'AU', name: 'Australia', flag: '🇦🇺', rate: 4.10 },
    { code: 'SE', name: 'Sweden', flag: '🇸🇪', rate: 3.50 },
  ],
  history: {
    dates: ['2019-01', '2020-01', '2021-01', '2022-01', '2023-01', '2024-01'],
    series: [
      { code: 'US', name: 'US Fed', values: [2.5, 1.75, 0.25, 0.5, 4.5, 5.25] },
      { code: 'EA', name: 'ECB', values: [0.0, 0.0, 0.0, 0.0, 2.5, 4.5] },
    ],
  },
};

vi.mock('../../components/SafeECharts/SafeECharts', () => ({ default: (props) => <div data-testid="echarts-mock" /> }));

describe('CentralBankRates', () => {
  it('renders panel title', () => {
    render(<CentralBankRates centralBankData={centralBankData} />);
    expect(screen.getByText(/policy rates/i)).toBeInTheDocument();
  });

  it('renders current rates panel title', () => {
    render(<CentralBankRates centralBankData={centralBankData} />);
    expect(screen.getByText(/current rates/i)).toBeInTheDocument();
  });

  it('renders rate history panel title', () => {
    render(<CentralBankRates centralBankData={centralBankData} />);
    expect(screen.getByText(/5-year history/i)).toBeInTheDocument();
  });

  it('renders 2 echarts instances', () => {
    render(<CentralBankRates centralBankData={centralBankData} />);
    expect(screen.getAllByTestId('echarts-mock')).toHaveLength(2);
  });

  it('handles null centralBankData gracefully', () => {
    expect(() => render(<CentralBankRates centralBankData={null} />)).not.toThrow();
  });
});
