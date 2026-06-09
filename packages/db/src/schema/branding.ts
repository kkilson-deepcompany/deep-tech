import { pgTable, text } from 'drizzle-orm/pg-core';
import { createdAt, updatedAt } from './_shared';

/**
 * Branding por empresa (logo y color primario). La PK es el nombre de la
 * empresa. Lectura pública (anon) para mostrar el logo en páginas públicas.
 */
export const empresaBranding = pgTable('empresa_branding', {
  nombre: text('nombre').primaryKey(),
  logoUrl: text('logo_url'),
  colorPrimario: text('color_primario'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export type EmpresaBrandingRow = typeof empresaBranding.$inferSelect;
export type NewEmpresaBrandingRow = typeof empresaBranding.$inferInsert;
