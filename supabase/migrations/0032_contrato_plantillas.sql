-- ============================================================================
-- Contratos · Plantillas no-code
--
-- Permite a RRHH crear/editar plantillas de contrato sin programar. El cuerpo se
-- guarda como jsonb (título, intro, cláusulas, firmas) con tokens {{...}} que el
-- motor `plantilla-pdf.ts` sustituye con datos del contrato/colaborador.
--
-- Se conserva el enum `contrato_plantilla` para las plantillas fieles (built-in);
-- las custom se enlazan vía `contratos.plantilla_id`.
-- ============================================================================

create table if not exists public.contrato_plantillas (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  empresa     text,                                  -- empresa sugerida (opcional)
  idioma      text not null default 'es',
  activo      boolean not null default true,
  cuerpo      jsonb not null default '{}'::jsonb,    -- { titulo_doc, subtitulo, intro, clausulas[], cierre, firma_izquierda, firma_derecha }
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.contratos
  add column if not exists plantilla_id uuid references public.contrato_plantillas(id) on delete set null;

create index if not exists idx_contratos_plantilla_id on public.contratos(plantilla_id);

-- RLS (MVP: authenticated CRUD, igual que el resto de módulos)
alter table public.contrato_plantillas enable row level security;
drop policy if exists contrato_plantillas_read  on public.contrato_plantillas;
drop policy if exists contrato_plantillas_write on public.contrato_plantillas;
create policy contrato_plantillas_read  on public.contrato_plantillas for select to authenticated using (true);
create policy contrato_plantillas_write on public.contrato_plantillas for all    to authenticated using (true) with check (true);

notify pgrst, 'reload schema';
