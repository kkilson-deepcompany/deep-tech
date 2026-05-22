---
name: deep-tech-env-constraints
description: Límites del entorno de ejecución (Claude Code en WSL/sandbox) para el proyecto deep.tech HR.
metadata:
  type: project
---

Restricciones del entorno donde corre Claude Code para este repo (verificado 2026-05-20).

**Why:** evitar reintentar acciones que el entorno no puede hacer y perder tiempo.

**How to apply:**

- **No hay acceso directo a la base Postgres.** El host `db.faxrcsjgqkdntosdftke.supabase.co` solo publica IPv6 y WSL no tiene salida IPv6; el puerto 5432 está bloqueado para egress (también a los poolers IPv4). ⇒ `drizzle-kit migrate` / `push` / `studio` y cualquier cliente `postgres` directo **fallan**. Usar `drizzle-kit generate` (offline) para producir el SQL.
- **Sí funciona la Management API de Supabase** (`POST https://api.supabase.com/v1/projects/<ref>/database/query`, HTTPS/443) con un **Personal Access Token** — así se aplicaron las migraciones `0000`–`0004`. También funcionan PostgREST/Auth/Storage del proyecto por HTTPS (la app usa eso).
- **`bun install` en `/mnt/c` es defectuoso.** Falla con `EPERM` al hacer fchmod del lockfile y no crea bien los symlinks de `node_modules/.bin`. ⇒ `bun run dev/test/build/lint` fallan por binarios faltantes. Workaround usado: invocar el JS del paquete directo — `bun node_modules/typescript/bin/tsc -b apps/web/tsconfig.json`, `bun node_modules/.bin/eslint apps/web/src`, `bun apps/web/node_modules/vitest/vitest.mjs run`, `bun apps/web/node_modules/vite/bin/vite.js build`. Fix real recomendado: mover el repo a `~/` dentro de WSL (ext4) y reinstalar.
- El filesystem `/mnt/c` además es lento: build ~1m47s, vitest ~74s.

Relacionado: [[deep-tech-hr-migration]], [[user-profile]].
