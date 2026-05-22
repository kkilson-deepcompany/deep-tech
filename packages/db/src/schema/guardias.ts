import { date, pgTable, text, time } from 'drizzle-orm/pg-core';
import { createdAt, id } from './_shared';
import { guardiaEstadoEnum } from './enums';

export const guardias = pgTable('guardias', {
  id: id(),
  tipoServicio: text('tipo_servicio').notNull(),
  actores: text('actores').array().notNull(),
  fecha: date('fecha').notNull(),
  // Bloque horario y ubicación del servicio (para el calendario mensual).
  horaInicio: time('hora_inicio'),
  horaFin: time('hora_fin'),
  ubicacion: text('ubicacion'),
  descripcion: text('descripcion'),
  estado: guardiaEstadoEnum('estado').notNull().default('Pendiente'),
  createdAt: createdAt(),
});

/** Catálogo configurable de tipos de servicio y actores. */
export const guardiasConfig = pgTable('guardias_config', {
  id: id(),
  tiposServicio: text('tipos_servicio').array().notNull().default([]),
  actores: text('actores').array().notNull().default([]),
  createdAt: createdAt(),
});

export type Guardia = typeof guardias.$inferSelect;
export type NewGuardia = typeof guardias.$inferInsert;
