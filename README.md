# deep.tech

Sistema HR — migración a stack moderno (Vite + React + TS + Supabase + Drizzle).

## Stack

- **Web:** Vite + React 19 + TypeScript + Tailwind + shadcn/Radix + react-router + TanStack Query
- **Backend:** Supabase (Auth + MFA, Postgres, Storage, Edge Functions en Deno)
- **DB tooling:** Drizzle ORM + drizzle-kit
- **Tests:** Vitest + Testing Library
- **Package manager:** Bun
- **Deploy:** Vercel (SPA)

## Estructura

```
apps/web              SPA Vite
packages/db           Schema Drizzle + migraciones (fuente de verdad)
packages/shared       Tipos compartidos (Database, zod schemas)
supabase              config, migrations, edge functions
scripts               seeds, utilidades
docs                  PRDs, design guidelines
legacy                código viejo (FastAPI+Mongo, CRA) — se elimina al cerrar F3
```

## Setup

1. Instalar Bun: `powershell -c "irm bun.sh/install.ps1 | iex"` (Windows) o `curl -fsSL https://bun.sh/install | bash` (Unix)
2. Copiar `.env.example` a `.env.local` y rellenar valores de Supabase
3. `bun install`
4. `bun run dev`

## Scripts

- `bun run dev` — levanta web en http://localhost:5173
- `bun run build` — build producción
- `bun run test` — corre Vitest en todos los paquetes
- `bun run lint`
- `bun run db:generate` — genera migración Drizzle a partir del schema
- `bun run db:migrate` — aplica migraciones contra Supabase
- `bun run db:studio` — abre Drizzle Studio

## Fases

- **F0** ✅ Scaffold, limpieza, design tokens
- **F1** Schema Drizzle desde modelo HR
- **F2** Auth + MFA con Supabase
- **F3** Módulos (Dashboard → Candidatos → ... → Inventario)
- **F4** Public forms, bulk import, PDF, Google Calendar (Edge Functions)
- **F5** Eliminar `legacy/`
