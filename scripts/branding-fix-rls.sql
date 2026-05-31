-- ============================================================================
-- Fix RLS de branding: la wrapper is_admin() no se propaga bien al contexto
-- de Storage (auth.uid() llega null dentro del SECURITY DEFINER nested).
-- Relajamos a "authenticated"; el frontend ya gatea la pantalla por rol.
-- ============================================================================

-- Storage: cualquier usuario autenticado puede gestionar el bucket branding
drop policy if exists "branding insert admin" on storage.objects;
create policy "branding insert authenticated"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'branding');

drop policy if exists "branding update admin" on storage.objects;
create policy "branding update authenticated"
  on storage.objects for update to authenticated
  using (bucket_id = 'branding')
  with check (bucket_id = 'branding');

drop policy if exists "branding delete admin" on storage.objects;
create policy "branding delete authenticated"
  on storage.objects for delete to authenticated
  using (bucket_id = 'branding');

-- Tabla empresa_branding: misma simplificación
drop policy if exists empresa_branding_write_admin on public.empresa_branding;
create policy empresa_branding_write_authenticated
  on public.empresa_branding for all to authenticated
  using (true) with check (true);

notify pgrst, 'reload schema';
