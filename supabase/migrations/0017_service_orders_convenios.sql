-- ============================================================================
-- Refactor: un convenio es una bolsa de horas compartida entre varios
-- clientes. Antes cada cliente tenía sus propias 70h; ahora los 4 CC
-- (La Granja, Las Trinitarias, Expreso Chacaíto, Expreso Baruta) comparten
-- una sola bolsa de 70h anuales.
-- ============================================================================

create table if not exists public.service_convenios (
  id              uuid primary key default gen_random_uuid(),
  nombre          text not null unique,
  horas_anuales   numeric(6, 2) not null,
  notas           text,
  activo          boolean not null default true,
  created_at      timestamptz not null default now()
);

alter table public.service_convenios enable row level security;
drop policy if exists service_convenios_read on public.service_convenios;
drop policy if exists service_convenios_write on public.service_convenios;
create policy service_convenios_read  on public.service_convenios for select to authenticated using (true);
create policy service_convenios_write on public.service_convenios for all    to authenticated using (true) with check (true);

-- Sembrar el convenio compartido por los 4 CC
insert into public.service_convenios (nombre, horas_anuales, notas) values
  ('Convenio Centros Comerciales (4 CC · 70h/año)',
   70,
   'Bolsa compartida entre CC La Granja, Las Trinitarias, Expreso Chacaíto y Expreso Baruta.')
on conflict (nombre) do nothing;

-- service_clientes: añadir FK al convenio
alter table public.service_clientes
  add column if not exists convenio_id uuid references public.service_convenios(id) on delete set null;

create index if not exists idx_service_clientes_convenio on public.service_clientes(convenio_id);

-- Asignar el convenio a los 4 CC
update public.service_clientes
   set convenio_id = (select id from public.service_convenios where nombre = 'Convenio Centros Comerciales (4 CC · 70h/año)')
 where nombre in ('CC La Granja', 'CC Las Trinitarias', 'CC Expreso Chacaíto', 'CC Expreso Baruta');

-- Antes existía service_cliente_saldos (basado en horas_convenio_anuales).
-- Hay que dropearla ANTES de quitar la columna para que no haya dependencia.
drop view if exists public.service_cliente_saldos;

-- Limpiar el campo viejo (era 70 por cliente; ahora vive en el convenio)
alter table public.service_clientes drop column if exists horas_convenio_anuales;

-- ── Vista de saldos por CONVENIO (no por cliente) ─────────────────────────
-- Para cada convenio agrupa las órdenes cubiertas de TODOS sus clientes
-- en el año en curso.

create or replace view public.service_convenio_saldos as
select
  cv.id,
  cv.nombre,
  cv.horas_anuales,
  coalesce(
    sum(o.horas_servicio) filter (
      where o.cubierta_convenio = true
        and extract(year from o.created_at) = extract(year from now())
    ),
    0
  )::numeric(6, 2) as horas_consumidas_anio,
  (cv.horas_anuales - coalesce(
    sum(o.horas_servicio) filter (
      where o.cubierta_convenio = true
        and extract(year from o.created_at) = extract(year from now())
    ),
    0
  ))::numeric(6, 2) as horas_restantes_anio,
  count(o.id) filter (
    where o.cubierta_convenio = true
      and extract(year from o.created_at) = extract(year from now())
  )::int as ordenes_anio,
  -- Lista de nombres de clientes que pertenecen a este convenio (para mostrar
  -- en la UI sin tener que hacer otra query).
  coalesce(array_agg(distinct c.nombre) filter (where c.id is not null), array[]::text[]) as clientes
from public.service_convenios cv
left join public.service_clientes c on c.convenio_id = cv.id
left join public.service_orders o   on o.cliente_id = c.id
group by cv.id, cv.nombre, cv.horas_anuales;

grant select on public.service_convenio_saldos to authenticated;

notify pgrst, 'reload schema';
