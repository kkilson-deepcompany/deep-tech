import { sql } from 'drizzle-orm';
import { boolean, date, jsonb, numeric, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { createdAt, id } from './_shared';
import { colaboradores } from './colaboradores';
import { expenses } from './finanzas';

/** Catálogo de planes de seguro (colectiva/individual). */
export const seguroPlanes = pgTable('seguro_planes', {
  id: id(),
  clave: text('clave').notNull().unique(),
  aseguradora: text('aseguradora').notNull(),
  nombre: text('nombre').notNull(),
  tipo: text('tipo').notNull(),
  cobertura: text('cobertura'),
  activo: boolean('activo').notNull().default(true),
  createdAt: createdAt(),
});

/** Ficha de seguro por colaborador: cotización (jsonb) + plan elegido. */
export const colaboradorSeguros = pgTable('colaborador_seguros', {
  id: id(),
  colaboradorId: uuid('colaborador_id')
    .notNull()
    .references(() => colaboradores.id, { onDelete: 'cascade' }),
  estado: text('estado').notNull().default('Cotizado'),
  planId: uuid('plan_id').references(() => seguroPlanes.id, { onDelete: 'set null' }),
  primaUsd: numeric('prima_usd', { precision: 12, scale: 2 }),
  fechaNacimiento: date('fecha_nacimiento'),
  genero: text('genero'),
  cotizacion: jsonb('cotizacion')
    .notNull()
    .default(sql`'{}'::jsonb`),
  vigenciaInicio: date('vigencia_inicio'),
  vigenciaFin: date('vigencia_fin'),
  nota: text('nota'),
  createdAt: createdAt(),
});

/** Formaciones / capacitaciones (enlazables a un gasto). */
export const formaciones = pgTable('formaciones', {
  id: id(),
  colaboradorId: uuid('colaborador_id').references(() => colaboradores.id, { onDelete: 'set null' }),
  nombre: text('nombre').notNull(),
  proveedor: text('proveedor'),
  costoUsd: numeric('costo_usd', { precision: 12, scale: 2 }).notNull().default('0'),
  fecha: date('fecha'),
  estado: text('estado').notNull().default('Planificada'),
  gastoId: uuid('gasto_id').references(() => expenses.id, { onDelete: 'set null' }),
  nota: text('nota'),
  createdAt: createdAt(),
});

/** Becas corporativas (enlazables a un gasto). */
export const becas = pgTable('becas', {
  id: id(),
  colaboradorId: uuid('colaborador_id').references(() => colaboradores.id, { onDelete: 'set null' }),
  institucion: text('institucion').notNull(),
  programa: text('programa'),
  montoUsd: numeric('monto_usd', { precision: 12, scale: 2 }).notNull().default('0'),
  pctCubierto: numeric('pct_cubierto', { precision: 5, scale: 2 }).notNull().default('100'),
  periodo: text('periodo'),
  estado: text('estado').notNull().default('Activa'),
  gastoId: uuid('gasto_id').references(() => expenses.id, { onDelete: 'set null' }),
  nota: text('nota'),
  createdAt: createdAt(),
});

export type SeguroPlan = typeof seguroPlanes.$inferSelect;
export type ColaboradorSeguro = typeof colaboradorSeguros.$inferSelect;
export type Formacion = typeof formaciones.$inferSelect;
export type Beca = typeof becas.$inferSelect;
