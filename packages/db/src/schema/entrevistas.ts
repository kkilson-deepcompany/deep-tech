import { boolean, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { createdAt, id } from './_shared';
import {
  entrevistaContactoEnum,
  entrevistaModalidadEnum,
  entrevistaResultadoEnum,
  entrevistaTipoEnum,
} from './enums';
import { candidatos } from './candidatos';
import { vacantes } from './vacantes';

export const entrevistas = pgTable('entrevistas', {
  id: id(),
  candidatoId: uuid('candidato_id')
    .notNull()
    .references(() => candidatos.id, { onDelete: 'cascade' }),
  vacanteId: uuid('vacante_id').references(() => vacantes.id, { onDelete: 'set null' }),
  tipo: entrevistaTipoEnum('tipo').notNull().default('1ra RRHH'),
  fechaHora: timestamp('fecha_hora', { withTimezone: true }).notNull(),
  modalidad: entrevistaModalidadEnum('modalidad').notNull().default('Virtual'),
  entrevistador: text('entrevistador'),
  resultado: entrevistaResultadoEnum('resultado').notNull().default('Pendiente'),
  estadoContacto: entrevistaContactoEnum('estado_contacto').notNull().default('Programado'),
  puntuacion: integer('puntuacion'),
  comentarios: text('comentarios'),
  linkMeet: text('link_meet'),
  notificacionEnviada: boolean('notificacion_enviada').notNull().default(false),
  createdAt: createdAt(),
});

export type Entrevista = typeof entrevistas.$inferSelect;
export type NewEntrevista = typeof entrevistas.$inferInsert;
