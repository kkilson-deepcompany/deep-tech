import type { UserRole } from './types';

/**
 * Grupos de acceso por módulo — espejan los helpers de Postgres
 * (can_recruit / can_hr / can_finance / can_ops de la migración 0008).
 * El auditor entra a todos los módulos (solo lectura; RLS bloquea escrituras).
 *
 * Cambiar aquí NO cambia la seguridad real (esa vive en RLS): esto delimita
 * qué secciones ve y navega cada rol en la UI. Se combina con el PIN por
 * sección (section-context), que es una cortina de privacidad adicional.
 */
const DIRECCION: UserRole[] = ['admin_rrhh', 'director', 'ceo'];

/** Reclutamiento: candidatos, vacantes. */
export const RECLUTAMIENTO_ROLES: UserRole[] = [...DIRECCION, 'reclutador', 'auditor'];

/** RRHH: organigrama, documentos, beneficios (Kover). */
export const RRHH_ROLES: UserRole[] = [...DIRECCION, 'auditor'];

/** RRHH + finanzas: colaboradores, contratos y plantillas (finanzas los lee para nómina). */
export const RRHH_FINANZAS_ROLES: UserRole[] = [...DIRECCION, 'cfo', 'auditor'];

/** Finanzas: nómina, pagos, SIGF (ingresos, gastos, CxC/CxP, bancos, análisis). */
export const FINANZAS_ROLES: UserRole[] = [...DIRECCION, 'cfo', 'auditor'];

/** Operaciones: guardias, órdenes de servicio, inventario. */
export const OPERACIONES_ROLES: UserRole[] = [...DIRECCION, 'coordinador_ops', 'auditor'];

/** Administración: usuarios y configuración. */
export const ADMIN_ROLES: UserRole[] = ['admin_rrhh'];
