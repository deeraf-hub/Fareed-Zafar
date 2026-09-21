import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { CustomerExplorerPage } from '../pages/CustomerExplorer';
import { customersPageFixture, datasetFixture, filtersFixture } from './fixtures';
import { calledUrls, mockFetch, renderWithProviders } from './utils';

function setupFetch() {
  return mockFetch((url) => {
    if (url.pathname === '/api/v1/dataset') return { body: datasetFixture };
    if (url.pathname === '/api/v1/customers/filters') return { body: filtersFixture };
    if (url.pathname === '/api/v1/customers') {
      const segment = url.searchParams.get('segment');
      const items = segment ? customersPageFixture.items.filter((item) => item.segment_name === segment) : customersPageFixture.items;
      return { body: { ...customersPageFixture, items, total: items.length } };
    }
    return undefined;
  });
}

describe('CustomerExplorerPage', () => {
  let fetchMock: ReturnType<typeof mockFetch>;

  beforeEach(() => {
    fetchMock = setupFetch();
  });

  it('renders customer rows from the API with formatted values and unavailable predictions', async () => {
    renderWithProviders(<CustomerExplorerPage />, { route: '/customers' });

    const link = await screen.findByRole('link', { name: '17850' });
    expect(link).toHaveAttribute('href', '/customers/17850');

    const table = screen.getByRole('table');
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(3); // header + 2 customers

    const firstRow = rows[1] as HTMLElement;
    expect(firstRow).toHaveTextContent('Champions');
    expect(firstRow).toHaveTextContent('£5,391');
    expect(firstRow).toHaveTextContent('42.0%');
    expect(firstRow).toHaveTextContent('£123.45');

    const secondRow = rows[2] as HTMLElement;
    const unavailable = within(secondRow).getAllByTestId('prediction-unavailable');
    expect(unavailable).toHaveLength(2);
    expect(unavailable[0]).toHaveAttribute('title', 'Customer has no eligible orders before the cutoff.');

    expect(screen.getByText('Showing 1–2 of 2 customers')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /30-day repeat-purchase likelihood/ })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Predicted 30-day purchase spending/ })).toBeInTheDocument();

    const listCall = calledUrls(fetchMock).find((url) => url.startsWith('/api/v1/customers?'));
    expect(listCall).toBe('/api/v1/customers?sort=historical_spend&order=desc&page=1&page_size=25');
  });

  it('refetches with the segment filter in the query string and keeps the export URL in sync', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CustomerExplorerPage />, { route: '/customers' });

    await screen.findByRole('link', { name: '17850' });
    await screen.findByRole('option', { name: 'Champions' });

    await user.selectOptions(screen.getByLabelText('Segment'), 'Champions');

    await waitFor(() => {
      const urls = calledUrls(fetchMock).filter((url) => url.startsWith('/api/v1/customers?'));
      expect(urls.at(-1)).toBe('/api/v1/customers?segment=Champions&sort=historical_spend&order=desc&page=1&page_size=25');
    });

    // Row for the other segment disappears.
    await waitFor(() => expect(screen.queryByRole('link', { name: '13047' })).not.toBeInTheDocument());

    const exportLink = screen.getByRole('link', { name: 'Export CSV' });
    expect(exportLink).toHaveAttribute('href', '/api/v1/customers/export.csv?segment=Champions&sort=historical_spend&order=desc');
    expect(exportLink).toHaveAttribute('download');
  });

  it('toggles sort order from the column header and reflects it in the export URL', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CustomerExplorerPage />, { route: '/customers?country=Germany' });

    await screen.findByRole('link', { name: '17850' });
    await user.click(screen.getByRole('button', { name: /Order count/ }));

    await waitFor(() => {
      const urls = calledUrls(fetchMock).filter((url) => url.startsWith('/api/v1/customers?'));
      expect(urls.at(-1)).toBe('/api/v1/customers?country=Germany&sort=order_count&order=desc&page=1&page_size=25');
    });
    expect(screen.getByRole('columnheader', { name: /Order count/ })).toHaveAttribute('aria-sort', 'descending');

    await user.click(screen.getByRole('button', { name: /Order count/ }));
    await waitFor(() => {
      expect(screen.getByRole('columnheader', { name: /Order count/ })).toHaveAttribute('aria-sort', 'ascending');
    });
    expect(screen.getByRole('link', { name: 'Export CSV' })).toHaveAttribute(
      'href',
      '/api/v1/customers/export.csv?country=Germany&sort=order_count&order=asc',
    );
  });
});
