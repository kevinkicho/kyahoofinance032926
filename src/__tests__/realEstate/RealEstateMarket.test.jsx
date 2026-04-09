import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import RealEstateMarket from '../../markets/realEstate/RealEstateMarket';

vi.mock('echarts-for-react', () => ({ default: () => <div data-testid="echarts-mock" /> }));

beforeEach(() => {
  global.fetch = vi.fn().mockRejectedValue(new Error('no server'));
});

describe('RealEstateMarket', () => {
  it('renders unified dashboard after loading', async () => {
    render(<RealEstateMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    // Dashboard shows Case-Shiller section (may appear multiple times)
    const caseShillerElements = screen.getAllByText(/Case-Shiller/i);
    expect(caseShillerElements.length).toBeGreaterThan(0);
  });

  it('shows KPI strip with key metrics', async () => {
    render(<RealEstateMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    // KPI strip shows key indicators (may appear multiple times)
    const kpiElements = screen.getAllByText(/Case-Shiller|Homeownership|Housing/i);
    expect(kpiElements.length).toBeGreaterThan(0);
  });

  it('shows Housing Activity section', async () => {
    render(<RealEstateMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    // Dashboard shows Housing Activity (mock data provides this)
    const activityElements = screen.getAllByText(/Housing Activity/i);
    expect(activityElements.length).toBeGreaterThan(0);
  });

  it('shows mock data status when server unavailable', async () => {
    render(<RealEstateMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    // Multiple components may show mock data status
    const mockDataElements = screen.getAllByText(/mock data/i);
    expect(mockDataElements.length).toBeGreaterThan(0);
  });
});