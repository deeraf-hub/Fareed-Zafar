import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { readStorage, removeStorage, storageKeys, writeStorage } from '../lib/storage';

/**
 * Prototype admin authentication.
 *
 * The credentials are read from build-time environment variables
 * (`VITE_ADMIN_EMAIL` / `VITE_ADMIN_PASSWORD`, see `.env.example`) and are not
 * committed to the repository. This is deliberately a placeholder: a browser
 * bundle can never keep a secret, so before this store goes live the check
 * below must be replaced by a real server-side session — Supabase Auth is the
 * intended route, and the rest of the admin UI already talks only to this
 * context, so nothing else has to change.
 */
interface AdminSession {
  email: string;
  signedInAt: string;
}

interface AdminAuthValue {
  session: AdminSession | null;
  isAuthenticated: boolean;
  /** True when no credentials were configured and the demo fallback is active. */
  usingDemoCredentials: boolean;
  signIn: (email: string, password: string) => { ok: true } | { ok: false; error: string };
  signOut: () => void;
}

const DEMO_EMAIL = 'admin@qalandariautos.pk';
const DEMO_PASSWORD = 'qalandari-demo';

const configuredEmail = import.meta.env.VITE_ADMIN_EMAIL as string | undefined;
const configuredPassword = import.meta.env.VITE_ADMIN_PASSWORD as string | undefined;
const usingDemoCredentials = !configuredEmail || !configuredPassword;

const AdminAuthContext = createContext<AdminAuthValue | null>(null);

export const AdminAuthProvider = ({ children }: { children: ReactNode }) => {
  // Read synchronously so a refresh inside /admin does not bounce back to login.
  const [session, setSession] = useState<AdminSession | null>(() => readStorage<AdminSession>(storageKeys.admin));

  const signIn = useCallback<AdminAuthValue['signIn']>((email, password) => {
    const expectedEmail = (configuredEmail ?? DEMO_EMAIL).trim().toLowerCase();
    const expectedPassword = configuredPassword ?? DEMO_PASSWORD;

    if (email.trim().toLowerCase() !== expectedEmail || password !== expectedPassword) {
      return { ok: false, error: 'Incorrect email or password.' };
    }
    const next: AdminSession = { email: expectedEmail, signedInAt: new Date().toISOString() };
    setSession(next);
    writeStorage(storageKeys.admin, next);
    return { ok: true };
  }, []);

  const signOut = useCallback(() => {
    setSession(null);
    removeStorage(storageKeys.admin);
  }, []);

  const value = useMemo<AdminAuthValue>(
    () => ({ session, isAuthenticated: session !== null, usingDemoCredentials, signIn, signOut }),
    [session, signIn, signOut],
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
};

export const useAdminAuth = (): AdminAuthValue => {
  const context = useContext(AdminAuthContext);
  if (!context) throw new Error('useAdminAuth must be used inside AdminAuthProvider');
  return context;
};
