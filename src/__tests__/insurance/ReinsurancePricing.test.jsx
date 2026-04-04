import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ReinsurancePricing from '../../markets/insurance/components/ReinsurancePricing';

const mockData = [
  { peril: 'US Hurricane',  layer: '$100M xs $50M',  rol: 12.4, rolChange: +8.2,  rpl: 2.8, rplChange: +5.1,  capacity: 'Ample',      renewalDate: 'Jun 2025' },
  { peril: 'California EQ', layer: '$200M xs $100M', rol: 18.6, rolChange: +15.3, rpl: 4.2, rplChange: +12.8, capacity: 'Tight',      renewalDate: 'Jan 2026' },
  { peril: 'Wildfire',      layer: '$50M xs $25M',   rol: 22.8, rolChange: +18.6, rpl: 5.8, rplChange: +14.2, capacity: 'Very Tight', renewalDate: 'Jan 2026' },
  { peril: 'Marine',        layer: '$75M xs $25M',   rol:  5.8, rolChange: +1.6,  rpl: 1.4, rplChange: +0.9,  capacity: 'Ample',      renewalDate: 'Jan 2026' },
];

describe('ReinsurancePricing', () => {
  it('renders the panel title', () => {
    render(<ReinsurancePricing reinsurancePricing={mockData} />);
    expect(screen.getByText('Reinsurance Pricing')).toBeInTheDocument();
  });

  it('renders all peril names', () => {
    render(<ReinsurancePricing reinsurancePricing={mockData} />);
    expect(screen.getByText('US Hurricane')).toBeInTheDocument();
    expect(screen.getByText('California EQ')).toBeInTheDocument();
    expect(screen.getByText('Wildfire')).toBeInTheDocument();
  });

  it('renders column headers', () => {
    render(<ReinsurancePricing reinsurancePricing={mockData} />);
    expect(screen.getByText('Peril')).toBeInTheDocument();
    expect(screen.getByText('Layer')).toBeInTheDocument();
    expect(screen.getByText('ROL %')).toBeInTheDocument();
    expect(screen.getByText('Capacity')).toBeInTheDocument();
  });

  it('applies ins-capacity-ample for Ample rows', () => {
    const { container } = render(<ReinsurancePricing reinsurancePricing={mockData} />);
    expect(container.querySelectorAll('.ins-capacity-ample').length).toBeGreaterThan(0);
  });

  it('applies ins-capacity-verytight for Very Tight rows', () => {
    const { container } = render(<ReinsurancePricing reinsurancePricing={mockData} />);
    expect(container.querySelectorAll('.ins-capacity-verytight').length).toBeGreaterThan(0);
  });

  it('applies ins-change-up for positive ROL changes', () => {
    const { container } = render(<ReinsurancePricing reinsurancePricing={mockData} />);
    expect(container.querySelectorAll('.ins-change-up').length).toBeGreaterThan(0);
  });
});
