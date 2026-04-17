import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import DebtMonitor from '../../markets/globalMacro/components/DebtMonitor';
const debtData = {
  year: '2023',
  countries: [
    { code: 'US', name: 'United States', flag: '🇺🇸', debt: 123.3, currentAccount: -3.7 },
    { code: 'JP', name: 'Japan', flag: '🇯🇵', debt: 261.3, currentAccount: 3.5 },
    { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', debt: 101.9, currentAccount: -4.2 },
    { code: 'EA', name: 'Euro Area', flag: '🇪🇺', debt: 91.2, currentAccount: 2.1 },
    { code: 'CA', name: 'Canada', flag: '🇨🇦', debt: 106.5, currentAccount: -1.8 },
    { code: 'AU', name: 'Australia', flag: '🇦🇺', debt: 52.1, currentAccount: -2.3 },
    { code: 'SE', name: 'Sweden', flag: '🇸🇪', debt: 35.6, currentAccount: 6.5 },
    { code: 'CN', name: 'China', flag: '🇨🇳', debt: 77.1, currentAccount: 1.4 },
    { code: 'IN', name: 'India', flag: '🇮🇳', debt: 82.3, currentAccount: -1.9 },
    { code: 'BR', name: 'Brazil', flag: '🇧🇷', debt: 73.5, currentAccount: -1.2 },
    { code: 'KR', name: 'South Korea', flag: '🇰🇷', debt: 54.3, currentAccount: 4.1 },
    { code: 'MX', name: 'Mexico', flag: '🇲🇽', debt: 53.8, currentAccount: -1.5 },
  ],
};

vi.mock('../../components/SafeECharts/SafeECharts', () => ({ default: (props) => <div data-testid="echarts-mock" /> }));

describe('DebtMonitor', () => {
  it('renders panel title', () => {
    render(<DebtMonitor debtData={debtData} />);
    expect(screen.getByText(/debt monitor/i)).toBeInTheDocument();
  });

  it('renders government debt panel', () => {
    render(<DebtMonitor debtData={debtData} />);
    expect(screen.getByText(/government debt/i)).toBeInTheDocument();
  });

  it('renders current account panel', () => {
    render(<DebtMonitor debtData={debtData} />);
    expect(screen.getByText(/current account/i)).toBeInTheDocument();
  });

  it('renders 2 echarts instances', () => {
    render(<DebtMonitor debtData={debtData} />);
    expect(screen.getAllByTestId('echarts-mock')).toHaveLength(2);
  });

  it('handles null debtData gracefully', () => {
    expect(() => render(<DebtMonitor debtData={null} />)).not.toThrow();
  });
});
