import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import DebtMonitor from '../../markets/globalMacro/components/DebtMonitor';
import { debtData } from '../../markets/globalMacro/data/mockGlobalMacroData';

vi.mock('echarts-for-react', () => ({ default: () => <div data-testid="echarts-mock" /> }));

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
