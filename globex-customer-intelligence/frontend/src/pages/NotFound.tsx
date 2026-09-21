import { Link } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import { buttonClasses } from '../components/Button';

export function NotFoundPage() {
  return (
    <>
      <PageHeader title="Page not found" />
      <EmptyState
        title="There is nothing at this address."
        description="Check the link or return to the overview."
        action={
          <Link to="/" className={buttonClasses('secondary', 'sm')}>
            Go to overview
          </Link>
        }
      />
    </>
  );
}
