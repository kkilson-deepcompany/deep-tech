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
 * - `mfa-setup`       hay sesión pero el usuario no tiene un factor TOTP verificado.
 * - `mfa-required`    hay sesión y un factor verificado, falta superar el reto.
 * - `pending-approval` la cuenta se auto-registró y espera aprobación admin_rrhh.
 * - `authenticated`   sesión completa en AAL2.
 */
export type AuthStatus =
  | 'loading'
  | 'unauthenticated'
  | 'mfa-setup'
  | 'mfa-required'
  | 'pending-approval'
  | 'authenticated';

interface AuthContextValue {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  /** Re-evalúa AAL y perfil (usar tras inscribir o verificar MFA). */
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
    const [aalResult, profileResult] = await Promise.all([
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      supabase.from('profiles').select('*').eq('id', current.user.id).maybeSingle(),
    ]);
    if (token !== evalToken.current) return; // una evaluación más nueva ya corrió

    const nextProfile = (profileResult.data as Profile | null) ?? null;
    setProfile(nextProfile);

    // Pendiente de aprobación: no se le pide MFA todavía, solo espera.
    if (nextProfile?.status === 'pendiente') {
      setStatus('pending-approval');
      return;
    }

    const aal = aalResult.data;
    if (aal?.currentLevel === 'aal2') setStatus('authenticated');
    else if (aal?.nextLevel === 'aal2') setStatus('mfa-required');
    else setStatus('mfa-setup');
  }, []);

  // Suscripción única: `INITIAL_SESSION` entrega la sesión almacenada al arrancar.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setBootstrapped(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Evalúa al arrancar y cada vez que cambia el token (login, refresh, MFA).
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
