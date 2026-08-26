import { Compass } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../components/ui/EmptyState';
import { siteConfig } from '../config/site';
import { useSeo } from '../lib/seo';

const NotFound = () => {
  useSeo({
    title: `Page not found | ${siteConfig.name}`,
    description: 'The page you are looking for does not exist.',
    noindex: true,
  });

  return (
    <div className="container-page py-20">
      <EmptyState
        icon={Compass}
        tone="error"
        as="h1"
        title="Page not found"
        description="The page you are looking for has moved or never existed. Try the shop, or search for the part you need."
        action={
          <>
            <Link to="/shop" className="btn-primary">
              Go to shop
            </Link>
            <Link to="/" className="btn-outline">
              Back to home
            </Link>
          </>
        }
      />
    </div>
  );
};

export default NotFound;
