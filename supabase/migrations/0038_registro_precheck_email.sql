-- ============================================================================
-- 0038 · Pre-chequeo de email antes de signUp (evita el bug de 0037/incidente
-- del 2026-08-15).
--
-- Descubierto en producción: al reintentar signUp() con un correo que ya
-- tiene fila en `profiles`, Supabase Auth puede BORRAR la cuenta existente en
-- auth.users antes de fallar al crear la nueva (por el conflicto en
-- profiles_email_unique) — dejando a la persona sin login, con su fila de
-- profiles huérfana otra vez. Le pasó a una cuenta real en esta sesión.
--
-- El fix real no puede vivir del lado del cliente leyendo el mensaje de
-- error: Supabase sanitiza CUALQUIER excepción del trigger handle_new_user a
-- un genérico "Database error saving new user", así que nunca hay forma de
-- distinguir "ya existe" de otra causa después del hecho. La solución es no
-- llegar nunca a ese punto: chequear ANTES de llamar a signUp().
--
-- RPC pública (anon): true si el correo ya tiene una fila en profiles.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.email_ya_registrado(p_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE lower(email) = lower(p_email))
$$;

GRANT EXECUTE ON FUNCTION public.email_ya_registrado(text) TO anon, authenticated;

notify pgrst, 'reload schema';
