-- ============================================================================
-- F4 · Guardias: bloques de horario y ubicación para el calendario mensual.
-- ============================================================================

ALTER TABLE public.guardias
  ADD COLUMN IF NOT EXISTS hora_inicio time,
  ADD COLUMN IF NOT EXISTS hora_fin time,
  ADD COLUMN IF NOT EXISTS ubicacion text;
--> statement-breakpoint

-- Tipos de servicio base si todavía no hay configuración.
INSERT INTO public.guardias_config (tipos_servicio, actores)
SELECT
  ARRAY['Guardia', 'Orden de servicio', 'Mantenimiento', 'Acta de levantamiento'],
  ARRAY[]::text[]
WHERE NOT EXISTS (SELECT 1 FROM public.guardias_config);
