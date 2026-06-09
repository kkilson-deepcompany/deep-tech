import { sql } from 'drizzle-orm';
import { boolean, jsonb, numeric, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { createdAt, updatedAt } from './_shared';

/**
 * Tickets de soporte (Operaciones). La PK es un código legible (TK-AAAAMMDDHHMM).
 * Las notas internas se agregan de forma atómica vía RPC support_ticket_add_nota.
 */
export const supportTickets = pgTable('support_tickets', {
  id: text('id').primaryKey(),
  fechaCreacion: timestamp('fecha_creacion', { withTimezone: true }).defaultNow(),
  canalEntrada: text('canal_entrada'),
  clienteNombre: text('cliente_nombre'),
  clienteContacto: text('cliente_contacto'),
  clienteEmpresa: text('cliente_empresa'),
  descripcion: text('descripcion'),
  tipoSolicitud: text('tipo_solicitud'),
  urgencia: text('urgencia'),
  ruta: text('ruta'),
  rutaRazon: text('ruta_razon'),
  propuestaId: text('propuesta_id'),
  propuestaContenido: text('propuesta_contenido'),
  propuestaMonto: numeric('propuesta_monto'),
  propuestaAceptada: boolean('propuesta_aceptada'),
  rechazoRazon: text('rechazo_razon'),
  ordenServicioId: text('orden_servicio_id'),
  tipoIntervencion: text('tipo_intervencion'),
  liderProyecto: text('lider_proyecto'),
  tecnicosAsignados: text('tecnicos_asignados')
    .array()
    .default(sql`'{}'`),
  fechaImplementacion: text('fecha_implementacion'),
  equiposRequeridos: jsonb('equipos_requeridos').default(sql`'[]'::jsonb`),
  ordenCompraId: text('orden_compra_id'),
  equiposDisponibles: boolean('equipos_disponibles'),
  pagoEjecutado: boolean('pago_ejecutado'),
  notificacionesEnviadas: text('notificaciones_enviadas')
    .array()
    .default(sql`'{}'`),
  status: text('status').default('nuevo'),
  ultimaActualizacion: timestamp('ultima_actualizacion', { withTimezone: true }).defaultNow(),
  notasInternas: text('notas_internas')
    .array()
    .default(sql`'{}'`),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export type SupportTicketRow = typeof supportTickets.$inferSelect;
export type NewSupportTicketRow = typeof supportTickets.$inferInsert;
