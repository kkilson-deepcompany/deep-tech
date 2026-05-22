import { date, numeric, pgTable, text, time } from 'drizzle-orm/pg-core';
import { createdAt, id } from './_shared';
import { modalidadEnum, tipoContratoEnum, vacanteEstadoEnum } from './enums';

export const vacantes = pgTable('vacantes', {
  id: id(),
  titulo: text('titulo').notNull(),
  estado: vacanteEstadoEnum('estado').notNull().default('Abierta'),
  departamento: text('departamento'),
  empresa: text('empresa'),
  proyecto: text('proyecto'),
  fechaPublicacion: date('fecha_publicacion'),
  fechaCierre: date('fecha_cierre'),
  descripcion: text('descripcion'),
  salarioMin: numeric('salario_min', { precision: 12, scale: 2 }),
  salarioMax: numeric('salario_max', { precision: 12, scale: 2 }),
  beneficios: text('beneficios'),
  modalidad: modalidadEnum('modalidad').notNull().default('Remoto'),
  tipoContrato: tipoContratoEnum('tipo_contrato').notNull().default('Fijo'),
  requisitos: text('requisitos'),
  notas: text('notas'),
  fechaInicioEntrevistas: date('fecha_inicio_entrevistas'),
  fechaFinEntrevistas: date('fecha_fin_entrevistas'),
  diasHabilitados: text('dias_habilitados').array(),
  horaInicio: time('hora_inicio'),
  horaFin: time('hora_fin'),
  createdAt: createdAt(),
});

export type Vacante = typeof vacantes.$inferSelect;
export type NewVacante = typeof vacantes.$inferInsert;
