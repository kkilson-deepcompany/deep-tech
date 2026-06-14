-- ============================================================================
-- 0029 · Seguros: la prima es ANUAL; se agrega la frecuencia de pago. Las cuotas
-- se derivan del monto anual: semestral = /2, trimestral = /4, mensual = /10.
-- ============================================================================
ALTER TABLE public.colaborador_seguros
  ADD COLUMN IF NOT EXISTS frecuencia_pago text NOT NULL DEFAULT 'Anual';
