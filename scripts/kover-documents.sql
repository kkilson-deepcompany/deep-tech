-- ============================================================================
-- Kover · Documentos adjuntos
--
-- Cada solicitud puede tener N archivos:
--  - Identidad: cédula (obligatorio), pasaporte, RIF
--  - Médicos: informe / examen / receta, asociados a una pregunta afirmativa
--  - Firma: imagen escaneada (opcional)
--
-- Bucket privado: requiere URLs firmadas para leer (no se expone público).
-- ============================================================================

create table if not exists public.kover_documents (
  id                     uuid primary key default gen_random_uuid(),
  application_id         uuid not null
                          references public.kover_solicitudes(id) on delete cascade,
  doc_type               text not null
                          check (doc_type in (
                            'cedula', 'pasaporte', 'rif',
                            'informe_medico', 'examen', 'receta', 'firma', 'otro'
                          )),
  /** Para informe/examen/receta, código de la pregunta (gh_*, sp_*) a la que pertenece. */
  related_question_code  text,
  storage_path           text not null,            -- ruta dentro del bucket
  file_name              text not null,            -- nombre original
  mime_type              text not null,
  size_bytes             bigint not null check (size_bytes <= 20 * 1024 * 1024),
  sha256_hash            text not null,            -- integridad
  uploaded_at            timestamptz not null default now()
);

create index if not exists idx_kover_documents_app on public.kover_documents(application_id);
create index if not exists idx_kover_documents_type on public.kover_documents(application_id, doc_type);
create index if not exists idx_kover_documents_question on public.kover_documents(application_id, related_question_code);

-- RLS (MVP: authenticated CRUD)
alter table public.kover_documents enable row level security;
drop policy if exists kover_documents_read  on public.kover_documents;
drop policy if exists kover_documents_write on public.kover_documents;
create policy kover_documents_read  on public.kover_documents for select to authenticated using (true);
create policy kover_documents_write on public.kover_documents for all    to authenticated using (true) with check (true);

-- ── Bucket PRIVADO para los archivos ──────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('kover-applications', 'kover-applications', false)
on conflict (id) do nothing;

drop policy if exists "kover-app select authenticated" on storage.objects;
create policy "kover-app select authenticated"
  on storage.objects for select to authenticated
  using (bucket_id = 'kover-applications');

drop policy if exists "kover-app insert authenticated" on storage.objects;
create policy "kover-app insert authenticated"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'kover-applications');

drop policy if exists "kover-app update authenticated" on storage.objects;
create policy "kover-app update authenticated"
  on storage.objects for update to authenticated
  using (bucket_id = 'kover-applications')
  with check (bucket_id = 'kover-applications');

drop policy if exists "kover-app delete authenticated" on storage.objects;
create policy "kover-app delete authenticated"
  on storage.objects for delete to authenticated
  using (bucket_id = 'kover-applications');

notify pgrst, 'reload schema';
