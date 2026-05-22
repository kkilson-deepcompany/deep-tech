import { jsonb, pgTable, text } from 'drizzle-orm/pg-core';
import { createdAt, id } from './_shared';

/**
 * Organigramas por empresa (Deepcompany, Parkeate, G-Store, Desredalab, Kover…).
 * Cada fila es un organigrama independiente; `tree` guarda la estructura
 * jerárquica completa como JSON (cargos, nombres, departamentos y subordinados).
 */
export const orgTrees = pgTable('org_trees', {
  id: id(),
  name: text('name').notNull(),
  tree: jsonb('tree').notNull(),
  createdAt: createdAt(),
});

export type OrgTreeRow = typeof orgTrees.$inferSelect;
export type NewOrgTreeRow = typeof orgTrees.$inferInsert;
