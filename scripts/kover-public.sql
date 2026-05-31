-- ============================================================================
-- Kover · Link público para que el colaborador llene su propio cuestionario.
--
--  • Se añade `public_token` (uuid) y `public_token_revoked` a la solicitud.
--  • RPCs SECURITY DEFINER expuestas al rol `anon` para leer/guardar el form
--    y registrar documentos sin abrir las tablas a anon directamente.
--  • Storage policies que permiten subir / leer / borrar archivos bajo el
--    prefijo `{application_id}/...` SI esa solicitud tiene token activo.
--
-- Flujo: admin genera token → comparte link `/kover/:token` → el colaborador
-- llena, sube documentos y envía. Una vez `submitted`, el link queda inerte.
-- ============================================================================

alter table public.kover_solicitudes
  add column if not exists public_token uuid,
  add column if not exists public_token_revoked boolean not null default false;

create unique index if not exists idx_kover_solicitudes_token
  on public.kover_solicitudes(public_token)
  where public_token is not null;

-- ── Helper: ¿el token está activo y se puede aceptar input público? ─────────
create or replace function public.kover_token_is_active(p_token uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.kover_solicitudes ks
    where ks.public_token = p_token
      and coalesce(ks.public_token_revoked, false) = false
      and ks.status in ('draft', 'submitted')
  );
$$;

