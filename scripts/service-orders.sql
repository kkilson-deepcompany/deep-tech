-- ============================================================================
-- Órdenes de servicio (Parkeate-OS)
--
-- Tabla `service_orders` + numeración por empresa (PKT-0001, KOV-0001, ...)
-- + bucket de Storage para los PDFs generados.
-- ============================================================================

create table if not exists public.service_orders (
  id               uuid primary key default gen_random_uuid(),
  order_number     text unique,                       -- asignado al guardar
  empresa          text not null default 'Parkeate',

  -- Todo el formulario (75+ campos) como JSON; no vale la pena columnas planas
  form_data        jsonb not null default '{}'::jsonb,

  -- Firmas como data-URLs (base64 PNG)
  tech_signature   text,
  client_signature text,

  -- PDF final en Supabase Storage
  pdf_url          text,

  -- Workflow
  status           text not null default 'draft',     -- draft | completed

  -- Costos y cobranza (Fase 3, columnas listas)
  precio_base      numeric(12, 2),
  descuento        numeric(12, 2),
  total            numeric(12, 2),
  pagado           boolean not null default false,
  monto_pagado     numeric(12, 2),
  fecha_pago       date,
  convenio_id      uuid,                              -- FK a convenios (futuro)

  -- Vínculos opcionales
  cliente_id       uuid,                              -- FK a clientes (futuro)
  tecnico_id       uuid references public.profiles(id) on delete set null,
  tecnico_nombre   text,                              -- snapshot por si profile cambia

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_service_orders_status       on public.service_orders(status);
create index if not exists idx_service_orders_empresa      on public.service_orders(empresa);
create index if not exists idx_service_orders_created_at   on public.service_orders(created_at desc);
create index if not exists idx_service_orders_order_number on public.service_orders(order_number);

-- updated_at automático
create or replace function public.touch_service_orders()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;
drop trigger if exists service_orders_touch on public.service_orders;
create trigger service_orders_touch
  before update on public.service_orders
  for each row execute function public.touch_service_orders();

-- ── Numeración por empresa: PKT-0001 (Parkeate), KOV-0001 (Kover), etc. ─────
create table if not exists public.service_order_counters (
  empresa text primary key,
  seq     bigint not null default 0,
  prefix  text not null
);

insert into public.service_order_counters (empresa, seq, prefix) values
  ('Parkeate',    0, 'PKT'),
  ('Deepcompany', 0, 'DPC'),
  ('Desredalab',  0, 'DSR'),
  ('G-Store',     0, 'GST'),
  ('Kover',       0, 'KOV'),
  ('Fyrespot',    0, 'FYR')
on conflict (empresa) do nothing;

create or replace function public.next_service_order_number(p_empresa text)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_prefix text;
  v_seq    bigint;
begin
  -- Si la empresa no tiene contador, lo creamos con un prefijo de 3 letras
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
grant execute on function public.next_service_order_number(text) to authenticated;

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.service_orders enable row level security;
drop policy if exists service_orders_read  on public.service_orders;
drop policy if exists service_orders_write on public.service_orders;
create policy service_orders_read  on public.service_orders for select to authenticated using (true);
create policy service_orders_write on public.service_orders for all    to authenticated using (true) with check (true);

-- ── Bucket de Storage para los PDFs ─────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('service-orders', 'service-orders', true)
on conflict (id) do nothing;

drop policy if exists "service-orders insert authenticated" on storage.objects;
create policy "service-orders insert authenticated"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'service-orders');

drop policy if exists "service-orders update authenticated" on storage.objects;
create policy "service-orders update authenticated"
  on storage.objects for update to authenticated
  using (bucket_id = 'service-orders') with check (bucket_id = 'service-orders');

drop policy if exists "service-orders delete authenticated" on storage.objects;
create policy "service-orders delete authenticated"
  on storage.objects for delete to authenticated
  using (bucket_id = 'service-orders');

notify pgrst, 'reload schema';
