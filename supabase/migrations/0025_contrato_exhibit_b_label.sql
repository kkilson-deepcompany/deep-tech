-- ============================================================================
-- 0025 · Contratos: rótulo del bloque adicional del Exhibit B del Consulting
-- Agreement. Permite elegir entre 'Additional benefits' y 'Observations'.
-- ============================================================================
ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS exhibit_b_label text NOT NULL DEFAULT 'Additional benefits';
