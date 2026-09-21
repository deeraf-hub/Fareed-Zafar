import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PredictionCell } from '../components/PredictionCell';
import { availableProbability, availableSpend, unavailablePrediction } from './fixtures';

describe('PredictionCell', () => {
  it('shows "Unavailable" with the reason as a tooltip when status is unavailable', () => {
    render(<PredictionCell prediction={unavailablePrediction} kind="probability" />);
    const cell = screen.getByText('Unavailable', { exact: false });
    expect(cell).toHaveAttribute('title', 'Customer has no eligible orders before the cutoff.');
    expect(cell).toHaveTextContent('Customer has no eligible orders before the cutoff.');
  });

  it('falls back to a default reason when none is provided', () => {
    render(<PredictionCell prediction={{ ...unavailablePrediction, reason: null }} kind="gbp" />);
    expect(screen.getByText('Unavailable', { exact: false })).toHaveAttribute('title', 'No prediction is available for this customer.');
  });

  it('treats an available prediction without a value as unavailable', () => {
    render(<PredictionCell prediction={{ ...availableProbability, value: null }} kind="probability" />);
    expect(screen.getByText('Unavailable', { exact: false })).toBeInTheDocument();
  });

  it('formats probabilities as percentages and spend as GBP', () => {
    const { rerender } = render(<PredictionCell prediction={availableProbability} kind="probability" />);
    expect(screen.getByText('42.0%')).toBeInTheDocument();
    rerender(<PredictionCell prediction={availableSpend} kind="gbp" />);
    expect(screen.getByText('£123.45')).toBeInTheDocument();
  });

  it('shows cutoff date and model version when asked', () => {
    render(<PredictionCell prediction={availableProbability} kind="probability" showMeta />);
    expect(screen.getByText(/As of 9 Dec 2011 · model clf-2024-05-01/)).toBeInTheDocument();
  });
});
