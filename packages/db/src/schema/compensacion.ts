import { boolean, date, numeric, pgTable, smallint, text } from 'drizzle-orm/pg-core';
import { createdAt, id } from './_shared';
import { colaboradores } from './colaboradores';
import { uuid } from 'drizzle-orm/pg-core';

/** Préstamos corporativos deducibles del sueldo. */
export const prestamos = pgTable('prestamos', {
  id: id(),
  colaboradorId: uuid('colaborador_id')
    .notNull()
    .references(() => colaboradores.id, { onDelete: 'cascade' }),
  descripcion: text('descripcion'),
  monto: numeric('monto', { precision: 12, scale: 2 }).notNull().default('0'),
  meses: smallint('meses').notNull().default(6),
  frecuencia: text('frecuencia').notNull().default('mensual'),
  fechaInicio: date('fecha_inicio'),
  estado: text('estado').notNull().default('Activo'),
  nota: text('nota'),
  createdAt: createdAt(),
});

/** Beneficios particulares por colaborador (con periodicidad). */
export const beneficiosColaborador = pgTable('beneficios_colaborador', {
  id: id(),
  colaboradorId: uuid('colaborador_id')
    .notNull()
    .references(() => colaboradores.id, { onDelete: 'cascade' }),
  concepto: text('concepto').notNull(),
  categoria: text('categoria').notNull().default('Otro'),
  costoEmpresa: numeric('costo_empresa', { precision: 12, scale: 2 }).notNull().default('0'),
  periodicidad: text('periodicidad').notNull().default('Mensual'),
  fechaInicio: date('fecha_inicio'),
  fechaFin: date('fecha_fin'),
  activo: boolean('activo').notNull().default(true),
  nota: text('nota'),
  createdAt: createdAt(),
});

export type Prestamo = typeof prestamos.$inferSelect;
export type BeneficioColaborador = typeof beneficiosColaborador.$inferSelect;
