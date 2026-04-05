import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AffordabilityMap from '../../markets/realEstate/components/AffordabilityMap';

const mockData = {
  current: { medianPrice: 420000, medianIncome: 75000, priceToIncome: 5.6, mortgageToIncome: 32.4, rate30y: 6.95, yoyChange: 4.2 },
  history: [
    { date: '2024-01-01', medianPrice: 380000, priceToIncome: 5.1 },
    { date: '2024-04-01', medianPrice: 390000, priceToIncome: 5.2 },
    { date: '2024-07-01', medianPrice: 400000, priceToIncome: 5.3 },
    { date: '2024-10-01', medianPrice: 410000, priceToIncome: 5.5 },
    { date: '2025-01-01', medianPrice: 415000, priceToIncome: 5.5 },
    { date: '2025-04-01', medianPrice: 420000, priceToIncome: 5.6 },
  ],
};

describe('AffordabilityMap', () => {
  it('renders the panel title', () => {
    render(<AffordabilityMap affordabilityData={mockData} />);
    expect(screen.getByText('US Housing Affordability')).toBeInTheDocument();
  });

  it('renders median home price', () => {
    render(<AffordabilityMap affordabilityData={mockData} />);
    expect(screen.getByText('Median Home Price')).toBeInTheDocument();
    expect(screen.getByText('$420,000')).toBeInTheDocument();
  });

  it('renders Price-to-Income ratio', () => {
    render(<AffordabilityMap affordabilityData={mockData} />);
    expect(screen.getByText('Price-to-Income')).toBeInTheDocument();
    expect(screen.getByText(/5\.6×/)).toBeInTheDocument();
  });

  it('renders YoY change with sign', () => {
    render(<AffordabilityMap affordabilityData={mockData} />);
    expect(screen.getByText('+4.2% YoY')).toBeInTheDocument();
  });

  it('renders mortgage-to-income ratio', () => {
    render(<AffordabilityMap affordabilityData={mockData} />);
    expect(screen.getByText('Mortgage / Income')).toBeInTheDocument();
    expect(screen.getByText(/32\.4%/)).toBeInTheDocument();
  });

  it('returns null when affordabilityData is null', () => {
    const { container } = render(<AffordabilityMap affordabilityData={null} />);
    expect(container.innerHTML).toBe('');
  });
});

describe('AffordabilityMap — mortgage rates', () => {
  it('renders mortgage rate banner when mortgageRates provided', () => {
    render(<AffordabilityMap affordabilityData={mockData} mortgageRates={{ rate30y: 6.82, rate15y: 6.15, asOf: '2026-04-03' }} />);
    expect(screen.getByText(/30-Year Fixed/i)).toBeInTheDocument();
    expect(screen.getByText(/6\.82%/)).toBeInTheDocument();
  });

  it('renders 15-year rate in banner', () => {
    render(<AffordabilityMap affordabilityData={mockData} mortgageRates={{ rate30y: 6.82, rate15y: 6.15, asOf: '2026-04-03' }} />);
    expect(screen.getByText(/15-Year Fixed/i)).toBeInTheDocument();
    expect(screen.getByText(/6\.15%/)).toBeInTheDocument();
  });

  it('renders without mortgage rates (null is acceptable)', () => {
    render(<AffordabilityMap affordabilityData={mockData} mortgageRates={null} />);
    expect(screen.getByText('US Housing Affordability')).toBeInTheDocument();
    expect(screen.queryByText(/30-Year Fixed/i)).not.toBeInTheDocument();
  });
});
