-- ============================================================================
-- Fase 3 de Órdenes de Servicio: catálogos, convenios y cobranza.
--
-- - service_clientes: catálogo de clientes con horas_convenio_anuales opcional.
-- - service_tecnicos: catálogo de técnicos de campo.
-- - alter service_orders: cliente_id FK, tecnico_id FK reapuntado, horas_servicio,
--   referencia_pago, cubierta_convenio.
-- - vista service_cliente_saldos: horas anuales por cliente con convenio.
-- ============================================================================

-- ── Catálogos ─────────────────────────────────────────────────────────────
create table if not exists public.service_clientes (
  id                       uuid primary key default gen_random_uuid(),
  nombre                   text not null unique,
  horas_convenio_anuales   numeric(6, 2),                     -- null = sin convenio
  notas                    text,
  activo                   boolean not null default true,
  created_at               timestamptz not null default now()
);

create table if not exists public.service_tecnicos (
  id           uuid primary key default gen_random_uuid(),
  nombre       text not null unique,
  activo       boolean not null default true,
  created_at   timestamptz not null default now()
);

-- Seed clientes (los 4 con 70h tienen convenio, los demás sin convenio)
insert into public.service_clientes (nombre, horas_convenio_anuales) values
  ('Centro Empresarial Galipán', null),
  ('CC San Ignacio',             null),
  ('CC Tolón',                   null),
  ('CC Paseo El Hatillo',        null),
  ('CC Expreso Chacaíto',        70),
  ('CC Expreso Baruta',          70),
  ('CC La Granja',               70),
  ('CC Las Trinitarias',         70),
  ('Universidad Humboldt',       null),
  ('Maxihogar',                  null)
on conflict (nombre) do nothing;

-- Seed técnicos
insert into public.service_tecnicos (nombre) values
  ('Victor Mendoza'),
  ('Franklin Gonzalez'),
  ('Gabriel Hernandez'),
  ('Jean Paul Hernandez')
on conflict (nombre) do nothing;

-- ── Cambios a service_orders ──────────────────────────────────────────────
-- Reapuntar tecnico_id: antes apuntaba a profiles (técnicos no son usuarios
-- del sistema). Ahora apunta a service_tecnicos. Como ninguna fila lo usaba,
-- es seguro recrear el constraint.
do $$ begin
  alter table public.service_orders drop constraint if exists service_orders_tecnico_id_fkey;
  alter table public.service_orders
    add constraint service_orders_tecnico_id_fkey
    foreign key (tecnico_id) references public.service_tecnicos(id) on delete set null;
end $$;

-- FK de cliente_id (estaba sin FK)
do $$ begin
  alter table public.service_orders drop constraint if exists service_orders_cliente_id_fkey;
  alter table public.service_orders
    add constraint service_orders_cliente_id_fkey
    foreign key (cliente_id) references public.service_clientes(id) on delete set null;
end $$;

-- Nuevas columnas
alter table public.service_orders
  add column if not exists horas_servicio       numeric(5, 2),
  add column if not exists referencia_pago      text,
  add column if not exists cubierta_convenio    boolean not null default false;

create index if not exists idx_service_orders_cliente_id      on public.service_orders(cliente_id);
create index if not exists idx_service_orders_tecnico_id      on public.service_orders(tecnico_id);
create index if not exists idx_service_orders_cubierta        on public.service_orders(cubierta_convenio);
create index if not exists idx_service_orders_pagado          on public.service_orders(pagado);

-- ── RLS (mismas reglas que service_orders) ────────────────────────────────
alter table public.service_clientes enable row level security;
alter table public.service_tecnicos enable row level security;
drop policy if exists service_clientes_read on public.service_clientes;
drop policy if exists service_clientes_write on public.service_clientes;
drop policy if exists service_tecnicos_read on public.service_tecnicos;
drop policy if exists service_tecnicos_write on public.service_tecnicos;
create policy service_clientes_read on public.service_clientes for select to authenticated using (true);
create policy service_clientes_write on public.service_clientes for all to authenticated using (true) with check (true);
create policy service_tecnicos_read on public.service_tecnicos for select to authenticated using (true);
create policy service_tecnicos_write on public.service_tecnicos for all to authenticated using (true) with check (true);

-- ── Vista de saldos por cliente (año en curso) ────────────────────────────
-- Suma horas_servicio de órdenes cubiertas por convenio del cliente este año.
create or replace view public.service_cliente_saldos as
select
  c.id,
  c.nombre,
  c.horas_convenio_anuales,
  coalesce(
    sum(o.horas_servicio) filter (
      where o.cubierta_convenio = true
        and extract(year from o.created_at) = extract(year from now())
    ),
    0
  )::numeric(6, 2) as horas_consumidas_anio,
  case
    when c.horas_convenio_anuales is null then null
    else (
      c.horas_convenio_anuales - coalesce(
        sum(o.horas_servicio) filter (
          where o.cubierta_convenio = true
            and extract(year from o.created_at) = extract(year from now())
        ),
        0
      )
    )::numeric(6, 2)
  end as horas_restantes_anio,
  count(o.id) filter (
    where o.cubierta_convenio = true
      and extract(year from o.created_at) = extract(year from now())
  )::int as ordenes_anio
from public.service_clientes c
left join public.service_orders o on o.cliente_id = c.id
group by c.id, c.nombre, c.horas_convenio_anuales;

-- La vista hereda RLS de las tablas subyacentes; los usuarios authenticated
-- pueden leer ambas, así que la vista es legible.
grant select on public.service_cliente_saldos to authenticated;

notify pgrst, 'reload schema';
