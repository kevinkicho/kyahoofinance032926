import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TopMovers from '../../markets/fx/components/TopMovers';

const BASE_CHANGES = { EUR: -0.5, GBP: 0.3, JPY: 0.1 };

describe('TopMovers', () => {
  it('renders rows for currencies present in changes', () => {
    render(<TopMovers changes={BASE_CHANGES} />);
    expect(screen.getAllByText('EUR').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('GBP').length).toBeGreaterThanOrEqual(1);
  });

  it('sorts by absolute change magnitude', () => {
    render(<TopMovers changes={BASE_CHANGES} />);
    // mover-code elements are in the movers list, ordered by abs magnitude
    const codeEls = document.querySelectorAll('.mover-code');
    const codes = [...codeEls].map(el => el.textContent);
    // EUR: abs(-0.5)=0.5 is largest → first in list
    expect(codes[0]).toBe('EUR');
  });

  describe('with 1W/1M data', () => {
    it('shows positive 1W value with + prefix', () => {
      render(
        <TopMovers
          changes={BASE_CHANGES}
          changes1w={{ EUR: 1.2, GBP: -0.8, JPY: 0.5 }}
          changes1m={{ EUR: 3.5, GBP: -2.1, JPY: 1.0 }}
        />
      );
      expect(screen.getByText('+1.200%')).toBeInTheDocument();
    });

    it('shows negative 1W value without + prefix', () => {
      render(
        <TopMovers
          changes={BASE_CHANGES}
          changes1w={{ EUR: 1.2, GBP: -0.8, JPY: 0.5 }}
          changes1m={{ EUR: 3.5, GBP: -2.1, JPY: 1.0 }}
        />
      );
      expect(screen.getByText('-0.800%')).toBeInTheDocument();
    });

    it('shows dash for missing 1W currency', () => {
      render(
        <TopMovers
          changes={{ JPY: 0.2 }}
          changes1w={{}}
          changes1m={{}}
        />
      );
      const dashes = screen.getAllByText('—');
      expect(dashes.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('with sparklines', () => {
    it('renders SVG when sparkline data provided for a currency', () => {
      const sparklines = { EUR: [-0.1, 0.2, 0.3, 0.5, 0.4] };
      const { container } = render(
        <TopMovers changes={BASE_CHANGES} sparklines={sparklines} />
      );
      expect(container.querySelector('svg')).toBeTruthy();
    });

    it('renders no SVG when sparklines is empty', () => {
      const { container } = render(
        <TopMovers changes={BASE_CHANGES} sparklines={{}} />
      );
      expect(container.querySelector('svg')).toBeFalsy();
    });

    it('renders no SVG when sparkline has fewer than 2 points', () => {
      const { container } = render(
        <TopMovers changes={BASE_CHANGES} sparklines={{ EUR: [0.5] }} />
      );
      expect(container.querySelector('svg')).toBeFalsy();
    });
  });
});
