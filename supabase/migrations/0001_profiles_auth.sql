-- ============================================================================
-- F2 · Auth: sincronización auth.users → profiles, helpers de rol y RLS.
-- Idempotente: se puede re-ejecutar sin error (drop if exists antes de crear).
-- ============================================================================

-- ── updated_at automático ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
--> statement-breakpoint

DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;--> statement-breakpoint
CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
--> statement-breakpoint

DROP TRIGGER IF EXISTS budgets_set_updated_at ON public.budgets;--> statement-breakpoint
CREATE TRIGGER budgets_set_updated_at
  BEFORE UPDATE ON public.budgets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
--> statement-breakpoint

DROP TRIGGER IF EXISTS income_projections_set_updated_at ON public.income_projections;--> statement-breakpoint
CREATE TRIGGER income_projections_set_updated_at
  BEFORE UPDATE ON public.income_projections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
--> statement-breakpoint

DROP TRIGGER IF EXISTS products_set_updated_at ON public.products;--> statement-breakpoint
CREATE TRIGGER products_set_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
--> statement-breakpoint

-- ── auth.users → profiles ───────────────────────────────────────────────────
-- Al crear un usuario en Supabase Auth se inserta su fila espejo en profiles.
-- El rol sale de raw_user_meta_data->>'role' (lo fija el admin al invitar);
-- si no viene, queda 'reclutador' y un admin lo ajusta luego.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''), split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'reclutador')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
--> statement-breakpoint

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;--> statement-breakpoint
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
--> statement-breakpoint

-- ── helpers de rol ──────────────────────────────────────────────────────────
-- SECURITY DEFINER: corren como owner y NO disparan RLS sobre profiles,
-- evitando recursión infinita al usarse dentro de las políticas RLS.
CREATE OR REPLACE FUNCTION public.auth_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.auth_role() = 'admin_rrhh'
$$;
--> statement-breakpoint

-- ── RLS: profiles ───────────────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

-- Cualquier usuario autenticado puede ver perfiles (selects de asignación, etc.)
DROP POLICY IF EXISTS profiles_select_authenticated ON public.profiles;--> statement-breakpoint
CREATE POLICY profiles_select_authenticated
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);
--> statement-breakpoint

-- Cada quien edita su propio perfil; los admin editan cualquiera.
DROP POLICY IF EXISTS profiles_update_own_or_admin ON public.profiles;--> statement-breakpoint
CREATE POLICY profiles_update_own_or_admin
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid() OR public.is_admin())
  WITH CHECK (id = auth.uid() OR public.is_admin());
--> statement-breakpoint

-- Sólo los admin eliminan perfiles.
DROP POLICY IF EXISTS profiles_delete_admin ON public.profiles;--> statement-breakpoint
CREATE POLICY profiles_delete_admin
  ON public.profiles FOR DELETE
  TO authenticated
  USING (public.is_admin());
--> statement-breakpoint

-- Sin política de INSERT: las filas sólo las crea el trigger handle_new_user.

-- Impide que un no-admin se auto-ascienda cambiando su rol.
CREATE OR REPLACE FUNCTION public.profiles_guard_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Sólo un administrador puede cambiar el rol del perfil';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint

DROP TRIGGER IF EXISTS profiles_guard_role ON public.profiles;--> statement-breakpoint
CREATE TRIGGER profiles_guard_role
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_guard_role();
--> statement-breakpoint

-- ── RLS: tablas de módulos (placeholder) ────────────────────────────────────
-- Habilita RLS en todas las tablas de negocio para que NO queden expuestas a
-- 'anon'. La política temporal da acceso total a usuarios autenticados; en F3
-- se reemplaza 'tmp_authenticated_all' por políticas por módulo/rol.
DO $$
DECLARE
  t text;
  module_tables text[] := ARRAY[
    'vacantes','candidatos','entrevistas','documentos','carpetas',
    'colaboradores','contratos','guardias','guardias_config','products',
    'nominas','nomina_registros','budgets','budget_lines',
    'income_projections','income_months','expenses','payment_reminders'
  ];
BEGIN
  FOREACH t IN ARRAY module_tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tmp_authenticated_all ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY tmp_authenticated_all ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      t
    );
  END LOOP;
END $$;
--> statement-breakpoint

-- ── Primer admin ────────────────────────────────────────────────────────────
-- 1) Crear el usuario en el panel de Supabase (Authentication → Add user),
--    marcando "Auto Confirm User".
-- 2) Promoverlo a admin ejecutando (ajusta el correo):
-- UPDATE public.profiles SET role = 'admin_rrhh' WHERE email = 'rhernandez@deepcompany.com';
