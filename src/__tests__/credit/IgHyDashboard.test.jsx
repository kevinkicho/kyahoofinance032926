import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import IgHyDashboard from '../../markets/credit/components/IgHyDashboard';

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

describe('IgHyDashboard', () => {
  const mockSpreadData = {
    current: {
      igSpread: 123,
      hySpread: 456,
      bbbSpread: 234,
      emSpread: 345,
      cccSpread: 789,
    },
    history: {
      dates: ['2025-04-01', '2025-05-01', '2025-06-01'],
      IG: [130, 125, 123],
      HY: [480, 465, 456],
      BBB: [250, 245, 234],
    },
    etfs: [
      { ticker: 'LQD', name: 'iShares iBoxx $ Investment Grade', price: 108.5, change1d: 0.12, yieldPct: 5.2, durationYr: 8.1 },
      { ticker: 'HYG', name: 'iShares iBoxx $ High Yield', price: 77.2, change1d: -0.05, yieldPct: 6.8, durationYr: 3.2 },
      { ticker: 'EMB', name: 'iShares J.P. Morgan $ Emerging Markets', price: 89.3, change1d: 0.08, yieldPct: 4.5, durationYr: 7.1 },
    ],
  };

  const mockCommercialPaper = {
    financial3m: 4.32,
    nonfinancial3m: 4.18,
  };

  it('renders the IG / HY Dashboard title', () => {
    render(<IgHyDashboard spreadData={mockSpreadData} commercialPaper={mockCommercialPaper} lastUpdated="2026-04-22" />);
    expect(screen.getByText('IG / HY Dashboard')).toBeInTheDocument();
  });

  it('renders all spread stat pills with values', () => {
    render(<IgHyDashboard spreadData={mockSpreadData} commercialPaper={mockCommercialPaper} lastUpdated="2026-04-22" />);
    expect(screen.getByText('IG Spread')).toBeInTheDocument();
    expect(screen.getByText('HY Spread')).toBeInTheDocument();
    expect(screen.getByText('BBB Spread')).toBeInTheDocument();
    expect(screen.getByText('EM Spread')).toBeInTheDocument();
    expect(screen.getByText('CCC Spread')).toBeInTheDocument();
  });

  it('displays current spread values in bps', () => {
    render(<IgHyDashboard spreadData={mockSpreadData} commercialPaper={mockCommercialPaper} lastUpdated="2026-04-22" />);
    expect(screen.getByText('123bps')).toBeInTheDocument();
    expect(screen.getByText('456bps')).toBeInTheDocument();
  });

  it('renders commercial paper rates when provided', () => {
    render(<IgHyDashboard spreadData={mockSpreadData} commercialPaper={mockCommercialPaper} lastUpdated="2026-04-22" />);
    expect(screen.getByText('Fin CP 3M')).toBeInTheDocument();
    expect(screen.getByText('Non-Fin CP 3M')).toBeInTheDocument();
    expect(screen.getByText('4.32%')).toBeInTheDocument();
    expect(screen.getByText('4.18%')).toBeInTheDocument();
  });

  it('renders credit ETF monitor table', () => {
    render(<IgHyDashboard spreadData={mockSpreadData} commercialPaper={mockCommercialPaper} lastUpdated="2026-04-22" />);
    expect(screen.getByText('Credit ETF Monitor')).toBeInTheDocument();
    expect(screen.getByText('LQD')).toBeInTheDocument();
    expect(screen.getByText('HYG')).toBeInTheDocument();
    expect(screen.getByText('EMB')).toBeInTheDocument();
  });

  it('renders chart with 12-Month Spread History', () => {
    render(<IgHyDashboard spreadData={mockSpreadData} commercialPaper={mockCommercialPaper} lastUpdated="2026-04-22" />);
    expect(screen.getByText('12-Month Spread History')).toBeInTheDocument();
  });

  it('returns null when spreadData is not provided', () => {
    const { container } = render(<IgHyDashboard spreadData={null} lastUpdated="2026-04-22" />);
    expect(container.firstChild).toBeNull();
  });
});