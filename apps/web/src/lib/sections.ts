import { ClipboardList, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { UserRole } from './auth/types';
import { RECLUTAMIENTO_ROLES, RRHH_ROLES, RRHH_FINANZAS_ROLES } from './auth/permissions';

export type SectionId = 'rrhh' | 'operaciones';

/** Unión de grupos de roles, sin duplicados. */
const union = (...groups: UserRole[][]): UserRole[] => [...new Set(groups.flat())];

export interface SectionDef {
  id: SectionId;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Color base para la card (clase de Tailwind sin prefijo) */
  accent: string;
  defaultRoute: string;
  /** Roles que ven la sección (union de sus módulos). undefined = todos. */
  roles?: UserRole[];
}

export const SECTIONS: SectionDef[] = [
  {
    id: 'rrhh',
    label: 'Recursos Humanos',
    description: 'Equipo, contratos, reclutamiento y beneficios',
    icon: Users,
    accent: 'blue',
    defaultRoute: '/colaboradores',
    roles: union(RECLUTAMIENTO_ROLES, RRHH_ROLES, RRHH_FINANZAS_ROLES),
  },
  {
    id: 'operaciones',
    label: 'Operaciones',
    description: 'Órdenes de servicio, guardias, soporte, inventario y administración',
    icon: ClipboardList,
    accent: 'orange',
    defaultRoute: '/ordenes-servicio',
    // Sin roles: Soporte es accesible para cualquier autenticado.
  },
];

/** Mapa ruta → sección. Las rutas con parámetros usan el prefijo base. */
export const ROUTE_SECTION: Record<string, SectionId> = {
  '/candidatos': 'rrhh',
  '/vacantes': 'rrhh',
  '/colaboradores': 'rrhh',
  '/organigrama': 'rrhh',
  '/contratos': 'rrhh',
  '/plantillas': 'rrhh',
  '/documentos': 'rrhh',
  '/beneficios': 'rrhh',
  '/ordenes-servicio': 'operaciones',
  '/guardias': 'operaciones',
  '/soporte': 'operaciones',
  '/inventario': 'operaciones',
  '/usuarios': 'operaciones',
  '/configuracion': 'operaciones',
};

/** Devuelve la sección a la que pertenece un pathname, o null si no aplica. */
export function sectionForPath(pathname: string): SectionId | null {
  // Coincidencia exacta primero
  if (pathname in ROUTE_SECTION) return ROUTE_SECTION[pathname] ?? null;
  // Prefijo para rutas con parámetros (ej. /documentos/abc)
  const base = '/' + pathname.split('/')[1];
  return ROUTE_SECTION[base] ?? null;
}
