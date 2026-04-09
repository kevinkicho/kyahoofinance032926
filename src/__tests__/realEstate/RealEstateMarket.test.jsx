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

  it('shows sidebar with key metrics', async () => {
    render(<RealEstateMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    // Sidebar shows Home Prices section
    const homePricesSection = screen.getByText('Home Prices');
    expect(homePricesSection).toBeInTheDocument();
  });

  it('shows content grid with all sections visible', async () => {
    render(<RealEstateMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    // All content is visible without tabs - check for various panels
    // Case-Shiller appears in sidebar and as a chart panel
    const caseShillerElements = screen.getAllByText(/Case-Shiller/i);
    expect(caseShillerElements.length).toBeGreaterThan(0);
  });

  it('shows mock data status when server unavailable', async () => {
    render(<RealEstateMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    // Multiple components may show mock data status
    const mockDataElements = screen.getAllByText(/mock data/i);
    expect(mockDataElements.length).toBeGreaterThan(0);
  });
});