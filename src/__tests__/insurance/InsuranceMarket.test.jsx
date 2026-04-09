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
    // Dashboard shows HY OAS section (may appear multiple times)
    const hyElements = screen.getAllByText(/HY OAS/i);
    expect(hyElements.length).toBeGreaterThan(0);
  });

  it('shows KPI strip with key metrics', async () => {
    render(<InsuranceMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    // KPI strip shows key indicators (may appear multiple times)
    const kpiElements = screen.getAllByText(/HY OAS|IG OAS|Combined Ratio/i);
    expect(kpiElements.length).toBeGreaterThan(0);
  });

  it('shows Combined Ratio section', async () => {
    render(<InsuranceMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    // Dashboard shows combined ratio (may appear multiple times)
    const ratioElements = screen.getAllByText(/Combined Ratio/i);
    expect(ratioElements.length).toBeGreaterThan(0);
  });

  it('shows mock data status when server unavailable', async () => {
    render(<InsuranceMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    // Multiple components may show mock data status
    const mockDataElements = screen.getAllByText(/mock data/i);
    expect(mockDataElements.length).toBeGreaterThan(0);
  });
});