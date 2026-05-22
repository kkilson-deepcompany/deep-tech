import { boolean, date, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { createdAt, id } from './_shared';
import { documentoRevisionEnum } from './enums';
import { candidatos } from './candidatos';

export const carpetas = pgTable('carpetas', {
  id: id(),
  nombre: text('nombre').notNull().unique(),
  deletable: boolean('deletable').notNull().default(true),
  createdAt: createdAt(),
});

export const documentos = pgTable('documentos', {
  id: id(),
  candidatoId: uuid('candidato_id')
    .notNull()
    .references(() => candidatos.id, { onDelete: 'cascade' }),
  nombreCompleto: text('nombre_completo'),
  cedula: text('cedula'),
  rif: text('rif'),
  banco: text('banco'),
  cuentaBancaria: text('cuenta_bancaria'),
  tipoCuenta: text('tipo_cuenta'),
  titularCuenta: text('titular_cuenta'),
  direccion: text('direccion'),
  telefono: text('telefono'),
  referenciaBancariaUrl: text('referencia_bancaria_url'),
  cedulaUrl: text('cedula_url'),
  rifUrl: text('rif_url'),
  referenciaPersonal1Url: text('referencia_personal_1_url'),
  referenciaPersonal2Url: text('referencia_personal_2_url'),
  fechaEntrega: date('fecha_entrega'),
  estadoRevision: documentoRevisionEnum('estado_revision').notNull().default('Pendiente'),
  observaciones: text('observaciones'),
  formularioCompletado: boolean('formulario_completado').notNull().default(false),
  carpetaId: uuid('carpeta_id').references(() => carpetas.id, { onDelete: 'set null' }),
  createdAt: createdAt(),
});

export type Carpeta = typeof carpetas.$inferSelect;
export type Documento = typeof documentos.$inferSelect;
export type NewCarpeta = typeof carpetas.$inferInsert;
export type NewDocumento = typeof documentos.$inferInsert;
