import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import App from './App';
import './index.css';

/**
 * Clean URLs (/shop/honda-cd-70-spark-plug) need a host that rewrites unknown
 * paths to index.html — Netlify, Vercel and `vite preview` all do, and
 * public/_redirects covers it. Set VITE_ROUTER=hash to build for a host that
 * does not (the single-file preview build uses this).
 */
const Router = import.meta.env.VITE_ROUTER === 'hash' ? HashRouter : BrowserRouter;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
      <App />
    </Router>
  </StrictMode>,
);
