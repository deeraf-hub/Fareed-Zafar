import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface Crumb {
  label: string;
  to?: string;
}

export const Breadcrumbs = ({ items }: { items: Crumb[] }) => (
  <nav aria-label="Breadcrumb" className="py-4">
    <ol className="flex flex-wrap items-center gap-1 text-sm text-ink-500">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <li key={`${item.label}-${index}`} className="flex items-center gap-1">
            {item.to && !isLast ? (
              <Link to={item.to} className="transition-colors hover:text-brand-600">
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? 'font-medium text-ink-800' : undefined} aria-current={isLast ? 'page' : undefined}>
                {item.label}
              </span>
            )}
            {!isLast && <ChevronRight className="size-4 text-ink-300" aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  </nav>
);
