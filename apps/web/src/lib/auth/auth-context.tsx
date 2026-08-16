import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile } from './types';

/**
 * Estados posibles de la sesión:
 * - `loading`         arranque, aún sin resolver la sesión almacenada.
 * - `unauthenticated` sin sesión.
 * - `pending-approval` la cuenta se auto-registró y espera aprobación admin_rrhh.
 * - `authenticated`   sesión con contraseña válida.
 */
export type AuthStatus = 'loading' | 'unauthenticated' | 'pending-approval' | 'authenticated';

interface AuthContextValue {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  /** Re-evalúa el perfil (usar tras aprobar una cuenta pendiente, por ejemplo). */
  reload: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function authErrorMessage(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Correo o contraseña incorrectos.';
  if (m.includes('email not confirmed')) return 'La cuenta aún no ha sido confirmada.';
  if (m.includes('rate limit') || m.includes('too many'))
    return 'Demasiados intentos. Espera unos minutos.';
  return 'No se pudo iniciar sesión. Intenta de nuevo.';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [bootstrapped, setBootstrapped] = useState(false);
  // descarta resultados de evaluaciones obsoletas si se solapan
  const evalToken = useRef(0);

  const evaluate = useCallback(async (current: Session | null) => {
    const token = ++evalToken.current;
    if (!current) {
      setProfile(null);
      setStatus('unauthenticated');
      return;
    }
    const profileResult = await supabase
      .from('profiles')
      .select('*')
      .eq('id', current.user.id)
      .maybeSingle();
    if (token !== evalToken.current) return; // una evaluación más nueva ya corrió

    const nextProfile = (profileResult.data as Profile | null) ?? null;
    setProfile(nextProfile);

    setStatus(nextProfile?.status === 'pendiente' ? 'pending-approval' : 'authenticated');
  }, []);

  // Suscripción única: `INITIAL_SESSION` entrega la sesión almacenada al arrancar.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setBootstrapped(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Evalúa al arrancar y cada vez que cambia el token (login, refresh).
  useEffect(() => {
    if (!bootstrapped) return;
    void evaluate(session);
  }, [bootstrapped, session?.access_token, session, evaluate]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: authErrorMessage(error.message) };
    // `onAuthStateChange` disparará la re-evaluación; el routing lo maneja LoginPage.
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const reload = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
    await evaluate(data.session);
  }, [evaluate]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      user: session?.user ?? null,
      profile,
      signIn,
      signOut,
      reload,
    }),
    [status, session, profile, signIn, signOut, reload],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
