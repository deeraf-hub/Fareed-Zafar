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
  init(): Promise<void>;
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string): Promise<{ needsConfirmation: boolean }>;
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

  async init() {
    const sb = getSupabase();
    if (!sb) {
      set({ ready: true, mode: 'local' });
      return;
    }
    const { data } = await sb.auth.getSession();
    set({ session: data.session, user: data.session?.user ?? null, ready: true });
    unsubscribe?.();
    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null });
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

  async signOut() {
    const sb = getSupabase();
    if (sb) await sb.auth.signOut();
    set({ session: null, user: null });
  },

  repository() {
    const { mode, user } = get();
    const sb = getSupabase();
    if (mode === 'cloud' && sb && user) return new CloudRepository(sb, user.id);
    return localRepository;
  },
}));
