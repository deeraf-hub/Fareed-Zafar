import { Outlet } from 'react-router-dom';
import { Footer } from './Footer';
import { Header } from './Header';
import { MobileCartBar } from './MobileCartBar';

export const StoreLayout = () => (
  <div className="flex min-h-screen flex-col">
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-ink-900 focus:px-4 focus:py-2 focus:text-white"
    >
      Skip to main content
    </a>
    <Header />
    <main id="main-content" className="flex-1 pb-24 sm:pb-0">
      <Outlet />
    </main>
    <Footer />
    <MobileCartBar />
  </div>
);
