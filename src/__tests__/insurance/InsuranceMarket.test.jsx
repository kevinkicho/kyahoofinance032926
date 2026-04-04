import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import InsuranceMarket from '../../markets/insurance/InsuranceMarket';

vi.mock('echarts-for-react', () => ({ default: () => <div data-testid="echarts-mock" /> }));

describe('InsuranceMarket', () => {
  it('renders Cat Bond Spreads tab by default', () => {
    render(<InsuranceMarket />);
    expect(screen.getAllByText('Cat Bond Spreads').length).toBeGreaterThanOrEqual(1);
  });

  it('renders all 4 sub-tabs', () => {
    render(<InsuranceMarket />);
    expect(screen.getByRole('button', { name: 'Cat Bond Spreads'    })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Combined Ratio'      })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reserve Adequacy'    })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reinsurance Pricing' })).toBeInTheDocument();
  });

  it('switches to Combined Ratio on click', () => {
    render(<InsuranceMarket />);
    fireEvent.click(screen.getByRole('button', { name: 'Combined Ratio' }));
    expect(screen.getByText(/combined ratio monitor/i)).toBeInTheDocument();
  });

  it('switches to Reserve Adequacy on click', () => {
    render(<InsuranceMarket />);
    fireEvent.click(screen.getByRole('button', { name: 'Reserve Adequacy' }));
    expect(screen.getByText(/reserve adequacy/i)).toBeInTheDocument();
  });

  it('switches to Reinsurance Pricing on click', () => {
    render(<InsuranceMarket />);
    fireEvent.click(screen.getByRole('button', { name: 'Reinsurance Pricing' }));
    expect(screen.getByText(/treaty reinsurance market/i)).toBeInTheDocument();
  });

  it('shows mock data status', () => {
    render(<InsuranceMarket />);
    expect(screen.getAllByText(/mock data/i).length).toBeGreaterThan(0);
  });
});
