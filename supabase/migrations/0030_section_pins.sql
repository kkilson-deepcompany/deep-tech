-- Tabla para almacenar los PINs de sección (hasheados con SHA-256 via pgcrypto)
create extension if not exists pgcrypto;

create table section_pins (
  section    text primary key,
  pin_hash   text not null,
  updated_at timestamptz not null default now()
);

-- PINs iniciales: rrhh=1111, operaciones=2222, administracion=3333, finanzas=4444
-- Cámbialos desde Configuración en cuanto el sistema esté en producción.
insert into section_pins (section, pin_hash) values
  ('rrhh',          encode(digest('1111', 'sha256'), 'hex')),
  ('operaciones',   encode(digest('2222', 'sha256'), 'hex')),
  ('administracion',encode(digest('3333', 'sha256'), 'hex')),
  ('finanzas',      encode(digest('4444', 'sha256'), 'hex'));

-- Nadie puede leer ni escribir la tabla directamente
alter table section_pins enable row level security;

create policy "solo_admin_gestiona_pins" on section_pins
  for all
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'admin_rrhh'
    )
  );

-- -----------------------------------------------------------------------
-- check_section_pin(section, pin) → boolean
-- El cliente llama esto en lugar de leer la tabla. Security definer
-- bypasa RLS para que cualquier usuario autenticado pueda verificar.
-- -----------------------------------------------------------------------
create or replace function check_section_pin(p_section text, p_pin text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from section_pins
    where section  = p_section
      and pin_hash = encode(digest(p_pin, 'sha256'), 'hex')
  );
$$;

-- -----------------------------------------------------------------------
-- update_section_pin(section, new_pin) → void
-- Solo ejecutable por admin_rrhh (validado dentro de la función).
-- -----------------------------------------------------------------------
create or replace function update_section_pin(p_section text, p_new_pin text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from profiles where id = auth.uid() and role = 'admin_rrhh'
  ) then
    raise exception 'No autorizado';
  end if;

  update section_pins
  set pin_hash   = encode(digest(p_new_pin, 'sha256'), 'hex'),
      updated_at = now()
  where section = p_section;
end;
$$;
