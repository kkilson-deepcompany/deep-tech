import { boolean, date, numeric, pgTable, smallint, text, uuid } from 'drizzle-orm/pg-core';
import { createdAt, id } from './_shared';
import { colaboradorEstadoEnum, frecuenciaPagoEnum, monedaEnum } from './enums';
import { candidatos } from './candidatos';

export const colaboradores = pgTable('colaboradores', {
  id: id(),
  nombre: text('nombre').notNull(),
  correo: text('correo').notNull().unique(),
  telefono: text('telefono'),
  cedula: text('cedula'),
  rif: text('rif'),
  direccion: text('direccion'),
  empresa: text('empresa').notNull(),
  proyecto: text('proyecto'),
  departamento: text('departamento'),
  cargo: text('cargo').notNull(),
  fechaInicio: date('fecha_inicio').notNull(),
  finPeriodoPrueba: date('fin_periodo_prueba'),
  finContrato: date('fin_contrato'),
  salario: numeric('salario', { precision: 12, scale: 2 }),
  // Modelo split: salario legal en Bs (base de IVSS/RPE/FAOV/fideicomiso) + bono USD.
  salarioBaseLegalBs: numeric('salario_base_legal_bs', { precision: 14, scale: 2 })
    .notNull()
    .default('0'),
  bonoUsd: numeric('bono_usd', { precision: 12, scale: 2 }).notNull().default('0'),
  // Semana de pago (1-4) para la nómina semanal escalonada; null = solo mensual.
  semanaPago: smallint('semana_pago'),
  diaPago: text('dia_pago').notNull().default('30'),
  frecuenciaPago: frecuenciaPagoEnum('frecuencia_pago').notNull().default('Mensual'),
  moneda: monedaEnum('moneda').notNull().default('USD'),
  bonoAlimentacion: numeric('bono_alimentacion', { precision: 12, scale: 2 })
    .notNull()
    .default('40'),

  // Aportes patronales — toggles
  aplicaIvss: boolean('aplica_ivss').notNull().default(true),
  aplicaRpe: boolean('aplica_rpe').notNull().default(true),
  aplicaFaov: boolean('aplica_faov').notNull().default(true),
  aplicaIslr: boolean('aplica_islr').notNull().default(false),
  aplicaInces: boolean('aplica_inces').notNull().default(true),
  aplicaPension: boolean('aplica_pension').notNull().default(true),
  aplicaLocti: boolean('aplica_locti').notNull().default(false),
  aplicaDeporte: boolean('aplica_deporte').notNull().default(false),
  aplicaFona: boolean('aplica_fona').notNull().default(false),

  // Porcentajes
  islrPct: numeric('islr_pct', { precision: 5, scale: 2 }).notNull().default('0'),
  ivssWorkerPct: numeric('ivss_worker_pct', { precision: 5, scale: 2 }).notNull().default('4'),
  ivssPatronPct: numeric('ivss_patron_pct', { precision: 5, scale: 2 }).notNull().default('10'),
  rpeWorkerPct: numeric('rpe_worker_pct', { precision: 5, scale: 2 }).notNull().default('0.5'),
  rpePatronPct: numeric('rpe_patron_pct', { precision: 5, scale: 2 }).notNull().default('2'),
  faovWorkerPct: numeric('faov_worker_pct', { precision: 5, scale: 2 }).notNull().default('1'),
  faovPatronPct: numeric('faov_patron_pct', { precision: 5, scale: 2 }).notNull().default('2'),
  incesPatronPct: numeric('inces_patron_pct', { precision: 5, scale: 2 }).notNull().default('2'),
  pensionPatronPct: numeric('pension_patron_pct', { precision: 5, scale: 2 })
    .notNull()
    .default('9'),

  banco: text('banco'),
  cuentaBancaria: text('cuenta_bancaria'),
  estado: colaboradorEstadoEnum('estado').notNull().default('En Prueba'),
  candidatoId: uuid('candidato_id').references(() => candidatos.id, { onDelete: 'set null' }),
  notas: text('notas'),

  // Expedientes (URLs en Supabase Storage)
  cedulaUrl: text('cedula_url'),
  rifUrl: text('rif_url'),
  referenciasLaboralesUrl: text('referencias_laborales_url'),
  referenciasPersonalesUrl: text('referencias_personales_url'),
  referenciasBancariasUrl: text('referencias_bancarias_url'),
  cartasTrabajoUrl: text('cartas_trabajo_url'),
  documentosExtrasUrl: text('documentos_extras_url'),

  createdAt: createdAt(),
});

export type Colaborador = typeof colaboradores.$inferSelect;
export type NewColaborador = typeof colaboradores.$inferInsert;
