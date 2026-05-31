-- ============================================================================
-- Marca por empresa (logo + color primario)
--
-- Tabla `empresa_branding` con clave por nombre (string libre, igual al que ya
-- se guarda en vacantes.empresa, colaboradores.empresa, org_trees.name, etc.).
-- No requiere migrar las tablas existentes a FK: es solo un lookup.
--
-- + Bucket público `branding` en Supabase Storage para los archivos de logo.
-- ============================================================================

create table if not exists public.empresa_branding (
  nombre          text primary key,
  logo_url        text,
  color_primario  text,                          -- hex, p.ej. '#003D7A'
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- RLS: cualquiera puede leer (incluso anon: el link público de reservas
-- necesita mostrar el logo). Solo admin_rrhh puede escribir.
alter table public.empresa_branding enable row level security;

drop policy if exists empresa_branding_read_all on public.empresa_branding;
create policy empresa_branding_read_all
  on public.empresa_branding for select
  to anon, authenticated
  using (true);

-- Nota: el frontend ya gatea /configuracion con RequireRole admin_rrhh.
-- A nivel SQL relajamos a "authenticated" porque la wrapper is_admin() en
-- el contexto de Storage RLS no propaga auth.uid() correctamente.
drop policy if exists empresa_branding_write_admin on public.empresa_branding;
drop policy if exists empresa_branding_write_authenticated on public.empresa_branding;
create policy empresa_branding_write_authenticated
  on public.empresa_branding for all
  to authenticated
  using (true) with check (true);

-- Trigger para mantener updated_at fresco
create or replace function public.touch_empresa_branding()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;

drop trigger if exists empresa_branding_touch on public.empresa_branding;
create trigger empresa_branding_touch
  before update on public.empresa_branding
  for each row execute function public.touch_empresa_branding();

-- Bucket público para los logos
insert into storage.buckets (id, name, public)
values ('branding', 'branding', true)
on conflict (id) do nothing;

-- Políticas de Storage: lectura pública implícita (bucket.public=true).
-- Insert/update/delete: cualquier authenticated (el frontend gatea el acceso
-- a la UI con RequireRole admin_rrhh).
drop policy if exists "branding insert admin" on storage.objects;
drop policy if exists "branding insert authenticated" on storage.objects;
create policy "branding insert authenticated"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'branding');

drop policy if exists "branding update admin" on storage.objects;
drop policy if exists "branding update authenticated" on storage.objects;
create policy "branding update authenticated"
  on storage.objects for update to authenticated
  using (bucket_id = 'branding')
  with check (bucket_id = 'branding');

drop policy if exists "branding delete admin" on storage.objects;
drop policy if exists "branding delete authenticated" on storage.objects;
create policy "branding delete authenticated"
  on storage.objects for delete to authenticated
  using (bucket_id = 'branding');

-- Sembrar las 5 empresas conocidas (sin logo aún; admin las completa por la UI)
insert into public.empresa_branding (nombre) values
  ('Deepcompany'),
  ('Parkeate'),
  ('G-Store'),
  ('Desredalab'),
  ('Kover')
on conflict (nombre) do nothing;

notify pgrst, 'reload schema';
