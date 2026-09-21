import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppRoutes } from '../AppRoutes';
import { datasetFixture, overviewFixture } from './fixtures';
import { mockFetch, renderWithProviders } from './utils';

// Plotly needs a real browser; replace the chart wrapper with a labelled placeholder.
vi.mock('../components/Chart', () => ({
  Chart: ({ title }: { title: string }) => <div data-testid="chart">{title}</div>,
  CHART_COLORS: {
    accent: '#1D4ED8',
    navy: '#0F1F3D',
    muted: '#94A3B8',
    grid: '#E5E7EB',
    text: '#0F1F3D',
    secondary: '#5B6473',
    accentSoft: '#EFF4FF',
    surface: '#FFFFFF',
  },
  CHART_FONT: 'Inter',
}));

describe('OverviewPage', () => {
  beforeEach(() => {
    mockFetch((url) => {
      if (url.pathname === '/api/v1/dataset') return { body: datasetFixture };
      if (url.pathname === '/api/v1/overview') return { body: overviewFixture };
      return undefined;
    });
  });

  it('renders KPI tiles from the API and the historical banner with the cutoff date', async () => {
    renderWithProviders(<AppRoutes />, { route: '/' });

    expect(await screen.findByText('£8,887,210')).toBeInTheDocument();
    expect(screen.getByText('£8,250,000')).toBeInTheDocument();
    expect(screen.getByText('19,960')).toBeInTheDocument();
    expect(screen.getByText('4,338')).toBeInTheDocument();
    expect(screen.getByText('65.1%')).toBeInTheDocument();

    expect(screen.getByText('Gross sales')).toBeInTheDocument();
    expect(screen.getByText('Eligible positive sales before returns')).toBeInTheDocument();
    expect(screen.getByText('Repeat-purchase rate')).toBeInTheDocument();
    expect(screen.getByText('Period 1 Dec 2009 – 9 Dec 2011')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole('note')).toHaveTextContent('Historical dataset demo · data cutoff 9 Dec 2011');
    });

    expect(screen.getByText('November is the peak month')).toBeInTheDocument();
    expect(screen.getByText('Caution')).toBeInTheDocument();
    expect(screen.getAllByTestId('chart').map((node) => node.textContent)).toEqual([
      'Revenue trend',
      'Customer segment distribution',
      'Cohort repeat-purchase heatmap',
    ]);
    expect(screen.getByText(/Chen, D\. \(2019\)/)).toBeInTheDocument();
  });

  it('shows "data cutoff unavailable" when the dataset has no cutoff', async () => {
    mockFetch((url) => {
      if (url.pathname === '/api/v1/dataset') return { body: { ...datasetFixture, data_cutoff: null } };
      if (url.pathname === '/api/v1/overview') return { body: overviewFixture };
      return undefined;
    });
    renderWithProviders(<AppRoutes />, { route: '/' });
    await waitFor(() => {
      expect(screen.getByRole('note')).toHaveTextContent('Historical dataset demo · data cutoff unavailable');
    });
  });

  it('shows an error state with a retry button when the overview request fails', async () => {
    mockFetch((url) => {
      if (url.pathname === '/api/v1/dataset') return { body: datasetFixture };
      if (url.pathname === '/api/v1/overview') {
        return { status: 500, body: { error: { code: 'internal_error', message: 'Database unavailable' } } };
      }
      return undefined;
    });
    renderWithProviders(<AppRoutes />, { route: '/' });
    expect(await screen.findByRole('alert')).toHaveTextContent('Database unavailable');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
