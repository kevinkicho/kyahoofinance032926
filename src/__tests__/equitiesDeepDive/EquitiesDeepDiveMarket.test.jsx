import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import EquitiesDeepDiveMarket from '../../markets/equitiesDeepDive/EquitiesDeepDiveMarket';

vi.mock('echarts-for-react', () => ({ default: () => <div data-testid="echarts-mock" /> }));

beforeEach(() => {
  global.fetch = vi.fn().mockRejectedValue(new Error('no server'));
});

describe('EquitiesDeepDiveMarket', () => {
  it('renders unified dashboard after loading', async () => {
    render(<EquitiesDeepDiveMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    // Dashboard shows sidebar with Sector Performance section
    const sectorSections = screen.getAllByText('Sector Performance');
    expect(sectorSections.length).toBeGreaterThan(0);
  });

  it('shows sidebar with key metrics', async () => {
    render(<EquitiesDeepDiveMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    // Sidebar shows Factor Scores section
    const factorSections = screen.getAllByText('Factor Scores');
    expect(factorSections.length).toBeGreaterThan(0);
  });

  it('shows content grid with all sections visible', async () => {
    render(<EquitiesDeepDiveMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    // All content is visible without tabs - check for various panels
    // ETF Performance should appear as a panel
    const etfPanel = screen.getByText('ETF Performance');
    expect(etfPanel).toBeInTheDocument();
  });

  it('shows mock data status when server unavailable', async () => {
    render(<EquitiesDeepDiveMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    // Status bar shows mock data
    const mockDataElements = screen.getAllByText(/mock data/i);
    expect(mockDataElements.length).toBeGreaterThan(0);
  });
});