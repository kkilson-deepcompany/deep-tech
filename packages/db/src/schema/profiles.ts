import { pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { createdAt, updatedAt } from './_shared';
import { userRoleEnum } from './enums';

/**
 * Espejo de auth.users de Supabase con el rol y datos de perfil.
 * id = auth.users.id (lo crea trigger en la migración).
 */
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(), // FK lógica a auth.users(id); el trigger se crea en SQL.
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  role: userRoleEnum('role').notNull().default('reclutador'),
  picture: text('picture'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
