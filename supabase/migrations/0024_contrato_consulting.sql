-- ============================================================================
-- 0024 · Contratos: campos para el Consulting Agreement (plantilla Deepcompany
-- LLC US). duracion_meses alimenta el cálculo del Exhibit B (pago por hora,
-- fecha de vencimiento y total del período); beneficios_exhibit_b permite
-- anexar beneficios adicionales al Exhibit B.
-- ============================================================================
ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS duracion_meses smallint,
  ADD COLUMN IF NOT EXISTS beneficios_exhibit_b text;
