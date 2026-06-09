import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  throw new Error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_PUBLISHABLE_KEY');
}

// Tipos reales de la base disponibles en @deep/shared (database.types.ts,
// generado con `supabase gen types`). PENDIENTE: flipar a
// `createClient<Database>(url, key, ...)` — requiere ajustar los casts `as`
// de lib/queries.ts con `tsc` corriendo para resolver los errores en cadena.
export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
