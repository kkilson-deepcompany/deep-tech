-- ============================================================================
-- 0022 · Nómina: separa salario legal (Bs) del bono (USD), agrega semana de pago
-- (cohorte 1-4 para la nómina semanal escalonada) y provisión de fideicomiso.
--
-- Modelo (confirmado con el negocio, jun 2026):
--   · salario_base_legal_bs : salario mínimo legal en Bs (base de IVSS/RPE/FAOV
--     y del fideicomiso legal).
--   · bono_usd              : bono en USD (el grueso del pago; sin deducciones
--     legales, pero sí genera su propio fideicomiso del 10%).
--   · semana_pago (1-4)     : semana del mes en que se le paga (nómina semanal
--     escalonada por departamento). NULL = solo entra en la mensual.
-- `salario` se conserva como compatibilidad / monto total de referencia.
-- ============================================================================

ALTER TABLE public.colaboradores
  ADD COLUMN IF NOT EXISTS salario_base_legal_bs numeric(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bono_usd numeric(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS semana_pago smallint
    CHECK (semana_pago IS NULL OR semana_pago BETWEEN 1 AND 4);
--> statement-breakpoint

-- Registros de nómina: guardar los componentes del modelo split + fideicomiso.
ALTER TABLE public.nomina_registros
  ADD COLUMN IF NOT EXISTS salario_legal_bs numeric(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bono_usd numeric(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fideicomiso_usd numeric(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fideicomiso_bs numeric(14, 2) NOT NULL DEFAULT 0;
--> statement-breakpoint

-- ── Libro mayor de fideicomiso (prestaciones) ───────────────────────────────
-- Cada corrida de nómina abona el 10% legal (Bs) y el 10% del bono (USD).
-- Permite consultar el saldo histórico por colaborador (no solo el mes).
CREATE TABLE IF NOT EXISTS public.fideicomiso_movimientos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  nomina_id     uuid REFERENCES public.nominas(id) ON DELETE SET NULL,
  periodo       text NOT NULL,                          -- YYYY-MM
  tipo          text NOT NULL DEFAULT 'abono'           -- abono | retiro | ajuste
                 CHECK (tipo IN ('abono', 'retiro', 'ajuste')),
  monto_usd     numeric(12, 2) NOT NULL DEFAULT 0,
  monto_bs      numeric(14, 2) NOT NULL DEFAULT 0,
  tasa_bcv      numeric(14, 6) NOT NULL DEFAULT 1,
  nota          text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

-- ── Motor de nómina: filtro por semana + componentes split + fideicomiso ────
-- p_semana NULL  → nómina mensual (todos los colaboradores activos).
-- p_semana 1-4   → corrida semanal escalonada (solo la cohorte de esa semana).
-- Las deducciones legales se calculan sobre el salario legal (Bs); el bono (USD)
-- se suma como asignación. Se abona fideicomiso 10% sobre cada componente.

-- Elimina la firma anterior de 3 parámetros para evitar ambigüedad de sobrecarga.
DROP FUNCTION IF EXISTS public.generar_nomina(text, public.nomina_tipo, numeric);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.generar_nomina(
  p_periodo text,
  p_tipo public.nomina_tipo,
  p_tasa_bcv numeric,
  p_semana smallint DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nomina_id uuid;
  c public.colaboradores%ROWTYPE;
  v_legal_bs numeric;       -- salario legal en Bs
  v_bono numeric;           -- bono en USD
  v_legal_usd numeric;      -- salario legal convertido a USD (para deducciones unificadas)
  v_ivss numeric; v_spf numeric; v_faov numeric; v_islr numeric;
  v_asig numeric; v_ded numeric; v_neto numeric;
  v_ivss_p numeric; v_spf_p numeric; v_faov_p numeric; v_inces_p numeric; v_pension_p numeric;
  v_costo_p numeric;
  v_fid_usd numeric; v_fid_bs numeric;
  v_total_nomina numeric := 0;
  v_total_patronal numeric := 0;
BEGIN
  IF NOT public.can_finance() THEN
    RAISE EXCEPTION 'No autorizado para generar nómina';
  END IF;
  IF p_tasa_bcv IS NULL OR p_tasa_bcv <= 0 THEN
    RAISE EXCEPTION 'La tasa BCV debe ser mayor que 0';
  END IF;
  IF p_semana IS NOT NULL AND p_semana NOT BETWEEN 1 AND 4 THEN
    RAISE EXCEPTION 'La semana debe estar entre 1 y 4';
  END IF;

  INSERT INTO public.nominas (periodo, tipo, tasa_bcv, estado, creado_por)
  VALUES (p_periodo, p_tipo, p_tasa_bcv, 'Borrador', auth.uid())
  RETURNING id INTO v_nomina_id;

  FOR c IN
    SELECT * FROM public.colaboradores
    WHERE estado IN ('Activo', 'En Prueba')
      AND (p_semana IS NULL OR semana_pago = p_semana)
  LOOP
    v_legal_bs := COALESCE(c.salario_base_legal_bs, 0);
    -- Bono: usa bono_usd; si está en 0 y hay salario legacy, cae a salario.
    v_bono := COALESCE(NULLIF(c.bono_usd, 0), c.salario, 0);
    v_legal_usd := v_legal_bs / p_tasa_bcv;

    -- Deducciones legales del trabajador, calculadas sobre el salario legal (USD equiv).
    v_ivss := CASE WHEN c.aplica_ivss THEN v_legal_usd * c.ivss_worker_pct / 100 ELSE 0 END;
    v_spf  := CASE WHEN c.aplica_rpe  THEN v_legal_usd * c.rpe_worker_pct  / 100 ELSE 0 END;
    v_faov := CASE WHEN c.aplica_faov THEN v_legal_usd * c.faov_worker_pct / 100 ELSE 0 END;
    v_islr := CASE WHEN c.aplica_islr THEN (v_legal_usd + v_bono) * c.islr_pct / 100 ELSE 0 END;

    v_asig := v_legal_usd + v_bono + COALESCE(c.bono_alimentacion, 0);
    v_ded  := v_ivss + v_spf + v_faov + v_islr;
    v_neto := v_asig - v_ded;

    -- Aportes patronales sobre el salario legal.
    v_ivss_p    := CASE WHEN c.aplica_ivss    THEN v_legal_usd * c.ivss_patron_pct    / 100 ELSE 0 END;
    v_spf_p     := CASE WHEN c.aplica_rpe     THEN v_legal_usd * c.rpe_patron_pct     / 100 ELSE 0 END;
    v_faov_p    := CASE WHEN c.aplica_faov    THEN v_legal_usd * c.faov_patron_pct    / 100 ELSE 0 END;
    v_inces_p   := CASE WHEN c.aplica_inces   THEN v_legal_usd * c.inces_patron_pct   / 100 ELSE 0 END;
    v_pension_p := CASE WHEN c.aplica_pension THEN v_legal_usd * c.pension_patron_pct / 100 ELSE 0 END;

    -- Fideicomiso: 10% sobre cada componente.
    v_fid_bs  := v_legal_bs * 0.10;
    v_fid_usd := v_bono * 0.10;

    v_costo_p := v_asig + v_ivss_p + v_spf_p + v_faov_p + v_inces_p + v_pension_p + v_fid_usd + (v_fid_bs / p_tasa_bcv);

    INSERT INTO public.nomina_registros (
      nomina_id, colaborador_id, nombre, salario_base, frecuencia, moneda,
      salario_legal_bs, bono_usd, fideicomiso_usd, fideicomiso_bs,
      bono_alimentacion, bonificaciones_extras,
      ivss, spf, faov, islr, otras_deducciones,
      total_asignaciones, total_deducciones, neto_a_pagar,
      ivss_patrono, spf_patrono, faov_patrono, inces_patrono, pension_patrono,
      costo_total_patrono
    ) VALUES (
      v_nomina_id, c.id, c.nombre, round(v_legal_usd + v_bono, 2), c.frecuencia_pago, c.moneda,
      v_legal_bs, v_bono, round(v_fid_usd, 2), v_fid_bs,
      COALESCE(c.bono_alimentacion, 0), 0,
      round(v_ivss, 2), round(v_spf, 2), round(v_faov, 2), round(v_islr, 2), 0,
      round(v_asig, 2), round(v_ded, 2), round(v_neto, 2),
      round(v_ivss_p, 2), round(v_spf_p, 2), round(v_faov_p, 2), round(v_inces_p, 2), round(v_pension_p, 2),
      round(v_costo_p, 2)
    );

    -- Abono al libro de fideicomiso.
    INSERT INTO public.fideicomiso_movimientos
      (colaborador_id, nomina_id, periodo, tipo, monto_usd, monto_bs, tasa_bcv)
    VALUES (c.id, v_nomina_id, p_periodo, 'abono', round(v_fid_usd, 2), v_fid_bs, p_tasa_bcv);

    v_total_nomina := v_total_nomina + v_neto;
    v_total_patronal := v_total_patronal + v_costo_p;
  END LOOP;

  UPDATE public.nominas
  SET total_nomina = round(v_total_nomina, 2), total_patronal = round(v_total_patronal, 2)
  WHERE id = v_nomina_id;

  RETURN v_nomina_id;
END;
$$;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.generar_nomina(text, public.nomina_tipo, numeric, smallint) TO authenticated;
--> statement-breakpoint

-- RLS del libro de fideicomiso (finanzas/auditor lee, finanzas escribe).
ALTER TABLE public.fideicomiso_movimientos ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS fideicomiso_select ON public.fideicomiso_movimientos;--> statement-breakpoint
CREATE POLICY fideicomiso_select ON public.fideicomiso_movimientos FOR SELECT TO authenticated
  USING (public.can_finance() OR public.is_auditor());--> statement-breakpoint
DROP POLICY IF EXISTS fideicomiso_write ON public.fideicomiso_movimientos;--> statement-breakpoint
CREATE POLICY fideicomiso_write ON public.fideicomiso_movimientos FOR ALL TO authenticated
  USING (public.can_finance()) WITH CHECK (public.can_finance());
