import { sql } from 'drizzle-orm';
import { bigint, boolean, date, jsonb, numeric, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { createdAt, id, updatedAt } from './_shared';
import { profiles } from './profiles';

/** Órdenes de servicio (Parkeate). El formulario (75+ campos) vive en `formData`. */
export const serviceOrders = pgTable('service_orders', {
  id: id(),
  orderNumber: text('order_number').unique(),
  empresa: text('empresa').notNull().default('Parkeate'),
  formData: jsonb('form_data')
    .notNull()
    .default(sql`'{}'::jsonb`),
  techSignature: text('tech_signature'),
  clientSignature: text('client_signature'),
  pdfUrl: text('pdf_url'),
  status: text('status').notNull().default('draft'),
  precioBase: numeric('precio_base', { precision: 12, scale: 2 }),
  descuento: numeric('descuento', { precision: 12, scale: 2 }),
  total: numeric('total', { precision: 12, scale: 2 }),
  pagado: boolean('pagado').notNull().default(false),
  montoPagado: numeric('monto_pagado', { precision: 12, scale: 2 }),
  fechaPago: date('fecha_pago'),
  convenioId: uuid('convenio_id'),
  clienteId: uuid('cliente_id'),
  tecnicoId: uuid('tecnico_id').references(() => profiles.id, { onDelete: 'set null' }),
  tecnicoNombre: text('tecnico_nombre'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Contadores correlativos por empresa para numerar las órdenes. */
export const serviceOrderCounters = pgTable('service_order_counters', {
  empresa: text('empresa').primaryKey(),
  seq: bigint('seq', { mode: 'number' }).notNull().default(0),
  prefix: text('prefix').notNull(),
});

/** Clientes de órdenes de servicio (con convenio de horas opcional). */
export const serviceClientes = pgTable('service_clientes', {
  id: id(),
  nombre: text('nombre').notNull().unique(),
  horasConvenioAnuales: numeric('horas_convenio_anuales', { precision: 6, scale: 2 }),
  notas: text('notas'),
  activo: boolean('activo').notNull().default(true),
  createdAt: createdAt(),
});

/** Técnicos asignables a órdenes de servicio. */
export const serviceTecnicos = pgTable('service_tecnicos', {
  id: id(),
  nombre: text('nombre').notNull().unique(),
  activo: boolean('activo').notNull().default(true),
  createdAt: createdAt(),
});

/** Convenios de horas anuales. */
export const serviceConvenios = pgTable('service_convenios', {
  id: id(),
  nombre: text('nombre').notNull().unique(),
  horasAnuales: numeric('horas_anuales', { precision: 6, scale: 2 }).notNull(),
  notas: text('notas'),
  activo: boolean('activo').notNull().default(true),
  createdAt: createdAt(),
});

export type ServiceOrderRow = typeof serviceOrders.$inferSelect;
export type NewServiceOrderRow = typeof serviceOrders.$inferInsert;
export type ServiceClienteRow = typeof serviceClientes.$inferSelect;
export type ServiceTecnicoRow = typeof serviceTecnicos.$inferSelect;
export type ServiceConvenioRow = typeof serviceConvenios.$inferSelect;
