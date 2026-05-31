/**
 * Tipos del módulo de Soporte (Operaciones).
 * CRUD manual contra la tabla `public.support_tickets`.
 */

export type SupportRuta = 'comercial' | 'campo' | 'resuelto_remoto';

export type SupportUrgencia = 'alta' | 'media' | 'baja';

export type SupportStatus =
  | 'nuevo'
  | 'clasificado'
  | 'en_revision_comercial'
  | 'propuesta_enviada'
  | 'propuesta_aceptada'
  | 'propuesta_rechazada'
  | 'en_campo'
  | 'orden_servicio_creada'
  | 'planificando'
  | 'en_compras'
  | 'ejecutando'
  | 'notificado'
  | 'cerrado';

export type SupportTipoIntervencion = 'falla' | 'cambio' | 'proyecto';

export type SupportTipoSolicitud = 'falla' | 'cambio' | 'proyecto' | 'consulta';

export type SupportCanal = 'whatsapp' | 'email' | 'telefono' | 'portal';

export interface SupportEquipoRequerido {
  marca?: string;
  modelo?: string;
  cantidad?: number;
  fecha_necesidad?: string;
}

export interface SupportTicket {
  id: string;
  fecha_creacion: string | null;
  canal_entrada: string | null;

  cliente_nombre: string | null;
  cliente_contacto: string | null;
  cliente_empresa: string | null;

  descripcion: string | null;
  tipo_solicitud: string | null;
  urgencia: SupportUrgencia | null;

  ruta: SupportRuta | null;
  ruta_razon: string | null;

  propuesta_id: string | null;
  propuesta_contenido: string | null;
  propuesta_monto: number | null;
  propuesta_aceptada: boolean | null;
  rechazo_razon: string | null;

  orden_servicio_id: string | null;
  tipo_intervencion: SupportTipoIntervencion | null;
  lider_proyecto: string | null;
  tecnicos_asignados: string[];

  fecha_implementacion: string | null;
  equipos_requeridos: SupportEquipoRequerido[];

  orden_compra_id: string | null;
  equipos_disponibles: boolean | null;
  pago_ejecutado: boolean | null;

  notificaciones_enviadas: string[];
  status: SupportStatus | null;
  ultima_actualizacion: string | null;

  notas_internas: string[];

  created_at: string;
  updated_at: string;
}

export interface SupportTicketCreate {
  id?: string;
  cliente_nombre: string;
  cliente_empresa: string;
  cliente_contacto: string;
  canal_entrada: SupportCanal;
  descripcion: string;
  urgencia?: SupportUrgencia | null;
  ruta?: SupportRuta | null;
  tipo_solicitud?: SupportTipoSolicitud | null;
  status?: SupportStatus;
}

export type SupportTicketUpdate = Partial<
  Omit<SupportTicket, 'id' | 'created_at' | 'updated_at' | 'fecha_creacion'>
>;

export const CANAL_LABEL: Record<SupportCanal, string> = {
  whatsapp: 'WhatsApp',
  email: 'Email',
  telefono: 'Teléfono',
  portal: 'Portal',
};

export const TIPO_SOLICITUD_LABEL: Record<SupportTipoSolicitud, string> = {
  falla: 'Falla',
  cambio: 'Cambio',
  proyecto: 'Proyecto',
  consulta: 'Consulta',
};

export const RUTA_LABEL: Record<SupportRuta, string> = {
  comercial: 'Comercial',
  campo: 'Campo',
  resuelto_remoto: 'Resuelto remoto',
};

export const URGENCIA_LABEL: Record<SupportUrgencia, { label: string; tone: string }> = {
  alta: { label: 'Alta', tone: 'bg-red-100 text-red-800' },
  media: { label: 'Media', tone: 'bg-amber-100 text-amber-800' },
  baja: { label: 'Baja', tone: 'bg-emerald-100 text-emerald-800' },
};

export const STATUS_LABEL: Record<SupportStatus, { label: string; tone: string }> = {
  nuevo: { label: 'Nuevo', tone: 'bg-muted text-muted-foreground' },
  clasificado: { label: 'Clasificado', tone: 'bg-blue-100 text-blue-800' },
  en_revision_comercial: { label: 'En revisión comercial', tone: 'bg-indigo-100 text-indigo-800' },
  propuesta_enviada: { label: 'Propuesta enviada', tone: 'bg-amber-100 text-amber-800' },
  propuesta_aceptada: { label: 'Propuesta aceptada', tone: 'bg-emerald-100 text-emerald-800' },
  propuesta_rechazada: { label: 'Propuesta rechazada', tone: 'bg-red-100 text-red-800' },
  en_campo: { label: 'En campo', tone: 'bg-indigo-100 text-indigo-800' },
  orden_servicio_creada: { label: 'OS creada', tone: 'bg-blue-100 text-blue-800' },
  planificando: { label: 'Planificando', tone: 'bg-amber-100 text-amber-800' },
  en_compras: { label: 'En compras', tone: 'bg-amber-100 text-amber-800' },
  ejecutando: { label: 'Ejecutando', tone: 'bg-indigo-100 text-indigo-800' },
  notificado: { label: 'Notificado', tone: 'bg-blue-100 text-blue-800' },
  cerrado: { label: 'Cerrado', tone: 'bg-muted text-muted-foreground' },
};
