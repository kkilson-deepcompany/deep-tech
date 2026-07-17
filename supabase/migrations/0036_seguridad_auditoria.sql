-- ============================================================================
-- 0036 · Backport de seguridad de la auditoría jul-2026 (rama auditoria-fixes).
--
-- La rama auditoria-fixes quedó 47 commits atrás de main. Sus 4 migraciones de
-- seguridad (0022-0025 en esa rama) NO se pueden aplicar tal cual: colisionan
-- de número con migraciones distintas de main y hacían CREATE OR REPLACE sobre
-- funciones que main ya evolucionó. Esta migración RE-APLICA solo las mejoras
-- de seguridad, injertadas sobre las definiciones ACTUALES de main.
--
-- Reconciliado contra el schema actual (main @ SIGF v1.0):
--   • kover_get_by_token: forma de retorno idéntica a 0014 → replace seguro.
--   • public_reservar: main sigue en la firma de 0019 (6 args) → se dropa y se
--     recrea con rate-limit/honeypot (7 args).
--   • products_calc_costo_total: main incluye envio_nacional en VE en el front
--     (domain.ts costoCampos) → el trigger debe sumarlo también en VE.
--   • counters de órdenes: bodies idénticos a 0015/0018 + guard can_ops().
--
-- OMITIDO a propósito (incompatible con main, requiere rediseño):
--   • Dedup de generar_nomina por (periodo,tipo): main añadió nómina semanal
--     (p_semana) y genera varias nóminas con el mismo (periodo,tipo) para
--     semanas distintas; la tabla nominas no guarda la semana. Un índice único
--     (periodo,tipo) romperría la generación semanal. Pendiente: rediseñar la
--     clave de unicidad para el modelo híbrido/semanal.
--
-- Idempotente. Aplicar vía Supabase CLI / Management API.
-- ============================================================================


-- ════════════════════════════════════════════════════════════════════════════
-- A · ENDURECIMIENTO DE STORAGE Y RPCs
-- ════════════════════════════════════════════════════════════════════════════

-- ── A.1 · service-orders: bucket privado (PDFs con PII, path predecible) ─────
update storage.buckets set public = false where id = 'service-orders';

drop policy if exists "service-orders select authenticated" on storage.objects;
create policy "service-orders select authenticated"
  on storage.objects for select to authenticated
  using (bucket_id = 'service-orders');

drop policy if exists "service-orders insert authenticated" on storage.objects;
drop policy if exists "service-orders insert ops" on storage.objects;
create policy "service-orders insert ops"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'service-orders'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin_rrhh','director','ceo','coordinador_ops')
    )
  );

drop policy if exists "service-orders update authenticated" on storage.objects;
drop policy if exists "service-orders update ops" on storage.objects;
create policy "service-orders update ops"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'service-orders'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin_rrhh','director','ceo','coordinador_ops')
    )
  )
  with check (bucket_id = 'service-orders');

drop policy if exists "service-orders delete authenticated" on storage.objects;
drop policy if exists "service-orders delete ops" on storage.objects;
create policy "service-orders delete ops"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'service-orders'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin_rrhh','director','ceo','coordinador_ops')
    )
  );

-- ── A.2a · branding: lectura pública se mantiene; escritura solo RRHH ────────
drop policy if exists "branding insert authenticated" on storage.objects;
drop policy if exists "branding insert hr" on storage.objects;
create policy "branding insert hr"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'branding'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin_rrhh','director','ceo')
    )
  );

drop policy if exists "branding update authenticated" on storage.objects;
drop policy if exists "branding update hr" on storage.objects;
create policy "branding update hr"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'branding'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin_rrhh','director','ceo')
    )
  )
  with check (bucket_id = 'branding');

drop policy if exists "branding delete authenticated" on storage.objects;
drop policy if exists "branding delete hr" on storage.objects;
create policy "branding delete hr"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'branding'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin_rrhh','director','ceo')
    )
  );

-- ── A.2b · product-images: lectura pública se mantiene; escritura solo ops ───
drop policy if exists product_images_insert on storage.objects;
create policy product_images_insert
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'product-images'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin_rrhh','director','ceo','coordinador_ops')
    )
  );

drop policy if exists product_images_update on storage.objects;
create policy product_images_update
  on storage.objects for update to authenticated
  using (
    bucket_id = 'product-images'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin_rrhh','director','ceo','coordinador_ops')
    )
  );

