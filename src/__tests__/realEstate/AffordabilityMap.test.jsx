import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AffordabilityMap from '../../markets/realEstate/components/AffordabilityMap';

const mockData = [
  { city: 'Hong Kong',   country: 'HK', priceToIncome: 18.8, mortgageToIncome: 92.4, medianPrice: 1280000, yoyChange: -4.2 },
  { city: 'Sydney',      country: 'AU', priceToIncome: 13.2, mortgageToIncome: 74.5, medianPrice:  980000, yoyChange:  5.1 },
  { city: 'Houston',     country: 'US', priceToIncome:  4.2, mortgageToIncome: 26.4, medianPrice:  260000, yoyChange:  1.5 },
];

describe('AffordabilityMap', () => {
  it('renders the panel title', () => {
    render(<AffordabilityMap affordabilityData={mockData} />);
    expect(screen.getByText('Affordability Map')).toBeInTheDocument();
  });

  it('renders all city names', () => {
    render(<AffordabilityMap affordabilityData={mockData} />);
    expect(screen.getByText('Hong Kong')).toBeInTheDocument();
    expect(screen.getByText('Sydney')).toBeInTheDocument();
    expect(screen.getByText('Houston')).toBeInTheDocument();
  });

  it('renders Price/Income column header', () => {
    render(<AffordabilityMap affordabilityData={mockData} />);
    expect(screen.getByText(/Price\/Income/i)).toBeInTheDocument();
  });

  it('renders YoY change with sign', () => {
    render(<AffordabilityMap affordabilityData={mockData} />);
    expect(screen.getByText('+5.1%')).toBeInTheDocument();
    expect(screen.getByText('-4.2%')).toBeInTheDocument();
  });

  it('renders affordability bar for each row', () => {
    const { container } = render(<AffordabilityMap affordabilityData={mockData} />);
    const bars = container.querySelectorAll('.afford-bar');
    expect(bars.length).toBe(mockData.length);
  });
});
