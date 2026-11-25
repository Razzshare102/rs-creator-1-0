import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { OWNER_EMAIL } from '../lib/constants';
import type { LicenseStatus, Plan } from '../lib/types';

export interface Profile {
  id: string;
  email: string;
  plan: Plan;
  license_status: LicenseStatus;
  license_expires_at?: string | null;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isOwner: boolean;
  loading: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const configured = isSupabaseConfigured();

  // Owner flag: client-side convenience check only (email match against
  // OWNER_EMAIL = razzshares@gmail.com). Server RLS on user_roles is
  // authoritative — never rely on this flag alone to protect data.
  const isOwner = user?.email?.toLowerCase() === OWNER_EMAIL.toLowerCase();

  // Profiles table columns: id, email, username, display_name, plan_id, status,
  // license_key_id. `plan` / `license_status` / `license_expires_at` below are
  // display fields derived from the real columns (plan name via
  // subscription_plans, expiry via licenses).
  async function loadProfile(userId: string, email: string): Promise<void> {
    if (!configured) {
      setProfile(null);
      return;
    }
    const { data } = await supabase
      .from('profiles')
      .select('id, email, status, plan_id, license_key_id')
      .eq('id', userId)
      .maybeSingle();
    if (!data) {
      setProfile({
        id: userId,
        email,
        plan: 'free',
        license_status: 'not_configured',
        license_expires_at: null,
      });
      return;
    }
    const row = data as { id: string; email: string; status: string; plan_id: string | null; license_key_id: string | null };
    let planName: Plan = 'free';
    if (row.plan_id) {
      const { data: planRow } = await supabase
        .from('subscription_plans')
        .select('slug')
        .eq('id', row.plan_id)
        .maybeSingle();
      if (planRow) planName = (planRow as { slug: string }).slug as Plan;
    }
    let licenseExpires: string | null = null;
    if (row.license_key_id) {
      const { data: licRow } = await supabase
        .from('licenses')
        .select('expires_at')
        .eq('id', row.license_key_id)
        .maybeSingle();
      if (licRow) licenseExpires = (licRow as { expires_at: string | null }).expires_at;
    }
    setProfile({
      id: row.id,
      email: row.email,
      plan: planName,
      license_status: row.status as LicenseStatus,
      license_expires_at: licenseExpires,
    });
  }

  async function refreshProfile(): Promise<void> {
    if (user) await loadProfile(user.id, user.email ?? '');
  }

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        void loadProfile(data.session.user.id, data.session.user.email ?? '');
      }
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        void loadProfile(newSession.user.id, newSession.user.email ?? '');
      } else {
        setProfile(null);
      }
    });
    return () => listener.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured]);

  async function signIn(email: string, password: string): Promise<void> {
    if (!configured) throw new Error('Supabase is not configured.');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signUp(email: string, password: string): Promise<void> {
    if (!configured) throw new Error('Supabase is not configured.');
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  }

  async function signOut(): Promise<void> {
    if (!configured) return;
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider
      value={{ session, user, profile, isOwner, loading, configured, signIn, signUp, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider.');
  return ctx;
}