drop policy if exists product_images_delete on storage.objects;
create policy product_images_delete
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'product-images'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin_rrhh','director','ceo','coordinador_ops')
    )
  );

-- ── A.3 · empresa_branding (tabla): escritura solo RRHH; lectura anon intacta ─
drop policy if exists empresa_branding_write_authenticated on public.empresa_branding;
drop policy if exists empresa_branding_write_hr on public.empresa_branding;
create policy empresa_branding_write_hr
  on public.empresa_branding for all to authenticated
  using (public.can_hr()) with check (public.can_hr());

-- ── A.4 · Contadores de órdenes: guard de rol (body idéntico a 0015/0018) ────
create or replace function public.next_service_order_number(p_empresa text)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_prefix text;
  v_seq    bigint;
begin
  if not public.can_ops() then
    raise exception 'No autorizado para generar números de orden';
  end if;

  insert into public.service_order_counters (empresa, prefix)
  values (p_empresa,
          upper(substr(regexp_replace(p_empresa, '[^a-zA-Z]', '', 'g'), 1, 3)))
  on conflict (empresa) do nothing;

  update public.service_order_counters
     set seq = seq + 1
   where empresa = p_empresa
   returning seq, prefix into v_seq, v_prefix;

  return v_prefix || '-' || lpad(v_seq::text, 4, '0');
end;
$$;

create or replace function public.reconcile_service_order_counter(p_empresa text)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_prefix text;
  v_max int := 0;
  v_pattern text;
begin
  if not public.can_ops() then
    raise exception 'No autorizado para reconciliar contadores';
  end if;

  insert into public.service_order_counters (empresa, prefix)
  values (p_empresa,
          upper(substr(regexp_replace(p_empresa, '[^a-zA-Z]', '', 'g'), 1, 3)))
  on conflict (empresa) do nothing;

  select prefix into v_prefix from public.service_order_counters where empresa = p_empresa;
  v_pattern := v_prefix || '-([0-9]+)$';

  select coalesce(max((regexp_match(order_number, v_pattern))[1]::int), 0)
    into v_max
    from public.service_orders
   where empresa = p_empresa
     and order_number ~ v_pattern;

  update public.service_order_counters
     set seq = greatest(seq, v_max)
   where empresa = p_empresa;

  return v_prefix || '-' || lpad(v_max::text, 4, '0');
end;
$$;


-- ════════════════════════════════════════════════════════════════════════════
-- B · INTEGRIDAD DE DATOS
-- ════════════════════════════════════════════════════════════════════════════

-- ── B.1 · support_ticket_add_nota: p_id text (support_tickets.id es TK-...) ──
-- Main declaraba p_id uuid; toda llamada fallaba con "invalid input syntax for
-- type uuid". support_tickets.id es text (ver 0020).
drop function if exists public.support_ticket_add_nota(uuid, text);

create or replace function public.support_ticket_add_nota(p_id text, p_nota text)
returns public.support_tickets
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_row public.support_tickets;
begin
  update public.support_tickets
     set notas_internas = array_append(coalesce(notas_internas, array[]::text[]), p_nota)
   where id = p_id
   returning * into v_row;
  if not found then
    raise exception 'Ticket % no encontrado', p_id;
  end if;
  return v_row;
end $$;

grant execute on function public.support_ticket_add_nota(text, text) to authenticated;

-- ── B.2 · products_calc_costo_total: envio_nacional común a VE y CN ──────────
-- El front (domain.ts costoCampos) incluye envio_nacional también para VE, pero
-- el trigger solo lo sumaba en CN → la BD sobreescribía costo_total con un valor
-- menor al de la UI. Se mueve a los montos comunes.
CREATE OR REPLACE FUNCTION public.products_calc_costo_total()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  base numeric := COALESCE(NEW.costo_base, 0);
  total numeric := 0;
