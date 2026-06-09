import { sql } from 'drizzle-orm';
import { bigint, date, jsonb, numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { createdAt, id, updatedAt } from './_shared';
import { colaboradores } from './colaboradores';

/**
 * Solicitudes de seguro Kover. El cuestionario completo (42 preguntas con sus
 * detalles condicionales) vive en `formData` (jsonb); algunas claves se
 * denormalizan en columnas para listar sin parsear el blob.
 * Contiene datos de salud — categoría especial (ver RLS por rol en 0008/0021).
 */
export const koverSolicitudes = pgTable('kover_solicitudes', {
  id: id(),
  colaboradorId: uuid('colaborador_id').references(() => colaboradores.id, {
    onDelete: 'set null',
  }),
  applicationDate: date('application_date'),
  insurer: text('insurer'),
  insuredAmountUsd: numeric('insured_amount_usd', { precision: 12, scale: 2 }),
  paymentFrequency: text('payment_frequency'),
  applicantFullName: text('applicant_full_name'),
  applicantIdDoc: text('applicant_id_doc'),
  formData: jsonb('form_data')
    .notNull()
    .default(sql`'{}'::jsonb`),
  status: text('status').notNull().default('draft'),
  riskClassification: text('risk_classification'),
  notes: text('notes'),
  createdAt: createdAt(),
  submittedAt: timestamp('submitted_at', { withTimezone: true }),
  updatedAt: updatedAt(),
});

/** Documentos adjuntos de una solicitud Kober (cédula, informes, exámenes…). */
export const koverDocuments = pgTable('kover_documents', {
  id: id(),
  applicationId: uuid('application_id')
    .notNull()
    .references(() => koverSolicitudes.id, { onDelete: 'cascade' }),
  docType: text('doc_type').notNull(),
  relatedQuestionCode: text('related_question_code'),
  storagePath: text('storage_path').notNull(),
  fileName: text('file_name').notNull(),
  mimeType: text('mime_type').notNull(),
  sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
  sha256Hash: text('sha256_hash').notNull(),
  uploadedAt: timestamp('uploaded_at', { withTimezone: true }).notNull().defaultNow(),
});

export type KoverSolicitudRow = typeof koverSolicitudes.$inferSelect;
export type NewKoverSolicitudRow = typeof koverSolicitudes.$inferInsert;
export type KoverDocumentRow = typeof koverDocuments.$inferSelect;
export type NewKoverDocumentRow = typeof koverDocuments.$inferInsert;
