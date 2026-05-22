/** Roles del sistema — refleja el enum `user_role` de Postgres. */
export type UserRole =
  | 'admin_rrhh'
  | 'director'
  | 'reclutador'
  | 'ceo'
  | 'cfo'
  | 'coordinador_ops'
  | 'auditor';

/** Fila de `public.profiles` (espejo de `auth.users`). */
export interface Profile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
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
