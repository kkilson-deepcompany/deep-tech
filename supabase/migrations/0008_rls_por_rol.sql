-- ============================================================================
-- 0008 · Seguridad: RLS por rol (reemplaza tmp_authenticated_all), endurecimiento
-- de RPCs y arreglos de integridad.
--
-- Reemplaza la política temporal `tmp_authenticated_all` (acceso total a todo
-- usuario autenticado) por políticas por módulo y rol. Idempotente.
--
-- Roles (public.user_role): admin_rrhh, director, reclutador, ceo, cfo,
-- coordinador_ops, auditor.
--
-- Modelo:
--   · admin_rrhh / director / ceo  → acceso amplio (RRHH + lectura general)
--   · cfo                          → finanzas
--   · reclutador                   → reclutamiento
--   · coordinador_ops              → operaciones
--   · auditor                      → SOLO LECTURA en todo
-- ============================================================================

-- ── Helpers de grupos de rol ────────────────────────────────────────────────
-- SECURITY DEFINER + search_path fijo (corren sin disparar RLS sobre profiles).
CREATE OR REPLACE FUNCTION public.can_recruit() RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.auth_role() IN ('admin_rrhh','director','ceo','reclutador')
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.can_hr() RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.auth_role() IN ('admin_rrhh','director','ceo')
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.can_finance() RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.auth_role() IN ('admin_rrhh','director','ceo','cfo')
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.can_ops() RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.auth_role() IN ('admin_rrhh','director','ceo','coordinador_ops')
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.is_auditor() RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.auth_role() = 'auditor'
$$;
--> statement-breakpoint

-- ── Aplicación de políticas por módulo ──────────────────────────────────────
-- Función reutilizable: para cada tabla del modelo (si existe) habilita RLS,
-- DROPEA TODAS sus policies existentes (incluidas las permisivas heredadas de
-- los scripts, p.ej. service_orders_read/kover_documents_read, que de otro modo
-- se combinarían con OR y anularían el RLS por rol) y crea las 4 de rol.
-- Se llama aquí y de nuevo en la última migración (tras crear las tablas de los
-- módulos que vivían en scripts/). Idempotente.
CREATE OR REPLACE FUNCTION public.apply_module_rls()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  pol record;
  -- (tabla, predicado_lectura, predicado_escritura)
  cfg text[][] := ARRAY[
    -- Reclutamiento: lectura amplia, escritura reclutamiento.
    ['vacantes',           'true',                                  'public.can_recruit()'],
    ['candidatos',         'true',                                  'public.can_recruit()'],
    ['entrevistas',        'true',                                  'public.can_recruit()'],
    -- RRHH sensible (PII): lectura RRHH/finanzas/auditor, escritura RRHH.
    ['colaboradores',      '(public.can_hr() OR public.can_finance() OR public.is_auditor())', 'public.can_hr()'],
    ['contratos',          '(public.can_hr() OR public.can_finance() OR public.is_auditor())', 'public.can_hr()'],
    ['documentos',         '(public.can_hr() OR public.is_auditor())', 'public.can_hr()'],
    ['carpetas',           '(public.can_hr() OR public.is_auditor())', 'public.can_hr()'],
    -- Organigrama: lectura amplia, escritura RRHH.
    ['org_trees',          'true',                                  'public.can_hr()'],
    -- Finanzas: lectura finanzas/auditor, escritura finanzas.
    ['nominas',            '(public.can_finance() OR public.is_auditor())', 'public.can_finance()'],
    ['nomina_registros',   '(public.can_finance() OR public.is_auditor())', 'public.can_finance()'],
    ['budgets',            '(public.can_finance() OR public.is_auditor())', 'public.can_finance()'],
    ['budget_lines',       '(public.can_finance() OR public.is_auditor())', 'public.can_finance()'],
    ['income_projections', '(public.can_finance() OR public.is_auditor())', 'public.can_finance()'],
    ['income_months',      '(public.can_finance() OR public.is_auditor())', 'public.can_finance()'],
    ['expenses',           '(public.can_finance() OR public.is_auditor())', 'public.can_finance()'],
    ['payment_reminders',  '(public.can_finance() OR public.is_auditor())', 'public.can_finance()'],
    -- Operaciones: lectura amplia, escritura operaciones.
    ['guardias',           'true',                                  'public.can_ops()'],
    ['guardias_config',    'true',                                  'public.can_ops()'],
    ['products',           'true',                                  'public.can_ops()'],
    ['service_orders',     'true',                                  'public.can_ops()'],
    ['service_clientes',   'true',                                  'public.can_ops()'],
    ['service_tecnicos',   'true',                                  'public.can_ops()'],
    ['service_convenios',  'true',                                  'public.can_ops()'],
    ['service_order_counters', 'true',                              'public.can_ops()'],
    -- Datos de salud (Kover): lectura RRHH/auditor, escritura RRHH.
    ['kover_solicitudes',  '(public.can_hr() OR public.is_auditor())', 'public.can_hr()'],
    ['kover_documents',    '(public.can_hr() OR public.is_auditor())', 'public.can_hr()'],
    -- Soporte: cualquier autenticado crea/comenta; borra operaciones.
    ['support_tickets',    'true',                                  'true']
  ];
  i int;
  tname text;
  read_pred text;
  write_pred text;