-- ── RPC: generar token (admin) ──────────────────────────────────────────────
create or replace function public.kover_generate_public_token(p_application_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token uuid;
begin
  v_token := gen_random_uuid();
  update public.kover_solicitudes
     set public_token = v_token,
         public_token_revoked = false
   where id = p_application_id;
  if not found then
    raise exception 'Solicitud no encontrada';
  end if;
  return v_token;
end;
$$;

-- ── RPC: revocar token (admin) ──────────────────────────────────────────────
create or replace function public.kover_revoke_public_token(p_application_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.kover_solicitudes
     set public_token_revoked = true
   where id = p_application_id;
$$;

-- ── RPC: leer solicitud por token (anon) ────────────────────────────────────
-- Devuelve la fila pero solo los campos que el colaborador necesita.
create or replace function public.kover_get_by_token(p_token uuid)
returns table (
  id uuid,
  application_date date,
  insurer text,
  insured_amount_usd numeric,
  payment_frequency text,
  applicant_full_name text,
  applicant_id_doc text,
  form_data jsonb,
  status text,
  submitted_at timestamptz,
  is_locked boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select ks.id,
         ks.application_date,
         ks.insurer,
         ks.insured_amount_usd,
         ks.payment_frequency,
         ks.applicant_full_name,
         ks.applicant_id_doc,
         ks.form_data,
         ks.status::text,
         ks.submitted_at,
         (ks.status <> 'draft' or coalesce(ks.public_token_revoked, false)) as is_locked
    from public.kover_solicitudes ks
   where ks.public_token = p_token
     and coalesce(ks.public_token_revoked, false) = false;
end;
$$;

-- ── RPC: guardar / enviar solicitud por token (anon) ────────────────────────
create or replace function public.kover_save_by_token(
  p_token uuid,
  p_form_data jsonb,
  p_intent text  -- 'draft' | 'final'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_status text;
  v_full_name text;
  v_id_doc text;
begin
  if p_intent not in ('draft', 'final') then
    raise exception 'intent inválido: %', p_intent;
  end if;

  select ks.id, ks.status::text
    into v_id, v_status
    from public.kover_solicitudes ks
   where ks.public_token = p_token
     and coalesce(ks.public_token_revoked, false) = false;

  if v_id is null then
    raise exception 'Token inválido o revocado';
  end if;
  if v_status <> 'draft' then
    raise exception 'La solicitud ya fue enviada y no acepta cambios';
  end if;

  v_full_name := trim(both ' ' from
    coalesce(p_form_data->>'first_name','') || ' ' ||
    coalesce(p_form_data->>'last_name',''));
  v_id_doc := p_form_data->>'id_document';

  update public.kover_solicitudes
     set form_data = p_form_data,
         applicant_full_name = nullif(v_full_name, ''),
         applicant_id_doc = nullif(v_id_doc, ''),
         insurer = nullif(p_form_data->>'insurer', ''),
         insured_amount_usd = nullif(p_form_data->>'insured_amount_usd', '')::numeric,
         payment_frequency = nullif(p_form_data->>'payment_frequency', ''),
         application_date = nullif(p_form_data->>'application_date', '')::date,
         status = case when p_intent = 'final' then 'submitted'::text else 'draft'::text end,
         submitted_at = case when p_intent = 'final' then now() else submitted_at end,
         updated_at = now()
   where id = v_id;

  return v_id;
end;
$$;

-- ── RPC: documentos por token (anon) ────────────────────────────────────────
create or replace function public.kover_documents_by_token(p_token uuid)
returns setof public.kover_documents
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.kover_token_is_active(p_token) then
    raise exception 'Token inválido';
  end if;
  return query
    select kd.* from public.kover_documents kd
    join public.kover_solicitudes ks on ks.id = kd.application_id
    where ks.public_token = p_token
    order by kd.uploaded_at desc;
end;
$$;

-- ── RPC: registrar documento por token (anon) ───────────────────────────────
create or replace function public.kover_add_document_by_token(
  p_token uuid,
  p_doc_type text,
  p_related_question_code text,
  p_storage_path text,
  p_file_name text,
  p_mime_type text,
  p_size_bytes bigint,
  p_sha256_hash text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_app_id uuid;
  v_new_id uuid;
begin
  select ks.id into v_app_id
    from public.kover_solicitudes ks
   where ks.public_token = p_token
     and coalesce(ks.public_token_revoked, false) = false
     and ks.status = 'draft';

  if v_app_id is null then
    raise exception 'Token inválido, revocado o solicitud ya enviada';
  end if;

  insert into public.kover_documents (
    application_id, doc_type, related_question_code,
    storage_path, file_name, mime_type, size_bytes, sha256_hash
  ) values (
    v_app_id, p_doc_type, p_related_question_code,
    p_storage_path, p_file_name, p_mime_type, p_size_bytes, p_sha256_hash
  ) returning id into v_new_id;

  return v_new_id;
end;
$$;

-- ── RPC: borrar documento por token (anon) ──────────────────────────────────
create or replace function public.kover_delete_document_by_token(
  p_token uuid,
  p_document_id uuid
)
returns text  -- devuelve el storage_path para que el cliente borre el blob
language plpgsql
security definer
set search_path = public
as $$
declare
  v_path text;
begin
  select kd.storage_path into v_path
    from public.kover_documents kd
    join public.kover_solicitudes ks on ks.id = kd.application_id
   where kd.id = p_document_id
     and ks.public_token = p_token
     and coalesce(ks.public_token_revoked, false) = false
     and ks.status = 'draft';

  if v_path is null then
    raise exception 'Documento no encontrado o token inactivo';
  end if;

  delete from public.kover_documents where id = p_document_id;
  return v_path;
end;
$$;

-- ── Permitir ejecutar las RPC desde anon (no necesita login) ───────────────
grant execute on function public.kover_get_by_token(uuid)         to anon, authenticated;
grant execute on function public.kover_save_by_token(uuid, jsonb, text) to anon, authenticated;
grant execute on function public.kover_documents_by_token(uuid)   to anon, authenticated;
grant execute on function public.kover_add_document_by_token(uuid, text, text, text, text, text, bigint, text) to anon, authenticated;
grant execute on function public.kover_delete_document_by_token(uuid, uuid) to anon, authenticated;
grant execute on function public.kover_token_is_active(uuid)      to anon, authenticated;

-- Sólo admin usa estas dos
grant execute on function public.kover_generate_public_token(uuid) to authenticated;
grant execute on function public.kover_revoke_public_token(uuid)   to authenticated;

-- ============================================================================
-- Storage policies para `anon` en el bucket privado.
--
-- Idea: dejamos pasar `anon` cuando el primer segmento del path es un
-- application_id que tiene `public_token` activo (no revocado, status='draft').
-- El conocimiento del application_id requiere haber resuelto el token vía
-- `kover_get_by_token`, así que el token sigue siendo la credencial real.
-- ============================================================================

drop policy if exists "kover-app select anon by token" on storage.objects;
create policy "kover-app select anon by token"
  on storage.objects for select to anon
  using (
    bucket_id = 'kover-applications'
    and exists (
      select 1 from public.kover_solicitudes ks
      where ks.id::text = (storage.foldername(name))[1]
        and ks.public_token is not null
        and coalesce(ks.public_token_revoked, false) = false
    )
  );

drop policy if exists "kover-app insert anon by token" on storage.objects;
create policy "kover-app insert anon by token"
  on storage.objects for insert to anon
  with check (
    bucket_id = 'kover-applications'
    and exists (
      select 1 from public.kover_solicitudes ks
      where ks.id::text = (storage.foldername(name))[1]
        and ks.public_token is not null
        and coalesce(ks.public_token_revoked, false) = false
        and ks.status = 'draft'
    )
  );

drop policy if exists "kover-app delete anon by token" on storage.objects;
create policy "kover-app delete anon by token"
  on storage.objects for delete to anon
  using (
    bucket_id = 'kover-applications'
    and exists (
      select 1 from public.kover_solicitudes ks
      where ks.id::text = (storage.foldername(name))[1]
        and ks.public_token is not null
        and coalesce(ks.public_token_revoked, false) = false
        and ks.status = 'draft'
    )
  );

notify pgrst, 'reload schema';
