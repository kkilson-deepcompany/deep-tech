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

## Pendiente importante (no hecho aún)
- **Rotar `service_role` key + contraseña Postgres** (estaban en claro en `.env.local`/`scripts/apply.ts`).
- Regenerar `packages/shared/src/database.types.ts` (`supabase gen types`, necesita acceso a la DB) y tipar el cliente Supabase con `<Database>` (hoy todo es `any` casteado).

Relacionado: [[deep-tech-hr-migration]], [[deep-tech-env-constraints]].