BEGIN
  FOR i IN 1 .. array_length(cfg, 1) LOOP
    tname := cfg[i][1];
    read_pred := cfg[i][2];
    write_pred := cfg[i][3];

    -- Saltar tablas que no existan en esta base (módulos opcionales).
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tname
    ) THEN
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tname);

    -- Dropear TODAS las policies previas de la tabla (cualquier nombre).
    FOR pol IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = tname
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, tname);
    END LOOP;

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (%s)',
      tname || '_select', tname, read_pred);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (%s)',
      tname || '_insert', tname, write_pred);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (%s) WITH CHECK (%s)',
      tname || '_update', tname, write_pred, write_pred);
    -- DELETE: en soporte lo restringimos a operaciones (no a cualquiera).
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (%s)',
      tname || '_delete', tname,
      CASE WHEN tname = 'support_tickets' THEN 'public.can_ops()' ELSE write_pred END);
  END LOOP;
END;
$fn$;
--> statement-breakpoint

-- Aplica el RLS por rol a las tablas que ya existen ahora (núcleo 0000–0007).
-- Las tablas de los módulos en scripts/ se cubren al final (0021), una vez creadas.
SELECT public.apply_module_rls();
--> statement-breakpoint

-- ── Endurecer generar_nomina: solo finanzas + validación de tasa ────────────
-- Recreación idéntica a 0004 con dos añadidos: guard de rol y tasa > 0.
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
  -- Solo finanzas/dirección pueden generar nómina.
  IF NOT public.can_finance() THEN
    RAISE EXCEPTION 'No autorizado para generar nómina';
  END IF;
  -- La tasa BCV debe ser válida (evita conversión USD/VES errónea con tasa 0/null).
  IF p_tasa_bcv IS NULL OR p_tasa_bcv <= 0 THEN
    RAISE EXCEPTION 'La tasa BCV debe ser mayor que 0';
  END IF;

  INSERT INTO public.nominas (periodo, tipo, tasa_bcv, estado, creado_por)
  VALUES (p_periodo, p_tipo, p_tasa_bcv, 'Borrador', auth.uid())
  RETURNING id INTO v_nomina_id;

  FOR c IN
    SELECT * FROM public.colaboradores WHERE estado IN ('Activo', 'En Prueba')
  LOOP
    v_base := COALESCE(c.salario, 0);

    v_ivss := CASE WHEN c.aplica_ivss THEN v_base * c.ivss_worker_pct / 100 ELSE 0 END;
    v_spf  := CASE WHEN c.aplica_rpe  THEN v_base * c.rpe_worker_pct  / 100 ELSE 0 END;
    v_faov := CASE WHEN c.aplica_faov THEN v_base * c.faov_worker_pct / 100 ELSE 0 END;
    v_islr := CASE WHEN c.aplica_islr THEN v_base * c.islr_pct        / 100 ELSE 0 END;

    v_asig := v_base + COALESCE(c.bono_alimentacion, 0);
    v_ded  := v_ivss + v_spf + v_faov + v_islr;
    v_neto := v_asig - v_ded;

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
--> statement-breakpoint

