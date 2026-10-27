import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { CLOUD_ENABLED } from '@/config/env';
import { getSupabase } from '@/persistence/supabaseClient';
import { localRepository } from '@/persistence/localRepository';
import { CloudRepository } from '@/persistence/cloudRepository';
import type { ProjectRepository } from '@/persistence/repository';

interface AuthState {
  /** 'local' when Supabase is not configured. */
  mode: 'local' | 'cloud';
  ready: boolean;
  session: Session | null;
  user: User | null;
  error: string | null;
  /** True after the user arrived through a password-recovery link. */
  recovery: boolean;
  init(): Promise<void>;
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string): Promise<{ needsConfirmation: boolean }>;
  signInWithGoogle(): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  updatePassword(password: string): Promise<void>;
  signOut(): Promise<void>;
  /** The repository the dashboard/editor should use right now. */
  repository(): ProjectRepository;
}

let unsubscribe: (() => void) | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  mode: CLOUD_ENABLED ? 'cloud' : 'local',
  ready: !CLOUD_ENABLED,
  session: null,
  user: null,
  error: null,
  recovery: false,

  async init() {
    const sb = getSupabase();
    if (!sb) {
      set({ ready: true, mode: 'local' });
      return;
    }
    const { data } = await sb.auth.getSession();
    set({ session: data.session, user: data.session?.user ?? null, ready: true });
    unsubscribe?.();
    const { data: sub } = sb.auth.onAuthStateChange((event, session) => {
      set({ session, user: session?.user ?? null, ...(event === 'PASSWORD_RECOVERY' ? { recovery: true } : {}) });
    });
    unsubscribe = () => sub.subscription.unsubscribe();
  },

  async signIn(email, password) {
    const sb = getSupabase();
    if (!sb) throw new Error('Cloud mode is not configured');
    set({ error: null });
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      set({ error: error.message });
      throw new Error(error.message);
    }
    set({ session: data.session, user: data.user });
  },

  async signUp(email, password) {
    const sb = getSupabase();
    if (!sb) throw new Error('Cloud mode is not configured');
    set({ error: null });
    const { data, error } = await sb.auth.signUp({ email, password });
    if (error) {
      set({ error: error.message });
      throw new Error(error.message);
    }
    if (data.session) set({ session: data.session, user: data.user });
    return { needsConfirmation: !data.session };
  },

  async signInWithGoogle() {
    const sb = getSupabase();
    if (!sb) throw new Error('Cloud mode is not configured');
    const { error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/projects` },
    });
    if (error) throw new Error(error.message);
  },

  async requestPasswordReset(email) {
    const sb = getSupabase();
    if (!sb) throw new Error('Cloud mode is not configured');
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    if (error) throw new Error(error.message);
  },

  async updatePassword(password) {
    const sb = getSupabase();
    if (!sb) throw new Error('Cloud mode is not configured');
    const { error } = await sb.auth.updateUser({ password });
    if (error) throw new Error(error.message);
    set({ recovery: false });
  },

  async signOut() {
    const sb = getSupabase();
    if (sb) await sb.auth.signOut();
    set({ session: null, user: null, recovery: false });
  },

  repository() {
    const { mode, user } = get();
    const sb = getSupabase();
    if (mode === 'cloud' && sb && user) return new CloudRepository(sb, user.id);
    return localRepository;
  },
}));
