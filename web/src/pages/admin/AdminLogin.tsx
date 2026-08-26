import { CircleAlert, Lock } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { siteConfig } from '../../config/site';
import { useSeo } from '../../lib/seo';
import { useAdminAuth } from '../../store/AdminAuthContext';

const AdminLogin = () => {
  const { signIn, isAuthenticated, usingDemoCredentials } = useAdminAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  useSeo({
    title: `Admin sign in | ${siteConfig.name}`,
    description: 'Administrator access.',
    noindex: true,
  });

  if (isAuthenticated) return <Navigate to="/admin/dashboard" replace />;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const result = signIn(email, password);
    if (result.ok) {
      navigate('/admin/dashboard', { replace: true });
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-900 p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2.5">
          <img src="/logo.svg" alt="" className="size-11 rounded-xl" width={44} height={44} />
          <span className="leading-tight">
            <span className="block text-base font-bold text-white">Qalandari Autos</span>
            <span className="block text-[11px] uppercase tracking-widest text-brand-500">&amp; Spare Parts</span>
          </span>
        </Link>

        <div className="rounded-2xl bg-white p-6">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <Lock className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-lg font-bold text-ink-900">Admin sign in</h1>
              <p className="text-xs text-ink-500">Store management for {siteConfig.name}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="admin-email" className="field-label">
                Email
              </label>
              <input
                id="admin-email"
                type="email"
                autoComplete="username"
                className="field"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError(null);
                }}
                required
              />
            </div>
            <div>
              <label htmlFor="admin-password" className="field-label">
                Password
              </label>
              <input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                className="field"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError(null);
                }}
                required
              />
            </div>

            {error && (
              <p role="alert" className="flex items-center gap-2 rounded-lg bg-brand-50 p-3 text-sm text-brand-700">
                <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
                {error}
              </p>
            )}

            <button type="submit" className="btn-primary w-full">
              Sign in
            </button>
          </form>

          {usingDemoCredentials && (
            <div className="mt-5 rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
              <p className="font-semibold">Prototype access</p>
              <p className="mt-1">
                No credentials are configured, so the demo sign-in is active:{' '}
                <code className="font-mono">admin@qalandariautos.pk</code> /{' '}
                <code className="font-mono">qalandari-demo</code>. Set <code className="font-mono">VITE_ADMIN_EMAIL</code>{' '}
                and <code className="font-mono">VITE_ADMIN_PASSWORD</code> in <code className="font-mono">.env.local</code>{' '}
                to change them, and replace this check with server-side authentication before launch.
              </p>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-sm">
          <Link to="/" className="text-ink-400 hover:text-white">
            ← Back to storefront
          </Link>
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;
