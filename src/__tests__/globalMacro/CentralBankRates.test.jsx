import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import CentralBankRates from '../../markets/globalMacro/components/CentralBankRates';
import { centralBankData } from '../../markets/globalMacro/data/mockGlobalMacroData';

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
