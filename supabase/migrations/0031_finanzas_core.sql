-- ============================================================
-- FINANZAS 2.0 — Core Schema
-- Dimensiones obligatorias: centro_costo_id + proyecto_id
-- en toda transacción para reportes por corte.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Centros de Costo
-- ------------------------------------------------------------
create table centros_costo (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  codigo      text unique,
  descripcion text,
  activo      boolean not null default true,
  created_at  timestamptz not null default now()
);

insert into centros_costo (nombre, codigo) values
  ('Programación',   'PROG'),
  ('Oficina',        'OFIC'),
  ('Legal',          'LEGA'),
  ('Outsourcing',    'OUT'),
  ('Administración', 'ADM'),
  ('Operaciones',    'OPS'),
  ('Campo Nacional', 'CAMP');

alter table centros_costo enable row level security;
create policy "authenticated_read_cc" on centros_costo for select using (auth.role() = 'authenticated');
create policy "authenticated_write_cc" on centros_costo for all using (auth.role() = 'authenticated');

-- ------------------------------------------------------------
-- 2. Proyectos / Líneas de Negocio
-- ------------------------------------------------------------
create table proyectos_negocio (
  id                   uuid primary key default gen_random_uuid(),
  nombre               text not null,
  codigo               text unique,
  centro_costo_id      uuid references centros_costo(id) on delete set null,
  descripcion          text,
  estado               text not null default 'activo', -- activo | pausado | cerrado
  fecha_inicio         date,
  fecha_fin_estimada   date,
  presupuesto_usd      numeric(15,2),
  created_at           timestamptz not null default now()
);

alter table proyectos_negocio enable row level security;
create policy "authenticated_read_pn" on proyectos_negocio for select using (auth.role() = 'authenticated');
create policy "authenticated_write_pn" on proyectos_negocio for all using (auth.role() = 'authenticated');

-- ------------------------------------------------------------
-- 3. Cuentas Financieras (Tesorería)
-- ------------------------------------------------------------
create table cuentas_financieras (
  id             uuid primary key default gen_random_uuid(),
  nombre         text not null,
  tipo           text not null, -- banco | caja_chica | pasarela | cripto
  moneda         text not null default 'USD',
  banco          text,
  numero_cuenta  text,
  saldo_inicial  numeric(15,2) not null default 0,
  activa         boolean not null default true,
  orden          integer default 0,
  created_at     timestamptz not null default now()
);

alter table cuentas_financieras enable row level security;
create policy "authenticated_read_cf" on cuentas_financieras for select using (auth.role() = 'authenticated');
create policy "authenticated_write_cf" on cuentas_financieras for all using (auth.role() = 'authenticated');

-- ------------------------------------------------------------
-- 4. Documentos Financieros (Ciclo AR / AP)
-- ------------------------------------------------------------
create table documentos_financieros (
  id                  uuid primary key default gen_random_uuid(),

  -- Tipo de documento en el ciclo
  tipo                text not null,
  -- Ingresos (AR): proforma | oc_cliente | factura_emitida
  -- Egresos  (AP): requerimiento | oc_interna | factura_proveedor

  numero              text,   -- numeración interna
  estado              text not null default 'borrador',
  -- borrador | aprobado | en_transito | pagado | vencido | anulado

  -- Contraparte
  contraparte_nombre  text not null,
  contraparte_rif     text,

  -- Montos
  moneda              text not null default 'USD',
  subtotal            numeric(15,2) not null default 0,
  impuesto            numeric(15,2) not null default 0,
  total               numeric(15,2) not null default 0,
  tipo_cambio         numeric(10,4) not null default 1,

  -- Dimensiones OBLIGATORIAS
  centro_costo_id     uuid not null references centros_costo(id),
  proyecto_id         uuid references proyectos_negocio(id),

  -- Fechas clave
  fecha_emision       date not null default current_date,
  fecha_vencimiento   date,
  fecha_pago          date,

  -- Trazabilidad: documento que lo originó (ej. oc → factura)
  documento_origen_id uuid references documentos_financieros(id) on delete set null,

  descripcion         text,
  notas               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index idx_doc_fin_tipo        on documentos_financieros(tipo);
create index idx_doc_fin_estado      on documentos_financieros(estado);
create index idx_doc_fin_vencimiento on documentos_financieros(fecha_vencimiento);
create index idx_doc_fin_cc         on documentos_financieros(centro_costo_id);

alter table documentos_financieros enable row level security;
create policy "authenticated_read_df" on documentos_financieros for select using (auth.role() = 'authenticated');
create policy "authenticated_write_df" on documentos_financieros for all using (auth.role() = 'authenticated');

-- ------------------------------------------------------------
-- 5. Movimientos de Tesorería
-- ------------------------------------------------------------
create table movimientos_tesoreria (
  id               uuid primary key default gen_random_uuid(),
  cuenta_id        uuid not null references cuentas_financieras(id),
  tipo             text not null, -- ingreso | egreso
  categoria        text,          -- venta | nomina | proveedor | impuesto | transferencia | otro

  moneda           text not null default 'USD',
  monto            numeric(15,2) not null,
  tipo_cambio      numeric(10,4) not null default 1,

  -- Dimensiones
  centro_costo_id  uuid references centros_costo(id),
  proyecto_id      uuid references proyectos_negocio(id),

  -- Cruzar contra documento para saldar la deuda
  documento_id     uuid references documentos_financieros(id) on delete set null,

  fecha            date not null,
  descripcion      text not null,
  referencia       text,          -- # transferencia, cheque, etc.
  conciliado       boolean not null default false,

  created_at       timestamptz not null default now()
);

create index idx_mov_tes_fecha   on movimientos_tesoreria(fecha);
create index idx_mov_tes_cuenta  on movimientos_tesoreria(cuenta_id);
create index idx_mov_tes_cc      on movimientos_tesoreria(centro_costo_id);

alter table movimientos_tesoreria enable row level security;
create policy "authenticated_read_mt" on movimientos_tesoreria for select using (auth.role() = 'authenticated');
create policy "authenticated_write_mt" on movimientos_tesoreria for all using (auth.role() = 'authenticated');

-- ------------------------------------------------------------
-- 6. Vista: saldo actual por cuenta
-- ------------------------------------------------------------
create or replace view saldo_cuentas as
select
  cf.id,
  cf.nombre,
  cf.tipo,
  cf.moneda,
  cf.banco,
  cf.saldo_inicial,
  coalesce(sum(case when mt.tipo = 'ingreso' then mt.monto else -mt.monto end), 0) as movimientos,
  cf.saldo_inicial + coalesce(sum(case when mt.tipo = 'ingreso' then mt.monto else -mt.monto end), 0) as saldo_actual
from cuentas_financieras cf
left join movimientos_tesoreria mt on mt.cuenta_id = cf.id
where cf.activa = true
group by cf.id, cf.nombre, cf.tipo, cf.moneda, cf.banco, cf.saldo_inicial;
