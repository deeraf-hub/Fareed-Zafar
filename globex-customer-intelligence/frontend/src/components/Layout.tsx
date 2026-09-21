import { Link, NavLink, Outlet } from 'react-router-dom';
import { useDataset } from '../hooks/queries';
import { formatDate } from '../lib/format';
import { StatusBanner } from './StatusBanner';

const NAV_LINKS = [
  { to: '/', label: 'Overview', end: true },
  { to: '/customers', label: 'Customers', end: false },
  { to: '/models', label: 'Model Performance', end: false },
  { to: '/data-quality', label: 'Data Quality', end: false },
];

function navClass({ isActive }: { isActive: boolean }): string {
  return [
    'focus-ring inline-flex h-9 items-center rounded-md px-3 text-base font-medium transition-colors duration-150',
    isActive ? 'bg-accent-soft text-accent' : 'text-ink-secondary hover:bg-page hover:text-ink',
  ].join(' ');
}

function HistoricalBanner() {
  const dataset = useDataset();
  let cutoff: JSX.Element | string;
  if (dataset.isPending) {
    cutoff = 'data cutoff loading…';
  } else if (dataset.isError || !dataset.data?.data_cutoff) {
    cutoff = 'data cutoff unavailable';
  } else {
    cutoff = (
      <>
        data cutoff <time dateTime={dataset.data.data_cutoff}>{formatDate(dataset.data.data_cutoff)}</time>
      </>
    );
  }
  return (
    <StatusBanner tone="info" badge="Demo">
      <p>Historical dataset demo &middot; {cutoff}</p>
    </StatusBanner>
  );
}

function Footer() {
  const dataset = useDataset();
  const attribution = dataset.data ? `${dataset.data.attribution} · ${dataset.data.license}` : null;
  return (
    <footer className="mt-auto border-t border-line bg-surface">
      <div className="container space-y-1 py-6 text-xs text-ink-secondary">
        <p>
          {attribution ?? (dataset.isPending ? 'Loading dataset attribution…' : 'Dataset attribution unavailable.')}
        </p>
        <p>Portfolio demonstration by Globex Technology. The dataset is a public UCI dataset, not Globex or client data.</p>
      </div>
    </footer>
  );
}

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <header className="border-b border-line bg-surface">
        <div className="container flex flex-wrap items-center justify-between gap-x-8 gap-y-2 py-3">
          <Link to="/" className="focus-ring rounded-sm text-lg font-semibold tracking-tight text-ink">
            Globex Customer Intelligence
          </Link>
          <nav aria-label="Primary">
            <ul className="-mx-1 flex flex-wrap items-center gap-1">
              {NAV_LINKS.map((link) => (
                <li key={link.to}>
                  <NavLink to={link.to} end={link.end} className={navClass}>
                    {link.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>
      <HistoricalBanner />
      <main id="main-content" tabIndex={-1} className="container flex-1 py-6 outline-none md:py-8">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
