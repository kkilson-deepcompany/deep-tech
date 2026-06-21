-- ============================================================================
-- Contratos · Archivado en el expediente
--
-- Al generar el PDF de un contrato se sube a un bucket privado y se registra en
-- `expediente_archivos`, una tabla genérica de archivos por persona (colaborador
-- y/o candidato). Es la base del expediente para colaboradores creados a mano,
-- que hoy no tienen fila en `documentos` (esa es por-candidato).
--
-- Bucket privado: requiere URLs firmadas para leer.
-- ============================================================================

create table if not exists public.expediente_archivos (
  id              uuid primary key default gen_random_uuid(),
  colaborador_id  uuid references public.colaboradores(id) on delete cascade,
  candidato_id    uuid references public.candidatos(id)   on delete set null,
  contrato_id     uuid references public.contratos(id)    on delete set null,
  tipo            text not null default 'contrato',       -- contrato | constancia | otro
  nombre          text not null,                          -- nombre del archivo (descarga)
  storage_path    text not null,                          -- ruta dentro del bucket
  mime_type       text not null default 'application/pdf',
  size_bytes      bigint not null default 0 check (size_bytes <= 20 * 1024 * 1024),
  created_at      timestamptz not null default now()
);

create index if not exists idx_expediente_archivos_colab on public.expediente_archivos(colaborador_id);
create index if not exists idx_expediente_archivos_cand  on public.expediente_archivos(candidato_id);
create index if not exists idx_expediente_archivos_contrato on public.expediente_archivos(contrato_id);

-- RLS (MVP: authenticated CRUD, igual que kover_documents)
alter table public.expediente_archivos enable row level security;
drop policy if exists expediente_archivos_read  on public.expediente_archivos;
drop policy if exists expediente_archivos_write on public.expediente_archivos;
create policy expediente_archivos_read  on public.expediente_archivos for select to authenticated using (true);
create policy expediente_archivos_write on public.expediente_archivos for all    to authenticated using (true) with check (true);

-- ── Bucket PRIVADO para los contratos archivados ──────────────────────────
insert into storage.buckets (id, name, public)
values ('contratos', 'contratos', false)
on conflict (id) do nothing;

drop policy if exists "contratos select authenticated" on storage.objects;
create policy "contratos select authenticated"
  on storage.objects for select to authenticated
  using (bucket_id = 'contratos');

drop policy if exists "contratos insert authenticated" on storage.objects;
create policy "contratos insert authenticated"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'contratos');

drop policy if exists "contratos update authenticated" on storage.objects;
create policy "contratos update authenticated"
  on storage.objects for update to authenticated
  using (bucket_id = 'contratos')
  with check (bucket_id = 'contratos');

drop policy if exists "contratos delete authenticated" on storage.objects;
create policy "contratos delete authenticated"
  on storage.objects for delete to authenticated
  using (bucket_id = 'contratos');

notify pgrst, 'reload schema';
