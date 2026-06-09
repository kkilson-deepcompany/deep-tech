---
name: auditoria-2026-06
description: Auditoría completa de deep.tech (jun 2026) — qué se arregló y qué queda pendiente.
metadata:
  type: project
---

Auditoría completa (código, seguridad, arquitectura, finanzas) hecha el 2026-06-09. Rama `auditoria-fixes`.

**Why:** el usuario pidió auditoría crítica para hacer el producto sólido.

## Arreglado (commit 548fa7d)
- **RLS por rol** (`supabase/migrations/0008_rls_por_rol.sql`): reemplaza `tmp_authenticated_all` por políticas por módulo/rol (helpers `can_recruit/can_hr/can_finance/can_ops/is_auditor`). Auditor = solo lectura. **PENDIENTE: aplicar la migración a la BD** (entorno no alcanza 5432; aplicar vía Management API con PAT).
- `generar_nomina`: guard de rol + valida tasa>0. `form_submit`: valida token + un solo envío.
- `send-service-order` valida rol; CORS sin `*` (usa `ALLOWED_ORIGIN`/`SITE_URL`). **PENDIENTE: redeploy de ambas edge functions + `supabase secrets set ALLOWED_ORIGIN=`**.
- `vercel.json`: headers de seguridad (HSTS/CSP/X-Frame-Options...). Verificar que el CSP no rompa nada en prod.
- Finanzas: `round2()` en domain.ts, céntimos en numero-a-letras, tasa BCV obligatoria, `products.costo_total` por trigger en BD.
- Limpieza: checkbox duplicado en producto-dialog, RPC atómico `support_ticket_add_nota`, formatMoney(number), eliminadas deps muertas (zod, @hookform/resolvers), añadido CI.

## Drift de schema RESUELTO (commit 23ac94c)
- Los 12 `scripts/*.sql` se movieron a `supabase/migrations/0009-0020` (orden de dependencia). BD nueva ya reproducible desde migraciones.
- 0008 refactorizado: RLS por rol vía función `apply_module_rls()` que dropea TODAS las policies previas (no solo tmp_authenticated_all) antes de crear las de rol. 0021 la reaplica tras crear las tablas de scripts.
- Schemas Drizzle añadidos: branding, kover, service-orders, support-tickets.
- **PENDIENTE: aplicar 0008-0021 a la BD** en orden (Management API). `empresa_branding` queda fuera del modelo de rol (conserva lectura anon).
- Caveat: drizzle `_journal.json`/snapshots solo cubren 0000-0007. Si se corre `drizzle-kit generate` intentará recrear las tablas nuevas. Workflow real = aplicar SQL por Management API, no `drizzle migrate`.

## Más resuelto (commit 71a4208)
- `xlsx` repinneado al build parcheado del CDN de SheetJS (0.20.3) — resuelve los CVEs. Mismo API. **PENDIENTE: `bun install` para actualizar bun.lock.**
- Tests unitarios añadidos (domain, numero-a-letras, service-order, reservas). No se pudieron correr en el entorno (symlinks de node_modules rotos en /mnt/c); correr en WSL/CI.
- `retencion_iva_pct`: CONFIRMADO por el usuario que SUMA al costo (correcto, es desembolso bruto). No cambiar.

## APLICADO A PRODUCCIÓN (2026-06-09, vía Management API con PAT)
- Migraciones **0008, 0020, 0021 aplicadas** a la BD real (proyecto faxrcsjgqkdntosdftke). 0009-0019 ya estaban (no re-aplicadas). Verificado: 28 tablas con 4 policies de rol c/u, tmp_authenticated_all eliminado, empresa_branding conserva lectura anon, support_tickets creada (faltaba en prod).
- **database.types.ts regenerado** real (32 tipos) en packages/shared. Cliente AÚN sin `<Database>` (flip pendiente, necesita tsc para arreglar casts).
- Roles corregidos: `k.kilson@deepcompany.com` promovido a admin_rrhh; 3 cuentas `_diag_*@local.test` eliminadas. Quedan 2 admins (k.kilson, rhernandez).

## BUILD ARREGLADO Y VERIFICADO (commit f3cfe82)
- IMPORTANTE: `bun install` SÍ funciona en bun nativo de Windows (git-bash, /c/...), NO en WSL/mnt. Eso desbloqueó tsc/vitest/vite. El build venía ROTO en silencio (tsc nunca corría).
- Arreglados ~22 errores de tipo pre-existentes (noUncheckedIndexedAccess) + bug de import de useDialog en org-node + código muerto.
- Bug REAL hallado por test: `parseIntList('')` daba `[0]` (recordatorio espurio); corregido.
- Verificado TODO: `bun x tsc -b apps/web/tsconfig.json` verde, 24/24 tests, `bun run build` verde, `bun run lint` 0 errores. manualChunks: index 1003KB→667KB.
- bun.lock actualizado (incluye xlsx CDN 0.20.3).

## Flip a createClient<Database>: MEDIDO = 55 errores
- Probado y revertido. Los Row generados no calzan con las interfaces de dominio (form_data Json vs interfaces tipadas). Hacerlo bien = refactor deliberado que ALINEE domain.ts/service-order types con los generados, NO 55 casts `as unknown as`. Tarea propia futura.

## Merge a main + deploy resueltos (2026-06-09)
- `auditoria-fixes` MERGEADA a `main` (commit 2b9ed21). NO hay remoto git → todo local; falta `git remote add` + push cuando suban a GitHub.
- **Signup público CERRADO** (`disable_signup: true` vía Management API) — estaba abierto, hueco real.
- **Edge functions desplegadas** (estaban SIN desplegar): invite-user y send-service-order, ACTIVE, verify_jwt=false. Deploy vía `bunx supabase functions deploy --project-ref ... ` con SUPABASE_ACCESS_TOKEN (sin Docker).
- **CORS por allowlist** (commit ff7476c): `ALLOWED_ORIGINS` (lista, echo de origen). Secret seteado a `http://localhost:5173,http://localhost:3000`. Al subir a Vercel/AWS: ampliar el secret con esos dominios (no requiere redeploy de código, pero sí re-set del secret y redeploy para tomar el env... en realidad cambiar secret requiere redeploy de la función para refrescar env).

## Pendiente del usuario
- **REVOCAR el PAT `sbp_533e...`** (Account → Tokens) y **rotar `service_role`** (quedó en el chat) + contraseña Postgres.
- **`RESEND_API_KEY`** NO está seteado → send-service-order da 500 hasta que pongas la key de resend.com.
- `site_url` de auth = `http://localhost:3000` → actualizar a la URL real al desplegar (afecta el redirect del invite a /welcome). Ojo: el front corre en :5173, el site_url dice :3000.
- Al desplegar: ampliar `ALLOWED_ORIGINS` con el dominio Vercel/AWS y redeploy de las 2 functions.
- Refactor deliberado para flipar el cliente a `<Database>` (55 errores medidos; alinear domain types).

Relacionado: [[deep-tech-hr-migration]], [[deep-tech-env-constraints]].
