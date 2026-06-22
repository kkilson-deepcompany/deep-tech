import {
  BarChart3,
  Building2,
  ClipboardList,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type SectionId = 'rrhh' | 'operaciones' | 'administracion' | 'finanzas';

export interface SectionDef {
  id: SectionId;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Color base para la card (clase de Tailwind sin prefijo) */
  accent: string;
  defaultRoute: string;
}

export const SECTIONS: SectionDef[] = [
  {
    id: 'rrhh',
    label: 'Recursos Humanos',
    description: 'Equipo, nómina, contratos y reclutamiento',
    icon: Users,
    accent: 'blue',
    defaultRoute: '/colaboradores',
  },
  {
    id: 'operaciones',
    label: 'Operaciones',
    description: 'Órdenes de servicio, guardias y soporte técnico',
    icon: ClipboardList,
    accent: 'orange',
    defaultRoute: '/ordenes-servicio',
  },
  {
    id: 'administracion',
    label: 'Administración',
    description: 'Compras, ventas, inventario y control',
    icon: Building2,
    accent: 'violet',
    defaultRoute: '/inventario',
  },
  {
    id: 'finanzas',
    label: 'Finanzas',
    description: 'Flujo de caja, P&L, OKRs y presupuestos',
    icon: BarChart3,
    accent: 'emerald',
    defaultRoute: '/gastos',
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
  '/nominas': 'rrhh',
  '/pago-semanal': 'rrhh',
  '/costo-nomina': 'rrhh',
  '/liquidaciones': 'rrhh',
  '/beneficios': 'rrhh',
  '/ordenes-servicio': 'operaciones',
  '/guardias': 'operaciones',
  '/soporte': 'operaciones',
  '/inventario': 'administracion',
  '/usuarios': 'administracion',
  '/configuracion': 'administracion',
  '/gastos': 'finanzas',
  '/recordatorios': 'finanzas',
  '/presupuestos': 'finanzas',
  '/ingresos': 'finanzas',
  '/finanzas-calendario': 'finanzas',
  '/tesoreria': 'finanzas',
  '/documentos-financieros': 'finanzas',
  '/centros-costo': 'finanzas',
};

/** Devuelve la sección a la que pertenece un pathname, o null si no aplica. */
export function sectionForPath(pathname: string): SectionId | null {
  // Coincidencia exacta primero
  if (pathname in ROUTE_SECTION) return ROUTE_SECTION[pathname] ?? null;
  // Prefijo para rutas con parámetros (ej. /nominas/abc)
  const base = '/' + pathname.split('/')[1];
  return ROUTE_SECTION[base] ?? null;
}
