/**
 * Aplica un archivo SQL contra el pooler IPv4 de Supabase.
 * Uso:
 *   cd /mnt/c/Users/kilso/Downloads/deep.tech
 *   bun run scripts/apply.ts supabase/migrations/0008_rls_por_rol.sql '<password>'
 *
 * Las migraciones formales viven en supabase/migrations/ (0000–0021) y se
 * aplican en orden. Este script es solo un ayudante manual mientras el entorno
 * no alcanza la DB por 5432; preferir `supabase db push` cuando sea posible.
 *
 * El segundo argumento (password) se pasa explícito porque en WSL las env
 * vars del shell no cruzan a bun.exe de Windows. Si se omite, intenta leer
 * la env `SUPABASE_DB_PASSWORD`.
 */
import postgres from 'postgres';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sqlPath = process.argv[2];
if (!sqlPath) {
  console.error('Falta el path al .sql');
  process.exit(1);
}
const password = process.argv[3] ?? process.env.SUPABASE_DB_PASSWORD;
if (!password) {
  console.error('Falta la contraseña (argv[3] o SUPABASE_DB_PASSWORD).');
  process.exit(1);
}

const sqlText = readFileSync(resolve(sqlPath), 'utf8');

const sql = postgres({
  host: 'aws-1-us-east-2.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  username: 'postgres.faxrcsjgqkdntosdftke',
  password,
  ssl: 'require',
  prepare: false,
});

try {
  console.log(`Aplicando ${sqlPath}…`);
  await sql.unsafe(sqlText);
  console.log('OK.');
} catch (e) {
  console.error('FAIL:', (e as Error).message);
  process.exit(1);
} finally {
  await sql.end();
}