BEGIN
  -- Montos directos comunes (envio_nacional aplica en VE y CN; ver domain.ts).
  total := base
    + COALESCE(NEW.envio_interno, 0)
    + COALESCE(NEW.envio_nacional, 0)
    + COALESCE(NEW.costos_administrativos, 0)
    + (base * COALESCE(NEW.iva_pct, 0) / 100)
    + (base * COALESCE(NEW.retencion_iva_pct, 0) / 100);

  IF NEW.origen = 'CN' THEN
    total := total
      + COALESCE(NEW.envio_aereo, 0)
      + COALESCE(NEW.envio_maritimo, 0)
      + COALESCE(NEW.costos_aduaneros, 0)
      + COALESCE(NEW.costos_desconsolidacion, 0)
      + COALESCE(NEW.impuesto_nacionalizacion, 0)
      + COALESCE(NEW.costo_liberacion, 0)
      + COALESCE(NEW.costo_agente_aduanal, 0)
      + COALESCE(NEW.costos_almacenamiento, 0);
  END IF;

  NEW.costo_total := round(total, 2);
  RETURN NEW;
END;
$$;

-- Recalcular los productos VE existentes con envío nacional (el trigger corre
-- en el UPDATE y corrige el costo_total divergente).
UPDATE public.products
   SET updated_at = now()
 WHERE origen = 'VE' AND COALESCE(envio_nacional, 0) > 0;

-- ── B.3 · CHECKs financieros (NOT VALID: solo validan escrituras nuevas) ─────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'expenses_amount_no_negativo') THEN
    ALTER TABLE public.expenses
      ADD CONSTRAINT expenses_amount_no_negativo CHECK (amount >= 0) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'expenses_tasa_bcv_positiva') THEN
    ALTER TABLE public.expenses
      ADD CONSTRAINT expenses_tasa_bcv_positiva CHECK (tasa_bcv > 0) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'nominas_tasa_bcv_positiva') THEN
    ALTER TABLE public.nominas
      ADD CONSTRAINT nominas_tasa_bcv_positiva CHECK (tasa_bcv > 0) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'nomina_registros_salario_no_negativo') THEN
    ALTER TABLE public.nomina_registros
      ADD CONSTRAINT nomina_registros_salario_no_negativo CHECK (salario_base >= 0) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_costo_base_no_negativo') THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_costo_base_no_negativo CHECK (costo_base >= 0) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'kover_monto_no_negativo') THEN
    ALTER TABLE public.kover_solicitudes
      ADD CONSTRAINT kover_monto_no_negativo
      CHECK (insured_amount_usd IS NULL OR insured_amount_usd >= 0) NOT VALID;
  END IF;
END $$;


-- ════════════════════════════════════════════════════════════════════════════
-- C · KOVER: EXPIRACIÓN DE TOKENS PÚBLICOS (30 días)
-- ════════════════════════════════════════════════════════════════════════════
-- Los tokens vivían para siempre salvo revocación manual. El predicado de
-- vigencia queda centralizado en kover_token_vigente(). Las firmas y la forma
-- de retorno coinciden con 0014 (verificado) → replace seguro.

alter table public.kover_solicitudes
  add column if not exists public_token_expires_at timestamptz;

-- Tokens ya emitidos: ventana completa desde hoy (no invalidarlos retroactivo).
update public.kover_solicitudes
   set public_token_expires_at = now() + interval '30 days'
 where public_token is not null
   and public_token_expires_at is null;

create or replace function public.kover_token_vigente(
  p_revoked boolean,
  p_expires_at timestamptz
)
returns boolean
language sql
stable
as $$
  select coalesce(p_revoked, false) = false
     and (p_expires_at is null or p_expires_at > now())
$$;

grant execute on function public.kover_token_vigente(boolean, timestamptz) to anon, authenticated;

