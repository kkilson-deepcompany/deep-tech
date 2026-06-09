-- ============================================================================
-- 0021 · Reaplica el RLS por rol a las tablas de los módulos que antes vivían
-- en scripts/ (organigrama, kover, service-*, support_tickets) y que se crean
-- en 0009–0020. En 0008 estas tablas todavía no existían, así que apply_module_rls()
-- las saltó; aquí volvemos a llamarla para que reemplace sus policies permisivas
-- (using(true)) por las de rol. Idempotente.
--
-- IMPORTANTE: apply_module_rls() DROPEA todas las policies previas de cada tabla
-- del modelo y crea las de rol. NO toca empresa_branding (no está en el modelo):
-- conserva su política de lectura anónima propia.
-- ============================================================================

SELECT public.apply_module_rls();
