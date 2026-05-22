import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth/auth-context';
import { FullScreenLoader } from '@/components/ui/spinner';

/** Protege rutas: exige sesión completa en AAL2 (login + MFA). */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <FullScreenLoader />;
  if (status === 'unauthenticated' || status === 'mfa-required')
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (status === 'mfa-setup') return <Navigate to="/mfa-setup" replace />;
  return <>{children}</>;
}
