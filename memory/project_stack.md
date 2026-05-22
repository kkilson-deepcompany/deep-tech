---
name: deep.tech stack decisions
description: Decisiones de stack tomadas explícitamente por el usuario para la migración.
type: project
---

- **Frontend:** Vite (NO Next.js) + React 19 + TypeScript + Tailwind + shadcn/Radix + react-router + TanStack Query.
- **Backend:** Supabase puro — Auth con MFA, Postgres, Storage, Edge Functions en Deno (opción A). Sin servidor propio (no Hono, no FastAPI).
- **DB tooling:** Drizzle ORM + drizzle-kit. Schema en `packages/db/src/schema/`, migraciones en `supabase/migrations/`.
- **Tests:** Vitest + Testing Library.
- **Runtime/PM:** Bun (instalado en `~/.bun/bin/bun` dentro de WSL Ubuntu del usuario).
- **Deploy:** Vercel (SPA, `vercel.json` con rewrites).
- **TS:** strict + noUncheckedIndexedAccess + verbatimModuleSyntax.

**Why:** elecciones del usuario en chat — confirmadas: Opción A, Supabase, refinamiento sutil de estética, partir limpio (no migrar Mongo), Vercel.

**How to apply:** no sugerir Next.js, no sugerir servidor propio adicional. Si se necesita lógica server-side (PDF, email, Google Calendar, bulk import pesado, webhooks) va en Supabase Edge Functions (`supabase/functions/`).

## Credenciales
Vienen del `.env.local` que el usuario rellena (no commitear). Variables:
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (cliente — el "publishable" es el nuevo nombre del anon key).
- `SUPABASE_SERVICE_ROLE_KEY` (server / scripts).
- `DATABASE_URL` (Postgres directo para drizzle-kit).

Proyecto Supabase: `faxrcsjgqkdntosdftke` (creado por el usuario).
