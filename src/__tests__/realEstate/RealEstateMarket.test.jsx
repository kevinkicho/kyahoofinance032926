import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RealEstateMarket from '../../markets/realEstate/RealEstateMarket';

vi.mock('echarts-for-react', () => ({ default: () => <div data-testid="echarts-mock" /> }));

beforeEach(() => {
  global.fetch = vi.fn().mockRejectedValue(new Error('no server'));
});

describe('RealEstateMarket', () => {
  it('renders Price Index tab by default after loading', async () => {
    render(<RealEstateMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    expect(screen.getAllByText('Price Index').length).toBeGreaterThanOrEqual(1);
  });

  it('renders all 4 sub-tabs', async () => {
    render(<RealEstateMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    expect(screen.getByRole('tab', { name: 'Price Index'       })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'REIT Screen'       })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Affordability Map' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Cap Rate Monitor'  })).toBeInTheDocument();
  });

  it('switches to REIT Screen on click', async () => {
    render(<RealEstateMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('tab', { name: 'REIT Screen' }));
    expect(screen.getAllByText(/PLD|Prologis|Industrial|REIT/i).length).toBeGreaterThan(0);
  });

  it('switches to Affordability Map on click', async () => {
    render(<RealEstateMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('tab', { name: 'Affordability Map' }));
    expect(screen.getAllByText(/Hong Kong|Sydney|price.to.income/i).length).toBeGreaterThan(0);
  });

  it('shows mock data status when server unavailable', async () => {
    render(<RealEstateMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    expect(screen.getAllByText(/mock data/i).length).toBeGreaterThan(0);
  });
});
