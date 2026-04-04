import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BondsMarket from '../../markets/bonds/BondsMarket';

vi.mock('echarts-for-react', () => ({ default: () => <div data-testid="echarts-mock" /> }));

describe('BondsMarket', () => {
  it('renders the Yield Curve tab by default', () => {
    render(<BondsMarket />);
    expect(screen.getByRole('button', { name: 'Yield Curve' })).toBeInTheDocument();
  });

  it('renders all 4 sub-tabs', () => {
    render(<BondsMarket />);
    expect(screen.getByRole('button', { name: 'Yield Curve'    })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Credit Matrix'  })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Spread Monitor' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Duration Ladder'})).toBeInTheDocument();
  });

  it('switches to Credit Matrix on tab click', () => {
    render(<BondsMarket />);
    fireEvent.click(screen.getByRole('button', { name: 'Credit Matrix' }));
    expect(screen.getByText(/sovereign ratings/i)).toBeInTheDocument();
  });

  it('switches to Spread Monitor on tab click', () => {
    render(<BondsMarket />);
    fireEvent.click(screen.getByRole('button', { name: 'Spread Monitor' }));
    expect(screen.getByText(/credit spreads/i)).toBeInTheDocument();
  });

  it('switches to Duration Ladder on tab click', () => {
    render(<BondsMarket />);
    fireEvent.click(screen.getByRole('button', { name: 'Duration Ladder' }));
    expect(screen.getByText(/maturity buckets/i)).toBeInTheDocument();
  });

  it('shows mock data status (not live)', () => {
    render(<BondsMarket />);
    expect(screen.getByText(/mock data.*static/i)).toBeInTheDocument();
  });
});
