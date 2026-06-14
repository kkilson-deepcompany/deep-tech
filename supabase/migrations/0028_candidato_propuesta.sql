-- ============================================================================
-- 0028 · Candidatos: compensación y beneficios propuestos para estimar el
-- costo del paquete (mensual/anual) antes de contratar.
-- ============================================================================
ALTER TABLE public.candidatos
  ADD COLUMN IF NOT EXISTS compensacion_propuesta_usd numeric(12, 2),
  ADD COLUMN IF NOT EXISTS beneficios_estimados_usd numeric(12, 2);
