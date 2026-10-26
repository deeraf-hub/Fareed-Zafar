import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Logo } from '@/components/common/Logo';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/store/authStore';

function AuthShell({ title, children, footer }: { title: string; children: React.ReactNode; footer: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-10">
      <div className="mb-6">
        <Logo />
      </div>
      <div className="w-full max-w-sm rounded-xl border border-ink-700 bg-ink-900 p-6 shadow-xl">
        <h1 className="mb-5 text-lg font-semibold">{title}</h1>
        {children}
      </div>
      <p className="mt-4 text-sm text-ink-400">{footer}</p>
    </div>
  );
}

export function LoginPage() {
  const { mode, user, signIn } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (mode === 'local') return <Navigate to="/projects" replace />;
  if (user) return <Navigate to={(location.state as { from?: string } | null)?.from ?? '/projects'} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
      navigate((location.state as { from?: string } | null)?.from ?? '/projects', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Sign in"
      footer={
        <>
          No account yet?{' '}
          <Link className="text-accent-400 hover:underline" to="/register">
            Create one
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email">
          <Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password">
          <Input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        {error && <p className="text-sm text-red-400" role="alert">{error}</p>}
        <Button type="submit" variant="primary" className="w-full" loading={busy}>
          Sign in
        </Button>
      </form>
    </AuthShell>
  );
}

export function RegisterPage() {
  const { mode, user, signUp } = useAuthStore();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  if (mode === 'local') return <Navigate to="/projects" replace />;
  if (user) return <Navigate to="/projects" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return setError('Use at least 8 characters for your password.');
    if (password !== confirm) return setError('Passwords do not match.');
    setBusy(true);
    setError(null);
    try {
      const { needsConfirmation } = await signUp(email.trim(), password);
      if (needsConfirmation) setSent(true);
      else navigate('/projects', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      footer={
        <>
          Already registered?{' '}
          <Link className="text-accent-400 hover:underline" to="/login">
            Sign in
          </Link>
        </>
      }
    >
      {sent ? (
        <div className="space-y-3 text-sm text-ink-200">
          <p>We sent a confirmation link to <strong>{email}</strong>.</p>
          <p className="text-ink-400">Open it to activate your account, then sign in.</p>
          <Link to="/login">
            <Button className="w-full">Go to sign in</Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Field label="Email">
            <Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Password" hint="At least 8 characters.">
            <Input
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <Field label="Confirm password">
            <Input
              type="password"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </Field>
          {error && <p className="text-sm text-red-400" role="alert">{error}</p>}
          <Button type="submit" variant="primary" className="w-full" loading={busy}>
            Create account
          </Button>
          <p className="text-xs text-ink-400">
            Only your email and project settings are stored. Your video files always stay on your computer.
          </p>
        </form>
      )}
    </AuthShell>
  );
}