-- ── Endurecer form_submit: validar token y bloquear reescritura ─────────────
CREATE OR REPLACE FUNCTION public.form_submit(p_token text, p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cand public.candidatos%ROWTYPE;
  v_doc_id uuid;
BEGIN
  -- Mismo umbral que form_get: tokens cortos/nulos no se procesan.
  IF p_token IS NULL OR length(p_token) < 8 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Enlace no válido');
  END IF;

  SELECT * INTO v_cand FROM public.candidatos WHERE form_token = p_token;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Enlace no válido');
  END IF;

  -- El formulario es de un solo envío: una vez completado no se reescribe.
  IF v_cand.form_completado THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Este formulario ya fue enviado');
  END IF;

  SELECT id INTO v_doc_id FROM public.documentos WHERE candidato_id = v_cand.id LIMIT 1;
  IF v_doc_id IS NULL THEN
    INSERT INTO public.documentos (candidato_id) VALUES (v_cand.id) RETURNING id INTO v_doc_id;
  END IF;

  UPDATE public.documentos SET
    nombre_completo = NULLIF(TRIM(p_payload->>'nombre_completo'), ''),
    cedula = NULLIF(TRIM(p_payload->>'cedula'), ''),
    rif = NULLIF(TRIM(p_payload->>'rif'), ''),
    telefono = NULLIF(TRIM(p_payload->>'telefono'), ''),
    direccion = NULLIF(TRIM(p_payload->>'direccion'), ''),
    banco = NULLIF(TRIM(p_payload->>'banco'), ''),
    cuenta_bancaria = NULLIF(TRIM(p_payload->>'cuenta_bancaria'), ''),
    tipo_cuenta = NULLIF(TRIM(p_payload->>'tipo_cuenta'), ''),
    titular_cuenta = NULLIF(TRIM(p_payload->>'titular_cuenta'), ''),
    formulario_completado = true,
    fecha_entrega = CURRENT_DATE
  WHERE id = v_doc_id;

  UPDATE public.candidatos SET form_completado = true WHERE id = v_cand.id;

  RETURN jsonb_build_object('ok', true);
END;
$$;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.form_submit(text, jsonb) TO anon, authenticated;
--> statement-breakpoint

-- NOTA: el RPC `support_ticket_add_nota` se define en 0020 (tras crear la tabla
-- support_tickets, que vivía en scripts/).

-- ── products.costo_total: derivado en BD (fuente única de verdad) ────────────
-- Trigger que recalcula costo_total al insertar/actualizar, para que la carga
-- masiva y el cliente nunca lo dejen desincronizado. Suma montos directos +
-- porcentajes (iva, retención) aplicados sobre costo_base, según el origen.
CREATE OR REPLACE FUNCTION public.products_calc_costo_total()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  base numeric := COALESCE(NEW.costo_base, 0);
  total numeric := 0;
BEGIN
  -- Montos directos comunes.
  total := base
    + COALESCE(NEW.envio_interno, 0)
    + COALESCE(NEW.costos_administrativos, 0)
    + (base * COALESCE(NEW.iva_pct, 0) / 100)
    + (base * COALESCE(NEW.retencion_iva_pct, 0) / 100);

  IF NEW.origen = 'CN' THEN
    total := total
      + COALESCE(NEW.envio_nacional, 0)
      + COALESCE(NEW.envio_aereo, 0)
      + COALESCE(NEW.envio_maritimo, 0)
      + COALESCE(NEW.costos_aduaneros, 0)
      + COALESCE(NEW.costos_desconsolidacion, 0)
      + COALESCE(NEW.impuesto_nacionalizacion, 0)
      + COALESCE(NEW.costo_liberacion, 0)
      + COALESCE(NEW.costo_agente_aduanal, 0)
      + COALESCE(NEW.costos_almacenamiento, 0);
  END IF;

  NEW.costo_total := round(total, 2);
  RETURN NEW;
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS products_costo_total ON public.products;--> statement-breakpoint
CREATE TRIGGER products_costo_total
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.products_calc_costo_total();
--> statement-breakpoint

-- NOTA: `retencion_iva_pct` SUMA al costo (igual que el IVA). Confirmado como
-- correcto por el negocio (2026-06): el costo total refleja el desembolso bruto.
