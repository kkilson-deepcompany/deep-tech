import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth/auth-context';
import { FullScreenLoader } from '@/components/ui/spinner';

/** Protege rutas: exige sesión con contraseña válida. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <FullScreenLoader />;
  if (status === 'unauthenticated')
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (status === 'pending-approval') return <Navigate to="/pendiente" replace />;
  return <>{children}</>;
}
