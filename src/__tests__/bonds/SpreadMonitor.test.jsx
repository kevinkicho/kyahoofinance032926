import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SpreadMonitor from '../../markets/bonds/components/SpreadMonitor';

vi.mock('echarts-for-react', () => ({ default: () => <div data-testid="echarts-mock" /> }));

const mockData = {
  dates: ['Jan-25','Feb-25','Mar-25','Apr-25','May-25','Jun-25','Jul-25','Aug-25','Sep-25','Oct-25','Nov-25','Dec-25'],
  IG:  [112, 108, 115, 120, 118, 106, 102,  98, 105, 110, 108, 104],
  HY:  [345, 330, 360, 385, 370, 340, 325, 310, 340, 360, 355, 342],
  EM:  [410, 395, 425, 455, 440, 405, 388, 372, 395, 420, 415, 398],
  BBB: [185, 178, 192, 205, 198, 182, 175, 168, 180, 195, 190, 185],
};

describe('SpreadMonitor', () => {
  it('renders the panel title', () => {
    render(<SpreadMonitor spreadData={mockData} />);
    expect(screen.getByText('Spread Monitor')).toBeInTheDocument();
  });

  it('renders the echarts chart', () => {
    render(<SpreadMonitor spreadData={mockData} />);
    expect(screen.getByTestId('echarts-mock')).toBeInTheDocument();
  });

  it('renders BBB series label in legend', () => {
    render(<SpreadMonitor spreadData={mockData} />);
    expect(screen.getByText(/BBB/i)).toBeInTheDocument();
  });

  it('renders all 4 series labels', () => {
    render(<SpreadMonitor spreadData={mockData} />);
    expect(screen.getByText(/Investment Grade/i)).toBeInTheDocument();
    expect(screen.getByText(/High Yield/i)).toBeInTheDocument();
    expect(screen.getByText(/Emerging/i)).toBeInTheDocument();
    expect(screen.getByText(/BBB/i)).toBeInTheDocument();
  });
});
