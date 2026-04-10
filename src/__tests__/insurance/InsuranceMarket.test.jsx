import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import InsuranceMarket from '../../markets/insurance/InsuranceMarket';

vi.mock('echarts-for-react', () => ({ default: () => <div data-testid="echarts-mock" /> }));

beforeEach(() => {
  global.fetch = vi.fn().mockRejectedValue(new Error('no server'));
});

describe('InsuranceMarket', () => {
  it('renders unified dashboard after loading', async () => {
    render(<InsuranceMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    // Dashboard shows sidebar with Combined Ratio section
    const combinedRatioSections = screen.getAllByText('Combined Ratio');
    expect(combinedRatioSections.length).toBeGreaterThan(0);
  });

  it('shows sidebar with key metrics', async () => {
    render(<InsuranceMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    // Sidebar shows Combined Ratio section if data available
    const combinedRatioSections = screen.queryAllByText('Combined Ratio');
    expect(combinedRatioSections.length).toBeGreaterThan(0);
  });

  it('shows content grid with all sections visible', async () => {
    render(<InsuranceMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    // All content is visible without tabs - check for various panels
    // HY OAS Spread chart should appear in main content
    const hyOasPanel = screen.getByText('HY OAS Spread');
    expect(hyOasPanel).toBeInTheDocument();
  });

  it('shows mock data status when server unavailable', async () => {
    render(<InsuranceMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    // Multiple components may show mock data status
    const mockDataElements = screen.getAllByText(/mock data/i);
    expect(mockDataElements.length).toBeGreaterThan(0);
  });
});