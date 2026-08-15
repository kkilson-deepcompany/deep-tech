/** Roles del sistema — refleja el enum `user_role` de Postgres. */
export type UserRole =
  | 'admin_rrhh'
  | 'director'
  | 'reclutador'
  | 'ceo'
  | 'cfo'
  | 'coordinador_ops'
  | 'auditor';

/** 'pendiente': se auto-registró y espera aprobación de un admin_rrhh. */
export type UserStatus = 'pendiente' | 'activo';

/** Fila de `public.profiles` (espejo de `auth.users`). */
export interface Profile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  picture: string | null;
  created_at: string;
  updated_at: string;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin_rrhh: 'Administrador RRHH',
  director: 'Director',
  reclutador: 'Reclutador',
  ceo: 'CEO',
  cfo: 'CFO',
  coordinador_ops: 'Coordinador de Operaciones',
  auditor: 'Auditor',
};
