import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RealEstateMarket from '../../markets/realEstate/RealEstateMarket';

vi.mock('echarts-for-react', () => ({ default: () => <div data-testid="echarts-mock" /> }));

describe('RealEstateMarket', () => {
  it('renders Price Index tab by default', () => {
    render(<RealEstateMarket />);
    // 'Price Index' appears in both the tab button and the panel title
    expect(screen.getAllByText('Price Index').length).toBeGreaterThanOrEqual(2);
  });

  it('renders all 4 sub-tabs', () => {
    render(<RealEstateMarket />);
    expect(screen.getByRole('button', { name: 'Price Index'       })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'REIT Screen'       })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Affordability Map' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cap Rate Monitor'  })).toBeInTheDocument();
  });

  it('switches to REIT Screen on click', () => {
    render(<RealEstateMarket />);
    fireEvent.click(screen.getByRole('button', { name: 'REIT Screen' }));
    expect(screen.getAllByText(/REIT Screen/i)[0]).toBeInTheDocument();
  });

  it('switches to Affordability Map on click', () => {
    render(<RealEstateMarket />);
    fireEvent.click(screen.getByRole('button', { name: 'Affordability Map' }));
    expect(screen.getByText(/price-to-income/i)).toBeInTheDocument();
  });

  it('switches to Cap Rate Monitor on click', () => {
    render(<RealEstateMarket />);
    fireEvent.click(screen.getByRole('button', { name: 'Cap Rate Monitor' }));
    expect(screen.getByText(/capitalization rates/i)).toBeInTheDocument();
  });

  it('shows mock data status', () => {
    render(<RealEstateMarket />);
    expect(screen.getByText(/○ Mock data — static/)).toBeInTheDocument();
  });
});
