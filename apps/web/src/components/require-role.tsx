import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth/auth-context';
import type { UserRole } from '@/lib/auth/types';
import { FullScreenLoader } from '@/components/ui/spinner';

/** Restringe una ruta a ciertos roles. Debe ir dentro de <RequireAuth>. */
export function RequireRole({ roles, children }: { roles: UserRole[]; children: ReactNode }) {
  const { status, profile } = useAuth();
  if (status === 'loading') return <FullScreenLoader />;
  if (!profile || !roles.includes(profile.role)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
