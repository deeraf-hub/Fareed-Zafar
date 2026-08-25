import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Scrolls to the top on every navigation, except when only the query changes. */
export const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);
  return null;
};
