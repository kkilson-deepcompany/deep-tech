import { date, integer, numeric, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { createdAt, id } from './_shared';
import { contratoEstadoEnum, contratoPlantillaEnum } from './enums';
import { candidatos } from './candidatos';
import { colaboradores } from './colaboradores';

export const contratos = pgTable('contratos', {
  id: id(),
  numero: text('numero').notNull().unique(),
  colaboradorId: uuid('colaborador_id').references(() => colaboradores.id, {
    onDelete: 'set null',
  }),
  candidatoId: uuid('candidato_id').references(() => candidatos.id, { onDelete: 'set null' }),
  empresa: text('empresa').notNull(),
  proyecto: text('proyecto'),
  departamento: text('departamento'),
  cargo: text('cargo').notNull(),
  fechaInicio: date('fecha_inicio').notNull(),
  fechaFin: date('fecha_fin').notNull(),
  periodoPruebaDias: integer('periodo_prueba_dias').notNull().default(90),
  finPeriodoPrueba: date('fin_periodo_prueba'),
  salario: numeric('salario', { precision: 12, scale: 2 }),
  diaPago: text('dia_pago').notNull().default('30'),
  estado: contratoEstadoEnum('estado').notNull().default('En Prueba'),
  plantilla: contratoPlantillaEnum('plantilla').notNull().default('Tiempo Determinado'),
  documentoUrl: text('documento_url'),
  notas: text('notas'),
  createdAt: createdAt(),
});

export type Contrato = typeof contratos.$inferSelect;
export type NewContrato = typeof contratos.$inferInsert;
