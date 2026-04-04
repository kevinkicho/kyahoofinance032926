import React from 'react';
import { render, screen } from '@testing-library/react';
import RateMatrix from '../../markets/fx/components/RateMatrix';

const spotRates = { USD: 1, EUR: 0.92, GBP: 0.79, JPY: 150.0, CNY: 7.2, CHF: 0.90, AUD: 1.52, CAD: 1.36 };
const prevRates = { USD: 1, EUR: 0.91, GBP: 0.80, JPY: 149.0, CNY: 7.1, CHF: 0.89, AUD: 1.51, CAD: 1.35 };

describe('RateMatrix', () => {
  it('renders all 8 currency column headers', () => {
    render(<RateMatrix spotRates={spotRates} prevRates={prevRates} />);
    ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'CHF', 'AUD', 'CAD'].forEach(c => {
      expect(screen.getAllByText(c).length).toBeGreaterThan(0);
    });
  });

  it('renders exactly 8 diagonal — cells', () => {
    render(<RateMatrix spotRates={spotRates} prevRates={prevRates} />);
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBe(8);
  });

  it('shows the EUR/GBP cross rate value (≈ 0.8587)', () => {
    render(<RateMatrix spotRates={spotRates} prevRates={prevRates} />);
    // EUR/GBP = 0.79 / 0.92 ≈ 0.8587
    expect(screen.getByText(/0\.858/)).toBeInTheDocument();
  });

  it('shows the title "Cross-Rate Matrix"', () => {
    render(<RateMatrix spotRates={spotRates} prevRates={prevRates} />);
    expect(screen.getByText('Cross-Rate Matrix')).toBeInTheDocument();
  });
});
