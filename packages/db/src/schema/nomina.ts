import { numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { createdAt, id } from './_shared';
import { frecuenciaPagoEnum, monedaEnum, nominaEstadoEnum, nominaTipoEnum } from './enums';
import { colaboradores } from './colaboradores';
import { profiles } from './profiles';

export const nominas = pgTable('nominas', {
  id: id(),
  periodo: text('periodo').notNull(), // YYYY-MM
  tipo: nominaTipoEnum('tipo').notNull().default('Mensual'),
  fechaProceso: timestamp('fecha_proceso', { withTimezone: true }).notNull().defaultNow(),
  tasaBcv: numeric('tasa_bcv', { precision: 14, scale: 6 }).notNull().default('1'),
  totalNomina: numeric('total_nomina', { precision: 14, scale: 2 }).notNull().default('0'),
  totalPatronal: numeric('total_patronal', { precision: 14, scale: 2 }).notNull().default('0'),
  estado: nominaEstadoEnum('estado').notNull().default('Borrador'),
  creadoPor: uuid('creado_por').references(() => profiles.id, { onDelete: 'set null' }),
  createdAt: createdAt(),
});

export const nominaRegistros = pgTable('nomina_registros', {
  id: id(),
  nominaId: uuid('nomina_id')
    .notNull()
    .references(() => nominas.id, { onDelete: 'cascade' }),
  colaboradorId: uuid('colaborador_id')
    .notNull()
    .references(() => colaboradores.id, { onDelete: 'restrict' }),
  nombre: text('nombre').notNull(),
  salarioBase: numeric('salario_base', { precision: 12, scale: 2 }).notNull(),
  frecuencia: frecuenciaPagoEnum('frecuencia').notNull(),
  moneda: monedaEnum('moneda').notNull(),

  // Modelo split + fideicomiso (ver migración 0022)
  salarioLegalBs: numeric('salario_legal_bs', { precision: 14, scale: 2 }).notNull().default('0'),
  bonoUsd: numeric('bono_usd', { precision: 12, scale: 2 }).notNull().default('0'),
  fideicomisoUsd: numeric('fideicomiso_usd', { precision: 12, scale: 2 }).notNull().default('0'),
  fideicomisoBs: numeric('fideicomiso_bs', { precision: 14, scale: 2 }).notNull().default('0'),

  // Asignaciones
  bonoAlimentacion: numeric('bono_alimentacion', { precision: 12, scale: 2 })
    .notNull()
    .default('0'),
  bonificacionesExtras: numeric('bonificaciones_extras', { precision: 12, scale: 2 })
    .notNull()
    .default('0'),

  // Deducciones
  ivss: numeric('ivss', { precision: 12, scale: 2 }).notNull().default('0'),
  spf: numeric('spf', { precision: 12, scale: 2 }).notNull().default('0'),
  faov: numeric('faov', { precision: 12, scale: 2 }).notNull().default('0'),
  islr: numeric('islr', { precision: 12, scale: 2 }).notNull().default('0'),
  otrasDeducciones: numeric('otras_deducciones', { precision: 12, scale: 2 })
    .notNull()
    .default('0'),

  // Totales
  totalAsignaciones: numeric('total_asignaciones', { precision: 12, scale: 2 })
    .notNull()
    .default('0'),
  totalDeducciones: numeric('total_deducciones', { precision: 12, scale: 2 })
    .notNull()
    .default('0'),
  netoAPagar: numeric('neto_a_pagar', { precision: 12, scale: 2 }).notNull().default('0'),

  // Costos patronales
  ivssPatrono: numeric('ivss_patrono', { precision: 12, scale: 2 }).notNull().default('0'),
  spfPatrono: numeric('spf_patrono', { precision: 12, scale: 2 }).notNull().default('0'),
  faovPatrono: numeric('faov_patrono', { precision: 12, scale: 2 }).notNull().default('0'),
  incesPatrono: numeric('inces_patrono', { precision: 12, scale: 2 }).notNull().default('0'),
  pensionPatrono: numeric('pension_patrono', { precision: 12, scale: 2 }).notNull().default('0'),
  costoTotalPatrono: numeric('costo_total_patrono', { precision: 12, scale: 2 })
    .notNull()
    .default('0'),
});

export type Nomina = typeof nominas.$inferSelect;
export type NominaRegistro = typeof nominaRegistros.$inferSelect;
export type NewNomina = typeof nominas.$inferInsert;
export type NewNominaRegistro = typeof nominaRegistros.$inferInsert;
