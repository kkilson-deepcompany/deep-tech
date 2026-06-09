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

## Pendiente importante (no hecho aún)
- **Rotar `service_role` key + contraseña Postgres** (estaban en claro en `.env.local`/`scripts/apply.ts`).
- **Drift de schema (P0):** 10 tablas viven solo en `scripts/*.sql` (org_trees, kover, service-*, support, branding) y NO en migraciones ni en schema Drizzle. La BD real no es reproducible. Consolidar todo en migraciones + schema Drizzle; eliminar `scripts/apply.ts`.
- Regenerar `packages/shared/src/database.types.ts` (`supabase gen types`) y tipar el cliente Supabase con `<Database>` (hoy todo es `any` casteado).
- `xlsx@0.18.5` tiene CVEs sin fix en npm → migrar al CDN de SheetJS o exceljs.
- Tests: solo App.test.tsx. Priorizar nómina y bulk-import.
- Revisar regla de negocio de `retencion_iva_pct` (hoy SUMA al costo; ¿debería restar?).

Relacionado: [[deep-tech-hr-migration]], [[deep-tech-env-constraints]].
