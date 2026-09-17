import { createClient, type Session, type SupabaseClient, type User } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })
  : null;

export type AuthState = { session: Session | null; user: User | null };

export const requestMagicLink = async (email: string, redirectTo = window.location.href) => {
  if (!supabase) throw new Error('Supabase no está configurado');
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) throw new Error('Introduce un email válido');
  const { error } = await supabase.auth.signInWithOtp({
    email: normalizedEmail,
    options: { emailRedirectTo: redirectTo },
  });
  if (error) throw error;
};

export const getAuthState = async (): Promise<AuthState> => {
  if (!supabase) return { session: null, user: null };
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return { session: data.session, user: data.session?.user ?? null };
};

export const signOut = async () => {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const subscribeToAuth = (listener: (state: AuthState) => void) => {
  if (!supabase) return () => undefined;
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    listener({ session, user: session?.user ?? null });
  });
  return () => data.subscription.unsubscribe();
};
