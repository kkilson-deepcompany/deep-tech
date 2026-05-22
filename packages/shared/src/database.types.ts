/**
 * Tipos generados desde Supabase. Regenerar con:
 *   bunx supabase gen types typescript --project-id <id> > packages/shared/src/database.types.ts
 *
 * Placeholder hasta F1 (schema Drizzle + primeras tablas).
 */
export type Json = string | number | boolean | null | { [k: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
