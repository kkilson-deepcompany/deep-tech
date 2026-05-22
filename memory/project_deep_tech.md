---
name: deep.tech HR migration
description: Migración del sistema HR de stack legacy (CRA+FastAPI+Mongo) a moderno (Vite+React+TS+Supabase+Drizzle). Progreso por fases.
type: project
---

Sistema HR completo con módulos: Dashboard, Candidatos (kanban), Vacantes, Entrevistas, Colaboradores, Contratos, Documentos/Carpetas, Organigrama, Finanzas, Nómina, Guardias, Inventario/Productos, Formularios públicos, Auth + MFA, Bulk import Excel.

**Why:** modernizar stack y eliminar dependencias de Emergent/Antigravity. Mantener estética Swiss High Contrast (Azul #003D7A + Verde #00C853) con refinamientos sutiles (dark mode, mejor tipografía, micro-interacciones).

**How to apply:** trabajar por fases sin romper lo viejo (queda en `legacy/` hasta F5).

## Estado
- **F0 ✅** Scaffold monorepo (apps/web, packages/db, packages/shared, supabase, docs, legacy). Vite+React 19+TS+Tailwind+shadcn+Vitest+TanStack Query+react-router. Design tokens portados a CSS vars en `apps/web/src/index.css`. Vercel + bun workspaces.
- **F1 ✅** Schema Drizzle completo + migración generada: `supabase/migrations/0000_married_miek.sql` (19 tablas, enums, FKs, índices). `bun install` corrido.
- **F2 ✅** Auth + MFA TOTP completo en `apps/web/src`: `AuthProvider`/`useAuth` (`lib/auth/`), login en 2 pasos + enroll TOTP, `WelcomePage` (invitado define contraseña), `RequireAuth`/`RequireRole`, primitivos shadcn. Migración `0001_profiles_auth.sql` = trigger `auth.users→profiles` + helpers `auth_role()`/`is_admin()` + RLS. Edge Function `supabase/functions/invite-user` (invitación solo-admin, `verify_jwt=false`, valida rol adentro).
- **F3 ✅** Módulos UI. Dashboard, Usuarios, **Vacantes** (CRUD cards), **Candidatos** (kanban drag&drop nativo, 10 etapas, optimista + CRUD), **Colaboradores** (tabla + CRUD, deducciones aplicables), **Contratos** (tabla + CRUD), **Documentos** (expedientes + carpetas), **Finanzas completo**: Gastos y Recordatorios de pago (tabla + CRUD; `lead_days` como lista de enteros), **Presupuestos** (lista + detalle en `/presupuestos/:id` con distribución mensual y partidas `budget_lines` editando los 12 meses por diálogo) y **Proyección de ingresos** (lista + detalle en `/ingresos/:id` con grilla editable de 12 meses proyección/realidad, guardado por `upsert` sobre `income_months`). **Nómina**: lista + detalle en `/nominas/:id` (KPIs, registros, finalizar/reabrir, eliminar) + desglose por colaborador. SQL: triggers `0002_contrato_colaborador.sql`, `0003_documento_expediente.sql` y la función `0004_nomina_engine.sql` (`generar_nomina(periodo,tipo,tasa)` → crea la nómina y calcula un registro por colaborador activo desde sus `aplica_*` y `*_pct`; se llama por `supabase.rpc`). **Guardias**: roster de servicios (tabla + CRUD; actores por checkboxes, tipo_servicio con datalist) + diálogo de configuración (`guardias_config`: listas editables de tipos de servicio y actores). `AppLayout` con sidebar agrupado por secciones (Reclutamiento/Equipo/Finanzas/Operaciones/Administración). **Inventario** (catálogo de productos: tabla con alerta de stock bajo + diálogo con costos/proveedor/etiquetas y costo total calculado). Primitivos: dialog, select, textarea, badge (+`destructive`), skeleton; helpers `form-field`, `lib/domain.ts`, `lib/queries.ts`. Cliente Supabase sin genérico de tipos (`as` por módulo). 5 migraciones SQL (`0000`–`0004`). Reemplazar `tmp_authenticated_all` por RLS por módulo/rol.

**Migraciones `0000`–`0007` aplicadas** (vía Management API con PAT). **Admin creado:** `rhernandez@deepcompany.com` / rol `admin_rrhh` (vía Auth admin API con service_role). App probada y funcionando. **Pendiente del usuario:** `supabase functions deploy invite-user`; en el dashboard de Supabase apagar el signup público y agregar las redirect URLs (`/welcome`).
- **F4 🟡 en progreso** ✅ Formulario público del candidato: ruta pública `/formulario/:token`, RPCs `form_get`/`form_submit` (`SECURITY DEFINER`, granted a `anon`) en migración `0005`, botón "copiar enlace" en el diálogo de Candidatos (genera `form_token` con `crypto.randomUUID()`). ✅ Carga masiva genérica (Candidatos, Colaboradores, Inventario): `lib/bulk-import.ts` genera una plantilla `.xlsx` descargable y parsea/valida los archivos; `lib/import-specs.ts` define las columnas por entidad; `BulkImportDialog` reutilizable (botón "Carga masiva" en las 3 páginas). `xlsx` (SheetJS) en chunk diferido vía `import()` dinámico. Insert para candidatos; upsert para colaboradores (`correo`) y productos (`sku`). Una celda obligatoria vacía NO rechaza la fila: se rellena con placeholder (`Por completar`; `PENDIENTE-xxxx` para columnas UNIQUE; `1900-01-01` para fechas) para completarla manualmente después; solo los valores inválidos (enum/número/fecha mal escritos) generan error de fila. ✅ PDF de contratos: `jspdf` en chunk diferido (vía `import()` dinámico en `lib/contrato-pdf.ts`), botón "Descargar PDF" en el diálogo de Contratos. ✅ Inventario rediseñado (migración `0006`): desglose de costos **por origen** — VE (costo base, IVA, retención de IVA, envío nacional) y CN con modo de envío Aéreo o Marítimo, cada uno con sus costos de importación; `costoCampos()`/`calcularCostoTotal()` + `COSTOS_GENERALES` (envío interno, costos administrativos, mostrados siempre) en `domain.ts`; el diálogo de producto muestra solo el desglose del origen seleccionado y calcula el total en vivo. Subida de **imágenes de producto** a Supabase Storage (bucket público `product-images` + políticas, columna `image_url`); miniatura en la tabla de Inventario. ✅ Guardias con calendario mensual (migración `0007`): `guardias` ganó `hora_inicio`/`hora_fin`/`ubicacion`; componente `GuardiasCalendar` (grilla mensual con date-fns, fin de semana resaltado, servicios coloreados por tipo vía `colorTipoServicio`, panel de detalle del día con los bloques horarios) + pestañas Calendario/Lista en la página. Pendiente solo: Google Calendar (necesita `GOOGLE_CLIENT_ID`/`SECRET` del usuario — bloqueado hasta tener esas credenciales).
- **F5 ✅** `legacy/` eliminada (backend FastAPI + frontend CRA, ~155 archivos). Las 11 subidas reales (CVs y documentos de identidad) se conservaron en `docs/legacy-uploads/`. Quitada la referencia muerta `legacy/**` del `eslint.config.js`. También se eliminó `.emergent/` (directorio vacío residual de la plataforma Emergent).

## Decisiones clave
- Postgres `gen_random_uuid()` para PKs (no IDs prefijados estilo Mongo).
- `numeric(12,2)` o `(14,2)` para dinero; `numeric(5,2)` para porcentajes; `numeric(14,6)` para tasa BCV.
- Enums Postgres (no text+check) para todos los Literal[] del legacy.
- Tabla `profiles` espejo de `auth.users` con FK lógica (trigger SQL la mantiene).
- Stock de proveedor inline en `products` (4 columnas) en vez de tabla separada — si crece, refactorizar.
- `nominas` + `nomina_registros` separadas (era List embebida en Mongo).
- `income_projections` + `income_months` separadas (12 meses como filas).

## Decisiones F3
- Cliente Supabase **sin genérico `<Database>`** (el placeholder daba tipos inservibles): cada módulo define sus interfaces en `lib/domain.ts` y castea (`as Vacante[]`). Regenerar `database.types.ts` daría tipos reales.
- Formularios con **react-hook-form** + validación nativa (sin zod, aunque las deps están). Numéricos/fechas viajan como string; `nullifyEmpty()` convierte `''→null`.
- Kanban con **drag&drop nativo HTML5** (sin @dnd-kit) por el entorno frágil de instalación.
- `numeric` de Postgres llega como **string** vía PostgREST — los tipos de dominio lo reflejan.

## Decisiones F2 (confirmadas por el usuario)
- **MFA = TOTP** (app autenticadora), MFA nativo de Supabase. Obligatorio: sin factor verificado el usuario va a `/mfa-setup`.
- **Registro = solo admin** (invitación). No hay signup público. Pendiente Edge Function de invitación (necesita service_role).
- El usuario pidió aplicar el schema ya, pero el entorno no puede; lo aplica él por SQL Editor.

## Cosas que NO hicimos aún
- Aplicar `0000` + `0001` a la base y desplegar la Edge Function (lo hace el usuario).
- RLS por módulo/rol (F3 reemplaza la policy temporal `tmp_authenticated_all`).
- Regenerar `packages/shared/src/database.types.ts` (sigue placeholder; el cliente Supabase usa cast).
- Storage de Supabase: bucket `product-images` ya creado (imágenes de producto). Faltan buckets para CVs, documentos y comprobantes.
- Organigrama tree — modelo no portado todavía (decidir si árbol con `parent_id` self-reference o tabla `org_nodes` con coords).
- Migración de datos de Mongo — descartado, partimos limpios.
