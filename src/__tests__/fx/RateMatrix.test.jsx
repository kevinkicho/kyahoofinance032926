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

  it('shows a positive % change when base strengthened vs quote', () => {
    // EUR/GBP: spot = 0.79/0.92 = 0.8587, prev = 0.80/0.91 = 0.8791
    // changePct = (0.8587 - 0.8791) / 0.8791 * 100 ≈ -2.32% (base EUR weakened vs GBP)
    // But USD/EUR row: spot = 0.92/1 = 0.92, prev = 0.91/1 = 0.91 → change = +1.09%
    render(<RateMatrix spotRates={spotRates} prevRates={prevRates} />);
    // USD/EUR cell: spot EUR = 0.92, prev EUR = 0.91 → EUR weakened vs USD (USD strengthened vs EUR)
    // changePct for USD row, EUR col = (0.92 - 0.91) / 0.91 * 100 ≈ +1.099%
    expect(screen.getByText('+1.10%')).toBeInTheDocument();
  });

  it('shows — for the change when prevRates is missing a currency', () => {
    const sparsePrev = { USD: 1, EUR: 0.91 }; // missing GBP, JPY, etc.
    render(<RateMatrix spotRates={spotRates} prevRates={sparsePrev} />);
    // USD/GBP cell: prevRates.GBP is missing → changePct is null → shows "—"
    // Find the rate-matrix-change span in a non-diagonal cell where prev is missing
    // The component renders "—" for the change span when changePct is null
    const changeSpans = document.querySelectorAll('.rate-matrix-change');
    const dashChanges = Array.from(changeSpans).filter(el => el.textContent === '—');
    expect(dashChanges.length).toBeGreaterThan(0);
  });
});
