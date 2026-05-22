import { boolean, date, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { createdAt, id } from './_shared';
import { baseDatosEnum, candidatoEstadoEnum, fuenteEnum } from './enums';
import { vacantes } from './vacantes';

export const candidatos = pgTable('candidatos', {
  id: id(),
  nombre: text('nombre').notNull(),
  correo: text('correo').notNull(),
  telefono: text('telefono'),
  cedula: text('cedula'),
  fechaPostulacion: date('fecha_postulacion'),
  vacanteId: uuid('vacante_id').references(() => vacantes.id, { onDelete: 'set null' }),
  cvUrl: text('cv_url'),
  fuente: fuenteEnum('fuente').notNull().default('Web'),
  estado: candidatoEstadoEnum('estado').notNull().default('Pendiente'),
  resultadoEntrevista: text('resultado_entrevista'),
  comentarios: text('comentarios'),
  notas: text('notas'),
  resumenIa: text('resumen_ia'),
  formToken: text('form_token').unique(),
  formCompletado: boolean('form_completado').notNull().default(false),
  motivoRechazo: text('motivo_rechazo'),
  tipoRestriccion: text('tipo_restriccion'),
  estadoSeguimiento: text('estado_seguimiento'),
  baseDatos: baseDatosEnum('base_datos').notNull().default('Activo'),
  createdAt: createdAt(),
});

export type Candidato = typeof candidatos.$inferSelect;
export type NewCandidato = typeof candidatos.$inferInsert;
