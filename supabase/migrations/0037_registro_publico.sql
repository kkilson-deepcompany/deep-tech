-- ============================================================================
-- 0037 · Auto-registro público con aprobación de admin_rrhh.
--
-- Hoy solo se crean cuentas por invitación (admin_rrhh → invite-user). Se
-- agrega un segundo camino: cualquiera con correo @deepcompany.com puede
-- registrarse por /registro (supabase.auth.signUp, anon key), pero la cuenta
-- nace en estado 'pendiente' y no tiene ningún acceso hasta que un
-- admin_rrhh la aprueba (elige rol) desde Usuarios.
--
-- Punto de seguridad central: el estado NUNCA se decide por metadata que
-- viaja desde el cliente (raw_user_meta_data). Si se decidiera así, alguien
-- podría llamar a signUp() directo por API con data:{role:'admin_rrhh'} y
-- saltarse la aprobación. En cambio:
--   · TODA fila nueva de profiles nace con status='pendiente', sin excepción.
--   · Solo la edge function invite-user (que corre con service_role, tras
--     validar que quien llama ya es admin_rrhh) puede promoverla a 'activo',
--     con un UPDATE explícito después de crear el usuario invitado.
--   · Los helpers can_recruit/can_hr/can_finance/can_ops/is_admin exigen
--     además is_active(): un pendiente no puede escribir en ningún módulo
--     aunque su `role` en la fila ya diga admin_rrhh.
--
-- Restricción de dominio: se aplica en el trigger (no solo en el cliente)
-- para que no se pueda evadir llamando a la API directo con otro correo.
--
-- Idempotente. Aplicar vía Management API.
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE public.user_status AS ENUM ('pendiente', 'activo');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status public.user_status NOT NULL DEFAULT 'activo';

-- ── handle_new_user: dominio restringido + siempre nace pendiente ──────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email !~* '@deepcompany\.com$' THEN
    RAISE EXCEPTION 'Solo se permiten cuentas con correo @deepcompany.com';
  END IF;

  INSERT INTO public.profiles (id, email, name, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''), split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'reclutador'),
    'pendiente'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- ── is_active: única fuente de verdad para "cuenta aprobada" ────────────────
CREATE OR REPLACE FUNCTION public.is_active() RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'activo'
  )
$$;

-- ── Helpers de rol: ahora exigen además is_active() ─────────────────────────
CREATE OR REPLACE FUNCTION public.can_recruit() RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.auth_role() IN ('admin_rrhh','director','ceo','reclutador') AND public.is_active()
$$;
CREATE OR REPLACE FUNCTION public.can_hr() RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.auth_role() IN ('admin_rrhh','director','ceo') AND public.is_active()
$$;
CREATE OR REPLACE FUNCTION public.can_finance() RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.auth_role() IN ('admin_rrhh','director','ceo','cfo') AND public.is_active()
$$;
CREATE OR REPLACE FUNCTION public.can_ops() RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.auth_role() IN ('admin_rrhh','director','ceo','coordinador_ops') AND public.is_active()
$$;
CREATE OR REPLACE FUNCTION public.is_auditor() RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.auth_role() = 'auditor' AND public.is_active()
$$;
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.auth_role() = 'admin_rrhh' AND public.is_active()
$$;

notify pgrst, 'reload schema';
