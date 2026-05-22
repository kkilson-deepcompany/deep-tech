import { defineConfig } from 'drizzle-kit';

// Bun carga `.env.local` automáticamente al correr `bun run db:*` desde la raíz.
const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL no definido');

export default defineConfig({
  schema: './src/schema/index.ts',
  out: '../../supabase/migrations',
  dialect: 'postgresql',
  dbCredentials: { url },
  schemaFilter: ['public'],
  verbose: true,
  strict: true,
});
