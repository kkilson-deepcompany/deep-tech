import { numeric, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { createdAt, id } from './_shared';
import { colaboradores } from './colaboradores';
import { nominas } from './nomina';

/**
 * Libro mayor de fideicomiso (prestaciones). Cada corrida de nómina abona el
 * 10% legal (Bs) y el 10% del bono (USD). El saldo por colaborador es la suma
 * de sus movimientos (abono +, retiro -).
 */
export const fideicomisoMovimientos = pgTable('fideicomiso_movimientos', {
  id: id(),
  colaboradorId: uuid('colaborador_id')
    .notNull()
    .references(() => colaboradores.id, { onDelete: 'cascade' }),
  nominaId: uuid('nomina_id').references(() => nominas.id, { onDelete: 'set null' }),
  periodo: text('periodo').notNull(),
  tipo: text('tipo').notNull().default('abono'),
  montoUsd: numeric('monto_usd', { precision: 12, scale: 2 }).notNull().default('0'),
  montoBs: numeric('monto_bs', { precision: 14, scale: 2 }).notNull().default('0'),
  tasaBcv: numeric('tasa_bcv', { precision: 14, scale: 6 }).notNull().default('1'),
  nota: text('nota'),
  createdAt: createdAt(),
});

export type FideicomisoMovimiento = typeof fideicomisoMovimientos.$inferSelect;
export type NewFideicomisoMovimiento = typeof fideicomisoMovimientos.$inferInsert;
