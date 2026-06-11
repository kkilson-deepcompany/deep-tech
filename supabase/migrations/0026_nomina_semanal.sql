-- ============================================================================
-- 0026 · Plan de pago semanal: reparte la nómina mensual en 4 cortes semanales
-- (martes). Cada fila es un empleado con su monto por semana (USD). Algunos
-- cobran en varias semanas (pagos/mes > 1). El consolidado y el PDF se calculan
-- aplicando la tasa BCV elegida.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.nomina_semanal (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid REFERENCES public.colaboradores(id) ON DELETE SET NULL,
  empleado       text NOT NULL,
  rol            text,
  departamento   text,
  estado         text NOT NULL DEFAULT 'Activo',
  monto_mensual  numeric(12, 2) NOT NULL DEFAULT 0,
  semana1        numeric(12, 2) NOT NULL DEFAULT 0,
  semana2        numeric(12, 2) NOT NULL DEFAULT 0,
  semana3        numeric(12, 2) NOT NULL DEFAULT 0,
  semana4        numeric(12, 2) NOT NULL DEFAULT 0,
  orden          integer NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
DROP TRIGGER IF EXISTS nomina_semanal_set_updated_at ON public.nomina_semanal;--> statement-breakpoint
CREATE TRIGGER nomina_semanal_set_updated_at
  BEFORE UPDATE ON public.nomina_semanal
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
--> statement-breakpoint
ALTER TABLE public.nomina_semanal ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS nomina_semanal_select ON public.nomina_semanal;--> statement-breakpoint
CREATE POLICY nomina_semanal_select ON public.nomina_semanal FOR SELECT TO authenticated
  USING (public.can_finance() OR public.is_auditor());--> statement-breakpoint
DROP POLICY IF EXISTS nomina_semanal_write ON public.nomina_semanal;--> statement-breakpoint
CREATE POLICY nomina_semanal_write ON public.nomina_semanal FOR ALL TO authenticated
  USING (public.can_finance()) WITH CHECK (public.can_finance());
