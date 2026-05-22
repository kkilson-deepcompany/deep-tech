-- ============================================================================
-- F3 · Nómina: motor de cálculo. `generar_nomina` crea una nómina y un registro
-- por cada colaborador activo, calculando deducciones y aportes patronales a
-- partir de los porcentajes y flags `aplica_*` del colaborador.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.generar_nomina(
  p_periodo text,
  p_tipo public.nomina_tipo,
  p_tasa_bcv numeric
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nomina_id uuid;
  c public.colaboradores%ROWTYPE;
  v_base numeric;
  v_ivss numeric; v_spf numeric; v_faov numeric; v_islr numeric;
  v_asig numeric; v_ded numeric; v_neto numeric;
  v_ivss_p numeric; v_spf_p numeric; v_faov_p numeric; v_inces_p numeric; v_pension_p numeric;
  v_costo_p numeric;
  v_total_nomina numeric := 0;
  v_total_patronal numeric := 0;
BEGIN
  INSERT INTO public.nominas (periodo, tipo, tasa_bcv, estado, creado_por)
  VALUES (p_periodo, p_tipo, COALESCE(p_tasa_bcv, 1), 'Borrador', auth.uid())
  RETURNING id INTO v_nomina_id;

  FOR c IN
    SELECT * FROM public.colaboradores WHERE estado IN ('Activo', 'En Prueba')
  LOOP
    v_base := COALESCE(c.salario, 0);

    -- Deducciones del trabajador.
    v_ivss := CASE WHEN c.aplica_ivss THEN v_base * c.ivss_worker_pct / 100 ELSE 0 END;
    v_spf  := CASE WHEN c.aplica_rpe  THEN v_base * c.rpe_worker_pct  / 100 ELSE 0 END;
    v_faov := CASE WHEN c.aplica_faov THEN v_base * c.faov_worker_pct / 100 ELSE 0 END;
    v_islr := CASE WHEN c.aplica_islr THEN v_base * c.islr_pct        / 100 ELSE 0 END;

    v_asig := v_base + COALESCE(c.bono_alimentacion, 0);
    v_ded  := v_ivss + v_spf + v_faov + v_islr;
    v_neto := v_asig - v_ded;

    -- Aportes patronales.
    v_ivss_p    := CASE WHEN c.aplica_ivss    THEN v_base * c.ivss_patron_pct    / 100 ELSE 0 END;
    v_spf_p     := CASE WHEN c.aplica_rpe     THEN v_base * c.rpe_patron_pct     / 100 ELSE 0 END;
    v_faov_p    := CASE WHEN c.aplica_faov    THEN v_base * c.faov_patron_pct    / 100 ELSE 0 END;
    v_inces_p   := CASE WHEN c.aplica_inces   THEN v_base * c.inces_patron_pct   / 100 ELSE 0 END;
    v_pension_p := CASE WHEN c.aplica_pension THEN v_base * c.pension_patron_pct / 100 ELSE 0 END;

    v_costo_p := v_asig + v_ivss_p + v_spf_p + v_faov_p + v_inces_p + v_pension_p;

    INSERT INTO public.nomina_registros (
      nomina_id, colaborador_id, nombre, salario_base, frecuencia, moneda,
      bono_alimentacion, bonificaciones_extras,
      ivss, spf, faov, islr, otras_deducciones,
      total_asignaciones, total_deducciones, neto_a_pagar,
      ivss_patrono, spf_patrono, faov_patrono, inces_patrono, pension_patrono,
      costo_total_patrono
    ) VALUES (
      v_nomina_id, c.id, c.nombre, v_base, c.frecuencia_pago, c.moneda,
      COALESCE(c.bono_alimentacion, 0), 0,
      v_ivss, v_spf, v_faov, v_islr, 0,
      v_asig, v_ded, v_neto,
      v_ivss_p, v_spf_p, v_faov_p, v_inces_p, v_pension_p,
      v_costo_p
    );

    v_total_nomina := v_total_nomina + v_neto;
    v_total_patronal := v_total_patronal + v_costo_p;
  END LOOP;

  UPDATE public.nominas
  SET total_nomina = v_total_nomina, total_patronal = v_total_patronal
  WHERE id = v_nomina_id;

  RETURN v_nomina_id;
END;
$$;
--> statement-breakpoint

GRANT EXECUTE ON FUNCTION public.generar_nomina(text, public.nomina_tipo, numeric) TO authenticated;
