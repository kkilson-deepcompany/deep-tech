import { integer, numeric, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { createdAt, id, updatedAt } from './_shared';
import { colaboradores } from './colaboradores';

/** Plan de pago semanal: reparte la nómina mensual en 4 cortes (martes). */
export const nominaSemanal = pgTable('nomina_semanal', {
  id: id(),
  colaboradorId: uuid('colaborador_id').references(() => colaboradores.id, { onDelete: 'set null' }),
  empleado: text('empleado').notNull(),
  rol: text('rol'),
  departamento: text('departamento'),
  estado: text('estado').notNull().default('Activo'),
  montoMensual: numeric('monto_mensual', { precision: 12, scale: 2 }).notNull().default('0'),
  semana1: numeric('semana1', { precision: 12, scale: 2 }).notNull().default('0'),
  semana2: numeric('semana2', { precision: 12, scale: 2 }).notNull().default('0'),
  semana3: numeric('semana3', { precision: 12, scale: 2 }).notNull().default('0'),
  semana4: numeric('semana4', { precision: 12, scale: 2 }).notNull().default('0'),
  orden: integer('orden').notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export type NominaSemanal = typeof nominaSemanal.$inferSelect;