create or replace function public.kover_generate_public_token(p_application_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token uuid;
begin
  if not public.can_hr() then
    raise exception 'No autorizado para generar links públicos de Kover';
  end if;
  v_token := gen_random_uuid();
  update public.kover_solicitudes
     set public_token = v_token,
         public_token_revoked = false,
         public_token_expires_at = now() + interval '30 days'
   where id = p_application_id;
  if not found then
    raise exception 'Solicitud no encontrada';
  end if;
  return v_token;
end;
$$;

create or replace function public.kover_revoke_public_token(p_application_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.can_hr() then
    raise exception 'No autorizado para revocar links públicos de Kover';
  end if;
  update public.kover_solicitudes
     set public_token_revoked = true
   where id = p_application_id;
end;
$$;

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
      and public.kover_token_vigente(ks.public_token_revoked, ks.public_token_expires_at)
      and ks.status in ('draft', 'submitted')
  );
$$;

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
     and public.kover_token_vigente(ks.public_token_revoked, ks.public_token_expires_at);
end;
$$;

create or replace function public.kover_save_by_token(
  p_token uuid,
  p_form_data jsonb,
  p_intent text
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
     and public.kover_token_vigente(ks.public_token_revoked, ks.public_token_expires_at);

  if v_id is null then
    raise exception 'Token inválido, revocado o expirado';
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

-- add_document: exige que el path pertenezca a la carpeta de la solicitud del
-- token (antes aceptaba paths arbitrarios → lectura/borrado cruzado) + expiry.
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
     and public.kover_token_vigente(ks.public_token_revoked, ks.public_token_expires_at)
     and ks.status = 'draft';

  if v_app_id is null then
    raise exception 'Token inválido, revocado, expirado o solicitud ya enviada';
  end if;

  if p_storage_path is null
     or p_storage_path not like (v_app_id::text || '/%')
     or position('..' in p_storage_path) > 0 then
    raise exception 'Ruta de archivo fuera de la solicitud';
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

create or replace function public.kover_delete_document_by_token(
  p_token uuid,
  p_document_id uuid
)
returns text
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
     and public.kover_token_vigente(ks.public_token_revoked, ks.public_token_expires_at)
     and ks.status = 'draft'
     and kd.storage_path like (ks.id::text || '/%');

  if v_path is null then
    raise exception 'Documento no encontrado o token inactivo';
  end if;

  delete from public.kover_documents where id = p_document_id;
  return v_path;
end;
$$;

-- Storage policies del bucket kover-applications: mismo predicado de vigencia.
drop policy if exists "kover-app select anon by token" on storage.objects;
create policy "kover-app select anon by token"
  on storage.objects for select to anon
  using (
    bucket_id = 'kover-applications'
    and exists (
      select 1 from public.kover_solicitudes ks
      where ks.id::text = (storage.foldername(name))[1]
        and ks.public_token is not null
        and public.kover_token_vigente(ks.public_token_revoked, ks.public_token_expires_at)
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
        and public.kover_token_vigente(ks.public_token_revoked, ks.public_token_expires_at)
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
        and public.kover_token_vigente(ks.public_token_revoked, ks.public_token_expires_at)
        and ks.status = 'draft'
    )
  );


-- ════════════════════════════════════════════════════════════════════════════
-- D · public_reservar: RATE-LIMIT + HONEYPOT + ADVISORY LOCK
-- ════════════════════════════════════════════════════════════════════════════
-- public_reservar es callable por anon sin login. Se limita dentro de lo que la
-- BD puede ver: intentos por email (5/h) y por vacante (40/h), bloqueo de doble
-- reserva activa, honeypot, y advisory lock contra doble booking del mismo slot.

create table if not exists public.public_reservar_intentos (
  id bigint generated always as identity primary key,
  email text not null,
  vacante_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists idx_reservar_intentos_email_created
  on public.public_reservar_intentos (email, created_at);

create index if not exists idx_reservar_intentos_vacante_created
  on public.public_reservar_intentos (vacante_id, created_at);

alter table public.public_reservar_intentos enable row level security;
-- Sin policies: solo la función SECURITY DEFINER (dueña) toca la tabla.

create or replace function public.reservar_intentos_purgar()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.public_reservar_intentos where created_at < now() - interval '1 day';
$$;

-- La firma cambia (nuevo p_honeypot) → hay que dropear la firma vieja de 0019.
drop function if exists public.public_reservar(uuid, date, time, text, text, text);

create or replace function public.public_reservar(
  p_vacante_id uuid,
  p_fecha date,
  p_hora time,
  p_nombre text,
  p_apellido text,
  p_email text,
  p_honeypot text default null
)
returns table (entrevista_id uuid, candidato_id uuid)
language plpgsql security definer set search_path = public as $$
declare
  v_candidato_id uuid;
  v_entrevista_id uuid;
  v_fecha_hora timestamptz;
  v_vacante public.vacantes;
  v_dia_es text;
  v_dias text[];
  v_email_norm text;
  v_intentos_email int;
  v_reservas_vacante int;
begin
  -- Honeypot: si viene lleno es un bot. Mensaje genérico, no se loguea el
  -- intento (no gastar el cupo de un email real que un bot reuse).
  if p_honeypot is not null and btrim(p_honeypot) <> '' then
    raise exception 'Horario no disponible';
  end if;

  if p_nombre is null or btrim(p_nombre) = '' then raise exception 'Falta el nombre'; end if;
  if p_apellido is null or btrim(p_apellido) = '' then raise exception 'Falta el apellido'; end if;
  if p_email is null or p_email !~ '^[^@]+@[^@]+\.[^@]+$' then raise exception 'Correo inválido'; end if;

  v_email_norm := lower(btrim(p_email));

  perform public.reservar_intentos_purgar();

  select count(*) into v_intentos_email
    from public.public_reservar_intentos
   where email = v_email_norm and created_at > now() - interval '1 hour';
  if v_intentos_email >= 5 then
    raise exception 'Demasiadas solicitudes con este correo. Intenta de nuevo en una hora.';
  end if;

  select count(*) into v_reservas_vacante
    from public.public_reservar_intentos
   where vacante_id = p_vacante_id and created_at > now() - interval '1 hour';
  if v_reservas_vacante >= 40 then
    raise exception 'Esta vacante recibió demasiadas solicitudes. Intenta de nuevo más tarde.';
  end if;

  -- Registrar el intento pasado el rate-limit pero antes de la validación de
  -- negocio: un payload inválido repetido también consume el cupo.
  insert into public.public_reservar_intentos (email, vacante_id)
  values (v_email_norm, p_vacante_id);

  select * into v_vacante from public.vacantes where id = p_vacante_id and estado = 'Abierta';
  if not found then raise exception 'Vacante no disponible'; end if;

  if v_vacante.fecha_inicio_entrevistas is null or v_vacante.fecha_fin_entrevistas is null then
    raise exception 'La vacante no tiene fechas de entrevistas configuradas';
  end if;
  if p_fecha < v_vacante.fecha_inicio_entrevistas or p_fecha > v_vacante.fecha_fin_entrevistas then
    raise exception 'Fecha fuera del rango configurado';
  end if;

  v_dia_es := case extract(dow from p_fecha)::int
                when 0 then 'domingo'
                when 1 then 'lunes'
                when 2 then 'martes'
                when 3 then 'miercoles'
                when 4 then 'jueves'
                when 5 then 'viernes'
                when 6 then 'sabado'
              end;
  v_dias := coalesce(v_vacante.dias_habilitados, array[]::text[]);
  if not (v_dia_es = any (v_dias)) then
    raise exception 'Día no habilitado para entrevistas';
  end if;

  if v_vacante.hora_inicio is null or v_vacante.hora_fin is null
     or p_hora < v_vacante.hora_inicio
     or (p_hora + interval '20 minutes') > v_vacante.hora_fin then
    raise exception 'Hora fuera del horario configurado';
  end if;

  -- Doble reserva activa: mismo email + misma vacante con entrevista sin resolver.
  if exists (
    select 1
      from public.entrevistas e
      join public.candidatos c on c.id = e.candidato_id
     where e.vacante_id = p_vacante_id
       and c.correo = v_email_norm
       and e.estado_contacto in ('Programado', 'Pendiente por contactar')
  ) then
    raise exception 'Ya tienes una entrevista programada para esta vacante.';
  end if;

  v_fecha_hora := (p_fecha + p_hora) at time zone 'America/Caracas';

  -- Serializar reservas del mismo slot (advisory lock): dos llamadas concurrentes
  -- ya no pasan ambas el chequeo de disponibilidad.
  perform pg_advisory_xact_lock(
    hashtext('public_reservar:' || p_vacante_id::text || ':' || v_fecha_hora::text)
  );

  if exists (
    select 1 from public.entrevistas
    where vacante_id = p_vacante_id and fecha_hora = v_fecha_hora
  ) then
    raise exception 'Horario no disponible';
  end if;

  insert into public.candidatos (nombre, correo, vacante_id, fuente, estado, fecha_postulacion)
  values (
    btrim(p_nombre) || ' ' || btrim(p_apellido),
    v_email_norm,
    p_vacante_id,
    'Web',
    'Pendiente',
    current_date
  )
  returning id into v_candidato_id;

  insert into public.entrevistas (candidato_id, vacante_id, fecha_hora, modalidad, tipo, estado_contacto)
  values (v_candidato_id, p_vacante_id, v_fecha_hora, 'Virtual', '1ra RRHH', 'Programado')
  returning id into v_entrevista_id;

  entrevista_id := v_entrevista_id;
  candidato_id := v_candidato_id;
  return next;
end;
$$;

grant execute on function public.public_reservar(uuid, date, time, text, text, text, text) to anon, authenticated;


notify pgrst, 'reload schema';
